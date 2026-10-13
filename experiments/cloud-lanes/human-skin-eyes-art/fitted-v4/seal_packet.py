"""Hash owned derivative deliverables/receipts. Original master blobs stay in Git, not duplicated."""
from pathlib import Path
import json,hashlib,sys
P=Path(__file__).resolve().parent
if '--check' in sys.argv:
 value=json.loads((P/'packet.json').read_text())
 for name,pin in value['files'].items():
  b=(P/name).read_bytes();assert len(b)==pin['bytes'] and hashlib.sha256(b).hexdigest()==pin['sha256'],name
 print('PASS',len(value['files']),'derivative file hashes')
else:
 files={}
 for f in sorted(P.rglob('*')):
  if not f.is_file() or 'inputs' in f.parts or f.suffix in ['.blend1','.log'] or ('proof' in f.parts and f.suffix=='.png') or '__pycache__' in f.parts or f.name=='packet.json':continue
  b=f.read_bytes();files[str(f.relative_to(P))]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 packet={'schema':'allworld-fitted-skin-eyes-anatomy-v4','candidateCommit':'2921534bdc8959a8489713f9b1652381702808a5','preservedOldDerivativeCommit':'2544b6d66bddf5431ed15bd17298a21b43bcc454','calibrationCommit':'1efc5a280e52a0b3c432fca649d84689fe91993d','fitStatus':'PASS 111 finite sampled poses for added corneas; candidate source meshes exact','productionAdmission':False,'sourceAndDerivedGeometry':'27 candidate meshes exact; two 600-triangle sphere-conforming corneal caps added','units':'metres','axes':'Blender Z up / -Y front; GLB Y up / +Z front','files':files}
 (P/'packet.json').write_text(json.dumps(packet,indent=2)+'\n');print('Packet',len(files),'files,',sum(v['bytes'] for v in files.values()),'bytes excluding packet self')
