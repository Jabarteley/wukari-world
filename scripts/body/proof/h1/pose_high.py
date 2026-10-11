"""Brings a generated A-pose character to the game skeleton's rest pose and the game's leg proportions, on the full-detail mesh.

  blender --background --disable-autoexec --python pose_high.py -- <rigged.glb> <detail.glb> <skeleton.json> <out.blend> <out-joints.json> [--hip-ratio 0.52]

<rigged.glb> carries the generator's 24-joint skeleton and skin weights on a light mesh; <detail.glb> is the same character as a heavy static mesh
(same pose and shape).  The weights are carried over to the heavy mesh by nearest surface, the arms are brought level and the legs upright (limb directions equal to the game
skeleton's rest directions: the clips are authored against those, so each limb must start from the same direction), the legs are lengthened or shortened
so the hip joints sit at the given fraction of the height (the game's skeleton has them near half), and the figure is scaled so the thigh joints sit
at the game's, with the soles on the floor.  Writes the heavy mesh as "High" (vertex groups named after the generator's joints, no armature) and the joint positions.
Every path is an argument.
"""
import json
import math
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
rigged, detail, skel_json, out_blend, out_joints = pos[:5]
hip_ratio = float(opts.get("--hip-ratio", 0.52))
game = json.load(open(skel_json))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=rigged)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
light = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.polygons))
light.name = "Light"
for o in bpy.data.objects:
    o.animation_data_clear()
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
M = arm.matrix_world.copy()
before = {o.name for o in bpy.data.objects}
bpy.ops.import_scene.gltf(filepath=detail)
high = max((o for o in bpy.data.objects if o.name not in before and o.type == "MESH"), key=lambda o: len(o.data.polygons))
for o in list(bpy.data.objects):
    if o.name not in before and o is not high:
        bpy.data.objects.remove(o)
high.name = "High"
high.parent = None
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); bpy.context.view_layer.objects.active = high
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def bbox(o):
    pts = np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])
    return pts.min(axis=0), pts.max(axis=0)


lmin, lmax = bbox(light)
hmin, hmax = bbox(high)
# the heavy mesh is the same character at another size: match the soles, the height and the centre line of the A-pose arms
k = (lmax[2] - lmin[2]) / (hmax[2] - hmin[2])
for v in high.data.vertices:
    p = v.co
    v.co = Vector(((p.x - (hmin[0] + hmax[0]) / 2) * k + (lmin[0] + lmax[0]) / 2, (p.y - (hmin[1] + hmax[1]) / 2) * k + (lmin[1] + lmax[1]) / 2, (p.z - hmin[2]) * k + lmin[2]))
high.data.update()
hmin, hmax = bbox(high)
print("ALIGN scale", k, "light", lmin, lmax, "high", hmin, hmax)
H0 = lmax[2] - lmin[2]

# ---------------------------------------------------------------- skin weights from the light mesh onto the heavy one
for g in light.vertex_groups:
    if g.name not in high.vertex_groups:
        high.vertex_groups.new(name=g.name)
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc
light.data.calc_loop_triangles()
lverts = [light.matrix_world @ v.co for v in light.data.vertices]
lw = [{g.group: g.weight for g in v.groups} for v in light.data.vertices]
ltris = [tuple(t.vertices) for t in light.data.loop_triangles]
bvh = BVHTree.FromPolygons(lverts, ltris)
gnames = {g.index: g.name for g in light.vertex_groups}
hg = {g.name: g for g in high.vertex_groups}
for v in high.data.vertices:
    loc, nrm, fi, dist = bvh.find_nearest(v.co)
    tri = ltris[fi]
    ws = poly_3d_calc([lverts[i] for i in tri], loc)
    acc = {}
    for wt, i in zip(ws, tri):
        for gi, gw in lw[i].items():
            acc[gi] = acc.get(gi, 0.0) + wt * gw
    for gi, gw in acc.items():
        if gw > 1e-4:
            hg[gnames[gi]].add([v.index], gw, "REPLACE")
print("WEIGHTED VERTS", sum(1 for v in high.data.vertices if len(v.groups)), "of", len(high.data.vertices), "light weighted", sum(1 for v in light.data.vertices if len(v.groups)))
# normalise
for v in high.data.vertices:
    tot = sum(g.weight for g in v.groups)
    if tot > 0:
        for g in v.groups:
            high.vertex_groups[g.group].add([v.index], g.weight / tot, "REPLACE")
mod = high.modifiers.new("Armature", "ARMATURE"); mod.object = arm

# ---------------------------------------------------------------- limbs to the game's rest directions
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
P = {b.name: b for b in arm.pose.bones}
Minv = M.inverted()


def head(name):
    return M @ P[name].head


def aim(name, child, target):
    pb = P[name]
    d = (head(child) - head(name)).normalized()
    q = d.rotation_difference(Vector(target).normalized())
    h = head(name)
    R = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)
    pb.matrix = Minv @ (R @ (M @ pb.matrix))
    bpy.context.view_layer.update()
    return math.degrees(q.angle)


