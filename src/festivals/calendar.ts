/**
 * OWNER: growth
 * THE FESTIVAL CALENDAR: multi-day festivals per country, as pure functions of a server time. No I/O, no clock of its own, no DOM,
 * and deliberately NOT under src/game/ (vite.config.ts sends everything there to the first download): the server, the Events app
 * and the venue scenes read it, and the last two load it on demand (src/festivals/client.ts).
 *
 * A FESTIVAL runs for several days (never fewer than three, so every time zone sees it) in each country it names ('*' = every
 * country). One day of it is the FOCAL day (the holiday itself). While it runs:
 *   - the city's gathering venue (the one a new player arrives in) is dressed in the festival's colours (dressingFor),
 *   - the Events app shows a notice line and the festival's MAIN EVENT at a set local time (mainOccurrences). A festival whose
 *     `main.daily` is true (Ramadan evenings, the December season) holds it on every day of the run, the others on the focal day.
 *   - HOOK for Phase 10: `main.host` is null today; when house agents exist, an agent id here hosts the event.
 * FAITHS ARE TREATED ALIKE: every Christian and Muslim festival is global, has the same shape (a window, a focal day, one main
 * event) and the same words ("<name> at the Square"); nothing here ranks one above another. Which festival dresses the Square on a
 * day when two overlap is decided only by distance from each one's focal day, then by id.
 *
 * DATES come from this table, not a live call (no request is made; DESIGN.md names date.nager.at as a possible later source):
 *   - fixed dates are the national holidays as the governments set them;
 *   - Easter is computed (the Western church's rule, Meeus/Jones/Butcher);
 *   - the lunar dates (Ramadan, Eid al-Fitr, Eid al-Adha) are the tabulated Umm al-Qura calendar of Saudi Arabia, 2026 to 2028.
 *     The real day depends on the moon being sighted and can be a day either side in a country, which is why every window
 *     reaches at least a day before and after the focal day. Past 2028 the table has no row, so the festival is simply not
 *     shown until a row is added (here, or by an admin: server/admin/festivals.ts) - never guessed.
 *   - Homowo (Ga people of Accra) has no fixed date: the traditional council sets it in late August; the window below is the
 *     usual season and an admin can replace it with the announced days.
 * An ADMIN may add or replace a festival, or hide one, without a release (a custom festival with the id of a built-in one replaces it).
 */

/** Hours are local to the festival's country. */
export interface MainEvent { from: number; to: number; /** Every day of the run, not only the focal day. */ daily?: boolean; /** The words after the festival's name. */ what: string; /** Phase 10: the house agent that hosts it. Null today. */ host: string | null }
export type Rule =
  | { kind: 'fixed'; month: number; day: number; before: number; after: number }
  | { kind: 'range'; from: readonly [month: number, day: number]; to: readonly [month: number, day: number]; focal: readonly [month: number, day: number] }
  | { kind: 'easter' }
  | { kind: 'table'; years: Readonly<Record<number, readonly [start: string, end: string, focal: string]>> }
  | { kind: 'dates'; start: string; end: string; focal: string }
export interface FestivalDef { id: string; name: string; blurb: string; countries: readonly string[]; rule: Rule; colours: readonly [string, string]; main: MainEvent }
export interface Span { start: number; end: number; focal: number }
export interface ActiveFestival { id: string; name: string; blurb: string; colours: readonly [string, string]; main: MainEvent; span: Span; /** 1-based day of the run. */ dayOf: number; days: number; focalToday: boolean; countries: readonly string[] }
/** What an admin has changed: festivals added or replaced, ids hidden. */
export interface FestivalExtras { festivals?: readonly FestivalDef[]; hidden?: readonly string[] }

const DAY = 86400000, HOUR = 3600000;
/** Whole days since 1970-01-01 of a calendar date. */
export const dayNo = (year: number, month: number, day: number): number => Math.floor(Date.UTC(year, month - 1, day) / DAY);
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** The day number of 'YYYY-MM-DD', or null when it is not a real date. */
export function dayOfIso(text: unknown): number | null {
  const match = DATE.exec(String(text ?? ''));
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])), back = new Date(ms);
  return back.getUTCMonth() === Number(match[2]) - 1 && back.getUTCDate() === Number(match[3]) ? Math.floor(ms / DAY) : null;
}
export const isoOfDay = (day: number): string => new Date(day * DAY).toISOString().slice(0, 10);

