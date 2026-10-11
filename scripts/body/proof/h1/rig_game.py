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
    if abs(min(zs)) > 0.05:
        raise RuntimeError(f"soles are not on the floor: {min(zs)}")
    lift_ = min(zs)                                   # the reduction moved the soles a little: put them back on the floor
    V = [Vector((p.x, p.y, p.z - lift_)) for p in V]
    J = {n: Vector((p.x, p.y, p.z - lift_)) for n, p in J.items()}
    zs = [p.z for p in V]

# ---------------------------------------------------------------- hands and forearms to the game body's size (the generated ones come out chunkier): girth of the forearm and
# length and width of the hand are scaled to the game's own numbers, about the elbow-wrist line and the wrist, for both arms from the left arm's measurement
GAME_HAND = {"male": (0.231, 0.123), "female": (0.204, 0.093)}      # hand length, forearm girth (mean of the y and z extents) of the shipped bodies
if "--no-hands" not in opts and "--part" not in opts:
    sex_ = "female" if "female" in skel_json else "male"
    dom = []
    for i, w_ in enumerate(W):
        k_ = max(w_, key=w_.get) if w_ else None
        dom.append(k_)
    wl, el = J["LeftHand"], J["LeftForeArm"]
    fore = [V[i] for i, k_ in enumerate(dom) if k_ == "lowerarm_l"]; hand = [V[i] for i, k_ in enumerate(dom) if k_ == "hand_l"]
    if fore and hand and len({round(p.y, 4) for p in fore}) > 2 and max(p.x for p in hand) - wl.x > 1e-3:
        girth = ((max(p.y for p in fore) - min(p.y for p in fore)) + (max(p.z for p in fore) - min(p.z for p in fore))) / 2
        hlen = max(p.x for p in hand) - wl.x
        kf = max(0.72, min(1.0, GAME_HAND[sex_][1] / max(girth, 1e-3))); kh = max(0.70, min(1.0, GAME_HAND[sex_][0] / max(hlen, 1e-3)))
        print("HANDS girth", round(girth, 3), "hand length", round(hlen, 3), "factors", round(kf, 2), round(kh, 2))
        for i, k_ in enumerate(dom):
            if k_ not in ("lowerarm_l", "lowerarm_r", "hand_l", "hand_r"):
                continue
            left_ = k_.endswith("_l"); wj = J["LeftHand" if left_ else "RightHand"]; ej = J["LeftForeArm" if left_ else "RightForeArm"]
            p = V[i]
            if k_.startswith("lowerarm"):
                t = max(0.0, min(1.0, abs(p.x - ej.x) / max(abs(wj.x - ej.x), 1e-3)))
                f_ = 1 + (kf - 1) * smooth_t(t) if False else 1 + (kf - 1) * min(1.0, 0.35 + t)
                V[i] = Vector((p.x, ej.y + (p.y - ej.y) * f_, ej.z + (p.z - ej.z) * f_))
            else:
                V[i] = Vector((wj.x + (p.x - wj.x) * kh, wj.y + (p.y - wj.y) * kh * kf / 1.0 ** 0, wj.z + (p.z - wj.z) * kh * kf))
        for i, v in enumerate(me.vertices):
            v.co = V[i]

# ---------------------------------------------------------------- an optional skirt-like garment: both thighs move it, the centre follows the pelvis
def sm(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


if opts.get("--wrapper", "0") == "1":
    # Long garments (wrappers, gowns, robes).  Below the hips every vertex is blended between "follows the legs" and "follows the pelvis":
    #  - close to a leg's axis (cloth lying on the thigh or calf, trousers under a robe, the legs themselves under the cloth) it follows that leg completely, so nothing passes through a leg
    #    and a seated figure's lap stays on the thighs;
    #  - away from the legs (the loose fall of the cloth) the weights are shared between the two thighs, a little of the calves below the knee, and the pelvis, with the pelvis taking the
    #    middle (between the legs) so the hem follows both legs gently instead of tearing between them or flaring out behind one leg.
    # Weights change smoothly with the position, so neighbouring vertices never get opposite motions.  --hem is the height below which a trouser leg or the bare leg keeps its own
    # weights (a short ramp above it); --leg-max is the leg share of loose cloth at its outer side.
    hem = float(opts.get("--hem", 0.13)) * newH
    leg_max = float(opts.get("--leg-max", 0.62))
    hipz = J["LeftUpLeg"].z
    kneez = J["LeftLeg"].z
    segs = {"l": [(J["LeftUpLeg"], J["LeftLeg"]), (J["LeftLeg"], J["LeftFoot"])], "r": [(J["RightUpLeg"], J["RightLeg"]), (J["RightLeg"], J["RightFoot"])]}

    def seg_dist(p, a_, b_):
        ab = b_ - a_; t_ = max(0.0, min(1.0, (p - a_).dot(ab) / max(ab.dot(ab), 1e-9))); return (p - (a_ + ab * t_)).length

    changed = 0
    for i, p in enumerate(V):
        if p.z <= hem or p.z >= hipz + 0.02:
            continue
        t = sm((hipz - p.z) / (0.14 * newH)) * sm((p.z - hem) / (0.07 * newH))
        if t <= 0:
            continue
        side = max(-1.0, min(1.0, p.x / (0.085 * newH)))
        left = sm((side + 1) / 2)
        centre = 1 - abs(side)
        dl = min(seg_dist(p, a_, b_) for a_, b_ in segs["l"]); dr = min(seg_dist(p, a_, b_) for a_, b_ in segs["r"])
        d = min(dl, dr)
        hug = 1 - sm((d - 0.085 * newH / 1.8) / (0.075 * newH / 1.8))          # 1 on a leg's surface, 0 well away from both
        t = t * (1 - hug)                      # on a leg's surface the generator's own weights stay (they follow that leg)
        if t <= 0:
            continue
        below_knee = sm((kneez - p.z) / max(kneez - hem, 1e-3))
        leg_share = leg_max * (1 - 0.55 * centre)
        calf = leg_share * 0.22 * below_knee
        thigh = leg_share - calf
        pelvis = 1 - leg_share
        nw = {"pelvis": (1 - t) * W[i].get("pelvis", 0.0) + t * pelvis}
        for k, wv in W[i].items():
            if k not in ("thigh_l", "thigh_r", "calf_l", "calf_r", "pelvis"):
                nw[k] = nw.get(k, 0.0) + (1 - t) * wv
        lw = left
        nw["thigh_l"] = (1 - t) * W[i].get("thigh_l", 0.0) + t * thigh * lw
        nw["thigh_r"] = (1 - t) * W[i].get("thigh_r", 0.0) + t * thigh * (1 - lw)
        nw["calf_l"] = (1 - t) * W[i].get("calf_l", 0.0) + t * calf * lw
        nw["calf_r"] = (1 - t) * W[i].get("calf_r", 0.0) + t * calf * (1 - lw)
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
