// The aerial city of the dive (./aerial-plan.ts): the height model, the density field, the caps, determinism, clouds and the fade.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AERIAL_CAPS, AERIAL_DRAW_CALLS, AERIAL_RESERVE, AERIAL_TRIANGLES, BOX_TRIANGLES, CLEAR_PLACE, HUB_REACH, LEVEL_M, ROOF_M, SKYLINE_PEAK_M, UNIT_M, VERTICAL,
  aerialBudget, aerialFade, aerialTier, centreOf, cloudFade, densityAt, densityField, footprintHeightM, heightM, landKm2, noiseAt, planAerial, planClouds, radiusOf, random, seedOf, simplify, skylineOf,
} from './aerial-plan.ts';
import type { AerialPack, Skyline } from './aerial-plan.ts';
import { diveTier } from './dive.ts';
import { AERIAL_DIVE_TRIANGLES, AERIAL_DIVE_DRAW_CALLS, CITY_DRAW_CALLS } from '../budgets.ts';
import { loadCityPack as loadPack } from './regions.ts';
/** A city's pack (it is there for every city these tests name). */
const loadCityPack = async (id: string) => (await loadPack(id))!;
import type { Point2 } from './types.ts';

const square = (x: number, z: number, r: number): Point2[] => [[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]];
/** A made-up city: a 20 km square of land, a river through it, a grid of roads, places round the middle and a park. */
function town(id = 'testville', half = 100, sites = 12): AerialPack {
  const roads = [];
  for (let i = -half; i <= half; i += 20) { roads.push({ id: `ew${i}`, name: '', major: i % 40 === 0, points: [[-half, i], [half, i]] as Point2[] }); roads.push({ id: `ns${i}`, name: '', points: [[i, -half], [i, half]] as Point2[] }); }
  return {
    id,
    land: [{ id: 'land', kind: 'mainland', points: square(0, 0, half) }],
    waters: [{ name: 'river', kind: 'river', points: [[-half, 55], [half, 70]], width: 3 }],
    roads,
    fabric: [{ box: [-30, -30, 30, 30], style: 'towers' }, { box: [-half, -half, half, half], style: 'dense' }],
    districts: [{ x: 60, z: -60, size: 20 }],
    sites: Object.fromEntries(Array.from({ length: sites }, (_, i) => [`s${i}`, { x: Math.cos(i) * (10 + i * 4), z: Math.sin(i) * (10 + i * 4) }])),
  };
}

test('the height model: low-rise at the edge, towers in the core, inside the skyline, never below a storey', () => {
  const median = (density: number, skyline: Skyline) => { const rng = random(7), all = Array.from({ length: 801 }, () => heightM(density, skyline, rng(), rng())).sort((a, b) => a - b); return all[400]!; };
  for (const skyline of ['low', 'mid', 'high'] as const) {
    let previous = 0;
    for (const density of [0, 0.2, 0.4, 0.6, 0.8, 1]) { const m = median(density, skyline); assert.ok(m >= previous, `${skyline}: taller with density (${density}: ${m})`); previous = m; }
    const rng = random(11);
    for (let i = 0; i < 2000; i++) { const h = heightM(rng(), skyline, rng(), rng()); assert.ok(h >= 4 && h <= SKYLINE_PEAK_M[skyline] * 1.6, `${skyline} ${h}`); }
    assert.ok(median(0.05, skyline) < 12, `${skyline}: the edge is two or three storeys`);
  }
  assert.ok(median(1, 'high') > 150 && median(1, 'mid') > 70 && median(1, 'low') < 40, 'a metropolis core has towers, a small town does not');
  assert.ok(median(1, 'high') > median(1, 'mid') && median(1, 'mid') > median(1, 'low'));
  assert.equal(heightM(0.5, 'mid', 0.3, 0.6), heightM(0.5, 'mid', 0.3, 0.6), 'a pure function');
  // OSM first: the height tag, then building:levels, then the model.
  assert.equal(footprintHeightM({ x: 0, z: 0, w: 1, d: 1, heightM: 87, levels: 3 }, 0.1, 'low', 0.5, 0.5), 87);
  assert.equal(footprintHeightM({ x: 0, z: 0, w: 1, d: 1, levels: 10 }, 0.1, 'low', 0.5, 0.5), 10 * LEVEL_M + ROOF_M);
  assert.equal(footprintHeightM({ x: 0, z: 0, w: 1, d: 1, heightM: Number.NaN }, 0.4, 'mid', 0.2, 0.3), heightM(0.4, 'mid', 0.2, 0.3));
});

