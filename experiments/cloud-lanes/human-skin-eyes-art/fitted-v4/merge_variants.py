"""Merge texture/material payloads only into one GLB with KHR_materials_variants.
Geometry and morph buffers are retained verbatim from the default copper export.
"""
from pathlib import Path
import struct,json,hashlib,copy
P=Path(__file__).resolve().parent
VAR=['01_umber','02_copper','03_rose']
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);k=20+n;ln=struct.unpack_from('<I',b,k)[0];return g,bytearray(b[k+8:k+8+ln])
def encode(g,b):
 while len(b)%4:b+=b'\0'
 g['buffers']=[{'byteLength':len(b)}];j=json.dumps(g,separators=(',',':')).encode()
 while len(j)%4:j+=b' '
 return struct.pack('<4sII',b'glTF',2,28+len(j)+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b
G,B=read(P/'inputs/fitted-02_copper.glb')
# Refuse stale old globe exports; v4 is a 24 mm sphere.
for node in G['nodes']:
 if node.get('name','').startswith('Fitted_Cornea_'):
  prim=G['meshes'][node['mesh']]['primitives'][0]
  assert abs(G['accessors'][prim['attributes']['POSITION']]['max'][2]-.04830)<1e-6, 'Rebuild corrected temporary material states first'
baseGeometryBytes=len(B)
def image_bytes(g,b,i):
 v=g['bufferViews'][g['images'][i]['bufferView']];return bytes(b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
image_hashes={hashlib.sha256(image_bytes(G,B,i)).hexdigest():i for i in range(len(G['images']))}
mat_names={m['name']:i for i,m in enumerate(G['materials'])}
base_primitive={m['name']:m['primitives'] for m in G['meshes']}
for vn in VAR:
 g,b=read(P/'inputs'/('fitted-'+vn+'.glb'));imap={}
 for i,im in enumerate(g['images']):
  payload=image_bytes(g,b,i);h=hashlib.sha256(payload).hexdigest()
  if h not in image_hashes:
   while len(B)%4:B+=b'\0'
   vi=len(G['bufferViews']);G['bufferViews'].append({'buffer':0,'byteOffset':len(B),'byteLength':len(payload)})
   B+=payload;ni=len(G['images']);G['images'].append({**im,'bufferView':vi});image_hashes[h]=ni
  imap[i]=image_hashes[h]
 smap={}
 for i,s in enumerate(g.get('samplers',[])):
  if s not in G.setdefault('samplers',[]):G['samplers'].append(s)
  smap[i]=G['samplers'].index(s)
 tmap={}
 for i,t in enumerate(g['textures']):
  nt={**t,'source':imap[t['source']]}
  if 'sampler' in t:nt['sampler']=smap[t['sampler']]
  if nt not in G['textures']:G['textures'].append(nt)
  tmap[i]=G['textures'].index(nt)
 mmap={}
 for i,m in enumerate(g['materials']):
  if m['name'] not in mat_names:
   nm=copy.deepcopy(m)
   def remap(o):
    if not isinstance(o,dict):return
    for k,v in o.items():
     if k.endswith('Texture') and isinstance(v,dict) and 'index' in v:v['index']=tmap[v['index']]
     elif isinstance(v,dict):remap(v)
   remap(nm);mat_names[m['name']]=len(G['materials']);G['materials'].append(nm)
  mmap[i]=mat_names[m['name']]
 for mesh in g['meshes']:
  for prim,base in zip(mesh['primitives'],base_primitive[mesh['name']]):
   mat=g['materials'][prim['material']]
   if mat['name'].startswith('Fitted_'+vn+'_'):
    base.setdefault('extensions',{}).setdefault('KHR_materials_variants',{'mappings':[]})['mappings'].append({'material':mmap[prim['material']],'variants':[VAR.index(vn)]})
G.setdefault('extensions',{})['KHR_materials_variants']={'variants':[{'name':v} for v in VAR]}
G.setdefault('extensionsUsed',[]).append('KHR_materials_variants')
G['asset']['extras']={'inputMasterCommit':'2921534bdc8959a8489713f9b1652381702808a5','status':'provisional fitted material derivative; no skeleton','materialDefault':'02_copper'}
# Assert all unchanged geometry accessor bytes before writing.
baseg,baseb=read(P/'inputs/fitted-02_copper.glb')
assert B[:len(baseb)]==baseb
out=encode(G,B);(P/'artifacts/fitted-human-skin-eyes-v4.glb').write_bytes(out)
r={'status':'PASS','geometryAndMorphBufferPrefixUnchanged':True,'baseBufferBytes':baseGeometryBytes,'finalGlbBytes':len(out),'materials':len(G['materials']),'images':len(G['images']),'textures':len(G['textures']),'variants':VAR,'mappings':sum('KHR_materials_variants' in p.get('extensions',{}) for m in G['meshes'] for p in m['primitives']),'sha256':hashlib.sha256(out).hexdigest()}
(P/'receipts/variant-merge.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
