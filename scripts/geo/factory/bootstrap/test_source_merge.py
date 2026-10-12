"""Tests for the same-snapshot neighbour merge (source-merge.py), the table validator and the boundary on a merged file.

Run: python3 -m unittest scripts/geo/factory/bootstrap/test_source_merge.py  (osmium==4.3.1 and shapely==2.1.2 for the PBF
tests; without them only the validator tests run). Synthetic PBFs only, written to a temporary directory.
"""
import copy
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


merge = load('source_merge_under_test', 'source-merge.py')
batch = load('batch_run_under_test', 'batch-run.py')
try:
    import osmium
    import shapely  # noqa: F401
except ImportError:
    osmium = None

STAMP = '2026-10-11T20:21:44Z'
PRIMARY = 'https://download.geofabrik.de/africa/aa-land-261011.osm.pbf'
NEIGHBOUR = 'https://download.geofabrik.de/africa/bb-land-261011.osm.pbf'
COUNTRY = {'type': 'boundary', 'boundary': 'administrative', 'admin_level': '2', 'ISO3166-1:alpha2': 'AA', 'name': 'Aaland'}


def source(**neighbour_changes):
    neighbour = {'url': NEIGHBOUR, 'bytes': 10, 'md5': 'a' * 32, 'snapshotDate': '2026-10-11', 'reason': 'way/3 of relation/100'}
    neighbour.update(neighbour_changes)
    return {'url': PRIMARY, 'bytes': 20, 'md5': 'b' * 32, 'snapshotDate': '2026-10-11', 'neighbours': [neighbour]}


class NeighbourValidation(unittest.TestCase):
    def test_absent_is_empty(self):
        self.assertEqual(merge.validate_neighbours({'url': PRIMARY, 'snapshotDate': '2026-10-11'}), [])

    def test_same_snapshot_accepted(self):
        self.assertEqual(len(merge.validate_neighbours(source())), 1)

    def test_rejections(self):
        cases = {
            'other snapshot date in URL': dict(url='https://download.geofabrik.de/africa/bb-land-261010.osm.pbf'),
            'other snapshotDate': dict(snapshotDate='2026-10-10'),
            'latest file': dict(url='https://download.geofabrik.de/africa/bb-land-latest.osm.pbf'),
            'other host': dict(url='https://example.org/africa/bb-land-261011.osm.pbf'),
            'primary repeated': dict(url=PRIMARY),
            'bad md5': dict(md5='XYZ'),
            'bool bytes': dict(bytes=True),
            'empty reason': dict(reason=' '),
        }
        for label, change in cases.items():
            with self.subTest(label), self.assertRaises(ValueError):
                merge.validate_neighbours(source(**change))
        extra = source()
        extra['neighbours'][0]['sha256'] = 'c' * 64
        with self.assertRaises(ValueError):
            merge.validate_neighbours(extra)
        with self.assertRaises(ValueError):
            merge.validate_neighbours({**source(), 'neighbours': []})

    def test_table_validator(self):
        table = json.loads((HERE.parent / 'country-tables/sr.json').read_text())
        table['countrySource']['neighbours'] = [{'url': 'https://download.geofabrik.de/south-america/guyana-261011.osm.pbf',
                                                 'bytes': 15554318, 'md5': '73aca8d8' + '0' * 24, 'snapshotDate': '2026-10-11',
                                                 'reason': 'test'}]
        batch.validate(table)
        mixed = copy.deepcopy(table)
        mixed['countrySource']['neighbours'][0]['url'] = 'https://download.geofabrik.de/south-america/guyana-261012.osm.pbf'
        with self.assertRaises(ValueError):
            batch.validate(mixed)
        unknown = copy.deepcopy(table)
        unknown['countrySource']['mirror'] = 'x'
        with self.assertRaises(ValueError):
            batch.validate(unknown)

    def test_box_inside(self):
        self.assertTrue(merge.box_inside([1, 2, 3, 4], [2, 1, 4, 3]))
        self.assertFalse(merge.box_inside([1, 2, 3, 4.5], [2, 1, 4, 3]))


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


