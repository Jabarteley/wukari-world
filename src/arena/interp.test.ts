// OWNER: games (real-time) — the snapshot jitter buffer.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Timeline, lerp } from './interp.ts'

test('draws between the two snapshots around the delayed moment', () => {
  const tl = new Timeline<number>(50, 2)
  for (let k = 1; k <= 6; k++) tl.push(k, 1000 + k * 50, k * 10)
  // offset = 1000: tick 6 arrived at 1300. Drawing at 1300 means tick 4 (2 ticks back).
  const p = tl.pick(1300)!
  assert.equal(p.a, 40); assert.equal(p.b, 50); assert.ok(Math.abs(p.t) < 1e-9 || Math.abs(p.t - 1) < 1e-9)
  const q = tl.pick(1325)!
  assert.equal(q.a, 40); assert.equal(q.b, 50); assert.ok(Math.abs(q.t - 0.5) < 1e-9)
})

test('jitter: a late packet does not move the drawn time; the fastest packet sets the clock', () => {
  const tl = new Timeline<number>(50, 2)
  tl.push(1, 1050, 1); tl.push(2, 1100, 2); tl.push(3, 1400, 3) // tick 3 was 250 ms late
  tl.push(2, 1200, 999) // a repeat of tick 2: ignored
  assert.equal(tl.length, 3)
  const p = tl.pick(1210)!
  assert.ok(p.tick > 2 && p.tick < 3, String(p.tick))
})

test('gaps (ticks with no change are not sent) hold the value; before and after the buffer clamp', () => {
  const tl = new Timeline<number>(50, 0)
  tl.push(10, 500, 100); tl.push(30, 1500, 100); tl.push(31, 1550, 200)
  assert.equal(tl.pick(0)?.a, 100)
  const mid = tl.pick(1000)!
  assert.equal(lerp(mid.a, mid.b, mid.t), 100)
  assert.equal(tl.pick(99999)?.b, 200)
  assert.equal(new Timeline<number>(50).pick(5), null)
})

test('a slow drift is followed, and the buffer is bounded', () => {
  const tl = new Timeline<number>(50, 2, 5)
  for (let k = 1; k < 200; k++) tl.push(k, k * 50.5, k)
  assert.equal(tl.length, 5)
  const p = tl.pick(199 * 50.5)!
  assert.ok(p.tick > 190 && p.tick < 199, String(p.tick))
})
