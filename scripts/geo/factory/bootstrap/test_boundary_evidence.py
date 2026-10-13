"""Tests for the reviewed absent-way evidence of country-boundary.py: maritime=yes rings (original rule) and whole separate rings
that are not maritime (`wholeSeparateRings`, the French overseas territories). Synthetic PBFs only.

Run: python3 -m unittest scripts/geo/factory/bootstrap/test_boundary_evidence.py  (osmium==4.3.1 and shapely==2.1.2).
"""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('merge_tests_helpers', HERE / 'test_source_merge.py')
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
osmium = helpers.osmium
STAMP, PRIMARY, COUNTRY, BORDER = helpers.STAMP, helpers.PRIMARY, helpers.COUNTRY, helpers.BORDER
RING = [('w', 1, 'outer'), ('w', 2, 'outer'), ('w', 5, 'outer')]
NODE_CHECK = helpers.NODE_CHECK.replace("if (scope.receipt.source.sourceInputs.length !== 2) throw Error('sourceInputs not surfaced');\n", '')
REASON = 'Overseas territory lying as a whole separate ring far outside the clip (test).'


def objects():
    # Country AA: the square (0,0)-(2,2) from ways 1 and 2; way 5 is a far island ring (closed, nodes 30-33) that the clip dropped.
    return [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
            helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER), helpers.relation(100, RING, COUNTRY)]


def evidence(sha, tags=None, first=30, last=30, **extra):
    return {'schemaVersion': 1, 'countryISO': 'AA', 'datasetSha256': sha, **extra,
            'ways': [{'id': 5, 'version': 3, 'timestamp': '2026-08-01T00:00:00Z', 'firstNode': first, 'lastNode': last,
                      'tags': tags or {**BORDER, 'border_type': 'nation'}}]}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class WholeSeparateRings(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-evidence-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'
        helpers.write(self.pbf, objects(), box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, document=None):
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name)]
        if document is not None:
            path = self.dir / (name + '-evidence.json')
            path.write_text(json.dumps(document))
            command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def test_no_evidence_holds(self):
        done, result = self.run_boundary('none')
        self.assertNotEqual(done.returncode, 0)
        self.assertEqual(result['diagnostic']['missingMemberWayIds'], [5])

    def test_land_ring_without_the_declaration_holds(self):
        done, result = self.run_boundary('plain', evidence(self.sha))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('wholeSeparateRings', result['reason'])

    def test_maritime_ring_still_accepted_without_the_declaration(self):
        done, _ = self.run_boundary('maritime', evidence(self.sha, tags={**BORDER, 'maritime': 'yes', 'border_type': 'territorial'}))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_land_ring_with_declaration_and_reason_is_a_candidate(self):
        done, _ = self.run_boundary('ok', evidence(self.sha, wholeSeparateRings=True, reason=REASON))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        policy = receipt['absentMemberPolicy']
        self.assertTrue(policy['wholeSeparateRings'])
        self.assertEqual([way['id'] for way in policy['omittedAbsentMaritimeWays']], [5])
        self.assertEqual(sorted(way['id'] for way in receipt['memberWays']), [1, 2])
        geometry = json.loads((self.dir / 'ok/boundary.geojson').read_text())
        self.assertIn(geometry['type'], {'Polygon', 'MultiPolygon'})
        xs = [point[0] for part in ([geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']) for ring in part for point in ring]
        self.assertEqual((min(xs), max(xs)), (0, 2), 'the far island ring is not in the assembled area')
        # The node-only checker (country-scope.mjs) reads the same receipt.
        check = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), self.sha],
                               capture_output=True, text=True, cwd=HERE.parent)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        self.assertIn('inside outside', check.stdout)
        # Without the declaration the same receipt must be refused by the node-only checker.
        receipt['absentMemberPolicy'].pop('wholeSeparateRings')
        (self.dir / 'ok/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        refused = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), self.sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn('maritime=yes', refused.stderr)

    def test_declaration_needs_a_written_reason(self):
        done, result = self.run_boundary('noreason', evidence(self.sha, wholeSeparateRings=True, reason='too short'))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('reason', result['reason'])

    def test_open_absent_way_holds(self):
        done, result = self.run_boundary('open', evidence(self.sha, first=30, last=31, wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('rings of their own', result['reason'])

    def test_main_ring_way_holds(self):
        done, result = self.run_boundary('main', evidence(self.sha, first=1, last=1, wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('main ring', result['reason'])

    def test_wrong_pbf_pin_holds(self):
        done, result = self.run_boundary('pin', evidence('FILL-AFTER-FIRST-HOSTED-RUN', wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('PBF mismatch', result['reason'])


if __name__ == '__main__':
    unittest.main()
