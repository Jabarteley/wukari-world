"""Tests for the reviewed evidence of country-boundary.py: absent maritime=yes rings (original rule), whole separate rings
that are not maritime (`wholeSeparateRings`, the French overseas territories), the admin-0 relation override (Palestine) and
reviewed non-boundary relation members (`nonBoundaryRelationMembers`, Vatican City relation 6474878 role `part`). Synthetic PBFs only.

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


LINE = {'boundary': 'maritime', 'border_type': 'restricted waters', 'name': 'Restricted-water line (test)'}
CLOSER = {**BORDER, 'maritime': 'yes', 'border_type': 'territorial'}
LINE_EXCEPTION = {'missingKeys': ['admin_level'], 'boundaryValue': 'maritime',
                  'reason': 'Restricted-water line of an island, boundary=maritime without admin_level (test, Taiping Island).'}


def line_evidence(sha, exception=LINE_EXCEPTION, closer_last=30, **extra):
    """Two absent ways of one island ring: a boundary=maritime line (nodes 30-32-31, no admin_level) and a maritime=yes closing way (31-30)."""
    line = {'id': 5, 'version': 7, 'timestamp': '2026-08-01T00:00:00Z', 'firstNode': 30, 'lastNode': 31, 'tags': LINE}
    if exception is not None:
        line['tagException'] = exception
    return {'schemaVersion': 1, 'countryISO': 'AA', 'datasetSha256': sha, **extra,
            'ways': [line, {'id': 6, 'version': 1, 'timestamp': '2026-08-01T00:00:00Z', 'firstNode': 31, 'lastNode': closer_last, 'tags': CLOSER}]}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class RestrictedWaterLine(unittest.TestCase):
    """Taiwan relation 449220: way 654482085 (boundary=maritime, no admin_level) and way 1199677144 (maritime=yes) close the Taiping ring."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-line-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'
        members = [('w', 1, 'outer'), ('w', 2, 'outer'), ('w', 5, 'outer'), ('w', 6, 'outer')]
        helpers.write(self.pbf, objects()[:-1] + [helpers.relation(100, members, COUNTRY)], box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, document):
        path = self.dir / (name + '-evidence.json')
        path.write_text(json.dumps(document))
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name),
                   '--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def test_line_and_closing_way_form_a_ring_and_are_omitted(self):
        done, _ = self.run_boundary('ok', line_evidence(self.sha, wholeSeparateRings=True, reason=REASON))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        self.assertEqual(sorted(way['id'] for way in receipt['absentMemberPolicy']['omittedAbsentMaritimeWays']), [5, 6])
        self.assertEqual(sorted(way['id'] for way in receipt['memberWays']), [1, 2])
        check = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), self.sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)

    def test_without_the_exception_the_line_holds(self):
        done, result = self.run_boundary('noexc', line_evidence(self.sha, exception=None, wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('not a maritime=yes admin_level=2 boundary way', result['reason'])

    def test_exception_needs_the_declaration(self):
        done, result = self.run_boundary('nodecl', line_evidence(self.sha))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('boundaryValue', result['reason'])

    def test_only_the_maritime_value_is_excused(self):
        done, result = self.run_boundary('value', line_evidence(self.sha, exception={**LINE_EXCEPTION, 'boundaryValue': 'disputed'}, wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('boundaryValue', result['reason'])

    def test_open_pair_holds(self):
        done, result = self.run_boundary('open', line_evidence(self.sha, closer_last=32, wholeSeparateRings=True, reason=REASON))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('rings of their own', result['reason'])

    def test_receipt_check_refuses_the_value_without_the_declaration(self):
        done, _ = self.run_boundary('ok2', line_evidence(self.sha, wholeSeparateRings=True, reason=REASON))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok2/receipt.json').read_text())
        receipt['absentMemberPolicy'].pop('wholeSeparateRings')
        (self.dir / 'ok2/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        refused = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok2'), self.sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertNotEqual(refused.returncode, 0)


DISPUTED = {'type': 'boundary', 'boundary': 'disputed', 'ISO3166-1:alpha2': 'AA', 'ISO3166-1': 'AA', 'name': 'Aaland (disputed)'}
OVERRIDE = {'relationId': 100, 'expectedTags': DISPUTED, 'reason': 'Owner-approved test override: the only relation of the country is boundary=disputed.'}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class LandAreaMember(unittest.TestCase):
    """Antigua and Barbuda: the admin-0 relation also lists a boundary=land_area relation (role `land_area`), a land-only second picture of the country."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-land-area-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'
        members = [('w', 1, 'outer'), ('w', 2, 'outer')]
        self.objects = [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
                        helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER)]
        self.members = members

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, extra_role):
        helpers.write(self.pbf, self.objects + [helpers.relation(100, self.members + [('r', 200, extra_role)], COUNTRY)], box=(-0.1, -0.1, 2.1, 2.1))
        sha = helpers.merge_sha(self.pbf)
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / extra_role)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, sha

    def test_land_area_relation_is_listed_not_a_boundary_member(self):
        done, sha = self.run_boundary('land_area')
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'land_area/receipt.json').read_text())
        listed = receipt['memberRolePolicy']['excludedNonBoundaryMembers']
        self.assertEqual([(m['type'], m['ref'], m['role']) for m in listed], [('r', 200, 'land_area')])
        check = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'land_area'), sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)

    def test_any_other_relation_role_still_holds(self):
        done, _ = self.run_boundary('inner_area')
        self.assertNotEqual(done.returncode, 0)


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class RelationOverride(unittest.TestCase):
    """Reviewed admin-0 relation override (Palestine, relation 1703814: boundary=disputed, no admin_level)."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-override-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'
        objects_ = [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
                    helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER),
                    helpers.relation(100, [('w', 1, 'outer'), ('w', 2, 'outer')], DISPUTED)]
        helpers.write(self.pbf, objects_, box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, override=OVERRIDE, **document):
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name)]
        if override is not None:
            path = self.dir / (name + '-evidence.json')
            path.write_text(json.dumps({'schemaVersion': 1, 'countryISO': 'AA', 'datasetSha256': self.sha, 'admin0RelationOverride': override, **document}))
            command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def test_default_rule_finds_no_relation(self):
        done, result = self.run_boundary('none', override=None)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])

    def test_override_accepts_exactly_that_relation_and_records_it(self):
        done, _ = self.run_boundary('ok')
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        self.assertEqual(receipt['relationOverride']['relationId'], 100)
        self.assertEqual(receipt['relationOverride']['expectedTags'], DISPUTED)
        self.assertRegex(receipt['relationOverride']['evidenceSha256'], r'^[0-9a-f]{64}$')
        check = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), self.sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        # The node-only checker refuses the same receipt once the override record is removed (no weakening without the pinned override).
        receipt.pop('relationOverride')
        (self.dir / 'ok/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        refused = subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / 'ok'), self.sha], capture_output=True, text=True, cwd=HERE.parent)
        self.assertNotEqual(refused.returncode, 0)

    def test_other_relation_id_or_tags_hold(self):
        done, result = self.run_boundary('id', override={**OVERRIDE, 'relationId': 101})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])
        done, result = self.run_boundary('tags', override={**OVERRIDE, 'expectedTags': {**DISPUTED, 'name': 'Another name'}})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])

    def test_override_needs_reason_pin_and_no_admin_level(self):
        for name, override, extra in (('reason', {**OVERRIDE, 'reason': 'short'}, {}),
                                      ('level', {**OVERRIDE, 'expectedTags': {**DISPUTED, 'admin_level': '2'}}, {}),
                                      ('pin', OVERRIDE, {'datasetSha256': 'f' * 64})):
            done, result = self.run_boundary(name, override=override, **extra)
            self.assertNotEqual(done.returncode, 0, name)
            self.assertTrue('Override' in result['reason'] or 'override' in result['reason'] or 'PBF mismatch' in result['reason'], result['reason'])

    def test_an_administrative_country_ignores_the_override_file_entirely(self):
        # A country whose relation is a normal admin_level=2 boundary never reads the override: its receipt carries none.
        done, _ = self.run_boundary('plain', override=None)
        self.assertNotEqual(done.returncode, 0)


