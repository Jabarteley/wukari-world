"""Stage 3b: the light hero version. Thins the body mesh away from the face and hands and merges the face parts into one mesh.

  blender --background --disable-autoexec --python finalize.py -- <in.blend> <out.blend> <rects.json> [<body-ratio>]

1. The body is decimated with a protection weight (full on the head and hands) and every vertex group, the baked colour
   attribute and every shape key is carried over to the new vertices by their nearest point on the old surface.
2. The eyes, brows, lashes, teeth, tongue and mouth cavity get UVs into the one face atlas (make_face_atlas.py), a tint in
   the vertex colour (rgb) and a flag in its alpha channel (1 for brows and lashes, which take the hair colour), and are joined
   into one mesh named "face" so the whole face is one draw call.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bmesh
import bpy
import common
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

src, out, rects_path = common.args()[:3]
ratio = float(common.args()[3]) if len(common.args()) > 3 else float(os.environ.get("AW_BODY_RATIO", "0.3"))
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()
rects = json.load(open(rects_path))
body = bpy.data.objects["Body"]
rig = bpy.data.objects["Body.rig"]
deps = bpy.context.evaluated_depsgraph_get()


def transfer(old, new_mesh, name):
    """A new object on new_mesh carrying old's vertex groups, colour attribute and shape keys."""
    me = old.data
    me.calc_loop_triangles()
    bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(t.vertices) for t in me.loop_triangles])
    new = bpy.data.objects.new(name, new_mesh)
    bpy.context.scene.collection.objects.link(new)
    gnames = {g.index: g.name for g in old.vertex_groups}
    for g in old.vertex_groups:
        new.vertex_groups.new(name=g.name)
    keys = me.shape_keys.key_blocks if me.shape_keys else []
    col_old = me.color_attributes.get("Col")
    while len(new_mesh.color_attributes):
        new_mesh.color_attributes.remove(new_mesh.color_attributes[0])
    col_new = new_mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT") if col_old else None
    if keys:
        new.shape_key_add(name="Basis", from_mix=False)
        for k in keys[1:]:
            new.shape_key_add(name=k.name, from_mix=False)
    for v in new_mesh.vertices:
        loc, nrm, tri, dist = bvh.find_nearest(v.co)
        ids = me.loop_triangles[tri].vertices
        w = poly_3d_calc([me.vertices[i].co for i in ids], loc)
        acc = {}
        for wi, i in zip(w, ids):
            for g in me.vertices[i].groups:
                acc[gnames[g.group]] = acc.get(gnames[g.group], 0.0) + g.weight * wi
        tot = sum(acc.values()) or 1.0
        deform = {n: x for n, x in acc.items() if n in BONES}
        dt = sum(deform.values()) or 1.0
        for n, x in acc.items():
            if x > 1e-4:
                new.vertex_groups[n].add([v.index], x / (dt if n in BONES else 1.0), "REPLACE")
        if col_new:
            c = [0.0, 0.0, 0.0, 0.0]
            for wi, i in zip(w, ids):
                for j in range(4):
                    c[j] += col_old.data[i].color[j] * wi
            col_new.data[v.index].color = c
        for k in keys[1:]:
            d = Vector()
            for wi, i in zip(w, ids):
                d += (k.data[i].co - keys[0].data[i].co) * wi
            new.data.shape_keys.key_blocks[k.name].data[v.index].co = v.co + d
    return new


BONES = {b.name for b in rig.data.bones}
gn = {g.index: g.name for g in body.vertex_groups}
# 1. the protection weight: 1 on the head, neck and hands, a little on the rest
neck_z = rig.data.bones["neck_01"].head_local.z
prot = body.vertex_groups.new(name="protect")
base_w = []
for v in body.data.vertices:
    w = {gn[g.group]: g.weight for g in v.groups}
    head = max(w.get("head", 0.0), w.get("neck_01", 0.0) * 0.6)
    hand = max([w.get(n, 0.0) for n in w if n.startswith(("hand_", "index_", "middle_", "ring_", "pinky_", "thumb_"))] + [0.0])
    foot = max([w.get(n, 0.0) for n in ("foot_l", "foot_r", "ball_l", "ball_r")])
    face = 1.0 if v.co.z > neck_z + 0.01 else 0.0     # everything from the neck up keeps more density (the lips and eye rims need it)
    base_w.append((v.index, max(0.0, head, face), hand, foot))
tmp = body.copy()
tmp.data = body.data.copy()
tmp.name = "tmp"
tmp.vertex_groups.clear() if False else None
bpy.context.scene.collection.objects.link(tmp)
tmp.shape_key_clear()
for m in list(tmp.modifiers):
    tmp.modifiers.remove(m)
