/**
 * OWNER: scenes
 * Who is in a place besides its regulars and the players, and where each of them is at any moment (pure: no THREE, no DOM, no network).
 *
 * Everything here is a function of (city, venue, time), never of a random draw at run time, so two players in one venue see the same
 * people without a word sent between them:
 *   - the CAST is fixed for each quarter of an hour (who sits, who stands, how many are far off);
 *   - the WALKERS are fixed for each short wave (how many cross the place, along which path);
 *   - a person's place at an instant is read off their TRACK (a list of keys with times), so it needs no state either.
 * The place itself is described by a Stage the scene fills in: where its door is, what is free to walk on, which seats are real.
 * Paths are routed round furniture by the scene's own walk grid, and a walker who would pass through another person is held back or sent
 * another way before the wave starts. The count follows the hour and the weather (density.ts).
 */
import { makeRng } from '../../game/util.ts'
import { densityFor } from './density.ts'
import type { Mix, Tier } from './density.ts'

export const QUARTER_MS = 900_000
/** Walkers are planned in waves this long; a walk always ends inside its wave. */
export const WAVE_MS = 40_000
/** The least distance between two people, centre to centre (scene units): the same floor the scene keeps for its crowd (space.ts FIGURE_GAP). */
export const KEEP_APART = 1.05
/** How long people take to arrive and to leave around a quarter's turn, so nobody appears or vanishes in one frame. */
export const SETTLE_SPREAD_MS = 100_000
/** Walking pace in scene units a second. */
export const PACE: readonly [number, number] = [1.35, 1.95]
const STEP = 0.55
export const AMBIENT_STRIDE_DISTANCE = STEP * 2

export type Role = 'walker' | 'sitter' | 'stander' | 'talker' | 'caller'
export type Mode = 'walk' | 'stand' | 'sit'
export type AmbientPose = 'stand' | 'relax' | 'work' | 'wave' | 'sit' | 'walk'

export interface Point { x: number; z: number }
export interface Seat { x: number; z: number; ry: number; seat: number }
/** The place, as the scene knows it. */
export interface Stage {
  bounds: readonly [number, number, number, number]
  /** Where people come in and go out, or null for a place with no marked door (its edge is used). */
  entrance: readonly [number, number] | null
  /** An open place lets people in at its edges as well as at the door; a room only at its door. */
  open: boolean
  /** May a body stand here: on free floor, off every spot marker, clear of the regulars. */
  free(x: number, z: number): boolean
  /** A route that goes round what is in the way, ending at the place asked for, or at the nearest place that can be reached. */
  path(ax: number, az: number, bx: number, bz: number): Point[] | null
  seats: readonly Seat[]
  /** Free standing places (a spread of them, in a stable order). */
  points: readonly (readonly [number, number])[]
  /** People who are already there and stay (the regulars): walkers keep clear of them. */
  fixed: readonly Point[]
}

export interface Key { t: number; x: number; z: number; ry: number; mode: Mode; hold: number; seat?: number }
export interface Track { id: string; seed: string; role: Role; keys: readonly Key[]; with?: string }
export interface Sample {
  x: number; z: number; ry: number; mode: Mode; pose: AmbientPose; seat: number; step: number; walking: boolean
  /** Continuous walk cycle, 0 … 1. Optional so hand-authored samples and older callers remain valid. */
  stride?: number
}

export interface Ident {
  cityId: string
  venueId: string
  kind: string
  tier: Tier
  /** Is it raining at this time? Asked per quarter and per wave, so a shower that starts mid-visit thins the crowd as it goes. */
  rainingAt(at: number): boolean
  /** The Lagos hour (with fraction) at this time. */
  hourAt(at: number): number
  /** Optional: how much busier than usual the place is at this time (0 … 1), for a match night. Absent = 0. */
  liftAt?(at: number): number
}

const key = (id: Ident, ...parts: (string | number)[]): string => ['ambient', id.cityId, id.venueId, ...parts].join('|')
const between = (next: () => number, low: number, high: number): number => low + next() * (high - low)
const pick = <T>(list: readonly T[], next: () => number): T | undefined => list[Math.floor(next() * list.length)]

