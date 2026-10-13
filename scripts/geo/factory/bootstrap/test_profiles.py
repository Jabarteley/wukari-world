"""Seed profile checks (profiles.json) for the city-node choice in metadata.py. Run: python3 -I scripts/geo/factory/bootstrap/test_profiles.py
Fixtures are the real OSM tags of the nodes the 13 Oct 2026 microstate run met (Yaren, Vatican City); no osmium needed."""
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('bootstrap_metadata_profiles', HERE / 'metadata.py')
metadata = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metadata)

def node(ref, **tags):
    return {'ref': f'node/{ref}', 'tags': tags, 'lon': 0, 'lat': 0}

# Real tags: Yaren is a village node in OSM (Nauru has no city or town); the Holy See's capital node is mapped place=suburb.
YAREN = node(313728509, name='Yaren', place='village')
YAREN_LOCALITY = node(1, name='Yaren', place='locality')
VATICAN = node(424311883, name='Civitas Vaticana - Città del Vaticano', **{'name:en': 'Vatican City'}, place='suburb', capital='yes', wikidata='Q237')
VATICAN_SUBURB_NOT_CAPITAL = node(2, **{'name:en': 'Vatican City'}, name='Vatican City', place='suburb')

class ProfileCityNodeTests(unittest.TestCase):
    def test_standard_seed_still_needs_city_or_town(self):
        seed = {'id': 'yaren', 'name': 'Yaren', 'countryISO': 'NR'}
        with self.assertRaises(metadata.Hold):
            metadata.choose_city([YAREN], seed)
        town = node(5, name='Yaren', place='town')
        self.assertEqual(metadata.choose_city([town], seed)['ref'], 'node/5')

    def test_microstate_accepts_a_village_node_and_prefers_the_higher_tag(self):
        seed = {'id': 'yaren', 'name': 'Yaren', 'countryISO': 'NR', 'profile': 'microstate'}
        self.assertEqual(metadata.choose_city([YAREN], seed)['ref'], 'node/313728509')
        self.assertEqual(metadata.choose_city([YAREN_LOCALITY, YAREN], seed)['ref'], 'node/313728509')
        with self.assertRaises(metadata.Hold):
            metadata.choose_city([YAREN, node(9, name='Yaren', place='village')], seed)   # two equal-rank nodes stay ambiguous
        self.assertEqual(metadata.choose_city([YAREN, node(9, name='Yaren', place='village')], {**seed, 'cityOsmRef': 'node/313728509'})['ref'], 'node/313728509')

    def test_microstate_accepts_a_suburb_only_when_it_is_the_capital_node(self):
        seed = {'id': 'vatican-city', 'name': 'Vatican City', 'countryISO': 'VA', 'profile': 'microstate'}
        self.assertEqual(metadata.choose_city([VATICAN], seed)['ref'], 'node/424311883')
        with self.assertRaises(metadata.Hold):
            metadata.choose_city([VATICAN_SUBURB_NOT_CAPITAL], seed)
        with self.assertRaises(metadata.Hold):   # the standard profile never accepts it
            metadata.choose_city([VATICAN], {key: value for key, value in seed.items() if key != 'profile'})

    def test_node_tag_predicate_matches_the_scan(self):
        micro, standard = {'profile': 'microstate'}, {}
        self.assertTrue(metadata.city_node_tag_ok({'place': 'hamlet'}, micro))
        self.assertFalse(metadata.city_node_tag_ok({'place': 'hamlet'}, standard))
        self.assertTrue(metadata.city_node_tag_ok({'place': 'suburb', 'capital': '2'}, micro))
        self.assertFalse(metadata.city_node_tag_ok({'place': 'suburb'}, micro))
        self.assertFalse(metadata.city_node_tag_ok({'place': 'island', 'capital': 'yes'}, micro))
        self.assertEqual(metadata.city_place_tags(standard), {'city', 'town'})

    def test_seed_validation(self):
        base = {'id': 'yaren', 'name': 'Yaren', 'countryISO': 'NR'}
        metadata.validate_seed({**base, 'profile': 'microstate'})
        for bad in ('standard', 'tiny', 3):
            with self.assertRaises(metadata.Hold):
                metadata.validate_seed({**base, 'profile': bad})

    def test_profile_file_is_the_single_source(self):
        data = json.loads((HERE / 'profiles.json').read_text())['profiles']
        self.assertEqual(data['standard'], {'minimumPlaces': 20, 'minimumNeighbourhoodLabels': 5, 'maximumEmptySlots': 0, 'cityPlaceTags': ['city', 'town'], 'capitalPlaceTags': [], 'districtIslandPlaces': []})
        self.assertEqual(data['microstate']['minimumPlaces'], 12)
        self.assertEqual(data['microstate']['minimumNeighbourhoodLabels'], 3)
        self.assertEqual(data['microstate']['maximumEmptySlots'], 4)
        self.assertEqual(data['microstate']['districtSquarePlaces'], ['square'])
        self.assertNotIn('districtSquarePlaces', data['standard'])

