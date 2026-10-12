"""Offline metadata candidate stage; does not extract map layers or use the network."""
from __future__ import annotations
import argparse
import csv
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess
import time
import unicodedata
from urllib.parse import quote, urlparse

class Hold(ValueError):
    pass

SCAN_PROGRESS_INTERVAL = 5_000_000

def phase_record(phase, event, **fields):
    record = {'phase': phase, 'event': event, **fields}
    print('[metadata-phase] ' + json.dumps(record, separators=(',', ':')), flush=True)

def phase_started(phase, **fields):
    started = time.monotonic()
    phase_record(phase, 'start', **fields)
    return started

def phase_complete(phase, started, **fields):
    phase_record(phase, 'complete', elapsedSeconds=round(time.monotonic() - started, 3), **fields)

def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()

def normalized(value):
    return ''.join(char for char in unicodedata.normalize('NFKD', value).casefold() if char.isalnum())

def validate_source_url(value):
    if not isinstance(value, str) or re.search(r'\s', value):
        raise Hold('selection sourceUrl must be an HTTPS provenance URL')
    parsed = urlparse(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username is not None or parsed.password is not None:
        raise Hold('selection sourceUrl must be an HTTPS provenance URL')

def validate_seed(seed):
    if not isinstance(seed, dict) or set(seed) - {'id', 'name', 'countryISO', 'cityOsmRef', 'airport', 'timezone'}:
        raise Hold('unsupported seed fields')
    if not isinstance(seed.get('id'), str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', seed['id']) or not isinstance(seed.get('name'), str) or not normalized(seed['name']) or not isinstance(seed.get('countryISO'), str) or not re.fullmatch(r'[A-Z]{2}', seed['countryISO']):
        raise Hold('seed needs city id/name and uppercase country ISO')
    if 'cityOsmRef' in seed and (not isinstance(seed['cityOsmRef'], str) or not re.fullmatch(r'node/[1-9][0-9]*', seed['cityOsmRef'])):
        raise Hold('cityOsmRef needs a positive OSM node reference')
    for key, field in (('airport', 'ident'), ('timezone', 'id')):
        if key not in seed:
            continue
        selector = seed[key]
        if not isinstance(selector, dict) or set(selector) != {field, 'sourceUrl'} or not isinstance(selector.get(field), str) or not selector[field].strip() or selector[field] != selector[field].strip():
            raise Hold(key + ' selection requires ' + field + ' and sourceUrl')
        validate_source_url(selector['sourceUrl'])
    return seed

def validate_dataset_url(value):
    if not isinstance(value, str) or not re.fullmatch(r'https://download\.geofabrik\.de/(?:[a-z0-9-]+/)*[a-z0-9-]+-[0-9]{6}\.osm\.pbf', value):
        raise Hold('dated official Geofabrik country or region PBF URL required')
    # The anchored path grammar excludes traversal, encoded paths, queries and fragments.
    return value

def choose_city(nodes, seed, selector=None):
    matches = [node for node in nodes if node['tags'].get('place') in {'city', 'town'} and any(normalized(node['tags'].get(key, '')) == normalized(seed['name']) for key in ('name', 'name:en'))]
    selected_ref = selector if selector is not None else seed.get('cityOsmRef')
    if selected_ref is not None:
        eligible = [node for node in matches if node.get('ref') == selected_ref]
        if len(eligible) != 1:
            raise Hold('explicit city reference is missing or ambiguous among matching named city/town nodes')
        return eligible[0]
    capitals = [node for node in matches if node['tags'].get('capital') in {'yes', '2'}]
    eligible = capitals or matches
    if len(eligible) != 1:
        raise Hold(f'city match is missing or ambiguous: {len(matches)} names, {len(capitals)} national capitals')
    return eligible[0]

def choose_airport(rows, seed, selector=None):
    types = {'large_airport': 3, 'medium_airport': 2, 'small_airport': 1}
    selection = selector if selector is not None else seed.get('airport')
    if selection is not None:
        validate_source_url(selection['sourceUrl'])
        matches = [(number, row) for number, row in rows if row.get('ident') == selection['ident']]
        if len(matches) != 1:
            raise Hold('explicit airport ident is missing or ambiguous in pinned CSV')
        number, row = matches[0]
        if row.get('iso_country') != seed['countryISO'] or row.get('type') not in types or row.get('scheduled_service') != 'yes' or not row.get('name'):
            raise Hold('explicit airport must be a named same-country scheduled-service airport')
        return number, row
    matches = [(number, row) for number, row in rows if row.get('iso_country') == seed['countryISO'] and normalized(row.get('municipality', '')) == normalized(seed['name']) and row.get('type') in types]
    if not matches:
        raise Hold('no eligible same-country municipality airport')
    rank = lambda item: (item[1].get('scheduled_service') == 'yes', types[item[1]['type']])
    highest = max(map(rank, matches))
    winners = [item for item in matches if rank(item) == highest]
    if len(winners) != 1:
        raise Hold(f'airport match is ambiguous: {len(winners)} equal-ranked rows')
    number, row = winners[0]
    if row.get('scheduled_service') != 'yes':
        raise Hold('no scheduled-service municipality airport; review required')
    if not row.get('ident') or not row.get('name'):
        raise Hold('airport identity missing')
    return number, row

def choose_timezone(lines, country, selector=None):
    entries = [line.rstrip('\n').split('\t') for line in lines if line.strip() and not line.startswith('#')]
    matches = [entry for entry in entries if len(entry) >= 3 and country in entry[0].split(',')]
    if selector is not None:
        validate_source_url(selector['sourceUrl'])
        matches = [entry for entry in matches if entry[2] == selector['id']]
    zones = sorted({entry[2] for entry in matches})
    if len(matches) != 1 or len(zones) != 1:
        raise Hold(f'country timezone is missing or ambiguous: {zones}')
    return zones[0], matches

def country_name(lines, code):
    for line in lines:
        if line.strip() and not line.startswith('#'):
            fields = line.rstrip('\n').split('\t')
            if len(fields) >= 2 and fields[0] == code:
                return fields[1]
    raise Hold('country code absent from supplied ISO country table')

def coordinate(lon, lat):
    if not math.isfinite(lon) or not math.isfinite(lat) or abs(lon) > 180 or abs(lat) > 90:
        raise Hold('invalid finite WGS84 coordinate')
    return {'lon': lon, 'lat': lat}

def main():
    parser = argparse.ArgumentParser()
    for key in ('seed', 'pbf', 'airports-csv', 'airports-date', 'zone-tab', 'countries-tab', 'dataset-url', 'dataset-date', 'expected-pbf-sha256', 'dataset-bytes', 'geometry-source', 'adapter', 'out'):
        parser.add_argument('--' + key, required=True)
    parser.add_argument('--source-verified', action='store_true')
    args = parser.parse_args()
    out = Path(args.out)
    if out.exists():
        raise Hold('output directory must be new')
    out.mkdir(parents=True)
    try:
        seed = json.loads(Path(args.seed).read_text())
        validate_seed(seed)
        if not args.source_verified:
            raise Hold('official dated PBF URL, byte size and hash need verification before metadata scanning')
        validate_dataset_url(args.dataset_url)
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.dataset_date) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.airports_date):
            raise Hold('dated PBF and airport CSV snapshots required')
        pbf = Path(args.pbf)
        pbf_bytes = pbf.stat().st_size
        phase = 'pbf-hash-verification'
        started = phase_started(phase, bytes=pbf_bytes)
        verified_bytes = 0
        pbf_digest = hashlib.sha256()
        with pbf.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                pbf_digest.update(block)
                verified_bytes += len(block)
                if verified_bytes % (64 * 1024 * 1024) < len(block):
                    phase_record(phase, 'progress', bytes=verified_bytes, totalBytes=pbf_bytes)
        actual_pbf_sha256 = pbf_digest.hexdigest()
        phase_complete(phase, started, bytes=verified_bytes, sha256=actual_pbf_sha256)
        if pbf_bytes != int(args.dataset_bytes) or actual_pbf_sha256 != args.expected_pbf_sha256.lower():
            raise Hold('PBF byte size or SHA-256 mismatch')
        import osmium
        candidates = []
        expected_name = normalized(seed['name'])
        phase = 'city-node-scan'
        started = phase_started(phase, progressEvery=SCAN_PROGRESS_INTERVAL)
        class CityNodes(osmium.SimpleHandler):
            nodes_seen = 0
            next_progress = SCAN_PROGRESS_INTERVAL
            def node(self, node):
                self.nodes_seen += 1
                if self.nodes_seen >= self.next_progress:
                    phase_record(phase, 'progress', nodes=self.nodes_seen, candidates=len(candidates))
                    self.next_progress += SCAN_PROGRESS_INTERVAL
                tags = {tag.k: tag.v for tag in node.tags}
                if tags.get('place') in {'city', 'town'} and any(normalized(tags.get(key, '')) == expected_name for key in ('name', 'name:en')):
                    if not node.location.valid():
                        raise Hold('matching city node has no valid location')
                    candidates.append({'ref': f'node/{node.id}', 'tags': tags, **coordinate(node.location.lon, node.location.lat)})
        city_nodes = CityNodes()
        city_nodes.apply_file(str(pbf))
        phase_complete(phase, started, nodes=city_nodes.nodes_seen, candidates=len(candidates))
        city = choose_city(candidates, seed)
        with Path(args.airports_csv).open(newline='') as stream:
            reader = csv.DictReader(stream)
            rows = []
            for row in reader:
                rows.append((reader.line_num, row))
        row_number, airport = choose_airport(rows, seed)
        timezone, zone_rows = choose_timezone(Path(args.zone_tab).read_text().splitlines(), seed['countryISO'], seed.get('timezone'))
        country = country_name(Path(args.countries_tab).read_text().splitlines(), seed['countryISO'])
        phase = 'pbf-header-check'
        started = phase_started(phase)
        with osmium.io.Reader(str(pbf), osmium.osm.NOTHING) as reader:
            timestamp = reader.header().get('osmosis_replication_timestamp', '')
        phase_record(phase, 'progress', step='timestamp-read')
        phase_complete(phase, started, timestamp=timestamp)
        if not timestamp.startswith(args.dataset_date + 'T'):
            raise Hold('PBF header timestamp does not match its stated snapshot date')
        display_name = city['tags'].get('name:en') or city['tags']['name']
        airport_point = coordinate(float(airport['longitude_deg']), float(airport['latitude_deg']))
        facts = {'id': seed['id'], 'name': display_name, 'country': {'idISOlower': seed['countryISO'].lower(), 'name': country}, 'state': {'idunique': seed['countryISO'].lower() + '-' + seed['id'], 'name': display_name}, 'timezone': timezone, 'centre': coordinate(city['lon'], city['lat']), 'airport': {'id': seed['id'] + '-airport', 'name': airport['name'], **airport_point, 'sourceUrl': 'https://ourairports.com/airports/' + quote(airport['ident'], safe='') + '/'}, 'sourceLabel': 'OpenStreetMap country PBF and OurAirports dated CSV', 'sourceUrl': 'https://www.openstreetmap.org/' + city['ref'], 'licence': 'OpenStreetMap ODbL-1.0; OurAirports public-domain dataset', 'coverageNote': 'Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.'}
        (out / 'facts-input.json').write_text(json.dumps(facts, indent=2))
        phase = 'bounds-derivation'
        started = phase_started(phase)
        subprocess.run(['node', '--experimental-strip-types', str(Path(__file__).with_name('bounds.mjs')), '--facts', str(out / 'facts-input.json'), '--geometry-source', args.geometry_source, '--out', str(out / 'bounds.json')], check=True)
        phase_record(phase, 'progress', step='bounds-command-complete')
        bounds = json.loads((out / 'bounds.json').read_text())
        phase_complete(phase, started)
        spec = importlib.util.spec_from_file_location('existing_pbf_adapter', args.adapter)
        adapter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(adapter)
        coast_refs = []
        phase = 'coastline-scan'
        started = phase_started(phase, progressEvery=SCAN_PROGRESS_INTERVAL)
        class CoastWays(osmium.SimpleHandler):
            ways_seen = 0
            coastline_ways = 0
            next_progress = SCAN_PROGRESS_INTERVAL
            def way(self, way):
                self.ways_seen += 1
                if self.ways_seen >= self.next_progress:
                    phase_record(phase, 'progress', ways=self.ways_seen, coastlineWays=self.coastline_ways, matches=len(coast_refs))
                    self.next_progress += SCAN_PROGRESS_INTERVAL
                if way.tags.get('natural') != 'coastline': return
                self.coastline_ways += 1
                geometry = []
                for node in way.nodes:
                    if not node.location.valid(): raise Hold('coastline has an unresolved PBF node')
                    geometry.append({'lon': node.location.lon, 'lat': node.location.lat})
                if adapter.geometry_intersects_box(geometry, bounds['boxes']['wide']): coast_refs.append(f'way/{way.id}')
        coast_ways = CoastWays()
        coast_ways.apply_file(str(pbf), locations=True)
        phase_complete(phase, started, ways=coast_ways.ways_seen, coastlineWays=coast_ways.coastline_ways, matches=len(coast_refs))
        water = {'kind': 'coast' if coast_refs else 'inland', 'wideWater': bool(coast_refs), 'reviewRequired': False}
        if coast_refs: water['sea'] = {'kind': 'coast', 'bandMetres': 40000}
        extraction_input = {'city': {'id': seed['id'], 'name': display_name}, 'boxes': bounds['boxes'], 'waterRecipe': water}
        metadata_file = out / 'source-input.json'
        metadata_file.write_text(json.dumps(extraction_input, indent=2))
        adapter.load_city(metadata_file)
        play = bounds['boxes']['play']
        facts['bounds'] = [play[1], play[0], play[3], play[2]]
        provenance = {'centre': {'osmRef': city['ref'], 'sourceUrl': facts['sourceUrl'], 'sourceRecord': city, 'pbfSha256': args.expected_pbf_sha256}, 'airport': {'rowNumber': row_number, 'row': airport, 'rowSha256': hashlib.sha256(json.dumps(airport, sort_keys=True, separators=(',', ':')).encode()).hexdigest(), 'csvSha256': digest(args.airports_csv), 'snapshotDate': args.airports_date}, 'timezone': {'rows': zone_rows, 'zoneTabSha256': digest(args.zone_tab), 'countryTableSha256': digest(args.countries_tab)}, 'pbf': {'url': args.dataset_url, 'bytes': pbf.stat().st_size, 'sha256': args.expected_pbf_sha256, 'headerTimestamp': timestamp}, 'coastlineRefsWithinWide': coast_refs, 'adapterSha256': digest(args.adapter), 'boundsPolicySha256': digest(Path(__file__).with_name('bounds-policy.mjs')), 'bounds': bounds}
        if 'cityOsmRef' in seed:
            provenance['centre']['selection'] = {'cityOsmRef': seed['cityOsmRef'], 'matchedOsmRef': city['ref']}
        if 'airport' in seed:
            provenance['airport']['selection'] = {**seed['airport'], 'matchedIdent': airport['ident'], 'municipalityMatchesCity': normalized(airport.get('municipality', '')) == normalized(seed['name']), 'claim': 'caller-supplied serves-city provenance; source URL content is not verified offline'}
        if 'timezone' in seed:
            provenance['timezone']['selection'] = {**seed['timezone'], 'matchedRow': zone_rows[0], 'claim': 'caller-supplied city timezone provenance; country membership verified against supplied zone.tab'}
        candidate = {'status': 'METADATA_CANDIDATE', 'id': seed['id'], 'name': display_name, 'country': seed['countryISO'].lower(), 'facts': facts, 'metadataSources': provenance, 'sourceInput': extraction_input, 'holds': ['five-layer extraction and its producer receipts are not yet present', 'source-semantic/geometry/visual/browser acceptance remains separate']}
        (out / 'metadata.json').write_text(json.dumps(candidate, indent=2))
        print(json.dumps({'status': candidate['status'], 'id': seed['id'], 'out': str(out)}))
    except Exception as error:
        (out / 'metadata.json').write_text(json.dumps({'status': 'HOLD', 'reason': str(error)}, indent=2))
        print(json.dumps({'status': 'HOLD', 'reason': str(error)}))
        raise SystemExit(1)

if __name__ == '__main__':
    main()
