"""Turns one generated street model into a game-size asset: removes the extras, fixes orientation, origin and scale, welds, decimates,
unwraps afresh (after a save and reopen) and bakes the base colour onto one small texture.

  blender --background --disable-autoexec --python reduce_asset.py -- <in.glb> <config.json> <out-dir> <name> <triangles> <texture-px>

Writes <out-dir>/<name>.blend (the reduced mesh "Low", the cleaned full mesh "High"), <out-dir>/<name>-color.jpg and <out-dir>/<name>.json.
Every path is an argument. The config describes one asset (see configs/*.json):
  keep      islands (connected pieces) to keep: {"minFaces": n, "box": [x0, x1, y0, y1, z0, z1]} in the file's own axes (Blender Z up); default is every island with at least 3% of the faces
  cutBelow  delete faces lying wholly under this height (a ground disc fused to a trunk)
  yaw       degrees about Z so that the front faces -Y (which the game's glTF export turns into +Z)
  size      {"axis": "x"|"y"|"z", "metres": m}: the real-world length of that axis after the turn
Forward is -Y, up is Z, origin on the ground at the centre of the footprint.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, cfg_path, out_dir, name, target_tris, tex_px = argv[0], argv[1], argv[2], argv[3], int(argv[4]), int(argv[5])
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

# --- cleanup on the full mesh: weld positions (UVs are kept per corner), find the connected pieces, keep the wanted ones
bm = bmesh.new(); bm.from_mesh(high.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
bm.faces.ensure_lookup_table()
for z_cut in ([cfg["cutBelow"]] if "cutBelow" in cfg else []):
    gone = [f for f in bm.faces if max(v.co.z for v in f.verts) <= z_cut]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.faces.ensure_lookup_table()
for box in cfg.get("deleteBoxes", []):
    gone = [f for f in bm.faces if box[0] <= f.calc_center_median().x <= box[1] and box[2] <= f.calc_center_median().y <= box[3] and box[4] <= f.calc_center_median().z <= box[5]]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.faces.ensure_lookup_table()
seen = set(); islands = []
for f in bm.faces:
    if f.index in seen:
        continue
    stack = [f]; seen.add(f.index); comp = []
    while stack:
        c = stack.pop(); comp.append(c)
        for e in c.edges:
            for n in e.link_faces:
                if n.index not in seen:
                    seen.add(n.index); stack.append(n)
    islands.append(comp)
total = sum(len(c) for c in islands)
rules = cfg.get("keep") or [{"minFaces": int(0.03 * total)}]
doomed = []
kept = 0
for comp in islands:
    centre = sum((f.calc_center_median() for f in comp), Vector()) / len(comp)
    ok = any(len(comp) >= r.get("minFaces", 0) and (("box" not in r) or (r["box"][0] <= centre.x <= r["box"][1] and r["box"][2] <= centre.y <= r["box"][3] and r["box"][4] <= centre.z <= r["box"][5])) for r in rules)
    if ok:
        kept += len(comp)
    else:
        doomed += comp
print("ISLANDS", len(islands), "kept faces", kept, "removed faces", len(doomed))
bmesh.ops.delete(bm, geom=doomed, context="FACES")
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context="VERTS")
bm.to_mesh(high.data); bm.free()
high.data.update()

# --- orientation, scale, origin
bpy.context.view_layer.objects.active = high
high.rotation_mode = "XYZ"      # the importer leaves objects in quaternion mode, which ignores Euler angles
high.rotation_euler = (0, 0, math.radians(cfg.get("yaw", 0)))
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def bounds(obj):
    pts = [obj.matrix_world @ v.co for v in obj.data.vertices]      # not bound_box: it is stale until the depsgraph updates
    return Vector((min(p[i] for p in pts) for i in range(3))), Vector((max(p[i] for p in pts) for i in range(3)))


lo, hi = bounds(high)
axis = "xyz".index(cfg["size"]["axis"])
k = cfg["size"]["metres"] / (hi[axis] - lo[axis])
high.scale = (k, k, k)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bounds(high)
high.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bounds(high)
size = hi - lo
H = max(size)
print("SIZE", tuple(round(x, 3) for x in size))

# --- symmetry: a generated vehicle is often clean on one side and broken on the other. With "mirrorFrom": "+x" or "-x" the other half is replaced by
# a mirror image of the good one (cut on the centre plane, UVs kept, so both halves read the same texels of the original texture)
if cfg.get("mirrorFrom"):
    sign = 1 if cfg["mirrorFrom"] == "+x" else -1
    bm = bmesh.new(); bm.from_mesh(high.data)
    cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-6, plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_inner=(sign > 0), clear_outer=(sign < 0))
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.mirror(bm, geom=geom, axis="X", merge_dist=1e-4)
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(high.data); bm.free(); high.data.update()
    print("MIRRORED from", cfg["mirrorFrom"], len(high.data.polygons), "faces")

# --- hidden geometry: generated vehicles and houses carry seats, floors and inner walls. A face that no ray can leave the object from is removed from
# the full mesh, otherwise the decimator merges inner and outer layers and folds the walls (the bake still sees whatever shows through a window).
if cfg.get("hidden", True):
    from mathutils.bvhtree import BVHTree
    import random
    hm_ = high.data
    bvh = BVHTree.FromPolygons([v.co.copy() for v in hm_.vertices], [tuple(p.vertices) for p in hm_.polygons])
    random.seed(7)
    reach = 3.0 * H
    visible = []
    for p in hm_.polygons:
        c = p.center; n = p.normal
        t1 = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized(); t2 = n.cross(t1)
        free = False
        for k in range(9):
            if k == 0:
                d = n
            else:
                a = k * 0.7; d = (n * 0.55 + (t1 * math.cos(a) + t2 * math.sin(a)) * 0.8).normalized()
            if bvh.ray_cast(c + n * 1e-3 * H, d, reach)[0] is None:
                free = True; break
        visible.append(free)
    bmh = bmesh.new(); bmh.from_mesh(hm_); bmh.faces.ensure_lookup_table()
    hidden = [f for f, ok in zip(bmh.faces, visible) if not ok]
    print("HIDDEN FACES", len(hidden), "of", len(visible))
    bmesh.ops.delete(bmh, geom=hidden, context="FACES")
    bmh.to_mesh(hm_); bmh.free()
    hm_.update()

# --- the low mesh: a copy without UVs, decimated
low = high.copy(); low.data = high.data.copy(); low.name = "Low"
bpy.context.collection.objects.link(low)
for uv in list(low.data.uv_layers):
    low.data.uv_layers.remove(uv)
low.data.materials.clear()
bm = bmesh.new(); bm.from_mesh(low.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.to_mesh(low.data); bm.free()
welded_tris = len(low.data.polygons)
bpy.context.view_layer.objects.active = low
for attempt in range(5):
    got = len(low.data.polygons)
    if attempt and abs(got - target_tris) < 0.03 * target_tris:
        break
    m = low.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = min(1.0, target_tris / got); m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name)
# thin foliage (single-sided shards) will not collapse below a floor: when the decimator stalls well above the target, rebuild the shape as one
# closed surface with a voxel remesh (a blobby crown, which is what a far tree should be anyway) and decimate that; the bake still reads the full mesh
voxel = H / 60
while len(low.data.polygons) > 1.15 * target_tris and voxel < H / 8:
    low.data.remesh_voxel_size = voxel
    bpy.ops.object.voxel_remesh()
    print("VOXEL", round(voxel, 3), len(low.data.polygons))
    for attempt in range(4):
        got = len(low.data.polygons)
        if abs(got - target_tris) < 0.03 * target_tris or got < target_tris:
            break
        m = low.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = min(1.0, target_tris / got); m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=m.name)
    voxel *= 1.4
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.delete_loose()
bpy.ops.mesh.dissolve_degenerate(threshold=1e-6)
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode="OBJECT")
# the automatic unwrap shatters the surface into single triangles in the session that decimated it: save, reopen, unwrap
blend = os.path.join(out_dir, name + ".blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.wm.open_mainfile(filepath=blend)
high = bpy.data.objects["High"]; low = bpy.data.objects["Low"]
bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.uv.smart_project(angle_limit=math.radians(float(os.environ.get("REDUCE_ANGLE", "66"))), island_margin=0.004, area_weight=0.6, correct_aspect=True, scale_to_bounds=True)
bpy.ops.uv.select_all(action="SELECT")
bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.shade_smooth()
low_tris = len(low.data.polygons)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"; scene.cycles.samples = 8; scene.cycles.use_denoising = False
scene.render.bake.margin = 6; scene.render.bake.margin_type = "EXTEND"
scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = float(os.environ.get('REDUCE_CAGE', '0.04')) * H
scene.render.bake.max_ray_distance = float(os.environ.get('REDUCE_RAY', '0.08')) * H
scene.view_settings.view_transform = "Standard"
hm = high.data.materials[0]
tn = hm.node_tree
# the exporter also wires an emissive copy of an image: take the one that feeds the base colour
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
bpy.ops.object.select_all(action="DESELECT")
high.select_set(True); low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(type="EMIT")
scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = int(os.environ.get("REDUCE_QUALITY", "86"))
img.save_render(os.path.join(out_dir, name + "-color.jpg"), scene=scene)
# --- the final material (one image, one principled shader) and the plain glTF the packer takes
mt = mat.node_tree
for n_ in list(mt.nodes):
    if n_.type != "TEX_IMAGE":
        mt.nodes.remove(n_)
pb = mt.nodes.new("ShaderNodeBsdfPrincipled"); pb.inputs["Roughness"].default_value = 0.9; pb.inputs["Metallic"].default_value = 0.0
mo = mt.nodes.new("ShaderNodeOutputMaterial")
mt.links.new(node.outputs["Color"], pb.inputs["Base Color"]); mt.links.new(pb.outputs[0], mo.inputs["Surface"])
img.pack()
low.name = name
bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=int(os.environ.get("REDUCE_QUALITY", "86")),
                          export_yup=True, export_apply=False, export_cameras=False, export_lights=False, export_animations=False)
low.name = "Low"
info = {"name": name, "originalTriangles": original_tris, "weldedTriangles": welded_tris, "reducedTriangles": low_tris, "texturePx": tex_px,
        "size": [round(x, 3) for x in size], "keptFaces": kept, "removedFaces": len(doomed)}
json.dump(info, open(os.path.join(out_dir, name + ".json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("REDUCED", info)