BORDER = {'boundary': 'administrative', 'admin_level': '2'}
RING = [('w', 1, 'outer'), ('w', 2, 'outer'), ('w', 3, 'outer')]


def primary_objects():
    # Country AA is the square (0,0)-(2,2). Way 3 (west side) lies outside the primary clip: absent, as Geofabrik does.
    return [node(1, 0, 0), node(2, 2, 0), node(3, 2, 2), node(4, 0, 2), node(10, 1, 1, tags={'place': 'city', 'name': 'Aa'}),
            way(1, [1, 2, 3], tags=BORDER), way(2, [3, 4], tags=BORDER), relation(100, RING, COUNTRY)]


def neighbour_objects():
    return [node(1, 0, 0), node(4, 0, 2), node(20, -1, 1, tags={'place': 'city', 'name': 'Bb'}),
            way(3, [4, 1], tags=BORDER), relation(100, RING, COUNTRY)]


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class MergeOnSyntheticPbfs(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='source-merge-test-')
        self.dir = Path(self.tmp.name)
        self.primary, self.neighbour = self.dir / 'primary.osm.pbf', self.dir / 'neighbour.osm.pbf'
        write(self.primary, primary_objects(), box=(-0.1, -0.1, 2.1, 2.1))
        write(self.neighbour, neighbour_objects(), box=(-3, -1, 0.1, 3))

    def tearDown(self):
        self.tmp.cleanup()

    def boundary(self, pbf, out, inputs=None):
        sha = merge_sha(pbf)
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(pbf), '--country', 'AA',
                   '--expected-sha256', sha, '--expected-bytes', str(pbf.stat().st_size), '--dataset-url', PRIMARY,
                   '--dataset-date', '2026-10-11', '--out', str(out)]
        if inputs:
            inputs_file = self.dir / 'inputs.json'
            inputs_file.write_text(json.dumps(inputs))
            command += ['--source-inputs', str(inputs_file)]
        return subprocess.run(command, capture_output=True, text=True)

    def test_union_once_sorted_with_header(self):
        out = self.dir / 'merged.osm.pbf'
        record = merge.merge_sources([self.primary, self.neighbour], out, '2026-10-11')
        self.assertEqual(record['written'], {'node': 6, 'way': 3, 'relation': 1})
        self.assertEqual(record['duplicatesCollapsed'], {'node': 2, 'way': 0, 'relation': 1})
        self.assertEqual(record['headerTimestamp'], STAMP)
        self.assertEqual(record['primaryBox'], [-0.1, -0.1, 2.1, 2.1])
        ids = [(obj.type_str(), obj.id) for obj in osmium.FileProcessor(str(out))]
        self.assertEqual(ids, [('n', 1), ('n', 2), ('n', 3), ('n', 4), ('n', 10), ('n', 20), ('w', 1), ('w', 2), ('w', 3), ('r', 100)])
        # Input order does not change the merged objects.
        swapped = self.dir / 'swapped.osm.pbf'
        merge.merge_sources([self.neighbour, self.primary], swapped, '2026-10-11')
        self.assertEqual(ids, [(obj.type_str(), obj.id) for obj in osmium.FileProcessor(str(swapped))])

    def test_version_conflict_holds(self):
        objects = neighbour_objects()
        objects[0] = node(1, 0, 0, version=2)
        write(self.neighbour, objects)
        with self.assertRaisesRegex(merge.MergeError, 'node/1 differs'):
            merge.merge_sources([self.primary, self.neighbour], self.dir / 'merged.osm.pbf', '2026-10-11')

    def test_content_conflict_holds(self):
        objects = neighbour_objects()
        objects[-1] = relation(100, RING[:2], COUNTRY)
        write(self.neighbour, objects)
        with self.assertRaisesRegex(merge.MergeError, 'relation member lists'):
            merge.merge_sources([self.primary, self.neighbour], self.dir / 'merged.osm.pbf', '2026-10-11')

    def test_other_replication_timestamp_holds(self):
        write(self.neighbour, neighbour_objects(), stamp='2026-10-10T20:21:44Z')
        with self.assertRaisesRegex(merge.MergeError, 'one replication timestamp'):
            merge.merge_sources([self.primary, self.neighbour], self.dir / 'merged.osm.pbf', '2026-10-11')

    def test_boundary_holds_on_primary_and_assembles_on_merged(self):
        held = self.boundary(self.primary, self.dir / 'held')
        self.assertNotEqual(held.returncode, 0)
        self.assertEqual(json.loads((self.dir / 'held/result.json').read_text())['diagnostic']['missingMemberWayIds'], [3])
        merged = self.dir / 'merged.osm.pbf'
        merge.merge_sources([self.primary, self.neighbour], merged, '2026-10-11')
        inputs = [{'role': 'primary', 'url': PRIMARY, 'snapshotDate': '2026-10-11', 'bytes': self.primary.stat().st_size,
                   'md5': 'b' * 32, 'sha256': merge_sha(self.primary)},
                  {'role': 'neighbour', 'url': NEIGHBOUR, 'snapshotDate': '2026-10-11', 'bytes': self.neighbour.stat().st_size,
                   'md5': 'a' * 32, 'sha256': merge_sha(self.neighbour), 'reason': 'way/3 of relation/100'}]
        done = self.boundary(merged, self.dir / 'ok', inputs)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        self.assertEqual(receipt['source']['sha256'], merge_sha(merged))
        self.assertEqual(receipt['source']['sourceInputs'], inputs)
        self.assertEqual(sorted(way['id'] for way in receipt['memberWays']), [1, 2, 3])
        # The node-only JS checks (country-scope.mjs, source-inputs.mjs) read the same receipt.
        check = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), merge_sha(merged)],
                               capture_output=True, text=True, cwd=HERE.parent)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        self.assertIn('inside outside', check.stdout)
        # Primary scope: the city stays in AA; a centre in the neighbour or a play box past the primary extract box HOLDs.
        geojson = self.dir / 'ok/boundary.geojson'
        boxes = {'play': [0.5, 0.5, 1.5, 1.5], 'core': [0.9, 0.9, 1.1, 1.1], 'outline': [0.4, 0.4, 1.6, 1.6], 'wide': [-1, -1, 3, 3]}
        box = merge.header_record(self.primary)['box']
        self.assertTrue(merge.primary_scope('aa', {'lon': 1, 'lat': 1}, boxes, geojson, box)['centreInsideAdmin0'])
        with self.assertRaisesRegex(merge.MergeError, 'outside the exact admin-0'):
            merge.primary_scope('aa', {'lon': -1, 'lat': 1}, boxes, geojson, box)
        with self.assertRaisesRegex(merge.MergeError, r"\['play', 'outline'\]"):
            merge.primary_scope('aa', {'lon': 1, 'lat': 1}, {**boxes, 'play': [0.5, -0.5, 1.5, 1.5], 'outline': [0.4, -0.6, 1.6, 1.6]}, geojson, box)


NODE_CHECK = r"""
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadCountryScope } from './country-scope.mjs';
const [dir, sha] = process.argv.slice(1);
const raw = readFileSync(dir + '/receipt.json'), geo = readFileSync(dir + '/boundary.geojson'), receipt = JSON.parse(raw);
const hash = b => createHash('sha256').update(b).digest('hex');
const policy = { kind: 'osm-admin0-boundary-v1', countryISO: 'AA', datasetSha256: sha, receiptSha256: hash(raw), receiptBytes: raw.length,
  geometrySha256: hash(geo), geometryBytes: geo.length, scriptSha256: receipt.scriptSha256, relationId: 100, directory: dir };
const scope = loadCountryScope('/', policy, 'aa', sha);
if (scope.receipt.source.sourceInputs.length !== 2) throw Error('sourceInputs not surfaced');
console.log(scope.classify([1, 1]), scope.classify([-1, 1]));
"""


def merge_sha(path):
    return batch.digest(path)


if __name__ == '__main__':
    unittest.main()