/** A seeded shuffle that leaves its input alone. */
function shuffled<T>(list: readonly T[], next: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j] as T, out[i] as T] }
  return out
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z)

// ---- the door ----------------------------------------------------------------------------------------------------------------

/** The places a person may arrive from and leave by: the door, and for an open place the middle of each side as well. */
export function gates(stage: Stage): Point[] {
  const [x0, z0, x1, z1] = stage.bounds, found: Point[] = []
  if (stage.entrance) found.push({ x: stage.entrance[0], z: stage.entrance[1] })
  if (stage.open || !stage.entrance) {
    for (const [x, z] of [[(x0 + x1) / 2, z0 + 0.6], [x0 + 0.6, (z0 + z1) / 2], [x1 - 0.6, (z0 + z1) / 2]] as const) if (stage.free(x, z)) found.push({ x, z })
  }
  return found.length ? found : [{ x: (x0 + x1) / 2, z: z1 - 0.8 }]
}

// ---- tracks ------------------------------------------------------------------------------------------------------------------

/** A track's place at an instant, or null while the person is not in the place. Pure. */
export function sampleTrack(track: Track, at: number): Sample | null {
  const keys = track.keys
  const first = keys[0], last = keys[keys.length - 1]
  if (!first || !last || at < first.t || at > last.t + last.hold) return null
  let walked = 0
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as Key
    if (at <= k.t + k.hold) return { x: k.x, z: k.z, ry: k.ry, mode: k.mode, pose: poseOf(track, k, at), seat: k.seat ?? 0.6, step: 0, walking: false }
    const next = keys[i + 1]
    if (!next) break
    const leg = Math.hypot(next.x - k.x, next.z - k.z), from = k.t + k.hold
    if (at < next.t) {
      const f = (at - from) / Math.max(1, next.t - from)
      const distance = walked + leg * f
      return {
        x: k.x + (next.x - k.x) * f, z: k.z + (next.z - k.z) * f, ry: Math.atan2(next.x - k.x, next.z - k.z), mode: 'walk', pose: 'walk', seat: 0,
        step: Math.floor(distance / STEP) % 2, stride: (distance / (STEP * 2)) % 1, walking: true,
      }
    }
    walked += leg
  }
  return null
}

/** What a person who stands or sits is doing now: mostly nothing, now and then a small thing (shifts weight, looks at a phone, waves, talks with a hand). */
export function poseOf(track: Pick<Track, 'seed' | 'role'>, k: Pick<Key, 'mode'>, at: number): AmbientPose {
  if (k.mode === 'sit') return 'sit'
  const period = 6_500 + (hashOf(track.seed) % 7_000), phase = (at + (hashOf(`${track.seed}|phase`) % period)) % period
  const slot = Math.floor((at + (hashOf(`${track.seed}|phase`) % period)) / period)
  const kind = hashOf(`${track.seed}|${slot}`) % 5
  if (track.role === 'talker') return phase < period * 0.45 ? 'wave' : 'stand'
  if (track.role === 'caller') return phase < period * 0.8 ? 'work' : 'stand'
  if (phase > 2_600) return 'stand'
  return kind === 0 ? 'relax' : kind === 1 ? 'work' : kind === 2 ? 'wave' : 'stand'
}

function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** The whole walk of a list of points, each reached at the pace given, with an optional wait at some of them. */
function walkKeys(start: number, points: readonly Point[], speed: number, waits: ReadonlyMap<number, number> = new Map()): Key[] {
  const keys: Key[] = []
  let t = start
  for (let i = 0; i < points.length; i++) {
    const at = points[i] as Point, before = points[i - 1], after = points[i + 1]
    if (before) t += (distance(before, at) / speed) * 1000
    const ahead = after ? Math.atan2(after.x - at.x, after.z - at.z) : before ? Math.atan2(at.x - before.x, at.z - before.z) : 0
    const hold = waits.get(i) ?? 0
    keys.push({ t, x: at.x, z: at.z, ry: ahead, mode: 'stand', hold })
    t += hold
  }
  return keys
}

/** Where people are standing in a set of tracks at an instant (the walkers' collision check reads this). */
function positionsAt(tracks: readonly Track[], at: number): Point[] {
  const out: Point[] = []
  for (const track of tracks) { const s = sampleTrack(track, at); if (s) out.push(s) }
  return out
}

