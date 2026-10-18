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
  assert.equal(typeof definition.camera.fit, 'function');
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


test('compiled fit includes entry, current elevated player and actual host solids without changing layout', () => {
  const camera = compiled({ landscape: [18, 24, 30], portrait: [12, 34, 48] });
  const frame = { preset: camera.portrait, pivot: [0, 1, 3], player: [0, 0, 9], scale: 1,
    width: 390, height: 740, fov: 48, zoom: 1, shift: 64, top: 108, bottom: 324, solids: [] };
  const entry = camera.fit!(frame); assert.ok(entry !== null && Number.isFinite(entry));
  const raised = camera.fit!({ ...frame, player: [18, 8, 9] }); assert.ok(raised !== null && raised > entry);
  const table = camera.fit!({ ...frame, solids: [[-25, 0, -8, -22, 1.7, -5]] }); assert.ok(table !== null && table > entry);
  assert.equal(camera.fit!({ ...frame, player: [NaN, 0, 0] }), null);
});


test('actual host fit invocation uses whole-view pivot despite stale zoom during venue reset', () => {
  const start = host.indexOf("      const share = currentLocation === 'neighbourhood'", host.indexOf('  function frame()'));
  const end = host.indexOf('      if (fitted !== null', start);
  assert.ok(start >= 0 && end > start);
  // Execute the small real host invocation, without importing the full renderer graph.
  const invoke = new Function('currentLocation', 'uiMode', 'followShare', 'walk', 'walker', 'avatarY', 'view', 'preset',
    'width', 'height', 'camera', 'shift', 'insets', `${host.slice(start, end)} return fitted;`);
  const camera = compiled({ landscape: [18, 24, 30], portrait: [12, 34, 48] });
  const orbit = createOrbit(); orbit.setBase(camera.portrait); orbit.setLimits({ near: 6.2 });
  const walker = { x: 0, z: 9 }, walk = { centre: [0, .7, 0], scale: 1, solids: [] };
  const captured: { pivot?: number[] } = {};
  const view = { fit: (frame: Parameters<NonNullable<SceneCamera['fit']>>[0]) => {
    captured.pivot = [...frame.pivot]; return camera.fit!(frame);
  } };
  let reference: number | undefined;
  for (const oldZoom of [1, 2, 3]) {
    orbit.goal.zoom = oldZoom; orbit.snap(); orbit.reset();
    assert.equal(orbit.now.zoom, oldZoom); assert.equal(orbit.goal.zoom, 1);
    const result = invoke('camera-fixture', 'venue', followShare, walk, walker, 0, view, camera.portrait,
      390, 740, { fov: 48, zoom: 1 }, 64, { top: 108, bottom: 324 });
    assert.deepEqual(captured.pivot, [0, .7 + (1.55 - .7) * .35, 9 * .35]);
    assert.ok(typeof result === 'number' && Number.isFinite(result));
    if (reference === undefined) reference = result; else near(result, reference);
  }
});

test('actual host recentre resets then refits only opted-in scenes at the current walker position', () => {
  const match = /function recentre\(\) \{([^\n]+)\}/.exec(host); assert.ok(match);
  const recentre = new Function('orbit', 'current', 'frame', 'redrawView', match[1]!);
  const events: string[] = [], orbit = createOrbit();
  orbit.zoomBy(2); orbit.snap();
  const wrappedOrbit = { reset: () => { events.push('reset'); orbit.reset(); } };
  let walkerX = 4;
  const fit = () => { events.push(`fit:${walkerX}`); assert.equal(orbit.goal.zoom, 1); };
  const redraw = () => events.push('redraw');
  recentre(wrappedOrbit, { camera: { fit } }, fit, redraw);
  assert.deepEqual(events, ['reset', 'fit:4', 'redraw']);
  events.length = 0; walkerX = 12;
  recentre(wrappedOrbit, { camera: { fit } }, fit, redraw);
  assert.deepEqual(events, ['reset', 'fit:12', 'redraw']);
  events.length = 0;
  recentre(wrappedOrbit, { camera: {} }, fit, redraw);
  assert.deepEqual(events, ['reset', 'redraw']);
  for (const authored of [{}, null]) {
    events.length = 0;
    recentre(wrappedOrbit, authored, fit, redraw);
    assert.deepEqual(events, ['reset', 'redraw']);
  }
});
