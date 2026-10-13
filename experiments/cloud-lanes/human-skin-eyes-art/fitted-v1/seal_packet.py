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
  if not f.is_file() or 'inputs' in f.parts or f.suffix in ['.blend1','.log'] or ('proof' in f.parts and f.suffix=='.png') or f.name=='packet.json':continue
  b=f.read_bytes();files[str(f.relative_to(P))]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 packet={'schema':'allworld-fitted-skin-eyes-v1','masterCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','calibrationCommit':'1efc5a280e52a0b3c432fca649d84689fe91993d','earlyFittedCommit':'2973529c','fitStatus':'REVIEW_REQUIRED: partial blink intersections; provisional UV overlaps','productionAdmission':False,'sourceAndDerivedGeometry':'original 31 meshes, UVs and morphs exact; two 600-triangle corneal caps added','units':'metres','axes':'Blender Z up / -Y front; GLB Y up / +Z front','files':files}
 (P/'packet.json').write_text(json.dumps(packet,indent=2)+'\n');print('Packet',len(files),'files,',sum(v['bytes'] for v in files.values()),'bytes excluding packet self')
