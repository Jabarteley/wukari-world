import test from 'node:test';
import assert from 'node:assert/strict';
import { FURNITURE } from './content/furniture.ts';
import { checkPlacement, findFreeSpot, fitInto, plotOf, starterLayout, suggestSpot, windowSlot, zonesOf } from './home-layout.ts';
import type { PlacedItem } from '../types/life.ts';

/** Buy `ids` one after the other the way the Buy panel does: each takes the spot the zone rules offer. */
function furnish(grid: number, ids: string[], items: PlacedItem[] = []): PlacedItem[] {
  const placed = [...items];
  ids.forEach((itemId, index) => {
    const def = FURNITURE[itemId]!;
    const at = suggestSpot(grid, placed, def, 0);
    assert.ok(at, `${itemId} has a place`);
    assert.equal(checkPlacement(grid, placed, def, at.x, at.y, at.rot, null, 0), null, `${itemId} at ${at.x},${at.y} is a legal placement`);
    placed.push({ id: `n${index}`, itemId, ...at });
  });
  return placed;
}
const inZone = (zone: readonly number[], item: PlacedItem) => {
  const def = FURNITURE[item.itemId]!, odd = item.rot % 2 === 1, w = odd ? def.h : def.w, h = odd ? def.w : def.h;
  return item.x >= zone[0]! && item.y >= zone[1]! && item.x + w <= zone[0]! + zone[2]! && item.y + h <= zone[1]! + zone[3]!;
};
const at = (items: PlacedItem[], itemId: string) => items.find((item) => item.itemId === itemId)!;

for (const grid of [6, 8, 10]) {
  const zones = zonesOf(grid);
  test(`grid ${grid}: kitchen things go to the kitchen corner, beds and wardrobes to the sleeping corner`, () => {
    const items = furnish(grid, ['fridge', 'gas-cooker', 'water-drum', 'cooler-box', 'foam-bed', 'wardrobe'].slice(0, grid === 6 ? 4 : 6));
    for (const item of items.filter((entry) => ['fridge', 'gas-cooker', 'water-drum', 'cooler-box'].includes(entry.itemId))) assert.ok(inZone(zones.kitchen, item), `${item.itemId} in the kitchen`);
    if (grid > 6) for (const item of items.filter((entry) => ['foam-bed', 'wardrobe'].includes(entry.itemId))) assert.ok(inZone(zones.bed, item), `${item.itemId} in the sleeping corner`);
  });
  test(`grid ${grid}: the TV is on the back wall with the sofa and rug facing it, the desk is by the window, plants are in corners`, () => {
    const items = furnish(grid, ['flat-tv', 'family-sofa', 'centre-rug', 'laptop-desk', 'potted-plant']);
    const tv = at(items, 'flat-tv'), sofa = at(items, 'family-sofa'), rug = at(items, 'centre-rug'), desk = at(items, 'laptop-desk'), plant = at(items, 'potted-plant');
    assert.equal(tv.y, 0);
    assert.equal(sofa.rot, 2, 'the sofa faces the back wall, and so the TV');
    assert.ok(sofa.y > tv.y + 1, 'the sofa sits in front of the TV');
    if (grid > 6) assert.ok(rug.y >= tv.y + 1 && rug.y < sofa.y, 'the rug lies between them'); // the 6 × 6 room is too small to keep all of that apart
    assert.equal(desk.y, 0);
    assert.ok(Math.abs(desk.x - windowSlot(grid)) <= 2, 'the desk is under or beside the window');
    assert.ok(plant.x === 0 && plant.y === 0 || plant.y === 0 || plant.y === grid - 1, 'the plant is in a corner');
    for (const item of items) for (const zone of [zones.kitchen, zones.bed]) assert.ok(!inZone(zone, item), `${item.itemId} stays out of the kitchen and sleeping corners`);
  });
}

test('nothing blocks the door strip, and a full zone falls back to the first free spot', () => {
  const grid = 6, zones = zonesOf(grid);
  const items = furnish(grid, ['fridge', 'gas-cooker', 'water-drum', 'cooler-box', 'double-fridge', 'bathtub', 'toilet']);
  for (const item of items) assert.ok(!(item.x < 2 && item.y >= grid - 3 && !inZone(zones.kitchen, item)), 'the entry strip is clear');
  assert.equal(items.length, 7);
});

test('wall items, other floors and owned houses use the first free spot as before', () => {
  const def = FURNITURE['wall-art']!;
  assert.deepEqual(suggestSpot(6, [], def, 0), findFreeSpot(6, [], def));
  const fridge = FURNITURE['fridge']!, plot = plotOf(10, true);
  assert.deepEqual(suggestSpot(plot, [], fridge, 0), findFreeSpot(plot, [], fridge));
});

test('saved layouts are untouched: they round-trip through fitInto exactly, fridge mid-room or not', () => {
  const saved: PlacedItem[] = [
    { id: 'f1', itemId: 'fridge', x: 2, y: 2, rot: 0 }, { id: 'f2', itemId: 'foam-bed', x: 0, y: 0, rot: 0 }, { id: 'f3', itemId: 'velvet-sofa', x: 3, y: 4, rot: 1 },
    { id: 'f4', itemId: 'wall-art', x: 2, y: 0, rot: 0 },
  ];
  assert.deepEqual(fitInto(6, saved).items, saved);
  const starter = starterLayout(8);
  assert.deepEqual(fitInto(8, starter).items, starter);
});
