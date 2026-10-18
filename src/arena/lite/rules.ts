/**
 * OWNER: spaces (lite games)
 * THE LITE ENGINE: one RealtimeRules (../rules.ts) that plays any lite game definition (./schema.ts). It is the sandbox: a definition
 * only chooses from fixed kinds, behaviours and win rules, so no author's code runs on the server.
 *
 * WHICH GAME. A room's option `game` names a definition: the built-in examples (./examples.ts) or one a player imported, which the
 * server registers here when it loads or stores it (registerLite, server/spaces/games.ts). The option's list of values is that live list.
 *
 * PHYSICS. Whole numbers only, in arena units; every random draw comes from `rng`, so a match replays exactly (replayMatch). Things are
 * axis-aligned boxes for collisions whatever their shape (a circle is drawn round). A player hit by a hazard loses a life and cannot
 * be hit again for one second.
 *
 * SNAPSHOT (sent every tick, well under 300 bytes at 8 seats): [tick, secondsLeft, ...players, ...things]
 *   a player   x*256+y, lives*1000+min(score, 999), with lives 0 once out
 *   a thing    kind index*65536 + x*256 + y            (kind index into def.entities; arena at most 240, so x and y fit a byte)
 */
import { ArenaInputError, type ArenaOutcome, type RealtimeRules } from '../rules.ts'
import { LITE_EXAMPLES } from './examples.ts'
import { LITE_LIMITS, type LiteEntity, type LiteGameV1 } from './schema.ts'

/** The definitions a room may play, by id. Built-ins first; the server adds imported games. */
const DEFS = new Map<string, LiteGameV1>(LITE_EXAMPLES.map(({ id, def }) => [id, def]))
const IDS: string[] = LITE_EXAMPLES.map(({ id }) => id)
const NAMES: string[] = LITE_EXAMPLES.map(({ def }) => def.title)
/** Make an imported definition playable under `id` (`l` + 8 characters, server/spaces/games.ts). */
export function registerLite(id: string, def: LiteGameV1): void {
  if (!/^l[0-9a-z]{8}$/.test(id)) return
  if (!DEFS.has(id)) { IDS.push(id); NAMES.push(def.title) }
  else NAMES[IDS.indexOf(id)] = def.title
  DEFS.set(id, def)
}
export function forgetLite(id: string): void {
  if (LITE_EXAMPLES.some((example) => example.id === id)) return
  const at = IDS.indexOf(id)
  if (at >= 0) { IDS.splice(at, 1); NAMES.splice(at, 1) }
  DEFS.delete(id)
}
export const liteDef = (id: unknown): LiteGameV1 | null => (typeof id === 'string' ? DEFS.get(id) ?? null : null)

export interface Mover { x: number; y: number; lives: number; score: number; out: number; safe: number; at: boolean }
export interface Thing { k: number; x: number; y: number; vx: number; vy: number }
export interface LiteState {
  options: { game: string }
  tick: number
  players: Mover[]
  things: Thing[]
  /** Next spawn tick per kind. */
  next: number[]
  /** Ticks the game lasts. */
  end: number
  /** Order seats went out, first out first. */
  gone: number[]
  winner: number
  over: boolean
}
/** One input: dx and dy, each -1, 0 or 1, packed as (dx+1)*3 + (dy+1) (0..8; 4 is still). */
export type LiteInput = number

const sizeOf = (def: LiteGameV1, k: number): number => def.entities[k]?.size ?? 4
const clamp = (n: number, lo: number, hi: number): number => (n < lo ? lo : n > hi ? hi : n)
const hits = (ax: number, ay: number, as: number, bx: number, by: number, bs: number): boolean => ax < bx + bs && bx < ax + as && ay < by + bs && by < ay + as
const randInt = (rng: () => number, n: number): number => Math.min(n - 1, Math.floor(rng() * n))

function spawn(def: LiteGameV1, k: number, entity: LiteEntity, rng: () => number): Thing {
  const size = entity.size, w = def.arena.w - size, h = def.arena.h - size
  let x = 0, y = 0
  if (entity.spawn === 'fixed') { x = clamp(entity.x ?? 0, 0, w); y = clamp(entity.y ?? 0, 0, h) }
  else if (entity.spawn === 'top') { x = randInt(rng, w + 1); y = 0 }
  else if (entity.spawn === 'edges') { const side = randInt(rng, 4); x = side === 1 ? w : side === 3 ? 0 : randInt(rng, w + 1); y = side === 0 ? 0 : side === 2 ? h : randInt(rng, h + 1) }
  else { x = randInt(rng, w + 1); y = randInt(rng, Math.max(1, Math.floor(h * 0.7))) }
  const s = entity.speed
  const vx = entity.behaviour === 'bounce' || entity.behaviour === 'patrol' ? (rng() < 0.5 ? -s : s) : 0
  const vy = entity.behaviour === 'fall' ? s : entity.behaviour === 'bounce' ? (rng() < 0.5 ? -s : s) : 0
  return { k, x, y, vx, vy }
}

