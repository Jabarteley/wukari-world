"""Exterior detail pieces that attach to the street buildings by rule: balcony with railing, window burglar bars, awning, external AC unit, satellite dish, house-number sign,
gate and fence with pillars, gatehouse, security light, generator hut, clothes line. Same atlas and conventions as the furniture (homelib.py), metres, front toward -Y.

  blender --background --disable-autoexec --python detail.py -- <piece> <out-dir>

Wall pieces have their origin on the wall surface (centre of the piece, bottom edge); they extend out of the wall toward -Y.
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import homelib
from homelib import Builder, V, srgb, finish

piece, out_dir = sys.argv[sys.argv.index("--") + 1:][:2]
os.makedirs(out_dir, exist_ok=True)
B = Builder(True)
B.k = 1.0


def balcony():
    W, D = 2.6, 1.1
    B.box(-W / 2, W / 2, -D, 0.0, -0.18, 0.0, "white", top="wood_l", bottom=True)
    B.box(-W / 2, W / 2, -D, -D + 0.04, 0.0, 1.05, "dark")
    for sx in (-1, 1):
        B.box(sx * W / 2 - (0.04 if sx > 0 else 0), sx * W / 2 + (0.0 if sx > 0 else 0.04), -D, 0, 0.0, 1.05, "dark")
    for i in range(0, 14):
        x = -W / 2 + 0.12 + i * (W - 0.24) / 13
        B.box(x - 0.012, x + 0.012, -D + 0.01, -D + 0.03, 0.04, 1.0, "black")
    B.box(-W / 2, W / 2, -D - 0.01, -D + 0.05, 1.03, 1.08, "wood_d")

    B.box(0.6, 0.9, -0.8, -0.5, 0.0, 0.3, "terracotta"); B.cyl(0.75, -0.65, 0.3, 0.55, 0.14, 8, "leaf", cap=True)
    return dict(kind="balcony", attach="wall", w=2.6, d=1.1)


def bars_window():
    w, h = 1.4, 1.5
    B.box(-w / 2, w / 2, -0.12, -0.09, 0.0, 0.04, "dark"); B.box(-w / 2, w / 2, -0.12, -0.09, h - 0.04, h, "dark"); B.box(-w / 2, w / 2, -0.12, -0.09, h / 2 - 0.02, h / 2 + 0.02, "dark")
    n = 11
    for i in range(n + 1):
        x = -w / 2 + 0.03 + (w - 0.06) * i / n
        B.box(x - 0.012, x + 0.012, -0.12, -0.09, 0.0, h, "dark")
    for sx in (-1, 1):
        B.box(sx * w / 2 - (0.03 if sx > 0 else 0), sx * w / 2 + (0.0 if sx > 0 else 0.03), -0.12, -0.0, 0.0, h, "dark")
    B.box(-0.18, 0.18, -0.15, -0.09, h * 0.35, h * 0.62, "dark")
    return dict(kind="bars", attach="wall", w=w, h=h)


def awning():
    w, d = 1.8, 0.9
    B.poly([(-w / 2, 0, 0.0), (w / 2, 0, 0.0), (w / 2, -d, -0.45), (-w / 2, -d, -0.45)], "redwhite" if False else "orange", (0, 0, -9)) if False else None
    B.poly([(-w / 2, 0, 0.0), (w / 2, 0, 0.0), (w / 2, -d, -0.45), (-w / 2, -d, -0.45)], "gloss", (0, 5, -5), [(0, 0), (1, 0), (1, 1), (0, 1)], tint=srgb("#d8d8d0"))
    for i in range(0, 8, 2):
        x0 = -w / 2 + i * w / 8
        B.poly([(x0, 0.001, 0.0), (x0 + w / 8, 0.001, 0.0), (x0 + w / 8, -d - 0.001, -0.45), (x0, -d - 0.001, -0.45)], "red", (0, 5, -5))
    B.poly([(-w / 2, -d, -0.45), (w / 2, -d, -0.45), (w / 2, -d, -0.6), (-w / 2, -d, -0.6)], "white", (0, 5, 0))
    for sx in (-1, 1):
        B.box(sx * w / 2 - 0.015, sx * w / 2 + 0.015, -d, 0, -0.6, -0.45, "dark") if False else None
    return dict(kind="awning", attach="wall", w=w, d=d)


def ac_ext():
    B.box(-0.4, 0.4, -0.4, 0.0, 0.0, 0.55, "gloss")
    B.cyl(0, -0.41, 0.12, 0.45, 0.2, 14, "dark", cap=True) if False else None
    B.box(-0.3, 0.3, -0.405, -0.4, 0.08, 0.47, "dark")
    for z in (0.14, 0.22, 0.30, 0.38):
        B.box(-0.28, 0.28, -0.41, -0.405, z, z + 0.015, "steel")
    for sx in (-1, 1):
        B.box(sx * 0.3 - 0.015, sx * 0.3 + 0.015, -0.4, 0.0, -0.1, 0.0, "steel")
    B.cyl(0.45, -0.1, 0.1, 0.3, 0.02, 6, "white") if False else None
    return dict(kind="ac", attach="wall", w=0.8, d=0.4)


def dish():
    B.cyl(0, 0, 0, 0.5, 0.025, 6, "steel")
    B.box(-0.12, 0.12, -0.12, 0.12, 0.0, 0.03, "steel")
    n = 12
    r = 0.34
    ring = [V((r * math.cos(2 * math.pi * i / n), -0.2 + r * math.sin(2 * math.pi * i / n) * 0.2, 0.62 + r * math.sin(2 * math.pi * i / n))) for i in range(n)]
    c = V((0, -0.05, 0.62))
    for i in range(n):
        B.poly([ring[i], ring[(i + 1) % n], c], "white", (0, 5, 0.62))
        B.poly([ring[i], ring[(i + 1) % n], c], "white", (0, -5, 0.62))
    B.cyl(0, -0.36, 0.55, 0.9, 0.012, 6, "dark") if False else None
    B.box(-0.015, 0.015, -0.32, -0.05, 0.62, 0.64, "dark"); B.box(-0.03, 0.03, -0.34, -0.31, 0.6, 0.66, "dark")
    return dict(kind="dish", attach="roof", w=0.8, d=0.5)


def number_sign():
    B.box(-0.3, 0.3, -0.04, 0.0, 0.0, 0.3, "blue")
    B.cur = "sign_number"
    B.poly([(-0.27, -0.042, 0.03), (0.27, -0.042, 0.03), (0.27, -0.042, 0.27), (-0.27, -0.042, 0.27)], "sign", (0, 5, 0))
    B.cur = None
    return dict(kind="number-sign", attach="wall", w=0.6, h=0.3, writableNode="sign_number", atlasRect=list(homelib.RECTS["sign"]), atlasSize=1024)


def gate_fence():
    for sx in (-1, 1):
        B.box(sx * 3.0 - 0.25, sx * 3.0 + 0.25, -0.25, 0.25, 0, 2.3, "plaster", srgb("#efe3c8"))
        B.box(sx * 3.0 - 0.32, sx * 3.0 + 0.32, -0.32, 0.32, 2.3, 2.45, "white")
        B.cyl(sx * 3.0, 0, 2.45, 2.65, 0.14, 8, "gold", rtop=0.04)
    for sx in (-1, 1):
        B.box(sx * 1.7 - 0.12, sx * 1.7 + 0.12, -0.12, 0.12, 0, 1.9, "plaster", srgb("#efe3c8"))
    B.box(-2.9, -1.7, -0.1, 0.1, 0, 1.4, "plaster", srgb("#efe3c8")); B.box(1.7, 2.9, -0.1, 0.1, 0, 1.4, "plaster", srgb("#efe3c8"))
    B.box(-2.9, -1.7, -0.11, 0.11, 1.4, 1.45, "white"); B.box(1.7, 2.9, -0.11, 0.11, 1.4, 1.45, "white")
    for sx in (-1, 1):
        for z in (0.2, 1.05, 1.7):
            B.box(sx * 0.82 - 0.7 if False else (min(sx * 0.02, sx * 1.58)), (max(sx * 0.02, sx * 1.58)), -0.03, 0.03, z, z + 0.05, "dark")
        for i in range(8):
            x = sx * (0.1 + i * 0.2)
            B.box(x - 0.012, x + 0.012, -0.03, 0.03, 0.1, 1.9, "dark")
        B.box(sx * 1.55, sx * 1.58, -0.03, 0.03, 0.1, 1.9, "dark")
    B.box(-1.7, 1.7, -0.06, 0.06, 1.9, 1.95, "dark")
    return dict(kind="gate-fence", attach="ground", w=6.6, d=0.7, opening=3.0)


def gatehouse():
    B.box(-0.8, 0.8, -0.8, 0.8, 0, 2.2, "plaster", srgb("#efe3c8"))
    B.poly([(-1.0, -1.0, 2.2), (1.0, -1.0, 2.2), (1.0, 1.0, 2.2), (-1.0, 1.0, 2.2)], "roof", None) if False else None
    B.box(-1.0, 1.0, -1.0, 1.0, 2.2, 2.3, "metal" if False else "steel", top="terracotta")
    B.box(-0.35, 0.35, -0.82, -0.8, 0.9, 1.7, "glass"); B.box(-0.1, 0.4, 0.55, 0.8, 0.0, 0.01, "dark") if False else None
    B.box(0.55, 0.8, -0.82, -0.8, 0.0, 1.9, "wood_m")
    B.box(-0.8, 0.8, -0.85, -0.8, 0.85, 0.9, "white")
    B.empty("light_gate", (0, -0.9, 2.1), kind="lamp")
    return dict(kind="gatehouse", attach="ground", w=2.0, d=2.0)


def sec_light():
    B.box(-0.1, 0.1, -0.03, 0.0, 0.0, 0.3, "steel")
    B.box(-0.03, 0.03, -0.18, -0.03, 0.08, 0.15, "steel")
    B.cur = "glow"
    B.box(-0.14, 0.14, -0.2, -0.1, 0.0, 0.2, "lampglow") if False else B.cyl(0, -0.22, 0.0, 0.2, 0.1, 8, "lampglow", rtop=0.14, cap=True)
    B.cur = None
    B.empty("light_security", (0, -0.25, 0.1), kind="lamp")
    return dict(kind="security-light", attach="wall", w=0.3, h=0.3)


def gen_hut():
    B.box(-0.9, 0.9, -0.7, 0.7, 0, 1.6, "plaster", srgb("#e0d3b4"))
    B.box(-1.0, 1.0, -0.8, 0.8, 1.6, 1.7, "steel", top="roof") if False else B.box(-1.0, 1.0, -0.8, 0.8, 1.6, 1.72, "steel")
    B.box(-0.7, 0.7, -0.72, -0.7, 0.2, 1.4, "dark") if False else None
    B.box(-0.7, 0.7, -0.715, -0.7, 0.15, 1.45, "dark")
    for z in (0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35):
        B.box(-0.66, 0.66, -0.73, -0.715, z, z + 0.02, "steel")
    B.cyl(0.6, 0.3, 1.72, 2.3, 0.05, 8, "dark")
    B.box(-0.1, 0.1, -0.16, -0.15, 0.0, 0.0, "dark") if False else None
    return dict(kind="generator-hut", attach="ground", w=2.0, d=1.6)


def cloth(kind, x, top, w, h, tile):
    if kind == "shirt":
        sl = w * 0.32
        pts = [(x, top - 0.02), (x + sl, top), (x + w * 0.5, top - 0.05), (x + w - sl, top), (x + w, top - 0.02), (x + w, top - h * 0.3), (x + w - sl * 0.9, top - h * 0.3), (x + w - sl * 0.9, top - h), (x + sl * 0.9, top - h), (x + sl * 0.9, top - h * 0.3), (x, top - h * 0.3)]
    else:
        n = 6
        pts = [(x + w * i / n, top - 0.03 * math.sin(i)) for i in range(n + 1)] + [(x + w - w * i / n, top - h + 0.05 * math.sin(i * 1.7)) for i in range(n + 1)]
    for flip in (0, 1):
        P = [V((px, (0.015 if flip else -0.015) + 0.02 * math.sin(px * 7), pz)) for px, pz in pts]
        uv = [((p.x - x) / w, (p.z - top + h) / h) for p in P]
        B.poly(P if not flip else P[::-1], tile, None, uv if not flip else uv[::-1])


def clothes_line():
    for sx in (-1, 1):
        B.cyl(sx * 1.6, 0, 0, 2.1, 0.03, 6, "steel")
    B.box(-1.6, 1.6, -0.005, 0.005, 2.02, 2.04, "white")
    B.cur = "clothes"
    x = -1.5
    for i, (k, t) in enumerate((("shirt", "red"), ("wrap", "bed_a"), ("shirt", "blue"), ("shirt", "yellow"), ("wrap", "curtain"), ("shirt", "white"), ("wrap", "bed_b"))):
        w = 0.4 if k == "shirt" else 0.42
        cloth(k, x, 2.02, w, 0.62 if k == "shirt" else 1.0, t)
        x += w + 0.08
    B.cur = None
    return dict(kind="clothes-line", attach="ground", w=3.2, d=0.1)


PIECES = {"balcony": balcony, "bars-window": bars_window, "awning": awning, "ac-external": ac_ext, "dish": dish, "number-sign": number_sign, "gate-fence": gate_fence, "gatehouse": gatehouse,
          "security-light": sec_light, "generator-hut": gen_hut, "clothes-line": clothes_line}
rec = PIECES[piece]()
name = "detail-" + piece
tris, ext = finish(B, name, out_dir)
rec.update({"piece": name, "triangles": tris, "extentMetres": [round(e, 2) for e in ext], "w": 1, "h": 1,
            "empties": [{"name": n, "x": round(l.x, 3), "y": round(l.z, 3), "z": round(-l.y, 3)} for n, l, e in B.empties]})
json.dump(rec, open(os.path.join(out_dir, name + ".json"), "w"), indent=1)
print("DETAIL", name, tris)
