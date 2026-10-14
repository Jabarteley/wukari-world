// The street scene kind (./street-scene.ts): the home street and the street behind a venue as one layout, two-way traffic on the country's
// side, the eye-level start pose looking along the street, the registry the map's dive reads; and browsers who stop at shop windows.
import { loadCityContent } from '../../game/cities/registry.ts';
await loadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Z } from '../street/street-plan.ts';
import { ROW_HALF_WIDTH } from '../../game/neighbourhood-space.ts';
import { PITCH_MIN } from '../camera-controls.ts';
import { CAR_LENGTH, STREET_KINDS, VEHICLE_KINDS, VENUE_GROUND, venueLanes } from './plan.ts';
import type { Lane } from './plan.ts';
import { browseAt, personAt, planPeople, windowsOf } from './crowd.ts';
import { sideOf } from './traffic.ts';
import {
  EYE_UNITS, HOME, HOME_LANE_OFFSET, HOME_NARROW, STREET_SCENE_KIND, VENUE_ROAD, countryOf, forgetStreet, homeStreet, noteStreet, streetOf, venueStreet,
} from './street-scene.ts';
import type { StartPose } from './street-scene.ts';
import { HOME_STREET, STREET_PLACES } from '../../map3d/arrive-street.ts';

const HOME_LANES: Lane[] = [
  { ax: -ROW_HALF_WIDTH, az: Z.kerb - 0.7, bx: ROW_HALF_WIDTH, bz: Z.kerb - 0.7, width: 0.9 },
  { ax: -ROW_HALF_WIDTH, az: Z.pavement1 - 0.55, bx: ROW_HALF_WIDTH, bz: Z.pavement1 - 0.55, width: 0.9, browse: 0 },
];

/** The angle (degrees) between where a pose looks, on the ground, and the street's direction. */
function alongness(pose: StartPose, axis: { ax: number; az: number; bx: number; bz: number }): number {
  const dx = pose.look[0] - pose.eye[0], dz = pose.look[2] - pose.eye[2], ux = axis.bx - axis.ax, uz = axis.bz - axis.az;
  return (Math.acos((dx * ux + dz * uz) / (Math.hypot(dx, dz) * Math.hypot(ux, uz))) * 180) / Math.PI;
}
const pitchOf = (pose: StartPose): number => Math.atan2(pose.eye[1] - pose.look[1], Math.hypot(pose.look[0] - pose.eye[0], pose.look[2] - pose.eye[2]));

test('the home street\'s numbers are the street plan\'s and the neighbourhood\'s', () => {
  for (const key of ['kerb', 'road0', 'road1', 'farKerb', 'pavement0', 'pavement1'] as const) assert.equal(HOME[key], Z[key], key);
  const source = readFileSync('src/scene/neighbourhood-scene.ts', 'utf8');
  assert.match(source, /const CROSSING_X = \[78, 10\] as const/);
  assert.deepEqual([...HOME.crossings], [78, 10]);
  assert.match(source, /PARKED = Object\.freeze\(\{ keke: Z\.road0 \+ 0\.8, danfoFar: Z\.road1 - 1\.1, danfoNear: Z\.road0 \+ 1\.1 \}\)/);
  // The map's dive knows the same street places as street life's gate.
  assert.deepEqual([...STREET_PLACES].sort(), [...STREET_KINDS].sort());
  assert.equal(HOME_STREET, 'neighbourhood');
});

