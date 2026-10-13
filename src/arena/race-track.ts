/**
 * OWNER: games (real-time)
 * RACE TRACKS — closed loops described by a few control points, smoothed (Catmull-Rom) and re-sampled into N points a
 * fixed distance apart (`step`), so "how far round the lap" is just an index plus a fraction. Pure numbers: the server
 * (race.ts) and the browser (race-draw.ts, the minimap) share this one file, so both see the same road.
 *
 * Units are world units; a car is 26 across, the road 180 wide (ROAD_HALF either side of the centre line), and an
 * invisible wall stands WALL_HALF from the centre line, so a car can never leave the band and cut across the infield.
 * Two tracks, both stylised Lagos: the Lekki Loop (a lap round the peninsula, palms and sand) and Third Mainland (a long
 * bridge over the lagoon with a hairpin at each end).
 */
export const ROAD_HALF = 90
export const KERB_HALF = 102
export const WALL_HALF = 175
export const WORLD_W = 2700
export const WORLD_H = 1800

export type TrackId = 'lekki' | 'mainland' | 'ikoyi'
export type ObstacleKind = 'okada' | 'danfo'
export interface TrackDef {
  id: TrackId; name: string; blurb: string; theme: 'land' | 'bridge'; points: readonly (readonly [number, number])[]
  /** Boost pads: [fraction of the lap, lateral offset (+ right)]. */
  pads: readonly (readonly [number, number])[]
  /** Stalled vehicles in the road: [fraction of the lap, lateral offset, kind]. A car that hits one bumps. */
  obstacles: readonly (readonly [number, number, ObstacleKind])[]
}
export interface Spot { arc: number; lat: number; x: number; y: number; a: number }
export interface Obstacle extends Spot { r: number; kind: ObstacleKind }
export const BOOST_RANGE = 30, BOOST_WIDE = 42

/** Lekki: a lumpy ellipse (three bulges and a pinch, so it has a long sweeper, a chicane-like S and a tight-ish right). */
const lekkiPoints = (): [number, number][] => Array.from({ length: 18 }, (_, k) => {
  const t = (2 * Math.PI * k) / 18, f = 1 + 0.1 * Math.sin(3 * t + 0.6) + 0.06 * Math.sin(2 * t + 2)
  return [Math.round(1350 + 1000 * f * Math.cos(t)), Math.round(900 + 560 * f * Math.sin(t))]
})
/** Ikoyi / Falomo: a short, technical rounded-rectangle circuit with a kink on the back straight. */
const ikoyiPoints = (): [number, number][] => Array.from({ length: 20 }, (_, k) => {
  const t = (2 * Math.PI * k) / 20, c = Math.cos(t), sn = Math.sin(t), n = 2.7
  const r = Math.pow(Math.abs(c) ** n + Math.abs(sn) ** n, -1 / n), dent = 1 - 0.14 * Math.exp(-((t - 4.7) ** 2) / 0.35)
  return [Math.round(1350 + 830 * r * c), Math.round(900 + 480 * r * sn * dent)]
})
/** Third Mainland: a long straight bridge out, a hairpin, a wavy way back, a hairpin. */
const mainlandPoints = (): [number, number][] => {
  const out: [number, number][] = []
  for (let x = 700; x <= 2000; x += 325) out.push([x, 430])
  for (let k = 1; k <= 5; k++) { const t = -Math.PI / 2 + (Math.PI * k) / 6; out.push([Math.round(2000 + 330 * Math.cos(t)), Math.round(760 + 330 * Math.sin(t))]) }
  for (let x = 2000, i = 0; x >= 700; x -= 325, i++) out.push([x, Math.round(1090 + (i % 2 ? 45 : -45) * (i > 0 && i < 4 ? 1 : 0))])
  for (let k = 1; k <= 5; k++) { const t = Math.PI / 2 + (Math.PI * k) / 6; out.push([Math.round(700 + 330 * Math.cos(t)), Math.round(760 + 330 * Math.sin(t))]) }
  return out
}

