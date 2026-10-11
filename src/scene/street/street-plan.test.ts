import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkGrid } from '../movement.ts';
import { rowX } from '../../game/neighbourhood-space.ts';
import { BOUNDS, BUS_STOP, Z, planStreet, rectOf, sceneryMix, tierLook } from './street-plan.ts';
import type { PlanHouse } from './street-plan.ts';
import { atlasOf, fileKey, wallLook } from './street-kit.ts';

const house = (plot: number, tier: PlanHouse['tier'], extra: Partial<PlanHouse> = {}): PlanHouse =>
  ({ x: rowX(plot), plot, tier, wall: 2, roof: 0, door: 0, fence: 1, yard: 0, land: [], own: false, ...extra });
const mix = sceneryMix([{ kind: 'worship', variant: 'church' }, { kind: 'worship', variant: 'mosque' }, { kind: 'hospital' }], true);

test('houses are drawn by tier, with their door on the front plane and a gate on the same x', () => {
  const plan = planStreet({ houses: [house(0, 'starter'), house(1, 'bq'), house(2, 'bungalow'), house(3, 'duplex'), house(4, 'villa')], seed: 's', mix });
  const houses = plan.pieces.filter((p) => p.role === 'house');
  assert.deepEqual(houses.map((p) => p.asset), ['bungalow', 'bungalow', 'bungalow', 'house2', 'house2']);
  assert.ok(houses[0]!.scale < houses[2]!.scale && houses[3]!.scale < houses[4]!.scale);
  for (const item of houses) {
    const rect = rectOf(item.asset, item.x, item.z, 0, item.scale);
    assert.ok(Math.abs(rect[3] - Z.front) < 1e-6, 'front plane at the door line');
    assert.ok(rect[2] - rect[0] <= 12 - 0.8, 'fits the plot');
  }
  const gates = plan.pieces.filter((p) => p.role === 'gate');
  assert.deepEqual(gates.map((p) => p.x), houses.map((p) => p.x));
  assert.equal(plan.pieces.filter((p) => p.role === 'gatehouse').length, 2, 'duplex and villa have a gatehouse');
  const own = (tier: PlanHouse['tier']) => planStreet({ houses: [house(5, tier)], seed: 's', mix }).pieces.filter((p) => p.role === 'detail').length;
  assert.ok(own('starter') < own('bq') + 1 && own('bq') < own('bungalow') && own('bungalow') < own('villa'), 'richer tiers get more detail');
  assert.equal(tierLook('villa').asset, 'house2');
});

test('the number on a house is its plot number, from one', () => {
  const plan = planStreet({ houses: [house(6, 'bq')], seed: 's', mix });
  assert.deepEqual(plan.pieces.find((p) => p.role === 'number')?.labels, { sign_number: '7' });
});

test('the walking grid reaches every gate, the door of every house, the bus stop and the far pavement', () => {
  const houses = [house(2, 'starter', { own: true }), house(3, 'duplex'), house(7, 'villa', { land: [8] })];
  const plan = planStreet({ houses, seed: 'k', mix });
  const grid = createWalkGrid({ bounds: BOUNDS, cell: 0.3, radius: 0.32, entrance: [rowX(2), -3.25, 0], block: plan.blocks });
  const from = { x: rowX(2), z: -3.25 };
  assert.ok(grid.free(from.x, from.z), 'the entrance is free');
  for (const h of houses) {
    for (const [x, z] of [[h.x, Z.fence + 0.5], [h.x, Z.front + 0.7], [h.x, 1], [h.x, 6.8]] as const) assert.ok(grid.path(from.x, from.z, x, z), `reach ${h.plot} at ${x},${z}`);
  }
  assert.ok(grid.path(from.x, from.z, BUS_STOP.x, 0), 'the way out');
  assert.ok(grid.path(from.x, from.z, 66, 13), 'the far pavement');
  assert.ok(!grid.free(rowX(3) - 5, -10), 'a house is solid');
  assert.ok(plan.solids.length > 5 && plan.lights.length <= 5, 'camera solids, and no more point lights than before');
});

test('the same street plans the same, and a vacant plot is given scenery from the city', () => {
  const a = planStreet({ houses: [house(0, 'bq')], seed: 'same', mix }), b = planStreet({ houses: [house(0, 'bq')], seed: 'same', mix });
  assert.deepEqual(a, b);
  const other = planStreet({ houses: [house(0, 'bq')], seed: 'other', mix });
  assert.notDeepEqual(a.scenery, other.scenery);
  const kinds = new Set(a.scenery.map((s) => s.asset));
  assert.ok([...kinds].some((k) => ['church', 'mosque', 'clinic', 'flats', 'unfinished'].includes(k)));
  assert.deepEqual(sceneryMix([], false).buildings, ['shoprow', 'unfinished']);
});

test('palettes and file names', () => {
  assert.equal(fileKey('bungalow', 'mint'), 'bungalow-mint'); assert.equal(fileKey('kiosk', 'cream', 'far'), 'kiosk-teal-far'); assert.equal(fileKey('detail-dish', 'sky', 'far'), 'detail-dish'); assert.equal(fileKey('palm', 'sky'), 'palm');
  assert.equal(atlasOf('bungalow-cream'), 'older-cream'); assert.equal(atlasOf('flats-sky-far'), 'older-sky-far'); assert.equal(atlasOf('kiosk-red'), 'street-mint'); assert.equal(atlasOf('palm-far'), 'palm-far');
  assert.equal(wallLook(3).palette, 'mint'); assert.equal(wallLook(0).tint, undefined); assert.ok(wallLook(5).tint);
});