test('the home street: a street scene, traffic both ways on the country\'s side, between the parked danfo and keke without touching them', () => {
  for (const [country, side] of [['ng', 'right'], ['gb', 'left'], ['fr', 'right'], ['ke', 'left'], ['jp', 'left']] as const) {
    const street = homeStreet(country, 0, HOME_LANES, ROW_HALF_WIDTH);
    assert.equal(street.kind, STREET_SCENE_KIND);
    assert.equal(street.place, 'neighbourhood');
    assert.equal(street.side, side, country);
    assert.equal(street.roads.length, 2);
    for (const road of street.roads) assert.equal(sideOf(road, street.axis), side);
    assert.equal(street.crossings.length, 2);
  }
  // Parked: keke (1.3 wide) and danfo (2.0 wide) pulled to the kerbs; moving vehicles HOME_NARROW as wide as a full car (1.8).
  const keke = [Z.road0 + 0.8 - 0.65, Z.road0 + 0.8 + 0.65], near = [Z.road0 + 1.1 - 1, Z.road0 + 1.1 + 1], far = [Z.road1 - 1.1 - 1, Z.road1 - 1.1 + 1];
  const mid = (Z.road0 + Z.road1) / 2, widest = Math.max(...Object.values(VEHICLE_KINDS).map((k) => k.wide ?? 1)) * 1.8 * HOME_NARROW / 2;
  const lanes = [mid - HOME_LANE_OFFSET, mid + HOME_LANE_OFFSET];
  assert.ok(lanes[0]! - widest > Math.max(keke[1]!, near[1]!), 'the near lane clears the parked keke and danfo');
  assert.ok(lanes[1]! + widest < far[0]!, 'the far lane clears the parked danfo');
  assert.ok(lanes[1]! - widest > lanes[0]! + widest, 'the two lanes never touch');
  assert.ok(lanes[0]! - widest > Z.road0 && lanes[1]! + widest < Z.road1, 'both on the road');
});

test('the home street\'s start pose: eye height on the near pavement, looking along the street, not too steep for the orbit', () => {
  for (const ownX of [-80, -20, 0, 35, 80]) {
    const { pose, axis } = homeStreet('ng', ownX, HOME_LANES, ROW_HALF_WIDTH);
    assert.ok(Math.abs(pose.eye[1] - 0.05 - EYE_UNITS) < 1e-9, 'a person\'s eye, 1.7 m above the pavement');
    assert.ok(Math.abs(EYE_UNITS - 1.7 * 1.5) < 1e-9);
    assert.ok(pose.eye[2] > Z.pavement0 && pose.eye[2] < Z.kerb, `on the near pavement (z ${pose.eye[2]})`);
    assert.ok(Math.abs(pose.eye[2] - (Z.kerb - 0.7)) > 0.9, 'off the walkers\' lane by the kerb');
    assert.ok(pose.eye[0] >= -ROW_HALF_WIDTH && pose.look[0] <= ROW_HALF_WIDTH, 'on the street');
    assert.ok(alongness(pose, axis) < 12, `looking along the street (${alongness(pose, axis).toFixed(1)}°)`);
    assert.ok(pitchOf(pose) >= PITCH_MIN && pitchOf(pose) < 0.3, `a level look (${pitchOf(pose).toFixed(3)} rad)`);
    if (ownX === 0) assert.ok(pose.eye[0] < 0 && pose.look[0] > 0, 'from behind the player\'s gate, past it');
  }
});

test('the street behind a venue: beyond the pavements and the walk bounds, both ways on the country\'s side, a crossing, the eye between the lanes', () => {
  const bounds = [-13.2, -11.2, 13.2, 11.2] as const, z0 = bounds[1];
  for (const [country, side] of [['ng', 'right'], ['gb', 'left']] as const) {
    const street = venueStreet('lagos-market', country, bounds, true);
    assert.equal(street.kind, STREET_SCENE_KIND);
    assert.equal(street.place, 'lagos-market');
    assert.ok(street.surface, 'a venue has no road of its own: it is drawn');
    assert.equal(street.road, VENUE_GROUND);
    for (const road of street.roads) assert.equal(sideOf(road, street.axis), side);
    const near = street.axis.az + VENUE_ROAD.half, far = street.axis.az - VENUE_ROAD.half;
    assert.ok(near < z0 - 2, 'the road lies beyond the walk bounds');
    // The phase-2 pavements are still there, and nobody walks along the road (only across it, at the crossing).
    assert.deepEqual(street.lanes.slice(0, 4), venueLanes(bounds, true));
    for (const lane of street.lanes) {
      const along = Math.abs(lane.bx - lane.ax) > Math.abs(lane.bz - lane.az);
      if (along) assert.ok(lane.az - lane.width / 2 >= near - 0.3 || lane.az + lane.width / 2 <= far, `lane at ${lane.az} off the road`);
    }
    for (const road of street.roads) assert.ok(road.az + 0.9 < near && road.az - 0.9 > far, 'cars on the road');
    const crossing = street.crossings[0]!;
    assert.ok(crossing.az > near && crossing.bz < far, 'the crossing runs kerb to kerb');
    const { pose } = street;
    assert.ok(Math.abs(pose.eye[1] - VENUE_GROUND - EYE_UNITS) < 1e-9);
    assert.ok(pose.eye[2] < z0 - 4.6 - 1.1 && pose.eye[2] > z0 - 7.6 + 1.3, 'between the walkers\' lanes');
    assert.ok(pose.eye[0] < bounds[0], 'off to the side of the place');
    assert.ok(alongness(pose, street.axis) < 12 && pitchOf(pose) >= PITCH_MIN);
    assert.ok(pose.look[2] < near && pose.look[2] > far, 'looking at the road');
  }
  assert.equal(countryOf('lagos'), 'ng');
  assert.equal(countryOf('no-such-city'), null);
});

