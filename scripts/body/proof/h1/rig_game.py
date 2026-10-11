"""Binds a reduced character (from pose_high.py and reduce_figure.py) to the game's 23-bone skeleton.

  blender --background --disable-autoexec --python rig_game.py -- <reduced.blend> <skeleton.json> <joints.json> <out-parts.glb> <out-parts-joints.json> [--wrapper 0|1] [--hem 0.13] [--face face.json]

The mesh "Low" is already in the game's rest pose with its soles on the floor and carries the generator's 24 joint groups.  The groups are folded onto the
game's 23 bones (the head-end and head-front helpers into the head), the 23 bones are placed at this character's own joint positions
(pelvis at the game's), weights are smoothed, limited to four influences and normalised, and a skirt-like garment (--wrapper 1) is re-weighted so both thighs move it.
Every path is an argument.
"""
import json
import math
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, skel_json, joints_json, out_glb, out_joints = pos[:5]
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]
game = json.load(open(skel_json))
jd = json.load(open(joints_json))
J = {n: Vector(p) for n, p in jd["joints"].items()}
BONES = ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
         "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r", "thigh_l", "calf_l", "foot_l", "ball_l", "thigh_r", "calf_r", "foot_r", "ball_r"]
MIX = {"Hips": "pelvis", "Spine02": "spine_01", "Spine01": "spine_02", "Spine": "spine_03", "neck": "neck_01", "Head": "Head", "head_end": "Head", "headfront": "Head"}
for side, s in (("Left", "l"), ("Right", "r")):
    MIX.update({f"{side}Shoulder": f"clavicle_{s}", f"{side}Arm": f"upperarm_{s}", f"{side}ForeArm": f"lowerarm_{s}", f"{side}Hand": f"hand_{s}",
                f"{side}UpLeg": f"thigh_{s}", f"{side}Leg": f"calf_{s}", f"{side}Foot": f"foot_{s}", f"{side}ToeBase": f"ball_{s}"})
PRIMARY = {g: v for v, g in MIX.items() if g != "Head"}
PRIMARY["Head"] = "Head"
me = low.data
for m in list(low.modifiers):
    low.modifiers.remove(m)
low.parent = None
low.matrix_world = Matrix.Identity(4)
gnames = {g.index: g.name for g in low.vertex_groups}
unknown = set(gnames.values()) - set(MIX) - {"protect"}   # the reducer's own helper group
if unknown:
    raise RuntimeError(f"mesh has groups that are not the generator's joints: {sorted(unknown)}")
W = []
for v in me.vertices:
    acc = {}
    for g in v.groups:
        if gnames[g.group] == "protect":
            continue
        t = MIX[gnames[g.group]]
        if g.weight > 1e-4:
            acc[t] = acc.get(t, 0.0) + g.weight
    W.append(acc)
V = [v.co.copy() for v in me.vertices]
zs = [p.z for p in V]
newH = max(zs) - min(zs)
if "--part" not in opts and abs(min(zs)) > 0.01:
    raise RuntimeError(f"soles are not on the floor: {min(zs)}")

