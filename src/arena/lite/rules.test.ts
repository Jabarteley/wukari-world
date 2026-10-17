// The lite engine (src/arena/lite/): every built-in game replays exactly from its log, bots finish a game alone, the snapshot stays
// small at 8 seats, input is bounded, and the schema refuses what it cannot play.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../../game/util.ts'
import { ReplayRecorder, replayMatch } from '../replay.ts'
import lite, { forgetLite, liteDef, registerLite, type LiteState } from './rules.ts'
import { LITE_EXAMPLES } from './examples.ts'
import { LITE_LIMITS, readLite, validateLite } from './schema.ts'

/** Play a game the way the room host does, every seat a bot, recording as it goes. */
function play(game: string, seats: number, seed: string) {
  const rng = makeRng(seed), options = { game }
  const state = lite.start(seats, rng, options) as LiteState
  const names = Array.from({ length: seats }, (_, i) => ({ name: `P${i}`, bot: false }))
  const rec = new ReplayRecorder({ game: 'lite', rev: 1, hz: lite.hz, seed, options, seats: names }, JSON.stringify(lite.idle()))
  let tick = 0, biggest = 0
  while (!lite.outcome(state) && tick < 20000) {
    const inputs = names.map((_, i) => lite.bot(state, i, rng))
    rec.tick(inputs, names.map(() => false))
    lite.step(state, inputs, rng)
    biggest = Math.max(biggest, JSON.stringify(lite.snapshot(state)).length)
    tick += 1
  }
  const outcome = lite.outcome(state)
  assert.ok(outcome, `${game} ended`)
  return { log: rec.finish({ ...outcome, text: outcome.text }, lite.snapshot(state), names.map((s) => s.name)), ticks: tick, biggest, outcome, state }
}

test('every built-in game: bots finish it alone, it replays exactly, and the snapshot stays under 300 bytes at 8 seats', () => {
  assert.equal(LITE_EXAMPLES.length, 6)
  for (const { id, def } of LITE_EXAMPLES) {
    const seats = Math.min(def.seats.max, LITE_LIMITS.seats)
    const run = play(id, seats, `seed-${id}`)
    assert.ok(run.ticks <= (def.rules.seconds ?? 60) * def.hz, `${id} ends by its time`)
    const again = replayMatch(lite, run.log)
    assert.equal(again.verified, true, `${id}: ${again.problem}`)
    assert.ok(run.biggest <= 300, `${id}: snapshot ${run.biggest} bytes`)
    assert.deepEqual([...run.outcome.places!].sort((a, b) => a - b), Array.from({ length: seats }, (_, i) => i + 1), `${id}: every seat has a place`)
  }
})

test('the same seed plays the same game; another seed plays another', () => {
  const a = play('coconut', 4, 'one'), b = play('coconut', 4, 'one'), c = play('coconut', 4, 'two')
  assert.deepEqual(a.log.end, b.log.end)
  assert.notDeepEqual(a.log.end, c.log.end)
})

test('input is one of nine moves; anything else is refused', () => {
  for (const good of [0, 4, 8]) assert.equal(lite.parseInput(good), good)
  for (const bad of [-1, 9, 1.5, '4', null, [1], { x: 1 }]) assert.throws(() => lite.parseInput(bad))
  assert.equal(lite.idle(), 4)
})

test('a goal game: the first to reach the goal wins; a forfeit leaves the others', () => {
  const run = play('danfo', 2, 'goal')
  assert.equal(run.outcome.reason, 'first-to-goal')
  const state = lite.start(3, makeRng('f'), { game: 'coconut' }) as LiteState
  lite.forfeit(state, 0); lite.forfeit(state, 1)
  assert.deepEqual(lite.outcome(state)?.winners, [2])
})

test('an imported game is playable by its id once registered, and gone once forgotten; an unknown id plays the first example', () => {
  const def = readLite({ ...LITE_EXAMPLES[0]!.def, title: 'My Game' }).def!
  registerLite('labcdefgh', def)
  assert.equal(liteDef('labcdefgh')?.title, 'My Game')
  assert.ok(lite.options.game.values.includes('labcdefgh'))
  assert.equal((lite.start(2, makeRng('x'), { game: 'labcdefgh' }) as LiteState).options.game, 'labcdefgh')
  forgetLite('labcdefgh')
  assert.equal(liteDef('labcdefgh'), null)
  assert.equal((lite.start(2, makeRng('x'), { game: 'labcdefgh' }) as LiteState).options.game, 'coconut')
  registerLite('../../etc', def)
  assert.equal(liteDef('../../etc'), null, 'ids are checked')
})

test('the schema refuses what the engine cannot play, in words', () => {
  const ok = LITE_EXAMPLES[0]!.def
  const cases: [unknown, RegExp][] = [
    [null, /one JSON object/], [{ ...ok, schema: 'other' }, /schema/], [{ ...ok, title: '<script>' }, /title/], [{ ...ok, hz: 60 }, /hz/],
    [{ ...ok, seats: { min: 3, max: 2 } }, /seats.max/], [{ ...ok, arena: { w: 5000, h: 100 } }, /arena.w/], [{ ...ok, controls: 'mouse' }, /controls/],
    [{ ...ok, entities: [] }, /entities/], [{ ...ok, entities: Array.from({ length: 9 }, (_, i) => ({ ...ok.entities[0], id: `e${i}` })) }, /entities/],
    [{ ...ok, entities: [{ ...ok.entities[0], behaviour: 'teleport' }] }, /behaviour/], [{ ...ok, entities: [{ ...ok.entities[0], speed: 99 }] }, /speed/],
    [{ ...ok, entities: [ok.entities[0]], rules: { win: 'most-points' } }, /pickup/], [{ ...ok, rules: { win: 'first-to-goal' } }, /goal/], [{ ...ok, palette: { bg: 'red' } }, /palette/],
    [{ ...ok, entities: [{ ...ok.entities[0], label: 'visit www.x.com' }] }, /label/], [{ ...ok, title: 'x'.repeat(41) }, /title/],
  ]
  for (const [value, words] of cases) {
    const problems = validateLite(value)
    assert.ok(problems.length > 0, JSON.stringify(value).slice(0, 80))
    assert.match(problems.join(' '), words)
  }
})