function startState(seats: number, rng: () => number, options: { game: string }): LiteState {
  const def = liteDef(options.game) ?? LITE_EXAMPLES[0]!.def
  const size = def.player.size, gap = def.arena.w / (seats + 1)
  const players: Mover[] = Array.from({ length: seats }, (_, seat) => ({
    x: clamp(Math.round(gap * (seat + 1) - size / 2), 0, def.arena.w - size), y: def.controls === 'left-right' ? def.arena.h - size : clamp(Math.round(def.arena.h - size * 2), 0, def.arena.h - size),
    lives: def.player.lives, score: 0, out: 0, safe: 0, at: false,
  }))
  const things: Thing[] = []
  def.entities.forEach((entity, k) => { if (entity.spawn === 'fixed') things.push(spawn(def, k, entity, rng)) })
  return { options: { game: liteDef(options.game) ? options.game : LITE_EXAMPLES[0]!.id }, tick: 0, players, things, next: def.entities.map((entity) => (entity.spawn === 'fixed' ? Infinity : Math.min(entity.every ?? 30, def.hz))), end: (def.rules.seconds ?? 60) * def.hz, gone: [], winner: -1, over: false }
}

const unpack = (input: LiteInput): [number, number] => [Math.floor(input / 3) - 1, (input % 3) - 1]
const defOf = (state: LiteState): LiteGameV1 => liteDef(state.options.game) ?? LITE_EXAMPLES[0]!.def

function step(state: LiteState, inputs: readonly LiteInput[], rng: () => number): LiteState {
  if (state.over) return state
  const def = defOf(state), size = def.player.size, W = def.arena.w, H = def.arena.h
  state.tick += 1
  const walls = state.things.filter((thing) => def.entities[thing.k]?.kind === 'wall')
  // Players move (walls block), then things move, then everything meets.
  state.players.forEach((p, seat) => {
    if (p.out || p.at) return
    const [dx, dy] = unpack(inputs[seat] ?? 4)
    const nx = clamp(p.x + dx * def.player.speed, 0, W - size), ny = def.controls === 'left-right' ? p.y : clamp(p.y + dy * def.player.speed, 0, H - size)
    if (!walls.some((w) => hits(nx, ny, size, w.x, w.y, sizeOf(def, w.k)))) { p.x = nx; p.y = ny }
    if (p.safe > 0) p.safe -= 1
  })
  for (const thing of state.things) {
    const entity = def.entities[thing.k]
    if (!entity) continue
    const s = entity.size
    if (entity.behaviour === 'chase') {
      let best: Mover | null = null, far = Infinity
      for (const p of state.players) { if (p.out || p.at) continue; const d = Math.abs(p.x - thing.x) + Math.abs(p.y - thing.y); if (d < far) { far = d; best = p } }
      if (best) { thing.x += clamp(best.x - thing.x, -entity.speed, entity.speed); thing.y += clamp(best.y - thing.y, -entity.speed, entity.speed) }
    } else {
      thing.x += thing.vx; thing.y += thing.vy
      if (entity.behaviour === 'bounce' || entity.behaviour === 'patrol') {
        if (thing.x < 0 || thing.x > W - s) { thing.vx = -thing.vx; thing.x = clamp(thing.x, 0, W - s) }
        if (thing.y < 0 || thing.y > H - s) { thing.vy = -thing.vy; thing.y = clamp(thing.y, 0, H - s) }
      }
    }
  }
  // Fallen things leave the field.
  state.things = state.things.filter((thing) => thing.y <= H && thing.x >= -40 && thing.x <= W + 40)
  // Meetings.
  state.players.forEach((p, seat) => {
    if (p.out || p.at) return
    state.things = state.things.filter((thing) => {
      const entity = def.entities[thing.k]
      if (!entity || !hits(p.x, p.y, size, thing.x, thing.y, entity.size)) return true
      if (entity.kind === 'hazard') {
        if (p.safe > 0) return true
        p.lives -= 1; p.safe = def.hz
        if (p.lives <= 0) { p.out = state.tick; state.gone.push(seat) }
        return entity.behaviour !== 'fall'
      }
      if (entity.kind === 'pickup') { p.score = Math.min(999, p.score + (entity.value ?? 1)); return false }
      if (entity.kind === 'goal') { if (!p.at) { p.at = true; if (state.winner < 0) state.winner = seat } return true }
      return true
    })
  })
  // Spawns, within the kind's and the field's limits.
  def.entities.forEach((entity, k) => {
    if (state.tick < (state.next[k] ?? Infinity)) return
    state.next[k] = state.tick + (entity.every ?? 30)
    if (state.things.length >= LITE_LIMITS.alive || state.things.filter((thing) => thing.k === k).length >= (entity.max ?? 4)) return
    state.things.push(spawn(def, k, entity, rng))
  })
  // The end.
  const alive = state.players.filter((p) => !p.out).length, seats = state.players.length
  const rules = def.rules
  if (rules.win === 'last-standing' && (seats > 1 ? alive <= 1 : alive === 0)) state.over = true
  if (rules.win === 'most-points' && state.players.some((p) => p.score >= (rules.points ?? 20))) state.over = true
  if (rules.win === 'first-to-goal' && state.winner >= 0) state.over = true
  if (alive === 0 || state.tick >= state.end) state.over = true
  return state
}

