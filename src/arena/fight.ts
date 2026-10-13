/**
 * OWNER: games (real-time)
 * FIGHT — a 1v1 side-view brawler. Pure rules (contract: ./rules.ts), run by the server at 20 ticks a second.
 *
 * WORLD. A flat arena 1000 units wide (x runs left to right, y is the height above the ground). A fighter's body is 44
 * wide and 105 tall. One tick is 50 ms. Everything is in whole ticks and plain numbers, so the same inputs always give
 * the same fight (the tests replay one).
 *
 * INPUT. A bitmask of what is held: LEFT RIGHT JUMP PUNCH KICK BLOCK. A press of JUMP, PUNCH or KICK is an EDGE: the
 * room latches it between ticks (`reduce`) so a tap that is released before the next tick still counts, and holding the
 * button does not repeat it.
 *
 * MOVES (ticks at 20 Hz)         start active total  damage reach  height          stun
 *   punch                          2     2     7      7      64    chest/head      6
 *   kick                           4     2     11     12     84    legs/low body   9
 * A kick passes under a jumper; a punch passes over nobody but is faster. Block (held, on the ground, not attacking)
 * turns a hit into 1–2 chip damage with no stun. Stun is shorter than the attacker's recovery, so there are no combos.
 *
 * MATCH. Best of `rounds` (1, 3 or 5). A round ends at a knockout (KO) or when the clock runs out (more health wins, equal
 * health is a draw round that counts for both). A match that ends level is a draw.
 */
import { ArenaInputError, cleanArenaOptions } from './rules.ts'
import type { Outcome, RealtimeRules } from './rules.ts'

export const HZ = 20
export const ARENA_W = 1000
export const WALL_L = 40
export const WALL_R = 960
export const BODY_HALF = 22
export const BODY_H = 105
export const MAX_HP = 100

/** Held-button bits. */
export const BTN = Object.freeze({ left: 1, right: 2, jump: 4, punch: 8, kick: 16, block: 32 })
const EDGE = BTN.jump | BTN.punch | BTN.kick

/** Fighter action codes (`a` in a snapshot). */
export const ACT = Object.freeze({ none: 0, punch: 1, kick: 2, hurt: 3, ko: 4 })
/** Phase codes (`p` in a snapshot). */
export const PHASE = Object.freeze({ intro: 0, fight: 1, ko: 2, over: 3 })

export const MOVES = Object.freeze({
  [ACT.punch]: { start: 2, active: 2, total: 7, dmg: 7, reach: 64, lo: 45, hi: 100, stun: 6, knock: 10 },
  [ACT.kick]: { start: 4, active: 2, total: 11, dmg: 12, reach: 84, lo: 0, hi: 62, stun: 9, knock: 20 },
} as const)

const WALK = 9, AIR_STEER = 3, JUMP_V = 20, GRAVITY = 2.4, MIN_APART = 44
export const INTRO_TICKS = 50, KO_TICKS = 50

export type FightOptions = { rounds: number; seconds: number }
export interface Fighter {
  x: number; y: number; vx: number; vy: number
  /** 1 faces right, -1 faces left. */
  face: 1 | -1
  hp: number
  /** ACT code and ticks spent in it. */
  a: number; at: number
  /** The attack in progress has already landed. */
  done: boolean
  /** Hurt only: ticks of stun. */
  stun: number
  air: boolean
  blk: boolean
}
export interface FightState {
  options: FightOptions
  tick: number
  phase: number
  /** Ticks spent in this phase. */
  pt: number
  round: number
  wins: [number, number]
  /** Ticks left on the round clock. */
  clock: number
  /** Who took the round that just ended: -1 not yet, 0 or 1, 2 draw. */
  rw: number
  /** 'ko' | 'time' */
  why: string
  /** The seat that left, or -1. */
  left: number
  f: [Fighter, Fighter]
  /** This tick's hits: [seat hit, blocked 0/1, strong 0/1, x, y]. Cleared at the start of every tick. */
  ev: number[][]
}
export interface FightInput { h: number; e: number }
/** x, y, facing right (1/0), action, ticks in action, hp, flags (1 blocking, 2 airborne). */
export type FighterSnap = [number, number, number, number, number, number, number]
export interface FightSnap {
  /** phase */ p: number
  /** ticks in phase */ c: number
  /** round (1-based) */ r: number
  /** wins */ w: [number, number]
  /** whole seconds left on the clock */ t: number
  /** round winner so far */ q: number
  /** fighters */ f: [FighterSnap, FighterSnap]
  /** hits this tick */ e: number[][]
}

