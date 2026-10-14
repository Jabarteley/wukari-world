"""Dataset URL allow-list (README-batch.md "Pinned extract mirror"): dated official Geofabrik files, plus pinned mirror copies held as
assets of an extracts-YYYYMMDD release of the public kromate/joinallworld repository. Nothing else.

Run: python3 -I scripts/geo/factory/bootstrap/test_dataset_url.py  (offline; the adapter check needs osmium==4.3.1 and is skipped without it).
"""
import copy
import importlib.util
import json
from pathlib import Path
import re
import unittest

HERE = Path(__file__).resolve().parent
FACTORY = HERE.parent
ADAPTER = HERE.parents[1] / 'offline-extract.py'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


metadata = load('dataset_url_metadata', HERE / 'metadata.py')
batch = load('dataset_url_batch_run', HERE / 'batch-run.py')
try:
    import osmium  # noqa: F401
    adapter = load('dataset_url_adapter', ADAPTER)
except ImportError:
    adapter = None

MIRROR = 'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf'
GEOFABRIK = 'https://download.geofabrik.de/europe/guernsey-jersey-261011.osm.pbf'
REFUSED = [
    'https://download.openstreetmap.fr/extracts/europe/jersey.osm.pbf',                                     # upstream itself: undated, changes
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey.osm.pbf',      # no snapshot in the name
    'https://github.com/kromate/joinallworld/releases/download/v1.0/osmfr-jersey-261013.osm.pbf',           # not an extracts-YYYYMMDD tag
    'https://github.com/kromate/joinallworld/releases/download/extracts-2026101/osmfr-jersey-261013.osm.pbf',
    'https://github.com/someone/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/v1-allworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/latest/download/osmfr-jersey-261013.osm.pbf',
    'http://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    MIRROR + '?raw=1',
    MIRROR + '#x',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/../x/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-Jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf.md5',
    'https://objects.githubusercontent.com/github-production-release-asset/osmfr-jersey-261013.osm.pbf',
    'https://raw.githubusercontent.com/kromate/joinallworld/main/osmfr-jersey-261013.osm.pbf',
]


def mirror_patterns():
    """Every copy of the mirror pattern, read from the sources (the JS copy is a regex literal with escaped slashes)."""
    found = {}
    for path in (HERE / 'metadata.py', HERE / 'country-boundary.py', ADAPTER):
        match = re.search(r"^MIRROR_DATASET_URL = r'([^']+)'$", path.read_text(), re.M)
        found[path.name] = match and match.group(1)
    js = re.search(r'^export const MIRROR_DATASET_URL = /\^(.+)\$/;$', (FACTORY / 'dataset-url.mjs').read_text(), re.M)
    found['dataset-url.mjs'] = js and js.group(1).replace('\\/', '/').replace('([0-9]{6})', '[0-9]{6}')
    return found


class DatasetUrlTests(unittest.TestCase):
    def test_every_copy_of_the_mirror_pattern_is_the_same(self):
        copies = mirror_patterns()
        self.assertTrue(all(copies.values()), copies)
        self.assertEqual(len(set(copies.values())), 1, copies)
        self.assertEqual(copies['metadata.py'], metadata.MIRROR_DATASET_URL)

    def test_metadata_accepts_dated_geofabrik_and_the_pinned_mirror_only(self):
        for url in (GEOFABRIK, MIRROR, 'https://download.geofabrik.de/russia-261011.osm.pbf'):
            self.assertEqual(metadata.validate_dataset_url(url), url)
        for url in REFUSED + ['https://download.geofabrik.de/europe/guernsey-jersey-latest.osm.pbf', None]:
            with self.assertRaises(metadata.Hold, msg=url):
                metadata.validate_dataset_url(url)

    def test_boundary_assembler_carries_the_same_pattern(self):
        source = (HERE / 'country-boundary.py').read_text()
        self.assertIn("or re.fullmatch(MIRROR_DATASET_URL, args.dataset_url)", source)
        pattern = mirror_patterns()['country-boundary.py']
        self.assertTrue(re.fullmatch(pattern, MIRROR))
        self.assertFalse(any(re.fullmatch(pattern, url) for url in REFUSED))

    @unittest.skipIf(adapter is None, 'osmium==4.3.1 not installed')
    def test_adapter_accepts_geofabrik_and_the_pinned_mirror_only(self):
        self.assertTrue(adapter.dataset_url_ok(GEOFABRIK) and adapter.dataset_url_ok(MIRROR))
        self.assertTrue(adapter.dataset_url_ok('https://download.geofabrik.de/europe/guernsey-jersey-latest.osm.pbf'), 'unchanged Geofabrik rule')
        for url in REFUSED + [None]:
            self.assertFalse(adapter.dataset_url_ok(url), url)

    def test_seed_table_with_a_mirror_source_validates_and_keeps_the_date_rule(self):
        table = json.loads((FACTORY / 'country-tables/hm.json').read_text())
        table['countrySource'] = {'url': MIRROR.replace('osmfr-jersey', 'osmfr-heard'), 'bytes': 1, 'md5': '0' * 32, 'snapshotDate': '2026-10-13'}
        batch.validate(copy.deepcopy(table))
        table['countrySource']['snapshotDate'] = '2026-10-14'
        with self.assertRaisesRegex(ValueError, 'dated PBF URL and snapshot date disagree'):
            batch.validate(copy.deepcopy(table))
        table['countrySource'].update(url='https://download.openstreetmap.fr/extracts/europe/jersey.osm.pbf', snapshotDate='2026-10-13')
        with self.assertRaises(ValueError):
            batch.validate(copy.deepcopy(table))

    def test_a_mirror_primary_takes_no_neighbours(self):
        table = json.loads((FACTORY / 'country-tables/hm.json').read_text())
        table['countrySource'] = {'url': MIRROR, 'bytes': 1, 'md5': '0' * 32, 'snapshotDate': '2026-10-13',
                                  'neighbours': [{'url': 'https://download.geofabrik.de/europe/france-261013.osm.pbf', 'bytes': 1, 'md5': '1' * 32,
                                                  'snapshotDate': '2026-10-13', 'reason': 'test fixture neighbour'}]}
        with self.assertRaisesRegex(ValueError, 'Geofabrik primary'):
            batch.validate(table)


if __name__ == '__main__':
    unittest.main()
