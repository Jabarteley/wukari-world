import test from 'node:test';
import assert from 'node:assert/strict';
import { framePreset, cameraPosition, occluded, frameIsClear, scoreFrame, CAMERA_CLEARANCE } from './camera-frame.ts';
import { ANCHORS } from './layout.ts';

test('every landmark preview camera has clear air within 3 m and a clear sight line', () => {
  const bad: string[] = [];
  for (const id of Object.keys(ANCHORS)) {
    const a = ANCHORS[id]!, f = framePreset(id), c = cameraPosition(a, f);
    const hit = occluded(c.x, c.y, c.z, CAMERA_CLEARANCE);
    if (hit || !frameIsClear(a, f)) bad.push(`${id}:${hit ?? 'sight line'}`);
    assert.ok(Number.isFinite(f.yaw + f.tilt + f.distance));
  }
  assert.deepEqual(bad, []);
});

test('the occlusion test sees a building and a roof-top camera is allowed above it', () => {
  const a = ANCHORS['auditorium']!;
  assert.ok(occluded(a.x, 2, a.z - 12, 0), 'a point inside the auditorium is blocked');
  assert.equal(occluded(a.x, 400, a.z - 12, 0), null, 'high above is clear');
});

test('framing v2: no frame is mostly lawn or crowded by near solids, the lagoon shows at Lagoon Front, signs are in view', () => {
  const report: string[] = [];
  for (const id of Object.keys(ANCHORS)) {
    const s = scoreFrame(id, framePreset(id));
    if (s.near > .3) report.push(`${id}: near ${s.near.toFixed(2)}`);
    if (s.lawn > .6) report.push(`${id}: lawn ${s.lawn.toFixed(2)}`);
    if (id === 'lagoon-front' && s.water < .1) report.push(`lagoon-front: water ${s.water.toFixed(2)}`);
    if (['library', 'arts'].includes(id) && s.signVisible === false) report.push(`${id}: sign out of view`);
  }
  assert.deepEqual(report, []);
});
