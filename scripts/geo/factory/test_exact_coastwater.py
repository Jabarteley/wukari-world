"""Ground bounds of the exact-coast stage: the wide box is the app's reach (reachFor, 0.4 to 0.6 degrees) around the play box.

Run: python3 -B -m unittest scripts/geo/factory/test_exact_coastwater.py
"""
import glob
import importlib.util
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('exact_coastwater', HERE / 'exact-coastwater.py')
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)
CASES = {case['country']: case for case in json.loads((HERE / 'fixtures' / 'exact-coast-reach.json').read_text())['cases']}


def first_boxes(value):
    if isinstance(value, dict):
        if isinstance(value.get('boxes'), dict) and 'play' in value['boxes'] and 'wide' in value['boxes']:
            return value['boxes']
        values = value.values()
    elif isinstance(value, list):
        values = value
    else:
        return None
    for item in values:
        found = first_boxes(item)
        if found:
            return found
    return None


class GroundBounds(unittest.TestCase):
    def check(self, case):
        return stage.check_ground_bounds({'box': case['play']}, {'play': case['play'], 'wide': case['wide']})

    def test_small_box_uses_the_app_floor_of_0_4(self):
        # Adamstown (pn): a 0.1-degree play box; the app's reach is 0.4, which the old fixed 0.6 refused.
        case = CASES['pn']
        self.assertEqual(stage.reach_for(case['play']), 0.4)
        self.assertEqual(self.check(case), (case['play'], case['wide']))

    def test_between_floor_and_cap_matches_the_app_exactly(self):
        # Port-aux-Francais (tf): reach 1.5 * 0.138 + 0.2 = 0.407..., compared bit for bit with the app's wide box.
        case = CASES['tf']
        self.assertTrue(0.4 < stage.reach_for(case['play']) < 0.6)
        self.assertEqual(stage.wide_for(case['play']), case['wide'])
        self.check(case)

    def test_regression_0_6_boxes_unchanged(self):
        for country in ['mv', 'hm']:
            case = CASES[country]
            play = case['play']
            self.assertEqual(stage.reach_for(play), 0.6)
            self.assertEqual(stage.wide_for(play), [play[0] - .6, play[1] - .6, play[2] + .6, play[3] + .6])
            self.check(case)

    def test_still_refuses_disagreeing_bounds(self):
        case = CASES['pn']
        play = case['play']
        with self.assertRaisesRegex(ValueError, 'Recipe/extract ground bounds disagree'):
            stage.check_ground_bounds({'box': play}, {'play': play, 'wide': [play[0] - .6, play[1] - .6, play[2] + .6, play[3] + .6]})
        with self.assertRaisesRegex(ValueError, 'Recipe/extract ground bounds disagree'):
            stage.check_ground_bounds({'box': CASES['tf']['play']}, {'play': play, 'wide': case['wide']})

    def test_every_table_the_old_rule_accepted_is_still_accepted(self):
        accepted = 0
        for path in sorted(glob.glob(str(HERE / 'country-factory' / '*-factory-targets.json'))):
            for target in json.loads(Path(path).read_text()).get('targets', []):
                boxes = first_boxes(target)
                if not boxes:
                    continue
                play, wide = boxes['play'], boxes['wide']
                if wide == [play[0] - .6, play[1] - .6, play[2] + .6, play[3] + .6]:
                    accepted += 1
                    self.assertEqual(stage.reach_for(play), 0.6, target['id'])
                    stage.check_ground_bounds({'box': play}, boxes)
        self.assertGreater(accepted, 100)


if __name__ == '__main__':
    unittest.main()
