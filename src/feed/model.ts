/**
 * OWNER: social
 * THE FEED, the pure rules (docs/FEED.md). Profiles with a handle, posts that belong to a person and a place, replies and reactions,
 * crews, follows, events you can RSVP to, gigs with reviews, vouches and friend codes. Nothing here reads a clock, a store or the DOM:
 * the server (server/feed/) and the browser (src/app/features/feed/) both call these functions, so a rule means the same on both sides.
 * Not under src/game/: nothing here belongs in the first download.
 */
import { COLOURS } from '../festivals/party.ts'

export { COLOURS }
/**
 * The location badge of a profile (docs/FEED.md, "Location badge"): the person's own device found itself in a city of the world
 * map; the position never leaves it. Optional, adults only, gone after `days`.
 */
export const LOCATED = Object.freeze({ days: 90, perDay: 5, km: 25, accuracyM: 5000 })
/**
 * Who a community with a real place may let in: only people whose badge is in its local government (an `area`: the badge's optional
 * local unit, docs/FEED.md "Near you"), its city, its state, or its country.
 */
export const LOCAL_SCOPES = ['lga', 'city', 'state', 'country'] as const
export type LocalScope = (typeof LOCAL_SCOPES)[number]
export const isLocalScope = (v: unknown): v is LocalScope => typeof v === 'string' && (LOCAL_SCOPES as readonly string[]).includes(v)
/** The words of each scope in the "Who can join" choices. */
export const LOCAL_SCOPE_LABEL: Readonly<Record<LocalScope, string>> = Object.freeze({ lga: 'Only people confirmed in this area', city: 'Only people confirmed in this city', state: 'Only people confirmed in this state', country: 'Only people confirmed in this country' })
/**
 * Near you (docs/FEED.md): how much a post weighs when its author's badge is in the viewer's local government (`lga`) or city (`city`,
 * also a post placed in the viewer's badge city). Everything else weighs 1, so the world still shows, below the neighbours.
 */
export const NEAR = Object.freeze({ lga: 3, city: 1.6 })
export type Nearness = keyof typeof NEAR
/** A badge as the ranking reads it: a city id and, when the device found one, the local government's id. */
export interface BadgePlace { city: string; lga?: string }
/** How near an author (or an event's host, a gig's poster) is to the viewer: same local government, same city, or neither. */
export function nearness(viewer: BadgePlace | null | undefined, other: BadgePlace | null | undefined, placedIn?: string): Nearness | null {
  if (!viewer) return null
  if (other && other.city === viewer.city && viewer.lga && other.lga === viewer.lga) return 'lga'
  return (other && other.city === viewer.city) || placedIn === viewer.city ? 'city' : null
}

export const FEED = Object.freeze({
  body: 500, reply: 280, bio: 80, status: 60, place: 40,
  handleMin: 3, handleMax: 20, handleEveryMs: 30 * 86400000,
  postsPerDay: 20, repliesPerDay: 120, reactionsKinds: 6,
  repliesKept: 100, authorPosts: 300, cityPosts: 300, worldPosts: 400, drafts: 10, draftMs: 7 * 86400000,
  inbox: 50, follows: 300, reports: 500, reportsToHide: 2, page: 20,
  media: { pending: 6, pendingMs: 3600000, photoBytes: 250000, portraitBytes: 160000, clipBytes: 4_000_000, clipMs: 15500 },
  crew: { size: 20, nameMin: 3, nameMax: 24, about: 160, perPlayer: 30, createPerDay: 3 },
  community: { size: 1000, mods: 11, shown: 24, directory: 60 },
  event: { title: 60, about: 280, aheadMs: 60 * 86400000, longestMs: 12 * 3600000, cap: 200, perDay: 3, upcoming: 60, cohosts: 3 },
  gig: { title: 60, about: 280, rewardMax: 50000, perDay: 3, applicants: 30, open: 80, review: 60 },
  codeLength: 6, suggestions: 10, aiMomentsPerDay: 3,
})
/** Letters that cannot be misread aloud (no I, O, L), as clan codes. */
export const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'
export const SKILLS = Object.freeze(['Cooking', 'Driving', 'Trading', 'Teaching', 'Tech', 'Music', 'Fashion', 'Fixing things', 'Football', 'Comedy', 'Organising', 'Languages'] as const)
export type Skill = typeof SKILLS[number]
export type Visibility = 'public' | 'city' | 'friends' | 'crew'
export const VISIBILITIES: readonly Visibility[] = Object.freeze(['public', 'city', 'friends', 'crew'])
export type PostKind = 'text' | 'photo' | 'clip' | 'moment' | 'event' | 'gig' | 'recap'
export type FeedTab = 'near' | 'friends' | 'city' | 'world'
export interface Refusal { ok: false; code: string; reason: string }
const no = (code: string, reason: string): Refusal => ({ ok: false, code, reason })

