// Street life's adaptive caps (./adaptive.ts): a mean frame over 24 ms across 60 frames shrinks the counts, never under a floor, never back up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADAPT_FLOOR, ADAPT_FRAMES, ADAPT_SKIP, createAdaptiveCaps, perfFlag, readoutText, shrinkCaps } from './adaptive.ts';

const feed = (caps: ReturnType<typeof createAdaptiveCaps>, ms: number, n: number) => { let last = null; for (let i = 0; i < n; i++) last = caps.frame(ms / 1000) ?? last; return last; };

test('steady 60 fps keeps every count; 30 fps for 60 frames shrinks them once, then waits for 60 fresh frames', () => {
  const caps = createAdaptiveCaps({ crowd: 240, vehicles: 8 });
  assert.equal(feed(caps, 16.7, 500), null);
  assert.deepEqual(caps.caps, { crowd: 240, vehicles: 8 });
  assert.ok(Math.abs(caps.average! - 16.7) < 1e-6);
  const fresh = createAdaptiveCaps({ crowd: 240, vehicles: 8 });
  assert.equal(feed(fresh, 33, ADAPT_SKIP + ADAPT_FRAMES - 1), null, 'not before the window is full');
  assert.deepEqual(fresh.frame(0.033), { crowd: 168, vehicles: 5 });
  // The window slides: after a fast spell it is the mean of the last 60 that counts.
  let at = 0;
  while (!caps.frame(0.033)) at += 1;
  assert.ok(at > 20 && at < 40, `the mean of the last 60 passes 24 ms after ${at} slow frames`);
  assert.deepEqual(caps.caps, { crowd: 168, vehicles: 5 });
  assert.equal(feed(caps, 33, ADAPT_FRAMES - 1), null, 'then 60 fresh frames before the next verdict');
  assert.ok(feed(caps, 33, 1)!.crowd < 168);
  assert.equal(caps.shrinks, 2);
  void ADAPT_FLOOR;
});

test('the window slides: a few slow frames among fast ones do not shrink; exactly 24 ms is within budget', () => {
  const caps = createAdaptiveCaps({ crowd: 100, vehicles: 4 });
  for (let i = 0; i < 600; i++) caps.frame(i % 10 === 0 ? 0.05 : 0.016);
  assert.equal(caps.shrinks, 0);
  const edge = createAdaptiveCaps({ crowd: 100, vehicles: 4 });
  feed(edge, 24, 300);
  assert.equal(edge.shrinks, 0);
});

test('never under the floor (at least one of anything there was), never up, nothing from nothing', () => {
  const start = { crowd: 240, vehicles: 8 };
  let caps = start;
  for (let i = 0; i < 30; i++) { const next = shrinkCaps(caps, start); assert.ok(next.crowd <= caps.crowd && next.vehicles <= caps.vehicles); caps = next; }
  assert.deepEqual(caps, { crowd: Math.ceil(240 * ADAPT_FLOOR), vehicles: Math.ceil(8 * ADAPT_FLOOR) });
  assert.deepEqual(shrinkCaps({ crowd: 0, vehicles: 1 }, { crowd: 0, vehicles: 1 }), { crowd: 0, vehicles: 1 });
  const adaptive = createAdaptiveCaps({ crowd: 4, vehicles: 0 });
  for (let i = 0; i < 20; i++) feed(adaptive, 40, ADAPT_FRAMES + ADAPT_SKIP);
  assert.deepEqual(adaptive.caps, { crowd: 1, vehicles: 0 });
});

test('the first frames after a wake and stalls (a hidden tab) are not counted', () => {
  const caps = createAdaptiveCaps({ crowd: 100, vehicles: 4 });
  assert.equal(feed(caps, 400, 200), null, 'gaps over 250 ms are not frames');
  assert.equal(caps.average, null);
  caps.reset();
  caps.frame(0.2); caps.frame(0.2);
  assert.equal(caps.average, null, `the first ${ADAPT_SKIP} after a wake are skipped`);
  caps.frame(0.016);
  assert.ok(Math.abs(caps.average! - 16) < 1e-6);
  assert.equal(caps.frame(NaN), null); assert.equal(caps.frame(-1), null);
});

test('the readout: ?streetperf=1 only, and its line', () => {
  assert.equal(perfFlag('?streetperf=1'), true);
  assert.equal(perfFlag('?a=b&streetperf=on'), true);
  assert.equal(perfFlag('?streetperf=0'), false);
  assert.equal(perfFlag(''), false);
  assert.equal(readoutText({ average: 18.26, people: 240, vehicles: 8, shrinks: 0, triangles: 960 }), 'street 18.3 ms/frame · 240 people · 8 vehicles · 960 tris');
  assert.match(readoutText({ average: null, people: 1, vehicles: 0, shrinks: 2, triangles: 2 }), /… ms\/frame.*shrunk ×2/);
});
