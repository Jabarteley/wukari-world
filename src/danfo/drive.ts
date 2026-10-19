/**
 * OWNER: danfo (docs/DANFO.md)
 * THE DRIVING: a three-lane road from the motor park to the last stop, played in the browser at a fixed 50 ms step. Pure (no DOM, no
 * clock): the 2D lane view and the 3D road view both draw this state, and the tests drive it with scripted controls. Nothing here is
 * trusted by the server: it only tells the server when a stop was served or passed, and the server checks the time that took.
 *
 * ROAD     metres from the park (`d`) and a lane from 0 (the kerb, where people wait) to 2 (the fast lane), continuous while changing.
 * TRAFFIC  cars, kekes, okadas, other danfos and trucks drawn from the run's seed; heavier traffic means shorter gaps, and go-slow
 *          stretches where everything crawls. An okada may cut into the bus's lane. Traffic behind the bus slows for it.
 * STOPS    stand still in the kerb lane at a stop for DWELL_MS: the stop is served (people get off and on). Drive past it: passed.
 *          The road ends at the last stop.
 * FAULTS   a hard brake (full brake at speed), a crash (running into the back of something); a pothole only bumps.
 */
import { DWELL_MS, MAX_SPEED, stopMetres } from './routes.ts'
import type { DanfoRoute } from './routes.ts'
import { seeded } from './run.ts'
import type { StopCall } from './run.ts'

export const STEP_MS = 50
export const LANES = 3
/** The stop's zone: from this far before the sign to this far after it. */
export const STOP_BEFORE = 28, STOP_AFTER = 8
/** The barrier after the last stop. */
export const ROAD_END = 20
/** How long the bus stands while people get on and off after a stop is served. */
export const BOARDING_MS = 2200
/** Lengths in metres. The bus's `d` is its front; a car's `d` is its back. */
export const BUS_LENGTH = 6
export const CAR_LENGTH: Readonly<Record<TrafficKind, number>> = { saloon: 4.6, keke: 3, okada: 2.2, danfo: 6, truck: 9 }
const CAR_GAP = 0.68

export type TrafficKind = 'saloon' | 'keke' | 'okada' | 'danfo' | 'truck'
export interface Car { id: number; kind: TrafficKind; d: number; lane: number; base: number; speed: number; laneTo: number; cutAt: number }
export interface Pothole { d: number; lane: number }
export interface DriveInput { throttle: number; brake: number; steer: number }
export type DriveEvent =
  | { kind: 'served' | 'passed'; stop: number }
  | { kind: 'approach'; stop: number }
  | { kind: 'hard-brake' | 'crash' | 'bump' | 'cut-in' | 'go-slow' | 'done' }

