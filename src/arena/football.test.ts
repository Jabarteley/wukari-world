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

// ---- the penalty shoot-out ---------------------------------------------------------------------------------------

import { PEN_D, SO_AIM, SO_CAP, SO_FIRST, SO_LOCK, SO_OUT, SO_OVER_AT, SO_RESULT, SO_SET, SO_STAGE, aimOf, diveOf, flightLen, flightProgress, judgeKick, soWinner, swungAim } from './football.ts'
import type { FootballSnap } from './football.ts'

const so = (s: FootballState) => s.so!
/** A level match at the whistle with ending 3: the shoot-out begins. */
function toPens(seed = 'pens', extra: Record<string, unknown> = {}, seats = 2): FootballState {
  const s = toPlay(begin({ ending: 3, ...extra }, seats))
  s.clock = 1
  const r = makeRng(seed)
  football.step(s, [idle, idle], r)
  assert.equal(s.phase, PHASE.pens)
  return s
}
const toAim = (s: FootballState): void => { const r = makeRng('aim'); for (let i = 0; i < SO_SET; i++) football.step(s, [idle, idle], r); assert.equal(so(s).stage, SO_STAGE.aim) }
/** Heading codes: straight at goal is 1 (east) for team 0 and 13 (west) for team 1; 15 degrees to the camera's right is east + one step clockwise. */
const headFor = (team: number, degRight: number): number => dirCode(Math.cos(degRight * Math.PI / 180) * (team ? -1 : 1), Math.sin(degRight * Math.PI / 180) * (team ? -1 : 1))
interface Kick { aim: number; chg: number; dive: number; late?: boolean }
/** Play one whole kick with scripted inputs for the shooter and the keeper's seat; returns the state at the result stage. */
function takeKick(s: FootballState, k: Kick, r = rng): void {
  const team = so(s).team, shooter = so(s).shooter, keeper = so(s).keeper
  const inputs: FootballInput[] = s.pl.map(() => idle)
  const aimHead = headFor(team, k.aim)
  const diveHead = k.dive === 0 ? 0 : dirCode(0, k.dive * (team ? -1 : 1))
  while (so(s).stage === SO_STAGE.set) football.step(s, inputs, r)
  const set = (): void => { inputs[shooter] = idle; inputs[keeper] = idle }
  set()
  if (!k.late) inputs[keeper] = { h: diveHead, e: 0 }
  for (let i = 0; i < k.chg; i++) { inputs[shooter] = { h: aimHead | BTN.chg, e: 0 }; football.step(s, inputs, r) }
  inputs[shooter] = { h: aimHead, e: BTN.kick }
  football.step(s, inputs, r)
  assert.equal(so(s).stage, SO_STAGE.fly)
  inputs[shooter] = idle
  for (let i = 0; i < 60 && so(s).stage === SO_STAGE.fly; i++) {
    if (k.late && so(s).fly >= SO_LOCK - 1) inputs[keeper] = { h: diveHead, e: 0 }
    football.step(s, inputs, r)
  }
  assert.equal(so(s).stage, SO_STAGE.result)
}
/** Run a result stage out; the next kick (or the end) follows. */
function pastResult(s: FootballState): void { for (let i = 0; i < SO_RESULT; i++) football.step(s, s.pl.map(() => idle), rng) }

test('ending 3 is an option; 1 and 2 behave as before when the match is level', () => {
  assert.deepEqual(football.options.ending!.values, [1, 2, 3]); assert.equal(football.options.ending!.names![2], 'Penalties')
  assert.equal(begin({ ending: 3 }).options.ending, 3)
  const draw = toPlay(begin({ ending: 2 })); draw.clock = 1; tick(draw); assert.equal(draw.phase, PHASE.over); assert.equal(draw.so, null)
  const golden = toPlay(begin({ ending: 1 })); golden.clock = 1; tick(golden); assert.equal(golden.phase, PHASE.play); assert.equal(golden.ot, true)
  const ahead = toPlay(begin({ ending: 3 })); ahead.goals = [1, 0]; ahead.clock = 1; tick(ahead); assert.equal(ahead.phase, PHASE.over, 'a goal ahead needs no shoot-out'); assert.equal(ahead.so, null)
})

