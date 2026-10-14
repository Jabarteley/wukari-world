// Street life's rules (./plan.ts): who gets it, how much, the frame guard, and where every person and vehicle is at any instant.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARD_CAP, TIER_CAPS, PERSON_TRIANGLES, ROOM_SHARE, CAR_LENGTH, GUARD_FRAMES, GUARD_SKIP, HEIGHT, PACE,
  forcedFrom, deviceHints, streetLifeFor, crowdFits, createFrameGuard, venueLanes, planCrowd, walkerAt, planTraffic, vehicleAt,
} from './plan.ts';
import type { Lane, Road } from './plan.ts';
import { SLOW_FRAME_MS, STALL_MS, deviceTier } from './plan.ts';
import * as dive from '../../map3d/dive.ts';

test('the device tier and frame thresholds are the dive\'s own (repeated so the scene chunks never import the maps\' file)', () => {
  assert.equal(SLOW_FRAME_MS, dive.SLOW_FRAME_MS);
  assert.equal(STALL_MS, dive.STALL_MS);
  for (const cores of [undefined, 0, 1, 2, 3, 4, 6, 8, 16]) for (const memory of [undefined, 0.5, 1, 2, 4, 8]) for (const saveData of [false, true]) for (const reduced of [false, true]) {
    const hints = { ...(cores === undefined ? {} : { cores }), ...(memory === undefined ? {} : { memory }), saveData, reduced };
    assert.equal(deviceTier(hints), dive.diveTier(hints), JSON.stringify(hints));
  }
});

const strong = { cores: 8, memory: 8 };

test('the hand-testing switch: ?streetlife=on|off, else the stored value; anything else is no switch', () => {
  assert.equal(forcedFrom('?streetlife=on'), 'on');
  assert.equal(forcedFrom('?a=1&streetlife=1'), 'on');
  assert.equal(forcedFrom('?streetlife=off', 'on'), 'off');
  assert.equal(forcedFrom('', 'on'), 'on');
  assert.equal(forcedFrom('?streetlife=maybe', null), null);
  assert.equal(forcedFrom(''), null);
});

test('device hints read cores, memory and save-data (and 2G as save-data)', () => {
  assert.deepEqual(deviceHints({ hardwareConcurrency: 4, deviceMemory: 2, connection: { saveData: false, effectiveType: '4g' } }), { cores: 4, memory: 2, saveData: false });
  assert.equal(deviceHints({ connection: { effectiveType: '2g' } }).saveData, true);
  assert.deepEqual(deviceHints({}), { saveData: false });
});

test('the gate: only a full-tier device that draws WebGL2 and passes the dive tier; lite gets half; the switch overrides', () => {
  const ask = { ambientTier: 'full', kind: 'market', webgl: true, hints: strong };
  assert.deepEqual(streetLifeFor(ask), { tier: 'full', ...TIER_CAPS.full, forced: false });
  assert.equal(streetLifeFor({ ...ask, ambientTier: 'light' }), null, 'a light-tier device keeps today\'s crowd');
  assert.equal(streetLifeFor({ ...ask, ambientTier: 'off' }), null);
  assert.equal(streetLifeFor({ ...ask, webgl: false }), null, 'no WebGL2, no street life');
  assert.equal(streetLifeFor({ ...ask, hints: { cores: 2, memory: 8 } }), null, 'two cores');
  assert.equal(streetLifeFor({ ...ask, hints: { cores: 8, memory: 1 } }), null, 'under 2 GB');
  assert.equal(streetLifeFor({ ...ask, hints: { ...strong, saveData: true } }), null, 'save-data');
  assert.deepEqual(streetLifeFor({ ...ask, hints: { cores: 4, memory: 8 } }), { tier: 'lite', ...TIER_CAPS.lite, forced: false });
  assert.equal(streetLifeFor({ ...ask, hints: {} })?.tier, 'full', 'a browser that says nothing is left to the frame guard');
  assert.equal(streetLifeFor({ ...ask, kind: 'club' }), null, 'a room has no street behind it');
  assert.equal(streetLifeFor({ ...ask, kind: 'club', forced: 'on' }), null, 'not even when forced');
  assert.ok(streetLifeFor({ ambientTier: 'light', webgl: true, hints: strong }) === null && streetLifeFor({ ambientTier: 'full', webgl: true, hints: strong })?.tier === 'full', 'a street scene (no kind) is asked the same way');
  assert.deepEqual(streetLifeFor({ ...ask, ambientTier: 'light', webgl: false, hints: { cores: 1 }, forced: 'on' }), { tier: 'full', ...TIER_CAPS.full, forced: true });
  assert.equal(streetLifeFor({ ...ask, forced: 'off' }), null);
  assert.ok(TIER_CAPS.full.crowd <= HARD_CAP.crowd && TIER_CAPS.full.vehicles <= HARD_CAP.vehicles && TIER_CAPS.lite.crowd < TIER_CAPS.full.crowd);
});