const words = (value: unknown, max: number): string => (typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '')
/** Post or reply text: control characters dropped, runs of spaces folded, at most `max`. Empty when nothing is left. */
export const cleanBody = (value: unknown, max: number = FEED.body): string => words(value, max)
/** One line (a bio, a status): no line breaks. */
export const cleanLine = (value: unknown, max: number): string => words(typeof value === 'string' ? value.replace(/\s+/g, ' ') : value, max)

// ---- handles --------------------------------------------------------------------------------------------------------------------
/** Words a handle may not be: the game's own addresses and names that would mislead. */
export const RESERVED_HANDLES: readonly string[] = Object.freeze(['admin', 'allworld', 'joinallworld', 'support', 'help', 'moderator', 'mod', 'staff', 'official', 'founder', 'system', 'square', 'lumo', 'everyone', 'here', 'api', 'app', 'feed', 'null', 'undefined'])
/** A handle as typed (with or without @): lower-case letters, digits, dots and underscores, a letter first, 3 to 20 characters. Null otherwise. */
export function cleanHandle(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
  if (text.length < FEED.handleMin || text.length > FEED.handleMax || !/^[a-z][a-z0-9._]*$/.test(text) || /[._]{2}/.test(text) || /[._]$/.test(text)) return null
  return RESERVED_HANDLES.includes(text.replace(/[._]/g, '')) ? null : text
}
export function handleRefusal(value: unknown): Refusal | null {
  const text = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
  if (cleanHandle(value)) return null
  if (text.length < FEED.handleMin || text.length > FEED.handleMax) return no('invalid_handle', `A handle is ${FEED.handleMin} to ${FEED.handleMax} letters or digits.`)
  if (RESERVED_HANDLES.includes(text.replace(/[._]/g, ''))) return no('handle_reserved', 'That handle is kept for the game. Choose another.')
  return no('invalid_handle', 'Start with a letter; use letters, digits, one dot or underscore at a time, and end with a letter or digit.')
}

// ---- codes ----------------------------------------------------------------------------------------------------------------------
export function cleanCode(value: unknown): string | null {
  const text = typeof value === 'string' ? value.toUpperCase().replace(/[\s-]+/g, '') : ''
  return text.length === FEED.codeLength && [...text].every((c) => CODE_LETTERS.includes(c)) ? text : null
}
export const codeFrom = (bytes: readonly number[]): string => Array.from({ length: FEED.codeLength }, (_, i) => CODE_LETTERS[(bytes[i] ?? 0) % CODE_LETTERS.length]).join('')

