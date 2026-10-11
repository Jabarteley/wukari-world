"""Measures a reduced head part: blender --background --python head_info.py -- <head.blend> <cut-z> <out.json>  (box, crown, chin height, the lowest z above the cut in the front of the face)."""
import json
import sys
import bpy
import numpy as np
argv = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=argv[0]); cut = float(argv[1])
v = np.array([p.co[:] for p in bpy.data.objects["Low"].data.vertices])
v = v[v[:, 2] > cut + 0.006]
front = v[v[:, 1] < v[:, 1].min() + 0.30 * (v[:, 1].max() - v[:, 1].min())]
front = front[np.abs(front[:, 0]) < 0.12]
info = {"chin": float(front[:, 2].min()), "crown": float(v[:, 2].max()), "xmin": float(v[:, 0].min()), "xmax": float(v[:, 0].max()), "ymin": float(v[:, 1].min()), "ymax": float(v[:, 1].max()), "zmin": float(v[:, 2].min())}
json.dump(info, open(argv[2], "w")); print("HEADINFO", info)
