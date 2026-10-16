import './native-test-fixture.ts';
import { loadCityContent as preloadCityContent } from '../../game/cities/registry.ts';
await preloadCityContent('lagos');
// Capability hints may reduce optional scenery; the native character remains the scene body on every device.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type * as THREE from 'three';
import { createKit } from '../kit.ts';
import { buildHomeScene } from '../home-scene.ts';
import { createLife } from '../../life.ts';
import type { LifeState } from '../../types/life.ts';
import { bodyAllowed, bodyImports, drawsWebGL2 } from './gate.ts';

test('bodyAllowed: never on Data Saver, 2G or the low tier', () => {
  assert.equal(bodyAllowed({ hardwareConcurrency: 8, deviceMemory: 8 }), true);
  assert.equal(bodyAllowed({}), true, 'unreported values do not count against a device');
  assert.equal(bodyAllowed({ connection: { saveData: true } }), false);
  assert.equal(bodyAllowed({ connection: { effectiveType: '2g' } }), false);
  assert.equal(bodyAllowed({ connection: { effectiveType: 'slow-2g' } }), false);
  assert.equal(bodyAllowed({ hardwareConcurrency: 2 }), false);
  assert.equal(bodyAllowed({ deviceMemory: 2 }), false);
  assert.equal(bodyAllowed(null), false, 'no navigator: no');
});

test('drawsWebGL2: false without a WebGL2 context', () => {
  assert.equal(drawsWebGL2(null), false);
  assert.equal(drawsWebGL2({ getContext: () => ({}) }), false);
});

test('the home scene uses the native body directly and has no device-selected character path', () => {
  const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const home = strip(readFileSync(new URL('../home-scene.ts', import.meta.url), 'utf8'));
  const fromBody = [...home.matchAll(/^\s*import\s+(type\s+)?[^'";]*?from\s+['"](\.\/body\/[^'"]+)['"]/gm)].map((match) => `${match[1] ? 'type ' : ''}${match[2]}`);
  assert.deepEqual(fromBody.sort(), ['./body/canonical-crowd.ts', './body/skinned.ts', 'type ./body/skinned.ts']);
  assert.doesNotMatch(home, /import\(/, 'no dynamic import in the scene itself');
  const gate = strip(readFileSync(new URL('./gate.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(gate, /^\s*import\s/m, 'gate.ts has no static imports');
  assert.doesNotMatch(gate, /location|search|URLSearchParams|localStorage/, 'no switch: nothing a page address or setting can turn off');
  assert.equal((gate.match(/(?<!typeof )import\(/g) ?? []).length, 1, 'the optional compatibility helper stays isolated');
});

/** Build the home room, update it and draw "frames" (the floor's onBeforeRender) the way the host would. */
function drawHome(renderer: { domElement: { addEventListener(): void }; getContext(): unknown }) {
  const kit = createKit(), home = buildHomeScene(kit);
  const state = createLife({ location: 'home', name: 'Ada' }, { now: Date.UTC(2026, 0, 5, 11), cityId: 'lagos' }) as unknown as LifeState;
  home.update(state);
  const floor = home.group.children[0]!.children[0]! as THREE.Mesh;
  const draw = floor.onBeforeRender as unknown as (renderer: unknown, scene: unknown, camera: unknown) => void;
  for (let frame = 0; frame < 3; frame++) draw(renderer, null, {});
  return { home, kit };
}
const renderer = { domElement: { addEventListener() {} }, getContext: () => ({}) };

test('a renderer without WebGL2 still receives the native home character', async () => {
  const before = bodyImports.count;
  const { home, kit } = drawHome(renderer);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(bodyImports.count, before);
  assert.equal(home.walk.avatar.visible, false, 'the hidden scene placeholder is replaced by the native body');
  assert.equal(home.easing, false);
  assert.equal(home.stepCrowd(1 / 60), false);
  assert.ok(home.group.getObjectByName('native-character'));
  home.dispose(); kit.dispose();
});

test('a page address cannot turn the body off or on: ?body=procedural is ignored', async () => {
  const g = globalThis as { location?: unknown };
  const had = Object.getOwnPropertyDescriptor(g, 'location');
  Object.defineProperty(g, 'location', { value: { search: '?body=procedural' }, configurable: true });
  try {
    assert.equal(bodyAllowed({ hardwareConcurrency: 8, deviceMemory: 8 }), true);
  } finally {
    if (had) Object.defineProperty(g, 'location', had); else delete g.location;
  }
});
