"""Materialize exact candidate and prior inputs only into this review's scratch."""
from pathlib import Path
import hashlib,json,subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
DOC=ROOT/'docs/agent-plans/cloud-lanes/integration-contract/anatomy-v4-review'
COMMIT='2921534bdc8959a8489713f9b1652381702808a5'
EXP='experiments/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/'
SOURCE_DOC='docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/'
NAMES=['CONTINUE.md','checks.json','export-compatibility.json','uv-diagnostic.json','build-receipt.json','delivery.json','Allworld-anatomy-v4-neutral-half-full-review.png','neutral.png','half-blink.png','full-blink.png']
PRIOR_NAMES={
 'master/prototype/original-human-prototype.glb', 'master/prototype/fit-frame.json',
 'human/prototype/check_lid_candidate_v3.py',
 'hair/artifacts/master-fit-v1/curl-crop-fitted.glb',
 'hair/artifacts/master-fit-v1/swept-bun-fitted.glb',
 'hair/artifacts/master-fit-v1/curl-proxy-fitted.glb',
 'hair/artifacts/master-fit-v1/bun-proxy-fitted.glb',
 'hair/artifacts/master-fit-v1/fit-proposal.json',
 'wardrobe/envelope-fit-v1/artifacts/everyday-01-envelope-v1.glb',
 'wardrobe/envelope-fit-v1/binding-metadata.json',
 'skin/fitted-v1/artifacts/fitted-human-skin-eyes-v1.glb',
}
def main():
 specs=[{'commit':COMMIT,'sourcePath':s,'localPath':'scratch/'+Path(s).name} for s in [EXP+'anatomy-candidate-v4.glb',EXP+'fit-frame-candidate-v4.json',*[SOURCE_DOC+n for n in NAMES]]]
 prior=json.loads((DOC.parent/'combined-review-v1/input-pins.json').read_text())['files']
 for r in prior:
  suffix=r['localPath'].removeprefix('scratch/')
  if suffix in PRIOR_NAMES:specs.append({**r,'localPath':'scratch/prior/'+suffix})
 assert len(specs)==12+len(PRIOR_NAMES)
 rows=[]
 for s in specs:
  b=subprocess.check_output(['git','show',s['commit']+':'+s['sourcePath']],cwd=ROOT)
  digest=hashlib.sha256(b).hexdigest();assert len(b)<8*1024*1024
  if 'sha256' in s:assert s['sha256']==digest
  target=HERE/s['localPath'];target.parent.mkdir(parents=True,exist_ok=True)
  assert not target.exists() or target.read_bytes()==b
  if not target.exists():target.write_bytes(b)
  rows.append({k:s[k] for k in ['commit','sourcePath','localPath']}|{'bytes':len(b),'sha256':digest})
 DOC.mkdir(parents=True,exist_ok=True)
 (DOC/'input-pins.json').write_text(json.dumps({'source':'exact Git objects; no producer edits','files':rows},indent=2)+'\n')
 print(json.dumps({'files':len(rows),'bytes':sum(r['bytes'] for r in rows)}))
if __name__=='__main__':main()
