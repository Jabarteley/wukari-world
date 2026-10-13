import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeVertexAO, createOccluders, AO_FLOOR } from './ao-bake.ts';
import { renderTier, PHONE_TIER, HIGH_TIER, WIDE_TIER } from './look.ts';

test('ground term darkens low side faces, never the floor top, never below the floor clamp', () => {
  const pos = [0, 0, 0, 0, 3, 0, 0, 0, 0], nor = [1, 0, 0, 1, 0, 0, 0, 1, 0], col = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  bakeVertexAO(pos, nor, col);
  assert.ok(col[0]! < 0.85 && col[0]! >= AO_FLOOR);
  assert.ok(col[3]! > 0.99);
  assert.equal(col[6], 1);
});
test('probes darken a vertex tucked against another primitive, not its own', () => {
  const near = { id: 1, start: 0, count: 1, min: [0, 1, 0] as [number, number, number], max: [1, 2, 1] as [number, number, number] };
  const wall = { id: 2, start: 1, count: 0, min: [0.1, 1, 1.05] as [number, number, number], max: [0.9, 2, 3] as [number, number, number] };
  const col = [1, 1, 1], plain = [1, 1, 1];
  const pos = [0.5, 1.5, 1], nor = [0, 0, 1];
  bakeVertexAO(pos, nor, col, [near], createOccluders([near, wall]));
  bakeVertexAO(pos, nor, plain, [near], createOccluders([near]));
  assert.ok(col[0]! < plain[0]!);
  assert.ok(col[0]! >= AO_FLOOR);
});
test('tiers: phone unchanged, desktop high, ?quality overrides', () => {
  const fine = { matchMedia: () => ({ matches: false }) } as never;
  assert.equal(renderTier(fine), HIGH_TIER);
  assert.equal(renderTier({ matchMedia: () => ({ matches: true }), innerWidth: 390, innerHeight: 844 } as never), PHONE_TIER);
  assert.equal(renderTier({ matchMedia: () => ({ matches: true }), innerWidth: 900, innerHeight: 800 } as never), WIDE_TIER);
  assert.equal(renderTier({ location: { search: '?quality=phone' }, matchMedia: () => ({ matches: false }) } as never), PHONE_TIER);
});
