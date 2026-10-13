/**
 * OWNER: games (real-time)
 * RACE — a top-down arcade race for 2 to 4 cars on a Lagos track (race-track.ts). Pure rules (contract: ./rules.ts), run
 * by the server at 20 ticks a second; the same inputs and rng always give the same race (the tests replay one).
 *
 * INPUT. One small integer, what is held: LEFT 1, RIGHT 2, GAS 4, BRAKE 8 (brake while stopped reverses). Nothing is a tap,
 * so the client sends only when the held set changes.
 *
 * CAR. A heading and a world velocity. Steering turns the heading (less at speed, none when standing); the part of the
 * velocity sideways to the heading is bled off each tick (GRIP), so a car slides a little in a bend; braking while steering
 * hard loosens the grip (a drift). Off the road (past the kerb) the car loses speed fast; an invisible wall WALL_HALF from
 * the centre line scrapes and bounces. Cars bump each other (a circle each, a soft collision).
 *
 * RACE. A 3-2-1 countdown (60 ticks, cars locked), then GO. Progress is the distance covered along the centre line
 * (`best`, never reduced): the car's nearest centre-line point is looked up only within a short window of where it was
 * (race-track.ts `project`), so driving across the infield or being teleported counts for nothing, and the wall keeps cars
 * inside the road band anyway. Driving backwards lowers where the car IS but not what it has achieved. A lap is `length`
 * of progress; the race is `laps` laps. The first to reach it wins; positions are finish order, then progress. The race
 * ends when everyone has finished, 15 s after the first finisher, or at the time cap; cars still running are ranked by progress.
 */
import { ArenaInputError, cleanArenaOptions } from './rules.ts'
import type { ArenaOutcome, RealtimeRules } from './rules.ts'
import { BOOST_RANGE, BOOST_WIDE, buildTrack, pointAt, project, ROAD_HALF, TRACK_IDS, WALL_HALF } from './race-track.ts'
import type { Track, TrackId } from './race-track.ts'

export const HZ = 20
export const COUNTDOWN_TICKS = 60
export const GRACE_TICKS = 600
export const MAX_RACE_TICKS = 4800
export const CAR_R = 13
export const MAX_SEATS = 4
/** Ticks off the road (2 s) or pressing gas without moving (2.5 s) before the car is put back on the road. */
export const OFF_RESET_TICKS = 40, STUCK_RESET_TICKS = 50
export const INPUT = Object.freeze({ left: 1, right: 2, gas: 4, brake: 8 })
export const PHASE = Object.freeze({ countdown: 0, race: 1, over: 2 })
/** Snapshot flag bits (`fl` of a car). */
export const FLAG = Object.freeze({ off: 1, hit: 2, out: 4, brake: 8, boost: 16, spawn: 32 })

const ACC = 0.3, DRAG = 0.0035, COAST = 0.985, BRAKE = 0.8, REV_ACC = 0.18, REV_MAX = -3
const BOOST_ACC = 0.5, BOOST_TICKS = 16, TURN = 0.075, GRIP = 0.78, DRIFT_GRIP = 0.93, GRASS = 0.93, WALL_KEEP = 0.5

export type RaceOptions = { laps: number; track: number }
export interface Car {
  x: number; y: number; vx: number; vy: number
  /** Heading, radians (0 = +x, clockwise on screen). */
  h: number
  /** Where the car is along the lap, unwrapped (the last reading); and the furthest it has reached. */
  cur: number; best: number
  /** Nearest centre-line segment (the search window follows it). */
  i: number
  /** Distance from the centre line at the last tick. */
  dist: number
  /** Race tick it finished on (0: running). */
  fin: number
  out: boolean
  /** Ticks the "bump" flag stays up. */
  hit: number
  off: boolean
  braking: boolean
  /** Ticks of boost left (from a pad). */
  boost: number
  /** Ticks off the road / stuck in a row, the last place on the road, and ticks of "just put back" left. */
  offT: number; stuckT: number; safe: number; spawn: number
}
export interface RaceState {
  options: RaceOptions
  track: TrackId
  tick: number
  phase: number
  /** Ticks in the countdown (while counting down). */
  pt: number
  /** Race ticks since GO. */
  t: number
  cars: Car[]
  /** Race tick of the first finish (0: none). */
  firstFin: number
  /** How the race ended: 'finish' or 'time'. */
  why: string
}
/** One car on the wire: x, y, heading in 1/256 turns, forward speed x4 (negative reversing), progress, finish tick, flags. */
export type CarSnap = [number, number, number, number, number, number, number]
export interface RaceSnap { p: number; c: number; t: number; r: CarSnap[] }

