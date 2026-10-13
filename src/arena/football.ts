/**
 * OWNER: games (real-time)
 * FOOTBALL — a top-down arcade match, 20 ticks a second, run by the server (contract: ./rules.ts).
 *
 * WORLD. A pitch W x H = 900 x 540 units, boards all round (the ball never leaves). The goals sit in the middle of the two short
 * ends (mouth GOAL_Y1..GOAL_Y2, 36 deep). Team 0 (seats 0, 2) defends the LEFT goal and attacks right; team 1 (seats 1, 3) the
 * opposite. Each team has one auto-controlled GOALKEEPER (not a seat). Each seat controls ONE field player: player index = seat.
 * `side` (1 or 2) is the number of field players per team: a seat without a human (a 2v2 in a two-seat room, or the
 * second half of a 3-seat room) is played by the same AI as the practice bot. With four seats the room is a true 2v2.
 *
 * INPUT (one integer 0..255, from a phone joystick or keys): bits 0..4 = heading 0 none, 1..24 = 15 degree steps clockwise from
 * east; bit 5 (32) = shoot button HELD (charging); bit 6 (64) = shoot released (edge: kick); bit 7 (128) = tackle (edge). The two
 * edges are latched between ticks (`reduce`/`settle`) so a quick tap is never lost.
 *
 * BALL. Free, it rolls with friction and bounces off boards and posts. A player within PICK of a slow loose ball takes it: the
 * ball then sticks LIGHTLY to the front of him (dribbling) and leaves him when he kicks, is tackled, or it gets too far. A kick
 * with the shoot button released after <= 3 ticks is a PASS (assisted towards a team-mate in front); longer is a SHOT, power
 * grows to full at 16 ticks (0.8 s), aimed with an assist at the corner away from the keeper when roughly facing the goal.
 * TACKLE. A 8-tick slide with 36-tick cooldown; it wins the ball from a carrier it touches (the victim is stunned), and the
 * slider is stunned briefly afterwards, so a miss is punished.
 * MATCH. `seconds` of play; level at the whistle: ending 1 = golden goal (next goal wins, max 60 s extra, then a draw), 2 = a draw.
 * After a goal: celebration, then a kick-off from the centre spot.
 */
import { ArenaInputError, cleanArenaOptions } from './rules.ts'
import type { Outcome, RealtimeRules } from './rules.ts'

export const HZ = 20
export const W = 900
export const H = 540
export const GOAL_Y1 = 200
export const GOAL_Y2 = 340
export const GOAL_DEPTH = 36
export const PR = 15
export const BR = 8
const POST_R = 4

export const BTN = Object.freeze({ chg: 32, kick: 64, tackle: 128 })
export const DIR_MASK = 31
const EDGE = BTN.kick | BTN.tackle
export const PHASE = Object.freeze({ kickoff: 0, play: 1, goal: 2, over: 3 })
/** Event codes in a snapshot: [code, x, y, extra]. */
export const EV = Object.freeze({ goal: 1, kick: 2, tackle: 3, save: 4, post: 5 })

export const SPEED = 6, CARRY = 0.9, CHARGING = 0.72
export const PICK = 27, CARRY_AT = 27, LOSE_AT = 42
export const SLIDE_TICKS = 8, SLIDE_SPEED = 10, TACKLE_CD = 36, TACKLE_REACH = 30
export const CHARGE_FULL = 16, PASS_MAX_CHG = 3
const FRICTION = 0.972, REST = 0.72
const KEEPER_X = 24, KEEPER_SPEED = 4.2, KEEPER_REACH = 25
export const KICKOFF_FIRST = 60, KICKOFF_AFTER = 40, GOAL_TICKS = 70, OVERTIME_TICKS = 60 * HZ

