"""Read actual glTF buffers including sparse morph accessors; no Blender dependency."""
from pathlib import Path
import json,struct,hashlib
import numpy as np
H=Path(__file__).resolve().parent;p=H/'artifacts/everyday-01-envelope-v1.glb';b=p.read_bytes();n,t=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+n]);data=b[28+n:]
D={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'};W={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def view(vi,dtype,count,width,offset=0):
 v=j['bufferViews'][vi];dt=np.dtype(dtype);return np.ndarray((count,width),dtype=dt,buffer=data,offset=v.get('byteOffset',0)+offset,strides=(v.get('byteStride',dt.itemsize*width),dt.itemsize)).copy()
def acc(i):
 a=j['accessors'][i];w=W[a['type']];dt=D[a['componentType']]
 r=view(a['bufferView'],dt,a['count'],w,a.get('byteOffset',0)) if 'bufferView' in a else np.zeros((a['count'],w),dtype=dt)
 if 'sparse' in a:
  s=a['sparse'];ii=s['indices'];v=s['values'];indices=view(ii['bufferView'],D[ii['componentType']],s['count'],1,ii.get('byteOffset',0)).ravel();r[indices]=view(v['bufferView'],dt,s['count'],w,v.get('byteOffset',0))
 return r
assert len(j['meshes'])==1 and len(j['materials'])==1 and not j.get('textures') and not j.get('skins')
mesh=j['meshes'][0];p0=mesh['primitives'][0];pos=acc(p0['attributes']['POSITION']);idx=acc(p0['indices']).ravel();targets=[acc(t['POSITION']) for t in p0['targets']];names=mesh['extras']['targetNames'];assert names==['body.height','body.shoulderWidth'];assert len(idx)//3==2324
cases=[]
for h,s in [(0,0),(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
 q=pos+targets[0]*h+targets[1]*s;assert np.isfinite(q).all();tri=q[idx].reshape(-1,3,3);area=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)/2;assert (area>1e-12).all()
 cases.append({'height':h,'shoulderWidth':s,'minTriangleAreaM2':float(area.min()),'boundsGltfMetres':{'min':q.min(axis=0).tolist(),'max':q.max(axis=0).tolist()}})
baseBytes=sum(acc(i).nbytes for i in [p0['indices'],*p0['attributes'].values()]);morphBytes=sum(a.nbytes for a in targets)
r={'status':'PASS','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'triangles':len(idx)//3,'vertices':len(pos),'drawPrimitives':1,'materials':1,'textures':0,'textureBytes':0,'skins':0,'animationClips':0,'morphTargets':names,'normalMorphTargets':False,'decodedBaseGeometryBytes':baseBytes,'decodedMorphPositionBytes':morphBytes,'decodedGeometryAndMorphBytes':baseBytes+morphBytes,'gltfBufferBytes':j['buffers'][0]['byteLength'],'sampledDecodedMorphCases':cases,'sourceIntersectionsCheck':'fit-checks.json tests all 17 body/garment source states; decoded export checks finite geometry and triangle areas for the nine distinct garment states','acceptance':'Sampled clothed-envelope overlay only, no final rig/body/game/phone acceptance'}
(H/'receipts/export-measurements.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='sampledDecodedMorphCases'},indent=2))