const roundsWanted = (o: FightOptions): number => o.rounds
export const winsNeeded = (o: FightOptions): number => (roundsWanted(o) + 1) >> 1

function fresh(x: number, face: 1 | -1): Fighter {
  return { x, y: 0, vx: 0, vy: 0, face, hp: MAX_HP, a: ACT.none, at: 0, done: false, stun: 0, air: false, blk: false }
}
function resetRound(s: FightState): void {
  s.f = [fresh(300, 1), fresh(700, -1)]
  s.clock = s.options.seconds * HZ
  s.rw = -1; s.why = ''; s.phase = PHASE.intro; s.pt = 0
}

const clampX = (x: number): number => Math.max(WALL_L, Math.min(WALL_R, x))

function start(_seats: number, _rng: () => number, options: FightOptions): FightState {
  const s: FightState = { options, tick: 0, phase: PHASE.intro, pt: 0, round: 1, wins: [0, 0], clock: 0, rw: -1, why: '', left: -1, f: [fresh(300, 1), fresh(700, -1)], ev: [] }
  resetRound(s)
  return s
}

/**
 * The wire input is one integer 0..4095: the low six bits are what is HELD (BTN), the next six are PRESSES since the last
 * message (jump, punch, kick: a tap the client sent once, whatever happened to the button after). A client that only
 * knows held bits works too: a jump/punch/kick bit that turns on is taken as a press (see `reduce`).
 */
function parseInput(raw: unknown): FightInput {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 4095) throw new ArenaInputError('invalid_input')
  return { h: raw & 63, e: (raw >> 6) & EDGE }
}
/** The integer a client sends for held buttons and presses. */
export const packInput = (held: number, pressed = 0): number => (held & 63) | ((pressed & EDGE) << 6)

/** Physics shared by every phase: gravity, landing, knock-out slide. */
function fall(f: Fighter): void {
  if (!f.air) return
  f.y += f.vy
  f.vy -= GRAVITY
  if (f.y <= 0) { f.y = 0; f.vy = 0; f.air = false; f.vx = 0 }
}

function control(s: FightState, f: Fighter, foe: Fighter, input: FightInput): void {
  const held = input.h, edge = input.e
  const dir = (held & BTN.right ? 1 : 0) - (held & BTN.left ? 1 : 0)
  if (f.a === ACT.hurt) {
    f.at += 1
    f.blk = false
    if (f.at >= f.stun) { f.a = ACT.none; f.at = 0 }
  } else if (f.a === ACT.punch || f.a === ACT.kick) {
    f.at += 1
    f.blk = false
    if (f.at >= (MOVES[f.a]?.total ?? 1)) { f.a = ACT.none; f.at = 0; f.done = false }
  }
  if (f.a === ACT.none) {
    f.blk = !f.air && (held & BTN.block) !== 0
    if (!f.air) f.face = foe.x >= f.x ? 1 : -1
    if (!f.air && !f.blk) {
      f.x = clampX(f.x + dir * WALK)
      if (edge & BTN.jump) { f.air = true; f.vy = JUMP_V; f.vx = dir * WALK }
    }
    if (!f.blk) {
      if (edge & BTN.kick) { f.a = ACT.kick; f.at = 0; f.done = false }
      else if (edge & BTN.punch) { f.a = ACT.punch; f.at = 0; f.done = false }
    }
  }
  if (f.air) f.x = clampX(f.x + f.vx + (f.a === ACT.hurt ? 0 : dir * AIR_STEER))
  fall(f)
}

/** Does `att`'s attack, active now, reach `def`? */
function reaches(att: Fighter, def: Fighter): boolean {
  const move = MOVES[att.a as 1 | 2]
  if (!move || att.done || att.at < move.start || att.at >= move.start + move.active) return false
  if (def.a === ACT.ko) return false
  const ahead = (def.x - att.x) * att.face
  if (ahead < -10 || ahead - BODY_HALF > move.reach) return false
  return att.y + move.lo < def.y + BODY_H && att.y + move.hi > def.y
}

