/**
 * OWNER: games (real-time)
 * RACE IN 3D, THE PURE PART: the numbers behind ./race-3d.ts that need no three.js and no browser, so they are tested in plain Node
 * (./race-3d.test.ts): the road as one ribbon mesh built from a track, where barriers, trees and lamps stand, how a car's wheels
 * turn and its body leans from how it moved, and the camera poses (chase, photo finish, lobby orbit).
 *
 * Axes. The rules are a plan view: x right, y down the screen, a heading `a` in radians turning clockwise on screen (0 = +x). The scene
 * maps rules (x, y) to three.js (x, z) at UNIT metres a unit, with +y up. A model that faces +z is turned by `facingZ(a)`, a model whose
 * long side runs along +x by `alongX(a)`. Lateral offsets on a track are positive to the right of the way round.
 */
import { BOOST_RANGE, BOOST_WIDE, KERB_HALF, pointAt, ROAD_HALF, WALL_HALF } from './race-track.ts'
import type { Track, TrackId } from './race-track.ts'
import { UNIT } from './race-units.ts'

export type V3 = [number, number, number]
/** A scene y-rotation that points a +z-facing model along rules heading `a`, and a +x-long model along it. */
export const facingZ = (a: number): number => Math.PI / 2 - a
export const alongX = (a: number): number => -a
const wrapPi = (a: number): number => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

/** The scene position (metres) of a rules point. */
export const toScene = (x: number, y: number, up = 0): V3 => [x * UNIT, up, y * UNIT]

// ---- the road ------------------------------------------------------------------------------------------------------------------

export interface RoadMesh { positions: Float32Array; normals: Float32Array; colors: Float32Array; indices: Uint16Array | Uint32Array; triangles: number }

/** sRGB 0xRRGGBB to the linear floats three.js keeps in a colour attribute. */
export function linear(hex: number): V3 {
  const f = (c: number): number => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  return [f((hex >> 16) & 255), f((hex >> 8) & 255), f(hex & 255)]
}

/** Flat-shaded, vertex-coloured quads. A quad is wound so that it faces the way of `hint`, whatever order its corners come in. */
class Quads {
  readonly p: number[] = []; readonly n: number[] = []; readonly c: number[] = []; readonly i: number[] = []
  quad(a: V3, b: V3, c: V3, d: V3, hex: number, hint: V3 = [0, 1, 0]): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const flip = nx * hint[0] + ny * hint[1] + nz * hint[2] < 0
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len; ny /= len; nz /= len
    if (flip) { nx = -nx; ny = -ny; nz = -nz }
    const base = this.p.length / 3, col = linear(hex)
    for (const v of [a, b, c, d]) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]) }
    this.i.push(...(flip ? [base, base + 2, base + 1, base, base + 3, base + 2] : [base, base + 1, base + 2, base, base + 2, base + 3]))
  }
  done(): RoadMesh {
    const count = this.p.length / 3
    return { positions: new Float32Array(this.p), normals: new Float32Array(this.n), colors: new Float32Array(this.c), indices: count < 65536 ? new Uint16Array(this.i) : new Uint32Array(this.i), triangles: this.i.length / 3 }
  }
}

export interface Palette { asphalt: [number, number]; shoulder: number; skirt: number; ground: number; theme: 'land' | 'bridge' }
export const PALETTES: Readonly<Record<TrackId, Palette>> = Object.freeze({
  lekki: { asphalt: [0x3a3c43, 0x40424a], shoulder: 0xcdb883, skirt: 0, ground: 0xe6d6a4, theme: 'land' },
  ikoyi: { asphalt: [0x383a40, 0x3e4046], shoulder: 0x86a06a, skirt: 0, ground: 0x68a35a, theme: 'land' },
  mainland: { asphalt: [0x35373d, 0x3b3d44], shoulder: 0xa9a9ae, skirt: 0x77777d, ground: 0x2c7aa6, theme: 'bridge' },
})
/** Boxes as vertex-coloured quads (centre, size, colour): the little vehicles, the skyline, the bridge piers. */
export function boxMesh(boxes: readonly { c: V3; s: V3; hex: number }[]): RoadMesh {
  const q = new Quads()
  for (const { c, s, hex } of boxes) {
    const [x0, y0, z0] = [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2], [x1, y1, z1] = [c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2]
    q.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], hex, [0, 1, 0])
    q.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], hex, [0, -1, 0])
    q.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], hex, [0, 0, 1])
    q.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], hex, [0, 0, -1])
    q.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], hex, [1, 0, 0])
    q.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], hex, [-1, 0, 0])
  }
  return q.done()
}