/** Finishing places: by the win rule, ties broken by score then lives then seat. */
function places(state: LiteState, def: LiteGameV1): number[] {
  const order = state.players.map((p, seat) => ({ seat, p }))
  const key = (entry: { seat: number; p: Mover }): number[] => {
    const { p, seat } = entry, outAt = p.out || Infinity
    if (def.rules.win === 'first-to-goal') return [seat === state.winner ? 0 : 1, p.at ? 0 : 1, -p.score, -p.lives]
    if (def.rules.win === 'most-points') return [-p.score, -outAt, -p.lives]
    return [-outAt, -p.lives, -p.score]
  }
  order.sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!; return a.seat - b.seat })
  const out = new Array<number>(state.players.length)
  order.forEach((entry, index) => { out[entry.seat] = index + 1 })
  return out
}

/** The computer: away from the nearest hazard close by, else towards the nearest pickup or goal. */
function bot(state: LiteState, seat: number): LiteInput {
  const def = defOf(state), p = state.players[seat]
  if (!p || p.out || p.at) return 4
  const cx = p.x + def.player.size / 2, cy = p.y + def.player.size / 2
  let danger: Thing | null = null, near = Infinity, want: Thing | null = null, wantFar = Infinity
  for (const thing of state.things) {
    const entity = def.entities[thing.k]
    if (!entity) continue
    const tx = thing.x + entity.size / 2, ty = thing.y + entity.size / 2, d = Math.abs(tx - cx) + Math.abs(ty - cy)
    if (entity.kind === 'hazard' && d < near && (def.controls === 'stick' || ty <= cy + def.player.size)) { near = d; danger = thing }
    if ((entity.kind === 'pickup' || entity.kind === 'goal') && d < wantFar) { wantFar = d; want = thing }
  }
  let dx = 0, dy = 0
  if (danger && near < def.player.size * 4) {
    const entity = def.entities[danger.k]!
    dx = danger.x + entity.size / 2 > cx ? -1 : 1
    if (def.controls === 'stick') dy = danger.y + entity.size / 2 > cy ? -1 : 1
    if ((dx < 0 && p.x <= 0) || (dx > 0 && p.x >= def.arena.w - def.player.size)) dx = -dx
  } else if (want) {
    const entity = def.entities[want.k]!
    const tx = want.x + entity.size / 2, ty = want.y + entity.size / 2
    dx = Math.abs(tx - cx) <= def.player.speed ? 0 : tx > cx ? 1 : -1
    if (def.controls === 'stick') dy = Math.abs(ty - cy) <= def.player.speed ? 0 : ty > cy ? 1 : -1
  }
  return (dx + 1) * 3 + (dy + 1)
}

const lite: RealtimeRules<LiteState, LiteInput, number[]> = {
  id: 'lite',
  label: 'Made by players',
  hz: 15,
  // Two at least: a practice game always has a computer player to beat.
  seats: { min: 2, max: LITE_LIMITS.seats },
  // The values are the live list of playable definitions (built-ins and imported ones); cleanArenaOptions reads it at call time.
  options: { game: { label: 'Game', values: IDS, default: LITE_EXAMPLES[0]!.id, names: NAMES } },
  start: startState,
  parseInput(raw) {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 8) throw new ArenaInputError('input must be 0..8')
    return raw
  },
  idle: () => 4,
  step,
  outcome(state) {
    if (!state.over) return null
    const def = defOf(state), place = places(state, def)
    const winners = place.map((n, seat) => (n === 1 ? seat : -1)).filter((seat) => seat >= 0)
    const result: ArenaOutcome = { winners, draw: false, reason: def.rules.win, text: winners.length ? `{${winners[0]}} wins ${def.title}.` : `${def.title} is over.`, scores: state.players.map((p) => p.score), places: place }
    return result
  },
  snapshot(state) {
    const def = defOf(state)
    const out = [state.tick, Math.max(0, Math.ceil((state.end - state.tick) / def.hz))]
    for (const p of state.players) out.push(p.x * 256 + p.y, (p.out ? 0 : p.lives) * 1000 + Math.min(999, p.score))
    for (const thing of state.things) out.push(thing.k * 65536 + clamp(thing.x, 0, 255) * 256 + clamp(thing.y, 0, 255))
    return out
  },
  bot,
  forfeit(state, seat) {
    const p = state.players[seat]
    if (p && !p.out) { p.out = state.tick || 1; p.lives = 0; state.gone.push(seat) }
    const alive = state.players.filter((q) => !q.out).length
    if (alive <= 1) state.over = true
    return state
  },
}
export default lite
