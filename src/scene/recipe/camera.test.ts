import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createOrbit, followShare } from '../camera-controls.ts';
import type { SceneCamera } from '../types.ts';
import type { ValidatedRecipe } from './contract.ts';
import type { RecipeRuntimeMetadata } from './pack.ts';
import type { PreparedCityAssets } from './prepare.ts';
import { compileRecipe } from './compile.ts';

// Read the real host constants without importing its full game/renderer graph.
const host = readFileSync(new URL('../../venue-world.ts', import.meta.url), 'utf8');
const match = /export const START_DISTANCE = Object\.freeze\(\{ portrait: ([\d.]+), short: ([\d.]+), wide: ([\d.]+) \}\)/.exec(host);
assert.ok(match, 'host arrival distance declaration must be reviewed if its shape changes');
const distances = { portrait: Number(match[1]), short: Number(match[2]), wide: Number(match[3]) };
const distance = ([x, y, z]: readonly number[]) => Math.hypot(x!, y! - 0.7, z!);
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

function compiled(camera: Pick<SceneCamera, 'landscape' | 'portrait'>) {
  const value: ValidatedRecipe = {
    recipe: {
      schema: 'allworld-scene', version: 1, units: 'scene', city: 'accra', venue: 'camera-fixture', kind: 'market', region: 'gulf-guinea', mood: 'outdoor',
      palette: { ground: '#777777', wall: '#888888', roof: '#999999', accent: '#aaaaaa', trim: '#bbbbbb' },
      footprint: { w: 30, d: 24 }, entrance: [0, 9, Math.PI], shell: [], props: [], signs: [], spots: [], crowd: [], lamps: [], camera,
    },
    placements: [], walk: { bounds: [-15, -12, 15, 12], block: [] }, solids: [],
    estimate: { triangles: 12, meshes: 1, lights: 0 }, evidence: 'recipe-validation-only',
  };
  const measurement = { version: 1, kind: 'kit', id: 'gulf-guinea', sha256: 'a'.repeat(64), rawBytes: 1, brotliBytes: 1, triangles: 0, parts: [] } as const;
  const prepared: PreparedCityAssets = { kit: { measurement, models: new Map() } };
  const metadata: RecipeRuntimeMetadata = {
    schema: 'allworld-recipe-runtime', version: 1, city: 'accra', region: 'gulf-guinea', recipeSha256: 'b'.repeat(64), recipeBytes: 1,
    targetVenueIds: ['camera-fixture'], assets: { kit: { url: '/camera-fixture.glb', measurement } },
    hostScenery: { 'camera-fixture': { triangles: 0, meshes: 0, lights: 0 } },
  };
  const before = structuredClone(value);
  const definition = compileRecipe(value, prepared, metadata);
  assert.deepEqual(value, before, 'compilation must not rewrite recipe positions or presets');
  assert.deepEqual(definition.walk?.bounds, [-15, -12, 15, 12]);
  assert.deepEqual(definition.runtime?.reservation, { triangles: 12, drawCalls: 2 });
  assert.ok(definition.camera);
  return definition.camera;
}

for (const [label, landscape, portrait] of [
  ['portrait farther', [18, 24, 30], [12, 34, 48]],
  ['landscape farther', [-48, 35, 52], [16, 22, 32]],
] as const) {
  test(`recipe arrival keeps both composed presets when ${label}`, () => {
    const camera = compiled({ landscape: [...landscape], portrait: [...portrait] });
    assert.equal(Math.min(...Object.values(distances)), 13, 'compiler uses the shortest actual host baseline');
    assert.deepEqual(camera.landscape, landscape);
    assert.deepEqual(camera.portrait, portrait);
    assert.ok(camera.start! > 1);
    for (const orientation of ['portrait', 'short', 'wide'] as const) {
      const preset = orientation === 'portrait' ? camera.portrait : camera.landscape;
      const whole = distance(preset);
      assert.ok(Math.min(1, distances[orientation] / whole) < 1, 'fixture exposes the previous arrival clamp');
      const close = Math.min(1, distances[orientation] * camera.start! / whole);
      near(close, 1);
      near(followShare(1 / close), 0.35);
    }
  });
}

test('compact recipes retain the normal start and camera coordinates stay in scene units', () => {
  const camera = compiled({ landscape: [0, 0.7, 10], portrait: [0, 0.7, 12] });
  assert.equal(camera.start, 1);
  assert.deepEqual(camera.landscape, [0, 0.7, 10]);
  assert.deepEqual(camera.portrait, [0, 0.7, 12]);
});

test('composed recipe arrival still supports normal zoom and recentre', () => {
  const camera = compiled({ landscape: [18, 24, 30], portrait: [12, 34, 48] });
  const orbit = createOrbit(), whole = distance(camera.portrait);
  orbit.setBase(camera.portrait);
  orbit.setLimits({ near: 6.2, far: whole * 1.38 });
  orbit.reset(); orbit.snap();
  near(orbit.distance, whole);
  near(followShare(orbit.now.zoom), 0.35);
  orbit.zoomBy(1.5); orbit.snap();
  assert.ok(orbit.distance < whole);
  assert.ok(followShare(orbit.now.zoom) > 0.35);
  orbit.reset(); orbit.snap();
  near(orbit.distance, whole);
  near(followShare(orbit.now.zoom), 0.35);
});
