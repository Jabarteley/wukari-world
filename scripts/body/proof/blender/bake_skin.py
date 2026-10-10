"""Stage 3: skin masks and ambient occlusion baked into one float vertex colour attribute of the body.

  blender --background --disable-autoexec --python bake_skin.py -- <in.blend> <out.blend>

Col.R lips, Col.G warm areas (cheeks, nose tip, ears, nails), Col.B darker pigment (knees, elbows, knuckles, ankles),
Col.A ambient occlusion (1 open, lower in creases and where limbs shade the torso). The shader tints these per skin tone,
so the darkest tones keep their form from the occlusion and the specular highlights instead of one flat value.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common
from mathutils import Vector
from mathutils.bvhtree import BVHTree

src, out = common.args()[:2]
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()
body = bpy.data.objects["Body"] if "Body" in bpy.data.objects else bpy.data.objects["body"]
eyes = bpy.data.objects["Body.high-poly"]
rig = bpy.data.objects["Body.rig"]
me = body.data


def centre(group):
    vs = [me.vertices[v.index].co for v in me.vertices if any(body.vertex_groups[g.group].name == group and g.weight > 0.5 for g in v.groups)]
    return sum(vs, Vector()) / len(vs) if vs else None


def gauss(p, c, r):
    return math.exp(-((p - c).length / r) ** 2)


lips_c = centre("lips")
left = [v.co for v in eyes.data.vertices if v.co.x > 0]
right = [v.co for v in eyes.data.vertices if v.co.x <= 0]
eye_l, eye_r = sum(left, Vector()) / len(left), sum(right, Vector()) / len(right)
front = min(me.vertices, key=lambda v: v.co.y if v.co.z > eye_l.z - 0.12 else 9).co  # nose tip: the most forward point near eye height
cheeks = [Vector((eye_l.x * 1.15, eye_l.y - 0.005, (eye_l.z + lips_c.z) / 2 + 0.005)), Vector((eye_r.x * 1.15, eye_r.y - 0.005, (eye_l.z + lips_c.z) / 2 + 0.005))]
heads = {b.name: Vector(b.head_local) for b in rig.data.bones}
dark_pts = []
for s in ("l", "r"):
    dark_pts += [(heads["lowerarm_" + s], 0.055), (heads["calf_" + s], 0.07), (heads["foot_" + s], 0.045)]
    dark_pts += [(heads[f"{f}_01_{s}"], 0.016) for f in ("index", "middle", "ring", "pinky")]
    dark_pts += [(heads[f"{f}_02_{s}"], 0.012) for f in ("index", "middle", "ring", "pinky")]

names = {g.index: g.name for g in body.vertex_groups}
lips = {"lips"}
nails = {"fingernails", "toenails"}
ears = {"ears"}

# ambient occlusion by ray casting against the body itself
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
rnd = random.Random(7)
N = 40
dirs = []
for _ in range(N):
    u, v = rnd.random(), rnd.random()
    r, th = math.sqrt(u), 2 * math.pi * v
    dirs.append(Vector((r * math.cos(th), r * math.sin(th), math.sqrt(max(0.0, 1 - u)))))
attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
normals = {v.index: v.normal for v in me.vertices}
for v in me.vertices:
    p, n = v.co, normals[v.index]
    t = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized()
    b = n.cross(t)
    hit = 0.0
    for d in dirs:
        w = (t * d.x + b * d.y + n * d.z)
        res = bvh.ray_cast(p + n * 0.0015, w, 0.22)
        if res[0] is not None:
            hit += 1.0 - res[3] / 0.22 * 0.5 if res[3] is not None else 1.0
    ao = 1.0 - hit / N
    groups = {names[g.group]: g.weight for g in v.groups}
    lip = max((w for k, w in groups.items() if k in lips), default=0.0)
    warm = max((w for k, w in groups.items() if k in ears or k in nails), default=0.0)
    warm = max(warm, gauss(p, cheeks[0], 0.05) * 0.8, gauss(p, cheeks[1], 0.05) * 0.8, gauss(p, front, 0.022) * 0.7)
    dark = max((gauss(p, c, r) for c, r in dark_pts), default=0.0) * 0.9
    attr.data[v.index].color = (lip, min(1.0, warm), min(1.0, dark), max(0.0, min(1.0, ao * 1.15)))
me.color_attributes.active_color = attr
me.color_attributes.render_color_index = list(me.color_attributes).index(attr)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("AO range", min(attr.data[i].color[3] for i in range(len(attr.data))), sum(attr.data[i].color[3] for i in range(len(attr.data))) / len(attr.data))