const DX: number[] = [], DY: number[] = []
for (let i = 0; i < 24; i++) { DX.push(Math.cos(i * Math.PI / 12)); DY.push(Math.sin(i * Math.PI / 12)) }
/** Heading code (1..24) for a screen vector, 0 when it is too small to mean anything. */
export function dirCode(dx: number, dy: number, dead = 0): number {
  if (Math.hypot(dx, dy) <= dead || (dx === 0 && dy === 0)) return 0
  return ((Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) % 24) + 24) % 24 + 1
}
export const dirVector = (code: number): [number, number] => (code >= 1 && code <= 24 ? [DX[code - 1] as number, DY[code - 1] as number] : [0, 0])

/** `ending`: 1 = golden goal, 2 = draw (numbers because the shared lobby panel sends option values as numbers). */
export type FootballOptions = { seconds: number; ending: number; side: number }
export interface Footballer {
  x: number; y: number; vx: number; vy: number
  /** facing 0..23 */ d: number
  /** ticks the shoot button has been held */ chg: number
  /** slide ticks left */ slide: number
  /** tackle cooldown ticks */ cd: number
  /** stunned ticks (cannot act) */ stun: number
  /** ticks before he may pick the ball up again */ touch: number
}
export interface Ball { x: number; y: number; vx: number; vy: number; /** carrying player, or -1 */ o: number }
export interface FootballState {
  options: FootballOptions
  tick: number
  phase: number
  /** ticks in this phase */ pt: number
  /** length of this phase when it has one */ plen: number
  /** seats in the room */ seatsN: number
  /** ticks of play left (0 in overtime) */ clock: number
  ot: boolean
  otTicks: number
  goals: [number, number]
  pl: Footballer[]
  ball: Ball
  /** keepers' y: [left goal, right goal] */ ky: [number, number]
  /** last player to touch the ball */ last: number
  /** team that scored last (-1) and who */ scoredBy: number
  scorer: number
  /** team that kicks off */ kickTeam: number
  left: number
  ev: number[][]
}
export interface FootballInput { h: number; e: number }
/** x, y, facing, status (1 sliding, 2 stunned, 4..28 charge level << 2, 32 tackle cooling) */
export type FootballerSnap = [number, number, number, number]
export interface FootballSnap {
  /** phase */ p: number
  /** seconds left in the phase's countdown (kick-off / celebration) */ c: number
  /** seconds left on the clock */ t: number
  /** overtime (golden goal) */ q: number
  /** goals */ g: [number, number]
  /** ball: x, y, carrier + 1 (0 = loose) */ b: [number, number, number]
  /** players */ f: FootballerSnap[]
  /** keepers' y */ k: [number, number]
  /** events this tick, and (in a goal phase) who scored: [team, player] in `s` */ e: number[][]
  s?: [number, number]
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const teamOf = (p: number): number => p & 1

/** Where player `p` stands for a kick-off. */
function slot(s: FootballState, p: number): [number, number] {
  const team = teamOf(p), k = p >> 1, per = s.options.side
  const kicker = team === s.kickTeam && k === 0
  let x: number, y: number
  if (per === 1) { x = kicker ? W * 0.5 - 38 : W * 0.3; y = H / 2 }
  else if (k === 0) { x = kicker ? W * 0.5 - 38 : W * 0.38; y = kicker ? H / 2 : H * 0.4 }
  else { x = W * 0.2; y = H * 0.62 }
  return [team === 0 ? x : W - x, y]
}
function placeKickoff(s: FootballState, kickTeam: number): void {
  s.kickTeam = kickTeam
  s.pl.forEach((pl, p) => {
    const [x, y] = slot(s, p)
    pl.x = x; pl.y = y; pl.vx = 0; pl.vy = 0; pl.d = teamOf(p) === 0 ? 0 : 12
    pl.chg = 0; pl.slide = 0; pl.cd = 0; pl.stun = 0; pl.touch = 0
  })
  s.ball.x = W / 2; s.ball.y = H / 2; s.ball.vx = 0; s.ball.vy = 0; s.ball.o = -1
  s.ky = [H / 2, H / 2]
  s.last = -1
}
function start(seats: number, _rng: () => number, options: FootballOptions): FootballState {
  const per = Math.max(options.side, Math.ceil(seats / 2))
  const opts = { ...options, side: per }
  const s: FootballState = {
    options: opts, tick: 0, phase: PHASE.kickoff, pt: 0, plen: KICKOFF_FIRST, seatsN: seats, clock: opts.seconds * HZ, ot: false, otTicks: 0,
    goals: [0, 0], pl: [], ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, o: -1 }, ky: [H / 2, H / 2], last: -1, scoredBy: -1, scorer: -1, kickTeam: 0, left: -1, ev: [],
  }
  for (let p = 0; p < per * 2; p++) s.pl.push({ x: 0, y: 0, vx: 0, vy: 0, d: 0, chg: 0, slide: 0, cd: 0, stun: 0, touch: 0 })
  placeKickoff(s, 0)
  return s
}

