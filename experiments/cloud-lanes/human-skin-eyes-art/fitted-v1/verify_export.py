"""Decode final and pinned GLBs: compare actual triangle/morph payloads, materials and maps."""
from pathlib import Path
import json,struct,hashlib,io
import numpy as np
from PIL import Image
P=Path(__file__).resolve().parent

def read(file):
 raw=file.read_bytes();magic,version,sz=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and sz==len(raw)
 n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);b=raw[28+n:]
 return g,b,raw

def accessor(g,b,i):
 a=g['accessors'][i];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
 out=np.zeros((a['count'],n),dtype=dtype)
 if 'bufferView' in a:
  v=g['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',np.dtype(dtype).itemsize*n)
  out=np.ndarray((a['count'],n),dtype=dtype,buffer=b,offset=offset,strides=(stride,np.dtype(dtype).itemsize)).copy()
 if 'sparse' in a:
  s=a['sparse'];ind=s['indices'];v=g['bufferViews'][ind['bufferView']];dt={5121:'u1',5123:'<u2',5125:'<u4'}[ind['componentType']];ids=np.frombuffer(b,dtype=dt,count=s['count'],offset=v.get('byteOffset',0)+ind.get('byteOffset',0))
  val=s['values'];v=g['bufferViews'][val['bufferView']];out[ids]=np.frombuffer(b,dtype=dtype,count=s['count']*n,offset=v.get('byteOffset',0)+val.get('byteOffset',0)).reshape(-1,n)
 return out

def meshes(g):return {n['name']:g['meshes'][n['mesh']] for n in g['nodes'] if 'mesh' in n}
g,b,raw=read(P/'artifacts/fitted-human-skin-eyes-v1.glb');sg,sb,sraw=read(P/'inputs/original-human-prototype.glb')
base=meshes(sg);current=meshes(g);comparisons=[]
for name,mesh in base.items():
 cm=current[name];assert len(mesh['primitives'])==len(cm['primitives'])==1
 a=mesh['primitives'][0];c=cm['primitives'][0];ia=accessor(sg,sb,a['indices']).ravel();ic=accessor(g,b,c['indices']).ravel()
 pa=accessor(sg,sb,a['attributes']['POSITION'])[ia];pc=accessor(g,b,c['attributes']['POSITION'])[ic]
 assert np.array_equal(pa,pc),(name,'expanded triangle position bytes differ')
 names=mesh.get('extras',{}).get('targetNames',[]);cnames=cm.get('extras',{}).get('targetNames',[]);assert names==cnames
 for j,k in enumerate(names):
  va=accessor(sg,sb,a['targets'][j]['POSITION'])[ia];vc=accessor(g,b,c['targets'][j]['POSITION'])[ic];assert np.array_equal(va,vc),(name,k)
 comparisons.append({'node':name,'trianglePositionsExact':True,'morphNames':names,'morphPayloadsExact':True})
assert len(comparisons)==31
rows=[];allp=[];targets=0
for name,m in current.items():
 p=m['primitives'][0];a=accessor(g,b,p['attributes']['POSITION']);indices=accessor(g,b,p['indices']).ravel();assert np.isfinite(a).all();allp.append(a);n=len(p.get('targets',[]));targets+=n
 rows.append({'name':name,'vertices':len(a),'triangles':len(indices)//3,'targets':n,'morphNames':m.get('extras',{}).get('targetNames',[]),'attributes':list(p['attributes'])})
images=[];pixels=[]
for im in g['images']:
 v=g['bufferViews'][im['bufferView']];blob=b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];p=Image.open(io.BytesIO(blob));a=np.asarray(p.convert('RGBA'));assert (a[...,3]==255).all();pixels.append(a)
 images.append({'name':im.get('name'),'dimensions':list(p.size),'encodedBytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'opaque':True})
def texture(index):return pixels[g['textures'][index]['source']]
material_checks=[]
for m in g['materials']:
 assert m.get('alphaMode','OPAQUE')=='OPAQUE'
 if not any(m['name'].startswith('Fitted_'+v+'_') for v in ['01_umber','02_copper','03_rose']):continue
 v=m['name'][7:];variant=next(t for t in ['01_umber','02_copper','03_rose'] if v.startswith(t))
 node=v[len(variant)+1:];key=node.replace('-','minus');pbr=m['pbrMetallicRoughness'];expected=np.asarray(Image.open(P/'textures'/f'{key}_{variant}_basecolor.png').convert('RGBA'));assert np.array_equal(texture(pbr['baseColorTexture']['index']),expected)
 expected=np.asarray(Image.open(P/'textures'/f'{key}_normal.png').convert('RGBA'));assert np.array_equal(texture(m['normalTexture']['index']),expected)
 expected=np.asarray(Image.open(P/'textures'/f'{key}_roughness.png'));assert np.array_equal(texture(pbr['metallicRoughnessTexture']['index'])[...,1],expected)
 assert pbr.get('metallicFactor',1)==0 and abs(m['normalTexture']['scale']-.35)<1e-6
 material_checks.append(m['name'])
assert len(material_checks)==36
assert [v['name'] for v in g['extensions']['KHR_materials_variants']['variants']]==['01_umber','02_copper','03_rose']
mappings=[]
for name,m in current.items():
 for p in m['primitives']:
  ext=p.get('extensions',{}).get('KHR_materials_variants')
  if ext:assert sorted(i for x in ext['mappings'] for i in x['variants'])==[0,1,2];mappings.append(name)
assert len(mappings)==12 and not g.get('skins') and not g.get('animations')
points=np.concatenate(allp);r={'status':'PASS','glbBytes':len(raw),'glbSha256':hashlib.sha256(raw).hexdigest(),'sourceGlbSha256':hashlib.sha256(sraw).hexdigest(),'sourceNodesComparedExactly':comparisons,'meshes':rows,'meshCount':len(rows),'triangles':sum(r['triangles'] for r in rows),'vertices':sum(r['vertices'] for r in rows),'totalMorphTargetsAcrossMeshes':targets,'joints':0,'animations':0,'materials':len(g['materials']),'images':images,'embeddedImageBytes':sum(i['encodedBytes'] for i in images),'rgba8BaseLevelBytesEstimate':sum(i['dimensions'][0]*i['dimensions'][1]*4 for i in images),'boundsGLTFM':[points.min(0).tolist(),points.max(0).tolist()],'pixelExactMaterialMapsVerified':material_checks,'variantBindings':mappings,'extensionsUsed':g.get('extensionsUsed'),'alpha':'all materials OPAQUE; all embedded alpha pixels opaque; cornea optical transmission','fitAcceptance':False}
(P/'receipts/decoded-fitted-glb.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['status','glbBytes','meshCount','triangles','vertices','totalMorphTargetsAcrossMeshes','materials','embeddedImageBytes','rgba8BaseLevelBytesEstimate']},indent=2))
