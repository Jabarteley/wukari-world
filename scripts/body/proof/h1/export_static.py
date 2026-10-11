"""Exports one object of a blend file as a static glb for viewing.  blender -b --python export_static.py -- <in.blend> <object> <out.glb>"""
import sys
import bpy
argv = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=argv[0])
for o in bpy.data.objects:
    o.select_set(o.name == argv[1])
bpy.ops.export_scene.gltf(filepath=argv[2], export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=70, export_animations=False, export_yup=True)
