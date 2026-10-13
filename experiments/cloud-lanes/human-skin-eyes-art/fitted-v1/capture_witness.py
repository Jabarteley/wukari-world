"""Bind final saved mesh hashes and capture half-blink intersection triangles for review."""
import bpy,json,hashlib
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent;bpy.ops.wm.open_mainfile(filepath=str(P/'artifacts/fitted-human-skin-eyes-v1.blend'))
ref=json.loads((P/'inputs/geometry-checks.json').read_text());hashes={};meshes={}
for ob in bpy.context.scene.objects:
 if ob.type!='MESH' or ob.name.startswith('STUDIO'):continue
 ob.data.calc_loop_triangles();a=np.array([tuple(v.co) for v in ob.data.vertices],dtype='<f8');t=np.array([tuple(v.vertices) for v in ob.data.loop_triangles],dtype='<u4');u=np.array([tuple(v.uv) for v in ob.data.uv_layers['Prototype_UV_v1' if ob.name in [r['name'] for r in ref['meshes']] else 'Fitted_Cornea_UV_v1'].data],dtype='<f8')
 ds={k.name:np.array([tuple(v.co) for v in k.data],dtype='<f8')-a for k in ob.data.shape_keys.key_blocks if k.name!='Basis'}
 h={'positionSha256':hashlib.sha256(a.tobytes()).hexdigest(),'triangleOrderSha256':hashlib.sha256(t.tobytes()).hexdigest(),'uvSha256':hashlib.sha256(u.tobytes()).hexdigest(),'morphs':{k:hashlib.sha256(v.tobytes()).hexdigest() for k,v in ds.items()}}
 r=next((r for r in ref['meshes'] if r['name']==ob.name),None)
 if r:
  for k in ['positionSha256','triangleOrderSha256','uvSha256']:assert r[k]==h[k]
  for k,v in h['morphs'].items():assert r['morphs'][k]['sha256']==v
 hashes[ob.name]=h
 for side in ['Left','Right']:
  k='expression.blink'+side
  if k in ds:a+=.5*ds[k]
 meshes[ob.name]=(a,t,BVHTree.FromPolygons(a.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9))
w=[]
for side in ['Left','Right']:
 a,t,ct=meshes['Fitted_Cornea_'+side];b,bt,lt=meshes['UpperLid_'+side];pairs=ct.overlap(lt);ids=sorted(set(i for i,j in pairs));lids=sorted(set(j for i,j in pairs))
 w.append({'side':side,'trianglePairs':len(pairs),'corneaTriangleIds':ids,'lidTriangleIds':lids,'corneaTrianglesGLTF':[[[float(p[0]),float(p[2]),float(-p[1])] for p in a[t[i]]] for i in ids],'lidTrianglesGLTF':[[[float(p[0]),float(p[2]),float(-p[1])] for p in b[bt[i]]] for i in lids]})
count=sum(x['trianglePairs'] for x in w)
(P/'receipts/final-source-preservation.json').write_text(json.dumps({'status':'PASS','blendSha256':hashlib.sha256((P/'artifacts/fitted-human-skin-eyes-v1.blend').read_bytes()).hexdigest(),'verifiedOriginalMeshes':31,'meshes':hashes},indent=2)+'\n')
(P/'receipts/half-blink-witness.json').write_text(json.dumps({'case':{'expression.blinkLeft':.5,'expression.blinkRight':.5},'status':'PASS' if count==0 else 'FIT_REVIEW_REQUIRED','newCorneaUpperLidTrianglePairs':count,'witnesses':w},indent=2)+'\n');print('Final original data preserved; half-blink triangle pairs:',count)
assert count==0, 'Added cornea half-blink intersections remain'
