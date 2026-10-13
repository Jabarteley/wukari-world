"""Read actual GLB bytes and verify exported POSITION morphs and height products."""
import hashlib
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent
DOC = ROOT.parents[3] / 'docs/agent-plans/cloud-lanes/human-design-contract/prototype'

def inspect(path):
    raw = path.read_bytes()
    magic, version, size = struct.unpack_from('<4sII', raw)
    assert (magic, version, size) == (b'glTF', 2, len(raw))
    json_size, json_type = struct.unpack_from('<II', raw, 12)
    assert json_type == 0x4E4F534A
    doc = json.loads(raw[20:20 + json_size])
    bin_size, bin_type = struct.unpack_from('<II', raw, 20 + json_size)
    assert bin_type == 0x004E4942
    binary = raw[28 + json_size:28 + json_size + bin_size]

    def read(index):
        a = doc['accessors'][index]
        types = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
        fmt, size = types[a['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        result = [(0,) * width for _ in range(a['count'])]
        if 'bufferView' in a:
            view = doc['bufferViews'][a['bufferView']]
            stride = view.get('byteStride', width * size)
            start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
            result = [struct.unpack_from('<' + fmt * width, binary, start + i * stride) for i in range(a['count'])]
        if 'sparse' in a:
            sparse = a['sparse']; indices = sparse['indices']; values = sparse['values']
            index_fmt, index_size = types[indices['componentType']]
            index_start = doc['bufferViews'][indices['bufferView']].get('byteOffset', 0) + indices.get('byteOffset', 0)
            value_start = doc['bufferViews'][values['bufferView']].get('byteOffset', 0) + values.get('byteOffset', 0)
            previous = -1
            for i in range(sparse['count']):
                destination = struct.unpack_from('<' + index_fmt, binary, index_start + i * index_size)[0]
                assert previous < destination < len(result)
                result[destination] = struct.unpack_from('<' + fmt * width, binary, value_start + i * size * width)
                previous = destination
        return result

    meshes = []
    total = 0
    products = 0
    for mesh in doc['meshes']:
        names = mesh.get('extras', {}).get('targetNames', [])
        for primitive in mesh['primitives']:
            positions = read(primitive['attributes']['POSITION'])
            indices = [v[0] for v in read(primitive['indices'])]
            assert len(indices) % 3 == 0 and max(indices) < len(positions)
            triangles = len(indices) // 3
            total += triangles
            targets = primitive.get('targets', [])
            assert len(names) == len(targets)
            deltas = {name: read(target['POSITION']) for name, target in zip(names, targets)}
            for name, values in deltas.items():
                assert len(values) == len(positions)
                assert all(math.isfinite(x) for v in values for x in v)
                assert any(abs(x) > 1e-8 for v in values for x in v), (mesh['name'], name, 'zero morph')
                if name.startswith('corrective.height.'):
                    expression = deltas['expression.' + name.split('.')[-1]]
                    # GLTF +Y is height. Product corrective is 5% of expression vertical delta.
                    assert max(abs(v[1] - e[1] * .05) for v, e in zip(values, expression)) < 2e-7
                    assert max(abs(x) for v in values for x in (v[0], v[2])) < 2e-7
                    products += 1
            assert all(math.isfinite(x) for v in positions for x in v)
            meshes.append({'name': mesh['name'], 'vertices': len(positions), 'triangles': triangles,
                           'exportedMorphNames': names})
    assert total == 29186 and total <= 34000
    assert not doc.get('skins') and not doc.get('animations')
    assert products > 0
    return {'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(raw).hexdigest(),
            'triangleCount': total, 'meshCount': len(meshes), 'heightProductTargetsChecked': products,
            'skins': 0, 'animations': 0, 'meshes': meshes}

reports = [inspect(ROOT / 'original-human-prototype.glb'),
           inspect(ROOT / 'eye-refinement-v2/eye-refinement-v2.glb')]
report = {'schemaVersion': 1, 'result': 'pass', 'scope': 'Actual GLB accessors; finite indexed positions, nonzero morph deltas and height products. No rig or realism acceptance.', 'exports': reports}
(DOC / 'export-checks.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': 'pass', 'exports': len(reports), 'trianglesEach': 29186,
                  'heightProductTargetsEach': [r['heightProductTargetsChecked'] for r in reports]}))
