"""Shared pieces of the street set: the texture atlas (one layout for every building and prop), the palettes, and the geometry helpers.

Every building and prop of the set uses ONE atlas layout; three palettes (A cream / B mint / C sky) change only the wall, awning and umbrella colours. All
assets that use the same palette and level of detail therefore carry an identical atlas image, so the game can share one texture and one material and draw
many different buildings and props in one call (a batched mesh).
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

V = Vector
SIZE = 1024
# name: (left, top, width, height) in atlas pixels, top-left origin
RECTS = {
    "window": (0, 0, 256, 256), "church": (256, 0, 128, 256), "mosque": (384, 0, 128, 256), "door": (512, 0, 128, 256), "shutter": (640, 0, 256, 256), "sign": (896, 0, 128, 64),
    "wall": (0, 256, 256, 256), "roof": (256, 256, 256, 256), "conc": (512, 256, 128, 128), "trim": (640, 256, 64, 64), "dark": (704, 256, 64, 64), "rail": (768, 256, 128, 128),
    "metal": (896, 256, 64, 64), "flat": (960, 256, 64, 64), "stripe": (512, 384, 128, 128), "block": (640, 384, 128, 128), "gold": (768, 384, 128, 128), "glass": (896, 384, 128, 128),
    "wood": (0, 512, 128, 128), "goods": (128, 512, 128, 128), "umb": (256, 512, 128, 128), "tyre": (384, 512, 64, 64), "grass": (448, 512, 128, 128), "leaf": (576, 512, 128, 128),
    "bark": (704, 512, 64, 64), "bin": (768, 512, 64, 64), "tank": (832, 512, 64, 64), "red": (896, 512, 64, 64), "white": (960, 512, 64, 64),
    "amber": (0, 640, 64, 64), "green": (64, 640, 64, 64), "yellow": (128, 640, 64, 64), "plastic": (192, 640, 64, 64), "fruit": (256, 640, 128, 128), "hedge": (384, 640, 128, 128),
    "bluepaint": (512, 640, 64, 64), "redwhite": (576, 640, 128, 64), "billboard": (704, 640, 128, 128), "asphalt": (832, 640, 64, 64),
}
PALETTES = {
    "cream": {"wall": (0.93, 0.85, 0.66), "awning": (0.10, 0.52, 0.55), "umbrella": (0.82, 0.16, 0.12)},
    "mint": {"wall": (0.70, 0.86, 0.74), "awning": (0.78, 0.15, 0.13), "umbrella": (0.12, 0.45, 0.80)},
    "sky": {"wall": (0.68, 0.80, 0.93), "awning": (0.15, 0.30, 0.72), "umbrella": (0.18, 0.62, 0.30)},
}
# palette name used by the kiosk and stall colour variants
ALIAS = {"teal": "cream", "red": "mint", "blue": "sky"}


def noise(shape, scale, amp, rng):
    small = rng.standard_normal((max(2, shape[0] // scale), max(2, shape[1] // scale)))
    return np.kron(small, np.ones((scale, scale)))[:shape[0], :shape[1]] * amp


def base(rgb, h, w, amp, scale, rng):
    n = (noise((h, w), scale, amp, rng) + noise((h, w), 2, amp * 0.4, rng))[:, :, None]
    return np.clip(np.array(rgb)[None, None, :] * (1 + n), 0, 1)


def load_png(path, h, w):
    im = bpy.data.images.load(path)
    iw, ih = im.size
    a = np.empty(iw * ih * 4, dtype=np.float32); im.pixels.foreach_get(a)
    rgba = np.concatenate([a.reshape(ih, iw, 4)[:, :, :3], np.ones((ih, iw, 1), dtype=np.float32)], axis=2)
    tmp = bpy.data.images.new("t%d" % len(bpy.data.images), iw, ih, alpha=False)
    tmp.pixels.foreach_set(rgba.reshape(-1)); tmp.scale(w, h)
    out = np.empty(w * h * 4, dtype=np.float32); tmp.pixels.foreach_get(out)
    return out.reshape(h, w, 4)[:, :, :3][::-1]          # Blender stores rows bottom first: flip to top first


def paint_tiles(palette, tex_dir):
    """All atlas tiles as float RGB arrays, top-left origin, keyed by RECTS name. The same seed every time, so equal palettes give identical pixels."""
    pal = PALETTES[palette]
    rng = np.random.default_rng(11)
    t = {}
    r = lambda n: (RECTS[n][3], RECTS[n][2])
    t["wall"] = base(pal["wall"], *r("wall"), 0.012, 64, rng)
    roof = base((0.62, 0.27, 0.16), *r("roof"), 0.02, 32, rng)
    u = np.linspace(0, 1, 256)[None, :, None]
    t["roof"] = np.clip(roof * (0.80 + 0.20 * np.cos(2 * np.pi * u * 24)) * (1 - 0.05 * (np.mod(np.linspace(0, 1, 256) * 5, 1) > 0.94)[:, None, None]), 0, 1)
    for n in ("window", "door", "shutter", "church", "mosque"):
        t[n] = load_png(os.path.join(tex_dir, n + ".png"), RECTS[n][3], RECTS[n][2])
    t["sign"] = base((0.96, 0.94, 0.88), *r("sign"), 0.01, 16, rng)
    t["conc"] = base((0.74, 0.72, 0.66), *r("conc"), 0.04, 16, rng)
    t["trim"] = base((0.95, 0.92, 0.84), *r("trim"), 0.015, 16, rng)
    t["dark"] = base((0.10, 0.09, 0.09), *r("dark"), 0.02, 16, rng)
    rail = np.full(r("rail") + (3,), 0.93)
    for i in range(10):
        c = int((i + 0.5) / 10 * 128); rail[:, c - 4:c + 4] = (0.18, 0.2, 0.22)
    rail[:14] = (0.2, 0.22, 0.25); rail[-14:] = (0.2, 0.22, 0.25)
    t["rail"] = rail
    t["metal"] = base((0.45, 0.47, 0.5), *r("metal"), 0.03, 8, rng)
    t["flat"] = base((0.55, 0.55, 0.52), *r("flat"), 0.05, 8, rng)
    st = np.ones(r("stripe") + (3,)) * 0.96
    for i in range(0, 8, 2):
        st[:, i * 16:(i + 1) * 16] = pal["awning"]
    t["stripe"] = st
    blk = base((0.62, 0.62, 0.6), *r("block"), 0.03, 8, rng)           # cement blockwork: courses of blocks with dark joints
    for k in range(1, 4):
        blk[k * 32 - 1:k * 32 + 1] = 0.25
    for k in range(4):
        off = 0 if k % 2 == 0 else 32
        for x in range(off, 128, 64):
            blk[k * 32:(k + 1) * 32, x:x + 2] = 0.25
    t["block"] = blk
    gold = base((0.85, 0.68, 0.2), *r("gold"), 0.03, 16, rng)
    t["gold"] = gold
    g = np.zeros(r("glass") + (3,)); g[:] = (0.35, 0.55, 0.70)
    g[:, 62:66] = (0.9, 0.9, 0.9); g[62:66] = (0.9, 0.9, 0.9)
    t["glass"] = g
    wood = base((0.52, 0.34, 0.20), *r("wood"), 0.03, 16, rng)
    for i in range(1, 6):
        wood[int(i / 6 * 128) - 1:int(i / 6 * 128) + 1] *= 0.6
    t["wood"] = wood
    cols = [(0.85, 0.15, 0.1), (0.95, 0.65, 0.1), (0.3, 0.65, 0.2), (0.95, 0.9, 0.8), (0.9, 0.35, 0.1), (0.55, 0.12, 0.25)]
    goods = np.full(r("goods") + (3,), 0.12)
    for gy in range(0, 128, 16):
        for gx in range(0, 128, 16):
            c = np.array(cols[int(rng.integers(len(cols)))]) * (0.85 + 0.3 * rng.random())
            yy, xx = np.mgrid[0:16, 0:16]
            m = ((yy - 8) ** 2 + (xx - 8) ** 2) < 7 ** 2
            goods[gy:gy + 16, gx:gx + 16][m] = np.clip(c * (1.15 - 0.4 * ((yy - 8) / 16)[m, None]), 0, 1)
    t["goods"] = goods
    um = np.ones(r("umb") + (3,)) * 0.96
    um[:, 64:] = pal["umbrella"]
    t["umb"] = um
    t["tyre"] = base((0.09, 0.09, 0.1), *r("tyre"), 0.02, 8, rng)
    gr = base((0.34, 0.55, 0.25), *r("grass"), 0.10, 4, rng)
    t["grass"] = gr
    lf = base((0.25, 0.55, 0.18), *r("leaf"), 0.08, 4, rng)
    lf[:, 62:66] = (0.55, 0.75, 0.3)
    t["leaf"] = lf
    t["bark"] = base((0.42, 0.31, 0.2), *r("bark"), 0.05, 4, rng)
    t["bin"] = base((0.15, 0.45, 0.25), *r("bin"), 0.02, 8, rng)
    t["tank"] = base((0.12, 0.28, 0.55), *r("tank"), 0.02, 8, rng)
    t["red"] = base((0.75, 0.12, 0.10), *r("red"), 0.02, 8, rng)
    t["white"] = base((0.95, 0.95, 0.93), *r("white"), 0.01, 8, rng)
    t["amber"] = base((0.95, 0.65, 0.1), *r("amber"), 0.01, 8, rng)
    t["green"] = base((0.1, 0.75, 0.25), *r("green"), 0.01, 8, rng)
    t["yellow"] = base((0.95, 0.8, 0.12), *r("yellow"), 0.01, 8, rng)
    t["plastic"] = base((0.2, 0.35, 0.8), *r("plastic"), 0.02, 8, rng)
    fr = np.full(r("fruit") + (3,), 0.1)
    for gy in range(0, 128, 16):
        for gx in range(0, 128, 16):
            c = np.array(((0.95, 0.85, 0.2), (0.4, 0.7, 0.2), (0.95, 0.55, 0.1))[int(rng.integers(3))]) * (0.85 + 0.3 * rng.random())
            yy, xx = np.mgrid[0:16, 0:16]
            m = ((yy - 8) ** 2 + (xx - 8) ** 2) < 7 ** 2
            fr[gy:gy + 16, gx:gx + 16][m] = np.clip(c, 0, 1)
    t["fruit"] = fr
    t["hedge"] = base((0.2, 0.45, 0.15), *r("hedge"), 0.14, 4, rng)
    t["bluepaint"] = base((0.15, 0.30, 0.65), *r("bluepaint"), 0.01, 8, rng)
    rw = np.ones(r("redwhite") + (3,)) * 0.96
    for i in range(0, 8, 2):
        rw[:, i * 16:(i + 1) * 16] = (0.78, 0.12, 0.1)
    t["redwhite"] = rw
    t["billboard"] = base((0.97, 0.97, 0.95), *r("billboard"), 0.005, 16, rng)
    t["asphalt"] = base((0.30, 0.30, 0.32), *r("asphalt"), 0.04, 8, rng)
    return t


def make_atlas(palette, tex_dir, path, size):
    tiles = paint_tiles(palette, tex_dir)
    atlas = np.ones((SIZE, SIZE, 4), dtype=np.float32)
    for n, arr in tiles.items():
        x, y, w, h = RECTS[n]
        atlas[y:y + h, x:x + w, :3] = arr
    img = bpy.data.images.new("atlas-" + palette, SIZE, SIZE, alpha=False)
    img.colorspace_settings.name = "sRGB"                     # before the pixels: changing it afterwards clears a generated image
    img.pixels.foreach_set(atlas[::-1].reshape(-1))
    if size != SIZE:
        img.scale(size, size)
    scn = bpy.context.scene
    scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 72; scn.view_settings.view_transform = "Standard"
    img.save_render(path, scene=scn)


def uvpt(name, u, v):
    """Point u, v (0..1, v up) inside the named atlas rectangle, in atlas UV space."""
    x, y, w, h = RECTS[name]
    e = 2.5
    px = x + e + u * (w - 2 * e)
    py = y + e + (1 - v) * (h - 2 * e)
    return (px / SIZE, 1 - py / SIZE)


class Builder:
    def __init__(self, near=True):
        self.near = near
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UV")
        self.groups = {}      # group name -> list of face indices: a group becomes its own node (signs, wheels)
        self.empties = []     # (name, location, extras)
        self.cur = None

    def poly(self, pts, tile, ref, uvs=None):
        pts = [V(p) for p in pts]
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        centre = sum(pts, V()) / len(pts)
        uvs = uvs or ([(0, 0), (1, 0), (1, 1), (0, 1)] if len(pts) == 4 else [(0, 0), (1, 0), (0.5, 1)] if len(pts) == 3 else [(math.cos(i / len(pts) * 6.2832) * 0.5 + 0.5, math.sin(i / len(pts) * 6.2832) * 0.5 + 0.5) for i in range(len(pts))])
        if ref is not None and n.dot(centre - V(ref)) < 0:
            pts = pts[::-1]; uvs = uvs[::-1]
        f = self.bm.faces.new([self.bm.verts.new(p) for p in pts])
        for loop, (u, v) in zip(f.loops, uvs):
            loop[self.uv].uv = uvpt(tile, u, v)
        if self.cur:
            self.groups.setdefault(self.cur, []).append(f)
        return f

    def box(self, x0, x1, y0, y1, z0, z1, side="wall", top=None, bottom=None, front=None, back=None):
        ref = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        top = side if top is None else top
        front = side if front is None else front
        back = side if back is None else back
        self.poly([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], top, ref)
        if bottom is not None:
            self.poly([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], bottom, ref)
        self.poly([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], front, ref)
        self.poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], back, ref)
        self.poly([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], side, ref)
        self.poly([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], side, ref)

    def cyl(self, cx, cy, z0, z1, r, seg, side="metal", cap="metal", rtop=None):
        rtop = r if rtop is None else rtop
        ring = lambda z, rr: [V((cx + rr * math.cos(2 * math.pi * i / seg), cy + rr * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        a, b = ring(z0, r), ring(z1, rtop)
        ref = (cx, cy, (z0 + z1) / 2)
        for i in range(seg):
            j = (i + 1) % seg
            self.poly([a[i], a[j], b[j], b[i]], side, ref, [(i / seg, 0), ((i + 1) / seg, 0), ((i + 1) / seg, 1), (i / seg, 1)])
        if cap:
            self.poly(b, cap, (cx, cy, z0), None)
            self.poly(a, cap, (cx, cy, z1), None)

    def empty(self, name, loc, **extras):
        self.empties.append((name, V(loc), extras))


class Walls:
    """Points on the four walls of a rectangle (W along x, D along y), seen from outside: side, t along the wall (to the viewer's right), z, offset out of the wall."""
    def __init__(self, B, W, D):
        self.B, self.W, self.D = B, W, D
        self.defs = {"front": (V((0, -D / 2, 0)), V((1, 0, 0)), V((0, -1, 0))), "right": (V((W / 2, 0, 0)), V((0, 1, 0)), V((1, 0, 0))),
                     "back": (V((0, D / 2, 0)), V((-1, 0, 0)), V((0, 1, 0))), "left": (V((-W / 2, 0, 0)), V((0, -1, 0)), V((-1, 0, 0)))}

    def p(self, side, t, z, off=0.0, y0=0.0):
        base_, right, n = self.defs[side]
        return base_ + right * t + n * off + V((0, 0, z))

    def quad(self, side, t0, t1, z0, z1, off, tile, ref=(0, 0, 1), uvs=None):
        return self.B.poly([self.p(side, t0, z0, off), self.p(side, t1, z0, off), self.p(side, t1, z1, off), self.p(side, t0, z1, off)], tile, ref, uvs)

    def window(self, side, t, zc, w=1.6, h=1.8, tile="window"):
        self.quad(side, t - w / 2, t + w / 2, zc - h / 2, zc + h / 2, 0.04, tile)
        if self.B.near and tile == "window":
            s = self.defs[side]
            c = s[0] + s[1] * t + s[2] * 0.12
            ax = abs(s[1].x) > 0.5
            hw, hd = (w / 2 + 0.12, 0.12) if ax else (0.12, w / 2 + 0.12)
            self.B.box(c.x - hw, c.x + hw, c.y - hd, c.y + hd, zc - h / 2 - 0.12, zc - h / 2, "trim")

    def door(self, side, t, w=1.4, h=2.5, z=0.0):
        self.quad(side, t - w / 2, t + w / 2, z, z + h, 0.05, "door")


def hip_roof(B, W, D, wall_h, over, rise, ys=0.0, yc=0.0):
    hw, hd = W / 2 + over, D / 2 + over
    r = max(0.0, (W - D) / 2)
    ref = (0, ys + yc, wall_h + rise / 2)
    z0, z1 = wall_h, wall_h + rise
    cover = 13.0
    ridge_l, ridge_r = V((-r, ys + yc, z1)), V((r, ys + yc, z1))
    e = [V((-hw, ys + yc - hd, z0)), V((hw, ys + yc - hd, z0)), V((hw, ys + yc + hd, z0)), V((-hw, ys + yc + hd, z0))]

    def roof_poly(pts, axis, eave):
        uv = []
        for p in pts:
            along = p.x if axis == "x" else p.y - yc
            horiz = abs((p.y if axis == "x" else p.x) - eave)
            uv.append(((along + (hw if axis == "x" else hd)) / cover, math.hypot(horiz, p.z - z0) / cover))
        B.poly(pts, "roof", ref, uv)
    roof_poly([e[0], e[1], ridge_r, ridge_l], "x", ys + yc - hd)
    roof_poly([e[2], e[3], ridge_l, ridge_r], "x", ys + yc + hd)
    roof_poly([e[1], e[2], ridge_r], "y", hw)
    roof_poly([e[3], e[0], ridge_l], "y", -hw)
    f = 0.22
    for a, b in ((e[0], e[1]), (e[1], e[2]), (e[2], e[3]), (e[3], e[0])):
        B.poly([a - V((0, 0, f)), b - V((0, 0, f)), b, a], "trim", (0, ys + yc, wall_h - 5))
    B.poly([p - V((0, 0, f)) for p in e], "dark", (0, ys + yc, wall_h + 5))


def pillar(B, x, y, z0, z1, s=0.4, tile="trim"):
    B.box(x - s / 2, x + s / 2, y - s / 2, y + s / 2, z0, z1, tile)


def gable_roof(B, W, D, wall_h, over, rise, yc=0.0, tile="roof"):
    """Ridge along y (the depth): two slopes facing left and right, gable ends front and back."""
    hw, hd = W / 2 + over, D / 2 + over
    z0, z1 = wall_h, wall_h + rise
    cover = max(13.0, D + 2 * over + 1.0)
    ref = (0, yc, wall_h + rise / 2)
    a = [V((-hw, yc - hd, z0)), V((-hw, yc + hd, z0)), V((0, yc + hd, z1)), V((0, yc - hd, z1))]
    b = [V((hw, yc - hd, z0)), V((hw, yc + hd, z0)), V((0, yc + hd, z1)), V((0, yc - hd, z1))]
    sl = math.hypot(hw, rise)
    for pts in (a, b):
        B.poly(pts, tile, ref, [((p.y - yc + hd) / cover, math.hypot(abs(p.x) - hw, p.z - z0) / cover) for p in pts])
    # gable triangles (wall coloured)
    for y, s in ((yc - D / 2, -1), (yc + D / 2, 1)):
        B.poly([V((-W / 2, y, wall_h)), V((W / 2, y, wall_h)), V((0, y, wall_h + rise * (W / 2) / hw))], "wall", (0, y - s, wall_h))
    f = 0.2
    for p, q in ((a[0], a[3]), (b[0], b[3]), (a[0], a[1]), (a[1], a[2])):
        pass
    B.poly([a[0] - V((0, 0, f)), a[1] - V((0, 0, f)), a[1], a[0]], "trim", (0, yc, wall_h - 5))
    B.poly([b[0] - V((0, 0, f)), b[1] - V((0, 0, f)), b[1], b[0]], "trim", (0, yc, wall_h - 5))
    B.poly([a[0] - V((0, 0, f)), b[0] - V((0, 0, f)), b[1] - V((0, 0, f)), a[1] - V((0, 0, f))], "dark", (0, yc, wall_h + 5))


def finish(B, kind, name, out_dir, atlas_path, shift_y, footprint, info, extra_sidecar=None):
    """Bake the builder into a mesh (one object for the body and one per named group), add the empties, export plain glTF."""
    import json
    bm = B.bm
    for v in bm.verts:
        v.co.y -= shift_y
    bm.normal_update()
    # groups become their own objects: separate faces by group (signs, wheels): copy the bmesh once per group and delete the rest
    objs = []
    bm.faces.index_update(); bm.faces.ensure_lookup_table()
    group_faces = {g: set(f.index for f in fs) for g, fs in B.groups.items() if fs}
    idx_group = {}
    for g, fs in group_faces.items():
        for i in fs:
            idx_group[i] = g

    def make(label, keep_group, pivot=None):
        b2 = bm.copy(); b2.faces.ensure_lookup_table()
        kill = [f for f in b2.faces if idx_group.get(f.index) != keep_group]
        bmesh.ops.delete(b2, geom=kill, context="FACES")
        bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context="VERTS")
        if pivot is not None:
            for v in b2.verts:
                v.co -= pivot
        me = bpy.data.meshes.new(label)
        b2.to_mesh(me); b2.free()
        ob = bpy.data.objects.new(label, me)
        bpy.context.collection.objects.link(ob)
        if pivot is not None:
            ob.location = pivot
        return ob
    main = make(name, None)
    objs.append(main)
    for g in group_faces:
        pivot = None
        for en, loc, ex in B.empties:
            if en == "pivot_" + g:
                pivot = loc - V((0, shift_y, 0)) if False else loc
        objs.append(make(g, g, pivot))
    img = bpy.data.images.load(atlas_path)
    img.colorspace_settings.name = "sRGB"
    mat = bpy.data.materials.new("atlas"); mat.use_nodes = True
    nt = mat.node_tree
    for n_ in list(nt.nodes):
        nt.nodes.remove(n_)
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled"); bs.inputs["Roughness"].default_value = 0.9; bs.inputs["Metallic"].default_value = 0.0
    mo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], bs.inputs["Base Color"]); nt.links.new(bs.outputs[0], mo.inputs["Surface"])
    for o in objs:
        o.data.materials.append(mat)
    for en, loc, ex in B.empties:
        if en.startswith("pivot_"):
            continue
        e = bpy.data.objects.new(en, None)
        e.empty_display_type = "PLAIN_AXES"
        e.location = loc - V((0, shift_y, 0))
        for k, v in ex.items():
            e[k] = v
        bpy.context.collection.objects.link(e)
        objs.append(e)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=72,
                              export_yup=True, export_apply=False, export_cameras=False, export_lights=False, export_animations=False, export_extras=True)
    tris = sum(len(o.data.polygons) for o in objs if o.type == "MESH")
    return tris