function parseInput(raw: unknown): FootballInput {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 255 || (raw & DIR_MASK) > 24) throw new ArenaInputError('invalid_input')
  return { h: raw & (DIR_MASK | BTN.chg), e: raw & EDGE }
}
/** The integer a client sends: a heading code (0..24), whether shoot is held, and the edges (BTN.kick, BTN.tackle) pressed since the last message. */
export const packInput = (heading: number, charging: boolean, pressed = 0): number => (heading & DIR_MASK) | (charging ? BTN.chg : 0) | (pressed & EDGE)
/** The `held` mask for InputPipe: heading plus the charging bit. */
export const heldMask = (heading: number, charging: boolean): number => (heading & DIR_MASK) | (charging ? BTN.chg : 0)

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by)
const goalX = (team: number): number => (team === 0 ? W : 0)

// ---- the ball -----------------------------------------------------------------------------------------------

function kick(s: FootballState, p: number, rng: () => number): void {
  const pl = s.pl[p] as Footballer, b = s.ball, team = teamOf(p)
  const shot = pl.chg > PASS_MAX_CHG
  const q = Math.min(1, pl.chg / CHARGE_FULL)
  let ax = DX[pl.d] as number, ay = DY[pl.d] as number, speed: number
  if (shot) {
    const gx = goalX(team), oppKeeper = s.ky[1 - team] as number
    const ty = Math.abs(oppKeeper - H / 2) > 14 ? (oppKeeper > H / 2 ? GOAL_Y1 + 18 : GOAL_Y2 - 18) : (pl.y < H / 2 ? GOAL_Y2 - 18 : GOAL_Y1 + 18)
    const tx = gx - pl.x, tyv = ty - pl.y, len = Math.hypot(tx, tyv) || 1
    if ((tx * ax + tyv * ay) / len > 0.72) { ax = tx / len; ay = tyv / len }
    const err = (rng() - 0.5) * 0.2 * q
    const cs = Math.cos(err), sn = Math.sin(err)
    const nx = ax * cs - ay * sn, ny = ax * sn + ay * cs
    ax = nx; ay = ny
    speed = 16 + 15 * q
  } else {
    speed = 12
    let best = -1, bestCos = 0.8
    for (let m = 0; m < s.pl.length; m++) {
      if (m === p || teamOf(m) !== team) continue
      const mate = s.pl[m] as Footballer, dx = mate.x - b.x, dy = mate.y - b.y, len = Math.hypot(dx, dy)
      if (len < 50 || len > 560) continue
      const cos = (dx * ax + dy * ay) / len
      if (cos > bestCos) { bestCos = cos; best = m }
    }
    if (best >= 0) {
      const mate = s.pl[best] as Footballer, dx = mate.x + mate.vx * 5 - b.x, dy = mate.y + mate.vy * 5 - b.y, len = Math.hypot(dx, dy) || 1
      ax = dx / len; ay = dy / len; speed = clamp(9 + len * 0.035, 10, 20)
    }
  }
  b.vx = ax * speed; b.vy = ay * speed; b.o = -1
  pl.touch = 8; pl.chg = 0; s.last = p
  s.ev.push([EV.kick, Math.round(b.x), Math.round(b.y), shot ? 1 : 0])
}

