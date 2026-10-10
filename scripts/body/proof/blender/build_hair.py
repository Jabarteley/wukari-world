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
    obj.data.materials.append(bpy.data.materials.get(material) or bpy.data.materials.new(material))
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
                uvs.append((v.co.x * 26.0, v.co.y * 8.0))
                cols.append((1, 1, 1, smoothstep((v.co.z - hairline_z(az_of(v.co))) / 0.014 + 0.35)))
    idx = [[remap[v.index] for v in f.verts] for f in faces]
    bm.free()
    obj = finish(verts, idx, uvs, cols, name, material)
    ratio = 0.1 if LOD else 0.3
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.view_layer.objects:
        o.select_set(o is obj)
    dec = obj.modifiers.new("dec", "DECIMATE")
    dec.ratio = ratio
    dec.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")
    return obj


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


LOD = os.environ.get("AW_LOD") == "1"


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


body_obj = body


def project_to_head(p, clearance):
    hit = bvh.find_nearest(p)
    if hit[0] is None:
        return p
    return hit[0] + hit[1] * clearance


def braids():
    """Braids framing the face: a close cap with the hairline laid back, braids rooted over the whole scalp that run back along the
    skull and then hang behind the shoulders, and a few on each side that fall past the ears onto the chest, well clear of the eyes."""
    objs = [scalp_shell(0.0035, "scalp", "hair")]
    verts, faces, uvs, cols = [], [], [], []
    nape_z = ec.z - 0.055
    back_n = 16 if LOD else int(os.environ.get("AW_BRAIDS", "30"))
    sides_n = 2 if LOD else 3
    steps_walk, steps_fall = (2, 3) if LOD else (4, 6)
    paths = []
    # back braids: rows from the crown to the nape, spread across the width of the head
    for k in range(back_n):
        rowt = (k + 0.5) / back_n
        az = math.pi * (0.64 + 0.32 * ((k * 0.618034) % 1.0))     # 115..175 degrees: behind the ears and around the back
        az *= 1 if (k % 2) else -1
        el = math.radians(rnd.uniform(8, 62))
        d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        hit = bvh.ray_cast(centre + d * 0.2, -d, 0.25)
        if hit[0] is None:
            continue
        paths.append((hit[0] + hit[1] * 0.006, 0.0, "back", rnd.uniform(0.30, 0.42)))
    # the hairline row: braids rooted along the top and the sides of the hairline run back over the skull
    for k in range(0):
        az = (k - 8.5) / 8.5 * math.radians(95)
        if abs(az) < 0.09:
            continue
        el = math.radians(26 + 18 * (1 - abs(az) / 1.7))
        d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        hit = bvh.ray_cast(centre + d * 0.2, -d, 0.25)
        if hit[0] is None or hit[0].z < hairline_z(az) + 0.004:
            continue
        paths.append((hit[0] + hit[1] * 0.006, 0.0, "front", rnd.uniform(0.30, 0.40)))
    # side braids: from behind each ear forward over the shoulder
    for side in (-1, 1):
        for j in range(sides_n):
            az = side * (math.radians(100) + j * 0.12)
            el = math.radians(-2 - 6 * j)
            d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
            hit = bvh.ray_cast(centre + d * 0.2, -d, 0.25)
            if hit[0] is None:
                continue
            paths.append((hit[0] + hit[1] * 0.006, side, "side", rnd.uniform(0.40, 0.50)))
    for (p0, side, kind, length) in paths:
        path = [p0]
        p = p0.copy()
        if kind != "side":
            for s in range(steps_walk):          # follow the skull toward the back
                if p.z < nape_z + 0.01:
                    break
                p = project_to_head(p + Vector((0.0, 0.02 * (1 if kind == "back" else 1.3), -0.004)) * (1.0 if kind == "back" else 1.0), 0.007)
                path.append(p.copy())
        side_x = side if side else (1 if p.x >= 0 else -1)
        for s in range(1, steps_fall + 1):
            f = s / steps_fall
            if kind == "side":
                step = Vector((side_x * 0.003, -0.006 if s > 2 else 0.0, -length / steps_fall))
            else:
                step = Vector((side_x * 0.0012 * (1 + abs(p.x) * 6), 0.0035, -length / steps_fall))
            p = collide(p + step, 0.0105)
            path.append(p.copy())
        v, f, u, c = tube(path, 0.0115 if not LOD else 0.016, 3, rnd.random(), 4.0)
        base = len(verts)
        verts += v
        faces += [tuple(i + base for i in poly) for poly in f]
        uvs += u
        cols += [(0.7 + 0.3 * min(1.0, i / max(1, len(v) // 5)), 0.7 + 0.3 * min(1.0, i / max(1, len(v) // 5)), 1, 1.0) for i in range(len(v))]
    objs.append(finish(verts, faces, uvs, cols, "braids", "hair"))
    return objs


def afro():
    """A rounded, soft-edged afro: a lightly lumpy dome around the head with a laid hairline, alpha-faded at its edge."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3 if LOD else 4, radius=1.0)
    R = 0.158
    noise = random.Random(5)
    lumps = [(Vector((noise.gauss(0, 1), noise.gauss(0, 1), noise.gauss(0, 1))).normalized(), noise.uniform(0.004, 0.008)) for _ in range(30)]
    for v in bm.verts:
        d = v.co.normalized()
        r = R * (1.0 + 0.04 * max(0.0, d.z)) + sum(h * math.exp(-((d - dd).length / 0.45) ** 2) for dd, h in lumps)
        v.co = centre + Vector((d.x * r * 1.02, d.y * r * 1.0, d.z * r * 1.06)) + Vector((0, 0.012, 0.03))

    def fade_of(c):
        az = az_of(c)
        front = (c.z - (ec.z + 0.078 + 0.05 * (1 - abs(az) / 0.75))) / 0.02 if abs(az) < 0.75 else 9.0
        low = (c.z - (ear_z - 0.04)) / 0.02
        return min(front, low)

    verts, uvs, cols, remap, faces = [], [], [], {}, []
    for f in bm.faces:
        c = sum((v.co for v in f.verts), Vector()) / 3
        if fade_of(c) <= 0.0:
            continue
        faces.append(f)
    for f in faces:
        for v in f.verts:
            if v.index not in remap:
                remap[v.index] = len(verts)
                verts.append(tuple(v.co))
                uvs.append((v.co.x * 7.0, v.co.z * 7.0))
                a = smoothstep(fade_of(v.co) * 0.6 + 0.2)
                cols.append((1, 1, 1, a))
    idx = [[remap[v.index] for v in f.verts] for f in faces]
    bm.free()
    return [finish(verts, idx, uvs, cols, "afro", "hair"), scalp_shell(0.004, "scalp", "hair")]




def radial_hit(axis, direction, reach=0.25):
    hit = bvh.ray_cast(axis + direction * reach, -direction, reach)
    return None if hit[0] is None else (hit[0] - axis).length


def jewellery():
    """A gold necklace on the collarbones and a pair of drop earrings, a separate mesh of the gold material."""
    verts, faces, uvs, cols = [], [], [], []
    neck_z = rig.data.bones["neck_01"].head_local.z
    ys = [v.co.y for v in me.vertices if abs(v.co.z - neck_z) < 0.012 and abs(v.co.x) < 0.06]
    axis_y = sum(ys) / len(ys)
    path = []
    N = 26
    for k in range(N + 1):
        th = math.radians(20) + (math.radians(320)) * k / N          # open at the back
        front = max(0.0, -math.cos(th))                              # 1 at the front
        z = neck_z + 0.0 - 0.045 * front ** 2
        axis = Vector((0, axis_y, z))
        d = Vector((math.sin(th), math.cos(th), 0.0))
        r = radial_hit(axis, d)
        if r is None:
            continue
        path.append(axis + d * (r + 0.007))
    v, f, u, c = tube(path, 0.0045, 5, 0.0, 6.0)
    verts += v
    faces += f
    uvs += u
    cols += [(1, 1, 1, 1.0)] * len(v)
    gn_ = {g.index: g.name for g in body.vertex_groups}
    for side in (1, -1):
        lobe = min((vv for vv in me.vertices if (vv.co.x * side) > 0.03 and any(gn_[g.group] == "ears" and g.weight > 0.5 for g in vv.groups)), key=lambda vv: vv.co.z, default=None)
        if lobe is None:
            continue
        for k, (dz, rad) in enumerate(((-0.004, 0.0045), (-0.016, 0.0065))):
            ico = bmesh.new()
            bmesh.ops.create_icosphere(ico, subdivisions=1, radius=rad)
            base = len(verts)
            c0 = lobe.co + Vector((side * 0.004, 0.0, dz))
            for vv in ico.verts:
                verts.append(tuple(vv.co + c0))
                uvs.append((0.5, 0.5))
                cols.append((1, 1, 1, 1.0))
            faces += [tuple(base + vv.index for vv in ff.verts) for ff in ico.faces]
            ico.free()
    return finish(verts, faces, uvs, cols, "jewel", "gold")


def gele():
    """A tall headwrap: rings lofted from the brow line over the head, swelling into a tilted crown, with twisting pleats."""
    NT, rows = (16, 6) if LOD else (28, 12)
    zb = ec.z + 0.038
    r0 = []
    for k in range(NT):
        th = 2 * math.pi * k / NT
        d = Vector((math.sin(th), -math.cos(th), 0.0))
        r = radial_hit(Vector((0, centre.y, zb)), d)
        r0.append(r if r is not None else 0.1)
    verts, faces, uvs, cols = [], [], [], []
    for i in range(rows + 1):
        t = i / rows
        s = (1.0 + 0.5 * math.sin(min(1.0, t * 1.25) * 1.5)) * (1.0 - 0.92 * t ** 5)
        for k in range(NT):
            th = 2 * math.pi * k / NT
            pl = 1.0 + (0.09 * math.sin(6 * th + 9 * t) * (0.3 + t) + 0.04 * math.sin(11 * th - 6 * t)) * (0.0 if LOD else 1.0)
            r = (r0[k] + 0.02) * s * pl
            x = math.sin(th) * r * (1.12 if t > 0 else 1.0) + 0.02 * t ** 2
            y = centre.y - math.cos(th) * r * 0.95 - 0.015 * t ** 2 + 0.012 * t
            z = zb + 0.2 * t - 0.012 * math.cos(th) * (1 - t)
            verts.append((x, y, z))
            uvs.append((th / (2 * math.pi) * 3, t * 2))
            cols.append((1, 1, 1, 1.0))
    for i in range(rows):
        for k in range(NT):
            a = i * NT + k
            b = i * NT + (k + 1) % NT
            faces.append((a, b, b + NT, a + NT))
    return finish(verts, faces, uvs, cols, "gele", "garment")


made = {"braids": braids, "afro": afro, "gele": gele}[style]()
made = made if isinstance(made, list) else [made]
if style in ("braids", "afro", "gele") and not LOD and os.environ.get("AW_JEWELLERY", "1") == "1":
    made = list(made) + [jewellery()]
# one mesh for everything made of hair, so the whole head of hair is one draw call
hairs = [o for o in made if o.data.materials and o.data.materials[0].name == "hair"]
if len(hairs) > 1:
    keep = [o for o in made if o not in hairs[1:]]
    bpy.ops.object.select_all(action="DESELECT")
    for o in hairs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = hairs[0]
    bpy.ops.object.join()
    made = keep
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
