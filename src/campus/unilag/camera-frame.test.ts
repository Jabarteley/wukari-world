import test from 'node:test';
import assert from 'node:assert/strict';
import { framePreset, cameraPosition, occluded, frameIsClear, CAMERA_CLEARANCE } from './camera-frame.ts';
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
