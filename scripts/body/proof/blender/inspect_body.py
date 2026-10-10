"""Headless check that a shipped base body imports into Blender with its 23-bone skeleton intact.

  blender --background --python scripts/body/proof/blender/inspect_body.py -- <body.glb> <out.json>

Prints the armature's bone names, the mesh's vertex count and the number of vertex groups, so a Blender-made part can be
checked against the skeleton the clip pack animates before it is exported.
"""
import json
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
src, out = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.data.objects if o.type == "MESH")
report = {"bones": sorted(b.name for b in arm.data.bones), "vertices": len(mesh.data.vertices), "vertex_groups": len(mesh.vertex_groups)}
with open(out, "w") as f:
    json.dump(report, f, indent=1)
print(json.dumps(report))
