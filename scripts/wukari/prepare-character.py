"""Repack the verified free CC0 archive into two self-contained runtime GLBs.

Offline build helper only (Pillow/NumPy); not a new runtime asset service. Normal
maps are vector fields: resize then renormalize, preserving the original artwork.
The native face topology, skeleton, skin weights and eyes are unchanged.
"""
import hashlib
import io
import json
import struct
import zipfile
from pathlib import Path
import numpy as np
from PIL import Image

archive = Path('.cache/wukari/phase81-quaternius-standard.zip')
expected = 'fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40'
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    raise ValueError('Character archive hash differs; verify source and rights first')
out = Path('data/wukari/phase81/models')
out.mkdir(parents=True, exist_ok=True)
prefix = 'Universal Base Characters[Standard]/'
receipt = {'creator': 'Quaternius', 'pack': 'Universal Base Characters Standard',
           'source': 'https://quaternius.itch.io/universal-base-characters',
           'rights': 'https://quaternius.com/packs/universalbasecharacters.html',
           'license': 'CC0-1.0', 'archiveSha256': expected, 'files': [],
           'modifications': 'GLB repack; redundant attribute references and skin palette textures removed. Native topology, rig, weights and eye texture retained. Normal-vector maps downsampled to 1024 and renormalized. Clothing palettes and fitted hair are original runtime adaptations.'}
with zipfile.ZipFile(archive) as z:
    license_text = z.read(prefix+'License_Standard.txt').decode().replace('\r', '')
    if 'CC0 1.0 Universal' not in license_text:
        raise ValueError('Expected creator CC0 licence missing')
    (out/'LICENSE.txt').write_text(license_text, encoding='utf-8')
    base = prefix+'Base Characters/Godot - UE/'
    for sex in ['Male', 'Female']:
        name = 'Superhero_'+sex+'_FullBody'
        source_json = z.read(base+name+'.gltf')
        g = json.loads(source_json)
        buf = bytearray(z.read(base+name+'.bin'))
        g['buffers'] = [{'byteLength': len(buf)}]
        images = []
        for i, material in enumerate(g['materials']):
            if i == 0:
                material.clear()
                material.update(name='Brows', pbrMetallicRoughness={'baseColorFactor': [.025, .018, .014, 1], 'metallicFactor': 0, 'roughnessFactor': .8})
            elif i == 1:
                material.pop('normalTexture', None)
            else:
                material['pbrMetallicRoughness'] = {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .72}
            refs = []
            if 'normalTexture' in material:
                refs.append((material['normalTexture'], True))
            if 'baseColorTexture' in material.get('pbrMetallicRoughness', {}):
                refs.append((material['pbrMetallicRoughness']['baseColorTexture'], False))
            for ref, normal in refs:
                image = g['images'][g['textures'][ref['index']]['source']]
                data = z.read(base+image['uri'].replace('_png.png', '.png'))
                if normal:
                    im = Image.open(io.BytesIO(data)).convert('RGB')
                    im.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                    vectors = np.asarray(im).astype(np.float32)/127.5-1
                    vectors /= np.maximum(np.linalg.norm(vectors, axis=2, keepdims=True), .001)
                    im = Image.fromarray(np.clip((vectors+1)*127.5, 0, 255).astype(np.uint8))
                    stream = io.BytesIO()
                    im.save(stream, format='PNG', optimize=True)
                    data = stream.getvalue()
                while len(buf) % 4:
                    buf.append(0)
                view = len(g['bufferViews'])
                g['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(data)})
                buf.extend(data)
                ref['index'] = len(images)
                images.append({'bufferView': view, 'mimeType': 'image/png'})
        g['images'] = images
        g['textures'] = [{'source': i} for i in range(len(images))]
        for mesh in g['meshes']:
            for primitive in mesh['primitives']:
                for key in list(primitive['attributes']):
                    if key.startswith('COLOR') or key in ['TEXCOORD_1', 'TEXCOORD_2', 'TEXCOORD_3']:
                        del primitive['attributes'][key]
        g['buffers'][0]['byteLength'] = len(buf)
        while len(buf) % 4:
            buf.append(0)
        js = json.dumps(g, separators=(',', ':')).encode()
        js += b' '*((-len(js)) % 4)
        glb = struct.pack('<4sII', b'glTF', 2, 28+len(js)+len(buf))+struct.pack('<I4s', len(js), b'JSON')+js+struct.pack('<I4s', len(buf), b'BIN\x00')+buf
        target = out/(sex.lower()+'.glb')
        target.write_bytes(glb)
        receipt['files'].append({'path': target.name, 'bytes': len(glb), 'sha256': hashlib.sha256(glb).hexdigest(), 'sourceGltfSha256': hashlib.sha256(source_json).hexdigest()})
        print(target, len(glb), 'bytes')
(out/'provenance.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')
