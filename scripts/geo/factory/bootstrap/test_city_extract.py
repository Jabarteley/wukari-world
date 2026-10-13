"""Tests for the city sub-extract rule (countrySource.cityExtract), the streamed admin-0 closure and evidence binding.

Run: python3 -m unittest scripts/geo/factory/bootstrap/test_city_extract.py  (osmium==4.3.1 and shapely==2.1.2 for the PBF
tests; without them only the validator tests run). Synthetic PBFs only, written to a temporary directory.
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


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


merge = load('source_merge_city_test', 'source-merge.py')
batch = load('batch_run_city_test', 'batch-run.py')
try:
    import osmium
    import shapely  # noqa: F401
except ImportError:
    osmium = None

STAMP = '2026-10-11T20:21:06Z'
PRIMARY = 'https://download.geofabrik.de/europe/aaland-261011.osm.pbf'
NEIGHBOUR = 'https://download.geofabrik.de/europe/bbland-261011.osm.pbf'
CITY = 'https://download.geofabrik.de/europe/aaland/capital-region-261011.osm.pbf'
COUNTRY = {'type': 'boundary', 'boundary': 'administrative', 'admin_level': '2', 'ISO3166-1:alpha2': 'AA', 'name': 'Aaland'}
BORDER = {'boundary': 'administrative', 'admin_level': '2'}
RING = [('w', 1, 'outer'), ('w', 2, 'outer'), ('w', 3, 'outer')]


def city_extract(**changes):
    value = {'url': CITY, 'bytes': 10, 'md5': 'c' * 32, 'snapshotDate': '2026-10-11', 'reason': 'the full file is too large to scan for one city',
             'polyUrl': 'https://download.geofabrik.de/europe/aaland/capital-region.poly', 'polySha256': 'd' * 64,
             'primaryPolyUrl': 'https://download.geofabrik.de/europe/aaland.poly', 'primaryPolySha256': 'e' * 64}
    value.update(changes)
    return value


def source(**changes):
    return {'url': PRIMARY, 'bytes': 1000, 'md5': 'b' * 32, 'snapshotDate': '2026-10-11', 'cityExtract': city_extract(**changes)}


class CityExtractValidation(unittest.TestCase):
    def test_absent_is_none(self):
        self.assertIsNone(merge.validate_city_extract({'url': PRIMARY, 'snapshotDate': '2026-10-11'}))

    def test_accepted(self):
        self.assertEqual(merge.validate_city_extract(source())['url'], CITY)
        self.assertEqual(merge.poly_url('https://download.geofabrik.de/russia-261011.osm.pbf'), 'https://download.geofabrik.de/russia.poly')

    def test_rejections(self):
        cases = {
            'other snapshot date in URL': dict(url='https://download.geofabrik.de/europe/aaland/capital-region-261010.osm.pbf',
                                               polyUrl='https://download.geofabrik.de/europe/aaland/capital-region.poly'),
            'other snapshotDate': dict(snapshotDate='2026-10-10'),
            'latest file': dict(url='https://download.geofabrik.de/europe/aaland/capital-region-latest.osm.pbf'),
            'other host': dict(url='https://example.org/europe/aaland/capital-region-261011.osm.pbf'),
            'primary repeated': dict(url=PRIMARY, polyUrl='https://download.geofabrik.de/europe/aaland.poly'),
            'not smaller than the full file': dict(bytes=1000),
            'bool bytes': dict(bytes=True),
            'bad md5': dict(md5='XYZ'),
            'poly of another region': dict(polyUrl='https://download.geofabrik.de/europe/aaland/other.poly'),
            'primary poly of another region': dict(primaryPolyUrl='https://download.geofabrik.de/europe/bbland.poly'),
            'bad poly sha': dict(polySha256='x' * 64),
            'empty reason': dict(reason=' '),
        }
        for label, change in cases.items():
            with self.subTest(label), self.assertRaises(ValueError):
                merge.validate_city_extract(source(**change))
        extra = source()
        extra['cityExtract']['sha256'] = 'f' * 64
        with self.assertRaises(ValueError):
            merge.validate_city_extract(extra)
        with_neighbour = source(url=NEIGHBOUR, polyUrl='https://download.geofabrik.de/europe/bbland.poly')
        with_neighbour['neighbours'] = [{'url': NEIGHBOUR}]
        with self.assertRaises(ValueError):
            merge.validate_city_extract(with_neighbour)

    def test_table_validator(self):
        table = json.loads((HERE.parent / 'country-tables/sr.json').read_text())
        primary = table['countrySource']['url']
        table['countrySource']['cityExtract'] = city_extract(
            url=primary.replace('-261011.osm.pbf', '/paramaribo-261011.osm.pbf'), bytes=1000,
            polyUrl=primary.replace('-261011.osm.pbf', '/paramaribo.poly'), primaryPolyUrl=primary.replace('-261011.osm.pbf', '.poly'))
        batch.validate(table)
        mixed = copy.deepcopy(table)
        mixed['countrySource']['cityExtract']['snapshotDate'] = '2026-10-12'
        with self.assertRaises(ValueError):
            batch.validate(mixed)


def node(id_, lon, lat, version=1, tags=None):
    return osmium.osm.mutable.Node(id=id_, version=version, location=(lon, lat), tags=tags or {}, timestamp=STAMP)


def way(id_, refs, version=1, tags=None):
    return osmium.osm.mutable.Way(id=id_, version=version, nodes=refs, tags=tags or {}, timestamp=STAMP)


def relation(id_, members, tags, version=1):
    return osmium.osm.mutable.Relation(id=id_, version=version, members=members, tags=tags, timestamp=STAMP)


def write(path, objects, stamp=STAMP, box=None):
    header = osmium.io.Header()
    header.set('osmosis_replication_timestamp', stamp)
    if box:
        header.add_box(osmium.osm.Box(osmium.osm.Location(box[0], box[1]), osmium.osm.Location(box[2], box[3])))
    with osmium.SimpleWriter(str(path), header=header, overwrite=True) as writer:
        for obj in objects:
            writer.add(obj)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def md5(path):
    return hashlib.md5(Path(path).read_bytes()).hexdigest()


def poly(name, rings):
    """rings: list of (section name, [(lon, lat), ...]); '!' names are holes."""
    lines = [name]
    for section, points in rings:
        lines += [section, *[f'   {lon:.6E}   {lat:.6E}' for lon, lat in points], 'END']
    return '\n'.join(lines + ['END', ''])


def primary_objects():
    # Country AA is the square (0,0)-(2,2); way 3 (west side) is outside the primary clip and comes from the neighbour.
    # Unrelated data (a road and a lot of other nodes) must not enter the closure.
    filler = [node(1000 + i, 1 + i / 1000, 1.5) for i in range(50)]
    return [node(1, 0, 0), node(2, 2, 0), node(3, 2, 2), node(4, 0, 2), node(10, 1, 1, tags={'place': 'city', 'name': 'Aa'}), *filler,
            way(1, [1, 2, 3], tags=BORDER), way(2, [3, 4], tags=BORDER), way(50, [1000 + i for i in range(50)], tags={'highway': 'primary'}),
            relation(100, RING, COUNTRY)]


def neighbour_objects():
    return [node(1, 0, 0), node(4, 0, 2), node(20, -1, 1, tags={'place': 'city', 'name': 'Bb'}),
            way(3, [4, 1], tags=BORDER), relation(100, RING, COUNTRY)]


def city_objects():
    return [node(10, 1, 1, tags={'place': 'city', 'name': 'Aa'})]


NODE_SCOPE = r"""
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadCountryScope } from './country-scope.mjs';
const [dir, citySha, boundarySha] = process.argv.slice(1);
const raw = readFileSync(dir + '/receipt.json'), geo = readFileSync(dir + '/boundary.geojson'), receipt = JSON.parse(raw);
const hash = b => createHash('sha256').update(b).digest('hex');
const policy = { kind: 'osm-admin0-boundary-v1', countryISO: 'AA', datasetSha256: citySha, receiptSha256: hash(raw), receiptBytes: raw.length,
  geometrySha256: hash(geo), geometryBytes: geo.length, scriptSha256: receipt.scriptSha256, relationId: 100, directory: dir,
  ...(boundarySha === '-' ? {} : { boundaryDatasetSha256: boundarySha }) };
