// The aerial city's downtown and size class (./aerial-plan.ts downtownOf, peakOf, tallnessAt), and a sanity run of the height model
// over twelve real cities: the tallest cluster stands near the city's catalogue point, nothing stands on water, the caps hold, and
// the same city gives the same skyline every time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AERIAL_CAPS, AERIAL_RESERVE, AERIAL_TRIANGLES, OUTER_SHARE, SKYLINE_PEAK_M, UNIT_M, VERTICAL,
  LOW_CORE_M, densityField, downtownOf, forgetPlans, heightClassOf, peakOf, planAerial, priorOf, tallnessAt,
} from './aerial-plan.ts';
import { TIER_CAP_M, cityTier } from './aerial-tiers.ts';
import type { AerialPack, AerialPlan, AerialVenue } from './aerial-plan.ts';
import { loadCityPack } from './regions.ts';
import { cityCatalogue, cityCatalogueEntry, loadCityContent } from '../game/cities/registry.ts';
import { fromLocal, toLocal } from '../geo/frame.ts';
import type { CityPack, Point2 } from './types.ts';

const square = (x: number, z: number, r: number): Point2[] => [[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]];
/** A made-up city: land, a grid of roads, and venues of the given kinds. */
function town(venues: readonly AerialVenue[], extra: Partial<AerialPack> = {}): AerialPack {
  const roads = [];
  for (let i = -100; i <= 100; i += 20) roads.push({ id: `ew${i}`, name: '', points: [[-100, i], [100, i]] as Point2[] }, { id: `ns${i}`, name: '', points: [[i, -100], [i, 100]] as Point2[] });
  return { id: 'downtown-town', frame: { unitsPerKm: 10 }, land: [{ id: 'land', kind: 'mainland', points: square(0, 0, 100) }], roads, sites: Object.fromEntries(venues.map((venue, i) => [`v${i}`, { x: venue.x, z: venue.z }])), ...extra };
}

test('the downtown: a cluster of offices and civic venues a few km off pulls it there; scattered parks do not; never on water', () => {
  const offices: AerialVenue[] = [[30, 22], [33, 25], [28, 27], [34, 20], [31, 29]].map(([x, z]) => ({ x: x!, z: z!, kind: 'office' }));
  const parks: AerialVenue[] = [[-40, 10], [10, -50], [-20, 45], [50, -30]].map(([x, z]) => ({ x: x!, z: z!, kind: 'park' }));
  const pack = town([...offices, ...parks]);
  const at = downtownOf(pack, { venues: [...offices, ...parks] });
  // Most of the way: the prior round the catalogue point holds it a little short of the cluster's middle.
  assert.ok(Math.hypot(at.x - 31, at.z - 25) < 7 && Math.hypot(at.x, at.z) > 30, `the office cluster (${at.x}, ${at.z})`);
  // The same points as parks and beaches hardly count: the catalogue point (the frame origin) stays.
  const green = offices.map((venue) => ({ ...venue, kind: 'beach' }));
  const stay = downtownOf(pack, { venues: [...green, ...parks] });
  assert.ok(Math.hypot(stay.x, stay.z) < 6, `the catalogue point holds (${stay.x}, ${stay.z})`);
  assert.deepEqual(priorOf(pack), { x: 0, z: 0 }, 'a pack with a frame is drawn round its origin');
  // A lake over the cluster: the downtown is on its shore, not in it.
  const lake = town(offices, { water: [{ points: square(31, 25, 6) }] }), shore = downtownOf(lake, { venues: offices });
  assert.ok(Math.abs(shore.x - 31) >= 6 || Math.abs(shore.z - 25) >= 6, `on land (${shore.x}, ${shore.z})`);
  assert.ok(Math.hypot(shore.x - 31, shore.z - 25) < 15, 'beside the cluster');
  // No land at all within reach: the prior.
  assert.deepEqual(downtownOf({ ...pack, land: [{ id: 'far', kind: 'mainland', points: square(500, 500, 10) }] }, { venues: offices }), { x: 0, z: 0 });
  // An airport far out does not drag it.
  const airport = downtownOf(town([{ x: 70, z: 70, kind: 'airport' }, { x: 2, z: 1, kind: 'statehouse' }]), { venues: [{ x: 70, z: 70, kind: 'airport' }, { x: 2, z: 1, kind: 'statehouse' }] });
  assert.ok(Math.hypot(airport.x - 2, airport.z - 1) < 4);
  // One office 4 km off is a weak cluster: it may pull the downtown only part of a km from the catalogue point, and onto land.
  const lone = [{ x: 40, z: 0, kind: 'office' }], pulled = downtownOf(town(lone), { venues: lone });
  assert.ok(Math.hypot(pulled.x, pulled.z) <= 10.5, `held near the catalogue point (${pulled.x}, ${pulled.z})`);
});

