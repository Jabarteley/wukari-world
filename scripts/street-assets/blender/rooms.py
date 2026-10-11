"""Room shells for the home grid: clean walls with door and window openings, skirting, floors by cell, window frames with burglar bars, ceiling light fittings.

  blender --background --disable-autoexec --python rooms.py -- <selfcontain|flat|house3|hall> <floor> <out-dir>

floor is ceramic, terrazzo, parquet or checker (the main floor; the kitchen corner is chequered and the bathroom mosaic). Axes as the furniture: origin at the BACK LEFT CORNER of the floor,
x along the back wall in metres (1 cell = 1.2 m), the room extends to -y (toward the camera, glTF +z). Walls are separate nodes (wall_back, wall_left, wall_front, wall_right, partitions)
so the game can hide the two the camera is behind. Wall colour is a vertex tint (WALLS in homelib.py). Window panes are their own node `glass` (glow at night); lights are named empties.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import homelib
from homelib import Builder, V, srgb, finish, CELL, WALLS

kind, floor, out_dir = sys.argv[sys.argv.index("--") + 1:][:3]
os.makedirs(out_dir, exist_ok=True)
H = 2.6
TH = 0.14
B = Builder(True)
B.k = 1.0
WT = srgb(WALLS["cream"])

# kind: (W cells, D cells, windows on walls, doors on walls, partitions, kitchen rect, bath rect, lights)
SPEC = {
    "selfcontain": dict(W=6, D=6, back=[("window", 3, 4)], left=[("door", 4, 5)], right=[("window", 2, 3)], front=[],
                        part=[], kitchen=(1, 4, 4, 6), bath=(4, 4, 6, 6), lights=[(3, 3)]),
    "flat": dict(W=12, D=8, back=[("window", 2, 3), ("window", 6, 7), ("window", 10, 11)], left=[("door", 6, 7)], right=[("window", 2, 3), ("window", 6.5, 7.5)], front=[("window", 3, 4), ("window", 8.5, 9.5)],
                 part=[("v", 8, 0, 8, [(3, 4, True), (6, 7, True)]), ("h", 5, 8, 12, [])], kitchen=(0, 0, 4, 3), bath=(8, 5, 12, 8), lights=[(3, 5), (6, 3), (10, 2.5), (10, 6.5), (2, 1.5)]),
    "house3": dict(W=18, D=12, back=[("window", 2, 3), ("window", 5, 6), ("window", 10, 11), ("window", 15, 16)], left=[("door", 8, 9)], right=[("window", 2, 3), ("window", 8, 9)], front=[("window", 3, 4), ("window", 11, 12), ("window", 15, 16)],
                   part=[("v", 8, 0, 4, []), ("v", 8, 6, 12, []), ("h", 4, 8, 18, [(10, 11, True), (15, 16, True)]), ("h", 6, 8, 18, [(10, 11, True), (15, 16, True)]), ("v", 13, 0, 4, []), ("v", 13, 6, 12, []), ("h", 9, 13, 18, [])],
                   kitchen=(0, 0, 4, 4), bath=(13, 6, 18, 9), lights=[(4, 7), (10.5, 2), (15.5, 2), (10.5, 9), (15.5, 7.5), (15.5, 10.5), (11, 5)]),
    "hall": dict(W=20, D=14, back=[("window", 4, 6), ("window", 10, 12), ("window", 15, 17)], left=[("door", 11, 13)], right=[("window", 3, 5), ("window", 9, 11)], front=[("window", 5, 7), ("window", 13, 15)], part=[], kitchen=None, bath=None,
                 lights=[(5, 6), (10, 6), (15, 6), (5, 10), (10, 10), (15, 10)]),
}
S = SPEC[kind]
W, D = S["W"], S["D"]
Wm, Dm = W * CELL, D * CELL
FLOORTILE = "floor_" + floor
doors = []
windows = []


MAP = {
    "back": lambda s, d: (s, d), "front": lambda s, d: (s, -Dm - d), "left": lambda s, d: (-d, -s), "right": lambda s, d: (Wm + d, -s),
}


def wbox(frame, s0, s1, d0, d1, z0, z1, tile, tint=None, **kw):
    f = MAP[frame] if isinstance(frame, str) else frame
    (xa, ya), (xb, yb) = f(s0, d0), f(s1, d1)
    B.box(min(xa, xb), max(xa, xb), min(ya, yb), max(ya, yb), z0, z1, tile, tint, **kw)


def wall(frame, length, openings, d0, d1, node, bars=True, skirt_sides=(0,), cut=None):
    """A wall along s in [0, length] metres; the slab spans depth d0..d1 (d increases away from the room for the outer walls; centred on 0 for a partition).
    openings: [(kind, s0, s1)] kind window, door (with a leaf) or gap (a doorway)."""
    B.cur = node
    if cut:                                   # a cutaway partition: low, so the dollhouse camera sees over it; doorways are plain gaps
        cur = 0.0
        for kindo, o0, o1 in sorted(openings, key=lambda o: o[1]) + [("end", length, length)]:
            if o0 > cur + 1e-4:
                wbox(frame, cur, o0, d0, d1, 0, cut, "plaster", WT)
                wbox(frame, cur, o0, d0 - 0.01, d1 + 0.01, cut, cut + 0.05, "wood_d")
                for sd in (0, 1):
                    wbox(frame, cur, o0, d0 - 0.014 if sd == 0 else d1, d0 if sd == 0 else d1 + 0.014, 0, 0.11, "white", srgb("#f2efe6"))
            cur = o1
            if kindo != "end":
                doors.append(dict(wall=node, along=round((o0 + o1) / 2, 2), width=round(o1 - o0, 2), height=cut, leaf=False))
        B.cur = None
        return
    segs = []
    cur = 0.0
    for kindo, o0, o1 in sorted(openings, key=lambda o: o[1]):
        if o0 > cur + 1e-4:
            segs.append((cur, o0, 0, H))
        if kindo == "window":
            segs.append((o0, o1, 0, 1.0)); segs.append((o0, o1, 2.2, H))
        else:
            segs.append((o0, o1, 2.2, H))
        cur = o1
    if cur < length - 1e-4:
        segs.append((cur, length, 0, H))
    for (a, b, z0, z1) in segs:
        wbox(frame, a, b, d0, d1, z0, z1, "plaster", WT)
        if z0 == 0:
            for sd in skirt_sides:
                if sd == 0:
                    wbox(frame, a, b, d0 - 0.014 if d0 < 0 else -0.014, d0 if d0 < 0 else 0.0, 0, 0.11, "white", srgb("#f2efe6"))
                else:
                    wbox(frame, a, b, d1, d1 + 0.014, 0, 0.11, "white", srgb("#f2efe6"))
    th = d1 - d0
    for kindo, o0, o1 in openings:
        mid = (o0 + o1) / 2
        w = o1 - o0
        if kindo == "window":
            wbox(frame, o0 - 0.03, o0 + 0.05, d0, d1, 1.0, 2.2, "white"); wbox(frame, o1 - 0.05, o1 + 0.03, d0, d1, 1.0, 2.2, "white")
            wbox(frame, o0 - 0.03, o1 + 0.03, d0 - 0.03, d1, 0.97, 1.03, "white"); wbox(frame, o0 - 0.03, o1 + 0.03, d0, d1, 2.17, 2.23, "white")
            B.cur = "glass_" + node
            wbox(frame, o0 + 0.05, o1 - 0.05, d0 + th * 0.45, d0 + th * 0.5, 1.03, 2.17, "glass")
            B.cur = node
            wbox(frame, mid - 0.015, mid + 0.015, d0 + th * 0.4, d0 + th * 0.55, 1.03, 2.17, "white")
            wbox(frame, o0 + 0.05, o1 - 0.05, d0 + th * 0.4, d0 + th * 0.55, 1.58, 1.62, "white")
            if bars:
                n = max(4, int(w / 0.13))
                for i in range(n + 1):
                    x = o0 + 0.07 + (w - 0.14) * i / n
                    wbox(frame, x - 0.012, x + 0.012, d1 + 0.01, d1 + 0.04, 1.0, 2.2, "dark")
                for z in (1.02, 1.62, 2.16):
                    wbox(frame, o0 + 0.03, o1 - 0.03, d1 + 0.01, d1 + 0.045, z - 0.012, z + 0.012, "dark")
                wbox(frame, mid - 0.2, mid + 0.2, d1 + 0.01, d1 + 0.05, 1.45, 1.75, "dark")
            windows.append(dict(wall=node, along=round(mid, 2), width=round(w, 2), z0=1.0, z1=2.2))
        elif kindo == "door":
            wbox(frame, o0 - 0.04, o0 + 0.04, d0, d1, 0, 2.25, "white"); wbox(frame, o1 - 0.04, o1 + 0.04, d0, d1, 0, 2.25, "white"); wbox(frame, o0 - 0.04, o1 + 0.04, d0, d1, 2.2, 2.27, "white")
            wbox(frame, o0 + 0.04, o1 - 0.04, d0 + th * 0.35, d0 + th * 0.55, 0.0, 2.2, "wood_m")
            wbox(frame, o0 + 0.1, o1 - 0.1, d0 + th * 0.54, d0 + th * 0.57, 0.1, 2.1, "wood_l")
            wbox(frame, o1 - 0.18, o1 - 0.1, d0 + th * 0.55, d0 + th * 0.9, 1.0, 1.04, "chrome")
            doors.append(dict(wall=node, along=round(mid, 2), width=round(w, 2), height=2.2))
        else:
            wbox(frame, o0 - 0.04, o0 + 0.04, d0, d1, 0, 2.25, "white"); wbox(frame, o1 - 0.04, o1 + 0.04, d0, d1, 0, 2.25, "white"); wbox(frame, o0 - 0.04, o1 + 0.04, d0, d1, 2.2, 2.27, "white")
            doors.append(dict(wall=node, along=round(mid, 2), width=round(w, 2), height=2.2, leaf=False))
    B.cur = None


def to_m(spec, flip=0):
    return [(k, a * CELL, b * CELL) for (k, a, b) in spec]


wall("back", Wm, to_m(S["back"]), 0.0, TH, "wall_back")
wall("left", Dm, to_m(S["left"]), 0.0, TH, "wall_left")
wall("front", Wm, to_m(S["front"]), 0.0, TH, "wall_front")
wall("right", Dm, to_m(S["right"]), 0.0, TH, "wall_right")
for (orient, at, a0, a1, gaps) in S["part"]:
    frame = (lambda s, d, at=at: (at * CELL + d, -s)) if orient == "v" else (lambda s, d, at=at: (s, -at * CELL + d))
    # the wall runs from a0 to a1 (cells): shift s so it starts at 0
    f2 = (lambda s, d, f=frame, a0=a0: f(s + a0 * CELL, d))
    wall(f2, (a1 - a0) * CELL, [("door" if leaf else "gap", (g0 - a0) * CELL, (g1 - a0) * CELL) for (g0, g1, leaf) in gaps], -TH / 2, TH / 2, "partition", bars=False, skirt_sides=(0, 1), cut=1.05)

# ---- the floor, cell by cell, so a tile keeps its size
B.cur = "floor"
kit = S.get("kitchen"); bath = S.get("bath")
inside = lambda r, cx, cy: r and r[0] <= cx < r[2] and r[1] <= cy < r[3]
for cy in range(D):
    for cx in range(W):
        t = "floor_checker" if inside(kit, cx, cy) else "floor_mosaic" if inside(bath, cx, cy) else FLOORTILE
        x0, x1, y0, y1 = cx * CELL, (cx + 1) * CELL, -(cy + 1) * CELL, -cy * CELL
        B.poly([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], t, (0, 0, -5), [(0, 0), (1, 0), (1, 1), (0, 1)])
B.cur = None
# an outer slab so the room has a base
B.box(-TH - 0.02, Wm + TH + 0.02, -Dm - TH - 0.02, TH + 0.02, -0.15, -0.04, "wood_d")

# ---- ceiling light fittings: a short rod, a shade and a glowing bulb; each its own empty
B.cur = None
for i, (cx, cy) in enumerate(S["lights"]):
    x, y = cx * CELL, -cy * CELL
    B.cyl(x, y, 2.35, H, 0.01, 6, "dark")
    B.cyl(x, y, 2.2, 2.35, 0.2, 12, "white", rtop=0.04, cap=False)
    B.cur = "glow"
    B.cyl(x, y, 2.12, 2.2, 0.06, 8, "lampglow")
    B.cur = None
    B.empty("light_ceiling_%d" % (i + 1), (x, y, 2.1), kind="ceiling")
B.empty("camera_target", (Wm / 2, -Dm / 2, 0.8), kind="centre")
name = "room-%s-%s" % (kind, floor)
tris, ext = finish(B, name, out_dir)
rec = {"room": kind, "cells": [W, D], "metres": [round(Wm, 2), round(Dm, 2), H], "floor": floor, "triangles": tris, "doors": doors, "windows": windows, "lights": len(S["lights"]),
       "nodes": ["wall_back", "wall_left", "wall_front", "wall_right", "partition", "floor", "glass_wall_back", "glass_wall_left", "glass_wall_front", "glass_wall_right", "glow"], "walls": WALLS, "floors": homelib.FLOORS,
       "gameCellOf": "x = cell x * 1.2 m, y = -(cell y) * 1.2 m (the game's y runs toward the camera)"}
json.dump(rec, open(os.path.join(out_dir, "room-%s.json" % kind), "w"), indent=1)
print("ROOM", name, tris)
