"""Bounded local glTF 2 binary inspection; sparse accessors and node transforms included."""
import json,struct,hashlib
from pathlib import Path
import numpy as np
TYPES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
DT={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}

def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def digest(a):return sha(np.asarray(a,dtype='<f4').tobytes())
class GLB:
 def __init__(self,path):
  self.path=Path(path);self.bytes=self.path.read_bytes()
  assert len(self.bytes)<=8*1024*1024
  magic,version,length=struct.unpack_from('<III',self.bytes);assert magic==0x46546c67 and version==2 and length==len(self.bytes)
  offset=12;self.bin=b''
  while offset<length:
   size,kind=struct.unpack_from('<II',self.bytes,offset);chunk=self.bytes[offset+8:offset+8+size];offset+=8+size
   if kind==0x4e4f534a:self.j=json.loads(chunk)
   elif kind==0x004e4942:self.bin=chunk
  assert not any(x.get('uri') for x in self.j.get('buffers',[]))
  assert not any(x.get('uri') for x in self.j.get('images',[]))
  assert not any('EXT_meshopt_compression' in v.get('extensions',{}) for v in self.j.get('bufferViews',[]))
  self.cache={};self.parts=[]
  def walk(index,parent):
   n=self.j['nodes'][index];m=parent@self.matrix(n)
   if 'mesh' in n:
    mesh=self.j['meshes'][n['mesh']]
    for pi,p in enumerate(mesh['primitives']):
     assert p.get('mode',4)==4 and 'KHR_draco_mesh_compression' not in p.get('extensions',{})
     name=n.get('name',mesh.get('name',str(index)))
     if len(mesh['primitives'])>1:name+=f'#{pi}'
     attributes={k:self.accessor(v) for k,v in p['attributes'].items()}
     indices=self.accessor(p['indices']).reshape(-1).astype('i8') if 'indices' in p else np.arange(len(attributes['POSITION']))
     assert len(indices)%3==0
     names=mesh.get('extras',{}).get('targetNames',[])
     targets=p.get('targets',[]);assert len(names)==len(targets)
     morph={k:{a:self.accessor(v) for a,v in target.items()} for k,target in zip(names,targets)}
     self.parts.append({'name':name,'node':index,'matrix':m,'attributes':attributes,'indices':indices,'morph':morph,'material':p.get('material'),'primitive':p})
   for child in n.get('children',[]):walk(child,m)
  for node in self.j['scenes'][self.j.get('scene',0)]['nodes']:walk(node,np.eye(4))
  assert len({p['name'] for p in self.parts})==len(self.parts)
 def matrix(self,n):
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
  x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4)
  m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]))
  m[:3,3]=n.get('translation',[0,0,0]);return m
 def read(self,view,offset,count,width,dtype):
  v=self.j['bufferViews'][view];assert v.get('buffer',0)==0
  dt=np.dtype(dtype);stride=v.get('byteStride',width*dt.itemsize);start=v.get('byteOffset',0)+offset
  assert start+(count-1)*stride+width*dt.itemsize<=len(self.bin)
  return np.ndarray((count,width),dtype=dt,buffer=self.bin,offset=start,strides=(stride,dt.itemsize)).copy()
 def accessor(self,index):
  if index in self.cache:return self.cache[index]
  a=self.j['accessors'][index];n=a['count'];w=TYPES[a['type']];dt=DT[a['componentType']]
  r=self.read(a['bufferView'],a.get('byteOffset',0),n,w,dt) if 'bufferView' in a else np.zeros((n,w),dtype=dt)
  if 'sparse' in a:
   s=a['sparse'];i=s['indices'];v=s['values'];ids=self.read(i['bufferView'],i.get('byteOffset',0),s['count'],1,DT[i['componentType']]).reshape(-1)
   r[ids]=self.read(v['bufferView'],v.get('byteOffset',0),s['count'],w,dt)
  if a.get('normalized'):
   maxv=np.iinfo(r.dtype).max;r=np.maximum(r.astype('f8')/maxv,-1).astype('<f4')
  self.cache[index]=r;return r
 def summary(self):
  return {'bytes':len(self.bytes),'sha256':sha(self.bytes),'triangles':sum(len(p['indices'])//3 for p in self.parts),'primitives':len(self.parts),'usedMaterials':len({p['material'] for p in self.parts}),'materialDefinitions':len(self.j.get('materials',[])),'images':len(self.j.get('images',[])),'encodedImageBytes':sum(self.j['bufferViews'][i['bufferView']]['byteLength'] for i in self.j.get('images',[])),'skins':len(self.j.get('skins',[])),'animations':len(self.j.get('animations',[])),'morphTargetsSummed':sum(len(p['morph']) for p in self.parts),'decodedAttributeBytes':sum(a.nbytes for p in self.parts for a in p['attributes'].values()),'decodedPositionMorphBytes':sum(v.get('POSITION',np.array([])).nbytes for p in self.parts for v in p['morph'].values())}

def pose(part,values):
 p=part['attributes']['POSITION'].astype('f8').copy()
 for name,target in part['morph'].items():
  if name.startswith('corrective.height.'):weight=values.get('body.height',0)*values.get('expression.'+name.split('.')[-1],0)
  elif name.startswith('corrective.blinkArc'):
   blink=values.get('expression.blink'+name.split('blinkArc')[1],0);weight=4*blink*(1-blink)
  else:weight=values.get(name,0)
  if weight:p+=target['POSITION']*weight
 return p@part['matrix'][:3,:3].T+part['matrix'][:3,3]

def signatures(part):
 idx=part['indices'];m=part['matrix']
 return {'triangleCount':len(idx)//3,'nodeTransformSha256':digest(m),'expandedPositionsSha256':digest(part['attributes']['POSITION'][idx]),'expandedUvsSha256':digest(part['attributes']['TEXCOORD_0'][idx]) if 'TEXCOORD_0' in part['attributes'] else None,'orderedIndicesSha256':sha(np.asarray(idx,dtype='<u4').tobytes()),'rawPositionSha256':digest(part['attributes']['POSITION']),'morphPositions':{k:digest(v['POSITION'][idx]) for k,v in part['morph'].items()},'morphNormals':{k:digest(v['NORMAL'][idx]) for k,v in part['morph'].items() if 'NORMAL' in v}}
