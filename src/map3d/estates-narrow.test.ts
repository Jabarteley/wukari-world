// OWNER: world — estates on a very small or narrow island (the Funafuti atoll): the layout searches from big squares to small ones and stops at the
// first that fits, so a government that already fitted keeps its layout; only land that used to throw ("no room for its first estate" /
// "cannot hold 512 estates") now gets smaller squares, down to a floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { estateLayout, plotAt } from './estates.ts';
import { ESTATE } from '../game/content/world.ts';
import type { CityPack, PackLga } from './types.ts';

/** A land strip `length` units long and `width` wide, as one exact land outline owned by one local government. */
function stripPack(length: number, width: number): CityPack {
  const ring: [number, number][] = [[0, 0], [length, 0], [length, width], [0, width]];
  const lga = { id: 'centre', name: 'Centre', line: '', land: length * width, polygon: ring, plate: [length / 2, width / 2], tint: '#88aa77', geo: { c: [0, 0], box: [0, 0, 0, 0] } } as unknown as PackLga;
  return {
    id: 'strip', name: 'Strip', bounds: { minX: -2, maxX: length + 2, minZ: -2, maxZ: width + 2 },
    land: [{ id: 'land', kind: 'land', points: ring, exact: true }], roads: [], sites: {}, homes: {}, soon: {}, districts: [], zones: [], fabric: [], estates: {}, lgas: [lga],
    geo: { box: [0, 0, 0, 0] },
  } as unknown as CityPack;
}

test('a roomy city keeps the big first estate and the coarse lattice, exactly as before', () => {
  const layout = estateLayout(stripPack(120, 90), 'centre')!;
  assert.equal(layout.cells.length, ESTATE.estates);
  assert.ok(layout.front >= 3 && layout.size >= 0.3, `front ${layout.front}, lattice ${layout.size}`);
});

test('a narrow atoll strip (about 140 m wide) now holds its 512 estates, each wholly on land, with a smaller first estate and a finer lattice', () => {
  const pack = stripPack(30, 1.4);
  const layout = estateLayout(pack, 'centre')!;
  assert.equal(layout.cells.length, ESTATE.estates);
  assert.ok(layout.front < 3 && layout.front >= 1.2, `front ${layout.front}`);
  assert.ok(layout.size < 0.3 && layout.size >= 0.15, `lattice ${layout.size}`);
  for (const cell of layout.cells) {
    const half = (cell.size * 0.9) / 2;
    assert.ok(cell.x - half >= 0 && cell.x + half <= 30 && cell.z - half >= 0 && cell.z + half <= 1.4, 'the plots of every estate stand on the strip');
  }
  const home = layout.plot(1, 0), found = plotAt(layout, home.x, home.z)!;
  assert.deepEqual([found.estate, found.plot], [1, 0], 'an address is still one point and back');
  assert.equal(layout.estateAt(-5, -5), -1);
});

test('land that is too small even for the floors still refuses (no estate is invented)', () => {
  assert.throws(() => estateLayout(stripPack(60, 0.5), 'centre'), /no room for its first estate/);
  assert.throws(() => estateLayout(stripPack(6, 1.4), 'centre'), /cannot hold 512 estates/);
});
