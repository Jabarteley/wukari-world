"""Outpost and wilderness rules (OUTPOST-PLAN 13 Oct 2026): profiles, gateway seeds, timezoneOverride, countryName, authored links, the
profile-only extraction filters of offline-extract.py, the Antarctic Treaty scope and disputed relations of country-boundary.py.

Run: python3 -I scripts/geo/factory/bootstrap/test_outposts.py  (osmium==4.3.1 and shapely==2.1.2 for the PBF tests; without them only the
seed, profile and table tests run). Synthetic PBFs only, written to a temporary directory.
"""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
ADAPTER = HERE.parents[1] / 'offline-extract.py'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


metadata = load('outpost_metadata', HERE / 'metadata.py')
batch = load('outpost_batch_run', HERE / 'batch-run.py')
try:
    import osmium
    import shapely  # noqa: F401
    adapter = load('outpost_adapter', ADAPTER)
except ImportError:
    osmium = adapter = None

PROFILES = json.loads((HERE / 'profiles.json').read_text())['profiles']
STAMP = '2026-10-12T20:21:06Z'
URL = 'https://download.geofabrik.de/antarctica-261012.osm.pbf'
REASON = 'Reviewed for the outpost plan of 13 October 2026 (test fixture).'
GATEWAY = {'osmRef': 'node/9392374700', 'mode': 'sea', 'sourceUrl': 'https://www.openstreetmap.org/node/9392374700'}


def seed(**extra):
    return {'id': 'adamstown', 'name': 'Adamstown', 'countryISO': 'PN', 'profile': 'outpost', 'gateway': GATEWAY, **extra}


class OutpostProfiles(unittest.TestCase):
    def test_numbers_and_rules(self):
        outpost, wilderness = PROFILES['outpost'], PROFILES['wilderness']
        self.assertEqual([outpost['minimumPlaces'], outpost['minimumNeighbourhoodLabels'], outpost['maximumEmptySlots']], [3, 2, 9])
        self.assertIn('isolated_dwelling', outpost['cityPlaceTags'])
        self.assertEqual([wilderness['minimumPlaces'], wilderness['minimumNeighbourhoodLabels'], wilderness['maximumEmptySlots']], [0, 2, 9])
        self.assertTrue(wilderness['requiresCityOsmRef'])
        self.assertEqual(outpost['extraction']['extraPlaces'], ['post_office', 'hut', 'research', 'historic', 'ferry'])
        self.assertIn('natural', wilderness['extraction']['extraPlaces'])
        for name in ('outpost', 'wilderness'):
            rules = PROFILES[name]
            self.assertTrue(rules['hubGateway'] and rules['authoredLinks'])
            self.assertTrue(rules['extraction']['allowNoRoads'] and rules['extraction']['excludeSensitive'])
            self.assertEqual(rules['extraction']['roadLadder'][-1], 'track')
        for name in ('standard', 'microstate'):
            self.assertFalse({'extraction', 'hubGateway', 'authoredLinks', 'slotExtras', 'cityNaturalTags'} & set(PROFILES[name]), name + ' is unchanged')

    @unittest.skipIf(adapter is None, 'osmium/shapely not installed')
    def test_every_profile_extraction_is_accepted_by_the_adapter(self):
        for name, rules in PROFILES.items():
            if 'extraction' in rules:
                self.assertEqual(adapter.validate_profile_extraction({'profile': name, **rules['extraction']})['profile'], name)
        for bad in ({'profile': 'outpost', 'extraPlaces': ['shop'], 'roadLadder': [], 'allowNoRoads': True, 'excludeSensitive': True},
                    {'profile': 'outpost', 'extraPlaces': [], 'roadLadder': ['path'], 'allowNoRoads': True, 'excludeSensitive': True},
                    {'profile': 'outpost', 'extraPlaces': [], 'roadLadder': [], 'allowNoRoads': True, 'excludeSensitive': False},
                    {'profile': 'outpost', 'extraPlaces': [], 'roadLadder': [], 'allowNoRoads': True}):
            with self.subTest(bad), self.assertRaises(adapter.ExtractionError):
                adapter.validate_profile_extraction(bad)


