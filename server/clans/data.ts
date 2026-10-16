/**
 * OWNER: games
 * THE STORED SHAPE of clans, ladders and leagues: the collection `clans` (docs/CLANS.md, "Stored data"). Created by the first clan or the
 * first counted result, so nothing existing changes. Kept one entry at a time (server/keyed.ts KEYED_SPECS):
 *   clans[id]       a clan            names[nameKey] -> id      codes[CODE] -> id
 *   players[id]     a player's clan and ladder (small, bounded)
 *   boards[key]     the top 50 of one board (weekly `w<week>:c|k|g|h:<id>:<game|all>`, seasonal `s<season>:...`) and `o:<week>` (open cohorts)
 *   league[w<week>] a week's city and country scores        wars[p<week>] the week's waiting pool
 *   meta (root)     { season: { n, start, days }, settled, swept }
 * Everything is optional on read: a missing field is repaired where it is read.
 */
import type { Db, RouteContext } from '../types.ts';
import type { Outcome } from '../../src/clans/war.ts';

export interface ClanRecord {
  id: string; name: string; colour: string; city: string; code: string; at: number
  leader: string; deputies: string[]; members: string[]
  /** The clan room: a group conversation (social.convs) the clan owns. */
  room: string
  rating: number
  kicked?: Record<string, number>
  /** This week's war: points added while a member (by player), the opponent once matched. */
  wk?: { n: number; s: Record<string, number>; vs?: string; vsName?: string }
  /** The last settled war. `prize`: who may claim it (members with points among the counted 80%). */
  last?: { n: number; vs: string; vsName: string; mine: number; theirs: number; outcome: Outcome; prize?: { ids: string[]; amount: number } }
}
export interface GameLadder { p: number; hi: number; w: number; l: number; d: number }
export interface PlayerRecord {
  name: string; city: string; ai?: 1; clan?: string; joined?: number
  season: number; g: Record<string, GameLadder>
  day: number; best: Record<string, number[]>; pairs: Record<string, number>
  wk: number; wp: number; wg: Record<string, number>; first?: number; cohort?: string; plays: number
  seen: string[]
  prev?: { season: number; pts: number; game: string }
  prize?: number
}
export type BoardRow = [id: string, name: string, score: number, tier: number]
export interface BoardRecord { n?: number; rows?: BoardRow[]; open?: [key: string, hour: number, size: number][]; pool?: [id: string, size: number, rating: number][] }
export interface LeagueWeek { won?: Record<string, string>; cities: Record<string, Record<string, [score: number, players: number]>>; countries: Record<string, [score: number, players: number]> }
export interface Meta { seq?: number; season: { n: number; start: number; days: number }; settled: number; swept: number }
export interface ClansCollection {
  v: 1; meta: Meta
  clans: Record<string, ClanRecord>; names: Record<string, string>; codes: Record<string, string>
  players: Record<string, PlayerRecord>; boards: Record<string, BoardRecord>; league: Record<string, LeagueWeek>
}

export const clansOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): ClansCollection => {
  const c = ctx.collection(db, 'clans', { v: 1, meta: { season: { n: 0, start: 0, days: 28 }, settled: 0, swept: 0 }, clans: {}, names: {}, codes: {}, players: {}, boards: {}, league: {} }) as unknown as ClansCollection;
  for (const key of ['clans', 'names', 'codes', 'players', 'boards', 'league'] as const) if (!c[key] || typeof c[key] !== 'object') (c as unknown as Record<string, unknown>)[key] = {};
  if (!c.meta || typeof c.meta !== 'object' || !c.meta.season) c.meta = { season: { n: 0, start: 0, days: 28 }, settled: 0, swept: 0 };
  return c;
};
/** A read that never creates the collection. */
export const peekClans = (db: Db): ClansCollection | undefined => (db as Record<string, unknown>)['clans'] as ClansCollection | undefined;
