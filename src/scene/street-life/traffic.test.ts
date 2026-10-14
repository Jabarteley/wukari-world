// Two-way traffic (./traffic.ts): the driving-side table, lanes on the right side of the road, each country's mix of vehicles, slowing at
// crossings, queues at the lights, and never a touch, all as pure functions of (plan, wall-clock seconds).
import test from 'node:test';
import assert from 'node:assert/strict';
import { planTraffic } from './plan.ts';
import type { Lane, Road, Vehicle } from './plan.ts';
import { paintTraffic } from './livery.ts';
import { crossingSpans } from './crowd.ts';
import {
  FLAVOURS, LEFT_HAND, RAMP, SLOW_SHARE, drivenAt, drivingSide, flavourFor, flavourTraffic, freePlace, freeTime, planSchedule, profileFor,
  sideOf, twoWayRoads, vehiclePose,
} from './traffic.ts';
import type { Axis, DrivingSide } from './traffic.ts';

const AXIS: Axis = { ax: -84, az: 6.875, bx: 84, bz: 6.875 };
const CROSSINGS: Lane[] = [78, 10].map((x) => ({ ax: x, az: 2.65, bx: x, bz: 11.1, width: 2.4 }));

test('driving side: left in Britain, Kenya, South Africa, India, Japan, Australia, New Zealand, Singapore, Hong Kong, Malaysia, Indonesia; right elsewhere', () => {
  for (const id of ['gb', 'ie', 'ke', 'ug', 'tz', 'za', 'zw', 'in', 'pk', 'bd', 'lk', 'jp', 'th', 'au', 'nz', 'sg', 'hk', 'my', 'id', 'jm', 'tt', 'mv', 'nr', 'ag']) {
    assert.equal(drivingSide(id), 'left', id);
  }
  // Nigeria and Ghana drive on the right (since 1972 and 1974), as do Samoa's neighbours across the dateline and most of the world.
  for (const id of ['ng', 'nigeria', 'gh', 'fr', 'us', 'de', 'kr', 'cn', 'br', 'ru', 'eg', 'ca', 'fm', 'sm', 'ua', 'ps']) assert.equal(drivingSide(id), 'right', id);
  assert.equal(drivingSide('GB'), 'left', 'any case');
  assert.equal(drivingSide(null), 'right');
  assert.equal(drivingSide('zz'), 'right');
  assert.ok([...LEFT_HAND].every((id) => /^[a-z]{2}$/.test(id)), 'two-letter lower-case ids');
  assert.ok(LEFT_HAND.size >= 70 && LEFT_HAND.size <= 80, `about 75 places drive on the left (${LEFT_HAND.size})`);
});

test('two-way roads: one lane each way, each on its country\'s side of the centre line, the same length and speed', () => {
  for (const side of ['left', 'right'] as DrivingSide[]) {
    const [forth, back] = twoWayRoads(AXIS, side, 0.78, 5.5) as [Road, Road];
    assert.equal(sideOf(forth, AXIS), side);
    assert.equal(sideOf(back, AXIS), side);
    assert.ok(forth.bx > forth.ax && back.bx < back.ax, 'road 0 runs a → b, road 1 b → a');
    assert.ok(Math.abs(Math.abs(forth.az - AXIS.az) - 0.78) < 1e-9 && Math.abs(forth.az + back.az - 2 * AXIS.az) < 1e-9, 'either side of the line by the offset');
    assert.equal(Math.hypot(forth.bx - forth.ax, forth.bz - forth.az), Math.hypot(back.bx - back.ax, back.bz - back.az));
    assert.equal(forth.speed, back.speed);
  }
  // Seen from above (y up), heading +x the right-hand side is +z: on a right-hand street the eastbound lane is the +z one.
  assert.ok(twoWayRoads(AXIS, 'right', 1, 5)[0]!.az > AXIS.az);
  assert.ok(twoWayRoads(AXIS, 'left', 1, 5)[0]!.az < AXIS.az);
  // A street along z: heading +z, the right is −x.
  const north = twoWayRoads({ ax: 0, az: -20, bx: 0, bz: 20 }, 'right', 1, 5)[0]!;
  assert.ok(north.ax < 0);
});

