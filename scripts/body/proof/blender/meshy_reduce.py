"""Reduces a generated character to a game-ready mesh: welds it, decimates it (keeping more triangles on the face and hands),
unwraps a fresh UV layout and bakes the base colour (and a tangent normal map) from the full-detail mesh.

  blender --background --disable-autoexec --python meshy_reduce.py -- <in.glb> <out.blend> <out-dir> <name> <triangles> <texture-px> [--normal] [--no-protect]

Writes <out.blend> (the reduced mesh as "Low", the full mesh as "High", the armature if the file has one),
<out-dir>/<name>-color.jpg and, with --normal, <out-dir>/<name>-normal.jpg, and <out-dir>/<name>-reduce.json with the counts.
Every path is an argument.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
flags = [a for a in argv if a.startswith("--")]
src, out_blend, out_dir, name, target_tris, tex_px = argv[0], argv[1], argv[2], argv[3], int(argv[4]), int(argv[5])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
os.makedirs(out_dir, exist_ok=True)

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
meshes.sort(key=lambda o: -len(o.data.polygons))
for extra in meshes[1:]:                       # helper shapes some exports carry (bone display spheres)
    bpy.data.objects.remove(extra)
meshes = meshes[:1]
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
for a_ in arms:                                  # a bundled clip would leave the skeleton posed at its first frame; the mesh data is in the bind pose
    a_.animation_data_clear()
    for pb in a_.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
for ac in list(bpy.data.actions):
    bpy.data.actions.remove(ac)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
high = bpy.context.view_layer.objects.active
high.name = "High"
# apply the object transform so positions are in metres, Z up
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
full_tris = sum(len(p.vertices) - 2 for p in high.data.polygons)
hi_tris = full_tris
bb = [high.matrix_world @ Vector(c) for c in high.bound_box]
lo = Vector((min(v[i] for v in bb) for i in range(3))); hi = Vector((max(v[i] for v in bb) for i in range(3)))
H = hi.z - lo.z

# --- the protected zones: head and hands (hand positions come from the skeleton when the file has one, from proportions otherwise)
hands = []
if arms:
    a = arms[0]
    for side in ("Left", "Right"):
        b = a.data.bones.get(f"mixamorig:{side}Hand")
        if b:
            hands.append(a.matrix_world @ b.head_local)
if not hands:
    hands = [Vector((s * 0.30 * H, 0, lo.z + 0.46 * H)) for s in (1, -1)]
head_z = lo.z + 0.80 * H
for h in hands:
    pass


def zone_weight(co):
    if co.z > head_z:
        return 1.0
    for h in hands:
        if (co - h).length < 0.09 * H:
            return 1.0
    return 0.0


for m_ in list(high.modifiers):                  # bake from the raw bind-pose mesh
    high.modifiers.remove(m_)
# --- hidden geometry: generated characters carry a body under the clothes. Faces that no outward ray can leave are removed from the full mesh,
# otherwise the decimator merges the two layers and the bake reads skin where the cloth should be.
from mathutils.bvhtree import BVHTree
hm_ = high.data
hm_.calc_loop_triangles()
bvh = BVHTree.FromPolygons([v.co.copy() for v in hm_.vertices], [tuple(p.vertices) for p in hm_.polygons])
import random
random.seed(7)
visible = []
for p in hm_.polygons:
    c = p.center; n = p.normal
    t1 = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized(); t2 = n.cross(t1)
    free = False
    for k in range(7):
        if k == 0:
            d = n
        else:
            a = k * 0.9; d = (n * 0.62 + (t1 * math.cos(a) + t2 * math.sin(a)) * 0.78).normalized()
        if bvh.ray_cast(c + n * 2e-4, d, 4.0)[0] is None:
            free = True; break
    visible.append(free)
bmh = bmesh.new(); bmh.from_mesh(hm_); bmh.faces.ensure_lookup_table()
hidden = [f for f, ok in zip(bmh.faces, visible) if not ok]
print("HIDDEN FACES", len(hidden), "of", len(visible))
bmesh.ops.delete(bmh, geom=hidden, context="FACES")
bmh.to_mesh(hm_); bmh.free()
hi_tris = len(high.data.polygons)

# --- the low mesh: a copy, welded (so that texture seams do not tear when edges collapse), UVs dropped
low = high.copy(); low.data = high.data.copy(); low.name = "Low"
bpy.context.collection.objects.link(low)
for m in list(low.modifiers):
    low.modifiers.remove(m)
for uv in list(low.data.uv_layers):
    low.data.uv_layers.remove(uv)
low.data.materials.clear()
bm = bmesh.new(); bm.from_mesh(low.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.to_mesh(low.data); bm.free()
low.data.update()
welded_tris = len(low.data.polygons)
PW = float(os.environ.get("MESHY_PROTECT", "0.98"))   # how much cheaper it is to collapse outside the head and hands (a lower value protects more)
zone = [zone_weight(v.co) for v in low.data.vertices]
if "--no-protect" not in flags:
    low.vertex_groups.new(name="protect")


def set_weights(protected_value, other_value):
    g = low.vertex_groups["protect"]
    for v, z in zip(low.data.vertices, zone):
        g.add([v.index], protected_value if z > 0 else other_value, "REPLACE")


def zone_share(obj):
    n = z = 0
    for p in obj.data.polygons:
        n += 1; z += 1 if zone_weight(obj.matrix_world @ p.center) > 0 else 0
    return z / max(n, 1), n


def run_decimate(obj, ratio):
    bpy.context.view_layer.objects.active = obj
    m = obj.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = ratio; m.use_collapse_triangulate = True
    if "--no-protect" not in flags:
        m.vertex_group = "protect"; m.vertex_group_factor = 1.0
    bpy.ops.object.modifier_apply(modifier=m.name)


variant = (PW, 1.0)
if "--no-protect" not in flags:
    best = None
    for var in ((PW, 1.0), (1.0, PW)):
        set_weights(*var)
        probe = low.copy(); probe.data = low.data.copy(); bpy.context.collection.objects.link(probe)
        run_decimate(probe, target_tris / welded_tris)
        share, n = zone_share(probe)
        print("PROBE", var, "zone share", round(share, 3), "triangles", n)
        if best is None or share > best[0]:
            best = (share, var)
        bpy.data.objects.remove(probe)
    variant = best[1]
    set_weights(*variant)
invert = variant
bpy.context.view_layer.objects.active = low
for attempt in range(4):
    got = len(low.data.polygons)
    if attempt and abs(got - target_tris) < 0.03 * target_tris:
        break
    run_decimate(low, min(1.0, target_tris / got))
    print("DECIMATE", attempt, len(low.data.polygons))
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.delete_loose()
bpy.ops.mesh.dissolve_degenerate(threshold=1e-6)
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode="OBJECT")
# save and reopen: the automatic unwrap shatters the surface into single triangles when it runs in the session that decimated it
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
bpy.ops.wm.open_mainfile(filepath=out_blend)
high = bpy.data.objects["High"]; low = bpy.data.objects["Low"]
bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.mode_set(mode="EDIT")
# --- UVs and textures: a fresh automatic unwrap of the cleaned, decimated surface, then the full mesh's base colour (and tangent normals) baked onto it
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(float(os.environ.get("MESHY_ANGLE", "66"))), island_margin=0.003, area_weight=0.6, correct_aspect=True, scale_to_bounds=True)
bpy.ops.uv.select_all(action="SELECT")
bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.shade_smooth()
low_tris = len(low.data.polygons)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"; scene.cycles.samples = 8; scene.cycles.use_denoising = False
scene.render.bake.margin = 8; scene.render.bake.margin_type = "EXTEND"
scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = 0.03 * H / 1.7
scene.render.bake.max_ray_distance = 0.12 * H / 1.7
scene.view_settings.view_transform = "Standard"
# the full mesh shows its base colour as emission, so the bake does not depend on its metallic and roughness maps
hm = high.data.materials[0]
tn = hm.node_tree
colour_node = next(n for n in tn.nodes if n.type == "TEX_IMAGE" and n.image.colorspace_settings.name == "sRGB")
emit = tn.nodes.new("ShaderNodeEmission"); tn.links.new(colour_node.outputs["Color"], emit.inputs["Color"])
out_node = next(n for n in tn.nodes if n.type == "OUTPUT_MATERIAL"); tn.links.new(emit.outputs[0], out_node.inputs["Surface"])


def bake_to(kind, filename, srgb):
    img = bpy.data.images.new(filename, tex_px, tex_px, alpha=False)
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    mat = bpy.data.materials.new(filename); mat.use_nodes = True
    low.data.materials.clear(); low.data.materials.append(mat)
    node = mat.node_tree.nodes.new("ShaderNodeTexImage"); node.image = img
    mat.node_tree.nodes.active = node
    bpy.ops.object.select_all(action="DESELECT")
    high.select_set(True); low.select_set(True)
    bpy.context.view_layer.objects.active = low
    if kind == "NORMAL":
        # the normal bake needs the full mesh's real shader: put the surface back on the principled output
        tn.links.new(next(n for n in tn.nodes if n.type == "BSDF_PRINCIPLED").outputs[0], out_node.inputs["Surface"])
        scene.render.bake.normal_space = "TANGENT"
        bpy.ops.object.bake(type="NORMAL")
        tn.links.new(emit.outputs[0], out_node.inputs["Surface"])
    else:
        bpy.ops.object.bake(type="EMIT")
    scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = 90
    img.save_render(os.path.join(out_dir, filename + ".jpg"), scene=scene)
    return mat


mat = bake_to("EMIT", f"{name}-color", True)
if "--normal" in flags:
    bake_to("NORMAL", f"{name}-normal", False)
low.data.materials.clear(); low.data.materials.append(mat)
info = {"name": name, "fullTriangles": full_tris, "visibleTriangles": hi_tris, "weldedTriangles": welded_tris, "reducedTriangles": low_tris, "texturePx": tex_px, "protectWeights": list(invert) if invert else None,
        "height": H, "box": {"min": list(lo), "max": list(hi)}}
json.dump(info, open(os.path.join(out_dir, f"{name}-reduce.json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print("REDUCED", info)
