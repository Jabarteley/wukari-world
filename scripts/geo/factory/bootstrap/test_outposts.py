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
        # 14 Oct 2026 (Chagos, Ashmore): a wilderness seed may name a closed island or islet way; its centre is a point inside it.
        wild = {'id': 'w', 'name': 'East Island', 'countryISO': 'XA', 'profile': 'wilderness', 'gateway': GATEWAY, 'cityOsmRef': 'way/9'}
        metadata.validate_seed(wild)
        for other in ({**wild, 'profile': 'outpost'}, {**wild, 'profile': 'microstate'}, {key: value for key, value in wild.items() if key not in ('profile', 'gateway')}):
            with self.subTest(other), self.assertRaises(metadata.Hold):
                metadata.validate_seed(other)
        ring = [(123.0, -12.0), (123.01, -12.0), (123.01, -12.01), (123.0, -12.01), (123.0, -12.0)]
        record = metadata.city_way_record(9, {'name': 'East Island', 'place': 'islet'}, ring, wild)
        self.assertEqual(record['ref'], 'way/9')
        from shapely.geometry import Point, Polygon
        self.assertTrue(Polygon(ring).contains(Point(record['lon'], record['lat'])))
        self.assertEqual(metadata.choose_city([record], wild), record)
        for label, tags, points, value in (('not an island', {'name': 'East Island', 'natural': 'reef'}, ring, wild),
                                          ('open ring', {'name': 'East Island', 'place': 'islet'}, ring[:-1], wild),
                                          ('military', {'name': 'East Island', 'place': 'islet', 'military': 'base'}, ring, wild),
                                          ('outpost', {'name': 'East Island', 'place': 'islet'}, ring, {**wild, 'profile': 'outpost'})):
            with self.subTest(label), self.assertRaises(metadata.Hold):
                metadata.city_way_record(9, tags, points, value)

    def test_wilderness_sea_gateway_on_a_natural_feature(self):
        # 14 Oct 2026 (Chagos, Ashmore): no landing is mapped, so a wilderness sea gateway may be a named natural sea feature.
        node = lambda ref='node/1', **tags: {'ref': ref, 'tags': tags, 'lon': 71.75, 'lat': -5.39}
        wild = lambda **gateway: {'id': 'w', 'name': 'W', 'countryISO': 'IO', 'profile': 'wilderness', 'cityOsmRef': 'node/2', 'gateway': {**GATEWAY, **gateway}}
        channel = node(name='Passe de Ile Poule', place='locality', subsea='channel')
        self.assertEqual(metadata.gateway_record(channel, wild())['name'], 'Passe de Ile Poule')
        for tags in ({'place': 'islet'}, {'natural': 'reef'}, {'mooring': 'yes'}):
            self.assertEqual(metadata.gateway_record(node(name='X', **tags), wild())['name'], 'X')
        for label, record, value in (('outpost keeps GATEWAY_TAGS', channel, seed()),
                                     ('land mode', channel, wild(mode='land')), ('unnamed', node(subsea='channel'), wild()),
                                     ('military', node(name='X', place='islet', military='base'), wild()),
                                     ('not a sea feature', node(name='X', natural='peak'), wild())):
            with self.subTest(label), self.assertRaises(metadata.Hold):
                metadata.gateway_record(record, value)
        # featureRef: an unnamed vertex of a named islet coastline way.
        featured = wild(featureRef='way/9')
        metadata.validate_seed(featured)
        islet = {'ref': 'way/9', 'tags': {'name': 'East Island', 'place': 'islet', 'natural': 'coastline'}, 'nodeRefs': ['node/1', 'node/3']}
        self.assertEqual(metadata.gateway_record({**node(), 'feature': islet}, featured)['name'], 'East Island')
        for label, record in (('absent way', node()), ('not a vertex', {**node('node/4'), 'feature': islet}),
                              ('unnamed way', {**node(), 'feature': {**islet, 'tags': {'place': 'islet'}}}),
                              ('not natural', {**node(), 'feature': {**islet, 'tags': {'name': 'Road', 'highway': 'track'}}}),
                              ('military way', {**node(), 'feature': {**islet, 'tags': {**islet['tags'], 'military': 'base'}}})):
            with self.subTest(label), self.assertRaises(metadata.Hold):
                metadata.gateway_record(record, featured)
        for bad in (wild(featureRef='node/9'), wild(featureRef='way/9', mode='land'), {**seed(), 'gateway': {**GATEWAY, 'featureRef': 'way/9'}}):
            with self.subTest(bad), self.assertRaises(metadata.Hold):
                metadata.validate_seed(bad)


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
                    if item.get('profile') in ('outpost', 'wilderness'):
                        continue  # the outpost tables themselves (aq, gs, hm, pn, tf, ...) carry links, gateways and overrides by design
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


