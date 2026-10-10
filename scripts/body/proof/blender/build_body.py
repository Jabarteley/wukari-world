"""Stage 1: the base body, from the CC0 MakeHuman base mesh through MPFB, fitted to the game's animation skeleton.

  blender --background --disable-autoexec --python build_body.py -- <female|male> <skeleton.json> <out.blend> [<preview-prefix>]

1. Creates the human from the recipe in recipes.py and bakes the detail targets into the mesh.
2. Poses the MPFB rig so the arms are horizontal and the feet sit under the hips (the pose the clip pack's skeleton rests in) and
   applies that pose to the mesh.
3. Scales the body and remaps its leg heights onto the animation skeleton's hip, knee and ankle heights.
4. Fits the game-engine rig with its weights again, equips eyes, brows, lashes, teeth and tongue (CC0 system assets), drops the
   helper geometry and saves the scene.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bmesh
import bpy
import common
import recipes
from mathutils import Matrix, Vector

sex, skeleton_path, out = common.args()[:3]
prefix = common.args()[3] if len(common.args()) > 3 else None
common.reset()
Q = json.load(open(skeleton_path))

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService

macro = recipes.MACRO_FEMALE if sex == "female" else recipes.MACRO_MALE
detail = recipes.DETAIL_FEMALE if sex == "female" else recipes.DETAIL_MALE
body = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
body.name = "Body"
for name, w in detail.items():
    path = TargetService.target_full_path(name)
    if path is None:
        raise SystemExit("missing target " + name)
    TargetService.load_target(body, path, weight=w)
TargetService.bake_targets(body)

# a slightly larger head for appeal (about 1/7.2 of the height): scale the head and upper neck about the neck joint
HEAD = float(os.environ.get("AW_HEAD", "1.12"))
neck = [v.co.copy() for v in body.data.vertices if any(body.vertex_groups[g.group].name == "joint-neck" and g.weight > 0.5 for g in v.groups)]
pivot = sum(neck, Vector()) / len(neck)
for v in body.data.vertices:
    t = min(1.0, max(0.0, (v.co.z - pivot.z) / 0.06))
    w = t * t * (3 - 2 * t)
    v.co = pivot + (v.co - pivot) * (1.0 + (HEAD - 1.0) * w)
body.data.update()


def select_only(obj):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def align(arm, bone, target):
    pb = arm.pose.bones[bone]
    head = arm.matrix_world @ pb.head
    tail = arm.matrix_world @ pb.tail
    q = (tail - head).normalized().rotation_difference(Vector(target).normalized())
    m = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head)
    pb.matrix = arm.matrix_world.inverted() @ (m @ (arm.matrix_world @ pb.matrix))
    bpy.context.view_layer.update()


# 2. pose: arms horizontal, legs vertical
rig = HumanService.add_builtin_rig(body, "game_engine", import_weights=True)
bpy.context.view_layer.update()
for side, sx in (("l", 1), ("r", -1)):
    for bone in ("upperarm", "lowerarm", "hand"):
        align(rig, f"{bone}_{side}", (sx, 0, 0))
    for bone in ("thigh", "calf"):
        align(rig, f"{bone}_{side}", (0, 0, -1))
select_only(body)
bpy.ops.object.modifier_apply(modifier=[m.name for m in body.modifiers if m.type == "ARMATURE"][0])
bpy.data.objects.remove(rig)
body.parent = None
body.matrix_world = Matrix.Identity(4)

# 3. scale and leg remap onto the animation skeleton
hv = {n: Vector(q) for n, q in ((k, Q[k]["head"]) for k in Q)}
vg = body.vertex_groups


def joint_z(group):
    zs = [body.data.vertices[v.index].co.z for v in body.data.vertices if any(g.group == vg[group].index and g.weight > 0.5 for g in v.groups)]
    return sum(zs) / len(zs)


def joint_y(group):
    ys = [body.data.vertices[v.index].co.y for v in body.data.vertices if any(g.group == vg[group].index and g.weight > 0.5 for g in v.groups)]
    return sum(ys) / len(ys)


hip_z, knee_z, ankle_z = joint_z("joint-l-upper-leg"), joint_z("joint-l-knee"), joint_z("joint-l-ankle")
SCALE = float(os.environ.get("AW_SCALE", "1.08"))
hip_s, knee_s, ankle_s = hip_z * SCALE, knee_z * SCALE, ankle_z * SCALE
qh, qk, qa = hv["thigh_l"].z, hv["calf_l"].z, hv["foot_l"].z
ydelta = hv["thigh_l"].y - joint_y("joint-l-upper-leg") * SCALE


def remap(z):
    z *= SCALE
    if z >= hip_s:
        return z - hip_s + qh
    if z >= knee_s:
        return qk + (z - knee_s) / (hip_s - knee_s) * (qh - qk)
    if z >= ankle_s:
        return qa + (z - ankle_s) / (knee_s - ankle_s) * (qk - qa)
    return z / ankle_s * qa


for v in body.data.vertices:
    c = v.co
    v.co = Vector((c.x * SCALE, c.y * SCALE + ydelta, remap(c.z)))
body.data.update()
print("REMAP hip/knee/ankle", hip_z, knee_z, ankle_z, "->", qh, qk, qa, "height", max(v.co.z for v in body.data.vertices))

# 4. rig again on the posed, remapped mesh; equip assets
rig = HumanService.add_builtin_rig(body, "game_engine", import_weights=True)


def asset(kind, folder, name, atype):
    root = LocationService.get_user_data(kind)
    return HumanService.add_mhclo_asset(os.path.join(root, folder, name + ".mhclo"), body, asset_type=atype, material_type="NONE", subdiv_levels=0)


asset("eyes", "high-poly", "high-poly", "Eyes")
asset("eyelashes", "eyelashes02", "eyelashes02", "Eyelashes")
asset("eyebrows", "eyebrow001", "eyebrow001", "Eyebrows")
asset("teeth", "teeth_base", "teeth_base", "Teeth")
asset("tongue", "tongue01", "tongue01", "Tongue")

# optional fitted parts (hair, shoes): "kind:name,kind:name" in AW_PARTS; they are exported as their own files
for spec in [x for x in os.environ.get("AW_PARTS", "").split(",") if x]:
    kind, pname = spec.split(":")
    asset({"hair": "hair", "shoes": "clothes"}[kind], pname, pname, {"hair": "Hair", "shoes": "Clothes"}[kind])

bm = bmesh.new()
bm.from_mesh(body.data)
deform = bm.verts.layers.deform.verify()
gi = body.vertex_groups["body"].index
bmesh.ops.delete(bm, geom=[v for v in bm.verts if gi not in v[deform] or v[deform][gi] < 0.5], context="VERTS")
bm.to_mesh(body.data)
bm.free()
for name in ("HelperGeometry", "JointCubes"):
    if name in body.vertex_groups:
        body.vertex_groups.remove(body.vertex_groups[name])
bpy.ops.wm.save_as_mainfile(filepath=out)
print("PARTS", [o.name for o in bpy.data.objects], len(body.data.vertices), tuple(body.dimensions))
if prefix:
    common.preview(prefix, views=(("front", 0, 0), ("side", 90, 0)), height=1.9, size=(900, 700), zoom=2.0)
    common.preview(prefix + "-head", views=(("front", 0, 0), ("tq", 35, 5)), focus=(0, 0, 1.64), zoom=0.45, size=(800, 800))
