"""Writes which texels of the colour map belong to the model's surface: blender --background --python uvcover.py -- <reduced.blend> <size> <out.npz>"""
import math, sys
import bpy
import numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
S = int(a[1])
me = bpy.data.objects["Low"].data
me.calc_loop_triangles()
uv = me.uv_layers.active.data
have = np.zeros((S, S), bool); zmap = np.zeros((S, S), np.float32)
verts = np.array([v.co[:] for v in me.vertices])
for t in me.loop_triangles:
    A = np.array([uv[l].uv[:] for l in t.loops]) * S
    x0, x1 = int(max(0, math.floor(A[:, 0].min()))), int(min(S - 1, math.ceil(A[:, 0].max())))
    y0, y1 = int(max(0, math.floor(A[:, 1].min()))), int(min(S - 1, math.ceil(A[:, 1].max())))
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    d = (A[1, 1] - A[2, 1]) * (A[0, 0] - A[2, 0]) + (A[2, 0] - A[1, 0]) * (A[0, 1] - A[2, 1])
    if abs(d) < 1e-9:
        continue
    l0 = ((A[1, 1] - A[2, 1]) * (xs - A[2, 0]) + (A[2, 0] - A[1, 0]) * (ys - A[2, 1])) / d
    l1 = ((A[2, 1] - A[0, 1]) * (xs - A[2, 0]) + (A[0, 0] - A[2, 0]) * (ys - A[2, 1])) / d
    ins = (l0 >= -0.03) & (l1 >= -0.03) & (1 - l0 - l1 >= -0.03)
    have[y0:y1 + 1, x0:x1 + 1] |= ins
    zz = l0 * verts[t.vertices[0]][2] + l1 * verts[t.vertices[1]][2] + (1 - l0 - l1) * verts[t.vertices[2]][2]
    zmap[y0:y1 + 1, x0:x1 + 1][ins] = zz[ins]
np.savez_compressed(a[2], have=have, z=zmap)
print("COVER", S, int(have.sum()))
