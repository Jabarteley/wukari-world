// Tests a cartridge ships with: the rules are deterministic, a recorded match replays exactly, bad input is refused, the picture draws.
// Run: node --experimental-strip-types --test examples/cartridge-sample/rules.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../../src/game/util.ts'
import { ReplayRecorder, replayMatch } from '../../src/arena/replay.ts'
import { cleanArenaOptions } from '../../src/arena/rules.ts'
import rules, { HZ, REACH } from './rules.ts'
import { cartridge } from './cartridge.ts'
import type { TugOptions } from './rules.ts'
import { drawTug } from './draw.ts'
import type { Ctx2D } from './draw.ts'

/** Play a whole match: seat 0 is a person pulling in bursts, seat 1 the house bot. Returns the log a server would keep. */
function play(seed: string, options: Record<string, number> = {}) {
  const rng = makeRng(seed), opts = cleanArenaOptions<TugOptions>(rules, options)
  const state = rules.start(2, rng, opts)
  const names = ['Ada', 'House']
  const rec = new ReplayRecorder({ game: rules.id, rev: cartridge.rev, hz: rules.hz, seed, options: opts, seats: [{ name: names[0] as string, bot: false }, { name: names[1] as string, bot: true }] }, JSON.stringify(rules.idle()))
  const snaps: string[] = []
  for (let t = 0; rules.outcome(state) === null; t++) {
    const person = t % 7 < 4 ? 1 : 0, inputs = [person, rules.bot(state, 1, rng)]
    rec.tick(inputs, [false, true])
    rules.step(state, inputs, rng)
    snaps.push(JSON.stringify(rules.snapshot(state)))
  }
  return { log: rec.finish({ ...rules.outcome(state)!, text: 'x' }, rules.snapshot(state), names), snaps }
}

test('the same seed plays the same match, tick for tick', () => {
  assert.deepEqual(play('a').snaps, play('a').snaps)
  assert.notDeepEqual(play('a').snaps, play('b').snaps)
})

test('a recorded match replays exactly (verified), and different rules are not called exact', () => {
  const { log, snaps } = play('replay-1')
  const again = replayMatch(rules, log)
  assert.equal(again.verified, true, again.problem)
  assert.deepEqual(again.snaps.map((s) => JSON.stringify(s)), snaps)
  assert.equal(replayMatch(rules, log, cartridge.rev + 1).verified, false)
})

test('a match ends: by the rope or by time, and the server alone decides', () => {
  const rng = makeRng('end'), s = rules.start(2, rng, { seconds: 15 })
  while (rules.outcome(s) === null) rules.step(s, [1, 0], rng)
  assert.equal(rules.outcome(s)?.reason, 'pulled'); assert.deepEqual(rules.outcome(s)?.winners, [0])
  assert.ok(Math.abs(s.rope) <= REACH)
  const t = rules.start(2, rng, { seconds: 15 })
  while (rules.outcome(t) === null) rules.step(t, [0, 0], rng)
  assert.ok(t.tick === 15 * HZ || Math.abs(t.rope) >= REACH)
  assert.equal(rules.outcome(rules.forfeit(rules.start(2, rng, { seconds: 15 }), 0))?.winners[0], 1)
})

test('input is parsed, not trusted', () => {
  for (const bad of [2, -1, 'x', null, {}, [1], 1.5, 'x'.repeat(5000)]) assert.throws(() => rules.parseInput(bad), /bad input/)
  assert.equal(rules.parseInput(1), 1); assert.equal(rules.parseInput(0), 0)
})

test('the snapshot is tiny', () => {
  assert.ok(JSON.stringify(rules.snapshot(rules.start(2, makeRng('s'), { seconds: 15 }))).length < 300)
})

test('the picture draws every snapshot without a canvas', () => {
  const calls: string[] = []
  const ctx: Ctx2D = { fillStyle: '', fillRect: (x, y, w, h) => { calls.push(`${x},${y},${w},${h}`) } }
  for (const rope of [-REACH, 0, REACH]) drawTug(ctx, [0, rope, 1], 320, 180)
  assert.equal(calls.length, 15)
})