test('the density field: the downtown core is denser than the edge, places and neighbourhoods are local peaks, and land use counts', () => {
  const pack = town(), field = densityField(pack), mean = (r: number) => { let sum = 0; for (let a = 0; a < 64; a++) sum += densityAt(field, field.centre.x + Math.cos(a) * r, field.centre.z + Math.sin(a) * r); return sum / 64; };
  let previous = Infinity;
  for (const share of [0, 0.25, 0.5, 0.75, 1]) { const value = mean(field.radius * share); assert.ok(value <= previous + 0.03, `falls off from the centre (${share}: ${value.toFixed(2)})`); previous = value; }
  assert.ok(mean(0) > 0.7 && mean(field.radius) < 0.25, `core ${mean(0)}, edge ${mean(field.radius)}`);
  // A named neighbourhood out at the edge pulls the density up round it.
  const withHub = densityField({ ...pack, districts: [{ x: field.centre.x + field.radius * 0.8, z: field.centre.z, size: 30 }] }), withoutHub = densityField({ ...pack, districts: [] });
  const at = { x: field.centre.x + field.radius * 0.8, z: field.centre.z };
  assert.ok(densityAt(withHub, at.x, at.z) > densityAt(withoutHub, at.x, at.z) + 0.1, 'a sub-centre');
  // Leafy villas are less built-up than towers at the same spot.
  const villas = densityField({ ...pack, fabric: [{ box: [-200, -200, 200, 200], style: 'villas' }] }), towers = densityField({ ...pack, fabric: [{ box: [-200, -200, 200, 200], style: 'towers' }] });
  assert.ok(densityAt(villas, 5, 5) < densityAt(towers, 5, 5));
  for (let i = 0; i < 500; i++) { const value = densityAt(field, (i % 25) * 8 - 100, Math.floor(i / 25) * 10 - 100); assert.ok(value >= 0 && value <= 1); }
  assert.ok(noiseAt(1, 3.3, 4.4, 7) >= 0 && noiseAt(1, 3.3, 4.4, 7) < 1);
});

test('the skyline comes from the pack: a metropolis is high, a small capital low, with no per-city table', async () => {
  assert.equal(skylineOf(town('tiny', 20, 4)), 'low');
  assert.equal(skylineOf(town('mid', 60, 12)), 'mid');
  assert.equal(skylineOf({ ...town('big', 160, 30), roads: town('big', 160).roads.concat(Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, name: '', points: [[0, 0], [1, 1]] as Point2[] }))) }), 'high');
  assert.ok(Math.abs(landKm2(town('area', 50)) - 100) < 1e-6, '100 units square is 10 km square');
  const expected: Record<string, Skyline> = { lagos: 'high', seoul: 'high', toronto: 'high', 'san-marino': 'low', yaren: 'low', palikir: 'low' };
  for (const [id, skyline] of Object.entries(expected)) assert.equal(skylineOf(await loadCityPack(id)), skyline, id);
  const pack = town(), centre = centreOf(pack);
  assert.ok(Math.hypot(centre.x, centre.z) < 15, 'the middle of the places');
  assert.ok(radiusOf(pack, centre, 'high') >= 24 && radiusOf(pack, centre, 'high') <= 150);
});