/** Hours ahead of UTC of the countries the festivals name (none of them keeps summer time). Anywhere else: Lagos, the game's own clock. */
export const UTC_OFFSET: Readonly<Record<string, number>> = Object.freeze({ ng: 1, gh: 0, ke: 3, za: 2 });
export const COUNTRIES = Object.freeze(Object.keys(UTC_OFFSET));
/** A country as the calendar keys it: lower-case ISO code; 'nigeria' and the like (the older city rules) are mapped. */
export function countryKey(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase();
  const names: Record<string, string> = { nigeria: 'ng', ghana: 'gh', kenya: 'ke', 'south africa': 'za' };
  return names[text] ?? text;
}
const offsetOf = (country: string): number => UTC_OFFSET[country] ?? 1;
/** The local calendar day number at server time `now` in `country`. */
export const localDay = (now: number, country: string): number => Math.floor((now + offsetOf(country) * HOUR) / DAY);
/** Server ms of local hour `hour` (0-24) of local day `day` in `country`. */
export const localAt = (day: number, hour: number, country: string): number => day * DAY + hour * HOUR - offsetOf(country) * HOUR;

/** Easter Sunday of a year (Meeus/Jones/Butcher), as a day number. */
export function easterDay(year: number): number {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNo(year, month, day);
}

/** The lunar dates, 2026 to 2028 (Umm al-Qura, Saudi Arabia). [start, end, focal] as local dates. The Eid windows begin a day early and end after the long weekend, for the moon-sighting uncertainty. */
export const LUNAR = Object.freeze({
  // Ramadan 1447 starts 18 Feb 2026 and Eid al-Fitr is 20 Mar; 1448: 8 Feb / 9 Mar 2027; 1449: 28 Jan / 26 Feb 2028.
  ramadan: Object.freeze({ 2026: ['2026-02-18', '2026-03-19', '2026-02-18'], 2027: ['2027-02-08', '2027-03-08', '2027-02-08'], 2028: ['2028-01-28', '2028-02-25', '2028-01-28'] } as Record<number, readonly [string, string, string]>),
  eidFitr: Object.freeze({ 2026: ['2026-03-19', '2026-03-22', '2026-03-20'], 2027: ['2027-03-08', '2027-03-11', '2027-03-09'], 2028: ['2028-02-25', '2028-02-28', '2028-02-26'] } as Record<number, readonly [string, string, string]>),
  // Eid al-Adha is 10 Dhu al-Hijjah: 27 May 2026, 16 May 2027, 5 May 2028.
  eidAdha: Object.freeze({ 2026: ['2026-05-26', '2026-05-29', '2026-05-27'], 2027: ['2027-05-15', '2027-05-18', '2027-05-16'], 2028: ['2028-05-04', '2028-05-07', '2028-05-05'] } as Record<number, readonly [string, string, string]>),
});

const NATIONAL = (id: string, name: string, blurb: string, country: string, month: number, day: number, colours: readonly [string, string]): FestivalDef =>
  ({ id, name, blurb, countries: [country], rule: { kind: 'fixed', month, day, before: 1, after: 1 }, colours, main: { from: 17, to: 20, what: 'at the Square', host: null } });

