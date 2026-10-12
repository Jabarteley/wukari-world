"""Pinned same-country source bootstrap, with candidate receipts and explicit holds."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from datetime import date, datetime, timezone
import tempfile

HERE = Path(__file__).resolve().parent
_shared_spec = importlib.util.spec_from_file_location('shared_source_bootstrap', HERE / 'run.py')
_shared = importlib.util.module_from_spec(_shared_spec)
_shared_spec.loader.exec_module(_shared)
BASELINE, EXTRACTOR = _shared.BASELINE, _shared.EXTRACTOR
digest, download, stage = _shared.digest, _shared.download, _shared.stage

def validate(table):
    if type(table.get('schemaVersion')) is not int or table['schemaVersion'] != 2:
        raise ValueError('country batches require schemaVersion 2')
    seeds = table.get('seeds')
    if not isinstance(seeds, list) or not 1 <= len(seeds) <= 6:
        raise ValueError('one to six same-country seeds required')
    source, airports = table['countrySource'], table['airports']
    for seed in seeds:
        _shared.validate({'schemaVersion': 1, 'geometrySourceSha': table.get('geometrySourceSha'),
                          'seed': seed, 'countrySource': source, 'airports': airports})
    if len({seed['id'] for seed in seeds}) != len(seeds) or len({seed['countryISO'] for seed in seeds}) != 1:
        raise ValueError('unique city ids and one country required')
    for snapshot in (source['snapshotDate'], airports['snapshotDate']):
        date.fromisoformat(snapshot)
    if source['url'].rsplit('/', 1)[1][-14:-8] != source['snapshotDate'][2:].replace('-', ''):
        raise ValueError('dated PBF URL and snapshot date disagree')
    return seeds, source, airports

def _utc_now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def _write_phase_receipt(path, phases):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {'phases': phases}
    fd, temporary = tempfile.mkstemp(prefix='.phase-timings-', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(payload, stream, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def digest_many(path, algorithms):
    hashes = {algorithm: hashlib.new(algorithm) for algorithm in algorithms}
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            for checksum in hashes.values(): checksum.update(block)
    return {algorithm: checksum.hexdigest() for algorithm, checksum in hashes.items()}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--table', required=True)
    parser.add_argument('--geometry-source', required=True)
    parser.add_argument('--outdir', required=True)
    args = parser.parse_args()
    out = Path(args.outdir)
    if out.exists(): raise ValueError('execution output must be new')
    for name in ('downloads', 'metadata', 'extract', 'receipts', 'logs'): (out / name).mkdir(parents=True, exist_ok=True)
    phase_receipt = out / 'receipts/phase-timings.json'
    publish = out / 'publish'
    publish.mkdir(parents=True, exist_ok=True)
    publish_phase_receipt = publish / 'phase-timings.json'
    phases = []
    def phase(name, action):
        started_at, started = _utc_now(), time.monotonic()
        record = {'phase': name, 'start': started_at, 'status': 'running'}
        phases.append(record)
        _write_phase_receipt(phase_receipt, phases)
        _write_phase_receipt(publish_phase_receipt, phases)
        print('PHASE_START ' + json.dumps({'phase': name, 'start': started_at}), flush=True)
        try:
            value = action()
        except Exception as error:
            record.update(end=_utc_now(), elapsedSeconds=round(time.monotonic() - started, 3), status='failed', error=str(error))
            _write_phase_receipt(phase_receipt, phases)
            _write_phase_receipt(publish_phase_receipt, phases)
            print('PHASE_END ' + json.dumps(record), flush=True)
            raise
        record.update(end=_utc_now(), elapsedSeconds=round(time.monotonic() - started, 3), status='completed')
        _write_phase_receipt(phase_receipt, phases)
        _write_phase_receipt(publish_phase_receipt, phases)
        print('PHASE_END ' + json.dumps(record), flush=True)
        return value
    result = {'status': 'HOLD', 'scope': 'source candidate only; no factory generation or browser acceptance'}
    try:
        table = json.loads(Path(args.table).read_text())
        seeds, source, airports = validate(table)
        geometry = Path(args.geometry_source).resolve()
        sha = subprocess.check_output(['git', '-C', str(geometry), 'rev-parse', 'HEAD'], text=True).strip()
        if sha != BASELINE: raise ValueError('geometry checkout SHA mismatch')
        pbf, csv = out / 'downloads/country.osm.pbf', out / 'downloads/airports.csv'
        source_http = phase('pbf-download', lambda: download(source['url'], pbf))
        csv_http = phase('airport-csv-download', lambda: download(airports['url'], csv))
        def validate_pbf_and_hash():
            if pbf.stat().st_size != source['bytes']: raise ValueError('PBF byte count mismatch')
            checksums = digest_many(pbf, ('md5', 'sha256'))
            if checksums['md5'] != source['md5']: raise ValueError('PBF MD5 mismatch')
            return checksums['sha256']
        pbf_sha = phase('pbf-size-md5-sha256-validation', validate_pbf_and_hash)
        csv_sha = phase('airport-csv-hash', lambda: digest(csv))
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
            phase('country-boundary-derivation', lambda: stage([sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', seeds[0]['countryISO'], '--expected-sha256', pbf_sha, '--expected-bytes', str(source['bytes']), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--out', str(boundary)], out / 'logs/country-boundary.log'))
            boundary_receipt = {'countryISO': seeds[0]['countryISO'], 'path': 'country-boundary/boundary.geojson', 'sha256': digest(boundary / 'boundary.geojson'), 'receiptPath': 'country-boundary/receipt.json', 'receiptSha256': digest(boundary / 'receipt.json')}
            result['countryBoundary'] = boundary_receipt
        except Exception as error:
            boundary_error = str(error)
            result['countryBoundary'] = {'status': 'HOLD', 'diagnosticPath': 'country-boundary/result.json', 'reason': boundary_error}
        producers, city_results = [], []
        for seed in seeds:
            if boundary_error:
                city_result = {
                    'id': seed['id'],
                    'status': 'HOLD',
                    'reason': 'exact same-source country boundary is HOLD; city metadata and extraction were skipped',
                }
                city_results.append(city_result)
                (out / 'receipts' / (seed['id'] + '-result.json')).write_text(json.dumps(city_result, indent=2))
                print('CITY_SKIPPED ' + json.dumps({'city': seed['id'], 'reason': 'country-boundary-hold'}), flush=True)
                continue
            try:
                city_metadata = out / 'metadata' / seed['id']
                city_metadata.mkdir(parents=True, exist_ok=True)
                seed_file = city_metadata / 'seed.json'
                seed_file.write_text(json.dumps(seed))
                candidate = city_metadata / 'candidate'
                phase(seed['id'] + '-metadata', lambda: stage([sys.executable, str(HERE / 'metadata.py'), '--seed', str(seed_file), '--pbf', str(pbf), '--airports-csv', str(csv), '--airports-date', airports['snapshotDate'], '--zone-tab', str(zone), '--countries-tab', str(countries), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--expected-pbf-sha256', pbf_sha, '--dataset-bytes', str(source['bytes']), '--source-verified', '--geometry-source', str(geometry), '--adapter', str(EXTRACTOR), '--out', str(candidate)], out / 'logs' / (seed['id'] + '-metadata.log')))
                phase(seed['id'] + '-extraction', lambda: stage([sys.executable, str(EXTRACTOR), str(pbf), str(candidate / 'source-input.json'), '--dataset-url', source['url'], '--dataset-bytes', str(source['bytes']), '--dataset-md5', source['md5'], '--dataset-sha256', pbf_sha, '--output-root', str(out / 'extract')], out / 'logs' / (seed['id'] + '-extraction.log')))
                hashes = phase(seed['id'] + '-layer-hashes', lambda: {label: digest(out / 'extract' / seed['id'] / (label + '.json')) for label in ('places','extras','water','landuse','roads')})
                producer = {'city': seed['id'], 'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceArtifact': 'city-bootstrap-' + seeds[0]['countryISO'].lower() + '-' + os.environ['GITHUB_SHA'], 'sourceSha': os.environ['GITHUB_SHA'], 'datasetSha256': pbf_sha, 'adapterSha256': digest(EXTRACTOR), 'extractSha256': hashes}
                job_file = out / 'receipts' / (seed['id'] + '-source-job.json')
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
    except Exception as error:
        result['reason'] = str(error)
    (out / 'receipts/result.json').write_text(json.dumps(result, indent=2))
    def publish_copy():
        publish.mkdir(exist_ok=True)
        for name in ('metadata', 'receipts', 'logs'):
            shutil.copytree(out / name, publish / name)
        if (out / 'country-boundary').exists():
            shutil.copytree(out / 'country-boundary', publish / 'country-boundary')
        for city in (out / 'extract').iterdir():
            if city.is_dir(): shutil.copytree(city, publish / city.name)
    phase('publish-copy', publish_copy)
    shutil.copyfile(out / 'receipts/phase-timings.json', publish / 'receipts/phase-timings.json')
    print(json.dumps(result))
    return 0 if result['status'] == 'SOURCE_CANDIDATE' else 1

if __name__ == '__main__': sys.exit(main())
