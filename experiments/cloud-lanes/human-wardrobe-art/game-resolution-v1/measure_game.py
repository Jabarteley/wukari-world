"""Independent exported-byte counts and triangle quality; no renderer estimates."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
HERE=Path(__file__).resolve().parent
p=HERE/'artifacts/everyday-01-game-v1.glb';b=p.read_bytes();l,t=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+l]);data=b[28+l:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']];w={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 return np.frombuffer(data,dtype=dt,count=a['count']*w,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,w)
assert len(j['meshes'])==1 and len(j['meshes'][0]['primitives'])==1 and len(j['materials'])==1
assert not j.get('images') and not j.get('textures') and not j.get('skins')
prim=j['meshes'][0]['primitives'][0];pos=acc(prim['attributes']['POSITION']);idx=acc(prim['indices']).ravel();nor=acc(prim['attributes']['NORMAL']);col=acc(prim['attributes']['COLOR_0'])
assert np.isfinite(pos).all() and np.isfinite(nor).all() and np.isfinite(col).all()
tri=pos[idx].reshape(-1,3,3);e=tri[:,[1,2,0]]-tri;area=np.linalg.norm(np.cross(e[:,0],-e[:,2]),axis=1)/2
assert (area>1e-12).all();assert len(tri)<=3000
aspect=np.max(np.linalg.norm(e,axis=2),axis=1)**2/(2*area)
report={'status':'PASS','glbBytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'triangles':len(tri),'positionCount':len(pos),'primitives':1,'materials':1,'textures':0,'encodedTextureBytes':0,'decodedTextureBytes':0,'decodedGeometryBytes':sum(acc(i).nbytes for i in [prim['indices'],*prim['attributes'].values()]),'triangleReductionPercent':round((1-len(tri)/144840)*100,4),'triangleHeadroomUnder3000':3000-len(tri),'boundsGltfMetres':{'min':pos.min(axis=0).tolist(),'max':pos.max(axis=0).tolist()},'zeroOrNearZeroTriangles':int((area<1e-12).sum()),'minimumTriangleAreaM2':float(area.min()),'aspectP50P95Max':np.quantile(aspect,[.5,.95,1]).tolist(),'aspectCaveat':'Narrow intentional seams and edge returns are included; no collapse/decimation used. This is not proof of a production deformation topology.','skinBindings':0,'sourceHighBlendSha256':hashlib.sha256((HERE.parent/'artifacts/everyday-01-tailoring-form.blend').read_bytes()).hexdigest(),'sourceHighGlbSha256':hashlib.sha256((HERE.parent/'artifacts/everyday-01-on-form.glb').read_bytes()).hexdigest()}
(HERE/'receipts/export-measurements.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