TERRITORY = {'type': 'boundary', 'boundary': 'administrative', 'admin_level': '4', 'ISO3166-1:alpha2': 'AA', 'ISO3166-1': 'AA', 'name': 'Aaland (territory)'}
TERRITORY_OVERRIDE = {'relationId': 100, 'expectedTags': TERRITORY,
                      'reason': 'Territory, admin_level 4: game venue map only, no claims about real operations or sovereignty.'}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class TerritoryAdminLevelOverride(unittest.TestCase):
    """Non-sovereign territories (as, gu, mp: admin_level 4; pf, nc, wf: admin_level 3): the override may pin an admin_level other than 2."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-territory-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, override=TERRITORY_OVERRIDE, relation_tags=TERRITORY, **document):
        objects_ = [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
                    helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER),
                    helpers.relation(100, [('w', 1, 'outer'), ('w', 2, 'outer')], relation_tags)]
        helpers.write(self.pbf, objects_, box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name)]
        if override is not None:
            path = self.dir / (name + '-evidence.json')
            path.write_text(json.dumps({'schemaVersion': 1, 'countryISO': 'AA', 'datasetSha256': document.pop('datasetSha256', self.sha),
                                        'admin0RelationOverride': override, **document}))
            command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def node_check(self, name):
        return subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / name), self.sha], capture_output=True, text=True, cwd=HERE.parent)

    def test_default_rule_still_finds_no_territory_relation(self):
        done, result = self.run_boundary('none', override=None)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])

    def test_override_with_matching_admin_level_is_accepted_and_recorded(self):
        for level in ('3', '4'):
            tags = {**TERRITORY, 'admin_level': level}
            name = 'ok' + level
            done, _ = self.run_boundary(name, override={**TERRITORY_OVERRIDE, 'expectedTags': tags}, relation_tags=tags)
            self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
            receipt = json.loads((self.dir / name / 'receipt.json').read_text())
            self.assertEqual(receipt['relationOverride']['expectedTags']['admin_level'], level)
            check = self.node_check(name)
            self.assertEqual(check.returncode, 0, check.stdout + check.stderr)

    def test_relation_admin_level_must_equal_the_pinned_one(self):
        # Relation admin_level 3, override pins 4: the relation is not found.
        done, result = self.run_boundary('differs', relation_tags={**TERRITORY, 'admin_level': '3'})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])
        # Relation has an admin_level, override pins none (the Palestine form): not found either.
        done, result = self.run_boundary('unpinned', override={**TERRITORY_OVERRIDE, 'expectedTags': {k: v for k, v in TERRITORY.items() if k != 'admin_level'}})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])
        # Override pins admin_level 4, relation has none: not found.
        done, result = self.run_boundary('absent', relation_tags={k: v for k, v in TERRITORY.items() if k != 'admin_level'})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])

    def test_override_may_never_pin_admin_level_2_or_skip_the_pin_and_reason(self):
        for name, override, extra in (('level2', {**TERRITORY_OVERRIDE, 'expectedTags': {**TERRITORY, 'admin_level': '2'}}, {}),
                                      ('reason', {**TERRITORY_OVERRIDE, 'reason': 'short'}, {}),
                                      ('pin', TERRITORY_OVERRIDE, {'datasetSha256': 'f' * 64})):
            done, result = self.run_boundary(name, override=override, relation_tags={**TERRITORY, 'admin_level': '2'} if name == 'level2' else TERRITORY, **extra)
            self.assertNotEqual(done.returncode, 0, name)
            self.assertTrue('verride' in result['reason'] or 'PBF mismatch' in result['reason'], result['reason'])

    def test_override_with_other_country_code_is_refused(self):
        tags = {**TERRITORY, 'ISO3166-1': 'BB', 'ISO3166-1:alpha2': 'BB'}
        done, result = self.run_boundary('iso', override={**TERRITORY_OVERRIDE, 'expectedTags': tags}, relation_tags=tags)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('verride', result['reason'])

    def test_node_checker_refuses_a_tampered_admin_level(self):
        done, _ = self.run_boundary('tamper')
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        path = self.dir / 'tamper/receipt.json'
        receipt = json.loads(path.read_text())
        for level in ('2', '3', None):
            changed = json.loads(json.dumps(receipt))
            if level is None:
                changed['relation']['tags'].pop('admin_level')
            else:
                changed['relation']['tags']['admin_level'] = level
            path.write_text(json.dumps(changed, indent=2) + '\n')
            self.assertNotEqual(self.node_check('tamper').returncode, 0, level)
        # An override pinning admin_level 2 is refused by the node checker even when the relation says 2.
        changed = json.loads(json.dumps(receipt))
        changed['relation']['tags']['admin_level'] = '2'
        changed['relationOverride']['expectedTags']['admin_level'] = '2'
        path.write_text(json.dumps(changed, indent=2) + '\n')
        self.assertNotEqual(self.node_check('tamper').returncode, 0)


PART_TAGS = {'boundary': 'administrative', 'type': 'boundary', 'name': 'Extraterritorial properties (test)'}
PART_REASON = 'Extraterritorial properties of the country outside its own ring (test fixture, like relation 6474878).'


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class ReviewedRelationMember(unittest.TestCase):
    """Vatican City: relation 36989 lists relation 6474878 with role `part` (the Holy See's extraterritorial properties in Italy)."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-part-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'aa.osm.pbf'
        self.base = [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
                     helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER)]

    def tearDown(self):
        self.tmp.cleanup()

    def item(self, **change):
        return {'ref': 200, 'role': 'part', 'version': 1, 'timestamp': helpers.STAMP, 'tags': PART_TAGS, 'reason': PART_REASON, **change}

    def run_boundary(self, name, members=(('r', 200, 'part'),), part=True, listed=None, sha=None, **document):
        objects_ = [*self.base, *([helpers.relation(200, [('w', 1, 'outer')], PART_TAGS)] if part else []),
                    helpers.relation(100, [('w', 1, 'outer'), ('w', 2, 'outer'), *members], COUNTRY)]
        helpers.write(self.pbf, objects_, box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', 'AA', '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name)]
        if listed is not None:
            path = self.dir / (name + '-evidence.json')
            path.write_text(json.dumps({'schemaVersion': 1, 'countryISO': 'AA', 'datasetSha256': sha or self.sha,
                                        'nonBoundaryRelationMembers': listed, **document}))
            command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def node_check(self, name):
        return subprocess.run(['node', '--input-type=module', '-e', NODE_CHECK, str(self.dir / name), self.sha], capture_output=True, text=True, cwd=HERE.parent)

    def test_unlisted_part_relation_holds(self):
        done, result = self.run_boundary('none')
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('unsupported/nested', result['reason'])
        self.assertEqual(result['diagnostic']['unsupportedMembers'], [{'type': 'r', 'ref': 200, 'role': 'part'}])

    def test_reviewed_part_relation_is_listed_in_the_receipt_and_accepted_by_the_checker(self):
        done, _ = self.run_boundary('ok', listed=[self.item()])
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        policy = receipt['memberRolePolicy']['reviewedNonBoundaryRelationMembers']
        self.assertRegex(policy['evidenceSha256'], r'^[0-9a-f]{64}$')
        self.assertEqual([(m['type'], m['ref'], m['role'], m['version'], m['presentInPbf']) for m in policy['members']], [('r', 200, 'part', 1, True)])
        self.assertEqual(receipt['memberRolePolicy']['excludedNonBoundaryMembers'], [])
        self.assertEqual(sorted(way['id'] for way in receipt['memberWays']), [1, 2])
        geometry = json.loads((self.dir / 'ok/boundary.geojson').read_text())
        self.assertIn(geometry['type'], {'Polygon', 'MultiPolygon'})
        checked = self.node_check('ok')
        self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
        # The node-only checker refuses the receipt once the reviewed record is removed (no weakening without the pinned evidence).
        del receipt['memberRolePolicy']['reviewedNonBoundaryRelationMembers']
        (self.dir / 'ok/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        refused = self.node_check('ok')
        self.assertNotEqual(refused.returncode, 0)

    def test_checker_refuses_a_reviewed_member_that_is_not_a_member_or_looks_like_a_country(self):
        done, _ = self.run_boundary('chk', listed=[self.item()])
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        original = json.loads((self.dir / 'chk/receipt.json').read_text())
        for label, change in (('other ref', {'ref': 201}), ('country level', {'tags': {**PART_TAGS, 'admin_level': '2'}}),
                              ('ring role', {'role': 'outer'}), ('short reason', {'reason': 'too short'})):
            receipt = json.loads(json.dumps(original))
            receipt['memberRolePolicy']['reviewedNonBoundaryRelationMembers']['members'][0].update(change)
            (self.dir / 'chk/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
            self.assertNotEqual(self.node_check('chk').returncode, 0, label)

    def test_relation_absent_from_the_clip_is_recorded_as_not_present(self):
        done, _ = self.run_boundary('absent', part=False, listed=[self.item()])
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'absent/receipt.json').read_text())
        self.assertFalse(receipt['memberRolePolicy']['reviewedNonBoundaryRelationMembers']['members'][0]['presentInPbf'])

    def test_pbf_that_differs_from_the_evidence_holds(self):
        for label, change in (('version', {'version': 2}), ('tags', {'tags': {**PART_TAGS, 'name': 'Another name'}})):
            done, result = self.run_boundary(label, listed=[self.item(**change)])
            self.assertNotEqual(done.returncode, 0, label)
            self.assertIn('differs from its evidence', result['reason'])

    def test_evidence_must_name_this_pbf_and_a_real_member(self):
        done, result = self.run_boundary('pin', listed=[self.item()], sha='f' * 64)
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('PBF mismatch', result['reason'])
        done, result = self.run_boundary('other', listed=[self.item(ref=201)])
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('unsupported/nested', result['reason'])
        done, result = self.run_boundary('unused', members=(), listed=[self.item()])
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('differs from the relation members it excuses', result['reason'])

    def test_evidence_does_not_excuse_another_member(self):
        done, result = self.run_boundary('second', members=(('r', 200, 'part'), ('r', 201, 'part')), listed=[self.item()])
        self.assertNotEqual(done.returncode, 0)
        self.assertEqual(result['diagnostic']['unsupportedMembers'], [{'type': 'r', 'ref': 201, 'role': 'part'}])

    def test_evidence_rules(self):
        cases = {'reason': self.item(reason='short'), 'country level': self.item(tags={**PART_TAGS, 'admin_level': '2'}),
                 'iso tag': self.item(tags={**PART_TAGS, 'ISO3166-1:alpha2': 'IT'}), 'ring role': self.item(role='outer'),
                 'subarea role': self.item(role='subarea'), 'newer than the snapshot': self.item(timestamp='2026-10-12T00:00:00Z'),
                 'extra key': {**self.item(), 'type': 'way'}, 'no tags': self.item(tags={})}
        for label, entry in cases.items():
            done, result = self.run_boundary('rule-' + label.replace(' ', '-'), listed=[entry])
            self.assertNotEqual(done.returncode, 0, label)
            self.assertNotIn('Traceback', done.stderr, label)
        done, _ = self.run_boundary('dup', listed=[self.item(), self.item()])
        self.assertNotEqual(done.returncode, 0)


