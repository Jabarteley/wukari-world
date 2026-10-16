// TUG: the smallest complete cartridge. Two people pull a rope; the server decides everything, 20 times a second.
//
// Input: 0 (let go) or 1 (pull). Pulling moves the rope two units your way; a gust of wind (drawn from the match's own random
// numbers every second) pushes it one unit either way. The rope runs -100..100: 100 is a win for seat 0, -100 for seat 1. When time
// runs out, whoever has the rope on their side wins; dead centre is a draw.
//
// Rules of the road for every cartridge: pure and plain JSON, no clock, no I/O, no Math.random (only the `rng` handed in),
// and raise `rev` in cartridge.ts whenever a change here changes how a match plays out.
import { ArenaInputError } from '../../src/arena/rules.ts'
import type { ArenaOutcome, RealtimeRules } from '../../src/arena/rules.ts'

export const HZ = 20
export const REACH = 100

export type TugOptions = { seconds: number }
export interface TugState { options: TugOptions; tick: number; rope: number; wind: number; over: boolean; forfeit: number; pulls: [number, number] }
/** What everyone sees, every tick: tick, rope, wind. A few bytes (the contract allows about 300). */
export type TugSnap = [tick: number, rope: number, wind: number]

const parseInput = (raw: unknown): number => {
  if (raw !== 0 && raw !== 1) throw new ArenaInputError('bad input')
  return raw
}

function step(s: TugState, inputs: readonly number[]): TugState {
  if (s.over) return s
  s.tick += 1
  const a = inputs[0] ?? 0, b = inputs[1] ?? 0
  s.pulls[0] += a; s.pulls[1] += b
  s.rope = Math.max(-REACH, Math.min(REACH, s.rope + (a - b) * 2 + s.wind))
  if (Math.abs(s.rope) >= REACH || s.tick >= s.options.seconds * HZ) s.over = true
  return s
}

const rules: RealtimeRules<TugState, number, TugSnap> = {
  id: 'tug',
  label: 'Tug',
  hz: HZ,
  seats: { min: 2, max: 2 },
  options: { seconds: { label: 'Seconds', values: [15, 30], default: 15 } },
  start: (_seats, rng, options) => ({ options: { ...options }, tick: 0, rope: 0, wind: Math.floor(rng() * 3) - 1, over: false, forfeit: -1, pulls: [0, 0] }),
  parseInput,
  idle: () => 0,
  // A new wind every second, drawn here (never in `snapshot` or `outcome`) so the draws are the same in a replay.
  step: (s, inputs, rng) => {
    const next = step(s, inputs)
    if (!next.over && next.tick % HZ === 0) next.wind = Math.floor(rng() * 3) - 1
    return next
  },
  outcome: (s): ArenaOutcome | null => {
    if (!s.over) return null
    const scores = [s.rope, -s.rope]
    if (s.forfeit >= 0) return { winners: [1 - s.forfeit], draw: false, reason: 'forfeit', text: '{' + s.forfeit + '} left. {' + (1 - s.forfeit) + '} wins.', scores }
    if (s.rope === 0) return { winners: [], draw: true, reason: 'level', text: 'A draw: the rope never moved.', scores }
    const winner = s.rope > 0 ? 0 : 1
    return { winners: [winner], draw: false, reason: Math.abs(s.rope) >= REACH ? 'pulled' : 'time', text: '{' + winner + '} wins the tug.', scores }
  },
  snapshot: (s) => [s.tick, s.rope, s.wind],
  // The house bot: pulls about 6 times in 10. The AI mark is the host's business (a seat played by an agent is marked), not the rules'.
  bot: (_s, _seat, rng) => (rng() < 0.6 ? 1 : 0),
  forfeit: (s, seat) => { s.over = true; s.forfeit = seat; return s },
}
export default rules
