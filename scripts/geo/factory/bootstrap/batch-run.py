"""Pinned same-country source bootstrap, with candidate receipts and explicit holds."""
import argparse
from contextlib import redirect_stderr, redirect_stdout
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from datetime import date

HERE = Path(__file__).resolve().parent
_shared_spec = importlib.util.spec_from_file_location('shared_source_bootstrap', HERE / 'run.py')
_shared = importlib.util.module_from_spec(_shared_spec)
_shared_spec.loader.exec_module(_shared)
BASELINE, EXTRACTOR = _shared.BASELINE, _shared.EXTRACTOR
digest, download, stage = _shared.digest, _shared.download, _shared.stage
_merge_spec = importlib.util.spec_from_file_location('source_merge', HERE / 'source-merge.py')
_merge = importlib.util.module_from_spec(_merge_spec)
_merge_spec.loader.exec_module(_merge)

SEED_KEYS = {'id', 'name', 'countryISO', 'cityOsmRef', 'airport', 'timezone', 'sceneWaterExtent', 'namesUnit', 'selectionExclusions'}

def digest_many(path, *algorithms):
    if not algorithms or len(set(algorithms)) != len(algorithms):
        raise ValueError('one or more unique digest algorithms are required')
    hashers = {name: hashlib.new(name) for name in algorithms}
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            for hasher in hashers.values():
                hasher.update(block)
    return {name: hasher.hexdigest() for name, hasher in hashers.items()}

def verify_country_checksums(path, expected_bytes, expected_md5):
    source = Path(path)
    if not source.is_file() or source.stat().st_size != expected_bytes:
        raise ValueError('PBF byte count mismatch')
    checksums = digest_many(source, 'md5', 'sha256')
    if checksums['md5'] != expected_md5:
        raise ValueError('PBF MD5 mismatch')
    return checksums

def timezone_source_files():
    """Pinned IANA zone1970/iso3166 tables; the runner's /usr/share/zoneinfo is never trusted."""
    manifest = json.loads((HERE / 'timezone-source.json').read_text())
    if manifest.get('schemaVersion') != 1 or manifest.get('release') != '2026e':
        raise ValueError('unsupported pinned timezone source manifest')
    files = {}
    for key, expected_name in (('zone1970', 'zone1970.tab'), ('iso3166', 'iso3166.tab')):
        record = manifest.get('files', {}).get(key, {})
        path = (HERE / record.get('path', '')).resolve()
        if path.parent != (HERE / 'timezone-data').resolve() or path.name != expected_name:
            raise ValueError(f'invalid pinned timezone path for {key}')
        if not path.is_file() or path.stat().st_size != record.get('bytes') or digest(path) != record.get('sha256'):
            raise ValueError(f'pinned timezone file verification failed: {expected_name}')
        files[key] = (path, record)
    return manifest, files

