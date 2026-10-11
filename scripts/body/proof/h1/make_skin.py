"""Skin and cloth masks for a whole character, from its ORIGINAL colour map (the outfits share its layout, so one mask serves all of them).

  blender --background --disable-autoexec --python make_skin.py -- <reduced.blend> <colour.jpg> <joints.json> <out-mask.png> <out-info.json> <out-cloth.npy> --bare-x 0.58 [--bare-leg-z 0.3] [--feet skin|none] [--mask-px 512] [--tol 0.14]

Mask channels: R skin of the head and neck, G skin of the limbs (hands, forearms, legs, feet), each continuous (soft edges).  The two have separate reference colours, because hands and
face are often different shades; a skin step moves both by the same ratio.  The cloth weight (full resolution, .npy) is every texel below the neck that is neither skin, footwear nor
hanging hair: a retextured variant is composited over the original through it, so faces, hair and shoes are exactly as generated.  Every path is an argument.
"""
import json, math, sys
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, colour_in, joints_json, out_png, out_info, out_npy = pos[:6]
bare_x = float(opts.get("--bare-x", 0.6)); bare_leg = float(opts.get("--bare-leg-z", 0.0)); feet = opts.get("--feet", "skin"); tol = float(opts.get("--tol", 0.14)); mpx = int(opts.get("--mask-px", 512))
neck_z = json.load(open(joints_json))["joints"]["neck"][2]
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]; me = low.data; me.calc_loop_triangles(); uv = me.uv_layers.active.data
img = bpy.data.images.load(colour_in); img.colorspace_settings.name = "Non-Color"
W, H = img.size
px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3].astype(np.float32)
verts = np.array([v.co[:] for v in me.vertices])
P3 = np.full((H, W, 3), np.nan, dtype=np.float32)
for t in me.loop_triangles:
    idx = list(t.vertices); loops = list(t.loops)
    A = np.array([uv[l].uv[:] for l in loops]) * [W, H]
    x0, x1 = int(max(0, math.floor(A[:, 0].min()))), int(min(W - 1, math.ceil(A[:, 0].max()))); y0, y1 = int(max(0, math.floor(A[:, 1].min()))), int(min(H - 1, math.ceil(A[:, 1].max())))
    if x1 < x0 or y1 < y0: continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    d = (A[1, 1] - A[2, 1]) * (A[0, 0] - A[2, 0]) + (A[2, 0] - A[1, 0]) * (A[0, 1] - A[2, 1])
    if abs(d) < 1e-9: continue
    l0 = ((A[1, 1] - A[2, 1]) * (xs - A[2, 0]) + (A[2, 0] - A[1, 0]) * (ys - A[2, 1])) / d
    l1 = ((A[2, 1] - A[0, 1]) * (xs - A[2, 0]) + (A[0, 0] - A[2, 0]) * (ys - A[2, 1])) / d
    inside = (l0 >= -0.03) & (l1 >= -0.03) & ((1 - l0 - l1) >= -0.03)
    if not inside.any(): continue
    pts = l0[..., None] * verts[idx[0]] + l1[..., None] * verts[idx[1]] + (1 - l0 - l1)[..., None] * verts[idx[2]]
    P3[y0:y1 + 1, x0:x1 + 1][inside] = pts[inside]
have = ~np.isnan(P3[:, :, 0]); X, Z = P3[:, :, 0], P3[:, :, 2]; AX = np.abs(X)
sm = lambda t: (lambda c: c * c * (3 - 2 * c))(np.clip(t, 0, 1))
head = have & (Z > neck_z - 0.02) & (AX < 0.2)
neck = have & (Z <= neck_z - 0.02) & (Z > neck_z - 0.12) & (AX < 0.09)
face_zone = head | neck
lum = px.mean(axis=2); mx = px.max(axis=2); sat = (mx - px.min(axis=2)) / np.maximum(mx, 1e-3)
# references: the skin of the face (middle of the cheeks), and of the hands
seed = np.array(json.load(open(opts["--face"]))["skinCheek"]) if "--face" in opts else np.median(px[head & (lum > 0.3)], axis=0)
near1 = np.linalg.norm(px - seed, axis=2) < 0.10
ref1 = np.median(px[head & near1], axis=0) if (head & near1).sum() > 100 else seed
hand = have & (AX > 0.74) & (Z > 0.8) & (Z < neck_z) & (lum > 0.15)
ref2 = ref1
if hand.sum() > 200:
    h0 = np.median(px[hand], axis=0)
    close = hand & (np.linalg.norm(px - h0, axis=2) < 0.07)
    if close.sum() > 100 and np.linalg.norm(np.median(px[close], axis=0) - ref1) < 0.25: ref2 = np.median(px[close], axis=0)