export const trackOf = (options: RaceOptions): Track => buildTrack(TRACK_IDS[options.track] ?? 'lekki')
export const lapOf = (best: number, length: number): number => Math.max(0, Math.floor(best / length))
/** 8 sectors a lap: the checkpoints a car passes in order. */
export const SECTORS = 8
export const sectorOf = (best: number, length: number): number => Math.max(0, Math.floor((best / length) * SECTORS))

const wrapPi = (a: number): number => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }

export function newCar(track: Track, seat: number): Car {
  const arc = -(70 + seat * 60)
  const p = pointAt(track, arc, seat % 2 ? 30 : -30)
  const L = track.length
  return { x: p.x, y: p.y, vx: 0, vy: 0, h: p.a, cur: arc, best: arc, i: Math.floor((((arc % L) + L) % L) / track.step), dist: 30, fin: 0, out: false, hit: 0, off: false, braking: false, boost: 0, offT: 0, stuckT: 0, safe: arc, spawn: 0 }
}

/**
 * One tick of one car's own motion: steering, engine, grip, road and wall, then where it is along the lap. No other cars
 * (the browser reuses this to predict the player's own car).
 */
export function drive(c: Car, inp: number, track: Track): void {
  const steer = ((inp & INPUT.right) ? 1 : 0) - ((inp & INPUT.left) ? 1 : 0)
  const gas = (inp & INPUT.gas) !== 0, brake = (inp & INPUT.brake) !== 0
  let cos = Math.cos(c.h), sin = Math.sin(c.h)
  let f = c.vx * cos + c.vy * sin
  const sp = Math.abs(f)
  if (steer && sp > 0.3) {
    c.h = wrapPi(c.h + steer * TURN * Math.min(1, sp / 3) * (1 - 0.35 * Math.min(1, sp / 9)) * (f < 0 ? -1 : 1))
    cos = Math.cos(c.h); sin = Math.sin(c.h)
  }
  f = c.vx * cos + c.vy * sin
  let l = -c.vx * sin + c.vy * cos
  if (brake) f = f > 0.2 ? Math.max(0, f - BRAKE) : Math.max(REV_MAX, f - REV_ACC)
  else if (gas) f += ACC
  else f *= COAST
  if (c.boost > 0) { f += BOOST_ACC; c.boost -= 1 }
  f -= f * Math.abs(f) * DRAG
  if (c.off) f *= GRASS
  l *= brake && steer && sp > 5 ? DRIFT_GRIP : GRIP
  c.braking = brake && f > 0.5
  c.vx = f * cos - l * sin; c.vy = f * sin + l * cos
  c.x += c.vx; c.y += c.vy
  for (const o of track.obstacles) {
    const dx = c.x - o.x, dy = c.y - o.y, min = CAR_R + o.r
    if (dx * dx + dy * dy >= min * min) continue
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001, nx = dx / d, ny = dy / d
    c.x = o.x + nx * min; c.y = o.y + ny * min
    const vn = c.vx * nx + c.vy * ny
    if (vn < 0) { c.vx -= 1.4 * vn * nx; c.vy -= 1.4 * vn * ny }
    c.vx *= 0.8; c.vy *= 0.8; c.hit = 6
  }
  let pr = project(track, c.x, c.y, c.i)
  if (pr.dist > WALL_HALF) {
    const nx = (c.x - pr.px) / pr.dist, ny = (c.y - pr.py) / pr.dist
    c.x = pr.px + nx * WALL_HALF; c.y = pr.py + ny * WALL_HALF
    const vn = c.vx * nx + c.vy * ny
    if (vn > 0) { c.vx -= (1 + WALL_KEEP) * vn * nx; c.vy -= (1 + WALL_KEEP) * vn * ny }
    c.vx *= 0.92; c.vy *= 0.92
    c.hit = 6
    pr = project(track, c.x, c.y, pr.i)
  }
  c.off = pr.dist > ROAD_HALF + 8
  c.dist = pr.dist
  for (const pad of track.pads) {
    let da = pr.arc - pad.arc
    if (da > track.length / 2) da -= track.length
    else if (da < -track.length / 2) da += track.length
    if (Math.abs(da) < BOOST_RANGE && Math.abs(pr.off - pad.lat) < BOOST_WIDE && c.boost < BOOST_TICKS - 4) c.boost = BOOST_TICKS
  }
  c.i = pr.i
  const L = track.length
  const curMod = ((c.cur % L) + L) % L
  let delta = pr.arc - curMod
  if (delta > L / 2) delta -= L
  else if (delta < -L / 2) delta += L
  c.cur += delta
  if (c.cur > c.best) c.best = c.cur
  // Put the car back: off the road for 2 s, or stuck with the pedal down, returns it to the last place it was on the road.
  if (c.spawn > 0) c.spawn -= 1
  if (c.off) c.offT += 1
  else { c.offT = 0; if (c.dist < ROAD_HALF - 15) c.safe = c.cur }
  c.stuckT = gas && !brake && Math.hypot(c.vx, c.vy) < 0.4 ? c.stuckT + 1 : 0
  if (c.offT >= OFF_RESET_TICKS || c.stuckT >= STUCK_RESET_TICKS) respawn(c, track)
}

