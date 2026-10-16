"""Render a .glb to a PNG for a look before it is kept (docs/ASSET-PIPELINE.md). Not part of any build.

    blender --background --factory-startup --python scripts/assets/blender/preview.py -- --glb in.glb --png out.png
        [--clip punch --frame 0.4] [--yaw 35] [--pitch 25] [--size 640]

Imports the file with Blender's own glTF importer (an uncompressed file: run prepare.ts with --no-meshopt into a scratch folder
first, or pass the fetched file), frames its bounds from a three-quarter view under one sun, and renders with EEVEE. With --clip,
the named animation is posed at --frame (0..1 of its length) first.
"""
import argparse
import math
import sys

import bpy
from mathutils import Vector


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--glb', required=True)
    p.add_argument('--png', required=True)
    p.add_argument('--clip')
    p.add_argument('--frame', type=float, default=0.5)
    p.add_argument('--yaw', type=float, default=35.0)
    p.add_argument('--pitch', type=float, default=25.0)
    p.add_argument('--size', type=int, default=640)
    a = p.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=a.glb)
    if a.clip:
        action = bpy.data.actions.get(a.clip)
        if action is None:
            raise SystemExit(f'no clip {a.clip}; has {[x.name for x in bpy.data.actions]}')
        start, end = action.frame_range
        # One action per clip, with one slot per animated object (a rig, or each part of a node-animated model).
        slots = {s.name_display: s for s in getattr(action, 'slots', [])}
        for o in scene.objects:
            if o.name in slots or (not slots and o.animation_data is not None):
                o.animation_data_create().action = action
                if o.name in slots:
                    o.animation_data.action_slot = slots[o.name]
        scene.frame_set(int(round(start + (end - start) * a.frame)))
    bpy.context.view_layer.update()
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    for o in scene.objects:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 0.1)
    yaw, pitch = math.radians(a.yaw), math.radians(a.pitch)
    distance = radius / math.tan(math.radians(20)) * 1.05
    eye = centre + Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch))) * distance
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens_unit = 'FOV'
    cam_data.angle = math.radians(40)
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    cam.location = eye
    cam.rotation_euler = (centre - eye).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3.0
    sun = bpy.data.objects.new('sun', sun_data)
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('world')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.70, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    scene.world = world
    scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in {e.identifier for e in scene.render.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = scene.render.resolution_y = a.size
    scene.render.filepath = a.png
    bpy.ops.render.render(write_still=True)


main()