test('level at the whistle, penalties: nobody is where he was, the spot is set, the first team is drawn from the match numbers', () => {
  const s = toPens('one')
  const o = so(s)
  assert.equal(o.stage, SO_STAGE.set); assert.deepEqual(o.score, [0, 0]); assert.deepEqual(o.taken, [0, 0])
  assert.equal(o.shooter, o.team); assert.equal(o.keeper, 1 - o.team)
  assert.deepEqual([s.ball.x, s.ball.y], [o.team === 0 ? W - PEN_D : PEN_D, H / 2])
  assert.equal(football.outcome(s), null)
  const teams = new Set<number>()
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) teams.add(so(toPens(seed)).team)
  assert.equal(teams.size, 2, 'both teams go first in some matches')
  const snap = football.snapshot(s) as FootballSnap
  assert.equal(snap.p, PHASE.pens); assert.deepEqual(snap.o!.g, [0, 0]); assert.equal(snap.o!.t, o.team); assert.deepEqual(snap.o!.p, [o.shooter, o.keeper])
  assert.ok(JSON.stringify(snap).length < 360, 'a shoot-out snapshot is small: ' + JSON.stringify(snap).length)
})

test('the judging: a corner beats a wrong dive, a middle shot beats a full dive, power goes over, a full-power corner hits the post', () => {
  // aims: 0 centre, 25 near, 53 corner, 92 wide (what 0, 15, 30 and 45 degrees come to)
  assert.deepEqual([0, 15, 30, 45].map((d) => aimOf(0, dirCode(Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)) - 1)), [0, 25, 53, 92])
  assert.deepEqual([0, 15, 30, 45].map((d) => aimOf(1, dirCode(-Math.cos(d * Math.PI / 180), -Math.sin(d * Math.PI / 180)) - 1)), [0, 25, 53, 92], 'the other team shoots the other way and means the same')
  assert.equal(aimOf(0, 6), 159, 'a steep angle is clamped at 60 degrees, far wide')
  const J = judgeKick
  assert.equal(J(53, 8, -1, false), SO_OUT.goal, 'corner, keeper the wrong way')
  assert.equal(J(53, 8, 1, false), SO_OUT.saved, 'corner at modest power, keeper the right way and early')
  assert.equal(J(53, 12, 1, false), SO_OUT.goal, 'corner at more power beats even the right dive')
  assert.equal(J(53, 3, 1, true), SO_OUT.goal, 'a late dive is too short for a corner')
  assert.equal(J(25, 8, 1, false), SO_OUT.saved); assert.equal(J(25, 8, 1, true), SO_OUT.saved, 'a late dive still reaches a near shot at modest power')
  assert.equal(J(25, 16, 1, true), SO_OUT.goal, 'but not a hard one')
  assert.equal(J(0, 8, 1, false), SO_OUT.goal, 'a middle shot beats a full dive'); assert.equal(J(0, 8, -1, false), SO_OUT.goal)
  assert.equal(J(0, 8, 0, false), SO_OUT.saved, 'the keeper who stays takes the middle shot')
  assert.equal(J(0, 16, 0, false), SO_OUT.goal, 'a full-power shot beats the keeper who stays')
  assert.equal(J(25, 8, 0, false), SO_OUT.goal, 'a keeper who stays does not cover a near shot'); assert.equal(J(25, 2, 0, false), SO_OUT.saved, 'unless it is soft')
  assert.equal(J(0, SO_OVER_AT, 1, false), SO_OUT.over); assert.equal(J(53, SO_OVER_AT + 5, 0, true), SO_OUT.over)
  assert.equal(J(0, SO_OVER_AT - 1, 1, false), SO_OUT.goal, 'one tick under the limit is not over')
  assert.equal(J(92, 8, 0, false), SO_OUT.wide); assert.equal(J(159, 8, 1, false), SO_OUT.wide)
  assert.equal(swungAim(53, 16), 64); assert.equal(J(53, 16, -1, false), SO_OUT.post, 'a full-power corner clips the post'); assert.equal(J(53, 15, -1, false), SO_OUT.goal)
  assert.equal(diveOf(0, 7), 1); assert.equal(diveOf(0, 19), -1); assert.equal(diveOf(0, 1), 0); assert.equal(diveOf(0, 0), 0)
  assert.equal(diveOf(1, 7), -1, 'the other team shoots the other way: south is to the camera\'s left'); assert.equal(diveOf(1, 19), 1)
  assert.ok(flightLen(0) > flightLen(16) && flightLen(16) >= 9)
})

