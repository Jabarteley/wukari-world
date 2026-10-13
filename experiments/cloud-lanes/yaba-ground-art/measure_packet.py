"""Record byte-level output identity and decoded embedded texture measurements."""
from pathlib import Path
import hashlib
import json
import struct
import io
from PIL import Image

HERE=Path(__file__).resolve().parent
def digest(b):return hashlib.sha256(b).hexdigest()
raw=(HERE/'artifacts/street-near.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+n]);binary=raw[28+n:];images=[]
for image in doc['images']:
    view=doc['bufferViews'][image['bufferView']];b=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    im=Image.open(io.BytesIO(b))
    images.append(dict(name=image.get('name'),mimeType=image['mimeType'],width=im.width,height=im.height,encodedBytes=len(b),sha256=digest(b),decodedRGBA8Bytes=im.width*im.height*4))
geometry=json.loads((HERE/'receipts/geometry-placement.json').read_text())
files={}
for folder in ['artifacts','receipts/browser']:
    for p in sorted((HERE/folder).iterdir()):
        if p.is_file() and not p.name.endswith('.blend1'):
            b=p.read_bytes();files[str(p.relative_to(HERE))]={'bytes':len(b),'sha256':digest(b)}
for name in ['build_street.py','make_textures.py','compact_glb.py','render_blender.py','render.html','render_browser.py','verify.ts','bounded_run.py','contact_sheet.py','measure_packet.py','placement.json','collision-walkable-proposals.json','anchors-source.json','package.json','package-lock.json']:
    b=(HERE/name).read_bytes();files[name]={'bytes':len(b),'sha256':digest(b)}
packet=dict(schema='allworld-yaba-ground-art-packet-v1',version='yaba-ground-layout-v1',family='authored-ground-street',
 integrationCommit='caaee5e1b91afc7f3cd3f2124df3547dc7f492ec',firstTangibleCommit='a8b19c28',
 source=dict(author='Original agent-authored Allworld prototype',license='AGPL-3.0-or-later',seed=13102026,externalAssetInputs=[],imageryInputs=[],geographicTruth='authored-synthetic; approximate game anchor only',geometryMethod='editable mesh cross-sections, slab joints, non-destructive bevels/triangulation; no acquired meshes',textureMethod='seeded numpy scalar fields and fine aggregate, Pillow encoding; packed in blend and embedded in GLB'),
 files=files,geometry=geometry['metrics'],textures=images,
 totalEmbeddedTextureBytes=sum(i['encodedBytes'] for i in images),totalDecodedRGBA8TextureBytesNoMipmaps=sum(i['decodedRGBA8Bytes'] for i in images),
 materialConvention=dict(baseColor='sRGB JPEG decoded to linear by glTF',normal='OpenGL tangent-space +Y; PNG Non-Color; scale 0.28; explicit exported tangents',roughness='scalar PBR factors 0.63–0.98 in near materials, not spatial roughness maps',alpha='OPAQUE throughout; no alpha textures',textureTileMetres=2,baking='No shader-only noise nodes: generated maps feed Principled directly and export without a bake step'),
 units='one metre per Blender/glTF unit',blenderAxes='X east / Y north / Z up',gltfAxes='X east / Y up / Z south',modelForward='+Z (south)',pivot=geometry and dict(anchor='anchor_pivot',gltfMetres=[0,0,12],placementHeadingDegrees=180),
 nearFarAnchors=10,textureCompression='JPEG colors / PNG normals; uncompressed geometry; no Draco/Meshopt',
 routeAuthorized=False,productionAdmission=False,limitations=['only 24m segment detailed; remaining 200m area is planning massing','448 near mesh primitives remain expensive draw submission; not batched for game','far LOD omits drain side walls, wear and fine ramps; visible transition needs runtime review','no collision registration, nav grid, building or human fitting','no verified Lagos survey data','software CPU/WebGL proof only, no physical-device performance evidence','current static ModelPart importer drops PBR factors; use isolated raw GLTFLoader for this proof'])
(HERE/'packet.json').write_text(json.dumps(packet,indent=2)+'\n')
print(json.dumps({'files':len(files),'artifactBytes':sum(v['bytes'] for k,v in files.items() if k.startswith('artifacts/')),'textureBytes':packet['totalEmbeddedTextureBytes'],'decodedTextureBytes':packet['totalDecodedRGBA8TextureBytesNoMipmaps'],'images':images}))
