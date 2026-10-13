import bpy,hashlib,json
import numpy as np
from pathlib import Path
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/original-human-prototype.blend'))
ref=json.loads((P/'inputs/geometry-checks.json').read_text());rows=[]
for m in ref['meshes']:
 o=bpy.data.objects[m['name']];o.data.calc_loop_triangles()
 arrays={'positionSha256':np.array([tuple(v.co) for v in o.data.vertices],dtype='<f8'),'triangleOrderSha256':np.array([tuple(t.vertices) for t in o.data.loop_triangles],dtype='<u4'),'uvSha256':np.array([tuple(v.uv) for v in o.data.uv_layers.active.data],dtype='<f8')}
 for k,a in arrays.items():assert hashlib.sha256(a.tobytes()).hexdigest()==m[k],(o.name,k)
 for k,r in m['morphs'].items():
  delta=np.array([tuple(v.co) for v in o.data.shape_keys.key_blocks[k].data],dtype='<f8')-arrays['positionSha256'];assert hashlib.sha256(delta.tobytes()).hexdigest()==r['sha256'],(o.name,k)
 rows.append({'name':o.name,'uvLayer':o.data.uv_layers.active.name,'hashesVerified':list(arrays),'morphHashesVerified':len(m['morphs']),'material':o.data.materials[0].name})
props=[p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties if any(t in p.identifier for t in ['unused','material','variant'])]
try:import PIL;pil=PIL.__version__
except ImportError:pil=None
(P/'receipts/input-mesh-hashes.json').write_text(json.dumps({'status':'PASS','meshes':rows,'exportProperties':props,'pillow':pil},indent=2)+'\n')
print('VERIFIED',len(rows),'mesh position/triangle/UV + all actual morph hashes; export',props,'PIL',pil)
