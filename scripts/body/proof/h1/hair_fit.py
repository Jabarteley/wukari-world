"""Fits a cut hair piece onto a head and writes it as a small glb in the figure's own rest-pose space.

  blender --background --disable-autoexec --python hair_fit.py -- <piece.blend> <colour.jpg> <head.json> <out.glb> --scale s --top z_piece --dx x --dy y --dz z [--yaw deg]

The piece is scaled by s about its own origin, turned by yaw about the vertical axis, and moved so that z_piece (the height in the piece's units of its crown) lands on the head's crown
(plus dz), its middle on the head's middle (plus dx, dy).  The glb carries one material with the colour map only, so it costs one more draw call.  Every path is an argument.
"""
import json
import math
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, colour, head_json, out_glb = pos[:4]
head = json.load(open(head_json))
bpy.ops.wm.open_mainfile(filepath=blend)
ob = bpy.data.objects["Mesh_0"]
s = float(opts["--scale"]); top = float(opts["--top"]); dx, dy, dz = (float(opts.get(k, 0)) for k in ("--dx", "--dy", "--dz")); yaw = math.radians(float(opts.get("--yaw", 0)))
cx0 = float(opts.get("--ox", 0)); cy0 = float(opts.get("--oy", 0))
for v in ob.data.vertices:
    p = Vector((v.co.x - cx0, v.co.y - cy0, v.co.z - top))
    p = Matrix.Rotation(yaw, 3, "Z") @ (p * s)
    v.co = Vector((p.x + head["centre"][0] + dx, p.y + head["centre"][1] + dy, p.z + head["top"] + dz))
ob.data.update()
img = bpy.data.images.load(colour)
mat = bpy.data.materials.new("hair"); mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL":
        nt.nodes.remove(n)
bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); bsdf.inputs["Roughness"].default_value = 0.8; bsdf.inputs["Metallic"].default_value = 0.0
t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"]); nt.links.new(bsdf.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
ob.data.materials.clear(); ob.data.materials.append(mat)
ob.name = "hair"
for o in list(bpy.data.objects):
    if o is not ob:
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=80, export_animations=False, export_yup=True)
print("HAIR", out_glb)
