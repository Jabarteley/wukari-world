// Run: node --test scripts/geo/factory/bootstrap/bounds-policy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeBounds, CORE_SIDE_MARGIN_KM } from './bounds-policy.mjs';

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

test('bounds policy: a side extent is refused below an explicit coreKm, when not positive, or under an unknown name', () => {
  assert.throws(() => proposeBounds(gustavia, { westKm: 4, coreKm: 5 }, geometry), /westKm must be/);
  assert.throws(() => proposeBounds(gustavia, { northKm: 0 }, geometry), /northKm must be/);
  assert.throws(() => proposeBounds(gustavia, { leftKm: 10 }, geometry), /Unsupported policy override/);
});

test('bounds policy: the airport box still joins a cut side', () => {
  // TNCM lies about 6.4 km west of Philipsburg's centre: a 5 km west side grows back to 1 km beyond the airport.
  const { boxes, airportMarginMetres } = proposeBounds(philipsburg, { westKm: 5 }, geometry);
  assert.ok(boxes.play[1] < philipsburg.airport.lon && airportMarginMetres >= 900 && airportMarginMetres < 1100);
});

// Regression: boxes that use no side below 5 km come out byte-identical to the committed factory drafts
// (country-factory/{mc,je,fr}-factory-targets.json facts.bounds, [west, south, east, north]); Paris also exercises the airport join.
const monaco = city('monaco', 'mc', { lon: 7.4209592, lat: 43.7310164 }, { lon: 7.419673, lat: 43.725798 });
const stHelier = city('st-helier', 'je', { lon: -2.1102277, lat: 49.1856637 }, { lon: -2.19551, lat: 49.207901 });
const paris = city('paris', 'fr', { lon: 2.3483915, lat: 48.8534951 }, { lon: 2.554117, lat: 49.00896 });
const wsen = ([south, west, north, east]) => [west, south, east, north];

test('bounds policy: boxes without a small side are byte-identical to the committed drafts', () => {
  for (const [facts, overrides, bounds] of [
    [monaco, {}, [7.171569331894352, 43.55013551006602, 7.670349068105649, 43.91189728993398]],
    [stHelier, { playKm: 12 }, [-2.2755166177377726, 49.07713516603961, -1.9449387822622268, 49.29419223396039]],
    [paris, { playKm: 19 }, [2.0881009083398387, 48.68165825456273, 2.608682091660161, 49.02533194543728]],
    [gustavia, { westKm: 10.45 }, [-62.94953618220457, 17.71482341006602, -62.66184689789981, 18.076585189933976]],
  ]) {
    const proposal = proposeBounds(facts, overrides, geometry);
    assert.deepEqual(wsen(proposal.boxes.play), bounds, facts.id);
    assert.equal(proposal.policy.coreKm, 5, facts.id);
  }
});

// The Anguilla / St Martin cluster (OVERLAPS.md, 15 Oct): Marigot and Philipsburg meet on a lat line near 18.0547, 1.3 and 3.3 km from their centres.
const marigot = city('marigot', 'mf', { lon: -63.0848869, lat: 18.0668544 }, { lon: -63.047444, lat: 18.100057 });
const theValley = city('the-valley', 'ai', { lon: -63.0517759, lat: 18.2145861 }, { lon: -63.05383, lat: 18.204773 });

test('bounds policy: a side below 5 km shrinks only the default core, to the smallest side minus the margin', () => {
  const south = proposeBounds(marigot, { northKm: 7.64, southKm: 1.344 }, geometry);
  assert.ok(Math.abs(south.policy.coreKm - (1.344 - CORE_SIDE_MARGIN_KM)) < 1e-12);
  const { play, core } = south.boxes;
  assert.ok(core[0] > play[0] && core[1] > play[1] && core[2] < play[2] && core[3] < play[3], 'core strictly inside play');
  const north = proposeBounds(philipsburg, { eastKm: 10.35, northKm: 3.27 }, geometry);
  assert.ok(north.boxes.play[2] < play[0], 'Philipsburg ends south of where Marigot starts');
  assert.ok(proposeBounds(theValley, { southKm: 8.69 }, geometry).boxes.play[0] > play[2], 'The Valley starts north of Marigot');
  // An explicit coreKm is kept as given, and must still fit.
  assert.equal(proposeBounds(marigot, { southKm: 1.344, coreKm: 1 }, geometry).policy.coreKm, 1);
  assert.throws(() => proposeBounds(marigot, { southKm: 1.344, coreKm: 2 }, geometry), /southKm must be/);
});