test('the crowd fits what the scene has left: a share of the spare triangles, the tier, the hard cap, and two spare draw calls', () => {
  const full = streetLifeFor({ ambientTier: 'full', kind: 'market', webgl: true, hints: strong })!;
  assert.equal(crowdFits(full, { triangles: 100_000, meshes: 40 }), TIER_CAPS.full.crowd);
  assert.equal(crowdFits({ ...full, crowd: 10_000 }, { triangles: 10_000_000, meshes: 40 }), HARD_CAP.crowd);
  assert.equal(crowdFits(full, { triangles: 800, meshes: 40 }), Math.floor((800 * ROOM_SHARE) / PERSON_TRIANGLES));
  assert.equal(crowdFits(full, { triangles: 100_000, meshes: 1 }), 0);
  assert.equal(crowdFits(full, { triangles: -50, meshes: 40 }), 0);
  for (const triangles of [0, 300, 2_000, 9_000, 17_000]) assert.ok(crowdFits(full, { triangles, meshes: 40 }) * PERSON_TRIANGLES <= Math.max(0, triangles) * ROOM_SHARE);
});

test('the frame guard: steady 60 fps is ok; a slow mean or one stall drops it for good; the first frames after a wake are not held against it', () => {
  const fast = createFrameGuard();
  for (let i = 0; i < GUARD_SKIP + GUARD_FRAMES; i++) fast.frame(1 / 60);
  assert.equal(fast.verdict, 'ok');
  const slow = createFrameGuard();
  for (let i = 0; i < GUARD_SKIP + GUARD_FRAMES; i++) slow.frame((SLOW_FRAME_MS + 8) / 1000);
  assert.equal(slow.verdict, 'slow');
  slow.reset();
  for (let i = 0; i < 30; i++) slow.frame(1 / 60);
  assert.equal(slow.verdict, 'slow', 'once slow, it stays off in this scene');
  const stall = createFrameGuard();
  stall.frame(5); stall.frame(5);
  assert.equal(stall.verdict, 'wait', 'the skipped frames carry the work of starting');
  stall.frame((STALL_MS + 1) / 1000);
  assert.equal(stall.verdict, 'slow');
  const woken = createFrameGuard();
  for (let i = 0; i < GUARD_SKIP + GUARD_FRAMES; i++) woken.frame(1 / 60);
  woken.reset();
  assert.equal(woken.verdict, 'wait');
  woken.frame(2); woken.frame(2);
  assert.equal(woken.verdict, 'wait', 'the long gap of an idle loop at a wake is skipped');
});

const bounds = [-14.2, -12.2, 14.2, 12.2] as const;