test('each country\'s mix: okadas in Lagos, boda-bodas in Kampala, bicycles in Amsterdam; taxis, buses and trucks untouched, paint kept, never longer', () => {
  const roads = twoWayRoads(AXIS, 'right', 1, 5.5);
  const count = (country: string, kind: string): number => {
    let n = 0;
    for (let k = 0; k < 40; k++) n += flavourTraffic(paintTraffic(planTraffic(`s${k}`, roads, 12), country, `s${k}`), country, `s${k}`).filter((v) => v.kind === kind).length;
    return n;
  };
  assert.ok(count('ng', 'okada') > 20, 'okadas on Nigerian streets');
  assert.ok(count('ug', 'okada') > 20, 'boda-bodas in Uganda');
  assert.ok(count('nl', 'bike') > 20, 'bicycles in the Netherlands');
  assert.equal(count('us', 'okada') + count('us', 'bike'), 0, 'a country not in the table keeps its cars');
  assert.deepEqual(flavourFor('nigeria'), FLAVOURS.ng);
  for (const country of ['ng', 'nl', 'vn', 'gb']) {
    const painted = paintTraffic(planTraffic('mix', roads, 12), country, 'mix'), mixed = flavourTraffic(painted, country, 'mix');
    assert.deepEqual(mixed, flavourTraffic(painted, country, 'mix'), 'deterministic');
    mixed.forEach((v, i) => {
      const was = painted[i]!;
      assert.equal(v.colour, was.colour, 'the paint is kept');
      assert.ok(v.length <= was.length, 'never longer');
      if (was.kind !== 'car') assert.equal(v.kind, was.kind, 'only cars change');
      if (v.kind !== was.kind) assert.ok(v.kind === 'okada' || v.kind === 'bike');
    });
  }
});

test('the path in time: slower through each crossing\'s zone, the same lap both ways, freePlace undoes freeTime', () => {
  const [forth, back] = twoWayRoads(AXIS, 'left', 0.78, 5.5) as [Road, Road];
  const a = profileFor(forth, crossingSpans(forth, CROSSINGS)), b = profileFor(back, crossingSpans(back, CROSSINGS));
  assert.ok(Math.abs(a.lap - b.lap) < 1e-9, 'both ways take as long: one set of lights serves both');
  assert.ok(a.lap > a.length / a.speed, 'slowing costs time');
  for (const s of [0, 3.3, 40, 75.2, 90, 120, 167.9]) assert.ok(Math.abs(freePlace(a, freeTime(a, s)) - s) < 1e-9, `inverse at ${s}`);
  // Speed: cruising between crossings, SLOW_SHARE of it through a zone.
  const speedAt = (s: number): number => 0.1 / (freeTime(a, s + 0.05) - freeTime(a, s - 0.05));
  assert.ok(Math.abs(speedAt(40) - 5.5) < 1e-6);
  const zebra = crossingSpans(forth, CROSSINGS)[1]!.at;
  assert.ok(Math.abs(speedAt(zebra) - 5.5 * SLOW_SHARE) < 1e-6, 'slow over the zebra');
  assert.ok(Math.abs(speedAt(zebra - 5) - 5.5 * SLOW_SHARE) < 1e-6, 'and before it');
});

test('drivenAt: continuous and never decreasing, the walk phase lost every cycle, eased in and out, the stop at a whole green plus the roll', () => {
  const signal = { period: 41.7, walk: 9, offset: 0 }, green = signal.period - signal.walk;
  assert.equal(drivenAt(null, 3, 1234.5), 1234.5);
  for (const roll of [0, 0.4, 3, 7]) {
    let last = drivenAt(signal, roll, 0);
    for (let t = 0.01; t < signal.period * 3; t += 0.01) {
      const now = drivenAt(signal, roll, t);
      assert.ok(now >= last - 1e-9 && now - last <= 0.01 + 1e-9, `continuous, at most real time (roll ${roll}, t ${t.toFixed(2)})`);
      last = now;
    }
    for (const k of [0, 1, 5]) {
      // Standing still once it has rolled on and eased to a stop: at (k + 1) greens plus the roll plus half the ramp.
      const t = k * signal.period + green + roll + RAMP + 0.2;
      assert.ok(Math.abs(drivenAt(signal, roll, t) - ((k + 1) * green + roll + RAMP / 2)) < 1e-9);
      assert.ok(Math.abs(drivenAt(signal, roll, (k + 1) * signal.period + roll) - drivenAt(signal, roll, t)) < 1e-9, 'until its roll after the green');
      assert.ok(Math.abs(drivenAt(signal, roll, t + 0.5) - drivenAt(signal, roll, t)) < 1e-9, 'standing');
    }
    // A whole cycle later, exactly one green further on.
    assert.ok(Math.abs(drivenAt(signal, roll, 500 + signal.period) - drivenAt(signal, roll, 500) - green) < 1e-9);
  }
});

