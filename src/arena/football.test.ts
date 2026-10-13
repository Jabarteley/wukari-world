// OWNER: games (real-time) — the football rules stepped tick by tick with scripted inputs. No clock, no sockets.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../game/util.ts'
import football, { BTN, EV, GOAL_Y1, GOAL_Y2, H, HZ, KICKOFF_FIRST, PHASE, PICK, W, dirCode, packInput, heldMask } from './football.ts'
import type { FootballInput, FootballState } from './football.ts'
import { ArenaInputError } from './rules.ts'
import { ARENA_GAMES, arenaGame } from './registry.ts'

const idle: FootballInput = { h: 0, e: 0 }
const E = 1, SE = 4 /* heading codes: east is 1, south is 7, west 13 */
const WEST = 13, SOUTH = 7
const begin = (options: Record<string, unknown> = {}, seats = 2): FootballState => football.start(seats, makeRng('t'), { seconds: 60, ending: 1, side: 1, ...options } as never)
const rng = makeRng(1)
const tick = (s: FootballState, a: FootballInput = idle, b: FootballInput = idle, n = 1): void => { for (let i = 0; i < n; i++) football.step(s, [a, b], rng) }
function toPlay(s: FootballState): FootballState { tick(s, idle, idle, KICKOFF_FIRST); assert.equal(s.phase, PHASE.play); return s }

test('registry exposes football', () => {
  assert.equal(arenaGame('football'), football)
  assert.ok('football' in ARENA_GAMES)
  assert.deepEqual(football.seats, { min: 2, max: 4 })
})

test('input parsing is strict, packs and latches edges', () => {
  assert.deepEqual(football.parseInput(packInput(E, true)), { h: E | BTN.chg, e: 0 })
  assert.deepEqual(football.parseInput(packInput(0, false, BTN.kick | BTN.tackle)), { h: 0, e: BTN.kick | BTN.tackle })
  assert.equal(heldMask(E, true), E | BTN.chg)
  for (const bad of [-1, 256, 1.5, '3', null, undefined, {}, NaN, 25, 31]) assert.throws(() => football.parseInput(bad), ArenaInputError)
  let held = football.reduce!(football.idle(), { h: E, e: BTN.kick })
  held = football.reduce!(held, { h: 0, e: 0 })
  assert.deepEqual(held, { h: 0, e: BTN.kick })
  assert.deepEqual(football.settle!(held), { h: 0, e: 0 })
  assert.equal(dirCode(10, 0), 1); assert.equal(dirCode(0, 10), 7); assert.equal(dirCode(-10, 0), 13); assert.equal(dirCode(0, 0), 0); assert.equal(dirCode(1, 1, 5), 0)
})

test('kick-off: a countdown with everyone frozen, then play from the centre', () => {
  const s = begin()
  const start = s.pl.map((p) => [p.x, p.y])
  tick(s, { h: E, e: 0 }, { h: WEST, e: 0 }, KICKOFF_FIRST - 1)
  assert.equal(s.phase, PHASE.kickoff)
  assert.deepEqual(s.pl.map((p) => [p.x, p.y]), start, 'nobody moves during the countdown')
  assert.deepEqual([s.ball.x, s.ball.y], [W / 2, H / 2])
  tick(s)
  assert.equal(s.phase, PHASE.play)
  assert.ok((football.snapshot(s) as { c: number }).c === 0)
})

test('a player runs, is stopped by the boards, and the clock counts down', () => {
  const s = toPlay(begin())
  const c0 = s.clock
  tick(s, { h: WEST, e: 0 }, idle, 80)
  assert.equal(s.pl[0]!.x, 15)
  assert.equal(s.clock, c0 - 80)
})

test('dribble: the ball sticks to the closest player and follows him', () => {
  const s = toPlay(begin())
  const p = s.pl[0]!
  p.x = 300; p.y = 270; p.d = 0
  s.ball.x = 320; s.ball.y = 270; s.ball.vx = 0; s.ball.vy = 0
  tick(s)
  assert.equal(s.ball.o, 0, 'taken')
  tick(s, { h: E, e: 0 }, idle, 25)
  assert.equal(s.ball.o, 0, 'still his after running')
  assert.ok(s.ball.x > p.x && s.ball.x - p.x < 40)
  assert.ok(p.x > 330)
  // Turning round carries it with him.
  tick(s, { h: WEST, e: 0 }, idle, 12)
  assert.equal(s.ball.o, 0)
  assert.ok(s.ball.x < p.x + 1)
})

