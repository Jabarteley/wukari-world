/**
 * AGENT TOURNAMENTS: what is stored and the pure rules around it (design: docs/AGENT-ARENA.md). Nothing here reads a clock, a context or the store.
 *
 * Everything lives in ONE optional field of the existing agents collection, `agents.arena` (so an old save loads unchanged and the account
 * erasure contract of `agents` already covers it). It holds public agent ids and their public names only: never a key, an account id or an address.
 *
 *   cups        one weekly cup: a game cup (agents play each other) or a life cup (the game's own records are measured)
 *   matches     one match between two agents, server-owned and replayable from its seed and its log (matches.ts)
 *   challenges  "is your agent better than mine?" links (a game match, or a seven-day life contest)
 *   badges      what a winning agent's owner is given, by agent id
 *   prizes      game money owed or paid, by agent id and week (the weekly ceiling is counted here)
 *   limits      per-day counters for challenges, by owner key
 */
import { lagosDayStart } from '../../src/game/clock.ts';
import { TABLE_STAKES } from '../../src/game/content/growth.ts';

export const DAY_MS = 86400000;
export const LIFE_CATEGORIES = Object.freeze(['stall', 'friends', 'missions', 'office'] as const);
export type LifeCategory = typeof LIFE_CATEGORIES[number];
export const LIFE_LABELS: Readonly<Record<LifeCategory, { label: string; unit: string; blurb: string }>> = Object.freeze({
  stall: { label: 'Richest stall', unit: 'naira taken', blurb: 'Whose stall took the most money in the week (sales to your own other characters or to a shared device do not count).' },
  friends: { label: 'Most friends made', unit: 'new friends', blurb: 'Who made the most new friends in the week. Each friend must be a real, different account.' },
  missions: { label: 'Most missions done', unit: 'missions', blurb: 'Who collected the most missions in the week.' },
  office: { label: 'Elected to office', unit: 'offices won', blurb: 'Who won a seat on the agents\' ballot in the week.' },
});
/** The table and arena games a game cup can be played at: two seats, a winner. */
export const TABLE_CUPS = Object.freeze(['chess', 'whot', 'ayo', 'penalty', 'weave'] as const);
export const ARENA_CUPS = Object.freeze(['fight', 'race', 'football'] as const);

export const ARENA = Object.freeze({
  maxEntrants: 16, roundRobinMax: 6,
  /** Days from Monday 00:00 Lagos: entries close, rounds begin and end (Saturday night), the week ends (Sunday night). */
  entryDays: 2, roundsEndDay: 6, weekDays: 7, lifeEntryDays: 3,
  points: { win: 3, draw: 1, loss: 0 },
  /** Prizes in game naira: first, second, third. None is above the highest stake a table allows. */
  prizes: Object.freeze([2000, 1000, 500]),
  /** A cup pays prizes only when at least this many different owners entered. */
  minOwnersForPrizes: 4,
  /** The most prize money one agent character can receive in one Lagos week, across every cup and challenge. */
  weeklyPrizeCeiling: 4000,
  /** Tables: how long a seat has to move; consecutive missed turns that forfeit the match. */
  turnMs: 10 * 60000, missesToForfeit: 3,
  /** Real-time games: game seconds one decision covers, how long both seats have to answer, missed decisions in a row that forfeit, and the longest plan. */
  windowSeconds: 2, windowMs: 20000, windowMisses: 8, maxPlan: 4, maxWindows: 400,
  /** Once one agent has shown up, the other has this long before the match is lost by not appearing. */
  graceMs: 30 * 60000,
  /** Challenges. */
  challenge: Object.freeze({ createPerDay: 3, acceptPerDay: 5, openMax: 5, expireMs: 2 * DAY_MS, matchMs: DAY_MS, lifeMs: 7 * DAY_MS, keepMs: 30 * DAY_MS }),
  keepWeeks: 8,
  logMax: 900,
});
if (Math.max(...ARENA.prizes) > Math.max(...TABLE_STAKES.choices)) throw new Error('A tournament prize is above the highest table stake.');

// ---- stored shapes -------------------------------------------------------------------------------------------

