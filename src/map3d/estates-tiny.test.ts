// OWNER: world — estates on a tiny country (the Vatican: land of about 11 × 7 map units, because the map draws a fixed 10 units to the kilometre). The
// ordinary search cannot give such land 512 estates or even a first big one; a compact land that failed it now gets as many estates as it can hold
// (at least 8) on squares no smaller than 0.3 units, and `layout.count` says how many. Land that fitted before, and a thin strip, behave exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { estateLayout, plotAt, SITE_CLEAR } from './estates.ts';
import { ESTATE, PLOTS_PER_ESTATE } from '../game/content/world.ts';
import type { CityPack, PackLga, XZ } from './types.ts';

/** Land `width` × `height` units, one local government, and a lattice of 5 × 5 venue sites (each keeps a 2.4 × 2.4 square clear) spaced `dx` × `dz` apart. */
function tinyPack(width: number, height: number, dx: number, dz: number): CityPack {
  const ring: [number, number][] = [[0, 0], [width, 0], [width, height], [0, height]];
  const lga = { id: 'centre', name: 'Centre', line: '', land: width * height, polygon: ring, plate: [width / 2, height / 2], tint: '#88aa77', geo: { c: [0, 0], box: [0, 0, 0, 0] } } as unknown as PackLga;
  const sites: Record<string, XZ> = {};
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) sites[`venue-${i}-${j}`] = { x: 1.5 + i * dx, z: 1.2 + j * dz };
  return {
    id: 'tiny', name: 'Tiny', bounds: { minX: -2, maxX: width + 2, minZ: -2, maxZ: height + 2 },
    land: [{ id: 'land', kind: 'land', points: ring, exact: true }], roads: [], sites, homes: {}, soon: {}, districts: [], zones: [], fabric: [], estates: {}, lgas: [lga],
    geo: { box: [0, 0, 0, 0] },
  } as unknown as CityPack;
}

test('a Vatican-sized land (11 × 7 units, most of it under venue lots) gets as many estates as it can hold, at least 8, none on a venue or off the land', () => {
  const pack = tinyPack(11, 7, 1.9, 1.4), layout = estateLayout(pack, 'centre')!;
  assert.ok(layout.count >= 8 && layout.count < ESTATE.estates, `count ${layout.count}`);
  assert.equal(layout.cells.length, layout.count);
  assert.ok(layout.size >= 0.3 && layout.front === layout.size, `lattice ${layout.size}, front ${layout.front}`);
  assert.equal(new Set(layout.cells.map((cell) => `${cell.x.toFixed(4)}:${cell.z.toFixed(4)}`)).size, layout.count, 'every estate has its own square');
  const plate = { x: 5.5, z: 3.5 }, first = Math.hypot(layout.cells[0]!.x - plate.x, layout.cells[0]!.z - plate.z);
  assert.ok(layout.cells.every((cell) => Math.hypot(cell.x - plate.x, cell.z - plate.z) >= first - 1e-9), 'the first estate is the square nearest the name plate');
  for (const [index, cell] of layout.cells.entries()) {
    const half = (cell.size * 0.9) / 2;
    assert.ok(cell.x - half >= 0 && cell.x + half <= 11 && cell.z - half >= 0 && cell.z + half <= 7, `estate ${index} stands on the land`);
    for (const spot of Object.values(pack.sites)) assert.ok(Math.abs(cell.x - spot.x) > cell.size / 2 + SITE_CLEAR - 0.1 || Math.abs(cell.z - spot.z) > cell.size / 2 + SITE_CLEAR - 0.1, `estate ${index} clear of a venue`);
    for (const plot of [0, 13, 97, PLOTS_PER_ESTATE - 1]) { const at = layout.plot(index, plot); assert.deepEqual(plotAt(layout, at.x, at.z), { estate: index, plot }, `${index}/${plot}`); }
  }
  assert.equal(layout.estateAt(-5, -5), -1);
  assert.equal(estateLayout(pack, 'centre'), layout, 'computed once');
});

test('an address past the last estate of a tiny land is drawn on the last estate instead of failing', () => {
  const layout = estateLayout(tinyPack(11, 7, 1.9, 1.4), 'centre')!, last = layout.cells[layout.count - 1]!;
  assert.doesNotThrow(() => layout.plot(ESTATE.estates - 1, 0));
  assert.ok(Math.abs(layout.plot(ESTATE.estates - 1, 0).x - layout.plot(layout.count - 1, 0).x) < 1e-9 && layout.pitch(ESTATE.estates - 1) === layout.pitch(layout.count - 1));
  assert.ok(Math.abs(layout.plot(layout.count - 1, 0).x - last.x) <= last.size / 2);
});

test('the more land is free, the more estates: a looser spacing of the venues holds more, and none holds more than 512', () => {
  const tight = estateLayout(tinyPack(11, 7, 1.9, 1.4), 'centre')!.count, loose = estateLayout(tinyPack(11, 7, 1.6, 1.3), 'centre')!.count;
  assert.ok(loose > tight && loose <= ESTATE.estates, `${tight} then ${loose}`);
});

test('a compact land with no free ground for 8 estates still refuses (no estate is invented)', () => {
  assert.throws(() => estateLayout(tinyPack(4, 4, 0.6, 0.6), 'centre'), /cannot hold even 8 estates/);
});

test('a roomy land is untouched: 512 estates, a big first estate, count 512', () => {
  const pack = tinyPack(120, 90, 20, 15), layout = estateLayout(pack, 'centre')!;
  assert.equal(layout.count, ESTATE.estates);
  assert.equal(layout.cells.length, ESTATE.estates);
  assert.ok(layout.front >= 3);
});
