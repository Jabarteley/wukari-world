"""Verify the optimization/fit delivery bytes without modifying or rebuilding assets."""
from pathlib import Path
import json,hashlib
lane=Path(__file__).resolve().parent;root=lane.parents[2]
m=json.loads((lane/'OPTIMIZATION-FIT-SHA256SUMS.json').read_text())
for name,row in m['files'].items():
 b=(root/name).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],name
print(f"PASS: {len(m['files'])} optimization/fit files match")
