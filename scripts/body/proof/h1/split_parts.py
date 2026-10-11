"""Splits a posed figure (from pose_high.py) at the neck into a head part and a body part, each a new blend file with the object "High".

  blender --background --disable-autoexec --python split_parts.py -- <posed.blend> <joints.json> <cut-z> <out-head.blend> <out-body.blend> <out-seam.json> [--head-down 0.015] [--body-up 0.02]

The head keeps everything above (cut - head-down), the body everything below (cut + body-up); the two overlap by a few centimetres so that any head can sit inside any body's neck.
Triangles are cut exactly at the planes (no gaps) and the generator's joint groups are kept for the binding step.  The seam file records the neck ring at the cut
(centre and radii in x and y), the head's size and the heights the hair fitting needs.  Every path is an argument.
"""
import json
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
posed, joints_json, cut, out_head, out_body, out_seam = pos[:6]
cut = float(cut); down = float(opts.get("--head-down", 0.015)); up = float(opts.get("--body-up", 0.02))
bpy.ops.wm.open_mainfile(filepath=posed)
high = bpy.data.objects["High"]
P = np.array([v.co[:] for v in high.data.vertices])
# the colour of every vertex (first loop), to tell skin from collars and prints
mat = high.data.materials[0]
tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image is not None and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links))
img = tex.image; img.colorspace_settings.name = "Non-Color"
IW, IH = img.size
pix = np.array(img.pixels[:]).reshape(IH, IW, 4)[:, :, :3]
uvl = high.data.uv_layers.active.data
vcol = np.zeros((len(P), 3), dtype=np.float32)
seen = np.zeros(len(P), bool)
for loop in high.data.loops:
    vi = loop.vertex_index
    if not seen[vi]:
        u, v = uvl[loop.index].uv
        vcol[vi] = pix[min(IH - 1, max(0, int(v * IH))), min(IW - 1, max(0, int(u * IW)))]; seen[vi] = True
crown = P[:, 2].max()
zone = (P[:, 2] > crown - 0.16) & (P[:, 2] < crown - 0.08) & (np.abs(P[:, 0]) < 0.09)
skin_ref = np.median(vcol[zone], axis=0)
skin_like = np.linalg.norm(vcol - skin_ref, axis=1) < 0.16
slab = P[(P[:, 2] > cut - 0.006) & (P[:, 2] < cut + 0.006) & (np.abs(P[:, 0]) < 0.2) & skin_like]
cx, cy = float((slab[:, 0].max() + slab[:, 0].min()) / 2), float((slab[:, 1].max() + slab[:, 1].min()) / 2)
rx, ry = float((slab[:, 0].max() - slab[:, 0].min()) / 2), float((slab[:, 1].max() - slab[:, 1].min()) / 2)
headv = P[P[:, 2] > cut + 0.02]
headv = headv[np.abs(headv[:, 0]) < 0.25]
seam = {"cut": cut, "ring": {"cx": cx, "cy": cy, "rx": rx, "ry": ry}, "headDown": down, "bodyUp": up,
        "head": {"crown": float(headv[:, 2].max()), "xmin": float(headv[:, 0].min()), "xmax": float(headv[:, 0].max()), "ymin": float(headv[:, 1].min()), "ymax": float(headv[:, 1].max())},
        "joints": json.load(open(joints_json))["joints"]}
json.dump(seam, open(out_seam, "w"), indent=1)
print("SEAM", json.dumps(seam["ring"]), "crown", seam["head"]["crown"])


def _unused(z_plane, above):
    bm = bmesh.new(); bm.from_mesh(high.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z_plane), plane_no=(0, 0, 1), clear_inner=above, clear_outer=not above)
    # clear_inner removes the side the normal points away from; faces cut are re-closed along the plane by the bisect, the open boundary is left open on purpose
    bm.to_mesh(high.data); bm.free(); high.data.update()


orig = high.data.copy()
if "--head-skin-only" in opts:
    # faces of the head part below this height that are not skin (a collar, a neckline) are not part of the head
    lim = float(opts["--head-skin-only"])
    bm = bmesh.new(); bm.from_mesh(high.data); bm.verts.ensure_lookup_table()
    drop = [f for f in bm.faces if f.calc_center_median().z < lim and not all(skin_like[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=drop, context="FACES"); bm.to_mesh(high.data); bm.free()
    head_source = high.data.copy(); high.data = orig.copy()
else:
    head_source = orig
for name, z_plane, above, path in (("head", cut - down, True, out_head), ("body", cut + up, False, out_body)):
    high.data = (head_source if name == "head" else orig).copy()
    bm = bmesh.new(); bm.from_mesh(high.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z_plane), plane_no=(0, 0, 1), clear_inner=above, clear_outer=not above)
    bm.to_mesh(high.data); bm.free(); high.data.update()
    # loose vertices left by the cut
    bpy.context.view_layer.objects.active = high
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode="OBJECT")
    print("PART", name, len(high.data.polygons), "triangles-ish")
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True)
