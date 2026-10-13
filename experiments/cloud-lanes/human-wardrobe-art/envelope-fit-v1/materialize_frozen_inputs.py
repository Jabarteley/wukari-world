"""Extract exact already-fetched Git objects to ignored lane scratch; never follows a branch."""
from pathlib import Path
import subprocess,json,hashlib
LANE=Path(__file__).resolve().parent.parent;ROOT=LANE.parents[2]
commit='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a';target=LANE/'runs/frozen-human-3ee5882';target.mkdir(parents=True,exist_ok=True)
base='experiments/cloud-lanes/human-design-contract/prototype/'
paths=[base+n for n in ['fit-frame.json','original-human-prototype.blend','original-human-prototype.glb','build_character.py']]+['docs/agent-plans/cloud-lanes/human-design-contract/prototype/geometry-checks.json']
files={p:subprocess.check_output(['git','show',commit+':'+p],cwd=ROOT) for p in paths}
frame=json.loads(files[base+'fit-frame.json']);assert hashlib.sha256(files[base+'fit-frame.json']).hexdigest()=='51fae932279d1513e16c4d06ce633f6218a994fe6c224bc3436e105cc519083b'
assert hashlib.sha256(files[base+'original-human-prototype.blend']).hexdigest()==frame['sourceBlendSha256']
assert hashlib.sha256(files[base+'original-human-prototype.glb']).hexdigest()==frame['sourceGlbSha256']
for p,b in files.items():(target/Path(p).name).write_bytes(b)
print('PASS: exact frozen human input files materialized under owned ignored scratch')
