"""Produce source candidates with the pinned factory; no generation or acceptance."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

FACTORY_SHA = '0786c00510f2827d6495a53fc3299f3112d0d6b4'
GEOMETRY_SHA = '7a57e756a10b35a0eec9ec5928f083580fb9e7a9'
LAYERS = ('places', 'extras', 'water', 'landuse', 'roads')


def validate(table):
    if table.get('schemaVersion') != 1 or not isinstance(table.get('targets'), list) or not table['targets']:
        raise ValueError('schemaVersion 1 and nonempty targets required')
    seen, source_pins = set(), {}
    for target in table['targets']:
        seed, source, airports = target['seed'], target['countrySource'], target['airports']
        if target.get('geometrySourceSha') != GEOMETRY_SHA:
            raise ValueError('unsupported geometry baseline')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', seed.get('id', '')) or not seed.get('name', '').strip() or not re.fullmatch(r'[A-Z]{2}', seed.get('countryISO', '')):
            raise ValueError('invalid city seed')
        if seed['id'] in seen:
            raise ValueError('duplicate city id')
        seen.add(seed['id'])
        if not re.fullmatch(r'https://download\.geofabrik\.de/asia/(?:[a-z-]+/)*[a-z-]+-\d{6}\.osm\.pbf', source.get('url', '')):
            raise ValueError('dated official Asia country or regional PBF required')
        if not isinstance(source.get('bytes'), int) or isinstance(source['bytes'], bool) or source['bytes'] <= 0 or not re.fullmatch(r'[0-9a-f]{32}', source.get('md5', '')):
            raise ValueError('invalid PBF byte/MD5 pins')
        if not re.fullmatch(r'[0-9a-f]{40}', airports.get('commit', '')) or airports.get('url') != 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/' + airports['commit'] + '/airports.csv':
            raise ValueError('airport CSV needs its exact pinned commit')
        for date in (source.get('snapshotDate', ''), airports.get('snapshotDate', '')):
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
                raise ValueError('snapshot date required')
        pins = (source['bytes'], source['md5'], source['snapshotDate'])
        if source['url'] in source_pins and source_pins[source['url']] != pins:
            raise ValueError('conflicting pins for one PBF URL')
        source_pins[source['url']] = pins
    return table['targets']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('table', 'factory-source', 'geometry-source', 'outdir'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    out = Path(args.outdir).resolve()
    if out.exists():
        raise ValueError('execution output must be new')
    (out / 'publish').mkdir(parents=True)
    (out / 'downloads').mkdir()
    summary = {'status': 'HOLD', 'scope': 'source candidates only; no factory generation or browser acceptance', 'targets': []}
    try:
        targets = validate(json.loads(Path(args.table).read_text()))
        factory, geometry = Path(args.factory_source).resolve(), Path(args.geometry_source).resolve()
        for checkout, expected in ((factory, FACTORY_SHA), (geometry, GEOMETRY_SHA)):
            actual = subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip()
            if actual != expected:
                raise ValueError('pinned checkout SHA mismatch: ' + str(checkout))
        bootstrap = factory / 'scripts/geo/factory/bootstrap'
        extractor = factory / 'scripts/geo/offline-extract.py'
        spec = importlib.util.spec_from_file_location('pinned_bootstrap', bootstrap / 'run.py')
        helpers = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helpers)
        digest, download, stage = helpers.digest, helpers.download, helpers.stage
        pbf_cache, csv_cache, attempted_sources = {}, {}, set()
        zone, countries = Path('/usr/share/zoneinfo/zone.tab'), Path('/usr/share/zoneinfo/iso3166.tab')
        tz_version = Path('/usr/share/zoneinfo/tzdata.zi')
        tz = {'zoneTabSha256': digest(zone), 'countryTableSha256': digest(countries), 'tzdataVersion': tz_version.read_text().splitlines()[0] if tz_version.exists() else 'unavailable'}
        artifact = 'asia-source-' + os.environ['GITHUB_SHA']
        for target in targets:
            seed, source, airports = target['seed'], target['countrySource'], target['airports']
            city = out / 'targets' / seed['id']
            for name in ('metadata', 'extract', 'receipts', 'logs'):
                (city / name).mkdir(parents=True, exist_ok=True)
            result = {'status': 'HOLD', 'id': seed['id'], 'scope': summary['scope']}
            try:
                if source['url'] not in pbf_cache:
                    if source['url'] in attempted_sources:
                        raise ValueError('shared PBF acquisition previously failed; inspect earlier target receipt')
                    attempted_sources.add(source['url'])
                    pbf = out / 'downloads' / ('source-' + str(len(pbf_cache)) + '.osm.pbf')
                    http = download(source['url'], pbf)
                    if pbf.stat().st_size != source['bytes'] or digest(pbf, 'md5') != source['md5']:
                        raise ValueError('PBF byte count/MD5 mismatch')
                    pbf_cache[source['url']] = (pbf, digest(pbf), http)
                pbf, pbf_sha, source_http = pbf_cache[source['url']]
                if airports['url'] not in csv_cache:
                    csv = out / 'downloads' / ('airports-' + str(len(csv_cache)) + '.csv')
                    csv_http = download(airports['url'], csv)
                    csv_cache[airports['url']] = (csv, digest(csv), csv_http)
                csv, csv_sha, csv_http = csv_cache[airports['url']]
                receipts = {'pbf': {**source, 'sha256': pbf_sha, 'http': source_http}, 'airports': {**airports, 'sha256': csv_sha, 'http': csv_http}, 'geometrySourceSha': GEOMETRY_SHA, 'factorySourceSha': FACTORY_SHA, 'extractorSha256': digest(extractor)}
                (city / 'receipts/downloads.json').write_text(json.dumps(receipts, indent=2))
                stage([sys.executable, str(bootstrap / 'country-boundary.py'), '--pbf', str(pbf), '--country', seed['countryISO'], '--expected-sha256', pbf_sha, '--expected-bytes', str(source['bytes']), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--out', str(city / 'boundary')], city / 'logs/boundary.log')
                seed_file = city / 'metadata/seed.json'
                seed_file.write_text(json.dumps(seed))
                shutil.copyfile(zone, city / 'receipts/zone.tab')
                shutil.copyfile(countries, city / 'receipts/iso3166.tab')
                (city / 'receipts/timezones.json').write_text(json.dumps(tz, indent=2))
                candidate = city / 'metadata/candidate'
                stage([sys.executable, str(bootstrap / 'metadata.py'), '--seed', str(seed_file), '--pbf', str(pbf), '--airports-csv', str(csv), '--airports-date', airports['snapshotDate'], '--zone-tab', str(zone), '--countries-tab', str(countries), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--expected-pbf-sha256', pbf_sha, '--dataset-bytes', str(source['bytes']), '--source-verified', '--geometry-source', str(geometry), '--adapter', str(extractor), '--out', str(candidate)], city / 'logs/metadata.log')
                stage([sys.executable, str(extractor), str(pbf), str(candidate / 'source-input.json'), '--dataset-url', source['url'], '--dataset-bytes', str(source['bytes']), '--dataset-md5', source['md5'], '--dataset-sha256', pbf_sha, '--output-root', str(city / 'extract')], city / 'logs/extraction.log')
                hashes = {layer: digest(city / 'extract' / seed['id'] / (layer + '.json')) for layer in LAYERS}
                producer = {'city': seed['id'], 'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceArtifact': artifact, 'sourceSha': os.environ['GITHUB_SHA'], 'datasetSha256': pbf_sha, 'adapterSha256': digest(extractor), 'extractSha256': hashes}
                (city / 'receipts/source-job.json').write_text(json.dumps(producer, indent=2))
                result.update(status='SOURCE_CANDIDATE', sourceJob=producer, holds=['country boundary has no pinned fixture membership acceptance', 'factory semantic/source/scene checks not yet executed', 'metadata/visual/browser acceptance remains separate'])
            except Exception as error:
                result['reason'] = str(error)
            (city / 'receipts/result.json').write_text(json.dumps(result, indent=2))
            publish = out / 'publish' / seed['id']
            publish.mkdir()
            for name in ('metadata', 'receipts', 'logs', 'boundary'):
                if (city / name).exists():
                    shutil.copytree(city / name, publish / name)
            for extracted in (city / 'extract').iterdir():
                if extracted.is_dir():
                    shutil.copytree(extracted, publish / extracted.name)
            summary['targets'].append(result)
        if all(result['status'] == 'SOURCE_CANDIDATE' for result in summary['targets']):
            summary['status'] = 'SOURCE_CANDIDATE'
    except Exception as error:
        summary['reason'] = str(error)
    (out / 'publish/result.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary))
    return 0 if summary['status'] == 'SOURCE_CANDIDATE' else 1


if __name__ == '__main__':
    sys.exit(main())