export const KERB_RED = 0xd8352a, KERB_WHITE = 0xf4f4f4
/** A bend tighter than this (rules units of radius) gets kerbs on its outside. */
export const KERB_RADIUS = 950
/** How far past the wall the shoulder (grass, sand, bridge deck) runs. */
export const SHOULDER_HALF = WALL_HALF + 22
/** Where the barriers stand: just outside the rules' invisible wall, whose centre-line distance a car's centre cannot pass. */
export const BARRIER_LAT = WALL_HALF + 14
export const DECK_DROP_M = 1.6
/** On the bridge the deck widens round the start to this far from the centre line (arcs from -PLATFORM_BEHIND to PLATFORM_AHEAD), where the stands and the pits stand. */
export const PLATFORM_HALF = WALL_HALF + 120, PLATFORM_BEHIND = 420, PLATFORM_AHEAD = 330

/** The side of the road (-1 left, +1 right) that is the outside of a bend turning at `rate` (positive: to the right, as heading counts on screen). */
export const outsideSign = (rate: number): -1 | 1 => (rate > 0 ? -1 : 1)

/** The ribbon of road for a track: asphalt, edge lines, dashed centre line, kerbs on the outside of bends, the start line, boost pads, the shoulder, and a bridge's deck sides. One mesh. */
export function buildRoad(track: Track, o: { segment?: number } = {}): RoadMesh {
  const L = track.length, count = Math.max(24, Math.round(L / (o.segment ?? 20)))
  const pal = PALETTES[track.def.id]
  const q = new Quads()
  const at = (arc: number, lat: number, up: number): V3 => { const p = pointAt(track, arc, lat); return toScene(p.x, p.y, up) }
  const side = (arc: number): V3 => { const a = pointAt(track, arc, 0), b = pointAt(track, arc, 1); return [(b.x - a.x) * UNIT, 0, (b.y - a.y) * UNIT] }
  const strip = (s0: number, s1: number, l0: number, l1: number, up: number, hex: number): void => q.quad(at(s0, l0, up), at(s1, l0, up), at(s1, l1, up), at(s0, l1, up), hex)
  const turn = (i: number): number => { // heading change over segment i, rad per unit (+ turns right)
    const s0 = (i * L) / count, s1 = ((i + 1) * L) / count
    return wrapPi(pointAt(track, s1, 0).a - pointAt(track, s0, 0).a) / (s1 - s0)
  }
  const rates = Array.from({ length: count }, (_, i) => turn(i))
  for (let i = 0; i < count; i++) {
    const s0 = (i * L) / count, s1 = ((i + 1) * L) / count
    strip(s0, s1, -SHOULDER_HALF, -ROAD_HALF, 0, pal.shoulder); strip(s0, s1, ROAD_HALF, SHOULDER_HALF, 0, pal.shoulder)
    strip(s0, s1, -ROAD_HALF, ROAD_HALF, 0.01, pal.asphalt[Math.floor(i / 5) % 2] as number)
    strip(s0, s1, -ROAD_HALF + 3, -ROAD_HALF + 7, 0.02, 0xe9e9e9); strip(s0, s1, ROAD_HALF - 7, ROAD_HALF - 3, 0.02, 0xe9e9e9)
    if (i % 4 < 2) strip(s0, s1, -1.6, 1.6, 0.02, 0xdcdcdc)
    // Kerbs on the outside of a bend: the average turn of three segments, so one bad sample does not flicker a stripe.
    const rate = ((rates[(i + count - 1) % count] as number) + (rates[i] as number) + (rates[(i + 1) % count] as number)) / 3
    if (Math.abs(rate) > 1 / KERB_RADIUS) {
      const colour = Math.floor(i / 2) % 2 ? KERB_WHITE : KERB_RED
      if (outsideSign(rate) < 0) strip(s0, s1, -KERB_HALF, -ROAD_HALF, 0.025, colour); else strip(s0, s1, ROAD_HALF, KERB_HALF, 0.025, colour)
    }
    if (pal.theme === 'bridge') {
      // The deck's sides drop towards the water; round the start the deck is wider.
      const mid = (s0 + s1) / 2, rel = ((mid + L / 2) % L) - L / 2, wide = rel > -PLATFORM_BEHIND && rel < PLATFORM_AHEAD
      const prevRel = rel - L / count, wasWide = prevRel > -PLATFORM_BEHIND && prevRel < PLATFORM_AHEAD
      const outer = wide ? PLATFORM_HALF : SHOULDER_HALF, cross = side(mid)
      if (wide) { strip(s0, s1, -PLATFORM_HALF, -SHOULDER_HALF, 0, pal.shoulder); strip(s0, s1, SHOULDER_HALF, PLATFORM_HALF, 0, pal.shoulder) }
      for (const sign of [-1, 1]) {
        const lat = outer * sign
        q.quad(at(s0, lat, 0), at(s1, lat, 0), at(s1, lat, -DECK_DROP_M), at(s0, lat, -DECK_DROP_M), pal.skirt, [cross[0] * sign, 0, cross[2] * sign])
        // The ends of the wide part: a wall of deck where it narrows again.
        if (wide !== wasWide) {
          const along = pointAt(track, s0, 0), dir: V3 = [Math.cos(along.a), 0, Math.sin(along.a)], face = wide ? -1 : 1
          q.quad(at(s0, SHOULDER_HALF * sign, 0), at(s0, PLATFORM_HALF * sign, 0), at(s0, PLATFORM_HALF * sign, -DECK_DROP_M), at(s0, SHOULDER_HALF * sign, -DECK_DROP_M), pal.skirt, [dir[0] * face, 0, dir[2] * face])
        }
      }
    }
  }
  // The start / finish line: two rows of squares across the road at the lap's start.
  const cols = 12, row = 8
  for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) strip(-row + r * row, r * row, -ROAD_HALF + (c * 2 * ROAD_HALF) / cols, -ROAD_HALF + ((c + 1) * 2 * ROAD_HALF) / cols, 0.03, (c + r) % 2 ? 0x15161a : 0xf6f6f6)
  // Boost pads: an orange panel with three yellow chevrons pointing the way round.
  for (const pad of track.pads) {
    const quadAt = (u0: number, u1: number, v0: number, v1: number, up: number, hex: number): void => strip(pad.arc + u0, pad.arc + u1, pad.lat + v0, pad.lat + v1, up, hex)
    quadAt(-BOOST_RANGE, BOOST_RANGE, -BOOST_WIDE, BOOST_WIDE, 0.03, 0xb8610d)
    for (const k of [-1, 0, 1]) {
      const u = k * 16
      for (const s of [-1, 1]) {
        const out = 34 * s, a = (v: number, du: number): V3 => at(pad.arc + u + du, pad.lat + v, 0.04)
        q.quad(a(out, -13.5), a(out, -6.5), a(0, 13.5), a(0, 6.5), 0xffe14a)
      }
    }
  }
  return q.done()
}