GOLDEN_KNOB_OFF = {
    'outpost-fixture-standard': {
        'places': '8d6ccbace4813566ebb8067e49ab23524ce9de68dbfe7c6c4e44d056255b4be8',
        'extras': 'ca849b6d225ea884b0509cdaf9f216e0b47b7281cc549ddee211925d70497fd2',
        'water': 'fc0d8c06e0d41096e454450e70ead3bc2f35cf3c9bd60613e24ff600f652897f',
        'landuse': '8a865729b74ede99f37ecab89dc33202d70ee21a39755df1bce7af9d5f47ce0e',
        'roads': '7f710fdc3755b47e148f52254ac048325b05b691b90eba0d89dd082852e355db'
    },
    'roadpoor-fixture-standard': {
        'places': '3887ebe28ccc4eb57c1051620b9c0e86c44f35a9e756412ea923a7908f8d14e8',
        'extras': '91d1db01488f62cb503e366610be5b897f9455c994583e0cf76779d5513c0292',
        'water': '91cdfbbe5f1663fa4e91742c5683ae94abdd342b497875b5210fbb35ea06c60a',
        'landuse': 'f0475005402e2eb3779baa730f6a392b1732597f9d3d791e6773a8c78d028aad',
        'roads': '058ff4cbbb548ea80fafbb4105d0263b33c26f76b167a0160a6545ee59bde714'
    }
}
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



