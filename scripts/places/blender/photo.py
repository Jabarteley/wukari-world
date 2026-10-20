"""Photo-matched render: the model seen from the viewpoint of a reference photo, so an agent can compare them side by side.

    photo.render(path, objs, camera, ground_hex, warnings=None, size=768)

camera (PlaceModelV2 `camera`): {"yawDeg": 35, "pitchDeg": 12, "fovDeg": 50, "aspect": 1.333, "fit": "building"|"all", "margin": 0.05,
"lookAtZ": null, "shiftX": 0, "shiftY": 0}. yawDeg 0 looks at the front (-Y) facade straight on; positive yaw moves the camera to the
right (+X side), like the standard preview; pitchDeg is the elevation above the horizon; fovDeg the HORIZONTAL field of view. The camera
is placed on that bearing and pulled back until the building (or the whole model with fit "all") just fits; shiftX/shiftY (fractions
of the frame) reframe the result. Same sun, sky and ground as the standard preview, so colours are comparable.
"""
import math

import bpy
from mathutils import Vector

import lib
from lib import render as _r


def render(path, objs, camera, ground_hex='#9aa08c', warnings=None, size=768):
    cam_spec = camera if isinstance(camera, dict) else {}

    def num(key, default, lo, hi):
        try:
            v = float(cam_spec.get(key, default))
        except (TypeError, ValueError):
            v = default
        if v != v or v < lo or v > hi:
            if warnings is not None and key in cam_spec:
                warnings.append(f'camera.{key} {cam_spec.get(key)!r} outside [{lo}, {hi}], clamped')
            v = max(lo, min(hi, v if v == v else default))
        return v

    yaw, pitch = num('yawDeg', 30, -180, 180), num('pitchDeg', 10, -10, 80)
    fov, aspect, margin = num('fovDeg', 50, 15, 110), num('aspect', 4 / 3, 0.5, 2.5), num('margin', 0.05, 0.0, 0.4)
    building = [o for o in objs if not o.name.endswith('-site')] or objs
    fit_objs = objs if cam_spec.get('fit') == 'all' else building
    lo, hi = lib.bounds(fit_objs)
    blo, bhi = lib.bounds(building)
    centre = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    span = max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    sc = bpy.context.scene
    _r._engine(sc, ['BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'])
    sc.render.resolution_x = size
    sc.render.resolution_y = max(64, int(round(size / aspect)))
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    for attr, val in (('taa_render_samples', 24), ('use_raytracing', True), ('use_shadows', True), ('shadow_ray_count', 2),
                      ('shadow_step_count', 6), ('use_gtao', True), ('gtao_distance', max(2.0, span * 0.04)), ('gtao_factor', 1.0)):
        try:
            setattr(sc.eevee, attr, val)
        except Exception:  # noqa: BLE001
            pass
    world = bpy.data.worlds.new('photo-world')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*lib.lin((0.70, 0.80, 0.92)), 1.0)
    bg.inputs['Strength'].default_value = 0.85
    sc.world = world
    gm = bpy.data.materials.new('photo-ground')
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lib.lin(lib.rgb(ground_hex)), 1.0)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=1, location=(centre.x, centre.y, blo[2] - 0.04))
    plane = bpy.context.active_object
    plane.scale = (span * 60, span * 60, 1)
    plane.data.materials.append(gm)
    sun_d = bpy.data.lights.new('psun', 'SUN')
    sun_d.energy = 3.2
    sun_d.angle = math.radians(6)
    sun = bpy.data.objects.new('psun', sun_d)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (-Vector((-0.55, -0.65, 0.95))).to_track_quat('-Z', 'Y').to_euler()
    cam_d = bpy.data.cameras.new('pcam')
    cam_d.sensor_fit = 'HORIZONTAL'
    cam_d.sensor_width = 36.0
    cam_d.lens = 18.0 / math.tan(math.radians(fov) / 2)
    cam = bpy.data.objects.new('pcam', cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    a, e = math.radians(yaw), math.radians(pitch)
    direction = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    _r._fit(sc, cam, centre, direction, _r._corners(lo, hi, fit_objs), margin=margin)
    cam_d.shift_x += num('shiftX', 0.0, -1, 1)
    cam_d.shift_y += num('shiftY', 0.0, -1, 1)
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    for o in (plane, sun, cam):
        bpy.data.objects.remove(o, do_unlink=True)
