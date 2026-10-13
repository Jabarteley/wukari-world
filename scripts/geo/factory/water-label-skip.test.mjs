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

test('a generated water label outside the play box is found by id and dropped; inside labels and neighbourhoods stay', async () => {
  const { outsideWaterLabelIds, dropWaterLabelsById } = await import('./water-label-skip.mjs');
  const terrain = 'export const TERRAIN = {\n  names: ' + JSON.stringify([
    { id: 'water-way-249196321', name: 'A', lon: 5.2, lat: 2.5, kind: 'water' },
    { id: 'water-relation-9', name: 'B', lon: 3.5, lat: 2.5, kind: 'water' },
    { id: 'district-1', name: 'C', lon: 9, lat: 9, kind: 'neighbourhood' },
  ]) + ',\n  surround: {},\n}\n';
  assert.deepEqual(outsideWaterLabelIds(terrain, [2, 1, 4, 3]), ['water-way-249196321']);
  assert.deepEqual(outsideWaterLabelIds('no names here', [2, 1, 4, 3]), []);
  const { text, removed } = dropWaterLabelsById(recipe, ['water-way-249196321', 'district-1']);
  assert.deepEqual(removed.map(label => label.ref), ['way/249196321']);
  assert.ok(text.includes('relation/9') && text.includes('"district-1"'));
});
