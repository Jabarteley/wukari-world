import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from run import download

p = argparse.ArgumentParser()
p.add_argument('--request', required=True)
p.add_argument('--plan', action='store_true')
p.add_argument('--country')
p.add_argument('--out')
a = p.parse_args()
request = Path(a.request).resolve()
table = json.loads(request.read_text())
assert table['schemaVersion'] == 2
countries = table['countries']
assert isinstance(countries, list) and 1 <= len(countries) <= 5
assert len({d['countryISO'] for d in countries}) == len(countries)
for d in countries:
    assert re.fullmatch('[A-Z]{2}', d['countryISO'])
    assert re.fullmatch(r'https://download\.geofabrik\.de/[a-z0-9/-]+-\d{6}\.osm\.pbf', d['sourceUrl'])
    assert type(d['bytes']) is int and d['bytes'] > 0
    assert re.fullmatch('[a-f0-9]{64}', d['sha256'])
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', d['snapshotDate'])
    if d.get('fixture'):
        assert (request.parent / d['fixture']).resolve().parent == request.parent
if a.plan:
    print(json.dumps({'include': [{'country': d['countryISO']} for d in countries]}))
    sys.exit(0)
assert a.country and a.out
[d] = [d for d in countries if d['countryISO'] == a.country]
out = Path(a.out)
assert not out.exists(), 'fresh output required'
out.mkdir(parents=True)
pbf = out / 'country.osm.pbf'
receipt = download(d['sourceUrl'], pbf)
command = [sys.executable, str(request.parent / 'country-boundary.py'), '--pbf', str(pbf), '--country', d['countryISO'], '--expected-bytes', str(d['bytes']), '--expected-sha256', d['sha256'], '--dataset-url', d['sourceUrl'], '--dataset-date', d['snapshotDate'], '--out', str(out / 'publish')]
if d.get('fixture'):
    command += ['--fixture', str(request.parent / d['fixture'])]
result = subprocess.run(command)
(out / 'publish' / 'download.json').write_text(json.dumps(receipt, indent=2))
(out / 'publish' / 'request.json').write_text(json.dumps(d, indent=2))
if d.get('fixture'):
    (out / 'publish' / 'fixture.json').write_text((request.parent / d['fixture']).read_text())
sys.exit(result.returncode)