test('a scripted kick: aim, power and dive decide it, then the other team is next', () => {
  const s = toPens('kick'); toAim(s)
  const team = so(s).team, other = 1 - team
  takeKick(s, { aim: 30, chg: 8, dive: -1 }, makeRng('k'))
  assert.equal(so(s).out, SO_OUT.goal)
  assert.equal(so(s).score[team], 1); assert.equal(so(s).score[other], 0)
  assert.equal(football.snapshot(s).o!.r, SO_OUT.goal); assert.equal(football.snapshot(s).o!.m[team]![0], 1)
  pastResult(s)
  assert.equal(so(s).team, other); assert.equal(so(s).stage, SO_STAGE.set)
  assert.equal(so(s).taken[team], 1)
  takeKick(s, { aim: 15, chg: 6, dive: 1 }, makeRng('k2'))
  assert.equal(so(s).out, SO_OUT.saved); assert.equal(so(s).score[other], 0); assert.deepEqual(football.snapshot(s).o!.m[other], [2])
})

test('the keeper in the goal that is shot at moves to his dive, the other keeper stays', () => {
  for (const seed of ['ky1', 'ky2']) {
    const s = toPens(seed); toAim(s)
    const team = so(s).team, sg = team ? -1 : 1
    takeKick(s, { aim: 30, chg: 8, dive: 1 }, makeRng('ky'))
    assert.equal(s.ky[team], H / 2, 'the shooter\'s own keeper does not move')
    assert.ok(Math.abs(s.ky[1 - team]! - H / 2) > 20, 'the keeper at the goal shot at has dived: ' + s.ky[1 - team])
    assert.ok((s.ky[1 - team]! - H / 2) * sg > 0, 'to the camera\'s right, as he was told')
  }
})

test('events: kick on the strike, goal / save / miss / post on the result', () => {
  const cases: [Kick, number, number][] = [
    [{ aim: 30, chg: 8, dive: -1 }, EV.goal, 0], [{ aim: 15, chg: 6, dive: 1 }, EV.save, 0],
    [{ aim: 45, chg: 8, dive: 0 }, EV.miss, 1], [{ aim: 0, chg: SO_OVER_AT, dive: 0 }, EV.miss, 2], [{ aim: 30, chg: 16, dive: -1 }, EV.post, 0],
  ]
  for (const [k, code, extra] of cases) {
    const s = toPens('ev'); toAim(s)
    const r = makeRng('ev'); const seen: number[][] = []
    const team = so(s).team, shooter = so(s).shooter, keeper = so(s).keeper
    const aimHead = headFor(team, k.aim)
    const inputs = s.pl.map(() => idle)
    inputs[keeper] = { h: k.dive === 0 ? 0 : dirCode(0, k.dive * (team ? -1 : 1)), e: 0 }
    for (let i = 0; i < k.chg; i++) { inputs[shooter] = { h: aimHead | BTN.chg, e: 0 }; football.step(s, inputs, r); seen.push(...s.ev) }
    inputs[shooter] = { h: aimHead, e: BTN.kick }; football.step(s, inputs, r); seen.push(...s.ev)
    inputs[shooter] = idle
    for (let i = 0; i < 40 && so(s).stage === SO_STAGE.fly; i++) { football.step(s, inputs, r); seen.push(...s.ev) }
    assert.ok(seen.some((e) => e[0] === EV.kick), 'a kick event')
    const hit = seen.find((e) => e[0] === code)
    assert.ok(hit, `event ${code} for ${JSON.stringify(k)}: ${JSON.stringify(seen)}`)
    if (code === EV.miss) assert.equal(hit![3], extra)
  }
})

