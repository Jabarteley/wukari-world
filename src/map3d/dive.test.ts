// The dive (./dive.ts): the timeline, the hold and its fallback, skip, refusal, reduced motion, and the camera path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP_MS, COVER_FROM_MS, DIVE_MS, FALLBACK_REVEAL_MS, FLIGHT_MS, HOLD_MS, MAX_LIFT, REDUCED_MS, REVEAL_MS, cloudCover, cloudReveal, createDive, descentView } from './dive.ts';
import type { Dive, DiveView } from './dive.ts';

/** Tick a dive every `step` ms from `from` until it ends or `limit`; returns the time it ended at and every frame's cover. */
function run(dive: Dive, from: number, { step = 16, limit = 20000, at = new Map<number, (now: number) => void>() } = {}) {
  const covers: number[] = [];
  let now = from;
  for (; now - from <= limit; now += step) {
    for (const [time, act] of at) if (now - from >= time) { at.delete(time); act(now); }
    const going = dive.tick(now);
    covers.push(dive.frame.cover);
    if (!going) break;
  }
  return { ended: now - from, covers };
}

test('an unhindered dive: flight, opaque clouds at the hand-off, a reveal, about 4.6 s in all', () => {
  assert.equal(DIVE_MS, 4600);
  const dive = createDive();
  dive.start(0);
  assert.equal(dive.flightMs, FLIGHT_MS);
  dive.tick(COVER_FROM_MS - 1); assert.equal(dive.frame.cover, 0, 'clear sky for most of the flight');
  assert.equal(dive.frame.phase, 'flight'); assert.equal(dive.frame.handoff, false);
  // Everything arrives during the flight: the hand-off waits for the clouds, then the reveal starts at once.
  dive.loaded(400); dive.ready(true, 500);
  assert.equal(dive.frame.handoff, false, 'never swapped under clear sky');
  dive.tick(FLIGHT_MS);
  assert.equal(dive.frame.cover, 1); assert.equal(dive.frame.handoff, true); assert.equal(dive.frame.phase, 'reveal');
  const { ended, covers } = run(dive, FLIGHT_MS);
  assert.ok(Math.abs(FLIGHT_MS + ended - DIVE_MS) <= 16, `ends at ${FLIGHT_MS + ended}`);
  assert.equal(dive.frame.phase, 'done'); assert.equal(dive.frame.outcome, 'arrived'); assert.equal(dive.frame.cover, 0);
  for (let i = 1; i < covers.length; i++) assert.ok(covers[i]! <= covers[i - 1]! + 1e-9, 'the clouds only thin during the reveal');
});

test('the clouds are opaque across the whole hand-off, and the hand-off waits for the chunks', () => {
  const dive = createDive();
  dive.start(1000);
  dive.ready(true, 1100);                   // the move was accepted early, the chunks are still coming
  dive.tick(1000 + FLIGHT_MS + 500);
  assert.equal(dive.frame.phase, 'hold'); assert.equal(dive.frame.handoff, false); assert.equal(dive.frame.cover, 1);
  dive.loaded(1000 + FLIGHT_MS + 900);
  assert.equal(dive.frame.handoff, true); assert.equal(dive.frame.phase, 'reveal'); assert.equal(dive.frame.outcome, 'arrived');
  dive.tick(1000 + FLIGHT_MS + 901); assert.ok(dive.frame.cover > 0.99, 'the reveal starts from opaque');
  // The cover curve itself: monotonic in, monotonic out.
  for (let t = 0; t < FLIGHT_MS; t += 50) assert.ok(cloudCover(t + 50) >= cloudCover(t));
  assert.equal(cloudCover(FLIGHT_MS), 1); assert.equal(cloudReveal(0), 1); assert.equal(cloudReveal(1), 0);
});

test('hold then fall back: a destination that does not come within HOLD_MS gets a quick clear, and the whole dive stays within CAP_MS', () => {
  const dive = createDive();
  dive.start(0);
  const { ended } = run(dive, 0);
  assert.equal(dive.frame.outcome, 'timeout'); assert.equal(dive.frame.handoff, true);
  assert.ok(ended <= FLIGHT_MS + HOLD_MS + FALLBACK_REVEAL_MS + 32, `ended at ${ended}`);
  assert.ok(ended <= CAP_MS);
  // Arriving just before the hold runs out: the reveal is shortened so the dive still ends by CAP_MS.
  const late = createDive();
  late.start(0); late.loaded(10);
  const { ended: lateEnd } = run(late, 0, { at: new Map([[FLIGHT_MS + HOLD_MS - 20, (now: number) => late.ready(true, now)]]) });
  assert.equal(late.frame.outcome, 'arrived');
  assert.ok(lateEnd <= CAP_MS + 16, `late arrival ended at ${lateEnd}`);
  assert.ok(lateEnd < FLIGHT_MS + HOLD_MS + REVEAL_MS);
});