function knock(def: Fighter, att: Fighter, away: number, amount: number): void {
  const wanted = def.x + away * amount
  def.x = clampX(wanted)
  const spill = Math.abs(wanted - def.x)
  if (spill > 0) att.x = clampX(att.x - away * spill)
}

function fightTick(s: FightState, inputs: readonly FightInput[]): void {
  const [a, b] = s.f
  control(s, a, b, inputs[0] as FightInput)
  control(s, b, a, inputs[1] as FightInput)
  // Both strikes are judged from the same positions, so a trade is a trade whoever is seat 0.
  const hitOn: [boolean, boolean] = [reaches(b, a), reaches(a, b)]
  // Read both moves before either fighter is put in stun (a trade changes `a` mid-loop).
  const struck: [number, number] = [b.a, a.a]
  for (let seat = 0; seat < 2; seat++) {
    if (!hitOn[seat as 0 | 1]) continue
    const def = s.f[seat] as Fighter, att = s.f[1 - seat] as Fighter
    const kind = struck[seat as 0 | 1], move = MOVES[kind as 1 | 2]
    const blocked = def.blk && (att.x - def.x) * def.face >= 0
    att.done = true
    const away = def.x >= att.x ? 1 : -1
    if (blocked) {
      def.hp = Math.max(0, def.hp - (1 + Math.floor(move.dmg * 0.12)))
      knock(def, att, away, move.knock >> 1)
    } else {
      def.hp = Math.max(0, def.hp - move.dmg)
      def.a = ACT.hurt; def.at = 0; def.stun = move.stun; def.blk = false; def.done = false
      knock(def, att, away, move.knock)
    }
    s.ev.push([seat, blocked ? 1 : 0, kind === ACT.kick ? 1 : 0, Math.round((att.x + def.x) / 2), Math.round(def.y + (kind === ACT.kick ? 40 : 75))])
    if (def.hp <= 0) { def.a = ACT.ko; def.at = 0; def.air = true; def.vy = 9; def.vx = -def.face * 3 }
  }
  // Bodies are solid: they push each other apart.
  const gap = b.x - a.x
  if (Math.abs(gap) < MIN_APART) {
    const push = (MIN_APART - Math.abs(gap)) / 2, dir = gap >= 0 ? 1 : -1
    a.x = clampX(a.x - dir * push); b.x = clampX(b.x + dir * push)
    const still = b.x - a.x
    if (Math.abs(still) < MIN_APART) { if (a.x <= WALL_L + 0.01) b.x = a.x + MIN_APART; else if (b.x >= WALL_R - 0.01) a.x = b.x - MIN_APART }
  }
  s.clock -= 1
  const down = [a.hp <= 0, b.hp <= 0]
  if (down[0] || down[1]) endRound(s, down[0] && down[1] ? 2 : down[0] ? 1 : 0, 'ko')
  else if (s.clock <= 0) endRound(s, a.hp === b.hp ? 2 : a.hp > b.hp ? 0 : 1, 'time')
}

function endRound(s: FightState, winner: number, why: string): void {
  s.rw = winner; s.why = why; s.phase = PHASE.ko; s.pt = 0
  if (winner === 2) { s.wins[0] += 1; s.wins[1] += 1 } else s.wins[winner as 0 | 1] += 1
  for (const f of s.f) { f.blk = false; if (f.a !== ACT.ko) { f.a = ACT.none; f.at = 0 } }
}

/** Is the match decided once the round just played is counted? */
function decided(s: FightState): boolean {
  const need = winsNeeded(s.options)
  return s.wins[0] >= need || s.wins[1] >= need || s.round >= 2 * need
}

function step(s: FightState, inputs: readonly FightInput[]): FightState {
  s.tick += 1
  s.ev.length = 0
  if (s.phase === PHASE.over) return s
  s.pt += 1
  if (s.phase === PHASE.intro) {
    if (s.pt >= INTRO_TICKS) { s.phase = PHASE.fight; s.pt = 0 }
  } else if (s.phase === PHASE.fight) {
    fightTick(s, inputs)
  } else if (s.phase === PHASE.ko) {
    for (const f of s.f) { if (f.a === ACT.ko) { f.at += 1; if (f.air) f.x = clampX(f.x + f.vx); fall(f) } else fall(f) }
    if (s.pt >= KO_TICKS) {
      if (decided(s)) { s.phase = PHASE.over; s.pt = 0 } else { s.round += 1; resetRound(s) }
    }
  }
  return s
}

