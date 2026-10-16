/**
 * OWNER: world
 * THE WEEKLY CITY EPISODE (docs/EPISODES.md): one city's Lagos week (Monday to Sunday) as a short recap, built only from facts that are
 * already public: the city's gist lines (server/gist/ledger.ts, which already names no minor and shows no amount), the city league's
 * standing for that week, and the latest holder of the city's top office on the public record. Nothing is stored for it: a week is built
 * when it is asked for, from what the ledger still holds (it keeps 14 days) and the league (8 weeks).
 * `buildEpisode` is pure; `readEpisode` gathers its input from the database. Portable: no Node imports.
 */
import { lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts';
import { rankCities } from '../../src/clans/league.ts';
import { peekClans } from '../clans/data.ts';
import { page, peekRecords } from '../records/store.ts';
import type { EpisodeLeague, EpisodeLine, EpisodeView } from '../../src/types/world.ts';
import type { Db, RouteContext } from '../types.ts';
import { isAiCharacter, peekGist } from './ledger.ts';
import type { GistItem } from './ledger.ts';

export const EPISODE_LINES = 5, EPISODE_WEEKS = 8, QUIET_BELOW = 2;
const DAY_MS = 86400000, WEEK_MS = 7 * DAY_MS;

/** The league's line ("Lagos took the week in all the games."): the winner of a past week, told by the gist in the week after. */
const isLeagueLine = (item: Pick<GistItem, 'kind' | 'text'>): boolean => item.kind === 'other' && /\btook the week\b/.test(item.text);
/** Bigger things first. A line's class is its kind, except the league winner's line, which is `league`. */
export const CLASS_ORDER = ['election', 'removal', 'law', 'business', 'league', 'event', 'party', 'jail', 'notice', 'owner', 'other', 'busy'] as const;
const classOf = (item: Pick<GistItem, 'kind' | 'text'>): string => (isLeagueLine(item) ? 'league' : item.kind);

/** The Monday of a Lagos week as `2026-10-12`, and back (null unless the text is exactly a Monday). */
export const weekName = (week: number): string => new Date((week * 7 - 3) * DAY_MS).toISOString().slice(0, 10);
export function weekOfName(name: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) return null;
  const day = Date.parse(`${name}T00:00:00Z`) / DAY_MS;
  if (!Number.isSafeInteger(day)) return null;
  const week = Math.floor((day + 3) / 7);
  return week * 7 - 3 === day ? week : null;
}
export const weekStart = (week: number): number => lagosDayStart(week * 7 - 3);
/** Whether a week is the current one or one of the last EPISODE_WEEKS before it. */
export const weekKept = (week: number, now: number): boolean => { const current = lagosTime(now).week; return week <= current && week > current - EPISODE_WEEKS; };

export interface EpisodeInput {
  city: string
  cityName: string
  week: number
  now: number
  /** The city's own gist lines (any week); the builder keeps those inside the week. */
  items: readonly Pick<GistItem, 'at' | 'kind' | 'text' | 'refs'>[]
  /** This week's city scores in all the games (`[score, players]`), and the winner once the week was settled. */
  league: { cities: Record<string, readonly [number, number]>; won: string | null; names: Record<string, string> } | null
  office: { title: string; name: string; ai?: boolean } | null
}

/** The at most five lines: one of each class, biggest classes first, and only when short of lines a second of a class. */
export function pickLines(items: readonly Pick<GistItem, 'at' | 'kind' | 'text' | 'refs'>[], max = EPISODE_LINES): EpisodeLine[] {
  const rank = (item: Pick<GistItem, 'kind' | 'text'>): number => { const at = CLASS_ORDER.indexOf(classOf(item) as (typeof CLASS_ORDER)[number]); return at < 0 ? CLASS_ORDER.length : at; };
  const seen = new Set<string>(), sorted = [...items].sort((a, b) => rank(a) - rank(b) || b.at - a.at).filter((item) => { const key = item.text.toLowerCase(); return seen.has(key) ? false : (seen.add(key), true); });
  const chosen: typeof sorted = [], classes = new Set<string>();
  for (const item of sorted) if (chosen.length < max && !classes.has(classOf(item))) { classes.add(classOf(item)); chosen.push(item); }
  for (const item of sorted) if (chosen.length < max && !chosen.includes(item)) chosen.push(item);
  return chosen.sort((a, b) => rank(a) - rank(b) || b.at - a.at).map((item) => ({ text: item.text, kind: classOf(item), at: item.at, ...(item.refs?.ai === 1 ? { ai: true as const } : {}) }));
}