class OutpostSeeds(unittest.TestCase):
    def test_gateway_seed(self):
        metadata.validate_seed(seed())
        cases = {
            'standard profile': seed(profile=None),
            'microstate profile': seed(profile='microstate'),
            'with an airport too': seed(airport={'ident': 'X', 'sourceUrl': 'https://example.org/'}),
            'way gateway': seed(gateway={**GATEWAY, 'osmRef': 'way/1'}),
            'boat mode': seed(gateway={**GATEWAY, 'mode': 'boat'}),
            'missing sourceUrl': seed(gateway={'osmRef': GATEWAY['osmRef'], 'mode': 'sea'}),
            'http sourceUrl': seed(gateway={**GATEWAY, 'sourceUrl': 'http://example.org/'}),
        }
        for label, value in cases.items():
            value = {key: item for key, item in value.items() if item is not None}
            with self.subTest(label), self.assertRaises(metadata.Hold):
                metadata.validate_seed(value)

    def test_wilderness_names_its_place_by_osm_ref(self):
        base = {'id': 'siachen', 'name': 'Indira Col', 'countryISO': 'XG', 'profile': 'wilderness', 'gateway': {**GATEWAY, 'mode': 'land'}}
        with self.assertRaises(metadata.Hold):
            metadata.validate_seed(base)
        metadata.validate_seed({**base, 'cityOsmRef': 'node/1'})

    def test_timezone_override(self):
        zones = (HERE / 'timezone-data/zone1970.tab').read_text().splitlines()
        override = {'id': 'Etc/GMT-5', 'reason': REASON, 'sourceUrl': 'https://data.iana.org/time-zones/tzdb-2026e/etcetera'}
        hm = {'id': 'atlas-cove', 'name': 'Atlas Cove', 'countryISO': 'HM', 'profile': 'outpost', 'gateway': {**GATEWAY, 'mode': 'air'}, 'timezoneOverride': override}
        metadata.validate_seed(hm)
        self.assertEqual(metadata.choose_seed_timezone(zones, hm), ('Etc/GMT-5', []))
        with self.assertRaises(metadata.Hold):   # HM has no zone1970 row: without the override it holds
            metadata.choose_seed_timezone(zones, {key: value for key, value in hm.items() if key != 'timezoneOverride'})
        # Any pinned zone1970 zone is accepted (a station keeps another zone than its country row); an invented one is refused.
        self.assertEqual(metadata.choose_seed_timezone(zones, {**hm, 'timezoneOverride': {**override, 'id': 'Antarctica/Palmer'}})[0], 'Antarctica/Palmer')
        for bad in ('Etc/GMT-15', 'Mars/Olympus', 'etc/gmt-5', ''):
            with self.subTest(bad), self.assertRaises(metadata.Hold):
                metadata.choose_seed_timezone(zones, {**hm, 'timezoneOverride': {**override, 'id': bad}})
        for bad in ({**override, 'reason': 'short'}, {'id': 'Etc/GMT-5', 'reason': REASON}):
            with self.subTest(bad), self.assertRaises(metadata.Hold):
                metadata.validate_seed({**hm, 'timezoneOverride': bad})
        with self.assertRaises(metadata.Hold):
            metadata.validate_seed({**hm, 'timezone': {'id': 'Indian/Kerguelen', 'sourceUrl': 'https://example.org/'}})
        # A country with its own row is unchanged: the selector picks the station's zone from the AQ rows.
        aq = {'id': 'x', 'name': 'X', 'countryISO': 'AQ', 'timezone': {'id': 'Antarctica/Palmer', 'sourceUrl': 'https://example.org/'}}
        self.assertEqual(metadata.choose_seed_timezone(zones, aq)[0], 'Antarctica/Palmer')

    def test_country_name_of_a_user_assigned_code(self):
        countries = (HERE / 'timezone-data/iso3166.tab').read_text().splitlines()
        name = {'name': 'Siachen Glacier', 'reason': REASON}
        self.assertEqual(metadata.seed_country_name(countries, {'countryISO': 'XG', 'countryName': name}), 'Siachen Glacier')
        self.assertEqual(metadata.seed_country_name(countries, {'countryISO': 'PN'}), 'Pitcairn')
        with self.assertRaises(metadata.Hold):
            metadata.seed_country_name(countries, {'countryISO': 'XG'})
        for bad in ({'countryISO': 'PN', 'countryName': name}, {'countryISO': 'XG', 'countryName': {'name': 'Siachen Glacier', 'reason': 'short'}}):
            with self.subTest(bad), self.assertRaises(metadata.Hold):
                metadata.validate_seed({'id': 'x', 'name': 'X', **bad})

    def test_gateway_node_rules(self):
        node = lambda **tags: {'ref': 'node/1', 'tags': tags, 'lon': -130.1, 'lat': -25.07}
        landing = node(name='Pitcairn', amenity='ferry_terminal', public_transport='station')
        self.assertEqual(metadata.gateway_record(landing, seed())['name'], 'Pitcairn')
        for label, value, mode in (('unnamed', node(amenity='ferry_terminal'), 'sea'), ('not a landing', node(name='Shop', shop='general'), 'sea'),
                                   ('military landing', node(name='Base Pier', man_made='pier', military='naval_base'), 'sea'),
                                   ('military airfield', node(name='Field', aeroway='aerodrome', landuse='military'), 'air'),
                                   ('a helipad is not a sea gateway', node(name='Pad', aeroway='helipad'), 'sea')):
            with self.subTest(label), self.assertRaises(metadata.Hold):
                metadata.gateway_record(value, seed(gateway={**GATEWAY, 'mode': mode}))
        self.assertEqual(metadata.gateway_record(node(name='Pad', aeroway='helipad'), seed(gateway={**GATEWAY, 'mode': 'air'}))['name'], 'Pad')
        city = {'lon': -130.1, 'lat': -25.066}
        facts = metadata.gateway_facts(seed(), metadata.gateway_record(landing, seed()), city)
        self.assertEqual(facts, {'id': 'adamstown-airport', 'name': 'Pitcairn', 'lon': -130.1, 'lat': -25.07, 'sourceUrl': 'https://www.openstreetmap.org/node/9392374700'})
        with self.assertRaises(metadata.Hold):
            metadata.gateway_facts(seed(), metadata.gateway_record(landing, seed()), {'lon': -130.1, 'lat': -24.5})

    def test_city_nodes_of_the_new_profiles(self):
        outpost, wilderness, standard = {'profile': 'outpost'}, {'profile': 'wilderness'}, {}
        self.assertTrue(metadata.city_node_tag_ok({'place': 'isolated_dwelling'}, outpost))
        self.assertFalse(metadata.city_node_tag_ok({'place': 'isolated_dwelling'}, standard))
        self.assertFalse(metadata.city_node_tag_ok({'place': 'village', 'military': 'base'}, outpost), 'a military post is never the place')
        self.assertTrue(metadata.city_node_tag_ok({'place': 'village', 'military': 'base'}, {'profile': 'microstate'}), 'microstate is unchanged')
        self.assertTrue(metadata.city_node_tag_ok({'natural': 'glacier'}, wilderness))
        self.assertTrue(metadata.city_node_tag_ok({'mountain_pass': 'yes'}, wilderness))
        self.assertFalse(metadata.city_node_tag_ok({'natural': 'glacier'}, outpost))
        self.assertFalse(metadata.city_node_tag_ok({'natural': 'tree'}, wilderness))