/**
 * Does a candidate track come within KEEP_APART of a person already planned, at any instant it is in the place? It is looked at often enough
 * that two people walking at each other cannot step through one another between looks (about a fifth of a second while the candidate walks,
 * two fifths while it stands), and at the instants people appear and disappear: someone arriving at a door the moment another is leaving
 * by it is looked at too.
 */
function clashes(candidate: Track, others: readonly Track[], fixed: readonly Point[]): boolean {
  const first = candidate.keys[0], last = candidate.keys[candidate.keys.length - 1]
  if (!first || !last) return true
  const end = last.t + last.hold
  const meets = (at: number): boolean => {
    const me = sampleTrack(candidate, at)
    if (!me) return false
    for (const fixedAt of fixed) if (distance(me, fixedAt) < KEEP_APART) return true
    for (const other of positionsAt(others, at)) if (distance(me, other) < KEEP_APART) return true
    return false
  }
  for (let at = first.t; at <= end;) {
    if (meets(at)) return true
    at += sampleTrack(candidate, at)?.walking ? 200 : 400
  }
  if (meets(end)) return true
  for (const other of others) {
    const from = other.keys[0], to = other.keys[other.keys.length - 1]
    if (!from || !to) continue
    for (const edge of [from.t, to.t + to.hold]) if (edge >= first.t && edge <= end && meets(edge)) return true
  }
  return false
}

/** A route from one place to another that the walk grid can really take (it starts at `from` and ends within a step of `to`), or null. */
function route(stage: Stage, from: Point, to: Point): Point[] | null {
  const path = stage.path(from.x, from.z, to.x, to.z)
  if (!path) return null
  const points = [from, ...path]
  return distance(points[points.length - 1] as Point, to) <= 0.8 ? points : null
}

// ---- walkers -----------------------------------------------------------------------------------------------------------------

export function waveOf(at: number): number { return Math.floor((Number.isFinite(at) ? at : 0) / WAVE_MS) }

/** The mix of a place at an instant (the caller's hour and sky). */
export function mixAt(id: Ident, at: number): Mix { return densityFor(id.kind, id.hourAt(at), id.rainingAt(at), id.tier, id.liftAt?.(at) ?? 0) }

/** The people who cross the place in one wave. Each begins at a gate, may stop to look at something on the way, and leaves by a gate. */
export function planWave(stage: Stage, id: Ident, wave: number, quarter: readonly Track[]): Track[] {
  const start = wave * WAVE_MS
  const mix = mixAt(id, start)
  const gate = gates(stage)
  const next = makeRng(key(id, 'wave', wave))
  const tracks: Track[] = []
  for (let slot = 0; slot < mix.walkers; slot++) {
    const seed = key(id, 'walker', wave, slot)
    let placed: Track | null = null
    for (let attempt = 0; attempt < 5 && !placed; attempt++) {
      const from = pick(gate, next) as Point, to = pick(gate, next) as Point
      const via = attempt < 4 ? pick(stage.points, next) : undefined
      const stop = via ? { x: via[0], z: via[1] } : null
      const legs: Point[] = []
      const there = stop ? route(stage, from, stop) : null
      if (stop && there) {
        legs.push(...there)
        const out = route(stage, legs[legs.length - 1] as Point, to)
        if (out) legs.push(...out.slice(1))
        else continue
      } else {
        const direct = route(stage, from, to)
        if (!direct) continue
        legs.push(...direct)
      }
      if (legs.length < 2 || (!stop && distance(legs[0] as Point, legs[legs.length - 1] as Point) < 3)) continue
      const speed = between(next, PACE[0], PACE[1])
      const waits = new Map<number, number>()
      if (stop && next() < 0.7) waits.set(Math.max(1, legs.findIndex((p) => distance(p, stop) < 0.01)), 1_500 + Math.floor(next() * 3_500))
      const offset = Math.floor(next() * 12_000)
      const length = legs.reduce((sum, p, i) => (i ? sum + distance(legs[i - 1] as Point, p) : 0), 0)
      const duration = (length / speed) * 1000 + [...waits.values()].reduce((a, b) => a + b, 0)
      if (duration + offset > WAVE_MS - 2_000) continue
      // Held back a few seconds at a time when the way is taken, rather than walking through someone.
      for (let delay = 0; delay < 6 && !placed; delay++) {
        const t0 = start + offset + delay * 2_500
        if (t0 + duration > start + WAVE_MS) break
        const candidate: Track = { id: seed, seed, role: 'walker', keys: walkKeys(t0, legs, speed, waits) }
        if (!clashes(candidate, [...tracks, ...quarter], stage.fixed)) placed = candidate
      }
    }
    if (placed) tracks.push(placed)
  }
  return tracks
}

