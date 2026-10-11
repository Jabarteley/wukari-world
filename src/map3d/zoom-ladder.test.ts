import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COOLDOWN_MS, HANDOFF_MS, PRESSURE_STEP, REDUCED_MS, cityBand, createHandoff, createPressure, crossfade, entryDistance, limitHint, rungsFor, stepOf } from './zoom-ladder.ts';
import type { Rung } from './zoom-ladder.ts';

const full = rungsFor({ districts: true, neighbourhood: true });
const rung = (id: string): Rung => full.find((entry) => entry.id === id)!;
/** One wheel notch (deltaY 100) is exp(0.16) of zoom in the map's own wheel handling. */
const NOTCH = 100 * 0.0016;

test('a city with districts and houses has the whole ladder, one without stops at the city', () => {
  assert.deepEqual(full.map((entry) => entry.id), ['world', 'continent', 'country', 'city', 'district', 'neighbourhood']);
  assert.deepEqual(rungsFor({ districts: false, neighbourhood: true }).map((entry) => entry.id), ['world', 'continent', 'country', 'city']);
  assert.deepEqual(rungsFor({ districts: true, neighbourhood: false }).map((entry) => entry.id), ['world', 'continent', 'country', 'city', 'district']);
});

test('stepOf walks out and in, and ends at both ends of the ladder', () => {
  assert.equal(stepOf(full, 'city', 'out')?.id, 'country');
  assert.equal(stepOf(full, 'country', 'in')?.id, 'city');
  assert.equal(stepOf(full, 'world', 'out'), null);
  assert.equal(stepOf(full, 'neighbourhood', 'in'), null);
  const shallow = rungsFor({ districts: false, neighbourhood: false });
  assert.equal(stepOf(shallow, 'city', 'in'), null, 'no street view in a city without districts: the ladder simply stops');
  assert.equal(stepOf(shallow, 'nowhere' as never, 'in'), null);
});

test('city bands follow the camera with hysteresis, so the cut does not flicker', () => {
  const cuts = [300, 90];
  assert.equal(cityBand(500, cuts), 'city');
  assert.equal(cityBand(200, cuts, 'city'), 'district');
  assert.equal(cityBand(40, cuts, 'district'), 'neighbourhood');
  // Just inside a cut after crossing it does not swap back.
  assert.equal(cityBand(305, cuts, 'district'), 'district');
  assert.equal(cityBand(95, cuts, 'neighbourhood'), 'neighbourhood');
  // Clearly back past it does.
  assert.equal(cityBand(400, cuts, 'district'), 'city');
});

test('a single wheel notch, or a small pinch, never takes a step', () => {
  const pressure = createPressure();
  let state = pressure.push('out', NOTCH, 1000);
  assert.equal(state.fired, false);
  assert.ok(state.amount > 0 && state.amount < 0.5);
  state = pressure.push('out', Math.log(1.25), 1020);
  assert.equal(state.fired, false, 'a pinch of 25 percent past the limit is not enough');
});

test('about four notches in one go take a step, and the leftover is carried', () => {
  const pressure = createPressure();
  let at = 1000, state = pressure.read(at);
  for (let i = 0; i < 6 && !state.fired; i++) { at += 40; state = pressure.push('in', NOTCH * 1.6, at); }
  assert.equal(state.fired, true);
  assert.equal(state.edge, 'in');
  assert.ok(state.carry >= 0);
});

test('pressure drains when the gesture pauses: slow notches never add up', () => {
  const pressure = createPressure();
  let at = 0, fired = false;
  for (let i = 0; i < 20; i++) { at += 2500; fired = pressure.push('out', NOTCH, at).fired || fired; }
  assert.equal(fired, false);
  const state = pressure.read(at + 5000);
  assert.equal(state.amount, 0);
});

test('pushing the other way starts again, and zoom the camera took relaxes the pressure', () => {
  const pressure = createPressure();
  pressure.push('out', PRESSURE_STEP * 0.8, 100);
  assert.equal(pressure.push('in', PRESSURE_STEP * 0.3, 140).fired, false, 'the out pressure was not carried over to in');
  pressure.relax();
  assert.equal(pressure.read(150).amount, 0);
});

test('after a step nothing fires until the hand-over is settled and the cool-down has passed: no bouncing at the boundary', () => {
  const pressure = createPressure();
  assert.equal(pressure.push('out', PRESSURE_STEP + 0.1, 0).fired, true);
  assert.equal(pressure.push('out', PRESSURE_STEP + 0.1, 100).fired, false, 'still handing over');
  pressure.settled(500);
  assert.equal(pressure.push('in', PRESSURE_STEP + 0.1, 500 + COOLDOWN_MS - 1).fired, false, 'cooling down');
  assert.equal(pressure.push('in', PRESSURE_STEP + 0.1, 500 + COOLDOWN_MS + 1).fired, true);
});

test('a hand-over that never reports back does not hold the ladder for ever', () => {
  const pressure = createPressure();
  assert.equal(pressure.step('out', 0).fired, true);
  assert.equal(pressure.step('out', 2999).fired, false);
  assert.equal(pressure.step('out', 3001).fired, true);
});

test('a button or a key at the limit takes the whole step at once, but not twice', () => {
  const pressure = createPressure();
  assert.equal(pressure.step('out', 0).fired, true);
  assert.equal(pressure.step('out', 10).fired, false);
});

