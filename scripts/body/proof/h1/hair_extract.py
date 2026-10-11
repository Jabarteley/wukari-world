"""Cuts a hairstyle away from a generated figure that wears it on a bald-head design: keeps the dark hair surface, drops the face, body and clothes, and writes it as a small static piece.

  blender --background --disable-autoexec --python hair_extract.py -- <posed.blend> <out.glb> <out.json> --eye-below-crown 0.173 [--tris 2600] [--min-z 1.12]

The figure comes from pose_high.py (the object "High").  Faces are kept when their colour is dark and they are in the head or hang from it (above --min-z, near the middle), except the dark
features of the face itself (brows, eyes) in front of the head in the eye band.  Pieces that float free are dropped.  The json holds the figure's head box, crown and eye line in the glTF frame, which
the page uses to fit the piece to any head.  Every path is an argument.
"""
import json
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
posed, out_glb, out_json = pos[:3]
bpy.ops.wm.open_mainfile(filepath=posed)
ob = bpy.data.objects["High"]; me = ob.data
P = np.array([v.co[:] for v in me.vertices])
mat = me.materials[0]
tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image is not None and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links))
img = tex.image; img.colorspace_settings.name = "Non-Color"; IW, IH = img.size
pix = np.array(img.pixels[:]).reshape(IH, IW, 4)[:, :, :3]
uvl = me.uv_layers.active.data
vcol = np.zeros((len(P), 3), np.float32); seen = np.zeros(len(P), bool)
for loop in me.loops:
    vi = loop.vertex_index
    if not seen[vi]:
        u, v = uvl[loop.index].uv; vcol[vi] = pix[min(IH - 1, max(0, int(v * IH))), min(IW - 1, max(0, int(u * IW)))]; seen[vi] = True
lum = vcol.mean(axis=1)
crown = float(P[:, 2].max()); min_z = float(opts.get("--min-z", 1.12)); eye_z = crown - float(opts["--eye-below-crown"])
cy = float(np.median(P[(P[:, 2] > crown - 0.25) & (np.abs(P[:, 0]) < 0.1)][:, 1]))
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
keep = []
for f in bm.faces:
    c = f.calc_center_median(); l = lum[[v.index for v in f.verts]].mean()
    ok = l < 0.20 and c.z > min_z and abs(c.x) < 0.30
    if ok and abs(c.x) < 0.115 and c.y < cy - 0.03 and eye_z - 0.055 < c.z < eye_z + 0.05:
        ok = False                                   # the brows and eyes
    if ok and c.z < crown - 0.30 and abs(c.x) < 0.05:
        ok = False                                   # the neckline and the gap between the braids in front of the chest
    if ok:
        keep.append(f)
drop = [f for f in bm.faces if f not in set(keep)]
bmesh.ops.delete(bm, geom=drop, context="FACES")
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.faces.ensure_lookup_table()
seen_f = set(); comps = []
for f in bm.faces:
    if f in seen_f:
        continue
    st = [f]; comp = []; seen_f.add(f)
    while st:
        a = st.pop(); comp.append(a)
        for e in a.edges:
            for b in e.link_faces:
                if b not in seen_f:
                    seen_f.add(b); st.append(b)
    comps.append(comp)
comps.sort(key=len, reverse=True)
small = [f for comp in comps if len(comp) < 60 for f in comp]
bmesh.ops.delete(bm, geom=small, context="FACES")
bm.to_mesh(me); bm.free(); me.update()
bpy.context.view_layer.objects.active = ob
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.delete_loose(); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode="OBJECT")
n0 = len(me.polygons)
for g in list(ob.vertex_groups):
    ob.vertex_groups.remove(g)
dec = ob.modifiers.new("d", "DECIMATE"); dec.decimate_type = "COLLAPSE"; dec.ratio = min(1.0, float(opts.get("--tris", 2600)) / max(n0, 1)); dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.object.shade_smooth()
me.materials.clear()
# the head the piece was made on, from the skin-coloured surface of the head
Q = np.array([v.co[:] for v in me.vertices])
skin_zone = (P[:, 2] > crown - 0.30) & (P[:, 2] < crown - 0.02) & (np.abs(P[:, 0]) < 0.2)
ref = np.median(vcol[(P[:, 2] > eye_z - 0.04) & (P[:, 2] < eye_z + 0.0) & (np.abs(P[:, 0]) < 0.06) & (P[:, 1] < cy - 0.02)], axis=0)
sk = skin_zone & (np.linalg.norm(vcol - ref, axis=1) < 0.16)
hb = P[sk]
box = {"xmin": float(hb[:, 0].min()), "xmax": float(hb[:, 0].max()), "zmin": float(-hb[:, 1].max()), "zmax": float(-hb[:, 1].min()), "crownY": crown - 0.012, "eyeY": eye_z}
json.dump({"ref": box, "trianglesBefore": n0, "triangles": len(me.polygons)}, open(out_json, "w"))
print("HAIR", json.dumps(box), n0, len(me.polygons))
bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_animations=False, export_yup=True, export_image_format="NONE", export_materials="NONE")
