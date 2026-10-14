// The dive (./dive.ts): the timeline, the hold and its fallback, skip, refusal, reduced motion, and the camera path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_FOV, CAP_MS, CITY_FOV, CITY_KM_PER_UNIT, COVER_FROM_MS, DESCENT_SHARE, DIVE_MS, END_BY_MS, FALLBACK_REVEAL_MS, FLIGHT_MS, HANDOFF_KM, HAZE_MAX, HOLD_MS, LITE, MAX_LIFT, MAX_TURN, PROBE_MS, QUICK_COVER_MS, WATCH_FRAMES, REDUCED_MS, REVEAL_MS, STALL_MS, STREET_DISTANCE, STREET_PITCH, TOP_PITCH,
  approachYaw, arrivalDive, atlasKmPerUnit, cloudCover, cloudReveal, createDive, createFrameProbe, createFrameWatch, descentView, distanceForSpan, diveTier, diveTimings, handoffSpan, hazeAt, spanKm, swoopPlan, swoopView } from './dive.ts';
import type { Dive, DiveView } from './dive.ts';
import { project } from './geo/projection.ts';
import { PITCH_MAX } from './camera.ts';

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

test('device tiers: reduced motion, save-data and weak devices cut the dive; mid-range devices get the lite one; silence is the full dive', () => {
  assert.equal(diveTier(), 'full');
  assert.equal(diveTier({ reduced: true, cores: 16, memory: 8 }), 'cut');
  assert.equal(diveTier({ saveData: true, cores: 16 }), 'cut');
  assert.equal(diveTier({ cores: 2 }), 'cut');
  assert.equal(diveTier({ memory: 1 }), 'cut');
  assert.equal(diveTier({ memory: 0.5, cores: 8 }), 'cut');
  assert.equal(diveTier({ cores: 4, memory: 8 }), 'lite');
  assert.equal(diveTier({ cores: 8, memory: 2 }), 'lite');
  assert.equal(diveTier({ cores: 8, memory: 4 }), 'full');
  assert.equal(diveTier({ cores: 0, memory: Number.NaN }), 'full', 'nonsense counts as not saying');
  // The timings: lite is LITE of full; cut is the plain veil; an arrival has no flight and closes the clouds quickly.
  const full = diveTimings('full'), lite = diveTimings('lite'), cut = diveTimings('cut'), arrival = diveTimings('full', 'arrival');
  assert.deepEqual(full, { flightMs: FLIGHT_MS, coverFromMs: COVER_FROM_MS, coverMs: FLIGHT_MS, revealMs: REVEAL_MS, plain: false });
  assert.equal(lite.flightMs, Math.round(FLIGHT_MS * LITE)); assert.equal(lite.revealMs, Math.round(REVEAL_MS * LITE)); assert.ok(lite.coverFromMs < lite.coverMs);
  assert.equal(cut.plain, true); assert.equal(cut.flightMs, 0); assert.equal(cut.coverMs + cut.revealMs, 2 * REDUCED_MS);
  assert.equal(arrival.flightMs, 0); assert.equal(arrival.coverMs, QUICK_COVER_MS);
  assert.ok(diveTimings('lite', 'arrival').coverMs < QUICK_COVER_MS);
});

test('a lite dive is shorter, an arrival closes the clouds without a flight, and a cut tier is the plain veil', () => {
  const lite = createDive({ tier: 'lite' });
  lite.start(0); lite.loaded(0); lite.ready(true, 0);
  const { ended } = run(lite, 0);
  assert.equal(lite.frame.outcome, 'arrived');
  assert.ok(Math.abs(ended - (diveTimings('lite').flightMs + diveTimings('lite').revealMs)) <= 16, `lite ended at ${ended}`);
  const arrival = createDive({ kind: 'arrival' });
  arrival.start(0);
  assert.equal(arrival.flightMs, 0);
  arrival.tick(QUICK_COVER_MS / 2); assert.equal(arrival.frame.flight, 1, 'no flight to follow'); assert.ok(arrival.frame.cover > 0.2 && arrival.frame.cover < 0.8);
  arrival.tick(QUICK_COVER_MS); assert.equal(arrival.frame.phase, 'hold'); assert.equal(arrival.frame.cover, 1);
  const cut = createDive({ tier: 'cut' });
  assert.equal(cut.reduced, true); assert.equal(cut.flightMs, 0);
});

