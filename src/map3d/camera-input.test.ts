// The city map's free camera: keyboard turn and tilt (eased, clamped), two-finger tilt against pinch, the compass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTwoFinger, compassOf, createKeyTurn, isLook, KEY_PITCH_STEP, KEY_YAW_RATE, KEY_YAW_STEP, tiltOf } from './camera-input.ts';
import { dragKind } from '../scene/gesture.ts';
import { PITCH_MAX, PITCH_MIN } from './camera.ts';

/** Run a key turn for `seconds` at 60 frames a second against a pitch held in [PITCH_MIN, PITCH_MAX]; returns the total turn and the pitch. */
function run(turn: ReturnType<typeof createKeyTurn>, seconds: number, pitch = 0.92, instant = false) {
  let yaw = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) { const step = turn.step(1 / 60, pitch, PITCH_MIN, PITCH_MAX, instant); yaw += step.yaw; pitch += step.pitch; }
  return { yaw, pitch };
}

test('a tapped turn key is one eased step; it arrives and then nothing moves', () => {
  const turn = createKeyTurn();
  assert.equal(turn.active, false);
  turn.press('look-right'); turn.release('look-right');
  const first = turn.step(1 / 60, 0.92, PITCH_MIN, PITCH_MAX);
  assert.ok(first.yaw > 0 && first.yaw < KEY_YAW_STEP * 0.5, `eased, not a jump: ${first.yaw}`);
  const rest = run(turn, 1);
  assert.ok(Math.abs(first.yaw + rest.yaw - KEY_YAW_STEP) < 1e-9, 'exactly one step in all');
  assert.equal(turn.active, false, 'and it stops (the frame loop may end)');
  turn.press('look-left'); turn.release('look-left');
  assert.ok(Math.abs(run(turn, 1).yaw + KEY_YAW_STEP) < 1e-9, 'left turns the other way');
});

test('a held key keeps turning at a steady rate; a repeat does not add steps; reduced motion lands at once', () => {
  const turn = createKeyTurn();
  turn.press('look-right');
  for (let i = 0; i < 30; i++) turn.press('look-right');      // the keyboard's auto-repeat
  const held = run(turn, 1);
  assert.ok(held.yaw > KEY_YAW_RATE * 0.8 && held.yaw < KEY_YAW_RATE + KEY_YAW_STEP + 0.01, `about the rate for a second: ${held.yaw}`);
  assert.equal(turn.active, true);
  turn.release('look-right');
  run(turn, 1); assert.equal(turn.active, false, 'eases to a stop once let go');
  const still = createKeyTurn();
  still.press('look-up'); still.release('look-up');
  const once = still.step(0, 0.92, PITCH_MIN, PITCH_MAX, true);
  assert.ok(Math.abs(once.pitch - KEY_PITCH_STEP) < 1e-12); assert.equal(still.active, false, 'reduced motion: the whole step at once, nothing left to ease');
  const stopped = createKeyTurn();
  stopped.press('look-left'); stopped.stop();
  assert.equal(stopped.active, false); assert.deepEqual(stopped.step(1 / 60, 0.9, PITCH_MIN, PITCH_MAX), { yaw: 0, pitch: 0 });
});

test('the tilt keys never take the camera under the ground or over the top, and do not wind up against a limit', () => {
  const turn = createKeyTurn();
  turn.press('look-down');
  const low = run(turn, 5);
  assert.ok(Math.abs(low.pitch - PITCH_MIN) < 1e-9, `held at the flattest allowed: ${low.pitch}`);
  turn.release('look-down');
  turn.press('look-up'); turn.release('look-up');
  const back = run(turn, 1, low.pitch);
  assert.ok(Math.abs(back.pitch - (PITCH_MIN + KEY_PITCH_STEP)) < 1e-9, 'the other key answers at once, nothing to unwind');
  turn.press('look-up');
  const high = run(turn, 5, back.pitch);
  assert.ok(Math.abs(high.pitch - PITCH_MAX) < 1e-9 && high.pitch < Math.PI / 2, 'nearly straight down, never past it (no flip)');
  assert.ok(isLook('look-left') && !isLook('move-left') && !isLook(undefined));
});

test('gestures: one finger pans, the right button or a modifier turns, two fingers pinch or tilt', () => {
  assert.equal(dragKind({ button: 0, pointerType: 'touch' }, 'map'), 'pan');
  assert.equal(dragKind({ button: 0, pointerType: 'mouse' }, 'map'), 'pan');
  assert.equal(dragKind({ button: 2, pointerType: 'mouse' }, 'map'), 'rotate');
  assert.equal(dragKind({ button: 0, ctrlKey: true, pointerType: 'mouse' }, 'map'), 'rotate');
  assert.equal(dragKind({ button: 0, altKey: true, pointerType: 'mouse' }, 'map'), 'rotate');
  const a = { x: 100, y: 400 }, b = { x: 260, y: 410 };
  const moved = (p: { x: number; y: number }, dx: number, dy: number) => ({ x: p.x + dx, y: p.y + dy });
  assert.equal(classifyTwoFinger(a, b, a, b), 'pending', 'not moved yet');
  assert.equal(classifyTwoFinger(a, b, moved(a, 0, -4), moved(b, 1, -4)), 'pending', 'a few pixels up together: not yet told');
  assert.equal(classifyTwoFinger(a, b, moved(a, 1, -14), moved(b, -1, -13)), 'tilt', 'side by side, sliding up together');
  assert.equal(classifyTwoFinger(a, b, moved(a, 0, 20), moved(b, 2, 19)), 'tilt', 'and down');
  assert.equal(classifyTwoFinger(a, b, moved(a, -15, 0), moved(b, 15, 0)), 'pinch', 'spreading apart zooms');
  assert.equal(classifyTwoFinger(a, b, moved(a, 0, 12), moved(b, 0, -12)), 'pinch', 'opposite ways is a twist');
  assert.equal(classifyTwoFinger(a, b, moved(a, 20, 2), moved(b, 20, 2)), 'pinch', 'travelling sideways moves the map, as before');
  assert.equal(classifyTwoFinger(a, b, moved(a, 14, -14), moved(b, 14, -14)), 'pinch', 'a diagonal slide moves the map');
  const c = { x: 200, y: 200 }, d = { x: 210, y: 380 };
  assert.equal(classifyTwoFinger(c, d, moved(c, 0, -14), moved(d, 0, -14)), 'pinch', 'fingers one above the other slide the map, not tilt it');
  assert.ok(tiltOf(-40) < 0 && tiltOf(40) > 0, 'up tips towards the horizon, down towards straight down (the right-drag rule)');
});

test('the compass: the needle points north on screen, the words say the heading and the tilt', () => {
  const rest = compassOf(0, Math.PI / 2);
  assert.deepEqual([rest.bearing, rest.needle, rest.tilt, rest.facing], [0, 0, 0, 'north']);
  const east = compassOf(-Math.PI / 2, 0.92);
  assert.deepEqual([east.bearing, east.facing, east.needle], [90, 'east', -90], 'facing east, north is off to the left');
  assert.equal(compassOf(Math.PI / 4, 0.92).facing, 'north-west');
  assert.equal(compassOf(Math.PI, 0.92).facing, 'south');
  assert.equal(compassOf(Math.PI * 2 + 0.01, 0.92).facing, 'north', 'whole turns do not matter');
  assert.equal(compassOf(0, 0.92).tilt, 37);
  assert.match(compassOf(-Math.PI / 2, 0.92).label, /^Facing east, tipped 37°\. Turn the map back to north up$/);
});
