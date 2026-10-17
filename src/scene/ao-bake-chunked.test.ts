// Batch.prepareAo (src/scene/build.ts) bakes ambient occlusion a few primitives at a time with the remaining probe budget; the
// factors must be exactly those of one bakeVertexAO call over every primitive, including where the budget runs out part way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeVertexAO, createOccluders, type AoPrim } from './ao-bake.ts';

function scene(seed: number, prims: number) {
  let s = seed; const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pos: number[] = [], nor: number[] = [], list: AoPrim[] = [];
  for (let id = 0; id < prims; id++) {
    const cx = rand() * 40, cz = rand() * 40, w = 0.2 + rand() * 3, h = 0.1 + rand() * 4, d = 0.2 + rand() * 3, start = pos.length / 3, count = 6 + Math.floor(rand() * 18);
    for (let v = 0; v < count; v++) {
      pos.push(cx + (rand() - 0.5) * w, rand() * h, cz + (rand() - 0.5) * d);
      const nx = rand() - 0.5, ny = rand() - 0.5, nz = rand() - 0.5, l = Math.hypot(nx, ny, nz) || 1; nor.push(nx / l, ny / l, nz / l);
    }
    list.push({ id, start, count, min: [cx - w / 2, 0, cz - d / 2], max: [cx + w / 2, h, cz + d / 2] });
  }
  return { pos, nor, list };
}

for (const [seed, prims, budget] of [[7, 300, 30000], [11, 900, 2500], [19, 150, 400]] as const) {
  test(`chunked bake equals one bake (${prims} primitives, probe budget ${budget})`, () => {
    const { pos, nor, list } = scene(seed, prims), occluders = createOccluders(list);
    const whole = new Float64Array(pos.length).fill(1), chunked = new Float64Array(pos.length).fill(1);
    bakeVertexAO(pos, nor, whole, list, occluders, { probeBudget: budget, strength: 1 });
    let left = budget;
    for (let at = 0; at < list.length; at += 64) left -= bakeVertexAO(pos, nor, chunked, list.slice(at, at + 64), occluders, { probeBudget: left, strength: 1 });
    assert.deepEqual(Array.from(chunked), Array.from(whole));
  });
}