const scope = loadCountryScope('/', policy, 'aa', citySha);
console.log(scope.classify([1, 1]), scope.classify([-1, 1]), scope.receipt.source.sourceInputs?.at(-1)?.role ?? 'none');
"""


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class CityExtractOnSyntheticPbfs(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='city-extract-test-')
        self.dir = Path(self.tmp.name)
        self.primary, self.neighbour, self.city = (self.dir / name for name in ('primary.osm.pbf', 'neighbour.osm.pbf', 'city.osm.pbf'))
        write(self.primary, primary_objects(), box=(-0.1, -0.1, 2.1, 2.1))
        write(self.neighbour, neighbour_objects(), box=(-3, -1, 0.1, 3))
        write(self.city, city_objects(), box=(0.2, 0.2, 1.8, 1.8))

    def tearDown(self):
        self.tmp.cleanup()

    def inputs(self, city=True, neighbour=True):
        items = [{'role': 'primary', 'url': PRIMARY, 'snapshotDate': '2026-10-11', 'bytes': self.primary.stat().st_size,
                  'md5': md5(self.primary), 'sha256': sha(self.primary)}]
        if neighbour:
            items.append({'role': 'neighbour', 'url': NEIGHBOUR, 'snapshotDate': '2026-10-11', 'bytes': self.neighbour.stat().st_size,
                          'md5': md5(self.neighbour), 'sha256': sha(self.neighbour), 'reason': 'way/3 of relation/100'})
        if city:
            items.append({'role': 'city-extract', 'url': CITY, 'snapshotDate': '2026-10-11', 'bytes': self.city.stat().st_size,
                          'md5': md5(self.city), 'sha256': sha(self.city), 'reason': 'test',
                          'polyUrl': 'https://download.geofabrik.de/europe/aaland/capital-region.poly', 'polySha256': 'd' * 64,
                          'primaryPolyUrl': 'https://download.geofabrik.de/europe/aaland.poly', 'primaryPolySha256': 'e' * 64})
        return items

    def boundary(self, out, pbf=None, inputs=None, neighbours=(), evidence=None):
        pbf = pbf or self.primary
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', 'AA',
                   '--expected-sha256', sha(pbf), '--expected-bytes', str(pbf.stat().st_size), '--dataset-url', PRIMARY,
                   '--dataset-date', '2026-10-11', '--out', str(self.dir / out)]
        if inputs is not None:
            inputs_file = self.dir / (out + '-inputs.json')
            inputs_file.write_text(json.dumps(inputs))
            command += ['--source-inputs', str(inputs_file)]
        for path in neighbours:
            command += ['--neighbour-pbf', str(path)]
        if evidence is not None:
            evidence_file = self.dir / (out + '-evidence.json')
            evidence_file.write_text(json.dumps(evidence))
            command += ['--absent-evidence', str(evidence_file)]
        return subprocess.run(command, capture_output=True, text=True)

    def node_scope(self, out, city_sha, boundary_sha):
        return subprocess.run(['node', '--input-type=module', '-e', NODE_SCOPE, str(self.dir / out), city_sha, boundary_sha],
                              capture_output=True, text=True, cwd=HERE.parent)

    def test_boundary_from_primary_and_neighbour_closures(self):
        done = self.boundary('ok', inputs=self.inputs(), neighbours=[self.neighbour])
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        self.assertEqual(receipt['source']['sha256'], sha(self.primary))
        self.assertEqual([item['role'] for item in receipt['source']['sourceInputs']], ['primary', 'neighbour', 'city-extract'])
        self.assertEqual(sorted(way['id'] for way in receipt['memberWays']), [1, 2, 3])
        # Only the closure is read: the road and its 50 filler nodes stay out.
        self.assertEqual([(row['memberWays'], row['nodes']) for row in receipt['closure']['inputs']], [(2, 4), (1, 2)])
        self.assertEqual(receipt['closure']['merge']['duplicatesCollapsed'], {'node': 2, 'way': 0, 'relation': 1})
        # The same boundary as a scan of the full merged file (the neighbour-merge path), byte for byte.
        merged = self.dir / 'merged.osm.pbf'
        merge.merge_sources([self.primary, self.neighbour], merged, '2026-10-11')
        full = self.boundary('full', pbf=merged, inputs=self.inputs(city=False))
        self.assertEqual(full.returncode, 0, full.stdout + full.stderr)
        self.assertEqual((self.dir / 'ok/boundary.geojson').read_bytes(), (self.dir / 'full/boundary.geojson').read_bytes())
        # JS: the city's datasetSha256 is the city extract's; the policy pins the boundary's full file separately.
        check = self.node_scope('ok', sha(self.city), sha(self.primary))
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        self.assertIn('inside outside city-extract', check.stdout)
        for city_sha, boundary_sha in ((sha(self.primary), sha(self.primary)), (sha(self.city), '-'), (sha(self.city), sha(self.neighbour))):
            with self.subTest(city=city_sha[:8], boundary=boundary_sha[:8]):
                self.assertNotEqual(self.node_scope('ok', city_sha, boundary_sha).returncode, 0)

    def test_primary_alone_holds_on_the_absent_way(self):
        held = self.boundary('held', inputs=self.inputs(neighbour=False))
        self.assertNotEqual(held.returncode, 0)
        self.assertEqual(json.loads((self.dir / 'held/result.json').read_text())['diagnostic']['missingMemberWayIds'], [3])

    def test_neighbour_rules(self):
        self.assertNotEqual(self.boundary('no-city', inputs=self.inputs(city=False), neighbours=[self.neighbour]).returncode, 0)
        self.assertNotEqual(self.boundary('no-inputs', neighbours=[self.neighbour]).returncode, 0)
        objects = neighbour_objects()
        objects[3] = way(3, [4, 1], version=2, tags=BORDER)
        inputs = self.inputs()
        write(self.neighbour, objects)
        inputs[1].update(bytes=self.neighbour.stat().st_size, md5=md5(self.neighbour), sha256=sha(self.neighbour))
        objects = primary_objects()
        objects.insert(-1, way(3, [4, 1], tags=BORDER))
        write(self.primary, objects, box=(-0.1, -0.1, 2.1, 2.1))
        inputs[0].update(bytes=self.primary.stat().st_size, md5=md5(self.primary), sha256=sha(self.primary))
        conflict = self.boundary('conflict', inputs=inputs, neighbours=[self.neighbour])
        self.assertNotEqual(conflict.returncode, 0)
        self.assertIn('way/3 differs', json.loads((self.dir / 'conflict/result.json').read_text())['reason'])
        write(self.neighbour, neighbour_objects(), stamp='2026-10-10T20:21:06Z')
        inputs[1].update(bytes=self.neighbour.stat().st_size, md5=md5(self.neighbour), sha256=sha(self.neighbour))
        stamp = self.boundary('stamp', inputs=inputs, neighbours=[self.neighbour])
        self.assertIn('replication timestamp', json.loads((self.dir / 'stamp/result.json').read_text())['reason'])

    def test_headers(self):
        record = merge.city_extract_headers(self.primary, [self.neighbour], self.city, '2026-10-11')
        self.assertEqual(record['cityExtractBox'], [0.2, 0.2, 1.8, 1.8])
        write(self.city, city_objects(), stamp='2026-10-11T21:00:00Z', box=(0.2, 0.2, 1.8, 1.8))
        with self.assertRaisesRegex(merge.MergeError, 'one replication timestamp'):
            merge.city_extract_headers(self.primary, [self.neighbour], self.city, '2026-10-11')
        write(self.city, city_objects())
        with self.assertRaisesRegex(merge.MergeError, 'no bounding box'):
            merge.city_extract_headers(self.primary, [], self.city, '2026-10-11')

    def test_scope(self):
        self.assertEqual(self.boundary('ok', inputs=self.inputs(), neighbours=[self.neighbour]).returncode, 0)
        geojson = self.dir / 'ok/boundary.geojson'
        city_poly = poly('capital', [('1', [(0.2, 0.2), (1.8, 0.2), (1.8, 1.8), (0.2, 1.8), (0.2, 0.2)])])
        primary_poly = poly('aaland', [('1', [(-0.1, -0.1), (2.1, -0.1), (2.1, 2.1), (-0.1, 2.1), (-0.1, -0.1)])])
        boxes = {'play': [0.5, 0.5, 1.5, 1.5], 'core': [0.9, 0.9, 1.1, 1.1], 'outline': [0.4, 0.4, 1.6, 1.6], 'wide': [-1, -1, 3, 3]}
        header = [0.2, 0.2, 1.8, 1.8]
        scope = merge.city_extract_scope('aa', {'lon': 1, 'lat': 1}, boxes, geojson, header, city_poly, primary_poly)
        self.assertEqual(scope['boxes']['outline']['outsideCityExtractPolyFraction'], 0)
        with self.assertRaisesRegex(merge.MergeError, 'outside the exact admin-0'):
            merge.city_extract_scope('aa', {'lon': -0.5, 'lat': 1}, boxes, geojson, [-1, -1, 3, 3], city_poly, primary_poly)
        with self.assertRaisesRegex(merge.MergeError, 'header box'):
            merge.city_extract_scope('aa', {'lon': 1, 'lat': 1}, {**boxes, 'outline': [0.1, 0.4, 1.6, 1.6]}, geojson, header, city_poly, primary_poly)
        # The header box is wider than the .poly: a box past the .poly but inside the full file's .poly HOLDs.
        notch = poly('capital', [('1', [(0.2, 0.2), (1.8, 0.2), (1.8, 1.8), (1.0, 1.8), (1.0, 1.55), (0.2, 1.55), (0.2, 0.2)])])
        with self.assertRaisesRegex(merge.MergeError, r"\['outline'\]"):
            merge.city_extract_scope('aa', {'lon': 1, 'lat': 1}, boxes, geojson, header, notch, primary_poly)
        # ... unless that part lies outside the full file's .poly too (no data in either file there): allowed and recorded.
        primary_notch = poly('aaland', [('1', [(-0.1, -0.1), (2.1, -0.1), (2.1, 2.1), (1.0, 2.1), (1.0, 1.55), (-0.1, 1.55), (-0.1, -0.1)])])
        allowed = merge.city_extract_scope('aa', {'lon': 1, 'lat': 1}, boxes, geojson, header, notch, primary_notch)
        self.assertGreater(allowed['boxes']['outline']['outsideCityExtractPolyFraction'], 0)
        self.assertEqual(allowed['boxes']['outline']['outsideCityExtractPolyInsidePrimaryPolyDegrees2'], 0)
        hole = poly('capital', [('1', [(0.2, 0.2), (1.8, 0.2), (1.8, 1.8), (0.2, 1.8), (0.2, 0.2)]),
                                ('!2', [(0.95, 0.95), (1.05, 0.95), (1.05, 1.05), (0.95, 1.05), (0.95, 0.95)])])
        with self.assertRaisesRegex(merge.MergeError, 'outside the city extract .poly'):
            merge.city_extract_scope('aa', {'lon': 1, 'lat': 1}, boxes, geojson, header, hole, primary_poly)

    def test_evidence_bound_by_md5_with_tag_exception(self):
        # Way 5 is a maritime ring of its own (an island's territorial sea), absent from the clip and lacking two tags.
        objects = primary_objects()
        objects[-1] = relation(100, [*RING, ('w', 5, 'outer')], COUNTRY)
        objects.insert(-1, way(3, [4, 1], tags=BORDER))
        write(self.primary, objects, box=(-0.1, -0.1, 2.1, 2.1))
        tags = {'maritime': 'yes', 'border_type': 'territorial', 'name': 'Island ring'}
        evidence = {'schemaVersion': 1, 'countryISO': 'AA', 'dataset': {'url': PRIMARY, 'bytes': self.primary.stat().st_size, 'md5': md5(self.primary)},
                    'ways': [{'id': 5, 'version': 3, 'timestamp': '2026-02-11T14:06:09Z', 'tags': tags, 'firstNode': 77, 'lastNode': 77,
                              'tagException': {'missingKeys': ['admin_level', 'boundary'], 'reason': 'reviewed: OSM way lacks the two tags; maritime ring of its own'}}]}
        done = self.boundary('evidence', evidence=evidence)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'evidence/receipt.json').read_text())
        self.assertEqual(receipt['absentMemberPolicy']['omittedAbsentMaritimeWays'][0]['tagException']['missingKeys'], ['admin_level', 'boundary'])
        check = self.node_scope('evidence', sha(self.primary), '-')
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        variants = {
            'no exception': lambda e: e['ways'][0].pop('tagException'),
            'excuses a present key': lambda e: e['ways'][0]['tags'].update(boundary='maritime'),
            'short reason': lambda e: e['ways'][0]['tagException'].update(reason='because'),
            'other md5': lambda e: e['dataset'].update(md5='0' * 32),
            'both bindings': lambda e: e.update(datasetSha256=sha(self.primary)),
            'not maritime': lambda e: e['ways'][0]['tags'].pop('maritime'),
        }
        for label, change in variants.items():
            changed = copy.deepcopy(evidence)
            change(changed)
            with self.subTest(label):
                self.assertNotEqual(self.boundary('evidence-' + label.replace(' ', '-'), evidence=changed).returncode, 0)
        by_sha = {key: value for key, value in evidence.items() if key != 'dataset'}
        self.assertEqual(self.boundary('evidence-sha', evidence={**by_sha, 'datasetSha256': sha(self.primary)}).returncode, 0)


if __name__ == '__main__':
    unittest.main()
