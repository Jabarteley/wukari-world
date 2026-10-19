/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * STREET FAME: each Lagos week, per city, the homes the most people came into and the communities whose posts got the most reactions, with a
 * badge for the top three homes of last week and a card the player draws on the device.
 *
 *   noteVisit   the social service's 'visit-ended' event (server/social/service.ts deliver): the host's home gets one visitor for the week, a
 *               guest counts once a week per home (a one-way mark of guest, home and week, never the guest's id), and the guest's month
 *               gets one home (Wrapped). Bounded: FAME_GUESTS marks per home, FAME_WEEKS weeks kept.
 *   fameView    the board of one city and week: homes by visitors, communities by the reactions their posts got that week (read from the
 *               feed: posts of the community, made in the week, not removed), at most FAME_TOP of each. A person is named only when they
 *               are a confirmed adult who has not hidden themselves from the directory (the gist's own rule); a home whose owner is not is
 *               left off the board. Communities that were banned are left out.
 */
import { lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { cityName } from '../../src/game/cities/registry.ts';
import { peekFeed } from '../feed/data.ts';
import { FAME_GUESTS, FAME_WEEKS, WRAPPED_MONTHS, peekLoops } from './store.ts';
import { monthOf } from './wrapped.ts';
import type { LoopsCollection } from './store.ts';
import type { FameCommunity, FameHome, FameView } from '../../src/types/shareloops.ts';
import type { Db } from '../types.ts';

export const FAME_TOP = 5, BADGE_TOP = 3;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The Monday of a Lagos week, 'YYYY-MM-DD'. */
export const weekName = (week: number): string => new Date(lagosDayStart(week * 7 - 3) + 3600000).toISOString().slice(0, 10);

/** One visit that ended. Synchronous and pure over the collection; the caller runs it in a transaction. */
export function noteVisit(loops: LoopsCollection, hostId: string, guestId: string, city: string, now: number): boolean {
  if (!hostId || !guestId || hostId === guestId || !/^[a-z0-9-]{1,40}$/.test(city)) return false;
  const week = String(lagosTime(now).week), month = monthOf(now);
  // The guest's month (Wrapped), whatever the home's board says.
  const months = loops.guests[guestId] ??= {};
  months[month] = (months[month] ?? 0) + 1;
  for (const old of Object.keys(months).sort().slice(0, -WRAPPED_MONTHS)) delete months[old];
  for (const old of Object.keys(loops.visits).map(Number).filter((w) => w <= Number(week) - FAME_WEEKS)) delete loops.visits[String(old)];
  const homes = ((loops.visits[week] ??= {})[city] ??= {}), home = homes[hostId] ??= { n: 0, g: [] };
  const mark = sha256Hex(`${guestId}|${hostId}|${week}`).slice(0, 12);
  if (home.g.includes(mark)) return false;
  if (home.g.length >= FAME_GUESTS) return false;
  home.g.push(mark);
  home.n += 1;
  return true;
}

export interface FameChecks {
  /** A confirmed adult (ctx.checks.adult). */
  adult(id: string): boolean
  /** The player's shown name, or ''. */
  name(id: string): string
}
const hiddenFromDirectory = (db: Db, id: string): boolean => {
  const civic = (db as Record<string, unknown>)['civic'];
  const prefs = record(civic) && record(civic.prefs) ? civic.prefs[id] : null;
  return record(prefs) && prefs.directory === true;
};

export function fameView(db: Db, city: string, week: number, viewer: string | null, checks: FameChecks): FameView {
  const loops = peekLoops(db);
  const homes: FameHome[] = [];
  const board = Object.entries(loops?.visits?.[String(week)]?.[city] ?? {}).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
  for (const [id, tally] of board) {
    if (homes.length >= FAME_TOP) break;
    if (!checks.adult(id) || hiddenFromDirectory(db, id)) continue;
    const name = checks.name(id).slice(0, 24);
    if (!name) continue;
    homes.push({ rank: homes.length + 1, name, visitors: tally.n, ...(id === viewer ? { mine: true as const } : {}) });
  }
  const start = lagosDayStart(week * 7 - 3), end = start + 7 * 86400000;
  const feed = peekFeed(db), tally = new Map<string, number>();
  for (const postId of feed?.cities?.[city]?.posts ?? []) {
    const post = feed?.posts?.[postId];
    if (!post?.crew || post.gone || post.hidden || post.at < start || post.at >= end) continue;
    tally.set(post.crew, (tally.get(post.crew) ?? 0) + Object.keys(post.rx ?? {}).length);
  }
  const communities: FameCommunity[] = [];
  for (const [id, reactions] of [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    const crew = feed?.crews?.[id];
    if (communities.length >= FAME_TOP || reactions <= 0) break;
    if (!crew || crew.banned || !crew.kind) continue;
    communities.push({ rank: communities.length + 1, id, name: crew.name.slice(0, 32), reactions });
  }
  return { city, week, name: weekName(week), homes, communities, badge: viewer ? badgeOf(db, viewer, week - 1, checks) : null };
}

/** The badge a player holds this week: their home was in the top BADGE_TOP of their city last week. */
export function badgeOf(db: Db, id: string, lastWeek: number, checks: Pick<FameChecks, 'adult'>): FameView['badge'] {
  const loops = peekLoops(db);
  if (!checks.adult(id)) return null;
  for (const [city, homes] of Object.entries(loops?.visits?.[String(lastWeek)] ?? {})) {
    const order = Object.entries(homes).filter(([host]) => checks.adult(host) && !hiddenFromDirectory(db, host)).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
    const at = order.findIndex(([host]) => host === id);
    if (at >= 0 && at < BADGE_TOP) return { rank: at + 1, city, cityName: cityName(city) ?? city, week: weekName(lastWeek) };
  }
  return null;
}
