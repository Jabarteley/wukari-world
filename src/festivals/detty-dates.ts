/**
 * OWNER: growth
 * DETTY DECEMBER, THE DATES ONLY (docs/DETTY-DECEMBER.md): the few lines the entry page, both hosts' link previews and the venue scenes
 * need to know whether the season is on, kept apart from the season's lists (src/festivals/detty.ts) so that none of those reads pulls
 * the lists in. Pure: no clock of its own, no I/O.
 *
 * THE SEASON runs from 00:00 on 1 December to 24:00 on 31 December, West Africa Time (UTC+1, no summer time), in Lagos, Accra and
 * Abuja, every year, by itself. Accra's own clock is an hour behind, but the season is one season: it opens and closes at the same
 * moment in all three cities. An admin's PREVIEW switch (server/routes/detty.ts) turns it on early for testing; nothing here knows of it
 * except the `preview` argument.
 */

/** The season's cities, in the order the copy names them. */
export const DETTY_CITIES = Object.freeze(['lagos', 'accra', 'abuja'] as const)
export type DettyCity = (typeof DETTY_CITIES)[number]
export const isDettyCity = (id: unknown): id is DettyCity => (DETTY_CITIES as readonly unknown[]).includes(id)

const WAT = 3600000
/** The calendar date in West Africa Time at server time `now`. */
export const watDate = (now: number): { year: number; month: number; day: number } => { const d = new Date(now + WAT); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } }
/** Server ms of 00:00 WAT on a date. */
export const watMidnight = (year: number, month: number, day: number): number => Date.UTC(year, month - 1, day) - WAT
/** The first and the after-last moment of a year's season: [00:00 WAT 1 December, 00:00 WAT 1 January). */
export const seasonSpan = (year: number): { start: number; end: number } => ({ start: watMidnight(year, 12, 1), end: watMidnight(year + 1, 1, 1) })
/** Whether `now` is inside the season (or the preview is on). */
export const dettyOn = (now: number, preview = false): boolean => preview || (Number.isFinite(now) && watDate(now).month === 12)
/**
 * The season's day, 1 to 31: the WAT day of December. In a preview outside December it is today's day of the month (so 19 October
 * shows what 19 December will show), capped at 31. Null when the season is off.
 */
export function seasonDay(now: number, preview = false): number | null {
  if (!dettyOn(now, preview)) return null
  return Math.min(31, watDate(now).day)
}
/** The year a season belongs to: December's own year; in January, the season just ended (the card is still offered). */
export const seasonYear = (now: number): number => { const d = watDate(now); return d.month === 1 ? d.year - 1 : d.year }