/** Move a loose ball one tick (three sub-steps so a hard shot cannot jump a post or a keeper). Returns the team that scored, or -1. */
function rollBall(s: FootballState, rng: () => number, inNet: boolean): number {
  const b = s.ball
  b.vx *= inNet ? 0.9 : FRICTION; b.vy *= inNet ? 0.9 : FRICTION
  if (Math.abs(b.vx) < 0.12 && Math.abs(b.vy) < 0.12) { b.vx = 0; b.vy = 0 }
  let scored = -1
  for (let sub = 0; sub < 3; sub++) {
    b.x += b.vx / 3; b.y += b.vy / 3
    // boards
    if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * REST }
    else if (b.y > H - BR) { b.y = H - BR; b.vy = -Math.abs(b.vy) * REST }
    const mouth = b.y > GOAL_Y1 && b.y < GOAL_Y2
    if (inNet) {
      if (b.x < -GOAL_DEPTH + BR) { b.x = -GOAL_DEPTH + BR; b.vx = Math.abs(b.vx) * 0.2 }
      if (b.x > W + GOAL_DEPTH - BR) { b.x = W + GOAL_DEPTH - BR; b.vx = -Math.abs(b.vx) * 0.2 }
      if (b.x < 0 || b.x > W) { b.y = clamp(b.y, GOAL_Y1 + BR, GOAL_Y2 - BR) }
      continue
    }
    // posts
    for (const px of [0, W]) for (const py of [GOAL_Y1, GOAL_Y2]) {
      const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy)
      if (d < BR + POST_R && d > 0) {
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny
        b.x = px + nx * (BR + POST_R); b.y = py + ny * (BR + POST_R)
        if (vn < 0) { b.vx -= 1.75 * vn * nx; b.vy -= 1.75 * vn * ny; s.ev.push([EV.post, Math.round(b.x), Math.round(b.y), 0]) }
      }
    }
    if (!mouth) {
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * REST }
      else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * REST }
    }
    // keepers
    for (const t of [0, 1]) {
      const kx = t === 0 ? KEEPER_X : W - KEEPER_X, ky = s.ky[t] as number, toward = t === 0 ? b.vx < 0 : b.vx > 0
      if (!toward || Math.abs(b.x - kx) > KEEPER_REACH || Math.abs(b.y - ky) > KEEPER_REACH) continue
      const out = t === 0 ? 1 : -1, speed = Math.hypot(b.vx, b.vy)
      b.x = kx + out * KEEPER_REACH
      if (speed < 10) { b.vx = out * 13; b.vy = (rng() - 0.5) * 9 }
      else { b.vx = out * speed * 0.42; b.vy = b.vy * 0.5 + (b.y - ky) * 0.28 }
      s.ev.push([EV.save, Math.round(b.x), Math.round(b.y), t])
    }
    if (mouth && b.x < 0 && scored < 0) scored = 1
    if (mouth && b.x > W && scored < 0) scored = 0
    if (scored >= 0) break
  }
  return scored
}

// ---- the players ---------------------------------------------------------------------------------------------

function inputFor(s: FootballState, inputs: readonly FootballInput[], p: number, rng: () => number): FootballInput {
  return inputs[p] ?? ai(s, p, rng)
}