test('a tap passes, a held shot is faster; neither can be taken off the ball by a mere touch', () => {
  const pass = toPlay(begin())
  Object.assign(pass.pl[0]!, { x: 300, y: 270, d: 0 }); Object.assign(pass.ball, { x: 320, y: 270, vx: 0, vy: 0 })
  tick(pass); assert.equal(pass.ball.o, 0)
  tick(pass, { h: 0, e: BTN.kick })
  assert.equal(pass.ball.o, -1); const ps = Math.hypot(pass.ball.vx, pass.ball.vy)
  assert.ok(ps >= 11 && ps < 14, 'pass ' + ps)
  const shot = toPlay(begin())
  Object.assign(shot.pl[0]!, { x: 300, y: 270, d: 0 }); Object.assign(shot.ball, { x: 320, y: 270, vx: 0, vy: 0 })
  tick(shot); tick(shot, { h: BTN.chg, e: 0 }, idle, 16)
  assert.ok(shot.pl[0]!.chg >= 16)
  tick(shot, { h: 0, e: BTN.kick })
  const ss = Math.hypot(shot.ball.vx, shot.ball.vy)
  assert.ok(ss > 28, 'shot ' + ss)
  // the kicker does not re-take his own ball at once
  tick(shot, idle, idle, 3); assert.equal(shot.ball.o, -1)
})

test('a pass finds a team-mate in front', () => {
  const s = toPlay(begin({ side: 2 }))
  assert.equal(s.pl.length, 4)
  Object.assign(s.pl[0]!, { x: 300, y: 270, d: 0 }); Object.assign(s.pl[2]!, { x: 560, y: 330, d: 0, vx: 0, vy: 0 }); Object.assign(s.ball, { x: 320, y: 270, vx: 0, vy: 0 })
  tick(s); tick(s, { h: 0, e: BTN.kick })
  assert.ok(s.ball.vy > 1, 'aimed at the team-mate, a little downfield: ' + s.ball.vy)
})

test('ball friction and board bounce', () => {
  const s = toPlay(begin())
  Object.assign(s.ball, { x: 450, y: 14, vx: 0, vy: -20, o: -1 })
  tick(s); assert.ok(s.ball.vy > 0, 'bounced off the top board')
  const sp = Math.hypot(s.ball.vx, s.ball.vy)
  tick(s, idle, idle, 10); assert.ok(Math.hypot(s.ball.vx, s.ball.vy) < sp, 'slows')
  tick(s, idle, idle, 400); assert.equal(Math.hypot(s.ball.vx, s.ball.vy), 0, 'comes to rest')
})

test('a shot into the net is a goal: celebration, then a kick-off by the other side', () => {
  const s = toPlay(begin())
  Object.assign(s.pl[0]!, { x: 100, y: 60 }); Object.assign(s.pl[1]!, { x: 700, y: 480 })
  s.ky = [60, 60]
  Object.assign(s.ball, { x: W - 60, y: 300, vx: 24, vy: 0, o: -1 })
  s.last = 0
  const goals: number[][] = []
  for (let i = 0; i < 8 && s.phase === PHASE.play; i++) { tick(s); goals.push(...s.ev.filter((e) => e[0] === EV.goal)) }
  assert.equal(s.phase, PHASE.goal); assert.deepEqual(s.goals, [1, 0]); assert.equal(goals.length, 1)
  assert.equal((football.snapshot(s) as { s: number[] }).s[0], 0)
  const clock = s.clock
  tick(s, { h: E, e: 0 }, idle, 69)
  assert.equal(s.clock, clock, 'the clock is stopped while they celebrate')
  tick(s)
  assert.equal(s.phase, PHASE.kickoff); assert.equal(s.kickTeam, 1)
  assert.deepEqual([s.ball.x, s.ball.y, s.ball.o], [W / 2, H / 2, -1])
  assert.equal(s.pl[1]!.x > W / 2 - 60 && s.pl[1]!.x < W / 2, false)
  assert.ok(s.pl[1]!.x > W / 2 - 1 + 0 || Math.abs(s.pl[1]!.x - (W - (W * 0.5 - 38))) < 1, 'team 1 kicks off from the centre')
})