test('the reveal is planned to end by END_BY_MS, inside the hard CAP_MS, however late the hand-off was', () => {
  assert.ok(END_BY_MS < CAP_MS);
  const dive = createDive();
  dive.start(0);
  assert.equal(dive.revealMsAt(FLIGHT_MS), REVEAL_MS, 'on time: the whole reveal');
  assert.equal(dive.revealMsAt(END_BY_MS - 1000), 1000);
  assert.equal(dive.revealMsAt(END_BY_MS + 500), FALLBACK_REVEAL_MS, 'never shorter than the quick clear');
  dive.loaded(10);
  const late = FLIGHT_MS + HOLD_MS - 100;
  const { ended } = run(dive, 0, { at: new Map([[late, (now: number) => dive.ready(true, now)]]) });
  assert.equal(dive.frame.outcome, 'arrived'); assert.ok(ended <= END_BY_MS + 16, `ended at ${ended}`);
});

test('bail: slow first frames end the dive at once, like skip, and say why', () => {
  const dive = createDive();
  dive.start(0); dive.tick(200); dive.bail();
  assert.equal(dive.frame.phase, 'done'); assert.equal(dive.frame.outcome, 'slow'); assert.equal(dive.frame.cover, 0); assert.equal(dive.frame.handoff, true);
  dive.skip(); assert.equal(dive.frame.outcome, 'slow', 'a finished dive keeps how it ended');
});

test('the haze: there as the clouds part, lifted by the swoop, never on a fallback or a plain veil', () => {
  assert.equal(hazeAt(0), HAZE_MAX); assert.equal(hazeAt(0.4), HAZE_MAX); assert.equal(hazeAt(0.7), 0); assert.equal(hazeAt(1), 0);
  for (let p = 0; p < 1; p += 0.05) assert.ok(hazeAt(p + 0.05) <= hazeAt(p) + 1e-12);
  const dive = createDive();
  dive.start(0); dive.loaded(0); dive.ready(true, 0);
  dive.tick(FLIGHT_MS); assert.equal(dive.frame.phase, 'reveal'); assert.equal(dive.frame.haze, HAZE_MAX);
  dive.tick(FLIGHT_MS + REVEAL_MS * 0.55); assert.ok(dive.frame.haze > 0 && dive.frame.haze < HAZE_MAX);
  const fallback = createDive(); fallback.start(0); run(fallback, 0, { at: new Map([[FLIGHT_MS + HOLD_MS + 50, () => assert.equal(fallback.frame.haze, 0)]]) });
  const plain = createDive({ reduced: true }); plain.start(0); plain.loaded(0); plain.ready(true, 0); plain.tick(REDUCED_MS + 20); assert.equal(plain.frame.haze, 0);
});

test('the frame probe: smooth frames pass after PROBE_MS, a slow mean or one stall fails, the first gap is forgiven a stall', () => {
  const smoothProbe = createFrameProbe();
  for (let t = 0; t < PROBE_MS; t += 16) assert.equal(smoothProbe.frame(t), 'wait');
  assert.equal(smoothProbe.frame(PROBE_MS + 5), 'ok');
  assert.equal(smoothProbe.frame(PROBE_MS + 2000), 'ok', 'decided once');
  const slow = createFrameProbe();
  let verdict = 'wait';
  for (let t = 0; verdict === 'wait'; t += 60) verdict = slow.frame(t);
  assert.equal(verdict, 'slow');
  const stall = createFrameProbe();
  stall.frame(0); stall.frame(16); assert.equal(stall.frame(16 + STALL_MS + 1), 'slow');
  const firstLong = createFrameProbe();
  firstLong.frame(0); assert.equal(firstLong.frame(STALL_MS + 50), 'wait', 'the first gap is not a stall');
  let late = 'wait';
  for (let t = STALL_MS + 66; late === 'wait'; t += 16) late = firstLong.frame(t);
  assert.equal(late, 'slow', 'but it still counts towards the mean');
});

