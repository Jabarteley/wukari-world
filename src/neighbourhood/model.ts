/**
 * OWNER: social
 * THE NEIGHBOURHOOD, the pure rules (docs/NEIGHBOURHOOD.md): the noticeboard of an area (power, water, lost and found, roadworks) whose
 * "still true?" votes keep it current, and the monthly "Meet your neighbours" meetup. An AREA is the place a location badge names: its
 * local government when it has one, otherwise its city (docs/FEED.md "Location badge"). Nothing here reads a clock, a store or the DOM.
 */
import type { BadgePlace } from '../feed/model.ts'

export const NOTICE_KINDS = Object.freeze([
  ['power', 'Light and power', 'NEPA don bring light?'],
  ['water', 'Water', 'Is the tap running?'],
  ['lost', 'Lost and found', 'Lost a bag? Found a phone?'],
  ['roads', 'Roadworks and traffic', 'Blocked road, go-slow, diversion'],
] as const)
export type NoticeKind = typeof NOTICE_KINDS[number][0]
export const isNoticeKind = (v: unknown): v is NoticeKind => NOTICE_KINDS.some(([id]) => id === v)
export const noticeKindLabel = (id: string): string => NOTICE_KINDS.find(([k]) => k === id)?.[1] ?? 'Notice'
const HOUR = 3600000

export const NOTICE = Object.freeze({
  min: 8, max: 240, perDay: 5,
  /** How long a notice lasts when nobody confirms it, by kind. Power and water change by the hour; a lost phone stays lost for days. */
  lifeMs: Object.freeze({ power: 6 * HOUR, water: 12 * HOUR, roads: 24 * HOUR, lost: 7 * 24 * HOUR } as Record<NoticeKind, number>),
  /** A "still true" vote keeps the notice up for this share of its life from now, never beyond `capLives` lives from when it was posted. */
  extendShare: 0.5, capLives: 3,
  /** A notice ends at once when this many more people say "not true" than "still true". */
  downNet: 3,
  /** Two reports send a notice back to the reviewer. */
  reportsToReview: 2,
  /** What the page lists. */
  perPage: 40, votersKept: 200, reviewTries: 3, repeatMs: HOUR,
})

export const areaKey = (city: string, lga?: string | null): string => (lga ? `${city}/${lga}` : city)
/** The area a badge names: its local government, or its city. */
export const areaOf = (badge: BadgePlace | null | undefined): string | null => (badge ? areaKey(badge.city, badge.lga) : null)
/**
 * Is this badge in that area? A local government needs a badge with that same local government (a badge of the city alone is not
 * enough), a city area needs the same city. This is the `lga` / `city` rule of the locals-only communities (server/feed/service.ts
 * `qualifies`), for a badge that is still valid.
 */
export function badgeIn(badge: BadgePlace | null | undefined, area: string): boolean {
  if (!badge) return false
  const [city, lga] = area.split('/')
  return Boolean(city) && badge.city === city && (lga === undefined || badge.lga === lga)
}

export interface NoticeVotes { at: number; until: number; kind: NoticeKind; up: number; down: number }
/** Why a notice is not on the board any more, or null while it is. */
export function noticeEnded(n: NoticeVotes, now: number): 'time' | 'votes' | null {
  if (n.down - n.up >= NOTICE.downNet) return 'votes'
  return now >= n.until ? 'time' : null
}
/** When the notice ends if a "still true" arrives now: not shorter than it is, not longer than the cap. */
export function extendedUntil(n: Pick<NoticeVotes, 'at' | 'until' | 'kind'>, now: number): number {
  const life = NOTICE.lifeMs[n.kind]
  return Math.max(n.until, Math.min(now + Math.round(life * NOTICE.extendShare), n.at + life * NOTICE.capLives))
}
/** "Still true? 7 yes, 1 no" and how long it has left, in words. */
export function leftText(until: number, now: number): string {
  const m = Math.max(0, Math.round((until - now) / 60000))
  if (m < 60) return `${m} min left`
  const h = Math.round(m / 60)
  return h < 48 ? `${h} h left` : `${Math.round(h / 24)} days left`
}
export const cleanNotice = (v: unknown): string => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NOTICE.max) : '')

// ---- the monthly meetup -------------------------------------------------------------------------------------------------------------
/** West Africa Time is UTC+1 all year. */
export const MEETUP = Object.freeze({ weekday: 6, hourWat: 16, hours: 2, cap: 60, leadMs: 2 * HOUR, title: 'Meet your neighbours' })
export const monthKey = (ms: number): string => new Date(ms).toISOString().slice(0, 7)
/** The first Saturday of a month at 16:00 WAT, as a time. `month` is "2026-11". */
export function firstSaturday(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const first = new Date(Date.UTC(y, m - 1, 1, MEETUP.hourWat - 1))
  const shift = (MEETUP.weekday - first.getUTCDay() + 7) % 7
  return first.getTime() + shift * 24 * HOUR
}
/** The next monthly meetup time at least `leadMs` ahead: this month's first Saturday if it is still ahead, else next month's. */
export function nextMeetupStart(now: number): number {
  const this_ = firstSaturday(monthKey(now))
  if (this_ >= now + MEETUP.leadMs) return this_
  const d = new Date(now)
  return firstSaturday(monthKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
}