test('a hand-over waits for data, fades, and finishes once', () => {
  const handoff = createHandoff();
  handoff.begin(rung('city'), rung('country'), 'out', false, 0);
  assert.equal(handoff.view.phase, 'loading');
  assert.equal(handoff.tick(100), true);
  assert.equal(handoff.view.progress, 0, 'nothing fades while the next map is not here');
  handoff.arrived(200);
  assert.equal(handoff.view.phase, 'running');
  assert.equal(handoff.tick(200 + HANDOFF_MS / 2), true);
  assert.ok(Math.abs(handoff.view.progress - 0.5) < 1e-9);
  assert.equal(handoff.tick(200 + HANDOFF_MS + 5), false);
  assert.equal(handoff.finished, true);
  assert.equal(handoff.returned, false);
  assert.equal(handoff.tick(200 + HANDOFF_MS + 30), false);
  assert.equal(handoff.finished, false);
  assert.equal(handoff.view.phase, 'idle');
});

test('with its data ready a hand-over starts fading at once', () => {
  const handoff = createHandoff();
  handoff.begin(rung('country'), rung('city'), 'in', true, 10);
  assert.equal(handoff.view.phase, 'running');
});

test('reversing while loading cancels, and nothing was shown', () => {
  const handoff = createHandoff();
  handoff.begin(rung('city'), rung('country'), 'out', false, 0);
  assert.equal(handoff.reverse(50), 'cancelled');
  assert.equal(handoff.view.phase, 'idle');
  assert.equal(handoff.reverse(60), 'none');
});

test('reversing mid-fade runs back from where it is and ends on the map it left', () => {
  const handoff = createHandoff();
  handoff.begin(rung('city'), rung('country'), 'out', true, 0);
  handoff.tick(HANDOFF_MS * 0.6);
  const at = handoff.view.progress;
  assert.equal(handoff.reverse(HANDOFF_MS * 0.6), 'reversed');
  handoff.tick(HANDOFF_MS * 0.6 + HANDOFF_MS * 0.1);
  assert.ok(handoff.view.progress < at && handoff.view.progress > 0, 'no jump: it eases back from where it was');
  assert.equal(handoff.tick(HANDOFF_MS * 3), false);
  assert.equal(handoff.finished, true);
  assert.equal(handoff.returned, true);
});

test('reduced motion is a short fade with no flight', () => {
  const handoff = createHandoff({ reduced: true });
  handoff.begin(rung('city'), rung('country'), 'out', true, 0);
  assert.equal(handoff.view.fly, false);
  assert.equal(handoff.tick(REDUCED_MS + 1), false);
  assert.equal(handoff.finished, true);
  assert.ok(REDUCED_MS < HANDOFF_MS);
});

test('the fade never leaves a frame empty and ends on the map entered', () => {
  for (let i = 0; i <= 100; i++) {
    const { leaving, entering } = crossfade(i / 100);
    assert.ok(1 - (1 - leaving) * (1 - entering) >= 0.5 || i === 0, `covered at ${i}`);
    assert.ok(entering >= 0 && entering <= 1 && leaving >= 0 && leaving <= 1);
  }
  assert.deepEqual(crossfade(0), { leaving: 1, entering: 0 });
  assert.deepEqual(crossfade(1), { leaving: 0, entering: 1 });
  assert.ok(crossfade(0.3).leaving === 1 && crossfade(0.3).entering > 0, 'the one entered rises first, the one left stays');
  let last = -1;
  for (let i = 0; i <= 100; i++) { const { entering } = crossfade(i / 100); assert.ok(entering >= last); last = entering; }
});

test('the next map starts inside its range, further in for a gesture that carried on', () => {
  const range = { near: 40, far: 4000 };
  const out = entryDistance('out', range), outCarried = entryDistance('out', range, 0.4);
  assert.ok(out > range.near && out < range.far);
  assert.ok(outCarried < out, 'a gesture that kept going enters nearer its end, so it carries on');
  const into = entryDistance('in', range);
  assert.ok(into < range.far && into > range.near);
  assert.ok(entryDistance('in', range, 0.4) > into);
  // Far enough from the limit that the same gesture does not trip the next step at once.
  assert.ok(Math.log(out / range.near) > 0.04 * Math.log(range.far / range.near) - 1e-9);
});

test('hint wording', () => {
  assert.equal(limitHint('out', 'Nigeria'), 'Keep zooming to see Nigeria');
  assert.equal(limitHint('in', 'Ibadan'), 'Zoom in to enter Ibadan');
  assert.equal(limitHint('in', 'Ibadan', '', true), 'Zoom in for an overview of Ibadan');
  assert.equal(limitHint('in', null, 'Accra'), 'This is as close as Accra gets for now');
  assert.equal(limitHint('out', null, 'the whole world'), 'This is the whole world');
});

test('looking is not travelling: the ladder is pure and reads or writes nothing of the player', () => {
  // The module imports nothing but the level maths of the atlas, and takes no player, city id, position or store.
  const player = Object.freeze({ city: 'lagos', x: 12, z: 34 });
  const pressure = createPressure(), handoff = createHandoff();
  pressure.push('out', 1, 0);
  handoff.begin(rung('city'), rung('country'), 'out', true, 0);
  handoff.tick(HANDOFF_MS);
  assert.deepEqual(player, { city: 'lagos', x: 12, z: 34 });
});
