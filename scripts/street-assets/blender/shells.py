"""Builds street buildings and stalls as clean geometry: straight walls, exact roof planes, door and window pieces, in a few hundred triangles, with one
texture atlas for the whole object (generated window and door pictures plus drawn plaster, roofing, stripes and planks).

  blender --background --disable-autoexec --python shells.py -- <type> <variant> <near|far> <out-dir> <textures-dir>

types: bungalow, house2 (two-storey family house), flats, kiosk, stall. variants name the colours (see PALETTES).
Writes <out-dir>/<type>-<variant>[-far].raw.glb and <out-dir>/<type>.json (footprint, door and facing, in game units).
Axes: Blender Z up, front faces -Y (glTF +Z, the game's forward). The origin is on the ground at the centre of the footprint.
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
kind, variant, lod, out_dir, tex_dir = argv[:5]
near = lod == "near"
os.makedirs(out_dir, exist_ok=True)

PALETTES = {
    "cream": {"wall": (0.93, 0.85, 0.66), "awning": (0.10, 0.52, 0.55), "umbrella": (0.82, 0.16, 0.12)},
    "mint": {"wall": (0.70, 0.86, 0.74), "awning": (0.78, 0.15, 0.13), "umbrella": (0.12, 0.45, 0.80)},
    "sky": {"wall": (0.68, 0.80, 0.93), "awning": (0.15, 0.30, 0.72), "umbrella": (0.18, 0.62, 0.30)},
    "teal": {"wall": (0.90, 0.62, 0.30), "awning": (0.10, 0.52, 0.55), "umbrella": (0.82, 0.16, 0.12)},
    "red": {"wall": (0.30, 0.62, 0.55), "awning": (0.78, 0.15, 0.13), "umbrella": (0.12, 0.45, 0.80)},
    "blue": {"wall": (0.93, 0.80, 0.30), "awning": (0.15, 0.30, 0.72), "umbrella": (0.18, 0.62, 0.30)},
}
PAL = PALETTES[variant]

# ---------------------------------------------------------------------------------------------------------------- the atlas
TILE = 256 if near else 128
N = 4
(T_WALL, T_ROOF, T_WIN, T_DOOR, T_TRIM, T_CONC, T_DARK, T_RAIL, T_STRIPE, T_WOOD, T_GOODS, T_UMB, T_METAL, T_FLAT, T_TANK, T_SIGN) = range(16)
rng = np.random.default_rng(11)


def noise(shape, scale, amp):
    small = rng.standard_normal((max(2, shape[0] // scale), max(2, shape[1] // scale)))
    big = np.kron(small, np.ones((scale, scale)))[:shape[0], :shape[1]]
    return big * amp


def tile_base(rgb, amp=0.03, scale=16):
    n = noise((256, 256), scale, amp)[:, :, None] + noise((256, 256), 2, amp * 0.4)[:, :, None]
    return np.clip(np.array(rgb)[None, None, :] * (1 + n), 0, 1)


def load_png(name):
    im = bpy.data.images.load(os.path.join(tex_dir, name))
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[:, :, :3]


def make_tiles():
    t = {}
    t[T_WALL] = tile_base(PAL["wall"], 0.012, 64)
    roof = tile_base((0.62, 0.27, 0.16), 0.02, 32)            # ribs run down the slope (along v), so brightness varies along u
    u = np.linspace(0, 1, 256)[None, :, None]
    ribs = 0.80 + 0.20 * np.cos(2 * np.pi * u * 24)
    lap = 1 - 0.05 * (np.mod(np.linspace(0, 1, 256) * 5, 1) > 0.94)[:, None, None]
    t[T_ROOF] = np.clip(roof * ribs * lap, 0, 1)
    t[T_WIN] = load_png("window.png")
    t[T_DOOR] = load_png("door.png")
    t[T_TRIM] = tile_base((0.95, 0.92, 0.84), 0.015, 32)
    t[T_CONC] = tile_base((0.74, 0.72, 0.66), 0.04, 16)
    t[T_DARK] = tile_base((0.10, 0.09, 0.09), 0.02, 32)
    rail = np.full((256, 256, 3), 0.93)
    for i in range(12):                                         # vertical bars on a light ground, so a railing reads as bars
        c = int((i + 0.5) / 12 * 256); rail[:, c - 5:c + 5] = (0.18, 0.2, 0.22)
    rail[:20] = (0.2, 0.22, 0.25); rail[-20:] = (0.2, 0.22, 0.25)
    t[T_RAIL] = rail
    st = np.ones((256, 256, 3)) * 0.96
    for i in range(0, 8, 2):
        st[:, i * 32:(i + 1) * 32] = PAL["awning"]
    t[T_STRIPE] = np.clip(st * (1 + noise((256, 256), 8, 0.02)[:, :, None]), 0, 1)
    wood = tile_base((0.52, 0.34, 0.20), 0.03, 32)
    for i in range(1, 6):
        wood[int(i / 6 * 256) - 2:int(i / 6 * 256) + 2] *= 0.6
    t[T_WOOD] = wood
    cols = [(0.85, 0.15, 0.1), (0.95, 0.65, 0.1), (0.3, 0.65, 0.2), (0.95, 0.9, 0.8), (0.9, 0.35, 0.1), (0.55, 0.12, 0.25)]
    cell = 32                                                    # a heap of fruit and vegetables: round-ish cells of mixed colours with a dark gap between
    goods = np.full((256, 256, 3), 0.12)
    for gy in range(0, 256, cell):
        for gx in range(0, 256, cell):
            c = np.array(cols[int(rng.integers(len(cols)))]) * (0.85 + 0.3 * rng.random())
            yy, xx = np.mgrid[0:cell, 0:cell]
            m = ((yy - cell / 2) ** 2 + (xx - cell / 2) ** 2) < (cell / 2 - 1) ** 2
            blk = goods[gy:gy + cell, gx:gx + cell]
            blk[m] = np.clip(c * (1.15 - 0.4 * ((yy - cell / 2) / cell)[m, None]), 0, 1)
    t[T_GOODS] = goods
    um = np.ones((256, 256, 3)) * 0.96
    um[:, 128:] = PAL["umbrella"]
    t[T_UMB] = um
    t[T_METAL] = tile_base((0.45, 0.47, 0.5), 0.03, 16)
    t[T_FLAT] = tile_base((0.55, 0.55, 0.52), 0.05, 16)
    t[T_TANK] = tile_base((0.12, 0.28, 0.55), 0.02, 32)
    t[T_SIGN] = tile_base((0.96, 0.94, 0.88), 0.01, 32)
    return t


tiles = make_tiles()
atlas = np.zeros((TILE * N, TILE * N, 4), dtype=np.float32); atlas[:, :, 3] = 1
for idx, arr in tiles.items():
    img = bpy.data.images.new("tmp%d" % idx, arr.shape[1], arr.shape[0], alpha=False)
    rgba = np.concatenate([arr, np.ones(arr.shape[:2] + (1,))], axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.reshape(-1)); img.scale(TILE, TILE)
    out = np.empty(TILE * TILE * 4, dtype=np.float32); img.pixels.foreach_get(out)
    c, r = idx % N, idx // N
    atlas[r * TILE:(r + 1) * TILE, c * TILE:(c + 1) * TILE] = out.reshape(TILE, TILE, 4)
print("ATLASMEAN", atlas.mean(), atlas[:, :, :3].max())
atlas_img = bpy.data.images.new("atlas", TILE * N, TILE * N, alpha=False)
atlas_img.colorspace_settings.name = "sRGB"          # before the pixels: changing it afterwards clears a generated image
atlas_img.pixels.foreach_set(atlas.reshape(-1))
chk = np.empty(TILE * N * TILE * N * 4, dtype=np.float32); atlas_img.pixels.foreach_get(chk); print("ATLASBACK", chk.mean(), atlas.dtype, atlas.flags["C_CONTIGUOUS"])
atlas_path = os.path.join(out_dir, "%s-%s%s-atlas.jpg" % (kind, variant, "" if near else "-far"))
scn = bpy.context.scene
scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 70; scn.view_settings.view_transform = "Standard"
atlas_img.save_render(atlas_path, scene=scn)

# --------------------------------------------------------------------------------------------------------------- geometry
bm = bmesh.new()
uvl = bm.loops.layers.uv.new("UV")
V = Vector


def tuv(tile, u, v):
    c, r = tile % N, tile // N
    e = 0.012
    return ((c + e + u * (1 - 2 * e)) / N, (r + e + v * (1 - 2 * e)) / N)


def poly(pts, tile, ref, uvs=None):
    pts = [V(p) for p in pts]
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
    centre = sum(pts, V()) / len(pts)
    uvs = uvs or ([(0, 0), (1, 0), (1, 1), (0, 1)] if len(pts) == 4 else [(0, 0), (1, 0), (0.5, 1)])
    if n.dot(centre - V(ref)) < 0:
        pts = pts[::-1]; uvs = uvs[::-1]
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    for loop, (u, v) in zip(f.loops, uvs):
        loop[uvl].uv = tuv(tile, u, v)
    return f


def box(x0, x1, y0, y1, z0, z1, side=T_WALL, top=None, bottom=None, front=None):
    ref = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    top = side if top is None else top
    front = side if front is None else front
    poly([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], top, ref)
    if bottom is not None:
        poly([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], bottom, ref)
    poly([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], front, ref)
    poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], side, ref)
    poly([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], side, ref)
    poly([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], side, ref)


class Walls:
    """Points on the four walls of a rectangle (W along x, D along y), seen from outside: side, along-wall t (right of the viewer), height z, offset out of the wall."""
    def __init__(self, W, D, y_shift=0.0):
        self.W, self.D, self.ys = W, D, y_shift
        self.defs = {"front": (V((0, -D / 2, 0)), V((1, 0, 0)), V((0, -1, 0))), "right": (V((W / 2, 0, 0)), V((0, 1, 0)), V((1, 0, 0))),
                     "back": (V((0, D / 2, 0)), V((-1, 0, 0)), V((0, 1, 0))), "left": (V((-W / 2, 0, 0)), V((0, -1, 0)), V((-1, 0, 0)))}

    def p(self, side, t, z, off=0.0):
        base, right, n = self.defs[side]
        return base + right * t + n * off + V((0, 0, z))

    def quad(self, side, t0, t1, z0, z1, off, tile, ref, uvs=None):
        poly([self.p(side, t0, z0, off), self.p(side, t1, z0, off), self.p(side, t1, z1, off), self.p(side, t0, z1, off)], tile, ref, uvs)

    def window(self, side, t, zc, w=1.6, h=1.8, ref=(0, 0, 1)):
        self.quad(side, t - w / 2, t + w / 2, zc - h / 2, zc + h / 2, 0.04, T_WIN, ref)
        if near:                                             # sill: a small slab under the window
            s = self.defs[side]
            c = s[0] + s[1] * t + s[2] * 0.12
            ax = abs(s[1].x) > 0.5
            hw, hd = (w / 2 + 0.12, 0.12) if ax else (0.12, w / 2 + 0.12)
            box(c.x - hw, c.x + hw, c.y - hd, c.y + hd, zc - h / 2 - 0.12, zc - h / 2, T_TRIM)

    def door(self, side, t, w=1.4, h=2.5, ref=(0, 0, 1)):
        self.quad(side, t - w / 2, t + w / 2, 0.0, h, 0.05, T_DOOR, ref)


def hip_roof(W, D, wall_h, over, rise, ys=0.0):
    hw, hd = W / 2 + over, D / 2 + over
    r = max(0.0, (W - D) / 2)
    ref = (0, ys, wall_h + rise / 2)
    z0, z1 = wall_h, wall_h + rise
    cover = 13.0                                               # metres of roofing one tile covers, so ribs keep one width on every plane
    ridge_l, ridge_r = V((-r, ys, z1)), V((r, ys, z1))
    e = [V((-hw, ys - hd, z0)), V((hw, ys - hd, z0)), V((hw, ys + hd, z0)), V((-hw, ys + hd, z0))]
    sl_f = math.hypot(hd, rise); sl_s = math.hypot(hw - r, rise)

    def roof_poly(pts, axis, eave):
        """UVs from position so the ribs run straight down the slope on every plane: u along the eave, v the distance up the slope."""
        uv = []
        for p in pts:
            along = p.x if axis == "x" else p.y
            horiz = abs((p.y if axis == "x" else p.x) - eave)
            uv.append(((along + (hw if axis == 'x' else hd)) / cover, math.hypot(horiz, p.z - z0) / cover))
        poly(pts, T_ROOF, ref, uv)
    roof_poly([e[0], e[1], ridge_r, ridge_l], "x", ys - hd)
    roof_poly([e[2], e[3], ridge_l, ridge_r], "x", ys + hd)
    roof_poly([e[1], e[2], ridge_r], "y", hw)
    roof_poly([e[3], e[0], ridge_l], "y", -hw)
    # fascia round the eaves and the underside of the overhang
    f = 0.22
    for a, b in ((e[0], e[1]), (e[1], e[2]), (e[2], e[3]), (e[3], e[0])):
        poly([a - V((0, 0, f)), b - V((0, 0, f)), b, a], T_TRIM, (0, ys, wall_h - 5))
    poly([e[0] - V((0, 0, f)), e[1] - V((0, 0, f)), e[2] - V((0, 0, f)), e[3] - V((0, 0, f))], T_DARK, (0, ys, wall_h + 5))


def pillar(x, y, z0, z1, s=0.4):
    box(x - s / 2, x + s / 2, y - s / 2, y + s / 2, z0, z1, T_TRIM)


door_info = {}
footprint = None

if kind == "bungalow":
    W, D, H, VER = 10.0, 8.0, 3.4, 2.3
    w = Walls(W, D)
    box(-W / 2 - 0.12, W / 2 + 0.12, -D / 2 - 0.12, D / 2 + 0.12, 0, 0.35, T_CONC)
    box(-W / 2, W / 2, -D / 2, D / 2, 0.35, H, T_WALL)
    box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - VER, -D / 2 + 0.0, 0, 0.3, T_CONC)          # veranda slab
    hip_roof(W, D, H, 0.7, 2.1)
    # veranda lean-to roof: one sloped sheet from the wall down to a fascia, on pillars
    zt, zb = H - 0.1, H - 0.55
    yv = -D / 2 - VER - 0.15
    ref = (0, -D / 2 - VER / 2, H - 1)
    poly([(-W / 2 - 0.35, -D / 2, zt), (W / 2 + 0.35, -D / 2, zt), (W / 2 + 0.35, yv, zb), (-W / 2 - 0.35, yv, zb)], T_ROOF, (0, -D / 2 - VER / 2, 0),
         [(0, 0), ((W + 0.7) / 11, 0), ((W + 0.7) / 11, (VER + 0.15) / 11), (0, (VER + 0.15) / 11)])
    poly([(-W / 2 - 0.35, -D / 2, zt - 0.05), (W / 2 + 0.35, -D / 2, zt - 0.05), (W / 2 + 0.35, yv, zb - 0.05), (-W / 2 - 0.35, yv, zb - 0.05)], T_DARK, (0, -D / 2 - VER / 2, 9))
    poly([(-W / 2 - 0.35, yv, zb), (W / 2 + 0.35, yv, zb), (W / 2 + 0.35, yv, zb - 0.28), (-W / 2 - 0.35, yv, zb - 0.28)], T_TRIM, (0, 0, zb - 0.1))
    for px in (-W / 2 + 0.4, -W / 6, W / 6, W / 2 - 0.4):
        pillar(px, -D / 2 - VER + 0.35, 0.3, zb - 0.28)
    w.door("front", 0, 1.4, 2.5)
    for t in (-3.3, 3.3):
        w.window("front", t, 1.95)
    for t in (-2.2, 2.2):
        w.window("left", t, 1.9); w.window("right", t, 1.9); w.window("back", t, 1.9)
    footprint = (W + 0.2, D + VER + 0.12, -(VER) / 2)           # width, depth, shift of the centre along y (to be removed)
    door_info = {"door": (0.0, -D / 2), "approach": -D / 2 - VER}
elif kind == "house2":
    W, D, H = 9.6, 7.6, 6.8
    w = Walls(W, D)
    box(-W / 2 - 0.12, W / 2 + 0.12, -D / 2 - 0.12, D / 2 + 0.12, 0, 0.35, T_CONC)
    box(-W / 2, W / 2, -D / 2, D / 2, 0.35, H, T_WALL)
    box(-W / 2 - 0.12, W / 2 + 0.12, -D / 2 - 0.12, D / 2 + 0.12, 3.3, 3.5, T_TRIM)    # floor band
    hip_roof(W, D, H, 0.7, 2.4)
    # porch with a balcony over it
    PD, PW = 1.8, 3.8
    box(-PW / 2, PW / 2, -D / 2 - PD, -D / 2, 0, 0.3, T_CONC)
    for sx in (-1, 1):
        pillar(sx * (PW / 2 - 0.25), -D / 2 - PD + 0.25, 0.3, 3.3)
    box(-PW / 2 - 0.1, PW / 2 + 0.1, -D / 2 - PD - 0.1, -D / 2, 3.3, 3.55, T_TRIM)
    if near:
        for sx in (-1, 1):
            box(sx * (PW / 2 + 0.05) - 0.04, sx * (PW / 2 + 0.05) + 0.04, -D / 2 - PD - 0.1, -D / 2, 3.55, 4.5, T_RAIL)
        box(-PW / 2 - 0.1, PW / 2 + 0.1, -D / 2 - PD - 0.14, -D / 2 - PD - 0.06, 3.55, 4.5, T_RAIL)
    w.door("front", 0, 1.4, 2.5)
    for t in (-3.1, 3.1):
        w.window("front", t, 1.9)
        w.window("front", t, 5.3)
    w.window("front", 0, 5.3, 1.3, 1.7)
    for t in (-2.0, 2.0):
        for z in (1.9, 5.3):
            w.window("left", t, z); w.window("right", t, z); w.window("back", t, z)
    footprint = (W + 0.24, D + PD + 0.12, -PD / 2)
    door_info = {"door": (0.0, -D / 2), "approach": -D / 2 - PD}
elif kind == "flats":
    W, D, FL = 11.0, 8.0, 3.4
    H = 3 * FL
    w = Walls(W, D)
    box(-W / 2 - 0.12, W / 2 + 0.12, -D / 2 - 0.12, D / 2 + 0.12, 0, 0.35, T_CONC)
    box(-W / 2, W / 2, -D / 2, D / 2, 0.35, H, T_WALL)
    # flat roof with a parapet
    box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.1, D / 2 + 0.1, H, H + 0.25, T_TRIM, top=T_FLAT)
    for (x0, x1, y0, y1) in ((-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.1, -D / 2 + 0.12), (-W / 2 - 0.1, W / 2 + 0.1, D / 2 - 0.12, D / 2 + 0.1),
                             (-W / 2 - 0.1, -W / 2 + 0.12, -D / 2 - 0.1, D / 2 + 0.1), (W / 2 - 0.12, W / 2 + 0.1, -D / 2 - 0.1, D / 2 + 0.1)):
        box(x0, x1, y0, y1, H + 0.25, H + 0.95, T_TRIM)
    # walkway balconies on the front at the first and second floor, a stair door at the middle on the ground floor
    for fl in (1, 2):
        z = fl * FL
        box(-W / 2, W / 2, -D / 2 - 1.5, -D / 2, z - 0.2, z + 0.05, T_CONC)
        if near:
            box(-W / 2, W / 2, -D / 2 - 1.5, -D / 2 - 1.42, z + 0.05, z + 1.05, T_RAIL)
            for sx in (-1, 1):
                box(sx * W / 2 - 0.04, sx * W / 2 + 0.04, -D / 2 - 1.5, -D / 2, z + 0.05, z + 1.05, T_RAIL)
        else:
            box(-W / 2, W / 2, -D / 2 - 1.5, -D / 2 - 1.42, z + 0.05, z + 1.05, T_RAIL)
    for fl in range(3):
        zc = fl * FL + 1.95
        for t in (-4.2, -1.9, 1.9, 4.2):
            w.window("front", t, zc, 1.4, 1.7)
        w.door("front", 0, 1.4, 2.5) if fl == 0 else None
        if fl:
            pass
    for fl in (1, 2):
        w.quad("front", -0.7, 0.7, fl * FL + 0.05, fl * FL + 2.55, 0.05, T_DOOR, (0, 0, 1))
    for fl in range(3):
        for t in (-2.6, 0.0, 2.6):
            w.window("left", t, fl * FL + 1.95, 1.4, 1.7); w.window("right", t, fl * FL + 1.95, 1.4, 1.7); w.window("back", t, fl * FL + 1.95, 1.4, 1.7)
    # water tank on the roof, on four legs
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx * 1.0 - 0.1, sx * 1.0 + 0.1, sy * 1.0 - 0.1 + 1.5, sy * 1.0 + 0.1 + 1.5, H + 0.25, H + 1.6, T_METAL)
    box(-1.3, 1.3, 0.2, 2.8, H + 1.6, H + 3.0, T_TANK)
    footprint = (W + 0.24, D + 0.24, 0.0)
    door_info = {"door": (0.0, -D / 2), "approach": -D / 2 - 1.0}
elif kind == "kiosk":
    W, D, H = 3.0, 2.6, 2.7
    footprint = (W + 0.4, D + 1.0, -0.5)
    box(-W / 2 - 0.1, W / 2 + 0.1, -D / 2 - 0.1, D / 2 + 0.1, 0, 0.15, T_CONC)
    box(-W / 2, W / 2, -D / 2, D / 2, 0.15, H, T_WOOD)
    # the serving opening on the front: dark inside, a counter slab, goods on it
    oz0, oz1 = 1.15, 2.15
    poly([(-W / 2 + 0.3, -D / 2 - 0.03, oz0), (W / 2 - 0.3, -D / 2 - 0.03, oz0), (W / 2 - 0.3, -D / 2 - 0.03, oz1), (-W / 2 + 0.3, -D / 2 - 0.03, oz1)], T_DARK, (0, 0, 1))
    box(-W / 2 - 0.05, W / 2 + 0.05, -D / 2 - 0.55, -D / 2, oz0 - 0.1, oz0, T_WOOD)
    for i, x in enumerate((-1.0, -0.35, 0.3, 0.95)):
        box(x - 0.25, x + 0.25, -D / 2 - 0.45, -D / 2 - 0.05, oz0, oz0 + 0.3 + 0.1 * (i % 2), T_GOODS)
    # shelf goods inside the opening
    box(-W / 2 + 0.35, W / 2 - 0.35, -D / 2 - 0.02, -D / 2 + 0.2, oz0 + 0.5, oz0 + 0.56, T_WOOD)
    # striped awning: a sloped sheet over the opening
    az0, az1 = 2.45, 2.0
    poly([(-W / 2 - 0.2, -D / 2, az0), (W / 2 + 0.2, -D / 2, az0), (W / 2 + 0.2, -D / 2 - 1.0, az1), (-W / 2 - 0.2, -D / 2 - 1.0, az1)], T_STRIPE, (0, -D / 2 - 0.5, 0),
         [(0, 0), (1, 0), (1, 1), (0, 1)])
    poly([(-W / 2 - 0.2, -D / 2, az0 - 0.04), (W / 2 + 0.2, -D / 2, az0 - 0.04), (W / 2 + 0.2, -D / 2 - 1.0, az1 - 0.04), (-W / 2 - 0.2, -D / 2 - 1.0, az1 - 0.04)], T_DARK, (0, -D / 2 - 0.5, 9))
    poly([(-W / 2 - 0.2, -D / 2 - 1.0, az1), (W / 2 + 0.2, -D / 2 - 1.0, az1), (W / 2 + 0.2, -D / 2 - 1.0, az1 - 0.25), (-W / 2 - 0.2, -D / 2 - 1.0, az1 - 0.25)], T_STRIPE, (0, 0, az1 - 0.1))
    # flat roof sheet and a sign board
    box(-W / 2 - 0.15, W / 2 + 0.15, -D / 2 - 0.1, D / 2 + 0.15, H, H + 0.12, T_METAL, top=T_ROOF)
    box(-W / 2 + 0.2, W / 2 - 0.2, -D / 2 - 0.12, -D / 2 - 0.04, 2.2, 2.45, T_SIGN)
    door_info = {"door": (0.0, -D / 2 - 0.55), "approach": -D / 2 - 1.2}
elif kind == "stall":
    footprint = (2.8, 2.8, 0.0)
    # a table with a plank top and four legs, crates of produce, two stools, a pole and a round umbrella of eight stripes
    box(-1.2, 1.2, -0.6, 0.6, 0.9, 1.0, T_WOOD)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx * 1.1 - 0.05, sx * 1.1 + 0.05, sy * 0.5 - 0.05, sy * 0.5 + 0.05, 0.0, 0.9, T_WOOD)
    for i, x in enumerate((-0.8, -0.1, 0.65)):
        box(x - 0.3, x + 0.3, -0.35, 0.3, 1.0, 1.0 + 0.28 + 0.06 * (i % 2), T_GOODS)
    for sx in (-1, 1):
        box(sx * 0.7 - 0.2, sx * 0.7 + 0.2, -1.5, -1.1, 0.0, 0.45, T_WOOD)
    box(-0.04, 0.04, 0.55, 0.63, 0.0, 2.7, T_METAL)
    cx, cy, cz, R, Hh = 0.0, 0.59, 2.7, 1.55, 0.6
    top = V((cx, cy, cz + Hh)); n = 8
    rim = [V((cx + R * math.cos(2 * math.pi * i / n), cy + R * math.sin(2 * math.pi * i / n), cz)) for i in range(n)]
    for i in range(n):
        a, b = rim[i], rim[(i + 1) % n]
        half = 0 if i % 2 == 0 else 1
        poly([a, b, top], T_UMB, (cx, cy, cz - 3), [(0.05 + 0.45 * half, 0), (0.45 + 0.45 * half, 0), (0.25 + 0.45 * half, 1)])
        poly([a, b, V((cx, cy, cz - 0.15))], T_UMB, (cx, cy, cz + 3), [(0.05 + 0.45 * half, 0), (0.45 + 0.45 * half, 0), (0.25 + 0.45 * half, 1)])
    door_info = {"door": (0.0, -0.9), "approach": -1.6}

# the origin: ground, centre of the footprint (the footprint the game reserves, not the roof overhang)
fw, fd, shift = footprint
for v in bm.verts:
    v.co.y -= shift
bm.normal_update()
mesh = bpy.data.meshes.new(kind)
bm.to_mesh(mesh)
tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
obj = bpy.data.objects.new(kind + "-" + variant, mesh)
bpy.context.collection.objects.link(obj)
mat = bpy.data.materials.new("atlas"); mat.use_nodes = True
nt = mat.node_tree
for n_ in list(nt.nodes):
    nt.nodes.remove(n_)
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = atlas_img; tex.interpolation = "Linear"
bs = nt.nodes.new("ShaderNodeBsdfPrincipled"); bs.inputs["Roughness"].default_value = 0.9; bs.inputs["Metallic"].default_value = 0.0
mo = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(tex.outputs["Color"], bs.inputs["Base Color"]); nt.links.new(bs.outputs[0], mo.inputs["Surface"])
mesh.materials.append(mat)
atlas_img.filepath_raw = atlas_path; atlas_img.source = "FILE"; atlas_img.reload()
bpy.ops.object.select_all(action="DESELECT"); obj.select_set(True); bpy.context.view_layer.objects.active = obj
name = "%s-%s%s" % (kind, variant, "" if near else "-far")
bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=70,
                          export_yup=True, export_apply=False, export_cameras=False, export_lights=False, export_animations=False)
pts = [v.co for v in mesh.vertices]
info = {"type": kind, "triangles": tris, "footprint": [round(fw, 2), round(fd, 2)],
        "door": {"x": round(door_info["door"][0], 2), "z": round(-(door_info["door"][1] - shift), 2), "facing": "+z (toward the street)", "approachZ": round(-(door_info["approach"] - shift), 2)},
        "size": [round(max(p.x for p in pts) - min(p.x for p in pts), 2), round(max(p.z for p in pts), 2), round(max(p.y for p in pts) - min(p.y for p in pts), 2)]}
json.dump(info, open(os.path.join(out_dir, kind + ".json"), "w"), indent=1)
print("SHELL", name, info)