export const TRACK_DEFS: Readonly<Record<TrackId, TrackDef>> = Object.freeze({
  lekki: { id: 'lekki', name: 'Lekki Loop', blurb: 'Palms, sand and bends on the Lekki peninsula.', theme: 'land', points: lekkiPoints(), pads: [[0.08, -35], [0.4, 35], [0.7, 0]], obstacles: [] },
  mainland: { id: 'mainland', name: 'Third Mainland', blurb: 'The long bridge over the lagoon. Flat out, then a hairpin.', theme: 'bridge', points: mainlandPoints(), pads: [[0.1, 0], [0.5, -40], [0.82, 40]],
    obstacles: [[0.2, 58, 'okada'], [0.3, -55, 'danfo'], [0.44, 60, 'danfo'], [0.6, -58, 'okada'], [0.7, 55, 'danfo'], [0.9, -60, 'okada']] },
  ikoyi: { id: 'ikoyi', name: 'Ikoyi Falomo', blurb: 'Short and technical: tight corners round the Falomo roundabouts.', theme: 'land', points: ikoyiPoints(), pads: [[0.15, 0], [0.62, -30]], obstacles: [] },
})
export const TRACK_IDS: readonly TrackId[] = Object.freeze(['lekki', 'mainland', 'ikoyi'] as TrackId[])
export const isTrackId = (value: unknown): value is TrackId => typeof value === 'string' && Object.hasOwn(TRACK_DEFS, value)

export interface Track {
  def: TrackDef
  /** Number of samples (the loop wraps). */
  n: number
  /** Distance between samples, and the lap length (n * step). */
  step: number
  length: number
  x: Float64Array
  y: Float64Array
  /** Heading of the road at each sample (radians). */
  a: Float64Array
  /** Smallest turning radius found along the centre line (a design check, see the tests). */
  minRadius: number
  pads: Spot[]
  obstacles: Obstacle[]
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
}

const cache = new Map<string, Track>()
export function buildTrack(id: TrackId): Track {
  const hit = cache.get(id)
  if (hit) return hit
  const def = TRACK_DEFS[id]
  const pts = def.points, count = pts.length
  const dense: [number, number][] = []
  const per = 24
  for (let i = 0; i < count; i++) {
    const p0 = pts[(i + count - 1) % count] as readonly [number, number], p1 = pts[i] as readonly [number, number]
    const p2 = pts[(i + 1) % count] as readonly [number, number], p3 = pts[(i + 2) % count] as readonly [number, number]
    for (let k = 0; k < per; k++) { const t = k / per; dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]) }
  }
  const cum: number[] = [0]
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1] as [number, number], b = dense[i % dense.length] as [number, number]
    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = cum[dense.length] as number
  const n = Math.round(total / 40)
  const step = total / n
  const x = new Float64Array(n), y = new Float64Array(n), a = new Float64Array(n)
  let j = 0
  for (let i = 0; i < n; i++) {
    const want = i * step
    while (j < dense.length - 1 && (cum[j + 1] as number) < want) j++
    const p = dense[j] as [number, number], q = dense[(j + 1) % dense.length] as [number, number]
    const span = (cum[j + 1] as number) - (cum[j] as number)
    const f = span > 0 ? (want - (cum[j] as number)) / span : 0
    x[i] = p[0] + (q[0] - p[0]) * f; y[i] = p[1] + (q[1] - p[1]) * f
  }
  for (let i = 0; i < n; i++) {
    const nx = (i + 1) % n, pv = (i + n - 1) % n
    a[i] = Math.atan2((y[nx] as number) - (y[pv] as number), (x[nx] as number) - (x[pv] as number))
  }
  let minRadius = Infinity
  for (let i = 0; i < n; i++) {
    let turn = (a[(i + 1) % n] as number) - (a[(i + n - 1) % n] as number)
    while (turn > Math.PI) turn -= 2 * Math.PI
    while (turn < -Math.PI) turn += 2 * Math.PI
    if (Math.abs(turn) > 1e-6) minRadius = Math.min(minRadius, (2 * step) / Math.abs(turn))
  }
  const track: Track = { def, n, step, length: n * step, x, y, a, minRadius, pads: [], obstacles: [] }
  const spot = (frac: number, lat: number): Spot => { const arc = frac * track.length; return { arc, lat, ...pointAt(track, arc, lat) } }
  track.pads = def.pads.map(([f, l]) => spot(f, l))
  track.obstacles = def.obstacles.map(([f, l, kind]) => ({ ...spot(f, l), kind, r: kind === 'danfo' ? 19 : 10 }))
  cache.set(id, track)
  return track
}