// ---- things that stand along the road ------------------------------------------------------------------------------------------

/** One object's place: scene metres, and the track's heading there (rules radians) to turn it with. */
export interface Place { x: number; z: number; a: number; arc: number; lat: number }

/** Objects every `spacingM` metres along the road at lateral offset `lat`, in lap order. */
export function lineAlong(track: Track, spacingM: number, lat: number): Place[] {
  const step = spacingM / UNIT, n = Math.max(1, Math.round(track.length / step)), out: Place[] = []
  for (let i = 0; i < n; i++) { const arc = (i * track.length) / n, p = pointAt(track, arc, lat); out.push({ x: p.x * UNIT, z: p.y * UNIT, a: p.a, arc, lat }) }
  return out
}

/** A small deterministic generator (the scenery is the same every visit and on every phone). */
export function hash(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** The smallest distance (rules units) from a point to the road's centre line. */
export function roadDistance(track: Track, x: number, y: number): number {
  let best = Infinity
  for (let i = 0; i < track.n; i++) { const d = ((track.x[i] as number) - x) ** 2 + ((track.y[i] as number) - y) ** 2; if (d < best) best = d }
  return Math.sqrt(best)
}

/** `count` scattered spots beside the road, none nearer the centre line than `clear` units (from any part of the lap) and none in the stands' area at the start. */
export function scatter(track: Track, count: number, seed: number, clear = WALL_HALF + 45, reach = 330): Place[] {
  const rnd = hash(seed), out: Place[] = []
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const arc = rnd() * track.length, lat = (rnd() < 0.5 ? -1 : 1) * (clear + rnd() * reach), p = pointAt(track, arc, lat)
    if (roadDistance(track, p.x, p.y) < clear) continue
    const fromStart = Math.min(arc, track.length - arc)
    if (fromStart < 330 && Math.abs(lat) < 420) continue
    out.push({ x: p.x * UNIT, z: p.y * UNIT, a: rnd() * Math.PI * 2, arc, lat })
  }
  return out
}