const ALL = ['*'] as const;
/** Green and gold, red and gold, and so on: two colours per festival, #rrggbb. */
export const FESTIVALS: readonly FestivalDef[] = Object.freeze([
  // Nigeria
  NATIONAL('ng-independence', 'Independence Day', 'Green, white, green. Nigeria turns another year.', 'ng', 10, 1, ['#008751', '#ffffff']),
  NATIONAL('ng-democracy', 'Democracy Day', 'A day for the vote, the town hall and a good long talk.', 'ng', 6, 12, ['#008751', '#f2c14e']),
  { id: 'ng-detty-december', name: 'Detty December', blurb: 'Lagos does not sleep. Beach by day, parties by night, home for the season.', countries: ['ng'], rule: { kind: 'range', from: [12, 15], to: [1, 2], focal: [12, 31] }, colours: ['#e0a43a', '#7b3fa0'], main: { from: 19, to: 23, daily: true, what: 'at the Square', host: null } },
  // Ghana
  NATIONAL('gh-independence', 'Independence Day', 'Red, gold and green, with the Black Star in the sky.', 'gh', 3, 6, ['#ce1126', '#fcd116']),
  NATIONAL('gh-republic', 'Republic Day', 'Ghana remembers becoming a republic.', 'gh', 7, 1, ['#006b3f', '#fcd116']),
  { id: 'gh-homowo', name: 'Homowo', blurb: 'The Ga harvest festival: hooting at hunger, a table for everyone. The days follow the traditional council.', countries: ['gh'], rule: { kind: 'range', from: [8, 22], to: [9, 2], focal: [8, 29] }, colours: ['#ce1126', '#ffffff'], main: { from: 15, to: 19, what: 'at the Square', host: null } },
  // Kenya
  NATIONAL('ke-madaraka', 'Madaraka Day', 'Kenya marks the day it ruled itself.', 'ke', 6, 1, ['#bb0000', '#006600']),
  NATIONAL('ke-mashujaa', 'Mashujaa Day', 'Heroes Day: the people who built the country.', 'ke', 10, 20, ['#006600', '#bb0000']),
  NATIONAL('ke-jamhuri', 'Jamhuri Day', 'Kenya celebrates its republic with the whole year behind it.', 'ke', 12, 12, ['#bb0000', '#000000']),
  // South Africa
  NATIONAL('za-freedom', 'Freedom Day', 'The day South Africa first voted together.', 'za', 4, 27, ['#007749', '#ffb81c']),
  NATIONAL('za-heritage', 'Heritage Day: Braai Day', 'Fire on, music up, every plate welcome.', 'za', 9, 24, ['#e03c31', '#ffb81c']),
  NATIONAL('za-reconciliation', 'Day of Reconciliation', 'A day to listen, forgive and start again.', 'za', 12, 16, ['#002395', '#ffb81c']),
  // Everywhere: the faith festivals have one shape and one set of words (calendar.test.ts checks it).
  { id: 'new-year', name: 'New Year', blurb: 'Count down together and start the year with friends.', countries: ALL, rule: { kind: 'fixed', month: 1, day: 1, before: 1, after: 1 }, colours: ['#f2c14e', '#2b2d42'], main: { from: 22, to: 24, what: 'at the Square', host: null } },
  { id: 'valentines', name: 'Valentine’s week', blurb: 'Flowers, notes and a table for two, or for the whole group.', countries: ALL, rule: { kind: 'range', from: [2, 10], to: [2, 16], focal: [2, 14] }, colours: ['#d6336c', '#fff0f6'], main: { from: 18, to: 21, what: 'at the Square', host: null } },
  { id: 'christmas', name: 'Christmas', blurb: 'Lights up, jollof on, family and friends together.', countries: ALL, rule: { kind: 'fixed', month: 12, day: 25, before: 2, after: 1 }, colours: ['#c1121f', '#2d6a4f'], main: { from: 17, to: 20, what: 'at the Square', host: null } },
  { id: 'easter', name: 'Easter', blurb: 'Good Friday to Easter Monday: a long weekend for the whole family.', countries: ALL, rule: { kind: 'easter' }, colours: ['#7b2cbf', '#ffd166'], main: { from: 17, to: 20, what: 'at the Square', host: null } },
  { id: 'ramadan', name: 'Ramadan evenings', blurb: 'Iftar together every evening of the month.', countries: ALL, rule: { kind: 'table', years: LUNAR.ramadan }, colours: ['#1b4965', '#e9c46a'], main: { from: 18, to: 21, daily: true, what: 'at the Square', host: null } },
  { id: 'eid-fitr', name: 'Eid al-Fitr', blurb: 'The end of Ramadan. Eid Mubarak! New clothes, good food and visits.', countries: ALL, rule: { kind: 'table', years: LUNAR.eidFitr }, colours: ['#1b7f5c', '#e9c46a'], main: { from: 17, to: 20, what: 'at the Square', host: null } },
  { id: 'eid-adha', name: 'Eid al-Adha', blurb: 'The festival of sacrifice and sharing. Eid Mubarak! A table for everyone.', countries: ALL, rule: { kind: 'table', years: LUNAR.eidAdha }, colours: ['#1b7f5c', '#f4a261'], main: { from: 17, to: 20, what: 'at the Square', host: null } },
]);

/** The spans of a rule in a calendar year (a rule that crosses New Year may start in the year before: pass the years that matter). */
export function spansOf(rule: Rule, year: number): Span[] {
  if (rule.kind === 'fixed') {
    const focal = dayNo(year, rule.month, rule.day);
    return [{ start: focal - rule.before, end: focal + rule.after, focal }];
  }
  if (rule.kind === 'range') {
    const start = dayNo(year, rule.from[0], rule.from[1]), crosses = rule.to[0] < rule.from[0];
    const end = dayNo(crosses ? year + 1 : year, rule.to[0], rule.to[1]);
    const focal = dayNo(crosses && rule.focal[0] < rule.from[0] ? year + 1 : year, rule.focal[0], rule.focal[1]);
    return [{ start, end, focal }];
  }
  if (rule.kind === 'easter') {
    const sunday = easterDay(year);
    return [{ start: sunday - 2, end: sunday + 1, focal: sunday }];
  }
  if (rule.kind === 'table') {
    const row = rule.years[year];
    const start = row && dayOfIso(row[0]), end = row && dayOfIso(row[1]), focal = row && dayOfIso(row[2]);
    return start != null && end != null && focal != null ? [{ start, end, focal }] : [];
  }
  const start = dayOfIso(rule.start), end = dayOfIso(rule.end), focal = dayOfIso(rule.focal);
  return start != null && end != null && focal != null && new Date(start * DAY).getUTCFullYear() === year ? [{ start, end, focal }] : [];
}
/** Every span of a festival that can touch the local day `day` (the years either side, for a run across New Year). */
function spansAround(def: FestivalDef, day: number): Span[] {
  if (def.rule.kind === 'dates') { const first = dayOfIso(def.rule.start); return first === null ? [] : spansOf(def.rule, new Date(first * DAY).getUTCFullYear()); }
  const year = new Date(day * DAY).getUTCFullYear();
  return [year - 1, year, year + 1].flatMap((y) => spansOf(def.rule, y));
}

