"""Stage 4: hair built on the finished head, written as a part .glb on the animation skeleton.

  blender --background --disable-autoexec --python build_hair.py -- <body.blend> <braids|afro> <out.glb> [<preview-prefix>]

braids: a close scalp shell plus plaited strands rooted over the scalp (a centre parting, rows across the crown) that fall
under gravity and slide off the head and shoulders (they are kept clear of the body surface). afro: a soft, lumpy shell of
coils around the head with an open face. Skin weights come from the nearest body vertex, so the hair follows the head and neck.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bmesh
import bpy
import common
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

src, style, out = common.args()[:3]
prefix = common.args()[3] if len(common.args()) > 3 else None
bpy.ops.wm.open_mainfile(filepath=src)
body = bpy.data.objects["Body"]
rig = body.parent
me = body.data
rnd = random.Random(11)

eyes = bpy.data.objects["Body.high-poly"]
ec = sum((v.co for v in eyes.data.vertices), Vector()) / len(eyes.data.vertices)          # between the eyes
ear_z = ec.z - 0.02
head_vs = [v for v in me.vertices if v.co.z > ec.z - 0.14 and v.co.z < ec.z + 0.2 and abs(v.co.x) < 0.1]
centre = Vector((0.0, sum(v.co.y for v in head_vs) / len(head_vs), ec.z - 0.01))
top_z = max(v.co.z for v in me.vertices)
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
tree = kdtree.KDTree(len(me.vertices))
for v in me.vertices:
    tree.insert(v.co, v.index)
tree.balance()
BONES = ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
         "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r", "thigh_l", "calf_l", "foot_l", "ball_l", "thigh_r", "calf_r", "foot_r", "ball_r"]
gnames = {g.index: g.name for g in body.vertex_groups}


def hairline_z(az):
    """Height of the hairline at azimuth az (0 front, +-pi back): high forehead in front, at the ear on the sides, nape at the back."""
    f = max(0.0, math.cos(az))
    return (ec.z + 0.085) * f + (ec.z - 0.015) * (1 - f) if abs(az) < math.pi / 2 else ec.z - 0.045


def az_of(p):
    d = p - centre
    return math.atan2(d.x, -d.y)   # 0 = facing front (-y)


def nearest_weights(p):
    _, i, _ = tree.find(p)
    return {gnames[g.group]: g.weight for g in me.vertices[i].groups if gnames[g.group] in BONES or gnames[g.group] == "head"}


def finish(verts, faces, uvs, colors, name, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            uv.data[li].uv = uvs[vi]
    col = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i, c in enumerate(colors):
        col.data[i].color = c
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = True
    for b in BONES:
        obj.vertex_groups.new(name=b)
    for i, v in enumerate(verts):
        w = nearest_weights(Vector(v))
        w = {("Head" if k == "head" else k): x for k, x in w.items()}
        tot = sum(w.values()) or 1.0
        for k, x in w.items():
            if k in obj.vertex_groups:
                obj.vertex_groups[k].add([i], x / tot, "REPLACE")
    obj.modifiers.new("Armature", "ARMATURE").object = rig
    obj.parent = rig
    obj.data.materials.append(bpy.data.materials.new(material))
    return obj


def scalp_shell(offset, name, material):
    """The head surface above the hairline, pushed out by offset."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bm.normal_update()
    keep = set()
    for v in bm.verts:
        if v.co.z > ear_z - 0.03 and v.co.z < top_z + 0.01 and abs(v.co.x) < 0.12 and v.co.y > centre.y - 0.15:
            az = az_of(v.co)
            if v.co.z > hairline_z(az) + (0.0 if abs(az) < math.pi / 2 else 0.0):
                keep.add(v.index)
    faces = [f for f in bm.faces if all(v.index in keep for v in f.verts)]
    verts, remap, uvs, cols = [], {}, [], []
    for f in faces:
        for v in f.verts:
            if v.index not in remap:
                remap[v.index] = len(verts)
                n = v.normal
                verts.append(tuple(v.co + n * offset))
                uvs.append((v.co.x * 9.0, v.co.z * 9.0))
                cols.append((1, 1, 1, 1.0))
    idx = [[remap[v.index] for v in f.verts] for f in faces]
    bm.free()
    return finish(verts, idx, uvs, cols, name, material)


def collide(p, clearance):
    for _ in range(3):
        hit = bvh.find_nearest(p)
        if hit[0] is None:
            return p
        loc, nrm = hit[0], hit[1]
        if (p - loc).dot(nrm) < clearance:
            p = loc + nrm * clearance
    return p


def tube(path, radius, sides, v0=0.0, vscale=1.0):
    verts, faces, uvs, cols = [], [], [], []
    n = len(path)
    for i, p in enumerate(path):
        t = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        t.normalize()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))).normalized()
        b = t.cross(a)
        r = radius * (1.0 - 0.55 * max(0.0, (i / (n - 1) - 0.8) / 0.2))
        for k in range(sides + 1):
            th = k / sides * 2 * math.pi
            verts.append(tuple(p + (a * math.cos(th) + b * math.sin(th)) * r))
            uvs.append((k / sides, v0 + vscale * i / (n - 1)))
            cols.append((1, 1, 1, min(1.0, i / (n - 1) * 1.4)))
    for i in range(n - 1):
        for k in range(sides):
            a0 = i * (sides + 1) + k
            faces.append((a0, a0 + 1, a0 + sides + 2, a0 + sides + 1))
    return verts, faces, uvs, cols


