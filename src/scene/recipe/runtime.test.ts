import './node-test-fixture.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { fixtureFetch, fixturePack } from './runtime.test-support.ts';
import { imageHeaderBitmap } from './image-header-fixture.ts';
import { awaitNativeSceneGeometry } from '../../testing/nativeGeometry.test-fixture.ts';
import { createKit } from '../kit.ts';
import { buildVenueScene } from '../venue-scenes.ts';
import { createHostLights, sceneVenue } from '../../venue-world.ts';
import { citySceneDef, cityScenesReady, loadAuthoredCityScenes, loadCityScenes } from '../city-scenes.ts';
import { measureRenderCost, totalRenderCost } from '../body/render-cost.ts';
import { preloadLooks } from '../character-lab/native-body.ts';
import { DEFAULT_LOOK } from '../../game/content/traits.ts';
import { tablesAt } from '../../tables/city-places.ts';
import type { SceneEntry, SceneVenue } from '../types.ts';
import { parseCityRecipes } from './contract.ts';
import { screenText } from '../../../server/moderation/text.ts';
import { cityContent } from '../../game/cities/registry.ts';
import { spotsOf } from '../../life.ts';
import { recipeAssets } from './prepare.ts';

const fixtureUrl = new URL('./runtime.test-support.ts', import.meta.url).href;
const registryUrl = new URL('./registry.generated.ts', import.meta.url).href;
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === './registry.generated.ts' && context.parentURL?.endsWith('/recipe/load.ts')) return { url: registryUrl, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === registryUrl) return { format: 'module', shortCircuit: true, source: `import { fixturePack } from ${JSON.stringify(fixtureUrl)}; export const RECIPE_CITY_LOADERS = {accra: async () => ({default: await fixturePack()})};` };
    return next(url, context);
  },
});

function exactRoute(entry: SceneEntry, x: number, z: number, label: string) {
  const { grid, entrance } = entry.walk;
  assert.ok(grid && entrance, `${label}: grid and entrance are present`);
  assert.equal(grid.free(x, z), true, `${label}: exact point free`);
  const path = grid.path(entrance.x, entrance.z, x, z);
  assert.ok(path, `${label}: route`);
  const end = path.at(-1) ?? entrance;
  assert.ok(Math.hypot(end.x - x, end.z - z) < 1e-8, `${label}: unchanged endpoint`);
}

