/**
 * OWNER: games (real-time)
 * THE CONTRACT FOR A REAL-TIME GAME — every game under src/arena/ is one object of this shape.
 *
 * Like a table game (src/tables/rules.ts) the rules are PURE and plain JSON: no clock, no I/O, no randomness except
 * through the `rng` argument. Unlike a table game there is no "turn": the server calls `step` at a fixed rate (`hz`)
 * with ONE input per seat, and broadcasts `snapshot(state)` to every seat and watcher. The server is the only judge;
 * a client may predict or interpolate to look smooth, never to decide.
 *
 * A new game (racing, football, …) is one file that default-exports a RealtimeRules plus one line in ./registry.ts.
 * The server room host (server/growth/arena.ts), the frames (src/types/arena.ts), the invite link and the client
 * socket (./client.ts) are game-blind. See docs/REALTIME-GAMES.md ("Adding a game").
 */
import type { TableOptionSpecs, Outcome } from '../tables/rules.ts'
import type { TableOptionValue } from '../types/growth.ts'

export type { Outcome, TableOptionValue }
/** What `outcome` returns: `places` (optional) is each seat's finishing place, 1 = first. Without it a game whose `winners` lists EVERY seat best to worst (a race) is read as a ranking; any other game has winners and losers only. */
export type ArenaOutcome = Outcome & { places?: number[] }

/** Thrown by `parseInput` for an input that is not well formed. The room drops such an input silently. */
export class ArenaInputError extends Error {}

export interface RealtimeRules<State extends { options: object } = { options: object }, Input = unknown, Snap = unknown> {
  /** 'fight', 'race', 'football' — also the id a client asks for. [a-z]{2,16}. */
  id: string
  label: string
  /** Server ticks per second (1..30). 15–20 suits most games; the snapshot goes out once per tick. */
  hz: number
  seats: { min: number; max: number }
  /** Contested rules the host may choose, as for tables. */
  options: TableOptionSpecs<State['options']>
  start: (seats: number, rng: () => number, options: State['options']) => State
  /** Untrusted wire input (the `i` of an arena-input frame) → an Input, or throws ArenaInputError. Must also bound its size. */
  parseInput: (raw: unknown) => Input
  /** What a seat does when it has sent nothing (and for a seat that left). */
  idle: () => Input
  /**
   * Optional: fold an input that ARRIVED between two ticks into what the seat has pending (`held`). Default: the newest
   * replaces it. A fighter uses it to latch a button press that was released before the tick (edge bits).
   */
  reduce?: (held: Input, incoming: Input) => Input
  /** Optional: what stays pending after a tick consumed it (clear the latched edges, keep what is held). Default: unchanged. */
  settle?: (consumed: Input) => Input
  /**
   * Advance one tick. `inputs[seat]` is the seat's input for this tick (bots included). MAY mutate `state` and return it
   * (no allocation per tick); must be deterministic given (state, inputs, rng draws).
   */
  step: (state: State, inputs: readonly Input[], rng: () => number) => State
  /** null while the game goes on. Once non-null the room stops ticking. */
  outcome: (state: State) => ArenaOutcome | null
  /** What EVERYONE sees, as compact JSON (arrays, small integers). It is sent every tick, so keep it a few hundred bytes. */
  snapshot: (state: State) => unknown
  /** The computer's input for a seat this tick. */
  bot: (state: State, seat: number, rng: () => number) => Input
  /** The seat leaves for good: the others win (or the game is called off). */
  forfeit: (state: State, seat: number) => State
  /** Optional: true while the game is only waiting (a countdown): the room need not tick faster than 1 Hz then. Unused by the host today. */
  waiting?: (state: State) => boolean
}

/** Options a room plays with: each known option's chosen value when it is one of its values, otherwise its default. */
export function cleanArenaOptions<Options extends Record<string, TableOptionValue>>(rules: { options: TableOptionSpecs<Options> }, given?: unknown): Options {
  const source: Record<string, unknown> = given !== null && typeof given === 'object' && !Array.isArray(given) ? given as Record<string, unknown> : {}
  const out: Record<string, TableOptionValue> = {}
  for (const [name, spec] of Object.entries(rules.options) as [string, { values: readonly TableOptionValue[]; default: TableOptionValue }][]) {
    const chosen = source[name]
    out[name] = spec.values.some((value) => value === chosen) ? chosen as TableOptionValue : spec.default
  }
  return out as Options
}

/** Round to a whole number for the wire. */
export const wire = (n: number): number => Math.round(n)