test('the plan: buildings on land only, off roads, water and the places, the core taller than the edge, and the same every time', () => {
  const pack = town(), plan = planAerial(pack, { cityTriangles: 40_000 });
  assert.ok(plan.masses.length > 600, `a dense city (${plan.masses.length})`);
  const field = densityField(pack);
  for (const mass of plan.masses) {
    assert.ok(Math.abs(mass.x) <= 101 && Math.abs(mass.z) <= 101, 'on the land');
    assert.ok(Number.isFinite(mass.h) && mass.h > 0 && mass.w > 0 && mass.d > 0);
    for (const site of Object.values(pack.sites)) assert.ok(Math.hypot(mass.x - site.x, mass.z - site.z) > CLEAR_PLACE - 1.5, 'the landmarks stay clear');
    if (mass.kind !== 'canopy') {
      const offRoad = Math.min(...[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100].map((line) => Math.min(Math.abs(mass.x - line), Math.abs(mass.z - line))));
      assert.ok(offRoad > 0.3, `off the roads (${mass.x}, ${mass.z})`);
      assert.ok(mass.h <= (SKYLINE_PEAK_M[plan.skyline] * 1.6 / UNIT_M) * VERTICAL + 1e-9);
    }
  }
  const tall = (near: boolean) => { const list = plan.masses.filter((mass) => mass.kind !== 'canopy' && (Math.hypot(mass.x - field.centre.x, mass.z - field.centre.z) < plan.radius * 0.25) === near).map((mass) => mass.h).sort((a, b) => a - b); return list[Math.floor(list.length * 0.9)]!; };
  assert.ok(tall(true) > tall(false) * 1.8, `downtown towers (${tall(true).toFixed(2)}) over the low-rise edge (${tall(false).toFixed(2)})`);
  assert.ok(plan.masses.some((mass) => mass.kind === 'tower') && plan.masses.some((mass) => mass.kind === 'canopy') && plan.parks.length > 0 && plan.ribbons.length > 0);
  // Closer and smaller blocks downtown than at the edge.
  const spread = (near: boolean) => plan.masses.filter((mass) => mass.kind === 'block' && (Math.hypot(mass.x - field.centre.x, mass.z - field.centre.z) < plan.radius * 0.3) === near).reduce((sum, mass, _, all) => sum + mass.w / all.length, 0);
  assert.ok(spread(true) < spread(false), 'finer grain in the core');
  // Deterministic: seeded by the city id, not by the run.
  const again = planAerial({ ...town(), id: 'testville' }, { cityTriangles: 40_000 }), other = planAerial({ ...town(), id: 'otherville' }, { cityTriangles: 40_000 });
  assert.deepEqual(again.masses.slice(0, 50), plan.masses.slice(0, 50));
  assert.notDeepEqual(other.masses.slice(0, 50).map((mass) => mass.h), plan.masses.slice(0, 50).map((mass) => mass.h), 'another city, another skyline');
  assert.equal(seedOf('lagos'), seedOf('lagos'));
  // The dive's destination gets its own quarter, however far out it is: the swoop comes down over buildings.
  const far = { x: 82, z: -82 }, out = planAerial({ ...town(), id: 'far-dive' }, { cityTriangles: 40_000, hubs: [far] });
  assert.ok(Math.hypot(far.x - out.centre.x, far.z - out.centre.z) > out.radius + HUB_REACH, 'outside the middle disc');
  assert.ok(out.masses.filter((mass) => mass.kind !== 'canopy' && Math.hypot(mass.x - far.x, mass.z - far.z) <= HUB_REACH).length > 60, 'a quarter round it');
  // OSM footprints are drawn at their own heights, and the procedural blocks keep off them.
  const footprints = [{ x: 3.3, z: 3.3, w: 1.2, d: 1.2, heightM: 300 }, { x: 13.3, z: 3.3, w: 1, d: 1, levels: 12 }];
  const tagged = planAerial({ ...town(), id: 'tagged', footprints }, { cityTriangles: 40_000 });
  assert.equal(tagged.masses[0]!.h, (300 / UNIT_M) * VERTICAL); assert.equal(tagged.masses[1]!.h, ((12 * LEVEL_M + ROOF_M) / UNIT_M) * VERTICAL);
  assert.ok(!tagged.masses.slice(2).some((mass) => mass.kind !== 'canopy' && Math.hypot(mass.x - 3.3, mass.z - 3.3) < 0.3), 'nothing stands inside a footprint');
});