test('the keeper may hold for a late dive; a late dive saves a soft near shot but not a corner', () => {
  const near = toPens('late1'); toAim(near)
  takeKick(near, { aim: 15, chg: 5, dive: 1, late: true }, makeRng('l'))
  assert.equal(so(near).late, true); assert.equal(so(near).dive0, 0); assert.equal(so(near).dive, 1); assert.equal(so(near).out, SO_OUT.saved)
  const corner = toPens('late2'); toAim(corner)
  takeKick(corner, { aim: 30, chg: 5, dive: 1, late: true }, makeRng('l'))
  assert.equal(so(corner).out, SO_OUT.goal)
  // not named in time: the keeper who moves after the lock stays where he was
  const slow = toPens('late3'); toAim(slow)
  const r = makeRng('l'); const team = so(slow).team
  const ins = slow.pl.map(() => idle)
  ins[so(slow).shooter] = { h: headFor(team, 15), e: BTN.kick }
  football.step(slow, ins, r)
  ins[so(slow).shooter] = idle
  for (let i = 0; i < 30 && so(slow).stage === SO_STAGE.fly; i++) { if (so(slow).fly >= SO_LOCK + 1) ins[so(slow).keeper] = { h: dirCode(0, team ? -1 : 1), e: 0 }; football.step(slow, ins, r) }
  assert.equal(so(slow).dive, 0, 'after the lock the dive is not taken'); assert.equal(so(slow).out, SO_OUT.saved, 'a tap is soft: the keeper who stayed reaches it')
})

test('no kick in the time given: it is taken as it stands, a soft one straight at goal', () => {
  const s = toPens('idle'); toAim(s)
  const r = makeRng('x'); const ins = s.pl.map(() => idle)
  for (let i = 0; i < SO_AIM - 1; i++) football.step(s, ins, r)
  assert.equal(so(s).stage, SO_STAGE.aim)
  football.step(s, ins, r)
  assert.equal(so(s).stage, SO_STAGE.fly); assert.equal(so(s).aim, 0); assert.equal(so(s).chg, 0)
})

test('the ball flies along the aimed line, slower in the last ticks of the kick that decides it', () => {
  assert.ok(flightProgress(0, 10, 0) === 0 && flightProgress(10, 10, 0) === 1 && flightProgress(5, 10, 0) === 0.5)
  assert.equal(flightProgress(7, 10, 6), (6 + 0.5) / 10, 'half pace after the slow-motion tick')
  assert.equal(flightProgress(14, 10, 6), 1, 'and it is there after twice the remaining ticks')
  // 2-0 after three kicks each is open; the leader's fourth, scored, makes 3-0 with two left to the other side: out of reach
  const s = toPens('slow'); toAim(s)
  const team = so(s).team
  so(s).score[team] = 2; so(s).taken = [3, 3]
  takeKick(s, { aim: 30, chg: 8, dive: 0 }, makeRng('s'))
  assert.ok(so(s).slow >= SO_LOCK, 'slow-motion is on for the deciding kick: ' + so(s).slow)
  assert.equal(so(s).win, team)
  const plain = toPens('slow2'); toAim(plain)
  takeKick(plain, { aim: 30, chg: 8, dive: 0 }, makeRng('s'))
  assert.equal(so(plain).slow, 0, 'the first kick is not decisive')
})

test('the winner is known as soon as the other side cannot catch up', () => {
  assert.equal(soWinner([3, 0], [3, 3]), 0, '3-0 with two kicks left for the other side')
  assert.equal(soWinner([2, 0], [3, 3]), -1, '2-0 with two left: still catchable')
  assert.equal(soWinner([3, 2], [4, 3]), -1)
  assert.equal(soWinner([4, 2], [4, 3]), -1, '4-2, the trailer has two left to level it')
  assert.equal(soWinner([4, 1], [4, 3]), 0, '4-1 with two left: out of reach')
  assert.equal(soWinner([4, 3], [5, 5]), 0, 'all five taken: the leader wins')
  assert.equal(soWinner([4, 4], [5, 5]), -1, 'level: sudden death')
  assert.equal(soWinner([5, 4], [6, 5]), -1, 'sudden death: the first of a round scored, the other has yet to shoot')
  assert.equal(soWinner([5, 5], [6, 6]), -1, 'a round split nobody: another round')
  assert.equal(soWinner([6, 5], [6, 6]), 0, 'a round that split them')
  assert.equal(soWinner([5, 4], [5, 5]), 0)
  assert.equal(soWinner([9, 9], [10, 10]), 2, 'level after ten each is a draw')
  assert.equal(soWinner([9, 8], [10, 10]), 0)
  assert.equal(soWinner([9, 9], [10, 9]), -1)
  assert.equal(SO_FIRST, 5); assert.equal(SO_CAP, 10)
})

