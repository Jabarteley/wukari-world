"""Lists the connected pieces of a generated model (face count, size, centre, colour sample) so the unwanted extras can be picked.

  blender --background --disable-autoexec --python islands.py -- <in.glb>
"""
import sys
import bpy
import bmesh
from mathutils import Vector

src = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.data.objects if o.type == "MESH"]
print("OBJECTS", [(o.name, len(o.data.polygons), tuple(round(x, 3) for x in o.dimensions), tuple(round(x, 3) for x in o.rotation_euler), tuple(round(x, 3) for x in o.scale)) for o in objs])
o = objs[0]
bm = bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
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
islands.sort(key=lambda c: -len(c))
print("ISLANDS", len(islands))
for i, comp in enumerate(islands[:12]):
    vs = [v.co for f in comp for v in f.verts]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    print("ISLAND", i, "faces", len(comp), "min", tuple(round(x, 3) for x in lo), "max", tuple(round(x, 3) for x in hi))
