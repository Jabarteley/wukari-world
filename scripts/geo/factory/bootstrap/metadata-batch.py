"""Batch metadata candidates from one verified country source."""
from __future__ import annotations
import argparse
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import quote

from metadata import (Hold, choose_airport, choose_city, choose_seed_timezone, city_natural_tags, city_place_tags, coordinate,
                      city_node_tag_ok, digest, gateway_facts, gateway_record, normalized, profile_rules, seed_country_name,
                      validate_dataset_url, validate_seed)

_SCAN_PROGRESS_INTERVAL = 5_000_000

def _phase_record(phase, event, **fields):
    record = {'phase': phase, 'event': event, **fields}
    print('[metadata-phase] ' + json.dumps(record, separators=(',', ':')), flush=True)

def _phase_started(phase, **fields):
    started = time.monotonic()
    _phase_record(phase, 'start', **fields)
    return started

def _phase_complete(phase, started, **fields):
    _phase_record(phase, 'complete', elapsedSeconds=round(time.monotonic() - started, 3), **fields)

def _city_node_record(node, expected_name, seed=None):
    if not city_node_tag_ok(node.tags, seed or {}):
        return None
    if not any(normalized(node.tags.get(key, '')) == expected_name for key in ('name', 'name:en')):
        return None
    if not node.location.valid():
        raise Hold('matching city node has no valid location')
    tags = {tag.k: tag.v for tag in node.tags}
    return {'ref': f'node/{node.id}', 'tags': tags, **coordinate(node.location.lon, node.location.lat)}

def write_hold(out, error):
    out.mkdir(parents=True, exist_ok=True)
    payload = {'status': 'HOLD', 'reason': str(error)}
    (out / 'metadata.json').write_text(json.dumps(payload, indent=2))
    return payload