export interface DriveState {
  t: number
  d: number
  lane: number
  speed: number
  /** The next stop to serve (1 … last); last + 1 when done. */
  next: number
  dwell: number
  boardingMs: number
  calls: StopCall[]
  hardBrakes: number
  crashes: number
  bumps: number
  brakeArmed: boolean
  hitMs: number
  approached: number
  inSlow: boolean
  cars: Car[]
  potholes: Pothole[]
  slow: [number, number][]
  stops: number[]
  end: number
  done: boolean
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const finite = (n: unknown, fallback = 0): number => (typeof n === 'number' && Number.isFinite(n) ? n : fallback)

/** A fresh run at the park: the traffic, the go-slow stretches and the potholes come from the seed and the traffic level. */
export function startDrive(line: DanfoRoute, seed: string, traffic: number): DriveState {
  const random = seeded(`${seed}:road`), stops = stopMetres(line), end = (stops.at(-1) ?? 0) + ROAD_END
  const density = clamp(finite(traffic, 0.4), 0, 1)
  const slow: [number, number][] = []
  for (let at = 250; at < end - 200; at += 500 + random() * 500) if (random() < 0.25 + density * 0.5) slow.push([at, at + 120 + random() * 160 * (0.5 + density)])
  const inSlow = (d: number): boolean => slow.some(([a, b]) => d >= a && d <= b)
  const cars: Car[] = []
  const gap = 150 - density * 105
  let id = 0
  for (let at = 70; at < end + 200; at += gap * (0.55 + random() * 0.9)) {
    const roll = random()
    const kind: TrafficKind = roll < 0.42 ? 'saloon' : roll < 0.57 ? 'keke' : roll < 0.73 ? 'okada' : roll < 0.9 ? 'danfo' : 'truck'
    const lane = kind === 'keke' ? (random() < 0.7 ? 0 : 1) : kind === 'truck' ? (random() < 0.5 ? 1 : 2) : Math.floor(random() * LANES)
    const crawl = inSlow(at)
    const base = crawl ? 2 + random() * 3 : kind === 'keke' || kind === 'truck' ? 6 + random() * 2.5 : kind === 'okada' ? 11 + random() * 4 : 7.5 + random() * 5.5
    cars.push({ id: id++, kind, d: at, lane, base, speed: base, laneTo: lane, cutAt: kind === 'okada' && random() < 0.5 ? 18 + random() * 20 : -1 })
  }
  const potholes: Pothole[] = []
  for (let at = 180; at < end - 40; at += 160 + random() * 260) potholes.push({ d: at, lane: Math.floor(random() * LANES) })
  return { t: 0, d: 0, lane: 0, speed: 0, next: 1, dwell: 0, boardingMs: 0, calls: [], hardBrakes: 0, crashes: 0, bumps: 0, brakeArmed: true,
    hitMs: 0, approached: 0, inSlow: false, cars, potholes, slow, stops, end, done: false }
}

/** One 50 ms step. Mutates `state` (the views read it every frame) and returns what happened in this step. */
export function stepDrive(state: DriveState, input: DriveInput): DriveEvent[] {
  const events: DriveEvent[] = []
  if (state.done) return events
  const dt = STEP_MS / 1000
  const throttle = clamp(finite(input.throttle), 0, 1), brake = clamp(finite(input.brake), 0, 1), steer = clamp(finite(input.steer), -1, 1)
  const last = state.stops.length - 1
  state.t += STEP_MS
  if (state.hitMs > 0) state.hitMs = Math.max(0, state.hitMs - STEP_MS)

  // People getting on and off: the bus stands still.
  if (state.boardingMs > 0) {
    state.boardingMs = Math.max(0, state.boardingMs - STEP_MS); state.speed = 0
    moveTraffic(state, dt)
    return events
  }

  // Speed: throttle, brake, rolling drag.
  const accel = throttle * 3.4 - brake * 9 - 0.3 - state.speed * 0.012
  const before = state.speed
  state.speed = clamp(state.speed + accel * dt, 0, MAX_SPEED)
  if (brake >= 0.9 && before > 10) {
    if (state.brakeArmed) { state.hardBrakes++; state.brakeArmed = false; events.push({ kind: 'hard-brake' }) }
  } else if (brake < 0.3) state.brakeArmed = true

  // Steering moves across lanes; with the wheel let go it settles into the nearest lane.
  const wasLane = state.lane
  const reach = 1.1 + Math.min(1, state.speed / 8) * 0.9
  if (Math.abs(steer) > 0.05) state.lane = clamp(state.lane + steer * reach * dt, 0, LANES - 1)
  else { const centre = Math.round(state.lane); state.lane += clamp(centre - state.lane, -0.9 * dt, 0.9 * dt) }

  state.d += state.speed * dt
  // The road ends after the last stop.
  if (state.d >= state.end) {
    if (state.speed > 4 && state.hitMs === 0) { state.crashes++; state.hitMs = 1500; events.push({ kind: 'crash' }) }
    state.d = state.end; state.speed = 0
  }

  moveTraffic(state, dt)
  for (const car of state.cars) {
    const ahead = car.d - state.d
    if (ahead > 1 || ahead < -(BUS_LENGTH + CAR_LENGTH[car.kind]) || Math.abs(car.lane - state.lane) > CAR_GAP) continue
    if (ahead >= -1.5) {
      // Into the back of it: the bus stops behind it, a crash when it was going faster.
      if (state.hitMs === 0 && state.speed > car.speed + 1) { state.crashes++; state.hitMs = 1500; events.push({ kind: 'crash' }) }
      state.d = Math.max(0, car.d - 0.5); state.speed = Math.min(state.speed, car.speed * 0.6)
    } else {
      // Steered into its side: the bus is pushed back to its lane.
      if (state.hitMs === 0 && Math.abs(wasLane - state.lane) > 0.001) { state.crashes++; state.hitMs = 1500; events.push({ kind: 'crash' }) }
      state.lane = wasLane
    }
  }
  for (const hole of state.potholes) {
    if (Math.abs(hole.d - state.d) < 1.2 && Math.abs(hole.lane - state.lane) < 0.45 && state.speed > 8) {
      state.speed *= 0.7; state.bumps++; events.push({ kind: 'bump' }); hole.d = -1000
    }
  }
  const slowNow = state.slow.some(([a, b]) => state.d >= a - 60 && state.d <= b)
  if (slowNow && !state.inSlow) events.push({ kind: 'go-slow' })
  state.inSlow = slowNow

  // The next stop: announce it, serve it, or pass it.
  const i = state.next
  const at = state.stops[i]
  if (at !== undefined && i <= last) {
    if (state.approached < i && state.d >= at - 140) { state.approached = i; events.push({ kind: 'approach', stop: i }) }
    const inZone = state.d >= at - STOP_BEFORE && state.d <= (i === last ? state.end : at + STOP_AFTER)
    if (inZone && state.lane < 0.45 && state.speed < 0.8) {
      state.dwell += STEP_MS
      if (state.dwell >= DWELL_MS) {
        state.calls.push('served'); state.dwell = 0; state.next++; state.boardingMs = i === last ? 0 : BOARDING_MS
        events.push({ kind: 'served', stop: i })
        if (i === last) { state.done = true; events.push({ kind: 'done' }) }
      }
    } else state.dwell = 0
    if (!state.done && i < last && state.d > at + STOP_AFTER) {
      state.calls.push('passed'); state.dwell = 0; state.next++
      events.push({ kind: 'passed', stop: i })
    }
  }
  for (const car of state.cars) if (car.cutAt > 0 && car.laneTo !== Math.round(state.lane) && car.d - state.d > 0 && car.d - state.d < car.cutAt && Math.abs(car.lane - state.lane) >= 0.9) {
    car.laneTo = Math.round(state.lane); car.cutAt = -1; events.push({ kind: 'cut-in' })
  }
  return events
}

function moveTraffic(state: DriveState, dt: number): void {
  for (const car of state.cars) {
    // Traffic behind the bus in its lane slows down for it rather than running into it.
    const gap = (state.d - BUS_LENGTH) - (car.d + CAR_LENGTH[car.kind])
    car.speed = car.d < state.d && gap < 10 && Math.abs(car.lane - state.lane) < CAR_GAP ? Math.min(car.base, state.speed * 0.95) : car.base
    car.d += car.speed * dt
    if (car.laneTo !== car.lane) car.lane += clamp(car.laneTo - car.lane, -2 * dt, 2 * dt)
  }
  // Keep only what can still matter: a car far behind is gone.
  if (state.t % 1000 === 0) state.cars = state.cars.filter((car) => car.d > state.d - 120)
}

/** What a view needs about the cars near the bus: those from `behind` metres back to `ahead` metres on. */
export const carsNear = (state: DriveState, behind: number, ahead: number): Car[] => state.cars.filter((car) => car.d > state.d - behind && car.d < state.d + ahead)
