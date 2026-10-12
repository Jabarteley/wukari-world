import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { pickForSlot, SLOT_FALLBACKS } from './slot-fallback.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, 'fixtures/monrovia-recreation-pool.json'), 'utf8'));
const ref = el => `${el.type}/${el.id}`;
const rank = items => [...items].sort((a, b) => (b.tags.wikidata ? 1 : 0) - (a.tags.wikidata ? 1 : 0) || ref(a).localeCompare(ref(b), 'en', { numeric: true }));
const recreation = tags => tags.leisure === 'park';
const el = (id, tags) => ({ type: 'way', id, center: { lat: 6.3, lon: -10.8 }, tags: { name: `Place ${id}`, ...tags } });

test('Monrovia real pool: no park, so the recreation slot falls back to a named stadium and says so', () => {
  assert.ok(!fixture.elements.some(e => e.tags.leisure === 'park'), 'fixture is the real park-less Monrovia pool');
  const { el: picked, slotFallback } = pickForSlot({ slot: 'recreation', predicate: recreation, pool: fixture.elements, rank, ref });
  assert.equal(picked.tags.leisure, 'stadium');
  assert.ok(picked.tags.name.trim());
  assert.deepEqual(slotFallback, { slot: 'recreation', used: 'leisure=stadium', ref: 'way/143040580' });
  assert.equal(slotFallback.ref, ref(picked));
});

test('a named park always wins and records no fallback', () => {
  const pool = [el(1, { leisure: 'stadium' }), el(2, { leisure: 'park' }), el(3, { leisure: 'garden' })];
  const { el: picked, slotFallback } = pickForSlot({ slot: 'recreation', predicate: recreation, pool, rank, ref });
  assert.equal(picked.id, 2);
  assert.equal(slotFallback, undefined);
});

test('fallback order is garden, stadium, sports_centre, pitch, nature_reserve, playground', () => {
  assert.deepEqual(SLOT_FALLBACKS.recreation.map(f => f.used), ['garden', 'stadium', 'sports_centre', 'pitch', 'nature_reserve', 'playground'].map(v => `leisure=${v}`));
  const order = ['playground', 'nature_reserve', 'pitch', 'sports_centre', 'stadium', 'garden'];
  const pool = order.map((leisure, i) => el(10 + i, { leisure }));
  const seen = [];
  for (let remaining = [...pool]; remaining.length; ) {
    const { el: picked, slotFallback } = pickForSlot({ slot: 'recreation', predicate: recreation, pool: remaining, rank, ref });
    seen.push(slotFallback.used);
    remaining = remaining.filter(x => x !== picked);
  }
  assert.deepEqual(seen, ['garden', 'stadium', 'sports_centre', 'pitch', 'nature_reserve', 'playground'].map(v => `leisure=${v}`));
});

test('the fallback only reads the already-filtered pool; other slots and non-leisure features never fall back', () => {
  const pool = [el(1, { amenity: 'restaurant' }), el(2, { leisure: 'swimming_pool' })];
  assert.equal(pickForSlot({ slot: 'recreation', predicate: recreation, pool, rank, ref }).el, undefined);
  const stadiumOnly = [el(3, { leisure: 'stadium' })];
  assert.equal(pickForSlot({ slot: 'meal', predicate: t => t.amenity === 'restaurant', pool: stadiumOnly, rank, ref }).el, undefined);
});
