"""Hash verification only. Does not render, export, install or contact the network."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[3]
m=json.loads((Path(__file__).parent/'SHA256SUMS.json').read_text())
for p,row in m['files'].items():
 b=(root/p).read_bytes()
 assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],p
print(f"PASS: {len(m['files'])} lane files / {sum(r['bytes'] for r in m['files'].values())} bytes match")
