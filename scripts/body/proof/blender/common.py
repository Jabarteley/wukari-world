"""Shared helpers for the character build scripts (run inside Blender: blender --background --disable-autoexec --python <script> -- <args>).

Nothing here depends on a machine path: every input and output is an argument.
"""
import json
import math
import sys

import addon_utils
import bpy
from mathutils import Vector

MPFB = "bl_ext.user_default.mpfb"


def args():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def enable_mpfb():
    addon_utils.enable(MPFB, default_set=True, persistent=False)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    enable_mpfb()


def preview(path, objects=None, views=(("front", 0, 0),), height=1.7, size=(640, 900), focus=None, zoom=None):
    """Workbench stills for quick iteration (not the final images). views: (name, azimuth_deg, elevation_deg)."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.image_settings.file_format = "PNG"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "TEXTURE"
    shading.show_cavity = True
    shading.background_type = "VIEWPORT"
    scene.world = scene.world or bpy.data.worlds.new("w")
    scene.world.color = (0.18, 0.28, 0.24)
    shading.background_color = (0.18, 0.28, 0.24)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    centre = Vector(focus) if focus else Vector((0, 0, height / 2))
    cam_data.ortho_scale = zoom or height * 1.15
    for name, az, el in views:
        a, e = math.radians(az), math.radians(el)
        d = 6.0
        cam.location = centre + Vector((math.sin(a) * math.cos(e) * -d * -1, -math.cos(a) * math.cos(e) * d, math.sin(e) * d))
        cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{path}-{name}.png"
        bpy.ops.render.render(write_still=True)
