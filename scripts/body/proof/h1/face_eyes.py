"""Finds the eyes, brows and mouth on a reduced character's baked face and paints new eyes into the base colour map.

  blender --background --disable-autoexec --python face_eyes.py -- <reduced.blend> <colour.jpg> <out-colour.jpg> <face.json> [--detect|--use] [--iris r,g,b] [--debug dir]

The face is found in 3D, not in the image: every texel of the head's front is mapped back to its place on the surface, so the same landmarks describe the
hero and the crowd version and paint without stretching.  --detect measures the white of the eyes and the dark brows and writes <face.json> (Blender axes, metres:
x to the character's left, z up); --use reads it.  The eyes are then painted over the whole eye opening (white with a shaded upper lid, iris with a dark
ring, pupil, two highlights) so both figures share one eye recipe.  Every path is an argument.
"""
import json
import math
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, colour_in, colour_out, face_json = pos[:4]
mode = "use" if "--use" in argv else "detect"
iris_rgb = np.array([float(v) for v in opts.get("--iris", "0.36,0.20,0.09").split(",")])

bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]
me = low.data
me.calc_loop_triangles()
uv = me.uv_layers.active.data
img = bpy.data.images.load(colour_in)
img.colorspace_settings.name = "Non-Color"          # raw encoded values in, raw encoded values out
W, H = img.size
px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3].copy()
verts = np.array([v.co[:] for v in me.vertices])
top = verts[:, 2].max()
head_zone = top - 0.32 * (top - 0.0) * 0.85           # the head: the top fifth or so
if "--head-part" in argv:
    head_zone = verts[:, 2].min() - 1.0                    # the file is only a head

# ---------------------------------------------------------------- texel -> surface point, for the front of the head
P3 = np.full((H, W, 3), np.nan)
tsize = np.full((H, W), np.nan)
head_ymax = None
tris = []
for t in me.loop_triangles:
    a, b, c = (verts[i] for i in t.vertices)
    if (a[2] + b[2] + c[2]) / 3 < head_zone:
        continue
    tris.append(t)
cent = np.array([np.mean([verts[i] for i in t.vertices], axis=0) for t in tris])
head_y = np.median(cent[:, 1])
for t, ce in zip(tris, cent):
    if ce[1] > head_y + 0.01:                          # the face looks along -y
        continue
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
    l2 = 1 - l0 - l1
    inside = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
    if not inside.any():
        continue
    pts = l0[..., None] * verts[idx[0]] + l1[..., None] * verts[idx[1]] + l2[..., None] * verts[idx[2]]
    area3 = np.linalg.norm(np.cross(verts[idx[1]] - verts[idx[0]], verts[idx[2]] - verts[idx[0]])) / 2
    area2 = abs(d) / 2
    P3[y0:y1 + 1, x0:x1 + 1][inside] = pts[inside]
    tsize[y0:y1 + 1, x0:x1 + 1][inside] = math.sqrt(area3 / max(area2, 1e-9))
have = ~np.isnan(P3[:, :, 0])
print("FACE TEXELS", int(have.sum()), "head_y", head_y)

