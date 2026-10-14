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

ROAD_FALLBACK_MIN_WAYS = 3  # fewer standard-class ways than this inside the play box turns the fallback tiers on

PROFILES = json.loads((Path(__file__).with_name('profiles.json')).read_text())['profiles']

def profile_rules(seed):
    """Selection profile of a seed (profiles.json; `standard` when absent). Only the city-node place tags are read here; the other minimums belong to the JS stages."""
    name = seed.get('profile')
    if name is None:
        return PROFILES['standard']
    if name == 'standard' or name not in PROFILES:
        raise Hold('unknown seed profile (allowed: ' + ', '.join(sorted(key for key in PROFILES if key != 'standard')) + ')')
    return PROFILES[name]

def city_place_tags(seed):
    return set(profile_rules(seed)['cityPlaceTags']) | set(profile_rules(seed)['capitalPlaceTags'])

def city_natural_tags(seed):
    """Wilderness only (profiles.json `cityNaturalTags`): a named glacier, peak, saddle, reef node or a mountain_pass=yes node may name the place."""
    return set(profile_rules(seed).get('cityNaturalTags', []))

def natural_node_ok(tags, natural):
    return bool(natural) and (tags.get('natural') in natural or ('mountain_pass' in natural and tags.get('mountain_pass') == 'yes'))

def city_node_tag_ok(tags, seed):
    """place=city|town (standard); a profile adds more tags (microstate: village, hamlet, locality) and, for a capital=yes|2 node only, `capitalPlaceTags` (the Holy See's capital node is mapped place=suburb).
    The wilderness profile also accepts its natural tags; a military node is never a city node of a profile that excludes sensitive features."""
    rules = profile_rules(seed)
    place = tags.get('place')
    if rules.get('extraction', {}).get('excludeSensitive') and sensitive_tags(tags):
        return False
    return (place in rules['cityPlaceTags'] or (place in rules['capitalPlaceTags'] and tags.get('capital') in {'yes', '2'})
            or natural_node_ok(tags, city_natural_tags(seed)))

def sensitive_tags(tags):
    """Never a city node, gateway or venue of an outpost: military=*, landuse=military, aeroway=* (an aeroway is allowed only as an air gateway)."""
    return 'military' in tags or tags.get('landuse') == 'military'

GATEWAY_TAGS = {
    # How a mapped node may serve as the hub of an outpost without an OurAirports row. Never a military feature.
    'air': lambda tags: tags.get('aeroway') in {'heliport', 'helipad', 'aerodrome', 'airstrip'},
    'sea': lambda tags: tags.get('amenity') == 'ferry_terminal' or tags.get('harbour') == 'yes' or tags.get('man_made') == 'pier' or tags.get('leisure') in {'slipway', 'marina'},
    'land': lambda tags: tags.get('highway') == 'trailhead' or tags.get('mountain_pass') == 'yes' or tags.get('natural') == 'saddle' or tags.get('tourism') in {'alpine_hut', 'wilderness_hut'} or tags.get('amenity') == 'shelter',
}
GATEWAY_MAX_KM = 40
ETC_ZONE = re.compile(r'Etc/GMT(?:[+-](?:[1-9]|1[0-4]))?')

