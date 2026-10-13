"""Materialize exact Git blobs in this lane only; verify committed frame and mesh packet."""
from pathlib import Path
import hashlib,json,subprocess
P=Path(__file__).resolve().parent
COMMIT='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a'
PREFIX='experiments/cloud-lanes/human-design-contract/prototype/'
DOC='docs/agent-plans/cloud-lanes/human-design-contract/prototype/'
files=[PREFIX+x for x in ['original-human-prototype.blend','original-human-prototype.glb','fit-frame.json']]+[DOC+x for x in ['geometry-checks.json','neutral-front.png']]
records={}
for f in files:
 b=subprocess.check_output(['git','show',COMMIT+':'+f]);dest=P/'inputs'/Path(f).name;dest.write_bytes(b)
 records[f]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
frame=json.loads((P/'inputs/fit-frame.json').read_text());checks=json.loads((P/'inputs/geometry-checks.json').read_text())
assert records[PREFIX+'original-human-prototype.blend']['sha256']==frame['sourceBlendSha256']==checks['blendSha256']
assert records[PREFIX+'original-human-prototype.glb']['sha256']==frame['sourceGlbSha256']==checks['glbSha256']
(P/'input-pins.json').write_text(json.dumps({'status':'PASS','commit':COMMIT,'files':records,'frameId':frame['frameId'],'calibrationCommit':'1efc5a280e52a0b3c432fca649d84689fe91993d','masterUnchanged':True},indent=2)+'\n')
print(json.dumps({'status':'PASS','commit':COMMIT,'files':len(records),'fitFrameSha256':records[PREFIX+'fit-frame.json']['sha256']},indent=2))
