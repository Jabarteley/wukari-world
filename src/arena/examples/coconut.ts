/**
 * OWNER: games (real-time)
 * COCONUT DODGE: THE TEMPLATE FOR A PLAYER-MADE REAL-TIME GAME. Copy this file (and coconut.test.ts) to start your own.
 *
 * It is an EXAMPLE, not a live game: it is NOT listed in src/arena/registry.ts or src/arena/cartridges.ts, so no room can host
 * it. Its tests keep it honest. How to turn a copy into a real cartridge and submit it: docs/CARTRIDGES.md, "Player-made games".
 *
 * THE GAME. 2 to 4 players stand on the ground of a small field and move left or right. Coconuts drop from the top at random
 * columns, faster and more often as time goes on. A coconut that lands on you costs a life; you have 3. The last one standing
 * wins. After two minutes the match ends anyway: most lives left wins, then whoever lost their last life later.
 *
 * WHERE THE CONTRACT (src/arena/rules.ts, docs/CARTRIDGES.md) IS MET, rule by rule, is marked "CONTRACT:" below.
 */
import { ArenaInputError, cleanArenaOptions } from '../rules.ts'
import type { ArenaOutcome, RealtimeRules } from '../rules.ts'

// CONTRACT: hz is a whole number 1..30. 15 ticks a second is plenty for a game this slow.
export const HZ = 15
export const LIVES = 3
/** The field in whole units: x runs 0..W left to right, y runs 0..H top to bottom; the players stand at y = H. */
export const W = 120, H = 90
/** Half a player's width, a coconut's radius, a player's speed per tick. */
export const PW = 5, R = 3, MOVE = 3
/** Ticks before the first coconut (2 s to get ready), the hard end (2 minutes), at most this many coconuts in the air. */
export const READY = 30, MAX_TICKS = 120 * HZ, MAX_NUTS = 10
/** Snapshot flag bits for a player. */
export const FLAG = Object.freeze({ hit: 1, left: 2 })

export type CoconutOptions = { speed: number }
// CONTRACT: the state is plain JSON (numbers and arrays), whole numbers only, so it copies, logs and replays exactly.
export interface Player { x: number; lives: number; /** Ticks the "just hit" flash lasts. */ hit: number; /** The tick the last life went (0: still in). */ outAt: number; left: boolean }
export interface CoconutState { options: CoconutOptions; tick: number; over: boolean; players: Player[]; /** Falling coconuts, flat: x, y, x, y… */ nuts: number[] }
/** CONTRACT: what everyone sees, as small integers in arrays: [tick, over 0/1, [x, lives, flags per player], [x, y per coconut]]. About 130 bytes at 4 seats. */
export type CoconutSnap = [tick: number, over: number, players: number[], nuts: number[]]
/** Input: -1 move left, 0 stand still, 1 move right. Held, not tapped, so no `reduce`/`settle` is needed. */
export type CoconutInput = -1 | 0 | 1

/** How fast coconuts fall and how often a new one drops, from the speed option and the time gone (the game speeds up, so it ends). */
const fallOf = (s: CoconutState): number => s.options.speed + Math.floor(s.tick / 300)
const gapOf = (s: CoconutState): number => Math.max(2, 14 - 2 * s.options.speed - Math.floor(s.tick / 90))
const alive = (p: Player): boolean => p.lives > 0 && !p.left

// CONTRACT: `start` makes the first state from the seat count, the rng and the options; no clock, no I/O.
function start(seats: number, _rng: () => number, options: CoconutOptions): CoconutState {
  const opts = cleanArenaOptions(rules, options) // CONTRACT: unknown or out-of-range options fall back to the defaults.
  const n = Math.max(2, Math.min(4, seats))
  // Spread the players evenly along the ground.
  const players = Array.from({ length: n }, (_, i): Player => ({ x: Math.round(((i + 1) * W) / (n + 1)), lives: LIVES, hit: 0, outAt: 0, left: false }))
  return { options: opts, tick: 0, over: false, players, nuts: [] }
}

// CONTRACT: untrusted wire input becomes an Input or throws ArenaInputError. Exactly -1, 0 or 1: anything else (a string, an
// object, 2, 0.5, a huge payload) is refused, which also bounds its size.
function parseInput(raw: unknown): CoconutInput {
  if (raw !== -1 && raw !== 0 && raw !== 1) throw new ArenaInputError('bad input')
  return raw
}

