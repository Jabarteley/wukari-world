/**
 * OWNER: social
 * The `neighbourhood` collection (docs/NEIGHBOURHOOD.md): the noticeboard of each area and the monthly meetups, plus the one read the feed
 * and Earn ask before they let someone into a meetup. Keyed (server/keyed.ts): notices[id] · meetups[eventId]. Created by the first notice
 * or meetup, so nothing existing changes. Portable: no Node imports.
 *
 *   notices[id]   { area, kind, by, body, at, until, up[], down[], status, reason?, tries?, reports? }
 *   areas[key]    { notices[] } newest last; key is "lagos/ikeja" (a local government) or "lagos" (a city)
 *   meetups[ev]   { city, lga, month, by, via, crew? } a feed event that is the monthly meetup of a local government
 *   months[k]     "<area>:<2026-11>" -> the event planned for that area and month (one a month)
 *   templates[a]  the host's defaults for an area, so next month is one tap
 *   days[id]      { d, n } the notices a person posted on a Lagos day
 */
import { LOCATED } from '../../src/feed/model.ts'
import { badgeIn, areaKey } from '../../src/neighbourhood/model.ts'
import type { NoticeKind } from '../../src/neighbourhood/model.ts'
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts'
import { peekFeed } from '../feed/data.ts'
import type { Db, RouteContext } from '../types.ts'

export type NoticeStatus = 'review' | 'live' | 'refused' | 'removed'
export interface NoticeRecord { id: string; area: string; kind: NoticeKind; by: string; body: string; at: number; until: number; up: string[]; down: string[]; status: NoticeStatus; reason?: string; tries?: number; reports?: string[] }
export interface MeetupRecord { event: string; city: string; lga: string; month: string; by: string; via: 'admin' | 'founder'; crew?: string }
export interface TemplateRecord { by: string; crew?: string; title: string; about: string; place: string; price?: number }
export interface NeighbourhoodCollection {
  seq: number
  notices: Record<string, NoticeRecord>
  areas: Record<string, { notices: string[] }>
  meetups: Record<string, MeetupRecord>
  months: Record<string, string>
  templates: Record<string, TemplateRecord>
  days: Record<string, { d: number; n: number }>
}
const MAPS = ['notices', 'areas', 'meetups', 'months', 'templates', 'days'] as const
export const neighbourhoodOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): NeighbourhoodCollection => {
  const c = ctx.collection(db, 'neighbourhood', { seq: 0, notices: {}, areas: {}, meetups: {}, months: {}, templates: {}, days: {} }) as unknown as NeighbourhoodCollection
  for (const k of MAPS) if (!c[k] || typeof c[k] !== 'object') (c as unknown as Record<string, unknown>)[k] = {}
  if (typeof c.seq !== 'number') c.seq = 0
  return c
}
export const peekNeighbourhood = (db: Db): NeighbourhoodCollection | undefined => (db as Record<string, unknown>)['neighbourhood'] as NeighbourhoodCollection | undefined

/** A person's location badge while it lasts (the feed's own rule: 90 days, a city of the catalogue). */
export function badgeNow(db: Db, id: string, now: number): { city: string; lga?: string } | null {
  const b = peekFeed(db)?.authors[id]?.located
  return b && now - b.at < LOCATED.days * 86400000 && cityCatalogueEntry(b.city) ? { city: b.city, ...(b.lga ? { lga: b.lga } : {}) } : null
}
/**
 * For the feed's RSVP and Earn's ticket sale: is this event a "Meet your neighbours" meetup the person may not go to? Its host and cohosts
 * go anywhere; everyone else needs a location badge in the meetup's local government (the `lga` rule of locals-only communities).
 * Returns the refusal, or null (also for any event that is not a meetup).
 */
export function meetupRefusal(db: Db, event: string, who: string, now: number): { code: string; reason: string } | null {
  const m = peekNeighbourhood(db)?.meetups[event]
  if (!m) return null
  const e = peekFeed(db)?.events[event]
  if (!e || e.by === who || e.cohosts.includes(who)) return null
  return badgeIn(badgeNow(db, who, now), areaKey(m.city, m.lga)) ? null : { code: 'locals_only', reason: 'This meetup is for people confirmed in this area. Confirm where you are in My profile (your device checks it; your position is never sent), then come.' }
}