// ---- crews and names ------------------------------------------------------------------------------------------------------------
export function cleanCrewName(value: unknown): string | null {
  const text = typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : ''
  return text.length >= FEED.crew.nameMin && text.length <= FEED.crew.nameMax && /^[\p{L}\p{N}][\p{L}\p{N} '’&.-]*$/u.test(text) && /\p{L}/u.test(text) ? text : null
}
/** What a community is (docs/FEED.md, "Communities"). A crew is a small circle of friends; the others hold up to 1,000 members. */
export const COMMUNITY_KINDS = Object.freeze([['crew', 'A crew of friends'], ['city', 'A city'], ['state', 'A state'], ['area', 'A neighbourhood or estate'], ['campus', 'A school or campus'], ['club', 'A club or fan base'], ['community', 'Another community']] as const)
export type CommunityKind = typeof COMMUNITY_KINDS[number][0]
export const isCommunityKind = (v: unknown): v is CommunityKind => COMMUNITY_KINDS.some(([k]) => k === v)
export const sizeOf = (kind: CommunityKind | undefined): number => (!kind || kind === 'crew' ? FEED.crew.size : FEED.community.size)
export const colourOk = (value: unknown): value is string => typeof value === 'string' && COLOURS.some((c) => c.id === value)

// ---- visibility -----------------------------------------------------------------------------------------------------------------
/** What a viewer stands in to the author of a post. Computed by the server from stored records; the client only reads the outcome. */
export interface Relation {
  self: boolean
  friend: boolean
  /** The viewer is a member of the post's crew. */
  crewMember: boolean
  blocked: boolean
  /** The viewer is a confirmed adult (18 or older). */
  adult: boolean
  /** The viewer is signed in with a life (a guest reading a public page is not). */
  player: boolean
}
export interface VisiblePost { vis: Visibility; hidden?: boolean | 1; gone?: boolean | 1 }
/** May this viewer see this post at all? The author always may (even when hidden by reports), nobody may once it is gone. */
export function canSee(post: VisiblePost, rel: Relation): boolean {
  if (post.gone) return false
  if (rel.self) return true
  if (rel.blocked || post.hidden) return false
  if (post.vis === 'public') return true
  if (post.vis === 'city') return rel.player
  if (post.vis === 'friends') return rel.friend
  return rel.crewMember
}
/**
 * May this viewer reply? Anyone who can see a public or city post and is a confirmed adult, plus friends and crew members of any age.
 * A player under 18 (or who has not answered the age question) never talks to strangers in public threads.
 */
export const canReply = (post: VisiblePost, rel: Relation): boolean => canSee(post, rel) && rel.player && (rel.self || rel.friend || rel.crewMember || rel.adult)
/**
 * The audience a post may have. An author who is not a confirmed adult posts to friends or a crew only; media is public only when the
 * host allows public media (an owner decision: there is no automatic scanning of what a picture shows, docs/CHAT-PICTURES.md).
 */
export function allowedVisibility(want: unknown, { adult, media, publicMedia, crew }: { adult: boolean; media: boolean; publicMedia: boolean; crew: boolean }): Visibility | Refusal {
  const vis = VISIBILITIES.find((v) => v === want) ?? (adult && (!media || publicMedia) ? 'public' : 'friends')
  if (vis === 'crew' && !crew) return no('invalid_crew', 'Choose one of your crews to post to.')
  if (!adult && (vis === 'public' || vis === 'city')) return no('friends_only', 'Until you are confirmed as 18 or older, your posts go to friends and crews only.')
  if (media && !publicMedia && (vis === 'public' || vis === 'city')) return no('media_friends_only', 'Photos and clips go to friends and crews for now.')
  return vis
}

// ---- ranking --------------------------------------------------------------------------------------------------------------------
export interface Rankable { at: number; replies: number; reactions: number; friend: boolean; mine: boolean; ai: boolean; kind: PostKind; /** Near you only. */ near?: Nearness | null }
/**
 * The score of a candidate in the Near you, City and World tabs: newer first (half-life of six hours), lifted by replies and reactions (a
 * few count, many do not run away), by a friend's hand, and in Near you by how near its author is (NEAR). AI posts weigh a little less,
 * so people stay on top. Friends is chronological.
 */
export function score(post: Rankable, now: number): number {
  const ageHours = Math.max(0, now - post.at) / 3600000
  const fresh = Math.pow(0.5, ageHours / 6)
  const talk = Math.log2(1 + post.replies * 2 + post.reactions)
  return fresh * (1 + 0.35 * talk) * (post.friend ? 1.6 : 1) * (post.ai ? 0.7 : 1) * (post.kind === 'moment' ? 0.9 : 1) * (post.near ? NEAR[post.near] : 1)
}
/** Plans and Work, near you first: the ones of your local government, then of your city, each group keeping its own order. */
export function nearFirst<T>(items: readonly T[], near: (item: T) => Nearness | null): T[] {
  const tier = (n: Nearness | null): number => (n === 'lga' ? 0 : n === 'city' ? 1 : 2)
  return items.map((item, i) => [tier(near(item)), i, item] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, , item]) => item)
}
export function rank<T extends Rankable>(posts: readonly T[], now: number): T[] {
  return posts.map((post) => [score(post, now), post] as const).sort((a, b) => b[0] - a[0] || b[1].at - a[1].at).map(([, post]) => post)
}