test('the caps: inside AERIAL_TRIANGLES with the city on every tier, the core kept when the edge is thinned, and four draw calls', async () => {
  assert.equal(AERIAL_TRIANGLES, AERIAL_DIVE_TRIANGLES.value, 'the budget table says the same');
  assert.equal(AERIAL_DRAW_CALLS, AERIAL_DIVE_DRAW_CALLS.value - CITY_DRAW_CALLS.value);
  for (const tier of ['full', 'lite'] as const) for (const city of [0, 30_000, 60_000, 90_000, 110_000]) {
    const budget = aerialBudget(tier, city);
    assert.ok(budget.massing <= AERIAL_CAPS[tier].massing && budget.ribbons <= AERIAL_CAPS[tier].ribbons);
    assert.ok(city + AERIAL_RESERVE + budget.massing + budget.ribbons + budget.parks + budget.clouds <= Math.max(AERIAL_TRIANGLES, city + AERIAL_RESERVE), `${tier} next to ${city}`);
  }
  assert.ok(aerialBudget('lite', 40_000).massing <= aerialBudget('full', 40_000).massing * 0.6, 'lite draws about half');
  for (const id of ['lagos', 'seoul', 'toronto', 'singapore', 'abuja', 'yaren']) {
    const pack = await loadCityPack(id);
    for (const tier of ['full', 'lite'] as const) for (const city of [45_000, 85_000]) {
      const plan = planAerial(pack, { tier, cityTriangles: city }), total = plan.triangles.massing + plan.triangles.parks + plan.triangles.ribbons + AERIAL_CAPS[tier].clouds * 2;
      assert.ok(city + AERIAL_RESERVE + total <= AERIAL_TRIANGLES, `${id} ${tier} next to ${city}: ${total}`);
      assert.equal(plan.triangles.massing, plan.masses.length * BOX_TRIANGLES);
    }
    const full = planAerial(pack, { tier: 'full', cityTriangles: 45_000 }), lite = planAerial(pack, { tier: 'lite', cityTriangles: 45_000 });
    assert.ok(lite.masses.length <= full.masses.length, `${id}: lite is lighter`);
  }
  // Thinned to a tight cap, the densest blocks stay.
  const roomy = planAerial({ ...town(), id: 'roomy' }, { cityTriangles: 0 }), tight = planAerial({ ...town(), id: 'roomy' }, { cityTriangles: AERIAL_TRIANGLES - AERIAL_RESERVE - 9_000 });
  assert.ok(tight.masses.length < roomy.masses.length && tight.masses.length * BOX_TRIANGLES <= aerialBudget('full', AERIAL_TRIANGLES - AERIAL_RESERVE - 9_000).massing);
  const buildings = (list: typeof roomy.masses) => list.filter((mass) => mass.kind !== 'canopy');
  const meanReach = (list: typeof roomy.masses) => buildings(list).reduce((sum, mass, _, all) => sum + Math.hypot(mass.x - roomy.centre.x, mass.z - roomy.centre.z) / all.length, 0);
  const core = (list: typeof roomy.masses) => buildings(list).filter((mass) => Math.hypot(mass.x - roomy.centre.x, mass.z - roomy.centre.z) < roomy.radius * 0.25).length;
  assert.ok(tight.radius < roomy.radius && meanReach(tight.masses) < meanReach(roomy.masses), 'the edge is pulled in first');
  assert.ok(core(tight.masses) >= core(roomy.masses) * 0.6, `the core stays (${core(tight.masses)} of ${core(roomy.masses)})`);
  assert.deepEqual(simplify([{ x: 0, z: 0 }, { x: 0.1, z: 0 }, { x: 2, z: 0 }, { x: 2.1, z: 0 }], 1), [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2.1, z: 0 }]);
});

