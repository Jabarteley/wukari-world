"""Render matched front and side evidence images from a validated decoded scene asset."""

import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector


FRONT_YAW = 25
SIDE_YAW = 115
PITCH = 25
FIELD_OF_VIEW = 40
MARGIN = 1.08


def write_report(path, report):
    temporary = f"{path}.tmp"
    with open(temporary, "x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def triples(vector):
    return [float(vector[0]), float(vector[1]), float(vector[2])]


def imported_bounds(scene):
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    count = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for item in scene.objects:
        if item.type != "MESH":
            continue
        evaluated = item.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            point = evaluated.matrix_world @ Vector(corner)
            low = Vector(map(min, low, point))
            high = Vector(map(max, high, point))
            count += 1
    if count == 0 or not all(math.isfinite(value) for value in (*low, *high)):
        raise RuntimeError("Imported asset has no finite mesh bounds")
    return low, high


def configure_scene(scene, size):
    sun_data = bpy.data.lights.new("preview-sun", "SUN")
    sun_data.energy = 1.8
    sun = bpy.data.objects.new("preview-sun", sun_data)
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    scene.collection.objects.link(sun)

    world = bpy.data.worlds.new("preview-world")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.55, 0.62, 0.70, 1)
    background.inputs["Strength"].default_value = 0.8
    scene.world = world

    engines = {entry.identifier for entry in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else "BLENDER_EEVEE_NEXT"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False


def main():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--size", type=int, default=512)
    options = parser.parse_args(arguments)
    if options.size < 128 or options.size > 1024:
        raise SystemExit("size must be from 128 to 1024")
    if not os.path.isdir(options.out):
        raise SystemExit("output directory is missing")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=options.glb)
    bpy.context.view_layer.update()
    low, high = imported_bounds(scene)
    centre = (low + high) / 2
    radius = max((high - low).length / 2, 0.1)
    distance = radius / math.tan(math.radians(FIELD_OF_VIEW / 2)) * MARGIN
    near = max(0.001, distance - radius * 1.25)
    far = distance + radius * 2.5

    camera_data = bpy.data.cameras.new("preview-camera")
    camera_data.lens_unit = "FOV"
    camera_data.angle = math.radians(FIELD_OF_VIEW)
    camera_data.clip_start = near
    camera_data.clip_end = far
    camera = bpy.data.objects.new("preview-camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    configure_scene(scene, options.size)

    report = {
        "schema": "allworld-scene-preview-framing",
        "version": 1,
        "status": "incomplete",
        "size": options.size,
        "bounds": {"min": triples(low), "max": triples(high)},
        "centre": triples(centre),
        "radius": radius,
        "fieldOfViewDegrees": FIELD_OF_VIEW,
        "margin": MARGIN,
        "pitchDegrees": PITCH,
        "views": [],
        "clip": {"near": near, "far": far},
    }
    report_path = os.path.join(options.out, "framing.json")
    write_report(report_path, report)
    for name, yaw in (("front", FRONT_YAW), ("side", SIDE_YAW)):
        yaw_radians = math.radians(yaw)
        pitch_radians = math.radians(PITCH)
        direction = Vector((
            math.sin(yaw_radians) * math.cos(pitch_radians),
            -math.cos(yaw_radians) * math.cos(pitch_radians),
            math.sin(pitch_radians),
        ))
        camera.location = centre + direction * distance
        camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(options.out, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        report["views"].append({"name": name, "yawDegrees": yaw, "file": f"{name}.png"})
        write_report(report_path, report)
    report["status"] = "complete"
    write_report(report_path, report)


main()