/** Where the grandstands and pit garages go, near the start: a row on the right-hand side of the road and a row on the left. */
export function startArea(track: Track): { stands: Place[]; garages: Place[] } {
  const stands: Place[] = [], garages: Place[] = []
  const at = (arc: number, lat: number): Place => { const p = pointAt(track, arc, lat); return { x: p.x * UNIT, z: p.y * UNIT, a: p.a, arc, lat } }
  for (let k = 0; k < 6; k++) stands.push(at(-170 + k * 110, WALL_HALF + 70))
  for (let k = 0; k < 4; k++) garages.push(at(-140 + k * 120, -(WALL_HALF + 70)))
  return { stands, garages }
}

/** The stalled danfos and okadas where the rules put them: their scene place, heading and kind. */
export function obstaclePlaces(track: Track): (Place & { kind: string; r: number })[] {
  return track.obstacles.map((o) => ({ x: o.x * UNIT, z: o.y * UNIT, a: o.a, arc: o.arc, lat: o.lat, kind: o.kind, r: o.r }))
}

/** The window of a lap-ordered list that is near an arc, as indices (wrapping), so a long run of barriers is drawn only near the car. */
export function windowOf(arcs: readonly number[], length: number, centre: number, half: number): number[] {
  const out: number[] = []
  for (let i = 0; i < arcs.length; i++) { let d = Math.abs((arcs[i] as number) - centre); d = Math.min(d, length - d); if (d <= half) out.push(i) }
  return out
}

// ---- how a car moves, from where it was and where it is ------------------------------------------------------------------------

export interface Pose { x: number; y: number; a: number }
export interface Motion {
  /** Metres a second along the car's heading (negative: reversing). */
  speed: number
  /** Metres a second across it (positive to the right): the slide. */
  slide: number
  /** Radians a second the heading turns (positive: to the right). */
  yawRate: number
}
/** A car's motion between two drawn poses `dt` seconds apart (rules units), pure. */
export function motionOf(prev: Pose, cur: Pose, dt: number): Motion {
  if (dt <= 0) return { speed: 0, slide: 0, yawRate: 0 }
  const vx = ((cur.x - prev.x) * UNIT) / dt, vy = ((cur.y - prev.y) * UNIT) / dt
  const c = Math.cos(cur.a), s = Math.sin(cur.a)
  return { speed: vx * c + vy * s, slide: -vx * s + vy * c, yawRate: wrapPi(cur.a - prev.a) / dt }
}

export const WHEEL_BASE_M = 2.4, MAX_STEER = 0.5
/** The front wheels' steering angle (radians, positive to the right) for a car turning at `yawRate` at `speed`: the bicycle model, none when crawling. */
export function steerAngle(yawRate: number, speed: number): number {
  if (Math.abs(speed) < 1) return 0
  return clamp(Math.atan((WHEEL_BASE_M * yawRate) / Math.abs(speed)) * Math.sign(speed), -MAX_STEER, MAX_STEER)
}
/** A wheel's rolled angle after `dt` seconds at `speed` m/s (forward is positive) with a tyre of `radius` m. */
export const spinStep = (angle: number, speed: number, dt: number, radius: number): number => (angle + (speed / Math.max(0.05, radius)) * dt) % (Math.PI * 2)
/** Body roll (radians about the car's long axis, negative leans a right turn's body to the left) and pitch (positive: nose down, under braking) from the accelerations m/s^2. */
export function lean(lateralAccel: number, longAccel: number): { roll: number; pitch: number } {
  return { roll: clamp(-0.011 * lateralAccel, -0.12, 0.12), pitch: clamp(-0.005 * longAccel, -0.06, 0.05) }
}
/** Whether a car is sliding enough to smoke: across its heading faster than 2 m/s while going somewhere, or braking hard at speed. */
export const smoking = (m: Motion, braking: boolean): boolean => (Math.abs(m.slide) > 2 && Math.abs(m.speed) > 4) || (braking && Math.abs(m.speed) > 8)

// ---- the camera ------------------------------------------------------------------------------------------------------------------

