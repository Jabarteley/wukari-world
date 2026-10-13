import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { profileFor, emptySlotProblems, emptySlotReason, SLOT_SOURCE_RULES, PROFILE_NAMES } from './profile.mjs';
import { fillSlots } from './slot-fallback.mjs';
import { districtLabels } from './district-labels.mjs';
import { mapTestText } from './acceptance.mjs';
import { assertSourceScene, wetEmptySlotsFor } from './source-scene.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pool = JSON.parse(readFileSync(join(here, 'fixtures/nauru-yaren-pool.json'), 'utf8')).elements;
const ref = el => `${el.type}/${el.id}`, name = el => el.tags['name:en'] ?? el.tags.name, normal = text => text.normalize('NFKC').toLowerCase();
const SLOTS = { transit: t => t.railway === 'station' || t.amenity === 'bus_station' || t.public_transport === 'station', meal: t => ['restaurant', 'cafe'].includes(t.amenity), community: t => ['university', 'college', 'library', 'community_centre', 'conference_centre'].includes(t.amenity), clinic: t => ['hospital', 'clinic'].includes(t.amenity), recreation: t => t.leisure === 'park', market: t => t.amenity === 'marketplace' || t.shop === 'mall', worship: t => t.amenity === 'place_of_worship', polling: t => t.place === 'square' || t.amenity === 'townhall', government: t => ['townhall', 'courthouse', 'parliament'].includes(t.amenity) || t.office === 'government' || t.building === 'government' };
const known = Object.keys(SLOTS);

test('standard is the default and unchanged; microstate relaxes exactly the documented numbers', () => {
  assert.deepEqual({ ...profileFor(undefined) }, { name: 'standard', minimumPlaces: 20, minimumNeighbourhoodLabels: 5, maximumEmptySlots: 0, cityPlaceTags: ['city', 'town'], capitalPlaceTags: [], districtIslandPlaces: [] });
  const micro = profileFor('microstate');
  assert.deepEqual([micro.minimumPlaces, micro.minimumNeighbourhoodLabels, micro.maximumEmptySlots], [12, 3, 4]);
  assert.deepEqual(micro.cityPlaceTags, ['city', 'town', 'village', 'hamlet', 'locality']);
  assert.deepEqual(micro.districtIslandPlaces, ['island', 'islet']);
  assert.deepEqual(micro.districtSquarePlaces, ['square']);
  assert.equal(profileFor(undefined).districtSquarePlaces, undefined, 'the standard profile carries no square list');
  assert.deepEqual(PROFILE_NAMES, ['microstate']);
  assert.throws(() => profileFor('standard'), /default/);
  assert.throws(() => profileFor('tiny'), /unknown profile/);
});

test('the slot source rules named in the receipts cover every non-airport slot of the selection', () => {
  assert.deepEqual(Object.keys(SLOT_SOURCE_RULES).sort(), known.sort());
  for (const slot of known) assert.match(emptySlotReason(slot), /^no unused named .+ feature inside the country/);
  assert.throws(() => emptySlotReason('airport'), /unknown slot/);
});

test('Nauru (real Yaren pool): microstate documents transit and market as empty, every other slot has a source; standard reports them missing', () => {
  const run = allowEmpty => {
    const used = new Set(), taken = [];
    const rank = items => items.filter(el => !used.has(ref(el))).sort((a, b) => ref(a).localeCompare(ref(b), 'en', { numeric: true }));
    const result = fillSlots({ slots: SLOTS, pool, rank, ref, allowEmpty, emptyReason: emptySlotReason, take: (slot, el) => { used.add(ref(el)); taken.push(slot); } });
    return { ...result, taken };
  };
  const micro = run(true), standard = run(false);
  assert.deepEqual(micro.empty.map(item => item.slot), ['transit', 'market']);
  assert.deepEqual(micro.missing, []);
  assert.deepEqual(micro.taken, ['meal', 'community', 'clinic', 'recreation', 'worship', 'polling', 'government'].filter(slot => micro.taken.includes(slot)));
  assert.equal(micro.taken.length, known.length - 2);
  assert.deepEqual(standard.missing, ['transit', 'market']);
  assert.deepEqual(standard.empty, []);
  assert.deepEqual(emptySlotProblems({ profile: 'microstate', emptySlots: micro.empty, missingSlots: ['transit', 'market'], knownSlots: known }), []);
});

test('a real "historic site is not a market" case: the pool has museums, attractions and viewpoints, and none of them fills the market slot', () => {
  const nonMarket = pool.filter(el => el.tags.tourism || el.tags.historic);
  assert.ok(nonMarket.length > 5, 'the real pool has many tourism/historic features');
  const { el } = (() => { const { empty } = fillSlots({ slots: { market: SLOTS.market }, pool, rank: items => items, ref, allowEmpty: true, emptyReason: emptySlotReason, take() {} }); return { el: empty }; })();
  assert.deepEqual(el.map(item => item.slot), ['market']);
});