function control(s: FootballState, p: number, input: FootballInput, rng: () => number): void {
  const pl = s.pl[p] as Footballer, b = s.ball
  if (pl.cd > 0) pl.cd -= 1
  if (pl.touch > 0) pl.touch -= 1
  const heading = input.h & DIR_MASK
  if (pl.slide > 0) {
    pl.slide -= 1
    pl.vx = (DX[pl.d] as number) * SLIDE_SPEED; pl.vy = (DY[pl.d] as number) * SLIDE_SPEED
    pl.chg = 0
    if (pl.slide === 0) pl.stun = Math.max(pl.stun, 7)
    return
  }
  if (pl.stun > 0) { pl.stun -= 1; pl.vx *= 0.6; pl.vy *= 0.6; pl.chg = 0; return }
  if (heading >= 1 && heading <= 24) pl.d = heading - 1
  const charging = (input.h & BTN.chg) !== 0
  const speed = SPEED * (b.o === p ? CARRY : 1) * (charging ? CHARGING : 1)
  const tx = heading ? (DX[pl.d] as number) * speed : 0, ty = heading ? (DY[pl.d] as number) * speed : 0
  pl.vx += (tx - pl.vx) * 0.5; pl.vy += (ty - pl.vy) * 0.5
  if (charging) pl.chg = Math.min(pl.chg + 1, 40)
  if (input.e & BTN.kick) {
    if (b.o === p || (b.o < 0 && dist(pl.x, pl.y, b.x, b.y) <= PICK + 8)) kick(s, p, rng)
    pl.chg = 0
  } else if (!charging && pl.chg > 0) pl.chg = 0
  if (input.e & BTN.tackle && pl.cd === 0 && b.o !== p) { pl.slide = SLIDE_TICKS; pl.cd = TACKLE_CD; pl.chg = 0 }
}

function movePlayers(s: FootballState): void {
  for (const pl of s.pl) {
    pl.x = clamp(pl.x + pl.vx, PR, W - PR); pl.y = clamp(pl.y + pl.vy, PR, H - PR)
  }
  // Bodies are solid (a slider is not).
  for (let i = 0; i < s.pl.length; i++) for (let j = i + 1; j < s.pl.length; j++) {
    const a = s.pl[i] as Footballer, c = s.pl[j] as Footballer
    if (a.slide > 0 || c.slide > 0) continue
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy)
    if (d < PR * 2 && d > 0.001) {
      const push = (PR * 2 - d) / 2
      a.x = clamp(a.x - dx / d * push, PR, W - PR); a.y = clamp(a.y - dy / d * push, PR, H - PR)
      c.x = clamp(c.x + dx / d * push, PR, W - PR); c.y = clamp(c.y + dy / d * push, PR, H - PR)
    }
  }
}

function tackles(s: FootballState): void {
  const b = s.ball
  for (let p = 0; p < s.pl.length; p++) {
    const sl = s.pl[p] as Footballer
    if (sl.slide <= 0 || b.o < 0 || teamOf(b.o) === teamOf(p)) continue
    const victim = s.pl[b.o] as Footballer
    if (dist(sl.x, sl.y, victim.x, victim.y) <= TACKLE_REACH || dist(sl.x + (DX[sl.d] as number) * 14, sl.y + (DY[sl.d] as number) * 14, b.x, b.y) <= TACKLE_REACH - 6) {
      victim.stun = 14; victim.chg = 0; victim.touch = 12
      b.o = p; sl.slide = 0; sl.stun = 3; sl.touch = 0; s.last = p
      s.ev.push([EV.tackle, Math.round(victim.x), Math.round(victim.y), 0])
      return
    }
  }
}

