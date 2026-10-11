"""Turns a generated vehicle into a game-size file with clean spinning wheels, seat anchors and light positions.

  blender --background --disable-autoexec --python vehicle.py -- <in.glb> <config.json> <out-dir> <name> <triangles> <texture-px> <near|far>

The generated wheels are cut out (everything inside a cylinder round each axle) and replaced by wheels built here: a round tyre and hub, one node per wheel
with its origin on the axle (turn it about X). The body is decimated gently, unwrapped afresh and its base colour baked from the full generated mesh;
the wheels read two small patches of the texture reserved in its top right corner. The far version has the wheels merged into the body (one draw call).
Named empties: seat_driver, seat_1 ..., light_head_l/r, light_tail_l/r (x to the vehicle's left, y up, z forward), written in the file and in <name>.json.
Config (fractions of the length L, 0 = front): yaw, length (game units), wheelR (radius / L), wheelW (width / r), wheels [{name, u, side: -1/0/1}], cutR (cut radius / r),
seats [[x / halfwidth, u, z / height]] (first is the driver), head [[x / halfwidth, u, z / height]], tail [...].
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, cfg_path, out_dir, name, target_tris, tex_px, lod = argv[0], argv[1], argv[2], argv[3], int(argv[4]), int(argv[5]), argv[6]
near = lod == "near"
cfg = json.load(open(cfg_path))
os.makedirs(out_dir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
high = bpy.context.view_layer.objects.active
high.name = "High"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
original_tris = sum(len(p.vertices) - 2 for p in high.data.polygons)
bm = bmesh.new(); bm.from_mesh(high.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
bm.to_mesh(high.data); bm.free(); high.data.update()


def bounds(obj):
    pts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return Vector((min(p[i] for p in pts) for i in range(3))), Vector((max(p[i] for p in pts) for i in range(3)))


bpy.context.view_layer.objects.active = high
high.rotation_mode = "XYZ"
high.rotation_euler = (0, 0, math.radians(cfg.get("yaw", 90)))
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bounds(high)
k = cfg["length"] / (hi.y - lo.y)
high.scale = (k, k, k)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bounds(high)
high.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bounds(high)
L = hi.y - lo.y; Wd = hi.x - lo.x; Ht = hi.z
R = cfg["wheelR"] * L
WW = cfg.get("wheelW", 0.9) * R
print("SIZE", round(Wd, 2), round(L, 2), round(Ht, 2), "wheel r", round(R, 3))
verts = [v.co.copy() for v in high.data.vertices]

# --- the wheel positions (axle y from the fraction u, z = radius, x from the body width near the axle)
wheels = []
for w in cfg["wheels"]:
    yc = lo.y + w["u"] * L
    near_v = [v for v in verts if abs(v.y - yc) < R and v.z > 0.25 * Ht]
    half = max((abs(v.x) for v in near_v), default=Wd / 2)
    xc = w["side"] * (half - WW * 0.45) if w["side"] else 0.0
    wheels.append({"name": w["name"], "x": xc, "y": yc, "z": R})

# --- the low body: a copy of the whole generated mesh (wheels included), decimated first; the wheel arches are cut afterwards, cleanly
low = high.copy(); low.data = high.data.copy(); low.name = "Low"
bpy.context.collection.objects.link(low)
for uv in list(low.data.uv_layers):
    low.data.uv_layers.remove(uv)
low.data.materials.clear()
bm = bmesh.new(); bm.from_mesh(low.data); bmesh.ops.triangulate(bm, faces=bm.faces); bm.to_mesh(low.data); bm.free()
bpy.context.view_layer.objects.active = low
wheel_tris = (96 if near else 0) * len(wheels)
tgt = max(400, int(target_tris * 1.15) - wheel_tris)
for step in range(10):
    got = len(low.data.polygons)
    if got <= tgt * 1.03:
        break
    m = low.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = max(tgt, int(got * 0.6)) / got; m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name)
    if len(low.data.polygons) >= got * 0.97:
        break
# the arch: finer triangles round each wheel, faces inside a cylinder removed, the boundary vertices pushed onto the circle (a clean round opening)
RC = R * cfg.get("cutR", 1.2)
bm = bmesh.new(); bm.from_mesh(low.data)
def near_wheel(co, w, rad):
    return abs(co.x - w["x"]) <= WW * 1.25 and math.hypot(co.y - w["y"], co.z - w["z"]) <= rad
for rnd in range(2):
    es = [e for e in bm.edges if any(near_wheel((e.verts[0].co + e.verts[1].co) / 2, w, RC * 1.7) for w in wheels) and (e.verts[0].co - e.verts[1].co).length > RC * 0.35]
    bmesh.ops.subdivide_edges(bm, edges=es, cuts=1, use_grid_fill=False)
    bmesh.ops.triangulate(bm, faces=bm.faces)
bm.faces.ensure_lookup_table()
kill = []
for f in bm.faces:
    c = f.calc_center_median()
    if any(near_wheel(c, w, RC) for w in wheels):
        kill.append(f)
bmesh.ops.delete(bm, geom=kill, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
for v in bm.verts:
    for w in wheels:
        if abs(v.co.x - w["x"]) <= WW * 1.25:
            d = math.hypot(v.co.y - w["y"], v.co.z - w["z"])
            if d < RC * 1.12 and d > 1e-6:
                k_ = RC / d
                v.co.y = w["y"] + (v.co.y - w["y"]) * k_; v.co.z = w["z"] + (v.co.z - w["z"]) * k_
bm.to_mesh(low.data); bm.free()
print("CUT faces", len(kill))
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.delete_loose()
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode="OBJECT")
blend = os.path.join(out_dir, name + ".blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.wm.open_mainfile(filepath=blend)
high = bpy.data.objects["High"]; low = bpy.data.objects["Low"]
for o in bpy.data.objects:
    if o.name == "Cut":
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.6, correct_aspect=True, scale_to_bounds=True)
bpy.ops.uv.select_all(action="SELECT")
bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")
for lp in low.data.uv_layers.active.data:           # leave the top right corner free for the wheel colours
    lp.uv = (lp.uv[0] * 0.94, lp.uv[1] * 0.94)
bpy.ops.object.shade_smooth()
body_tris = len(low.data.polygons)
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 8; scene.cycles.use_denoising = False
scene.render.bake.margin = 6; scene.render.bake.margin_type = "EXTEND"; scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = 0.03 * L; scene.render.bake.max_ray_distance = 0.06 * L
scene.view_settings.view_transform = "Standard"
tn = high.data.materials[0].node_tree
bsdf = next(n for n in tn.nodes if n.type == "BSDF_PRINCIPLED")
colour_node = bsdf.inputs["Base Color"].links[0].from_node
emit = tn.nodes.new("ShaderNodeEmission"); tn.links.new(colour_node.outputs["Color"], emit.inputs["Color"])
out_node = next(n for n in tn.nodes if n.type == "OUTPUT_MATERIAL"); tn.links.new(emit.outputs[0], out_node.inputs["Surface"])
img = bpy.data.images.new(name + "-color", tex_px, tex_px, alpha=False)
img.colorspace_settings.name = "sRGB"
mat = bpy.data.materials.new(name); mat.use_nodes = True
low.data.materials.clear(); low.data.materials.append(mat)
node = mat.node_tree.nodes.new("ShaderNodeTexImage"); node.image = img
mat.node_tree.nodes.active = node
bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(type="EMIT")
# the two wheel patches in the top right corner: tyre rubber and hub
px = np.empty(tex_px * tex_px * 4, dtype=np.float32); img.pixels.foreach_get(px)
px = px.reshape(tex_px, tex_px, 4)
s = max(3, tex_px // 64)
def patch(u0, colour):
    x0 = int(u0 * tex_px); y0 = int(0.955 * tex_px)
    px[y0:y0 + s, x0:x0 + s, :3] = colour
patch(0.955, (0.045, 0.045, 0.05)); patch(0.975, (0.55, 0.56, 0.58))
img.pixels.foreach_set(px.reshape(-1)); img.update()
TYRE_UV = (0.955 + s / tex_px * 0.5 / 1.0, 0.955 + s / tex_px * 0.5)
HUB_UV = (0.975 + s / tex_px * 0.5, 0.955 + s / tex_px * 0.5)
scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = 80
img.save_render(os.path.join(out_dir, name + "-color.jpg"), scene=scene)

# --- clean wheels, built round their axles
def make_wheel(label, w, seg):
    b = bmesh.new()
    uvl = b.loops.layers.uv.new("UVMap")
    def face(pts, uv):
        f = b.faces.new([b.verts.new(p) for p in pts])
        for lp in f.loops:
            lp[uvl].uv = uv
    hw = WW / 2
    rim = cfg.get('rim', 0.62)
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        c0, s0, c1, s1 = math.cos(a0), math.sin(a0), math.cos(a1), math.sin(a1)
        P = lambda x, r, c, sn: Vector((x, r * c, r * sn))
        face([P(-hw, R, c0, s0), P(hw, R, c0, s0), P(hw, R, c1, s1), P(-hw, R, c1, s1)], TYRE_UV)                       # tread
        for sx in (-1, 1):
            xs = sx * hw
            o = [P(xs, R, c0, s0), P(xs, R, c1, s1), P(xs, R * rim, c1, s1), P(xs, R * rim, c0, s0)]
            face(o if sx > 0 else o[::-1], TYRE_UV)                                                                      # sidewall ring
            h = [P(xs, R * rim, c0, s0), P(xs, R * rim, c1, s1), Vector((xs, 0, 0))]
            face(h if sx > 0 else h[::-1], HUB_UV)                                                                       # hub disc
    me = bpy.data.meshes.new(label); b.to_mesh(me); b.free()
    ob = bpy.data.objects.new(label, me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    ob.location = (w["x"], w["y"], w["z"])
    return ob

seg = 12 if near else 8
wheel_objs = [make_wheel(w["name"], w, seg) for w in wheels]
for o in wheel_objs:
    for p in o.data.polygons:
        p.use_smooth = False
# recalc wheel normals outward: faces were wound for +x and -x sides; fix by making normals consistent on each
for o in wheel_objs:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
    o.select_set(False)

# --- arch liners: an inner shell in each arch (dark, tyre colour patch), so no hole shows into the body
def make_liner(w):
    b = bmesh.new()
    uvl = b.loops.layers.uv.new("UVMap")
    sd = 1 if w["x"] >= 0 else -1
    if w["x"] == 0:
        sd = 1
    half = max((abs(v.x) for v in verts if abs(v.y - w["y"]) < R and v.z > 0.25 * Ht), default=Wd / 2)
    xs0, xs1 = (w["x"] + WW * 0.5 * sd, w["x"] - WW * 1.3 * sd) if w["x"] != 0 else (WW * 0.6, -WW * 0.6)
    seg = 14
    rr = RC * 0.985
    for i in range(seg):
        a0, a1 = -0.25 + (math.pi + 0.5) * i / seg, -0.25 + (math.pi + 0.5) * (i + 1) / seg
        P = lambda x, a: Vector((x, w["y"] + rr * math.cos(a), w["z"] + rr * math.sin(a)))
        f = b.faces.new([b.verts.new(P(xs0, a0)), b.verts.new(P(xs0, a1)), b.verts.new(P(xs1, a1)), b.verts.new(P(xs1, a0))])
        f2 = b.faces.new([b.verts.new(P(xs0, a1)), b.verts.new(P(xs0, a0)), b.verts.new(P(xs1, a0)), b.verts.new(P(xs1, a1))])
        for ff in (f, f2):
            for lp in ff.loops:
                lp[uvl].uv = (TYRE_UV[0], TYRE_UV[1])
    me = bpy.data.meshes.new("liner"); b.to_mesh(me); b.free()
    ob = bpy.data.objects.new("liner", me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob
liners = [make_liner(w) for w in wheels]
bpy.ops.object.select_all(action="DESELECT")
for o in [low] + liners:
    o.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.join()
low = bpy.context.view_layer.objects.active

# --- the final material and the empties
mt = mat.node_tree
for n_ in list(mt.nodes):
    if n_.type != "TEX_IMAGE":
        mt.nodes.remove(n_)
pb = mt.nodes.new("ShaderNodeBsdfPrincipled"); pb.inputs["Roughness"].default_value = 0.9; pb.inputs["Metallic"].default_value = 0.0
mo = mt.nodes.new("ShaderNodeOutputMaterial")
mt.links.new(node.outputs["Color"], pb.inputs["Base Color"]); mt.links.new(pb.outputs[0], mo.inputs["Surface"])
img.pack()
low.name = name
empties = []
def anchor(label, spec, **extra):
    xf, u, zf = spec
    e = bpy.data.objects.new(label, None); e.empty_display_type = "PLAIN_AXES"
    e.location = (xf * Wd / 2, lo.y + u * L, zf * Ht)
    for kx, vx in extra.items():
        e[kx] = vx
    bpy.context.collection.objects.link(e)
    empties.append((label, e.location.copy()))
    return e
# the vehicle's left is +x (it faces glTF +z, y up)
seat_objs = []
for i, sp in enumerate(cfg["seats"]):
    seat_objs.append(anchor("seat_driver" if i == 0 else "seat_%d" % i, (-sp[0] if False else sp[0], sp[1], sp[2]), kind="seat"))
for i, sp in enumerate(cfg["head"]):
    seat_objs.append(anchor("light_head_%s" % ("l" if sp[0] > 0.01 else "r" if sp[0] < -0.01 else "c"), sp, kind="head"))
for i, sp in enumerate(cfg["tail"]):
    seat_objs.append(anchor("light_tail_%s" % ("l" if sp[0] > 0.01 else "r" if sp[0] < -0.01 else "c"), sp, kind="tail"))
parts = [low] + (wheel_objs if near else []) + seat_objs
if not near:
    bpy.ops.object.select_all(action="DESELECT")
    for o in [low] + wheel_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.join()
    low = bpy.context.view_layer.objects.active; low.name = name
    parts = [low] + seat_objs
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=80,
                          export_yup=True, export_apply=False, export_cameras=False, export_lights=False, export_animations=False, export_extras=True)
tris = sum(len(o.data.polygons) for o in parts if o.type == "MESH")
rec = {"name": name, "originalTriangles": original_tris, "triangles": tris, "bodyTriangles": body_tris, "size": {"width": round(Wd, 2), "length": round(L, 2), "height": round(Ht, 2)},
       "wheelRadius": round(R, 3), "wheelNodes": [w["name"] for w in wheels] if near else [], "empties": [{"name": n, "x": round(l.x, 2), "y": round(l.z, 2), "z": round(-l.y, 2)} for n, l in empties]}
json.dump(rec, open(os.path.join(out_dir, name + ".json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("VEHICLE", rec["name"], tris, rec["size"])