test('the frame watch: smooth frames and a few long ones pass, a sustained slow run fails, and it is decided once', () => {
  const smooth = createFrameWatch();
  for (let i = 0, t = 0; i < 300; i++, t += 16) assert.equal(smooth.frame(t), 'ok');
  // The city map mounting under the clouds: two long frames in the window are set aside.
  const mount = createFrameWatch();
  let t = 0, verdict = 'ok';
  for (let i = 0; i < 100; i++) { t += i === 40 || i === 41 ? 350 : 16; verdict = mount.frame(t); assert.equal(verdict, 'ok'); }
  // A device that drops to about 12 frames a second: judged once a full window has been seen.
  const slow = createFrameWatch();
  let frames = 0; t = 0;
  while (verdict === 'ok' && frames < 200) { t += 80; verdict = slow.frame(t); frames += 1; }
  assert.equal(verdict, 'slow'); assert.ok(frames >= WATCH_FRAMES, `${frames}`);
  assert.equal(slow.frame(t + 16), 'slow', 'decided once');
});

test('scale match: the city map starts at the ground width the atlas ended on', () => {
  // The two cameras see the same ground, km for km, at matched distances.
  const atlasDistance = 1.2, atlasKm = atlasKmPerUnit(6.5, project);
  const km = spanKm(atlasDistance, ATLAS_FOV, atlasKm), cityDistance = distanceForSpan(km, CITY_FOV, CITY_KM_PER_UNIT);
  assert.ok(Math.abs(spanKm(cityDistance, CITY_FOV, CITY_KM_PER_UNIT) - km) / km < 1e-9);
  assert.ok(Math.abs(distanceForSpan(spanKm(5, 34, 0.1), 34, 0.1) - 5) < 1e-9, 'one is the inverse of the other');
  // The atlas sheet across: one unit is 1/0.8615 degrees of longitude at the equator (about 129 km), and fewer km towards the poles.
  assert.ok(Math.abs(atlasKmPerUnit(0, project) - 111.195 / (project(1, 0)[0] - project(0, 0)[0])) < 0.01, `${atlasKmPerUnit(0, project)}`);
  assert.ok(Math.abs(atlasKmPerUnit(0, project) - 129) < 1);
  assert.ok(atlasKmPerUnit(60, project) < atlasKmPerUnit(30, project) && atlasKmPerUnit(30, project) < atlasKmPerUnit(0, project));
  assert.ok(Number.isFinite(atlasKmPerUnit(90, project)) && atlasKmPerUnit(90, project) > 0);
  // The hand-off width: the city's wide end when known, kept within the atlas's reach; HANDOFF_KM otherwise.
  const atlas = { nearKm: 20, farKm: 150 };
  assert.equal(handoffSpan(atlas, null), HANDOFF_KM);
  assert.equal(handoffSpan(atlas, { nearKm: 5, farKm: 90 }), 90);
  assert.equal(handoffSpan(atlas, { nearKm: 5, farKm: 400 }), 150, 'never farther out than the atlas ends');
  assert.equal(handoffSpan(atlas, { nearKm: 0.2, farKm: 2 }), 20, 'never closer in than the atlas can go');
  assert.equal(handoffSpan({ nearKm: 30, farKm: 30 }, null), 30);
  // Within 10% end to end, as the plan asks: from an atlas view to the city map's start and back.
  const span = handoffSpan(atlas, { nearKm: 3, farKm: 60 }), start = distanceForSpan(span, CITY_FOV, CITY_KM_PER_UNIT);
  assert.ok(Math.abs(spanKm(start, CITY_FOV, CITY_KM_PER_UNIT) - 60) / 60 < 0.1);
});