def outpost_table(**seed_changes):
    table = json.loads((HERE.parent / 'country-tables/sr.json').read_text())
    table['countrySource'] = {'url': 'https://download.geofabrik.de/australia-oceania/pitcairn-islands-261011.osm.pbf', 'bytes': 1000, 'md5': 'a' * 32, 'snapshotDate': '2026-10-11'}
    table['seeds'] = [{**seed(), 'links': [{'to': 'auckland', 'kind': 'ship'}, {'to': 'santiago', 'kind': 'ship'}], **seed_changes}]
    return table


class OutpostTables(unittest.TestCase):
    def test_outpost_table_validates_and_checks_offline(self):
        seeds, _, _ = batch.validate(outpost_table())
        self.assertEqual(batch.links_policy(seeds[0]), {'links': [{'to': 'auckland', 'kind': 'ship'}, {'to': 'santiago', 'kind': 'ship'}]})
        manifest, files = batch.timezone_source_files()
        report = batch.check_seeds_offline(seeds, files['zone1970'][0], files['iso3166'][0])
        self.assertEqual([report[0]['status'], report[0]['timezone'], report[0]['airportSelector']], ['OK', 'Pacific/Pitcairn', 'sea gateway node/9392374700'])

    def test_links_rules(self):
        cases = {
            'one link': [{'to': 'auckland', 'kind': 'ship'}],
            'five links': [{'to': f'c{index}', 'kind': 'ship'} for index in range(5)],
            'lagos is added by the app': [{'to': 'lagos', 'kind': 'charter'}, {'to': 'santiago', 'kind': 'ship'}],
            'unknown kind': [{'to': 'auckland', 'kind': 'rail'}, {'to': 'santiago', 'kind': 'ship'}],
            'extra key': [{'to': 'auckland', 'kind': 'ship', 'fare': 1}, {'to': 'santiago', 'kind': 'ship'}],
            'twice': [{'to': 'auckland', 'kind': 'ship'}, {'to': 'auckland', 'kind': 'ship'}],
            'charters only (no homeward feeder leg)': [{'to': 'auckland', 'kind': 'charter'}, {'to': 'santiago', 'kind': 'charter'}],
        }
        for label, links in cases.items():
            with self.subTest(label), self.assertRaises(ValueError):
                batch.validate(outpost_table(links=links))
        batch.validate(outpost_table(links=[{'to': 'auckland', 'kind': 'charter'}, {'to': 'santiago', 'kind': 'overland'}]))
        with self.assertRaises(ValueError):   # an outpost needs its links
            batch.validate(outpost_table(links=None) | {'seeds': [{key: value for key, value in outpost_table()['seeds'][0].items() if key != 'links'}]})
        standard = json.loads((HERE.parent / 'country-tables/sr.json').read_text())
        standard['seeds'][0]['links'] = [{'to': 'georgetown', 'kind': 'ship'}, {'to': 'cayenne', 'kind': 'ship'}]
        with self.assertRaises(ValueError):   # links are only for the outpost profiles
            batch.validate(standard)

    def test_existing_tables_are_unchanged(self):
        # Every committed country table still validates and gives no links, gateway or override (their source jobs are unchanged).
        for path in sorted((HERE.parent / 'country-tables').glob('*.json')):
            table = json.loads(path.read_text())
            if table.get('schemaVersion') != 2:
                continue
            with self.subTest(path.name):
                try:
                    seeds, _, _ = batch.validate(table)
                except ValueError as error:
                    self.fail(f'{path.name}: {error}')
                for item in seeds:
                    self.assertEqual(batch.links_policy(item), {})
                    self.assertFalse({'gateway', 'timezoneOverride', 'countryName'} & set(item))


