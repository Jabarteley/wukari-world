// Run: node --test scripts/geo/factory/bootstrap/bounds-policy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeBounds } from './bounds-policy.mjs';

const geometry = { OUTLINE_MARGIN: 0.05, reachFor: () => 0.4 };
const city = (id, iso, centre, airport) => ({ id, name: id, country: { idISOlower: iso, name: iso }, timezone: 'America/Puerto_Rico', centre, airport: { id: `${id}-airport`, name: 'Airport', ...airport } });
// Gustavia (BL) and Philipsburg (SX): 20 km boxes overlapped in lon -63.04..-62.86 (centres and airports as generated on 13 Oct).
const gustavia = city('gustavia', 'bl', { lon: -62.8508372, lat: 17.8957043 }, { lon: -62.843333, lat: 17.904398 });
const philipsburg = city('philipsburg', 'sx', { lon: -63.0483073, lat: 18.0250713 }, { lon: -63.108898, lat: 18.041 });

test('bounds policy: no side extent gives exactly the playKm box', () => {
  for (const facts of [gustavia, philipsburg]) {
    assert.deepEqual(proposeBounds(facts, { westKm: 20, eastKm: 20, southKm: 20, northKm: 20 }, geometry).boxes, proposeBounds(facts, {}, geometry).boxes);
    assert.deepEqual(proposeBounds(facts, { playKm: 14, eastKm: 14 }, geometry).boxes, proposeBounds(facts, { playKm: 14 }, geometry).boxes);
  }
});

test('bounds policy: one-sided extents move only their own edge, so two neighbours meet without overlapping', () => {
  const whole = proposeBounds(gustavia, {}, geometry).boxes.play, cut = proposeBounds(gustavia, { westKm: 10.45 }, geometry).boxes.play;
  assert.deepEqual([cut[0], cut[2], cut[3]], [whole[0], whole[2], whole[3]]);
  assert.ok(cut[1] > whole[1]);
  const east = proposeBounds(philipsburg, { eastKm: 10.35 }, geometry).boxes.play;
  assert.ok(east[3] < cut[1], 'Philipsburg ends west of where Gustavia starts');
  assert.ok(Math.abs(east[3] + 62.95) < 0.001 && Math.abs(cut[1] + 62.95) < 0.001, 'the shared edge is at about lon -62.95');
});

test('bounds policy: a side extent is refused below coreKm, when not positive, or under an unknown name', () => {
  assert.throws(() => proposeBounds(gustavia, { westKm: 4 }, geometry), /westKm must be/);
  assert.throws(() => proposeBounds(gustavia, { northKm: 0 }, geometry), /northKm must be/);
  assert.throws(() => proposeBounds(gustavia, { leftKm: 10 }, geometry), /Unsupported policy override/);
});

test('bounds policy: the airport box still joins a cut side', () => {
  // TNCM lies about 6.4 km west of Philipsburg's centre: a 5 km west side grows back to 1 km beyond the airport.
  const { boxes, airportMarginMetres } = proposeBounds(philipsburg, { westKm: 5 }, geometry);
  assert.ok(boxes.play[1] < philipsburg.airport.lon && airportMarginMetres >= 900 && airportMarginMetres < 1100);
});
