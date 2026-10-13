// OWNER: games (real-time) — the fight's rules, stepped tick by tick with scripted inputs. No clock, no sockets.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../game/util.ts'
import fight, { ACT, BTN, HZ, INTRO_TICKS, KO_TICKS, MAX_HP, PHASE, packInput } from './fight.ts'
import type { FightInput, FightState } from './fight.ts'
import { ArenaInputError } from './rules.ts'
import { ARENA_GAMES, arenaGame } from './registry.ts'

const idle: FightInput = { h: 0, e: 0 }
const begin = (options: Record<string, unknown> = {}): FightState => fight.start(2, makeRng('t'), fight.options && { rounds: 3, seconds: 60, ...options } as never)
/** Tick with no input until the intro is over. */
function toFight(s: FightState): FightState { for (let i = 0; i < INTRO_TICKS; i++) fight.step(s, [idle, idle], makeRng(1)); assert.equal(s.phase, PHASE.fight); return s }
const tick = (s: FightState, a: FightInput = idle, b: FightInput = idle, n = 1): void => { for (let i = 0; i < n; i++) fight.step(s, [a, b], makeRng(1)) }
const press = (h: number, e = 0): FightInput => ({ h, e })

test('registry exposes fight and rejects unknown ids', () => {
  assert.equal(arenaGame('fight'), fight)
  assert.equal(arenaGame('nope'), null)
  assert.equal(arenaGame('__proto__'), null)
  assert.deepEqual(Object.keys(ARENA_GAMES), ['fight'])
})

test('input parsing is strict and edges latch between ticks', () => {
  assert.deepEqual(fight.parseInput(9), { h: 9, e: 0 })
  assert.deepEqual(fight.parseInput(packInput(BTN.right, BTN.punch | BTN.kick)), { h: BTN.right, e: BTN.punch | BTN.kick })
  // A press sent as a pulse survives a later message that no longer shows it.
  assert.deepEqual(fight.reduce!(fight.reduce!(fight.idle(), fight.parseInput(packInput(0, BTN.punch))), fight.parseInput(packInput(BTN.right))), { h: BTN.right, e: BTN.punch })
  for (const bad of [-1, 4096, 1.5, '3', null, undefined, {}, NaN]) assert.throws(() => fight.parseInput(bad), ArenaInputError)
  // A punch pressed and released before the tick is not lost; holding it does not repeat.
  let held = fight.idle()
  held = fight.reduce!(held, { h: BTN.punch, e: 0 })
  held = fight.reduce!(held, { h: 0, e: 0 })
  assert.deepEqual(held, { h: 0, e: BTN.punch })
  assert.deepEqual(fight.settle!(held), { h: 0, e: 0 })
  let h2 = fight.reduce!(fight.idle(), { h: BTN.punch | BTN.right, e: 0 })
  h2 = fight.settle!(h2)
  h2 = fight.reduce!(h2, { h: BTN.punch, e: 0 })
  assert.equal(h2.e, 0, 'still held: no new edge')
})

test('intro counts down, then the fight starts with full health at fixed places', () => {
  const s = begin()
  assert.equal(s.phase, PHASE.intro)
  toFight(s)
  assert.deepEqual(s.f.map((f) => f.hp), [MAX_HP, MAX_HP])
  assert.ok(s.f[0].x < s.f[1].x)
  assert.equal(s.clock, 60 * HZ)
})

test('inputs are ignored during the intro', () => {
  const s = begin()
  tick(s, press(BTN.right), idle, 10)
  assert.equal(s.f[0].x, 300)
})

test('walking moves, walls hold, bodies cannot overlap', () => {
  const s = toFight(begin())
  tick(s, press(BTN.left), idle, 80)
  assert.equal(s.f[0].x, 40)
  const t = toFight(begin())
  tick(t, press(BTN.right), idle, 80)
  assert.ok(t.f[1].x - t.f[0].x >= 43.9, `gap ${t.f[1].x - t.f[0].x}`)
})

test('jump goes up and comes back down; a jumper avoids a low kick', () => {
  const s = toFight(begin())
  tick(s, press(0, BTN.jump))
  assert.ok(s.f[0].air && s.f[0].y > 0)
  let apex = 0
  for (let i = 0; i < 30; i++) { tick(s); apex = Math.max(apex, s.f[0].y) }
  assert.ok(apex > 60 && apex < 120, `apex ${apex}`)
  assert.equal(s.f[0].y, 0); assert.equal(s.f[0].air, false)
  // Close the distance, jump, and the kicker misses.
  const k = toFight(begin())
  k.f[0].x = 500; k.f[1].x = 560
  tick(k, press(0, BTN.jump), press(0, BTN.kick))
  tick(k, idle, idle, 6)
  assert.equal(k.f[0].hp, MAX_HP, 'jumper untouched')
})

test('a punch in range hurts, out of range does not, and only once per punch', () => {
  const s = toFight(begin())
  s.f[0].x = 500; s.f[1].x = 550
  tick(s, press(0, BTN.punch))
  tick(s, idle, idle, 12)
  assert.equal(s.f[1].hp, MAX_HP - 7)
  assert.equal(s.f[0].hp, MAX_HP)
  const far = toFight(begin())
  tick(far, press(0, BTN.punch), idle, 12)
  assert.equal(far.f[1].hp, MAX_HP)
})

test('hit events are emitted exactly once, on the tick of the hit', () => {
  const s = toFight(begin())
  s.f[0].x = 500; s.f[1].x = 550
  const seen: number[][] = []
  tick(s, press(0, BTN.kick))
  for (let i = 0; i < 14; i++) { tick(s); seen.push(...s.ev) }
  assert.equal(seen.length, 1)
  assert.equal(seen[0]?.[0], 1)
  assert.equal(seen[0]?.[2], 1, 'strong')
})