def thinned(invert, hw=1.0, bw=0.25):
    for i, hd, hand, foot in base_w:
        tmp.vertex_groups["protect"].add([i], max(bw, hd * hw, hand * hw * 0.8, foot * 0.5), "REPLACE")
    for m in list(tmp.modifiers):
        tmp.modifiers.remove(m)
    dec = tmp.modifiers.new("dec", "DECIMATE")
    dec.ratio = ratio
    dec.vertex_group = "protect"
    dec.vertex_group_factor = 1.0
    dec.invert_vertex_group = invert
    dec.use_symmetry = True
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    head = sum(1 for p in mesh.polygons if p.center.z > neck_z + 0.01)
    return mesh, head


# the protection weight pulls the other way round in this Blender (high weight = collapsed last only when inverted); try head
# weights and keep the one that leaves the head near 2000 polygons and the rest of the body at least 1500
best = None
for hw in (1.0, 0.8, 0.65, 0.5, 0.4):
    mesh, head = thinned(True, hw)
    rest = len(mesh.polygons) - head
    score = abs(head - 2000) + max(0, 1500 - rest)
    print("TRY head weight", hw, "head polys", head, "rest", rest)
    if best is None or score < best[0]:
        best = (score, mesh)
new_mesh = best[1]
print("BODY decimated", len(body.data.polygons), "polys ->", len(new_mesh.polygons), "(triangles", sum(len(p.vertices) - 2 for p in new_mesh.polygons), ")")
newbody = transfer(body, new_mesh, "BodyNew")
for p in newbody.data.polygons:
    p.use_smooth = True
newbody.modifiers.new("Armature", "ARMATURE").object = rig
newbody.parent = rig
newbody.matrix_parent_inverse = body.matrix_parent_inverse.copy()
newbody.data.materials.append(body.data.materials[0]) if body.data.materials else None
if "protect" in newbody.vertex_groups:
    newbody.vertex_groups.remove(newbody.vertex_groups["protect"])
bpy.data.objects.remove(tmp)
bpy.data.objects.remove(body)
newbody.name = "Body"
newbody.data.name = "Body"

# 2. the face parts into the atlas, then into one mesh
PARTS = {"Body.high-poly": ("eye", (1.0, 1.0, 1.0, 0.0)), "Body.eyebrow001": ("brow", (1.0, 1.0, 1.0, 1.0)), "Body.eyelashes02": ("lash", (0.02, 0.015, 0.012, 1.0)),
         "Body.teeth_base": ("teeth", (1.0, 1.0, 1.0, 0.0)), "Body.tongue01": ("tongue", (1.0, 1.0, 1.0, 0.0)), "cavity": ("cavity", (1.0, 1.0, 1.0, 0.0))}
eyes_o = bpy.data.objects["Body.high-poly"]
mean = lambda vs: sum(vs, Vector()) / len(vs)
bpy.context.scene["eye_l"] = list(mean([v.co for v in eyes_o.data.vertices if v.co.x > 0]))
bpy.context.scene["eye_r"] = list(mean([v.co for v in eyes_o.data.vertices if v.co.x <= 0]))
bpy.context.scene["mouth"] = list(mean([v.co for v in bpy.data.objects["Body.teeth_base"].data.vertices]))
allkeys = []
objs = []
for name, (rect, tint) in PARTS.items():
    o = bpy.data.objects[name]
    objs.append(o)
    if o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks[1:]:
            if k.name not in allkeys:
                allkeys.append(k.name)
for name, (rect, tint) in PARTS.items():
    o = bpy.data.objects[name]
    r = rects[rect]
    me = o.data
    if me.uv_layers:
        uv = me.uv_layers.active
    else:
        uv = me.uv_layers.new(name="UVMap")
        for li in range(len(uv.data)):
            uv.data[li].uv = (0.5, 0.5)
    for d in uv.data:
        u, v = d.uv
        u, v = min(1.0, max(0.0, u)), min(1.0, max(0.0, v))
        d.uv = (r[0] + u * (r[2] - r[0]), 1.0 - (r[1] + (1.0 - v) * (r[3] - r[1])))   # blender v goes up, the atlas rects go down
    while len(me.uv_layers) > 1:
        me.uv_layers.remove(me.uv_layers[1])
    while len(me.color_attributes):
        me.color_attributes.remove(me.color_attributes[0])
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i in range(len(me.vertices)):
        ca.data[i].color = tint
    me.color_attributes.active_color = ca
    # every part carries every key (zero where it has none) so the join keeps the shapes by name
    if not me.shape_keys:
        o.shape_key_add(name="Basis", from_mix=False)
    have = {k.name for k in me.shape_keys.key_blocks}
    for kn in allkeys:
        if kn not in have:
            o.shape_key_add(name=kn, from_mix=False)
bpy.ops.object.select_all(action="DESELECT")
active = bpy.data.objects["Body.high-poly"]
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = active
bpy.ops.object.join()
face = bpy.context.view_layer.objects.active
face.name = "face"
face.data.name = "face"
print("FACE", len(face.data.vertices), "verts", sum(len(p.vertices) - 2 for p in face.data.polygons), "tris", [k.name for k in face.data.shape_keys.key_blocks])
bpy.ops.wm.save_as_mainfile(filepath=out)