function ballControl(s: FootballState): void {
  const b = s.ball
  if (b.o >= 0) {
    const o = s.pl[b.o] as Footballer
    const tx = o.x + (DX[o.d] as number) * CARRY_AT, ty = o.y + (DY[o.d] as number) * CARRY_AT
    b.x = clamp(b.x + (tx - b.x) * 0.55, BR, W - BR); b.y = clamp(b.y + (ty - b.y) * 0.55, BR, H - BR)
    b.vx = o.vx; b.vy = o.vy
    if (dist(o.x, o.y, b.x, b.y) > LOSE_AT) b.o = -1
    // A keeper takes the ball off a dribbler who runs into him.
    for (const t of [0, 1]) {
      const kx = t === 0 ? KEEPER_X : W - KEEPER_X
      if (teamOf(b.o) !== t && b.o >= 0 && dist(b.x, b.y, kx, s.ky[t] as number) < KEEPER_REACH + 3) {
        b.o = -1; b.vx = (t === 0 ? 1 : -1) * 12; b.vy = (b.y - (s.ky[t] as number)) * 0.3
        s.ev.push([EV.save, Math.round(b.x), Math.round(b.y), t])
      }
    }
    return
  }
  if (Math.hypot(b.vx, b.vy) >= 20) return
  let best = -1, bestD = PICK
  for (let p = 0; p < s.pl.length; p++) {
    const pl = s.pl[p] as Footballer
    if (pl.touch > 0 || pl.stun > 0 || pl.slide > 0) continue
    const d = dist(pl.x, pl.y, b.x, b.y)
    if (d < bestD) { bestD = d; best = p }
  }
  if (best >= 0) { b.o = best; s.last = best }
}

function moveKeepers(s: FootballState): void {
  const b = s.ball
  for (const t of [0, 1]) {
    const kx = t === 0 ? KEEPER_X : W - KEEPER_X
    const near = t === 0 ? b.x < W * 0.6 : b.x > W * 0.4
    // Follows the ball's height, and leans to the middle when it is far off. It reads the ball as it is NOW (no prediction), so a well-placed shot beats it.
    const want = near ? b.y : H / 2 + (b.y - H / 2) * 0.35
    const target = clamp(want, GOAL_Y1 + 8, GOAL_Y2 - 8)
    const ky = s.ky[t] as number
    s.ky[t] = ky + clamp(target - ky, -KEEPER_SPEED, KEEPER_SPEED)
    void kx
  }
}

function playTick(s: FootballState, inputs: readonly FootballInput[], rng: () => number): void {
  for (let p = 0; p < s.pl.length; p++) control(s, p, inputFor(s, inputs, p, rng), rng)
  movePlayers(s)
  tackles(s)
  ballControl(s)
  moveKeepers(s)
  if (s.ball.o < 0) {
    const scored = rollBall(s, rng, false)
    if (scored >= 0) { goal(s, scored); return }
  }
  if (s.ot) { s.otTicks += 1; if (s.otTicks >= OVERTIME_TICKS) finish(s) }
  else {
    s.clock -= 1
    if (s.clock <= 0) {
      s.clock = 0
      if (s.goals[0] !== s.goals[1] || s.options.ending !== 1) finish(s)
      else { s.ot = true; s.otTicks = 0 }
    }
  }
}

function goal(s: FootballState, team: number): void {
  s.goals[team as 0 | 1] += 1
  s.scoredBy = team; s.scorer = s.last >= 0 ? s.last : -1
  s.phase = PHASE.goal; s.pt = 0; s.plen = GOAL_TICKS
  s.ball.o = -1
  for (const pl of s.pl) { pl.vx = 0; pl.vy = 0; pl.chg = 0; pl.slide = 0 }
  s.ev.push([EV.goal, Math.round(s.ball.x), Math.round(s.ball.y), team])
}
function finish(s: FootballState): void { s.phase = PHASE.over; s.pt = 0; s.plen = 0 }

function step(s: FootballState, inputs: readonly FootballInput[], rng: () => number): FootballState {
  s.tick += 1
  s.ev.length = 0
  if (s.phase === PHASE.over) return s
  s.pt += 1
  if (s.phase === PHASE.kickoff) {
    if (s.pt >= s.plen) { s.phase = PHASE.play; s.pt = 0 }
  } else if (s.phase === PHASE.play) {
    playTick(s, inputs, rng)
  } else if (s.phase === PHASE.goal) {
    rollBall(s, rng, true)
    if (s.pt >= s.plen) {
      if (s.ot || s.clock <= 0) finish(s)
      else { placeKickoff(s, 1 - s.scoredBy); s.phase = PHASE.kickoff; s.pt = 0; s.plen = KICKOFF_AFTER }
    }
  }
  return s
}

