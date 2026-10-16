/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * AGENT TOURNAMENTS: what is stored and the pure rules around it. Nothing here reads a clock, a context or the store.
 *
 * STORED   ctx.collection(db, 'agentarena') = ArenaBook (below). Its own collection, so the agents collection that every MCP call writes does not
 *          grow with it. It holds agent characters' public ids and public names, and one-way keys of their owners' accounts (`ok`): never a key,
 *          an account id or an address. Bounded: 16 entrants a cup, 12 cups a week, cups kept ARENA.keepWeeks, a finished match keeps no log,
 *          challenges kept 30 days. Erasure: `forgetArena` (server/admin/erasure-data.ts and server/agents/privacy.ts call it).
 *
 *   cups        one weekly cup: a game cup (agents play each other) or a life cup (the game's own records are measured)
 *   matches     one match between two agents, server-owned and replayed from its seed and its log (matches.ts)
 *   challenges  "is your agent better than mine?" links (a game match, or a seven-day life contest)
 *   badges      what a winning agent's owner is given, by agent id
 *   prizes      game money owed or paid, by cup and rank (the weekly ceiling is counted in paidWeek)
 *   limits      per-day counters for challenges, by owner key
 */
import { lagosDayStart } from '../../src/game/clock.ts';
import { TABLE_STAKES } from '../../src/game/content/growth.ts';

export const COLLECTION = 'agentarena';
export const DAY_MS = 86400000;
export const LIFE_CATEGORIES = Object.freeze(['stall', 'friends', 'missions', 'office'] as const);
export type LifeCategory = typeof LIFE_CATEGORIES[number];
export const LIFE_LABELS: Readonly<Record<LifeCategory, { label: string; unit: string; blurb: string }>> = Object.freeze({
  stall: { label: 'Richest stall', unit: 'naira taken', blurb: 'Whose stall takes the most from people in the week. Sales to its owner\'s own characters, to other agents or from a shared device do not count.' },
  friends: { label: 'Most friends made', unit: 'new friends', blurb: 'Who makes the most new friends in the week. Each friend must be a real person on a different account.' },
  missions: { label: 'Most missions done', unit: 'missions', blurb: 'Who collects the most missions in the week.' },
  office: { label: 'Elected to office', unit: 'offices won', blurb: 'Who wins seats on the agents\' ballot in the week.' },
});
/** The table and arena games a game cup can be played at: two seats, a winner. Not Weave: its rules need the word list loaded first (src/tables/weave.ts). */
export const TABLE_CUPS = Object.freeze(['chess', 'whot', 'ayo', 'penalty'] as const);
export const ARENA_CUPS = Object.freeze(['fight', 'race', 'football'] as const);

export const ARENA = Object.freeze({
  maxEntrants: 16, roundRobinMax: 6,
  /** Days from Monday 00:00 Lagos: game cups take entries for `entryDays`, play rounds until `roundsEndDay` (Sunday 00:00); life cups take entries for `lifeEntryDays` and end with the week. */
  entryDays: 2, roundsEndDay: 6, weekDays: 7, lifeEntryDays: 3,
  points: { win: 3, draw: 1, loss: 0 },
  /** Prizes in game naira: first, second, third. None is above the highest stake a table allows. */
  prizes: Object.freeze([2000, 1000, 500]),
  /** A cup pays prizes only when at least this many different people entered an agent. */
  minOwnersForPrizes: 4,
  /** The most prize money one agent character can receive in one Lagos week, across every cup. */
  weeklyPrizeCeiling: 4000,
  /** Tables: how long a seat has to move; missed turns in a row that lose the match. */
  turnMs: 10 * 60000, missesToForfeit: 3,
  /** Real-time games: game seconds one decision covers, how long both seats have to answer, missed decisions in a row that lose, the longest plan, the most windows. */
  windowSeconds: 2, windowMs: 20000, windowMisses: 8, maxPlan: 4, maxWindows: 400,
  /** Once one agent has shown up, the other has this long to show up too or lose. */
  graceMs: 30 * 60000,
  /** Challenges: made and taken per person a Lagos day, open at once, how long a link waits, how long a match or a life contest runs, how long a finished one is kept. */
  challenge: Object.freeze({ createPerDay: 3, acceptPerDay: 5, openMax: 5, expireMs: 2 * DAY_MS, matchMs: DAY_MS, lifeMs: 7 * DAY_MS, keepMs: 30 * DAY_MS }),
  keepWeeks: 8,
  /** Most entries in a table match's log. */
  logMax: 900,
  /** A finished match is kept (without its log) this long for its card and standings. */
  doneKeepMs: 14 * DAY_MS,
  /** Life contests: how often their scores are read while they run, and how late a settlement may still read them live. */
  snapMs: 10 * 60000,
});
if (Math.max(...ARENA.prizes) > Math.max(...TABLE_STAKES.choices)) throw new Error('A tournament prize is above the highest table stake.');

// ---- stored shapes -------------------------------------------------------------------------------------------

export interface Entrant {
  /** The agent character's public id. */ id: string
  name: string
  /** One-way key of the owner's account (a cup takes one agent from each owner). */ ok: string
  seed: number
  enteredAt: number
  /** Life cups: the figure when the agent entered (a cup counts the change). */ base: number
  /** Stall cups: takings from people since entering (life.ts noteShopSale). */ people: number
  /** Missions and office cups: the score as last read before the end (a cup settled late uses it, so nothing after the end counts). */ snap?: number
}
export type MatchResult = { winner: 0 | 1 | null; reason: string; text: string; scores: number[] };
export interface MatchRec {
  id: string; ref: string
  kind: 'table' | 'arena'; game: string
  ids: [string, string]; names: [string, string]
  seed: string; round: number; opened: number; deadline: number
  status: 'waiting' | 'playing' | 'done'
  startedAt: number; seen: [number, number]; turnAt: number; misses: [number, number]; moved: [number, number]
  /** Arena: what each seat has sent for the open decision window. */
  pending: [unknown, unknown]
  /** Table: `{ s, m }` a move, `{ s, t: 1 }` the clock played, `{ f }` a forfeit. Arena: `[planA, planB]` one decision window, or `{ f }`. Emptied once done. */
  log: unknown[]
  result?: MatchResult
  /** When it finished. */
  doneAt?: number
  /** Arena: the replay of the watched room, once it has finished playing (server/growth/arena-replays.ts). */
  replay?: string
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
  /** Round robin: the table at settlement (the matches are not kept for ever). */
  table?: Standing[]
  results?: CupResult[]
  settledAt?: number
  /** Why no prize was paid, in a sentence. */
  note?: string
  /** Life cups: when the entrants' `snap` was last taken. */
  snapAt?: number
}
export interface Side { id: string; name: string; ok: string }
export interface Challenge {
  code: string; kind: 'game' | 'life'; key: string
  /** The maker's agent and the one that took it. */
  from: Side
  to?: Side
  createdAt: number; expiresAt: number
  status: 'open' | 'playing' | 'done' | 'expired'
  match?: string
  /** Life challenges: when the contest began and ends, each side's starting figure, stall takings from people, and the final scores. */
  life?: { start: number; end: number; bases: [number, number]; people: [number, number]; scores?: [number, number]; snap?: { at: number; scores: [number, number] } }
  result?: { winner: 0 | 1 | null; text: string; at: number }
}
export interface Badge { week: number; kind: string; label: string; rank: number; at: number; name: string; cup: string }
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
const MAPS = ['cups', 'matches', 'challenges', 'badges', 'prizes', 'limits', 'paidWeek'] as const;
/** Repair a found book in place, so damaged data cannot crash a route. */
export function repairBook(found: Partial<ArenaBook>): ArenaBook {
  for (const name of MAPS) if (!isObject(found[name])) (found as Record<string, unknown>)[name] = {};
  if (typeof found.seq !== 'number' || !Number.isSafeInteger(found.seq)) found.seq = 0;
  found.v = 1;
  return found as ArenaBook;
}
/** The book if it exists, without making it (reads). */
export function peekBook(db: object): ArenaBook | null {
  const found = (db as Record<string, unknown>)[COLLECTION];
  return isObject(found) && MAPS.every((name) => isObject(found[name])) ? found as unknown as ArenaBook : null;
}

export const REMOVED = 'Removed agent';
/**
 * Take characters out of the book (an agent was removed or taken over, or a player was erased): their open challenges and entries in cups
 * still taking entries go, their badges, unpaid prizes and week counters go, and their name is replaced wherever they already played (a
 * result others share stays, without the name or the id). `owners`: one-way owner keys of erased accounts, whose day counters go too.
 */
export function forgetArena(book: ArenaBook, ids: ReadonlySet<string>, owners: ReadonlySet<string> = new Set()): void {
  let n = 0;
  const gone = new Map<string, string>();
  const alias = (id: string): string => { let made = gone.get(id); if (!made) { made = `removed-${++n}`; gone.set(id, made); } return made; };
  for (const id of ids) { delete book.badges[id]; delete book.paidWeek[id]; }
  for (const [pid, prize] of Object.entries(book.prizes)) if (ids.has(prize.char)) delete book.prizes[pid];
  for (const owner of owners) delete book.limits[owner];
  for (const cup of Object.values(book.cups)) {
    if (cup.status === 'open') { cup.entrants = cup.entrants.filter((e) => !ids.has(e.id)); continue; }
    for (const e of cup.entrants) if (ids.has(e.id)) { e.name = REMOVED; e.id = alias(e.id); e.ok = ''; }
    for (const row of [...(cup.results ?? []), ...(cup.table ?? [])]) if (ids.has(row.id)) { row.name = REMOVED; row.id = alias(row.id); }
    for (const round of cup.rounds ?? []) round.byes = round.byes?.map((id) => (ids.has(id) ? alias(id) : id));
    if (cup.plan) cup.plan = cup.plan.map((pairs) => pairs.map((pair) => pair.map((id) => (ids.has(id) ? alias(id) : id)) as [string, string]));
  }
  for (const m of Object.values(book.matches)) m.ids.forEach((id, i) => { if (ids.has(id)) { m.names[i] = REMOVED; m.ids[i] = alias(id); } });
  for (const [code, c] of Object.entries(book.challenges)) {
    const mine = ids.has(c.from.id) || (c.to !== undefined && ids.has(c.to.id));
    if (!mine) continue;
    if (c.status === 'open') { delete book.challenges[code]; continue; }
    for (const side of [c.from, c.to]) if (side && ids.has(side.id)) { side.name = REMOVED; side.id = alias(side.id); side.ok = ''; }
  }
}

// ---- the week ------------------------------------------------------------------------------------------------

export interface Week { week: number; id: string; start: number; entryEnd: number; lifeEntryEnd: number; roundsStart: number; roundsEnd: number; end: number }
/** The Lagos week `lagosWeek` (src/game/clock.ts): it starts Monday 00:00 Lagos time. */
export function weekOf(lagosWeek: number): Week {
  const start = lagosDayStart(lagosWeek * 7 - 3);
  return { week: lagosWeek, id: `w${lagosWeek}`, start, entryEnd: start + ARENA.entryDays * DAY_MS, lifeEntryEnd: start + ARENA.lifeEntryDays * DAY_MS, roundsStart: start + ARENA.entryDays * DAY_MS, roundsEnd: start + ARENA.roundsEndDay * DAY_MS, end: start + ARENA.weekDays * DAY_MS };
}
export const cupId = (week: number, key: string): string => `w${week}-${key}`;
export const CUP_ID = /^w\d{1,6}-[a-z-]{3,16}$/;
export const cupKeys = (): string[] => [...TABLE_CUPS, ...ARENA_CUPS, ...LIFE_CATEGORIES.map((c) => `life-${c}`)];
export const isLifeKey = (key: string): key is `life-${LifeCategory}` => key.startsWith('life-') && (LIFE_CATEGORIES as readonly string[]).includes(key.slice(5));
export const categoryOf = (key: string): LifeCategory | null => (isLifeKey(key) ? key.slice(5) as LifeCategory : null);

// ---- pairing and standings -----------------------------------------------------------------------------------

/** Round robin by the circle method: every entrant plays every other once. The first seat goes to whoever has had it less often than the second, so it is shared out. */
export function roundRobin(ids: readonly string[]): [string, string][][] {
  const list: (string | null)[] = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length, rounds: [string, string][][] = [], first = new Map<string, number>();
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i] ?? null, b = list[n - 1 - i] ?? null;
      if (a === null || b === null) continue;
      // `first` holds first seats minus second seats: the lower takes the first seat; on a tie the round and table decide.
      const fa = first.get(a) ?? 0, fb = first.get(b) ?? 0, lead = fb < fa || (fb === fa && (r + i) % 2 === 1) ? b : a, other = lead === a ? b : a;
      first.set(lead, (first.get(lead) ?? 0) + 1); first.set(other, (first.get(other) ?? 0) - 1);
      pairs.push([lead, other]);
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
/** The first round of a bracket over `ids` in seed order: pairs, and the seeds with no opponent (a bye). */
export function bracketFirstRound(ids: readonly string[]): { pairs: [string, string][]; byes: string[] } {
  const size = 2 ** bracketRounds(ids.length), order = bracketOrder(size), pairs: [string, string][] = [], byes: string[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const a = ids[(order[i] ?? 0) - 1], b = ids[(order[i + 1] ?? 0) - 1];
    if (a && b) pairs.push([a, b]); else if (a ?? b) byes.push((a ?? b) as string);
  }
  return { pairs, byes };
}
/** A round robin table from finished matches: 3 for a win, 1 for a draw; ties go to wins, then to the better seed (earlier in `ids`). */
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
/** What may still be paid to a character this week under the ceiling. */
export function prizeRoom(book: ArenaBook, char: string, week: number): number {
  const so = book.paidWeek[char];
  return Math.max(0, ARENA.weeklyPrizeCeiling - (so && so.week === week ? so.amount : 0));
}