test('clouds sit between the start and the end of the descent round its path; the massing and clouds are gone before the dive ends', () => {
  const clouds = planClouds(42, { x: 0, z: 0 }, { x: 40, z: 0 }, 600, 120, 28);
  assert.equal(clouds.length, 28);
  for (const cloud of clouds) { assert.ok(cloud.y < 600 && cloud.y > 120, `${cloud.y}`); assert.ok(cloud.size > 0); }
  assert.deepEqual(planClouds(42, { x: 0, z: 0 }, { x: 40, z: 0 }, 600, 120, 28), clouds, 'seeded');
  assert.equal(planClouds(42, { x: 0, z: 0 }, { x: 0, z: 0 }, 300, 290, 28).length, 0, 'no room to pass any');
  assert.equal(planClouds(42, { x: 0, z: 0 }, { x: 0, z: 0 }, 600, 120, 0).length, 0);
  // Higher clouds are nearer the camera at the start, so they pass faster (parallax): each layer is spread over what the picture shows at its depth.
  const high = clouds.filter((cloud) => cloud.y > 450), low = clouds.filter((cloud) => cloud.y < 250);
  assert.ok(high.reduce((sum, cloud) => sum + cloud.size, 0) / high.length < low.reduce((sum, cloud) => sum + cloud.size, 0) / low.length);
  for (const street of [false, true]) {
    assert.equal(aerialFade(0, street), 1); assert.equal(aerialFade(0.5, street), 1, 'whole on the way down');
    assert.equal(aerialFade(1, street), 0, 'gone at the end');
    let previous = 1;
    for (let k = 0; k <= 1.0001; k += 0.02) { const value = aerialFade(k, street); assert.ok(value <= previous + 1e-12); previous = value; }
  }
  assert.ok(cloudFade(0) > 0.99 && cloudFade(0.5) === 0, 'the clouds have parted by the time the camera is over the towers');
});

test('device tiers: the same as the dive\'s, and a cut device gets no aerial city', () => {
  const cases = [{}, { reduced: true }, { saveData: true }, { cores: 2 }, { cores: 4 }, { cores: 8 }, { memory: 1 }, { memory: 2 }, { memory: 8 }, { cores: 8, memory: 0.5 }, { cores: Number.NaN }];
  for (const hints of cases) assert.equal(aerialTier(hints), diveTier(hints), JSON.stringify(hints));
});

test('the aerial chunk imports nothing it does not own, and the map fetches it only when a dive starts', async () => {
  for (const file of ['src/map3d/aerial-plan.ts', 'src/map3d/aerial.ts']) {
    const code = await readFile(file, 'utf8');
    const values = [...code.matchAll(/^import (?!type )[^;]*from '([^']+)'/gm)].map((match) => match[1]);
    assert.deepEqual(values.filter((path) => path !== './aerial-plan.ts'), [], `${file} has no value imports but its own plan`);
  }
  const map = await readFile('src/map3d/map3d.ts', 'utf8');
  assert.match(map, /import\('\.\/aerial\.ts'\)/, 'fetched when a dive starts');
  assert.doesNotMatch(map, /^import (?!type )[^;]*aerial/m, 'never statically');
  for (const file of ['src/app/scene/MapWorld.vue', 'src/map3d/index.ts', 'src/map3d/zoom-host.ts', 'src/map3d/dive-host.ts', 'src/map3d/dive.ts', 'src/campus/unilag/world-adapter.ts']) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /aerial\.ts|aerial-plan/, `${file} knows nothing of it`);
  }
});