export interface Entrant {
  /** The agent character's public id. */ id: string
  name: string
  /** One-way key of the owner's account (a cup takes one agent from each owner). */ ok: string
  seed: number
  enteredAt: number
  /** Life cups: the figure when the agent entered, and sales to the owner's own other characters (taken off a stall's takings). */
  base: number; self: number
}
export interface MatchRec {
  id: string; ref: string
  kind: 'table' | 'arena'; game: string
  ids: [string, string]; names: [string, string]
  seed: string; round: number; opened: number; deadline: number
  status: 'waiting' | 'playing' | 'done'
  startedAt: number; seen: [number, number]; turnAt: number; misses: [number, number]; moved: [number, number]
  /** Arena: what each seat has sent for the open decision. */
  pending: [unknown, unknown]
  /** Table: `{ s, m }` a move, `{ s, t: 1 }` the clock played, `{ f }` a forfeit. Arena: `[planA, planB]` one decision window, or `{ f }`. */
  log: unknown[]
  result?: { winner: 0 | 1 | null; reason: string; text: string; scores: number[] }
}
export interface Standing { rank: number; id: string; name: string; played: number; won: number; drawn: number; lost: number; points: number }
export interface CupResult { rank: number; id: string; name: string; score: number; prize: number }
export interface Cup {
  id: string; week: number; kind: 'game' | 'life'; key: string
  entrants: Entrant[]
  status: 'open' | 'running' | 'settled' | 'void'
  /** Game cups. */
  format?: 'roundrobin' | 'bracket'
  rounds?: { start: number; end: number; matches: string[]; byes?: string[] }[]
  /** Round robin: every round's pairs, fixed when the entries close. */
  plan?: [string, string][][]
  results?: CupResult[]
  settledAt?: number
  /** Why no prize was paid, in a sentence. */
  note?: string
}
export interface Challenge {
  code: string; kind: 'game' | 'life'; key: string
  /** The maker: their agent, the maker's owner key, and a name to show. */
  from: { id: string; name: string; ok: string }
  to?: { id: string; name: string; ok: string }
  createdAt: number; expiresAt: number
  status: 'open' | 'playing' | 'done' | 'expired' | 'cancelled'
  match?: string
  /** Life challenges: when the contest began and ends, and each side's starting figure and score. */
  life?: { start: number; end: number; bases: [number, number]; self: [number, number]; scores?: [number, number] }
  result?: { winner: 0 | 1 | null; text: string; at: number }
}
export interface Badge { week: number; kind: string; label: string; rank: number; at: number; name: string }
export interface PrizeRec { id: string; char: string; amount: number; label: string; week: number; paid: boolean; at: number }
export interface ArenaBook {
  v: 1
  cups: Record<string, Cup>
  matches: Record<string, MatchRec>
  challenges: Record<string, Challenge>
  badges: Record<string, Badge[]>
  prizes: Record<string, PrizeRec>
  limits: Record<string, { day: number; made: number; accepted: number }>
  paidWeek: Record<string, { week: number; amount: number }>
  seq: number
}
export const emptyBook = (): ArenaBook => ({ v: 1, cups: {}, matches: {}, challenges: {}, badges: {}, prizes: {}, limits: {}, paidWeek: {}, seq: 0 });
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
/** The book of an agents collection, created and repaired in place. */
export function bookOf(agents: { arena?: ArenaBook }): ArenaBook {
  const found = (agents.arena ??= emptyBook()) as Partial<ArenaBook>;
  for (const name of ['cups', 'matches', 'challenges', 'badges', 'prizes', 'limits', 'paidWeek'] as const) if (!isObject(found[name])) (found as Record<string, unknown>)[name] = {};
  if (typeof found.seq !== 'number') found.seq = 0;
  found.v = 1;
  return found as ArenaBook;
}
/** Take an agent out of the book (it was removed or taken over): its badges go, its name is replaced where it played. */
export function forget(book: ArenaBook, id: string): void {
  delete book.badges[id]; delete book.paidWeek[id];
  for (const cup of Object.values(book.cups)) for (const entrant of cup.entrants) if (entrant.id === id) { entrant.name = 'Removed agent'; }
  for (const match of Object.values(book.matches)) match.ids.forEach((other, index) => { if (other === id) match.names[index] = 'Removed agent'; });
  for (const challenge of Object.values(book.challenges)) { if (challenge.from.id === id) challenge.from.name = 'Removed agent'; if (challenge.to?.id === id) challenge.to.name = 'Removed agent'; }
}

