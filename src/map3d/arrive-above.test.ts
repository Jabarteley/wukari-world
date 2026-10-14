// The end of the map's dive (./arrive-above.ts) on a real scene orbit: high and pulled back, then down to the composed view, gently,
// goal untouched; the orbit is put back as it was afterwards, and snap() ends it at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ABOVE_RATE, ORBIT_PITCH_MAX, TURN_RATE, ZOOM_RATE, arriveFromAbove } from './arrive-above.ts';
import { PITCH_MAX, createOrbit } from '../scene/camera-controls.ts';
import { readFileSync } from 'node:fs';

function make() {
  const orbit = createOrbit();
  orbit.setBase([10, 9, 14], [0, 0.7, 0]);
  orbit.setLimits({ near: 5.5 });
  orbit.follow(2, 0.7, 3); orbit.snap();
  return orbit;
}

test('the orbit\'s own limit and rates are the ones copied here', () => {
  assert.equal(ORBIT_PITCH_MAX, PITCH_MAX);
  const source = readFileSync('src/scene/camera-controls.ts', 'utf8');
  assert.match(source, new RegExp(`turn: ${TURN_RATE}\\b`)); assert.match(source, new RegExp(`zoom: ${ZOOM_RATE}\\b`));
});

test('arriving from above: high and pulled back, then down to the composed view, gently, goal untouched, the orbit given back', () => {
  const orbit = make(), goal = { ...orbit.goal }, composed = { pitch: orbit.pitch, distance: orbit.distance }, step = orbit.step;
  let woken = 0;
  arriveFromAbove(orbit, () => { woken += 1; }, 0.9);
  assert.equal(woken, 1, 'the frame loop is woken');
  assert.ok(Math.abs(orbit.pitch - PITCH_MAX) < 1e-9, 'starts looking nearly straight down');
  assert.ok(orbit.distance > composed.distance * 1.3, 'and pulled back');
  assert.deepEqual(orbit.goal, goal, 'what the player asked for is not touched');
  const dt = 1 / 60;
  for (let i = 0; i < 6; i++) orbit.step(dt);
  assert.ok(orbit.pitch > composed.pitch + (PITCH_MAX - composed.pitch) * 0.5, `slower than an ordinary ease: still high at 0.1 s (${orbit.pitch})`);
  let last = orbit.pitch, frames = 6;
  while (orbit.step(dt) && frames < 600) { assert.ok(orbit.pitch <= last + 1e-9, 'only ever comes down'); last = orbit.pitch; frames += 1; }
  assert.ok(frames < 180, `settles within 3 s (${frames} frames)`);
  assert.ok(Math.abs(orbit.pitch - composed.pitch) < 1e-6 && Math.abs(orbit.distance - composed.distance) < 1e-3);
  assert.equal(orbit.step, step, 'the orbit\'s own step is back once it is down');
  assert.ok(ABOVE_RATE > 0 && ABOVE_RATE < 1);
  // snap() (reduced motion, a new venue) ends it at once.
  arriveFromAbove(orbit, () => {});
  orbit.snap();
  assert.ok(Math.abs(orbit.pitch - composed.pitch) < 1e-9); assert.equal(orbit.step(dt), false); assert.equal(orbit.step, step);
});