// ---- the computer --------------------------------------------------------------------------------------------

const IDLE: FootballInput = { h: 0, e: 0 }
/** The computer's play for player `p`: used for the practice opponent and for any player without a human behind him. Stateless apart from the player's own `chg`. */
function ai(s: FootballState, p: number, rng: () => number): FootballInput {
  if (s.phase !== PHASE.play) return IDLE
  const me = s.pl[p] as Footballer, b = s.ball, team = teamOf(p)
  if (me.stun > 0 || me.slide > 0) return IDLE
  const gx = goalX(team), ownGoal = goalX(1 - team)
  const head = (tx: number, ty: number): number => dirCode(tx - me.x, ty - me.y, 6)
  if (b.o === p) {
    const toGoal = dist(me.x, me.y, gx, H / 2)
    let ty = H / 2
    // Steer round the nearest opponent ahead.
    let aim = head(gx, ty)
    for (let o = 0; o < s.pl.length; o++) {
      if (teamOf(o) === team) continue
      const opp = s.pl[o] as Footballer, d = dist(me.x, me.y, opp.x, opp.y)
      if (d < 85 && (opp.x - me.x) * (gx - me.x) > 0) { ty = opp.y > me.y ? me.y - 140 : me.y + 140; aim = head(gx, clamp(ty, 40, H - 40)); break }
    }
    const turn = (((aim - 1 - me.d) % 24) + 24) % 24
    const facing = aim > 0 && (turn <= 3 || turn >= 21)
    if (me.chg > 0) {
      const want = 7 + ((s.tick + p) % 6)
      return me.chg >= want ? { h: aim, e: BTN.kick } : { h: aim | BTN.chg, e: 0 }
    }
    if (toGoal < 330 && facing && (s.tick + p) % 3 === 0) return { h: aim | BTN.chg, e: 0 }
    // Pass to a team-mate who is much nearer the goal when an opponent is on top of him.
    for (let m = 0; m < s.pl.length; m++) {
      if (m === p || teamOf(m) !== team) continue
      const mate = s.pl[m] as Footballer
      if (dist(mate.x, mate.y, gx, H / 2) + 160 < toGoal && rng() < 0.05) return { h: head(mate.x, mate.y), e: BTN.kick }
    }
    return { h: aim, e: 0 }
  }
  // Nearest team-mate to the ball chases it; the others take up a position.
  let nearest = p, nd = dist(me.x, me.y, b.x, b.y)
  for (let m = 0; m < s.pl.length; m++) {
    if (teamOf(m) !== team || m === p) continue
    const mate = s.pl[m] as Footballer, d = dist(mate.x, mate.y, b.x, b.y)
    if (d < nd - 0.001 || (Math.abs(d - nd) < 0.001 && m < nearest)) { nd = d; nearest = m }
  }
  const owner = b.o >= 0 ? s.pl[b.o] as Footballer : null
  if (owner && teamOf(b.o) !== team) {
    const d = dist(me.x, me.y, owner.x, owner.y)
    if (d < 52 && me.cd === 0 && rng() < 0.22) return { h: head(owner.x, owner.y), e: BTN.tackle }
  }
  if (nearest === p) {
    const lead = owner ? 3 : 0
    return { h: head(b.x + (owner ? owner.vx * lead : 0), b.y + (owner ? owner.vy * lead : 0)), e: 0 }
  }
  const mateHas = owner && teamOf(b.o) === team
  const fx = mateHas ? clamp(b.x + (gx - ownGoal) * 0.18, 60, W - 60) : clamp(b.x + (ownGoal - gx) * 0.12, 60, W - 60)
  const fy = clamp(b.y + (p >> 1 ? 130 : -130), 50, H - 50)
  return { h: head(fx, fy), e: 0 }
}

