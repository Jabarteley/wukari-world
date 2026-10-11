"""Labels every texel of a reduced character's colour map as skin, top, bottom, footwear or other, and writes the labels as a one-channel image.

  blender --background --disable-autoexec --python make_mask.py -- <reduced.blend> <colour.jpg> <joints.json> <face.json> <out-mask.png> <out-info.json> --split 0.80 [--shoe-z 0.085] [--skin-tol 0.2]

Labels are 0 other (eyes, brows, hair, lashes), 1 skin, 2 top, 3 bottom, 4 footwear, stored as value*51 (so 0, 51, 102, 153, 204).  The decision uses the position of
the texel on the surface and its own colour: skin is skin-coloured texels where skin can show (the head and neck, the arms and hands beyond the sleeves, the lower legs and
feet), garments are everything else, split at one height.  Every path is an argument.
"""
import json
import math
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, colour_in, joints_json, face_json, out_png, out_info = pos[:6]
split = float(opts["--split"]); shoe_z = float(opts.get("--shoe-z", 0.085)); tol = float(opts.get("--skin-tol", 0.2))
sleeve_x = float(opts.get("--sleeve-x", 0.30))       # beyond this distance from the middle the arm is bare
leg_z = float(opts.get("--bare-leg-z", 0.0))          # below this height the legs are bare (0: not bare)
jd = json.load(open(joints_json))["joints"]; fj = json.load(open(face_json))
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]; me = low.data
me.calc_loop_triangles()
uv = me.uv_layers.active.data
img = bpy.data.images.load(colour_in); img.colorspace_settings.name = "Non-Color"
W, H = img.size
px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3]
verts = np.array([v.co[:] for v in me.vertices])
P3 = np.full((H, W, 3), np.nan)
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
    l2 = 1 - l0 - l1
    inside = (l0 >= -0.03) & (l1 >= -0.03) & (l2 >= -0.03)
    if not inside.any():
        continue
    pts = l0[..., None] * verts[idx[0]] + l1[..., None] * verts[idx[1]] + l2[..., None] * verts[idx[2]]
    P3[y0:y1 + 1, x0:x1 + 1][inside] = pts[inside]
have = ~np.isnan(P3[:, :, 0])
X, Y, Z = P3[:, :, 0], P3[:, :, 1], P3[:, :, 2]
neck_z = jd["neck"][2]
ref = np.array(fj["skinCheek"])
dist = np.linalg.norm(px - ref, axis=2)
skin_like = dist < tol
eye_z = (fj["eyeL"][1] + fj["eyeR"][1]) / 2
head = have & (Z > neck_z - 0.02) & (np.abs(X) < 0.17)
# the head: skin where skin-coloured, but not the eyes, brows, lashes or any hair (those are other); the brow band and the eye zone are other unless skin-coloured
lab = np.zeros((H, W), dtype=np.uint8)
lab[head & skin_like] = 1
arm_skin = have & (np.abs(X) > sleeve_x) & (Z > 0.9) & (Z < neck_z) & skin_like
lab[arm_skin] = 1
cloth = have & (lab == 0) & ~head
lab[cloth & (Z >= split)] = 2
lab[cloth & (Z < split)] = 3
if leg_z > 0:
    lab[have & (Z < leg_z) & (Z > shoe_z) & skin_like & (np.abs(X) < 0.3)] = 1
foot = have & (Z < shoe_z) & ~head
lab[foot & ~skin_like] = 4
lab[foot & skin_like] = 1
if opts.get("--feet-shoes") == "1":
    lab[foot] = 4
# the lashes, brows and eye edges that were left as 0 on the head keep their own colour; garments never reach above the neck
skin_ref = np.median(px[lab == 1], axis=0)
counts = {k: int((lab == v).sum()) for k, v in (("other", 0), ("skin", 1), ("top", 2), ("bottom", 3), ("shoes", 4))}
print("MASK COUNTS", counts, "skin ref", skin_ref)
if opts.get("--half", "1") == "1":
    # the labels need half the resolution of the colour map: each block takes skin when two of its four texels are skin, otherwise the label of its first texel
    blocks = [lab[i::2, j::2] for i in (0, 1) for j in (0, 1)]
    skin_votes = sum((b_ == 1).astype(int) for b_ in blocks)
    lab = np.where(skin_votes >= 2, 1, blocks[0]).astype(np.uint8); H, W = lab.shape
buf = np.zeros((H, W, 4), dtype=np.float32)
v = (lab.astype(np.float32) * 51.0) / 255.0
buf[:, :, 0] = v; buf[:, :, 1] = v; buf[:, :, 2] = v; buf[:, :, 3] = 1.0
m = bpy.data.images.new("mask", W, H, alpha=False, float_buffer=False)
m.colorspace_settings.name = "Non-Color"
m.pixels.foreach_set(buf.ravel())
m.filepath_raw = out_png; m.file_format = "PNG"
bpy.context.scene.render.image_settings.color_mode = "BW"; bpy.context.scene.render.image_settings.color_depth = "8"; bpy.context.scene.render.image_settings.compression = 100
m.save_render(out_png, scene=bpy.context.scene)
json.dump({"counts": counts, "skinRef": [float(c) for c in skin_ref]}, open(out_info, "w"))