ref_sat = float((ref1.max() - ref1.min()) / max(ref1.max(), 1e-3))
like = lambda ref: np.where(have, (1.0 - sm((np.linalg.norm(px - ref, axis=2) - tol) / 0.09)) * (1.0 - sm((np.abs(sat - ref_sat) - 0.22) / 0.1)), 0.0)   # a saturated cap or scarf is not skin
s1 = like(ref1) * face_zone
limb_zone = have & ~face_zone & (Z < neck_z) & ((AX > bare_x) | ((Z < bare_leg) if bare_leg > 0 else False) | ((Z < 0.09) if feet == "skin" else False))
s2 = np.maximum(like(ref2), like(ref1) * 0.0) * limb_zone
# the lowest part of a limb that is visible: hands may also match the face reference
s2 = np.maximum(s2, like(ref1) * limb_zone * 0.0)
shoe = have & (Z < 0.09) & (s2 < 0.5)
hair_like = have & (lum < 0.22) & (sat < 0.2) & (Z > neck_z - 0.35) & (AX < 0.25)
skin_any = np.maximum(s1, s2)
cloth = np.where(have & (Z < neck_z + 0.02) & ~shoe & ~hair_like, np.clip(1.0 - skin_any, 0, 1), 0.0).astype(np.float32)
# fill unmapped texels from their neighbours, then blur
chans = [s1.astype(np.float32), s2.astype(np.float32), cloth]
mapped = have.copy()
for _ in range(4):
    grow = ~mapped
    if not grow.any(): break
    for c in chans:
        acc = np.zeros_like(c); cnt = np.zeros_like(c)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                m = np.roll(np.roll(mapped, dy, 0), dx, 1); v = np.roll(np.roll(c, dy, 0), dx, 1); acc += np.where(m, v, 0); cnt += m
        c[:] = np.where(grow & (cnt > 0), acc / np.maximum(cnt, 1), c)
    m2 = mapped.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): m2 |= np.roll(np.roll(mapped, dy, 0), dx, 1)
    mapped = m2
def blur(a, r=2, passes=2):
    k = 2 * r + 1
    for _ in range(passes):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(2)], mode="edge"); cs = np.cumsum(pad, axis=axis, dtype=np.float64)
            hi = np.take(cs, np.arange(k - 1, cs.shape[axis]), axis=axis); lo = np.concatenate([np.zeros_like(np.take(cs, [0], axis=axis)), np.take(cs, np.arange(0, cs.shape[axis] - k), axis=axis)], axis=axis)
            a = ((hi - lo) / k).astype(np.float32)
    return a
chans = [blur(c, 1, 1) for c in chans]
np.save(out_npy, chans[2].astype(np.float16))
k = max(1, H // mpx); out = np.stack([c[:H // k * k, :W // k * k].reshape(H // k, k, W // k, k).mean(axis=(1, 3)) for c in chans[:2]] + [np.zeros((H // k, W // k), np.float32)] * 2, axis=2)
h2, w2 = out.shape[:2]
m = bpy.data.images.new("mask", w2, h2, alpha=True); m.colorspace_settings.name = "Non-Color"; m.alpha_mode = "CHANNEL_PACKED"
m.pixels.foreach_set(out.astype(np.float32).ravel())
bpy.context.scene.render.image_settings.file_format = "PNG"; bpy.context.scene.render.image_settings.color_mode = "RGBA"; bpy.context.scene.render.image_settings.color_depth = "8"; bpy.context.scene.render.image_settings.compression = 100
m.save_render(out_png, scene=bpy.context.scene)
json.dump({"refSkin": [float(v) for v in ref1], "refSkin2": [float(v) for v in ref2], "countFace": int((s1 > 0.9).sum()), "countLimb": int((s2 > 0.9).sum()), "countCloth": int((cloth > 0.9).sum())}, open(out_info, "w"))
print("SKIN", [round(float(v), 3) for v in ref1], [round(float(v), 3) for v in ref2], int((s1 > 0.9).sum()), int((s2 > 0.9).sum()), int((cloth > 0.9).sum()))
