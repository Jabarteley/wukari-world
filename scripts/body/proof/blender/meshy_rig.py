"""Binds a reduced generated character to the game's 23-bone skeleton.

  blender --background --disable-autoexec --python meshy_rig.py -- <reduced.blend> <skeleton.json> <out-parts.glb> <out-joints.json> <stylised|realistic> [<landmarks.json>] [--hem 0.13] [--obj Low]

* stylised: the file's own skeleton and weights are used (joint names are mapped to the 23 bones, extra joints folded into their parents).
* realistic: no skeleton in the file, so one is built from the landmarks file (fractions of the character's height) and weighted automatically.
Then, for both: the A-pose is applied to the mesh (arms raised to the game skeleton's rest pose, not left as an offset), the character is scaled so the
pelvis sits at the game skeleton's pelvis height, the wrapper (skirt) is re-weighted so both thighs move it and the centre follows the pelvis,
weights are smoothed, limited to four influences and normalised, and the parts file plus the joint positions are written for meshy_assemble.ts.
Every path is an argument.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, skel_json, out_glb, out_joints, kind = pos[:5]
face_json = opts.get('--face')
landmarks = pos[5] if len(pos) > 5 else None
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects[opts.get("--obj", "Low")]
game = json.load(open(skel_json))
BONES = ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
         "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r", "thigh_l", "calf_l", "foot_l", "ball_l", "thigh_r", "calf_r", "foot_r", "ball_r"]
MIX = {"Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03", "Neck": "neck_01", "Head": "Head"}
for side, s in (("Left", "l"), ("Right", "r")):
    MIX.update({f"{side}Shoulder": f"clavicle_{s}", f"{side}Arm": f"upperarm_{s}", f"{side}ForeArm": f"lowerarm_{s}", f"{side}Hand": f"hand_{s}",
                f"{side}UpLeg": f"thigh_{s}", f"{side}Leg": f"calf_{s}", f"{side}Foot": f"foot_{s}", f"{side}ToeBase": f"ball_{s}"})
bbox = [low.matrix_world @ Vector(c) for c in low.bound_box]
zmin = min(v.z for v in bbox); zmax = max(v.z for v in bbox)
H = zmax - zmin

# ---------------------------------------------------------------- the source skeleton
arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if kind == "realistic" or arm is None:
    lm = json.load(open(landmarks))   # {"Hips": [x, z], ...} x to the character's left, both as fractions of the height from the soles
    bpy.ops.object.select_all(action="DESELECT")
    data = bpy.data.armatures.new("rig"); arm = bpy.data.objects.new("rig", data); bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    cy = lm.get("_y", 0.0)
    chain = [("Hips", None), ("Spine", "Hips"), ("Spine1", "Spine"), ("Spine2", "Spine1"), ("Neck", "Spine2"), ("Head", "Neck")]
    for side in ("Left", "Right"):
        chain += [(f"{side}Shoulder", "Spine2"), (f"{side}Arm", f"{side}Shoulder"), (f"{side}ForeArm", f"{side}Arm"), (f"{side}Hand", f"{side}ForeArm"),
                  (f"{side}UpLeg", "Hips"), (f"{side}Leg", f"{side}UpLeg"), (f"{side}Foot", f"{side}Leg"), (f"{side}ToeBase", f"{side}Foot")]
    P = {}
    for n, _ in chain:
        x, z = lm[n][:2]; yo = lm[n][2] if len(lm[n]) > 2 else 0.0
        P[n] = Vector((x * H, (cy + yo) * H, zmin + z * H))
    tails = {"Head": Vector((0, cy * H, zmin + lm["_top"] * H)), "LeftHand": None, "RightHand": None, "LeftToeBase": None, "RightToeBase": None}
    kids = {}
    for n, p in chain:
        if p:
            kids.setdefault(p, []).append(n)
    for n, p in chain:
        b = data.edit_bones.new(n)
        b.head = P[n]
        if n in tails and tails[n] is not None:
            b.tail = tails[n]
        elif n in kids:
            b.tail = P[kids[n][0]]
        elif n.endswith("Hand"):
            b.tail = P[n] + (P[n] - P[n.replace("Hand", "ForeArm")]).normalized() * 0.09 * H
        else:
            b.tail = P[n] + Vector((0, -0.08 * H, 0))
        if (b.tail - b.head).length < 1e-4:
            b.tail = b.head + Vector((0, 0, 0.03))
    for n, p in chain:
        if p:
            data.edit_bones[n].parent = data.edit_bones[p]
    bpy.ops.object.mode_set(mode="OBJECT")
    # weights from the distance to each bone's segment (automatic bone-heat weights fail on the thin arms of a mesh like this one)
    low.parent = arm; low.matrix_parent_inverse = arm.matrix_world.inverted()
    low.modifiers.new("Armature", "ARMATURE").object = arm
    seg = {"Hips": ("Hips", "Spine"), "Spine": ("Spine", "Spine1"), "Spine1": ("Spine1", "Spine2"), "Spine2": ("Spine2", "Neck"), "Neck": ("Neck", "Head")}
    ends = {"Head": Vector((0, cy * H, zmin + lm["_top"] * H))}
    for side in ("Left", "Right"):
        seg.update({f"{side}Shoulder": (f"{side}Shoulder", f"{side}Arm"), f"{side}Arm": (f"{side}Arm", f"{side}ForeArm"), f"{side}ForeArm": (f"{side}ForeArm", f"{side}Hand"),
                    f"{side}UpLeg": (f"{side}UpLeg", f"{side}Leg"), f"{side}Leg": (f"{side}Leg", f"{side}Foot"), f"{side}Foot": (f"{side}Foot", f"{side}ToeBase")})
        ends[f"{side}Hand"] = P[f"{side}Hand"] + (P[f"{side}Hand"] - P[f"{side}ForeArm"]).normalized() * 0.09 * H
        ends[f"{side}ToeBase"] = P[f"{side}ToeBase"] + Vector((0, -0.05 * H, 0))
    segs = {}
    for n, (h, t) in seg.items():
        segs[n] = (P[h], P[t])
    for n, e in ends.items():
        segs[n] = (P[n], e)

    def dist(pt, a_, b_):
        ab = b_ - a_; t_ = max(0.0, min(1.0, (pt - a_).dot(ab) / max(ab.dot(ab), 1e-12)))
        return (pt - (a_ + ab * t_)).length
    vg = {n: low.vertex_groups.new(name=n) for n in segs}
    for v in low.data.vertices:
        ax = abs(v.co.x) / H

        def gate(n):    # the arm bones cannot pull on the torso, hips or skirt beside them
            lo_, span = {"Arm": (0.045, 0.04), "ForeArm": (0.10, 0.04), "Hand": (0.12, 0.04)}.get(n[4:] if n.startswith("Left") else n[5:], (None, None))
            if lo_ is None:
                return 0.0
            t_ = max(0.0, min(1.0, (ax - lo_) / span)); return (1.0 - t_ * t_ * (3 - 2 * t_)) * 0.6 * H
        wt = sorted(((dist(v.co, *segs[n]) + gate(n), n) for n in segs))[:3]
        raw = [(1.0 / (d + 0.012 * H) ** 4, n) for d, n in wt]
        tot = sum(r for r, _ in raw)
        for r, n in raw:
            vg[n].add([v.index], r / tot, "REPLACE")
else:
    for m in list(low.modifiers):
        low.modifiers.remove(m)
    m = low.modifiers.new("Armature", "ARMATURE"); m.object = arm
    low.parent = arm
    low.matrix_parent_inverse = arm.matrix_world.inverted()

bpy.context.view_layer.update()
bones = arm.data.bones


def game_of(name):
    b = bones.get(name)
    while b is not None:
        n = b.name.split(":")[-1]
        if n in MIX:
            return MIX[n]
        b = b.parent
    return None


# ---------------------------------------------------------------- raise the arms from the A-pose to the game skeleton's T-pose, then apply
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
M = arm.matrix_world


def pb_of(short):
    for b in arm.pose.bones:
        if b.name.split(":")[-1] == short:
            return b


angles = {}
for side, sx in (("Left", 1), ("Right", -1)):
    a_, f_ = pb_of(f"{side}Arm"), pb_of(f"{side}ForeArm")
    d = (M @ f_.head - M @ a_.head)
    tgt = Vector((1 if d.x > 0 else -1, 0.0, 0.0))
    # the game skeleton's upper arm points straight out; raise it about the shoulder
    q = d.normalized().rotation_difference(tgt)
    angles[side] = math.degrees(q.angle)
    h = M @ a_.head
    R = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)
    a_.matrix = M.inverted() @ (R @ (M @ a_.matrix))
    bpy.context.view_layer.update()
    # the forearm and hand follow rigidly; straighten the elbow too so the whole arm lies along the axis
    d2 = (M @ pb_of(f"{side}Hand").head - M @ f_.head)
    q2 = d2.normalized().rotation_difference(tgt)
    h2 = M @ f_.head
    R2 = Matrix.Translation(h2) @ q2.to_matrix().to_4x4() @ Matrix.Translation(-h2)
    f_.matrix = M.inverted() @ (R2 @ (M @ f_.matrix))
    bpy.context.view_layer.update()
joints_world = {n.split(":")[-1]: M @ arm.pose.bones[n].head for n in [b.name for b in arm.pose.bones]}
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.objects.active = low
bpy.ops.object.select_all(action="DESELECT"); low.select_set(True)
mod = next(m for m in low.modifiers if m.type == "ARMATURE")
xs_before = [v.co.x for v in low.data.vertices]
bpy.ops.object.modifier_apply(modifier=mod.name)
xs_after = [v.co.x for v in low.data.vertices]
print("ARM RAISED (degrees)", angles, "x range before", round(min(xs_before), 3), round(max(xs_before), 3), "after", round(min(xs_after), 3), round(max(xs_after), 3))

# ---------------------------------------------------------------- weights per vertex in game-bone terms
me = low.data
gnames = {g.index: g.name for g in low.vertex_groups}
idx = {n: i for i, n in enumerate(BONES)}
W = []
for v in me.vertices:
    acc = {}
    for g in v.groups:
        t = game_of(gnames[g.group])
        if t and g.weight > 1e-4:
            acc[t] = acc.get(t, 0.0) + g.weight
    W.append(acc)

# scale so the pelvis sits at the shipped pelvis height, soles at z = 0; centre on x, pelvis y at the shipped one
g_pelvis = Vector(game["pelvis"]["head"])
zs = [(low.matrix_world @ v.co).z for v in me.vertices]
sole = min(zs)
hips = joints_world["Hips"]
s = g_pelvis.z / (hips.z - sole)
off = Vector((0, g_pelvis.y - hips.y * s, 0))
def fit(p):
    return Vector((p.x * s, p.y * s, (p.z - sole) * s)) + off
V = [fit(low.matrix_world @ v.co) for v in me.vertices]
J = {n: fit(p) for n, p in joints_world.items()}
for v, p in zip(me.vertices, V):
    v.co = p
low.matrix_world = Matrix.Identity(4)
for o in (low,):
    o.parent = None; o.matrix_world = Matrix.Identity(4)
me.update()
newH = (zmax - zmin) * s

# ---------------------------------------------------------------- the wrapper: both thighs move it, the centre follows the pelvis, the hem follows the calves a little
hem = float(opts.get("--hem", 0.13)) * newH
hipz = J["LeftUpLeg"].z
kneez = J["LeftLeg"].z
def sm(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
changed = 0
for i, p in enumerate(V):
    if p.z <= hem or p.z >= hipz + 0.02:
        continue
    t = sm((hipz - p.z) / (0.14 * newH))            # 0 at the hip joint, 1 a hand-span below
    side = max(-1.0, min(1.0, p.x / (0.085 * newH)))
    left = sm((side + 1) / 2)
    centre = 1 - abs(side)                              # 1 on the seam
    calf = 0.28 * sm((kneez - p.z) / max(kneez - hem, 1e-3)) * (1 - 0.6 * centre)
    pelvis = max(centre * 0.7, 0.15) * t
    legs = max(0.0, 1 - pelvis - calf) * t
    nw = {"pelvis": (1 - t) * W[i].get("pelvis", 0.0) + pelvis + (1 - t) * 0.0}
    for k, wv in W[i].items():
        if k not in ("thigh_l", "thigh_r", "calf_l", "calf_r", "pelvis"):
            nw[k] = nw.get(k, 0.0) + (1 - t) * wv
    for k in ("thigh_l", "thigh_r", "calf_l", "calf_r", "pelvis"):
        if k != "pelvis":
            nw.setdefault(k, 0.0)
    nw["thigh_l"] = nw.get("thigh_l", 0.0) + (1 - t) * W[i].get("thigh_l", 0.0) + legs * left
    nw["thigh_r"] = nw.get("thigh_r", 0.0) + (1 - t) * W[i].get("thigh_r", 0.0) + legs * (1 - left)
    nw["calf_l"] = nw.get("calf_l", 0.0) + (1 - t) * W[i].get("calf_l", 0.0) + calf * left * t
    nw["calf_r"] = nw.get("calf_r", 0.0) + (1 - t) * W[i].get("calf_r", 0.0) + calf * (1 - left) * t
    W[i] = nw
    changed += 1
print("WRAPPER VERTICES REWEIGHTED", changed)

# smooth over the surface (edges), limit to four influences, normalise
adj = [[] for _ in V]
for e in me.edges:
    a, b = e.vertices; adj[a].append(b); adj[b].append(a)
for it in range(int(opts.get("--smooth", 3))):
    new = []
    for i, w in enumerate(W):
        acc = {k: 0.5 * v for k, v in w.items()}
        n = max(len(adj[i]), 1)
        for j in adj[i]:
            for k, v in W[j].items():
                acc[k] = acc.get(k, 0.0) + 0.5 * v / n
        new.append(acc)
    W = new
for i, w in enumerate(W):
    top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    tot = sum(v for _, v in top) or 1.0
    W[i] = {k: v / tot for k, v in top if v / tot > 0.01}

# ---------------------------------------------------------------- the game armature at this body's joints
for g in list(low.vertex_groups):
    low.vertex_groups.remove(g)
groups = {n: low.vertex_groups.new(name=n) for n in BONES}
for i, w in enumerate(W):
    for k, v in w.items():
        groups[k].add([i], v, "REPLACE")
HEAD = {"root": Vector((0, 0, 0)), "pelvis": g_pelvis, "spine_01": J["Spine"], "spine_02": J["Spine1"], "spine_03": J["Spine2"], "neck_01": J["Neck"], "Head": J["Head"]}
for s_, sx in (("l", "Left"), ("r", "Right")):
    HEAD.update({f"clavicle_{s_}": J[f"{sx}Shoulder"], f"upperarm_{s_}": J[f"{sx}Arm"], f"lowerarm_{s_}": J[f"{sx}ForeArm"], f"hand_{s_}": J[f"{sx}Hand"],
                 f"thigh_{s_}": J[f"{sx}UpLeg"], f"calf_{s_}": J[f"{sx}Leg"], f"foot_{s_}": J[f"{sx}Foot"], f"ball_{s_}": J[f"{sx}ToeBase"]})
for n in list(bpy.data.objects):
    if n.type == "ARMATURE":
        bpy.data.objects.remove(n)
data = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", data); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
for n in BONES:
    b = data.edit_bones.new(n); b.head = HEAD[n]; b.tail = HEAD[n] + Vector((0, 0, 0.04))
for n in BONES:
    if game[n]["parent"]:
        data.edit_bones[n].parent = data.edit_bones[game[n]["parent"]]
bpy.ops.object.mode_set(mode="OBJECT")
low.parent = rig
low.modifiers.new("Armature", "ARMATURE").object = rig
# ---------------------------------------------------------------- face shape keys: jaw, mouth corners and brows move the surface the painted face sits on
if face_json:
    fs = json.load(open(face_json))
    mouth_x, mouth_z = fs["mouth"]; mw = fs["mouthW"]
    chin_z = mouth_z - 0.08; head_y = J["Head"].y
    base = low.shape_key_add(name="Basis", from_mix=False)

    def sm01(t):
        t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

    def key(name, fn):
        k = low.shape_key_add(name=name, from_mix=False)
        for i, v in enumerate(low.data.vertices):
            p = v.co
            if p.y > head_y:               # front of the face only (the character looks along -Y here)
                continue
            d = fn(p)
            if d:
                k.data[i].co = p + Vector(d)
        return k

    def jaw(amount, pucker=0.0, widen=0.0):
        def f(p):
            w = sm01((mouth_z + 0.004 - p.z) / 0.04) * sm01((p.z - (chin_z - 0.035)) / 0.035) * sm01((0.19 - abs(p.x)) / 0.07)
            if w <= 0:
                return None
            return (-p.x * pucker * w + p.x * widen * w, 0.35 * amount * w, -amount * w)
        return f
    key("visemeAA", jaw(0.032)); key("visemeOH", jaw(0.02, pucker=0.16)); key("visemeEE", jaw(0.009, widen=0.07)); key("visemeMM", lambda p: None)

    def corner(dz, dx):
        def f(p):
            w = sm01(1 - math.hypot(abs(p.x) - mw / 2, p.z - mouth_z) / 0.05)
            return (math.copysign(dx, p.x) * w, 0, dz * w) if w > 0 else None
        return f
    key("smile", corner(0.006, 0.004)); key("frown", corner(-0.006, -0.002))

    def brow(side, dz, inner_only=False):
        bx, bz = fs["browL" if side > 0 else "browR"]
        def f(p):
            if p.x * side <= 0:
                return None
            w = sm01(1 - math.hypot((p.x - bx) / 0.075, (p.z - bz) / 0.045))
            if inner_only:
                w *= sm01(1 - abs(abs(p.x) - (abs(bx) - 0.045)) / 0.05)
            return (0, 0, dz * w) if w > 0 else None
        return f
    for side, sfx in ((1, "L"), (-1, "R")):
        key("browUp" + sfx, brow(side, 0.01)); key("browDown" + sfx, brow(side, -0.007)); key("browInnerUp" + sfx, brow(side, 0.012, True))
    print("FACE KEYS", [k.name for k in low.data.shape_keys.key_blocks])

low.name = "character"
low.data.materials[0].name = "skin"
json.dump({"heads": {n: [round(c, 5) for c in HEAD[n]] for n in BONES}, "space": "blender", "height": newH, "scale": s}, open(out_joints, "w"), indent=1)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=False, export_apply=False, export_skins=True, export_morph=True, export_morph_normal=False, export_animations=False,
                          export_yup=True, export_image_format="NONE", export_materials="EXPORT", export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=out_glb.replace(".glb", ".blend"))
print("RIGGED", out_glb, "scale", s, "height", newH)