test('skip ends at once on the final views, from any phase', () => {
  for (const at of [0, 800, FLIGHT_MS + 100, FLIGHT_MS + 1500]) {
    const dive = createDive();
    dive.start(0); dive.loaded(0); dive.ready(true, 0);
    dive.tick(at); dive.skip();
    assert.equal(dive.frame.phase, 'done', `skip at ${at}`);
    assert.equal(dive.frame.outcome, 'skipped'); assert.equal(dive.frame.cover, 0); assert.equal(dive.frame.handoff, true); assert.equal(dive.frame.flight, 1);
    assert.equal(dive.tick(at + 16), false, 'nothing more to draw');
  }
  // A skipped or finished dive ignores late news.
  const dive = createDive(); dive.start(0); dive.skip(); dive.ready(false, 10); assert.equal(dive.frame.outcome, 'skipped');
});

test('a refusal clears the clouds quickly wherever the dive is', () => {
  const early = createDive();
  early.start(0); early.tick(1300);
  const cover = early.frame.cover;
  assert.ok(cover > 0 && cover < 1);
  early.ready(false, 1300);
  assert.equal(early.frame.outcome, 'refused'); assert.equal(early.frame.phase, 'reveal');
  const { ended, covers } = run(early, 1300);
  assert.ok(ended <= FALLBACK_REVEAL_MS + 16); assert.ok(covers[0]! <= cover + 1e-9, 'never thicker than it was');
  const late = createDive();
  late.start(0); late.tick(FLIGHT_MS + 200); late.ready(false, FLIGHT_MS + 200);
  assert.equal(late.frame.outcome, 'refused');
  assert.ok(run(late, FLIGHT_MS + 200).ended <= FALLBACK_REVEAL_MS + 16);
});

test('reduced motion: no flight, a plain veil, the whole thing within 200 ms when nothing waits', () => {
  const dive = createDive({ reduced: true });
  assert.equal(dive.flightMs, 0);
  dive.start(0); dive.loaded(0); dive.ready(true, 0);
  dive.tick(0); assert.equal(dive.frame.flight, 1, 'the camera cuts');
  const { ended } = run(dive, 0, { step: 10 });
  assert.ok(ended <= 2 * REDUCED_MS, `ended at ${ended}`);
  assert.equal(dive.frame.outcome, 'arrived');
  // No cloud growth: the veil only fades.
  const again = createDive({ reduced: true }); again.start(0); again.loaded(0); again.ready(true, 0);
  for (let t = 0; t <= 2 * REDUCED_MS; t += 10) { again.tick(t); assert.equal(again.frame.scale, 1); }
});

test('the descent path: starts at the atlas view, ends exactly over the city, never backs away, never dives below the target', () => {
  const from: DiveView = { x: -300, z: 120, yaw: 0.3, pitch: 1.1, distance: 900 };
  const to: DiveView = { x: 40, z: -60, yaw: 0, pitch: 0.95, distance: 30 };
  const start = descentView(from, to, 0);
  for (const key of ['x', 'z', 'yaw', 'pitch', 'distance'] as const) assert.ok(Math.abs(start[key] - from[key]) < 1e-9, `starts at from.${key}`);
  assert.deepEqual(descentView(from, to, 1), to);
  assert.deepEqual(descentView(from, to, 3), to, 'clamped past the end');
  let away = Infinity, last = from.distance;
  for (let k = 0; k <= 1.0001; k += 0.01) {
    const view = descentView(from, to, k), ground = Math.hypot(view.x - to.x, view.z - to.z);
    assert.ok(ground <= away + 1e-9, `the ground still to cover never grows (k=${k.toFixed(2)})`); away = ground;
    assert.ok(view.distance >= to.distance - 1e-9);
    assert.ok(view.distance <= Math.max(from.distance, to.distance) * MAX_LIFT + 1e-9);
    assert.ok(view.pitch <= Math.max(from.pitch, to.pitch) + 1e-9 && view.pitch >= Math.min(from.pitch, to.pitch) - 1e-9);
    if (k > 0.75) { assert.ok(view.distance <= last + 1e-9, 'the last part is all drop'); }
    last = view.distance;
  }
  // The city comes to the middle before it grows: at 70% the camera is over it, still well above.
  const mid = descentView(from, to, 0.7);
  assert.ok(Math.hypot(mid.x - to.x, mid.z - to.z) < 1e-6); assert.ok(mid.distance > to.distance * 2);
  // Straight down (nothing to cross): the height only falls.
  let height = Infinity;
  for (let k = 0; k <= 1.0001; k += 0.02) { const view = descentView({ ...to, distance: 600 }, to, k); assert.ok(view.distance <= height + 1e-9); height = view.distance; }
  // Far across for the height: it pulls up, but not past MAX_LIFT.
  const wide = { ...from, x: -20000 };
  const peak = Math.max(...Array.from({ length: 101 }, (_, i) => descentView(wide, to, i / 100).distance));
  assert.ok(peak > wide.distance && peak <= wide.distance * MAX_LIFT + 1e-6);
  // The turn takes the short way round.
  const turned = descentView({ ...from, yaw: 3.0 }, { ...to, yaw: -3.0 }, 0.99);
  assert.ok(Math.abs(turned.yaw) > 3.0, 'turns through pi, not back through zero');
});