test('emptySlots must match the missing slots exactly, carry written reasons and stay within the profile maximum', () => {
  const ok = [{ slot: 'transit', reason: emptySlotReason('transit') }];
  assert.deepEqual(emptySlotProblems({ profile: 'microstate', emptySlots: ok, missingSlots: ['transit'], knownSlots: known }), []);
  assert.match(emptySlotProblems({ profile: 'microstate', emptySlots: ok, missingSlots: ['transit', 'market'], knownSlots: known }).join(), /market is not a documented empty slot/);
  assert.match(emptySlotProblems({ profile: 'microstate', emptySlots: ok, missingSlots: [], knownSlots: known }).join(), /documented empty but has a source/);
  assert.match(emptySlotProblems({ profile: 'microstate', emptySlots: [{ slot: 'transit', reason: 'short' }], missingSlots: ['transit'], knownSlots: known }).join(), /written reason/);
  assert.match(emptySlotProblems({ profile: 'microstate', emptySlots: [{ slot: 'airport', reason: 'x'.repeat(30) }], missingSlots: [], knownSlots: known }).join(), /unknown slot airport/);
  const five = known.slice(0, 5);
  assert.match(emptySlotProblems({ profile: 'microstate', emptySlots: five.map(slot => ({ slot, reason: emptySlotReason(slot) })), missingSlots: five, knownSlots: known }).join(), /exceed the microstate maximum of 4/);
  assert.match(emptySlotProblems({ profile: undefined, emptySlots: ok, missingSlots: ['transit'], knownSlots: known }).join(), /only allowed with a profile/);
});

test('Nauru: three labels are enough for the microstate profile and a standard city still needs five from the same real pool', () => {
  const taken = pool.filter(el => !['suburb', 'neighbourhood', 'quarter'].includes(el.tags.place));
  const centre = { lon: 166.9209, lat: -0.5477 };
  const micro = districtLabels({ pool: taken.slice(0, 40), name, ref, normal, centre, minimumLabels: 3 }), standard = districtLabels({ pool: taken.slice(0, 40), name, ref, normal, centre });
  assert.ok(micro.labels.length >= 3 && standard.labels.length >= 5);
  const sparse = taken.filter(el => ['village'].includes(el.tags.place)).slice(0, 2);
  assert.equal(districtLabels({ pool: sparse, name, ref, normal, centre, minimumLabels: 3 }).labels.length, 2, 'two real villages are fewer than the three the profile needs; batch.mjs then reports the shortfall');
  // a pool that already has the minimum keeps exactly the primary labels (no fallback tier is read)
  const primary = [1, 2, 3].map(id => ({ type: 'node', id, lon: 166.9, lat: -0.5, tags: { name: `Q${id}`, place: 'quarter' } }));
  const withVillages = districtLabels({ pool: [...primary, ...taken.filter(el => el.tags.place === 'village')], name, ref, normal, centre, minimumLabels: 3 });
  assert.equal(withVillages.fallback, false);
  assert.deepEqual(withVillages.labels.map(label => label.ref), ['node/1', 'node/2', 'node/3']);
});

test('the emitted map test is byte-identical to the standard one without a profile, and lowers only the documented numbers with one', () => {
  const standard = mapTestText('xyz');
  // sha256 of the template as it was before profiles existed (acceptance.mjs at 0bce0f10, city id xyz): a standard city's generated test must not drift.
  assert.equal(createHash('sha256').update(standard).digest('hex'), 'cc2a477e3590a28984c8570f7d601b2182c65dab7fc3b586ea4e27eddce2c402')
  assert.match(standard, /PLACES\.length >= 20/);
  assert.match(standard, /length >= 5, 'five source-backed neighbourhood labels remain required'/);
  assert.ok(!standard.includes('EMPTY_SLOTS'));
  const micro = mapTestText('xyz', { profile: 'microstate', emptySlots: [{ slot: 'transit', reason: 'r' }, { slot: 'market', reason: 'r' }] });
  assert.match(micro, /PLACES\.length >= 12/);
  assert.match(micro, /length >= 3, '3 source-backed neighbourhood labels remain required'/);
  assert.match(micro, /const EMPTY_SLOTS: readonly string\[\] = \["transit","market"\]/);
  assert.match(micro, /assert\.deepEqual\(EMPTY_SLOTS, Object\.keys\(ids\)/);
  assert.match(micro, /endsWith\('\(game venue\)'\)/);
  assert.match(micro, /\?\? content\.venues\.find\(v => v\.id === ids\.transit\)\?\.name/);
});

test('source scene: the place minimum follows the profile; a fictional venue of an empty slot in drawn water is a defect', () => {
  const scene = { sourceProblems: [], unknownKinds: [], airportMinimumBoxMarginMetres: 1000, triangles: 10, triangleLimit: 90000, drawCalls: 1, drawCallLimit: 100 };
  assertSourceScene({ ...scene, places: 20, venues: 20 });
  assert.throws(() => assertSourceScene({ ...scene, places: 16, venues: 18 }), /below city acceptance bar/);
  assertSourceScene({ ...scene, places: 16, venues: 18, minimumPlaces: 12 });
  assert.throws(() => assertSourceScene({ ...scene, places: 11, venues: 18, minimumPlaces: 12 }), /below city acceptance bar/);
  assert.throws(() => assertSourceScene({ ...scene, places: 16, venues: 18, minimumPlaces: 12, wetEmptySlots: [{ slot: 'transit' }] }), /drawn water/);
  const ids = { transit: 'xx-transit', market: 'xx-market-game' };
  const venues = [{ id: 'xx-transit', position: { kind: 'lon-lat', lon: 1.5, lat: 1.5 } }, { id: 'xx-market-game', position: { kind: 'lon-lat', lon: 5, lat: 5 } }];
  const lake = [[[0, 0], [3, 0], [3, 3], [0, 3]]];
  assert.deepEqual(wetEmptySlotsFor([{ slot: 'transit' }, { slot: 'market' }], ids, venues, [lake]).map(item => item.slot), ['transit']);
  assert.deepEqual(wetEmptySlotsFor([{ slot: 'transit' }], ids, venues, [[lake[0], [[1, 1], [2, 1], [2, 2], [1, 2]]]]), [], 'a point in a hole is dry');
});
