"""Cuts a generated hair or head-wrap piece away from the mannequin head and neck it was generated on.

  blender --background --disable-autoexec --python hair_cut.py -- <piece.glb> <out.blend> <out-colour.jpg> <out-info.json> --keep dark|notwhite [--tris 2000] [--px 512]

--keep dark keeps the dark hair (and drops everything lighter: the face, bust and stand); --keep notwhite keeps the coloured cloth and drops the white mannequin.
Faces are judged by the base colour at their middle.  Small floating islands are dropped, the rest is decimated, and the base colour is written at a small size on the
piece's own UV layout.  The removed faces' extent (the mannequin head) is written to the info file so the piece can be fitted to another head.  Every path is an argument.
"""
import json
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
src, out_blend, out_jpg, out_info = pos[:4]
keep = opts["--keep"]; target = int(opts.get("--tris", 2000)); px_out = int(opts.get("--px", 512))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.polygons))
for o in list(bpy.data.objects):
    if o is not ob:
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
ob.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
mat = me.materials[0]
tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image is not None and any(l.to_node.type == "BSDF_PRINCIPLED" and l.to_socket.name == "Base Color" for l in n.outputs[0].links))
img = tex.image
img.colorspace_settings.name = "Non-Color"
W, H = img.size
px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3]
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
uvl = bm.loops.layers.uv.active
drop, kept_n = [], 0
for f in bm.faces:
    u = np.mean([l[uvl].uv[0] for l in f.loops]); v = np.mean([l[uvl].uv[1] for l in f.loops])
    c = px[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int(u * W)))]
    lum = float(c.mean()); sat = float(c.max() - c.min())
    ok = (lum < 0.20) if keep == "dark" else (not (lum > 0.62 and sat < 0.22))
    if not ok:
        drop.append(f)
head_pts = np.array([f.calc_center_median()[:] for f in drop]) if drop else np.zeros((0, 3))
print("DROP", len(drop), "of", len(bm.faces), "image", img.name, img.size[:], float(px.mean()))
bmesh.ops.delete(bm, geom=drop, context="FACES")
# drop floating islands (the import splits vertices along texture seams: weld them first so that neighbours are connected)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.faces.ensure_lookup_table()
seen = set(); islands = []
for f in bm.faces:
    if f in seen:
        continue
    stack = [f]; comp = []
    seen.add(f)
    while stack:
        a = stack.pop(); comp.append(a)
        for e in a.edges:
            for b in e.link_faces:
                if b not in seen:
                    seen.add(b); stack.append(b)
    islands.append(comp)
islands.sort(key=len, reverse=True)
small = [f for comp in islands if len(comp) < max(40, 0.03 * len(islands[0])) for f in comp]
bmesh.ops.delete(bm, geom=small, context="FACES")
print("AFTER ISLANDS", len(bm.faces), len(islands), [len(c) for c in islands[:5]])
bm.to_mesh(me); bm.free()
me.update()
# loose vertices
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode="OBJECT")
n0 = len(me.polygons)
tri = bpy.context.object.modifiers.new("t", "TRIANGULATE"); bpy.ops.object.modifier_apply(modifier=tri.name)
m = ob.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = min(1.0, target / max(len(me.polygons), 1)); m.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth()
pts = np.array([v.co[:] for v in me.vertices])
info = {"trianglesBefore": n0, "triangles": len(me.polygons), "keptMin": pts.min(axis=0).tolist(), "keptMax": pts.max(axis=0).tolist(),
        "removedMin": head_pts.min(axis=0).tolist() if len(head_pts) else None, "removedMax": head_pts.max(axis=0).tolist() if len(head_pts) else None,
        "removedFaces": len(drop), "islands": len(islands)}
json.dump(info, open(out_info, "w"), indent=1)
print("HAIRCUT", info)
# the base colour at a small size on the piece's own layout (block average)
k = W // px_out
small = px.reshape(px_out, k, px_out, k, 3).mean(axis=(1, 3))
buf = np.concatenate([small, np.ones((px_out, px_out, 1))], axis=2).astype(np.float32)
simg = bpy.data.images.new("small", px_out, px_out, alpha=False)
simg.colorspace_settings.name = "Non-Color"
simg.pixels.foreach_set(buf.ravel())
bpy.context.scene.render.image_settings.file_format = "JPEG"; bpy.context.scene.render.image_settings.quality = 80
simg.save_render(out_jpg, scene=bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
