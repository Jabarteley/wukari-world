/**
 * OWNER: growth
 * Ayo for two, using the Oware rules named in `options.variant`. The server applies a whole turn
 * atomically; `last` is a small replay record that lets a client illustrate the accepted sowing.
 *
 * Cups run anticlockwise around the board: seat 0 owns 0..5 and seat 1 owns 6..11. A move picks one
 * owned cup and sows one seed into each following cup, skipping the origin on every circuit. A last
 * seed on the opponent's row captures backwards through cups holding two or three seeds. Capturing
 * every seed on that row is a grand slam, so that capture is cancelled. If the opponent has no
 * seeds, a legal move must feed them.
 */
import { isRecord } from '../game/util.ts'
import { RulesError } from './rules.ts'
import type { Outcome, TableRules } from './rules.ts'

type Seat = 0 | 1
type Pair<Value> = [Value, Value]

export type AyoOptions = { variant: 'oware' }
export type AyoMove = { cup: number }
export interface AyoReplay {
  seat: Seat
  cup: number
  before: number[]
  path: number[]
  capturedCups: number[]
  captured: number
  after: number[]
  collected: boolean
}
export interface AyoState {
  options: AyoOptions
  cups: number[]
  captured: Pair<number>
  turn: Seat
  moves: Pair<number>
  withoutCapture: number
  repetitions: Record<string, number>
  last: AyoReplay | null
  over: Outcome | null
}
export interface AyoView {
  game: 'ayo'
  variant: 'Oware rules'
  cups: number[]
  captured: Pair<number>
  turn: Seat | null
  legal: number[]
  last: AyoReplay | null
  over: Outcome | null
}

export const CUPS_PER_SIDE = 6
export const STARTING_SEEDS = 4
export const TOTAL_SEEDS = 48
export const REPETITIONS_TO_END = 3
export const TURNS_WITHOUT_CAPTURE_TO_END = 200

const isSeat = (seat: unknown): seat is Seat => seat === 0 || seat === 1
const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0)
const cupValue = (cups: readonly number[], cup: number): number => cups[cup] ?? 0
const owns = (seat: Seat, cup: number): boolean => (seat === 0 ? cup >= 0 && cup < CUPS_PER_SIDE : cup >= CUPS_PER_SIDE && cup < CUPS_PER_SIDE * 2)
const row = (seat: Seat): number[] => Array.from({ length: CUPS_PER_SIDE }, (_, index) => index + seat * CUPS_PER_SIDE)
const rowSeeds = (cups: readonly number[], seat: Seat): number => row(seat).reduce((total, cup) => total + cupValue(cups, cup), 0)
const positionKey = (cups: readonly number[], turn: Seat): string => `${turn}|${cups.join(',')}`

const cloneReplay = (last: AyoReplay | null): AyoReplay | null => (last ? {
  ...last,
  before: last.before.slice(),
  path: last.path.slice(),
  capturedCups: last.capturedCups.slice(),
  after: last.after.slice(),
} : null)
const clone = (state: AyoState): AyoState => ({
  ...state,
  cups: state.cups.slice(),
  captured: [state.captured[0], state.captured[1]],
  moves: [state.moves[0], state.moves[1]],
  repetitions: { ...state.repetitions },
  last: cloneReplay(state.last),
})

/** Sow one cup without capturing. The returned path has one entry for every seed accepted by a cup. */
export function sow(cups: readonly number[], origin: number): { cups: number[]; path: number[]; last: number } {
  const next = cups.slice()
  let seeds = cupValue(next, origin)
  next[origin] = 0
  let at = origin
  const path: number[] = []
  while (seeds > 0) {
    at = (at + 1) % (CUPS_PER_SIDE * 2)
    if (at === origin) continue
    next[at] = cupValue(next, at) + 1
    path.push(at)
    seeds -= 1
  }
  return { cups: next, path, last: at }
}

function feeds(cups: readonly number[], seat: Seat, cup: number): boolean {
  if (rowSeeds(cups, otherSeat(seat)) > 0) return true
  return rowSeeds(sow(cups, cup).cups, otherSeat(seat)) > 0
}

/** The owned non-empty cups a seat may choose, including the must-feed rule. */
export function legalCups(cups: readonly number[], seat: Seat): number[] {
  return row(seat).filter((cup) => cupValue(cups, cup) > 0 && feeds(cups, seat, cup))
}

