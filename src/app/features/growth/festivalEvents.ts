// Festival main events and match nights as Events-app rows (src/festivals/). Loaded with the Events app only: nothing here is in the
// first download. The dates are the pure calendar (src/festivals/calendar.ts, matches.ts) fed with the city's festival feed (the admin's
// edits); the rows have the same shape as the city's own events, so the same card shows them. They are not spray events.
import { venueLabel } from '../../../game/content/venues.ts'
import { publicArrivalVenue, venuesFor } from '../../../game/cities/runtime.ts'
import { activeFestivals, mainOccurrences, noticeLine } from '../../../festivals/calendar.ts'
import { matchNights } from '../../../festivals/matches.ts'
import type { Feed } from '../../../festivals/client.ts'
import type { CalendarOccurrence } from '../../../types/growth.ts'

const DAY = 86400000
const safe = <T>(read: () => T, fallback: T): T => { try { return read() } catch { return fallback } }

/** The festival main events and match nights from now to `days` days on, in `cityId`, as event rows (unsorted against the city's own). */
export function festivalRows(feed: Feed | null, now: number, days: number, cityId: string): CalendarOccurrence[] {
  if (!feed) return []
  const out: CalendarOccurrence[] = []
  const square = safe(() => publicArrivalVenue(cityId).id, '')
  if (square) {
    for (const item of mainOccurrences(now, now + days * DAY, feed.country, feed.extras)) {
      out.push({ id: item.id, key: `${item.key}:${cityId}`, title: `${item.name} ${item.what}`, blurb: item.blurb, venue: square, venueLabel: safe(() => venueLabel(square, cityId), square), icon: 'star', start: item.start, end: item.end, live: item.live, spray: false, table: null })
    }
  }
  const viewing = safe(() => venuesFor(cityId).find((venue) => venue.scene.kind === 'viewing')?.id ?? '', '')
  if (viewing) {
    for (const item of matchNights(now, now + days * DAY, feed.country, feed.fixtures)) {
      out.push({ id: item.key, key: `${item.key}:${cityId}`, title: item.weekly ? item.title : `Match night: ${item.title}`, blurb: item.blurb, venue: viewing, venueLabel: safe(() => venueLabel(viewing, cityId), viewing), icon: 'ball', start: item.start, end: item.end, live: item.live, spray: false, table: null })
    }
  }
  return out
}
/** The festivals running now in the city's country, as the one line each shows. */
export const festivalNotices = (feed: Feed | null, now: number): { id: string; line: string; colours: readonly [string, string]; blurb: string }[] =>
  feed ? activeFestivals(now, feed.country, feed.extras).map((item) => ({ id: item.id, line: noticeLine(item), colours: item.colours, blurb: item.blurb })) : []