# ---------------------------------------------------------------- landmarks
lum = px.mean(axis=2)
sat = px.max(axis=2) - px.min(axis=2)
if mode == "detect":
    zface = verts[:, 2]
    zmin_ = verts[:, 2].min() if "--head-part" in argv else 0.0
    if "--head-part" in argv:
        hh = top - zmin_
        eye_band = have & (P3[:, :, 2] > zmin_ + 0.50 * hh) & (P3[:, :, 2] < zmin_ + 0.76 * hh)
    else:
        eye_band = have & (P3[:, :, 2] > top - 0.30 * (top)) & (P3[:, :, 2] < top - 0.04)
    sclera = eye_band & (px.min(axis=2) > 0.58) & (sat < 0.25)
    lm = {}
    for side, name in ((1, "L"), (-1, "R")):
        m = sclera & (P3[:, :, 0] * side > 0.015)
        p = P3[m]
        if len(p) < 20:
            raise RuntimeError(f"cannot find the white of the {name} eye ({len(p)} texels)")
        # mean shift to the densest cluster of white
        c0 = np.median(p, axis=0)
        cells = {}
        for q in p:
            k = (int(q[0] / 0.006), int(q[2] / 0.006)); cells[k] = cells.get(k, 0) + 1
        kbest = max(cells, key=cells.get); c0 = np.array([kbest[0] * 0.006, 0, kbest[1] * 0.006])
        for _ in range(6):
            d2 = np.hypot(p[:, 0] - c0[0], p[:, 2] - c0[2]); sel = p[d2 < 0.032]
            if len(sel) < 10:
                break
            c0 = np.array([np.median(sel[:, 0]), 0, np.median(sel[:, 2])])
        d2 = np.hypot(p[:, 0] - c0[0], p[:, 2] - c0[2]); p = p[d2 < 0.034]
        x_lo, x_hi = np.percentile(p[:, 0], [2, 98]); z_lo, z_hi = np.percentile(p[:, 2], [2, 98])
        lm["eye" + name] = [float((x_lo + x_hi) / 2), float((z_lo + z_hi) / 2)]
        lm["eyeA" + name] = float((x_hi - x_lo) / 2); lm["eyeB" + name] = float((z_hi - z_lo) / 2)
    # the two eyes are at one height: average, and keep them mirror images about the middle of the face
    zz = (lm["eyeL"][1] + lm["eyeR"][1]) / 2; lm["eyeL"][1] = zz; lm["eyeR"][1] = zz
    aa = (lm["eyeAL"] + lm["eyeAR"]) / 2; bb = (lm["eyeBL"] + lm["eyeBR"]) / 2; lm["eyeAL"] = lm["eyeAR"] = aa; lm["eyeBL"] = lm["eyeBR"] = bb
    sep = lm["eyeL"][0] - lm["eyeR"][0]
    ez = (lm["eyeL"][1] + lm["eyeR"][1]) / 2
    lm["eyeSep"] = float(sep)
    # brows: the dark band above each eye
    for side, name in ((1, "L"), (-1, "R")):
        ex, _ = lm["eye" + name]
        m = have & (lum < 0.30) & (np.abs(P3[:, :, 0] - ex) < 0.07) & (P3[:, :, 2] > ez + 0.02) & (P3[:, :, 2] < ez + 0.12)
        p = P3[m]
        lm["brow" + name] = [float(np.median(p[:, 0])), float(np.median(p[:, 2]))] if len(p) > 10 else [ex, ez + 0.06]
    # mouth: the reddest band below the nose
    skin = np.median(px[have & (P3[:, :, 2] > ez - 0.04) & (P3[:, :, 2] < ez + 0.0) & (np.abs(P3[:, :, 0]) < 0.03)], axis=0)
    red = (px[:, :, 0] - px[:, :, 1]) - (skin[0] - skin[1])
    zone = have & (P3[:, :, 2] < ez - 0.45 * sep) & (P3[:, :, 2] > ez - 1.6 * sep) & (np.abs(P3[:, :, 0]) < 0.9 * sep)
    cand = zone & (red > 0.5 * np.percentile(red[zone], 97)) if zone.any() else zone
    p = P3[cand]
    lm["mouth"] = [float(np.median(p[:, 0])), float(np.median(p[:, 2]))] if len(p) > 10 else [0.0, ez - 0.9 * sep]
    lm["mouthW"] = float(0.75 * sep)     # the face the shape keys were authored on has its mouth 0.75 as wide as its eyes are far apart
    lm["scale"] = float(sep / 0.0833 / 2)       # relative to the face the shape keys were authored on (eye centre about 0.083 off the middle)
    lm["chinDrop"] = float(0.08 * lm["scale"])
    cheek = have & (P3[:, :, 2] > ez - 0.9 * sep) & (P3[:, :, 2] < ez - 0.2 * sep) & (np.abs(np.abs(P3[:, :, 0]) - 0.6 * sep) < 0.25 * sep)
    if cheek.sum() < 50:
        cheek = have & (P3[:, :, 2] > ez - 0.7 * sep) & (P3[:, :, 2] < ez - 0.2 * sep) & (np.abs(P3[:, :, 0]) < 0.9 * sep)
    lm["skinCheek"] = [float(v) for v in np.median(px[cheek], axis=0)]
    lm["iris"] = [float(v) for v in iris_rgb]
    json.dump(lm, open(face_json, "w"), indent=1)
    print("LANDMARKS", json.dumps(lm))
