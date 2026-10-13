"""Replace only existing cap POSITION/NORMAL/TANGENT payloads from Blender's export.
All other geometry, morphs, UVs, indices, materials, variants and image bytes stay exact.
"""
from pathlib import Path
import json,struct,copy,hashlib
import numpy as np
P=Path(__file__).resolve().parent;F=P.parent

def read(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);return g,bytearray(raw[28+n:])
def region(g,idx):
 a=g['accessors'][idx];assert 'sparse' not in a
 v=g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];s={5126:4,5125:4,5123:2,5121:1}[a['componentType']]
 assert 'byteStride' not in v
 return v.get('byteOffset',0)+a.get('byteOffset',0),a['count']*n*s

def payload(g,b,idx):
 o,n=region(g,idx);return bytes(b[o:o+n])
def primitive(g,name):
 node=next(n for n in g['nodes'] if n.get('name')==name);return g['meshes'][node['mesh']]['primitives'][0]
g,b=read(P/'inputs/fitted-human-skin-eyes-v1.glb');original=bytes(b);cg,cb=read(P/'inputs/corrected-caps.glb');edits=[];changed_accessors=set()
for side in ['Left','Right']:
 name='Fitted_Cornea_'+side;a=primitive(g,name);c=primitive(cg,name)
 assert payload(g,b,a['indices'])==payload(cg,cb,c['indices'])
 assert payload(g,b,a['attributes']['TEXCOORD_0'])==payload(cg,cb,c['attributes']['TEXCOORD_0'])
 assert len(a['targets'])==len(c['targets'])==1
 assert payload(g,b,a['targets'][0]['POSITION'])==payload(cg,cb,c['targets'][0]['POSITION'])
 old=np.frombuffer(payload(g,b,a['attributes']['POSITION']),dtype='<f4').reshape(-1,3);new=np.frombuffer(payload(cg,cb,c['attributes']['POSITION']),dtype='<f4').reshape(-1,3)
 assert np.array_equal(old[:,:2],new[:,:2]);shift=old[:,2]-new[:,2]
 assert shift.min()>-1e-8 and abs(shift.max()-.00020)<1e-8,(name,shift.min(),shift.max())
 for key in ['POSITION','NORMAL','TANGENT']:
  oi=a['attributes'][key];ni=c['attributes'][key];out=payload(cg,cb,ni);offset,length=region(g,oi);assert len(out)==length
  b[offset:offset+length]=out;changed_accessors.add(oi)
  for stat in ['min','max']:
   if stat in cg['accessors'][ni]:g['accessors'][oi][stat]=cg['accessors'][ni][stat]
  edits.append({'mesh':name,'attribute':key,'accessor':oi,'offset':offset,'bytes':length})
# Prove the full binary stayed byte-identical outside the six explicit spans.
mask=np.zeros(len(b),dtype=bool)
for e in edits:mask[e['offset']:e['offset']+e['bytes']]=True
assert np.array_equal(np.frombuffer(original,dtype='u1')[~mask],np.frombuffer(b,dtype='u1')[~mask])
g['asset']['extras']['corneaRevision']='v1.1: static dome 0.25 mm; no visibility or morph workaround'
g['asset']['extras']['status']='provisional material derivative; corneal dome correction; no skeleton'
j=json.dumps(g,separators=(',',':')).encode()
while len(j)%4:j+=b' '
while len(b)%4:b+=b'\0'
raw=struct.pack('<4sII',b'glTF',2,len(j)+len(b)+28)+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b
(F/'artifacts/fitted-human-skin-eyes-v1.glb').write_bytes(raw)
r={'status':'PASS','changedAccessorSpans':edits,'allOtherBinaryBytesUnchanged':True,'capsIndicesUVsAndMorphDeltasUnchanged':True,'materialsVariantsImagesUnchanged':True,'glbBytes':len(raw),'glbSha256':hashlib.sha256(raw).hexdigest()}
(P/'receipts/glb-patch.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
