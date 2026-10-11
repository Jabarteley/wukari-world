"""Crops the generated window and door pictures to just the frame and leaf and writes two small PNGs (256 px) used as atlas tiles.
  blender --background --python crop_textures.py -- <window.png> <door.png> <out-dir>"""
import os, sys
import bpy
import numpy as np
win, door, out = sys.argv[sys.argv.index("--") + 1:][:3]
for src, box, name, size in ((win, (350, 178, 850, 690), "window", (256, 256)), (door, (338, 48, 864, 850), "door", (170, 256))):
    im = bpy.data.images.load(src)
    w, h = im.size
    px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    x0, y0, x1, y1 = box          # y from the top of the picture; pixel rows are stored bottom first
    crop = px[h - y1:h - y0, x0:x1].copy()
    new = bpy.data.images.new(name, crop.shape[1], crop.shape[0], alpha=False)
    new.pixels.foreach_set(crop.reshape(-1))
    new.scale(*size)
    new.filepath_raw = os.path.join(out, name + ".png"); new.file_format = "PNG"; new.save()
    print("CROP", name, crop.shape)
