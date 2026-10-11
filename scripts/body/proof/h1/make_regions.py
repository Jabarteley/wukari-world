"""Soft region weights for a reduced part: skin, top, bottom, footwear, written as one RGBA image (R skin, G top, B bottom, A footwear) and a json of reference colours.

  blender --background --disable-autoexec --python make_regions.py -- <reduced.blend> <colour.jpg> <out-mask.png> <out-info.json> --kind head|body [--skin-ref r,g,b] [--tol 0.14]
      [--top-split z] [--shoe-z z] [--feet shoes|skin|colour] [--sleeve-x x] [--bare-legs z] [--no-top 1]

Every texel of the colour map is mapped back to its place on the surface.  Skin is where the texel's colour is near the skin reference (and the place allows skin), garments are the rest,
split at --top-split, footwear is what is below --shoe-z.  The labels are made continuous: unmapped texels take the label of their nearest mapped neighbour (so bilinear sampling at an island
edge never reads an unrelated label), and every channel is blurred by two texels, so a recolour fades across an edge instead of leaving speckles.  Reference colours are the median colour
of each region, which the page divides by to keep shading and print detail while moving the colour.  Every path is an argument.
"""
import json
import math
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, colour_in, out_png, out_info = pos[:4]
kind = opts["--kind"]; tol = float(opts.get("--tol", 0.14))
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]; me = low.data
me.calc_loop_triangles()
uv = me.uv_layers.active.data
img = bpy.data.images.load(colour_in); img.colorspace_settings.name = "Non-Color"
W, H = img.size
px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3].astype(np.float32)
verts = np.array([v.co[:] for v in me.vertices])
P3 = np.full((H, W, 3), np.nan, dtype=np.float32)
for t in me.loop_triangles:
    idx = list(t.vertices); loops = list(t.loops)
    A = np.array([uv[l].uv[:] for l in loops]) * [W, H]
    x0, x1 = int(max(0, math.floor(A[:, 0].min()))), int(min(W - 1, math.ceil(A[:, 0].max())))
    y0, y1 = int(max(0, math.floor(A[:, 1].min()))), int(min(H - 1, math.ceil(A[:, 1].max())))
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    d = (A[1, 1] - A[2, 1]) * (A[0, 0] - A[2, 0]) + (A[2, 0] - A[1, 0]) * (A[0, 1] - A[2, 1])
    if abs(d) < 1e-9:
        continue
    l0 = ((A[1, 1] - A[2, 1]) * (xs - A[2, 0]) + (A[2, 0] - A[1, 0]) * (ys - A[2, 1])) / d
    l1 = ((A[2, 1] - A[0, 1]) * (xs - A[2, 0]) + (A[0, 0] - A[2, 0]) * (ys - A[2, 1])) / d
    inside = (l0 >= -0.03) & (l1 >= -0.03) & ((1 - l0 - l1) >= -0.03)
    if not inside.any():
        continue
    pts = l0[..., None] * verts[idx[0]] + l1[..., None] * verts[idx[1]] + (1 - l0 - l1)[..., None] * verts[idx[2]]
    P3[y0:y1 + 1, x0:x1 + 1][inside] = pts[inside]
have = ~np.isnan(P3[:, :, 0])
X, Z = P3[:, :, 0], P3[:, :, 2]


