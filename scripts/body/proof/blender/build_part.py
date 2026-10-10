"""Stage 4: one CC0 MakeHuman asset (hair, shoes, clothes) fitted to the finished body and written as a part .glb.

  blender --background --disable-autoexec --python build_part.py -- <body.blend> <object-name> <out.glb> <material-name>

Exports one fitted asset object of the scene (hair or shoes equipped by build_body.py through AW_PARTS) as a part. It keeps the
weights interpolated from the body's rig, folds their groups into the 23 animation bones and writes no textures.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common

src, objname, out, material = common.args()[:4]
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()
body = bpy.data.objects["Body"]
part = bpy.data.objects[objname]
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in (part, body):
        bpy.data.objects.remove(o)
rig = body.parent
BONES = ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
         "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r", "thigh_l", "calf_l", "foot_l", "ball_l", "thigh_r", "calf_r", "foot_r", "ball_r"]


def target(n):
    n = {"head": "Head", "Root": "root"}.get(n, n)
    if n in BONES:
        return n
    for finger in ("index", "middle", "pinky", "ring", "thumb"):
        if n.startswith(finger + "_"):
            return "hand_" + n[-1]
    return None


names = {g.index: g.name for g in part.vertex_groups}
table = []
for v in part.data.vertices:
    acc = {}
    for g in v.groups:
        t = target(names[g.group])
        if t:
            acc[t] = acc.get(t, 0.0) + g.weight
    table.append(acc)
for g in list(part.vertex_groups):
    part.vertex_groups.remove(g)
for b in BONES:
    part.vertex_groups.new(name=b)
for i, acc in enumerate(table):
    tot = sum(acc.values()) or 1.0
    for n, w in acc.items():
        part.vertex_groups[n].add([i], w / tot, "REPLACE")
for b in rig.data.bones:
    t = target(b.name)
    if t and t != b.name and t not in rig.data.bones:
        b.name = t
for m in list(part.modifiers):
    if m.type == "ARMATURE":
        m.object = rig
if not any(m.type == "ARMATURE" for m in part.modifiers):
    part.modifiers.new("Armature", "ARMATURE").object = rig
part.parent = rig
part.data.materials.clear()
part.data.materials.append(bpy.data.materials.new(material))
bpy.data.objects.remove(body)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False, export_apply=False, export_morph=False, export_skins=True,
                          export_yup=True, export_image_format="NONE", export_materials="EXPORT", export_cameras=False, export_lights=False)
print("EXPORTED", out)
