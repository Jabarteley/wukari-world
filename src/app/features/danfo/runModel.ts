// Drive a danfo in the browser, without a DOM (docs/DANFO.md): which view a device gets, how keys and touch become controls, what the
// conductor says at a moment, the frames kept for the clip, and the words of the run-end card. The road itself is src/danfo/drive.ts.
import { deviceHints, deviceTier } from '../../../scene/street-life/plan.ts'
import { seededLine } from '../../../danfo/conductor.ts'
import type { ConductorTopic } from '../../../danfo/conductor.ts'
import type { DriveEvent, DriveInput, DriveState, Pothole, TrafficKind } from '../../../danfo/drive.ts'
import type { DanfoRoute, DanfoVehicle } from '../../../danfo/routes.ts'
import type { DanfoResult } from '../../../types/danfo.ts'

export type RoadView = '3d' | 'lanes'
/** Where a person's own choice of view is kept on this device. */
export const VIEW_KEY = 'aw-danfo-view'

/**
 * The view a device starts in: the 3D road where the admin has it on, WebGL works and the device is not a weak one (the street-life tier
 * gate, the dive's rules); the 2D lanes otherwise. A person's own choice on this device wins, except that 3D needs WebGL.
 */
export function chooseView({ tier, webgl, setting, stored }: { tier: 'full' | 'lite' | 'cut'; webgl: boolean; setting: boolean; stored: string | null }): RoadView {
  if (!webgl || !setting) return 'lanes'
  if (stored === 'lanes' || stored === '3d') return stored
  return tier === 'cut' ? 'lanes' : '3d'
}
/** The device's tier, as the street life and the dive read it. */
export const thisDeviceTier = (): 'full' | 'lite' | 'cut' => deviceTier({ ...deviceHints(), reduced: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true })

export interface Held { left: boolean; right: boolean; gas: boolean; brake: boolean }
export const NO_KEYS: Held = Object.freeze({ left: false, right: false, gas: false, brake: false })
/** Keys: arrows or WASD; space brakes too. */
export const KEYS: Readonly<Record<string, keyof Held>> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'brake' }
/**
 * Controls from what is held. The brake builds up the longer it is held (a tap slows, a long press stops hard): only a long press at
 * speed counts as a hard brake. `brakeMs` is how long the brake has been held.
 */
export function controlsFrom(held: Held, brakeMs: number, mirror = false): DriveInput {
  const steer = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  return { throttle: held.gas && !held.brake ? 1 : 0, brake: held.brake ? Math.min(1, 0.35 + Math.max(0, brakeMs) / 700 * 0.65) : 0, steer: mirror ? -steer : steer }
}

const TOPIC: Partial<Record<DriveEvent['kind'], ConductorTopic>> = { approach: 'approach', served: 'served', passed: 'passed', 'hard-brake': 'hard-brake', crash: 'crash', bump: 'bump', 'go-slow': 'go-slow', 'cut-in': 'cut-in', done: 'done' }
/** What the game's own conductor says at a moment of the run, or null. The same on every device: seeded by the run. */
export function conductorSays(city: string, line: DanfoRoute, event: DriveEvent, seed: string, n: number): string | null {
  const topic = TOPIC[event.kind]
  if (!topic) return null
  const end = line.stops.at(-1)?.name ?? ''
  const at = 'stop' in event ? event.stop : 0
  // On arrival the conductor calls the stop after this one: who is going there should get on.
  const stop = line.stops[event.kind === 'served' ? Math.min(at + 1, line.stops.length - 1) : at]?.name ?? end
  return seededLine(city, topic, stop, end, seed, n)
}
/** The first call at the park, before the bus moves. */
export const parkCall = (city: string, line: DanfoRoute, seed: string): string => seededLine(city, 'call', line.stops[1]?.name ?? '', line.stops.at(-1)?.name ?? '', seed, 0)

/** What the views draw: the bus, the road and what is near. A DriveState is one; a clip frame is a copy of the part near the bus. */
export interface RoadSnapshot {
  t: number; d: number; lane: number; speed: number; next: number; boardingMs: number
  cars: readonly { id: number; kind: TrafficKind; d: number; lane: number }[]
  potholes: readonly Pothole[]
  slow: readonly (readonly [number, number])[]
  stops: readonly number[]
  end: number
}
/** Seconds of driving kept for the clip, and frames per second. */
export const CLIP_SECONDS = 8, CLIP_FPS = 20
/** Keeps the last CLIP_SECONDS of the road, a frame every 1/CLIP_FPS s. Only what is near the bus is copied. */
export function keepFrame(frames: RoadSnapshot[], state: DriveState): void {
  frames.push({ t: state.t, d: state.d, lane: state.lane, speed: state.speed, next: state.next, boardingMs: state.boardingMs,
    cars: state.cars.filter((car) => car.d > state.d - 30 && car.d < state.d + 90).map(({ id, kind, d, lane }) => ({ id, kind, d, lane })),
    potholes: state.potholes.filter((hole) => hole.d > state.d - 30 && hole.d < state.d + 90).map((hole) => ({ ...hole })),
    slow: state.slow, stops: state.stops, end: state.end })
  const most = CLIP_SECONDS * CLIP_FPS
  if (frames.length > most) frames.splice(0, frames.length - most)
}

/** The lines of the run-end card. */
export function cardWords(result: DanfoResult, line: DanfoRoute, vehicle: string, money: (amount: number) => string = String): { title: string; sub: string; brag: string | null; rows: [string, string][] } {
  const minutes = Math.floor(result.ms / 60000), seconds = Math.floor((result.ms % 60000) / 1000)
  const brag = result.place === 1 ? `Best driver on the ${line.road} this week` : result.place > 1 ? `Number ${result.place} on the ${line.road} this week` : null
  return {
    title: line.name,
    sub: `${vehicle[0]!.toUpperCase()}${vehicle.slice(1)} run · ${minutes}:${String(seconds).padStart(2, '0')}`,
    brag,
    rows: [
      ['Passengers dropped', String(result.drops)],
      ['Fares', money(result.fares)],
      ...(result.timeBonus ? [['Time bonus', `+${money(result.timeBonus)}`] as [string, string]] : []),
      ...(result.crewBonus ? [['Crew bonus', `+${money(result.crewBonus)}`] as [string, string]] : []),
      ...(result.penalties ? [['Penalties', `-${money(result.penalties)}`] as [string, string]] : []),
    ],
  }
}
/** Why a run did not count, in a sentence. */
export function voidWords(reason: string | undefined): string {
  if (reason === 'too_fast') return 'The bus reached a stop faster than a danfo can, so this run does not count.'
  if (reason === 'expired') return 'This run took too long and was closed.'
  return 'This run has ended.'
}

/** Cities where traffic keeps left: the kerb (and the stops) are on the left of the screen. */
export const KEEP_LEFT: ReadonlySet<string> = new Set(['nairobi', 'kampala', 'dar-es-salaam'])
/** The bus's paint where it runs: the yellow danfo with its black stripes, a white trotro with green, a bright matatu, and so on. */
export const PAINT: Readonly<Record<DanfoVehicle, { body: string; stripe: string }>> = {
  danfo: { body: '#f2be18', stripe: '#141414' },
  trotro: { body: '#ece6d4', stripe: '#1b5e20' },
  matatu: { body: '#3949ab', stripe: '#f06292' },
  taxi: { body: '#f5f5f5', stripe: '#1e3a8a' },
  daladala: { body: '#f5f5f5', stripe: '#c62828' },
  bus: { body: '#f2f2f2', stripe: '#2e7d32' },
}