def validate(table):
    if type(table.get('schemaVersion')) is not int or table['schemaVersion'] != 2:
        raise ValueError('country batches require schemaVersion 2')
    seeds = table.get('seeds')
    if not isinstance(seeds, list) or not 1 <= len(seeds) <= 6:
        raise ValueError('one to six same-country seeds required')
    source, airports = table['countrySource'], table['airports']
    airport_commit = airports.get('commit')
    if (not isinstance(airport_commit, str)
            or not re.fullmatch(r'[0-9a-f]{40}', airport_commit)
            or airports.get('url') != 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/' + airport_commit + '/airports.csv'):
        raise ValueError('airport CSV must use its exact pinned source commit')
    unknown_keys = [f"{seed.get('id', 'seed')}: {sorted(set(seed) - SEED_KEYS)}" for seed in seeds if not isinstance(seed, dict) or set(seed) - SEED_KEYS]
    if unknown_keys:
        raise ValueError('unsupported seed fields (see seed-contract.schema.json): ' + '; '.join(unknown_keys))
    for seed in seeds:
        if seed.get('sceneWaterExtent') not in (None, 'play', 'reach'):
            raise ValueError(f"{seed.get('id', 'seed')}: sceneWaterExtent must be 'play' or 'reach'")
        if seed.get('namesUnit') is not None and (not isinstance(seed['namesUnit'], str) or not seed['namesUnit'].strip()):
            raise ValueError(f"{seed.get('id', 'seed')}: namesUnit must be a non-empty string")
        selection_exclusions(seed)
        shared_seed = {key: seed[key] for key in ('id', 'name', 'countryISO', 'cityOsmRef', 'airport', 'timezone')
                       if key in seed}
        _shared.validate({'schemaVersion': 1, 'geometrySourceSha': table.get('geometrySourceSha'),
                          'seed': shared_seed, 'countrySource': source, 'airports': airports})
    if len({seed['id'] for seed in seeds}) != len(seeds) or len({seed['countryISO'] for seed in seeds}) != 1:
        raise ValueError('unique city ids and one country required')
    for snapshot in (source['snapshotDate'], airports['snapshotDate']):
        date.fromisoformat(snapshot)
    if source['url'].rsplit('/', 1)[1][-14:-8] != source['snapshotDate'][2:].replace('-', ''):
        raise ValueError('dated PBF URL and snapshot date disagree')
    unknown_source = set(source) - {'url', 'bytes', 'md5', 'snapshotDate', 'neighbours'}
    if unknown_source:
        raise ValueError(f'unsupported countrySource fields: {sorted(unknown_source)}')
    _merge.validate_neighbours(source)
    return seeds, source, airports

def scene_water_policy(seed):
    return {} if seed.get('sceneWaterExtent') is None else {'sceneWaterExtent': seed['sceneWaterExtent']}

def names_unit_policy(seed):
    return {} if seed.get('namesUnit') is None else {'namesUnit': seed['namesUnit']}

def selection_exclusions(seed):
    exclusions = seed.get('selectionExclusions', [])
    if not isinstance(exclusions, list):
        raise ValueError(f"{seed.get('id', 'seed')}: selectionExclusions must be an array")
    seen = set()
    for exclusion in exclusions:
        if not isinstance(exclusion, dict) or set(exclusion) != {'ref', 'reason'}:
            raise ValueError(f"{seed.get('id', 'seed')}: each selection exclusion must contain only ref and reason")
        ref, reason = exclusion['ref'], exclusion['reason']
        if not isinstance(ref, str) or not re.fullmatch(r'(?:node|way|relation)/[1-9][0-9]*', ref):
            raise ValueError(f"{seed.get('id', 'seed')}: selection exclusion ref must be a canonical OSM element ref")
        if ref in seen:
            raise ValueError(f"{seed.get('id', 'seed')}: duplicate selection exclusion ref {ref}")
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError(f"{seed.get('id', 'seed')}: selection exclusion {ref} requires a non-empty reason")
        seen.add(ref)
    return exclusions

def selection_exclusions_policy(seed):
    return {'selectionExclusions': selection_exclusions(seed)}

def check_seeds_offline(seeds, zone, countries):
    """Network-free seed checks: selectors are well formed and the pinned tz/country tables resolve every seed."""
    zone_lines, country_lines = Path(zone).read_text().splitlines(), Path(countries).read_text().splitlines()
    report = []
    for seed in seeds:
        row = {'id': seed['id']}
        try:
            zone_id, _ = _shared._metadata.choose_timezone(zone_lines, seed['countryISO'], seed.get('timezone'))
            row.update(status='OK', timezone=zone_id, country=_shared._metadata.country_name(country_lines, seed['countryISO']),
                       airportSelector='ident ' + seed['airport']['ident'] if 'airport' in seed else 'municipality match (HOLDs when ambiguous)',
                       cityNode=seed.get('cityOsmRef', 'name match among place=city|town (HOLDs when ambiguous)'))
        except Exception as error:
            row.update(status='HOLD', reason=str(error))
        report.append(row)
    return report

def extract_batch(pbf, candidates, source, pbf_sha, verified_md5, output_root, logs):
    """Reuse the pinned adapter's handlers and writers over one country scan.

    source is the dataset actually scanned: the primary URL, with the merged file's bytes/MD5 when neighbours are merged.
    """
    spec = importlib.util.spec_from_file_location('batch_offline_extract', EXTRACTOR)
    adapter = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(adapter)
    except SystemExit as error:
        raise ValueError(str(error)) from error
    args = argparse.Namespace(dataset_url=source['url'], dataset_bytes=source['bytes'],
                              dataset_md5=source['md5'], dataset_sha256=pbf_sha)
    errors, contexts = {}, {}
    shared_log = logs / 'batch-extraction.log'
    with shared_log.open('w') as stream, redirect_stdout(stream), redirect_stderr(stream):
        if not adapter.re.fullmatch(r'https://download\.geofabrik\.de/[A-Za-z0-9._/-]+\.osm\.pbf', args.dataset_url):
            raise adapter.ExtractionError('dataset URL must be a comment-safe official Geofabrik .osm.pbf URL')
        if not pbf.is_file() or pbf.stat().st_size != args.dataset_bytes:
            raise adapter.ExtractionError('PBF byte count mismatch')
        if not adapter.re.fullmatch(r'[0-9a-f]{32}', args.dataset_md5):
            raise adapter.ExtractionError('dataset MD5 must be 32 lowercase hexadecimal characters')
        if verified_md5 != args.dataset_md5:
            raise adapter.ExtractionError('verified PBF MD5 does not match the batch source')
        if not adapter.re.fullmatch(r'[0-9a-f]{64}', args.dataset_sha256):
            raise adapter.ExtractionError('dataset SHA-256 must be 64 lowercase hexadecimal characters')
        timestamp = adapter.pbf_header_timestamp(pbf)
        adapter_sha = adapter.sha256_file(EXTRACTOR)
        adapter.progress('source-ready', timestamp=timestamp, adapterSha256=adapter_sha)
        for city_id, metadata_path in candidates.items():
            try:
                metadata, boxes, recipe = adapter.load_city(metadata_path)
                if metadata['city']['id'] != city_id:
                    raise adapter.ExtractionError('candidate city id does not match seed')
                contexts[city_id] = (metadata_path, boxes, recipe)
            except Exception as error:
                errors[city_id] = str(error)
        if contexts:
            # Relation predicates do not depend on coast. Only way predicates do.
            relations = adapter.RelationPass(False)
            adapter.progress('relation-scan')
            relations.apply_file(str(pbf))
            relations.collect_center_dependencies(pbf)
            adapter.progress('relation-candidates', relations=len(relations.candidates),
                             memberWays=len(relations.needed_ways), memberNodes=len(relations.needed_nodes))
            geometries = {city_id: adapter.GeometryPass(relations, boxes, recipe['kind'] == 'coast')
                          for city_id, (_, boxes, recipe) in contexts.items()}

            needed_ways, needed_nodes = relations.needed_ways, relations.needed_nodes
            member_ways, member_nodes = {}, {}
            for geometry in geometries.values():
                geometry.member_ways, geometry.member_nodes = member_ways, member_nodes
            # The batch handler collects members once; city handlers select direct features.
            relations.needed_ways, relations.needed_nodes = set(), set()

            class BatchGeometryPass(adapter.osmium.SimpleHandler):
                def fail_members(self, error):
                    for city_id in geometries:
                        errors.setdefault(city_id, str(error))

                def dispatch(self, method, element):
                    for city_id, geometry in geometries.items():
                        if city_id in errors:
                            continue
                        try:
                            getattr(geometry, method)(element)
                        except Exception as error:
                            errors[city_id] = str(error)

                def node(self, node):
                    if node.id in needed_nodes:
                        try:
                            member_nodes[node.id] = {'lat': node.location.lat, 'lon': node.location.lon}
                        except Exception as error:
                            self.fail_members(error)
                            return
                    self.dispatch('node', node)

                def way(self, way):
                    if way.id in needed_ways:
                        try:
                            points = []
                            for node in way.nodes:
                                if not node.location.valid():
                                    raise adapter.ExtractionError(f'way/{way.id} has a node without a PBF location; refusing truncated geometry')
                                points.append({'lat': node.location.lat, 'lon': node.location.lon})
                            member_ways[way.id] = points
                        except Exception as error:
                            self.fail_members(error)
                            return
                    self.dispatch('way', way)

            adapter.progress('geometry-scan', cities=len(geometries))
            try:
                BatchGeometryPass().apply_file(str(pbf), locations=True, idx='flex_mem')
            finally:
                relations.needed_ways, relations.needed_nodes = needed_ways, needed_nodes
            for city_id, geometry in geometries.items():
                if city_id in errors:
                    continue
                metadata_path, boxes, recipe = contexts[city_id]
                try:
                    adapter.add_relations(relations, geometry, boxes)
                    destination = output_root / city_id
                    for label, elements in geometry.output.items():
                        elements.sort(key=lambda element: ({'node': 0, 'way': 1, 'relation': 2}[element['type']], element['id']))
                        adapter.atomic_json(destination / (label + '.json'), {
                            'version': 1,
                            'generator': 'Allworld offline PBF adapter prototype',
                            'source': adapter.source_record(args, metadata_path, city_id, label, boxes,
                                                            timestamp, adapter_sha, recipe, relations, elements, geometry.skipped_relations),
                            'elements': elements,
                        })
                    counts = {label: len(elements) for label, elements in geometry.output.items()}
                    (logs / (city_id + '-extraction.log')).write_text(json.dumps({
                        'status': 'complete', 'cityId': city_id, 'output': str(destination.resolve()),
                        'counts': counts, 'sharedLog': shared_log.name}) + '\n')
                    adapter.progress('write-complete', city=city_id, elements=sum(counts.values()))
                except Exception as error:
                    errors[city_id] = str(error)
    for city_id, reason in errors.items():
        (logs / (city_id + '-extraction.log')).write_text('pbf-extract: ' + reason + '\nshared log: ' + shared_log.name + '\n')
    return errors

def validate_only(table_path):
    report = {'table': str(table_path), 'status': 'HOLD'}
    try:
        table = json.loads(table_path.read_text())
        seeds, source, airports = validate(table)
        manifest, files = timezone_source_files()
        seed_report = check_seeds_offline(seeds, files['zone1970'][0], files['iso3166'][0])
        neighbours = _merge.validate_neighbours(source)
        report.update(ids=[seed['id'] for seed in seeds], countryISO=seeds[0]['countryISO'],
                      source={'url': source['url'], 'bytes': source['bytes'], 'md5': source['md5'], 'snapshotDate': source['snapshotDate'],
                              **({'neighbours': [{key: item[key] for key in ('url', 'bytes', 'md5', 'snapshotDate')} for item in neighbours],
                                  'downloadBytesTotal': source['bytes'] + sum(item['bytes'] for item in neighbours)} if neighbours else {})},
                      timezoneRelease=manifest['release'], seeds=seed_report)
        held = [row for row in seed_report if row['status'] != 'OK']
        report['status'] = 'HOLD' if held else 'VALID'
        if held:
            report['reason'] = 'seed checks failed: ' + ', '.join(row['id'] + ' (' + row['reason'] + ')' for row in held)
    except Exception as error:
        report['reason'] = str(error)
    print(json.dumps(report, indent=2))
    return 0 if report['status'] == 'VALID' else 1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--table', required=True)
    parser.add_argument('--geometry-source')
    parser.add_argument('--outdir')
    parser.add_argument('--validate-only', action='store_true', help='schema, pin and timezone checks only; no network, no download, no output directory')
    args = parser.parse_args()
    if args.validate_only:
        return validate_only(Path(args.table))
    if not args.geometry_source or not args.outdir:
        parser.error('--geometry-source and --outdir are required unless --validate-only')
    out = Path(args.outdir)
    if out.exists(): raise ValueError('execution output must be new')
    for name in ('downloads', 'metadata', 'extract', 'receipts', 'logs'): (out / name).mkdir(parents=True, exist_ok=True)
    events = out / 'receipts/stages.jsonl'
    def observed(label, action, *arguments):
        started = time.monotonic()
        def emit(status):
            record = {'stage': label, 'status': status, 'elapsedSeconds': round(time.monotonic() - started, 3)}
            with events.open('a') as stream:
                stream.write(json.dumps(record) + '\n')
            print(json.dumps(record), flush=True)
        emit('started')
        try:
            value = action(*arguments)
        except Exception:
            emit('failed')
            raise
        emit('completed')
        return value
    def stage(arguments, logfile):
        return observed(logfile.stem, _shared.stage, arguments, logfile)
    result = {'status': 'HOLD', 'scope': 'source candidate only; no factory generation or browser acceptance'}
    try:
        table = json.loads(Path(args.table).read_text())
        seeds, source, airports = validate(table)
        geometry = Path(args.geometry_source).resolve()
        sha = subprocess.check_output(['git', '-C', str(geometry), 'rev-parse', 'HEAD'], text=True).strip()
        if sha != BASELINE: raise ValueError('geometry checkout SHA mismatch')
        pbf, csv = out / 'downloads/country.osm.pbf', out / 'downloads/airports.csv'
        source_http = observed('country-download', download, source['url'], pbf)
        csv_http = observed('airport-download', download, airports['url'], csv)
        pbf_hashes = observed('country-checksums', verify_country_checksums, pbf, source['bytes'], source['md5'])
        pbf_sha = pbf_hashes['sha256']
        csv_sha = observed('airport-sha256', digest, csv)
        neighbours = _merge.validate_neighbours(source)
        # dataset: the one PBF every later stage reads. Without neighbours it is the primary file, unchanged.
        dataset = {'url': source['url'], 'bytes': source['bytes'], 'md5': source['md5'], 'snapshotDate': source['snapshotDate']}
        source_inputs, primary_box = None, None
        if neighbours:
            # Same-snapshot neighbour extracts complete what the primary clip omits (README-batch.md, Neighbour extracts).
            source_inputs = [{'role': 'primary', 'url': source['url'], 'snapshotDate': source['snapshotDate'], 'bytes': source['bytes'], 'md5': source['md5'], 'sha256': pbf_sha}]
            input_http, input_paths = [source_http], [pbf]
            for index, neighbour in enumerate(neighbours, 1):
                path = out / 'downloads' / f'neighbour-{index}.osm.pbf'
                input_http.append(observed(f'neighbour-{index}-download', download, neighbour['url'], path))
                hashes = observed(f'neighbour-{index}-checksums', verify_country_checksums, path, neighbour['bytes'], neighbour['md5'])
                source_inputs.append({'role': 'neighbour', 'url': neighbour['url'], 'snapshotDate': neighbour['snapshotDate'], 'bytes': neighbour['bytes'], 'md5': neighbour['md5'], 'sha256': hashes['sha256'], 'reason': neighbour['reason']})
                input_paths.append(path)
            merged = out / 'downloads/merged.osm.pbf'
            merge_record = observed('source-merge', _merge.merge_sources, input_paths, merged, source['snapshotDate'])
            primary_box = merge_record['primaryBox']
            merged_hashes = observed('merged-checksums', digest_many, merged, 'md5', 'sha256')
            dataset.update(bytes=merged.stat().st_size, md5=merged_hashes['md5'])
            pbf, pbf_sha, pbf_hashes = merged, merged_hashes['sha256'], merged_hashes
            for path in input_paths:
                path.unlink()
            (out / 'receipts/source-inputs.json').write_text(json.dumps(source_inputs, indent=2))
            pbf_receipt = {**dataset, 'sha256': pbf_sha, 'http': source_http, 'sourceInputs': source_inputs,
                           'inputHttp': input_http, 'merge': {**merge_record, 'scriptSha256': digest(HERE / 'source-merge.py')}}
        else:
            pbf_receipt = {**source, 'sha256': pbf_sha, 'http': source_http}
        receipts = {'pbf': pbf_receipt, 'airports': {**airports, 'sha256': csv_sha, 'http': csv_http}, 'geometrySourceSha': sha, 'extractorSha256': digest(EXTRACTOR)}
        (out / 'receipts/downloads.json').write_text(json.dumps(receipts, indent=2))
        timezone_manifest, timezone_files = timezone_source_files()
        zone, zone_record = timezone_files['zone1970']
        countries, countries_record = timezone_files['iso3166']
        tz = {'release': timezone_manifest['release'],
              'zoneTabPath': 'zone1970.tab', 'zoneTabUrl': zone_record['url'],
              'zoneTabBytes': zone_record['bytes'], 'zoneTabSha256': zone_record['sha256'],
              'countryTablePath': 'iso3166.tab', 'countryTableUrl': countries_record['url'],
              'countryTableBytes': countries_record['bytes'], 'countryTableSha256': countries_record['sha256']}
        shutil.copyfile(zone, out / 'receipts/zone1970.tab'); shutil.copyfile(countries, out / 'receipts/iso3166.tab')
        (out / 'receipts/timezones.json').write_text(json.dumps(tz, indent=2))
        boundary = out / 'country-boundary'
        boundary_error = None
        evidence = HERE / 'boundary-evidence' / (seeds[0]['countryISO'].lower() + '.json')
        try:
            stage([sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', seeds[0]['countryISO'], '--expected-sha256', pbf_sha, '--expected-bytes', str(dataset['bytes']), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--out', str(boundary), *(['--absent-evidence', str(evidence)] if evidence.is_file() else []), *(['--source-inputs', str(out / 'receipts/source-inputs.json')] if source_inputs else [])], out / 'logs/country-boundary.log')
            boundary_receipt = {'countryISO': seeds[0]['countryISO'], 'path': 'country-boundary/boundary.geojson', 'sha256': digest(boundary / 'boundary.geojson'), 'receiptPath': 'country-boundary/receipt.json', 'receiptSha256': digest(boundary / 'receipt.json')}
            result['countryBoundary'] = boundary_receipt
        except Exception as error:
            boundary_error = str(error)
            result['countryBoundary'] = {'status': 'HOLD', 'diagnosticPath': 'country-boundary/result.json', 'reason': boundary_error}
        producers, city_results, candidates = [], [], {}
        if boundary_error:
            for seed in seeds:
                reason = 'city metadata and extraction skipped because the exact same-source country boundary is HOLD: ' + boundary_error
                city_result = {'id': seed['id'], 'status': 'HOLD', **scene_water_policy(seed), **names_unit_policy(seed), **selection_exclusions_policy(seed), 'reason': reason}
                city_results.append(city_result)
                (out / 'receipts' / (seed['id'] + '-result.json')).write_text(json.dumps(city_result, indent=2))
                (out / 'logs' / (seed['id'] + '-metadata.log')).write_text('SKIPPED: ' + reason + '\n')
        else:
            seed_files = []
            for seed in seeds:
                city_metadata = out / 'metadata' / seed['id']
                city_metadata.mkdir(parents=True, exist_ok=True)
                seed_file = city_metadata / 'seed.json'
                # Only the shared source-selection keys reach metadata; map/selection policy stays in batch results.
                seed_file.write_text(json.dumps({key: seed[key] for key in ('id', 'name', 'countryISO', 'cityOsmRef', 'airport', 'timezone') if key in seed}))
                seed_files.append(str(seed_file))
            seed_manifest = out / 'inputs' / 'metadata-seeds.json'
            seed_manifest.parent.mkdir(parents=True, exist_ok=True)
            seed_manifest.write_text(json.dumps(seed_files))
            metadata_arguments = [sys.executable, str(HERE / 'metadata-batch.py'), '--seed-files', str(seed_manifest), '--out-root', str(out / 'metadata'),
                                  '--pbf', str(pbf), '--airports-csv', str(csv), '--airports-date', airports['snapshotDate'], '--zone-tab', str(zone), '--countries-tab', str(countries), '--dataset-url', source['url'], '--dataset-date', source['snapshotDate'], '--expected-pbf-sha256', pbf_sha, '--dataset-bytes', str(dataset['bytes']), '--source-verified', '--geometry-source', str(geometry), '--adapter', str(EXTRACTOR)]
            metadata_batch_error = None
            try:
                stage(metadata_arguments, out / 'logs/batch-metadata.log')
            except Exception as error:
                metadata_batch_error = str(error)
            for seed in seeds:
                candidate = out / 'metadata' / seed['id'] / 'candidate'
                metadata_file = candidate / 'metadata.json'
                if metadata_file.exists():
                    try:
                        metadata_result = json.loads(metadata_file.read_text())
                    except Exception as error:
                        metadata_result = {'status': 'HOLD', 'reason': str(error)}
                else:
                    reason = metadata_batch_error or 'batch metadata stage did not write a city result'
                    metadata_result = {'status': 'HOLD', 'reason': reason}
                    candidate.mkdir(parents=True, exist_ok=True)
                    metadata_file.write_text(json.dumps(metadata_result, indent=2))
                if metadata_batch_error and metadata_result.get('status') == 'METADATA_CANDIDATE':
                    metadata_result = {'status': 'HOLD', 'reason': metadata_batch_error}
                if metadata_result.get('status') == 'METADATA_CANDIDATE' and source_inputs:
                    # The merged file reaches into the neighbour: the city itself must stay in the primary country.
                    try:
                        scope = _merge.primary_scope(seed['id'], metadata_result['facts']['centre'],
                                                     json.loads((candidate / 'source-input.json').read_text())['boxes'],
                                                     boundary / 'boundary.geojson', primary_box)
                        (out / 'receipts' / (seed['id'] + '-primary-scope.json')).write_text(json.dumps(scope, indent=2))
                    except Exception as error:
                        metadata_result = {'status': 'HOLD', 'reason': str(error)}
                if metadata_result.get('status') == 'METADATA_CANDIDATE':
                    candidates[seed['id']] = candidate / 'source-input.json'
                else:
                    metadata_file.write_text(json.dumps(metadata_result, indent=2))
                    reason = metadata_result.get('reason') or metadata_batch_error or 'batch metadata stage did not write a city result'
                    metadata_log = out / 'logs' / (seed['id'] + '-metadata.log')
                    if not metadata_log.exists():
                        metadata_log.write_text(json.dumps({'status': 'HOLD', 'reason': reason}) + '\nshared log: batch-metadata.log\n')
                    city_result = {'id': seed['id'], 'status': 'HOLD', **scene_water_policy(seed), **names_unit_policy(seed), **selection_exclusions_policy(seed), 'reason': reason}
                    city_results.append(city_result)
                    (out / 'receipts' / (seed['id'] + '-result.json')).write_text(json.dumps(city_result, indent=2))
        extraction_errors = {}
        if candidates:
            try:
                extraction_errors = observed('batch-extraction', extract_batch, pbf, candidates, dataset, pbf_sha, pbf_hashes['md5'], out / 'extract', out / 'logs')
            except Exception as error:
                extraction_errors = {city_id: str(error) for city_id in candidates}
                for city_id in candidates:
                    (out / 'logs' / (city_id + '-extraction.log')).write_text('pbf-extract: ' + str(error) + '\nshared log: batch-extraction.log\n')
        for seed in seeds:
            if seed['id'] not in candidates:
                continue
            try:
                if seed['id'] in extraction_errors:
                    raise ValueError('stage failed: ' + seed['id'] + '-extraction.log')
                hashes = {label: digest(out / 'extract' / seed['id'] / (label + '.json')) for label in ('places','extras','water','landuse','roads')}
                producer = {'city': seed['id'], 'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceArtifact': 'city-bootstrap-' + seeds[0]['countryISO'].lower() + '-' + os.environ['GITHUB_SHA'], 'sourceSha': os.environ['GITHUB_SHA'], 'datasetSha256': pbf_sha, 'adapterSha256': digest(EXTRACTOR), 'extractSha256': hashes, **({'sourceInputs': source_inputs} if source_inputs else {})}
                job_file = out / 'receipts' / (seed['id'] + '-source-job.json')
                job_file.write_text(json.dumps(producer, indent=2))
                producers.append(producer)
                city_results.append({'id': seed['id'], 'status': 'SOURCE_CANDIDATE', **scene_water_policy(seed), **names_unit_policy(seed), **selection_exclusions_policy(seed), 'sourceJob': producer})
            except Exception as error:
                city_result = {'id': seed['id'], 'status': 'HOLD', **scene_water_policy(seed), **names_unit_policy(seed), **selection_exclusions_policy(seed), 'reason': str(error)}
                city_results.append(city_result)
                (out / 'receipts' / (seed['id'] + '-result.json')).write_text(json.dumps(city_result, indent=2))
        city_results.sort(key=lambda city: [seed['id'] for seed in seeds].index(city['id']))
        result.update(status='SOURCE_CANDIDATE', ids=[seed['id'] for seed in seeds], sourceJobs=producers, cityResults=city_results, holds=['factory semantic/source/scene checks not yet executed', 'metadata/visual/browser acceptance remains separate'])
        if boundary_error:
            result.update(status='HOLD', reason=boundary_error)
            result['holds'].append('exact same-source country boundary remains HOLD')
        failed_cities = [city for city in city_results if city['status'] == 'HOLD']
        if failed_cities and not boundary_error:
            result.update(status='HOLD', reason='city source candidates remain HOLD: ' + ', '.join(city['id'] for city in failed_cities))
            result['holds'].append('one or more city source candidates failed; inspect per-city receipts')
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
