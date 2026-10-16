/**
 * OWNER: games (real-time)
 * REPLAY LOGS. The arena is deterministic, so a finished match is fully described by how it began and what each seat did:
 * `start(seats, makeRng(seed), options)`, then per tick one input per seat. The server records that compactly (a few KB) while the
 * match runs (server/growth/arena.ts, `ReplayRecorder`); anyone can fetch it for a finished match (GET /api/arena/replay/:id) and
 * `replayMatch` runs the SAME rules from it, giving every snapshot again. Tests and the clip renderer (scripts/clip.ts) use it.
 *
 * WHAT IS RECORDED. Only what a person did: for a seat played by a person, its input whenever it CHANGES (`i`: tick, seat, input;
 * the input applies from that tick until the next entry; before any entry it is `idle()`). A computer seat is not recorded: the
 * replay calls the rules' `bot` again, which is deterministic in (state, seat, rng) and draws the same random numbers. A person's
 * seat is also played by the bot while their connection is down (the 15-second reconnect window): `s` lists those stretches
 * (seat, from tick, to tick exclusive) so the replay asks the bot there too. `f` is a forfeit: (ticks run so far, seat).
 * `end` is the last snapshot, so a replay is checked ("verified") by reaching it; a replay made by other rules (`rev`) or an
 * edited bot is told apart by `verified: false` rather than shown as if it were exact.
 *
 * PRIVACY. Public names, the AI mark and the cosmetic look of each seat. No ids, no room code, no account data.
 */
import { makeRng } from '../game/util.ts'
import { cleanArenaOptions } from './rules.ts'
import type { ArenaOutcome, RealtimeRules } from './rules.ts'
import type { ArenaLook } from '../types/arena.ts'
import type { TableOptionValue } from '../types/growth.ts'

export const REPLAY_VERSION = 1

export interface ReplaySeat { name: string; bot: boolean; ai?: true; look?: ArenaLook }
export interface ReplayResult { text: string; winners: number[]; draw: boolean; reason: string; scores: number[]; places?: number[] }
export interface ReplayLog {
  v: typeof REPLAY_VERSION
  game: string
  rev: number
  hz: number
  seed: string
  options: Record<string, TableOptionValue>
  seats: ReplaySeat[]
  /** Ticks the match ran. */
  ticks: number
  /** [tick, seat, input]: from `tick` the person's input is `input`. */
  i: [number, number, unknown][]
  /** [seat, from, to): the bot steered a person's seat. */
  s: [number, number, number][]
  /** [ticks run, seat]: the seat left for good at that moment. */
  f: [number, number][]
  /** The last snapshot. */
  end: unknown
  result: ReplayResult
}

/** Builds a log while a match runs. The host calls `tick` once per tick with what it gave `step`, and `forfeit` when a seat leaves. */
export class ReplayRecorder {
  private readonly last: string[]
  private readonly open: number[]
  readonly i: ReplayLog['i'] = []
  readonly s: ReplayLog['s'] = []
  readonly f: ReplayLog['f'] = []
  private ticks = 0
  private readonly head: { game: string; rev: number; hz: number; seed: string; options: Record<string, TableOptionValue>; seats: ReplaySeat[] }
  constructor(head: { game: string; rev: number; hz: number; seed: string; options: Record<string, TableOptionValue>; seats: ReplaySeat[] }, idle: string) {
    this.head = head
    this.last = head.seats.map(() => idle)
    this.open = head.seats.map(() => -1)
  }
  /** `inputs[seat]` as given to step; `bot[seat]`: the bot decided it (a computer seat or a person's seat during the window). */
  tick(inputs: readonly unknown[], steered: readonly boolean[]): void {
    for (let seat = 0; seat < this.head.seats.length; seat++) {
      if (this.head.seats[seat]?.bot) continue
      if (steered[seat]) { if (this.open[seat] < 0) this.open[seat] = this.ticks; continue }
      if (this.open[seat] >= 0) { this.s.push([seat, this.open[seat] as number, this.ticks]); this.open[seat] = -1 }
      const text = JSON.stringify(inputs[seat])
      if (text !== this.last[seat]) { this.last[seat] = text; this.i.push([this.ticks, seat, inputs[seat]]) }
    }
    this.ticks += 1
  }
  forfeit(seat: number): void { this.f.push([this.ticks, seat]) }
  /** Number of entries so far (the host stops keeping a log that grows beyond its bound). */
  get size(): number { return this.i.length + this.s.length + this.f.length }
  finish(outcome: ArenaOutcome & { text: string }, end: unknown, names: readonly string[]): ReplayLog {
    for (let seat = 0; seat < this.open.length; seat++) if ((this.open[seat] as number) >= 0) { this.s.push([seat, this.open[seat] as number, this.ticks]); this.open[seat] = -1 }
    const result: ReplayResult = { text: withReplayNames(outcome.text, names), winners: outcome.winners, draw: outcome.draw, reason: outcome.reason, scores: outcome.scores, ...(outcome.places ? { places: outcome.places } : {}) }
    return { v: REPLAY_VERSION, ...this.head, ticks: this.ticks, i: this.i, s: this.s, f: this.f, end, result }
  }
}
/** The result text names seats as {0}, {1}…; the log keeps the names. */
const withReplayNames = (text: string, names: readonly string[]): string => text.replace(/\{(\d)\}/g, (_, n: string) => names[Number(n)] ?? 'Player')