def scan_city_nodes(pbf, seeds, gateways=None):
    """City-node candidates per seed. `gateways` (outposts): {node id: [seed ids]} whose gateway nodes are recorded too, in the same pass."""
    by_name = {}
    candidates = {seed['id']: [] for seed in seeds}
    errors = {}
    gateways = gateways if gateways is not None else {}
    for seed in seeds:
        by_name.setdefault(normalized(seed['name']), []).append(seed)
    scan_tags = set().union(*(city_place_tags(seed) for seed in seeds))
    # Wilderness seeds may name a natural node (glacier, peak, saddle, reef, mountain pass); every other scan is exactly the place-tag scan.
    natural_tags = set().union(*(city_natural_tags(seed) for seed in seeds))
    phase = 'city-node-scan'
    started = _phase_started(phase, progressEvery=_SCAN_PROGRESS_INTERVAL, seedCount=len(seeds))
    import osmium
    class CityNodes(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.nodes_seen = 0
            self.next_progress = _SCAN_PROGRESS_INTERVAL
            self.gateway_nodes = {}
        def node(self, node):
            self.nodes_seen += 1
            if self.nodes_seen >= self.next_progress:
                _phase_record(phase, 'progress', nodes=self.nodes_seen,
                             candidates=sum(map(len, candidates.values())))
                self.next_progress += _SCAN_PROGRESS_INTERVAL
            if gateways and node.id in gateways:
                if not node.location.valid():
                    raise Hold('gateway node has no valid location')
                tags = {tag.k: tag.v for tag in node.tags}
                for seed_id in gateways[node.id]:
                    self.gateway_nodes[seed_id] = {'ref': f'node/{node.id}', 'tags': tags, **coordinate(node.location.lon, node.location.lat)}
            if node.tags.get('place') not in scan_tags and not (natural_tags and (node.tags.get('natural') in natural_tags
                                                                             or ('mountain_pass' in natural_tags and node.tags.get('mountain_pass') == 'yes'))):
                return
            matching_names = {normalized(node.tags.get(key, '')) for key in ('name', 'name:en')}
            for name in matching_names.intersection(by_name):
                for seed in by_name[name]:
                    if seed['id'] in errors:
                        continue
                    try:
                        record = _city_node_record(node, name, seed)
                    except Hold as error:
                        errors[seed['id']] = str(error)
                    else:
                        if record is not None:
                            candidates[seed['id']].append(record)
    handler = CityNodes()
    handler.apply_file(str(pbf))
    _phase_complete(phase, started, nodes=handler.nodes_seen,
                   candidates=sum(map(len, candidates.values())))
    if gateways:
        return candidates, errors, handler.gateway_nodes
    return candidates, errors

def prepare_city(seed, out, candidates, args, airport_rows, zone_lines, country_lines,
                 timestamp, dataset_bytes, gateway_node=None):
    city = choose_city(candidates, seed)
    if 'gateway' in seed:
        # Outpost gateway (a mapped landing, heliport or track end): the facts' airport record is that node; no OurAirports row is read.
        if gateway_node is None:
            raise Hold('gateway node ' + seed['gateway']['osmRef'] + ' is absent from the PBF')
        gateway = gateway_record(gateway_node, seed)
        row_number, airport = None, None
    else:
        gateway = None
        row_number, airport = choose_airport(airport_rows, seed)
    timezone, zone_rows = choose_seed_timezone(zone_lines, seed)
    country = seed_country_name(country_lines, seed)
    if not timestamp.startswith(args.dataset_date + 'T'):
        raise Hold('PBF header timestamp does not match its stated snapshot date')
    display_name = city['tags'].get('name:en') or city['tags']['name']
    if gateway is None:
        airport_point = coordinate(float(airport['longitude_deg']), float(airport['latitude_deg']))
        airport_facts = {'id': seed['id'] + '-airport', 'name': airport['name'], **airport_point,
                         'sourceUrl': 'https://ourairports.com/airports/' + quote(airport['ident'], safe='') + '/'}
    else:
        airport_facts = gateway_facts(seed, gateway, city)
    facts = {'id': seed['id'], 'name': display_name,
             'country': {'idISOlower': seed['countryISO'].lower(), 'name': country},
             'state': {'idunique': seed['countryISO'].lower() + '-' + seed['id'], 'name': display_name},
             'timezone': timezone, 'centre': coordinate(city['lon'], city['lat']),
             'airport': airport_facts,
             'sourceLabel': 'OpenStreetMap country PBF and OurAirports dated CSV' if gateway is None else 'OpenStreetMap country PBF',
             'sourceUrl': 'https://www.openstreetmap.org/' + city['ref'],
             'licence': 'OpenStreetMap ODbL-1.0; OurAirports public-domain dataset' if gateway is None else 'OpenStreetMap ODbL-1.0',
             'coverageNote': 'Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.'
             if gateway is None else 'Source-sampling bounds from a mapped place node and its mapped gateway node; the grouping is not an administrative-boundary claim. A mapped landing, heliport or track does not establish current operations or access.'}
    if gateway is not None:
        facts['gateway'] = {'mode': seed['gateway']['mode'], 'osmRef': seed['gateway']['osmRef']}
    (out / 'facts-input.json').write_text(json.dumps(facts, indent=2))
    phase = 'bounds-derivation'
    started = time.monotonic()
    _phase_record(phase, 'start', city=seed['id'])
    subprocess.run(['node', '--experimental-strip-types', str(Path(__file__).with_name('bounds.mjs')),
                    '--facts', str(out / 'facts-input.json'), '--geometry-source', args.geometry_source,
                    '--out', str(out / 'bounds.json'),
                    *[arg for key, flag in (('playKm', '--play-km'), ('coreKm', '--core-km')) if key in (seed.get('playBox') or {})
                      for arg in (flag, str(seed['playBox'][key]))]], check=True)
    _phase_record(phase, 'progress', city=seed['id'], step='bounds-command-complete')
    bounds = json.loads((out / 'bounds.json').read_text())
    _phase_record(phase, 'complete', city=seed['id'], elapsedSeconds=round(time.monotonic() - started, 3))
    return {'seed': seed, 'out': out, 'city': city, 'displayName': display_name,
            'airport': airport, 'airportRowNumber': row_number, 'timezone': timezone,
            'zoneRows': zone_rows, 'facts': facts, 'bounds': bounds, 'datasetBytes': dataset_bytes,
            'coastRefs': [], 'gateway': gateway}

def scan_coastlines(pbf, contexts, adapter):
    phase = 'coastline-scan'
    started = _phase_started(phase, progressEvery=_SCAN_PROGRESS_INTERVAL, seedCount=len(contexts))
    import osmium
    errors = {}
    class CoastWays(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.ways_seen = 0
            self.coastline_ways = 0
            self.next_progress = _SCAN_PROGRESS_INTERVAL
        def way(self, way):
            self.ways_seen += 1
            if self.ways_seen >= self.next_progress:
                _phase_record(phase, 'progress', ways=self.ways_seen,
                             coastlineWays=self.coastline_ways,
                             matches=sum(len(context['coastRefs']) for context in contexts))
                self.next_progress += _SCAN_PROGRESS_INTERVAL
            if way.tags.get('natural') != 'coastline':
                return
            self.coastline_ways += 1
            geometry = []
            for node in way.nodes:
                if not node.location.valid():
                    raise Hold('coastline has an unresolved PBF node')
                geometry.append({'lon': node.location.lon, 'lat': node.location.lat})
            for context in contexts:
                city_id = context['seed']['id']
                if city_id in errors:
                    continue
                try:
                    if adapter.geometry_intersects_box(geometry, context['bounds']['boxes']['wide']):
                        context['coastRefs'].append(f'way/{way.id}')
                except Exception as error:
                    errors[city_id] = str(error)
    handler = CoastWays()
    try:
        handler.apply_file(str(pbf), locations=True)
    except Exception as error:
        for context in contexts:
            errors.setdefault(context['seed']['id'], str(error))
        _phase_record(phase, 'error', error=str(error), ways=handler.ways_seen)
        return errors
    _phase_complete(phase, started, ways=handler.ways_seen, coastlineWays=handler.coastline_ways,
                   matches={context['seed']['id']: len(context['coastRefs']) for context in contexts})
    return errors

def finish_city(context, args, adapter):
    seed, out = context['seed'], context['out']
    facts, bounds = context['facts'], context['bounds']
    city, airport = context['city'], context['airport']
    zone_rows, timezone = context['zoneRows'], context['timezone']
    coast_refs = context['coastRefs']
    display_name = context['displayName']
    water = {'kind': 'coast' if coast_refs else 'inland', 'wideWater': bool(coast_refs), 'reviewRequired': False}
    if coast_refs:
        water['sea'] = {'kind': 'coast', 'bandMetres': 40000}
    extraction_input = {'city': {'id': seed['id'], 'name': display_name},
                        'boxes': bounds['boxes'], 'waterRecipe': water}
    extraction = profile_rules(seed).get('extraction') if 'profile' in seed else None
    if extraction is not None:
        # Outpost and wilderness only: the profile's extra place filters, road ladder and sensitive-feature exclusion (offline-extract.py).
        extraction_input['profileExtraction'] = {'profile': seed['profile'], **extraction}
    metadata_file = out / 'source-input.json'
    metadata_file.write_text(json.dumps(extraction_input, indent=2))
    adapter.load_city(metadata_file)
    play = bounds['boxes']['play']
    facts['bounds'] = [play[1], play[0], play[3], play[2]]
    gateway = context.get('gateway')
    airport_source = ({'rowNumber': context['airportRowNumber'], 'row': airport,
                       'rowSha256': hashlib.sha256(json.dumps(airport, sort_keys=True,
                           separators=(',', ':')).encode()).hexdigest(),
                       'csvSha256': digest(args.airports_csv), 'snapshotDate': args.airports_date}
                      if gateway is None else None)
    provenance = {'centre': {'osmRef': city['ref'], 'sourceUrl': facts['sourceUrl'],
                             'sourceRecord': city, 'pbfSha256': args.expected_pbf_sha256},
                  **({'airport': airport_source} if gateway is None else {
                      'gateway': {**seed['gateway'], 'sourceRecord': {key: gateway[key] for key in ('ref', 'tags', 'lon', 'lat')},
                                  'pbfSha256': args.expected_pbf_sha256,
                                  'claim': 'caller-supplied gateway node, checked for its mode tags and for no military tag; a mapped landing does not establish operations'}}),
                  'timezone': {'rows': zone_rows, 'zoneTabSha256': digest(args.zone_tab),
                               'countryTableSha256': digest(args.countries_tab)},
                  'pbf': {'url': args.dataset_url, 'bytes': context['datasetBytes'],
                          'sha256': args.expected_pbf_sha256, 'headerTimestamp': context['timestamp']},
                  'coastlineRefsWithinWide': coast_refs,
                  'adapterSha256': digest(args.adapter),
                  'boundsPolicySha256': digest(Path(__file__).with_name('bounds-policy.mjs')),
                  'bounds': bounds}
    if 'cityOsmRef' in seed:
        provenance['centre']['selection'] = {'cityOsmRef': seed['cityOsmRef'], 'matchedOsmRef': city['ref']}
    if 'profile' in seed:
        # The selection profile (profiles.json) travels with the city's provenance; the city node's own place tag is in centre.sourceRecord.tags.
        provenance['profile'] = {'name': seed['profile'], 'rules': profile_rules(seed), 'cityPlaceTag': city['tags'].get('place')}
    if 'timezoneOverride' in seed:
        provenance['timezone']['override'] = {**seed['timezoneOverride'],
            'claim': 'reviewed timezone override: the pinned zone1970.tab has no row for this place, or the zone of a station differs from its country row'}
    if 'countryName' in seed:
        provenance['countryName'] = {**seed['countryName'], 'claim': 'reviewed name of a user-assigned code absent from the pinned iso3166.tab; game map only'}
    if 'airport' in seed:
        provenance['airport']['selection'] = {**seed['airport'], 'matchedIdent': airport['ident'],
            'municipalityMatchesCity': normalized(airport.get('municipality', '')) == normalized(seed['name']),
            'claim': 'caller-supplied serves-city provenance; source URL content is not verified offline'}
    if 'timezone' in seed:
        provenance['timezone']['selection'] = {**seed['timezone'], 'matchedRow': zone_rows[0],
            'claim': 'caller-supplied city timezone provenance; country membership verified against supplied zone.tab'}
    candidate = {'status': 'METADATA_CANDIDATE', 'id': seed['id'], 'name': display_name,
                 'country': seed['countryISO'].lower(), 'facts': facts, 'metadataSources': provenance,
                 'sourceInput': extraction_input,
                 'holds': ['five-layer extraction and its producer receipts are not yet present',
                           'source-semantic/geometry/visual/browser acceptance remains separate']}
    (out / 'metadata.json').write_text(json.dumps(candidate, indent=2))
    print(json.dumps({'status': candidate['status'], 'id': seed['id'], 'out': str(out)}))
    return candidate

def run_batch_metadata(args):
    seed_files = json.loads(Path(args.seed_files).read_text())
    if not isinstance(seed_files, list) or not 1 <= len(seed_files) <= 6 or not all(isinstance(path, str) for path in seed_files):
        raise Hold('batch requires one to six seed-file paths')
    seeds = [json.loads(Path(path).read_text()) for path in seed_files]
    for seed in seeds:
        validate_seed(seed)
    if len({seed['id'] for seed in seeds}) != len(seeds) or len({seed['countryISO'] for seed in seeds}) != 1:
        raise Hold('batch requires unique city ids from one country')
    outputs = {seed['id']: Path(args.out_root) / seed['id'] / 'candidate' for seed in seeds}
    if len({str(out) for out in outputs.values()}) != len(outputs) or any(out.exists() for out in outputs.values()):
        raise Hold('output directory must be new')
    for out in outputs.values():
        out.mkdir(parents=True)
    results = {}
    try:
        if not args.source_verified:
            raise Hold('official dated PBF URL, byte size and hash need verification before metadata scanning')
        validate_dataset_url(args.dataset_url)
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.dataset_date) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.airports_date):
            raise Hold('dated PBF and airport CSV snapshots required')
        pbf = Path(args.pbf)
        pbf_bytes = pbf.stat().st_size
        phase = 'pbf-hash-verification'
        started = _phase_started(phase, bytes=pbf_bytes, seedCount=len(seeds))
        verified_bytes = 0
        pbf_digest = hashlib.sha256()
        with pbf.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                pbf_digest.update(block)
                verified_bytes += len(block)
                if verified_bytes % (64 * 1024 * 1024) < len(block):
                    _phase_record(phase, 'progress', bytes=verified_bytes, totalBytes=pbf_bytes)
        actual_pbf_sha256 = pbf_digest.hexdigest()
        _phase_complete(phase, started, bytes=verified_bytes, sha256=actual_pbf_sha256)
        if pbf_bytes != int(args.dataset_bytes) or actual_pbf_sha256 != args.expected_pbf_sha256.lower():
            raise Hold('PBF byte size or SHA-256 mismatch')
        airport_rows = []
        with Path(args.airports_csv).open(newline='') as stream:
            reader = csv.DictReader(stream)
            airport_rows = [(reader.line_num, row) for row in reader]
        zone_lines = Path(args.zone_tab).read_text().splitlines()
        country_lines = Path(args.countries_tab).read_text().splitlines()
        import osmium
        with osmium.io.Reader(str(pbf), osmium.osm.NOTHING) as reader:
            timestamp = reader.header().get('osmosis_replication_timestamp', '')
        gateways = {}
        for seed in seeds:
            if 'gateway' in seed:
                gateways.setdefault(int(seed['gateway']['osmRef'].split('/')[1]), []).append(seed['id'])
        if gateways:
            candidates, node_errors, gateway_nodes = scan_city_nodes(pbf, seeds, gateways)
        else:
            candidates, node_errors = scan_city_nodes(pbf, seeds)
            gateway_nodes = {}
        for seed in seeds:
            # Identity-review diagnostic (from the Oceania single-seed stage): every matching named city/town node, capped at 100.
            records = sorted(candidates[seed['id']], key=lambda node: int(node['ref'].split('/')[1]))
            (outputs[seed['id']] / 'city-candidates.json').write_text(json.dumps({
                'seed': seed, 'datasetSha256': args.expected_pbf_sha256,
                'matchingCount': len(records), 'limit': 100, 'truncated': len(records) > 100,
                'candidates': records[:100],
                'scope': 'Matching source city/town nodes for identity review; not acceptance or selected facts'}, indent=2))
        contexts = []
        for seed in seeds:
            city_id = seed['id']
            try:
                if city_id in node_errors:
                    raise Hold(node_errors[city_id])
                context = prepare_city(seed, outputs[city_id], candidates[city_id], args,
                                       airport_rows, zone_lines, country_lines, timestamp, pbf_bytes, gateway_nodes.get(city_id))
                context['timestamp'] = timestamp
                contexts.append(context)
            except Exception as error:
                results[city_id] = write_hold(outputs[city_id], error)
        adapter_spec = importlib.util.spec_from_file_location('existing_pbf_adapter', args.adapter)
        adapter = importlib.util.module_from_spec(adapter_spec)
        adapter_spec.loader.exec_module(adapter)
        if contexts:
            coast_errors = scan_coastlines(pbf, contexts, adapter)
            for context in contexts:
                city_id = context['seed']['id']
                try:
                    if city_id in coast_errors:
                        raise Hold(coast_errors[city_id])
                    results[city_id] = finish_city(context, args, adapter)
                except Exception as error:
                    results[city_id] = write_hold(outputs[city_id], error)
    except Exception as error:
        for seed in seeds:
            if seed['id'] not in results:
                results[seed['id']] = write_hold(outputs[seed['id']], error)
    summary = {'status': 'METADATA_BATCH_COMPLETE',
               'candidates': [seed['id'] for seed in seeds if results.get(seed['id'], {}).get('status') == 'METADATA_CANDIDATE'],
               'holds': [seed['id'] for seed in seeds if results.get(seed['id'], {}).get('status') == 'HOLD']}
    print(json.dumps(summary))
    return summary

def main():
    parser = argparse.ArgumentParser()
    for key in ('seed-files', 'out-root', 'pbf', 'airports-csv', 'airports-date',
                'zone-tab', 'countries-tab', 'dataset-url', 'dataset-date',
                'expected-pbf-sha256', 'dataset-bytes', 'geometry-source', 'adapter'):
        parser.add_argument('--' + key, required=True)
    parser.add_argument('--source-verified', action='store_true')
    run_batch_metadata(parser.parse_args())

if __name__ == '__main__':
    main()
