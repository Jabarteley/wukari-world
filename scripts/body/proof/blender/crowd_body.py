"""Stage 5: the crowd body, from the finished hero blend.

  blender --background --disable-autoexec --python crowd_body.py -- <hero.blend> <out.blend> [<target-triangles>]

Drops the face mesh, thins the body to about the target triangle count (the head and hands keep more) and adds a small decal
mesh over the face, weighted to the head, that carries a painted face (eyes, brows, a smile; crowd-face.png from
make_face_atlas.py), so a crowd member is not blank.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common
from mathutils import Vector
from mathutils.bvhtree import BVHTree

src, out = common.args()[:2]
target = int(common.args()[2]) if len(common.args()) > 2 else int(os.environ.get("AW_CROWD_TRIS", "1000"))
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()
sc = bpy.context.scene
eye_l, eye_r, mouth = Vector(sc["eye_l"]), Vector(sc["eye_r"]), Vector(sc["mouth"])
body = bpy.data.objects["Body"]
rig = bpy.data.objects["Body.rig"]
bpy.data.objects.remove(bpy.data.objects["face"])
hero_bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

# the decal first, placed on the hero surface
sep = eye_l.x - eye_r.x
w = sep / 0.468
h = (((eye_l.z + eye_r.z) / 2) - mouth.z) / 0.37
top = (eye_l.z + eye_r.z) / 2 + 0.41 * h
cx = (eye_l.x + eye_r.x) / 2
COLS, ROWS = 9, 5
verts, uvs = [], []
for j in range(ROWS + 1):
    for i in range(COLS + 1):
        x = cx - w / 2 + w * i / COLS
        z = top - h * j / ROWS
        hit = hero_bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0)
        p = hit[0] + hit[1] * 0.0042 if hit[0] is not None else Vector((x, mouth.y, z))
        verts.append(tuple(p))
        uvs.append((i / COLS, 1.0 - j / ROWS))
faces = [(j * (COLS + 1) + i, j * (COLS + 1) + i + 1, (j + 1) * (COLS + 1) + i + 1, (j + 1) * (COLS + 1) + i) for j in range(ROWS) for i in range(COLS)]
me = bpy.data.meshes.new("decal")
me.from_pydata(verts, [], [tuple(reversed(f)) for f in faces])
me.update()
uv = me.uv_layers.new(name="UVMap")
for poly in me.polygons:
    for li, vi in zip(poly.loop_indices, poly.vertices):
        uv.data[li].uv = uvs[vi]
decal = bpy.data.objects.new("decal", me)
sc.collection.objects.link(decal)
decal.vertex_groups.new(name="head").add(list(range(len(verts))), 1.0, "REPLACE")
decal.modifiers.new("Armature", "ARMATURE").object = rig
decal.parent = rig
decal.data.materials.append(bpy.data.materials.new("decal"))
for p in me.polygons:
    p.use_smooth = True

# the body: no shape keys, a protection weight, decimated to the target
body.shape_key_clear()
for m in list(body.modifiers):
    body.modifiers.remove(m)
gn = {g.index: g.name for g in body.vertex_groups}
prot = body.vertex_groups.new(name="protect")
for v in body.data.vertices:
    w_ = {gn[g.group]: g.weight for g in v.groups}
    head = max(w_.get("head", 0.0), w_.get("neck_01", 0.0) * 0.5)
    hand = max([w_.get(n, 0.0) for n in w_ if n.startswith(("hand_", "index_", "middle_", "ring_", "pinky_", "thumb_"))] + [0.0])
    prot.add([v.index], max(0.1, head, hand * 0.6), "REPLACE")
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
for o in bpy.context.view_layer.objects:
    o.select_set(False)
body.select_set(True)
bpy.context.view_layer.objects.active = body
dec = body.modifiers.new("dec", "DECIMATE")
dec.ratio = min(1.0, target / tris)
dec.vertex_group = "protect"
dec.vertex_group_factor = 1.0
bpy.ops.object.modifier_apply(modifier="dec")
body.vertex_groups.remove(body.vertex_groups["protect"])
body.modifiers.new("Armature", "ARMATURE").object = rig
print("CROWD body triangles", tris, "->", sum(len(p.vertices) - 2 for p in body.data.polygons), "decal", len(me.polygons) * 2)
bpy.ops.wm.save_as_mainfile(filepath=out)
