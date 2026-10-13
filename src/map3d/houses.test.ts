// OWNER: world — the look of the houses close up: the rich tier (frames, bars, awnings, gates) and when it gives way to the plain one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../scene/kit.ts';
import pack from './cities/lagos.ts';
import { createHouses, DETAIL_BUDGET, RICH_PIXELS } from './houses.ts';
import { estateLayout } from './estates.ts';
import { ESTATE, PLOTS_PER_ESTATE, packStyle } from '../game/content/world.ts';
import { HOUSES_DRAW_CALLS } from '../budgets.ts';
import { createBatch } from '../scene/build.ts';
import { drawHouse, tone } from '../scene/street/street-standins.ts';

const kit = createKit(), front = estateLayout(pack, 'ikeja')!.cells[0]!;
function close(count: number, pixels: number) {
  const houses = createHouses(kit, pack);
  houses.setSummary(new Map(pack.lgas.map((lga) => [lga.id, { houses: count, occ: new Uint8Array(ESTATE.estates).fill(count) }])));
  const estate = new Map(Array.from({ length: count }, (_, plot) => [plot, { p: plot, s: packStyle({ shape: plot % 4, wall: plot % 8, roof: plot % 8, door: plot % 4, windows: plot % 4, fence: plot % 4, yard: plot % 8, sign: 0 }, 'bungalow'), u: 0, online: false }]));
  houses.update({ x: front.x, z: front.z, distance: 30, pixels }, { estate: () => ({ houses: estate, at: 1 }) }, {});
  return houses;
}

test('close up, a part-built estate gets frames, bars, awnings and gates inside the same budget; a full one keeps the plain houses', () => {
  const rich = close(80, 30), plain = close(80, RICH_PIXELS * 0.6 / estateLayout(pack, 'ikeja')!.pitch(0)), full = close(PLOTS_PER_ESTATE, 30);
  assert.ok(rich.counts().detail > plain.counts().detail, 'the richer geometry is drawn when the plots are big on screen');
  assert.ok(rich.counts().detail <= DETAIL_BUDGET && full.counts().detail <= DETAIL_BUDGET);
  assert.ok(full.counts().detail > 0, 'a full estate still draws, as plain houses');
  for (const houses of [rich, plain, full]) assert.ok(houses.counts().calls <= HOUSES_DRAW_CALLS.value, `${houses.counts().calls} draw calls`);
  const names = (houses: ReturnType<typeof close>) => houses.group.children.filter((mesh) => (mesh as { count?: number }).count! > 0 && mesh.visible).map((mesh) => mesh.name);
  assert.ok(names(rich).includes('houses-walls+') && !names(rich).includes('houses-walls'));
  assert.ok(names(plain).includes('houses-walls') && !names(plain).includes('houses-walls+'));
  assert.ok(names(full).includes('houses-walls'));
  for (const houses of [rich, plain, full]) houses.dispose();
});

test('the procedural street house: windows, bars, plinth, awning and a roof, and trim tones from the wall paint', () => {
  const small = createBatch(kit.THREE), tall = createBatch(kit.THREE);
  drawHouse(small, 0, 5, 10, 6, '#e6cf9f', '#a85c40', '#6b4a2b', 1);
  drawHouse(tall, 0, 5, 10, 6, '#e6cf9f', '#a85c40', '#6b4a2b', 3);
  assert.ok(small.triangles > 150 && small.triangles < 1200, `${small.triangles} triangles for a bungalow`);
  assert.ok(tall.triangles > small.triangles && tall.triangles < 2500, `${tall.triangles} triangles for flats`);
  assert.equal(tone('#808080', 0.5), '#404040'); assert.equal(tone('#000000', 2), '#ffffff'); assert.equal(tone('#ffffff', 1), '#ffffff');
});
