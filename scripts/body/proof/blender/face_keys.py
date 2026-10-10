"""Stage 2: face shape keys from the base mesh's own expression-unit targets (CC0), plus eye look keys.

  blender --background --disable-autoexec --python face_keys.py -- <in.blend> <out.blend> [<preview-prefix>]

Adds to Body: blinkL, blinkR, browUpL, browUpR, browInnerUpL, browInnerUpR, browDownL, browDownR, smile, mouthOpen,
visemeAA, visemeOH, visemeEE, visemeMM. The brows, lashes, teeth and tongue take the displacement of the nearest body
vertices so they follow the face. The eyes get lookLeft, lookRight, lookUp, lookDown (rotations about each eye centre).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common
from mathutils import Matrix, Vector, kdtree

src, out = common.args()[:2]
prefix = common.args()[2] if len(common.args()) > 2 else None
bpy.ops.wm.open_mainfile(filepath=src)
common.enable_mpfb()
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

body = bpy.data.objects["Body"]
UNITS = os.path.join(LocationService.get_mpfb_data("targets"), "expression", "units", "african")

KEYS = {
    "blinkL": [("eye-left-closure", 1.0)], "blinkR": [("eye-right-closure", 1.0)],
    "browUpL": [("eyebrows-left-up", 1.0)], "browUpR": [("eyebrows-right-up", 1.0)],
    "browInnerUpL": [("eyebrows-left-inner-up", 1.0)], "browInnerUpR": [("eyebrows-right-inner-up", 1.0)],
    "browDownL": [("eyebrows-left-down", 1.0)], "browDownR": [("eyebrows-right-down", 1.0)],
    "smile": [("mouth-corner-puller", 1.0), ("mouth-elevation", 0.25)],
    "mouthOpen": [("mouth-open", 1.0)],
    "visemeAA": [("mouth-open", 0.85)],
    "visemeOH": [("mouth-pursing", 0.8), ("mouth-open", 0.35), ("mouth-protusion", 0.3)],
    "visemeEE": [("mouth-corner-puller", 0.45), ("mouth-open", 0.2), ("mouth-retraction", 0.3)],
    "visemeMM": [("mouth-compression", 0.9)],
    "frown": [("mouth-angles-down", 1.0)],
}

body.shape_key_add(name="Basis", from_mix=False)
for key, parts in KEYS.items():
    sk = body.shape_key_add(name=key, from_mix=False)
    sk.value = 0.0
    for stem, w in parts:
        unit = os.path.join(UNITS, stem + ".target.gz")
        TargetService.load_target(body, unit if os.path.exists(unit) else TargetService.target_full_path(stem), weight=0.0, name="tmp." + stem)
        tmp = body.data.shape_keys.key_blocks["tmp." + stem]
        for i, p in enumerate(tmp.data):
            d = p.co - body.data.vertices[i].co
            if d.length > 0:
                sk.data[i].co += d * w
        body.shape_key_remove(tmp)

basis = body.data.shape_keys.key_blocks["Basis"]
tree = kdtree.KDTree(len(body.data.vertices))
for v in body.data.vertices:
    tree.insert(v.co, v.index)
tree.balance()


def follow(obj, names):
    """Give obj shape keys that move each vertex like its four nearest body vertices (inverse-distance weighted)."""
    obj.shape_key_add(name="Basis", from_mix=False)
    bind = []
    for v in obj.data.vertices:
        hits = tree.find_n(v.co, 4)
        ws = [1.0 / max(d, 1e-5) for (_, _, d) in hits]
        s = sum(ws)
        bind.append([(i, w / s) for ((_, i, _), w) in zip(hits, ws)])
    for n in names:
        sk = obj.shape_key_add(name=n, from_mix=False)
        bk = body.data.shape_keys.key_blocks[n]
        for vi, b in enumerate(bind):
            sk.data[vi].co = obj.data.vertices[vi].co + sum(((bk.data[i].co - basis.data[i].co) * w for i, w in b), Vector())


# a dark mouth cavity behind the teeth, so an open mouth does not show through to the back of the head
import bmesh
tb = bpy.data.objects["Body.teeth_base"]
cen = sum((v.co for v in tb.data.vertices), Vector()) / len(tb.data.vertices)
cm = bpy.data.meshes.new("cavity")
bmc = bmesh.new()
bmesh.ops.create_uvsphere(bmc, u_segments=12, v_segments=8, radius=1.0)
bmesh.ops.scale(bmc, vec=Vector((0.034, 0.034, 0.024)), verts=bmc.verts)
bmesh.ops.translate(bmc, vec=Vector((0, cen.y + 0.02, cen.z - 0.002)), verts=bmc.verts)
bmc.to_mesh(cm)
bmc.free()
cav = bpy.data.objects.new("cavity", cm)
bpy.context.scene.collection.objects.link(cav)
cav.vertex_groups.new(name="head").add(list(range(len(cm.vertices))), 1.0, "REPLACE")
# the teeth asset is far denser than a mouth interior needs
teeth = bpy.data.objects["Body.teeth_base"]
bpy.context.view_layer.objects.active = teeth
dec = teeth.modifiers.new("dec", "DECIMATE")
dec.ratio = 0.14
bpy.ops.object.modifier_apply(modifier="dec")
face_names = list(KEYS)
for part in ("Body.eyebrow001", "Body.eyelashes02", "Body.teeth_base", "Body.tongue01"):
    follow(bpy.data.objects[part], face_names)

# eyes: one mesh of two eyeballs; rotate each ball about its own centre
eyes = bpy.data.objects["Body.high-poly"]
import bmesh
# the asset has a transparent cornea shell per eye (its UVs sit in the corner swatch of the texture); it would only hide the iris
uvl = eyes.data.uv_layers.active.data
corner = set()
for loop in eyes.data.loops:
    u = uvl[loop.index].uv
    if u[0] > 0.9 and u[1] < 0.12:
        corner.add(loop.vertex_index)
bm2 = bmesh.new()
bm2.from_mesh(eyes.data)
bm2.verts.ensure_lookup_table()
bmesh.ops.delete(bm2, geom=[bm2.verts[i] for i in corner], context="VERTS")
bm2.to_mesh(eyes.data)
bm2.free()
bm = bmesh.new()
bm.from_mesh(eyes.data)
bm.verts.ensure_lookup_table()
seen, balls = set(), []
for v in bm.verts:
    if v.index in seen:
        continue
    stack, comp = [v], []
    seen.add(v.index)
    while stack:
        c = stack.pop()
        comp.append(c.index)
        for e in c.link_edges:
            o = e.other_vert(c)
            if o.index not in seen:
                seen.add(o.index)
                stack.append(o)
    balls.append(comp)
bm.free()
sides = {}
for comp in balls:
    cx = sum(eyes.data.vertices[i].co.x for i in comp) / len(comp)
    sides.setdefault(cx > 0, []).extend(comp)
balls = list(sides.values())
# map each eye by projection from the front, so the iris disc sits in the middle of the eye texture
uvd = eyes.data.uv_layers.active.data
for comp in balls:
    cs = [eyes.data.vertices[i].co for i in comp]
    c = sum(cs, Vector()) / len(cs)
    rad = max((p - c).length for p in cs)
    members = set(comp)
    for loop in eyes.data.loops:
        if loop.vertex_index in members:
            p = eyes.data.vertices[loop.vertex_index].co
            uvd[loop.index].uv = ((p.x - c.x) / (2 * rad) + 0.5, (p.z - c.z) / (2 * rad) + 0.5)
print("EYE BALLS", [len(b) for b in balls])
eyes.shape_key_add(name="Basis", from_mix=False)
yaw, pitch = math.radians(24), math.radians(18)
for name, (rx, rz) in {"lookLeft": (0, yaw), "lookRight": (0, -yaw), "lookUp": (-pitch, 0), "lookDown": (pitch, 0)}.items():
    sk = eyes.shape_key_add(name=name, from_mix=False)
    rot = Matrix.Rotation(rz, 3, "Z") @ Matrix.Rotation(rx, 3, "X")
    for comp in balls:
        c = sum((eyes.data.vertices[i].co for i in comp), Vector()) / len(comp)
        for i in comp:
            sk.data[i].co = c + rot @ (eyes.data.vertices[i].co - c)

bpy.ops.wm.save_as_mainfile(filepath=out)
if prefix:
    names = ["smile", "mouthOpen", "visemeOH", "visemeEE", "blinkL", "browInnerUpL", "browUpL", "browDownL"]
    for n in names:
        for k in body.data.shape_keys.key_blocks:
            k.value = 1.0 if k.name == n else 0.0
        for part in ("Body.eyebrow001", "Body.eyelashes02", "Body.teeth_base", "Body.tongue01"):
            p = bpy.data.objects[part]
            for k in p.data.shape_keys.key_blocks:
                k.value = 1.0 if k.name == n else 0.0
        common.preview(f"{prefix}-{n}", views=(("front", 0, 0),), focus=(0, 0, 1.64), zoom=0.3, size=(500, 500))