test('normal city loading waits for real geometry preparation and mounts complete recipe synchronously with twelve native actors', async () => {
  const files = await fixtureFetch(), originalBitmap = globalThis.createImageBitmap;
  let release!: () => void, began!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { began = resolve; });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: async (blob: Blob) => { began(); await gate; return imageHeaderBitmap(blob); } });
  const kit = createKit(), parent = new kit.THREE.Scene(), lights = createHostLights(kit.THREE, parent);
  let entry: SceneEntry | undefined, renders = 0;
  kit.requestRender = () => { renders++; entry?.group.userData.refreshCharacterCosts?.(); };
  try {
    const load = loadCityScenes('accra'); await started;
    assert.equal(cityScenesReady('accra'), false);
    const actual = sceneVenue('accra-market-game', 'accra'); assert.ok(actual);
    assert.throws(() => buildVenueScene(kit, actual as SceneVenue, 'accra'), /not been loaded/);
    const joined = loadCityScenes('accra'); release(); await Promise.all([load, joined]);
    assert.equal(cityScenesReady('accra'), true); assert.equal(files.reads.size, 2); assert.ok([...files.reads.values()].every(n => n === 1));
    const recipeDef = citySceneDef('accra', 'recipe:accra-market-game', ''); assert.ok(recipeDef?.runtime);
    const venue = { ...actual, scene: { ...actual.scene, look: DEFAULT_LOOK, seed: 'recipe-player' } } as SceneVenue;
    const people = Array.from({ length: 12 }, (_, i) => ({ id: `recipe-resident-${i}`, name: `Resident ${i}`, kind: 'player', look: DEFAULT_LOOK, seed: `recipe-resident-${i}` }));
    await preloadLooks([{ look: DEFAULT_LOOK, seed: 'recipe-player' }, ...people]);
    entry = buildVenueScene(kit, venue, 'accra'); parent.add(entry.group);
    const imported = entry.group.getObjectByName('recipe:accra-market-game'); assert.ok(imported, 'all imported geometry attached before builder returns');
    assert.equal(entry.group.userData.runtimeStatus, 'ready');
    const runtimeCost = measureRenderCost(imported).scenery; assert.ok(runtimeCost.triangles > 0);
    assert.ok(entry.setHostBudget, 'normal scene exposes its host budget setter');
    entry.setHostBudget({ triangles: 15_000, drawCalls: 60 }); entry.setCrowd(people);
    const native = await awaitNativeSceneGeometry(entry, 'recipe full native host');
    assert.deepEqual(native.errors, []); assert.equal(native.pendingCharacters, 0); assert.ok(native.nativeCharacters > 0); assert.ok(native.skinnedMeshes > 0);
    const ids = new Set(people.map(p => p.id));
    assert.equal(entry.tags().filter(t => ids.has(t.id)).length, 12); assert.equal(entry.walk.people().filter(p => ids.has(p.id)).length, 12);
    assert.equal(entry.group.userData.runtimeError, undefined);
    const pack = await fixturePack();
    const targets = cityContent('accra').venues.filter(v => pack.metadata.targetVenueIds.includes(v.id)).map(v => ({ ...v.definition, scene: { ...v.definition.scene, spots: spotsOf(v.id, 'accra').map(s => ({ id: s.id, label: s.label })) } }));
    const parsed = parseCityRecipes(pack.text, { city: 'accra', venues: targets, assets: { kit: pack.metadata.assets.kit.measurement, hero: pack.metadata.assets.hero!.measurement }, hostScenery: pack.metadata.hostScenery, screenText });
    const checked = parsed.recipes.find(v => v.recipe.venue === venue.id)!;
    const prepared = await recipeAssets.prepareCity(pack.metadata), offsets = new Map<string, number>();
    for (const placement of checked.placements) {
      const asset = placement.source === 'kit' ? prepared.kit : prepared.hero!;
      const part = asset.models.get(placement.node)!.parts[0]!;
      const name = `model:${part.atlas || 'plain'}:near`, offset = offsets.get(name) ?? 0;
      const mesh = imported.getObjectByName(name) as import('three').Mesh; assert.ok(mesh?.isMesh);
      const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv');
      const matrix = new kit.THREE.Matrix4().compose(new kit.THREE.Vector3(placement.x, 0, placement.z),
        new kit.THREE.Quaternion().setFromAxisAngle(new kit.THREE.Vector3(0, 1, 0), placement.ry), new kit.THREE.Vector3().setScalar(placement.scale));
      for (let i = 0; i < part.position.length / 3; i++) {
        const expected = new kit.THREE.Vector3().fromArray(part.position, i * 3).applyMatrix4(matrix);
        assert.ok(Math.abs(position.getX(offset + i) - expected.x) < 1e-5 && Math.abs(position.getY(offset + i) - expected.y) < 1e-5 && Math.abs(position.getZ(offset + i) - expected.z) < 1e-5, 'every final imported vertex has exactly one recipe-to-scene scale');
        if (part.uv) { assert.equal(uv.getX(offset + i), part.uv[i * 2]); assert.equal(uv.getY(offset + i), part.uv[i * 2 + 1]); }
      }
      offsets.set(name, offset + part.position.length / 3);
    }
    for (const [name, count] of offsets) assert.equal((imported.getObjectByName(name) as import('three').Mesh).geometry.getAttribute('position').count, count);
    assert.ok(Math.abs(entry.walk.contactHeightAt!(checked.recipe.entrance[0], checked.recipe.entrance[1])! - 0.016) < 1e-5, 'real support triangles provide contact at the entrance');
    const actualEntrance = entry.walk.entrance; assert.ok(actualEntrance, 'actual recipe entrance is present');
    assert.deepEqual([actualEntrance.x, actualEntrance.z, actualEntrance.ry], checked.recipe.entrance);
    for (const spot of checked.recipe.spots) {
      assert.equal(entry.anchors[spot.key]?.x, spot.x); assert.equal(entry.anchors[spot.key]?.z, spot.z); exactRoute(entry, spot.x, spot.z, spot.key);
    }
    for (const [i, [x, z]] of checked.recipe.crowd.entries()) exactRoute(entry, x, z, `declared crowd ${i}`);
    for (const person of entry.walk.people()) exactRoute(entry, person.x, person.z, person.id);
    assert.deepEqual(entry.walk.things().map(t => t.table).sort(), tablesAt('accra', venue.id!).map(t => t.id).sort());
    for (const solid of checked.solids) assert.ok(entry.walk.solids.some(b => b.every((n, i) => Math.abs(n - [...solid.min, ...solid.max][i]!) < 1e-5)), 'camera receives imported/shell/sign solids');
    const cost = measureRenderCost(parent), total = totalRenderCost(parent); let lightCount = 0;
    parent.traverse(node => { if ((node as import('three').Light).isLight) lightCount++; });
    assert.equal(cost.reservedTriangles, 0); assert.equal(cost.reservedDrawCalls, 0);
    assert.ok(cost.scenery.triangles <= 15_000); assert.ok(cost.scenery.meshes <= 13); assert.ok(lightCount <= 4); assert.ok(total.triangles <= 87_000); assert.ok(total.drawCalls <= 60);
    console.log(JSON.stringify({ scope: 'Accra actual decoded geometry; image-header substitutes, no pixel/visual acceptance', scenery: cost.scenery, characters: cost.characters, total, lights: lightCount, native, residents: 12,
      reservation: recipeDef.runtime.reservation, hostScenery: { triangles: cost.scenery.triangles - recipeDef.runtime.reservation.triangles, meshes: cost.scenery.meshes - runtimeCost.meshes - 1, lights: lightCount - checked.recipe.lamps.length } }));
    const reads = [...files.reads]; entry.dispose(); entry = buildVenueScene(kit, venue, 'accra');
    assert.ok(entry.group.getObjectByName('recipe:accra-market-game')); assert.deepEqual([...files.reads], reads);
    const doomed = entry.group.getObjectByName('recipe:accra-market-game')!; entry.dispose(); entry = undefined;
    await Promise.resolve(); await Promise.resolve();
    assert.equal(doomed.parent, null);
  } finally { release(); entry?.dispose(); kit.dispose(); lights.dispose(); files.restore(); Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: originalBitmap }); hook.deregister(); }
});