def write_pbf(path, objects):
    header = osmium.io.Header()
    header.set('osmosis_replication_timestamp', STAMP)
    with osmium.SimpleWriter(str(path), header=header) as writer:
        for obj in objects:
            {'Node': writer.add_node, 'Way': writer.add_way, 'Relation': writer.add_relation}[type(obj).__name__](obj)


def n(id_, lon, lat, **tags):
    return osmium.osm.mutable.Node(id=id_, version=1, location=(lon, lat), tags=tags, timestamp=STAMP)


def w(id_, refs, **tags):
    return osmium.osm.mutable.Way(id=id_, version=1, nodes=refs, tags=tags, timestamp=STAMP)


def r(id_, members, **tags):
    return osmium.osm.mutable.Relation(id=id_, version=1, members=members, tags=tags, timestamp=STAMP)


def outpost_objects():
    places = [n(1, 0.0, 0.0, place='village', name='Post'), n(2, 0.01, 0.0, amenity='post_office', name='Post Office'),
              n(3, 0.02, 0.0, office='research', name='Base Station'), n(4, 0.03, 0.0, amenity='restaurant', military='base', name='Mess'),
              n(5, 0.04, 0.0, aeroway='helipad', name='Helipad'), n(6, 0.05, 0.0, natural='peak', name='Mount Test'),
              n(7, 0.06, 0.0, historic='wreck', name='Old Wreck'), n(8, 0.07, 0.0, tourism='wilderness_hut', name='Hut'),
              n(9, 0.08, 0.0, amenity='ferry_terminal', name='Landing'), n(10, 0.09, 0.0, amenity='cafe', name='Cafe')]
    road_nodes = [n(20 + index, lon, lat) for index, (lon, lat) in enumerate(
        [(0.1, 0.1), (0.15, 0.1), (0.1, 0.12), (0.15, 0.12), (0.1, 0.14), (0.15, 0.14), (0.1, 0.16), (0.15, 0.16), (0.5, 0.5), (0.6, 0.6)])]
    area_nodes = [n(30 + index, lon, lat) for index, (lon, lat) in enumerate(
        [(0.3, 0.3), (0.32, 0.3), (0.32, 0.32), (0.3, 0.32), (0.4, 0.4), (0.42, 0.4), (0.42, 0.42), (0.4, 0.42), (-0.3, -0.3), (-0.28, -0.3), (-0.28, -0.28), (-0.3, -0.28)])]
    ways = [w(101, [20, 21], highway='track'), w(102, [22, 23], highway='tertiary'), w(103, [24, 25], highway='service', military='yes'),
            w(104, [26, 27], highway='primary'), w(105, [28, 29], highway='secondary', name='Sec Road'),
            w(106, [30, 31, 32, 33, 30], landuse='military'), w(107, [34, 35, 36, 37, 34], landuse='residential'),
            w(108, [38, 39, 40, 41, 38])]
    return [*places, *road_nodes, *area_nodes, *ways, r(200, [('w', 108, 'outer')], type='multipolygon', office='research', name='Lab Area')]