/** What covers the canvas, in px: the HUD at the top, the thumbs (the left and right corners in landscape, the bottom in portrait). */
export interface Insets { top: number; bottom: number; left: number; right: number }
export const NO_INSETS: Insets = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 })

/** How far (px) to slide the picture so the aim point lands in the middle of what the HUD and thumbs leave free, pure. */
export function bandShift(width: number, height: number, inset: Insets): { x: number; y: number } {
  const bandH = Math.max(60, height - inset.top - inset.bottom), freeW = Math.max(120, width - inset.left - inset.right)
  return { x: Math.round(inset.left + freeW / 2 - width / 2), y: Math.round(inset.top + bandH / 2 - height / 2) }
}

export interface Pose3 { pos: V3; look: V3; fov: number }
/** The vertical field of view: wide on a tall phone, where the road would otherwise be a narrow slot, and wider the faster the car goes. */
export const fovFor = (aspect: number, speed: number): number => (aspect < 1 ? 66 : 50) + Math.min(9, Math.max(0, speed) * 0.5)

/**
 * The chase camera behind a car at scene (x, z) metres heading `a` (rules radians), going `speed` m/s: further back and higher the faster it goes
 * (so the road ahead opens up), looking a little ahead of the car. `intro` (1 at the start, falling to 0) pulls it further back for the countdown.
 */
export function chasePose(x: number, z: number, a: number, speed: number, aspect: number, intro = 0): Pose3 {
  const portrait = aspect < 1, v = Math.max(0, speed)
  const dist = (portrait ? 9 : 6.6) + v * 0.1 + intro * 3, height = (portrait ? 5.6 : 2.7) + v * 0.025 + intro * 1.2, ahead = (portrait ? 8 : 6) + v * 0.3
  const c = Math.cos(a), s = Math.sin(a)
  return { pos: [x - c * dist, height, z - s * dist], look: [x + c * ahead, 0.7, z + s * ahead], fov: fovFor(aspect, v) }
}

/** The low angle by the finish line (the photo finish): a metre above the road, beside the line a little way on, looking at the car; wider on a tall phone, where a side-on car would fill the width. */
export function photoFinishPose(track: Track, carX: number, carZ: number, aspect = 1): Pose3 {
  const p = pointAt(track, 50, ROAD_HALF + 55)
  return { pos: [p.x * UNIT, 1.0, p.y * UNIT], look: [carX, 0.6, carZ], fov: aspect < 1 ? 62 : 42 }
}

/** The lobby's slow orbit round the cars on the grid: `t` seconds. */
export function orbitPose(track: Track, t: number): Pose3 {
  const grid = pointAt(track, -130, 0), cx = grid.x * UNIT, cz = grid.y * UNIT, ang = grid.a + Math.PI / 2 + 0.6 * Math.sin(t * 0.18) + t * 0.05
  return { pos: [cx + Math.cos(ang) * 11, 3.4, cz + Math.sin(ang) * 11], look: [cx, 0.8, cz], fov: 50 }
}

/** The seat a viewer without a car follows: the chosen one, else the leader. */
export const followSeat = (chosen: number, cars: number, leader: number): number => (chosen >= 0 && chosen < cars ? chosen : leader)

// ---- the world's own cars ------------------------------------------------------------------------------------------------------

/** The saloon paint (a variant of src/models/vehicles) each seat drives: red, blue, green, and the plain file, which is white. One a seat, all different. */
export const WORLD_SEAT_PAINT: readonly string[] = Object.freeze(['red', 'blue', 'green', ''])
/** How long the screen waits for the world's cars before it draws the Kenney ones instead, ms. */
export const WORLD_WAIT_MS = 4000
/** Whether the world's cars are wanted here: not on a phone that reports under 3 GB of memory (the rule the Fight view follows); unknown memory is allowed. */
export const worldCarsAllowed = (deviceMemory: number | undefined): boolean => deviceMemory === undefined || deviceMemory >= 3
/** A car further than this from the camera is drawn with its lighter "-far" model (one mesh, wheels baked in), and back to the full one inside the near distance. */
export const FAR_FROM_M = 30, NEAR_AGAIN_M = 24
/** Whether a car at `distance` metres from the camera should be drawn with the far model, with a gap between the two limits so it does not flicker; the followed car never is. */
export function farCar(distance: number, wasFar: boolean, followed: boolean): boolean {
  if (followed) return false
  return wasFar ? distance > NEAR_AGAIN_M : distance > FAR_FROM_M
}
