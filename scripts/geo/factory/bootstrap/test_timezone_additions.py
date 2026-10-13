"""Tests for the reviewed ISO/timezone additions (Kosovo XK, Somaliland XS, Northern Cyprus XN) of batch-run.py.

The two pinned IANA files stay byte-identical; only a run for an ISO code named in timezone-data/reviewed-additions.json reads copies
with that one reviewed row appended. Run: python3 -m unittest scripts/geo/factory/bootstrap/test_timezone_additions.py
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('batch_run_under_test', HERE / 'batch-run.py')
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)
metadata = batch._shared._metadata


class ReviewedAdditions(unittest.TestCase):
    def setUp(self):
        self.manifest, self.files = batch.timezone_source_files()
        self.tmp = tempfile.TemporaryDirectory(prefix='tz-additions-test-')

    def tearDown(self):
        self.tmp.cleanup()

    def test_pinned_iana_files_are_unchanged_and_the_additions_file_is_pinned(self):
        for key in ('zone1970', 'iso3166'):
            path, record = self.files[key]
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), record['sha256'])
        additions, record = batch.reviewed_additions(self.manifest)
        self.assertEqual(sorted(additions), ['XK', 'XN', 'XS'])
        self.assertEqual(hashlib.sha256((HERE / record['path']).read_bytes()).hexdigest(), record['sha256'])
        for iso, entry in additions.items():
            self.assertIn('user-assigned code', entry['codeStatus'])
            self.assertIn('game map only', entry['codeStatus'])

    def test_an_ordinary_country_reads_the_pinned_files_themselves(self):
        for iso in ('RS', 'SO', 'CY', 'NG', 'FI', 'AX'):
            zone, countries, extra = batch.effective_timezone_files(iso, self.files, self.manifest, Path(self.tmp.name) / iso)
            self.assertEqual((zone, countries, extra), (self.files['zone1970'][0], self.files['iso3166'][0], {}), iso)
            self.assertFalse((Path(self.tmp.name) / iso).exists(), iso)

    def test_each_user_assigned_code_resolves_to_its_reviewed_row_only(self):
        expected = {'XK': ('Kosovo', 'Europe/Belgrade'), 'XS': ('Somaliland', 'Africa/Nairobi'), 'XN': ('Northern Cyprus', 'Asia/Famagusta')}
        for iso, (name, zone_id) in expected.items():
            zone, countries, extra = batch.effective_timezone_files(iso, self.files, self.manifest, Path(self.tmp.name) / iso)
            zone_lines, country_lines = zone.read_text().splitlines(), countries.read_text().splitlines()
            self.assertEqual(metadata.choose_timezone(zone_lines, iso)[0], zone_id)
            self.assertEqual(metadata.country_name(country_lines, iso), name)
            record = extra['reviewedAddition']
            self.assertEqual((record['iso'], record['zoneId']), (iso, zone_id))
            self.assertEqual(record['zoneTabSha256'], hashlib.sha256(zone.read_bytes()).hexdigest())
            self.assertEqual(record['pinnedZoneTabSha256'], self.files['zone1970'][1]['sha256'])
            # Exactly one line was appended to each pinned file; every other line is the pinned one.
            pinned_zone, pinned_countries = self.files['zone1970'][0].read_text().splitlines(), self.files['iso3166'][0].read_text().splitlines()
            self.assertEqual(zone_lines[:len(pinned_zone)], pinned_zone)
            self.assertEqual(country_lines[:len(pinned_countries)], pinned_countries)
            self.assertEqual((len(zone_lines) - len(pinned_zone), len(country_lines) - len(pinned_countries)), (1, 1))
            # The neighbouring pinned countries resolve exactly as before.
            for other in ('RS', 'SO'):
                self.assertEqual(metadata.choose_timezone(zone_lines, other), metadata.choose_timezone(pinned_zone, other))

    def test_a_timezone_selector_must_match_the_reviewed_zone(self):
        zone, _, _ = batch.effective_timezone_files('XK', self.files, self.manifest, Path(self.tmp.name) / 'XK')
        url = 'https://data.iana.org/time-zones/tzdb-2026e/zone1970.tab'
        self.assertEqual(metadata.choose_timezone(zone.read_text().splitlines(), 'XK', {'id': 'Europe/Belgrade', 'sourceUrl': url})[0], 'Europe/Belgrade')
        with self.assertRaises(metadata.Hold):
            metadata.choose_timezone(zone.read_text().splitlines(), 'XK', {'id': 'Europe/Paris', 'sourceUrl': url})

    def test_a_tampered_additions_file_is_refused(self):
        manifest = json.loads(json.dumps(self.manifest))
        manifest['reviewedAdditions']['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            batch.reviewed_additions(manifest)
        manifest = json.loads(json.dumps(self.manifest))
        manifest['reviewedAdditions']['path'] = 'timezone-data/zone1970.tab'
        with self.assertRaises(ValueError):
            batch.reviewed_additions(manifest)

    def test_the_tables_of_the_additions_validate(self):
        tables = HERE.parent / 'country-tables'
        for cc in ('xk', 'xs', 'xn'):
            table = json.loads((tables / (cc + '.json')).read_text())
            seeds, _, _ = batch.validate(table)
            zone, countries, _ = batch.effective_timezone_files(seeds[0]['countryISO'], self.files, self.manifest, Path(self.tmp.name) / cc)
            report = batch.check_seeds_offline(seeds, zone, countries)
            self.assertEqual([row['status'] for row in report], ['OK'], report)
        # Without the addition the same table is HELD, with the reason from the pinned tables.
        seeds, _, _ = batch.validate(json.loads((tables / 'xk.json').read_text()))
        held = batch.check_seeds_offline(seeds, self.files['zone1970'][0], self.files['iso3166'][0])
        self.assertEqual(held[0]['status'], 'HOLD')


class AirportCountryOverride(unittest.TestCase):
    URL = 'https://ourairports.com/airports/EFMA/'
    ROWS = [(2, {'ident': 'EFMA', 'type': 'medium_airport', 'name': 'Mariehamn Airport', 'iso_country': 'FI', 'scheduled_service': 'yes', 'municipality': 'Mariehamn'}),
            (3, {'ident': 'EFHK', 'type': 'large_airport', 'name': 'Helsinki Airport', 'iso_country': 'FI', 'scheduled_service': 'yes', 'municipality': 'Helsinki'}),
            (4, {'ident': 'EFHF', 'type': 'heliport', 'name': 'Heli', 'iso_country': 'FI', 'scheduled_service': 'no', 'municipality': 'X'})]
    OVERRIDE = {'iso': 'FI', 'reason': 'OurAirports files EFMA under FI because it has no AX row (test).'}

    def seed(self, ident='EFMA', **airport):
        return {'id': 'mariehamn', 'name': 'Mariehamn', 'countryISO': 'AX', 'airport': {'ident': ident, 'sourceUrl': self.URL, **airport}}

    def test_without_the_override_the_other_country_airport_is_refused(self):
        with self.assertRaises(metadata.Hold):
            metadata.choose_airport(self.ROWS, self.seed())

    def test_with_the_override_the_named_row_is_chosen_and_other_rules_still_apply(self):
        self.assertEqual(metadata.choose_airport(self.ROWS, self.seed(countryOverride=self.OVERRIDE))[1]['ident'], 'EFMA')
        with self.assertRaises(metadata.Hold):  # a row of a third country, a heliport and a wrong override country are all refused
            metadata.choose_airport(self.ROWS, self.seed('EFMA', countryOverride={**self.OVERRIDE, 'iso': 'SE'}))
        with self.assertRaises(metadata.Hold):
            metadata.choose_airport(self.ROWS, self.seed('EFHF', countryOverride=self.OVERRIDE))

    def test_the_override_needs_a_reason_a_foreign_country_and_no_waiver(self):
        for bad in ({'iso': 'FI', 'reason': 'short'}, {'iso': 'AX', 'reason': self.OVERRIDE['reason']}, {'iso': 'fi', 'reason': self.OVERRIDE['reason']},
                    {'iso': 'FI'}, {'iso': 'FI', 'reason': self.OVERRIDE['reason'], 'extra': 1}):
            with self.assertRaises(metadata.Hold, msg=str(bad)):
                metadata.validate_seed(self.seed(countryOverride=bad))
        with self.assertRaises(metadata.Hold):
            metadata.validate_seed(self.seed(countryOverride=self.OVERRIDE, hubWaiver='A written reason of more than twenty characters.'))
        self.assertEqual(metadata.validate_seed(self.seed(countryOverride=self.OVERRIDE))['airport']['countryOverride'], self.OVERRIDE)

    def test_the_airport_must_lie_inside_the_territory(self):
        merge = batch._merge
        with tempfile.TemporaryDirectory(prefix='airport-inside-test-') as tmp:
            boundary = Path(tmp) / 'boundary.geojson'
            boundary.write_text(json.dumps({'type': 'Polygon', 'coordinates': [[[19, 59.5], [21, 59.5], [21, 60.5], [19, 60.5], [19, 59.5]]]}))
            self.assertTrue(merge.airport_inside_boundary('mariehamn', {'lon': 19.898, 'lat': 60.122}, boundary)['airportInsideAdmin0'])
            with self.assertRaises(merge.MergeError):
                merge.airport_inside_boundary('mariehamn', {'lon': 24.96, 'lat': 60.32}, boundary)


if __name__ == '__main__':
    unittest.main()