test('dispose before owner registration prevents late recipe attachment and callbacks', async () => {
  const runtime = citySceneDef('accra', 'recipe:accra-market-game', '')!.runtime!;
  const kit = createKit(), group = new kit.THREE.Group(); let active = true, callbacks = 0;
  kit.requestRender = () => { callbacks++; };
  try {
    const promise = runtime.createHost(kit, group, { current: () => active, cost: () => ({ triangles: 0, drawCalls: 0 }), budget: () => ({ triangles: 15_000, drawCalls: 60 }),
      readmit: () => { callbacks++; }, changed: () => { callbacks++; }, request: runtime.request, bounds: runtime.bounds, fallback: [], heights: [0], index() { throw new Error('recipe support must retain fallback contact'); }, fallbackContact: () => null, contact() {} });
    assert.ok(group.getObjectByName('recipe:accra-market-game'));
    active = false; const owner = await promise; assert.ok(owner); owner.dispose(); owner.dispose(); owner.selectAt(0, 0);
    await Promise.resolve(); assert.equal(group.children.length, 0); assert.equal(callbacks, 0);
  } finally { kit.dispose(); }
});

test('authored-only loading retains Nigeria definitions without requiring recipe generation', async () => {
  await loadAuthoredCityScenes('kano');
  assert.ok(citySceneDef('kano', 'market', 'kurmi-market', true) || citySceneDef('kano', 'market', 'kano-kurmi', true));
  assert.equal(citySceneDef('kano', 'recipe:home', '', true), null);
});
