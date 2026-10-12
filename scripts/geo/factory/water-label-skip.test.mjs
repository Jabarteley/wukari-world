import test from 'node:test';
import assert from 'node:assert/strict';
import { unlabellableWaterRefs, dropWaterLabels } from './water-label-skip.mjs';

const config = { name: 'Tirana', box: [1, 2, 3, 4], names: [
  { id: 'district-1', ref: 'node/1', kind: 'neighbourhood' },
  { id: 'water-way-249196321', ref: 'way/249196321', kind: 'water' },
  { id: 'water-relation-9', ref: 'relation/9', kind: 'water' },
] };
const recipe = `import type { DetailConfig } from './config.ts'\n\nexport const CONFIG = {\n...${JSON.stringify(config, null, 2)},\ndiscovery: (bbox: string) => ({}),\nlanduse: landuseQuery, roads: roadsQuery,\n} satisfies DetailConfig\n`;

test('the generator error names the unlabellable water ref', () => {
  const log = 'water 3 polygons\nError: way/249196321 has no interior point in the rendered water; its centre may fall in a hole\n    at waterLabelPoint';
  assert.deepEqual(unlabellableWaterRefs(log), ['way/249196321']);
  assert.deepEqual(unlabellableWaterRefs('some other failure'), []);
});

test('only the named water label is dropped; neighbourhood labels and the rest of the recipe are untouched', () => {
  const { text, removed } = dropWaterLabels(recipe, ['way/249196321']);
  assert.deepEqual(removed.map(label => label.ref), ['way/249196321']);
  assert.ok(!text.includes('249196321'));
  assert.ok(text.includes('relation/9') && text.includes('"district-1"'));
  assert.ok(text.startsWith('import type') && text.endsWith('} satisfies DetailConfig\n') && text.includes('discovery: (bbox: string) => ({})'));
});

test('a neighbourhood label or an unknown ref is never dropped', () => {
  assert.equal(dropWaterLabels(recipe, ['node/1']).text, recipe);
  assert.deepEqual(dropWaterLabels(recipe, ['way/5']).removed, []);
  assert.equal(dropWaterLabels('not a recipe', ['way/5']).text, 'not a recipe');
});