BOXES = {'play': [-1, -1, 1, 1], 'core': [-0.2, -0.2, 0.2, 0.2], 'outline': [-1.1, -1.1, 1.1, 1.1], 'wide': [-1.5, -1.5, 1.5, 1.5]}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class ProfileExtraction(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='outpost-extract-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'country.osm.pbf'
        write_pbf(self.pbf, outpost_objects())
        data = self.pbf.read_bytes()
        self.pins = ['--dataset-url', URL, '--dataset-bytes', str(len(data)), '--dataset-md5', hashlib.md5(data).hexdigest(), '--dataset-sha256', hashlib.sha256(data).hexdigest()]

    def tearDown(self):
        self.tmp.cleanup()

    def extract(self, label, profile=None):
        source = {'city': {'id': 'post', 'name': 'Post'}, 'boxes': BOXES, 'waterRecipe': {'kind': 'inland', 'wideWater': False, 'reviewRequired': False}}
        if profile:
            source['profileExtraction'] = {'profile': profile, **PROFILES[profile]['extraction']}
        path = self.dir / f'{label}.source.json'
        path.write_text(json.dumps(source))
        done = subprocess.run([sys.executable, str(ADAPTER), str(self.pbf), str(path), *self.pins, '--output-root', str(self.dir / label)], capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)
        layers = {name: json.loads((self.dir / label / 'post' / f'{name}.json').read_text()) for name in ('places', 'extras', 'water', 'landuse', 'roads')}
        return layers, {name: sorted(f"{element['type'][0]}{element['id']}" for element in layer['elements']) for name, layer in layers.items()}

    def test_standard_extraction_is_unchanged(self):
        layers, ids = self.extract('standard')
        self.assertEqual(ids['places'], ['n1', 'n10', 'n4'])
        self.assertEqual(ids['roads'], ['w104'])
        self.assertEqual(ids['landuse'], ['w106', 'w107'])
        self.assertEqual(ids['extras'], [])
        for name, layer in layers.items():
            self.assertNotIn('profileExtraction', layer['source'])
            self.assertTrue(layer['source']['filter'].startswith('queries.ts ' + {'places': 'placesQuery', 'extras': 'extrasQuery', 'water': 'inlandWaterQuery',
                                                                                     'landuse': 'landuseQuery', 'roads': 'roadsQuery'}[name]), name)
        self.assertEqual(layers['roads']['source']['selectionBounds'], {'major': BOXES['play'], 'namedSecondary': BOXES['core']})

    def test_outpost_adds_its_filters_and_drops_sensitive_features(self):
        layers, ids = self.extract('outpost', 'outpost')
        self.assertEqual(ids['places'], ['n1', 'n10', 'n2', 'n3', 'n7', 'n8', 'n9', 'r200'], 'post office, research, historic, hut, ferry; never the military restaurant or the helipad')
        self.assertEqual(ids['roads'], ['w101', 'w102', 'w104', 'w105'], 'the ladder down to tracks over the play box; never the military service road')
        self.assertEqual(ids['landuse'], ['w107'], 'landuse=military is never drawn')
        self.assertEqual(layers['places']['source']['profileExtraction']['profile'], 'outpost')
        self.assertIn('profilePlacesQuery', layers['places']['source']['filter'])
        self.assertEqual(layers['roads']['source']['selectionBounds'], BOXES['play'])

    def test_wilderness_takes_natural_names(self):
        _, ids = self.extract('wilderness', 'wilderness')
        self.assertEqual(ids['places'], ['n1', 'n10', 'n6', 'n7', 'n8'])


TREATY_RING = [[-180, -90], [-90, -90], [0, -90], [90, -90], [180, -90], [180, -60], [90, -60], [0, -60], [-90, -60], [-180, -60], [-180, -90]]
NODE_CHECK = r"""
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadCountryScope } from './country-scope.mjs';
const [dir, sha, iso, relation, a, b] = process.argv.slice(1);
const raw = readFileSync(dir + '/receipt.json'), geo = readFileSync(dir + '/boundary.geojson'), receipt = JSON.parse(raw);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const policy = { kind: 'osm-admin0-boundary-v1', countryISO: iso, datasetSha256: sha, receiptSha256: hash(raw), receiptBytes: raw.length,
  geometrySha256: hash(geo), geometryBytes: geo.length, scriptSha256: receipt.scriptSha256, directory: dir,
  ...(relation === 'treaty' ? { treatyScope: 'antarctic-treaty-area' } : { relationId: Number(relation) }) };
const scope = loadCountryScope('/', policy, iso.toLowerCase(), sha);
console.log(scope.classify(JSON.parse(a)), scope.classify(JSON.parse(b)));
"""


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class BoundaryScopes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='outpost-boundary-test-')
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, objects, country, evidence):
        pbf = self.dir / f'{name}.osm.pbf'
        write_pbf(pbf, objects)
        sha = hashlib.sha256(pbf.read_bytes()).hexdigest()
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', country, '--expected-sha256', sha,
                   '--expected-bytes', str(pbf.stat().st_size), '--dataset-url', URL, '--dataset-date', '2026-10-12', '--out', str(self.dir / name)]
        if evidence is not None:
            path = self.dir / f'{name}-evidence.json'
            path.write_text(json.dumps({'schemaVersion': 1, 'countryISO': country, 'datasetSha256': sha, **evidence}))
            command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text()), sha

    def node_check(self, name, sha, iso, relation, a, b):
        return subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / name), sha, iso, relation, json.dumps(a), json.dumps(b)],
                              capture_output=True, text=True, cwd=HERE.parent)

    def test_antarctic_treaty_scope(self):
        objects = [n(446987858, -58.98, -62.19, place='village', name='Villa Las Estrellas')]
        done, result, sha = self.run_boundary('aq', objects, 'AQ', {'treatyScope': {'kind': 'antarctic-treaty-area', 'reason': REASON}})
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'aq/receipt.json').read_text())
        self.assertEqual([receipt['status'], receipt['relation'], receipt['treatyScope']['kind'], receipt['treatyScope']['southOfLatitude']],
                         ['OSM_COUNTRY_BOUNDARY_CANDIDATE', None, 'antarctic-treaty-area', -60])
        self.assertEqual(json.loads((self.dir / 'aq/boundary.geojson').read_text()), {'type': 'Polygon', 'coordinates': [TREATY_RING]})
        # Villa Las Estrellas lies inside the treaty area; Stanley (51.7 S) does not.
        check = self.node_check('aq', sha, 'AQ', 'treaty', [-58.98, -62.19], [-57.86, -51.69])
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertEqual(check.stdout.strip(), 'inside outside')
        refused = self.node_check('aq', sha, 'AQ', '1', [-58.98, -62.19], [-57.86, -51.69])
        self.assertNotEqual(refused.returncode, 0, 'a treaty receipt is never read as a relation scope')

    def test_treaty_scope_refusals(self):
        objects = [n(1, -58.98, -62.19, place='village', name='Villa Las Estrellas')]
        cases = {
            'another country': ('AA', {'treatyScope': {'kind': 'antarctic-treaty-area', 'reason': REASON}}),
            'short reason': ('AQ', {'treatyScope': {'kind': 'antarctic-treaty-area', 'reason': 'short'}}),
            'another kind': ('AQ', {'treatyScope': {'kind': 'arctic', 'reason': REASON}}),
            'with relation evidence': ('AQ', {'treatyScope': {'kind': 'antarctic-treaty-area', 'reason': REASON},
                                              'admin0RelationOverride': {'relationId': 1, 'expectedTags': {'name': 'x'}, 'reason': REASON}}),
        }
        for label, (country, evidence) in cases.items():
            with self.subTest(label):
                done, result, _ = self.run_boundary(label.replace(' ', '-'), objects, country, evidence)
                self.assertNotEqual(done.returncode, 0)
                self.assertEqual(result['status'], 'HOLD')
        done, result, _ = self.run_boundary('no-evidence', objects, 'AQ', None)
        self.assertNotEqual(done.returncode, 0, 'without the treaty evidence Antarctica holds as before (no admin-0 relation)')

    def disputed_objects(self):
        tags = {'type': 'boundary', 'boundary': 'disputed', 'admin_level': '2', 'name': 'Test Glacier'}
        return [n(1, 76.8, 35.5), n(2, 77.0, 35.5), n(3, 77.0, 35.7), n(4, 76.8, 35.7),
                w(11, [1, 2, 3], boundary='disputed'), w(12, [3, 4, 1], boundary='disputed'),
                r(13790690, [('w', 11, 'outer'), ('w', 12, 'outer')], **tags)], tags

    def test_disputed_relation_under_a_user_assigned_code(self):
        objects, tags = self.disputed_objects()
        override = {'relationId': 13790690, 'expectedTags': tags, 'reason': REASON, 'userAssignedCode': True, 'disputed': True}
        done, result, sha = self.run_boundary('xg', objects, 'XG', {'admin0RelationOverride': override})
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'xg/receipt.json').read_text())
        self.assertTrue(receipt['relationOverride']['disputed'])
        check = self.node_check('xg', sha, 'XG', '13790690', [76.9, 35.62], [76.5, 35.62])
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertEqual(check.stdout.strip(), 'inside outside')
        for label, change in (('without the disputed flag', {'disputed': None}), ('disputed without userAssignedCode', {'userAssignedCode': None}),
                              ('disputed needs boundary=disputed', {'expectedTags': {**tags, 'boundary': 'administrative'}}),
                              ('disputed needs a name', {'expectedTags': {key: value for key, value in tags.items() if key != 'name'}})):
            with self.subTest(label):
                value = {key: item for key, item in {**override, **change}.items() if item is not None}
                held, result, _ = self.run_boundary(label.replace(' ', '-'), objects, 'XG', {'admin0RelationOverride': value})
                self.assertNotEqual(held.returncode, 0)
                self.assertEqual(result['status'], 'HOLD')


if __name__ == '__main__':
    unittest.main()