/** Every vehicle of a street at every 0.1 s over three cycles: the least room between two on one road, and anyone on a crossing in the walk phase. */
function sweep(vehicles: Vehicle[], roads: Road[], crossings: Lane[]) {
  const plan = planSchedule(vehicles, roads, crossings);
  let least = Infinity, onCrossing = 0, jump = 0;
  const signal = plan.signal, period = signal?.period ?? 40, green = signal ? signal.period - signal.walk : 0;
  const last = vehicles.map(() => NaN);
  for (let t = 10_000; t < 10_000 + period * 3; t += 0.1) {
    const poses = vehicles.map((_, i) => vehiclePose(plan, vehicles, roads, i, t));
    poses.forEach((p, i) => {
      if (Number.isFinite(last[i]!)) { const length = Math.hypot(roads[vehicles[i]!.road]!.bx - roads[vehicles[i]!.road]!.ax, 0) || 1; const d = (p.along - last[i]! + length) % length; jump = Math.max(jump, d); }
      last[i] = p.along;
    });
    for (let i = 0; i < vehicles.length; i++) for (let j = i + 1; j < vehicles.length; j++) {
      if (vehicles[i]!.road !== vehicles[j]!.road) continue;
      const room = Math.hypot(poses[i]!.x - poses[j]!.x, poses[i]!.z - poses[j]!.z) - (vehicles[i]!.length + vehicles[j]!.length) / 2;
      least = Math.min(least, room);
    }
    if (signal && ((t - signal.offset) % period + period) % period >= green) {
      poses.forEach((p, i) => { for (const c of crossings) if (Math.abs(p.x - c.ax) < vehicles[i]!.length / 2 + c.width / 2) onCrossing += 1; });
    }
  }
  return { plan, least, onCrossing, jump };
}

test('the schedule: lights for both ways, vehicles slow and queue at the stop lines, nobody on a crossing while people cross, never a touch', () => {
  let queued = 0, lit = 0;
  for (const country of ['ng', 'gb', 'fr', 'nl', 'in', 'jp']) for (let k = 0; k < 6; k++) {
    const roads = twoWayRoads(AXIS, drivingSide(country), 0.78, 5.5), seed = `${country}|${k}`;
    const vehicles = flavourTraffic(paintTraffic(planTraffic(seed, roads, 8 + (k % 5)), country, seed), country, seed);
    const { plan, least, onCrossing, jump } = sweep(vehicles, roads, CROSSINGS);
    assert.ok(least > 0.3, `${seed}: room between vehicles on a road (${least.toFixed(2)})`);
    assert.equal(onCrossing, 0, `${seed}: no vehicle on a crossing in the walk phase`);
    assert.ok(jump <= 5.5 * 0.1 + 1e-6, `${seed}: no vehicle jumps (${jump.toFixed(3)} in 0.1 s)`);
    if (plan.signal) lit += 1;
    queued += plan.roll.filter((r) => r > 0).length;
  }
  assert.ok(lit >= 30, `most streets get lights (${lit} of 36)`);
  assert.ok(queued > 20, `vehicles roll on and queue at the lights (${queued})`);
});

test('a queue: each queued vehicle rolls on to its place, stands nose to tail, and pulls away only after the green, its roll later', () => {
  const roads = twoWayRoads(AXIS, 'right', 0.78, 5.5);
  for (let k = 0; k < 30; k++) {
    const seed = `q${k}`, vehicles = flavourTraffic(paintTraffic(planTraffic(seed, roads, 12), 'ng', seed), 'ng', seed);
    const plan = planSchedule(vehicles, roads, CROSSINGS);
    if (!plan.signal) continue;
    const { period, walk } = plan.signal, red = 3 * period + (period - walk), green = red + walk;
    const queued = vehicles.map((_, i) => i).filter((i) => plan.roll[i]! > 0);
    if (queued.length < 2) continue;
    for (const i of queued) {
      const roll = plan.roll[i]!, at = (t: number) => vehiclePose(plan, vehicles, roads, i, t).along;
      assert.ok(at(red + roll * 0.5) !== at(red), 'it rolls on after the lights change');
      const stopped = at(red + roll + RAMP + 0.01);
      assert.ok(Math.abs(at(green - 0.01) - stopped) < 1e-9, 'it stands until the green');
      assert.ok(Math.abs(at(green + roll - 0.01) - stopped) < 1e-9, 'and its roll after it (the queue leaves front first)');
      assert.ok(at(green + roll + 0.5) !== stopped, 'then pulls away');
    }
    // Nose to tail: on one road the queued vehicles stand at least a car's gap apart.
    const standing = green - 0.01, poses = queued.map((i) => ({ i, p: vehiclePose(plan, vehicles, roads, i, standing) }));
    for (const a of poses) for (const b of poses) if (a.i < b.i && vehicles[a.i]!.road === vehicles[b.i]!.road) {
      assert.ok(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z) >= (vehicles[a.i]!.length + vehicles[b.i]!.length) / 2 + 0.5);
    }
    return;
  }
  assert.fail('no street with a queue of two');
});
