import argparse
import json
import subprocess
import sys
from pathlib import Path
from run import download

p = argparse.ArgumentParser()
p.add_argument('--request', required=True)
p.add_argument('--out', required=True)
a = p.parse_args()
request = Path(a.request).resolve()
d = json.loads(request.read_text())
assert d['schemaVersion'] == 1
out = Path(a.out)
assert not out.exists(), 'fresh output required'
out.mkdir(parents=True)
pbf = out / 'country.osm.pbf'
receipt = download(d['sourceUrl'], pbf)
fixture = request.parent / d['fixture']
assert fixture.resolve().parent == request.parent
command = [sys.executable, str(request.parent / 'country-boundary.py'), '--pbf', str(pbf), '--country', d['countryISO'], '--expected-bytes', str(d['bytes']), '--expected-sha256', d['sha256'], '--dataset-url', d['sourceUrl'], '--dataset-date', d['snapshotDate'], '--fixture', str(fixture), '--out', str(out / 'publish')]
result = subprocess.run(command)
(out / 'publish' / 'download.json').write_text(json.dumps(receipt, indent=2))
(out / 'publish' / 'request.json').write_text(request.read_text())
(out / 'publish' / 'fixture.json').write_text(fixture.read_text())
sys.exit(result.returncode)
