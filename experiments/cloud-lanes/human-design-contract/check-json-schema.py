"""Independent Draft 2020-12 check using the environment's existing jsonschema package."""
from copy import deepcopy
from importlib.metadata import version
from pathlib import Path
import json
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parent
load = lambda name: json.loads((root / name).read_text())
validators = {}
for name in ['human-design-v1', 'human-design-v2', 'anchor-bindings-v1']:
    schema = load(name + '.schema.json')
    Draft202012Validator.check_schema(schema)
    validators[name] = Draft202012Validator(schema)
cases = [(entry['file'], 'human-design-v2') for entry in load('fixtures/index.json')['presets']]
cases += [('prototype-v1.json', 'human-design-v1'), ('synthetic-hair-bindings.json', 'anchor-bindings-v1')]
for name, kind in cases:
    validators[kind].validate(load('fixtures/' + name))
base = load('fixtures/fictional-01.json')
invalid = []
for value in [-1.01, 1.01, None, '0', True]:
    item = deepcopy(base)
    item['design']['morphology']['nose']['projection'] = value
    invalid.append(item)
item = deepcopy(base)
del item['design']['morphology']['earRight']
invalid.append(item)
item = deepcopy(base)
item['design']['morphology']['earLeft']['race'] = 'fictional'
invalid.append(item)
item = deepcopy(base)
item['design']['expression']['blinkLeft'] = 1
invalid.append(item)
item = deepcopy(base)
item['schemaVersion'] = 3
invalid.append(item)
item = deepcopy(base)
item['legacyLook']['account'] = {'email': 'not-accepted@example.invalid'}
invalid.append(item)
for item in invalid:
    assert list(validators['human-design-v2'].iter_errors(item)), 'invalid example passed'
print(json.dumps({'validator': 'jsonschema ' + version('jsonschema'), 'draft': '2020-12', 'validSchemas': 3, 'validFixtures': len(cases), 'rejectedInvalidFixtures': len(invalid), 'note': 'Cross-check only; barycentric sums and mesh identity are semantic Node checks.'}))
