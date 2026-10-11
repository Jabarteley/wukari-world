"""Turns one generated street model into a game-size asset: removes the extras, fixes orientation, origin and scale, welds, decimates,
unwraps afresh (after a save and reopen) and bakes the base colour onto one small texture. Wheels can be cut out as their own parts.

  blender --background --disable-autoexec --python reduce_asset.py -- <in.glb> <config.json> <out-dir> <name> <triangles> <texture-px>

Writes <out-dir>/<name>.blend (the reduced parts as "Low.*", the cleaned full mesh as "High"), <out-dir>/<name>-color.jpg,
<out-dir>/<name>.raw.glb (plain glTF for the packer) and <out-dir>/<name>.json (the counts). Every path is an argument.

The config describes one asset (see configs/*.json). Keys, all optional except size:
  keep         islands (connected pieces) to keep: [{"minFaces": n, "box": [x0, x1, y0, y1, z0, z1]}] in the file's own axes (Blender, Z up);
               the default is every island with at least 3% of the faces
  cutBelow     delete faces lying wholly under this height (a ground disc fused to a trunk)
  deleteBoxes  delete faces whose centre is inside a box (file axes), for litter that is fused to the object
  yaw          degrees about Z so that the front faces -Y (which the glTF export turns into +Z, the game's forward)
  size         {"axis": "x"|"y"|"z", "metres": m}: the length of that axis after the turn
  mirrorFrom   "+x" or "-x": replace the other half by a mirror image of the good one
  hidden       false to keep faces no ray can leave from (default true: they are removed, otherwise thin shells fold)
  wheelBoxes   boxes (file axes) around wheels that are separate pieces in the file
  wheels       [{"name", "box": index into wheelBoxes, "side": "+x"|"-x", "axle": [y, z], "radius"} or {"name", "centre": [x, y, z], "radius", "halfWidth"} (final axes, axle along X)]
Result: forward is -Y, up is Z, origin on the ground at the centre of the footprint; each wheel part has its origin on its axle.
"""
import json
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

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


def components(bm):
    seen = set(); out = []
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
        out.append(comp)
    return out


def inside(p, box):
    return box[0] <= p.x <= box[1] and box[2] <= p.y <= box[3] and box[4] <= p.z <= box[5]


# --- cleanup on the full mesh: weld positions (UVs are kept per corner), find the connected pieces, keep the wanted ones
bm = bmesh.new(); bm.from_mesh(high.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
bm.faces.ensure_lookup_table()
if "cutBelow" in cfg:
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if max(v.co.z for v in f.verts) <= cfg["cutBelow"]], context="FACES")
    bm.faces.ensure_lookup_table()
for box in cfg.get("deleteBoxes", []):
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if inside(f.calc_center_median(), box)], context="FACES")
    bm.faces.ensure_lookup_table()
# wheels that are separate pieces: remember which box each face is in (an integer face attribute survives the later steps)
box_layer = bm.faces.layers.int.new("wheelbox")
islands = components(bm)
total = sum(len(c) for c in islands)
rules = cfg.get("keep") or [{"minFaces": int(0.03 * total)}]
doomed = []; kept = 0
for comp in islands:
    centre = sum((f.calc_center_median() for f in comp), Vector()) / len(comp)
    ok = any(len(comp) >= r.get("minFaces", 0) and ("box" not in r or inside(centre, r["box"])) for r in rules)
    if ok:
        kept += len(comp)
        for i, box in enumerate(cfg.get("wheelBoxes", [])):     # a whole connected piece whose centre is in the box is a wheel
            if inside(centre, box):
                for f in comp:
                    f[box_layer] = i + 1
    else:
        doomed += comp
