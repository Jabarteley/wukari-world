/**
 * OWNER: social
 * THE STORED SHAPE of the feed: the collection `feed` (docs/FEED.md, "Stored data"). Created by the first profile edit, post, crew, event
 * or gig, so nothing existing changes. Kept one entry at a time (server/keyed.ts KEYED_SPECS):
 *   authors[id]    a person's profile, their post ids (newest last), drafts, inbox, follows, crews, vouches and reviews
 *   posts[id]      one post with its replies (at most FEED.repliesKept) and reactions
 *   cities[city]   the newest post, event and gig ids of a city
 *   handles[key]   -> author id         codes[CODE] -> { k, id }
 *   crews[id]      a crew               events[id] an event            gigs[id] a gig
 *   root           { v, seq, world: newest public post ids, reports: newest last, here: this month's badge counts }
 * Never inside `social`: a post, a crew or an event is not a player's record and must not make every player's row bigger.
 * Everything is optional on read: a missing field is repaired where it is read.
 */
import type { Db, RouteContext } from '../types.ts'
import type { GigState, PostKind, Skill, Visibility } from '../../src/feed/model.ts'
import type { FeedMedia, InboxLine } from '../../src/types/feed.ts'

export interface Reply { n: number; by: string; at: number; body: string; ai?: 1; /** Removed by the reviewer or an operator: kept until undone or purged. */ gone?: 1 }
export interface PostRecord {
  id: string; by: string; at: number; kind: PostKind; body: string
  place?: { city: string; venue?: string; label?: string }
  vis: Visibility; crew?: string
  media?: FeedMedia
  gist?: number; ev?: string; gig?: string
  rx?: Record<string, string>
  replies?: Reply[]; rn?: number
  reports?: string[]; hidden?: 1; gone?: 1; ai?: 1
  /** The still image a clip is reviewed and previewed by (a pending photo of the same author). */
  poster?: string
}
export interface DraftRecord { n: number; at: number; city: string; kind: string; text: string }
export interface PendingMedia extends FeedMedia { at: number; use: 'post' | 'portrait' }
export interface AuthorRecord {
  name: string
  handle?: string; handleAt?: number
  bio?: string
  status?: { text: string; place?: string; at: number }
  portrait?: { hash: string; at: number; type: 'png' | 'webp' | 'jpeg' }
  posts?: string[]
  drafts?: DraftRecord[]
  inbox?: InboxLine[]; seenAt?: number
  follows?: Record<string, number>; followers?: number
  /** Lets anybody follow (an adult's choice; every AI character is followable). */
  open?: 1
  code?: string
  crews?: string[]
  /** skill -> the ids who vouched for it. */
  vouches?: Partial<Record<Skill, string[]>>
  reviews?: { n: number; sum: number; recent: { by: string; stars: number; text: string; at: number }[] }
  gigsDone?: number
  /**
   * The location badge (docs/FEED.md): a city of the catalogue, when (server clock), `net` when the network's country agreed, and `lga`
   * (one of that city's local units) when the device found it and the player showed it. Never a position.
   */
  located?: { city: string; at: number; net?: 1; lga?: string }
  locatedDay?: { day: string; n: number }
  /** Their own and RSVP'd events, and gigs posted, applied to or taken: newest last, at most 40 each. */
  events?: string[]; gigs?: string[]
  media?: PendingMedia[]
  /** Lagos day and the counts of that day, for the daily caps. */
  day?: { d: number; posts: number; replies: number; crews: number; events: number; gigs: number; ai: number }
  first?: number
  /** The Lagos week whose recap draft was made (made once, even if dropped). */
  recapWeek?: number
}
export interface CrewRecord {
  id: string; name: string; colour: string; about: string; owner: string; members: string[]; code: string; at: number; kicked?: Record<string, number>; /** Removed by moderation: no page, no joining; members keep their wall. */ banned?: 1
  /** A community (absent: a crew of friends). */
  kind?: import('../../src/feed/model.ts').CommunityKind
  /** Where it is: a real city or state of the catalogue (`real`, with one of the city's local units as `lga`), or a place someone imagined (`name` only). */
  place?: { city?: string; state?: string; country?: string; name?: string; real?: 1; lga?: string }
  /** Listed in the Discover directory, anyone may join without the link. */
  open?: 1
  /** Moderators besides the founder: they edit, remove members and build the world. */
  mods?: string[]
  /** Locals only: joining needs a location badge in its local government, city, state or country. */
  locals?: import('../../src/feed/model.ts').LocalScope
  /** Its world: a group chat the founder made, whose room is the community's 3D world (docs/SPACES-3D.md). */
  conv?: string
  cover?: string
}
export interface EventRecord {
  id: string; by: string; title: string; about: string; city: string; venue?: string; label: string
  start: number; end: number; cap: number; going: string[]; maybe: string[]; cohosts: string[]; code: string; at: number; post?: string; gone?: 1
  reminded?: 1
}
export interface GigRecord {
  id: string; by: string; city: string; title: string; about: string; reward: number; at: number; state: GigState
  applicants: string[]; worker?: string; doneAt?: number; post?: string
  reviews?: Partial<Record<'poster' | 'worker', { stars: number; text: string; at: number }>>
}
export interface ReportRecord { kind: 'post' | 'reply' | 'crew' | 'event' | 'gig' | 'profile'; id: string; n?: number; by: string; reason: string; at: number; done?: 1 }
/** One moderation decision, by the AI reviewer or an operator, with what it changed so it can be undone. */
export interface DecisionRecord {
  n: number; at: number; by: 'ai' | 'operator'; kind: ReportRecord['kind']; id: string; rn?: number
  action: 'remove' | 'hide' | 'keep'; category: string; reason: string
  /** The fields as they were before, restored by undo. */
  before: Record<string, unknown>
  undone?: { at: number; by: string }
  /** The reviewer saw a picture (a photo, a clip's poster or a portrait). */
  saw?: 'text' | 'image'
}
export interface CityLists { posts: string[]; events: string[]; gigs: string[]; communities?: string[] }
export interface FeedCollection {
  v: 1; seq: number; world: string[]; reports: ReportRecord[]
  /** Media hashes whose bytes the heartbeat deletes (erasure puts them here). */
  trash?: string[]
  /**
   * Near you's line (docs/FEED.md): how many badges were set this month (`m`, monthOf) per city (`lagos`) and local government
   * (`lagos/ikeja`). Numbers only, never who; started again when the month changes. A person counts once, where their badge is now.
   */
  here?: { m: string; n: Record<string, number> }
  /** Moderation decisions, newest last, at most 500; `dn` counts them. */
  decisions?: DecisionRecord[]; dn?: number
  authors: Record<string, AuthorRecord>; posts: Record<string, PostRecord>; cities: Record<string, CityLists>
  handles: Record<string, string>; codes: Record<string, { k: 'friend' | 'crew' | 'event'; id: string }>
  crews: Record<string, CrewRecord>; events: Record<string, EventRecord>; gigs: Record<string, GigRecord>
}
const MAPS = ['authors', 'posts', 'cities', 'handles', 'codes', 'crews', 'events', 'gigs'] as const

export const feedOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): FeedCollection => {
  const c = ctx.collection(db, 'feed', { v: 1, seq: 0, world: [], reports: [], authors: {}, posts: {}, cities: {}, handles: {}, codes: {}, crews: {}, events: {}, gigs: {} }) as unknown as FeedCollection
  for (const key of MAPS) if (!c[key] || typeof c[key] !== 'object') (c as unknown as Record<string, unknown>)[key] = {}
  if (!Array.isArray(c.world)) c.world = []
  if (!Array.isArray(c.reports)) c.reports = []
  if (typeof c.seq !== 'number') c.seq = 0
  return c
}
/** A read that never creates the collection. */
export const peekFeed = (db: Db): FeedCollection | undefined => (db as Record<string, unknown>)['feed'] as FeedCollection | undefined
