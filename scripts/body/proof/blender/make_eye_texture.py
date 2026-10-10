"""Paints the eye texture (own work, no third-party pixels): sclera with faint vessels, a streaked brown iris, limbal ring and pupil.

  blender --background --python make_eye_texture.py -- <out.jpg> [<size>]

The eye mesh is mapped by projection from the front (face_keys.py), so the iris is a disc in the middle of the texture.
"""
import math
import random
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
out, size = args[0], int(args[1]) if len(args) > 1 else 512
rnd = np.random.default_rng(3)
y, x = np.mgrid[0:size, 0:size] / (size - 1.0)
dx, dy = x - 0.5, y - 0.5
r = np.hypot(dx, dy)
ang = np.arctan2(dy, dx)
img = np.zeros((size, size, 3), np.float32)
# sclera: warm white, a little darker toward the edge, faint red vessels
sclera = np.array([0.93, 0.90, 0.87]) * (1 - 0.22 * np.clip((r - 0.3) / 0.2, 0, 1) ** 1.5)[..., None]
vessel = np.clip(np.sin(ang * 23 + rnd.normal(0, 1, (1, 1)) * 3) * np.sin(r * 90), 0, 1) * np.clip((r - 0.26) / 0.1, 0, 1) * 0.07
img[:] = sclera - np.stack([vessel * 0.1, vessel * 0.6, vessel * 0.6], -1)
# iris with radial streaks
iris_r = 0.235
streak = 0.5 + 0.5 * np.sin(ang * 60 + 3 * np.sin(ang * 7)) * np.sin(ang * 23 + 1)
base = np.array([0.10, 0.045, 0.02])
light = np.array([0.30, 0.15, 0.06])
t = np.clip((r / iris_r), 0, 1)
iris = base + (light - base) * (streak * 0.55 * (0.4 + 0.6 * t))[..., None] + (np.array([0.5, 0.3, 0.12]) - base) * (np.clip((0.55 - t) / 0.3, 0, 1) * 0.35)[..., None]
inside = r < iris_r
edge = np.clip((iris_r - r) / 0.012, 0, 1)[..., None]
img = img * (1 - edge) + iris * edge
# limbal ring and pupil
ring = np.clip(1 - np.abs(r - iris_r * 0.93) / 0.03, 0, 1)[..., None] * 0.7
img = img * (1 - ring) + np.array([0.02, 0.012, 0.008]) * ring
pupil = np.clip((0.085 - r) / 0.01, 0, 1)[..., None]
img = img * (1 - pupil) + np.array([0.01, 0.006, 0.005]) * pupil
img = np.clip(img, 0, 1)
rgba = np.concatenate([img, np.ones((size, size, 1), np.float32)], -1)
im = bpy.data.images.new("eye", size, size)
im.pixels = rgba.ravel()
im.filepath_raw = out
im.file_format = "JPEG"
im.save()