print("ISLANDS", len(islands), "kept faces", kept, "removed faces", len(doomed))
bmesh.ops.delete(bm, geom=doomed, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
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

# --- symmetry: a generated vehicle is often clean on one side and broken on the other. The other half becomes a mirror image of the good one (cut on the
# centre plane, UVs kept, so both halves read the same texels of the original texture)
if cfg.get("mirrorFrom"):
    sign = 1 if cfg["mirrorFrom"] == "+x" else -1
    bm = bmesh.new(); bm.from_mesh(high.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-6, plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_inner=(sign > 0), clear_outer=(sign < 0))
    bmesh.ops.mirror(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], axis="X", merge_dist=1e-4)
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(high.data); bm.free(); high.data.update()
    print("MIRRORED from", cfg["mirrorFrom"], len(high.data.polygons), "faces")

# --- which faces are wheels: one integer per face (0 = body, n = the n-th wheel of the config)
wheels = cfg.get("wheels", [])
bm = bmesh.new(); bm.from_mesh(high.data); bm.faces.ensure_lookup_table()
wl = bm.faces.layers.int.get("wheel") or bm.faces.layers.int.new("wheel")
bl = bm.faces.layers.int.get("wheelbox")
for f in bm.faces:
    f[wl] = 0
    c = f.calc_center_median()
    for i, w in enumerate(wheels):
        if "centre" in w:
            cx, cy, cz = w["centre"]
            if abs(c.x - cx) <= w["halfWidth"] and math.hypot(c.y - cy, c.z - cz) <= w["radius"]:
                f[wl] = i + 1
        elif bl is not None and f[bl] == w["box"] + 1 and (("side" not in w) or (c.x > 0) == (w["side"] == "+x")):
            # a piece cut from the file can carry the mudguard with it: only what is within "radius" of the axle "axle": [y, z] turns with the wheel
            if "radius" not in w or math.hypot(c.y - w["axle"][0], c.z - w["axle"][1]) <= w["radius"]:
                f[wl] = i + 1
for i, w in enumerate(wheels):
    fs = [f for f in bm.faces if f[wl] == i + 1]
    if fs:
        vs = [v.co for f in fs for v in f.verts]
        print("WHEEL", w["name"], len(fs), "faces; x", round(min(v.x for v in vs), 2), round(max(v.x for v in vs), 2), "y", round(min(v.y for v in vs), 2), round(max(v.y for v in vs), 2), "z", round(min(v.z for v in vs), 2), round(max(v.z for v in vs), 2))
    else:
        print("WHEEL", w["name"], "no faces")
bm.to_mesh(high.data); bm.free(); high.data.update()

