"""Clean low-poly cars built from a side profile: saloon, suv, pickup, van. Straight panels, inset windows, arches, bumpers, lights, and four wheel nodes that spin.

  blender --background --disable-autoexec --python car_shell.py -- <saloon|suv|pickup|van> <variant> <near|far> <out-dir>

Used where a generated model was not available: the profile follows the clean side-view picture of the vehicle. One tiny atlas of flat colours, one draw call per vehicle
(near: the body plus wheel nodes wheel_fl, wheel_fr, wheel_rl, wheel_rr, origin on the axle, turn about X; far: wheels merged). Empties as for the other vehicles:
seat_driver, seat_1.., light_head_l/r, light_tail_l/r. The vehicle faces glTF +z; its left is +x.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
import setlib
from setlib import Builder, V, finish

kind, variant, lod, out_dir = sys.argv[sys.argv.index("--") + 1:][:4]
near = lod == "near"
os.makedirs(out_dir, exist_ok=True)
COLOURS = {"cream": (0.93, 0.90, 0.80), "red": (0.75, 0.12, 0.10), "blue": (0.15, 0.30, 0.68), "green": (0.14, 0.45, 0.25), "white": (0.95, 0.95, 0.94), "black": (0.10, 0.10, 0.11), "silver": (0.62, 0.64, 0.67)}
body_rgb = COLOURS[variant]
# a 4 x 4 grid of 64 px flat colours
setlib.SIZE = 256
names = ["body", "glass", "dark", "tyre", "hub", "head", "tail", "chrome", "plate", "belly", "amber", "bodydark", "interior", "bed", "white", "grey"]
cols = {"body": body_rgb, "glass": (0.18, 0.30, 0.42), "dark": (0.08, 0.08, 0.09), "tyre": (0.05, 0.05, 0.055), "hub": (0.6, 0.62, 0.65), "head": (1.0, 0.96, 0.75), "tail": (0.8, 0.08, 0.06),
        "chrome": (0.75, 0.77, 0.8), "plate": (0.9, 0.88, 0.7), "belly": (0.15, 0.15, 0.16), "amber": (0.95, 0.6, 0.1), "bodydark": tuple(c * 0.55 for c in body_rgb), "interior": (0.35, 0.3, 0.27),
        "bed": tuple(c * 0.75 for c in body_rgb), "white": (0.95, 0.95, 0.95), "grey": (0.5, 0.5, 0.52)}
setlib.RECTS = {n: ((i % 4) * 64, (i // 4) * 64, 64, 64) for i, n in enumerate(names)}
atlas = np.ones((256, 256, 4), dtype=np.float32)
rng = np.random.default_rng(3)
for n, (x, y, w, h) in setlib.RECTS.items():
    atlas[y:y + h, x:x + w, :3] = np.clip(np.array(cols[n])[None, None, :] * (1 + rng.standard_normal((h, w))[:, :, None] * 0.012), 0, 1)
img = bpy.data.images.new("caratlas", 256, 256, alpha=False)
img.colorspace_settings.name = "sRGB"
img.pixels.foreach_set(atlas[::-1].reshape(-1))
scn = bpy.context.scene
scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 86; scn.view_settings.view_transform = "Standard"
atlas_path = os.path.join(out_dir, "atlas-car-%s-%s.jpg" % (kind, variant))
img.save_render(atlas_path, scene=scn)

# name: (length, width, profile [(u from the front, z)], wheel radius, axle u front, axle u rear, windows, seats)
SPEC = {
    "saloon": dict(L=4.4, W=1.85, prof=[(0, 0.38), (0, 0.85), (0.7, 0.98), (1.35, 1.0), (1.95, 1.5), (3.05, 1.5), (3.7, 1.02), (4.4, 0.98), (4.4, 0.38)], R=0.37, af=0.95, ar=3.5,
                   side=[(1.75, 2.5), (2.6, 3.3)], zw=(1.08, 1.42), wind=(3, 4), rear=(5, 6), seats=[(0.45, 2.1), (-0.45, 2.1), (0.45, 3.0), (-0.45, 3.0)], hz=0.8, tz=0.9),
    "suv": dict(L=4.7, W=1.95, prof=[(0, 0.5), (0, 1.15), (1.15, 1.22), (1.55, 1.9), (4.55, 1.9), (4.7, 1.75), (4.7, 0.5)], R=0.45, af=1.0, ar=3.75,
                side=[(1.7, 2.6), (2.7, 3.5), (3.6, 4.4)], zw=(1.3, 1.78), wind=(2, 3), rear=(5, 6), seats=[(0.5, 2.2), (-0.5, 2.2), (0.5, 3.1), (-0.5, 3.1), (0.5, 3.9)], hz=1.0, tz=1.1),
    "pickup": dict(L=5.2, W=1.9, prof=[(0, 0.48), (0, 1.0), (1.2, 1.06), (1.65, 1.72), (2.85, 1.72), (3.0, 1.06), (5.2, 1.06), (5.2, 0.48)], R=0.45, af=1.0, ar=4.1,
                   side=[(1.8, 2.3), (2.35, 2.85)], zw=(1.2, 1.62), wind=(2, 3), rear=None, seats=[(0.45, 2.1), (-0.45, 2.1), (0.45, 2.7), (-0.45, 2.7)], hz=0.85, tz=0.95, bed=(3.1, 5.2)),
    "van": dict(L=5.0, W=2.0, prof=[(0, 0.5), (0, 1.05), (0.9, 1.15), (1.5, 1.95), (1.6, 2.55), (5.0, 2.55), (5.0, 0.5)], R=0.42, af=0.95, ar=3.9,
                side=[(1.0, 1.55)], zw=(1.3, 2.0), wind=(2, 3), rear=None, seats=[(0.5, 1.5), (-0.5, 1.5)], hz=0.85, tz=1.0),
}
S = SPEC[kind]
L, W, R = S["L"], S["W"], S["R"]
B = Builder(near)
y_of = lambda u: -L / 2 + u           # front at -y
prof = [(y_of(u), z) for u, z in S["prof"]]
cx = (0.0, 0.0, 0.9)
n = len(prof)
# the body: the profile extruded across the width. Two side caps and a quad for every profile edge.
for sx in (-1, 1):
    pts = [V((sx * W / 2, y, z)) for y, z in prof]
    B.poly(pts, "body", (0, -L / 2 + L / 2, 0.9) if False else (sx * -5, 0, 1.0), None)
for i in range(n):
    (y0, z0), (y1, z1) = prof[i], prof[(i + 1) % n]
    tile = "belly" if (z0 <= 0.5 and z1 <= 0.5) else "body"
    B.poly([V((-W / 2, y0, z0)), V((W / 2, y0, z0)), V((W / 2, y1, z1)), V((-W / 2, y1, z1))], tile, (0, -L / 2 + L / 2, 1.0))
# windows on the side caps, the windscreen and the rear glass (slightly proud)
zw0, zw1 = S["zw"]
upper = S["prof"][1:-1]


def ztop(u):
    for (ua, za), (ub, zb) in zip(upper, upper[1:]):
        if ua <= u <= ub:
            return za + (zb - za) * ((u - ua) / (ub - ua) if ub > ua else 0)
    return upper[-1][1]


for u0, u1 in S["side"]:
    zt0, zt1 = min(zw1, ztop(u0) - 0.1), min(zw1, ztop(u1) - 0.1)       # the glass follows the roof line: never outside the body
    if min(zt0, zt1) < zw0 + 0.12:
        continue
    for sx in (-1, 1):
        B.poly([V((sx * (W / 2 + 0.01), y_of(u0), zw0)), V((sx * (W / 2 + 0.01), y_of(u1), zw0)), V((sx * (W / 2 + 0.01), y_of(u1), zt1)), V((sx * (W / 2 + 0.01), y_of(u0), zt0))], "glass", (sx * -5, 0, 1))


def edge_quad(i, tile, inset=0.12, bottom=0.06):
    """A glass panel on the slanted profile edge i, inset from the sides."""
    (y0, z0), (y1, z1) = prof[i], prof[i + 1]
    a, b = V((0, y0, z0)), V((0, y1, z1))
    d = (b - a)
    nrm = V((0, -d.z, d.y)).normalized()
    if nrm.z < 0:
        nrm = -nrm
    p = lambda t, x: V((x, 0, 0)) + a + d * t + nrm * 0.01
    B.poly([p(bottom, -W / 2 + inset), p(bottom, W / 2 - inset), p(1 - bottom, W / 2 - inset), p(1 - bottom, -W / 2 + inset)], tile, (0, -L / 2 + L / 2, 1.0))


wi = S["wind"]
edge_quad(wi[0], "glass")                       # windscreen: the first slanted edge of the cabin
if S["rear"]:
    edge_quad(S["rear"][0], "glass")
# front: bumper, grille, lights; rear: bumper, lights, plate
fy = y_of(0)
ry = y_of(L)
hz, tz = S["hz"], S["tz"]
B.box(-W / 2 - 0.03, W / 2 + 0.03, fy - 0.12, fy + 0.15, 0.3, 0.52, "dark")
B.box(-W / 2 * 0.55, W / 2 * 0.55, fy - 0.02, fy + 0.02, hz - 0.1, hz + 0.14, "dark") if False else None
for sx in (-1, 1):
    B.box(sx * (W / 2 - 0.32) - 0.2, sx * (W / 2 - 0.32) + 0.2, fy - 0.04, fy + 0.04, hz, hz + 0.16, "head")
B.box(-W / 2 + 0.7, W / 2 - 0.7, fy - 0.04, fy + 0.04, hz - 0.02, hz + 0.12, "chrome")
B.box(-W / 2 - 0.03, W / 2 + 0.03, ry - 0.15, ry + 0.12, 0.3, 0.52, "dark")
for sx in (-1, 1):
    B.box(sx * (W / 2 - 0.3) - 0.2, sx * (W / 2 - 0.3) + 0.2, ry - 0.04, ry + 0.04, tz, tz + 0.15, "tail")
B.box(-0.25, 0.25, ry - 0.045, ry + 0.045, 0.62, 0.78, "plate")
# the open bed of a pickup: floor and three walls
if "bed" in S:
    b0, b1 = S["bed"]
    zb = S["prof"][-3][1]
    B.box(-W / 2 + 0.05, W / 2 - 0.05, y_of(b0 + 0.05), y_of(b1), zb, zb + 0.04, "bed")
    B.box(-W / 2, -W / 2 + 0.1, y_of(b0), y_of(b1), zb, zb + 0.42, "body"); B.box(W / 2 - 0.1, W / 2, y_of(b0), y_of(b1), zb, zb + 0.42, "body")
    B.box(-W / 2, W / 2, y_of(b0), y_of(b0) + 0.1, zb, zb + 0.5, "body"); B.box(-W / 2, W / 2, y_of(b1) - 0.1, y_of(b1), zb, zb + 0.42, "body")
# arches (dark discs on the side) and the wheels
seg = 12 if near else 8
wheels = []
for lab, u, sx in (("fl", S["af"], 1), ("fr", S["af"], -1), ("rl", S["ar"], 1), ("rr", S["ar"], -1)):
    yc = y_of(u)
    wheels.append((lab, yc, sx))
    arch = [V((sx * (W / 2 + 0.012), yc + R * 1.18 * math.cos(2 * math.pi * i / 14), R + R * 1.18 * math.sin(2 * math.pi * i / 14))) for i in range(14)]
    B.poly([p for p in arch if p.z >= 0.02] or arch, "dark", (sx * -5, 0, 1.0))
wwid = 0.28
for lab, yc, sx in wheels:
    xc = sx * (W / 2 - wwid / 2 + 0.02)
    B.cur = "wheel_" + lab
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        P = lambda dx, r, a: V((xc + dx, yc + r * math.cos(a), R + r * math.sin(a)))
        B.poly([P(-wwid / 2, R, a0), P(wwid / 2, R, a0), P(wwid / 2, R, a1), P(-wwid / 2, R, a1)], "tyre", (xc, yc, R))
        for s2 in (-1, 1):
            xs = s2 * wwid / 2
            B.poly([P(xs, R, a0), P(xs, R, a1), P(xs, R * 0.6, a1), P(xs, R * 0.6, a0)], "tyre", (xc - s2 * 5, yc, R))
            B.poly([P(xs + s2 * 0.005, R * 0.6, a0), P(xs + s2 * 0.005, R * 0.6, a1), V((xc + xs, yc, R))], "hub", (xc - s2 * 5, yc, R))
    B.cur = None
    B.empty("pivot_wheel_" + lab, (xc, yc, R))
if not near:
    B.groups = {}                                  # far: wheels stay in the body mesh
    B.empties = [e for e in B.empties if not e[0].startswith("pivot_")]
# anchors (x to the left = +x)
Ht = max(z for _, z in S["prof"])
for i, (x, u) in enumerate(S["seats"]):
    B.empty("seat_driver" if i == 0 else "seat_%d" % i, (x * W / 2 / 0.5 * 0.5 if False else x * W / 2 * 0.9, y_of(u), Ht * 0.6), kind="seat")
for sx in (1, -1):
    B.empty("light_head_%s" % ("l" if sx > 0 else "r"), (sx * (W / 2 - 0.32), fy - 0.06, hz + 0.08), kind="head")
    B.empty("light_tail_%s" % ("l" if sx > 0 else "r"), (sx * (W / 2 - 0.3), ry + 0.06, tz + 0.07), kind="tail")
name = "%s-%s%s" % (kind, variant, "" if near else "-far")
tris = finish(B, kind, name, out_dir, atlas_path, 0.0, (W, L), {})
rec = {"type": kind, "triangles": tris, "size": {"width": W, "length": L, "height": Ht}, "wheelRadius": R,
       "wheelNodes": ["wheel_" + w[0] for w in wheels] if near else [], "seats": len(S["seats"]), "empties": [{"name": n_, "x": round(l.x, 2), "y": round(l.z, 2), "z": round(-l.y, 2)} for n_, l, _ in B.empties if not n_.startswith("pivot_")]}
json.dump(rec, open(os.path.join(out_dir, kind + ".json"), "w"), indent=1)
print("CAR", name, tris)
