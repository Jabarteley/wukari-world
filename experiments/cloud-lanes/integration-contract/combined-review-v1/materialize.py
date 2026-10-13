"""Read exact Git blobs into ignored review scratch; never modify producer paths."""
from pathlib import Path
import hashlib,json,subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
DOC=ROOT/'docs/agent-plans/cloud-lanes/integration-contract/combined-review-v1'
SPECS={
 'human':('b62b7fb6d10e9c80e0d127d535d97a86d0b29f49','human-design-contract',[
  'prototype/eyelid-candidate-v3/eyelid-candidate-v3.glb','prototype/eyelid-candidate-v3/eyelid-candidate-v3.blend','prototype/eyelid-candidate-v3/fit-frame-candidate-v3.json','prototype/check_lid_candidate_v3.py']),
 'master':('3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','human-design-contract',['prototype/original-human-prototype.glb','prototype/fit-frame.json']),
 'skin':('2544b6d66bddf5431ed15bd17298a21b43bcc454','human-skin-eyes-art',[
  'fitted-v1/artifacts/fitted-human-skin-eyes-v1.glb','fitted-v1/artifacts/fitted-human-skin-eyes-v1.blend','fitted-v1/packet.json','fitted-v1/input-pins.json','fitted-v1/cornea-fix/receipts/dense-blink.json']),
 'hair':('7a9759f1c371aba39bc34b875e64797c4071ad25','human-hair-art',[
  'artifacts/master-fit-v1/curl-crop-fitted.glb','artifacts/master-fit-v1/swept-bun-fitted.glb','artifacts/master-fit-v1/curl-proxy-fitted.glb','artifacts/master-fit-v1/bun-proxy-fitted.glb','artifacts/master-fit-v1/fit-proposal.json','artifacts/master-fit-v1/fit-checks.json']),
 'wardrobe':('8f6e32102f47330239c30d45aa552ea6e17d9011','human-wardrobe-art',[
  'envelope-fit-v1/artifacts/everyday-01-envelope-v1.glb','envelope-fit-v1/artifacts/everyday-01-envelope-v1-editable.blend','envelope-fit-v1/binding-metadata.json','envelope-fit-v1/receipts/fit-checks.json'])}

def main():
 rows=[]
 for alias,(commit,slug,paths) in SPECS.items():
  for path in paths:
   source=f'experiments/cloud-lanes/{slug}/{path}'
   b=subprocess.check_output(['git','show',commit+':'+source],cwd=ROOT)
   assert len(b)<8*1024*1024
   target=HERE/'scratch'/alias/path;target.parent.mkdir(parents=True,exist_ok=True)
   if target.exists():assert target.read_bytes()==b, str(target)
   else:target.write_bytes(b)
   rows.append({'alias':alias,'commit':commit,'sourcePath':source,'localPath':str(target.relative_to(HERE)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 DOC.mkdir(parents=True,exist_ok=True)
 (DOC/'input-pins.json').write_text(json.dumps({'source':'exact Git objects','files':rows},indent=2)+'\n')
 print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows)}))
if __name__=='__main__':main()
