import test from 'node:test';
import assert from 'node:assert/strict';
import { tripKind, walkTime, shuttlePlan, tripOptions, describeTrip, JOG_FROM, CHOOSE_FROM } from './trip-decision.ts';
import { ANCHORS, ENTRANCE } from './layout.ts';

const PACE = 1.82 * .6;

test('short trips walk, mid trips jog, long trips ask', () => {
  assert.equal(tripKind(10), 'walk');
  assert.equal(tripKind(JOG_FROM - 1), 'walk');
  assert.equal(tripKind(JOG_FROM), 'jog');
  assert.equal(tripKind(CHOOSE_FROM - 1), 'jog');
  assert.equal(tripKind(CHOOSE_FROM), 'choose');
  assert.equal(tripKind(Number.NaN), 'walk');
});

test('walk times are honest', () => {
  assert.equal(walkTime(20, PACE), '25 s');
  assert.equal(walkTime(1000, PACE), '21 min');
  assert.match(walkTime(500, PACE), /min$/);
});

test('from the Main Gate the shuttle is offered for Senate and Lagoon Front, with a boarding stop', () => {
  for (const id of ['senate', 'lagoon-front', 'library']) {
    const plan = shuttlePlan(ENTRANCE, ANCHORS[id]!);
    assert.ok(plan, `${id}: shuttle plan`);
    assert.equal(plan.board, 'main-gate');
    assert.ok(plan.alightDistance < Math.hypot(ANCHORS[id]!.x - ENTRANCE.x, ANCHORS[id]!.z - ENTRANCE.z) * .5);
  }
  assert.equal(shuttlePlan(ENTRANCE, ANCHORS['main-gate']!), null);
});

test('the sheet orients first-timers with a distance and a compass direction', () => {
  const line = describeTrip(ENTRANCE, 'senate');
  assert.match(line, /^Senate House · \d\.\d km (north|south|east|west)(-(north|south|east|west))?$/);
  assert.equal(describeTrip({ x: 0, z: 0 }, 'nowhere'), '');
  const a = ANCHORS['library']!;
  assert.match(describeTrip({ x: a.x, z: a.z + 300 }, 'library'), /300 m north$/);
  assert.match(describeTrip({ x: a.x - 300, z: a.z }, 'library'), /300 m east$/);
});

test('every choice sheet has a walk and a go-there option; the shuttle only when it helps', () => {
  const far = tripOptions(ENTRANCE, 'senate', PACE).map((o) => o.id);
  assert.deepEqual(far, ['walk', 'shuttle', 'go']);
  assert.match(tripOptions(ENTRANCE, 'senate', PACE)[0]!.label, /^Walk \(\d+ min\)$/);
  const hereish = tripOptions(ANCHORS['senate']!, 'library', PACE).map((o) => o.id);
  assert.ok(hereish.includes('walk') && hereish.at(-1) === 'go');
  assert.deepEqual(tripOptions(ENTRANCE, 'nowhere', PACE), []);
});
