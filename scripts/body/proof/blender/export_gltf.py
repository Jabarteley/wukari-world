"""Stage 3: writes the fitted character parts as one plain .glb plus the joint positions, ready for the assembler.

  blender --background --disable-autoexec --python export_gltf.py -- <in.blend> <out.glb> <joints.json>

Finger, toe and helper weights are folded into the 23 animation bones (hand, ball) and the groups are renamed to the
animation skeleton's names. The body keeps the Col attribute written by bake_skin.py.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common

src, out, joints_out = common.args()[:3]
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()

BONES = ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
         "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r", "thigh_l", "calf_l", "foot_l", "ball_l", "thigh_r", "calf_r", "foot_r", "ball_r"]


def target(name):
    n = {"head": "Head", "Root": "root"}.get(name, name)
    if n in BONES:
        return n
    for finger in ("index", "middle", "pinky", "ring", "thumb"):
        if n.startswith(finger + "_"):
            return "hand_" + n[-1]
    return None


rig = bpy.data.objects["Body.rig"]
rig.name = "Armature"
for b in rig.data.bones:
    t = target(b.name)
    if t and t != b.name and t in BONES:
        b.name = t if t not in rig.data.bones else b.name

for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    names = {g.index: g.name for g in o.vertex_groups}
    colors = None
    table = []
    for v in o.data.vertices:
        acc = {}
        rgb = [0.0, 0.0, 0.0]
        for g in v.groups:
            n = names[g.group]
            t = target(n)
            if t:
                acc[t] = acc.get(t, 0.0) + g.weight
        table.append(acc)
        if colors:
            colors.data[v.index].color = (rgb[0], rgb[1], rgb[2], 1.0)
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    for name in BONES:
        o.vertex_groups.new(name=name)
    for vi, acc in enumerate(table):
        total = sum(acc.values()) or 1.0
        for n, w in acc.items():
            o.vertex_groups[n].add([vi], w / total, "REPLACE")
    for m in list(o.modifiers):
        if m.type == "ARMATURE":
            m.object = rig
    if not any(m.type == "ARMATURE" for m in o.modifiers):
        o.modifiers.new("Armature", "ARMATURE").object = rig
    o.parent = rig
    o.matrix_parent_inverse = rig.matrix_world.inverted()
    o.name = {"Body.high-poly": "eyes", "Body.eyelashes02": "lashes", "Body.eyebrow001": "brows", "Body.teeth_base": "teeth", "Body.tongue01": "tongue", "cavity": "cavity"}.get(o.name, o.name.lower())
    for slot in list(o.material_slots):
        pass

mats = {}
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    name = {"body": "skin", "eyes": "eye", "lashes": "lash", "brows": "brow", "teeth": "teeth", "tongue": "tongue", "cavity": "cavity"}.get(o.name, o.name)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    o.data.materials.clear()
    o.data.materials.append(m)

heads = {b.name: [round(c, 5) for c in b.head_local] for b in rig.data.bones}
json.dump({"heads": heads, "space": "blender"}, open(joints_out, "w"), indent=1)
bpy.ops.object.select_all(action="SELECT")
opts = dict(filepath=out, export_format="GLB", use_selection=False, export_apply=False, export_morph=True, export_morph_normal=False,
            export_skins=True, export_animations=False, export_yup=True, export_image_format="NONE", export_materials="EXPORT", export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(**opts, export_vertex_color="ACTIVE")
except TypeError:
    bpy.ops.export_scene.gltf(**opts)
print("EXPORTED", out)