// ---- people who stay a while -------------------------------------------------------------------------------------------------

export function quarterOf(at: number): number { return Math.floor((Number.isFinite(at) ? at : 0) / QUARTER_MS) }

/** Every figure's persona is a seed text, which the look is drawn from. */
const persona = (id: Ident, q: number, tag: string, n: number): string => key(id, 'q', q, tag, n)

/**
 * The people who come for a while in one quarter of an hour: they come in by a gate, sit on a real seat or stand at a free place, and
 * leave by a gate a little after the quarter ends. Those of two quarters in a row use different seats and places (by parity), so the
 * ones leaving and the ones arriving never want the same one.
 */
export function planStays(stage: Stage, id: Ident, q: number): Track[] {
  const start = q * QUARTER_MS, mix = mixAt(id, start + QUARTER_MS / 2)
  const gate = gates(stage), next = makeRng(key(id, 'stay', q))
  const tracks: Track[] = []
  const taken: Point[] = [...stage.fixed]
  const mine = (index: number): boolean => (index + q) % 2 === 0
  const claim = (at: Point, apart = 1.5): boolean => { if (taken.some((other) => distance(other, at) < apart)) return false; taken.push(at); return true }
  const front = (seat: Seat): Point => ({ x: seat.x + Math.sin(seat.ry) * 0.9, z: seat.z + Math.cos(seat.ry) * 0.9 })
  const seats = shuffled(stage.seats.filter((seat, i) => mine(i) && stage.free(front(seat).x, front(seat).z)), next)
  const points = shuffled(stage.points.filter((_, i) => mine(i)), next)

  /** One person's stay: in by a gate, to the place, there until a little after the quarter ends, out by a gate. The arrival is moved later if it would meet someone. */
  const stay = (seed: string, role: Role, to: Point, face: number, mode: Mode, seat?: number, seatAt?: Seat): Track | null => {
    const from = pick(gate, next) as Point, out = pick(gate, next) as Point
    const ahead = seatAt ? front(seatAt) : to
    const goes = route(stage, from, ahead), comes = route(stage, ahead, out)
    if (!goes || !comes) return null
    const speed = between(next, PACE[0], PACE[1])
    const inward = seatAt ? [...goes, to] : goes
    const outward = seatAt ? comes : comes.slice(1)
    const t1 = start + QUARTER_MS + Math.floor(next() * SETTLE_SPREAD_MS)
    for (let attempt = 0; attempt < 5; attempt++) {
      const t0 = start + Math.floor(next() * SETTLE_SPREAD_MS)
      const keys = walkKeys(t0, inward, speed)
      const arrived = keys[keys.length - 1] as Key
      const hold = Math.max(5_000, t1 - arrived.t)
      keys[keys.length - 1] = { ...arrived, ry: face, mode, hold, ...(seat !== undefined ? { seat } : {}) }
      const leaving = walkKeys(arrived.t + hold, [to, ...outward], speed).slice(1)
      const candidate: Track = { id: seed, seed, role, keys: [...keys, ...leaving] }
      if (!clashes(candidate, tracks, stage.fixed)) return candidate
    }
    return null
  }

  for (let n = 0; n < mix.sitters; n++) {
    const seat = seats.shift()
    if (!seat) break
    if (!claim(seat, 1.1)) continue
    const track = stay(persona(id, q, 'sit', n), 'sitter', { x: seat.x, z: seat.z }, seat.ry, 'sit', seat.seat, seat)
    if (track) tracks.push(track)
  }
  let talkers = 0
  for (let n = 0; n < mix.standers;) {
    const spot = points.shift()
    if (!spot) break
    const here = { x: spot[0], z: spot[1] }
    if (!claim(here)) continue
    const pair = n + 1 < mix.standers && next() < 0.55
    if (pair) {
      const angle = next() * Math.PI * 2, mate = { x: here.x + Math.sin(angle) * 1.15, z: here.z + Math.cos(angle) * 1.15 }
      if (stage.free(mate.x, mate.z) && claim(mate, 1.1)) {
        const a = persona(id, q, 'talk', talkers++), b = persona(id, q, 'talk', talkers++)
        const first = stay(a, 'talker', here, Math.atan2(mate.x - here.x, mate.z - here.z), 'stand'), second = stay(b, 'talker', mate, Math.atan2(here.x - mate.x, here.z - mate.z), 'stand')
        if (first && second) { tracks.push({ ...first, with: b }, { ...second, with: a }); n += 2; continue }
      }
    }
    const caller = next() < 0.4
    const track = stay(persona(id, q, caller ? 'call' : 'wait', n), caller ? 'caller' : 'stander', here, next() * Math.PI * 2 - Math.PI, 'stand')
    if (track) tracks.push(track)
    n += 1
  }
  return tracks
}