/** Play kicks scripted by `plan(kickIndex, team)`: `true` scores (a corner the keeper does not cover), `false` misses wide. Ends when the shoot-out does. */
function playOut(s: FootballState, plan: (n: number, team: number) => boolean, r = makeRng('plan')): number {
  let n = 0
  for (let guard = 0; guard < 80 && s.phase === PHASE.pens; guard++) {
    const team = so(s).team, scores = plan(n, team)
    takeKick(s, { aim: scores ? 30 : 45, chg: 8, dive: 0 }, r)
    assert.equal(so(s).out, scores ? SO_OUT.goal : SO_OUT.wide)
    n += 1
    for (let i = 0; i < SO_RESULT && s.phase === PHASE.pens; i++) football.step(s, s.pl.map(() => idle), r)
  }
  return n
}

test('a whole shoot-out: five each, alternating, the winner ends it early or after the fifth', () => {
  const s = toPens('full'); const first = so(s).team
  // team `first` scores every time, the other never: 3-0 after three each leaves the other two kicks, and 3 is more than 0 + 2
  const order: number[] = []
  const kicks = playOut(s, (n, team) => { order.push(team); return team === first })
  assert.equal(s.phase, PHASE.over)
  assert.deepEqual(order.slice(0, 4), [first, 1 - first, first, 1 - first], 'they alternate')
  assert.equal(kicks, 6, 'three each')
  const out = football.outcome(s)!
  assert.deepEqual(out.winners, [first]); assert.equal(out.reason, 'penalties'); assert.equal(out.draw, false)
  assert.match(out.text, /on penalties, 3-0/)
  assert.deepEqual(s.goals, [0, 0], 'the match goals stay level')
  assert.equal((football.snapshot(s) as FootballSnap).o!.w, first)
})

test('level after five each goes to sudden death; a round that splits them ends it', () => {
  const s = toPens('sd'); const first = so(s).team
  // every kick of the first five scores for both (5-5), then in round six the first scores and the second misses
  const kicks = playOut(s, (n, team) => (n < 10 ? true : n === 10 ? true : false))
  assert.equal(kicks, 12); assert.equal(s.phase, PHASE.over)
  assert.deepEqual(so(s).taken, [6, 6]); assert.deepEqual(so(s).score.map((v) => v), first === 0 ? [6, 5] : [5, 6])
  assert.deepEqual(football.outcome(s)!.winners, [first])
  // and the other way round: the first misses and the second scores in a later round
  const t = toPens('sd2'); const f2 = so(t).team
  const kicks2 = playOut(t, (n) => (n < 10 ? true : n < 14 ? true : n === 14 ? false : true))
  assert.equal(kicks2, 16); assert.deepEqual(football.outcome(t)!.winners, [1 - f2])
  assert.equal(so(t).taken[0], 8)
})

test('the cap: level after ten kicks each is a draw', () => {
  const s = toPens('cap')
  const kicks = playOut(s, () => true)
  assert.equal(kicks, 20); assert.equal(s.phase, PHASE.over)
  const out = football.outcome(s)!
  assert.equal(out.draw, true); assert.deepEqual(out.winners, []); assert.equal(out.reason, 'draw')
  assert.equal((football.snapshot(s) as FootballSnap).o!.w, 2)
  assert.deepEqual(so(s).marks.map((m) => m.length), [10, 10])
})

