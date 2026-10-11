"""The furniture catalogue: about 45 small clean models for the home grid, on the shared home atlas.

  blender --background --disable-autoexec --python furniture.py -- <piece> <variant> <near|far> <out-dir>

`piece` is a key of PIECES; `variant` is a tint name or print for pieces that offer them, otherwise "default". Writes <piece>[-<variant>][-far].raw.glb and <out-dir>/<piece>.json
(footprint in cells, kind, anchors). See homelib.py for units and axes. Each function draws the piece and returns its record.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import homelib
from homelib import Builder, V, srgb, finish

argv = sys.argv[sys.argv.index("--") + 1:]
piece, variant, lod, out_dir = argv[:4]
near = lod == "near"
os.makedirs(out_dir, exist_ok=True)
B = Builder(near)
B.k = homelib.FURN_K
T = lambda h: srgb(h)
SOFA_TINTS = {"slate": "#6f87b0", "terracotta": "#d0704a", "grey": "#a4a6aa", "green": "#6a9a74", "default": "#6f87b0"}
BED_TINTS = {"cream": "#f6ecd6", "blue": "#5f86c8", "red": "#cc4a44", "green": "#5fa072", "default": "#5f86c8"}
CURTAIN_TINTS = {"default": "#c0643a", "blue": "#4f78b8", "green": "#4f8a63", "cream": "#efe3c8"}


def leaf(pts, tile="leaf", tint=None):
    c = sum((V(p) for p in pts), V()) / len(pts)
    n = (V(pts[1]) - V(pts[0])).cross(V(pts[2]) - V(pts[0])).normalized()
    B.poly(pts, tile, c + n, tint=tint); B.poly(pts, tile, c - n, tint=tint)


def legs4(x, y, h, s=0.04, tile="wood_d", z0=0.0):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * x - s, sx * x + s, sy * y - s, sy * y + s, z0, h, tile)


def sofa(n):
    W = {1: 1.0, 2: 1.95, 3: 2.65}[n]
    tint = T(SOFA_TINTS.get(variant, SOFA_TINTS["default"]))
    D = 0.98
    B.rbox(-W / 2, W / 2, -D / 2, D / 2, 0.14, 0.4, 0.09, "fabric", tint)                       # base
    B.rbox(-W / 2 + 0.02, W / 2 - 0.02, D / 2 - 0.3, D / 2, 0.3, 0.98, 0.12, "fabric", tint)     # back, tall and soft
    for sx in (-1, 1):                                                                           # rolled arms
        B.rbox(sx * (W / 2 - 0.1) - 0.1, sx * (W / 2 - 0.1) + 0.1, -D / 2, D / 2, 0.14, 0.7, 0.1, "fabric", tint)
    inner = W - 0.4
    for i in range(n):                                                                           # separate seat and back cushions
        cx = -inner / 2 + inner / n * (i + 0.5); cw = inner / n / 2 - 0.015
        B.rbox(cx - cw, cx + cw, -D / 2 + 0.03, D / 2 - 0.28, 0.38, 0.56, 0.08, "fabric", tint)
        B.rbox(cx - cw, cx + cw, D / 2 - 0.34, D / 2 - 0.14, 0.52, 0.94, 0.08, "fabric", tint, rot=(-0.12, 0, 0))
        B.empty("seat_%d" % (i + 1), (cx, -0.02, 0.56), kind="seat", facing=[0, -1, 0])
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl(sx * (W / 2 - 0.12), sy * (D / 2 - 0.12), 0, 0.14, 0.04, 8, "wood_d")
    pil = T("#d9a53a") if n > 1 else T("#c4553a")
    B.rbox(-W / 2 + 0.26, -W / 2 + 0.62, 0.06, 0.28, 0.58, 0.9, 0.09, "fabric", pil, rot=(0.1, 0.0, 0.5))
    if n > 1:
        B.rbox(W / 2 - 0.62, W / 2 - 0.26, 0.06, 0.28, 0.58, 0.9, 0.09, "fabric", T("#c4553a"), rot=(0.1, 0.0, -0.5))
    return dict(w={1: 1, 2: 2, 3: 3}[n], h=1, kind="seat", tintable=list(SOFA_TINTS), seats=n)


def coffee_table():
    B.box(-0.45, 0.45, -0.3, 0.3, 0.37, 0.41, "glass")
    B.box(-0.47, 0.47, -0.32, 0.32, 0.34, 0.37, "wood_d")
    legs4(0.41, 0.26, 0.34, 0.03)
    B.box(-0.4, 0.4, -0.26, 0.26, 0.12, 0.15, "wood_d")
    B.box(-0.12, 0.12, -0.08, 0.08, 0.41, 0.44, "plate")
    B.box(0.2, 0.34, -0.1, 0.1, 0.41, 0.43, "red")
    return dict(w=1, h=1, kind="decor")


def rug(n):
    s = 1.9
    B.box(-s / 2, s / 2, -s / 2, s / 2, 0, 0.012, "white", top="rug%d" % n)
    return dict(w=2, h=2, kind="decor", flat=True)


def tv_console():
    B.box(-0.8, 0.8, -0.24, 0.24, 0.0, 0.5, "wood_d", front="wood_m")
    B.box(-0.78, 0.78, -0.255, -0.22, 0.04, 0.46, "wood_d")
    for x in (-0.4, 0.0, 0.4):
        B.box(x - 0.36, x + 0.36, -0.262, -0.25, 0.08, 0.44, "wood_m")
        B.box(x - 0.03, x + 0.03, -0.27, -0.26, 0.24, 0.3, "chrome")
    B.box(-0.82, 0.82, -0.26, 0.26, 0.5, 0.53, "black")
    B.box(-0.12, 0.12, -0.08, 0.08, 0.53, 0.58, "black")
    B.box(-0.7, 0.7, -0.035, 0.035, 0.58, 1.28, "black", front="black")
    B.poly([(-0.67, -0.04, 0.61), (0.67, -0.04, 0.61), (0.67, -0.04, 1.25), (-0.67, -0.04, 1.25)], "tv", (0, 0, 1))
    B.cur = "tv_screen"
    B.cur = None
    B.box(0.55, 0.7, -0.2, -0.05, 0.53, 0.6, "dark")
    B.empty("use_tv", (0, -0.9, 0.0), kind="tv", facing=[0, 1, 0])
    return dict(w=2, h=1, kind="tv", powered=True)


def fan_standing():
    B.cyl(0, 0, 0, 0.03, 0.2, 14, "black", cap=True)
    B.cyl(0, 0, 0.03, 1.15, 0.025, 8, "chrome")
    B.cyl(0, -0.08, 1.15, 1.35, 0.25, 16, "white", cap=False)
    B.cyl(0, -0.08, 1.35, 1.37, 0.25, 16, "chrome", cap=True)
    B.cyl(0, 0.02, 1.2, 1.3, 0.05, 8, "dark")
    B.cur = "blades"
    for i in range(3):
        a = i * 2.094
        B.poly([V((0, -0.1, 1.25)), V((math.cos(a) * 0.2 - math.sin(a) * 0.07, -0.1, 1.25 + math.sin(a) * 0.2 + math.cos(a) * 0.07)), V((math.cos(a) * 0.2 + math.sin(a) * 0.07, -0.1, 1.25 + math.sin(a) * 0.2 - math.cos(a) * 0.07))], "white", (0, -5, 1.25))
    B.cur = None
    return dict(w=1, h=1, kind="decor", powered=True)


def fan_ceiling():
    B.cyl(0, 0, 2.52, 2.6, 0.12, 10, "white")
    B.cyl(0, 0, 2.38, 2.52, 0.025, 6, "chrome")
    B.cyl(0, 0, 2.3, 2.4, 0.11, 10, "dark")
    B.cur = "blades"
    for i in range(4):
        a = i * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        B.poly([V((c * 0.12 - s * 0.08, s * 0.12 + c * 0.08, 2.36)), V((c * 0.62 - s * 0.1, s * 0.62 + c * 0.1, 2.36)), V((c * 0.62 + s * 0.1, s * 0.62 - c * 0.1, 2.36)), V((c * 0.12 + s * 0.08, s * 0.12 - c * 0.08, 2.36))], "wood_m", (0, 0, 9))
        B.poly([V((c * 0.12 - s * 0.08, s * 0.12 + c * 0.08, 2.36)), V((c * 0.62 - s * 0.1, s * 0.62 + c * 0.1, 2.36)), V((c * 0.62 + s * 0.1, s * 0.62 - c * 0.1, 2.36)), V((c * 0.12 + s * 0.08, s * 0.12 - c * 0.08, 2.36))], "wood_l", (0, 0, -9))
    B.cur = None
    return dict(w=1, h=1, kind="decor", ceiling=True, powered=True, spin="blades about Z")


def ac_unit():
    B.rbox(-0.5, 0.5, -0.12, 0.12, 0.0, 0.3, 0.03, "gloss")
    B.box(-0.46, 0.46, -0.125, -0.115, 0.05, 0.09, "dark")
    for z in (0.12, 0.16, 0.2):
        B.box(-0.44, 0.44, -0.126, -0.12, z, z + 0.012, "steel")
    B.box(0.38, 0.44, -0.126, -0.12, 0.22, 0.25, "green")
    return dict(w=1, h=1, kind="decor", wall=True, mountZ=2.15, powered=True)


def lamp_floor():
    B.cyl(0, 0, 0, 0.03, 0.3, 14, "black")
    B.cyl(0, 0, 0.03, 1.5, 0.02, 8, "black")
    B.cur = "glow"
    B.cyl(0, 0, 1.38, 1.72, 0.2, 14, "lampglow", rtop=0.14, cap=False)
    B.cur = None
    B.cyl(0, 0, 1.72, 1.74, 0.14, 14, "gold")
    B.empty("light_lamp", (0, 0, 1.55), kind="lamp")
    return dict(w=1, h=1, kind="light", light=True)


def frame(art):
    w, h = {"lagoon": (0.9, 0.68), "adire": (0.7, 0.7), "portrait": (0.55, 0.72)}[art]
    B.box(-w / 2, w / 2, -0.05, 0.0, -h / 2, h / 2, "wood_d")
    B.poly([(-w / 2 + 0.05, -0.052, -h / 2 + 0.05), (w / 2 - 0.05, -0.052, -h / 2 + 0.05), (w / 2 - 0.05, -0.052, h / 2 - 0.05), (-w / 2 + 0.05, -0.052, h / 2 - 0.05)], "art_" + art, (0, 5, 0))
    B.box(-w / 2 + 0.04, w / 2 - 0.04, -0.056, -0.05, -h / 2 + 0.04, -h / 2 + 0.05, "gold") if False else None
    return dict(w=1, h=1, kind="decor", wall=True, mountZ=1.6, swappablePicture="front quad uses atlas rect art_" + art)


def bookshelf():
    W, D, H = 0.8, 0.3, 1.75
    for sx in (-1, 1):
        B.box(sx * W / 2 - 0.02 * (1 if sx > 0 else -1) - (0.02 if sx < 0 else 0), sx * W / 2 + (0.02 if sx > 0 else 0), -D / 2, D / 2, 0, H, "wood_m")
    B.box(-W / 2, W / 2, D / 2 - 0.01, D / 2, 0, H, "wood_d")
    cols = ["red", "blue", "green", "yellow", "orange", "dark", "plasticred", "gold"]
    for i, z in enumerate((0.02, 0.4, 0.78, 1.16, 1.5)):
        B.box(-W / 2, W / 2, -D / 2, D / 2, z, z + 0.03, "wood_m")
        if z < 1.5:
            x = -W / 2 + 0.05; j = 0
            while x < W / 2 - 0.08:
                w = 0.04 + 0.01 * ((i + j) % 3); h = 0.22 + 0.05 * ((i * 3 + j) % 4)
                B.box(x, x + w, -D / 2 + 0.03, D / 2 - 0.04, z + 0.03, z + 0.03 + h, cols[(i * 3 + j) % len(cols)])
                x += w + 0.004; j += 1
    B.box(-W / 2, W / 2, -D / 2, D / 2, H, H + 0.03, "wood_m")
    return dict(w=1, h=1, kind="shelf", use="read")


def chair_dining(x, y, rot):
    """A dining chair at (x, y) turned by rot (0 faces -y)."""
    c, s = math.cos(rot), math.sin(rot)
    def P(px, py): return (x + px * c - py * s, y + px * s + py * c)
    def bx(x0, x1, y0, y1, z0, z1, tile, tint=None):
        pts = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        B.box(min(xs), max(xs), min(ys), max(ys), z0, z1, tile, tint)
    bx(-0.2, 0.2, -0.2, 0.2, 0.42, 0.47, "fabric", T("#c9b99a"))
    bx(-0.2, 0.2, 0.17, 0.2, 0.47, 0.95, "wood_d")
    bx(-0.17, 0.17, 0.165, 0.185, 0.58, 0.9, "fabric", T("#c9b99a"))
    for sx in (-1, 1):
        for sy in (-1, 1):
            bx(sx * 0.18 - 0.02, sx * 0.18 + 0.02, sy * 0.18 - 0.02, sy * 0.18 + 0.02, 0, 0.42, "wood_d")


def dining(laid):
    B.box(-0.65, 0.65, -0.4, 0.4, 0.72, 0.77, "wood_m")
    B.box(-0.62, 0.62, -0.37, 0.37, 0.68, 0.72, "wood_d")
    legs4(0.58, 0.33, 0.72, 0.035)
    chair_dining(-0.32, -0.62, 0); chair_dining(0.32, -0.62, 0); chair_dining(-0.32, 0.62, math.pi); chair_dining(0.32, 0.62, math.pi)
    for i, (x, y) in enumerate(((-0.32, -0.62), (0.32, -0.62), (-0.32, 0.62), (0.32, 0.62))):
        B.empty("seat_%d" % (i + 1), (x, y * 0.85, 0.5), kind="seat", facing=[0, 1 if y < 0 else -1, 0])
    if laid:
        B.box(-0.12, 0.12, -0.4, 0.4, 0.77, 0.775, "orange")
        for x, y in ((-0.4, -0.22), (0.4, -0.22), (-0.4, 0.22), (0.4, 0.22)):
            B.cyl(x, y, 0.77, 0.785, 0.1, 12, "plate")
            B.cyl(x + 0.14 * (1 if x < 0 else -1), y, 0.77, 0.86, 0.025, 8, "glass")
        B.cyl(0, 0, 0.77, 0.84, 0.13, 12, "wood_l", rtop=0.16, cap=False)
        for i, (dx, dy, t) in enumerate(((-0.05, 0.02, "red"), (0.05, -0.03, "yellow"), (0, 0.05, "green"), (0.06, 0.05, "orange"))):
            B.cyl(dx, dy, 0.82, 0.9, 0.05, 8, t)
    return dict(w=2, h=2, kind="seat", seats=4, laid=laid)


def chair_plastic():
    B.box(-0.22, 0.22, -0.22, 0.22, 0.42, 0.47, "plastic")
    B.box(-0.22, 0.22, 0.18, 0.22, 0.47, 0.9, "plastic")
    for x in (-0.18, 0.18):
        B.box(x - 0.02, x + 0.02, 0.17, 0.2, 0.4, 0.9, "plastic")
    legs4(0.19, 0.19, 0.42, 0.018, "plastic")
    B.box(-0.17, 0.17, 0.176, 0.18, 0.6, 0.84, "white")
    B.empty("seat_1", (0, -0.02, 0.47), kind="seat", facing=[0, -1, 0])
    return dict(w=1, h=1, kind="seat", seats=1)


def stool():
    B.cyl(0, 0, 0.42, 0.47, 0.2, 12, "wood_l")
    for a in (0.5, 2.6, 4.7):
        B.box(math.cos(a) * 0.12 - 0.03, math.cos(a) * 0.12 + 0.03, math.sin(a) * 0.12 - 0.03, math.sin(a) * 0.12 + 0.03, 0, 0.42, "wood_m")
    B.empty("seat_1", (0, 0, 0.47), kind="seat", facing=[0, -1, 0])
    return dict(w=1, h=1, kind="seat", seats=1)


def cab_base(sink=False, handles=True):
    B.box(-0.5, 0.5, -0.3, 0.3, 0.0, 0.1, "dark")
    B.box(-0.5, 0.5, -0.3, 0.3, 0.1, 0.82, "cream", front="cream")
    for x in (-0.25, 0.25):
        B.box(x - 0.23, x + 0.23, -0.315, -0.3, 0.14, 0.78, "cream")
        B.box(x - 0.2, x + 0.2, -0.322, -0.315, 0.17, 0.75, "wood_l")
        B.box(x + (0.15 if x < 0 else -0.15) - 0.015, x + (0.15 if x < 0 else -0.15) + 0.015, -0.34, -0.322, 0.5, 0.68, "chrome")
    B.box(-0.53, 0.53, -0.34, 0.31, 0.82, 0.86, "black")
    if sink:
        B.box(-0.3, 0.2, -0.2, 0.12, 0.862, 0.866, "steel")
        B.box(-0.28, 0.18, -0.18, 0.1, 0.835, 0.862, "dark")
        B.cyl(0.0, 0.2, 0.866, 1.05, 0.015, 8, "chrome")
        B.box(-0.12, 0.0, 0.17, 0.2, 1.02, 1.05, "chrome")
    return dict(w=1, h=1, kind="decor", counterZ=0.86, sink=sink)


def cab_wall():
    B.box(-0.5, 0.5, -0.17, 0.17, 0.0, 0.7, "cream")
    for x in (-0.25, 0.25):
        B.box(x - 0.23, x + 0.23, -0.185, -0.17, 0.04, 0.66, "cream")
        B.box(x - 0.2, x + 0.2, -0.192, -0.185, 0.07, 0.63, "wood_l")
        B.box(x + (0.15 if x < 0 else -0.15) - 0.015, x + (0.15 if x < 0 else -0.15) + 0.015, -0.21, -0.192, 0.1, 0.3, "chrome")
    return dict(w=1, h=1, kind="decor", wall=True, mountZ=1.45)


def cooker(pots):
    B.box(-0.3, 0.3, -0.3, 0.3, 0.0, 0.88, "gloss")
    B.box(-0.3, 0.3, -0.3, 0.3, 0.88, 0.9, "black")
    for x, y in ((-0.12, -0.1), (0.12, -0.1), (-0.12, 0.12), (0.12, 0.12)):
        B.cyl(x, y, 0.9, 0.92, 0.07, 10, "steel")
        B.cyl(x, y, 0.92, 0.93, 0.04, 10, "flame")
    B.box(-0.22, 0.22, -0.305, -0.3, 0.5, 0.78, "dark")
    B.box(-0.18, 0.18, -0.31, -0.305, 0.52, 0.76, "glass")
    B.box(-0.22, 0.22, -0.325, -0.31, 0.78, 0.8, "chrome")
    for x in (-0.2, -0.07, 0.07, 0.2):
        B.cyl(x, -0.31, 0.83, 0.86, 0.02, 8, "chrome", captile="black")
    B.box(-0.3, 0.3, 0.3, 0.33, 0.88, 1.0, "gloss")
    if pots:
        B.cyl(-0.12, -0.1, 0.93, 1.1, 0.13, 12, "steel"); B.cyl(-0.12, -0.1, 1.1, 1.13, 0.135, 12, "chrome"); B.cyl(-0.12, -0.1, 1.13, 1.17, 0.025, 6, "black")
        B.cyl(0.12, 0.12, 0.93, 1.03, 0.11, 12, "dark"); B.cyl(0.12, 0.12, 1.03, 1.05, 0.11, 12, "steel")
        B.box(0.2, 0.42, 0.1, 0.14, 0.98, 1.0, "dark")
    B.empty("use_cook", (0, -0.7, 0), kind="stove", facing=[0, 1, 0])
    return dict(w=1, h=1, kind="stove", pots=pots)


def fridge():
    B.box(-0.33, 0.33, -0.33, 0.33, 0.0, 1.75, "gloss")
    B.box(-0.33, 0.33, -0.335, -0.33, 1.1, 1.113, "dark")
    B.box(-0.3, 0.3, -0.34, -0.335, 0.05, 1.08, "gloss")
    B.box(-0.3, 0.3, -0.34, -0.335, 1.12, 1.72, "gloss")
    B.box(0.22, 0.26, -0.37, -0.34, 1.2, 1.55, "chrome"); B.box(0.22, 0.26, -0.37, -0.34, 0.6, 0.95, "chrome")
    B.box(-0.1, 0.05, -0.345, -0.34, 1.5, 1.54, "green")
    return dict(w=1, h=1, kind="cooler")


def microwave():
    B.box(-0.3, 0.3, -0.25, 0.25, 0.9, 0.93, "wood_l") if False else None
    B.box(-0.28, 0.28, -0.22, 0.22, 0.0, 0.09, "wood_d")
    B.box(-0.27, 0.27, -0.2, 0.2, 0.09, 0.82, "cream")
    B.box(-0.27, 0.27, -0.2, 0.2, 0.82, 1.12, "gloss")
    B.box(-0.22, 0.1, -0.205, -0.2, 0.86, 1.08, "glass"); B.box(0.14, 0.24, -0.205, -0.2, 0.86, 1.08, "dark")
    B.box(-0.22, 0.1, -0.21, -0.205, 0.855, 1.085, "black") if False else None
    return dict(w=1, h=1, kind="decor", surfaceItem=True)


def dispenser():
    B.box(-0.17, 0.17, -0.17, 0.17, 0.0, 1.0, "gloss")
    B.box(-0.12, 0.12, -0.175, -0.17, 0.55, 0.8, "dark")
    B.cyl(-0.05, -0.19, 0.62, 0.65, 0.015, 6, "blue"); B.cyl(0.05, -0.19, 0.62, 0.65, 0.015, 6, "red")
    B.cyl(0, 0, 1.0, 1.4, 0.13, 12, "blue", rtop=0.09)
    return dict(w=1, h=1, kind="water")


def bed(w_cells, double):
    tint = T(BED_TINTS.get(variant, BED_TINTS["default"]))
    print_tile = {"ankara-a": "bed_a", "ankara-b": "bed_b"}.get(variant)
    W = 1.5 if double else 0.95
    L = 1.82
    B.box(-W / 2 - 0.04, W / 2 + 0.04, -L / 2 - 0.04, L / 2 + 0.04, 0.12, 0.3, "wood_m")
    B.rbox(-W / 2 - 0.04, W / 2 + 0.04, L / 2 + 0.03, L / 2 + 0.1, 0.1, 1.1, 0.04, "wood_d")      # headboard
    B.rbox(-W / 2 - 0.04, W / 2 + 0.04, -L / 2 - 0.1, -L / 2 - 0.03, 0.1, 0.5, 0.04, "wood_d")
    legs4(W / 2 + 0.02, L / 2 + 0.03, 0.12, 0.035)
    B.rbox(-W / 2, W / 2, -L / 2, L / 2, 0.3, 0.55, 0.08, "white", T("#f4f1ea"))                    # mattress
    B.rbox(-W / 2 - 0.03, W / 2 + 0.03, -L / 2 + 0.02, L / 2 - 0.55, 0.5, 0.64, 0.07, print_tile or "fabric", None if print_tile else tint)   # duvet
    B.rbox(-W / 2 - 0.03, W / 2 + 0.03, -L / 2 + 0.02, -L / 2 + 0.25, 0.58, 0.7, 0.07, print_tile or "fabric", None if print_tile else tint)   # folded roll at the foot
    for i in range(2 if double else 1):
        cx = (-W / 4 + i * W / 2) if double else 0
        B.rbox(cx - 0.3, cx + 0.3, L / 2 - 0.55, L / 2 - 0.1, 0.55, 0.78, 0.11, "white", T("#fbf8f2"), rot=(-0.12, 0, 0))
    B.empty("sleep_1", (-W / 4 if double else 0, L / 2 - 0.9, 0.62), kind="bed", facing=[0, 1, 0])
    if double:
        B.empty("sleep_2", (W / 4, L / 2 - 0.9, 0.62), kind="bed", facing=[0, 1, 0])
    return dict(w=w_cells, h=2, kind="bed", tintable=list(BED_TINTS) + ["ankara-a", "ankara-b"], sleeps=2 if double else 1)


def mattress():
    B.rbox(-0.45, 0.45, -0.95, 0.95, 0.0, 0.14, 0.05, "bed_a")
    B.rbox(-0.3, 0.3, 0.55, 0.9, 0.12, 0.22, 0.06, "white", T("#fbf8f2"))
    B.rbox(-0.43, 0.43, -0.2, 0.5, 0.13, 0.2, 0.05, "bed_b") if False else None
    B.empty("sleep_1", (0, 0.45, 0.15), kind="bed", facing=[0, 1, 0])
    return dict(w=1, h=2, kind="bed", sleeps=1)


def wardrobe():
    B.box(-0.8, 0.8, -0.28, 0.28, 0.0, 1.9, "wood_d")
    B.box(-0.82, 0.82, -0.3, 0.3, 1.9, 1.95, "wood_d")
    for i, x in enumerate((-0.4, 0.4)):
        B.box(x - 0.38, x + 0.38, -0.296, -0.28, 0.04, 1.86, "wood_m")
        B.box(x - 0.3, x + 0.3, -0.304, -0.296, 0.14, 0.82, "wood_l"); B.box(x - 0.3, x + 0.3, -0.304, -0.296, 0.9, 1.74, "mirror" if i == 1 else "wood_l")
        B.box(x + (0.32 if x < 0 else -0.32) - 0.015, x + (0.32 if x < 0 else -0.32) + 0.015, -0.325, -0.304, 0.8, 1.2, "chrome")
    return dict(w=2, h=1, kind="decor")


def dressing_table():
    B.box(-0.5, 0.5, -0.22, 0.22, 0.68, 0.74, "wood_l")
    for x in (-0.45, 0.45):
        B.box(x - 0.04, x + 0.04, -0.2, 0.2, 0, 0.68, "wood_m")
    B.box(-0.38, 0.38, -0.2, 0.2, 0.46, 0.68, "wood_m"); B.box(-0.3, 0.3, -0.205, -0.2, 0.5, 0.64, "wood_l")
    B.box(-0.03, 0.03, -0.215, -0.2, 0.55, 0.59, "chrome")
    B.box(-0.35, 0.35, 0.18, 0.22, 0.74, 1.6, "wood_d"); B.box(-0.31, 0.31, 0.174, 0.18, 0.78, 1.56, "mirror")
    B.cyl(0.3, -0.05, 0.74, 0.86, 0.04, 8, "plasticred"); B.cyl(-0.28, 0.0, 0.74, 0.8, 0.05, 8, "gold")
    B.rbox(-0.2, 0.2, -0.75, -0.35, 0.3, 0.44, 0.04, "fabric", T("#c4553a"))
    B.cyl(0, -0.55, 0, 0.3, 0.03, 6, "wood_d")
    return dict(w=1, h=1, kind="decor")


def bedside():
    B.box(-0.22, 0.22, -0.2, 0.2, 0.18, 0.56, "wood_m")
    B.box(-0.2, 0.2, -0.205, -0.2, 0.3, 0.52, "wood_l"); B.box(-0.03, 0.03, -0.22, -0.205, 0.4, 0.44, "chrome")
    legs4(0.19, 0.17, 0.18, 0.02)
    B.cyl(0, 0, 0.56, 0.62, 0.06, 8, "dark")
    B.cur = "glow"
    B.cyl(0, 0, 0.62, 0.86, 0.14, 12, "lampglow", rtop=0.09, cap=False)
    B.cur = None
    B.cyl(0, 0, 0.86, 0.865, 0.09, 12, "gold")
    B.empty("light_lamp", (0, 0, 0.75), kind="lamp")
    return dict(w=1, h=1, kind="light", light=True)


def toilet():
    B.box(-0.2, 0.2, 0.12, 0.3, 0.38, 0.86, "gloss")
    B.box(-0.2, 0.2, 0.12, 0.3, 0.86, 0.9, "gloss")
    B.cyl(0, -0.05, 0.0, 0.4, 0.13, 12, "gloss", rtop=0.17, cap=False)
    B.rbox(-0.19, 0.19, -0.42, 0.2, 0.34, 0.42, 0.06, "gloss")
    B.box(-0.17, 0.17, -0.38, 0.14, 0.42, 0.45, "gloss")
    B.box(-0.17, 0.17, -0.38, 0.14, 0.45, 0.47, "white") if False else None
    B.cyl(0.0, 0.2, 0.84, 0.88, 0.02, 6, "chrome")
    B.empty("seat_1", (0, -0.1, 0.45), kind="toilet", facing=[0, -1, 0])
    return dict(w=1, h=1, kind="toilet")


def basin():
    B.cyl(0, 0.1, 0.0, 0.7, 0.07, 10, "gloss")
    B.rbox(-0.26, 0.26, -0.15, 0.3, 0.7, 0.86, 0.05, "gloss")
    B.box(-0.2, 0.2, -0.1, 0.24, 0.84, 0.865, "steel") if False else None
    B.cyl(0, 0.24, 0.86, 1.0, 0.015, 8, "chrome"); B.box(-0.03, 0.03, 0.12, 0.26, 0.98, 1.0, "chrome")
    B.box(-0.26, 0.26, 0.3, 0.32, 1.0, 1.7, "mirror")
    return dict(w=1, h=1, kind="decor")


def shower():
    B.box(-0.45, 0.45, -0.45, 0.45, 0.0, 0.08, "gloss")
    B.box(-0.45, -0.435, -0.45, 0.45, 0.08, 1.15, "glass"); B.box(-0.45, 0.45, 0.435, 0.45, 0.08, 1.15, "glass")
    B.cyl(0.3, 0.38, 0.08, 1.95, 0.02, 8, "chrome"); B.cyl(0.3, 0.3, 1.95, 1.98, 0.09, 10, "chrome")
    B.box(0.28, 0.32, 0.3, 0.4, 1.9, 1.98, "chrome")
    B.cyl(0.3, 0.37, 1.1, 1.14, 0.04, 8, "chrome")
    B.empty("use_shower", (0, 0, 0.1), kind="bath", facing=[0, -1, 0])
    return dict(w=1, h=1, kind="bath")


def bucket_bowl():
    B.cyl(-0.1, 0.05, 0.0, 0.34, 0.16, 12, "plasticred", rtop=0.2, captile="dark")
    B.cyl(-0.1, 0.05, 0.3, 0.34, 0.205, 12, "plasticred", cap=False)
    B.cyl(0.27, -0.12, 0.0, 0.12, 0.13, 12, "blue", rtop=0.17)
    B.cyl(0.27, -0.12, 0.1, 0.13, 0.17, 12, "plastic", cap=True)
    B.cyl(-0.1, 0.05, 0.34, 0.35, 0.18, 12, "glass", cap=True) if False else None
    B.box(-0.2, 0.05, -0.3, -0.1, 0.0, 0.03, "plastic") if False else None
    B.empty("use_wash", (0, -0.4, 0.0), kind="bath", facing=[0, 1, 0])
    return dict(w=1, h=1, kind="bath")


def cloth_shirt(x, top, w, h, tile, tint=None):
    sl = w * 0.32
    pts = [(x, top - 0.02), (x + sl, top), (x + w * 0.5, top - 0.05), (x + w - sl, top), (x + w, top - 0.02), (x + w, top - h * 0.3), (x + w - sl * 0.9, top - h * 0.3), (x + w - sl * 0.9, top - h),
           (x + sl * 0.9, top - h), (x + sl * 0.9, top - h * 0.3), (x, top - h * 0.3)]
    for flip in (0, 1):
        P = [V((px, 0.012 * (1 if flip else -1) + 0.01 * math.sin(px * 9), pz)) for px, pz in pts]
        uv = [((p.x - x) / w, (p.z - top + h) / h) for p in P]
        B.poly(P if not flip else P[::-1], tile, None, uv if not flip else uv[::-1], tint=tint)


def cloth_wrapper(x, top, w, h, tile):
    n = 6
    pts = [(x + w * i / n, top - 0.03 * math.sin(i)) for i in range(n + 1)] + [(x + w - w * i / n, top - h + 0.04 * math.sin(i * 1.7)) for i in range(n + 1)]
    for flip in (0, 1):
        P = [V((px, (0.015 if flip else -0.015) + 0.02 * math.sin(px * 7), pz)) for px, pz in pts]
        uv = [((p.x - x) / w, (p.z - top + h) / h) for p in P]
        B.poly(P if not flip else P[::-1], tile, None, uv if not flip else uv[::-1])


def washing_line():
    for sx in (-1, 1):
        B.cyl(sx * 0.95, 0, 0, 2.0, 0.025, 8, "steel", cap=True)
        B.cyl(sx * 0.95, 0, 0.0, 0.05, 0.08, 8, "dark")
    B.box(-0.95, 0.95, -0.005, 0.005, 1.92, 1.935, "white")
    B.cur = "clothes"
    x = -0.85
    for i, (kind, tile) in enumerate((("shirt", "blue"), ("wrap", "bed_a"), ("shirt", "yellow"), ("wrap", "curtain"), ("shirt", "white"))):
        if kind == "shirt":
            cloth_shirt(x, 1.92, 0.34, 0.5, tile); x += 0.4
        else:
            cloth_wrapper(x, 1.92, 0.3, 0.8, tile); x += 0.36
    B.cur = None
    return dict(w=2, h=1, kind="decor", thin=True)


def generator():
    B.box(-0.35, 0.35, -0.25, 0.25, 0.1, 0.16, "steel")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box(sx * 0.32 - 0.02, sx * 0.32 + 0.02, sy * 0.22 - 0.02, sy * 0.22 + 0.02, 0.1, 0.78, "steel")
    B.box(-0.35, 0.35, -0.25, 0.25, 0.76, 0.8, "steel")
    B.box(-0.3, 0.0, -0.2, 0.2, 0.16, 0.6, "red"); B.box(0.02, 0.3, -0.2, 0.2, 0.16, 0.5, "black"); B.box(-0.28, 0.28, -0.18, 0.18, 0.6, 0.76, "yellow")
    B.cyl(0.3, 0.0, 0.5, 0.85, 0.035, 8, "dark")
    return dict(w=1, h=1, kind="power")


def inverter():
    B.box(-0.3, 0.3, -0.22, 0.22, 0.0, 0.08, "dark")
    B.box(-0.27, 0.0, -0.2, 0.2, 0.08, 0.5, "dark"); B.box(-0.26, -0.01, -0.205, -0.2, 0.3, 0.46, "yellow")
    B.box(0.0, 0.27, -0.2, 0.2, 0.08, 0.5, "dark"); B.box(0.01, 0.26, -0.205, -0.2, 0.3, 0.46, "yellow")
    B.box(-0.28, 0.28, -0.2, 0.15, 0.5, 0.95, "gloss"); B.box(-0.2, -0.02, -0.205, -0.2, 0.7, 0.86, "black"); B.box(0.06, 0.2, -0.205, -0.2, 0.75, 0.8, "green")
    B.cyl(-0.2, -0.22, 0.5, 0.58, 0.012, 6, "red"); B.cyl(0.2, -0.22, 0.5, 0.58, 0.012, 6, "black")
    return dict(w=1, h=1, kind="power")


def gas_cylinder():
    B.cyl(0, 0, 0.02, 0.62, 0.15, 14, "red", rtop=0.15, cap=False)
    B.cyl(0, 0, 0.02, 0.04, 0.17, 14, "dark")
    B.cyl(0, 0, 0.62, 0.7, 0.14, 14, "red", rtop=0.05)
    B.cyl(0, 0, 0.7, 0.76, 0.03, 8, "chrome"); B.box(-0.06, 0.06, -0.015, 0.015, 0.74, 0.77, "black")
    B.box(0.01, 0.04, 0.0, 0.2, 0.7, 0.72, "dark")
    return dict(w=1, h=1, kind="decor")


def shoe_rack():
    B.box(-0.42, 0.42, -0.15, 0.15, 0.0, 0.03, "wood_m")
    for sx in (-1, 1):
        B.box(sx * 0.42 - 0.02, sx * 0.42 + 0.02, -0.15, 0.15, 0.0, 0.7, "wood_m")
    for z in (0.22, 0.45, 0.68):
        B.box(-0.42, 0.42, -0.15, 0.15, z, z + 0.025, "wood_m")
    cols = ["black", "red", "blue", "plastic", "leather", "green"]
    for i, z in enumerate((0.03, 0.245, 0.475)):
        for j in range(3):
            B.box(-0.34 + j * 0.24, -0.34 + j * 0.24 + 0.17, -0.1, 0.1, z, z + 0.1, cols[(i * 3 + j) % 6])
    return dict(w=1, h=1, kind="decor")


def plant(tall):
    B.cyl(0, 0, 0, 0.32 if tall else 0.26, 0.17, 10, "terracotta", rtop=0.22 if tall else 0.2)
    B.cyl(0, 0, 0.31 if tall else 0.25, 0.33 if tall else 0.27, 0.19, 10, "soil")
    if tall:
        for i in range(9 if near else 6):
            a = i / 9 * 6.2832 + (i % 2) * 0.4
            dx, dy = math.cos(a), math.sin(a)
            hgt = 0.9 + 0.12 * (i % 3)
            tip = V((dx * 0.35, dy * 0.35, hgt + 0.4)); base = V((dx * 0.04, dy * 0.04, 0.33)); mid = (base + tip) / 2 + V((dx * 0.1, dy * 0.1, 0))
            side = V((-dy, dx, 0)) * 0.1
            leaf([base, mid + side, tip, mid - side])
    else:
        for i in range(12 if near else 7):
            a = i / 12 * 6.2832
            dx, dy = math.cos(a), math.sin(a)
            tip = V((dx * 0.38, dy * 0.38, 0.62 + 0.12 * (i % 3))); base = V((dx * 0.05, dy * 0.05, 0.3)); mid = (base + tip) / 2 + V((0, 0, 0.1))
            side = V((-dy, dx, 0)) * 0.11
            leaf([base, mid + side, tip, mid - side])
    return dict(w=1, h=1, kind="decor")


def prayer_mat():
    B.box(-0.33, 0.33, -0.48, 0.48, 0, 0.012, "white", top="prayer")
    return dict(w=1, h=1, kind="decor", flat=True)


def ring_light():
    for a in (0.3, 2.4, 4.5):
        c, s = math.cos(a), math.sin(a)
        top = V((0.0, 0.0, 1.2)); bot = V((c * 0.36, s * 0.36, 0.0))
        for off in (V((-s * 0.012, c * 0.012, 0)), V((0, 0, 0))):
            pass
        side = V((-s, c, 0)) * 0.012
        B.poly([top - side, top + side, bot + side, bot - side], "black", None)
        B.poly([top + side, top - side, bot - side, bot + side], "black", None)
        up = V((c, s, 0)).cross(V((-s, c, 0))) * 0.012
        B.poly([top - up, top + up, bot + up, bot - up], "black", None)
        B.poly([top + up, top - up, bot - up, bot + up], "black", None)
    B.cyl(0, 0, 0.0, 1.5, 0.015, 6, "black")
    n = 14 if near else 8
    B.cur = "glow"
    for i in range(n):
        a = i / n * 6.2832
        c, s = math.cos(a), math.sin(a)
        B.box(c * 0.2 - 0.04, c * 0.2 + 0.04, -0.02, 0.0, 1.45 + s * 0.2 - 0.04 + 0.0, 1.45 + s * 0.2 + 0.04, "lampglow")
    B.cur = None
    B.box(-0.06, 0.06, -0.015, 0.015, 1.1, 1.3, "black") if False else None
    B.box(-0.045, 0.045, 0.01, 0.05, 1.36, 1.54, "black")
    return dict(w=1, h=1, kind="tripod", light=True)


def desk_laptop():
    B.box(-0.65, 0.65, -0.3, 0.3, 0.72, 0.76, "wood_l")
    for sx in (-1, 1):
        B.box(sx * 0.62 - 0.03, sx * 0.62 + 0.03, -0.27, 0.27, 0, 0.72, "wood_m")
    B.box(-0.6, 0.6, 0.24, 0.27, 0.35, 0.72, "wood_m")
    B.box(-0.2, 0.2, -0.2, 0.1, 0.76, 0.78, "dark"); B.box(-0.18, 0.18, -0.19, 0.0, 0.78, 0.785, "black")
    B.box(-0.2, 0.2, 0.08, 0.1, 0.78, 1.04, "dark"); B.poly([(-0.18, 0.075, 0.8), (0.18, 0.075, 0.8), (0.18, 0.075, 1.02), (-0.18, 0.075, 1.02)], "laptop", (0, 5, 1))
    B.cyl(0.45, 0.0, 0.76, 0.77, 0.05, 8, "white"); B.cyl(0.45, 0.0, 0.77, 0.8, 0.035, 8, "red")
    # office chair
    cy = -0.78
    B.rbox(-0.25, 0.25, cy - 0.25, cy + 0.25, 0.46, 0.54, 0.04, "fabric", T("#2f3238"))
    B.rbox(-0.23, 0.23, cy + 0.2, cy + 0.27, 0.54, 1.0, 0.04, "fabric", T("#2f3238"))
    B.cyl(0, cy, 0.12, 0.46, 0.025, 8, "chrome")
    for a in (0.0, 1.256, 2.51, 3.77, 5.03):
        c, s = math.cos(a), math.sin(a)
        B.poly([V((c * 0.03 - s * 0.02, cy + s * 0.03 + c * 0.02, 0.1)), V((c * 0.28 - s * 0.02, cy + s * 0.28 + c * 0.02, 0.05)), V((c * 0.28 + s * 0.02, cy + s * 0.28 - c * 0.02, 0.05)), V((c * 0.03 + s * 0.02, cy + s * 0.03 - c * 0.02, 0.1))], "black", (0, cy, 9))
    B.empty("seat_1", (0, cy, 0.54), kind="seat", facing=[0, 1, 0])
    B.empty("use_desk", (0, -0.4, 0.8), kind="desk", facing=[0, 1, 0])
    return dict(w=2, h=2, kind="desk", powered=True)


def curtains():
    tint = T(CURTAIN_TINTS.get(variant, CURTAIN_TINTS["default"]))
    B.box(-0.66, 0.66, -0.1, -0.08, 1.98, 2.0, "wood_d")
    for sx in (-1, 1):
        B.cyl(sx * 0.66, -0.09, 1.93, 2.04, 0.035, 8, "gold")
    n = 14 if near else 6
    for side in (-1, 1):                                       # gathered panels: sine folds in depth, pinched at a tie-back
        edge = side * 0.64
        for i in range(n):
            u0, u1 = i / n, (i + 1) / n
            def pt(u, z):
                x = edge - side * 0.5 * u * (1.0 - 0.25 * (1 - abs(z - 1.0) / 1.0))      # narrower at the tie-back (z about 1.0)
                d = -0.1 - 0.05 * (0.5 + 0.5 * math.sin(u * 6.2832 * 2.5 + (0 if side > 0 else 1.0)))
                return (x, d, z)
            sh = 0.78 + 0.22 * (0.5 + 0.5 * math.sin(((u0 + u1) / 2) * 6.2832 * 2.5 + (0 if side > 0 else 1.0)))
            B.poly([pt(u0, 0.05), pt(u1, 0.05), pt(u1, 1.97), pt(u0, 1.97)], "fabric", (0, 5, 1), tint=(tint[0] * sh, tint[1] * sh, tint[2] * sh))
    return dict(w=1, h=1, kind="decor", wall=True, mountZ=0.0, tintable=list(CURTAIN_TINTS))


def hall_table():
    B.cyl(0, 0, 0, 0.72, 0.09, 10, "dark", rtop=0.06)
    B.cyl(0, 0, 0.7, 0.73, 0.9, 20, "white")
    B.cyl(0, 0, 0.2, 0.74, 0.92, 20, "white", rtop=0.9, cap=False)           # floor-length cloth
    B.cyl(0, 0, 0.5, 0.56, 0.915, 20, "gold", rtop=0.92, cap=False)           # sash of gold braid
    B.cyl(0, 0, 0.73, 0.74, 0.5, 14, "red")
    B.cyl(0, 0, 0.74, 0.94, 0.07, 10, "glass", rtop=0.11)
    for k in range(5):
        a = k * 1.26
        B.cyl(math.cos(a) * 0.05, math.sin(a) * 0.05, 0.94, 1.1, 0.03, 6, "orange" if k % 2 else "red", rtop=0.005)
    for i in range(8):
        a = i / 8 * 6.2832
        c, s = math.cos(a), math.sin(a)
        cx, cy = c * 1.3, s * 1.3
        # covered chair: a white cover over seat and back, a sash round the back with a bow, facing the table
        ex, ey = -c, -s                                           # direction toward the table
        px, py = -ey, ex
        def at(du, dv, z):
            return (cx + ex * du + px * dv, cy + ey * du + py * dv, z)
        B.cyl(cx, cy, 0.0, 0.46, 0.2, 10, "white", rtop=0.21)       # cover skirt to the floor
        B.rbox(cx - 0.21, cx + 0.21, cy - 0.21, cy + 0.21, 0.44, 0.52, 0.04, "white", None, rot=(0, 0, a))
        bx, by = cx - ex * 0.19, cy - ey * 0.19
        B.rbox(bx - 0.2, bx + 0.2, by - 0.03, by + 0.03, 0.5, 0.98, 0.04, "white", None, rot=(0, 0, a + 1.5708)) if False else None
        B.poly([at(-0.19, -0.21, 0.5), at(-0.19, 0.21, 0.5), at(-0.19, 0.21, 0.98), at(-0.19, -0.21, 0.98)], "white", (cx, cy, 0.7))
        B.poly([at(-0.15, -0.21, 0.5), at(-0.15, 0.21, 0.5), at(-0.15, 0.21, 0.98), at(-0.15, -0.21, 0.98)], "white", (cx, cy, 0.7)) if False else None
        B.poly([at(-0.2, -0.22, 0.64), at(-0.2, 0.22, 0.64), at(-0.2, 0.22, 0.74), at(-0.2, -0.22, 0.74)], "red" if i % 2 else "gold", (cx, cy, 0.7))
        B.poly([at(-0.21, 0.0, 0.69), at(-0.21, 0.12, 0.8), at(-0.21, 0.12, 0.6)], "red" if i % 2 else "gold", (cx, cy, 0.7))
        B.poly([at(-0.21, 0.0, 0.69), at(-0.21, -0.12, 0.8), at(-0.21, -0.12, 0.6)], "red" if i % 2 else "gold", (cx, cy, 0.7))
        B.empty("seat_%d" % (i + 1), (cx, cy, 0.52), kind="seat", facing=[ex, ey, 0])
    return dict(w=3, h=3, kind="seat", seats=8)


def stage():
    B.box(-2.4, 2.4, -1.3, 1.3, 0.0, 0.7, "wood_d", top="carpet")
    B.box(-2.4, 2.4, -1.32, -1.28, 0.0, 0.7, "gold")
    for k in range(9):                                        # a pleated skirt along the front of the stage
        x0 = -2.4 + k * 0.5333
        B.poly([(x0, -1.34, 0.02), (x0 + 0.5333, -1.34, 0.02), (x0 + 0.5333, -1.34, 0.68), (x0, -1.34, 0.68)], "fabric", (0, 5, 0.3), tint=T("#9d1f35") if k % 2 else T("#c7324a"))
    for sx in (-1, 1):
        B.cyl(sx * 2.2, -1.1, 0.7, 1.4, 0.04, 8, "gold")
        B.cyl(sx * 2.2, -1.1, 1.4, 1.6, 0.14, 10, "red", rtop=0.0)
    return dict(w=5, h=3, kind="decor")


def high_table():
    L = 2.9
    B.box(-L / 2, L / 2, -0.4, 0.4, 0.0, 0.76, "white")                              # a long table under a white cloth
    B.box(-L / 2 - 0.02, L / 2 + 0.02, -0.42, 0.42, 0.74, 0.78, "white")
    for k in range(10):                                                              # gathered swags along the front
        x0 = -L / 2 + k * L / 10
        B.poly([(x0, -0.43, 0.6), (x0 + L / 10, -0.43, 0.6), (x0 + L / 20 + L / 20, -0.43, 0.74), (x0, -0.43, 0.74)], "gold", (0, 5, 0.6))
    B.box(-L / 2, L / 2, -0.12, 0.12, 0.78, 0.785, "red")                            # runner
    for x in (-1.1, -0.55, 0.55, 1.1):
        B.cyl(x, 0.0, 0.785, 1.0, 0.07, 10, "glass", rtop=0.1)
        for k in range(6):
            a = k * 1.05
            B.cyl(x + math.cos(a) * 0.05, math.sin(a) * 0.05, 1.0, 1.28, 0.035, 6, ("orange", "red", "yellow")[k % 3], rtop=0.005)
    B.cyl(0.0, 0.0, 0.785, 0.95, 0.25, 14, "white", rtop=0.2)                        # a tiered cake
    B.cyl(0.0, 0.0, 0.95, 1.1, 0.17, 14, "gold", rtop=0.15)
    B.cyl(0.0, 0.0, 1.1, 1.2, 0.11, 12, "white", rtop=0.04)
    for x in (-1.3, 1.3):
        B.cyl(x, 0.0, 0.785, 0.8, 0.12, 10, "plate")
    for i, x in enumerate((-0.8, 0.8)):
        B.rbox(x - 0.35, x + 0.35, 0.7, 1.1, 0.0, 0.07, 0.03, "carpet")
        B.rbox(x - 0.22, x + 0.22, 0.75, 1.05, 0.07, 0.5, 0.08, "gold")
        B.rbox(x - 0.22, x + 0.22, 1.0, 1.08, 0.5, 1.5, 0.06, "gold")
        B.empty("seat_%d" % (i + 1), (x, 0.9, 0.5), kind="seat", facing=[0, -1, 0])
    return dict(w=3, h=2, kind="decor")


def backdrop():
    W, H2 = 4.4, 2.8
    B.box(-W / 2, W / 2, -0.08, 0.0, 0.0, H2, "gold")
    B.box(-W / 2 + 0.08, W / 2 - 0.08, -0.1, -0.08, 0.08, H2 - 0.08, "red")
    B.cur = "sign_backdrop"
    B.poly([(-1.9, -0.101, 1.25), (1.9, -0.101, 1.25), (1.9, -0.101, 2.35), (-1.9, -0.101, 2.35)], "sign", (0, 5, 1.5))
    B.cur = None
    for sx in (-1, 1):                                        # drapes at both sides, tied back, with a swag across the top
        for k in range(8):
            x0 = sx * (W / 2 - 0.05) - sx * k * 0.07
            sh = 0.78 + 0.22 * (0.5 + 0.5 * math.sin(k * 1.6))
            B.poly([(x0, -0.16 - 0.04 * math.sin(k * 1.6), 0.05), (x0 - sx * 0.07, -0.16 - 0.04 * math.sin(k * 1.6 + 1.6), 0.05), (x0 - sx * 0.07, -0.16 - 0.04 * math.sin(k * 1.6 + 1.6), H2 - 0.05), (x0, -0.16 - 0.04 * math.sin(k * 1.6), H2 - 0.05)], "fabric", (0, 5, 1), tint=(T("#d4a73a")[0] * sh, T("#d4a73a")[1] * sh, T("#d4a73a")[2] * sh))
    for k in range(9):
        x0 = -W / 2 + k * W / 9
        B.poly([(x0, -0.12, H2), (x0 + W / 9, -0.12, H2), (x0 + W / 18 + W / 18, -0.12, H2 - 0.35), (x0 + W / 18, -0.12, H2 - 0.42)], "fabric", (0, 5, H2), tint=T("#c7324a") if k % 2 else T("#9d1f35"))
    for i in range(7):                                        # a balloon arch
        a = math.pi * i / 6
        B.cyl(math.cos(a) * 1.9 * 0.0 + (-1.7 + i * 0.57), -0.22, 0.0, 0.0, 0.0, 6, "gold") if False else None
        B.rbox(-1.8 + i * 0.6 - 0.12, -1.8 + i * 0.6 + 0.12, -0.34, -0.1, 2.5 + 0.25 * math.sin(math.pi * i / 6) - 0.12, 2.5 + 0.25 * math.sin(math.pi * i / 6) + 0.12, 0.1, "gloss" if False else ("orange", "red", "gold", "white")[i % 4])
    return dict(w=5, h=1, kind="decor", wall=False, tallH=H2, writableNode="sign_backdrop", atlasRect=list(homelib.RECTS["sign"]), atlasSize=1024)


UP_TINTS = {"magenta": "#ff3fb0", "blue": "#3f6bff", "amber": "#ffb02e", "default": "#ffd27a"}


def uplight():
    tint = T(UP_TINTS.get(variant, UP_TINTS["default"]))
    B.cyl(0, 0, 0, 0.1, 0.14, 10, "black", rtop=0.1)
    B.cur = "glow"
    B.cyl(0, 0, 0.1, 0.16, 0.12, 10, "lampglow", tint=tint, rtop=0.1)
    B.cur = None
    B.cyl(0, 0, 0.16, 0.19, 0.12, 10, "black")
    B.empty("light_uplight", (0, 0, 0.2), kind="uplight", aimUp=True)
    return dict(w=1, h=1, kind="light", light=True)


def dance_floor():
    cols = ["red", "blue", "green", "yellow", "orange", "plasticred", "white", "gold"]
    n = 8
    B.cur = "glow"
    for i in range(n):
        for j in range(n):
            x0, y0 = -1.9 + i * 3.8 / n, -1.9 + j * 3.8 / n
            t = cols[(i * 3 + j * 5) % len(cols)]
            B.poly([(x0 + 0.01, y0 + 0.01, 0.034), (x0 + 3.8 / n - 0.01, y0 + 0.01, 0.034), (x0 + 3.8 / n - 0.01, y0 + 3.8 / n - 0.01, 0.034), (x0 + 0.01, y0 + 3.8 / n - 0.01, 0.034)], t, (0, 0, -5), tint=(0.8, 0.8, 0.8))
    B.cur = None
    B.box(-1.95, 1.95, -1.95, 1.95, 0.0, 0.025, "dark")
    B.box(-2.0, 2.0, -2.0, -1.95, 0.0, 0.04, "gold"); B.box(-2.0, 2.0, 1.95, 2.0, 0.0, 0.04, "gold"); B.box(-2.0, -1.95, -1.95, 1.95, 0.0, 0.04, "gold"); B.box(1.95, 2.0, -1.95, 1.95, 0.0, 0.04, "gold")
    return dict(w=4, h=4, kind="decor", flat=True)


def drape_swag():
    W = 1.2
    n = 6
    for k in range(n):
        x0 = -W / 2 + k * W / n
        for half in (0, 1):
            pass
        sag = 0.45
        def z(u): return 0.0 - sag * 4 * u * (1 - u)
        u0, u1 = k / n, (k + 1) / n
        B.poly([(x0, -0.05, z(u0) + 0.0), (x0 + W / n, -0.05, z(u1)), (x0 + W / n, -0.12, z(u1) - 0.5), (x0, -0.12, z(u0) - 0.5)], "fabric", (0, 5, 0), tint=T("#c7324a") if k % 2 else T("#e3b04a"))
    B.cyl(-W / 2, -0.05, -0.04, 0.04, 0.05, 8, "gold"); B.cyl(W / 2, -0.05, -0.04, 0.04, 0.05, 8, "gold")
    return dict(w=1, h=1, kind="decor", wall=True, mountZ=2.5)


# name -> (function, variants)
PIECES = {
    "sofa2": (lambda: sofa(2), list(SOFA_TINTS)), "sofa3": (lambda: sofa(3), list(SOFA_TINTS)), "armchair": (lambda: sofa(1), list(SOFA_TINTS)),
    "coffee-table": (coffee_table, []), "rug1": (lambda: rug(1), []), "rug2": (lambda: rug(2), []), "rug3": (lambda: rug(3), []),
    "tv-console": (tv_console, []), "fan-standing": (fan_standing, []), "fan-ceiling": (fan_ceiling, []), "ac-unit": (ac_unit, []), "lamp-floor": (lamp_floor, []),
    "frame-lagoon": (lambda: frame("lagoon"), []), "frame-adire": (lambda: frame("adire"), []), "frame-portrait": (lambda: frame("portrait"), []),
    "bookshelf": (bookshelf, []), "dining": (lambda: dining(False), []), "dining-laid": (lambda: dining(True), []), "chair-plastic": (chair_plastic, []), "stool": (stool, []),
    "cabinet-base": (lambda: cab_base(False), []), "cabinet-sink": (lambda: cab_base(True), []), "cabinet-wall": (cab_wall, []), "cooker": (lambda: cooker(False), []), "cooker-pots": (lambda: cooker(True), []),
    "fridge": (fridge, []), "microwave": (microwave, []), "water-dispenser": (dispenser, []),
    "bed-single": (lambda: bed(1, False), list(BED_TINTS) + ["ankara-a"]), "bed-double": (lambda: bed(2, True), list(BED_TINTS) + ["ankara-a", "ankara-b"]), "mattress": (mattress, []),
    "wardrobe": (wardrobe, []), "dressing-table": (dressing_table, []), "bedside": (bedside, []),
    "toilet": (toilet, []), "basin": (basin, []), "shower": (shower, []), "bucket-bowl": (bucket_bowl, []),
    "washing-line": (washing_line, []), "generator": (generator, []), "inverter": (inverter, []), "gas-cylinder": (gas_cylinder, []), "shoe-rack": (shoe_rack, []),
    "plant-tall": (lambda: plant(True), []), "plant-bushy": (lambda: plant(False), []), "prayer-mat": (prayer_mat, []), "ring-light": (ring_light, []), "desk-laptop": (desk_laptop, []),
    "curtains": (curtains, list(CURTAIN_TINTS)), "hall-table": (hall_table, []), "stage": (stage, []), "high-table": (high_table, []), "backdrop": (backdrop, []), "uplight": (uplight, list(UP_TINTS)), "dance-floor": (dance_floor, []), "drape-swag": (drape_swag, []),
}
if __name__ == "__main__":
    fn, vars_ = PIECES[piece]
    rec = fn()
    name = piece + ("" if variant == "default" else "-" + variant) + ("" if near else "-far")
    tris, ext = finish(B, name, out_dir)
    rec.update({"piece": piece, "triangles": tris, "extentMetres": [round(ext[0], 2), round(ext[1], 2), round(ext[2], 2)], "variants": vars_,
                "empties": [{"name": n, "x": round(l.x * B.k, 3), "y": round(l.z * B.k, 3), "z": round(-l.y * B.k, 3), **{k: v for k, v in e.items()}} for n, l, e in B.empties]})
    cells = (rec["w"] * homelib.CELL, rec["h"] * homelib.CELL)
    rec["fitsFootprint"] = bool((ext[0] <= cells[0] + 0.02 and ext[1] <= cells[1] + 0.02) or rec.get("wall") or rec.get("ceiling"))
    json.dump(rec, open(os.path.join(out_dir, piece + ".json"), "w"), indent=1)
    print("PIECE", name, tris, rec["fitsFootprint"], [round(e, 2) for e in ext])