// CONTRACT: one tick. It mutates and returns the state; the same state, inputs and rng draws always give the same result.
function step(s: CoconutState, inputs: readonly CoconutInput[], rng: () => number): CoconutState {
  if (s.over) return s
  s.tick += 1
  // 1. Move every player still in, clamped to the field. A seat with no input plays idle (0): the host sees to that.
  s.players.forEach((p, i) => {
    if (p.hit > 0) p.hit -= 1
    if (alive(p)) p.x = Math.max(PW, Math.min(W - PW, p.x + (inputs[i] ?? 0) * MOVE))
  })
  // 2. Coconuts fall; one that reaches the ground hits every player under it, then is gone.
  const fall = fallOf(s), kept: number[] = []
  for (let k = 0; k < s.nuts.length; k += 2) {
    const x = s.nuts[k] as number, y = (s.nuts[k + 1] as number) + fall
    if (y < H) { kept.push(x, y); continue }
    for (const p of s.players) {
      if (!alive(p) || Math.abs(p.x - x) > PW + R) continue
      p.lives -= 1; p.hit = 8
      if (p.lives === 0) p.outAt = s.tick
    }
  }
  s.nuts = kept
  // 3. A new coconut now and then. CONTRACT: randomness ONLY from `rng`, drawn in `step` (never in snapshot or outcome), so a replay draws the same.
  if (s.tick >= READY && s.tick % gapOf(s) === 0 && s.nuts.length < MAX_NUTS * 2) s.nuts.push(R + Math.floor(rng() * (W - 2 * R + 1)), 0)
  // 4. Over when one (or nobody) is left, or at the hard end, so a match always finishes.
  if (s.players.filter(alive).length <= 1 || s.tick >= MAX_TICKS) s.over = true
  return s
}

/** Finishing places, 1 = first: more lives first, then whoever went out later; a player who left is last. Ties share a place. */
export function placesOf(s: CoconutState): number[] {
  const key = (p: Player): number => (p.left ? -1 : p.lives * 100_000 + (p.lives > 0 ? 0 : p.outAt))
  return s.players.map((p) => 1 + s.players.filter((q) => key(q) > key(p)).length)
}

// CONTRACT: null while the game goes on; then winners, draw, reason, text (seats as {0}, {1}) and scores. `places` ranks every seat.
function outcome(s: CoconutState): ArenaOutcome | null {
  if (!s.over) return null
  const places = placesOf(s), scores = s.players.map((p) => p.lives)
  const first = places.flatMap((place, seat) => (place === 1 ? [seat] : []))
  const reason = s.players.some((p) => p.left) && s.players.filter(alive).length <= 1 ? 'forfeit' : s.tick >= MAX_TICKS ? 'time' : 'last'
  if (first.length === s.players.length) return { winners: [], draw: true, reason, text: 'A draw: nobody outlasted the others.', scores, places }
  const names = first.map((seat) => '{' + seat + '}').join(' and ')
  return { winners: first, draw: false, reason, text: reason === 'time' ? names + ' lasted longest.' : names + ' is the last one standing!', scores, places }
}

// CONTRACT: compact JSON, small whole numbers, sent every tick: well under 300 bytes even with 4 players and 10 coconuts.
function snapshot(s: CoconutState): CoconutSnap {
  const players = s.players.flatMap((p) => [p.x, p.lives, (p.hit > 0 ? FLAG.hit : 0) | (p.left ? FLAG.left : 0)])
  return [s.tick, s.over ? 1 : 0, players, s.nuts.slice()]
}

// CONTRACT: a bot for every seat. It plays alone-mode, empty seats and a person's seat while they reconnect. It may use `rng`
// (the replay calls it again with the same draws). This one steps away from the nearest coconut coming down on it, and
// hesitates one tick in six, so it is beatable and a bots-only match ends.
function bot(s: CoconutState, seat: number, rng: () => number): CoconutInput {
  const me = s.players[seat]
  if (!me || !alive(me) || s.over) return 0 // Out players draw nothing, so the draws stay the same whoever is out.
  if (rng() < 1 / 6) return 0
  let near = -1, nearY = -1
  for (let k = 0; k < s.nuts.length; k += 2) {
    const x = s.nuts[k] as number, y = s.nuts[k + 1] as number
    if (Math.abs(x - me.x) <= PW + R + 4 && y > nearY) { near = x; nearY = y } // the lowest one above me is the most urgent
  }
  if (near < 0) return me.x < W / 2 - MOVE ? 1 : me.x > W / 2 + MOVE ? -1 : 0 // nothing coming: drift back to the middle
  const away: CoconutInput = near >= me.x ? -1 : 1
  if ((away < 0 && me.x <= PW) || (away > 0 && me.x >= W - PW)) return away < 0 ? 1 : -1 // against a wall: run the other way
  return away
}

// CONTRACT: the seat leaves for good. It is out (and placed last); when one player is left, that player wins.
function forfeit(s: CoconutState, seat: number): CoconutState {
  const p = s.players[seat]
  if (!p || p.left) return s
  p.left = true
  if (p.lives > 0) p.outAt = s.tick
  if (s.players.filter(alive).length <= 1) s.over = true
  return s
}

const rules: RealtimeRules<CoconutState, CoconutInput, CoconutSnap> = {
  id: 'coconut', // CONTRACT: 2-16 lower-case letters; the same id goes in the cartridge entry.
  label: 'Coconut Dodge',
  hz: HZ,
  seats: { min: 2, max: 4 },
  // CONTRACT: options the host may pick in the lobby, each with its allowed values and a default (TableOptionSpecs).
  options: { speed: { label: 'Speed', values: [1, 2, 3], default: 2, names: ['Gentle', 'Normal', 'Wild'] } },
  start,
  parseInput,
  idle: () => 0, // CONTRACT: what a seat does when it sent nothing, or left.
  step,
  outcome,
  snapshot,
  bot,
  forfeit,
}
export default rules
