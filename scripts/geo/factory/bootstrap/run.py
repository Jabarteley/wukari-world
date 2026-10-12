"""One seed source bootstrap, with candidate-only receipts and explicit holds."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import time
from urllib.request import urlopen

BASELINE = '7a57e756a10b35a0eec9ec5928f083580fb9e7a9'
HERE = Path(__file__).resolve().parent
EXTRACTOR = HERE.parents[1] / 'offline-extract.py'
_metadata_spec = importlib.util.spec_from_file_location('bootstrap_metadata', HERE / 'metadata.py')
_metadata = importlib.util.module_from_spec(_metadata_spec)
_metadata_spec.loader.exec_module(_metadata)

def digest(path, algorithm='sha256'):
    result = hashlib.new(algorithm)
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): result.update(block)
    return result.hexdigest()

def validate(table):
    if table.get('schemaVersion') != 1 or table.get('geometrySourceSha') != BASELINE: raise ValueError('unsupported schema or geometry baseline')
    seed, source, airports = table['seed'], table['countrySource'], table['airports']
    _metadata.validate_seed(seed)
    _metadata.validate_dataset_url(source.get('url'))
    if not isinstance(source.get('bytes'), int) or isinstance(source['bytes'], bool) or source['bytes'] <= 0 or not re.fullmatch(r'[0-9a-f]{32}', source.get('md5', '')): raise ValueError('invalid source byte/MD5 pins')
    if not re.fullmatch(r'[0-9a-f]{40}', airports.get('commit', '')) or airports['url'] != 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/' + airports['commit'] + '/airports.csv': raise ValueError('airport CSV must use its exact pinned source commit')
    for date in (source.get('snapshotDate', ''), airports.get('snapshotDate', '')):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date): raise ValueError('snapshot date required')
    return seed, source, airports

def download(url, destination):
    for attempt in range(3):
        started = time.monotonic()
        downloaded = 0
        total = None
        stopped = threading.Event()
        def heartbeat():
            while not stopped.wait(30):
                elapsed = time.monotonic() - started
                size = total if total is not None else 'unknown'
                rate = downloaded / max(elapsed, 0.001) / (1024 * 1024)
                print(f'[download] {destination.name} active: {downloaded}/{size} bytes; elapsed={elapsed:.0f}s; rate={rate:.2f} MiB/s', flush=True)
        reporter = threading.Thread(target=heartbeat, daemon=True)
        reporter.start()
        print(f'[download] {destination.name} attempt {attempt + 1}/3 started', flush=True)
        try:
            with urlopen(url, timeout=90) as response, destination.open('wb') as output:
                length = response.headers.get('Content-Length')
                total = int(length) if length and length.isdigit() else None
                print(f'[download] {destination.name} Content-Length={total if total is not None else "unknown"} bytes', flush=True)
                last_reported_bytes = 0
                while block := response.read(1024 * 1024):
                    output.write(block)
                    downloaded += len(block)
                    now = time.monotonic()
                    if downloaded - last_reported_bytes >= 64 * 1024 * 1024:
                        elapsed = now - started
                        print(f'[download] {destination.name} {downloaded}/{total if total is not None else "unknown"} bytes; elapsed={elapsed:.0f}s; rate={downloaded / elapsed / (1024 * 1024):.2f} MiB/s', flush=True)
                        last_reported_bytes = downloaded
                elapsed = time.monotonic() - started
                print(f'[download] {destination.name} complete: {downloaded}/{total if total is not None else "unknown"} bytes; elapsed={elapsed:.0f}s; rate={downloaded / max(elapsed, 0.001) / (1024 * 1024):.2f} MiB/s', flush=True)
                source_http = {'requestedUrl': url, 'resolvedUrl': response.url, 'lastModified': response.headers.get('Last-Modified')}
        except Exception as error:
            print(f'[download] {destination.name} attempt {attempt + 1}/3 failed after {downloaded} bytes and {time.monotonic() - started:.0f}s: {type(error).__name__}: {error}', flush=True)
            if attempt == 2: raise
            time.sleep(2)
            continue
        finally:
            stopped.set()
            reporter.join()
        return source_http

def forward_metadata_phases(logfile, offset, pending=b'', final=False):
    with logfile.open('rb') as source:
        source.seek(offset)
        appended = source.read()
    offset += len(appended)
    lines = (pending + appended).split(b'\n')
    pending = lines.pop()
    if final and pending:
        lines.append(pending)
        pending = b''
    for raw_line in lines:
        line = raw_line.decode('utf-8', errors='replace')
        if line.startswith('[metadata-phase] '):
            print(line, flush=True)
    return offset, pending

def stage(arguments, logfile):
    started = time.monotonic()
    phase_offset, phase_pending = 0, b''
    print(f'[stage] {logfile.name} started', flush=True)
    with logfile.open('w') as output, subprocess.Popen(arguments, stdout=output, stderr=subprocess.STDOUT) as process:
        while True:
            try:
                returncode = process.wait(timeout=30)
                break
            except subprocess.TimeoutExpired:
                phase_offset, phase_pending = forward_metadata_phases(logfile, phase_offset, phase_pending)
                print(f'[stage] {logfile.name} still running; elapsed={time.monotonic() - started:.0f}s', flush=True)
        phase_offset, phase_pending = forward_metadata_phases(logfile, phase_offset, phase_pending, final=True)
    print(f'[stage] {logfile.name} finished; elapsed={time.monotonic() - started:.0f}s; exit={returncode}', flush=True)
    if returncode: raise ValueError('stage failed: ' + logfile.name)

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
        seed, source, airports = validate(table)
        geometry = Path(args.geometry_source).resolve()
        sha = subprocess.check_output(['git', '-C', str(geometry), 'rev-parse', 'HEAD'], text=True).strip()
        if sha != BASELINE: raise ValueError('geometry checkout SHA mismatch')
        pbf, csv = out / 'downloads/country.osm.pbf', out / 'downloads/airports.csv'
        source_http, csv_http = download(source['url'], pbf), download(airports['url'], csv)
        if pbf.stat().st_size != source['bytes'] or digest(pbf, 'md5') != source['md5']: raise ValueError('PBF byte count/MD5 mismatch')
        pbf_sha, csv_sha = digest(pbf), digest(csv)
        receipts = {'pbf': {**source, 'sha256': pbf_sha, 'http': source_http}, 'airports': {**airports, 'sha256': csv_sha, 'http': csv_http}, 'geometrySourceSha': sha, 'extractorSha256': digest(EXTRACTOR)}
        (out / 'receipts/downloads.json').write_text(json.dumps(receipts, indent=2))
        seed_file = out / 'metadata/seed.json'; seed_file.write_text(json.dumps(seed))
        zone, countries = Path('/usr/share/zoneinfo/zone.tab'), Path('/usr/share/zoneinfo/iso3166.tab')
        tz_version = Path('/usr/share/zoneinfo/tzdata.zi')
        tz = {'zoneTabSha256': digest(zone), 'countryTableSha256': digest(countries), 'tzdataVersion': tz_version.read_text().splitlines()[0] if tz_version.exists() else 'unavailable'}
        shutil.copyfile(zone, out / 'receipts/zone.tab'); shutil.copyfile(countries, out / 'receipts/iso3166.tab')
        (out / 'receipts/timezones.json').write_text(json.dumps(tz, indent=2))
        candidate = out / 'metadata/candidate'
        stage([sys.executable, str(HERE / 'metadata.py'), '--seed', str(seed_file), '--pbf', str(pbf), '--airports-csv', str(csv), '--airports-date', airports['snapshotDate'], '--zone-tab', str(zone), '--countries-tab', str(countries), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--expected-pbf-sha256', pbf_sha, '--dataset-bytes', str(source['bytes']), '--source-verified', '--geometry-source', str(geometry), '--adapter', str(EXTRACTOR), '--out', str(candidate)], out / 'logs/metadata.log')
        stage([sys.executable, str(EXTRACTOR), str(pbf), str(candidate / 'source-input.json'), '--dataset-url', source['url'], '--dataset-bytes', str(source['bytes']), '--dataset-md5', source['md5'], '--dataset-sha256', pbf_sha, '--output-root', str(out / 'extract')], out / 'logs/extraction.log')
        hashes = {label: digest(out / 'extract' / seed['id'] / (label + '.json')) for label in ('places','extras','water','landuse','roads')}
        producer = {'city': seed['id'], 'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceArtifact': 'city-bootstrap-' + seed['id'] + '-' + os.environ['GITHUB_SHA'], 'sourceSha': os.environ['GITHUB_SHA'], 'datasetSha256': pbf_sha, 'adapterSha256': digest(EXTRACTOR), 'extractSha256': hashes}
        (out / 'receipts/source-job.json').write_text(json.dumps(producer, indent=2))
        result.update(status='SOURCE_CANDIDATE', id=seed['id'], sourceJob=producer, holds=['factory semantic/source/scene checks not yet executed', 'metadata/visual/browser acceptance remains separate'])
    except Exception as error:
        result['reason'] = str(error)
    (out / 'receipts/result.json').write_text(json.dumps(result, indent=2))
    publish = out / 'publish'
    publish.mkdir()
    for name in ('metadata', 'receipts', 'logs'):
        shutil.copytree(out / name, publish / name)
    for city in (out / 'extract').iterdir():
        if city.is_dir(): shutil.copytree(city, publish / city.name)
    print(json.dumps(result))
    return 0 if result['status'] == 'SOURCE_CANDIDATE' else 1

if __name__ == '__main__': sys.exit(main())
