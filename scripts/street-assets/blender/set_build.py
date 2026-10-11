"""Builds one asset of the street set (a building or a prop) as clean geometry on the shared atlas.

  blender --background --disable-autoexec --python set_build.py -- <type> <variant> <near|far> <out-dir> <atlas-dir>

The atlas for <variant> (cream, mint or sky; teal, red, blue are accepted for the kiosk and stall) is atlas-<palette>-<near|far>.jpg in <atlas-dir>, made once by make_atlas.py.
Writes <out-dir>/<type>-<variant>[-far].raw.glb and <out-dir>/<type>.json (footprint, door, signs, empties).
Axes: Blender Z up, the front faces -Y (glTF +Z, the game's forward). Origin on the ground, at the centre of the footprint.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import setlib
from setlib import Builder, Walls, V, hip_roof, gable_roof, pillar, finish, PALETTES, ALIAS

argv = sys.argv[sys.argv.index("--") + 1:]
kind, variant, lod, out_dir, atlas_dir = argv[:5]
near = lod == "near"
palette = ALIAS.get(variant, variant)
os.makedirs(out_dir, exist_ok=True)
B = Builder(near)
INFO = {"signs": [], "doors": []}
SEG = 10 if near else 6


def sign_group(n):
    B.cur = "sign_%d" % n


def end_group():
    B.cur = None


def slab_roof(W, D, H, yc=0.0, par=0.7, over=0.12):
    """Flat roof with a parapet all round."""
    B.box(-W / 2 - over, W / 2 + over, yc - D / 2 - over, yc + D / 2 + over, H, H + 0.25, "trim", top="flat")
    for (x0, x1, y0, y1) in ((-W / 2 - over, W / 2 + over, yc - D / 2 - over, yc - D / 2 - over + 0.14), (-W / 2 - over, W / 2 + over, yc + D / 2 + over - 0.14, yc + D / 2 + over),
                             (-W / 2 - over, -W / 2 - over + 0.14, yc - D / 2 - over, yc + D / 2 + over), (W / 2 + over - 0.14, W / 2 + over, yc - D / 2 - over, yc + D / 2 + over)):
        B.box(x0, x1, y0, y1, H + 0.25, H + 0.25 + par, "trim")


def plinth(W, D, yc=0.0, h=0.3, o=0.12):
    B.box(-W / 2 - o, W / 2 + o, yc - D / 2 - o, yc + D / 2 + o, 0, h, "conc")


def sign_quad(n, wall, t, z, w, h, off=0.07):
    """A blank sign board on a wall: its own node (sign_n) so the game can give it its own material; records the UV rectangle it uses."""
    sign_group(n)
    wall.quad(wall_side[0], t - w / 2, t + w / 2, z, z + h, off, "sign", (0, 0, 1))
    end_group()
    INFO["signs"].append({"node": "sign_%d" % n, "width": w, "height": h, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})


wall_side = ["front"]


def building_shops():
    W, D, H0, FL = 12.0, 8.0, 3.7, 3.4
    H = H0 + 2 * FL
    w = Walls(B, W, D); yc = 0.0
    plinth(W, D)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.3, H, "wall")
    slab_roof(W, D, H)
    # ground floor: four lock-up shops with roller shutters and a sign board each; a canopy slab over the pavement carries the first-floor walkway
    for i, t in enumerate((-4.5, -1.5, 1.5, 4.5)):
        w.quad("front", t - 1.25, t + 1.25, 0.3, 2.5, 0.04, "shutter")
        sign_quad(i + 1, w, t, 2.6, 2.4, 0.7)
        INFO["doors"].append({"x": t, "approachZ": D / 2 + 1.2, "what": "shop %d" % (i + 1)})
    B.box(-W / 2, W / 2, -D / 2 - 1.5, -D / 2, H0 - 0.2, H0 + 0.05, "conc")
    for t in (-W / 2 + 0.2, W / 2 - 0.2):
        pillar(B, t, -D / 2 - 1.4, 0.3, H0 - 0.2, 0.3, "conc")
    B.box(-W / 2, W / 2, -D / 2 - 1.5, -D / 2 - 1.42, H0 + 0.05, H0 + 0.95, "rail")
    for fl in (1, 2):
        zc = H0 + (fl - 1) * FL + 1.95
        for t in (-4.5, -1.5, 1.5, 4.5):
            w.window("front", t, zc, 1.4, 1.7)
        for t in (-2.6, 0, 2.6):
            for s in ("left", "right", "back"):
                w.window(s, t, zc, 1.4, 1.7)
    w.door("front", 0, 1.4, 2.5, z=H0 + 0.05) if False else None
    return W, D, 0.0, {"x": 0.0, "y": -D / 2 - 1.5}


def building_shoprow():
    W, D, H = 10.5, 6.0, 3.6
    w = Walls(B, W, D)
    plinth(W, D)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.3, H - 0.08, "wall")
    # mono-pitch roof sloping to the back, a deep canopy in front on posts
    over = 0.3
    ref = (0, 0, H)
    B.poly([(-W / 2 - over, -D / 2 - 1.3, H + 0.1), (W / 2 + over, -D / 2 - 1.3, H + 0.1), (W / 2 + over, D / 2 + over, H + 0.0), (-W / 2 - over, D / 2 + over, H + 0.0)], "roof", (0, 0, H - 9),
           [(0, 0), (W / 13, 0), (W / 13, (D + 1.6) / 13), (0, (D + 1.6) / 13)])
    B.poly([(-W / 2 - over, -D / 2 - 1.3, H + 0.1), (W / 2 + over, -D / 2 - 1.3, H + 0.1), (W / 2 + over, -D / 2 - 1.3, H - 0.25), (-W / 2 - over, -D / 2 - 1.3, H - 0.25)], "trim", (0, -20, H))
    B.poly([(-W / 2 - over, -D / 2 - 1.3, H - 0.05), (W / 2 + over, -D / 2 - 1.3, H - 0.05), (W / 2 + over, D / 2 + over, H - 0.1), (-W / 2 - over, D / 2 + over, H - 0.1)], "dark", (0, 0, H + 9))
    for t in (-W / 2 + 0.2, -W / 6, W / 6, W / 2 - 0.2):
        pillar(B, t, -D / 2 - 1.1, 0.3, H - 0.25, 0.25, "conc")
    B.box(-W / 2 - over, W / 2 + over, -D / 2 - 1.3, -D / 2, 0, 0.2, "conc")
    for i, t in enumerate((-3.5, 0.0, 3.5)):
        w.quad("front", t - 1.3, t + 1.3, 0.3, 2.7, 0.04, "shutter")
        sign_quad(i + 1, w, t, 2.78, 2.6, 0.6)
        INFO["doors"].append({"x": t, "approachZ": D / 2 + 1.6, "what": "shop %d" % (i + 1)})
    for t in (-1.75, 1.75):
        B.box(t - 0.06, t + 0.06, -D / 2 - 0.05, -D / 2 + 0.05, 0.3, H, "conc")
    return W, D + 1.3, -0.65, None


def building_church():
    W, D, H = 8.0, 13.0, 5.0
    w = Walls(B, W, D)
    plinth(W, D, h=0.4)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.4, H, "wall")
    gable_roof(B, W, D, H, 0.5, 3.0)
    # tower on the front with a spire and a cross
    TW, TH = 3.2, 9.0
    ty = -D / 2 - 0.9
    B.box(-TW / 2, TW / 2, ty - TW / 2, ty + TW / 2, 0.4, TH, "wall")
    B.box(-TW / 2 - 0.15, TW / 2 + 0.15, ty - TW / 2 - 0.15, ty + TW / 2 + 0.15, TH - 0.1, TH + 0.2, "trim")
    sp = V((0, ty, TH + 3.5))
    for a, b in (((-TW / 2, ty - TW / 2), (TW / 2, ty - TW / 2)), ((TW / 2, ty - TW / 2), (TW / 2, ty + TW / 2)), ((TW / 2, ty + TW / 2), (-TW / 2, ty + TW / 2)), ((-TW / 2, ty + TW / 2), (-TW / 2, ty - TW / 2))):
        B.poly([V((a[0], a[1], TH + 0.2)), V((b[0], b[1], TH + 0.2)), sp], "roof", (0, ty, TH))
    B.box(-0.08, 0.08, ty - 0.08, ty + 0.08, TH + 3.4, TH + 4.9, "white")
    B.box(-0.45, 0.45, ty - 0.08, ty + 0.08, TH + 4.1, TH + 4.3, "white")
    tw = Walls(B, TW, TW)
    # the walls of the tower for the door and windows are drawn with a Walls helper centred on the tower
    class Shift:
        def __init__(self, base_w, dy): self.w, self.dy = base_w, dy
    B.poly([V((-0.8, ty - TW / 2 - 0.04, 0.4)), V((0.8, ty - TW / 2 - 0.04, 0.4)), V((0.8, ty - TW / 2 - 0.04, 3.2)), V((-0.8, ty - TW / 2 - 0.04, 3.2))], "door", (0, 0, 1.5), [(0, 0), (1, 0), (1, 1), (0, 1)])
    B.poly([V((-0.55, ty - TW / 2 - 0.04, 5.6)), V((0.55, ty - TW / 2 - 0.04, 5.6)), V((0.55, ty - TW / 2 - 0.04, 8.0)), V((-0.55, ty - TW / 2 - 0.04, 8.0))], "church", (0, 0, 1.5))
    for sx in (-1, 1):
        for y in (-3.8, 0.0, 3.8):
            B.poly([V((sx * (W / 2 + 0.04), y - 0.6, 1.2)), V((sx * (W / 2 + 0.04), y + 0.6, 1.2)), V((sx * (W / 2 + 0.04), y + 0.6, 4.0)), V((sx * (W / 2 + 0.04), y - 0.6, 4.0))], "church", (0, y, 2.5))
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 0.9 + TW / 2 + 1.0, "what": "church door"})
    return W, D + TW / 2 + 0.9, -(TW / 2 + 0.9) / 2 + 0.0, {"x": 0.0, "y": ty - TW / 2}


def building_mosque():
    W, D, H = 10.0, 10.0, 5.0
    plinth(W, D, h=0.4)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.4, H, "wall")
    slab_roof(W, D, H, par=0.6)
    # main dome: a stepped hemisphere of rings (gold), on a drum
    R, rings = 3.2, (5 if near else 3)
    B.cyl(0, 0, H + 0.25, H + 1.0, R + 0.2, SEG * 2 if near else 8, "trim", "trim")
    prev = [(R, H + 1.0)]
    for i in range(1, rings + 1):
        a = i / rings * math.pi / 2
        prev.append((R * math.cos(a), H + 1.0 + R * 0.95 * math.sin(a)))
    n = SEG * 2 if near else 8
    for i in range(rings):
        (r0, z0), (r1, z1) = prev[i], prev[i + 1]
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            pts = [V((r0 * math.cos(a0), r0 * math.sin(a0), z0)), V((r0 * math.cos(a1), r0 * math.sin(a1), z0)), V((r1 * math.cos(a1), r1 * math.sin(a1), z1)), V((r1 * math.cos(a0), r1 * math.sin(a0), z1))]
            if i == rings - 1:
                pts = pts[:3]
            B.poly(pts, "gold", (0, 0, H), [(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)][:len(pts)])
    B.box(-0.1, 0.1, -0.1, 0.1, H + 1.0 + R * 0.95, H + 1.0 + R * 0.95 + 0.8, "gold")
    # minaret on one corner
    mx, my = W / 2 + 0.2, -D / 2 - 0.2
    B.cyl(mx, my, 0.4, 11.0, 0.8, 8, "wall", "wall", 0.7)
    B.cyl(mx, my, 11.0, 11.3, 1.1, 8, "trim", "trim")
    for k in range(6 if near else 4):
        a0, a1 = 2 * math.pi * k / (6 if near else 4), 2 * math.pi * (k + 1) / (6 if near else 4)
        B.poly([V((mx + 0.9 * math.cos(a0), my + 0.9 * math.sin(a0), 11.3)), V((mx + 0.9 * math.cos(a1), my + 0.9 * math.sin(a1), 11.3)), V((mx, my, 13.0))], "gold", (mx, my, 11))
    B.box(mx - 0.04, mx + 0.04, my - 0.04, my + 0.04, 12.9, 13.7, "gold")
    w = Walls(B, W, D)
    w.quad("front", -1.0, 1.0, 0.4, 3.2, 0.05, "door", (0, 0, 1))
    for t in (-3.5, 3.5):
        w.quad("front", t - 0.8, t + 0.8, 1.3, 4.3, 0.04, "mosque")
    for s in ("left", "right", "back"):
        for t in (-3.0, 0.0, 3.0):
            w.quad(s, t - 0.8, t + 0.8, 1.3, 4.3, 0.04, "mosque")
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 1.2, "what": "mosque entrance"})
    return W + 1.2, D + 0.4, 0.0, {"x": 0.0, "y": -D / 2}


def building_school():
    W, D, FL = 16.0, 7.0, 3.4
    H = 2 * FL
    w = Walls(B, W, D)
    plinth(W, D)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.3, H, "wall")
    slab_roof(W, D, H, par=0.5)
    B.box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.1, D / 2 + 0.1, FL - 0.1, FL + 0.1, "trim")
    for fl in range(2):
        zc = fl * FL + 1.9
        for t in (-6.5, -4.5, -2.5, 2.5, 4.5, 6.5):
            w.window("front", t, zc, 1.5, 1.7)
        for t in (-6.0, -3.0, 0.0, 3.0, 6.0):
            w.window("back", t, zc, 1.5, 1.7)
    for s in ("left", "right"):
        for fl in range(2):
            for t in (-1.8, 1.8):
                w.window(s, t, fl * FL + 1.9, 1.5, 1.7)
    # entrance porch with two columns and a board for the school's name
    B.box(-1.8, 1.8, -D / 2 - 1.8, -D / 2, 0, 0.25, "conc")
    B.box(-2.0, 2.0, -D / 2 - 1.9, -D / 2, 3.1, 3.4, "conc")
    for sx in (-1, 1):
        pillar(B, sx * 1.7, -D / 2 - 1.7, 0.25, 3.1, 0.3, "trim")
    w.door("front", 0, 1.6, 2.6, z=0.3)
    sign_quad(1, w, 0, FL + 0.5, 5.0, 0.9, off=0.08)
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 1.9, "what": "school entrance"})
    return W, D + 1.9, -0.95, {"x": 0.0, "y": -D / 2 - 1.8}


def building_clinic():
    W, D, H = 11.0, 8.0, 3.7
    w = Walls(B, W, D)
    plinth(W, D, h=0.35)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.35, H, "wall")
    slab_roof(W, D, H, par=0.5)
    # covered entrance on posts, a ramp, a red cross on the front, windows
    B.box(-2.4, 2.4, -D / 2 - 2.2, -D / 2, 3.0, 3.25, "conc")
    for sx in (-1, 1):
        pillar(B, sx * 2.2, -D / 2 - 2.0, 0.35, 3.0, 0.3, "trim")
    B.box(-2.4, 2.4, -D / 2 - 2.2, -D / 2, 0, 0.35, "conc")
    w.door("front", 0, 1.8, 2.5, z=0.35)
    for t in (-4.0, 4.0):
        w.window("front", t, 1.9, 1.6, 1.8)
    for s in ("left", "right", "back"):
        for t in (-2.5, 0.0, 2.5):
            w.window(s, t, 1.9, 1.5, 1.7)
    B.box(-0.18, 0.18, -D / 2 - 0.08, -D / 2 - 0.03, H - 1.5, H - 0.3, "red")
    B.box(-0.6, 0.6, -D / 2 - 0.08, -D / 2 - 0.03, H - 1.0, H - 0.8, "red")
    sign_quad(1, w, -3.5, H - 1.3, 3.2, 0.9)
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 2.2, "what": "clinic entrance"})
    return W, D + 2.2, -1.1, {"x": 0.0, "y": -D / 2 - 2.2}


def building_filling():
    W, D, CH = 12.0, 9.0, 4.8
    # canopy on four pillars, red and white fascia, two pump islands with pumps, a small shop at the back
    B.box(-W / 2, W / 2, -D / 2, D / 2 - 3.0, CH, CH + 0.35, "white", top="flat")
    for (x0, x1, y0, y1) in ((-W / 2, W / 2, -D / 2, -D / 2 + 0.05), (-W / 2, W / 2, D / 2 - 3.05, D / 2 - 3.0), (-W / 2, -W / 2 + 0.05, -D / 2, D / 2 - 3.0), (W / 2 - 0.05, W / 2, -D / 2, D / 2 - 3.0)):
        pass
    B.poly([(-W / 2, -D / 2 - 0.02, CH - 0.5), (W / 2, -D / 2 - 0.02, CH - 0.5), (W / 2, -D / 2 - 0.02, CH + 0.35), (-W / 2, -D / 2 - 0.02, CH + 0.35)], "redwhite", (0, 0, CH), [(0, 0), (1, 0), (1, 1), (0, 1)])
    for sx in (-1, 1):
        B.poly([(sx * W / 2 + 0.02 * sx, -D / 2, CH - 0.5), (sx * W / 2 + 0.02 * sx, D / 2 - 3.0, CH - 0.5), (sx * W / 2 + 0.02 * sx, D / 2 - 3.0, CH + 0.35), (sx * W / 2 + 0.02 * sx, -D / 2, CH + 0.35)], "redwhite", (0, 0, CH))
    for sx in (-1, 1):
        for y in (-D / 2 + 0.6, D / 2 - 3.6):
            pillar(B, sx * (W / 2 - 0.8), y, 0, CH, 0.5, "white")
    for sx in (-3.0, 3.0):
        B.box(sx - 0.5, sx + 0.5, -2.2, 0.4, 0, 0.25, "conc")
        for dy in (-1.4, -0.4):
            B.box(sx - 0.3, sx + 0.3, dy - 0.2, dy + 0.2, 0.25, 1.9, "red", top="white")
            B.box(sx - 0.25, sx + 0.25, dy - 0.21, dy - 0.19, 1.2, 1.7, "dark") if False else None
    # shop building
    SW, SD, SH = 8.0, 3.2, 3.4
    sy = D / 2 - SD / 2
    B.box(-SW / 2, SW / 2, sy - SD / 2, sy + SD / 2, 0, SH, "wall")
    slab_roof(SW, SD, SH, yc=sy, par=0.4)
    sw = Walls(B, SW, SD)
    # draw the shop's front windows and door on its front wall (shifted by sy)
    for t in (-2.5, 2.5):
        B.poly([V((t - 1.0, sy - SD / 2 - 0.04, 0.8)), V((t + 1.0, sy - SD / 2 - 0.04, 0.8)), V((t + 1.0, sy - SD / 2 - 0.04, 2.5)), V((t - 1.0, sy - SD / 2 - 0.04, 2.5))], "glass", (0, sy, 1.5))
    B.poly([V((-0.7, sy - SD / 2 - 0.05, 0)), V((0.7, sy - SD / 2 - 0.05, 0)), V((0.7, sy - SD / 2 - 0.05, 2.4)), V((-0.7, sy - SD / 2 - 0.05, 2.4))], "door", (0, sy, 1.5))
    sign_group(1)
    B.poly([V((-3.0, sy - SD / 2 - 0.08, SH - 0.8)), V((3.0, sy - SD / 2 - 0.08, SH - 0.8)), V((3.0, sy - SD / 2 - 0.08, SH - 0.1)), V((-3.0, sy - SD / 2 - 0.08, SH - 0.1))], "sign", (0, sy, 1.5))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 6.0, "height": 0.7, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})
    # price pole
    B.box(5.0, 5.2, -D / 2 + 0.2, -D / 2 + 0.4, 0, 4.0, "metal")
    B.box(4.6, 5.6, -D / 2 + 0.15, -D / 2 + 0.45, 4.0, 5.0, "red")
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 1.5, "what": "forecourt (drive-in), shop door at the back"})
    return W + 0.5, D, 0.0, {"x": 0.0, "y": sy - SD / 2}


def building_bank():
    W, D, H = 11.0, 9.0, 7.0
    w = Walls(B, W, D)
    plinth(W, D, h=0.4)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.4, H, "wall")
    slab_roof(W, D, H, par=0.7)
    # portico: four columns carrying a pediment (a triangle), steps, a blue band with a sign
    B.box(-4.2, 4.2, -D / 2 - 2.2, -D / 2, 0, 0.5, "conc")
    for k in range(4):
        x = -3.3 + k * 2.2
        B.cyl(x, -D / 2 - 1.7, 0.5, 5.0, 0.35, 10 if near else 6, "trim", "trim")
    B.box(-4.2, 4.2, -D / 2 - 2.2, -D / 2, 5.0, 5.5, "trim")
    B.poly([V((-4.3, -D / 2 - 2.2, 5.5)), V((4.3, -D / 2 - 2.2, 5.5)), V((0, -D / 2 - 2.2, 6.9))], "trim", (0, -D / 2, 5.5))
    B.poly([V((-4.3, -D / 2 - 2.2, 5.5)), V((4.3, -D / 2 - 2.2, 5.5)), V((0, -D / 2 - 2.2, 6.9))], "trim", (0, 0, 5.5))
    w.door("front", 0, 1.8, 2.7, z=0.4)
    for t in (-3.3, 3.3):
        w.quad("front", t - 0.9, t + 0.9, 1.0, 3.4, 0.04, "glass")
    for t in (-3.5, 0, 3.5):
        w.window("front", t, 5.6, 1.5, 1.4) if False else None
    for s in ("left", "right", "back"):
        for t in (-2.8, 0, 2.8):
            w.window(s, t, 1.9, 1.5, 1.7); w.window(s, t, 5.1, 1.5, 1.7)
    B.box(-W / 2, W / 2, -D / 2 - 0.1, -D / 2, 3.7, 4.3, "bluepaint")
    sign_quad(1, w, 0, 3.75, 4.2, 0.5, off=0.14) if False else None
    sign_group(1)
    B.poly([V((-2.1, -D / 2 - 0.15, 6.1)), V((2.1, -D / 2 - 0.15, 6.1)), V((2.1, -D / 2 - 0.15, 6.8)), V((-2.1, -D / 2 - 0.15, 6.8))], "sign", (0, 0, 6))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 4.2, "height": 0.7, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 2.2, "what": "bank door"})
    return W + 0.3, D + 2.2, -1.1, {"x": 0.0, "y": -D / 2 - 2.2}


def building_unfinished():
    W, D, FL = 9.0, 7.0, 3.2
    # a concrete frame: columns, floor slabs, block walls part way up, rebar stubs on top, a heap of blocks
    xs = (-W / 2 + 0.2, -W / 6, W / 6, W / 2 - 0.2)
    ys = (-D / 2 + 0.2, 0.0, D / 2 - 0.2)
    for x in xs:
        for y in ys:
            B.box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 0, 2 * FL + 0.4, "conc")
            if near:
                for dx, dy in ((-0.12, -0.12), (0.12, 0.12)):
                    B.box(x + dx - 0.02, x + dx + 0.02, y + dy - 0.02, y + dy + 0.02, 2 * FL + 0.4, 2 * FL + 1.6, "metal")
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0, 0.3, "conc")
    for fl in (1, 2):
        B.box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.1, D / 2 + 0.1, fl * FL, fl * FL + 0.3, "conc")
    # block walls on the ground floor: back and left side full, front half-filled with a door gap, right side half height
    B.box(-W / 2, W / 2, D / 2 - 0.3, D / 2, 0.3, FL, "block")
    B.box(-W / 2, -W / 2 + 0.3, -D / 2, D / 2, 0.3, FL, "block")
    B.box(W / 2 - 0.3, W / 2, -D / 2, D / 2, 0.3, 1.4, "block")
    B.box(-W / 2, -1.2, -D / 2, -D / 2 + 0.3, 0.3, FL, "block")
    B.box(1.2, W / 2, -D / 2, -D / 2 + 0.3, 0.3, 1.5, "block")
    B.box(-W / 2, W / 2, D / 2 - 0.3, D / 2, FL + 0.3, FL + 1.2, "block")
    for i in range(3):
        B.box(W / 2 + 0.7 + (i % 2) * 0.55, W / 2 + 1.2 + (i % 2) * 0.55, -1.0 + i * 0.4, -0.5 + i * 0.4, 0, 0.4, "block")
    B.box(W / 2 + 0.6, W / 2 + 1.7, -2.0, -1.3, 0, 0.9, "block")
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 1.0, "what": "open ground floor (no door)"})
    return W + 2.0, D, 0.0, {"x": 0.0, "y": -D / 2}


# ---------------------------------------------------------------------------------------------------------- props
def prop_kiosk():
    W, D, H = 3.0, 2.6, 2.7
    plinth(W, D, h=0.15, o=0.1)
    B.box(-W / 2, W / 2, -D / 2, D / 2, 0.15, H, "wood")
    # serving opening with shelves of goods behind, a counter slab with produce on it, a hinged hatch, an awning and a sign board, a side door
    oz0, oz1 = 1.15, 2.2
    B.poly([(-W / 2 + 0.25, -D / 2 - 0.03, oz0), (W / 2 - 0.25, -D / 2 - 0.03, oz0), (W / 2 - 0.25, -D / 2 - 0.03, oz1), (-W / 2 + 0.25, -D / 2 - 0.03, oz1)], "dark", (0, 0, 1))
    for z in (1.5, 1.85):
        B.box(-W / 2 + 0.3, W / 2 - 0.3, -D / 2 - 0.04, -D / 2 + 0.3, z, z + 0.05, "wood")
        for i in range(5):
            x = -1.05 + i * 0.52
            B.box(x - 0.15, x + 0.15, -D / 2 - 0.02, -D / 2 + 0.25, z + 0.05, z + 0.3 + 0.07 * (i % 2), "goods")
    B.box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.65, -D / 2, oz0 - 0.1, oz0, "wood")
    for i, x in enumerate((-1.0, -0.35, 0.3, 0.95)):
        B.box(x - 0.25, x + 0.25, -D / 2 - 0.55, -D / 2 - 0.1, oz0, oz0 + 0.3 + 0.1 * (i % 2), "goods" if i % 2 == 0 else "fruit")
    az0, az1 = 2.55, 2.1
    B.poly([(-W / 2 - 0.25, -D / 2, az0), (W / 2 + 0.25, -D / 2, az0), (W / 2 + 0.25, -D / 2 - 1.2, az1), (-W / 2 - 0.25, -D / 2 - 1.2, az1)], "stripe", (0, -D / 2 - 0.6, 0))
    B.poly([(-W / 2 - 0.25, -D / 2, az0 - 0.04), (W / 2 + 0.25, -D / 2, az0 - 0.04), (W / 2 + 0.25, -D / 2 - 1.2, az1 - 0.04), (-W / 2 - 0.25, -D / 2 - 1.2, az1 - 0.04)], "dark", (0, -D / 2 - 0.6, 9))
    B.poly([(-W / 2 - 0.25, -D / 2 - 1.2, az1), (W / 2 + 0.25, -D / 2 - 1.2, az1), (W / 2 + 0.25, -D / 2 - 1.2, az1 - 0.3), (-W / 2 - 0.25, -D / 2 - 1.2, az1 - 0.3)], "stripe", (0, 0, az1 - 0.1))
    B.box(-W / 2 - 0.2, W / 2 + 0.2, -D / 2 - 0.1, D / 2 + 0.2, H, H + 0.12, "metal", top="roof")
    sign_group(1)
    B.poly([(-1.2, -D / 2 - 0.1, H - 0.5), (1.2, -D / 2 - 0.1, H - 0.5), (1.2, -D / 2 - 0.1, H + 0.35), (-1.2, -D / 2 - 0.1, H + 0.35)], "sign", (0, 0, H))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 2.4, "height": 0.85, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})
    B.poly([(W / 2 + 0.03, -0.7, 0.15), (W / 2 + 0.03, 0.5, 0.15), (W / 2 + 0.03, 0.5, 2.1), (W / 2 + 0.03, -0.7, 2.1)], "door", (0, 0, 1))
    # crates and a stool beside it
    B.box(W / 2 + 0.35, W / 2 + 1.0, -D / 2 - 0.2, -D / 2 + 0.45, 0, 0.45, "wood", top="goods")
    B.box(W / 2 + 0.35, W / 2 + 1.0, -D / 2 - 0.2, -D / 2 + 0.45, 0.45, 0.9, "wood", top="fruit")
    INFO["doors"].append({"x": 0.0, "approachZ": D / 2 + 1.4, "what": "serving counter"})
    return W + 1.4, D + 1.2, -0.6 + 0.35, {"x": 0.0, "y": -D / 2 - 0.65}


def prop_stall():
    # a richer market stall: plank table with produce heaps, two crates, a stool, a plastic basin, a pole and an eight-panel umbrella, a cloth hanging at the back
    B.box(-1.3, 1.3, -0.65, 0.65, 0.9, 1.0, "wood")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * 1.2 - 0.05, sx * 1.2 + 0.05, sy * 0.55 - 0.05, sy * 0.55 + 0.05, 0.0, 0.9, "wood")
    B.box(-1.25, 1.25, -0.6, 0.6, 0.35, 0.4, "wood")
    for i, (x, t) in enumerate(((-0.85, "goods"), (-0.1, "fruit"), (0.7, "goods"))):
        B.box(x - 0.3, x + 0.3, -0.4, 0.3, 1.0, 1.28 + 0.06 * (i % 2), t, top=t)
    B.cyl(1.0, -0.2, 1.0, 1.18, 0.28, 8 if near else 6, "plastic", "fruit")
    for sx in (-1, 1):
        B.box(sx * 0.8 - 0.2, sx * 0.8 + 0.2, -1.6, -1.2, 0.0, 0.45, "wood")
    B.box(1.45, 1.95, 0.0, 0.6, 0, 0.45, "wood", top="fruit")
    B.box(-0.04, 0.04, 0.55, 0.63, 0.0, 2.7, "metal")
    cx, cy, cz, R, Hh = 0.0, 0.59, 2.7, 1.6, 0.6
    top = V((cx, cy, cz + Hh))
    n = 8
    rim = [V((cx + R * math.cos(2 * math.pi * i / n), cy + R * math.sin(2 * math.pi * i / n), cz)) for i in range(n)]
    for i in range(n):
        a, b = rim[i], rim[(i + 1) % n]
        half = 0 if i % 2 == 0 else 1
        uv = [(0.05 + 0.45 * half, 0), (0.45 + 0.45 * half, 0), (0.25 + 0.45 * half, 1)]
        B.poly([a, b, top], "umb", (cx, cy, cz - 3), uv)
        B.poly([a, b, V((cx, cy, cz - 0.15))], "umb", (cx, cy, cz + 3), uv)
    B.poly([(-1.3, 0.62, 0.9), (1.3, 0.62, 0.9), (1.3, 0.62, 2.0), (-1.3, 0.62, 2.0)], "stripe", (0, 0, 1.5))
    INFO["doors"].append({"x": 0.0, "approachZ": 1.6, "what": "stall front"})
    return 3.4, 3.4, -0.2, {"x": 0.0, "y": -0.9}


def prop_table():
    B.box(-0.9, 0.9, -0.45, 0.45, 0.8, 0.88, "wood")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * 0.82 - 0.04, sx * 0.82 + 0.04, sy * 0.38 - 0.04, sy * 0.38 + 0.04, 0, 0.8, "wood")
    for x, t in ((-0.55, "fruit"), (0.0, "goods"), (0.55, "fruit")):
        B.cyl(x, 0.0, 0.88, 1.08, 0.24, 8 if near else 6, t, t)
    B.box(0.55, 0.85, 0.2, 0.4, 0.88, 1.2, "plastic")
    B.box(-0.04, 0.04, -0.4, -0.32, 0, 2.2, "metal"); B.box(0.85, 0.93, -0.4, -0.32, 0, 2.2, "metal")
    B.poly([(-0.2, -0.45, 2.2), (1.15, -0.45, 2.2), (1.15, 0.5, 1.85), (-0.2, 0.5, 1.85)], "stripe", (0.5, 0, 0.5))
    INFO["doors"].append({"x": 0.0, "approachZ": 1.2, "what": "table front"})
    return 2.4, 1.4, 0.0, {"x": 0.0, "y": -0.5}


def prop_generator():
    B.box(-0.7, 0.7, -0.45, 0.45, 0.1, 0.18, "metal")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * 0.66 - 0.03, sx * 0.66 + 0.03, sy * 0.41 - 0.03, sy * 0.41 + 0.03, 0.1, 1.15, "metal")
    for z in (0.18, 1.12):
        B.box(-0.7, 0.7, -0.45, 0.45, z, z + 0.05, "metal")
    B.box(-0.55, 0.0, -0.3, 0.3, 0.25, 0.85, "red")
    B.box(0.05, 0.55, -0.3, 0.3, 0.25, 0.7, "dark", top="metal")
    B.box(-0.5, 0.5, -0.25, 0.25, 0.85, 1.05, "yellow")
    B.cyl(0.62, 0.0, 0.7, 1.35, 0.06, 6, "dark", "dark")
    return 1.6, 1.1, 0.0, {"x": 0.0, "y": -0.5}


def prop_lamp():
    B.cyl(0, 0, 0, 5.5, 0.14, SEG, "conc", "conc", 0.09)
    B.cyl(0, 0, 0, 0.5, 0.22, SEG, "conc", "conc", 0.14)
    B.box(-0.05, 1.6, -0.06, 0.06, 5.35, 5.5, "metal")
    B.box(1.0, 1.9, -0.25, 0.25, 5.2, 5.4, "metal", bottom="yellow")
    B.box(-0.1, 0.9, -0.3, 0.3, 5.55, 5.6, "bluepaint", top="bluepaint") if False else None
    B.box(-0.5, 0.5, -0.45, 0.45, 5.7, 5.78, "bluepaint")
    B.empty("light_lamp", (1.45, 0, 5.15), kind="lamp")
    return 0.6, 0.6, 0.0, {"x": 0.0, "y": -0.3}


def prop_tank():
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * 0.85 - 0.07, sx * 0.85 + 0.07, sy * 0.85 - 0.07, sy * 0.85 + 0.07, 0, 2.6, "metal")
    for z in (0.8, 1.7):
        B.box(-0.9, 0.9, -0.9, -0.8, z, z + 0.05, "metal"); B.box(-0.9, 0.9, 0.8, 0.9, z, z + 0.05, "metal")
        B.box(-0.9, -0.8, -0.9, 0.9, z, z + 0.05, "metal"); B.box(0.8, 0.9, -0.9, 0.9, z, z + 0.05, "metal")
    B.box(-1.0, 1.0, -1.0, 1.0, 2.6, 2.7, "metal")
    B.cyl(0, 0, 2.7, 4.3, 0.95, 12 if near else 8, "tank", "tank", 0.8)
    B.cyl(0, 0, 4.3, 4.4, 0.3, 8, "dark", "dark")
    for k in range(10 if near else 5):
        z = 0.2 + k * 0.25
        B.box(-1.05, -0.95, -0.04, 0.04, z, z + 0.04, "metal") if False else None
    B.box(-0.08, 0.08, 1.05, 1.15, 0, 2.7, "metal")
    return 2.2, 2.2, 0.0, {"x": 0.0, "y": -1.0}


def prop_signboard():
    for sx in (-1, 1):
        B.box(sx * 1.3 - 0.06, sx * 1.3 + 0.06, -0.06, 0.06, 0, 3.0, "metal")
    B.box(-1.5, 1.5, -0.1, 0.1, 1.5, 3.0, "trim", front="trim", back="trim")
    sign_group(1)
    B.poly([(-1.4, -0.11, 1.6), (1.4, -0.11, 1.6), (1.4, -0.11, 2.9), (-1.4, -0.11, 2.9)], "sign", (0, 0, 2))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 2.8, "height": 1.3, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})
    return 3.2, 0.6, 0.0, {"x": 0.0, "y": -0.2}


def prop_busstop():
    for sx in (-1, 1):
        B.box(sx * 2.0 - 0.07, sx * 2.0 + 0.07, 0.8 - 0.07, 0.8 + 0.07, 0, 2.7, "metal")
        B.box(sx * 2.0 - 0.07, sx * 2.0 + 0.07, -0.8 - 0.07, -0.8 + 0.07, 0, 2.7, "metal")
    B.box(-2.2, 2.2, -1.0, 1.0, 2.7, 2.85, "metal", top="roof")
    B.box(-2.0, 2.0, 0.78, 0.86, 0.5, 2.6, "glass", front="glass", back="glass")
    B.box(-1.5, 1.5, -0.1, 0.4, 0.45, 0.52, "wood")
    for sx in (-1.4, 1.4):
        B.box(sx - 0.05, sx + 0.05, 0, 0.3, 0, 0.45, "metal")
    sign_group(1)
    B.poly([(-1.2, -1.02, 2.2), (1.2, -1.02, 2.2), (1.2, -1.02, 2.7), (-1.2, -1.02, 2.7)], "sign", (0, 0, 2.5))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 2.4, "height": 0.5, "atlasRectPx": list(setlib.RECTS["sign"]), "atlasSize": setlib.SIZE})
    return 4.6, 2.2, 0.0, {"x": 0.0, "y": -1.0}


def prop_wheelbarrow():
    B.poly([(-0.35, -0.2, 0.55), (0.35, -0.2, 0.55), (0.3, 0.55, 0.5), (-0.3, 0.55, 0.5)], "bin", (0, 0, 0.2))
    B.box(-0.38, 0.38, -0.25, 0.6, 0.35, 0.58, "bin", top="fruit")
    B.cyl(0, -0.45, 0.0, 0.1, 0.27, 10 if near else 6, "tyre", "tyre") if False else None
    B.box(-0.35, -0.3, 0.55, 1.5, 0.45, 0.5, "wood"); B.box(0.3, 0.35, 0.55, 1.5, 0.45, 0.5, "wood")
    for sx in (-1, 1):
        B.box(sx * 0.33 - 0.03, sx * 0.33 + 0.03, 1.2, 1.26, 0, 0.45, "metal")
    return 0.8, 1.9, 0.5, {"x": 0.0, "y": -0.7}


def prop_fencegate():
    # 6 wide: pillars, a block wall each side, a double metal gate in the middle
    W = 6.0
    for sx in (-1, 1):
        B.box(sx * 3.0 - 0.25, sx * 3.0 + 0.25, -0.25, 0.25, 0, 2.2, "wall")
        B.box(sx * 3.0 - 0.32, sx * 3.0 + 0.32, -0.32, 0.32, 2.2, 2.35, "trim")
    for sx in (-1, 1):
        B.box(sx * 1.6 - 0.25, sx * 1.6 + 0.25, -0.25, 0.25, 0, 2.2, "wall") if False else None
    B.box(-3.0, -1.4, -0.12, 0.12, 0, 1.8, "wall", top="trim")
    B.box(1.4, 3.0, -0.12, 0.12, 0, 1.8, "wall", top="trim")
    for sx in (-1, 1):
        B.box(sx * 1.4 - 0.22, sx * 1.4 + 0.22, -0.22, 0.22, 0, 2.3, "wall")
    B.box(-1.4, 0, -0.04, 0.04, 0.15, 2.1, "rail", front="rail", back="rail")
    B.box(0, 1.4, -0.04, 0.04, 0.15, 2.1, "rail", front="rail", back="rail")
    B.box(-1.4, 1.4, -0.06, 0.06, 2.1, 2.2, "metal")
    INFO["doors"].append({"x": 0.0, "approachZ": 1.0, "what": "gate"})
    return 6.6, 0.8, 0.0, {"x": 0.0, "y": -0.1}


def prop_gutter():
    for i, x in enumerate((-1.2, 0.0, 1.2)):
        B.box(x - 0.58, x + 0.58, -0.4, 0.4, 0, 0.1, "conc", top="conc")
        B.box(x - 0.15, x + 0.15, -0.05, 0.05, 0.1, 0.12, "dark")
    return 3.6, 0.9, 0.0, None


def prop_bin():
    B.cyl(0, 0, 0.08, 1.0, 0.38, 10 if near else 6, "bin", "bin", 0.32)
    B.cyl(0, 0, 1.0, 1.08, 0.4, 10 if near else 6, "dark", "dark")
    B.box(-0.1, 0.1, -0.06, 0.06, 1.08, 1.14, "dark")
    for sx in (-1, 1):
        B.cyl(sx * 0.25, 0.3, 0, 0.16, 0.1, 6, "tyre", "tyre") if False else None
    return 0.9, 0.9, 0.0, {"x": 0.0, "y": -0.4}


def prop_billboard():
    for sx in (-1, 1):
        B.box(sx * 2.0 - 0.1, sx * 2.0 + 0.1, -0.1, 0.1, 0, 5.0, "metal")
    B.box(-3.3, 3.3, -0.2, 0.2, 4.0, 7.2, "metal", front="metal")
    sign_group(1)
    B.poly([(-3.15, -0.21, 4.15), (3.15, -0.21, 4.15), (3.15, -0.21, 7.05), (-3.15, -0.21, 7.05)], "billboard", (0, 0, 5))
    end_group()
    INFO["signs"].append({"node": "sign_1", "width": 6.3, "height": 2.9, "atlasRectPx": list(setlib.RECTS["billboard"]), "atlasSize": setlib.SIZE, "what": "blank face the game can paint"})
    B.box(-3.2, 3.2, -0.3, 0.3, 3.9, 4.0, "metal")
    return 6.8, 0.8, 0.0, {"x": 0.0, "y": -0.3}


def prop_trafficlight():
    B.cyl(0, 0, 0, 5.0, 0.1, 8, "metal", "metal", 0.08)
    B.box(0, 3.4, -0.06, 0.06, 4.8, 4.95, "metal")
    for dx, tile, g in ((3.0, None, None),):
        pass
    B.box(2.9, 3.5, -0.2, 0.2, 3.7, 4.9, "dark")
    for z, tile, name in ((4.55, "red", "lamp_red"), (4.2, "amber", "lamp_amber"), (3.85, "green", "lamp_green")):
        B.cur = name
        B.box(3.05, 3.35, -0.23, -0.2, z - 0.1, z + 0.1, tile)
        B.cur = None
        B.empty("pivot_" + name, (3.2, -0.2, z))
        B.empty("light_" + name.split("_")[1], (3.2, -0.3, z), kind="traffic")
    return 4.0, 0.6, 0.0, {"x": 0.0, "y": -0.2}


def leaf(pts, tile="leaf"):
    c = sum((V(p) for p in pts), V()) / len(pts)
    n = (V(pts[1]) - V(pts[0])).cross(V(pts[2]) - V(pts[0])).normalized()
    B.poly(pts, tile, c + n)
    B.poly(pts, tile, c - n)


def prop_plantain():
    B.cyl(0, 0, 0, 2.3, 0.2, 8, "leaf", None, 0.14)
    for k in range(7 if near else 5):
        a = k / (7 if near else 5) * 6.2832 + 0.3
        dx, dy = math.cos(a), math.sin(a)
        p0 = V((0, 0, 2.2)); tip = V((dx * 1.9, dy * 1.9, 1.55))
        mid = (p0 + tip) / 2 + V((0, 0, 0.5))
        side = V((-dy, dx, 0)) * 0.35
        leaf([p0, mid + side, tip, mid - side])
    B.cyl(0.18, 0, 1.5, 1.9, 0.12, 6, "fruit", "fruit")
    return 1.6, 1.6, 0.0, None


def prop_pawpaw():
    B.cyl(0, 0, 0, 3.0, 0.2, 8, "bark", None, 0.12)
    for k in range(8 if near else 5):
        a = k / (8 if near else 5) * 6.2832
        dx, dy = math.cos(a), math.sin(a)
        p0 = V((0, 0, 3.0)); tip = V((dx * 1.5, dy * 1.5, 3.5)); mid = (p0 + tip) / 2 + V((0, 0, 0.35))
        side = V((-dy, dx, 0)) * 0.5
        leaf([p0, mid + side, tip, mid - side])
    for k in range(4):
        a = k * 1.57 + 0.4
        B.box(math.cos(a) * 0.2 - 0.1, math.cos(a) * 0.2 + 0.1, math.sin(a) * 0.2 - 0.1, math.sin(a) * 0.2 + 0.1, 2.6, 2.95, "fruit")
    return 1.4, 1.4, 0.0, None


def prop_shadetree():
    B.cyl(0, 0, 0, 3.2, 0.5, 8, "bark", None, 0.3)
    for k in range(3):
        a = k * 2.1
        B.cyl(math.cos(a) * 0.5, math.sin(a) * 0.5, 2.8, 4.5, 0.2, 6, "bark", None, 0.12)
    # crown: three overlapping low-poly blobs (stacked rings) in leaf green
    def blob(cx, cy, cz, R, rz):
        rings, n = (4, 10) if near else (3, 6)
        pr = [(R * math.cos(-math.pi / 2 + i / rings * math.pi), cz + rz * math.sin(-math.pi / 2 + i / rings * math.pi)) for i in range(rings + 1)]
        for i in range(rings):
            (r0, z0), (r1, z1) = pr[i], pr[i + 1]
            for k in range(n):
                a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
                p00 = V((cx + r0 * math.cos(a0), cy + r0 * math.sin(a0), z0)); p01 = V((cx + r0 * math.cos(a1), cy + r0 * math.sin(a1), z0))
                p10 = V((cx + r1 * math.cos(a0), cy + r1 * math.sin(a0), z1)); p11 = V((cx + r1 * math.cos(a1), cy + r1 * math.sin(a1), z1))
                pts = [p00, p11, p10] if r0 < 0.01 else [p00, p01, p10] if r1 < 0.01 else [p00, p01, p11, p10]
                B.poly(pts, "leaf", (cx, cy, cz), [(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)][:len(pts)] if len(pts) == 4 else [(0.1, 0.1), (0.9, 0.1), (0.5, 0.9)])
    blob(0, 0, 5.4, 2.8, 1.9)
    blob(1.6, 0.8, 4.7, 2.0, 1.4)
    blob(-1.5, -0.7, 4.8, 2.1, 1.4)
    return 4.0, 4.0, 0.0, None


def prop_grass():
    for k in range(5):
        a = k * 0.63
        dx, dy = math.cos(a) * 0.25, math.sin(a) * 0.25
        for j in range(3 if near else 2):
            b = j * 1.05 + a
            w = 0.22
            ex, ey = math.cos(b) * w, math.sin(b) * w
            h = 0.55 + 0.15 * ((k + j) % 3)
            tipx, tipy = dx + math.cos(b + 1.5) * 0.12, dy + math.sin(b + 1.5) * 0.12
            leaf([V((dx - ex, dy - ey, 0)), V((dx + ex, dy + ey, 0)), V((tipx + ex * 0.2, tipy + ey * 0.2, h)), V((tipx - ex * 0.2, tipy - ey * 0.2, h))], "grass")
    return 1.0, 1.0, 0.0, None


def prop_hedge():
    B.box(-1.5, 1.5, -0.4, 0.4, 0, 0.9, "hedge", top="hedge")
    B.box(-1.4, 1.4, -0.3, 0.3, 0.9, 1.05, "hedge", top="hedge")
    return 3.2, 0.9, 0.0, None


TYPES = {
    "shops": building_shops, "shoprow": building_shoprow, "church": building_church, "mosque": building_mosque, "school": building_school, "clinic": building_clinic,
    "filling": building_filling, "bank": building_bank, "unfinished": building_unfinished,
    "kiosk": prop_kiosk, "stall": prop_stall, "table": prop_table, "generator": prop_generator, "lamp": prop_lamp, "tank": prop_tank, "signboard": prop_signboard,
    "busstop": prop_busstop, "wheelbarrow": prop_wheelbarrow, "fencegate": prop_fencegate, "gutter": prop_gutter, "bin": prop_bin, "billboard": prop_billboard,
    "trafficlight": prop_trafficlight, "plantain": prop_plantain, "pawpaw": prop_pawpaw, "shadetree": prop_shadetree, "grass": prop_grass, "hedge": prop_hedge,
}
fw, fd, yc, door = TYPES[kind]()
name = "%s-%s%s" % (kind, variant, "" if near else "-far")
atlas = os.path.join(atlas_dir, "atlas-%s-%s.jpg" % (palette, lod))
tris = finish(B, kind, name, out_dir, atlas, yc, (fw, fd), INFO)
# game axes: x right, z toward the street (the front). Blender y = -z. Everything below is relative to the footprint centre (yc).
rec = {"type": kind, "triangles": tris, "footprint": [round(fw, 2), round(fd, 2)],
       "door": ({"x": round(door["x"], 2), "z": round(-(door["y"] - yc), 2), "facing": "+z"} if door else None),
       "doors": [{"x": round(d["x"], 2), "approachZ": round(d["approachZ"] + 0.0, 2), "what": d["what"]} for d in INFO["doors"]],
       "signs": INFO["signs"], "empties": [{"name": n, "x": round(l.x, 2), "y": round(l.z, 2), "z": round(-(l.y - yc), 2), **e} for n, l, e in B.empties if not n.startswith("pivot_")]}
json.dump(rec, open(os.path.join(out_dir, kind + ".json"), "w"), indent=1)
print("SET", name, tris, rec["footprint"])