/** The far crowd of a quarter: where each of them stands, and who they are. They never move and are never close to anything. */
export function planFar(stage: Stage, id: Ident, q: number): { x: number; z: number; ry: number; seed: string }[] {
  const mix = mixAt(id, q * QUARTER_MS + QUARTER_MS / 2)
  if (!mix.far) return []
  const next = makeRng(key(id, 'far', q))
  const [, z0, , z1] = stage.bounds
  // The back of the place, away from the camera: the figures there are small and few of them are looked at.
  const back = stage.points.filter(([, z]) => z < z0 + (z1 - z0) * 0.55)
  const chosen: { x: number; z: number; ry: number; seed: string }[] = []
  for (const [x, z] of shuffled(back.length >= mix.far ? back : stage.points, next)) {
    if (chosen.length >= mix.far) break
    if (stage.fixed.some((p) => distance(p, { x, z }) < 1.4) || chosen.some((p) => distance(p, { x, z }) < 1.3)) continue
    chosen.push({ x, z, ry: next() * Math.PI * 2 - Math.PI, seed: key(id, 'far', q, chosen.length) })
  }
  return chosen
}

// ---- the planner ------------------------------------------------------------------------------------------------------------

export interface Planner {
  /** Everyone on a track in the place at this instant. */
  at(now: number): { track: Track; sample: Sample }[]
  /** The far crowd of the quarter this instant falls in. */
  far(now: number): { x: number; z: number; ry: number; seed: string }[]
}

/** A planner for one place. It keeps only the quarters and waves round the instant it is asked about. */
export function createPlanner(stage: Stage, id: Ident): Planner {
  const stays = new Map<number, Track[]>(), waves = new Map<number, Track[]>(), farMap = new Map<number, { x: number; z: number; ry: number; seed: string }[]>()
  const keep = <T>(map: Map<number, T>, limit: number): void => { while (map.size > limit) map.delete(map.keys().next().value as number) }
  const stay = (q: number): Track[] => { let v = stays.get(q); if (!v) { v = id.tier === 'off' ? [] : planStays(stage, id, q); stays.set(q, v); keep(stays, 4) } return v }
  const wave = (w: number): Track[] => {
    let v = waves.get(w)
    if (!v) { const q = quarterOf(w * WAVE_MS); v = id.tier === 'off' ? [] : planWave(stage, id, w, [...stay(q - 1), ...stay(q), ...stay(quarterOf((w + 1) * WAVE_MS - 1))]); waves.set(w, v); keep(waves, 6) }
    return v
  }
  return {
    at(now) {
      const q = quarterOf(now), w = waveOf(now), out: { track: Track; sample: Sample }[] = []
      for (const track of [...stay(q - 1), ...stay(q), ...wave(w - 1), ...wave(w)]) { const sample = sampleTrack(track, now); if (sample) out.push({ track, sample }) }
      return out
    },
    far(now) {
      const q = quarterOf(now)
      let v = farMap.get(q)
      if (!v) { v = id.tier === 'full' ? planFar(stage, id, q) : []; farMap.set(q, v); keep(farMap, 3) }
      return v
    },
  }
}
