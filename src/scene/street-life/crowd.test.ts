// Street life's richer crowd (./crowd.ts): bodies, outfits and bags from the seed, a schedule of walking, stopping, standing in groups
// and crossing on the lights, all pure functions of time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOB, OUTFITS, WIDTH, clearShift, crossingSpans, driveSeconds, personAt, planPeople, signalFor, spread, stoppedAt, walkNow, walkedSeconds } from './crowd.ts';
import type { Lane, Road } from './plan.ts';
import { HARD_CAP, planTraffic } from './plan.ts';

const lanes: Lane[] = [
  { ax: -84, az: 2.3, bx: 84, bz: 2.3, width: 0.9 },
  { ax: -84, az: 12.3, bx: 84, bz: 12.3, width: 1.1 },
  { ax: -84, az: 13.65, bx: 84, bz: 13.65, width: 0.9, browse: 0 },
];
const road: Road = { ax: -84, az: 6.875, bx: 84, bz: 6.875, speed: 5.5 };
const crossings: Lane[] = [{ ax: 10, az: 2.65, bx: 10, bz: 11.1, width: 2.4 }, { ax: 78, az: 2.65, bx: 78, bz: 11.1, width: 2.4 }];
const signal = signalFor(road)!;
const world = { lanes, crossings, signal };

test('at least six outfits, each with its colours and bags', () => {
  assert.ok(OUTFITS.length >= 6);
  for (const outfit of OUTFITS) assert.ok(outfit.shirts.length && outfit.legs.length && outfit.bags.length && (outfit.jacket === 0 || outfit.jackets.length), outfit.name);
});

test('the crowd: exactly the count (never past the hard cap), the same every time, and varied in body, outfit, jacket and bag', () => {
  const people = planPeople('lagos/ikeja/0/3', world, 240);
  assert.equal(people.length, 240);
  assert.equal(planPeople('x', world, 100_000).length, HARD_CAP.crowd);
  assert.deepEqual(planPeople('lagos/ikeja/0/3', world, 240), people, 'deterministic');
  assert.notDeepEqual(planPeople('another street', world, 240), people);
  assert.ok(people.every((p) => p.width >= WIDTH[0] && p.width <= WIDTH[1] && p.bob >= BOB[0] && p.bob <= BOB[1]));
  assert.equal(new Set(people.map((p) => p.outfit)).size, OUTFITS.length, 'every outfit worn');
  assert.ok(new Set(people.map((p) => p.bag)).size === 4, 'no bag, shoulder bags, backpacks and totes');
  assert.ok(people.some((p) => p.jacket) && people.some((p) => !p.jacket));
  const habits = new Set(people.map((p) => p.habit));
  for (const habit of ['walk', 'browse', 'group', 'cross']) assert.ok(habits.has(habit as never), habit);
  assert.ok(people.filter((p) => p.habit === 'browse').every((p) => p.lane === 2), 'only the lane by the shops browses');
  assert.equal(planPeople('x', { lanes, crossings }, 120).filter((p) => p.habit === 'cross').length, 0, 'no lights: nobody crosses');
});

