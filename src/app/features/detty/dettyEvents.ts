// Detty December in the Events app (docs/DETTY-DECEMBER.md): the season's nights and owambe Saturdays as event rows, the notice line, today's
// drop and the season card's words and link. Loaded with the Events app only: nothing here is in the first download. The dates and lists are
// the pure ones (src/festivals/detty.ts) fed with the season the server answers (src/festivals/detty-client.ts), so a preview shows here too.
import { venueLabel } from '../../../game/content/venues.ts'
import { venuesFor } from '../../../game/cities/runtime.ts'
import { dettyOn, isDettyCity, seasonDay, watDate } from '../../../festivals/detty-dates.ts'
import { DEFAULT_DROPS, SEASON_CITIES, cardWords, dropFor, seasonEvents } from '../../../festivals/detty.ts'
import type { SeasonFacts } from '../../../festivals/detty.ts'
import type { DettyFeed } from '../../../festivals/detty-client.ts'
export { loadDetty } from '../../../festivals/detty-client.ts'
import type { CalendarOccurrence } from '../../../types/growth.ts'

const DAY = 86400000
const safe = <T>(read: () => T, fallback: T): T => { try { return read() } catch { return fallback } }
/** The calendar festival this season stands in for in its three cities (src/festivals/calendar.ts). */
export const SEASON_FESTIVAL = 'ng-detty-december'

/** Whether the season is on for a city at `now`, by the feed (the date, or the admin's preview). */
export const seasonHere = (feed: DettyFeed | null, now: number, cityId: string): boolean => Boolean(feed) && isDettyCity(cityId) && dettyOn(now, feed!.preview)

/** The season's events from now to `days` days on in a season city, as Events-app rows. Nothing elsewhere, nothing out of season. */
export function dettyRows(feed: DettyFeed | null, now: number, days: number, cityId: string): CalendarOccurrence[] {
  if (!feed || !isDettyCity(cityId)) return []
  const ids = new Set(safe(() => venuesFor(cityId).map((venue) => venue.id), [] as string[]))
  return seasonEvents(now, now + days * DAY, cityId, feed, ids.size ? (id) => ids.has(id) : undefined).map((event) => ({
    id: event.key, key: event.key, title: event.title, blurb: event.blurb, venue: event.venue, venueLabel: safe(() => venueLabel(event.venue, cityId), event.venue),
    icon: event.kind === 'owambe' ? 'people' : 'star', start: event.start, end: event.end, live: event.live, spray: false, table: null,
  }))
}
/** The calendar's own "Detty December at the Square" row gives way to the season's nights in a season city while the season is on. */
export const keepFestivalRow = (row: Pick<CalendarOccurrence, 'id'>, feed: DettyFeed | null, now: number, cityId: string): boolean => !(row.id === SEASON_FESTIVAL && seasonHere(feed, now, cityId))

/** The notice line: "Detty December in Lagos, day 5 of 31" (and "preview" before December). */
export function noticeOf(feed: DettyFeed | null, now: number, cityId: string): string | null {
  if (!seasonHere(feed, now, cityId) || !isDettyCity(cityId)) return null
  const day = seasonDay(now, feed!.preview)
  return `Detty December in ${SEASON_CITIES[cityId].name}${day ? `, day ${day} of 31` : ''}${feed!.preview && watDate(now).month !== 12 ? ' (preview)' : ''}`
}
/** Today's drop at server time `now`, or null out of season. */
export function dropToday(feed: DettyFeed | null, now: number): string | null {
  const day = feed ? seasonDay(now, feed.preview) : null
  return feed && day ? dropFor(day, feed.drops.length ? feed.drops : DEFAULT_DROPS) : null
}

/** How the Returnee badge is earned, in one line, for someone who has not got it. */
export const RETURNEE_HOW = 'Coming home from abroad? Show your location badge (My profile → Location badge) from where you live, then visit Lagos, Accra or Abuja during the season: the Returnee badge goes on your profile.'
/** The season card's link: the season's own address, counted as the card's campaign. */
export const cardLink = (origin: string): string => `${origin}/detty?utm_source=share&utm_medium=card&utm_campaign=detty`
/** The card's text, with the link on its own last line (the share sheet's rule). */
export const cardText = (facts: SeasonFacts, link: string): string => `${cardWords(facts).text}\n${link}`