# ---------------------------------------------------------------- an optional skirt-like garment: both thighs move it, the centre follows the pelvis
def sm(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


if opts.get("--wrapper", "0") == "1":
    hem = float(opts.get("--hem", 0.13)) * newH
    hipz = J["LeftUpLeg"].z
    kneez = J["LeftLeg"].z
    changed = 0
    for i, p in enumerate(V):
        if p.z <= hem or p.z >= hipz + 0.02:
            continue
        t = sm((hipz - p.z) / (0.14 * newH))
        side = max(-1.0, min(1.0, p.x / (0.085 * newH)))
        left = sm((side + 1) / 2)
        centre = 1 - abs(side)
        calf = 0.28 * sm((kneez - p.z) / max(kneez - hem, 1e-3)) * (1 - 0.6 * centre)
        pelvis = max(centre * 0.7, 0.15) * t
        legs = max(0.0, 1 - pelvis - calf) * t
        nw = {"pelvis": (1 - t) * W[i].get("pelvis", 0.0) + pelvis}
        for k, wv in W[i].items():
            if k not in ("thigh_l", "thigh_r", "calf_l", "calf_r", "pelvis"):
                nw[k] = nw.get(k, 0.0) + (1 - t) * wv
        nw["thigh_l"] = (1 - t) * W[i].get("thigh_l", 0.0) + legs * left
        nw["thigh_r"] = (1 - t) * W[i].get("thigh_r", 0.0) + legs * (1 - left)
        nw["calf_l"] = (1 - t) * W[i].get("calf_l", 0.0) + calf * left * t
        nw["calf_r"] = (1 - t) * W[i].get("calf_r", 0.0) + calf * (1 - left) * t
        W[i] = nw
        changed += 1
    print("WRAPPER VERTICES REWEIGHTED", changed)

# ---------------------------------------------------------------- spine: the game's chain is placed at fixed fractions between pelvis and neck, and the generator's
# spine weights are redistributed by height onto it, so the trunk bends where the clips bend it (the clips were authored against the game's torso)
g_pelvis = Vector(game["pelvis"]["head"])
SPINE = ["pelvis", "spine_01", "spine_02", "spine_03"]
neck_j = J["neck"]
span = game["neck_01"]["head"][2] - g_pelvis.z
SPINE_POS = {"pelvis": g_pelvis}
for k_ in SPINE[1:]:
    f_ = (game[k_]["head"][2] - g_pelvis.z) / span
    SPINE_POS[k_] = Vector((neck_j.x * f_, g_pelvis.y + (neck_j.y - g_pelvis.y) * f_, g_pelvis.z + (neck_j.z - g_pelvis.z) * f_))
if opts.get("--respine", "1") == "1":
    zk = [SPINE_POS[k_].z for k_ in SPINE]
    for i, p in enumerate(V):
        S = sum(W[i].get(k_, 0.0) for k_ in SPINE)
        if S <= 0 or p.z <= zk[0]:
            continue
        if p.z >= zk[3]:
            dist = [0, 0, 0, 1.0]
        else:
            j = max(m_ for m_ in range(3) if p.z >= zk[m_]); t_ = (p.z - zk[j]) / (zk[j + 1] - zk[j])
            dist = [0, 0, 0, 0]; dist[j] = 1 - t_; dist[j + 1] = t_
        for k_ in SPINE:
            W[i].pop(k_, None)
        for k_, d_ in zip(SPINE, dist):
            if d_ > 0:
                W[i][k_] = S * d_

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

# ---------------------------------------------------------------- the seam: every part that touches the neck is weighted by the same function of the height above the cut,
# so a head from one figure and a body from another move as one piece at the neck
if "--neck-cut" in opts:
    cut = float(opts["--neck-cut"])
    nc = J["neck"]
    for i, p in enumerate(V):
        u = p.z - cut
        if u < -0.05:
            continue
        # only the neck and its collar: the shoulders and arms next to it keep their own weights
        f = 1.0 - sm((math.hypot(p.x - nc.x, p.y - nc.y) - 0.10) / 0.05)
        if f <= 0.0:
            continue
        if u < 0.0:
            t = sm((u + 0.05) / 0.05); new = {k: (1 - t) * v for k, v in W[i].items()}; new["neck_01"] = new.get("neck_01", 0.0) + t
        elif u < 0.03:
            new = {"neck_01": 1.0}
        elif u < 0.09:
            s_ = sm((u - 0.03) / 0.06); new = {"neck_01": 1 - s_, "Head": s_}
        else:
            new = {"Head": 1.0}
        mixed = {k: (1 - f) * v for k, v in W[i].items()}
        for k, v in new.items():
            mixed[k] = mixed.get(k, 0.0) + f * v
        W[i] = mixed

for g in list(low.vertex_groups):
    low.vertex_groups.remove(g)
groups = {n: low.vertex_groups.new(name=n) for n in BONES}
for i, w in enumerate(W):
    for k, v in w.items():
        groups[k].add([i], v, "REPLACE")

# ---------------------------------------------------------------- the game armature at this body's joints
joint = lambda game_name: J[PRIMARY[game_name]]
HEAD = {"root": Vector((0, 0, 0)), "pelvis": g_pelvis, "spine_01": SPINE_POS["spine_01"], "spine_02": SPINE_POS["spine_02"], "spine_03": SPINE_POS["spine_03"], "neck_01": joint("neck_01"), "Head": joint("Head")}
for s_, sx in (("l", "Left"), ("r", "Right")):
    HEAD.update({f"clavicle_{s_}": J[f"{sx}Shoulder"], f"upperarm_{s_}": J[f"{sx}Arm"], f"lowerarm_{s_}": J[f"{sx}ForeArm"], f"hand_{s_}": J[f"{sx}Hand"],
                 f"thigh_{s_}": J[f"{sx}UpLeg"], f"calf_{s_}": J[f"{sx}Leg"], f"foot_{s_}": J[f"{sx}Foot"], f"ball_{s_}": J[f"{sx}ToeBase"]})
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
head_y = HEAD["Head"].y

# ---------------------------------------------------------------- face shape keys: jaw, mouth corners and brows move the surface the face sits on
if "--face" in opts:
    fs = json.load(open(opts["--face"]))
    mouth_x, mouth_z = fs["mouth"]; mw = fs["mouthW"]
    chin_z = mouth_z - fs.get("chinDrop", 0.08)
    sc = fs.get("scale", 1.0)
    low.shape_key_add(name="Basis", from_mix=False)

    def sm01(t):
        t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

    def key(name, fn):
        k = low.shape_key_add(name=name, from_mix=False)
        for i, v in enumerate(low.data.vertices):
            p = v.co
            if p.y > head_y:
                continue
            d = fn(p)
            if d:
                k.data[i].co = p + Vector(d)

    def jaw(amount, pucker=0.0, widen=0.0):
        def f(p):
            w = sm01((mouth_z + 0.004 * sc - p.z) / (0.04 * sc)) * sm01((p.z - (chin_z - 0.035 * sc)) / (0.035 * sc)) * sm01((0.19 * sc - abs(p.x - mouth_x)) / (0.07 * sc))
            if w <= 0:
                return None
            x = p.x - mouth_x
            return (-x * pucker * w + x * widen * w, 0.35 * amount * sc * w, -amount * sc * w)
        return f
    key("visemeAA", jaw(0.032)); key("visemeOH", jaw(0.02, pucker=0.16)); key("visemeEE", jaw(0.009, widen=0.07)); key("visemeMM", lambda p: None)

    def corner(dz, dx):
        def f(p):
            w = sm01(1 - math.hypot(abs(p.x - mouth_x) - mw / 2, p.z - mouth_z) / (0.05 * sc))
            return (math.copysign(dx * sc, p.x - mouth_x) * w, 0, dz * sc * w) if w > 0 else None
        return f
    key("smile", corner(0.006, 0.004)); key("frown", corner(-0.006, -0.002))

    def jaw_wide(p):
        # the lower face widens about the middle: the cheeks and jaw line, from just below the mouth corners down to the chin, not the neck
        w = sm01((mouth_z + 0.06 * sc - p.z) / (0.07 * sc)) * sm01((p.z - (chin_z - 0.03 * sc)) / (0.03 * sc))
        return ((p.x - mouth_x) * 0.14 * w, 0, 0) if w > 0 else None
    key("jawWide", jaw_wide)

    def brow(side, dz, inner_only=False):
        bx, bz = fs["browL" if side > 0 else "browR"]
        def f(p):
            if p.x * side <= 0:
                return None
            w = sm01(1 - math.hypot((p.x - bx) / (0.075 * sc), (p.z - bz) / (0.045 * sc)))
            if inner_only:
                w *= sm01(1 - abs(abs(p.x) - (abs(bx) - 0.045 * sc)) / (0.05 * sc))
            return (0, 0, dz * sc * w) if w > 0 else None
        return f
    for side, sfx in ((1, "L"), (-1, "R")):
        key("browUp" + sfx, brow(side, 0.01)); key("browDown" + sfx, brow(side, -0.007)); key("browInnerUp" + sfx, brow(side, 0.012, True))
    print("FACE KEYS", [k.name for k in low.data.shape_keys.key_blocks])

low.name = "character"
low.data.materials[0].name = "skin"
for obj in bpy.data.objects:
    obj.animation_data_clear()
json.dump({"heads": {n: [round(c, 5) for c in HEAD[n]] for n in BONES}, "space": "blender", "height": newH, "scale": jd["scale"], "sourceRig": "pro", "gameBones": BONES}, open(out_joints, "w"), indent=1)
bpy.ops.object.select_all(action="SELECT")
for o in list(bpy.data.objects):
    if o.name == "High":
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=False, export_apply=False, export_skins=True, export_morph=True, export_morph_normal=False, export_animations=False,
                          export_yup=True, export_image_format="NONE", export_materials="EXPORT", export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=out_glb.replace(".glb", ".blend"))
print("RIGGED", out_glb, "height", newH)
