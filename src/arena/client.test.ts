// OWNER: games (real-time) — the client's input pipe keeps under the host's 600 frames a minute and never loses a tap.
import test from 'node:test'
import assert from 'node:assert/strict'
import { InputPipe } from './client.ts'

function pipe(extra = {}) {
  let t = 0
  const sent: [number, number][] = []
  const p = new InputPipe({ send: (h, e) => sent.push([h, e]), now: () => t, ...extra })
  return { p, sent, at: (ms: number) => { t = ms } }
}

test('a change goes out at once, then the gap holds back the next', () => {
  const { p, sent, at } = pipe()
  p.hold(2); assert.equal(p.flush(), true)
  at(20); p.hold(0); assert.equal(p.flush(), false)
  at(70); assert.equal(p.flush(), true)
  assert.deepEqual(sent, [[2, 0], [0, 0]])
})

test('taps inside the gap are merged and never lost; holding after a tap does not repeat it', () => {
  const { p, sent, at } = pipe()
  p.press(8); p.flush()
  at(10); p.press(16); p.press(8); p.flush()
  at(80); p.flush()
  at(90); p.flush()
  assert.deepEqual(sent, [[0, 8], [0, 24]])
})

test('held buttons are re-sent now and then so a lost frame heals, nothing is sent when idle', () => {
  const { p, sent, at } = pipe()
  p.hold(1); p.flush()
  at(300); assert.equal(p.flush(), false)
  at(600); assert.equal(p.flush(), true)
  p.hold(0); at(700); p.flush()
  at(5000); assert.equal(p.flush(), false)
  assert.deepEqual(sent, [[1, 0], [1, 0], [0, 0]])
})

test('a frantic player stays under the budget: 600 a minute is the host limit', () => {
  const { p, sent, at } = pipe()
  for (let ms = 0; ms < 60000; ms += 16) { at(ms); p.hold((ms / 16) % 2 ? 1 : 2); p.press(8); p.flush() }
  // Taps/changes are always sent (the gap is 60 ms: at most ~1000 a minute would pass); the pipe's own gap must keep it under the host's.
  assert.ok(sent.length <= 520, String(sent.length))
})

test('reset lets go of everything', () => {
  const { p, sent, at } = pipe()
  p.hold(3); p.flush(); at(100); p.reset(); p.flush()
  assert.deepEqual(sent.at(-1), [0, 0])
})
