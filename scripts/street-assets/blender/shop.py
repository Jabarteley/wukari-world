"""A seller's shop interior: one small clean room (6 x 5 game units, back wall and two side walls, floor, open front), shelving on both side walls, a counter, a
clothes rail, twelve marked display slots, a framed sign for the shop's name and a wall area for its photos, in three decor themes.

  blender --background --disable-autoexec --python shop.py -- <fashion|food|electronics> <near|far> <out-dir> <textures-dir>

Axes as the rest of the set: front faces -Y (glTF +Z), origin on the floor at the centre of the room. The front is open (no wall) so the camera looks in from -Y.
Named empties slot_01 .. slot_12 carry width, height (the size of the item picture or model the slot holds), kind and facing; node shop_sign and node photos_area
are separate meshes with their own UV rectangle (the game can give them a material of their own). Writes <theme>.raw.glb and shop.json.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
import setlib
from setlib import Builder, V, finish, noise, base, load_png

theme, lod, out_dir, tex_dir = sys.argv[sys.argv.index("--") + 1:][:4]
near = lod == "near"
os.makedirs(out_dir, exist_ok=True)
setlib.SIZE = 1024
setlib.RECTS = {"wall": (0, 0, 256, 256), "floor": (256, 0, 256, 256), "wood": (512, 0, 128, 128), "counter": (640, 0, 128, 128), "metal": (768, 0, 64, 64), "dark": (832, 0, 64, 64),
                "trim": (896, 0, 64, 64), "sign": (0, 256, 256, 96), "photos": (256, 256, 256, 160), "decor": (0, 416, 512, 384), "white": (960, 0, 64, 64), "frame": (512, 128, 64, 64),
                "cloth": (576, 128, 128, 128), "box": (704, 128, 128, 128)}
THEMES = {
    "fashion": {"wall": (0.96, 0.80, 0.84), "floor": "wood", "counter": (0.62, 0.40, 0.28), "decor": "decor-fashion"},
    "food": {"wall": (0.96, 0.92, 0.78), "floor": "checker", "counter": (0.55, 0.35, 0.2), "decor": "decor-food"},
    "electronics": {"wall": (0.12, 0.17, 0.33), "floor": "tile", "counter": (0.2, 0.22, 0.28), "decor": "decor-elec"},
}
T = THEMES[theme]
rng = np.random.default_rng(5)
tiles = {}
R = setlib.RECTS
r = lambda n: (R[n][3], R[n][2])
tiles["wall"] = base(T["wall"], *r("wall"), 0.012, 32, rng)
fl = np.zeros(r("floor") + (3,))
if T["floor"] == "wood":
    fl[:] = (0.78, 0.6, 0.42)
    for k in range(8):
        fl[k * 32:(k + 1) * 32] *= 0.9 + 0.1 * (k % 2)
        fl[k * 32:k * 32 + 2] *= 0.6
elif T["floor"] == "checker":
    yy, xx = np.mgrid[0:256, 0:256]
    m = ((yy // 32 + xx // 32) % 2) == 0
    fl[:] = (0.85, 0.82, 0.78); fl[m] = (0.7, 0.2, 0.18)
else:
    yy, xx = np.mgrid[0:256, 0:256]
    fl[:] = (0.32, 0.34, 0.4)
    fl[(yy % 64 < 2) | (xx % 64 < 2)] = (0.12, 0.13, 0.16)
tiles["floor"] = np.clip(fl * (1 + noise((256, 256), 8, 0.03, rng)[:, :, None]), 0, 1)
tiles["wood"] = base((0.52, 0.34, 0.2), *r("wood"), 0.03, 16, rng)
for i in range(1, 6):
    tiles["wood"][int(i / 6 * 128) - 1:int(i / 6 * 128) + 1] *= 0.6
tiles["counter"] = base(T["counter"], *r("counter"), 0.03, 16, rng)
tiles["metal"] = base((0.45, 0.47, 0.5), *r("metal"), 0.03, 8, rng)
tiles["dark"] = base((0.1, 0.09, 0.09), *r("dark"), 0.02, 8, rng)
tiles["trim"] = base((0.95, 0.92, 0.84), *r("trim"), 0.015, 8, rng)
tiles["white"] = base((0.96, 0.96, 0.94), *r("white"), 0.01, 8, rng)
tiles["frame"] = base((0.35, 0.22, 0.12), *r("frame"), 0.03, 8, rng)
tiles["sign"] = base((0.97, 0.95, 0.9), *r("sign"), 0.008, 16, rng)
tiles["photos"] = base((0.9, 0.9, 0.88), *r("photos"), 0.008, 16, rng)
tiles["cloth"] = base((0.8, 0.3, 0.3), *r("cloth"), 0.05, 8, rng)
tiles["box"] = base((0.7, 0.55, 0.35), *r("box"), 0.03, 8, rng)
dec = bpy.data.images.load(os.path.join(tex_dir, T["decor"] + ".png"))
dw, dh = dec.size
da = np.empty(dw * dh * 4, dtype=np.float32); dec.pixels.foreach_get(da)
tiles["decor"] = da.reshape(dh, dw, 4)[:, :, :3][::-1]
atlas = np.ones((1024, 1024, 4), dtype=np.float32)
for n, arr in tiles.items():
    x, y, w, h = R[n]
    if arr.shape[:2] != (h, w):
        tmp = bpy.data.images.new("tmp" + n, arr.shape[1], arr.shape[0], alpha=False)
        tmp.pixels.foreach_set(np.concatenate([arr[::-1], np.ones(arr.shape[:2] + (1,))], axis=2).astype(np.float32).reshape(-1)); tmp.scale(w, h)
        o = np.empty(w * h * 4, dtype=np.float32); tmp.pixels.foreach_get(o)
        arr = o.reshape(h, w, 4)[:, :, :3][::-1]
    atlas[y:y + h, x:x + w, :3] = arr
img = bpy.data.images.new("shopatlas", 1024, 1024, alpha=False)
img.colorspace_settings.name = "sRGB"
img.pixels.foreach_set(atlas[::-1].reshape(-1))
if not near:
    img.scale(512, 512)
scn = bpy.context.scene
scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 74; scn.view_settings.view_transform = "Standard"
atlas_path = os.path.join(out_dir, "atlas-%s-%s.jpg" % (theme, lod))
img.save_render(atlas_path, scene=scn)

B = Builder(near)
W, D, H = 6.0, 5.0, 3.2
x0, x1, y0, y1 = -W / 2, W / 2, -D / 2, D / 2
# floor (with a low threshold at the open front) and the three walls
B.poly([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], "floor", (0, 0, -1), [(0, 0), (1, 0), (1, 1), (0, 1)])
B.box(x0 - 0.15, x1 + 0.15, y0 - 0.3, y0, -0.12, 0.0, "trim")
B.poly([(x0, y1, 0), (x1, y1, 0), (x1, y1, H), (x0, y1, H)], "wall", (0, 0, 1), [(0, 0), (1, 0), (1, 0.9), (0, 0.9)])
B.poly([(x0, y0, 0), (x0, y1, 0), (x0, y1, H), (x0, y0, H)], "wall", (0, 0, 1), [(0, 0), (1, 0), (1, 0.9), (0, 0.9)])
B.poly([(x1, y0, 0), (x1, y1, 0), (x1, y1, H), (x1, y0, H)], "wall", (0, 0, 1), [(0, 0), (1, 0), (1, 0.9), (0, 0.9)])
B.box(x0 - 0.12, x0, y0, y1, 0, H, "trim", front="trim", back="trim"); B.box(x1, x1 + 0.12, y0, y1, 0, H, "trim", front="trim", back="trim"); B.box(x0 - 0.12, x1 + 0.12, y1, y1 + 0.12, 0, H, "trim")
B.box(x0 - 0.12, x1 + 0.12, y0, y1, H, H + 0.12, "trim") if False else None
# skirting
for (ax0, ax1, ay0, ay1) in ((x0, x1, y1 - 0.04, y1), (x0, x0 + 0.04, y0, y1), (x1 - 0.04, x1, y0, y1)):
    B.box(ax0, ax1, ay0, ay1, 0, 0.14, "trim")
# the back wall's decor picture (a framed panel 4.2 wide) and the framed sign above it
B.poly([(-2.1, y1 - 0.03, 0.15), (2.1, y1 - 0.03, 0.15), (2.1, y1 - 0.03, 2.6), (-2.1, y1 - 0.03, 2.6)], "decor", (0, 0, 1))
B.cur = "shop_sign"
B.poly([(-1.6, y1 - 0.06, 2.7), (1.6, y1 - 0.06, 2.7), (1.6, y1 - 0.06, 3.15), (-1.6, y1 - 0.06, 3.15)], "sign", (0, 0, 1))
B.cur = None
B.box(-1.7, 1.7, y1 - 0.08, y1 - 0.03, 2.65, 2.7, "frame"); B.box(-1.7, 1.7, y1 - 0.08, y1 - 0.03, 3.15, 3.2, "frame")
B.box(-1.7, -1.65, y1 - 0.08, y1 - 0.03, 2.7, 3.15, "frame"); B.box(1.65, 1.7, y1 - 0.08, y1 - 0.03, 2.7, 3.15, "frame")
# the photos area on the left wall above the shelves
B.cur = "photos_area"
B.poly([(x0 + 0.05, -1.4, 2.35), (x0 + 0.05, 1.4, 2.35), (x0 + 0.05, 1.4, 3.1), (x0 + 0.05, -1.4, 3.1)], "photos", (0, 0, 1))
B.cur = None
for yy in (-1.45, 1.45):
    B.box(x0 + 0.02, x0 + 0.08, yy - 0.04, yy + 0.04, 2.3, 3.15, "frame")
B.box(x0 + 0.02, x0 + 0.08, -1.45, 1.45, 2.3, 2.34, "frame"); B.box(x0 + 0.02, x0 + 0.08, -1.45, 1.45, 3.11, 3.15, "frame")
slots = []


def shelf_unit(side, label):
    """Shelving along one side wall: two uprights per bay, three boards; slots on the two upper boards."""
    sx = -1 if side == "left" else 1
    xw = sx * (W / 2)
    depth = 0.45
    xa, xb = (xw, xw - sx * depth)
    lo_, hi_ = min(xa, xb), max(xa, xb)
    for yy in (-1.9, -0.55, 0.8, 2.15):
        B.box(lo_, hi_, yy - 0.04, yy + 0.04, 0, 2.2, "wood")
    for z in (0.35, 0.95, 1.6, 2.2):
        B.box(lo_, hi_, -1.94, 2.19, z, z + 0.05, "wood")
    B.box(lo_ + 0.02 if sx == 1 else lo_, hi_, -1.9, 2.15, 0.05, 0.35, "box") if False else None
    # the lowest bay holds boxes (dressing, not slots)
    for yy in (-1.3, 0.0, 1.4):
        B.box(min(xw - sx * 0.05, xw - sx * 0.4), max(xw - sx * 0.05, xw - sx * 0.4), yy - 0.4, yy + 0.4, 0.05, 0.33, "box")
    for z, row in ((0.95, 0), (1.6, 1)):
        for yy in (-0.65, 1.5):
            slots.append({"x": xw - sx * (depth - 0.06), "y": yy, "z": z + 0.05, "w": 0.55, "h": 0.4, "kind": "shelf", "facing": [-sx, 0, 0]})


shelf_unit("left", "left")
shelf_unit("right", "right")
# the counter, in front of the back wall, with a till box and two slots on its top
B.box(-1.4, 1.4, 0.3, 1.0, 0, 1.0, "counter", top="wood")
B.box(-1.3, -0.7, 0.45, 0.85, 1.0, 1.28, "dark")
B.box(-1.4, 1.4, 1.0, 1.04, 0.0, 1.0, "wood") if False else None
slots.append({"x": 0.1, "y": 0.55, "z": 1.0, "w": 0.45, "h": 0.4, "kind": "counter", "facing": [0, -1, 0]})
slots.append({"x": 0.9, "y": 0.55, "z": 1.0, "w": 0.45, "h": 0.4, "kind": "counter", "facing": [0, -1, 0]})
# the rail on the back wall for hanging items, two slots
B.box(-1.9, 1.9, y1 - 0.5, y1 - 0.46, 1.95, 1.99, "metal")
for xx in (-1.9, 1.9):
    B.box(xx - 0.03, xx + 0.03, y1 - 0.5, y1 - 0.02, 1.9, 2.0, "metal")
slots.append({"x": -0.8, "y": y1 - 0.46, "z": 1.95, "w": 0.5, "h": 0.8, "kind": "rail", "anchor": "top", "facing": [0, -1, 0]})
slots.append({"x": 0.8, "y": y1 - 0.46, "z": 1.95, "w": 0.5, "h": 0.8, "kind": "rail", "anchor": "top", "facing": [0, -1, 0]})
for i, s in enumerate(slots):
    B.empty("slot_%02d" % (i + 1), (s["x"], s["y"], s["z"]), width=s["w"], height=s["h"], kind=s["kind"], facing=s["facing"], anchor=s.get("anchor", "bottom"))
# a lamp position in the middle of the ceiling line, for the game's light
B.empty("light_room", (0, 0, H - 0.2), kind="room")
B.empty("camera_in", (0, y0 - 0.2, 1.6), kind="viewpoint inside the front edge")
B.empty("visitor_stand", (0, -0.9, 0), kind="where the visitor stands, facing +y (the back wall)")
tris = finish(B, "shop", "shop-" + theme + ("" if near else "-far"), out_dir, atlas_path, 0.0, (W, D), {})
rec = {"theme": theme, "triangles": tris, "room": {"width": W, "depth": D, "height": H, "front": "open at -y (glTF +z)", "origin": "floor centre"},
       "slots": [{"name": "slot_%02d" % (i + 1), "x": round(s["x"], 2), "y": round(s["z"], 2), "z": round(-s["y"], 2), "width": s["w"], "height": s["h"], "kind": s["kind"], "anchor": s.get("anchor", "bottom"), "facing_gltf": [s["facing"][0], 0, -s["facing"][1]]} for i, s in enumerate(slots)],
       "signArea": {"node": "shop_sign", "width": 3.2, "height": 0.45, "atlasRectPx": list(R["sign"]), "atlasSize": 1024}, "photosArea": {"node": "photos_area", "width": 2.8, "height": 0.75, "atlasRectPx": list(R["photos"]), "atlasSize": 1024}}
json.dump(rec, open(os.path.join(out_dir, "shop-%s.json" % theme), "w"), indent=1)
print("SHOP", theme, lod, tris, len(slots))
