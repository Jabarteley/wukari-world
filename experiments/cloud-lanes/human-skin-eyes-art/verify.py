"""Decode this lane's generated GLB, inspect real buffers/maps and seal file measurements."""
from pathlib import Path
import hashlib,struct,json,io
import numpy as np
from PIL import Image
P=Path(__file__).resolve().parent
f=P/'artifacts'/'skin-eyes-calibration-v1.glb';raw=f.read_bytes()
magic,version,length=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and length==len(raw)
ln,typ=struct.unpack_from('<II',raw,12);assert typ==0x4E4F534A
g=json.loads(raw[20:20+ln]);pos=20+ln;bn,typ=struct.unpack_from('<II',raw,pos);assert typ==0x004E4942
binary=raw[pos+8:pos+8+bn]

def accessor(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
    dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    assert 'byteStride' not in v
    return np.frombuffer(binary,dtype=dt,count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n)
meshes=[];world=[]
for node in g['nodes']:
    if 'mesh' not in node:continue
    assert 'matrix' not in node and 'rotation' not in node and 'scale' not in node
    for prim in g['meshes'][node['mesh']]['primitives']:
        a=prim['attributes'];p=accessor(a['POSITION']);idx=accessor(prim['indices']).flatten();normal=accessor(a['NORMAL'])
        assert np.isfinite(p).all() and np.max(idx)<len(p) and len(idx)%3==0
        assert np.max(np.abs(np.linalg.norm(normal,axis=1)-1))<1e-4
        assert np.isfinite(accessor(a['TEXCOORD_0'])).all()
        ar=np.linalg.norm(np.cross(p[idx[1::3]]-p[idx[0::3]],p[idx[2::3]]-p[idx[0::3]]),axis=1)/2
        assert np.min(ar)>1e-14, (node['name'],np.min(ar))
        t=np.array(node.get('translation',[0,0,0]));w=p+t;world.append(w)
        meshes.append(dict(name=node['name'],exportedVertices=len(p),triangles=len(idx)//3,material=prim['material'],attributes=list(a),boundsGLTFLocalM=[p.min(0).tolist(),p.max(0).tolist()],translationGLTFM=t.tolist()))
images=[];decoded_images=[]
for im in g['images']:
    v=g['bufferViews'][im['bufferView']];b=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];p=Image.open(io.BytesIO(b));a=np.asarray(p)
    assert p.size==(512,512)
    decoded_images.append(np.asarray(p.convert('RGBA')))
    opaque='A' not in p.getbands() or bool((a[:,:,-1]==255).all())
    assert opaque
    images.append(dict(name=im.get('name'),dimensions=list(p.size),channels=p.mode,encodedBytes=len(b),sha256=hashlib.sha256(b).hexdigest(),opaquePixels=opaque,channelRange=[[int(a[...,k].min()),int(a[...,k].max())] for k in range(a.shape[2])] if a.ndim==3 else [[int(a.min()),int(a.max())]]))
for m in g['materials']:
    assert m.get('alphaMode','OPAQUE')=='OPAQUE'
    assert m.get('pbrMetallicRoughness',{}).get('metallicFactor',1)==0
skin=[m for m in g['materials'] if m['name'].startswith('Skin_')];assert len(skin)==3
for m in skin:
    assert 'baseColorTexture' in m['pbrMetallicRoughness'] and 'metallicRoughnessTexture' in m['pbrMetallicRoughness'] and 'normalTexture' in m
# Verify raster bakes survived conversion, including packed roughness G.
def texture_pixels(index):return decoded_images[g['textures'][index]['source']]
for i,m in enumerate(skin):
    pbr=m['pbrMetallicRoughness'];name=['01_umber','02_copper','03_rose'][i]
    expected=np.asarray(Image.open(P/'textures'/f'skin_{name}_basecolor.png').convert('RGBA'))
    assert np.array_equal(texture_pixels(pbr['baseColorTexture']['index']),expected)
    expected=np.asarray(Image.open(P/'textures'/'skin_normal.png').convert('RGBA'))
    assert np.array_equal(texture_pixels(m['normalTexture']['index']),expected)
    expected=np.asarray(Image.open(P/'textures'/'skin_roughness.png'))
    assert np.array_equal(texture_pixels(pbr['metallicRoughnessTexture']['index'])[...,1],expected)
    assert abs(m['normalTexture']['scale']-.7)<1e-6
cornea=next(m for m in g['materials'] if m['name']=='Eye_Cornea_TRANSMISSION');assert cornea['extensions']['KHR_materials_transmission']['transmissionFactor']==1
assert not g.get('skins') and not g.get('animations')
assert abs(cornea['extensions']['KHR_materials_ior']['ior']-1.376)<1e-6
world=np.concatenate(world)
report=dict(status='PASS',calibrationOnly=True,glbBytes=len(raw),glbSha256=hashlib.sha256(raw).hexdigest(),meshCount=len(meshes),triangles=sum(m['triangles'] for m in meshes),exportedVertices=sum(m['exportedVertices'] for m in meshes),materialCount=len(g['materials']),textureCount=len(g['textures']),embeddedImageCount=len(images),embeddedTextureBytes=sum(i['encodedBytes'] for i in images),boundsGLTFWorldM=[world.min(0).tolist(),world.max(0).tolist()],extensionsUsed=g.get('extensionsUsed'),extensionsRequired=g.get('extensionsRequired',[]),meshes=meshes,materials=g['materials'],images=images,joints=0,morphs=0,animations=0,textureBakePreservation='PASS: exact decoded source color/normal pixels and packed roughness G channel',alphaBehavior='OPAQUE materials and opaque image pixels; transmission extension on cornea')
(P/'receipts'/'decoded-glb.json').write_text(json.dumps(report,indent=2)+'\n')
files={}
for folder in ['artifacts','textures','proof']:
    for f in sorted((P/folder).iterdir()):
        if f.suffix in ['.blend','.glb','.jpg','.json'] or (folder=='textures' and f.suffix=='.png'):
            b=f.read_bytes();files[str(f.relative_to(P))]=dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
for f in sorted(P.iterdir()):
    if f.is_file() and (f.suffix in ['.py','.ts','.html'] or f.name in ['package.json','package-lock.json']):
        b=f.read_bytes();files[f.name]=dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
for f in sorted((P/'receipts').glob('*.json')):
    b=f.read_bytes();files[str(f.relative_to(P))]=dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
(P/'asset-packet.json').write_text(json.dumps(dict(schema='allworld-skin-eyes-calibration-v1',integrationCommit='caaee5e1b91afc7f3cd3f2124df3547dc7f492ec',humanUVCheckpoint=None,productionAdmission=False,units='metres',blenderAxes='Z up / -Y front',gltfAxes='Y up / +Z front',anchorsGLTFM={'eyeCenter':[.102,.044,0],'skinUmberCenter':[-.102,.044,0],'skinCopperCenter':[-.034,.044,0],'skinRoseCenter':[.034,.044,0]},anchorStatus='authored calibration object origins; not human attachment anchors',authorship='Original procedural geometry and textures authored for Allworld; no external assets',license='AGPL-3.0-or-later',files=files),indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['status','glbBytes','triangles','exportedVertices','materialCount','embeddedImageCount','embeddedTextureBytes','extensionsUsed']},indent=2))