# Real OurAirports rows (commit 03565b61): the Boryspil row says scheduled_service=no and type large_airport; Ramallah and Monaco are heliports.
def row(**fields):
    return {'ident': '', 'type': '', 'name': 'x', 'iso_country': '', 'scheduled_service': 'no', 'municipality': '', **fields}
UKBB = row(ident='UKBB', type='large_airport', name='Boryspil International Airport', iso_country='UA', municipality='Boryspil')
ZDM = row(ident='ZDM', type='heliport', name='Ramallah Heliport', iso_country='PS', municipality='Ramallah')
LNMC = row(ident='LNMC', type='heliport', name='Monaco Heliport', iso_country='MC', municipality='Fontvieille', scheduled_service='yes')
KYIV_SCHEDULED = row(ident='UKKK', type='medium_airport', name='Zhuliany', iso_country='UA', scheduled_service='yes')
WAIVER = 'Written reason of well over twenty characters; the game claims no operations.'

class HubWaiverTests(unittest.TestCase):
    def selector(self, ident, waiver=True):
        return {'ident': ident, 'sourceUrl': 'https://ourairports.com/airports/' + ident + '/', **({'hubWaiver': WAIVER} if waiver else {})}

    def test_waiver_accepts_the_named_row_of_a_country_without_scheduled_service(self):
        for airport, iso in ((UKBB, 'UA'), (ZDM, 'PS'), (LNMC, 'MC')):
            seed = {'id': 'x', 'name': 'X', 'countryISO': iso, 'airport': self.selector(airport['ident'])}
            number, chosen = metadata.choose_airport([(2, airport)], seed)
            self.assertEqual(chosen['ident'], airport['ident'])

    def test_without_the_waiver_a_unscheduled_row_is_refused(self):
        seed = {'id': 'x', 'name': 'X', 'countryISO': 'UA', 'airport': self.selector('UKBB', waiver=False)}
        with self.assertRaises(metadata.Hold):
            metadata.choose_airport([(2, UKBB)], seed)

    def test_waiver_is_refused_when_the_country_has_a_scheduled_airport(self):
        seed = {'id': 'x', 'name': 'X', 'countryISO': 'UA', 'airport': self.selector('UKBB')}
        with self.assertRaises(metadata.Hold) as raised:
            metadata.choose_airport([(2, UKBB), (3, KYIV_SCHEDULED)], seed)
        self.assertIn('hubWaiver refused', str(raised.exception))

    def test_waiver_needs_a_written_reason_and_the_same_country(self):
        with self.assertRaises(metadata.Hold):
            metadata.validate_seed({'id': 'x', 'name': 'X', 'countryISO': 'UA', 'airport': {**self.selector('UKBB'), 'hubWaiver': 'too short'}})
        with self.assertRaises(metadata.Hold):
            metadata.choose_airport([(2, UKBB)], {'id': 'x', 'name': 'X', 'countryISO': 'PS', 'airport': self.selector('UKBB')})

if __name__ == '__main__':
    unittest.main()