test('2v2: the shooters of a team take turns', () => {
  const s = toPens('two', { side: 2 }, 4)
  const shooters: number[] = []
  playOut(s, (n, team) => { shooters.push(so(s).shooter); return team === 0 }, makeRng('2v2'))
  const mine = shooters.filter((p) => (p & 1) === 0)
  assert.ok(mine.length >= 2 && mine[0] !== mine[1], 'the same team: ' + mine.join(','))
  assert.ok(shooters.every((p) => p < 4))
  // the keeper is the other team's first seat
  const t = toPens('two-b', { side: 2 }, 4)
  assert.equal(so(t).keeper, 1 - so(t).team)
})

test('the computer shoots and keeps in a shoot-out, and a whole one is deterministic', () => {
  const run = (seed: string): { snaps: string[]; goals: number; saves: number; end: FootballState } => {
    const r = makeRng(seed), s = toPens(seed), snaps: string[] = []
    let goals = 0, saves = 0
    for (let i = 0; i < 6000 && s.phase === PHASE.pens; i++) {
      football.step(s, [football.bot(s, 0, r), football.bot(s, 1, r)], r)
      for (const e of s.ev) { if (e[0] === EV.goal) goals += 1; if (e[0] === EV.save) saves += 1 }
      if (i % 5 === 0) snaps.push(JSON.stringify(football.snapshot(s)))
    }
    return { snaps, goals, saves, end: s }
  }
  const a = run('bots'), b = run('bots')
  assert.deepEqual(a.snaps, b.snaps, 'the same seed, the same shoot-out, tick for tick')
  assert.equal(a.end.phase, PHASE.over); assert.ok(football.outcome(a.end))
  let goals = 0, saves = 0, shots = 0
  for (const seed of ['u', 'v', 'w', 'x', 'y', 'z']) { const m = run(seed); goals += m.goals; saves += m.saves; shots += m.end.so!.taken[0] + m.end.so!.taken[1] }
  assert.ok(goals >= 6 && saves >= 3, `bots score ${goals} and save ${saves} of ${shots} kicks`)
  assert.ok(goals < shots, 'not every kick goes in')
})

test('a person against the bot: the bot keeps the goal when the person shoots a soft one at it', () => {
  let saved = 0, tried = 0
  for (const seed of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']) {
    const s = toPens(seed); const r = makeRng(seed + 'b')
    const human = 0
    while (s.phase === PHASE.pens && so(s).team !== human) football.step(s, [idle, football.bot(s, 1, r)], r) // wait for the person's turn
    if (s.phase !== PHASE.pens) continue
    while (so(s).stage === SO_STAGE.set) football.step(s, [idle, football.bot(s, 1, r)], r)
    for (let i = 0; i < 3; i++) football.step(s, [{ h: 1 | BTN.chg, e: 0 }, football.bot(s, 1, r)], r)
    football.step(s, [{ h: 1, e: BTN.kick }, football.bot(s, 1, r)], r)
    for (let i = 0; i < 60 && so(s).stage === SO_STAGE.fly; i++) football.step(s, [idle, football.bot(s, 1, r)], r)
    tried += 1; if (so(s).out === SO_OUT.saved) saved += 1
  }
  assert.ok(tried >= 5 && saved >= 1 && saved < tried, `saved ${saved} of ${tried}`)
})

test('forfeit in a shoot-out hands the other side the win', () => {
  const s = toPens('ff'); toAim(s); football.forfeit(s, 1)
  const o = football.outcome(s)!
  assert.deepEqual(o.winners, [0]); assert.equal(o.reason, 'forfeit')
})

test('the stages run on their own clock: set, aim, flight, result, next kick', () => {
  const s = toPens('clock')
  assert.equal(SO_SET, 30)
  const ins = s.pl.map(() => idle), r = makeRng('c')
  for (let i = 0; i < SO_SET - 1; i++) football.step(s, ins, r)
  assert.equal(so(s).stage, SO_STAGE.set)
  football.step(s, ins, r); assert.equal(so(s).stage, SO_STAGE.aim)
  assert.equal((football.snapshot(s) as FootballSnap).o!.c, Math.ceil(SO_AIM / HZ))
})
