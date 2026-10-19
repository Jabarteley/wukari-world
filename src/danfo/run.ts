/**
 * OWNER: danfo (docs/DANFO.md)
 * A RUN: who waits at each stop, and what a run earns. Pure and shared, so the browser's fare meter and the server's settlement are the
 * same arithmetic: the server draws the seed, the browser plays it, and the server settles from what it recorded itself (which stops were
 * served, and when), never from an amount the browser sends.
 *
 * PASSENGERS  manifest(seed, route, traffic): at every stop but the last, a few people wait, each for a later stop (more in heavy
 *             traffic: a busy city is a busy road). Stop 0 is the motor park, where the bus fills before it leaves.
 * A STOP      served (the bus stood at the kerb): everyone for this stop gets off and pays, anyone carried past their stop gets off here
 *             and pays half, then waiting people get on while there are seats. Passed: people for this stop are carried on (they
 *             complain), and everyone waiting is left on the roadside.
 * EARNINGS    fares, plus a time bonus (10% of fares when the run beat the target time), plus the crew bonus (a player conductor adds
 *             10% of fares; each player riding along adds RIDER_BONUS), less penalties: a hard brake, a crash, a stop passed with
 *             people for it. Never below zero; never above RUN_CAP.
 */
import { SEATS, fareFor, targetMs } from './routes.ts'
import type { DanfoRoute } from './routes.ts'

/** The most a run can earn, the most one player's runs earn in a game day, and the paid runs in a day (game naira). */
export const RUN_CAP = 18_000, DAY_CAP = 45_000, RUNS_PER_DAY = 12
export const PENALTY = Object.freeze({ hardBrake: 50, crash: 200, passed: 150 })
export const RIDER_BONUS = 150, CONDUCTOR_SHARE = 0.15, MAX_RIDERS = 4
/** Counts a browser reports are cut to this (they only take money away, so a lie there helps nobody). */
export const MAX_COUNT = 99

export type StopCall = 'served' | 'passed'
export interface Waiting { readonly to: number }
export interface Manifest { readonly waiting: readonly (readonly Waiting[])[] }

/** A small seeded generator (mulberry32 on a string hash): the same seed gives the same people and traffic on both sides. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Traffic 0 (empty road) to 1 (go-slow everywhere), from people out in the city and the hour (rush hours 7–9 and 17–20). */
export function trafficFrom(peopleOut: number, hour: number): number {
  const crowd = Math.min(1, Math.max(0, peopleOut) / 40)
  const rush = (hour >= 7 && hour < 10) || (hour >= 17 && hour < 21) ? 0.35 : hour >= 22 || hour < 5 ? -0.15 : 0.1
  return Math.round(Math.min(1, Math.max(0.1, 0.25 + crowd * 0.4 + rush)) * 100) / 100
}

/** Who waits at each stop. The park fills more; a later stop has fewer people going further. */
export function manifest(seed: string, line: DanfoRoute, traffic: number): Manifest {
  const random = seeded(`${seed}:people`), last = line.stops.length - 1
  const waiting: Waiting[][] = []
  for (let i = 0; i <= last; i++) {
    const people: Waiting[] = []
    if (i < last) {
      const count = i === 0 ? 8 + Math.floor(random() * 5) : 1 + Math.floor(random() * (3 + traffic * 3))
      for (let n = 0; n < count; n++) {
        // Most ride a few stops; some ride to the end.
        const span = random() < 0.25 ? last - i : 1 + Math.floor(random() * Math.min(4, last - i))
        people.push({ to: Math.min(last, i + span) })
      }
    }
    waiting.push(people)
  }
  return { waiting }
}

export interface Rider { from: number; to: number }
export interface StopResult { stop: number; call: StopCall; off: number; on: number; left: number; fares: number; carried: number }
export interface RunTally {
  /** One result per stop after the park. */
  stops: StopResult[]
  fares: number
  /** Passengers who paid. */
  drops: number
  /** Stops passed with people for them or waiting there. */
  passedBusy: number
  timeBonus: number
  crewBonus: number
  penalties: number
  /** What the run earns: fares and bonuses less penalties, from 0 to RUN_CAP. */
  earned: number
}

/** Who is aboard after the park, and the riders that board at a stop. Exported for the fare meter. */
export function board(aboard: Rider[], waiting: readonly Waiting[], at: number): number {
  let on = 0
  for (const person of waiting) { if (aboard.length >= SEATS) break; aboard.push({ from: at, to: person.to }); on++ }
  return on
}