/** Back on the centre line a little behind where the car was last on the road, facing the way round, standing. */
export function respawn(c: Car, track: Track): void {
  const arc = c.safe - 15, p = pointAt(track, arc, 0), L = track.length
  Object.assign(c, { x: p.x, y: p.y, vx: 0, vy: 0, h: p.a, cur: arc, i: Math.floor((((arc % L) + L) % L) / track.step), dist: 0, off: false, offT: 0, stuckT: 0, hit: 0, boost: 0, spawn: 20 })
}

function bump(cars: Car[]): void {
  for (let a = 0; a < cars.length; a++) {
    const p = cars[a] as Car
    if (p.out) continue
    for (let b = a + 1; b < cars.length; b++) {
      const q = cars[b] as Car
      if (q.out) continue
      const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy, min = 2 * CAR_R
      if (d2 >= min * min) continue
      const d = Math.sqrt(d2) || 0.001
      const nx = dx / d, ny = dy / d, push = (min - d) / 2
      p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push
      const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny
      if (rv < 0) {
        const j = -(1 + 0.5) * rv / 2
        p.vx -= j * nx; p.vy -= j * ny; q.vx += j * nx; q.vy += j * ny
      }
      p.vx *= 0.98; p.vy *= 0.98; q.vx *= 0.98; q.vy *= 0.98
      p.hit = 6; q.hit = 6
    }
  }
}

/** Seats best first: finished by finish tick, then by distance covered; cars that left last. */
export function standings(best: readonly number[], fin: readonly number[], out: readonly boolean[]): number[] {
  const seats = best.map((_, i) => i)
  return seats.sort((a, b) => {
    if (out[a] !== out[b]) return out[a] ? 1 : -1
    const fa = fin[a] || 0, fb = fin[b] || 0
    if (fa && fb) return fa - fb || (best[b] as number) - (best[a] as number) || a - b
    if (fa) return -1
    if (fb) return 1
    return (best[b] as number) - (best[a] as number) || a - b
  })
}
const order = (s: RaceState): number[] => standings(s.cars.map((c) => c.best), s.cars.map((c) => c.fin), s.cars.map((c) => c.out))

function start(seats: number, _rng: () => number, options: RaceOptions): RaceState {
  const opts = cleanArenaOptions(rules, options)
  const track = TRACK_IDS[opts.track] ?? 'lekki'
  const t = buildTrack(track)
  const n = Math.max(2, Math.min(MAX_SEATS, seats))
  return { options: opts, track, tick: 0, phase: PHASE.countdown, pt: 0, t: 0, cars: Array.from({ length: n }, (_, i) => newCar(t, i)), firstFin: 0, why: '' }
}

function parseInput(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 15) throw new ArenaInputError('bad input')
  return raw
}

function step(s: RaceState, inputs: readonly number[]): RaceState {
  s.tick += 1
  if (s.phase === PHASE.over) return s
  if (s.phase === PHASE.countdown) {
    s.pt += 1
    if (s.pt >= COUNTDOWN_TICKS) s.phase = PHASE.race
    return s
  }
  const track = trackOf(s.options)
  s.t += 1
  const total = s.options.laps * track.length
  s.cars.forEach((c, i) => {
    if (c.out) { c.vx *= 0.9; c.vy *= 0.9; return }
    if (c.hit > 0) c.hit -= 1
    drive(c, c.fin ? 0 : inputs[i] ?? 0, track)
  })
  bump(s.cars)
  for (const c of s.cars) {
    if (!c.out && !c.fin && c.best >= total) { c.fin = s.t; if (!s.firstFin) s.firstFin = s.t }
  }
  const live = s.cars.filter((c) => !c.out)
  if (live.every((c) => c.fin)) { s.phase = PHASE.over; s.why = 'finish' }
  else if (s.firstFin && s.t - s.firstFin >= GRACE_TICKS) { s.phase = PHASE.over; s.why = 'finish' }
  else if (s.t >= MAX_RACE_TICKS) { s.phase = PHASE.over; s.why = 'time' }
  return s
}

/**
 * `winners` lists the cars that FINISHED, first to last; `places` has every seat's place, 0 for a car that did not finish
 * (never ranked: a DNF has no place, whatever its distance). `scores` is the same place list.
 */
