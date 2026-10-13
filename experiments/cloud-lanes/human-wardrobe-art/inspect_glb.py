"""Read exported bytes independently of Blender. No mutation of source art."""
import hashlib,json,struct,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
path=HERE/'artifacts/everyday-01-on-form.glb'
b=path.read_bytes();magic,version,size=struct.unpack_from('<4sII',b);assert (magic,version,size)==(b'glTF',2,len(b))
jslen,jstype=struct.unpack_from('<II',b,12);assert jstype==0x4e4f534a
j=json.loads(b[20:20+jslen]);binstart=20+jslen+8
binlen,bintype=struct.unpack_from('<II',b,20+jslen);assert bintype==0x004e4942
buf=b[binstart:binstart+binlen]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];item=np.dtype(dt).itemsize
 return np.ndarray((a['count'],n),dtype=dt,buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*item),item)).copy()
def local(node):
 if 'matrix' in node:return np.array(node['matrix']).reshape(4,4).T
 x,y,z,w=node.get('rotation',[0,0,0,1]);m=np.eye(4)
 m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(node.get('scale',[1,1,1]))
 m[:3,3]=node.get('translation',[0,0,0]);return m
world={}
def walk(i,parent):
 world[i]=parent@local(j['nodes'][i])
 for child in j['nodes'][i].get('children',[]):walk(child,world[i])
for i in j['scenes'][j.get('scene',0)]['nodes']:walk(i,np.eye(4))
rows=[];allpts=[];issues=[]
for ni,node in enumerate(j.get('nodes',[])):
 if 'mesh' not in node:continue
 name=node.get('name','');tris=verts=degen=0;slots=[];bb=[]
 for p in j['meshes'][node['mesh']]['primitives']:
  assert p.get('mode',4)==4
  pp=acc(p['attributes']['POSITION']);pp=(np.c_[pp,np.ones(len(pp))]@world[ni].T)[:,:3];assert np.isfinite(pp).all();bb.append(pp);allpts.append(pp)
  ii=acc(p['indices']).ravel();assert len(ii)%3==0 and ii.max()<len(pp)
  tri=pp[ii].reshape((-1,3,3));areas=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)*.5
  degen+=int((areas<1e-12).sum());tris+=len(ii)//3;verts+=len(pp);slots.append(p.get('material'))
  if 'NORMAL' in p['attributes']:
   nn=acc(p['attributes']['NORMAL']);assert np.isfinite(nn).all();assert np.max(np.abs(np.linalg.norm(nn,axis=1)-1))<.002
 pp=np.concatenate(bb)
 rows.append({'name':name,'fixture':name.startswith('FIXTURE_'),'triangles':tris,'positionCount':verts,'nearZeroAreaTriangles':degen,'materialSlots':slots,'boundsMetres':{'min':pp.min(axis=0).tolist(),'max':pp.max(axis=0).tolist()}})
pp=np.concatenate(allpts)
images=[]
from PIL import Image
from io import BytesIO
for im in j.get('images',[]):
 v=j['bufferViews'][im['bufferView']];d=buf[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];img=Image.open(BytesIO(d))
 images.append({'name':im.get('name'),'mimeType':im['mimeType'],'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest(),'dimensions':list(img.size),'decodedRGBABytes':img.width*img.height*4})
materials=[{'name':m.get('name'), 'pbr':m.get('pbrMetallicRoughness'), 'normalTexture':m.get('normalTexture'), 'alphaMode':m.get('alphaMode','OPAQUE'),'doubleSided':m.get('doubleSided',False)} for m in j['materials']]
report={'status':'PASS','path':str(path.relative_to(HERE)), 'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'axes':'glTF Y up / +Z forward; metres','worldOrigin':[0,0,0],'boundsMetres':{'min':pp.min(axis=0).tolist(),'max':pp.max(axis=0).tolist(),'size':(pp.max(axis=0)-pp.min(axis=0)).tolist()},'totalTriangles':sum(r['triangles'] for r in rows),'garmentTriangles':sum(r['triangles'] for r in rows if not r['fixture']),'fixtureTriangles':sum(r['triangles'] for r in rows if r['fixture']),'meshNodes':len(rows),'garmentMeshNodes':sum(not r['fixture'] for r in rows),'materialCount':len(materials),'materials':materials,'images':images,'embeddedImageBytes':sum(i['bytes'] for i in images),'decodedTextureRGBABytes':sum(i['decodedRGBABytes'] for i in images),'skins':len(j.get('skins',[])),'animations':len(j.get('animations',[])),'morphTargets':sum(len(p.get('targets',[])) for m in j['meshes'] for p in m['primitives']),'extensionsUsed':j.get('extensionsUsed',[]),'nearZeroAreaTriangles':sum(r['nearZeroAreaTriangles'] for r in rows),'objects':rows,'scope':'Static form-only garment. No body fit, collision, pose, animation or runtime admission.'}
(HERE/'receipts/export-measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['objects','materials','images']},indent=2))