test('the lanes behind an open venue lie wholly outside where the player walks, and reach past both sides', () => {
  const lanes = venueLanes(bounds, true);
  assert.equal(lanes.length, 4);
  assert.equal(venueLanes(bounds, false).length, 3);
  for (const lane of lanes) {
    const half = lane.width / 2;
    const outside = Math.max(lane.az, lane.bz) + half < bounds[1] || Math.max(lane.ax, lane.bx) + half < bounds[0];
    assert.ok(outside, `lane ${JSON.stringify(lane)} is outside the walk bounds`);
  }
  assert.ok(lanes.slice(0, 3).every((lane) => lane.ax <= bounds[0] - 16 && lane.bx >= bounds[2] + 16), "past both sides, to where the ground disc fades");
});

test('the crowd: exactly the count asked for (never past the hard cap), spread by lane length, varied, and the same every time', () => {
  const lanes = venueLanes(bounds, true);
  const crowd = planCrowd('lagos|market', lanes, 240);
  assert.equal(crowd.length, 240);
  assert.deepEqual(planCrowd('lagos|market', lanes, 240), crowd, 'deterministic');
  assert.notDeepEqual(planCrowd('lagos|park', lanes, 240), crowd, 'another place, other people');
  assert.equal(planCrowd('x', lanes, 5_000).length, HARD_CAP.crowd);
  assert.equal(planCrowd('x', [], 100).length, 0);
  assert.equal(planCrowd('x', lanes, 0).length, 0);
  const per = lanes.map((_, i) => crowd.filter((w) => w.lane === i).length);
  const length = (l: Lane) => Math.hypot(l.bx - l.ax, l.bz - l.az), total = lanes.reduce((a, l) => a + length(l), 0);
  per.forEach((n, i) => assert.ok(Math.abs(n - (length(lanes[i]!) / total) * 240) <= 1, `lane ${i} has its share: ${n}`));
  assert.ok(new Set(crowd.map((w) => w.shirt)).size >= 8, 'many shirts');
  assert.ok(new Set(crowd.map((w) => w.skin)).size >= 6, 'many skins');
  assert.ok(crowd.some((w) => w.skirt) && crowd.some((w) => !w.skirt) && crowd.some((w) => w.style === 1));
  assert.ok(crowd.some((w) => w.dir === 1) && crowd.some((w) => w.dir === -1));
  for (const w of crowd) {
    assert.ok(w.height >= HEIGHT[0] && w.height <= HEIGHT[1] && w.speed >= PACE[0] && w.speed <= PACE[1]);
    assert.ok(Math.abs(w.across) <= lanes[w.lane]!.width / 2, 'inside the band');
    assert.ok(Math.sign(w.across) === w.dir, 'each way keeps to its own half');
  }
});

test('a walker: on the band at every instant, at their own pace, facing the way they go, the stride cycling; a pure function of time', () => {
  const lane: Lane = { ax: -40, az: -14, bx: 40, bz: -14, width: 2 };
  const [walker] = planCrowd('one', [lane], 1);
  const t0 = Date.UTC(2026, 9, 14, 9) / 1000;
  const a = walkerAt(walker!, lane, t0), b = walkerAt(walker!, lane, t0 + 0.5);
  assert.deepEqual(walkerAt(walker!, lane, t0), a, 'the same instant, the same place');
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - walker!.speed * 0.5) < 1e-6, 'moves at its pace');
  assert.ok(Math.sign(b.x - a.x) === walker!.dir, 'the way it faces');
  assert.ok(Math.abs(a.ry - (walker!.dir === 1 ? Math.PI / 2 : -Math.PI / 2)) < 1e-9);
  for (let s = 0; s < 200; s += 0.37) {
    const p = walkerAt(walker!, lane, t0 + s);
    assert.ok(p.x >= -40 - 1e-9 && p.x <= 40 + 1e-9 && Math.abs(p.z - lane.az) <= 1 + 1e-9, 'on the band');
    assert.ok(p.phase >= 0 && p.phase < 1);
  }
  const slanted: Lane = { ax: 0, az: 0, bx: 30, bz: 40, width: 2 };
  for (const w of planCrowd('slant', [slanted], 20)) {
    const p = walkerAt(w, slanted, t0), along = (p.x * 30 + p.z * 40) / 50, off = (p.x * 40 - p.z * 30) / 50;
    assert.ok(along >= -1e-9 && along <= 50 + 1e-9 && Math.abs(off - w.across) < 1e-9, 'across is measured at right angles to the lane');
  }
});