moved = {}
for side, sx in (("Left", 1), ("Right", -1)):
    moved[side + "Arm"] = aim(f"{side}Arm", f"{side}ForeArm", (sx, 0, 0))
    moved[side + "ForeArm"] = aim(f"{side}ForeArm", f"{side}Hand", (sx, 0, 0))
    moved[side + "UpLeg"] = aim(f"{side}UpLeg", f"{side}Leg", (0, 0, -1))
    moved[side + "Leg"] = aim(f"{side}Leg", f"{side}Foot", (0, 0, -1))
    # the game's foot points forward and down at the shipped pitch
    gf, gb = Vector(game["foot_l"]["head"]), Vector(game["ball_l"]["head"])
    moved[side + "Foot"] = aim(f"{side}Foot", f"{side}ToeBase", (0, (gb - gf).y, (gb - gf).z))
print("LIMBS MOVED (degrees)", {k_: round(v, 1) for k_, v in moved.items()})
J0 = {n: head(n).copy() for n in P}
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); bpy.context.view_layer.objects.active = high
dg = bpy.context.evaluated_depsgraph_get()
ev = high.evaluated_get(dg)
pts_a = np.array([v.co[:] for v in high.data.vertices]); pts_b = np.array([v.co[:] for v in ev.data.vertices])
print("DEFORM max displacement", np.abs(pts_a - pts_b).max(), "arm pose position", arm.data.pose_position, "mod", high.modifiers[0].object.name, high.modifiers[0].show_viewport)
bpy.ops.object.modifier_apply(modifier="Armature")
for v in high.data.vertices:
    pass

# ---------------------------------------------------------------- the leg warp: stretch the span between the ankle and the hip joint (vertical scale profile, smoothed)
Z = {n: J0[n].z for n in J0}
ankle = (Z["LeftFoot"] + Z["RightFoot"]) / 2
knee = (Z["LeftLeg"] + Z["RightLeg"]) / 2
hipz = (Z["LeftUpLeg"] + Z["RightUpLeg"]) / 2
top = max(v.co.z for v in high.data.vertices)
sole = min(v.co.z for v in high.data.vertices)
hip_target = sole + hip_ratio * (top - sole)
knee_frac = 0.51     # the game skeleton: knee at 0.51 of the way from ankle to hip
k_leg = (hip_target - ankle) / (hipz - ankle)
k_up = ((top - sole) - (hip_target - sole)) / (top - hipz)
print("WARP ankle", ankle, "knee", knee, "hip", hipz, "->", hip_target, "leg factor", k_leg, "upper factor", k_up)
zs = np.arange(sole - 0.05, top + 0.05, 0.001)
prof = np.ones_like(zs)
k1 = (knee_frac * (hip_target - ankle)) / (knee - ankle)
k2 = ((1 - knee_frac) * (hip_target - ankle)) / (hipz - knee)
prof[(zs >= ankle) & (zs < knee)] = k1
prof[(zs >= knee) & (zs < hipz)] = k2
prof[zs >= hipz] = k_up
w = 61
pad = np.pad(prof, (w // 2, w // 2), mode="edge")
prof_s = np.convolve(pad, np.ones(w) / w, mode="valid")
fz = np.concatenate([[0.0], np.cumsum(prof_s[:-1] * 0.001)]) + (sole - 0.05)
# keep the soles and the crown fixed
fz += (sole - fz[np.searchsorted(zs, sole)])
def warp(z):
    return float(np.interp(z, zs, fz))
for v in high.data.vertices:
    v.co.z = warp(v.co.z)
high.data.update()
J1 = {n: Vector((p.x, p.y, warp(p.z))) for n, p in J0.items()}

# ---------------------------------------------------------------- scale to the game's thigh joints, soles on the floor, hips centred on the game's
gth = (Vector(game["thigh_l"]["head"]) + Vector(game["thigh_r"]["head"])) / 2
zs_ = [v.co.z for v in high.data.vertices]
sole = min(zs_)
th = (J1["LeftUpLeg"] + J1["RightUpLeg"]) / 2
s = gth.z / (th.z - sole)
off = Vector((-th.x * s, gth.y - th.y * s, 0))
for v in high.data.vertices:
    p = v.co
    v.co = Vector((p.x * s, p.y * s, (p.z - sole) * s)) + off
high.data.update()
J = {n: Vector((p.x * s, p.y * s, (p.z - sole) * s)) + off for n, p in J1.items()}
height = (top - sole) * s if False else max(v.co.z for v in high.data.vertices)
for o in list(bpy.data.objects):
    if o is not high:
        bpy.data.objects.remove(o)
for m in list(high.modifiers):
    high.modifiers.remove(m)
bpy.context.view_layer.update()
json.dump({"joints": {n: [round(c, 5) for c in p] for n, p in J.items()}, "height": height, "scale": s, "hipRatioBefore": (hipz - sole) / (top - sole), "hipRatio": hip_ratio, "unscaledHeight": H0}, open(out_joints, "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print("POSED", out_blend, "height", height, "scale", s)
