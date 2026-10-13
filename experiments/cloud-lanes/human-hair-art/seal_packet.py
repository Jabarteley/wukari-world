"""Seal/check this lane only. Output/source hashes include docs, never the manifest itself."""
import hashlib
import json
from pathlib import Path
import sys

LANE=Path(__file__).resolve().parent;ROOT=LANE.parents[2]
DOCS=ROOT/'docs/agent-plans/cloud-lanes/human-hair-art'
files={}
for prefix in [LANE,DOCS]:
    for p in sorted(prefix.rglob('*')):
        if not p.is_file() or any(s in p.parts for s in ['node_modules','runs','__pycache__']) or p==LANE/'packet.json':continue
        b=p.read_bytes();files[str(p.relative_to(ROOT))]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
packet={'schema':'allworld-original-hair-art-packet-v1','version':'c01-v3+s02-v3+lod-v2','integrationCommit':'caaee5e1b91afc7f3cd3f2124df3547dc7f492ec','humanContractCommit':'71d6b5ad391754b0f30fc5364e993208299640ed','earlyPushedCommit':'97af70f08d30371f6b786af8d3cd15fd474654e2','actualMasterCheckpoint':None,'actualFit':'pending-master','productionAdmission':False,'originalAuthorship':True,'license':'AGPL-3.0-or-later','totalBytesExcludingManifest':sum(x['bytes'] for x in files.values()),'files':files}
dest=LANE/'packet.json'
if sys.argv[1:]==['--write']:dest.write_text(json.dumps(packet,indent=2)+'\n')
elif sys.argv[1:]==['--check']:assert json.loads(dest.read_text())==packet,'Packet differs'
else:raise ValueError('Use --write or --check')
print(json.dumps({'status':'PASS','files':len(files),'bytes':packet['totalBytesExcludingManifest'],'packetSha256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
