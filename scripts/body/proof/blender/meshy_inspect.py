"""Facts about a generated character .glb: triangles, materials, textures, skeleton, weights, size, pieces, UV use, arm angle.

  blender --background --disable-autoexec --python meshy_inspect.py -- <in.glb> <out.json>
"""
import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
info = {"file": os.path.basename(src), "bytes": os.path.getsize(src)}
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
info["meshObjects"] = [o.name for o in meshes]
tris = 0
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in meshes:
    me = o.data
    me.calc_loop_triangles()
    tris += len(me.loop_triangles)
    for v in me.vertices:
        w = o.matrix_world @ v.co
        lo = Vector((min(lo[i], w[i]) for i in range(3))); hi = Vector((max(hi[i], w[i]) for i in range(3)))
    bm = bmesh.new(); bm.from_mesh(me)
    seen = set(); pieces = 0
    for v in bm.verts:
        if v.index in seen: continue
        pieces += 1; stack = [v]; seen.add(v.index)
        while stack:
            c = stack.pop()
            for e in c.link_edges:
                n = e.other_vert(c)
                if n.index not in seen: seen.add(n.index); stack.append(n)
    # UV: fraction of the 0..1 square covered (64x64 grid) by triangle centroids' texels, and share of UV area vs surface area
    uv = me.uv_layers.active
    cells = set(); uvarea = 0.0; area3 = 0.0
    if uv:
        for t in me.loop_triangles:
            p = [uv.data[l].uv for l in t.loops]
            uvarea += abs((p[1][0]-p[0][0])*(p[2][1]-p[0][1]) - (p[2][0]-p[0][0])*(p[1][1]-p[0][1])) / 2
            area3 += t.area
            cells.add((int(((p[0][0]+p[1][0]+p[2][0])/3) * 64), int(((p[0][1]+p[1][1]+p[2][1])/3) * 64)))
    info.setdefault("meshes", []).append({"name": o.name, "vertices": len(me.vertices), "triangles": len(me.loop_triangles), "connectedPieces": pieces,
        "materials": [m.name for m in me.materials], "uvCoverage64": round(len(cells) / 4096, 3), "uvAreaShare": round(uvarea, 3), "surfaceArea": round(area3, 3),
        "vertexGroups": len(o.vertex_groups), "modifiers": [m.type for m in o.modifiers]})
info["triangles"] = tris
info["boundingBox"] = {"min": [round(c, 4) for c in lo], "max": [round(c, 4) for c in hi], "size": [round(hi[i] - lo[i], 4) for i in range(3)]}
info["units"] = {"scene": bpy.context.scene.unit_settings.system, "scale": bpy.context.scene.unit_settings.scale_length}
images = {}
for im in bpy.data.images:
    images[im.name] = {"size": list(im.size), "colorspace": im.colorspace_settings.name}
info["images"] = images
mats = {}
for m in bpy.data.materials:
    if m.node_tree:
        mats[m.name] = sorted({n.type + ":" + (n.image.name if n.type == "TEX_IMAGE" and n.image else "") for n in m.node_tree.nodes})
info["materials"] = mats
if arms:
    a = arms[0]
    bones = a.data.bones
    info["bones"] = {"count": len(bones), "names": [b.name for b in bones]}
    info["armatureScale"] = list(a.scale)
    heads = {b.name: [round(c, 4) for c in (a.matrix_world @ b.head_local)] for b in bones}
    info["boneHeads"] = heads
    def ang(a_, b_):
        v = Vector(heads[b_]) - Vector(heads[a_]); return round(math.degrees(math.atan2(-v.z, math.hypot(v.x, v.y))), 1)
    for side in ("Left", "Right"):
        try:
            info["armAngleBelowHorizontal_" + side] = ang(f"mixamorig:{side}Arm", f"mixamorig:{side}ForeArm")
            info["legAngleFromVertical_" + side] = round(math.degrees(math.atan2(abs(heads[f"mixamorig:{side}Leg"][0]-heads[f"mixamorig:{side}UpLeg"][0]), heads[f"mixamorig:{side}UpLeg"][2]-heads[f"mixamorig:{side}Leg"][2])), 1)
        except KeyError:
            pass
    stat = {}
    for o in meshes:
        names = {g.index: g.name for g in o.vertex_groups}
        counts = [0] * 9; used = {}
        for v in o.data.vertices:
            ws = [g for g in v.groups if g.weight > 1e-4]
            counts[min(len(ws), 8)] += 1
            for g in ws: used[names[g.group]] = used.get(names[g.group], 0) + 1
        stat[o.name] = {"influenceCountHistogram": counts, "verticesPerBone": used}
    info["weights"] = stat
    acts = [{"name": ac.name, "frames": list(ac.frame_range), "seconds": round((ac.frame_range[1] - ac.frame_range[0]) / bpy.context.scene.render.fps, 3)} for ac in bpy.data.actions]
    info["actions"] = acts
json.dump(info, open(out, "w"), indent=1)
print("INSPECTED", src, tris)