function outcome(s: FightState): Outcome | null {
  const scores = [s.wins[0], s.wins[1]]
  if (s.left >= 0) return { winners: [1 - s.left], draw: false, reason: 'forfeit', text: '{' + s.left + '} left the fight. {' + (1 - s.left) + '} wins.', scores }
  if (s.phase !== PHASE.over) return null
  if (s.wins[0] === s.wins[1]) return { winners: [], draw: true, reason: s.why || 'draw', text: 'A draw: {0} and {1} are level.', scores }
  const w = s.wins[0] > s.wins[1] ? 0 : 1
  return { winners: [w], draw: false, reason: s.why === 'time' ? 'time' : 'ko', text: '{' + w + '} wins the fight, ' + Math.max(...scores) + ' rounds to ' + Math.min(...scores) + '.', scores }
}

const fighterSnap = (f: Fighter): FighterSnap => [Math.round(f.x), Math.round(f.y), f.face > 0 ? 1 : 0, f.a, f.at, f.hp, (f.blk ? 1 : 0) | (f.air ? 2 : 0)]

function snapshot(s: FightState): FightSnap {
  return { p: s.phase, c: s.pt, r: s.round, w: [s.wins[0], s.wins[1]], t: Math.max(0, Math.ceil(s.clock / HZ)), q: s.rw, f: [fighterSnap(s.f[0]), fighterSnap(s.f[1])], e: s.ev.slice() }
}

/** The practice opponent: it closes in, jabs and kicks at a distance it can reach, blocks some of what it sees coming, and is beatable. */
function bot(s: FightState, seat: number, rng: () => number): FightInput {
  const idle: FightInput = { h: 0, e: 0 }
  if (s.phase !== PHASE.fight) return idle
  const me = s.f[seat] as Fighter, foe = s.f[1 - seat] as Fighter
  if (me.a === ACT.hurt || me.a === ACT.ko) return idle
  const dist = Math.abs(foe.x - me.x), toward = foe.x >= me.x ? BTN.right : BTN.left, away = toward === BTN.right ? BTN.left : BTN.right
  const foeStriking = (foe.a === ACT.punch || foe.a === ACT.kick) && dist < 130
  if (me.a === ACT.none && !me.air) {
    if (foeStriking && rng() < (me.blk ? 0.92 : 0.16)) return { h: BTN.block, e: 0 }
    if (dist > 100) return { h: toward, e: rng() < 0.015 ? BTN.jump : 0 }
    if (dist > 66 && rng() < 0.2) return { h: 0, e: BTN.kick }
    if (dist <= 66 && rng() < 0.22) return { h: 0, e: rng() < 0.6 ? BTN.punch : BTN.kick }
    if (dist < 52 && rng() < 0.3) return { h: away, e: 0 }
    return rng() < 0.5 ? { h: toward, e: 0 } : idle
  }
  return idle
}

function forfeit(s: FightState, seat: number): FightState { s.left = seat; return s }

const rules: RealtimeRules<FightState, FightInput, FightSnap> = {
  id: 'fight',
  label: 'Fight',
  hz: HZ,
  seats: { min: 2, max: 2 },
  options: {
    rounds: { label: 'Rounds', values: [1, 3, 5], default: 3, names: ['Single round', 'Best of 3', 'Best of 5'] },
    seconds: { label: 'Round clock', values: [30, 60, 90], default: 60, names: ['30 seconds', '60 seconds', '90 seconds'] },
  },
  start: (seats, rng, options) => start(seats, rng, cleanArenaOptions(rules, options)),
  parseInput,
  idle: () => ({ h: 0, e: 0 }),
  reduce: (held, incoming) => ({ h: incoming.h, e: held.e | incoming.e | (incoming.h & ~held.h & EDGE) }),
  settle: (consumed) => ({ h: consumed.h, e: 0 }),
  step,
  outcome,
  snapshot,
  bot,
  forfeit,
}
export default rules