test('the registry: a scene notes its street (or none), the dive reads it, the scene forgets it when it goes', () => {
  const street = venueStreet('reg-test', 'fr', [-10, -8, 10, 8], true);
  assert.equal(streetOf('reg-test'), undefined, 'nothing noted yet');
  noteStreet('reg-test', street);
  assert.equal(streetOf('reg-test'), street);
  forgetStreet('reg-test', venueStreet('reg-test', 'fr', [-10, -8, 10, 8], true));
  assert.equal(streetOf('reg-test'), street, 'only the one noted is forgotten');
  forgetStreet('reg-test', street);
  assert.equal(streetOf('reg-test'), undefined);
  noteStreet('reg-test', null);
  assert.equal(streetOf('reg-test'), null, 'noted as none');
  forgetStreet('reg-test', null);
});

test('browsers stop at the shop windows, and only there, turned to them; continuous walking between', () => {
  const lane: Lane = { ax: -60, az: 13.65, bx: 60, bz: 13.65, width: 0.9, browse: 0, windows: [2, 10, 30, 31, 64, 90, 117] };
  assert.deepEqual(windowsOf(lane), [10, 30, 31, 64, 90], 'none in the fade at either end');
  const people = planPeople('shops', { lanes: [lane] }, 200), browsers = people.filter((p) => p.habit === 'browse');
  assert.ok(browsers.length > 30, `browsers (${browsers.length})`);
  assert.ok(browsers.every((p) => p.windows && p.windows.length > 0 && p.windows.every((w) => windowsOf(lane).includes(w))), 'each picks windows of the lane');
  let stops = 0;
  for (const person of browsers.slice(0, 20)) {
    let last = personAt(person, { lanes: [lane] }, 1000);
    for (let t = 1000.25; t < 1100; t += 0.25) {
      const pose = personAt(person, { lanes: [lane] }, t), at = browseAt(person, lane, t);
      const moved = Math.hypot(pose.x - last.x, pose.z - last.z);
      assert.ok(moved <= person.speed * 0.25 + 1e-6 || moved > 100, 'never jumps (except round the lane\'s ends)');
      if (at.stopped) {
        stops += 1;
        const along = pose.x - lane.ax;
        assert.ok(person.windows!.some((w) => Math.abs(w - along) < 1e-6), `stopped at a window (${along.toFixed(3)})`);
        assert.equal(pose.ry, 0, 'turned to it');
        assert.ok(pose.mode > 0);
      }
      last = pose;
    }
  }
  assert.ok(stops > 0, 'and they do stop');
  // A lane without windows: browsers keep their phase-3b stops.
  const plain = planPeople('shops', { lanes: [{ ...lane, windows: undefined }] }, 200);
  assert.ok(plain.every((p) => p.windows === undefined));
});

test('a car is a car\'s length; okadas and bicycles are shorter than a keke', () => {
  assert.ok(VEHICLE_KINDS.okada.length * CAR_LENGTH < VEHICLE_KINDS.keke.length * CAR_LENGTH);
  assert.ok(VEHICLE_KINDS.bike.length < VEHICLE_KINDS.okada.length);
});