/** The next span of a festival that has not ended on the local day of `now` (in `country`, default Nigeria), or null (a lunar row past the table). */
export function nextSpan(def: FestivalDef, now: number, country = 'ng'): Span | null {
  const today = localDay(now, countryKey(country)), year = new Date(today * DAY).getUTCFullYear();
  const spans = def.rule.kind === 'dates' ? spansAround(def, today) : [year - 1, year, year + 1, year + 2].flatMap((y) => spansOf(def.rule, y));
  return spans.filter((item) => item.end >= today).sort((a, b) => a.start - b.start)[0] ?? null;
}

/** The festivals in force: the built-in ones, with an admin's replacements and hidden ids applied. */
export function festivalList(extras: FestivalExtras = {}): FestivalDef[] {
  const replaced = new Set((extras.festivals ?? []).map((item) => item.id)), hidden = new Set(extras.hidden ?? []);
  return [...FESTIVALS.filter((item) => !replaced.has(item.id)), ...(extras.festivals ?? [])].filter((item) => !hidden.has(item.id));
}
const inCountry = (def: FestivalDef, country: string): boolean => def.countries.includes('*') || def.countries.includes(country);

/** The festivals running on the local day of `now` in `country`, the nearest to its focal day first (ties by id). */
export function activeFestivals(now: number, country: string, extras: FestivalExtras = {}): ActiveFestival[] {
  const key = countryKey(country), today = localDay(now, key), out: ActiveFestival[] = [];
  for (const def of festivalList(extras)) {
    if (!inCountry(def, key)) continue;
    const span = spansAround(def, today).find((item) => today >= item.start && today <= item.end);
    if (span) out.push({ id: def.id, name: def.name, blurb: def.blurb, colours: def.colours, main: def.main, span, dayOf: today - span.start + 1, days: span.end - span.start + 1, focalToday: today === span.focal, countries: def.countries });
  }
  return out.sort((a, b) => Math.abs(today - a.span.focal) - Math.abs(today - b.span.focal) || a.id.localeCompare(b.id));
}

/** One occurrence of a festival's main event. */
export interface MainOccurrence { id: string; key: string; name: string; blurb: string; start: number; end: number; colours: readonly [string, string]; host: string | null; what: string; live: boolean }
/** The main events starting between `from` and `to` (server ms) or still running at `from`, soonest first. */
export function mainOccurrences(from: number, to: number, country: string, extras: FestivalExtras = {}): MainOccurrence[] {
  const key = countryKey(country), out: MainOccurrence[] = [];
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return out;
  for (let day = localDay(from, key) - 1; day <= localDay(to - 1, key); day++) {
    for (const def of festivalList(extras)) {
      if (!inCountry(def, key)) continue;
      const span = spansAround(def, day).find((item) => day >= item.start && day <= item.end);
      if (!span || (def.main.daily !== true && day !== span.focal)) continue;
      const start = localAt(day, def.main.from, key), end = localAt(day, def.main.to, key);
      if (end <= from || start >= to) continue;
      out.push({ id: def.id, key: `fest:${def.id}:${isoOfDay(day)}`, name: def.name, blurb: def.blurb, start, end, colours: def.colours, host: def.main.host, what: def.main.what, live: from >= start && from < end });
    }
  }
  return out.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

/** The look decision: which festival dresses the gathering venue now, or null. Pure and cheap: the scene asks it every few seconds. */
export interface Dressing { id: string; name: string; colour: string; second: string }
export function dressingFor(now: number, country: string, extras: FestivalExtras = {}): Dressing | null {
  const first = activeFestivals(now, country, extras)[0];
  return first ? { id: first.id, name: first.name, colour: first.colours[0], second: first.colours[1] } : null;
}
/** The one line the Events app shows while a festival runs: "Eid al-Fitr, day 2 of 4". */
export const noticeLine = (item: Pick<ActiveFestival, 'name' | 'dayOf' | 'days' | 'focalToday'>): string => `${item.name}${item.focalToday ? ' today' : `, day ${item.dayOf} of ${item.days}`}`;