if os.environ.get("REDUCE_PROBE"):
    # a text picture of the full mesh seen from the side (columns y, rows z): where the axles are
    ny, nz = 70, 24
    grid = [[0] * ny for _ in range(nz)]
    for p in high.data.polygons:
        c = p.center
        gy = min(ny - 1, int((c.y - lo.y) / (hi.y - lo.y) * ny)); gz = min(nz - 1, int((c.z - lo.z) / (hi.z - lo.z) * nz))
        grid[gz][gy] += 1
    for row in reversed(grid):
        print("PROBE", "".join(" .:+#"[min(4, n // 2)] if n else " " for n in row))

# --- hidden geometry: generated vehicles and houses carry seats, floors and inner walls. A face that no ray can leave the object from is removed from the
# full mesh, otherwise the decimator merges inner and outer layers and folds the walls (the bake still sees whatever shows through a window).
if cfg.get("hidden", True):
    hm_ = high.data
    bvh = BVHTree.FromPolygons([v.co.copy() for v in hm_.vertices], [tuple(p.vertices) for p in hm_.polygons])
    reach = 3.0 * H
    visible = []
    for p in hm_.polygons:
        c = p.center; n = p.normal
        t1 = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized(); t2 = n.cross(t1)
        free = False
        for j in range(9):
            if j == 0:
                d = n
            else:
                a = j * 0.7; d = (n * 0.55 + (t1 * math.cos(a) + t2 * math.sin(a)) * 0.8).normalized()
            if bvh.ray_cast(c + n * 1e-3 * H, d, reach)[0] is None:
                free = True; break
        visible.append(free)
    bmh = bmesh.new(); bmh.from_mesh(hm_); bmh.faces.ensure_lookup_table()
    hidden = [f for f, ok in zip(bmh.faces, visible) if not ok]
    print("HIDDEN FACES", len(hidden), "of", len(visible))
    bmesh.ops.delete(bmh, geom=hidden, context="FACES")
    bmh.to_mesh(hm_); bmh.free()
    hm_.update()


# --- the low parts: copies of the body and of each wheel, without UVs, welded, decimated
def part_copy(part_id, label):
    obj = high.copy(); obj.data = high.data.copy(); obj.name = label
    bpy.context.collection.objects.link(obj)
    for uv in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(uv)
    obj.data.materials.clear()
    b = bmesh.new(); b.from_mesh(obj.data); b.faces.ensure_lookup_table()
    layer = b.faces.layers.int.get("wheel")
    bmesh.ops.delete(b, geom=[f for f in b.faces if f[layer] != part_id], context="FACES")
    bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context="VERTS")
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-5)
    bmesh.ops.triangulate(b, faces=b.faces)
    b.to_mesh(obj.data); b.free()
    obj.data.update()
    return obj


def collapse(obj, target):
    m = obj.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = min(1.0, target / len(obj.data.polygons)); m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name)


def decimate(obj, target):
    """Collapse to about `target` triangles, in steps (a long way in one go folds thin walls). When it stalls above the target, the loose shards are
    dropped smallest first, and if the surface is still far above the target (thin foliage) it is rebuilt as one closed surface with a voxel remesh
    and decimated again."""
    bpy.context.view_layer.objects.active = obj
    for step in range(12):
        got = len(obj.data.polygons)
        if got <= target * 1.03:
            break
        collapse(obj, max(target, int(got * 0.6)))
        if len(obj.data.polygons) >= got * 0.97:       # no progress
            break
    if len(obj.data.polygons) > 1.15 * target:
        b = bmesh.new(); b.from_mesh(obj.data); b.faces.ensure_lookup_table()
        comps = sorted(components(b), key=len)
        excess = len(obj.data.polygons) - target; drop = []
        for comp in comps[:-1]:
            if excess <= 0 or len(comp) > 30:
                break
            drop += comp; excess -= len(comp)
        bmesh.ops.delete(b, geom=drop, context="FACES")
        b.to_mesh(obj.data); b.free()
        print("DROPPED loose pieces:", len(drop), "faces")
        for step in range(6):
            got = len(obj.data.polygons)
            if got <= target * 1.03:
                break
            collapse(obj, max(target, int(got * 0.6)))
            if len(obj.data.polygons) >= got * 0.97:
                break
    voxel = H / 60
    while len(obj.data.polygons) > 2.0 * target and voxel < H / 8:
        obj.data.remesh_voxel_size = voxel
        bpy.ops.object.voxel_remesh()
        print("VOXEL", round(voxel, 3), len(obj.data.polygons))
        for step in range(6):
            got = len(obj.data.polygons)
            if got <= target * 1.03:
                break
            collapse(obj, max(target, int(got * 0.6)))
        voxel *= 1.4
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.dissolve_degenerate(threshold=1e-6)
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.object.mode_set(mode="OBJECT")


wheel_tris = max(36, int(0.05 * target_tris)) if wheels else 0
body_tris = target_tris - wheel_tris * len(wheels)
parts = [part_copy(0, "Low")]
welded_tris = len(parts[0].data.polygons)
for i, w in enumerate(wheels):
    parts.append(part_copy(i + 1, "LowWheel%d" % (i + 1)))
for o in parts:
    decimate(o, body_tris if o is parts[0] else wheel_tris)
# one object for the unwrap and the bake; every face remembers which part it belongs to
for i, o in enumerate(parts):
    a = o.data.attributes.new("part", "INT", "FACE")
    for p in o.data.polygons:
        a.data[p.index].value = i
pivots = []
for o in parts[1:]:
    pts = [v.co for v in o.data.vertices]
    pivots.append(Vector(((min(p.x for p in pts) + max(p.x for p in pts)) / 2, (min(p.y for p in pts) + max(p.y for p in pts)) / 2, (min(p.z for p in pts) + max(p.z for p in pts)) / 2)))
for i, w in enumerate(wheels):          # the axle is where the config puts it (cylinder wheels) or at the middle of the piece
    if "centre" in w:
        pivots[i] = Vector(w["centre"])
    elif "axle" in w:
        pivots[i].y, pivots[i].z = w["axle"]
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
if len(parts) > 1:
    bpy.ops.object.join()
low = parts[0] if len(parts) == 1 else bpy.context.view_layer.objects.active
low.name = "Low"
low_tris_before_unwrap = len(low.data.polygons)

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
scene.render.bake.cage_extrusion = float(os.environ.get("REDUCE_CAGE", "0.04")) * H
scene.render.bake.max_ray_distance = float(os.environ.get("REDUCE_RAY", "0.08")) * H
scene.view_settings.view_transform = "Standard"
tn = high.data.materials[0].node_tree
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

# --- the final material (one image, one principled shader), then the body and each wheel as its own object for the plain glTF the packer takes
mt = mat.node_tree
for n_ in list(mt.nodes):
    if n_.type != "TEX_IMAGE":
        mt.nodes.remove(n_)
pb = mt.nodes.new("ShaderNodeBsdfPrincipled"); pb.inputs["Roughness"].default_value = 0.9; pb.inputs["Metallic"].default_value = 0.0
mo = mt.nodes.new("ShaderNodeOutputMaterial")
mt.links.new(node.outputs["Color"], pb.inputs["Base Color"]); mt.links.new(pb.outputs[0], mo.inputs["Surface"])
img.pack()


def split_part(index, label):
    obj = low.copy(); obj.data = low.data.copy(); obj.name = label
    bpy.context.collection.objects.link(obj)
    b = bmesh.new(); b.from_mesh(obj.data); b.faces.ensure_lookup_table()
    layer = b.faces.layers.int.get("part")
    bmesh.ops.delete(b, geom=[f for f in b.faces if f[layer] != index], context="FACES")
    bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context="VERTS")
    b.to_mesh(obj.data); b.free()
    for a in list(obj.data.attributes):
        if a.name == "part":
            obj.data.attributes.remove(a)
    return obj