test('a ball that hits the post bounces, and the posts and a miss are not goals', () => {
  const s = toPlay(begin())
  s.ky = [60, 60]; Object.assign(s.pl[0]!, { x: 100, y: 60 }); Object.assign(s.pl[1]!, { x: 700, y: 480 })
  Object.assign(s.ball, { x: 60, y: GOAL_Y1, vx: -20, vy: 0, o: -1 })
  const evs: number[] = []
  for (let i = 0; i < 6; i++) { tick(s); evs.push(...s.ev.map((e) => e[0] as number)) }
  assert.ok(evs.includes(EV.post), 'post sound')
  assert.deepEqual(s.goals, [0, 0]); assert.equal(s.phase, PHASE.play)
  // wide of the posts: the end board
  Object.assign(s.ball, { x: 60, y: GOAL_Y1 - 40, vx: -20, vy: 0, o: -1 })
  tick(s, idle, idle, 6); assert.deepEqual(s.goals, [0, 0]); assert.ok(s.ball.vx >= 0)
})

test('the keeper saves a shot at him, but not one into the corner he cannot reach', () => {
  const save = toPlay(begin())
  Object.assign(save.pl[0]!, { x: 100, y: 60 }); Object.assign(save.pl[1]!, { x: 700, y: 480 })
  save.ky = [H / 2, H / 2]
  Object.assign(save.ball, { x: 400, y: 270, vx: 28, vy: 0, o: -1 })
  const kinds: number[] = []
  for (let i = 0; i < 30; i++) { tick(save); kinds.push(...save.ev.map((e) => e[0] as number)) }
  assert.ok(kinds.includes(EV.save)); assert.deepEqual(save.goals, [0, 0])
  const miss = toPlay(begin())
  Object.assign(miss.pl[0]!, { x: 100, y: 60 }); Object.assign(miss.pl[1]!, { x: 700, y: 480 })
  miss.ky = [H / 2, GOAL_Y2 - 8]
  Object.assign(miss.ball, { x: W - 140, y: GOAL_Y1 + 10, vx: 28, vy: 0, o: -1 })
  for (let i = 0; i < 6; i++) tick(miss)
  assert.deepEqual(miss.goals, [1, 0])
})

test('slide tackle: wins the ball from a carrier, has a cooldown, and a miss costs recovery time', () => {
  const s = toPlay(begin())
  Object.assign(s.pl[0]!, { x: 400, y: 270, d: 0 }); Object.assign(s.pl[1]!, { x: 440, y: 270, d: 12 })
  Object.assign(s.ball, { x: 412, y: 270, vx: 0, vy: 0, o: 1 })
  s.pl[1]!.touch = 0; s.last = 1
  tick(s, { h: E, e: BTN.tackle }, idle)
  assert.ok(s.pl[0]!.slide > 0 || s.ball.o === 0)
  tick(s, { h: E, e: 0 }, idle, 3)
  assert.equal(s.ball.o, 0, 'the tackler has the ball')
  assert.ok(s.pl[1]!.stun > 0, 'the victim is stunned')
  assert.ok(s.pl[0]!.cd > 0)
  const cd = s.pl[0]!.cd
  tick(s, { h: 0, e: BTN.tackle }, idle)
  assert.ok(s.pl[0]!.cd < cd, 'a second tackle during the cooldown does nothing new')
  // a miss: nothing to win, then the slider is stunned
  const m = toPlay(begin())
  Object.assign(m.pl[0]!, { x: 200, y: 100, d: 0 }); Object.assign(m.pl[1]!, { x: 700, y: 480 })
  tick(m, { h: E, e: BTN.tackle }, idle)
  assert.ok(m.pl[0]!.slide > 0)
  tick(m, idle, idle, 9)
  assert.ok(m.pl[0]!.stun > 0 || m.pl[0]!.cd > 20)
  assert.equal(m.ball.o, -1)
})

test('a goal at the last second is counted; level at full time: golden goal decides, or a draw', () => {
  const draw = begin({ seconds: 60, ending: 2 }); toPlay(draw); draw.clock = 3
  tick(draw, idle, idle, 3)
  assert.equal(draw.phase, PHASE.over)
  assert.equal(football.outcome(draw)!.draw, true); assert.deepEqual(football.outcome(draw)!.scores, [0, 0])
  const gg = begin({ ending: 1 }); toPlay(gg); gg.clock = 2
  tick(gg, idle, idle, 2)
  assert.equal(gg.phase, PHASE.play); assert.equal(gg.ot, true); assert.equal(football.outcome(gg), null)
  assert.equal((football.snapshot(gg) as { q: number }).q, 1)
  s_golden(gg)
  const lead = begin(); toPlay(lead); lead.goals = [1, 0]; lead.clock = 1; tick(lead)
  assert.equal(lead.phase, PHASE.over); assert.deepEqual(football.outcome(lead)!.winners, [0]); assert.match(football.outcome(lead)!.text, /\{0\} wins 1-0/)
  // overtime that never produces a goal is a draw
  const long = begin(); toPlay(long); long.ot = true; long.clock = 0; tick(long, idle, idle, 60 * HZ)
  assert.equal(long.phase, PHASE.over); assert.equal(football.outcome(long)!.draw, true)
})
function s_golden(s: FootballState): void {
  s.pl[0]!.x = 100; s.pl[0]!.y = 60; s.pl[1]!.x = 700; s.pl[1]!.y = 480; s.ky = [60, 60]
  Object.assign(s.ball, { x: W - 60, y: 270, vx: 24, vy: 0, o: -1 }); s.last = 0
  tick(s, idle, idle, 6); assert.equal(s.phase, PHASE.goal)
  tick(s, idle, idle, 70)
  assert.equal(s.phase, PHASE.over, 'a golden goal ends the match after the celebration')
  assert.deepEqual(football.outcome(s)!.winners, [0]); assert.equal(football.outcome(s)!.reason, 'golden')
}