test('spread(): any prefix of the crowd thins every lane alike (the adaptive caps draw a prefix)', () => {
  assert.deepEqual(spread([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
  const people = planPeople('s', { lanes }, 240), quarter = people.slice(0, 60);
  for (const lane of [0, 1, 2]) {
    const all = people.filter((p) => p.lane === lane).length, few = quarter.filter((p) => p.lane === lane).length;
    assert.ok(Math.abs(few / 60 - all / 240) < 0.12, `lane ${lane}: ${few}/60 against ${all}/240`);
  }
});

test('walking with stops: walked time never jumps and stands still while stopped; a browser turns to the windows', () => {
  const person = { cycle: 30, pause: 6, shift: 7 };
  let last = walkedSeconds(person, 1000);
  for (let t = 1000.25; t < 1100; t += 0.25) {
    const now = walkedSeconds(person, t);
    assert.ok(now - last >= -1e-9 && now - last <= 0.25 + 1e-9, 'continuous and never backward');
    if (stoppedAt(person, t) && stoppedAt(person, t - 0.25)) assert.ok(Math.abs(now - last) < 1e-9, 'still while stopped');
    last = now;
  }
  const stopped = (t: number) => stoppedAt(person, t);
  const share = Array.from({ length: 3000 }, (_, i) => stopped(1000 + i * 0.1)).filter(Boolean).length / 3000;
  assert.ok(Math.abs(share - 6 / 30) < 0.02, `stopped a fifth of the time: ${share}`);
  const browser = planPeople('b', world, 240).find((p) => p.habit === 'browse')!;
  const t = Array.from({ length: 2000 }, (_, i) => 1000 + i * 0.25).find((s) => stoppedAt(browser, s))!;
  const pose = personAt(browser, world, t);
  assert.equal(pose.ry, 0); assert.ok(pose.mode === 1 || pose.mode === 2); assert.equal(pose.phase, 0); assert.equal(pose.lift, 0);
});

test('walkers bob as they step and stay on their band; groups stand turned to each other, some on phones', () => {
  const people = planPeople('g', world, 240);
  for (const person of people.filter((p) => p.habit === 'walk').slice(0, 30)) for (const t of [10, 500.5, 9e5]) {
    const pose = personAt(person, world, t), lane = lanes[person.lane]!;
    assert.ok(Math.abs(pose.z - lane.az) <= lane.width / 2 + 1e-6);
    assert.ok(pose.lift >= 0 && pose.lift <= person.bob * person.height + 1e-9);
    if (!stoppedAt(person, t)) assert.equal(pose.mode, 0);
  }
  const groups = people.filter((p) => p.habit === 'group');
  assert.ok(groups.length >= Math.floor(240 * 0.1) - 1);
  for (const person of groups) {
    const a = personAt(person, world, 100), b = personAt(person, world, 160);
    assert.equal(a.x, b.x); assert.equal(a.z, b.z); assert.ok(a.mode >= 1);
  }
  assert.ok(groups.some((p) => p.phone) && Array.from({ length: 60 }, (_, i) => groups.map((p) => personAt(p, world, i).mode)).flat().includes(2), 'phones out');
});

test('the lights: the green lasts whole laps of the road, the traffic stops (continuously) for the walk phase', () => {
  const lap = 168 / 5.5, green = signal.period - signal.walk;
  assert.ok(Math.abs(green / lap - Math.round(green / lap)) < 1e-9 && green >= 20);
  for (let t = 0; t < signal.period * 3; t += 0.5) {
    const d = driveSeconds(signal, t + 0.5) - driveSeconds(signal, t);
    assert.ok(Math.abs(d - (walkNow(signal, t) && walkNow(signal, t + 0.5) ? 0 : 0.5)) < 1e-9 || (d >= 0 && d <= 0.5));
    if (walkNow(signal, t) && walkNow(signal, t + 0.5)) assert.ok(Math.abs(d) < 1e-9, 'stopped while people walk');
  }
  assert.equal(driveSeconds(null, 123), 123, 'no lights: never stops');
});

test('clearShift: the stopped traffic is off every crossing; with no room it says so', () => {
  const vehicles = planTraffic('c', [road], 8), spans = crossingSpans(road, crossings);
  assert.deepEqual(spans.map((s) => s.at), [94, 162]);
  const shift = clearShift(vehicles, road, spans);
  assert.ok(shift !== null);
  for (const v of vehicles) for (const s of spans) {
    const at = (((v.offset + shift - s.at) % 168) + 168 + 84) % 168 - 84;
    assert.ok(Math.abs(at) >= v.length / 2 + s.half);
  }
  const wall = Array.from({ length: 40 }, (_, i) => ({ at: i * 4.2, half: 2 }));
  assert.equal(clearShift(vehicles, road, wall), null);
});

test('crossers: wait on the pavement, cross only on the walk phase and finish inside it, back the other way next time', () => {
  const crossers = planPeople('k', world, 240).filter((p) => p.habit === 'cross');
  assert.ok(crossers.length > 0 && crossers.length <= 10);
  const green = signal.period - signal.walk;
  for (const person of crossers) {
    const start = personAt(person, world, green - 1), end = personAt(person, world, signal.period - 0.01), next = personAt(person, world, 2 * signal.period - 0.01);
    const c = crossings[person.lane]!;
    assert.ok(Math.abs(start.z - c.az) < 1e-6 && Math.abs(end.z - c.bz) < 1e-6 && Math.abs(next.z - c.az) < 1e-6, 'a → b, then b → a');
    assert.ok(start.mode >= 1 && end.mode >= 1);
  }
});
