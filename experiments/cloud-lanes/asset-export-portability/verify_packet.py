"""Verify immutable source pins/artifacts before a consumer runs the lane."""
import hashlib
import json
from pathlib import Path

LANE = Path(__file__).resolve().parent
REPO = LANE.parents[2]


def main():
    manifest = json.loads((LANE / 'packet.json').read_text())
    for key, root in [('inputs', REPO), ('outputs', LANE)]:
        for name, expected in manifest[key].items():
            path = (root / name).resolve()
            if root not in path.parents:
                raise ValueError('Manifest path escapes root')
            data = path.read_bytes()
            if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
                raise ValueError(f'Pinned {key} changed: {name}')
    print(f'PASS: {len(manifest["inputs"])} read-only/source pins, {len(manifest["outputs"])} frozen outputs')


if __name__ == '__main__':
    main()