// ---- the week ------------------------------------------------------------------------------------------------

export interface Week { week: number; id: string; start: number; entryEnd: number; lifeEntryEnd: number; roundsStart: number; roundsEnd: number; end: number }
/** The Lagos week an instant is in: it starts Monday 00:00 Lagos time and is settled at the end of Sunday. */
export function weekOf(now: number, lagosWeek: number): Week {
  const start = lagosDayStart(lagosWeek * 7 - 3);
  return { week: lagosWeek, id: `w${lagosWeek}`, start, entryEnd: start + ARENA.entryDays * DAY_MS, lifeEntryEnd: start + ARENA.lifeEntryDays * DAY_MS, roundsStart: start + ARENA.entryDays * DAY_MS, roundsEnd: start + ARENA.roundsEndDay * DAY_MS, end: start + ARENA.weekDays * DAY_MS };
}
export const cupId = (week: number, key: string): string => `w${week}:${key}`;
export const cupKeys = (): string[] => [...TABLE_CUPS, ...ARENA_CUPS, ...LIFE_CATEGORIES.map((c) => `life-${c}`)];
export const isLifeKey = (key: string): key is `life-${LifeCategory}` => key.startsWith('life-') && (LIFE_CATEGORIES as readonly string[]).includes(key.slice(5));
export const categoryOf = (key: string): LifeCategory | null => (isLifeKey(key) ? key.slice(5) as LifeCategory : null);

// ---- pairing and standings -----------------------------------------------------------------------------------

/** Round robin by the circle method: every entrant plays every other once. `null` is a rest. Seats alternate so nobody always has the first seat. */
export function roundRobin(ids: readonly string[]): [string, string][][] {
  const list: (string | null)[] = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length, rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i] ?? null, b = list[n - 1 - i] ?? null;
      if (a === null || b === null) continue;
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() ?? null);
  }
  return rounds;
}
/** The seed order of a single-elimination bracket of `size` (a power of two): 1 meets size, 2 meets size-1, and the top seeds stay apart. */
export function bracketOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) { const total = order.length * 2 + 1; order = order.flatMap((seed) => [seed, total - seed]); }
  return order;
}
export const bracketRounds = (n: number): number => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));
/** The first round of a bracket: pairs of seeds (1-based); a seed above n has a bye. */
export function bracketFirstRound(ids: readonly string[]): { pairs: [string, string][]; byes: string[] } {
  const size = 2 ** bracketRounds(ids.length), order = bracketOrder(size), pairs: [string, string][] = [], byes: string[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const a = ids[(order[i] ?? 0) - 1], b = ids[(order[i + 1] ?? 0) - 1];
    if (a && b) pairs.push([a, b]); else if (a ?? b) byes.push((a ?? b) as string);
  }
  return { pairs, byes };
}
/** Round robin table from finished matches: 3 for a win, 1 for a draw; ties go to wins, then to the better seed (the earlier entry in `ids`). */
export function tableOf(ids: readonly string[], names: Record<string, string>, matches: readonly MatchRec[]): Standing[] {
  const rows = new Map<string, Standing>(ids.map((id) => [id, { rank: 0, id, name: names[id] ?? 'Agent', played: 0, won: 0, drawn: 0, lost: 0, points: 0 }]));
  for (const match of matches) {
    if (match.status !== 'done' || !match.result) continue;
    const [a, b] = match.ids, ra = rows.get(a), rb = rows.get(b);
    if (!ra || !rb) continue;
    ra.played++; rb.played++;
    const winner = match.result.winner;
    if (winner === null) { ra.drawn++; rb.drawn++; ra.points += ARENA.points.draw; rb.points += ARENA.points.draw; }
    else { const w = winner === 0 ? ra : rb, l = winner === 0 ? rb : ra; w.won++; l.lost++; w.points += ARENA.points.win; }
  }
  const seed = (id: string): number => ids.indexOf(id);
  return [...rows.values()].sort((x, y) => y.points - x.points || y.won - x.won || seed(x.id) - seed(y.id)).map((row, index) => ({ ...row, rank: index + 1 }));
}
/** Prize for a finishing rank (1-based) in a cup that pays, else 0. */
export const prizeFor = (rank: number): number => ARENA.prizes[rank - 1] ?? 0;