test('every open city has a curated tier; an unknown city falls back to its area and roads, capped at tier 3', () => {
  const open = cityCatalogue().filter((city) => city.open && !city.id.startsWith('test-'));
  assert.ok(open.length >= 280, `${open.length} open cities`);
  for (const city of open) assert.ok(cityTier(city.id), `${city.id} has a tier`);
  assert.deepEqual(TIER_CAP_M, [12, 25, 70, 150, 300]);
  for (const id of ['lagos', 'singapore', 'hong-kong', 'new-york', 'london', 'tokyo', 'shanghai', 'dubai', 'sao-paulo', 'seoul', 'toronto']) assert.equal(cityTier(id)?.tier, 4, id);
  for (const id of ['accra', 'nairobi', 'cairo', 'istanbul']) assert.equal(cityTier(id)?.tier, 3, id);
  for (const id of ['villa-las-estrellas', 'ashmore', 'chagos', 'adamstown']) assert.equal(cityTier(id)?.tier, 0, id);
  assert.equal(cityTier('paris')?.lowCore, true, 'Paris keeps a low historic centre');
  const unknown = heightClassOf({ ...town([]), id: 'not-a-city', land: [{ id: 'l', kind: 'mainland', points: square(0, 0, 2000) }] });
  assert.equal(unknown.tier, null); assert.ok(unknown.capM <= TIER_CAP_M[3]!, `capped at tier 3 (${unknown.capM})`);
  assert.equal(heightClassOf({ ...town([]), id: 'accra' }).capM, 150);
});

test('the size class: the peak rises with the size score, inside each skyline class, and tapers from the downtown outwards', () => {
  let previous = 0;
  for (let score = 0; score <= 4; score += 0.05) { const peak = peakOf(score); assert.ok(peak >= previous - 1e-9, `${score}`); previous = peak; }
  assert.equal(peakOf(0), 12); assert.equal(peakOf(5), SKYLINE_PEAK_M.high);
  assert.ok(peakOf(1.99) <= SKYLINE_PEAK_M.low && peakOf(2.69) <= SKYLINE_PEAK_M.mid, 'each class keeps under its top');
  const field = { centre: { x: 10, z: -5 }, core: 20 };
  assert.equal(tallnessAt(field, 10, -5), 1);
  assert.ok(tallnessAt(field, 30, -5) < 0.7 && tallnessAt(field, 200, -5) - OUTER_SHARE < 1e-6);
});

