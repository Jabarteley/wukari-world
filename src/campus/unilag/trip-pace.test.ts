import test from 'node:test';
import assert from 'node:assert/strict';
import { tripPace, TRIP_SECONDS, TRIP_MAX_SPEED } from './trip-pace.ts';
import { ANCHORS, ENTRANCE } from './layout.ts';

const BASE = 1.82 * .6;

test('short hops keep the ordinary pace, long trips arrive within the trip time', () => {
  assert.equal(tripPace(20, BASE), BASE);
  assert.equal(tripPace(0, BASE), BASE);
  assert.equal(tripPace(Number.NaN, BASE), BASE);
  assert.ok(Math.abs(tripPace(1200, BASE) - 1200 / TRIP_SECONDS) < 1e-9);
  assert.equal(tripPace(1e6, BASE), TRIP_MAX_SPEED);
});

test('from the Main Gate, Senate House, the Library and Lagoon Front take under a minute of travel', () => {
  for (const id of ['senate', 'library', 'lagoon-front']) {
    const a = ANCHORS[id]!, straight = Math.hypot(a.x - ENTRANCE.x, a.z - ENTRANCE.z);
    assert.ok(straight / BASE > 600, `${id} is ${straight.toFixed(0)} m: a plain walk is far too long`);
    // a route is up to ~1.6x the straight line
    assert.ok(straight * 1.6 / tripPace(straight, BASE) < 90, `${id} trip time`);
  }
});
