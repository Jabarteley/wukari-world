"""Read exact Git objects into ignored lane scratch; verify pinned fit frame and source hashes."""
import hashlib
import json
from pathlib import Path
import subprocess

LANE=Path(__file__).resolve().parent;ROOT=LANE.parents[2]
pin=json.loads((LANE/'inputs/master-3ee5882.json').read_text())
out=LANE/'runs/master-3ee5882';out.mkdir(parents=True,exist_ok=True)
for row in pin['files']:
    b=subprocess.check_output(['git','show',pin['commit']+':'+row['repositoryPath']],cwd=ROOT)
    assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row
    (out/Path(row['repositoryPath']).name).write_bytes(b)
frame=json.loads((out/'fit-frame.json').read_text())
for name,key in [('original-human-prototype.blend','sourceBlendSha256'),('original-human-prototype.glb','sourceGlbSha256')]:
    assert hashlib.sha256((out/name).read_bytes()).hexdigest()==frame[key]
print('PASS: exact 3ee5882 master source, GLB, fit-frame, report and inspection source; no master execution/rebuild')