test('traffic: never more than asked or the hard cap, one way at one speed per road, and no two vehicles ever touch', () => {
  const road: Road = { ax: -84, az: 6.875, bx: 84, bz: 6.875, speed: 5.5 };
  const cars = planTraffic('ikeja/0/1', [road], 8);
  assert.equal(cars.length, 8);
  assert.deepEqual(planTraffic('ikeja/0/1', [road], 8), cars);
  assert.equal(planTraffic('x', [road], 100).length, HARD_CAP.vehicles);
  assert.equal(planTraffic('x', [{ ...road, bx: -60 }], 12).length, Math.floor(24 / (CAR_LENGTH * 2.55)), 'a short road takes only what fits');
  assert.equal(planTraffic('x', [], 5).length, 0);
  assert.ok(new Set(cars.map((c) => c.kind)).size >= 2, 'a mix of taxis, cars, buses and trucks');
  const t0 = Date.UTC(2026, 9, 14, 9) / 1000;
  for (const s of [0, 1.3, 77, 3600]) {
    const xs = cars.map((c) => ({ x: vehicleAt(c, road, t0 + s).x, half: c.length / 2 })).sort((a, b) => a.x - b.x);
    for (let i = 0; i < xs.length; i++) {
      const here = xs[i]!, ahead = xs[(i + 1) % xs.length]!;
      const gap = i + 1 < xs.length ? ahead.x - here.x : ahead.x + 168 - here.x;
      assert.ok(gap >= here.half + ahead.half, `room between vehicles at +${s}s: ${gap.toFixed(2)}`);
    }
  }
  const p = vehicleAt(cars[0]!, road, t0), q = vehicleAt(cars[0]!, road, t0 + 1);
  assert.ok(Math.abs(Math.abs(q.x - p.x) - 5.5) < 1e-6 || Math.abs(q.x - p.x) > 100, 'at the road\'s speed (or wrapping round)');
  assert.ok(Math.abs(p.ry - Math.PI / 2) < 1e-9 && p.z === 6.875, 'along the road, facing a→b');
});

test('people dissolve in and out at a lane\'s ends, and step aside round the player', async () => {
  const { FADE_UNITS, KEEP_CLEAR, stepAside } = await import('./plan.ts');
  const lane: Lane = { ax: 0, az: 0, bx: 40, bz: 0, width: 1 };
  const [walker] = planCrowd('fade', [lane], 1);
  const w = { ...walker!, dir: 1 as const, across: 0, offset: 0, speed: 1 };
  assert.equal(walkerAt(w, lane, 0).fade, 0, 'at the start: not yet there');
  assert.equal(walkerAt(w, lane, FADE_UNITS / 2).fade, 0.5);
  assert.equal(walkerAt(w, lane, 20).fade, 1, 'in the middle: whole');
  assert.ok(walkerAt(w, lane, 40 - FADE_UNITS / 4).fade < 0.3, 'near the end: going');
  assert.deepEqual(stepAside({ x: 5, z: 5 }, { x: 0, z: 0 }), { x: 5, z: 5 }, 'clear: left alone');
  assert.deepEqual(stepAside({ x: 5, z: 5 }, null), { x: 5, z: 5 });
  const pushed = stepAside({ x: 0.5, z: 0 }, { x: 0, z: 0 });
  assert.ok(Math.abs(Math.hypot(pushed.x, pushed.z) - KEEP_CLEAR) < 1e-9 && pushed.x > 0, 'pushed straight out');
  const on = stepAside({ x: 2, z: 3 }, { x: 2, z: 3 });
  assert.ok(Math.abs(Math.hypot(on.x - 2, on.z - 3) - KEEP_CLEAR) < 1e-9, 'even when standing exactly on the player');
});