def braids():
    objs = [scalp_shell(0.0035, "scalp", "hairfade")]
    verts, faces, uvs, cols = [], [], [], []
    # roots: rows over the skull, a centre parting, none in the front hairline strip
    roots = []
    for ring, el in enumerate((20, 38, 56, 74)):
        count = (30, 26, 18, 8)[ring]
        for k in range(count):
            az = -math.pi * 0.98 + (2 * math.pi * 0.96) * (k + 0.5) / count + rnd.uniform(-0.05, 0.05)
            if abs(az) < 0.08 and el > 40:
                continue    # the centre parting stays clear
            elv = math.radians(el + rnd.uniform(-3, 3))
            d = Vector((math.sin(az) * math.cos(elv), -math.cos(az) * math.cos(elv), math.sin(elv)))
            hit = bvh.ray_cast(centre + d * 0.2, -d, 0.25)
            if hit[0] is None or hit[0].z < hairline_z(az):
                continue
            roots.append(hit[0] + hit[1] * 0.004)
    for p0 in roots:
        path = [p0]
        p = p0.copy()
        out = (p0 - centre).normalized()
        out.z = 0
        out.normalize()
        az0 = az_of(p0)
        if abs(az0) < 1.25:       # strands from the front sweep to the side and back, clear of the face
            side = 1.0 if p0.x >= 0 else -1.0
            blend = 1.0 - abs(az0) / 1.25
            out = (out * (1 - blend) + Vector((side * 0.95, 0.5, 0)) * blend).normalized()
        length = rnd.uniform(0.34, 0.46) if p0.z > ec.z + 0.05 else rnd.uniform(0.28, 0.40)
        steps = 22
        for s in range(1, steps + 1):
            p = p + Vector((0, 0, -length / steps)) + out * 0.0035 * (1.0 if s < 6 else (0.7 if abs(az0) < 1.25 and s < 12 else 0.3))
            p = collide(p, 0.011)
            path.append(p.copy())
        v, f, u, c = tube(path, 0.0082, 6, rnd.random(), 5.0)
        base = len(verts)
        verts += v
        faces += [tuple(i + base for i in poly) for poly in f]
        uvs += u
        cols += c
    objs.append(finish(verts, faces, uvs, cols, "braids", "hair"))
    return objs


def afro():
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    R = 0.155
    verts, uvs, cols = [], [], []
    noise = random.Random(5)
    lumps = [(Vector((noise.gauss(0, 1), noise.gauss(0, 1), noise.gauss(0, 1))).normalized(), noise.uniform(0.006, 0.014)) for _ in range(40)]
    keep = []
    for v in bm.verts:
        d = v.co.normalized()
        up = d.z
        r = R * (1.0 + 0.05 * max(0.0, d.z)) + min(0.03, sum(h * math.exp(-((d - dd).length / 0.3) ** 2) for dd, h in lumps))
        p = centre + Vector((d.x * r * 1.0, d.y * r * 1.0, d.z * r * 1.05)) + Vector((0, 0.01, 0.025))
        v.co = p
    faces = []
    for f in bm.faces:
        c = sum((v.co for v in f.verts), Vector()) / 3
        az = az_of(c)
        front_open = abs(az) < 0.75 and c.z < ec.z + 0.075 + 0.05 * (1 - abs(az) / 0.75)
        if c.z < ear_z - 0.045 or front_open or c.z < centre.z - 0.095:
            continue
        faces.append(f)
    remap = {}
    for f in faces:
        for v in f.verts:
            if v.index not in remap:
                remap[v.index] = len(verts)
                verts.append(tuple(v.co))
                uvs.append((v.co.x * 7.0, v.co.z * 7.0))
                cols.append((1, 1, 1, 1.0))
    idx = [[remap[v.index] for v in f.verts] for f in faces]
    bm.free()
    return [finish(verts, idx, uvs, cols, "afro", "hair"), scalp_shell(0.004, "scalp", "hairfade")]


made = braids() if style == "braids" else afro()
fixed = [{"head": "Head"}.get(n, n) for n in BONES]
for b in rig.data.bones:
    if b.name == "head":
        b.name = "Head"
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in made and o != body and not o.name.startswith("Body."):
        o.hide_render = True
    if o.name.startswith("Body.") and o.type == "MESH":
        o.hide_render = o.name not in ("Body.high-poly", "Body.eyebrow001", "Body.eyelashes02")
if prefix:
    common.preview(prefix, views=(("front", 0, 0), ("tq", 40, 8), ("back", 180, 5)), focus=(0, 0, 1.45), zoom=1.0, size=(600, 700))
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in made:
        bpy.data.objects.remove(o)
for o in made:
    o.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_apply=False, export_morph=False, export_skins=True, export_vertex_color="ACTIVE",
                          export_yup=True, export_image_format="NONE", export_materials="EXPORT", export_cameras=False, export_lights=False)
print("EXPORTED", out, [(o.name, len(o.data.polygons)) for o in made])