function outcome(s: RaceState): ArenaOutcome | null {
  const live = s.cars.filter((c) => !c.out)
  if (s.phase !== PHASE.over && live.length > 0) return null
  const ranked = order(s)
  const fin = ranked.filter((seat) => (s.cars[seat] as Car).fin)
  const places: number[] = s.cars.map(() => 0)
  fin.forEach((seat, place) => { places[seat] = place + 1 })
  if (!fin.length) return { winners: [], draw: true, reason: s.why || 'abandoned', text: 'Nobody finished the race.', scores: places, places }
  const rest = fin.slice(1).map((seat) => '{' + seat + '}').join(', ')
  const dnf = ranked.filter((seat) => !places[seat]).map((seat) => '{' + seat + '}').join(', ')
  return {
    winners: fin, draw: false, reason: s.why || 'finish', scores: places, places,
    text: '{' + fin[0] + '} wins the race!' + (rest ? ' Then ' + rest + '.' : '') + (dnf ? ' Did not finish: ' + dnf + '.' : ''),
  }
}

const heading256 = (h: number): number => (((Math.round((h / (2 * Math.PI)) * 256) % 256) + 256) % 256)
export const headingFrom256 = (a: number): number => (a / 256) * 2 * Math.PI

function snapshot(s: RaceState): RaceSnap {
  const r: CarSnap[] = s.cars.map((c) => [
    Math.round(c.x), Math.round(c.y), heading256(c.h), Math.round((c.vx * Math.cos(c.h) + c.vy * Math.sin(c.h)) * 4), Math.round(c.best), c.fin,
    (c.off ? FLAG.off : 0) | (c.hit > 0 ? FLAG.hit : 0) | (c.out ? FLAG.out : 0) | (c.braking ? FLAG.brake : 0) | (c.boost > 0 ? FLAG.boost : 0) | (c.spawn > 0 ? FLAG.spawn : 0),
  ])
  // c: seconds left of the countdown (3, 2, 1), so a countdown costs a frame a second; t: whole race ticks.
  return { p: s.phase, c: s.phase === PHASE.countdown ? 3 - Math.floor(s.pt / 20) : 0, t: s.t, r }
}

/** Per-seat top speed and lane for the computer racers: seat 0 is the fastest line, the rest a little slower and wider. */
const BOT_TOP = [8.9, 8.7, 8.5, 8.3], BOT_LANE = [-18, 30, -42, 12]
function bot(s: RaceState, seat: number, rng: () => number): number {
  if (s.phase !== PHASE.race) return 0
  const c = s.cars[seat] as Car
  if (c.fin || c.out) return 0
  const track = trackOf(s.options)
  const sp = Math.hypot(c.vx, c.vy)
  let lane = BOT_LANE[seat % 4] as number
  for (const o of track.obstacles) {
    let ahead = o.arc - c.cur
    ahead = ((ahead % track.length) + track.length) % track.length
    if (ahead < 300 && Math.abs(lane - o.lat) < 56) lane = o.lat > 0 ? o.lat - 66 : o.lat + 66
  }
  const near = pointAt(track, c.cur + 60 + sp * 12, lane)
  const far = pointAt(track, c.cur + 200 + sp * 16, lane)
  const diff = wrapPi(Math.atan2(near.y - c.y, near.x - c.x) - c.h)
  const bend = Math.abs(wrapPi(far.a - near.a))
  let inp = 0
  if (diff > 0.04) inp |= INPUT.right
  else if (diff < -0.04) inp |= INPUT.left
  const want = (BOT_TOP[seat % 4] as number) * (1 - Math.min(0.45, bend * 0.9)) * (Math.abs(diff) > 0.7 ? 0.6 : 1)
  if (sp > want + 2.5) inp |= INPUT.brake
  else if (sp < want && rng() > 0.01) inp |= INPUT.gas
  if (sp < 0.6 && c.dist > ROAD_HALF) inp |= INPUT.gas
  return inp
}

function forfeit(s: RaceState, seat: number): RaceState {
  const c = s.cars[seat]
  if (c) { c.out = true; if (s.phase === PHASE.race && s.cars.every((x) => x.out || x.fin)) { s.phase = PHASE.over; s.why = 'finish' } }
  return s
}

const rules: RealtimeRules<RaceState, number, RaceSnap> = {
  id: 'race',
  label: 'Race',
  hz: HZ,
  seats: { min: 2, max: MAX_SEATS },
  options: {
    laps: { label: 'Laps', values: [1, 3, 5], default: 3, names: ['1 lap', '3 laps', '5 laps'] },
    track: { label: 'Track', values: [0, 1, 2], default: 0, names: ['Lekki Loop', 'Third Mainland', 'Ikoyi Falomo'] },
  },
  start: (seats, rng, options) => start(seats, rng, options),
  parseInput,
  idle: () => 0,
  step,
  outcome,
  snapshot,
  bot,
  forfeit,
}
export default rules