// ---- events ---------------------------------------------------------------------------------------------------------------------
export interface EventTiming { start: number; end: number }
export function eventTiming(start: unknown, hours: unknown, now: number): EventTiming | Refusal {
  const s = Number(start), h = Number(hours)
  if (!Number.isFinite(s) || s < now - 5 * 60000) return no('invalid_time', 'Choose a time that has not passed.')
  if (s > now + FEED.event.aheadMs) return no('invalid_time', 'Events can be planned up to 60 days ahead.')
  const length = Number.isFinite(h) ? Math.round(Math.min(12, Math.max(0.5, h)) * 2) / 2 : 2
  return { start: Math.round(s / 60000) * 60000, end: Math.round(s / 60000) * 60000 + length * 3600000 }
}
export type EventPhase = 'soon' | 'live' | 'over'
export const eventPhase = (e: EventTiming, now: number): EventPhase => (now >= e.end ? 'over' : now >= e.start ? 'live' : 'soon')

// ---- gigs and reviews -----------------------------------------------------------------------------------------------------------
export type GigState = 'open' | 'taken' | 'done' | 'closed'
export const rewardOf = (value: unknown): number | null => { const n = Math.round(Number(value)); return Number.isFinite(n) && n >= 0 && n <= FEED.gig.rewardMax ? n : null }
export const starsOf = (value: unknown): number | null => { const n = Math.round(Number(value)); return n >= 1 && n <= 5 ? n : null }
/** "4.6 from 12 reviews", or null with none. */
export const ratingText = (sum: number, n: number): string | null => (n > 0 ? `${(Math.round((sum / n) * 10) / 10).toFixed(1)} from ${n} review${n === 1 ? '' : 's'}` : null)

// ---- text for people ------------------------------------------------------------------------------------------------------------
export function agoText(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24); return d < 30 ? `${d} d ago` : `${Math.round(d / 30)} mo ago`
}
/** Where a badge says someone is: "Lagos Mainland, Lagos" with a local government, "Lagos" without. */
export const badgePlaceText = (b: { name: string; lgaName?: string }): string => (b.lgaName ? `${b.lgaName}, ${b.name}` : b.name)
/** The month a badge was set in (UTC, "2026-10"): the Near you counts start again each month. */
export const monthOf = (at: number): string => new Date(at).toISOString().slice(0, 7)
/** "214 people confirmed in Yaba this month" (a count, never a list of who). */
export const confirmedText = (n: number, place: string, month = true): string => `${n.toLocaleString('en')} ${n === 1 ? 'person' : 'people'} confirmed in ${place}${month ? ' this month' : ''}`
/** Follower counts are shown only from 100, so a small account is never compared. */
export const followersText = (n: number): string => (n >= 100 ? `${n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('en')} followers` : '')
export const visibilityWord: Readonly<Record<Visibility, string>> = Object.freeze({ public: 'Everyone', city: 'My city', friends: 'Friends', crew: 'Crew' })
