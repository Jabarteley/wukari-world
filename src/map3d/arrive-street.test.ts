// The end of the map's dive on a street (./arrive-street.ts) on a real scene orbit: the camera at eye height looking down the street, held,
// then risen to the composed view; the goal untouched, the player's input ending the hold, snap() ending it all, the orbit given back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PITCH_MIN, createOrbit } from '../scene/camera-controls.ts';
import { HOME_STREET, ORBIT_PITCH_MIN, PIVOT_RATE, STREET_HOLD, STREET_RISE, STREET_WAIT_MS, arriveFromStreet, streetArrival, streetCandidate, streetOrbit } from './arrive-street.ts';
import type { StartPose } from './arrive-street.ts';

const POSE: StartPose = { eye: [-9, 2.6, 0.775], look: [9, 0.05, 3.45] };

function make() {
  const orbit = createOrbit();
  orbit.setBase([15, 12, 17], [0, 0.7, 0]);
  orbit.setLimits({ near: 5.5 });
  orbit.follow(0, 0.7, -3.25); orbit.snap();
  return orbit;
}
function cameraOf(orbit: ReturnType<typeof createOrbit>) {
  const at = { position: [0, 0, 0] as number[], target: [0, 0, 0] as number[] };
  orbit.apply({ position: { set: (x, y, z) => { at.position = [x, y, z]; } }, lookAt: (x, y, z) => { at.target = [x, y, z]; } });
  return at;
}

test('the orbit\'s own pivot rate and lowest pitch are the ones copied here', () => {
  assert.equal(ORBIT_PITCH_MIN, PITCH_MIN);
  assert.match(readFileSync('src/scene/camera-controls.ts', 'utf8'), new RegExp(`pivot: ${PIVOT_RATE}\\b`));
});

test('which arrivals may look down a street: the home street and the street kinds of venue, not rooms', () => {
  assert.ok(streetCandidate(HOME_STREET, undefined));
  assert.ok(streetCandidate('lagos-balogun', 'market'));
  assert.ok(streetCandidate('x', 'park'));
  assert.ok(!streetCandidate('x', 'club'));
  assert.ok(!streetCandidate('home', undefined));
});

test('the orbit state for a pose puts the camera exactly at the eye, looking at the point, the nearest way round', () => {
  const orbit = make(), state = streetOrbit(orbit, POSE, 0);
  Object.assign(orbit.now, state, { px: 0, pz: 0, squeeze: 1 });
  const camera = cameraOf(orbit);
  POSE.eye.forEach((v, i) => assert.ok(Math.abs(camera.position[i]! - v) < 1e-6, `eye ${i}: ${camera.position[i]} vs ${v}`));
  POSE.look.forEach((v, i) => assert.ok(Math.abs(camera.target[i]! - v) < 1e-9));
  assert.ok(Math.abs(state.yaw) <= Math.PI + 1e-9, 'never more than half a turn from the goal');
  assert.ok(Math.abs(streetOrbit(orbit, POSE, 4 * Math.PI).yaw - 4 * Math.PI) <= Math.PI + 1e-9);
});

test('arriving on a street: eye height looking down it, held, then up to the composed view, goal untouched, the orbit given back', () => {
  const orbit = make(), goal = { ...orbit.goal }, composed = cameraOf(orbit), step = orbit.step, snap = orbit.snap;
  let woken = 0;
  arriveFromStreet(orbit, () => { woken += 1; }, POSE);
  assert.equal(woken, 1, 'the frame loop is woken');
  const first = cameraOf(orbit);
  POSE.eye.forEach((v, i) => assert.ok(Math.abs(first.position[i]! - v) < 1e-6, 'starts at the eye'));
  assert.deepEqual(orbit.goal, goal, 'what the player asked for is not touched');
  const dt = 1 / 60;
  let frames = 0;
  for (; frames < Math.floor(STREET_HOLD / dt) - 2; frames++) assert.equal(orbit.step(dt), true, 'the loop keeps drawing the hold');
  const held = cameraOf(orbit);
  POSE.eye.forEach((v, i) => assert.ok(Math.abs(held.position[i]! - v) < 1e-6, 'held at the eye'));
  let lastY = held.position[1]!;
  for (let i = 0; i < 12; i++) { orbit.step(dt); frames += 1; }
  assert.ok(cameraOf(orbit).position[1]! > lastY, 'then it rises');
  for (lastY = cameraOf(orbit).position[1]!; orbit.step(dt) && frames < 1200; frames += 1) {
    const y = cameraOf(orbit).position[1]!;
    assert.ok(y >= lastY - 0.05, 'never dips back down (beyond the ease\'s wobble)');
    lastY = y;
  }
  assert.ok(frames * dt < STREET_HOLD + STREET_RISE + 3, `settles (${(frames * dt).toFixed(2)} s)`);
  const end = cameraOf(orbit);
  composed.position.forEach((v, i) => assert.ok(Math.abs(end.position[i]! - v) < 0.02, `back at the composed view (${end.position[i]} vs ${v})`));
  assert.equal(orbit.step, step, 'the orbit\'s own step is back');
  assert.equal(orbit.snap, snap);
});

test('the player turns or walks during the hold: it ends at once; snap() ends it all', () => {
  const orbit = make(), step = orbit.step;
  arriveFromStreet(orbit, () => undefined, POSE);
  orbit.step(1 / 60);
  orbit.drag(40, 0);
  orbit.step(1 / 60);
  assert.ok(Math.abs(cameraOf(orbit).position[0]! - POSE.eye[0]) > 1e-4, 'a drag ends the hold: the camera moves the next frame');
  const again = make(), plain = again.step;
  arriveFromStreet(again, () => undefined, POSE);
  again.snap();
  assert.equal(again.step, plain, 'snap() gives the orbit back');
  assert.ok(again.settled, 'and puts the camera where the player asked');
  void step;
});

test('streetArrival: the pose its scene noted; null when it noted none; it waits a little for the scene, then gives up', async () => {
  const noted = new Map<string, { pose: StartPose } | null>();
  const load = async () => ({ streetOf: (place: string) => noted.get(place) });
  const tick = () => new Promise((done) => setTimeout(done, 5));
  noted.set('a', { pose: POSE });
  assert.deepEqual(await streetArrival('a', { load, tick }), POSE);
  noted.set('b', null);
  assert.equal(await streetArrival('b', { load, tick }), null);
  let clock = 0;
  const late = streetArrival('c', { load, tick: async () => { clock += 50; if (clock === 100) noted.set('c', { pose: POSE }); }, now: () => clock });
  assert.deepEqual(await late, POSE, 'noted while it waited');
  clock = 0;
  assert.equal(await streetArrival('d', { load, tick: async () => { clock += 50; }, now: () => clock }), null, 'never noted: gives up');
  assert.ok(STREET_WAIT_MS < 340, 'inside the venue\'s arrival fade');
  assert.equal(await streetArrival('e', { load: () => Promise.reject(new Error('offline')) }), null, 'a chunk that fails: from above');
});