// ---- outcome, snapshot ---------------------------------------------------------------------------------------

function outcome(s: FootballState): Outcome | null {
  const seatTeam = (t: number): number[] => Array.from({ length: s.seatsN }, (_, i) => i).filter((i) => teamOf(i) === t)
  const names = (t: number): string => seatTeam(t).map((i) => '{' + i + '}').join(' and ')
  const scores = Array.from({ length: s.seatsN }, (_, i) => s.goals[teamOf(i) as 0 | 1])
  const line = s.goals[0] + '-' + s.goals[1]
  if (s.left >= 0) return { winners: seatTeam(1 - teamOf(s.left)), draw: false, reason: 'forfeit', text: '{' + s.left + '} left the match. ' + names(1 - teamOf(s.left)) + ' win.', scores }
  if (s.phase !== PHASE.over) return null
  if (s.goals[0] === s.goals[1]) return { winners: [], draw: true, reason: 'draw', text: 'Full time: a ' + line + ' draw between ' + names(0) + ' and ' + names(1) + '.', scores }
  const w = s.goals[0] > s.goals[1] ? 0 : 1
  return { winners: seatTeam(w), draw: false, reason: s.ot ? 'golden' : 'time', text: names(w) + (seatTeam(w).length > 1 ? ' win ' : ' wins ') + Math.max(...s.goals) + '-' + Math.min(...s.goals) + (s.ot ? ' with a golden goal.' : '.'), scores }
}

function snapshot(s: FootballState): FootballSnap {
  const snap: FootballSnap = {
    p: s.phase, c: s.phase === PHASE.play || s.phase === PHASE.over ? 0 : Math.ceil((s.plen - s.pt) / HZ), t: s.ot ? 0 : Math.ceil(s.clock / HZ), q: s.ot ? 1 : 0,
    g: [s.goals[0], s.goals[1]], b: [Math.round(s.ball.x), Math.round(s.ball.y), s.ball.o + 1],
    f: s.pl.map((pl): FootballerSnap => [Math.round(pl.x), Math.round(pl.y), pl.d, (pl.slide > 0 ? 1 : 0) | (pl.stun > 0 ? 2 : 0) | (Math.min(7, pl.chg >> 1) << 2) | (pl.cd > 0 ? 32 : 0)]),
    k: [Math.round(s.ky[0]), Math.round(s.ky[1])], e: s.ev.map((e) => e.slice()),
  }
  if (s.phase === PHASE.goal || s.phase === PHASE.over) snap.s = [s.scoredBy, s.scorer]
  return snap
}

function forfeit(s: FootballState, seat: number): FootballState { s.left = seat; return s }

const rules: RealtimeRules<FootballState, FootballInput, FootballSnap> = {
  id: 'football',
  label: 'Football',
  hz: HZ,
  seats: { min: 2, max: 4 },
  options: {
    seconds: { label: 'Match length', values: [60, 120, 180], default: 120, names: ['1 minute', '2 minutes', '3 minutes'] },
    ending: { label: 'If level', values: [1, 2], default: 1, names: ['Golden goal', 'Draw'] },
    side: { label: 'Players a side', values: [1, 2], default: 1, names: ['1 v 1', '2 v 2 (with computer team-mates)'] },
  },
  start: (seats, rng, options) => start(seats, rng, cleanArenaOptions(rules, options)),
  parseInput,
  idle: () => ({ h: 0, e: 0 }),
  reduce: (held, incoming) => ({ h: incoming.h, e: held.e | incoming.e }),
  settle: (consumed) => ({ h: consumed.h, e: 0 }),
  step,
  outcome,
  snapshot,
  bot: (s, seat, rng) => ai(s, seat, rng),
  forfeit,
}
export default rules
