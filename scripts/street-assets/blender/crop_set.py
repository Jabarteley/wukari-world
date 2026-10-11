"""Crops the generated surface pictures to the parts the atlases use and writes small PNGs.
  blender --background --python crop_set.py -- <pictures-dir> <out-dir>
Boxes are (left, top, right, bottom) in picture pixels, then scaled to the given size."""
import os, sys
import bpy
import numpy as np
src, out = sys.argv[sys.argv.index("--") + 1:][:2]
JOBS = [("t-window.png", "window", (350, 178, 850, 690), (256, 256)), ("t-door.png", "door", (338, 48, 864, 850), (128, 256)),
        ("t-shopfront.png", "shutter", (290, 230, 910, 822), (256, 256)), ("t-church.png", "church", (430, 60, 770, 840), (128, 256)),
        ("t-mosque.png", "mosque", (300, 25, 900, 880), (128, 256)),
        ("t-fashion.png", "decor-fashion", (155, 115, 1050, 780), (512, 384)), ("t-food.png", "decor-food", (125, 75, 1075, 805), (512, 384)),
        ("t-elec.png", "decor-elec", (65, 100, 1135, 790), (512, 384))]
for fname, name, box, size in JOBS:
    path = os.path.join(src, fname)
    if not os.path.exists(path):
        print("SKIP", name); continue
    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    x0, y0, x1, y1 = box
    crop = px[h - y1:h - y0, x0:x1].copy()
    new = bpy.data.images.new(name, crop.shape[1], crop.shape[0], alpha=False)
    new.pixels.foreach_set(crop.reshape(-1)); new.scale(*size)
    new.filepath_raw = os.path.join(out, name + ".png"); new.file_format = "PNG"; new.save()
    print("CROP", name)