def roadpoor_objects(tertiary=4, unclassified=0, residential=0, primary=0, military_tertiary=0):
    """A village with only minor roads (Wallis and Futuna, Saint Helena): `primary` ways of class primary, `tertiary` ... inside the play box, one far outside it."""
    nodes, ways, node_id, way_id = [n(1, 0.0, 0.0, place='village', name='Post')], [], 1000, 2001
    for highway, count, extra in (('primary', primary, {}), ('tertiary', tertiary, {}), ('unclassified', unclassified, {}), ('residential', residential, {}),
                                  ('tertiary', military_tertiary, {'military': 'yes'}), ('tertiary', 1, {'far': 'yes'}), ('service', 2, {}), ('track', 2, {})):
        for index in range(count if 'far' not in extra else 1):
            lat = 0.05 * (way_id - 2000) if 'far' not in extra else 5.0
            nodes += [n(node_id, 0.1, lat), n(node_id + 1, 0.2, lat)]
            tags = {'highway': highway, **{key: value for key, value in extra.items() if key != 'far'}}
            ways.append(w(way_id, [node_id, node_id + 1], **tags))
            node_id, way_id = node_id + 2, way_id + 1
    return [*nodes, *ways]


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class RoadFallbackExtraction(unittest.TestCase):
    """Seed `roadLadder: true` (roadFallback in source-input.json): tertiary, then unclassified and residential, only when the standard
    classes give fewer than minWays ways in the play box. Knob off (every existing city): the extraction is byte-identical to before."""
    FALLBACK = {'minWays': 3}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='road-fallback-test-')
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def extract(self, label, objects, **source_extra):
        pbf = self.dir / f'{label}.osm.pbf'
        write_pbf(pbf, objects)
        data = pbf.read_bytes()
        pins = ['--dataset-url', URL, '--dataset-bytes', str(len(data)), '--dataset-md5', hashlib.md5(data).hexdigest(), '--dataset-sha256', hashlib.sha256(data).hexdigest()]
        source = {'city': {'id': 'post', 'name': 'Post'}, 'boxes': BOXES, 'waterRecipe': {'kind': 'inland', 'wideWater': False, 'reviewRequired': False}, **source_extra}
        path = self.dir / f'{label}.source.json'
        path.write_text(json.dumps(source))
        done = subprocess.run([sys.executable, str(ADAPTER), str(pbf), str(path), *pins, '--output-root', str(self.dir / label)], capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)
        return {name: json.loads((self.dir / label / 'post' / f'{name}.json').read_text()) for name in ('places', 'extras', 'water', 'landuse', 'roads')}

    @staticmethod
    def road_ids(layers):
        return sorted(element['id'] for element in layers['roads']['elements'])

    @staticmethod
    def fingerprint(layers):
        """sha256 of every layer, canonical JSON, minus the adapter's own file hash (the only field that follows the script text)."""
        out = {}
        for name, layer in layers.items():
            body = json.loads(json.dumps(layer))
            body['source'].pop('adapterSha256')
            out[name] = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        return out

    def test_knob_off_is_identical_to_the_extractor_before_the_knob(self):
        # Golden hashes taken with offline-extract.py of 6ce98ad2 (before roadFallback existed) on the two fixtures.
        self.assertEqual(self.fingerprint(self.extract('standard', outpost_objects())), GOLDEN_KNOB_OFF['outpost-fixture-standard'])
        poor = self.extract('poor', roadpoor_objects())
        self.assertEqual(self.road_ids(poor), [], 'a road-poor city without the knob still gets no road')
        self.assertEqual(self.fingerprint(poor), GOLDEN_KNOB_OFF['roadpoor-fixture-standard'])
        self.assertNotIn('roadFallback', poor['roads']['source'])

    def test_seed_knob(self):
        base = {'id': 'mata-utu', 'name': 'Mata Utu', 'countryISO': 'WF', 'profile': 'microstate'}
        metadata.validate_seed({**base, 'roadLadder': True})
        metadata.validate_seed({**base, 'roadLadder': False})
        self.assertEqual(metadata.road_fallback_input({**base, 'roadLadder': True}), {'roadFallback': {'minWays': 3}})
        for seed_without in (base, {**base, 'roadLadder': False}):
            self.assertEqual(metadata.road_fallback_input(seed_without), {}, 'no key in source-input.json: every existing city is unchanged')
        for bad in ('ladder', 1, None):
            with self.subTest(bad), self.assertRaises(metadata.Hold):
                metadata.validate_seed({**base, 'roadLadder': bad})
        with self.assertRaises(metadata.Hold):
            metadata.validate_seed({**seed(), 'roadLadder': True})   # outpost profile: own ladder
        table = json.loads((HERE.parent / 'country-tables' / 'ck.json').read_text())
        table['seeds'][0]['roadLadder'] = True
        batch.validate(table)
        table['seeds'][0]['roadLadder'] = 'yes'
        with self.assertRaises(ValueError):
            batch.validate(table)

    def test_tertiary_is_enough(self):
        layers = self.extract('tertiary', roadpoor_objects(tertiary=4), roadFallback=self.FALLBACK)
        self.assertEqual(self.road_ids(layers), [2001, 2002, 2003, 2004], 'tertiary only; service, track and the tertiary way outside the play box stay out')
        report = layers['roads']['source']['roadFallback']
        self.assertEqual((report['minWays'], report['standardWays'], report['classesAdded'], report['waysAdded']), (3, 0, ['tertiary'], 4))
        self.assertIn('roadFallback', layers['roads']['source']['filter'])
        for name in ('places', 'extras', 'water', 'landuse'):
            self.assertNotIn('roadFallback', layers[name]['source'])

    def test_next_class_only_when_still_short(self):
        layers = self.extract('ladder', roadpoor_objects(tertiary=1, unclassified=1, residential=2), roadFallback=self.FALLBACK)
        classes = {element['tags']['highway'] for element in layers['roads']['elements']}
        self.assertEqual(classes, {'tertiary', 'unclassified', 'residential'})
        self.assertEqual(layers['roads']['source']['roadFallback']['classesAdded'], ['tertiary', 'unclassified', 'residential'])
        short = self.extract('short', roadpoor_objects(tertiary=1, unclassified=1), roadFallback=self.FALLBACK)
        self.assertEqual(len(short['roads']['elements']), 2, 'what exists is taken; the ladder never reaches service or track')

    def test_standard_classes_win(self):
        poor = roadpoor_objects(tertiary=4, primary=3)
        base = self.extract('base', poor)
        layers = self.extract('enough', poor, roadFallback=self.FALLBACK)
        self.assertEqual(self.road_ids(layers), self.road_ids(base))
        self.assertEqual(len(layers['roads']['elements']), 3)
        report = layers['roads']['source']['roadFallback']
        self.assertEqual((report['standardWays'], report['classesAdded'], report['waysAdded']), (3, [], 0))
        short = self.extract('two', roadpoor_objects(tertiary=4, primary=2), roadFallback=self.FALLBACK)
        self.assertEqual(len(short['roads']['elements']), 6, 'two primaries are fewer than three: tertiary joins them')

    def test_sensitive_roads_are_never_added(self):
        layers = self.extract('military', roadpoor_objects(tertiary=3, military_tertiary=2), roadFallback=self.FALLBACK)
        self.assertEqual(len(layers['roads']['elements']), 3)
        self.assertFalse(any('military' in element['tags'] for element in layers['roads']['elements']))

    def test_only_the_non_roads_layers_are_untouched_by_the_knob(self):
        off = self.extract('off', roadpoor_objects())
        on = self.extract('on', roadpoor_objects(), roadFallback=self.FALLBACK)
        for name in ('places', 'extras', 'water', 'landuse'):
            self.assertEqual(self.fingerprint({name: off[name]}), self.fingerprint({name: on[name]}), name)

    def test_validation(self):
        for good in ({'minWays': 3}, {'minWays': 1}, {'minWays': 10}):
            self.assertEqual(adapter.validate_road_fallback(good), good)
        self.assertIsNone(adapter.validate_road_fallback(None))
        for bad in ({}, {'minWays': 0}, {'minWays': 11}, {'minWays': True}, {'minWays': 3.0}, {'minWays': 3, 'classes': ['track']}, [3], 'ladder'):
            with self.subTest(bad), self.assertRaises(adapter.ExtractionError):
                adapter.validate_road_fallback(bad)
        # A profile city already has its own ladder: the two do not combine.
        with self.assertRaises(adapter.ExtractionError):
            adapter.load_city(self.write_source({'profileExtraction': {'profile': 'outpost', **PROFILES['outpost']['extraction']}, 'roadFallback': self.FALLBACK}))

    def write_source(self, extra):
        path = self.dir / 'combo.source.json'
        path.write_text(json.dumps({'city': {'id': 'post', 'name': 'Post'}, 'boxes': BOXES, 'waterRecipe': {'kind': 'inland', 'wideWater': False, 'reviewRequired': False}, **extra}))
        return path

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
