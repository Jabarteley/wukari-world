/**
 * OWNER: growth
 * MATCH NIGHTS: watch parties at the times of real football fixtures. SCHEDULE ONLY: the game shows a title and a time, never a
 * broadcast, a stream, a score or a result (no rights to any of them). A fixture is "Team A v Team B, Saturday 8pm" and nothing more.
 *
 * Two sources, both plain data:
 *   - WEEKLY: a generic slot every week ("Match night", Saturday 20:00 to 22:00 local). It ships with the game and needs no dates.
 *   - FIXTURES: a list an admin edits without a release (server/admin/festivals.ts). It ships EMPTY: dates of real fixtures are not
 *     guessed here. Each fixture has a title, a start time, a length and optionally the countries it is shown in.
 * A match night makes the city's viewing centre (the venue whose scene is 'viewing') show "Match night" in the Events app and
 * fills it with more people (`crowdLift`, read by the background crowd). Pure; no I/O.
 */
import { countryKey, localAt, localDay } from './calendar.ts';

export interface Fixture { id: string; title: string; /** Server ms. */ start: number; /** Minutes. */ minutes: number; /** Lower-case country codes; empty = every country. */ countries: readonly string[] }
export const FIXTURE_LIMITS = Object.freeze({ keep: 200, title: 60, minMinutes: 30, maxMinutes: 300, pastMs: 86400000, aheadMs: 400 * 86400000 });
/** The generic weekly slot: weekday 0 = Sunday, local hours. */
export const WEEKLY = Object.freeze({ weekday: 6, from: 20, to: 22, title: 'Match night', blurb: 'Watch the game with the crowd at the viewing centre. Bring your friends.' });
/** How much fuller a viewing centre is during a match night (added to its crowd level, 0 to 1). */
export const MATCH_LIFT = 0.45;

export interface MatchNight { key: string; title: string; blurb: string; start: number; end: number; live: boolean; weekly: boolean }

/** Words that would turn a schedule line into a stream link or a score. */
const BANNED = /https?:|www\.|\.(com|net|org|tv|io)\b|\bstream|\bscore\b|\blive ?stream|\bfree ?tv/i;
const CONTROL = /[\u0000-\u001f\u007f<>]/;
const ID = /^[a-z0-9][a-z0-9-]{2,39}$/;

/** A fixture from an admin's input, or the reason it is refused. `now` null skips the time-window check (for repairing the stored list). */
export function cleanFixture(input: unknown, now: number | null): { ok: true; fixture: Fixture } | { ok: false; reason: string } {
  const body = (input !== null && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim() : '';
  if (!ID.test(id)) return { ok: false, reason: 'The id is 3 to 40 letters, numbers or dashes.' };
  if (title.length < 3 || title.length > FIXTURE_LIMITS.title || CONTROL.test(title)) return { ok: false, reason: `The title is 3 to ${FIXTURE_LIMITS.title} plain characters.` };
  if (BANNED.test(title)) return { ok: false, reason: 'A fixture is a title and a time only: no links, streams or scores.' };
  const start = body.start;
  if (typeof start !== 'number' || !Number.isSafeInteger(start) || (now !== null && (start < now - FIXTURE_LIMITS.pastMs || start > now + FIXTURE_LIMITS.aheadMs))) return { ok: false, reason: 'The start time must be within the next year.' };
  const minutes = body.minutes === undefined ? 120 : body.minutes;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < FIXTURE_LIMITS.minMinutes || minutes > FIXTURE_LIMITS.maxMinutes) return { ok: false, reason: `The length is ${FIXTURE_LIMITS.minMinutes} to ${FIXTURE_LIMITS.maxMinutes} minutes.` };
  const list = body.countries === undefined ? [] : body.countries;
  if (!Array.isArray(list) || list.length > 8 || list.some((item) => typeof item !== 'string' || !/^[a-z]{2}$/.test(item.toLowerCase()))) return { ok: false, reason: 'Countries are two-letter codes.' };
  return { ok: true, fixture: { id, title, start, minutes, countries: [...new Set((list as string[]).map((item) => item.toLowerCase()))] } };
}
/** The stored list, repaired: only well-formed fixtures, at most FIXTURE_LIMITS.keep. */
export function fixtureList(value: unknown, now: number): Fixture[] {
  if (!Array.isArray(value)) return [];
  const out: Fixture[] = [];
  for (const item of value) { const done = cleanFixture(item, null); if (done.ok && !out.some((x) => x.id === done.fixture.id)) out.push(done.fixture); }
  return out.slice(0, FIXTURE_LIMITS.keep).filter((item) => item.start + item.minutes * 60000 > now - FIXTURE_LIMITS.pastMs * 7);
}

/** Match nights overlapping [from, to) in `country`, soonest first: the fixtures that country is shown, then the weekly slots. */
export function matchNights(from: number, to: number, country: string, fixtures: readonly Fixture[] = []): MatchNight[] {
  const key = countryKey(country), out: MatchNight[] = [];
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return out;
  for (const fixture of fixtures) {
    const end = fixture.start + fixture.minutes * 60000;
    if (fixture.countries.length && !fixture.countries.includes(key)) continue;
    if (end > from && fixture.start < to) out.push({ key: `match:${fixture.id}`, title: fixture.title, blurb: 'Match night at the viewing centre. A schedule only: watch where you usually watch.', start: fixture.start, end, live: from >= fixture.start && from < end, weekly: false });
  }
  for (let day = localDay(from, key) - 1; day <= localDay(to - 1, key); day++) {
    if (((day + 4) % 7 + 7) % 7 !== WEEKLY.weekday) continue;
    const start = localAt(day, WEEKLY.from, key), end = localAt(day, WEEKLY.to, key);
    if (end > from && start < to) out.push({ key: `match:weekly:${day}`, title: WEEKLY.title, blurb: WEEKLY.blurb, start, end, live: from >= start && from < end, weekly: true });
  }
  return out.sort((a, b) => a.start - b.start || a.key.localeCompare(b.key));
}
/** Is a match night on at `now`? */
export const matchNightAt = (now: number, country: string, fixtures: readonly Fixture[] = []): MatchNight | null => matchNights(now, now + 1, country, fixtures).find((item) => item.live) ?? null;
/** The crowd lift a viewing centre gets at `now` (0 when no match night). */
export const crowdLift = (now: number, country: string, fixtures: readonly Fixture[] = []): number => (matchNightAt(now, country, fixtures) ? MATCH_LIFT : 0);