else:
    lm = json.load(open(face_json))


def smooth(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- the eyes (v2: one proportion for every head, a dark readable iris, lids that sit on the eye)
out = px.copy()
eye_open = np.zeros(px.shape[:2], bool)
face_w = float(np.nanmax(P3[:, :, 0][have]) - np.nanmin(P3[:, :, 0][have])) if "--head-part" in argv else 0.26
if "--head-part" in argv:
    band = have & (np.abs(P3[:, :, 2] - (lm["eyeL"][1])) < 0.03) & (np.abs(P3[:, :, 0]) < 0.17)
    face_w = float(np.nanmax(P3[:, :, 0][band]) - np.nanmin(P3[:, :, 0][band])) if band.any() else 0.24
A_EYE = float(opts.get("--eye-a", 0.0)) or 0.086 * face_w     # half width of the eye opening
B_EYE = 0.50 * A_EYE
mid = (lm["eyeL"][0] + lm["eyeR"][0]) / 2; half_sep = (lm["eyeL"][0] - lm["eyeR"][0]) / 2
lm["eyeL"] = [mid + half_sep, lm["eyeL"][1]]; lm["eyeR"] = [mid - half_sep, lm["eyeR"][1]]
lm["eyeAL"] = lm["eyeAR"] = A_EYE; lm["eyeBL"] = lm["eyeBR"] = B_EYE
json.dump(lm, open(face_json, "w"), indent=1)
for side, name in ((1, "L"), (-1, "R")):
    cx, cz = lm["eye" + name]
    a = A_EYE; b = B_EYE
    dx = P3[:, :, 0] - cx; dz = P3[:, :, 2] - cz
    near = have & (np.abs(dx) < a * 1.9) & (np.abs(dz) < b * 4.2)
    u = np.where(near, dx / a, 9); v = np.where(near, dz / b, 9)
    # an almond: the lids meet at the corners, the opening is widest a little inside the middle
    ou = side * u                                  # positive toward the outer corner on this side (left eye: outer is +x)
    half_h = np.clip(1.0 - np.abs(u) ** 2.2, 0, 1) ** 0.75
    top_edge = 0.80 * half_h; bot_edge = -0.62 * half_h
    ts = np.where(near, tsize / b, 0.02)
    inside = smooth(np.minimum(top_edge - v, v - bot_edge) / np.maximum(ts * 1.4, 1e-3)) * (np.abs(u) < 1.0)
    sclera = np.array([0.50, 0.46, 0.42])
    shade = 1.0 - 0.45 * smooth((v - 0.2) / 0.8) - 0.10 * smooth((np.abs(u) - 0.55) / 0.45)
    col = sclera[None, None, :] * shade[..., None]
    # iris: large, dark, ring, centred, partly covered by the lids
    ir = 1.38 * b
    d = np.sqrt(dx * dx + dz * dz); rr = d / ir
    iris_a = smooth((1.0 - rr) / np.maximum(ts * b / ir * 1.4, 1e-3))
    ang = np.arctan2(dz, dx)
    base_i = np.array([0.20, 0.105, 0.055]) * np.ones_like(col)
    ring = smooth((0.82 - rr) / 0.3) * smooth((rr - 0.25) / 0.25)
    ic = base_i * (1 - ring[..., None]) + np.array([0.42, 0.25, 0.11]) * ring[..., None]
    ic = ic * (1 + 0.12 * np.sin(ang * 21)[..., None] * smooth((rr - 0.3) / 0.2)[..., None])
    limb = smooth((rr - 0.80) / 0.2)
    ic = ic * (1 - 0.6 * limb[..., None])
    col = col * (1 - iris_a[..., None]) + ic * iris_a[..., None]
    pup = smooth((0.40 - rr) / np.maximum(ts * b / ir * 1.4 + 0.05, 1e-3))
    col = col * (1 - pup[..., None]) + np.array([0.012, 0.01, 0.01]) * pup[..., None]
    # one catch-light, up and toward the nose side, and a faint second one
    for (hx, hz, hr, ha) in ((-0.28 * side * -1, 0.30, 0.17, 0.95), (0.25 * side * -1, -0.28, 0.08, 0.35)):
        hd = np.sqrt((dx - hx * ir) ** 2 + (dz - hz * ir) ** 2) / (hr * ir)
        hl = smooth((1.0 - hd) / 0.4) * ha
        col = col * (1 - hl[..., None]) + hl[..., None]
    # the lids: a dark upper line (heavier toward the outer corner), a soft shadow under it, a faint lower line
    edge_top = np.abs(v - top_edge)
    lash = smooth(1 - edge_top / (0.30 + 0.12 * np.clip(ou, 0, 1))) * (np.abs(u) < 1.10)
    lash = np.where(v > 0.0, lash, 0.0)
    lower = smooth(1 - np.abs(v - bot_edge) / 0.18) * (np.abs(u) < 1.0) * 0.55
    shadow_lid = smooth((v - (top_edge - 0.55)) / 0.5) * inside * 0.35
    alpha_eye = np.nan_to_num(inside * near)
    eye_open |= alpha_eye > 0.2
    col = np.nan_to_num(col)
    out = out * (1 - alpha_eye[..., None]) + col * alpha_eye[..., None]
    lash = np.nan_to_num(lash * near); lower = np.nan_to_num(lower * near)
    out = out * (1 - 0.92 * lash[..., None]) + np.array([0.045, 0.028, 0.024]) * 0.92 * lash[..., None]
    out = out * (1 - lower[..., None]) + np.array([0.16, 0.09, 0.07]) * lower[..., None]
# the brows: the baked brows come out mauve; repaint every texel in the brow band that is darker than the skin around it as dark brown, keeping its softness
skin_lum = float(np.median(px[have & (np.abs(P3[:, :, 0]) < 0.03) & (P3[:, :, 2] > lm["eyeL"][1] - 0.03) & (P3[:, :, 2] < lm["eyeL"][1] + 0.0)].mean(axis=1))) if have.any() else 0.6
for side, name in ((1, "L"), (-1, "R")):
    bx = lm["eye" + name][0]; ez_ = lm["eye" + name][1]
    band = have & (np.abs(P3[:, :, 0] - bx) < A_EYE * 2.1) & (P3[:, :, 2] > ez_ + B_EYE * 1.2) & (P3[:, :, 2] < ez_ + B_EYE * 6.5)
    lum_ = px.mean(axis=2)
    w = smooth((skin_lum * 0.97 - lum_) / 0.10) * band
    w = np.nan_to_num(w)
    dark = np.array([0.075, 0.045, 0.035])
    out = out * (1 - 0.95 * w[..., None]) + dark * 0.95 * w[..., None]
# unbaked texels (the bake leaves them white): inside the face they are skin
if "--head-part" in argv:
    cheek_med = np.median(px[have & (np.abs(P3[:, :, 0]) < 0.05) & (P3[:, :, 2] < lm["eyeL"][1] - 0.02) & (P3[:, :, 2] > lm["eyeL"][1] - 0.08)], axis=0)
    lumo = out.mean(axis=2); sato = out.max(axis=2) - out.min(axis=2)
    near_eye = (np.abs(P3[:, :, 0] - lm["eyeL"][0]) < A_EYE * 1.5) | (np.abs(P3[:, :, 0] - lm["eyeR"][0]) < A_EYE * 1.5)
    near_eye = near_eye & (np.abs(P3[:, :, 2] - lm["eyeL"][1]) < B_EYE * 2.2)
    white = have & (lumo > 0.62) & (sato < 0.22) & ~eye_open
    wk = smooth((lumo - 0.60) / 0.08) * white
    out = out * (1 - wk[..., None]) + cheek_med * wk[..., None]
out = np.clip(out, 0, 1)
buf = np.concatenate([out, np.ones((H, W, 1))], axis=2).astype(np.float32)
new = bpy.data.images.new("eyes", W, H, alpha=False)
new.colorspace_settings.name = "Non-Color"
new.pixels.foreach_set(buf.ravel())
bpy.context.scene.render.image_settings.file_format = "JPEG"
bpy.context.scene.render.image_settings.quality = int(opts.get("--quality", 80))
new.save_render(colour_out, scene=bpy.context.scene)
print("PAINTED", colour_out)
