// OWNER: games (real-time) — Coconut Dodge, the template game (./coconut.ts): the same contract checks src/arena/cartridge.test.ts
// applies to the live games, plus bots finishing, forfeits, an exact replay and a valid cartridge entry. Copy it with the game.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../../game/util.ts'
import { ArenaInputError } from '../rules.ts'
import { ReplayRecorder, replayMatch } from '../replay.ts'
import { CARTRIDGE_CONTRACT, defineCartridge, validateCartridge } from '../cartridge.ts'
import coconut, { H, LIVES, MAX_TICKS, placesOf } from './coconut.ts'
import type { CoconutInput, CoconutState } from './coconut.ts'

const rules = coconut
const begin = (seats: number, speed = 2): CoconutState => rules.start(seats, makeRng('c' + seats), { speed })

/** Bots play every seat until the end (or `cap` ticks). */
function playBots(seed: string, seats: number, cap = MAX_TICKS + 10): { state: CoconutState; ticks: number; snaps: string[] } {
  const rng = makeRng(seed)
  const state = rules.start(seats, rng, { speed: 2 })
  const snaps: string[] = []
  let ticks = 0
  while (!rules.outcome(state) && ticks < cap) {
    rules.step(state, state.players.map((_, i) => rules.bot(state, i, rng)), rng)
    snaps.push(JSON.stringify(rules.snapshot(state))); ticks += 1
  }
  return { state, ticks, snaps }
}

test('idle and parseInput: only -1, 0 or 1, and junk of any size is refused', () => {
  assert.equal(rules.idle(), 0)
  for (const ok of [-1, 0, 1] as const) assert.equal(rules.parseInput(ok), ok)
  for (const bad of [2, -2, 0.5, '1', null, undefined, {}, [], NaN, { nonsense: 'x'.repeat(5000) }]) assert.throws(() => rules.parseInput(bad), ArenaInputError)
})

test('the contract numbers: id, hz, seats, options', () => {
  assert.match(rules.id, /^[a-z]{2,16}$/)
  assert.ok(Number.isInteger(rules.hz) && rules.hz >= 1 && rules.hz <= 30)
  assert.deepEqual(rules.seats, { min: 2, max: 4 })
  assert.equal(rules.start(2, makeRng(1), { speed: 99 } as never).options.speed, 2, 'an unknown option value falls back to the default')
})

test('a bot for every seat, deterministic steps with the same seed, snapshots under 300 bytes at max seats', () => {
  for (const seats of [rules.seats.min, rules.seats.max]) {
    const a = playBots('contract-' + seats, seats).snaps, b = playBots('contract-' + seats, seats).snaps
    assert.deepEqual(a, b, 'deterministic')
    for (let seat = 0; seat < seats; seat++) assert.ok([-1, 0, 1].includes(rules.bot(begin(seats), seat, makeRng(seat))), 'bot for seat ' + seat)
  }
  // Every snapshot of a 4-seat match, and the biggest one there can be: late, a full sky, three-digit numbers.
  const full = begin(4); full.tick = MAX_TICKS - 1; full.nuts = Array.from({ length: 20 }, (_, k) => (k % 2 ? H - 1 : 117))
  const sizes = [...playBots('size', 4).snaps.map((x) => x.length), JSON.stringify(rules.snapshot(full)).length]
  assert.ok(Math.max(...sizes) <= 300, 'snapshot ' + Math.max(...sizes) + ' bytes')
})

test('a coconut that lands on a player costs a life; three and they are out; the last one standing wins', () => {
  const s = begin(2)
  const x = s.players[0]!.x
  for (let life = LIVES; life > 0; life--) {
    s.nuts = [x, H - 1]
    rules.step(s, [0, 0], makeRng(1))
    assert.equal(s.players[0]!.lives, life - 1)
  }
  const out = rules.outcome(s)!
  assert.deepEqual(out.winners, [1]); assert.deepEqual(out.places, [2, 1]); assert.equal(out.reason, 'last'); assert.equal(out.draw, false)
})

test('bots finish a game alone, within the hard end, at 2 and 4 seats', () => {
  for (const seats of [2, 3, 4]) {
    const { state, ticks } = playBots('alone-' + seats, seats)
    const out = rules.outcome(state)
    assert.ok(out, `${seats} seats: a result after ${ticks} ticks`)
    assert.ok(ticks <= MAX_TICKS)
    assert.equal(out.places!.length, seats)
    assert.ok(out.winners.every((w) => out.places![w] === 1))
  }
})

test('forfeit: the others win; with three, the game goes on until one is left', () => {
  const two = begin(2)
  rules.forfeit(two, 0)
  const out = rules.outcome(two)!
  assert.deepEqual(out.winners, [1]); assert.equal(out.reason, 'forfeit'); assert.deepEqual(out.places, [2, 1])
  const three = begin(3)
  rules.forfeit(three, 1)
  assert.equal(rules.outcome(three), null)
  rules.forfeit(three, 2)
  assert.deepEqual(rules.outcome(three)!.winners, [0])
  assert.deepEqual(placesOf(three), [1, 2, 2])
})

test('a recorded match (a person, two bots, one forfeit) replays to the same snapshots and outcome', () => {
  const seed = 'replay-coconut', options = { speed: 2 }
  const seats = [{ name: 'P0', bot: false }, { name: 'Bot 1', bot: true }, { name: 'Bot 2', bot: true }]
  const rng = makeRng(seed)
  const state = rules.start(seats.length, rng, options)
  const rec = new ReplayRecorder({ game: 'coconut', rev: 1, hz: rules.hz, seed, options, seats }, JSON.stringify(rules.idle()))
  const snaps: unknown[] = [rules.snapshot(state)]
  let tick = 0
  while (!rules.outcome(state) && tick < MAX_TICKS + 10) {
    if (tick === 200) { rules.forfeit(state, 2); rec.forfeit(2) }
    // The person sways left and right; the bots decide for themselves (and are not recorded: the replay asks them again).
    const inputs = seats.map((s, i): CoconutInput => (s.bot ? rules.bot(state, i, rng) : tick % 40 < 20 ? -1 : 1))
    rec.tick(inputs, seats.map(() => false))
    rules.step(state, inputs, rng)
    snaps.push(rules.snapshot(state)); tick += 1
  }
  const outcome = rules.outcome(state)!
  const log = rec.finish({ ...outcome }, rules.snapshot(state), seats.map((s) => s.name))
  const out = replayMatch(rules, log)
  assert.equal(out.verified, true, out.problem)
  assert.deepEqual([out.start, ...out.snaps], snaps, 'every snapshot, tick for tick')
  assert.deepEqual(log.result.winners, outcome.winners)
  assert.ok(JSON.stringify(log).length < 24000, 'the log is kept: ' + JSON.stringify(log).length + ' bytes')
})

test('a cartridge entry for it passes validateCartridge', () => {
  const entry = defineCartridge({
    contract: CARTRIDGE_CONTRACT, id: rules.id, name: rules.label, blurb: 'Dodge the falling coconuts. Last one standing wins.', rev: 1,
    venues: ['arcade', 'square'],
    modes: { alone: 'live', friends: 'live', community: 'planned', matchmaking: 'planned', agents: 'planned' },
    reads: ['identity'], writes: ['result', 'replay'],
    manifest: { entry: 'CoconutGame', assets: [] },
  })
  assert.deepEqual(validateCartridge(entry), [])
  assert.equal(entry.id, rules.id); assert.equal(entry.name, rules.label)
})
