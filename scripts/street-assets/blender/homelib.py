"""Shared pieces for the home set: furniture, room shells and exterior detail pieces. One atlas for all of them (home-atlas.jpg), so a whole dressed room merges into one draw call.

Units: metres, where ONE FLOOR CELL OF THE GAME'S HOME GRID = 1.2 m (the home scene fits a room of ROOM = 10 scene units to its grid; a person is about 1.5 cells tall).
Furniture is drawn at the real size times FURN_K and must fit inside its footprint (cells x 1.2 m). Axes: Blender Z up, the piece's front faces -Y (glTF +z, toward the camera at rot 0),
origin on the floor at the centre of the footprint. Pieces are exported WITHOUT an image: the material is plain and named "home-atlas"; the game binds the shared atlas to it.
Tintable surfaces carry a vertex colour (COLOR_0, linear) multiplied with the white or fabric tile: change it to recolour the sofa, bedding, curtains or walls.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

V = Vector
CELL = 1.2
FURN_K = 1.15
SIZE = 1024
# name: (x, y, w, h) in atlas pixels, top-left origin
RECTS = {
    "white": (0, 0, 64, 64), "fabric": (64, 0, 64, 64), "dark": (128, 0, 64, 64), "black": (192, 0, 64, 64), "chrome": (256, 0, 64, 64), "glass": (320, 0, 64, 64),
    "wood_l": (384, 0, 64, 64), "wood_m": (448, 0, 64, 64), "wood_d": (512, 0, 64, 64), "steel": (576, 0, 64, 64), "gloss": (640, 0, 64, 64), "cream": (704, 0, 64, 64),
    "terracotta": (768, 0, 64, 64), "leaf": (832, 0, 64, 64), "soil": (896, 0, 64, 64), "lampglow": (960, 0, 64, 64),
    "red": (0, 64, 64, 64), "blue": (64, 64, 64, 64), "green": (128, 64, 64, 64), "yellow": (192, 64, 64, 64), "orange": (256, 64, 64, 64), "plastic": (320, 64, 64, 64),
    "plasticred": (384, 64, 64, 64), "leather": (448, 64, 64, 64), "mirror": (512, 64, 64, 64), "laptop": (576, 64, 64, 64), "plate": (640, 64, 64, 64), "food": (704, 64, 64, 64),
    "flame": (768, 64, 64, 64), "screen_off": (832, 64, 64, 64), "paper": (960, 64, 64, 64), "gold": (896, 64, 64, 64),
    "floor_ceramic": (0, 128, 256, 256), "floor_terrazzo": (256, 128, 256, 256), "floor_parquet": (512, 128, 256, 256), "floor_checker": (768, 128, 128, 128), "floor_mosaic": (896, 128, 128, 128),
    "rug1": (0, 384, 256, 256), "rug2": (256, 384, 256, 256), "rug3": (512, 384, 256, 256), "bed_a": (768, 384, 128, 128), "bed_b": (896, 384, 128, 128),
    "curtain": (0, 640, 128, 128), "tv": (128, 640, 256, 144), "art_lagoon": (384, 640, 128, 96), "art_adire": (512, 640, 128, 128), "art_portrait": (640, 640, 96, 128),
    "prayer": (768, 640, 96, 128), "slat": (896, 640, 128, 128), "plaster": (0, 768, 128, 128), "carpet": (128, 768, 128, 128), "sign": (256, 768, 128, 64),
}
# the wall colours and floor names the rooms offer
WALLS = {"cream": "#ecd8b2", "terracotta": "#d9a37e"} if False else {"cream": "#ecd8b2", "white": "#f6f3ea", "sage": "#bcd3bc", "sky": "#b9d3e8", "peach": "#f2c3a7"}
FLOORS = ["ceramic", "terrazzo", "parquet", "checker"]


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def _grid_noise(h, w, rng, scale, amp):
    small = rng.standard_normal((max(2, h // scale), max(2, w // scale)))
    big = np.kron(small, np.ones((scale, scale)))
    big = np.pad(big, ((0, max(0, h - big.shape[0])), (0, max(0, w - big.shape[1]))), mode='edge')
    return big[:h, :w] * amp


def solid(rgb, h, w, rng, amp=0.02, scale=8):
    n = (_grid_noise(h, w, rng, scale, amp) + _grid_noise(h, w, rng, 2, amp * 0.4))[:, :, None]
    return np.clip(np.array(rgb)[None, None, :] * (1 + n), 0, 1)


def load_crop(path, box, h, w):
    """box = (left, top, right, bottom) in picture pixels or None; returns h x w x 3 floats, top row first."""
    im = bpy.data.images.load(path)
    iw, ih = im.size
    a = np.empty(iw * ih * 4, dtype=np.float32); im.pixels.foreach_get(a)
    a = a.reshape(ih, iw, 4)[:, :, :3][::-1]
    if box:
        if all(isinstance(b, float) for b in box):
            box = (int(box[0] * iw), int(box[1] * ih), int(box[2] * iw), int(box[3] * ih))
        a = a[box[1]:box[3], box[0]:box[2]]
    tmp = bpy.data.images.new("t%d" % len(bpy.data.images), a.shape[1], a.shape[0], alpha=False)
    tmp.pixels.foreach_set(np.concatenate([a[::-1], np.ones(a.shape[:2] + (1,))], axis=2).astype(np.float32).reshape(-1)); tmp.scale(w, h)
    o = np.empty(w * h * 4, dtype=np.float32); tmp.pixels.foreach_get(o)
    return o.reshape(h, w, 4)[:, :, :3][::-1]


def make_atlas(tex_dir, path, quality=78):
    rng = np.random.default_rng(21)
    t = {}
    R = lambda n: (RECTS[n][3], RECTS[n][2])
    cols = {"white": (0.96, 0.96, 0.95), "dark": (0.12, 0.11, 0.11), "black": (0.04, 0.04, 0.045), "chrome": (0.76, 0.78, 0.8), "glass": (0.55, 0.72, 0.82), "wood_l": (0.72, 0.52, 0.32),
            "wood_m": (0.5, 0.31, 0.18), "wood_d": (0.27, 0.16, 0.1), "steel": (0.55, 0.57, 0.6), "gloss": (0.93, 0.94, 0.94), "cream": (0.93, 0.88, 0.76), "terracotta": (0.72, 0.38, 0.25),
            "leaf": (0.2, 0.5, 0.18), "soil": (0.25, 0.17, 0.1), "lampglow": (1.0, 0.9, 0.62), "red": (0.75, 0.12, 0.1), "blue": (0.15, 0.3, 0.68), "green": (0.12, 0.5, 0.25), "yellow": (0.95, 0.8, 0.12),
            "orange": (0.95, 0.5, 0.1), "plastic": (0.92, 0.9, 0.84), "plasticred": (0.8, 0.15, 0.15), "leather": (0.35, 0.2, 0.12), "mirror": (0.7, 0.8, 0.86), "laptop": (0.2, 0.28, 0.4),
            "plate": (0.97, 0.97, 0.95), "food": (0.85, 0.55, 0.15), "flame": (0.2, 0.4, 0.95), "screen_off": (0.05, 0.06, 0.08), "paper": (0.97, 0.95, 0.88), "gold": (0.85, 0.68, 0.2),
            "fabric": (0.96, 0.96, 0.96), "plaster": (0.97, 0.97, 0.96), "carpet": (0.55, 0.12, 0.15), "sign": (0.96, 0.94, 0.88)}
    for n, c in cols.items():
        t[n] = solid(c, *R(n), rng, 0.02 if n not in ("plaster",) else 0.01, 8 if n != "plaster" else 32)
    # a woven look for the fabric tile (tinted): fine crossing lines
    f = t["fabric"]
    f[::4] *= 0.985; f[:, ::4] *= 0.99
    leaf = t["leaf"]; leaf[:, 30:34] = (0.45, 0.7, 0.3)
    # wood grain lines
    for n in ("wood_l", "wood_m", "wood_d"):
        for i in range(0, 64, 9):
            t[n][i:i + 1] *= 0.8
    # appliance panel and mirror gradient
    mi = t["mirror"]; mi *= np.linspace(1.15, 0.8, 64)[:, None, None]
    # kitchen and bathroom floors drawn: chequered black and white, blue-white mosaic
    yy, xx = np.mgrid[0:128, 0:128]
    ck = np.where((((yy // 32) + (xx // 32)) % 2 == 0)[:, :, None], np.array((0.20, 0.17, 0.15)), np.array((0.90, 0.86, 0.78)))
    t["floor_checker"] = np.clip(ck * (1 + _grid_noise(128, 128, rng, 4, 0.02)[:, :, None]), 0, 1)
    mo = np.zeros((128, 128, 3)); mo[:] = (0.62, 0.76, 0.86)
    m2 = (((yy // 16) + (xx // 16)) % 2 == 0)
    mo[m2] = (0.9, 0.94, 0.96)
    mo[(yy % 16 == 0) | (xx % 16 == 0)] = (0.78, 0.82, 0.84)
    t["floor_mosaic"] = mo
    sl = np.zeros((128, 128, 3)); sl[:] = (0.16, 0.09, 0.05)
    for x in range(0, 128, 16):
        sl[:, x + 2:x + 14] = (np.array((0.36, 0.20, 0.11)) * (0.92 + 0.12 * rng.random()))[None, None, :] * (1 + 0.05 * np.sin(np.linspace(0, 12, 128)))[:, None, None]
    t["slat"] = sl
    P = lambda name: os.path.join(tex_dir, name)
    # ---- floors, drawn: low noise, large scale. One tile = one 1.2 m floor cell.
    fr = np.random.default_rng(5)
    cer = np.zeros((256, 256, 3))
    for ty in range(2):                                   # four 0.6 m ceramic tiles with grout and a faint bevel
        for tx in range(2):
            base = np.array((0.93, 0.89, 0.81)) * (1 + 0.025 * (fr.random() - 0.5) * 2)
            cer[ty * 128:(ty + 1) * 128, tx * 128:(tx + 1) * 128] = base
    yy, xx = np.mgrid[0:256, 0:256]
    edge = np.minimum(np.minimum(xx % 128, 127 - xx % 128), np.minimum(yy % 128, 127 - yy % 128))
    cer *= (1 - 0.06 * np.clip(1 - edge / 10.0, 0, 1))[:, :, None]
    cer[(edge < 2)] = (0.66, 0.62, 0.54)
    cer *= (1 + _grid_noise(256, 256, fr, 32, 0.012)[:, :, None])
    t["floor_ceramic"] = np.clip(cer, 0, 1)
    wood = np.zeros((256, 256, 3)); rows = 6
    for r_ in range(rows):
        y0, y1 = r_ * 256 // rows, (r_ + 1) * 256 // rows
        shade = 0.82 + 0.3 * fr.random()
        base = np.array((0.40, 0.23, 0.12)) * shade
        grain = 1 + _grid_noise(y1 - y0, 256, fr, 3, 0.05)[:, ::1] * 1.0
        grain = np.kron(np.ones((1, 1)), grain) if False else grain
        streak = 1 + 0.07 * np.sin(np.linspace(0, 6.28 * (2 + r_ % 3), 256) + r_)[None, :]
        wood[y0:y1] = (base[None, None, :] * (grain * streak)[:, :, None])
        wood[y0:y0 + 1] *= 0.55                           # seam between planks
        seam = int(fr.random() * 200) + 30
        wood[y0:y1, seam:seam + 1] *= 0.55                # a butt joint
    t["floor_parquet"] = np.clip(wood, 0, 1)
    ter = np.zeros((256, 256, 3)); ter[:] = (0.93, 0.90, 0.84)
    ter *= (1 + _grid_noise(256, 256, fr, 16, 0.01)[:, :, None])
    chip_cols = [(0.62, 0.60, 0.56), (0.80, 0.66, 0.52), (0.97, 0.96, 0.93), (0.70, 0.52, 0.40), (0.76, 0.76, 0.72)]
    for _ in range(75):                                   # larger chips, kept close to the ground colour
        cx, cy, rr = fr.integers(0, 256), fr.integers(0, 256), fr.integers(4, 9)
        col = np.array(chip_cols[fr.integers(len(chip_cols))]) * 0.45 + ter[0, 0] * 0.55
        for ox in (-256, 0, 256):
            for oy in (-256, 0, 256):
                m = ((xx - cx - ox) ** 2 / (rr * 1.3) ** 2 + (yy - cy - oy) ** 2 / (rr * 0.8) ** 2) < 1
                ter[m] = col
    t["floor_terrazzo"] = np.clip(ter, 0, 1)
    t["rug1"] = load_crop(P("t-rug-1.png"), None, 256, 256)
    t["rug2"] = load_crop(P("t-rug-2.png"), None, 256, 256)
    t["rug3"] = load_crop(P("t-rug-3.png"), (0.07, 0.06, 0.93, 0.93), 256, 256)
    t["bed_a"] = load_crop(P("t-bed-a.png"), None, 128, 128)
    t["bed_b"] = load_crop(P("t-bed-b.png"), None, 128, 128)
    t["curtain"] = load_crop(P("t-curtain.png"), None, 128, 128)
    t["tv"] = load_crop(P("t-tv.png"), (182, 84, 1198, 662), 144, 256)
    t["art_adire"] = load_crop(P("t-art-adire.png"), None, 128, 128)
    t["art_portrait"] = load_crop(P("t-art-portrait.png"), (0.1, 0.13, 0.9, 0.78), 128, 96)
    t["prayer"] = load_crop(P("t-prayer.png"), None, 128, 96)
    if os.path.exists(P("t-art-lagoon.png")):
        t["art_lagoon"] = load_crop(P("t-art-lagoon.png"), (0.22, 0.22, 0.79, 0.83), 96, 128)
    else:
        t["art_lagoon"] = solid((0.9, 0.55, 0.25), 96, 128, rng, 0.05, 8)
    atlas = np.ones((SIZE, SIZE, 4), dtype=np.float32)
    for n, arr in t.items():
        x, y, w, h = RECTS[n]
        atlas[y:y + h, x:x + w, :3] = arr
    img = bpy.data.images.new("home-atlas", SIZE, SIZE, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(atlas[::-1].reshape(-1))
    scn = bpy.context.scene
    scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = quality; scn.view_settings.view_transform = "Standard"
    img.save_render(path, scene=scn)


def uvpt(name, u, v):
    x, y, w, h = RECTS[name]
    e = 1.5
    px = x + e + u * (w - 2 * e)
    py = y + e + (1 - v) * (h - 2 * e)
    return (px / SIZE, 1 - py / SIZE)


class Builder:
    """Faces with atlas UVs and per-corner vertex colours; named groups become their own nodes; empties carry extras."""
    def __init__(self, near=True):
        self.near = near
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UV")
        self.col = self.bm.loops.layers.float_color.new("Col")
        self.groups = {}
        self.empties = []
        self.cur = None
        self.k = 1.0
        self.smooth = False

    def _paint(self, f, tile, tint, uvs):
        c = tint if tint is not None else (1, 1, 1)
        for loop, (u, v) in zip(f.loops, uvs):
            loop[self.uv].uv = uvpt(tile, u, v)
            loop[self.col] = (c[0], c[1], c[2], 1.0)
        if self.cur:
            self.groups.setdefault(self.cur, []).append(f)

    def poly(self, pts, tile, ref=None, uvs=None, tint=None):
        pts = [V(p) for p in pts]
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        centre = sum(pts, V()) / len(pts)
        if uvs is None:
            uvs = [(0, 0), (1, 0), (1, 1), (0, 1)] if len(pts) == 4 else [(0, 0), (1, 0), (0.5, 1)] if len(pts) == 3 else [(0.5 + 0.5 * math.cos(i / len(pts) * 6.2832), 0.5 + 0.5 * math.sin(i / len(pts) * 6.2832)) for i in range(len(pts))]
        if ref is not None and n.dot(centre - V(ref)) < 0:
            pts = pts[::-1]; uvs = uvs[::-1]
        try:
            f = self.bm.faces.new([self.bm.verts.new(p) for p in pts])
        except ValueError:
            return None
        self._paint(f, tile, tint, uvs)
        return f

    def box(self, x0, x1, y0, y1, z0, z1, tile="white", tint=None, top=None, front=None, back=None, sides=None, bottom=False, tops_tint=None):
        """Axis-aligned box. Faces default to `tile`; top/front/back/sides override the tile."""
        ref = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        top = top or tile; front = front or tile; back = back or tile; sides = sides or tile
        self.poly([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], top, ref, tint=tops_tint if tops_tint is not None else tint)
        if bottom:
            self.poly([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], tile, ref, tint=tint)
        self.poly([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], front, ref, tint=tint)
        self.poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], back, ref, tint=tint)
        self.poly([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], sides, ref, tint=tint)
        self.poly([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], sides, ref, tint=tint)

    def rbox(self, x0, x1, y0, y1, z0, z1, r=0.05, tile="fabric", tint=None, seg=2, rot=None, squash=None):
        """A soft box: all twelve edges bevelled by r. UVs by box projection onto `tile`."""
        r = min(r, (x1 - x0) / 2.01, (y1 - y0) / 2.01, (z1 - z0) / 2.01)
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=1.0)
        for v in tmp.verts:
            v.co = V((v.co.x * (x1 - x0), v.co.y * (y1 - y0), v.co.z * (z1 - z0)))
        if r > 0.002:
            bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=r, segments=seg if self.near else 2, affect="EDGES", profile=0.7)
        cen = V(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        if rot is not None:
            from mathutils import Euler
            m = Euler(rot, "XYZ").to_matrix()
            for v in tmp.verts:
                v.co = m @ v.co
        for v in tmp.verts:
            v.co = v.co + cen
        self.smooth = True
        c = tint if tint is not None else (1, 1, 1)
        mp = {}
        for v in tmp.verts:
            mp[v] = self.bm.verts.new(v.co)
        for f in tmp.faces:
            nf = self.bm.faces.new([mp[v] for v in f.verts])
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            uvs = []
            for v in f.verts:
                a, b = [(1, 2), (0, 2), (0, 1)][ax]
                lo = (x0, y0, z0); hi = (x1, y1, z1)
                uvs.append((min(1.0, max(0.0, (v.co[a] - lo[a]) / max(hi[a] - lo[a], 1e-6))) if rot is None else 0.5, min(1.0, max(0.0, (v.co[b] - lo[b]) / max(hi[b] - lo[b], 1e-6))) if rot is None else 0.5))
            self._paint(nf, tile, tint, uvs)
        tmp.free()

    def cyl(self, cx, cy, z0, z1, r, seg=12, tile="white", tint=None, rtop=None, cap=True, captile=None):
        rtop = r if rtop is None else rtop
        seg = seg if self.near else max(6, seg // 2)
        ring = lambda z, rr: [V((cx + rr * math.cos(2 * math.pi * i / seg), cy + rr * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        a, b = ring(z0, r), ring(z1, rtop)
        ref = (cx, cy, (z0 + z1) / 2)
        for i in range(seg):
            j = (i + 1) % seg
            self.poly([a[i], a[j], b[j], b[i]], tile, ref, [(i / seg, 0), ((i + 1) / seg, 0), ((i + 1) / seg, 1), (i / seg, 1)], tint=tint)
        if cap:
            self.poly(b, captile or tile, (cx, cy, z0), tint=tint)
            if r > 0.001:
                self.poly(a, captile or tile, (cx, cy, z1), tint=tint)

    def empty(self, name, loc, **extra):
        self.empties.append((name, V(loc), extra))


def finish(B, name, out_dir, textured=False, atlas_path=None, centre=(0.0, 0.0)):
    """Export: the body (and one node per named group), the empties, plain glTF; a material called home-atlas without an image."""
    bm = B.bm
    k = B.k
    for v in bm.verts:
        v.co = V((v.co.x - centre[0], v.co.y - centre[1], v.co.z)) * k
    bm.normal_update()
    bm.faces.index_update(); bm.faces.ensure_lookup_table()
    idx_group = {}
    for g, fs in B.groups.items():
        for f in fs:
            if f.is_valid:
                idx_group[f.index] = g
    objs = []

    def make(label, keep):
        b2 = bm.copy(); b2.faces.ensure_lookup_table()
        kill = [f for f in b2.faces if idx_group.get(f.index) != keep]
        bmesh.ops.delete(b2, geom=kill, context="FACES")
        bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context="VERTS")
        if not b2.faces:
            b2.free(); return None
        me = bpy.data.meshes.new(label); b2.to_mesh(me); b2.free()
        if B.smooth:
            me.shade_smooth()
        ob = bpy.data.objects.new(label, me); bpy.context.collection.objects.link(ob)
        return ob
    main = make(name, None)
    if main:
        objs.append(main)
    for g in B.groups:
        o = make(g, g)
        if o:
            objs.append(o)
    mat = bpy.data.materials.new("home-atlas"); mat.use_nodes = True
    nt = mat.node_tree
    for n_ in list(nt.nodes):
        nt.nodes.remove(n_)
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled"); bs.inputs["Roughness"].default_value = 0.85; bs.inputs["Metallic"].default_value = 0.0
    mo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(bs.outputs[0], mo.inputs["Surface"])
    for o in objs:
        o.data.materials.append(mat)
        ca = o.data.color_attributes
        if len(ca):
            ca.active_color = ca[0]; ca.render_color_index = 0
    if os.environ.get('HOMEDBG'):
        print('ATTRS', [(a.name, a.domain) for a in objs[0].data.attributes if not a.name.startswith('.')], [c.name for c in objs[0].data.color_attributes])
    for en, loc, ex in B.empties:
        e = bpy.data.objects.new(en, None)
        e.empty_display_type = "PLAIN_AXES"
        e.location = (V((loc.x - centre[0], loc.y - centre[1], loc.z)) * k)
        for kx, vx in ex.items():
            e[kx] = vx
        bpy.context.collection.objects.link(e)
        objs.append(e)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="NONE", export_yup=True,
                              export_apply=False, export_cameras=False, export_lights=False, export_animations=False, export_extras=True, export_vertex_color="ACTIVE", export_all_vertex_colors=False)
    tris = sum(len(o.data.polygons) for o in objs if o.type == "MESH")
    allp = [v.co for o in objs if o.type == "MESH" for v in o.data.vertices]
    ext = (max(p.x for p in allp) - min(p.x for p in allp), max(p.y for p in allp) - min(p.y for p in allp), max(p.z for p in allp))
    return tris, ext
