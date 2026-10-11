"""Pinned same-country source bootstrap, with candidate receipts and explicit holds."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.request import urlopen

BASELINE = '7a57e756a10b35a0eec9ec5928f083580fb9e7a9'
HERE = Path(__file__).resolve().parent
EXTRACTOR = HERE.parents[1] / 'offline-extract.py'

def digest(path, algorithm='sha256'):
    result = hashlib.new(algorithm)
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): result.update(block)
    return result.hexdigest()

def validate(table):
    version = table.get('schemaVersion')
    if version not in (1, 2) or isinstance(version, bool) or table.get('geometrySourceSha') != BASELINE:
        raise ValueError('unsupported schema or geometry baseline')
    seeds = [table['seed']] if version == 1 else table['seeds']
    source, airports = table['countrySource'], table['airports']
    if not isinstance(seeds, list) or not 1 <= len(seeds) <= 6:
        raise ValueError('one to six same-country seeds required')
    for seed in seeds:
        if not isinstance(seed, dict) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', seed.get('id', '')) or not seed.get('name', '').strip() or not re.fullmatch(r'[A-Z]{2}', seed.get('countryISO', '')):
            raise ValueError('invalid seed')
        if 'timezone' in seed and (not isinstance(seed['timezone'], str) or not seed['timezone']):
            raise ValueError('explicit timezone must be a nonempty IANA zone')
    if len({seed['id'] for seed in seeds}) != len(seeds) or len({seed['countryISO'] for seed in seeds}) != 1:
        raise ValueError('unique city ids and one country required')
    if not re.fullmatch(r'https://download\.geofabrik\.de/(?:[a-z0-9-]+/)+[a-z0-9-]+-\d{6}\.osm\.pbf', source.get('url', '')):
        raise ValueError('dated official country PBF URL required')
    if not isinstance(source.get('bytes'), int) or isinstance(source['bytes'], bool) or source['bytes'] <= 0 or not re.fullmatch(r'[0-9a-f]{32}', source.get('md5', '')):
        raise ValueError('invalid source byte/MD5 pins')
    if not re.fullmatch(r'[0-9a-f]{40}', airports.get('commit', '')) or airports['url'] != 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/' + airports['commit'] + '/airports.csv':
        raise ValueError('airport CSV must use its exact pinned source commit')
    from datetime import date
    for snapshot in (source.get('snapshotDate', ''), airports.get('snapshotDate', '')):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', snapshot):
            raise ValueError('snapshot date required')
        date.fromisoformat(snapshot)
    if source['url'].rsplit('/', 1)[1][-14:-8] != source['snapshotDate'][2:].replace('-', ''):
        raise ValueError('dated PBF URL and snapshot date disagree')
    return seeds, source, airports

def download(url, destination):
    for attempt in range(3):
        try:
            with urlopen(url, timeout=90) as response, destination.open('wb') as output:
                shutil.copyfileobj(response, output, 1024 * 1024)
                return {'requestedUrl': url, 'resolvedUrl': response.url, 'lastModified': response.headers.get('Last-Modified')}
        except Exception:
            if attempt == 2: raise
            time.sleep(2)

def stage(arguments, logfile):
    result = subprocess.run(arguments, capture_output=True, text=True)
    logfile.write_text(result.stdout + result.stderr)
    if result.returncode: raise ValueError('stage failed: ' + logfile.name)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--table', required=True)
    parser.add_argument('--geometry-source', required=True)
    parser.add_argument('--outdir', required=True)
    args = parser.parse_args()
    out = Path(args.outdir)
    if out.exists(): raise ValueError('execution output must be new')
    for name in ('downloads', 'metadata', 'extract', 'receipts', 'logs'): (out / name).mkdir(parents=True, exist_ok=True)
    result = {'status': 'HOLD', 'scope': 'source candidate only; no factory generation or browser acceptance'}
    try:
        table = json.loads(Path(args.table).read_text())
        seeds, source, airports = validate(table)
        geometry = Path(args.geometry_source).resolve()
        sha = subprocess.check_output(['git', '-C', str(geometry), 'rev-parse', 'HEAD'], text=True).strip()
        if sha != BASELINE: raise ValueError('geometry checkout SHA mismatch')
        pbf, csv = out / 'downloads/country.osm.pbf', out / 'downloads/airports.csv'
        source_http, csv_http = download(source['url'], pbf), download(airports['url'], csv)
        if pbf.stat().st_size != source['bytes'] or digest(pbf, 'md5') != source['md5']: raise ValueError('PBF byte count/MD5 mismatch')
        pbf_sha, csv_sha = digest(pbf), digest(csv)
        receipts = {'pbf': {**source, 'sha256': pbf_sha, 'http': source_http}, 'airports': {**airports, 'sha256': csv_sha, 'http': csv_http}, 'geometrySourceSha': sha, 'extractorSha256': digest(EXTRACTOR)}
        (out / 'receipts/downloads.json').write_text(json.dumps(receipts, indent=2))
        zone, countries = Path('/usr/share/zoneinfo/zone.tab'), Path('/usr/share/zoneinfo/iso3166.tab')
        tz_version = Path('/usr/share/zoneinfo/tzdata.zi')
        tz = {'zoneTabSha256': digest(zone), 'countryTableSha256': digest(countries), 'tzdataVersion': tz_version.read_text().splitlines()[0] if tz_version.exists() else 'unavailable'}
        shutil.copyfile(zone, out / 'receipts/zone.tab'); shutil.copyfile(countries, out / 'receipts/iso3166.tab')
        (out / 'receipts/timezones.json').write_text(json.dumps(tz, indent=2))
        boundary = out / 'country-boundary'
        boundary_error = None
        try:
            stage([sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', seeds[0]['countryISO'], '--expected-sha256', pbf_sha, '--expected-bytes', str(source['bytes']), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--out', str(boundary)], out / 'logs/country-boundary.log')
            boundary_receipt = {'countryISO': seeds[0]['countryISO'], 'path': 'country-boundary/boundary.geojson', 'sha256': digest(boundary / 'boundary.geojson'), 'receiptPath': 'country-boundary/receipt.json', 'receiptSha256': digest(boundary / 'receipt.json')}
            result['countryBoundary'] = boundary_receipt
        except Exception as error:
            boundary_error = str(error)
            result['countryBoundary'] = {'status': 'HOLD', 'diagnosticPath': 'country-boundary/result.json', 'reason': boundary_error}
        producers, city_results = [], []
        for seed in seeds:
            try:
                city_metadata = out / 'metadata' if table['schemaVersion'] == 1 else out / 'metadata' / seed['id']
                city_metadata.mkdir(parents=True, exist_ok=True)
                seed_file = city_metadata / 'seed.json'
                seed_file.write_text(json.dumps(seed))
                candidate = city_metadata / 'candidate'
                stage([sys.executable, str(HERE / 'metadata.py'), '--seed', str(seed_file), '--pbf', str(pbf), '--airports-csv', str(csv), '--airports-date', airports['snapshotDate'], '--zone-tab', str(zone), '--countries-tab', str(countries), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--expected-pbf-sha256', pbf_sha, '--dataset-bytes', str(source['bytes']), '--source-verified', '--geometry-source', str(geometry), '--adapter', str(EXTRACTOR), '--out', str(candidate)], out / 'logs' / (seed['id'] + '-metadata.log'))
                stage([sys.executable, str(EXTRACTOR), str(pbf), str(candidate / 'source-input.json'), '--dataset-url', source['url'], '--dataset-bytes', str(source['bytes']), '--dataset-md5', source['md5'], '--dataset-sha256', pbf_sha, '--output-root', str(out / 'extract')], out / 'logs' / (seed['id'] + '-extraction.log'))
                hashes = {label: digest(out / 'extract' / seed['id'] / (label + '.json')) for label in ('places','extras','water','landuse','roads')}
                producer = {'city': seed['id'], 'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceArtifact': 'city-bootstrap-' + (seed['id'] if table['schemaVersion'] == 1 else seeds[0]['countryISO'].lower()) + '-' + os.environ['GITHUB_SHA'], 'sourceSha': os.environ['GITHUB_SHA'], 'datasetSha256': pbf_sha, 'adapterSha256': digest(EXTRACTOR), 'extractSha256': hashes}
                job_file = out / 'receipts/source-job.json' if table['schemaVersion'] == 1 else out / 'receipts' / (seed['id'] + '-source-job.json')
                job_file.write_text(json.dumps(producer, indent=2))
                producers.append(producer)
                city_results.append({'id': seed['id'], 'status': 'SOURCE_CANDIDATE', 'sourceJob': producer})
            except Exception as error:
                city_result = {'id': seed['id'], 'status': 'HOLD', 'reason': str(error)}
                city_results.append(city_result)
                (out / 'receipts' / (seed['id'] + '-result.json')).write_text(json.dumps(city_result, indent=2))
        result.update(status='SOURCE_CANDIDATE', ids=[seed['id'] for seed in seeds], sourceJobs=producers, cityResults=city_results, holds=['factory semantic/source/scene checks not yet executed', 'metadata/visual/browser acceptance remains separate'])
        if boundary_error:
            result.update(status='HOLD', reason=boundary_error)
            result['holds'].append('exact same-source country boundary remains HOLD')
        failed_cities = [city for city in city_results if city['status'] == 'HOLD']
        if failed_cities:
            result.update(status='HOLD', reason='city source candidates remain HOLD: ' + ', '.join(city['id'] for city in failed_cities))
            result['holds'].append('one or more city source candidates failed; inspect per-city receipts')
        if table['schemaVersion'] == 1:
            result['id'] = seeds[0]['id']
            if producers:
                result['sourceJob'] = producers[0]
    except Exception as error:
        result['reason'] = str(error)
    (out / 'receipts/result.json').write_text(json.dumps(result, indent=2))
    publish = out / 'publish'
    publish.mkdir()
    for name in ('metadata', 'receipts', 'logs'):
        shutil.copytree(out / name, publish / name)
    if (out / 'country-boundary').exists():
        shutil.copytree(out / 'country-boundary', publish / 'country-boundary')
    for city in (out / 'extract').iterdir():
        if city.is_dir(): shutil.copytree(city, publish / city.name)
    print(json.dumps(result))
    return 0 if result['status'] == 'SOURCE_CANDIDATE' else 1

if __name__ == '__main__': sys.exit(main())
