"""Builds a short cropped hair cap from the surface of a bald head (procedural: no generated hair is involved).

  blender --background --disable-autoexec --python hair_cap.py -- <reduced.blend> <face.json> <out.glb> [--rgb 0.05,0.04,0.035] [--lift 0.006] [--front 0.085] [--back -0.045]

Takes the faces of the head above a hairline (high at the brow, lower toward the nape, never over the ears), lifts them a few millimetres along their normals,
and writes them as one dark single-colour mesh in the figure's rest-pose space.  Every path is an argument.
"""
import json
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, face_json, out_glb = pos[:3]
rgb = [float(v) for v in opts.get("--rgb", "0.018,0.014,0.012").split(",")]
lift = float(opts.get("--lift", 0.006)); front = float(opts.get("--front", 0.085)); back = float(opts.get("--back", -0.045))
fj = json.load(open(face_json))
eye_z = (fj["eyeL"][1] + fj["eyeR"][1]) / 2
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]
bm = bmesh.new(); bm.from_mesh(low.data); bm.faces.ensure_lookup_table()
ys = [v.co.y for v in bm.verts if v.co.z > eye_z and abs(v.co.x) < 0.2]
y_front, y_back = min(ys), max(ys)
keep = []
for f in bm.faces:
    c = f.calc_center_median()
    if c.z < eye_z - 0.1:
        continue
    t = (c.y - y_front) / (y_back - y_front)                 # 0 at the brow side, 1 at the back
    line = eye_z + front + (back - front) * min(1.0, max(0.0, t * 1.25))
    if c.z > line and not (abs(c.x) > 0.135 and c.z < eye_z + 0.075):
        keep.append(f)
drop = [f for f in bm.faces if f not in set(keep)]
bmesh.ops.delete(bm, geom=drop, context="FACES")
for v in bm.verts:
    v.co = v.co + v.normal * lift
bm.normal_update()
me = bpy.data.meshes.new("hair"); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("hair", me); bpy.context.collection.objects.link(ob)
for o in list(bpy.data.objects):
    if o is not ob:
        bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
dec = ob.modifiers.new("dec", "DECIMATE"); dec.decimate_type = "COLLAPSE"; dec.ratio = min(1.0, float(opts.get("--tris", 1000)) / max(len(me.polygons), 1))
bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new("hair"); mat.use_nodes = True
b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b.inputs["Base Color"].default_value = (*rgb, 1.0); b.inputs["Roughness"].default_value = 0.85
me.materials.append(mat)
print("CAP triangles", len(me.polygons))
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_animations=False, export_yup=True, export_image_format="NONE")
