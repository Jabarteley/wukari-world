"""Flat-lit stills of a reduced (or full) character for quick checks, not for the evidence.

  blender --background --disable-autoexec --python meshy_preview.py -- <in.blend> <out-prefix> <object-name> [<texture.jpg>] [--wire]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common

a = common.args()
src, prefix, name = a[:3]
tex = a[3] if len(a) > 3 and not a[3].startswith("--") else None
bpy.ops.wm.open_mainfile(filepath=src)
for o in bpy.data.objects:
    o.hide_render = o.name != name and o.type != "CAMERA"
obj = bpy.data.objects[name]
bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
lo = Vector((min(v[i] for v in bb) for i in range(3))); hi = Vector((max(v[i] for v in bb) for i in range(3)))
H = hi.z - lo.z
if tex:
    img = bpy.data.images.load(tex)
    mat = obj.data.materials[0]
    mat.use_nodes = True
    n = mat.node_tree.nodes
    for x in list(n):
        if x.type == "TEX_IMAGE":
            x.image = img
    if not any(x.type == "TEX_IMAGE" for x in n):
        t = n.new("ShaderNodeTexImage"); t.image = img
        b = next(x for x in n if x.type == "BSDF_PRINCIPLED"); mat.node_tree.links.new(t.outputs[0], b.inputs[0])
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x, sc.render.resolution_y = 900, 1100
sh = sc.display.shading; sh.light = "FLAT"; sh.color_type = "TEXTURE"
if "--wire" in a:
    sh.light = "STUDIO"; sh.color_type = "SINGLE"; sh.single_color = (0.75, 0.75, 0.75); sc.display.shading.show_object_outline = False
    obj.modifiers.new("w", "WIREFRAME") if False else None
    sc.render.film_transparent = False
sc.world = sc.world or bpy.data.worlds.new("w"); sc.world.color = (0.5, 0.5, 0.5)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2))
for view, az, zoom, cz in (("front", 0, 1.1, 0.5), ("back", 180, 1.1, 0.5), ("side", 90, 1.1, 0.5), ("face", 0, 0.22, 0.88), ("hands", 0, 0.55, 0.47)):
    cam.data.ortho_scale = H * zoom
    c = Vector((centre.x, centre.y, lo.z + H * cz))
    r = math.radians(az)
    cam.location = c + Vector((math.sin(r) * -6, math.cos(r) * -6 * -1 * -1, 0)) * (1 if True else 0)
    cam.location = c + Vector((math.sin(r) * 6, -math.cos(r) * 6, 0))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{prefix}-{view}.png"
    bpy.ops.render.render(write_still=True)
