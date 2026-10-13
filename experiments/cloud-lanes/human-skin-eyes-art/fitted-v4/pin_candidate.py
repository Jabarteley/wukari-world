"""Read immutable anatomy v4 Git blobs; write only owned, ignored inputs."""
from pathlib import Path
import subprocess,hashlib,json
P=Path(__file__).resolve().parent
COMMIT='2921534bdc8959a8489713f9b1652381702808a5'
ART='experiments/cloud-lanes/human-design-contract/prototype/'
DOC='docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/'
for d in ['inputs','artifacts','receipts','textures','proof']:(P/d).mkdir(exist_ok=True)
files=[ART+'anatomy-candidate-v4/'+x for x in ['anatomy-candidate-v4.blend','anatomy-candidate-v4.glb','fit-frame-candidate-v4.json']]
files += [DOC+x for x in ['CONTINUE.md','checks.json','build-receipt.json','export-compatibility.json','uv-diagnostic.json']]
files += [ART+x for x in ['build_anatomy_v4.py','check_lid_candidate_v3.py']]
rows={}
for path in files:
    b=subprocess.check_output(['git','show',COMMIT+':'+path]);(P/'inputs'/Path(path).name).write_bytes(b)
    rows[path]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
frame=json.loads((P/'inputs/fit-frame-candidate-v4.json').read_text())
assert rows[files[0]]['sha256']==frame['sourceBlendSha256']=='fb6f488c55b01083fc23803a79e677ae957ecc237004de62a78bd8804ee76302'
assert rows[files[1]]['sha256']==frame['sourceGlbSha256']=='2338c0b3b4d34d3549e2a2d30c91b4ddf65dc2111c9b6f13450a2dd8dad3477d'
(P/'receipts/input-pins.json').write_text(json.dumps({'status':'PASS','candidateCommit':COMMIT,'integrationBase':'caaee5e1b91afc7f3cd3f2124df3547dc7f492ec','preservedPreviousDerivativeCommit':'2544b6d66bddf5431ed15bd17298a21b43bcc454','frameId':frame['frameId'],'files':rows},indent=2)+'\n')
(P/'receipts/binding-migration.json').write_text(json.dumps({'candidateCommit':COMMIT,'fromFrame':'original-human-prototype-frame@1','toFrame':frame['frameId'],'removedNodeRebindings':{n:{'newNode':frame['controlledLidNode'],'material':'Fitted_<existing appearance>_Head_continuous_anatomy','uvLayer':'Head_socket_UV_v4'} for n in frame['removedNodes']},'rules':frame['correctiveRules'],'eyeUvLayers':{'Eye_Left/Right':'Prototype_UV_v1','Iris_Left/Right':'Eye_disc_UV_v4','Pupil_Left/Right':'Eye_disc_UV_v4'},'cornea':'New sphere-conforming owned caps; original caps remain in fitted-v1.','noMasterChanges':True},indent=2)+'\n')
print('Pinned',len(rows),'exact files; blend and GLB match published candidate hashes.')
