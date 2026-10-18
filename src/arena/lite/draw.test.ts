import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../../game/util.ts'
import lite, { type LiteState } from './rules.ts'
import { packInput, unpackLite } from './draw.ts'

test('unpackLite reads a real snapshot back into the state', () => {
  const rng = makeRng('draw')
  const state = lite.start(3, rng, { game: 'coconut' }) as LiteState
  for (let i = 0; i < 40; i++) lite.step(state, [3, 4, 5], rng)
  const view = unpackLite(lite.snapshot(state) as number[], 3)
  assert.equal(view.tick, state.tick)
  assert.equal(view.players.length, 3)
  view.players.forEach((p, i) => {
    const m = state.players[i]!
    assert.deepEqual(p, { x: m.x, y: m.y, lives: m.out ? 0 : m.lives, score: m.score })
  })
  assert.equal(view.things.length, state.things.length)
  view.things.forEach((t, i) => { const s = state.things[i]!; assert.equal(t.k, s.k); assert.equal(t.x, Math.min(255, Math.max(0, s.x))); assert.equal(t.y, Math.min(255, Math.max(0, s.y))) })
})

test('packInput matches the engine encoding', () => {
  assert.equal(packInput(0, 0), 4)
  assert.equal(packInput(-1, -1), 0)
  assert.equal(packInput(1, 1), 8)
  assert.equal(packInput(1, 0), 7)
  assert.equal(packInput(0, -1), 3)
  const rng = makeRng('pi')
  const state = lite.start(1, rng, { game: 'mango' }) as LiteState
  const x0 = state.players[0]!.x
  lite.step(state, [packInput(1, 0)], rng)
  assert.ok(state.players[0]!.x > x0)
})
