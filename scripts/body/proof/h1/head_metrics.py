"""Prints the head box of a reduced character (above the neck joint): blender -b --python head_metrics.py -- <reduced.blend> <joints.json> <out.json>"""
import json
import sys
import bpy
import numpy as np
argv = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=argv[0])
neck = json.load(open(argv[1]))["joints"]["neck"][2]
v = np.array([p.co[:] for p in bpy.data.objects["Low"].data.vertices])
h = v[(v[:, 2] > neck + 0.02) & (np.abs(v[:, 0]) < 0.2)]
m = {"min": h.min(axis=0).tolist(), "max": h.max(axis=0).tolist(), "width": float(h[:, 0].max() - h[:, 0].min()), "depth": float(h[:, 1].max() - h[:, 1].min()), "top": float(h[:, 2].max()), "centre": [float((h[:, 0].max() + h[:, 0].min()) / 2), float((h[:, 1].max() + h[:, 1].min()) / 2)]}
json.dump(m, open(argv[2], "w"), indent=1); print("HEAD", m)
