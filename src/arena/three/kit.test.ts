import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CALM_FOR_MS, MEDIAN_FRAMES, nextLevel, ratioLadder } from './kit.ts'

const frames = (ms: number, n = MEDIAN_FRAMES): number[] => Array.from({ length: n }, () => ms)

test('the ladder starts at min(device ratio, 1.5) and steps down', () => {
  assert.deepEqual(ratioLadder(3), [1.5, 1.25, 1, 0.85])
  assert.deepEqual(ratioLadder(2), [1.5, 1.25, 1, 0.85])
  assert.deepEqual(ratioLadder(1), [1, 0.85])
  assert.deepEqual(ratioLadder(1.25), [1.25, 1, 0.85])
})
test('too few frames change nothing', () => {
  const s = { level: 1, calmMs: 100 }
  assert.deepEqual(nextLevel(s, 4, frames(40, MEDIAN_FRAMES - 1)), s)
  assert.deepEqual(nextLevel(s, 4, frames(90, 5)), s)
})
test('a very slow phone steps down after 15 frames, not 60', () => {
  assert.deepEqual(nextLevel({ level: 0, calmMs: 0 }, 4, frames(120, 15)), { level: 1, calmMs: 0 })
})
test('a median over 22 ms steps down one level, and stops at the last', () => {
  assert.deepEqual(nextLevel({ level: 0, calmMs: 0 }, 4, frames(30)), { level: 1, calmMs: 0 })
  assert.deepEqual(nextLevel({ level: 3, calmMs: 0 }, 4, frames(60)), { level: 3, calmMs: 0 })
})
test('a few slow frames do not move the median', () => {
  const recent = [...frames(16), ...frames(90, 5)].slice(-MEDIAN_FRAMES)
  assert.equal(nextLevel({ level: 0, calmMs: 0 }, 4, recent).level, 0)
})
test('steps back up one level only after 5 s of medians under 14 ms, never above the first', () => {
  let s = { level: 2, calmMs: 0 }, t = 0
  while (s.level === 2 && t < 10000) { s = nextLevel(s, 4, frames(10)); t += 10 }
  assert.equal(s.level, 1)
  assert.ok(t >= CALM_FOR_MS && t <= CALM_FOR_MS + 10, `stepped at ${t} ms`)
  assert.deepEqual(nextLevel({ level: 0, calmMs: CALM_FOR_MS }, 4, frames(10)), { level: 0, calmMs: 0 })
})
test('a median between 14 and 22 ms holds the level and restarts the calm count', () => {
  assert.deepEqual(nextLevel({ level: 1, calmMs: 3000 }, 4, frames(17)), { level: 1, calmMs: 0 })
})