/** Inside a ring (even-odd). */
function inRing(ring: readonly Point2[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i]!, [bx, bz] = ring[j]!;
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
const inPolygon = (outer: readonly Point2[], holes: readonly (readonly Point2[])[] | undefined, x: number, z: number) => inRing(outer, x, z) && !(holes ?? []).some((hole) => inRing(hole, x, z));
/** Ground distance in km between two points, from their longitudes and latitudes (the map's x scale is only true near 9°N). */
const km = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => Math.hypot((a.lon - b.lon) * 111.32 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180), (a.lat - b.lat) * 110.57);
/** Where the tallest buildings stand: the height-weighted middle of the tallest 5%. */
function tallestCluster(plan: AerialPlan): { x: number; z: number } {
  const buildings = plan.masses.filter((mass) => mass.kind !== 'canopy').sort((a, b) => b.h - a.h), top = buildings.slice(0, Math.max(5, Math.ceil(buildings.length * 0.05)));
  const weight = top.reduce((sum, mass) => sum + mass.h, 0);
  return { x: top.reduce((sum, mass) => sum + mass.x * mass.h, 0) / weight, z: top.reduce((sum, mass) => sum + mass.z * mass.h, 0) / weight };
}

const SAMPLE = ['lagos', 'singapore', 'paris', 'accra', 'kyrenia', 'hong-kong', 'san-juan', 'willemstad', 'mata-utu', 'villa-las-estrellas', 'ashmore', 'chagos'];
/** Known downtowns: the tallest cluster must stand within this many km of them. */
const KNOWN: Record<string, { lon: number; lat: number; km: number; name: string }> = {
  singapore: { lon: 103.8514, lat: 1.2840, km: 1.5, name: 'Raffles Place' },
  lagos: { lon: 3.395, lat: 6.45, km: 2.5, name: 'Lagos Island (Marina)' },
  'hong-kong': { lon: 114.158, lat: 22.282, km: 1.5, name: 'Central' },
};
const SMALL = new Set(['kyrenia', 'mata-utu', 'villa-las-estrellas', 'ashmore', 'chagos']), BIG = new Set(['lagos', 'singapore', 'hong-kong']);