export interface Replayed { snaps: unknown[]; start: unknown; /** Reached the recorded last snapshot (and the same rules revision). */ verified: boolean; problem: string }

/** Is this parsed JSON a replay log we can run? Bounded and typed: it comes from a server, but a clip tool takes files too. */
export function parseReplay(raw: unknown): ReplayLog | null {
  const log = raw as Partial<ReplayLog> | null
  if (!log || typeof log !== 'object' || log.v !== REPLAY_VERSION || typeof log.game !== 'string' || typeof log.seed !== 'string') return null
  if (!Number.isSafeInteger(log.ticks) || (log.ticks as number) < 0 || (log.ticks as number) > 1_000_000) return null
  if (!Array.isArray(log.seats) || log.seats.length < 1 || log.seats.length > 8 || !Array.isArray(log.i) || !Array.isArray(log.s) || !Array.isArray(log.f)) return null
  if (typeof log.hz !== 'number' || !(log.hz >= 1 && log.hz <= 30) || typeof log.rev !== 'number' || !log.result || typeof log.options !== 'object') return null
  const n = log.seats.length
  if (!log.i.every((e) => Array.isArray(e) && Number.isSafeInteger(e[0]) && Number.isSafeInteger(e[1]) && e[1] >= 0 && e[1] < n)) return null
  if (!log.s.every((e) => Array.isArray(e) && e.length === 3 && e.every((x) => Number.isSafeInteger(x)) && e[0] >= 0 && e[0] < n)) return null
  if (!log.f.every((e) => Array.isArray(e) && e.length === 2 && e.every((x) => Number.isSafeInteger(x)) && e[1] >= 0 && e[1] < n)) return null
  return log as ReplayLog
}

/**
 * Run the rules from a log: the state at the start and the snapshot after every tick (`snaps[k-1]` is tick k; `start` is tick 0).
 * `rev` is the revision of the rules the caller has; a different one is run anyway but is not `verified`.
 */
export function replayMatch(rules: RealtimeRules<any, any, any>, log: ReplayLog, rev: number = log.rev): Replayed {
  const rng = makeRng(log.seed)
  const state = rules.start(log.seats.length, rng, cleanArenaOptions(rules, log.options))
  const start = rules.snapshot(state)
  const held = log.seats.map(() => rules.idle() as unknown)
  const snaps: unknown[] = []
  const steered = (seat: number, tick: number): boolean => log.s.some(([who, from, to]) => who === seat && tick >= from && tick < to)
  let nextInput = 0
  const inputs = [...log.i].sort((a, b) => a[0] - b[0])
  let outcome: unknown = null
  for (let tick = 0; tick < log.ticks; tick++) {
    for (const [after, seat] of log.f) if (after === tick) rules.forfeit(state, seat)
    while (nextInput < inputs.length && (inputs[nextInput] as [number, number, unknown])[0] <= tick) { const [, seat, input] = inputs[nextInput++] as [number, number, unknown]; held[seat] = input }
    const given = log.seats.map((seat, index) => (seat.bot || steered(index, tick) ? rules.bot(state, index, rng) : held[index]))
    rules.step(state, given, rng)
    snaps.push(rules.snapshot(state))
    outcome = rules.outcome(state)
  }
  for (const [after, seat] of log.f) if (after >= log.ticks) { rules.forfeit(state, seat); snaps.push(rules.snapshot(state)); outcome = rules.outcome(state) }
  const last = snaps.length ? snaps[snaps.length - 1] : start
  const same = JSON.stringify(last) === JSON.stringify(log.end)
  const problem = rev !== log.rev ? 'This replay was made by older rules.' : !same ? 'The replay no longer matches the recorded match.' : outcome ? '' : 'The replay ended before the match did.'
  return { snaps, start, verified: problem === '', problem }
}