/** One stop: who gets off (and what they pay), who is left, who gets on. Changes `aboard`. Exported for the fare meter. */
export function callStop(aboard: Rider[], waiting: readonly Waiting[], stop: number, call: StopCall, last: number): StopResult {
  let off = 0, fares = 0, carried = 0, on = 0, left = 0
  for (let k = aboard.length - 1; k >= 0; k--) {
    const rider = aboard[k]!
    const due = rider.to === stop || (stop === last && call === 'served')
    const over = rider.to < stop
    if (call === 'served' && (due || over)) {
      const fare = fareFor(rider.from, Math.min(rider.to, stop))
      fares += over ? Math.floor(fare / 2) : fare
      off++
      aboard.splice(k, 1)
    } else if (rider.to === stop) carried++
  }
  if (call === 'served' && stop < last) on = board(aboard, waiting, stop)
  else left = waiting.length
  return { stop, call, off, on, left, fares, carried }
}

export interface RunInput {
  /** One call per stop after the park, in order; the last must be 'served' for a finished run. */
  calls: readonly StopCall[]
  hardBrakes: number
  crashes: number
  /** Server-measured time from the start to the last stop. */
  ms: number
  riders: number
  conductor: boolean
}
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_COUNT, Math.max(0, Math.floor(value))) : 0)

/** What a run earns. The same function runs in the browser (the meter, the card) and on the server (the money). */
export function tally(line: DanfoRoute, people: Manifest, input: RunInput): RunTally {
  const last = line.stops.length - 1, aboard: Rider[] = []
  board(aboard, people.waiting[0] ?? [], 0)
  const stops: StopResult[] = []
  let fares = 0, drops = 0, passedBusy = 0
  for (let stop = 1; stop <= last; stop++) {
    const call = input.calls[stop - 1]
    if (!call) break
    const result = callStop(aboard, people.waiting[stop] ?? [], stop, call, last)
    stops.push(result)
    fares += result.fares; drops += result.off
    if (call === 'passed' && (result.carried > 0 || result.left > 0)) passedBusy++
  }
  const finished = stops.length === last && stops.at(-1)?.call === 'served'
  const timeBonus = finished && input.ms > 0 && input.ms <= targetMs(line) ? Math.round(fares * 0.1) : 0
  const crewBonus = finished ? Math.min(MAX_RIDERS, count(input.riders)) * RIDER_BONUS + (input.conductor ? Math.round(fares * 0.1) : 0) : 0
  const penalties = count(input.hardBrakes) * PENALTY.hardBrake + count(input.crashes) * PENALTY.crash + passedBusy * PENALTY.passed
  const earned = finished ? Math.max(0, Math.min(RUN_CAP, fares + timeBonus + crewBonus - penalties)) : 0
  return { stops, fares, drops, passedBusy, timeBonus, crewBonus, penalties, earned }
}

/** The most a line can pay: every stop served, nothing lost, the time bonus and a full crew. A test keeps it under RUN_CAP's reach. */
export function bestCase(line: DanfoRoute, people: Manifest): number {
  const all = tally(line, people, { calls: line.stops.slice(1).map(() => 'served' as const), hardBrakes: 0, crashes: 0, ms: 1, riders: MAX_RIDERS, conductor: true })
  return all.fares + all.timeBonus + all.crewBonus
}

/** The conductor's share of a settled run's fares. */
export const conductorShare = (fares: number): number => Math.max(0, Math.round(Math.max(0, fares) * CONDUCTOR_SHARE))
/** What is paid after the day's cap: what is left of today's allowance, and nothing once the paid runs are used. */
export function capForDay(earned: number, earnedToday: number, runsToday: number): number {
  if (runsToday >= RUNS_PER_DAY) return 0
  return Math.max(0, Math.min(earned, DAY_CAP - Math.max(0, earnedToday)))
}

/** The fare meter while driving: fares taken, people aboard, drops so far, for the stops called up to now (the browser's display only). */
export function progress(line: DanfoRoute, people: Manifest, calls: readonly StopCall[]): { fares: number; aboard: number; drops: number; left: number } {
  const last = line.stops.length - 1, aboard: Rider[] = []
  board(aboard, people.waiting[0] ?? [], 0)
  let fares = 0, drops = 0, left = 0
  for (let stop = 1; stop <= Math.min(last, calls.length); stop++) {
    const result = callStop(aboard, people.waiting[stop] ?? [], stop, calls[stop - 1]!, last)
    fares += result.fares; drops += result.off; left += result.left
  }
  return { fares, aboard: aboard.length, drops, left }
}
