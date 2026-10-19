/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * The one small collection the share loops keep, `loops`. Everything else they show is read from records the game already has.
 *
 *   visits  per Lagos week, per city, per host: how many people came into that home (`n`) and short one-way marks of who (`g`, at most
 *           FAME_GUESTS, so one guest counts once a week). Fed by the social service's 'visit-ended' event (server/shareloops/fame.ts).
 *           Kept FAME_WEEKS weeks.
 *   guests  per player, per month ('YYYY-MM'): how many homes they went into as a guest (Wrapped). Kept WRAPPED_MONTHS months.
 *   pages   per city: the last FRONT_DAYS front pages (server/shareloops/frontpage.ts), words only, no ids.
 *   made    the Lagos day and how many front pages were written by a model that day, in all and per city (the daily caps).
 *
 * Passport stamps are not here: they live on the character (SessionRecord.passport), so they follow it and go with it.
 * ERASURE: forgetLoopsPlayers removes a player's own entries and their home from the boards (server/admin/erasure-data.ts).
 */
import type { Db, RouteContext } from '../types.ts';
import type { FrontPageView } from '../../src/types/shareloops.ts';

export const FAME_WEEKS = 3, FAME_GUESTS = 200, WRAPPED_MONTHS = 3, FRONT_DAYS = 3;

export interface HomeTally { n: number; g: string[] }
export interface LoopsCollection {
  v: 1
  visits: Record<string, Record<string, Record<string, HomeTally>>>
  guests: Record<string, Record<string, number>>
  pages: Record<string, FrontPageView[]>
  made: { day: number; n: number; city: Record<string, number> }
}

const fresh = (): LoopsCollection => ({ v: 1, visits: {}, guests: {}, pages: {}, made: { day: 0, n: 0, city: {} } });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The collection, created on first use, with any missing part put back. */
export function loopsOf(ctx: Pick<RouteContext, 'collection'>, db: Db): LoopsCollection {
  const found = (ctx.collection as unknown as (db: Db, name: string, initial: LoopsCollection) => Partial<LoopsCollection>)(db, 'loops', fresh());
  if (!record(found.visits)) found.visits = {};
  if (!record(found.guests)) found.guests = {};
  if (!record(found.pages)) found.pages = {};
  if (!record(found.made)) found.made = { day: 0, n: 0, city: {} };
  return found as LoopsCollection;
}
/** The collection as stored, or null (reads never create it). */
export function peekLoops(db: Db): LoopsCollection | null {
  const found = (db as Record<string, unknown>)['loops'];
  return record(found) ? (found as unknown as LoopsCollection) : null;
}

/** Erasure: the players' own months, and their homes on every board. Guest marks are one-way and are dropped with the home they are on. */
export function forgetLoopsPlayers(db: Db, ids: ReadonlySet<string> | readonly string[]): void {
  const loops = peekLoops(db), gone = new Set(ids);
  if (!loops) return;
  for (const id of gone) delete loops.guests?.[id];
  for (const cities of Object.values(loops.visits ?? {})) for (const homes of Object.values(cities ?? {})) for (const id of gone) delete homes?.[id];
}
