"""Build/check an immutable input index against the four exact Git commits; no fetch."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
BASE = '81d9f599d87dfb34adf49cd9337a0b05678e5e0d'
LANES = {
    'source-provenance': '1f89cdd91e8300a341ca65f17030a22f929eb5dd',
    'lagos-geography': '21b0850a996b4444d2e0c16626771671e191ddcd',
    'asset-export-portability': 'f00b42be76b3ed22f053233f0d82bd559c73810a',
    'human-design-contract': '71d6b5ad391754b0f30fc5364e993208299640ed',
}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def build():
    files = {}

    def add(name, commit, lane):
        original = git('show', f'{commit}:{name}')
        actual = (ROOT / name).read_bytes()
        if actual != original:
            raise ValueError(f'Changed frozen input: {name}')
        files[name] = dict(path=name, bytes=len(actual), sha256=hashlib.sha256(actual).hexdigest(), sourceCommit=commit, lane=lane)

    for lane, commit in LANES.items():
        for row in git('diff', '--name-status', BASE, commit).decode().splitlines():
            status, name = row.split('\t')
            prefixes = (f'docs/agent-plans/cloud-lanes/{lane}/', f'experiments/cloud-lanes/{lane}/')
            if status != 'A' or not name.startswith(prefixes):
                raise ValueError(f'Unexpected source change: {row}')
            add(name, commit, lane)
    export = json.loads((ROOT / 'experiments/cloud-lanes/asset-export-portability/packet.json').read_text())
    geo = json.loads((ROOT / 'experiments/cloud-lanes/lagos-geography/source-pins.json').read_text())
    human = json.loads((ROOT / 'docs/agent-plans/cloud-lanes/human-design-contract/baseline-audit.json').read_text())
    shared = set(export['inputs']) | {x['path'] for x in geo['sources']} | set(human['sourceHashes']) | {'LICENSE'}
    for name in sorted(shared - set(files)):
        add(name, BASE, 'baseline-read-only')
    return dict(schema='allworld-cloud-input-index-v1', baseline=BASE,
                coordinator='844da27a549d30c5148c1cb5b5927b7d0f5bfde6', lanes=LANES,
                files=[files[k] for k in sorted(files)])


if __name__ == '__main__':
    value = build()
    text = json.dumps(value, indent=2) + '\n'
    path = Path(__file__).with_name('input-index.json')
    if sys.argv[1:] == ['--write']:
        if path.exists():
            raise ValueError('Input index already exists; immutable version must not be overwritten')
        path.write_text(text)
    elif sys.argv[1:] == ['--check']:
        if path.read_text() != text:
            raise ValueError('Input index differs')
    else:
        raise ValueError('Use --write once or --check')
    print(f'PASS: {len(value["files"])} exact committed inputs, {sum(x["bytes"] for x in value["files"])} bytes')