def smooth(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


# skin reference: given, or the median of the most common warm mid-tone near the middle of the face / neck
if "--skin-ref" in opts:
    ref = np.array([float(v) for v in opts["--skin-ref"].split(",")], dtype=np.float32)
else:
    top = np.nanmax(Z)
    zone = have & (Z > top - 0.16) & (Z < top - 0.08) & (np.abs(X) < 0.09) if kind == "head" else have & (np.abs(X) > 0.62) & (Z > 0.9)   # a body: its hands and forearms
    ref = np.median(px[zone], axis=0)
dist = np.linalg.norm(px - ref, axis=2)
skin_like = np.where(have, 1.0 - smooth((dist - tol) / 0.10), 0.0)
skin = skin_like.copy()
top_w = np.zeros((H, W), np.float32); bot_w = top_w.copy(); shoe_w = top_w.copy()
info = {"kind": kind, "skinRef": [float(v) for v in ref]}
if kind == "body":
    split = float(opts["--top-split"]); shoe_z = float(opts.get("--shoe-z", 0.085)); feet = opts.get("--feet", "colour")
    sleeve_x = float(opts.get("--sleeve-x", 0.0)); bare = float(opts.get("--bare-legs", 0.0))
    cloth = 1.0 - skin_like
    foot = have & (Z < shoe_z)
    if feet == "shoes":
        shoe_w = np.where(foot, 1.0, 0.0).astype(np.float32); skin = np.where(foot, 0.0, skin)
    elif feet == "colour":
        shoe_w = np.where(foot, cloth, 0.0).astype(np.float32)
    # a band of skin-like colour on the garments themselves (a mustard top, brown trousers) is not skin: skin may only be where the body shows
    can_skin = (Z > np.nanmax(Z) - 0.08) | (np.abs(X) > sleeve_x) | foot | (Z < bare)
    if "--no-skin-gate" not in argv:
        skin = np.where(can_skin, skin, 0.0)
    cloth_w = np.where(have & ~foot, np.clip(1.0 - skin, 0, 1), 0.0)
    if feet == "colour":
        cloth_w = np.where(foot, 0.0, cloth_w)
    top_w = np.where(Z >= split, cloth_w, 0.0).astype(np.float32)
    bot_w = np.where(Z < split, cloth_w, 0.0).astype(np.float32)
    info.update({"topSplit": split, "shoeZ": shoe_z, "feet": feet})
else:
    top_w[:] = 0
# fill the texels outside the islands with the nearest mapped neighbour, then blur
chans = [skin.astype(np.float32), top_w, bot_w, shoe_w]
mapped = have.copy()
for it in range(10):
    grow = ~mapped
    if not grow.any():
        break
    for c in chans:
        acc = np.zeros_like(c); cnt = np.zeros_like(c)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                m = np.roll(np.roll(mapped, dy, 0), dx, 1); v = np.roll(np.roll(c, dy, 0), dx, 1)
                acc += np.where(m, v, 0); cnt += m
        c[:] = np.where(grow & (cnt > 0), acc / np.maximum(cnt, 1), c)
    m2 = mapped.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            m2 |= np.roll(np.roll(mapped, dy, 0), dx, 1)
    mapped = m2


def blur(a, r=2, passes=2):
    k = 2 * r + 1
    for _ in range(passes):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(2)], mode="edge")
            cs = np.cumsum(pad, axis=axis, dtype=np.float64)
            hi = np.take(cs, np.arange(k - 1, cs.shape[axis]), axis=axis); lo = np.concatenate([np.zeros_like(np.take(cs, [0], axis=axis)), np.take(cs, np.arange(0, cs.shape[axis] - k), axis=axis)], axis=axis)
            a = ((hi - lo) / k).astype(np.float32)
    return a


chans = [blur(c) for c in chans]
tot = sum(chans); over = np.maximum(tot, 1.0)
chans = [np.clip(c / over, 0, 1) for c in chans]
# reference colours: median of the texels that are clearly in each region
names = ["skin", "top", "bottom", "shoes"]
for n, c in zip(names, chans):
    sel = have & (c > 0.9)
    info["ref" + n.capitalize()] = [float(v) for v in np.median(px[sel], axis=0)] if sel.sum() > 50 else None
    info["count" + n.capitalize()] = int(sel.sum())
# half resolution
out = np.stack([c[::2, ::2] for c in chans], axis=2)
h2, w2 = out.shape[:2]
buf = np.concatenate([out, np.zeros((h2, w2, 0))], axis=2).astype(np.float32)
m = bpy.data.images.new("mask", w2, h2, alpha=True)
m.colorspace_settings.name = "Non-Color"; m.alpha_mode = "CHANNEL_PACKED"
m.pixels.foreach_set(buf.ravel())
bpy.context.scene.render.image_settings.file_format = "PNG"; bpy.context.scene.render.image_settings.color_mode = "RGBA"
bpy.context.scene.render.image_settings.color_depth = "8"; bpy.context.scene.render.image_settings.compression = 100
m.save_render(out_png, scene=bpy.context.scene)
json.dump(info, open(out_info, "w"), indent=1)
print("REGIONS", {k: v for k, v in info.items() if k.startswith("count") or k == "skinRef"})
