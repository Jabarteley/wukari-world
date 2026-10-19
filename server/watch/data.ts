/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md)
 * WHAT IS STORED, in one collection of its own:
 *
 *   ctx.collection(db, 'watch') = {
 *     v: 1, seq,
 *     picks:     { [fixtureId]: { [publicId]: MatchPick } }      predictions (a winner, a score): never an amount
 *     results:   { [fixtureId]: StoredResult }                   what an admin typed in, and how many called it
 *     board:     { [season]: { [publicId]: { p, right, exact } } }   points per football season
 *     badges:    { [publicId]: PredictionBadge[] }               "Called it", "Spot on"; the newest PREDICT.badgesKept
 *     house:     { seq, season, past }                          Allworld House: the season running (or the last), earlier seasons in short
 *     votes:     { [seasonId:week]: { [publicId]: mateId } }    one save vote per adult per week; dropped once the week is tallied
 *     artists:   { [publicId]: ArtistRecord }                    applications and the admin's answer
 *     premieres: { [id]: PremiereRecord }
 *   }
 *
 * Keyed (server/keyed.ts): each fixture's picks, each season's board, badges, each week's votes, artists and premieres. Public ids only.
 * Erasure: forgetWatchPlayers (server/admin/erasure-data.ts).
 */
import type { MatchPick, PredictionBadge } from '../../src/watch/predictions.ts';
import type { HouseSeason } from '../../src/watch/house.ts';
import type { ArtistRecord, PremiereRecord } from '../../src/watch/premiere.ts';
import type { Db, RouteContext } from '../types.ts';

export interface StoredResult { home: number; away: number; at: number; title: string; start: number; season: string; right: number; exact: number; picks: number; line?: number }
export interface BoardEntry { p: number; right: number; exact: number }
export interface PastSeason { id: string; number: number; winner?: string; at: number }
export interface WatchCollection {
  v: 1
  seq: number
  picks: Record<string, Record<string, MatchPick>>
  results: Record<string, StoredResult>
  board: Record<string, Record<string, BoardEntry>>
  badges: Record<string, PredictionBadge[]>
  house: { seq: number; season: HouseSeason | null; past: PastSeason[] }
  votes: Record<string, Record<string, string>>
  artists: Record<string, ArtistRecord>
  premieres: Record<string, PremiereRecord>
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const MAPS = ['picks', 'results', 'board', 'badges', 'votes', 'artists', 'premieres'] as const;
export const emptyWatch = (): WatchCollection => ({ v: 1, seq: 0, picks: {}, results: {}, board: {}, badges: {}, house: { seq: 0, season: null, past: [] }, votes: {}, artists: {}, premieres: {} });

/** The collection, made or repaired in place so damaged data cannot crash a route. Inside a transaction. */
export function watchOf(ctx: Pick<RouteContext, 'collection'>, db: Db): WatchCollection {
  const found = ctx.collection(db, 'watch', emptyWatch()) as Partial<WatchCollection>;
  for (const key of MAPS) if (!record(found[key])) (found as Record<string, unknown>)[key] = {};
  if (!record(found.house)) found.house = { seq: 0, season: null, past: [] };
  const house = found.house as Partial<WatchCollection['house']>;
  if (typeof house.seq !== 'number') house.seq = 0;
  if (!record(house.season)) house.season = null;
  if (!Array.isArray(house.past)) house.past = [];
  if (typeof found.seq !== 'number') found.seq = 0;
  found.v = 1;
  return found as WatchCollection;
}
/** What a read sees: nothing is created. */
export function peekWatch(db: Db): WatchCollection {
  const found = (db as unknown as Record<string, unknown>).watch;
  if (!record(found)) return emptyWatch();
  const empty = emptyWatch(), out = { ...empty } as Record<string, unknown>;
  for (const key of MAPS) out[key] = record(found[key]) ? found[key] : {};
  const house = record(found.house) ? found.house : null;
  out.house = { seq: typeof house?.seq === 'number' ? house.seq : 0, season: record(house?.season) ? house.season : null, past: Array.isArray(house?.past) ? house.past : [] };
  out.seq = typeof found.seq === 'number' ? found.seq : 0;
  return out as unknown as WatchCollection;
}

/**
 * ERASURE (server/admin/erasure-data.ts): an erased player's picks, points, badges, votes, application and premieres go. A result's
 * counts (how many called it) stay as numbers with no name; a week already tallied keeps its tally.
 */
export function forgetWatchPlayers(db: Db, ids: readonly string[]): void {
  const found = (db as unknown as Record<string, unknown>).watch;
  if (!record(found) || !ids.length) return;
  const col = found as unknown as Partial<WatchCollection>;
  for (const key of ['picks', 'board', 'votes'] as const) {
    const maps = col[key];
    if (record(maps)) for (const inner of Object.values(maps)) if (record(inner)) for (const id of ids) delete (inner as Record<string, unknown>)[id];
  }
  for (const key of ['badges', 'artists'] as const) { const map = col[key]; if (record(map)) for (const id of ids) delete (map as Record<string, unknown>)[id]; }
  if (record(col.premieres)) for (const [key, item] of Object.entries(col.premieres)) if (!record(item) || ids.includes(String(item.by))) delete col.premieres[key];
}