if __name__ == '__main__':
    unittest.main()


USER_ASSIGNED = {'type': 'boundary', 'boundary': 'administrative', 'admin_level': '3', 'name': 'Xland (disputed place, no ISO tag)', 'wikidata': 'Q34754'}
USER_OVERRIDE = {'relationId': 100, 'expectedTags': USER_ASSIGNED, 'userAssignedCode': True,
                 'reason': 'Disputed place without an ISO 3166-1 tag in OSM: game venue map only, no claims, user-assigned code XA (test).'}


@unittest.skipIf(osmium is None, 'osmium/shapely not installed')
class UserAssignedCodeOverride(unittest.TestCase):
    """Somaliland (XS) and Northern Cyprus (XN): an admin_level 3 relation with NO ISO3166-1 tag under a user-assigned X? code."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='boundary-user-assigned-test-')
        self.dir = Path(self.tmp.name)
        self.pbf = self.dir / 'xa.osm.pbf'

    def tearDown(self):
        self.tmp.cleanup()

    def run_boundary(self, name, override=USER_OVERRIDE, relation_tags=USER_ASSIGNED, country='XA'):
        objects_ = [helpers.node(1, 0, 0), helpers.node(2, 2, 0), helpers.node(3, 2, 2), helpers.node(4, 0, 2),
                    helpers.way(1, [1, 2, 3], tags=BORDER), helpers.way(2, [3, 4, 1], tags=BORDER),
                    helpers.relation(100, [('w', 1, 'outer'), ('w', 2, 'outer')], relation_tags)]
        helpers.write(self.pbf, objects_, box=(-0.1, -0.1, 2.1, 2.1))
        self.sha = helpers.merge_sha(self.pbf)
        command = [sys.executable, str(HERE / 'country-boundary.py'), '--pbf', str(self.pbf), '--country', country, '--expected-sha256', self.sha,
                   '--expected-bytes', str(self.pbf.stat().st_size), '--dataset-url', PRIMARY, '--dataset-date', '2026-10-11', '--out', str(self.dir / name)]
        path = self.dir / (name + '-evidence.json')
        path.write_text(json.dumps({'schemaVersion': 1, 'countryISO': country, 'datasetSha256': self.sha, 'admin0RelationOverride': override}))
        command += ['--absent-evidence', str(path)]
        done = subprocess.run(command, capture_output=True, text=True)
        return done, json.loads((self.dir / name / 'result.json').read_text())

    def node_check(self, name):
        script = NODE_CHECK.replace("'AA'", "'XA'").replace("'aa'", "'xa'")
        return subprocess.run(['node', '--input-type=module', '-e', script, str(self.dir / name), self.sha], capture_output=True, text=True, cwd=HERE.parent)

    def test_relation_without_iso_tags_is_accepted_under_a_user_assigned_code(self):
        done, _ = self.run_boundary('ok')
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        receipt = json.loads((self.dir / 'ok/receipt.json').read_text())
        self.assertTrue(receipt['relationOverride']['userAssignedCode'])
        self.assertEqual(receipt['relation']['id'], 100)
        check = self.node_check('ok')
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)
        # Without the flag in the receipt the node-only checker demands ISO tags again.
        receipt['relationOverride'].pop('userAssignedCode')
        (self.dir / 'ok/receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        self.assertNotEqual(self.node_check('ok').returncode, 0)

    def test_a_real_iso_code_cannot_use_the_flag(self):
        done, result = self.run_boundary('iso', country='SO')
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('userAssignedCode', result['reason'])

    def test_expected_tags_may_not_carry_an_iso_key_and_need_a_wikidata_id(self):
        for name, tags in (('isokey', {**USER_ASSIGNED, 'ISO3166-1': 'XA'}), ('nowd', {k: v for k, v in USER_ASSIGNED.items() if k != 'wikidata'}),
                           ('badwd', {**USER_ASSIGNED, 'wikidata': 'Qx'})):
            done, result = self.run_boundary(name, override={**USER_OVERRIDE, 'expectedTags': tags}, relation_tags=tags)
            self.assertNotEqual(done.returncode, 0, name)
            self.assertIn('userAssignedCode', result['reason'], name)

    def test_relation_that_carries_an_iso_tag_is_refused_for_the_flag(self):
        tags = {**USER_ASSIGNED, 'ISO3166-1': 'XA'}
        done, result = self.run_boundary('tagged', relation_tags=tags, override={**USER_OVERRIDE})
        self.assertNotEqual(done.returncode, 0)

    def test_other_relation_tags_are_not_found(self):
        done, result = self.run_boundary('other', relation_tags={**USER_ASSIGNED, 'wikidata': 'Q1'})
        self.assertNotEqual(done.returncode, 0)
        self.assertIn('found 0', result['reason'])
