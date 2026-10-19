/**
 * OWNER: social
 * THE STORED SHAPE of the social glue (docs/SOCIAL-GLUE.md): the collection `glue`, kept one entry at a time (server/keyed.ts). Created by
 * the first write, so a store without it reads as empty and nothing existing changes. Portable: no Node imports.
 *
 *   close[id]       { on?, ids, at }               a person's close friends and whether they share where they are (off unless on: 1)
 *   seen[viewer]    [sharer ids]                    who listed this viewer (the index the HUD line reads; checked again on every read)
 *   talks[event]    a hosted talk: a feed event with a stage in a room
 *   talkList        [event ids]                     the newest 200 talks (root)
 *   queue           [post ids]                      gist posts waiting for the reviewer (root)
 *   boards[key]     { posts, strikes?, bars? }      a gist board: its post ids (newest last), the removals per author, the barred
 *   posts[id]       one gist post (its author is kept for moderators and the reviewer; readers are never sent it)
 *   days[id]        { d, n, about }                 a person's gist posts and "about me" reports on a Lagos day
 *   trips[id]       a group trip                    crewTrips[crew]  [trip ids]
 *   marriages[id]   a proposal, an engagement or a marriage
 *   wed[id]         the marriage id a person is in (any state)        asked[id]  [marriage ids proposed to them]
 */
import type { Db, RouteContext } from '../types.ts'
import type { MarriageState, Ring, TripAnswer, TripMode } from '../../src/glue/model.ts'
import type { MarriedBadge } from '../../src/types/glue.ts'

export interface CloseRecord { on?: 1; ids: string[]; at: number }
export interface TalkRecord { id: string; by: string; room: string; place: string; city: string; speakers: string[]; at: number; crew?: string; opened?: number }
export type GistStatus = 'review' | 'live' | 'refused' | 'removed' | 'held'
export interface GistRecord {
  id: string; board: string; by: string; body: string; at: number; status: GistStatus
  reason?: string; tries?: number; reports?: string[]; aboutMe?: string[]; same?: string[]
  /** Who took it down: the reviewer, a moderator, the author, an admin. */
  off?: 'ai' | 'mod' | 'author' | 'admin'
}
export interface BoardRecord { posts: string[]; strikes?: Record<string, number[]>; bars?: Record<string, number>; /** A campus board: the people who opened it lately (newest last), whose names a post may not carry. */ seen?: string[] }
export interface TripRecord {
  id: string; crew: string; by: string; mode: TripMode; city: string; from: string; to: string
  members: Record<string, TripAnswer>; at: number; state: 'open' | 'gone' | 'called-off'; leftAt?: number; arriveAt?: number
}
export interface MarriageRecord {
  id: string; a: string; b: string; state: MarriageState; ring: Ring; at: number
  since?: number; venue?: string; guests?: string[]; shared: string[]
}
export interface GlueCollection {
  seq: number
  talkList: string[]
  /** Gist posts waiting for the reviewer (root; the heartbeat tries each again, GLUE.board.reviewTries times). */
  queue: string[]
  close: Record<string, CloseRecord>
  seen: Record<string, string[]>
  talks: Record<string, TalkRecord>
  boards: Record<string, BoardRecord>
  posts: Record<string, GistRecord>
  days: Record<string, { d: number; n: number; about: number; last?: number }>
  trips: Record<string, TripRecord>
  crewTrips: Record<string, string[]>
  marriages: Record<string, MarriageRecord>
  wed: Record<string, string>
  asked: Record<string, string[]>
}
export const GLUE_MAPS = ['close', 'seen', 'talks', 'boards', 'posts', 'days', 'trips', 'crewTrips', 'marriages', 'wed', 'asked'] as const
export const glueOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): GlueCollection => {
  const c = ctx.collection(db, 'glue', { seq: 0, talkList: [], queue: [] }) as unknown as GlueCollection
  for (const k of GLUE_MAPS) if (!c[k] || typeof c[k] !== 'object') (c as unknown as Record<string, unknown>)[k] = {}
  if (!Array.isArray(c.talkList)) c.talkList = []
  if (!Array.isArray(c.queue)) c.queue = []
  if (typeof c.seq !== 'number') c.seq = 0
  return c
}
/** A read that never creates the collection. */
export const peekGlue = (db: Db): GlueCollection | undefined => (db as Record<string, unknown>)['glue'] as GlueCollection | undefined

/** The marriage a person is in now (married), or null. Read by the houses rules (a spouse's shared home) and the person card. */
export function marriageOf(db: Db, id: string): MarriageRecord | null {
  const g = peekGlue(db), key = g?.wed?.[id], m = key ? g!.marriages[key] : undefined
  return m && m.state === 'married' && (m.a === id || m.b === id) ? m : null
}
export const spouseOf = (db: Db, id: string): string | null => { const m = marriageOf(db, id); return m ? (m.a === id ? m.b : m.a) : null }
/**
 * THE SHARED HOME (docs/SOCIAL-GLUE.md "Family life"): may `viewer` treat `host`'s home as their own? Only a spouse, and only when the
 * host offered their home as the couple's. Used by the door (server/social/service.ts doorFor), a visit while the host is out
 * (server/social/visit.ts) and arranging in 3D (server/spaces/world.ts).
 */
export function sharesHome(db: Db, host: string, viewer: string): boolean {
  if (!host || !viewer || host === viewer) return false
  const m = marriageOf(db, host)
  return Boolean(m && (m.a === viewer || m.b === viewer) && m.shared.includes(host))
}

/** The married badge of a person's card, or null. Only for a marriage that holds; nothing about a proposal or an engagement. */
export function marriedBadge(db: Db, id: string): MarriedBadge | null {
  const m = marriageOf(db, id)
  if (!m || !m.since) return null
  const other = m.a === id ? m.b : m.a
  const name = (db as unknown as { social?: { players?: Record<string, { name?: string }> } }).social?.players?.[other]?.name ?? 'Someone'
  return { to: { id: other, name }, since: m.since }
}