interface TurnResult { cups: number[]; path: number[]; capturedCups: number[]; captured: number }

/** Apply sowing and the backward 2-or-3 capture, cancelling a grand slam. */
function playTurn(before: readonly number[], seat: Seat, cup: number): TurnResult {
  const sown = sow(before, cup)
  const opponent = otherSeat(seat)
  const candidates: number[] = []
  let at = sown.last
  while (owns(opponent, at)) {
    const seeds = cupValue(sown.cups, at)
    if (seeds !== 2 && seeds !== 3) break
    candidates.push(at)
    at = (at + CUPS_PER_SIDE * 2 - 1) % (CUPS_PER_SIDE * 2)
  }
  const candidateSeeds = candidates.reduce((total, target) => total + cupValue(sown.cups, target), 0)
  // Oware grand slam: leave the opponent their row rather than capture every remaining seed.
  const capturedCups = candidateSeeds > 0 && candidateSeeds === rowSeeds(sown.cups, opponent) ? [] : candidates
  const captured = capturedCups.reduce((total, target) => total + cupValue(sown.cups, target), 0)
  const cups = sown.cups.slice()
  for (const target of capturedCups) cups[target] = 0
  return { cups, path: sown.path, capturedCups, captured }
}

function scoreOutcome(captured: Pair<number>, reason: string, detail: string): Outcome {
  const [first, second] = captured
  if (first === second) return { winners: [], draw: true, reason, text: `${detail} The game is a draw, ${first}–${second}.`, scores: [first, second] }
  const winner: Seat = first > second ? 0 : 1
  return { winners: [winner], draw: false, reason, text: `${detail} {${winner}} wins ${Math.max(first, second)}–${Math.min(first, second)}.`, scores: [first, second] }
}

function capturedOutcome(captured: Pair<number>): Outcome | null {
  if (captured[0] === 24 && captured[1] === 24) return { winners: [], draw: true, reason: '24-each', text: 'Both players captured 24 seeds. A draw.', scores: [24, 24] }
  if (captured[0] > 24) return { winners: [0], draw: false, reason: 'captured', text: '{0} captured more than 24 seeds and wins.', scores: [captured[0], captured[1]] }
  if (captured[1] > 24) return { winners: [1], draw: false, reason: 'captured', text: '{1} captured more than 24 seeds and wins.', scores: [captured[0], captured[1]] }
  return null
}

/** End a bounded or starved game: each seat keeps the seeds still sitting in its own row. */
function collectRemaining(state: AyoState, reason: string, detail: string): void {
  state.captured[0] += rowSeeds(state.cups, 0)
  state.captured[1] += rowSeeds(state.cups, 1)
  state.cups.fill(0)
  state.over = scoreOutcome(state.captured, reason, detail)
}

function apply(before: AyoState, seat: number, move: AyoMove): AyoState {
  if (before.over) throw new RulesError('This Ayo game is over.')
  if (!isSeat(seat)) throw new RulesError('You are not in this Ayo game.')
  if (seat !== before.turn) throw new RulesError('Wait for your turn.')
  if (!owns(seat, move.cup)) throw new RulesError('Choose one of the six cups on your side.')
  if (!legalCups(before.cups, seat).includes(move.cup)) {
    if (cupValue(before.cups, move.cup) === 0) throw new RulesError('That cup is empty.')
    throw new RulesError('Your opponent has no seeds. Choose a cup that feeds their row.')
  }

  const state = clone(before)
  const played = playTurn(before.cups, seat, move.cup)
  state.cups = played.cups
  state.captured[seat] += played.captured
  state.moves[seat] += 1
  state.withoutCapture = played.captured > 0 ? 0 : before.withoutCapture + 1
  state.turn = otherSeat(seat)
  if (played.captured > 0) state.repetitions = {}
  state.last = {
    seat,
    cup: move.cup,
    before: before.cups.slice(),
    path: played.path,
    capturedCups: played.capturedCups,
    captured: played.captured,
    after: played.cups.slice(),
    collected: false,
  }

  state.over = capturedOutcome(state.captured)
  if (!state.over) {
    const key = positionKey(state.cups, state.turn)
    state.repetitions[key] = (state.repetitions[key] ?? 0) + 1
    if ((state.repetitions[key] ?? 0) >= REPETITIONS_TO_END) collectRemaining(state, 'repetition', 'The same board and turn came up three times.')
    else if (state.withoutCapture >= TURNS_WITHOUT_CAPTURE_TO_END) collectRemaining(state, 'no-capture-limit', 'Two hundred turns passed without a capture.')
    else if (legalCups(state.cups, state.turn).length === 0) collectRemaining(state, 'starvation', `{${state.turn}} cannot make a move that feeds the other row.`)
  }
  if (state.last) {
    state.last.after = state.cups.slice()
    state.last.collected = state.over !== null && state.cups.every((seeds) => seeds === 0) && played.cups.some((seeds) => seeds > 0)
  }
  return state
}