export interface Projection {
  /** Index of the segment (sample i to i+1) the point is nearest to. */
  i: number
  /** Distance along the lap, 0 <= arc < length. */
  arc: number
  /** Distance from the centre line. */
  dist: number
  /** Signed: positive on the right-hand side of the direction of travel. */
  off: number
  /** The nearest point on the centre line, and the unit vector from it to the point. */
  px: number
  py: number
}

/** Nearest point on the centre line, looking only at the segments near `hint` (-4 .. +9) so a path through the infield cannot teleport a car along the lap. */
export function project(track: Track, px: number, py: number, hint: number, from = -4, to = 9): Projection {
  const n = track.n
  let best = Infinity, bi = 0, bt = 0, bx = 0, by = 0
  for (let d = from; d <= to; d++) {
    const i = (((hint + d) % n) + n) % n, j = (i + 1) % n
    const ax = track.x[i] as number, ay = track.y[i] as number
    const sx = (track.x[j] as number) - ax, sy = (track.y[j] as number) - ay
    const len2 = sx * sx + sy * sy
    let t = len2 > 0 ? ((px - ax) * sx + (py - ay) * sy) / len2 : 0
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const qx = ax + sx * t, qy = ay + sy * t
    const d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy)
    if (d2 < best) { best = d2; bi = i; bt = t; bx = qx; by = qy }
  }
  const j = (bi + 1) % n
  const tx = (track.x[j] as number) - (track.x[bi] as number), ty = (track.y[j] as number) - (track.y[bi] as number)
  const cross = tx * (py - by) - ty * (px - bx)
  const dist = Math.sqrt(best)
  return { i: bi, arc: (bi + bt) * track.step, dist, off: cross >= 0 ? dist : -dist, px: bx, py: by }
}

/** Index of the segment nearest to a point, searching the whole loop (placing a camera or a minimap marker, never used for scoring). */
export function nearestIndex(track: Track, px: number, py: number): number {
  let best = Infinity, bi = 0
  for (let i = 0; i < track.n; i++) { const d = ((track.x[i] as number) - px) ** 2 + ((track.y[i] as number) - py) ** 2; if (d < best) { best = d; bi = i } }
  return bi
}

/** A point `arc` along the lap and `lateral` to the right of the centre line, with the road's heading there. */
export function pointAt(track: Track, arc: number, lateral = 0): { x: number; y: number; a: number } {
  const L = track.length
  const u = (((arc % L) + L) % L) / track.step
  const i = Math.floor(u) % track.n, j = (i + 1) % track.n, f = u - Math.floor(u)
  const x = (track.x[i] as number) + ((track.x[j] as number) - (track.x[i] as number)) * f
  const y = (track.y[i] as number) + ((track.y[j] as number) - (track.y[i] as number)) * f
  let da = (track.a[j] as number) - (track.a[i] as number)
  while (da > Math.PI) da -= 2 * Math.PI
  while (da < -Math.PI) da += 2 * Math.PI
  const a = (track.a[i] as number) + da * f
  return { x: x - Math.sin(a) * lateral, y: y + Math.cos(a) * lateral, a }
}
