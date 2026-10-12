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

const polling = tags => tags.place === 'square' || tags.amenity === 'townhall';

test('polling: a square or town hall wins; otherwise courthouse, office=government, building=government|public, community_centre in that order', () => {
  assert.deepEqual(SLOT_FALLBACKS.polling.map(f => f.used), ['amenity=courthouse', 'office=government', 'building=government', 'building=public', 'amenity=community_centre']);
  const square = pickForSlot({ slot: 'polling', predicate: polling, pool: [el(1, { amenity: 'courthouse' }), el(2, { place: 'square' })], rank, ref });
  assert.equal(square.el.id, 2);
  assert.equal(square.slotFallback, undefined);
  const order = [{ amenity: 'community_centre' }, { building: 'public' }, { building: 'government' }, { office: 'government' }, { amenity: 'courthouse' }];
  let remaining = order.map((tags, i) => el(20 + i, tags));
  const seen = [];
  while (remaining.length) {
    const { el: picked, slotFallback } = pickForSlot({ slot: 'polling', predicate: polling, pool: remaining, rank, ref });
    seen.push(slotFallback.used);
    assert.equal(slotFallback.slot, 'polling');
    assert.equal(slotFallback.ref, ref(picked));
    remaining = remaining.filter(x => x !== picked);
  }
  assert.deepEqual(seen, SLOT_FALLBACKS.polling.map(f => f.used));
});

test('polling: unrelated features are not a fallback and an empty pool stays empty', () => {
  const pool = [el(1, { amenity: 'restaurant' }), el(2, { amenity: 'place_of_worship' }), el(3, { office: 'ngo' })];
  assert.equal(pickForSlot({ slot: 'polling', predicate: polling, pool, rank, ref }).el, undefined);
  assert.equal(pickForSlot({ slot: 'polling', predicate: polling, pool: [], rank, ref }).el, undefined);
});