function parseMove(input: unknown): AyoMove {
  if (!isRecord(input) || typeof input.cup !== 'number' || !Number.isInteger(input.cup) || input.cup < 0 || input.cup >= CUPS_PER_SIDE * 2) {
    throw new RulesError('Choose a cup on the Ayo board.')
  }
  return { cup: input.cup }
}

function view(state: AyoState, seat: number | null): AyoView {
  return {
    game: 'ayo',
    variant: 'Oware rules',
    cups: state.cups.slice(),
    captured: [state.captured[0], state.captured[1]],
    turn: state.over ? null : state.turn,
    legal: isSeat(seat) && seat === state.turn ? legalCups(state.cups, seat) : [],
    last: cloneReplay(state.last),
    over: state.over,
  }
}

/** A tiny deterministic search: value our capture against the opponent's strongest immediate capture. */
function bot(state: AyoState, seat: number): AyoMove {
  if (!isSeat(seat) || seat !== state.turn) throw new RulesError('The house player cannot move now.')
  const legal = legalCups(state.cups, seat)
  const first = legal[0]
  if (first === undefined) throw new RulesError('There is no legal Ayo move.')
  let choice = first
  let best = Number.NEGATIVE_INFINITY
  for (const cup of legal) {
    const next = apply(state, seat, { cup })
    const gained = next.last?.captured ?? 0
    let worstReply = 0
    if (!next.over) {
      const opponent = otherSeat(seat)
      for (const reply of legalCups(next.cups, opponent)) {
        const afterReply = apply(next, opponent, { cup: reply })
        worstReply = Math.max(worstReply, afterReply.last?.captured ?? 0)
      }
    }
    const value = gained * 100 - worstReply
    if (value > best) { best = value; choice = cup }
  }
  return { cup: choice }
}

const rules: TableRules<AyoState, AyoMove, AyoView> = {
  id: 'ayo',
  label: 'Ayo',
  seats: { min: 2, max: 2 },
  turnSeconds: 45,
  options: { variant: { label: 'Variant', values: ['oware'], names: ['Oware rules'], default: 'oware' } },
  start: (_seats, _rng, options) => {
    const cups = Array<number>(CUPS_PER_SIDE * 2).fill(STARTING_SEEDS)
    return {
      options,
      cups,
      captured: [0, 0],
      turn: 0,
      moves: [0, 0],
      withoutCapture: 0,
      repetitions: { [positionKey(cups, 0)]: 1 },
      last: null,
      over: null,
    }
  },
  toMove: (state) => (state.over ? [] : [state.turn]),
  parseMove,
  apply,
  outcome: (state) => state.over,
  view,
  bot: (state, seat) => bot(state, seat),
  timeout: (state, seat) => apply(state, seat, bot(state, seat)),
  forfeit(before, seat) {
    if (before.over || !isSeat(seat)) return before
    const state = clone(before)
    const winner = otherSeat(seat)
    state.over = { winners: [winner], draw: false, reason: 'forfeit', text: `{${seat}} left the Ayo board. {${winner}} wins.`, scores: [state.captured[0], state.captured[1]] }
    return state
  },
  describe: (_state, seat, move) => `{${seat}} sowed cup ${owns(0, move.cup) ? move.cup + 1 : move.cup - CUPS_PER_SIDE + 1}`,
  report: (_before, after) => {
    const captured = after.last?.captured ?? 0
    return captured > 0 && after.last ? [`{${after.last.seat}} captured ${captured} seed${captured === 1 ? '' : 's'}`] : []
  },
  moved: (state) => [state.moves[0], state.moves[1]],
}

export default rules
