"""Workbench stills of a model from a few sides, for checking orientation, cleanup and reduction.

  blender --background --disable-autoexec --python shots.py -- <in.glb|in.blend> <out-prefix> [view,view,...]

Views: front (looking along +Y in Blender, the model's -Y side), back, left, right, top, tq (three quarters).
A glTF file is imported as it is; the game faces +Z in glTF, which is -Y in Blender, so "front" should show the face of the object.
"""
import math
import sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, prefix = argv[0], argv[1]
views = (argv[2] if len(argv) > 2 else "front,right,top,tq").split(",")
if src.endswith(".blend"):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
import os
show = "High" if os.environ.get("SHOTS_HIGH") else None
objs = [o for o in bpy.data.objects if o.type == "MESH" and ((o.name == show) if show else (o.name != "High"))]
for o in bpy.data.objects:
    if o.type == "MESH" and o not in objs:
        o.hide_render = True; o.hide_viewport = True
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo = Vector((min(lo[i], w[i]) for i in range(3))); hi = Vector((max(hi[i], w[i]) for i in range(3)))
centre = (lo + hi) / 2; size = (hi - lo).length
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = scene.render.resolution_y = 640
sh = scene.display.shading
import os
sh.light = "STUDIO"
if os.environ.get("SHOTS_PLAIN"):
    sh.color_type = "SINGLE"; sh.single_color = (0.8, 0.75, 0.6); sh.show_object_outline = True
    scene.display.shading.show_cavity = False; sh.color_type = "TEXTURE" if not os.environ.get("SHOTS_PLAIN") else "SINGLE"; sh.show_cavity = False
scene.world = bpy.data.worlds.new("w"); scene.world.color = (0.82, 0.88, 0.92)
sh.background_type = "WORLD" if hasattr(sh, "background_type") else None
scene.view_settings.view_transform = "Standard"
cam_data = bpy.data.cameras.new("c"); cam_data.type = "ORTHO"; cam_data.ortho_scale = size * 1.1
cam = bpy.data.objects.new("c", cam_data); scene.collection.objects.link(cam); scene.camera = cam
DIRS = {"front": (0, -1, 0.0), "back": (0, 1, 0.0), "left": (-1, 0, 0.0), "right": (1, 0, 0.0), "top": (0, -0.001, 1), "tq": (0.8, -1, 0.6)}
for v in views:
    d = Vector(DIRS[v]).normalized()
    cam.location = centre + d * 10
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = f"{prefix}-{v}.png"
    bpy.ops.render.render(write_still=True)
