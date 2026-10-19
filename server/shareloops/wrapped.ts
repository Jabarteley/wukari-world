/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * MONTHLY WRAPPED: one month of a player's life in a few figures, read from records the game already keeps, for the player alone. The card
 * is drawn on the device; nothing here is public.
 *
 *   cities   passport stamps first made in the month (SessionRecord.passport)
 *   homes    homes the player went into as a guest (the share loops' own tally, ./fame.ts)
 *   friends  friendships made in the month (social.players[id].friends: other id → since)
 *   earned   game naira received: positive wallet entries of the month, refunds and loans left out (the wallet journal, server/economy)
 *   votes    elections (city, state or nation) the player voted in whose week began in the month; who they voted for is never read
 *   ai       the AI resident with the closest standing among those seen in the month (house agents' memory), shown with the AI mark;
 *            a rival of the AI-residents phase can take its place later. Null when none.
 *   post     the player's own post of the month with the most reactions (not removed, not hidden)
 *
 * The month is a Lagos calendar month, 'YYYY-MM'. Every figure is bounded in what it reads (the wallet journal at most WALLET_PAGES pages).
 */
import { LAGOS_OFFSET_MS, lagosDayStart } from '../../src/game/clock.ts';
import { walletHistory } from '../economy/history.ts';
import { peekFeed } from '../feed/data.ts';
import { peekMemory } from '../house/memory.ts';
import { agentInfo } from '../house/runner.ts';
import { cityCatalogueEntry } from '../../src/game/cities/index.ts';
import { peekLoops } from './store.ts';
import type { Db, SessionRecord } from '../types.ts';
import type { WrappedView } from '../../src/types/shareloops.ts';

export const WALLET_PAGES = 40;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The Lagos month of a server time, 'YYYY-MM'. */
export function monthOf(ms: number): string {
  const date = new Date(ms + LAGOS_OFFSET_MS);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
/** The server ms a Lagos month starts and ends (end exclusive), or null for a malformed month. */
export function monthSpan(month: string): { start: number; end: number } | null {
  const found = MONTH.exec(month);
  if (!found) return null;
  const year = Number(found[1]), index = Number(found[2]) - 1;
  return { start: Date.UTC(year, index, 1) - LAGOS_OFFSET_MS, end: Date.UTC(year, index + 1, 1) - LAGOS_OFFSET_MS };
}
/** A month the player may ask for: this one or one of the two before it. */
export function monthAllowed(month: string, now: number): boolean {
  const span = monthSpan(month), current = monthSpan(monthOf(now));
  if (!span || !current) return false;
  const back = (current.start - span.start) / 86400000;
  return span.start <= current.start && back <= 62;
}
const within = (at: unknown, span: { start: number; end: number }): boolean => typeof at === 'number' && at >= span.start && at < span.end;

/** Wallet entries that are not income: money coming back or borrowed. */
const NOT_EARNED = /^(refund|loan|returned|reversal|undo)/i;
export function earnedIn(db: Db, publicId: string, span: { start: number; end: number }): number {
  let after = 0, total = 0;
  for (let page = 0; page < WALLET_PAGES; page++) {
    const read = walletHistory(db, publicId, after);
    for (const entry of read.entries) if (within(entry.at, span) && entry.amount > 0 && !NOT_EARNED.test(entry.reason)) total += entry.amount;
    if (read.next === null || (read.entries.at(-1)?.at ?? 0) >= span.end) break;
    after = read.next;
  }
  return total;
}

/** Elections the player voted in whose week's Monday falls in the month. Who they voted for is never looked at. */
export function votesIn(db: Db, publicId: string, span: { start: number; end: number }): number {
  let n = 0;
  const count = (elections: unknown): void => {
    if (!record(elections)) return;
    for (const [week, election] of Object.entries(elections)) {
      const monday = lagosDayStart(Number(week) * 7 - 3);
      if (within(monday, span) && record(election) && record(election.votes) && Object.hasOwn(election.votes, publicId)) n += 1;
    }
  };
  const civic = (db as Record<string, unknown>)['civic'], politics = (db as Record<string, unknown>)['politics'];
  if (record(civic) && record(civic.cities)) for (const city of Object.values(civic.cities)) if (record(city) && record(city.gov)) count(city.gov.elections);
  if (record(politics) && record(politics.scopes)) for (const scope of Object.values(politics.scopes)) if (record(scope) && record(scope.gov)) count(scope.gov.elections);
  return n;
}

export function wrappedOf(db: Db, session: Pick<SessionRecord, 'publicId' | 'passport'>, month: string, now: number): WrappedView | null {
  const span = monthSpan(month);
  if (!span) return null;
  const id = session.publicId;
  const cities: string[] = [];
  for (const [city, at] of Object.entries(session.passport ?? {})) {
    if (!within(at, span)) continue;
    let name = city;
    try { name = cityCatalogueEntry(city)?.name ?? city; } catch { /* the id is shown */ }
    cities.push(name);
  }
  const homes = peekLoops(db)?.guests?.[id]?.[month] ?? 0;
  const social = (db as Record<string, unknown>)['social'];
  const me = record(social) && record(social.players) ? social.players[id] : null;
  const friends = record(me) && record(me.friends) ? Object.values(me.friends).filter((since) => within(since, span)).length : 0;
  let ai: WrappedView['ai'] = null, best = -1;
  const person = peekMemory(db)?.people?.[id];
  if (record(person) && record(person.a)) for (const [agent, bond] of Object.entries(person.a)) {
    if (!record(bond) || !within(bond.at, span) || typeof bond.p !== 'number' || bond.p <= best) continue;
    const who = agentInfo(agent);
    if (who) { best = bond.p; ai = { name: who.name.slice(0, 24) }; }
  }
  let post: WrappedView['post'] = null;
  const feed = peekFeed(db), mine = feed?.authors?.[id]?.posts ?? [];
  for (const postId of mine) {
    const found = feed?.posts?.[postId];
    if (!found || found.by !== id || found.gone || found.hidden || !within(found.at, span)) continue;
    const reactions = Object.keys(found.rx ?? {}).length;
    if (reactions > 0 && reactions > (post?.reactions ?? 0)) post = { id: found.id, body: found.body.slice(0, 120), reactions };
  }
  return { month, partial: now < span.end, cities, homes, friends, earned: earnedIn(db, id, span), votes: votesIn(db, id, span), ai, post };
}

