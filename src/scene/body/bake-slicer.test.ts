import { test } from 'node:test';
import assert from 'node:assert/strict';

type Global = typeof globalThis & { requestAnimationFrame?: (callback: FrameRequestCallback) => number };

test('without frames nothing is sliced: every step goes straight on', async () => {
  const { bakeSliceSpent, nextBakeSlice, bakeCheckpoint } = await import('./bake-slicer.ts');
  assert.equal(typeof (globalThis as Global).requestAnimationFrame, 'undefined');
  assert.equal(bakeSliceSpent(), false);
  let resumed = false;
  await nextBakeSlice().then(() => { resumed = true; });
  await bakeCheckpoint();
  assert.equal(resumed, true);
});

test('with frames a bake waits for the next frame, and waiters resume in the order they asked', async () => {
  const g = globalThis as Global;
  const frames: FrameRequestCallback[] = [];
  g.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  try {
    const { bakeSliceSpent, nextBakeSlice, BAKE_SLICE_MS } = await import(`./bake-slicer.ts?frames=${Date.now()}`);
    assert.equal(bakeSliceSpent(), true, 'outside a slice the budget counts as spent: a bake never starts in the caller\'s frame');
    const order: string[] = [];
    const a = nextBakeSlice().then(() => { order.push('a'); });
    const b = nextBakeSlice().then(() => { order.push('b'); });
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.deepEqual(order, [], 'nothing runs before the frame');
    assert.equal(frames.length, 1, 'one frame request for every waiter');
    frames.shift()!(0);
    await Promise.all([a, b]);
    assert.deepEqual(order, ['a', 'b']);
    assert.equal(bakeSliceSpent(), false, 'a fresh slice has budget');
    const start = performance.now();
    while (performance.now() - start < BAKE_SLICE_MS + 1) { /* use the slice */ }
    assert.equal(bakeSliceSpent(), true, 'and spends it after BAKE_SLICE_MS');
  } finally {
    Reflect.deleteProperty(g, 'requestAnimationFrame');
  }
});