test('forfeit: the other side wins at once', () => {
  const s = toPlay(begin()); football.forfeit(s, 0)
  const o = football.outcome(s)!
  assert.deepEqual(o.winners, [1]); assert.equal(o.reason, 'forfeit')
})

test('four seats: teams by seat parity, a true 2v2; three seats get an AI fourth', () => {
  const four = begin({}, 4); assert.equal(four.pl.length, 4)
  const t4 = football.outcome({ ...four, phase: PHASE.over, goals: [2, 1] } as FootballState)!
  assert.deepEqual(t4.winners, [0, 2]); assert.deepEqual(t4.scores, [2, 1, 2, 1])
  const three = begin({ side: 1 }, 3); assert.equal(three.pl.length, 4)
  toPlay(three); football.step(three, [idle, idle, idle], rng)
  assert.equal(three.pl.length, 4)
})

test('determinism: the same inputs and seed give the same match', () => {
  const run = (): string => {
    const r = makeRng('d'); const s = begin(); const bot = (i: number): FootballInput => football.bot(s, i, r)
    for (let i = 0; i < 1200; i++) football.step(s, [bot(0), bot(1)], r)
    return JSON.stringify(football.snapshot(s))
  }
  assert.equal(run(), run())
})

test('the bot scores against a player who stands still, and the match then ends with the bot ahead', () => {
  let wins = 0
  for (const seed of ['a', 'b', 'c', 'd']) {
    const r = makeRng(seed); const s = begin({ seconds: 120, ending: 2 })
    for (let i = 0; i < 9000 && football.outcome(s) === null; i++) football.step(s, [idle, football.bot(s, 1, r)], r)
    assert.ok(football.outcome(s), 'the match ends')
    if (s.goals[1] > 0) wins += 1
    assert.equal(s.goals[0], 0)
  }
  assert.ok(wins >= 3, `the bot scored in ${wins} of 4 matches`)
})

test('a human who dribbles and shoots can score, and the keeper stops some (balance)', () => {
  const r = makeRng('shots'); let goals = 0
  const N = 60
  for (let n = 0; n < N; n++) {
    const s = toPlay(begin())
    const x = 480 + r() * 200, y = 90 + r() * 360
    Object.assign(s.pl[0]!, { x, y, d: 0 }); Object.assign(s.pl[1]!, { x: 100, y: 500 }); Object.assign(s.ball, { x: x + 20, y, vx: 0, vy: 0, o: -1 })
    const h = dirCode(W - x, H / 2 - y)
    tick(s, { h, e: 0 }, idle); assert.equal(s.ball.o, 0)
    tick(s, { h: h | BTN.chg, e: 0 }, idle, 6 + Math.floor(r() * 11))
    tick(s, { h, e: BTN.kick }, idle)
    for (let i = 0; i < 50 && s.phase === PHASE.play; i++) tick(s)
    if (s.goals[0]) goals += 1
  }
  assert.ok(goals >= N * 0.25 && goals <= N * 0.9, `goals ${goals} of ${N}`)
})

test('snapshots are small, and a standing match does not change', () => {
  const s = toPlay(begin({ side: 1 }))
  tick(s, idle, idle)
  const a = JSON.stringify(football.snapshot(s))
  tick(s, idle, idle)
  assert.equal(JSON.stringify(football.snapshot(s)), a.replace(/"t":\d+/, (m) => m), 'identical when nothing moved')
  const run = JSON.stringify(football.snapshot((() => { tick(s, { h: E, e: 0 }, { h: WEST, e: 0 }, 5); return s })()))
  assert.ok(run.length < 300, 'snapshot ' + run.length)
  assert.ok(PICK > 0 && SOUTH > 0 && SE > 0)
})