test('the swoop: straight down from the matched start, over the towers, then at the destination, never climbing', () => {
  assert.equal(TOP_PITCH, PITCH_MAX, 'both rigs meet straight down');
  const core: DiveView = { x: 10, z: -20, yaw: 0, pitch: 0.92, distance: 300 };
  const landmark = { x: 160, z: -140 };
  const plan = swoopPlan(900, core, landmark);
  assert.deepEqual(swoopView(plan, 0), plan.start); assert.equal(plan.start.pitch, TOP_PITCH); assert.equal(plan.start.distance, 900);
  assert.equal(plan.start.x, core.x); assert.equal(plan.start.z, core.z);
  const aerial = swoopView(plan, DESCENT_SHARE);
  for (const key of ['x', 'z', 'pitch', 'distance'] as const) assert.ok(Math.abs(aerial[key] - plan.aerial[key]) < 1e-9, `over the towers at the half: ${key}`);
  assert.deepEqual(swoopView(plan, 1), plan.street); assert.deepEqual(swoopView(plan, 5), plan.street);
  assert.equal(plan.street!.x, landmark.x); assert.equal(plan.street!.pitch, STREET_PITCH); assert.equal(plan.street!.distance, STREET_DISTANCE);
  let last = Infinity, ground = Infinity;
  for (let k = 0; k <= 1.0001; k += 0.01) {
    const view = swoopView(plan, k);
    assert.ok(view.distance <= last + 1e-9, `never climbs (k=${k.toFixed(2)})`); last = view.distance;
    assert.ok(view.pitch <= TOP_PITCH + 1e-9 && view.pitch >= STREET_PITCH - 1e-9);
    assert.ok(Math.abs(view.yaw) <= MAX_TURN + 1e-9);
    if (k >= DESCENT_SHARE) { const left = Math.hypot(view.x - landmark.x, view.z - landmark.z); assert.ok(left <= ground + 1e-9, 'flies at the destination'); ground = left; }
  }
  // Without a destination (the player's own city) it comes down to the opening view of the city.
  const own = swoopPlan(900, core, null);
  assert.equal(own.street, null); assert.deepEqual(swoopView(own, 1), core);
  // A start closer in than the core view never makes it climb: it starts at the core distance.
  const close = swoopPlan(50, core, null);
  assert.equal(close.start.distance, core.distance);
  // The turn: flying north (towards -z) needs no turn; east turns the camera; it is capped.
  assert.equal(approachYaw({ x: 0, z: 0 }, { x: 0, z: -10 }), 0);
  assert.ok(Math.abs(approachYaw({ x: 0, z: 0 }, { x: 10, z: 0 })) === MAX_TURN);
  assert.equal(approachYaw({ x: 1, z: 1 }, { x: 1, z: 1 }), 0);
});

test('a trip that ends in a new city dives only when someone is watching and free: not on a first load, a weak device, a hidden page or mid-action', () => {
  const ok = { fromTrip: true, tier: 'full' as const, hidden: false, busy: false, mode: 'map' };
  assert.equal(arrivalDive(ok), true);
  assert.equal(arrivalDive({ ...ok, mode: 'venue' }), true);
  assert.equal(arrivalDive({ ...ok, tier: 'lite' }), true, 'the lite dive is still a dive');
  assert.equal(arrivalDive({ ...ok, fromTrip: false }), false, 'a first load or a sign-in in another city is not an arrival');
  assert.equal(arrivalDive({ ...ok, tier: 'cut' }), false, 'reduced motion and weak devices keep today\'s arrival');
  assert.equal(arrivalDive({ ...ok, hidden: true }), false);
  assert.equal(arrivalDive({ ...ok, busy: true }), false);
  assert.equal(arrivalDive({ ...ok, mode: 'phone' }), false);
});
