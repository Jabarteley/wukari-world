"""Read-only packet/hash check; no full-suite execution or root dependency install."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
LANE=Path(__file__).resolve().parent
r=ROOT/'experiments/cloud-lanes/integration-contract'
l=json.loads((r/'packet-lock.json').read_text());raw=(r/l['path']).read_bytes()
assert len(raw)==l['bytes'] and hashlib.sha256(raw).hexdigest()==l['sha256']
p=json.loads(raw);raw=(r/'input-index.json').read_bytes()
assert hashlib.sha256(raw).hexdigest()==p['inputIndexSha256']
inputs=json.loads(raw)['files']
for v in inputs:
    b=(ROOT/v['path']).read_bytes()
    assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256'],v['path']
for k,v in p['integrationSources'].items():
    b=(r/k).read_bytes()
    assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256'],k
print(json.dumps({'status':'PASS','integrationCommit':'caaee5e1b91afc7f3cd3f2124df3547dc7f492ec','packetSha256':l['sha256'],'verifiedFrozenInputs':len(inputs),'verifiedIntegrationSources':len(p['integrationSources']),'humanContractCommit':p['componentCommits']['human-design-contract'],'actualHumanMeshCheckpoint':None}))