test('twelve real cities: the tallest cluster near the catalogue point, nothing on water, caps kept, the same every time', async () => {
  for (const id of SAMPLE) {
    const pack = (await loadCityPack(id)) as CityPack, content = await loadCityContent(id), entry = cityCatalogueEntry(id)!, origin = pack.frame!.origin;
    const venues = content.venues.flatMap((venue) => { const site = pack.sites[venue.id]; return site ? [{ x: site.x, z: site.z, kind: venue.kind }] : []; });
    const plan = planAerial(pack, { cityTriangles: 45_000, venues }), lowCore = cityTier(id)?.lowCore === true;
    const buildings = plan.masses.filter((mass) => mass.kind !== 'canopy');
    // Where: the downtown and the tallest cluster within 2 km of the city's own point (the facts' centre, the pack's origin) and 10 km
    // of the catalogue row (Lagos's row is a two-decimal mainland point; its map is drawn round Lagos Island).
    const facts = fromLocal(origin, 0, 0), catalogue = { lon: entry.lon, lat: entry.lat };
    assert.ok(km(fromLocal(origin, plan.centre.x, plan.centre.z), facts) <= 2, `${id}: downtown near its centre`);
    if (buildings.length >= 20 && !lowCore) {
      const tall = fromLocal(origin, ...(Object.values(tallestCluster(plan)) as [number, number]));
      assert.ok(km(tall, facts) <= 2.2, `${id}: the tallest cluster ${km(tall, facts).toFixed(2)} km from the city's point`);
      assert.ok(km(tall, catalogue) <= 10, `${id}: ${km(tall, catalogue).toFixed(2)} km from the catalogue row`);
      const known = KNOWN[id];
      if (known) assert.ok(km(tall, known) <= known.km, `${id}: towers at ${known.name} (${km(tall, known).toFixed(2)} km)`);
    }
    assert.ok(Math.hypot(...toLocal(origin, facts.lon, facts.lat)) < 1e-6);
    // Nothing on water: no building's middle inside a water polygon or a lake, and every one on the land.
    const lakes = (pack.waters ?? []).filter((water) => water.kind === 'lake');
    for (const mass of buildings) {
      assert.ok(!(pack.water ?? []).some((water) => inPolygon(water.points, water.holes, mass.x, mass.z)) && !lakes.some((lake) => inRing(lake.points, mass.x, mass.z)), `${id}: a building on water at (${mass.x.toFixed(1)}, ${mass.z.toFixed(1)})`);
      if (!plan.filled) assert.ok(pack.land.some((land) => land.kind !== 'sand' && inPolygon(land.points, land.holes, mass.x, mass.z)), `${id}: a building off the land`);
    }
    // Caps: the tier's hard cap (a village stays low, a metropolis has a skyline), and the triangle budget next to the city on both tiers.
    const tallest = Math.max(0, ...buildings.map((mass) => (mass.h / VERTICAL) * UNIT_M));
    assert.equal(plan.capM, TIER_CAP_M[cityTier(id)!.tier]);
    assert.ok(tallest <= plan.capM + 1e-6, `${id}: ${tallest} m over its tier cap ${plan.capM} m`);
    if (SMALL.has(id)) assert.ok(plan.capM <= 25 && plan.skyline === 'low', `${id}: stays low (tallest ${tallest.toFixed(0)} m)`);
    if (BIG.has(id)) assert.ok(plan.skyline === 'high' && tallest > 150, `${id}: a skyline (${tallest.toFixed(0)} m)`);
    for (const tier of ['full', 'lite'] as const) {
      const capped = planAerial(pack, { tier, cityTriangles: 85_000, venues }), total = capped.triangles.massing + capped.triangles.parks + capped.triangles.ribbons + AERIAL_CAPS[tier].clouds * 2;
      assert.ok(85_000 + AERIAL_RESERVE + total <= AERIAL_TRIANGLES, `${id} ${tier}: ${total}`);
    }
    if (id === 'accra') assert.ok(tallest <= 150, `Accra within tier 3 (${tallest} m)`);
    if (id === 'kyrenia') assert.ok(tallest <= 25, `Kyrenia within tier 1 (${tallest} m)`);
    if (id === 'paris') {
      // Paris: its mapped land leaves the centre bare, so the dry ground round it is built on; a dense low and mid-rise centre (held to
      // LOW_CORE_M before the spread) with a modest tower district outside it.
      assert.ok(plan.filled && buildings.length > 1500, `a dense Paris (${buildings.length})`);
      const field = densityField(pack, [], { venues }), core = buildings.filter((mass) => Math.hypot(mass.x - field.centre.x, mass.z - field.centre.z) < field.core * 1.2);
      assert.ok(core.length > 300 && core.every((mass) => (mass.h / VERTICAL) * UNIT_M <= LOW_CORE_M * 1.6 + 1e-6), `the historic centre stays low (${core.length})`);
      const towers = buildings.filter((mass) => (mass.h / VERTICAL) * UNIT_M > 60);
      assert.ok(towers.length > 0 && towers.length < buildings.length * 0.05, `a modest tower district (${towers.length})`);
    }
    // The same every time: made again from scratch, the same downtown and the same boxes.
    forgetPlans();
    const again = planAerial(pack, { cityTriangles: 45_000, venues });
    assert.notEqual(again, plan);
    assert.deepEqual(again.centre, plan.centre); assert.deepEqual(again.masses, plan.masses);
    assert.deepEqual(densityField(pack, [], { venues }).centre, plan.centre);
  }
});

test('Toronto: its scattered venues do not drag the downtown away from the catalogue point', async () => {
  const pack = (await loadCityPack('toronto')) as CityPack, content = await loadCityContent('toronto');
  const venues = content.venues.flatMap((venue) => { const site = pack.sites[venue.id]; return site ? [{ x: site.x, z: site.z, kind: venue.kind }] : []; });
  const at = downtownOf(pack, { venues }), origin = pack.frame!.origin;
  assert.ok(km(fromLocal(origin, at.x, at.z), fromLocal(origin, 0, 0)) <= 0.5, `within half a km of City Hall (${km(fromLocal(origin, at.x, at.z), fromLocal(origin, 0, 0)).toFixed(2)} km)`);
});
