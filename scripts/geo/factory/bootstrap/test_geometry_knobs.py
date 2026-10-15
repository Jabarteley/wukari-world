"""Seed geometry knobs (seed.geometry) and play box size (seed.playBox): table validation in batch-run.py.

Run: python3 -m unittest scripts/geo/factory/bootstrap/test_geometry_knobs.py
"""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('batch_run_knobs', HERE / 'batch-run.py')
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)
TABLE = json.loads((HERE.parent / 'country-tables' / 'sg.json').read_text()) if (HERE.parent / 'country-tables' / 'sg.json').exists() else None


@unittest.skipIf(TABLE is None, 'country-tables/sg.json absent')
class SeedKnobs(unittest.TestCase):
    def table(self, **seed):
        table = copy.deepcopy(TABLE)
        table['seeds'][0].pop('geometry', None)
        table['seeds'][0].pop('playBox', None)
        table['seeds'][0].update(seed)
        return table

    def test_plain_seed_passes(self):
        batch.validate(self.table())

    def test_known_knobs_pass(self):
        batch.validate(self.table(geometry={'waterTolerance': 0.0008, 'maxRoads': 450, 'seaBandMetres': 30000}, playBox={'playKm': 14, 'coreKm': 5}))

    def test_unknown_or_bad_knobs_refused(self):
        for geometry in ({'bogus': 1}, {'maxRoads': 450.5}, {'maxRoads': 50}, {'waterTolerance': 0.5}, {'waterTolerance': '0.001'}, {'cell': True}, {}):
            with self.assertRaises(ValueError, msg=str(geometry)):
                batch.validate(self.table(geometry=geometry))

    def test_one_sided_play_box_passes(self):
        batch.validate(self.table(playBox={'westKm': 10.45}))
        batch.validate(self.table(playBox={'playKm': 14, 'eastKm': 10.35, 'northKm': 18, 'southKm': 6, 'coreKm': 5}))
        # Sides down to 1 km: with no coreKm the core defaults to the smallest side minus 0.1 km (bounds-policy.mjs).
        batch.validate(self.table(playBox={'northKm': 7.64, 'southKm': 1.344}))
        batch.validate(self.table(playBox={'eastKm': 10.35, 'northKm': 3.27}))
        batch.validate(self.table(playBox={'southKm': 1.344, 'coreKm': 1}))

    def test_play_box_refused(self):
        for box in ({'playKm': 2}, {'playKm': 12, 'coreKm': 13}, {'coreKm': 30}, {'width': 3}, {}, {'westKm': 0.5}, {'eastKm': 50},
                    {'northKm': '10'}, {'southKm': 6, 'coreKm': 8}, {'westKm': 2, 'coreKm': 5}, {'southKm': 1.344, 'coreKm': 2}):
            with self.assertRaises(ValueError, msg=str(box)):
                batch.validate(self.table(playBox=box))

    def test_city_results_carry_the_knobs(self):
        seed = {'id': 'x', 'geometry': {'maxRoads': 450}, 'playBox': {'playKm': 14}}
        self.assertEqual(batch.geometry_policy(seed), {'geometry': {'maxRoads': 450}, 'playBox': {'playKm': 14}})
        self.assertEqual(batch.geometry_policy({'id': 'x'}), {})

    def test_knob_file_matches_the_recipe_keys(self):
        recipe_keys = {spec['recipeKey'].split('.')[0] for spec in batch.KNOBS['geometry'].values()}
        self.assertTrue({'waterTolerance', 'outlineTolerance', 'farTolerance', 'coreTolerance', 'maxRoads', 'cell', 'split', 'sea'} <= recipe_keys)


if __name__ == '__main__':
    unittest.main()
