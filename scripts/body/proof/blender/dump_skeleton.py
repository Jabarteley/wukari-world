"""Writes the joint positions (Blender space) of a skeleton .glb: blender --background --python dump_skeleton.py -- <in.glb> <out.json>"""
import bpy,sys,json
src,out=sys.argv[sys.argv.index("--")+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm=[o for o in bpy.data.objects if o.type=="ARMATURE"][0]
d={b.name:{"head":[round(x,4) for x in b.head_local],"tail":[round(x,4) for x in b.tail_local],"parent":b.parent.name if b.parent else None} for b in arm.data.bones}
json.dump(d,open(out,"w"),indent=1)