export function buildEpisode(input: EpisodeInput): EpisodeView {
  const from = weekStart(input.week), to = from + WEEK_MS, current = input.now >= from && input.now < to;
  const inWeek = input.items.filter((item) => item.at >= from && item.at < to);
  const lines = pickLines(inWeek);
  const stalls = inWeek.filter((item) => item.kind === 'business').length;
  let league: EpisodeLeague | null = null;
  const cities = input.league?.cities;
  if (input.league && cities) {
    const ranked = rankCities(Object.entries(cities).map(([id, [score, players]]) => ({ id, score, players }))).filter((row) => row.score > 0);
    const at = ranked.findIndex((row) => row.id === input.city);
    const leaderId = input.league.won ?? ranked[0]?.id ?? null;
    if (at >= 0) league = { rank: at + 1, of: ranked.length, final: !current && input.league.won !== null, leader: leaderId ? { id: leaderId, name: input.league.names[leaderId] ?? leaderId } : null };
  }
  const quiet = lines.length < QUIET_BELOW;
  const headline = quiet ? `A quiet week in ${input.cityName}` : `This week in ${input.cityName}`;
  const top = lines[0];
  const description = top ? (quiet ? `A quiet week in ${input.cityName}. ${top.text}${/[.!?]$/.test(top.text) ? '' : '.'}` : `${top.text}${/[.!?]$/.test(top.text) ? '' : '.'}${lines.length > 1 ? ` And ${lines.length - 1} more from ${input.cityName} this week.` : ''}`)
    : `A quiet week in ${input.cityName}: nothing to report yet. Be the one who starts something.`;
  return {
    city: input.city, cityName: input.cityName, week: weekName(input.week), from, to, current, quiet, headline, description, lines, league,
    office: input.office ? { title: input.office.title, name: input.office.name, ...(input.office.ai ? { ai: true as const } : {}) } : null,
    stalls,
  };
}

/** A city's name from the catalogue every host loads at start, else from its loaded rules, else its id. */
export const nameOf = (id: string): string => { try { return cityCatalogueEntry(id)?.name ?? cityRules(id)?.name ?? id; } catch { return cityRules(id)?.name ?? id; } };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Gather the facts for one city and week from a read of the database. Reads only. */
export function readEpisode(ctx: Pick<RouteContext, 'now' | 'checks'>, db: Db, city: string, week: number): EpisodeView {
  const cityName = nameOf(city);
  const items = peekGist(db).cities[city] ?? [];
  const lw = peekClans(db)?.league?.[`w${week}`];
  const names: Record<string, string> = {};
  for (const id of Object.keys(lw?.cities ?? {})) names[id] = nameOf(id);
  const league = lw?.cities ? { cities: Object.fromEntries(Object.entries(lw.cities).flatMap(([id, m]) => (m?.all ? [[id, m.all as readonly [number, number]] as const] : []))), won: lw.won?.all ?? null, names } : null;
  return buildEpisode({ city, cityName, week, now: ctx.now(), items, league, office: officeOf(ctx, db, city, weekStart(week) + WEEK_MS) });
}

/** The latest person who won the city's top seat and is still named: from the public record, an adult who has not hidden themselves. */
function officeOf(ctx: Pick<RouteContext, 'checks'>, db: Db, city: string, before: number): EpisodeInput['office'] {
  const found = page(peekRecords(db), { limit: 8, scope: `city:${city}`, kind: 'term' }).entries.find((entry) => entry.at < before && entry.facts.void === false && entry.facts.removed !== true && typeof entry.facts.winner === 'string' && typeof entry.facts.winnerId === 'string');
  if (!found) return null;
  const id = String(found.facts.winnerId), name = String(found.facts.winner);
  const civic = (db as unknown as Record<string, unknown>).civic, prefs = record(civic) && record(civic.prefs) ? civic.prefs[id] : null;
  if (record(prefs) && prefs.directory === true) return null;
  if (ctx.checks?.adult?.(db, id) !== true) return null;
  const office = found.title.split(` ${name}`)[0] ?? '';
  return { title: /^[A-Za-z ]{3,24}$/.test(office) ? office : 'Leader', name: name.slice(0, 24), ai: isAiCharacter(db, id) };
}
