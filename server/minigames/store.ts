/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * WHAT THE MINI-GAMES KEEP, in one small collection `minigames` (a person's rows only; nothing here is public):
 *   haggle[player]   = { traders: { [traderKey]: TraderRow }, best: BestRow | null }          what each trader remembers of the person, and the best haggle
 *   days[player]     = { day, buys, rephrased, earned }                                        the Lagos day's counters (purchases, model rephrases, season pay)
 *   nysc[player]     = NyscRow                                                                  the camp, from joining to passing out
 *   jamb[player]     = JambRow                                                                  the revision season
 *   skits[player]    = { day, checks }                                                          caption checks today (a limit, nothing more)
 *   model            = { day, used }                                                            the whole server's model rephrases today
 * All of it is repaired in place on read so damaged data cannot crash a route, bounded in size, and forgotten with the person (forgetMinigamesPlayers).
 */
import type { HaggleGrade, HaggleLine } from '../../src/types/minigames.ts';
import type { Db, RouteContext } from '../types.ts';

export const TRADERS_KEPT = 12, LINES_KEPT = 10, TALKS_KEPT = 6;

export type StoredLine = HaggleLine & { k?: string };
export interface TalkRow {
  /** The Lagos day the talk began; a talk of another day is begun again. */
  day: number
  ask: number; rounds: number; deal: number | null; dealAt: number
  bought: boolean
  /** What was said, newest last (at most LINES_KEPT). `k` is the kind of a trader's verdict line (accept, counter, refuse, final), kept so a rephrase can be held to it. */
  lines: StoredLine[]
  grade?: HaggleGrade
}
export interface TraderRow {
  visits: number; deals: number
  /** The Lagos day of the latest deal, and the deals that day. */
  dealDay: number; dealsToday: number
  /** The Lagos day of the latest visit, for pruning. */
  seen: number
  /** The latest item bought here and the price. */
  last?: { item: string; price: number; at: number }
  talks: Record<string, TalkRow>
}
export interface BestRow { trader: string; stall: string; city: string; item: string; list: number; price: number; saved: number; grade: HaggleGrade; at: number; lines: HaggleLine[] }
export interface HaggleRow { traders: Record<string, TraderRow>; best: BestRow | null }
export interface DayRow { day: number; buys: number; rephrased: number; earned: number }

export interface NyscRow {
  batch: string; city: string; joinedDay: number; camp: string; state: string; platoon: number
  /** Duty ids done, with the points each earned, and the day done. */
  duties: Record<string, { points: number; option: string; day: number }>
  dutyDay: number
  earned: number
  passedOut: { day: number; honour: string; posting: string } | null
}
export interface JambRow {
  year: string; city: string; joinedDay: number; seed: string
  /** Question ids answered at any time (bounded by the bank), so a question comes again only after the bank is used. */
  seen: number[]
  /** Today's set: the question ids and the answers given. */
  today: { day: number; ids: number[]; answered: Record<string, { choice: number; correct: boolean }> } | null
  days: number[]
  correct: number; answered: number
  mock: { startedAt: number; ids: number[]; result: { correct: number; total: number; score: number; bySubject: Record<string, { correct: number; total: number }>; paid: number } | null } | null
  earned: number
  streak: number; lastDay: number
}
export interface MiniGamesCollection {
  v: 1
  haggle: Record<string, HaggleRow>
  days: Record<string, DayRow>
  nysc: Record<string, NyscRow>
  jamb: Record<string, JambRow>
  skits: Record<string, { day: number; checks: number }>
  model: { day: number; used: number }
}

export const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const empty = (): MiniGamesCollection => ({ v: 1, haggle: {}, days: {}, nysc: {}, jamb: {}, skits: {}, model: { day: 0, used: 0 } });

/** The collection, repaired in place. */
export function minigamesOf(ctx: Pick<RouteContext, 'collection'>, db: Db): MiniGamesCollection {
  const found = ctx.collection(db, 'minigames', empty()) as Partial<MiniGamesCollection>;
  for (const key of ['haggle', 'days', 'nysc', 'jamb', 'skits'] as const) if (!record(found[key])) (found as Record<string, unknown>)[key] = {};
  if (!record(found.model)) found.model = { day: 0, used: 0 };
  found.v = 1;
  return found as MiniGamesCollection;
}
/** What a read sees: nothing is created. */
export function peekMinigames(db: Db): MiniGamesCollection | null {
  const found = (db as unknown as Record<string, unknown>).minigames;
  return record(found) && record(found.haggle) ? found as unknown as MiniGamesCollection : null;
}

/** Permanent erasure (server/admin/erasure-data.ts): everything the mini-games keep about these people. */
export function forgetMinigamesPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekMinigames(db);
  if (!c) return;
  for (const id of ids) { delete c.haggle[id]; delete c.days[id]; delete c.nysc[id]; delete c.jamb[id]; delete c.skits[id]; }
}
