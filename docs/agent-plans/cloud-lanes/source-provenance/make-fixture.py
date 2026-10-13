"""Rebuild only original synthetic fixture and schema/registry pins, never acquire data.
Run after reviewing every schema/registry change; this is not a rights approval tool.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def write(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def receipt(name):
    data = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

if __name__ == '__main__':
    write('fixtures/original-block.json', {
        'id': 'synthetic-lagos-contract-example',
        'description': 'Original test rectangle; not a real Lagos parcel or survey.',
        'author': 'Allworld source-provenance lane (AI-assisted)',
        'license': 'AGPL-3.0-or-later',
        'frame': 'synthetic-local-metres',
        'footprint': [[0, 0], [12, 0], [12, 8], [0, 8], [0, 0]],
        'heightM': 6, 'facade': 'authored neutral plaster'
    })
    write('fixtures/measurement.json', {
        'context': 'synthetic', 'operator': 'source-provenance lane',
        'measuredAt': '2026-10-13T18:01:20Z',
        'method': 'Euclidean distance between first two authored local vertices: sqrt((12-0)^2+(0-0)^2).',
        'widthM': 12, 'uncertaintyM': 0,
        'limitation': 'Exact arithmetic on synthetic vertices, no field accuracy claim.'
    })
    write('pins.json', {'schemaVersion': 1, 'files': [receipt(name) for name in [
        'schema.v1.json', 'registry.v1.json', 'fixtures/LICENSE-AGPL-3.0.txt'
    ]]})
    source = json.loads((ROOT / 'registry.v1.json').read_text())['sources'][0]
    stamp = '2026-10-13T18:01:20Z'
    def observation(id, prop, value, basis, method, uncertainty, observed):
        return {'id': id, 'featureId': 'synthetic-building-1', 'property': prop,
                'value': value, 'unit': 'm' if isinstance(value, int) else 'text',
                'basis': basis, 'context': 'synthetic', 'inputIds': ['original-block'],
                'confidence': 'known-error-bound' if basis == 'measured' else 'low' if basis == 'estimated' else 'not-applicable',
                'method': method, 'operator': 'source-provenance lane',
                'observedAt': stamp if observed else None,
                'uncertainty': uncertainty, 'beta': basis != 'measured',
                'evidence': receipt('fixtures/measurement.json' if observed else 'fixtures/original-block.json')}
    write('fixtures/lawful.packet.json', {
        'schemaVersion': 1, 'kind': 'allworld-source-packet',
        'schemaSha256': receipt('schema.v1.json')['sha256'],
        'registrySha256': receipt('registry.v1.json')['sha256'],
        'owner': {'lane': 'source-provenance', 'branch': 'codex/cloud-source-provenance-20261013',
                  'baseCommit': '81d9f599d87dfb34adf49cd9337a0b05678e5e0d'},
        'pilot': {'city': 'Lagos', 'scope': 'synthetic-fixture', 'blockId': None,
                  'sourceCrs': 'LOCAL_SYNTHETIC', 'axisOrder': 'east-north-up', 'units': 'm',
                  'verticalDatum': 'synthetic-zero', 'realWorldTransform': None},
        'inputs': [{'id': 'original-block', 'sourceId': source['id'],
                    'author': 'Allworld source-provenance lane (AI-assisted)',
                    'sourceUrl': source['sourceUrl'], 'release': 'original-fixture-v1',
                    'capturedAt': stamp, 'acquiredAt': stamp,
                    'file': receipt('fixtures/original-block.json'),
                    'licenseId': source['license']['id'],
                    'licenseText': receipt('fixtures/LICENSE-AGPL-3.0.txt'),
                    'uses': ['derive_geometry', 'redistribute_raw', 'redistribute_derived'],
                    'attributionIds': [a['id'] for a in source['attribution']],
                    'upstreamRecordIds': ['synthetic-building-1']}],
        'observations': [
            observation('width', 'width', 12, 'measured', 'Exact arithmetic on synthetic local coordinates; see measurement receipt.',
                        {'status': 'bounded', 'plusMinus': 0, 'unit': 'm'}, True),
            observation('height', 'height', 6, 'estimated', 'Test-only two-storey assumption, no survey or source height.',
                        {'status': 'unknown', 'plusMinus': None, 'unit': 'm'}, False),
            observation('facade', 'facade', 'authored neutral plaster', 'authored', 'Original material description without external imagery.',
                        {'status': 'not-applicable', 'plusMinus': None, 'unit': 'text'}, False)
        ],
        'derivations': [{'id': 'fixture-copy', 'operator': 'source-provenance lane',
                         'operation': 'Retain the original editable JSON geometry; no external derivation.',
                         'inputIds': ['original-block'], 'output': receipt('fixtures/original-block.json')}],
        'attribution': source['attribution'],
        'unresolvedRights': [],
        'limitations': ['Synthetic fixture only; not a selected, surveyed or georeferenced Lagos block.',
                        'A pass proves pinned provenance structure, not legal ownership or production acceptance.']
    })
    print('Rebuilt original fixture and explicit pins; no network requests.')