outs = [split_part(0, name)]
for i, w in enumerate(wheels):
    o = split_part(i + 1, w["name"])
    pv = pivots[i]
    for v in o.data.vertices:        # the origin of the part goes on the axle: shift the vertices, then the object, so it stays where it was
        v.co -= pv
    o.location = pv
    outs.append(o)
for o in bpy.data.objects:
    if o.type == "MESH" and o not in outs:
        o.hide_render = True
bpy.ops.object.select_all(action="DESELECT")
for o in outs:
    o.select_set(True)
bpy.context.view_layer.objects.active = outs[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, name + ".raw.glb"), export_format="GLB", use_selection=True, export_image_format="JPEG",
                          export_jpeg_quality=int(os.environ.get("REDUCE_QUALITY", "86")), export_yup=True, export_apply=False, export_cameras=False,
                          export_lights=False, export_animations=False)
info = {"name": name, "originalTriangles": original_tris, "weldedTriangles": welded_tris, "reducedTriangles": low_tris, "texturePx": tex_px,
        "size": [round(x, 3) for x in size], "keptFaces": kept, "removedFaces": len(doomed),
        "parts": [name] + [w["name"] for w in wheels], "partTriangles": [len(o.data.polygons) for o in outs]}
json.dump(info, open(os.path.join(out_dir, name + ".json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("REDUCED", info)
