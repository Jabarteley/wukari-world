import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import type { Mesh } from 'three';
import { loadCityContent } from '../game/cities/registry.ts';
import { COMING_SOON } from '../game/content/venues.ts';
import { contentFor } from '../game/cities/runtime.ts';
import { createKit } from '../scene/kit.ts';
import { buildCity } from './city-build.ts';
import { prebuildCity } from './map3d.ts';
import { buildNetwork } from './roads.ts';
import { estateLayout } from './estates.ts';
import { turn, warmEstates } from './warm.ts';
import pack from './cities/lagos.ts';
import type { CityPack } from './types.ts';

/** A digest of every mesh of a city: its name, vertex data and index. */
function digest(group: { traverse(fn: (object: unknown) => void): void }): string {
  const hash = createHash('sha1');
  group.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh && !(mesh as unknown as { isPoints?: boolean }).isPoints) return;
    hash.update(mesh.name);
    for (const name of Object.keys(mesh.geometry.attributes)) hash.update(Buffer.from((mesh.geometry.getAttribute(name).array as Float32Array).buffer.slice(0)));
    if (mesh.geometry.index) hash.update(Buffer.from((mesh.geometry.index.array as Uint16Array).buffer.slice(0)));
  });
  return hash.digest('hex');
}

test('a city built in slices is the city built at once: same meshes, same numbers', async () => {
  await loadCityContent('lagos');
  const venues = Object.fromEntries(contentFor('lagos').venues.map((venue) => [venue.id, venue.definition]));
  const kit = createKit(), whole = buildCity(kit, pack, buildNetwork(pack), { venues, soon: COMING_SOON });
  const waits: number[] = [];
  let clock = 0;
  // A clock that moves one millisecond a call makes every slice short, so the build is paused many times.
  const sliced = await prebuildCity(pack, 'lagos', () => true, { sliceMs: 3, now: () => clock++, pause: async () => { waits.push(clock); } });
  assert.ok(sliced);
  try {
    assert.ok(waits.length > 5, `the build gave the browser ${waits.length} turns`);
    assert.equal(sliced.city.triangles, whole.triangles);
    assert.deepEqual(sliced.city.counts, whole.counts);
    assert.equal(digest(sliced.city.group), digest(whole.group));
  } finally { sliced.city.dispose(); sliced.kit.dispose(); whole.dispose(); kit.dispose(); }
});

test('prebuildCity stops and frees what it made when the map is gone', async () => {
  await loadCityContent('lagos');
  let calls = 0;
  const result = await prebuildCity(pack, 'lagos', () => ++calls < 30, { sliceMs: 0, pause: async () => {} });
  assert.equal(result, null);
});

test('warming the estates fills the same layouts the build reads, one slice at a time, and stops when asked', async () => {
  const fresh: CityPack = { ...pack };           // layouts are cached per pack object
  let turns = 0, clock = 0;
  await warmEstates(fresh, () => true, () => clock++, async () => { turns += 1; });
  assert.ok(turns > 5);
  for (const lga of fresh.lgas) {
    const again = estateLayout({ ...pack }, lga.id)!, warmed = estateLayout(fresh, lga.id)!;
    assert.equal(warmed.count, again.count);
    assert.deepEqual(warmed.cells.slice(0, 40), again.cells.slice(0, 40));
  }
  const stopped: CityPack = { ...pack };
  let asked = 0;
  await warmEstates(stopped, () => ++asked < 3, () => 0, async () => {});
  assert.ok(asked < 10);
});

test('turn gives the next task, with or without a message channel', async () => {
  await turn();
  const channel = globalThis.MessageChannel;
  Object.defineProperty(globalThis, 'MessageChannel', { value: undefined, configurable: true });
  try { await turn(); } finally { Object.defineProperty(globalThis, 'MessageChannel', { value: channel, configurable: true }); }
});