def validate_seed(seed):
    if not isinstance(seed, dict) or set(seed) - {'id', 'name', 'countryISO', 'cityOsmRef', 'airport', 'timezone', 'profile', 'playBox', 'roadLadder', 'gateway', 'timezoneOverride', 'countryName'}:
        raise Hold('unsupported seed fields')
    if 'playBox' in seed and (not isinstance(seed['playBox'], dict) or not seed['playBox'] or set(seed['playBox']) - {'playKm', 'coreKm'}
                              or any(type(value) not in (int, float) or not 0 < value <= 40 for value in seed['playBox'].values())):
        raise Hold('playBox needs playKm and/or coreKm half-widths in km (0 to 40)')
    if not isinstance(seed.get('id'), str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', seed['id']) or not isinstance(seed.get('name'), str) or not normalized(seed['name']) or not isinstance(seed.get('countryISO'), str) or not re.fullmatch(r'[A-Z]{2}', seed['countryISO']):
        raise Hold('seed needs city id/name and uppercase country ISO')
    rules = profile_rules(seed)
    validate_outpost_fields(seed, rules)
    validate_road_ladder(seed, rules)
    if 'cityOsmRef' in seed and (not isinstance(seed['cityOsmRef'], str) or not re.fullmatch(r'node/[1-9][0-9]*', seed['cityOsmRef'])):
        raise Hold('cityOsmRef needs a positive OSM node reference')
    for key, field in (('airport', 'ident'), ('timezone', 'id')):
        if key not in seed:
            continue
        selector = seed[key]
        allowed = {field, 'sourceUrl'} | ({'hubWaiver', 'countryOverride'} if key == 'airport' else set())
        if not isinstance(selector, dict) or not {field, 'sourceUrl'} <= set(selector) <= allowed or not isinstance(selector.get(field), str) or not selector[field].strip() or selector[field] != selector[field].strip():
            raise Hold(key + ' selection requires ' + field + ' and sourceUrl')
        if 'hubWaiver' in selector and (not isinstance(selector['hubWaiver'], str) or len(selector['hubWaiver'].strip()) < 20):
            raise Hold('airport hubWaiver needs a written reason (at least 20 characters)')
        if 'countryOverride' in selector:
            override = selector['countryOverride']
            if ('hubWaiver' in selector or not isinstance(override, dict) or set(override) != {'iso', 'reason'}
                    or not isinstance(override['iso'], str) or not re.fullmatch(r'[A-Z]{2}', override['iso']) or override['iso'] == seed.get('countryISO')
                    or not isinstance(override['reason'], str) or len(override['reason'].strip()) < 20):
                raise Hold('airport countryOverride needs {iso, reason}: another two-letter OurAirports country than the seed (reason of at least 20 characters), and cannot be combined with hubWaiver')
        validate_source_url(selector['sourceUrl'])
    return seed

def validate_road_ladder(seed, rules):
    """roadLadder (opt-in, 14 Oct 2026): true asks the extractor for the road fallback (offline-extract.py ROAD_FALLBACK_TIERS) in a road-poor territory.
    Absent from every existing seed. An outpost or wilderness city already has its own ladder."""
    if 'roadLadder' not in seed:
        return
    if type(seed['roadLadder']) is not bool:
        raise Hold('roadLadder must be true or false')
    if seed['roadLadder'] and 'extraction' in rules:
        raise Hold('roadLadder does not combine with the outpost or wilderness profile (they carry their own road ladder)')

def road_fallback_input(seed):
    """The `roadFallback` key of source-input.json (empty without the knob, so every other city's input is unchanged)."""
    return {'roadFallback': {'minWays': ROAD_FALLBACK_MIN_WAYS}} if seed.get('roadLadder') is True else {}

def validate_outpost_fields(seed, rules):
    """gateway, timezoneOverride and countryName (OUTPOST-PLAN 13 Oct 2026). Absent from every existing seed, so nothing else changes."""
    if 'gateway' in seed:
        gateway = seed['gateway']
        if not rules.get('hubGateway'):
            raise Hold('a gateway needs a profile that allows one (outpost, wilderness)')
        if 'airport' in seed:
            raise Hold('a seed names an airport or a gateway, not both')
        if (not isinstance(gateway, dict) or set(gateway) != {'osmRef', 'mode', 'sourceUrl'} or gateway['mode'] not in GATEWAY_TAGS
                or not isinstance(gateway['osmRef'], str) or not re.fullmatch(r'node/[1-9][0-9]*', gateway['osmRef'])):
            raise Hold('gateway needs exactly osmRef (node/<id>), mode (air, sea or land) and sourceUrl')
        validate_source_url(gateway['sourceUrl'])
    if rules.get('requiresCityOsmRef') and 'cityOsmRef' not in seed:
        raise Hold('this profile names its place by cityOsmRef only')
    if 'timezoneOverride' in seed:
        override = seed['timezoneOverride']
        if 'timezone' in seed:
            raise Hold('a seed names a timezone or a timezoneOverride, not both')
        if (not isinstance(override, dict) or set(override) != {'id', 'reason', 'sourceUrl'} or not isinstance(override['id'], str)
                or not isinstance(override['reason'], str) or len(override['reason'].strip()) < 20):
            raise Hold('timezoneOverride needs id, sourceUrl and a written reason of at least 20 characters')
        validate_source_url(override['sourceUrl'])
    if 'countryName' in seed:
        name = seed['countryName']
        if (not re.fullmatch(r'X[A-Z]', str(seed.get('countryISO'))) or not isinstance(name, dict) or set(name) != {'name', 'reason'}
                or not isinstance(name['name'], str) or not name['name'].strip() or name['name'] != name['name'].strip()
                or not isinstance(name['reason'], str) or len(name['reason'].strip()) < 20):
            raise Hold('countryName {name, reason} is only for a user-assigned X? code, with a written reason of at least 20 characters')

def choose_seed_timezone(lines, seed):
    """The seed's zone: the pinned zone1970 row of its country (choose_timezone), or a reviewed timezoneOverride. An override must be a
    zone of the pinned zone1970.tab (any country's row: Antarctica/Palmer, Indian/Chagos) or a fixed Etc/GMT offset (Heard Island has no
    row of its own), and it returns no country rows: the receipt records the override and its reason instead."""
    override = seed.get('timezoneOverride')
    if override is None:
        return choose_timezone(lines, seed['countryISO'], seed.get('timezone'))
    zones = {entry[2] for entry in (line.rstrip('\n').split('\t') for line in lines if line.strip() and not line.startswith('#')) if len(entry) >= 3}
    if override['id'] not in zones and not ETC_ZONE.fullmatch(override['id']):
        raise Hold('timezoneOverride must be a zone of the pinned zone1970.tab or Etc/GMT[+-]N')
    return override['id'], []

def seed_country_name(lines, seed):
    """iso3166.tab name; a user-assigned code absent from the pinned table (XG Siachen Glacier, XA Ashmore and Cartier Islands) takes the seed's reviewed countryName."""
    if 'countryName' not in seed:
        return country_name(lines, seed['countryISO'])
    try:
        country_name(lines, seed['countryISO'])
    except Hold:
        return seed['countryName']['name']
    raise Hold('countryName is only for a code the pinned country table does not carry')

def gateway_record(node, seed):
    """The OSM node a seed names as its gateway, checked: named, inside GATEWAY_MAX_KM of nothing yet (see gateway_facts), tagged for its mode, never military."""
    tags, mode = node['tags'], seed['gateway']['mode']
    name = tags.get('name:en') or tags.get('name')
    if not name:
        raise Hold('gateway node has no name')
    if sensitive_tags(tags):
        raise Hold('gateway node is a military feature; never a hub')
    if not GATEWAY_TAGS[mode](tags):
        raise Hold(f'gateway node is not tagged as a {mode} gateway')
    return {**node, 'name': name}

def gateway_facts(seed, gateway, city):
    km = 2 * 6371 * math.asin(math.sqrt(math.sin(math.radians(gateway['lat'] - city['lat']) / 2) ** 2
         + math.cos(math.radians(city['lat'])) * math.cos(math.radians(gateway['lat'])) * math.sin(math.radians(gateway['lon'] - city['lon']) / 2) ** 2))
    if km > GATEWAY_MAX_KM:
        raise Hold(f'gateway lies {km:.1f} km from the place; at most {GATEWAY_MAX_KM} km')
    return {'id': seed['id'] + '-airport', 'name': gateway['name'], **coordinate(gateway['lon'], gateway['lat']),
            'sourceUrl': 'https://www.openstreetmap.org/' + seed['gateway']['osmRef']}

# The two accepted dataset sources (README-batch.md "Pinned extract mirror"). Both name the snapshot as -YYMMDD in the file name.
# 1. A dated official Geofabrik country or region file.
# 2. A pinned mirror copy of a small extract that Geofabrik does not publish (an undated download.openstreetmap.fr file):
#    an asset of an `extracts-YYYYMMDD` release of the public kromate/joinallworld repository. Nothing else.
# offline-extract.py, country-boundary.py, batch-run.py and dataset-url.mjs repeat MIRROR_DATASET_URL; test_dataset_url.py keeps the copies equal.
GEOFABRIK_DATASET_URL = r'https://download\.geofabrik\.de/(?:[a-z0-9-]+/)*[a-z0-9-]+-[0-9]{6}\.osm\.pbf'
MIRROR_DATASET_URL = r'https://github\.com/kromate/joinallworld/releases/download/extracts-[0-9]{8}/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{6}\.osm\.pbf'

def validate_dataset_url(value):
    if not isinstance(value, str) or not (re.fullmatch(GEOFABRIK_DATASET_URL, value) or re.fullmatch(MIRROR_DATASET_URL, value)):
        raise Hold('dated official Geofabrik PBF URL or pinned kromate/joinallworld extracts-YYYYMMDD release asset required')
    # The anchored path grammar excludes traversal, encoded paths, queries and fragments.
    return value

def choose_city(nodes, seed, selector=None):
    matches = [node for node in nodes if city_node_tag_ok(node['tags'], seed) and any(normalized(node['tags'].get(key, '')) == normalized(seed['name']) for key in ('name', 'name:en'))]
    selected_ref = selector if selector is not None else seed.get('cityOsmRef')
    if selected_ref is not None:
        eligible = [node for node in matches if node.get('ref') == selected_ref]
        if len(eligible) != 1:
            raise Hold('explicit city reference is missing or ambiguous among matching named city/town nodes')
        return eligible[0]
    capitals = [node for node in matches if node['tags'].get('capital') in {'yes', '2'}]
    eligible = capitals or matches
    # A profile with more city place tags (microstate: village, hamlet, locality) prefers the highest tag in its list when several nodes share the name.
    tags = profile_rules(seed)['cityPlaceTags']
    if len(eligible) > 1 and tags != PROFILES['standard']['cityPlaceTags']:
        rank = lambda node: tags.index(node['tags']['place']) if node['tags']['place'] in tags else len(tags)
        best = min(map(rank, eligible))
        eligible = [node for node in eligible if rank(node) == best]
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
        # hubWaiver (a country with no scheduled-service airport: Monaco, Liechtenstein, Andorra, San Marino): the country's own named heliport or airfield in the pinned CSV is the game's air hub.
        # Airport records never establish operations (facts.coverageNote), so the venue stays a game hub; the written reason is kept in the receipts.
        waived = 'hubWaiver' in selection
        # countryOverride (Aland AX, whose airport OurAirports files under FI): the named row may carry the override's OurAirports country instead of the
        # seed's. Every other rule (type, scheduled service, name) is unchanged, and batch-run.py requires the airport point to lie inside the exact territory boundary.
        airport_country = selection['countryOverride']['iso'] if 'countryOverride' in selection else seed['countryISO']
        if row.get('iso_country') != airport_country or row.get('type') not in ({**types, 'heliport': 0, 'seaplane_base': 0} if waived else types) or (row.get('scheduled_service') != 'yes' and not waived) or not row.get('name'):
            raise Hold('explicit airport must be a named same-country scheduled-service airport (or carry a hubWaiver)')
        if waived and any(r.get('iso_country') == seed['countryISO'] and r.get('scheduled_service') == 'yes' and r.get('type') in types for _, r in rows):
            raise Hold('hubWaiver refused: the country has a scheduled-service airport')
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
        if {'gateway', 'timezoneOverride', 'countryName'} & set(seed):
            raise Hold('gateway, timezoneOverride and countryName seeds run through metadata-batch.py (batch-run.py)')
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
                if city_node_tag_ok(tags, seed) and any(normalized(tags.get(key, '')) == expected_name for key in ('name', 'name:en')):
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
        extraction_input = {'city': {'id': seed['id'], 'name': display_name}, 'boxes': bounds['boxes'], 'waterRecipe': water, **road_fallback_input(seed)}
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
