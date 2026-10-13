"""Recover the exact immutable before assets from this branch's Git ancestry."""
from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent;pins=json.loads((P/'receipts/before-pins.json').read_text());prefix='experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/'
(P/'inputs').mkdir(exist_ok=True)
for name,pin in pins['artifacts'].items():
 data=subprocess.check_output(['git','show',pins['commit']+':'+prefix+name])
 assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256']
 (P/'inputs'/Path(name).name).write_bytes(data)
print('PASS exact before Blender/GLB bytes',pins['commit'])