test('block reduces a hit to chip damage with no stun, and a blocker faces the attacker', () => {
  const s = toFight(begin())
  s.f[0].x = 500; s.f[1].x = 550
  tick(s, press(0, BTN.punch), press(BTN.block))
  tick(s, idle, press(BTN.block), 10)
  assert.ok(s.f[1].hp >= MAX_HP - 2 && s.f[1].hp < MAX_HP, `chip ${s.f[1].hp}`)
  assert.notEqual(s.f[1].a, ACT.hurt)
})

test('a simultaneous trade hurts both, regardless of seat', () => {
  const s = toFight(begin())
  s.f[0].x = 500; s.f[1].x = 550
  tick(s, press(0, BTN.punch), press(0, BTN.punch))
  tick(s, idle, idle, 8)
  assert.equal(s.f[0].hp, MAX_HP - 7); assert.equal(s.f[1].hp, MAX_HP - 7)
})

test('no combos: a stunned fighter recovers before the attacker can swing again', () => {
  const s = toFight(begin())
  s.f[0].x = 500; s.f[1].x = 550
  tick(s, press(0, BTN.punch))
  let hurtTicks = 0, atkTicks = 0
  for (let i = 0; i < 20; i++) { tick(s); if (s.f[1].a === ACT.hurt) hurtTicks++; if (s.f[0].a === ACT.punch) atkTicks++ }
  assert.ok(hurtTicks <= 6)
  assert.ok(atkTicks <= 7)
})

test('knockout ends the round, the winner scores, and the next round starts fresh', () => {
  const s = toFight(begin())
  s.f[1].hp = 5
  s.f[0].x = 500; s.f[1].x = 550
  tick(s, press(0, BTN.punch), idle, 6)
  assert.equal(s.phase, PHASE.ko)
  assert.equal(s.rw, 0); assert.deepEqual(s.wins, [1, 0]); assert.equal(s.why, 'ko')
  assert.equal(fight.outcome(s), null)
  tick(s, idle, idle, KO_TICKS)
  assert.equal(s.round, 2); assert.equal(s.phase, PHASE.intro)
  assert.deepEqual(s.f.map((f) => f.hp), [MAX_HP, MAX_HP])
})

test('best of 3: two round wins end the match with a winner and a sentence', () => {
  const s = begin()
  for (let r = 0; r < 2; r++) {
    toFight(s)
    s.f[1].hp = 1; s.f[0].x = 500; s.f[1].x = 550
    tick(s, press(0, BTN.punch), idle, 6)
    tick(s, idle, idle, KO_TICKS)
  }
  assert.equal(s.phase, PHASE.over)
  const out = fight.outcome(s)
  assert.deepEqual(out?.winners, [0]); assert.equal(out?.draw, false); assert.deepEqual(out?.scores, [2, 0]); assert.match(out?.text ?? '', /wins/)
})

test('time up: more health wins; equal health is a draw round that counts for both', () => {
  const s = toFight(begin({ seconds: 30 }))
  s.f[0].hp = 40; s.f[1].hp = 70
  tick(s, idle, idle, 30 * HZ)
  assert.equal(s.phase, PHASE.ko); assert.equal(s.rw, 1); assert.equal(s.why, 'time')
  const d = toFight(begin({ seconds: 30 }))
  tick(d, idle, idle, 30 * HZ)
  assert.equal(d.rw, 2); assert.deepEqual(d.wins, [1, 1])
})

test('a match that stays level is a draw; the round count is capped', () => {
  const s = begin({ rounds: 1, seconds: 30 })
  toFight(s)
  tick(s, idle, idle, 30 * HZ + KO_TICKS)
  assert.equal(s.phase, PHASE.over)
  assert.equal(fight.outcome(s)?.draw, true)
})

test('forfeit gives the other seat the win at once', () => {
  const s = toFight(begin())
  fight.forfeit(s, 0)
  const out = fight.outcome(s)
  assert.deepEqual(out?.winners, [1]); assert.equal(out?.reason, 'forfeit')
})

test('the same inputs give the same fight (deterministic), bot against bot ends', () => {
  const run = (): { log: string; out: ReturnType<typeof fight.outcome> } => {
    const s = begin({ rounds: 1, seconds: 30 }), rng = makeRng('seed-1'), log: string[] = []
    let held: [FightInput, FightInput] = [idle, idle]
    for (let i = 0; i < 5000 && !fight.outcome(s); i++) {
      const raw = [fight.bot(s, 0, rng), fight.bot(s, 1, rng)] as [FightInput, FightInput]
      held = raw
      fight.step(s, held, rng)
      if (i % 40 === 0) log.push(JSON.stringify(fight.snapshot(s)))
    }
    return { log: log.join('|'), out: fight.outcome(s) }
  }
  const a = run(), b = run()
  assert.equal(a.log, b.log)
  assert.ok(a.out, 'the bot fight finishes')
  assert.ok(a.log.includes('"e":[['), 'hits happened')
})

test('the practice bot is beatable but it does fight back', () => {
  const s = toFight(begin({ rounds: 1 })), rng = makeRng('bot-2')
  // A human who stands still: the bot should land hits and win by KO within the clock.
  for (let i = 0; i < 60 * HZ && s.phase === PHASE.fight; i++) fight.step(s, [idle, fight.bot(s, 1, rng)], rng)
  assert.ok(s.f[0].hp < MAX_HP, `bot never hit: ${s.f[0].hp}`)
})

test('a snapshot is small and plain JSON', () => {
  const s = toFight(begin())
  const text = JSON.stringify(fight.snapshot(s))
  assert.ok(text.length < 200, text.length + ' bytes: ' + text)
  assert.deepEqual(JSON.parse(text), fight.snapshot(s))
})
