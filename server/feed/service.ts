/**
 * OWNER: social
 * THE FEED SERVICE (docs/FEED.md): profiles and handles, posts with a place, replies, reactions, follows, people you may know, friend
 * codes, crews, events, gigs, vouches, moments drafted from the gist, the feed's own inbox, reports and the operator's queue, and erasure.
 * Every method that writes runs inside the caller's transaction and returns a small JSON answer: `{ ok: true, … }` or a refusal
 * `{ ok: false, code, reason }` that changed nothing. Live frames are returned in `push` and sent by the route after the commit.
 *
 * WHO SEES WHAT is decided in one place, `relation` + canSee/canReply (src/feed/model.ts). Blocks win everywhere (ctx.checks.blocked).
 * A player who is not a confirmed adult posts to friends and crews only and replies only where they are a friend or crew member; media is
 * friends-and-crews only unless an operator switches public media on (setting `feedPublicMedia` or FEED_PUBLIC_MEDIA=on).
 * Text passes the game's text filter with contacts refused (server/moderation/text.ts) and the sender's mute (ctx.checks.muted).
 * Portable: no Node imports.
 */
import { FEED, LOCATED, isLocalScope, monthOf, nearness, nearFirst, SKILLS, COMMUNITY_KINDS, isCommunityKind, sizeOf, allowedVisibility, canReply, canSee, cleanBody, cleanCode, cleanCrewName, cleanHandle, cleanLine, codeFrom, colourOk, eventPhase, eventTiming, handleRefusal, rank, rewardOf, starsOf, ratingText, followersText } from '../../src/feed/model.ts'
import type { BadgePlace, FeedTab, LocalScope, Nearness, Relation, Skill, Visibility } from '../../src/feed/model.ts'
import type { CrewView, Draft, EventView, FeedMe, FeedPage, FeedPerson, NearLine, FeedPlace, GigView, InboxLine, NewsLine, PostView, ProfileView, ReplyView, Suggestion, WorkView, FeedMedia } from '../../src/types/feed.ts'
import { screenText } from '../moderation/text.ts'
import { agentWords } from '../moderation/agent-words.ts'
import { friendsIn } from '../social/founder.ts'
import { lagosTime } from '../../src/game/clock.ts'
import { cityName, cityCatalogue, cityCatalogueEntry, cityRules } from '../../src/game/cities/registry.ts'
import { roomLinkPath } from '../../src/places/model.ts'
import { feedOf, peekFeed } from './data.ts'
import { gigPaid, needsTicket, ticketOf } from '../earn/data.ts'
import type { AuthorRecord, CrewRecord, DecisionRecord, EventRecord, FeedCollection, GigRecord, PostRecord, Reply, ReportRecord } from './data.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

export interface Refused { ok: false; code: string; reason: string }
/** One of a city's local units (its local governments, or the local equivalent), when the city's rules are in (the route loads them first). */
const unitOf = (city: string, id: unknown): { id: string; name: string } | null => (typeof id === 'string' && id ? cityRules(city)?.units.find((u) => u.id === id) ?? null : null)
/** A local unit's name; from its id ("lagos-mainland" → "Lagos Mainland") while the city's rules are not in. */
const unitName = (city: string, id: string): string => unitOf(city, id)?.name ?? id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
/**
 * Near you's counts (FeedCollection.here): add or take one person at a badge's city and local government for the month of `at`. A new month
 * starts from nothing; taking from a month that is over does nothing.
 */
function countHere(f: FeedCollection, badge: BadgePlace, delta: 1 | -1, at: number): void {
  const m = monthOf(at)
  if (!f.here || f.here.m !== m) { if (delta < 0) return; f.here = { m, n: {} } }
  for (const key of [badge.city, ...(badge.lga ? [`${badge.city}/${badge.lga}`] : [])]) { const n = (f.here.n[key] ?? 0) + delta; if (n > 0) f.here.n[key] = n; else delete f.here.n[key] }
}
/** A badge set this month was counted this month: take it off the count when it changes or goes. */
const uncount = (f: FeedCollection, badge: AuthorRecord['located'], at: number): void => { if (badge && monthOf(badge.at) === monthOf(at)) countHere(f, badge, -1, at) }
export type Push = [string, { type: 'feed-inbox'; unseen: number; line?: InboxLine }][]
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason })
const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH = /^[0-9a-f]{64}$/
const AGENT_WINDOW_MS = 5 * 60000
const REACTION = /^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}‍️⃣#*0-9]{1,16}$/u
const REPORT_REASONS = ['harassment', 'scam', 'spam', 'nudity', 'violence', 'hate', 'claimed-human', 'other'] as const

interface SocialPlayerLite { name?: string; friends?: Record<string, number>; in?: Record<string, number>; out?: Record<string, number>; blocked?: Record<string, number>; agent?: { char?: true; at?: number }; service?: { kind: string; title: string; about: string } }
type Players = Record<string, SocialPlayerLite>
const playersOf = (db: Db): Players => ((db as unknown as { social?: { players?: Players } }).social?.players ?? {}) as Players

export type FeedService = ReturnType<typeof buildService>
const services = new WeakMap<RouteContext, FeedService>()
export function feedService(ctx: RouteContext): FeedService {
  let found = services.get(ctx)
  if (!found) services.set(ctx, found = buildService(ctx))
  return found
}

function buildService(ctx: RouteContext) {
  const now = (): number => ctx.now()
  const today = (): number => lagosTime(now()).day
  const env = (name: string): string => (typeof ctx.env === 'function' ? ctx.env(name) : '') ?? ''
  /** Public photos and clips: off until the owner decides (there is no automatic scanning). */
  const publicMedia = (): boolean => { const s = ctx.checks?.setting?.('feedPublicMedia'); return typeof s === 'boolean' ? s : env('FEED_PUBLIC_MEDIA').trim().toLowerCase() !== 'off' }
  const mediaOn = (): boolean => Boolean(ctx.models) && env('FEED_MEDIA').trim().toLowerCase() !== 'off'
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  const blocked = (a: string, b: string): boolean => a !== b && ctx.checks?.blocked?.(a, b) === true
  const friends = (db: Db, a: string, b: string): boolean => a !== b && friendsIn(playersOf(db) as never, a, b)
  const aiOf = (db: Db, id: string): boolean => { const p = playersOf(db)[id]; return p?.agent?.char === true || (typeof p?.agent?.at === 'number' && now() - p.agent.at < AGENT_WINDOW_MS) }
  const nameOf = (db: Db, f: FeedCollection | undefined, id: string): string => playersOf(db)[id]?.name ?? f?.authors[id]?.name ?? 'Former player'
  const exists = (db: Db, id: string): boolean => Object.hasOwn(playersOf(db), id)
  const mutedRefusal = (id: string): Refused | null => { const m = ctx.checks?.muted?.(id); return m ? no(m.code, m.reason) : null }
  const screened = (text: string, what: string): Refused | null => { const v = screenText(text, { what, contact: true }); return v ? no(v.code, v.reason) : null }
  /** An AI character's words also pass the AI-safety check (docs/AI-SAFETY.md): no asking for money, contact details or meetings; stricter where a minor may read. */
  const aiRefusal = (db: Db, id: string, text: string, toMinor: boolean, what: string): Refused | null => { if (!text || !aiOf(db, id)) return null; const v = agentWords(text, { toMinor }); return v.ok ? null : no(v.code, `${what}: ${v.reason}`) }
  const place = (city: string, venue?: string, label?: string): FeedPlace => ({ city, cityName: city === 'world' ? 'Allworld' : cityName(city) ?? city, ...(venue ? { venue } : {}), ...(label ? { label } : {}) })

  function author(f: FeedCollection, db: Db, id: string): AuthorRecord {
    const found = f.authors[id]
    if (found) { const live = playersOf(db)[id]?.name; if (live && found.name !== live) found.name = live; return found }
    const made: AuthorRecord = { name: nameOf(db, f, id), first: now() }
    f.authors[id] = made
    return made
  }
  function dayOf(a: AuthorRecord): NonNullable<AuthorRecord['day']> {
    const d = today()
    if (!a.day || a.day.d !== d) a.day = { d, posts: 0, replies: 0, crews: 0, events: 0, gigs: 0, ai: 0 }
    return a.day
  }
  const randomCode = (taken: (code: string) => boolean): string => {
    for (let i = 0; i < 20; i++) {
      const hex = ctx.randomId().replace(/-/g, ''), bytes = Array.from({ length: FEED.codeLength }, (_, j) => parseInt(hex.slice(j * 2, j * 2 + 2), 16))
      const code = codeFrom(bytes)
      if (!taken(code)) return code
    }
    throw ctx.fail(503, 'busy')
  }
  /** A short list of ids on the person's own record (their events and gigs), newest last, so "mine" never scans every event. */
  const remember = (a: AuthorRecord, key: 'events' | 'gigs', id: string): void => { const list = (a[key] ??= []).filter((x) => x !== id); list.push(id); if (list.length > 40) list.splice(0, list.length - 40); a[key] = list }
  const newId = (f: FeedCollection, prefix: string): string => `${prefix}${(++f.seq).toString(36)}${ctx.randomId().slice(0, 4)}`

  /** The location badge while it lasts. */
  const badgeOf = (a: AuthorRecord | undefined): AuthorRecord['located'] => (a?.located && now() - a.located.at < LOCATED.days * 86400000 && cityCatalogueEntry(a.located.city) ? a.located : undefined)
  function person(db: Db, f: FeedCollection | undefined, id: string, viewer: string | null): FeedPerson {
    const a = f?.authors[id], badge = badgeOf(a)
    return { id, name: nameOf(db, f, id), ...(a?.handle ? { handle: a.handle } : {}), ...(a?.portrait ? { portrait: a.portrait.hash } : {}), ...(aiOf(db, id) ? { ai: true as const } : {}), ...(viewer && friends(db, viewer, id) ? { friend: true as const } : {}),
      ...(badge ? { located: { city: badge.city, name: cityCatalogueEntry(badge.city)?.name ?? badge.city, ...(badge.net ? { net: true as const } : {}), ...(badge.lga ? { lga: badge.lga, lgaName: unitName(badge.city, badge.lga) } : {}) } } : {}) }
  }
  /** How near someone's badge is to the viewer's (src/feed/model.ts nearness); `placedIn` is where the thing is (a post's, event's or gig's city). */
  const nearTo = (f: FeedCollection, mine: AuthorRecord['located'], who: string, placedIn?: string): Nearness | null => nearness(mine, badgeOf(f.authors[who]), placedIn)
  /** Does this badge let its holder into a locals-only community of this place? */
  function qualifies(place: CrewRecord['place'], scope: LocalScope, badge: AuthorRecord['located']): boolean {
    const here = badge ? cityCatalogueEntry(badge.city) : null
    if (!here || !place?.real) return false
    if (scope === 'lga') return Boolean(place.city && place.lga) && here.id === place.city && badge?.lga === place.lga
    if (scope === 'city') return Boolean(place.city) && here.id === place.city
    if (scope === 'state') return Boolean(place.state) && here.state.name === place.state && (here.countryName ?? 'Nigeria') === (place.country ?? 'Nigeria')
    return (here.countryName ?? 'Nigeria') === (place.country ?? 'Nigeria')
  }
  const scopeWords = (c: CrewRecord): string => (c.locals === 'lga' && c.place?.city && c.place.lga ? `${unitName(c.place.city, c.place.lga)}, ${cityCatalogueEntry(c.place.city)?.name ?? c.place.city}` : c.locals === 'city' ? cityCatalogueEntry(c.place?.city)?.name ?? 'its city' : c.locals === 'state' ? c.place?.state ?? 'its state' : c.place?.country ?? 'Nigeria')
  function relation(db: Db, f: FeedCollection, post: PostRecord, viewer: string | null): Relation {
    if (!viewer) return { self: false, friend: false, crewMember: false, blocked: false, adult: false, player: false }
    return {
      self: viewer === post.by, friend: friends(db, viewer, post.by), blocked: blocked(viewer, post.by),
      crewMember: Boolean(post.crew && f.crews[post.crew]?.members.includes(viewer)), adult: adult(db, viewer), player: true,
    }
  }

  // ---- inbox ----------------------------------------------------------------------------------------------------------------------
  function tell(db: Db, f: FeedCollection, to: string, line: Omit<InboxLine, 'at'>, push: Push): void {
    if (blocked(to, line.from?.id ?? '') || to === line.from?.id) return
    const a = author(f, db, to), list = (a.inbox ??= [])
    const full: InboxLine = { at: now(), ...line }
    list.push(full)
    if (list.length > FEED.inbox) list.splice(0, list.length - FEED.inbox)
    push.push([to, { type: 'feed-inbox', unseen: unseenOf(a), line: full }])
  }
  const unseenOf = (a: AuthorRecord): number => (a.inbox ?? []).filter((l) => l.at > (a.seenAt ?? 0)).length

  // ---- views ----------------------------------------------------------------------------------------------------------------------
  function reactionsOf(post: PostRecord, viewer: string | null): PostView['reactions'] {
    const counts = new Map<string, number>()
    for (const [who, emoji] of Object.entries(post.rx ?? {})) if (!blocked(who, viewer ?? '')) counts.set(emoji, (counts.get(emoji) ?? 0) + 1)
    const mine = viewer ? post.rx?.[viewer] : undefined
    return [...counts].sort((a, b) => b[1] - a[1]).map(([emoji, count]) => ({ emoji, count, ...(emoji === mine ? { mine: true as const } : {}) }))
  }
  function replyView(db: Db, f: FeedCollection, r: Reply, viewer: string | null): ReplyView {
    return { n: r.n, by: person(db, f, r.by, viewer), at: r.at, body: r.body, ...(viewer === r.by ? { mine: true as const } : {}) }
  }
  function postView(db: Db, f: FeedCollection, post: PostRecord, viewer: string | null, full = false): PostView {
    const rel = relation(db, f, post, viewer)
    const replies = (post.replies ?? []).filter((r) => !r.gone && !blocked(r.by, viewer ?? ''))
    const crew = post.crew ? f.crews[post.crew] : undefined
    const ev = post.ev ? f.events[post.ev] : undefined, gig = post.gig ? f.gigs[post.gig] : undefined
    return {
      id: post.id, by: person(db, f, post.by, viewer), at: post.at, kind: post.kind, body: post.body,
      place: post.place ? place(post.place.city, post.place.venue, post.place.label) : null, vis: post.vis,
      ...(crew ? { crew: { id: crew.id, name: crew.name } } : {}),
      ...(post.media ? { media: post.media } : {}), ...(post.poster ? { poster: post.poster } : {}), ...(post.gist ? { gist: post.gist } : {}),
      ...(ev && !ev.gone ? { event: eventView(db, f, ev, viewer) } : {}), ...(gig ? { gig: gigView(db, f, gig, viewer) } : {}),
      reactions: reactionsOf(post, viewer), replies: replies.length,
      thread: (full ? replies : replies.slice(-3)).map((r) => replyView(db, f, r, viewer)),
      canReply: canReply(post, rel), ...(rel.self ? { mine: true as const } : {}), ...(post.hidden ? { hidden: true as const } : {}), ...(post.ai ? { ai: true as const } : {}),
    }
  }
  /** The community's 3D world: its group's room, and (for members) the room link, when the founder made one and its link is on. */
  function worldOf(db: Db, c: CrewRecord, mine: boolean): CrewView['world'] {
    if (!c.conv) return undefined
    const conv = (db as unknown as { social?: { convs?: Record<string, { kind?: string; members?: string[]; room?: { link?: { key?: string } } }> } }).social?.convs?.[c.conv]
    if (!conv || conv.kind !== 'group') return undefined
    const key = conv.room?.link?.key
    return { room: c.conv, builders: (conv.members ?? []).length, ...(mine && typeof key === 'string' ? { link: roomLinkPath(c.conv, key) } : {}) }
  }
  function crewView(db: Db, f: FeedCollection, c: CrewRecord, viewer: string | null): CrewView {
    const mine = Boolean(viewer && c.members.includes(viewer)), shown = c.members.filter((m) => !blocked(m, viewer ?? ''))
    const mod = Boolean(viewer && (viewer === c.owner || c.mods?.includes(viewer)))
    const world = worldOf(db, c, mine)
    const ordered = c.kind && c.kind !== 'crew' ? [c.owner, ...(c.mods ?? []), ...shown] : shown
    const people = ordered.filter((m, i, all) => all.indexOf(m) === i && !blocked(m, viewer ?? '')).slice(0, FEED.community.shown)
    return { id: c.id, name: c.name, colour: c.colour, about: c.about, at: c.at, owner: person(db, f, c.owner, viewer),
      members: people.map((m) => person(db, f, m, viewer)),
      size: c.members.length, cap: sizeOf(c.kind), mine, owned: viewer === c.owner, mod, kind: c.kind ?? 'crew', kindLabel: COMMUNITY_KINDS.find(([k]) => k === (c.kind ?? 'crew'))?.[1] ?? 'A crew of friends',
      ...(c.place ? { place: { ...c.place, ...(c.place.city && c.place.lga ? { lgaName: unitName(c.place.city, c.place.lga) } : {}) } } : {}), open: c.open === 1, mods: (c.mods ?? []).map((m) => person(db, f, m, viewer)), ...(c.cover ? { cover: c.cover } : {}),
      ...(world ? { world } : {}), ...(mine || c.open ? { code: c.code } : {}),
      ...(c.locals ? { locals: c.locals, qualifies: Boolean(viewer) && qualifies(c.place, c.locals, badgeOf(f.authors[viewer ?? ''])) } : {}) }
  }
  function eventView(db: Db, f: FeedCollection, e: EventRecord, viewer: string | null): EventView {
    const me = viewer && e.going.includes(viewer) ? 'going' : viewer && e.maybe.includes(viewer) ? 'maybe' : null
    return {
      id: e.id, title: e.title, about: e.about, by: person(db, f, e.by, viewer), cohosts: e.cohosts.map((c) => person(db, f, c, viewer)),
      start: e.start, end: e.end, phase: eventPhase(e, now()), place: place(e.city, e.venue, e.label), cap: e.cap,
      going: e.going.length, maybe: e.maybe.length, me, friendsGoing: viewer ? e.going.filter((g) => friends(db, viewer, g)).slice(0, 6).map((g) => person(db, f, g, viewer)) : [],
      code: e.code, mine: viewer === e.by || Boolean(viewer && e.cohosts.includes(viewer)), ...ticketOf(db, e.id, viewer),
    }
  }
  function gigView(db: Db, f: FeedCollection, g: GigRecord, viewer: string | null): GigView {
    const mine = viewer === g.by
    return {
      id: g.id, title: g.title, about: g.about, by: person(db, f, g.by, viewer), city: g.city, cityName: cityName(g.city) ?? g.city, reward: g.reward, at: g.at,
      state: g.state, applicants: g.applicants.length, applied: Boolean(viewer && g.applicants.includes(viewer)),
      ...(g.worker ? { worker: person(db, f, g.worker, viewer) } : {}), mine, ...(gigPaid(db, g.id) !== undefined && (mine || viewer === g.worker) ? { paid: gigPaid(db, g.id)! } : {}),
      ...(mine ? { people: g.applicants.filter((a) => !blocked(a, g.by)).map((a) => person(db, f, a, viewer)) } : {}),
      ...(g.state === 'done' ? { reviewed: { poster: Boolean(g.reviews?.poster), worker: Boolean(g.reviews?.worker) } } : {}),
    }
  }
  function workView(db: Db, f: FeedCollection, id: string, viewer: string | null): WorkView {
    const a = f.authors[id], service = playersOf(db)[id]?.service
    return {
      rating: ratingText(a?.reviews?.sum ?? 0, a?.reviews?.n ?? 0), gigsDone: a?.gigsDone ?? 0,
      vouches: SKILLS.flatMap((skill) => { const ids = (a?.vouches?.[skill] ?? []).filter((v) => !blocked(v, viewer ?? '')); return ids.length ? [{ skill, count: ids.length, ...(viewer && ids.includes(viewer) ? { mine: true as const } : {}) }] : [] }),
      ...(service ? { service: { kind: service.kind, title: service.title, about: service.about } } : {}),
      reviews: (a?.reviews?.recent ?? []).filter((r) => !blocked(r.by, viewer ?? '')).slice(-5).reverse().map((r) => ({ by: person(db, f, r.by, viewer), stars: r.stars, text: r.text, at: r.at })),
    }
  }
  const followable = (db: Db, f: FeedCollection | undefined, id: string): boolean => aiOf(db, id) || f?.authors[id]?.open === 1
  function profileView(db: Db, f: FeedCollection, id: string, viewer: string | null): ProfileView {
    const a = f.authors[id], self = viewer === id
    const mutual = viewer && !self ? Object.keys(playersOf(db)[viewer]?.friends ?? {}).filter((x) => x !== id && friends(db, x, id) && friends(db, viewer, x)).slice(0, 5).map((x) => person(db, f, x, viewer)) : []
    return {
      ...person(db, f, id, viewer),
      ...(a?.bio ? { bio: a.bio } : {}), ...(a?.status ? { status: a.status } : {}),
      followers: followersText(a?.followers ?? 0), following: Boolean(viewer && f.authors[viewer]?.follows?.[id]), followable: !self && followable(db, f, id),
      ...(self || (viewer && friends(db, viewer, id)) ? (a?.code ? { code: a.code } : {}) : {}),
      crews: (a?.crews ?? []).map((c) => f.crews[c]).filter((c): c is CrewRecord => Boolean(c)).map((c) => ({ id: c.id, name: c.name, colour: c.colour })),
      work: workView(db, f, id, viewer), ...(mutual.length ? { mutual } : {}),
      ...(self ? { mine: true as const, canFollowMe: a?.open === 1, ...(a?.handleAt ? { handleChangeAt: a.handleAt + FEED.handleEveryMs } : {}), ...(adult(db, id) ? { adult: true as const } : {}) } : {}),
    }
  }

  // ---- reading the feed -----------------------------------------------------------------------------------------------------------
  /** Cursor: "<at>.<id>" of the last post the client holds; the next page is everything strictly older. */
  const cursorOf = (value: string | null): { at: number; id: string } | null => { if (!value || value.startsWith('r')) return null; const [at, id] = value.split('.'); const n = Number(at); return Number.isFinite(n) && id ? { at: n, id } : null }
  /** A ranked tab pages by position in the ranking ("r20", "r40"): ranking again moves little in a minute, and nothing is skipped. */
  const offsetOf = (value: string | null | undefined): number => { const n = value?.startsWith('r') ? Number(value.slice(1)) : 0; return Number.isSafeInteger(n) && n > 0 && n < 400 ? n : 0 }
  const olderThan = (post: PostRecord, c: { at: number; id: string } | null): boolean => !c || post.at < c.at || (post.at === c.at && post.id < c.id)
  function newsOf(db: Db, city: string, limit: number): NewsLine[] {
    const gist = (db as unknown as { gist?: { cities?: Record<string, { n: number; at: number; city: string; text: string }[]> } }).gist
    const lines = [...(gist?.cities?.[city] ?? []), ...(city === 'world' ? Object.entries(gist?.cities ?? {}).filter(([k]) => k !== 'world').flatMap(([, v]) => v.slice(-3)) : [])]
    return lines.filter((l) => l.at > now() - 3 * 86400000).sort((a, b) => b.at - a.at).slice(0, limit).map((l) => ({ n: l.n, at: l.at, city: l.city, text: l.text }))
  }
  /** The line at the top of Near you: this month's counts at the viewer's badge city and local government (numbers, never who). */
  function nearLine(f: FeedCollection, badge: NonNullable<AuthorRecord['located']>): NearLine {
    const counts = f.here?.m === monthOf(now()) ? f.here.n : {}
    return { city: badge.city, cityName: cityCatalogueEntry(badge.city)?.name ?? badge.city, n: counts[badge.city] ?? 0,
      ...(badge.lga ? { lga: badge.lga, lgaName: unitName(badge.city, badge.lga), lgaN: counts[`${badge.city}/${badge.lga}`] ?? 0 } : {}) }
  }
  function read(db: Db, viewer: string | null, { tab, city, after, crew, by }: { tab: FeedTab | 'crew' | 'author'; city?: string; after?: string | null; crew?: string; by?: string }): FeedPage | Refused {
    const f = peekFeed(db)
    // Near you reads the viewer's badge city (and, below its neighbours, the world); without a badge it is the city tab.
    const mine = tab === 'near' && viewer ? badgeOf(f?.authors[viewer]) : undefined
    const home = tab === 'world' ? 'world' : mine?.city ?? city ?? 'world'
    if (!f) return { ok: true, tab, posts: [], next: null, ...(tab !== 'friends' ? { news: newsOf(db, home, 8) } : {}) }
    const c = cursorOf(after ?? null)
    let ids: string[] = []
    if (tab === 'friends') {
      if (!viewer) return no('session_required', 'Sign in to see your friends.')
      const circle = new Set([viewer, ...Object.keys(playersOf(db)[viewer]?.friends ?? {}).filter((x) => friends(db, viewer, x)), ...Object.keys(f.authors[viewer]?.follows ?? {}), ...(f.authors[viewer]?.crews ?? []).flatMap((k) => f.crews[k]?.members ?? [])])
      for (const id of circle) ids.push(...(f.authors[id]?.posts ?? []).slice(-40))
    } else if (tab === 'city') ids = (f.cities[city ?? '']?.posts ?? []).slice()
    // A public post of the home city is in both lists: once.
    else if (tab === 'near') ids = [...new Set([...(f.cities[home]?.posts ?? []), ...(mine ? f.world : [])])]
    else if (tab === 'world') ids = f.world.slice()
    else if (tab === 'crew') { const k = f.crews[crew ?? '']; if (!k || !viewer || !k.members.includes(viewer)) return no('not_member', 'Only the crew can read its wall.'); ids = k.members.flatMap((m) => (f.authors[m]?.posts ?? []).slice(-60)) }
    else ids = (f.authors[by ?? '']?.posts ?? []).slice()
    const seen = new Set<string>(), candidates: PostRecord[] = []
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      const post = f.posts[id]
      if (!post || !olderThan(post, c) || !canSee(post, relation(db, f, post, viewer))) continue
      if (tab === 'crew' && post.crew !== crew) continue
      if ((tab === 'city' || (tab === 'near' && !mine)) && post.vis === 'crew') continue
      if (tab === 'near' && mine && post.vis !== 'public' && post.vis !== 'city') continue
      candidates.push(post)
    }
    if (tab === 'city' || tab === 'world' || tab === 'near') {
      const offset = offsetOf(after)
      const ranked = rank(candidates.map((p) => ({ post: p, at: p.at, kind: p.kind, replies: p.replies?.length ?? 0, reactions: Object.keys(p.rx ?? {}).length, friend: Boolean(viewer && friends(db, viewer, p.by)), mine: p.by === viewer, ai: p.ai === 1, near: mine ? nearTo(f, mine, p.by, p.place?.city) : null })), now())
      const page = ranked.slice(offset, offset + FEED.page).map((r) => r.post)
      return { ok: true, tab, posts: page.map((p) => postView(db, f, p, viewer)), next: ranked.length > offset + FEED.page ? `r${offset + FEED.page}` : null, ...(!offset ? { news: newsOf(db, home, 8), ...(mine ? { near: nearLine(f, mine) } : {}) } : {}) }
    }
    const ordered = candidates.sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1))
    const page = ordered.slice(0, FEED.page), oldest = page.at(-1)
    return { ok: true, tab, posts: page.map((p) => postView(db, f, p, viewer)), next: ordered.length > FEED.page && oldest ? `${oldest.at}.${oldest.id}` : null }
  }

  // ---- writing posts --------------------------------------------------------------------------------------------------------------
  function indexPost(f: FeedCollection, a: AuthorRecord, post: PostRecord): void {
    const mine = (a.posts ??= []); mine.push(post.id)
    if (mine.length > FEED.authorPosts) for (const old of mine.splice(0, mine.length - FEED.authorPosts)) { const p = f.posts[old]; if (p) dropPost(f, p) }
    const city = post.place?.city
    if (city && post.vis !== 'crew') { const list = (f.cities[city] ??= { posts: [], events: [], gigs: [] }).posts; list.push(post.id); if (list.length > FEED.cityPosts) list.splice(0, list.length - FEED.cityPosts) }
    if (post.vis === 'public') { f.world.push(post.id); if (f.world.length > FEED.worldPosts) f.world.splice(0, f.world.length - FEED.worldPosts) }
  }
  /** Media hashes no longer named by anything: the route deletes their bytes after the commit. */
  const trash: string[] = []
  function dropPost(f: FeedCollection, post: PostRecord): void {
    if (post.media) trash.push(post.media.hash)
    delete f.posts[post.id]
    const strip = (list: string[] | undefined): void => { if (!list) return; const i = list.indexOf(post.id); if (i >= 0) list.splice(i, 1) }
    strip(f.authors[post.by]?.posts); strip(f.world); if (post.place) strip(f.cities[post.place.city]?.posts)
  }
  const takeTrash = (): string[] => trash.splice(0, trash.length)

  function lifePlace(session: SessionRecord): { city: string; venue?: string } {
    const city = session.character?.city && session.cities[session.character.city as keyof typeof session.cities] ? session.character.city : Object.keys(session.cities)[0]
    const life = city ? session.cities[city as keyof typeof session.cities] : undefined
    return city ? { city, ...(life?.state?.location ? { venue: String(life.state.location) } : {}) } : { city: 'world' }
  }

  function createPost(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; post: PostView; push: Push } | Refused {
    const id = session.publicId
    const mute = mutedRefusal(id); if (mute) return mute
    const f = feedOf(ctx, db), a = author(f, db, id), d = dayOf(a)
    if (d.posts >= FEED.postsPerDay) return no('daily_limit', `You can post ${FEED.postsPerDay} times a day. Try again tomorrow.`)
    let text = cleanBody(body.body)
    let kind: PostRecord['kind'] = 'text', gist: number | undefined
    const draftN = Number(body.draft)
    if (Number.isSafeInteger(draftN) && draftN > 0) {
      const draft = (a.drafts ?? []).find((x) => x.n === draftN)
      if (!draft) return no('draft_gone', 'That moment is no longer waiting to be posted.')
      if (draft.kind === 'recap') kind = 'recap'; else { kind = 'moment'; gist = draft.n }
      text = text ? `${draft.text}\n${text}` : draft.text
      a.drafts = (a.drafts ?? []).filter((x) => x.n !== draftN)
    }
    let media: FeedMedia | undefined, posterHash: string | undefined
    if (typeof body.media === 'string' && body.media) {
      if (!mediaOn()) return no('media_off', 'Photos and clips are not switched on here.')
      const found = (a.media ?? []).find((m) => m.hash === body.media && m.use === 'post' && now() - m.at < FEED.media.pendingMs)
      if (!found) return no('media_gone', 'That photo was not found. Add it again.')
      media = { hash: found.hash, type: found.type, w: found.w, h: found.h, ...(found.ms ? { ms: found.ms } : {}) }
      a.media = (a.media ?? []).filter((m) => m !== found)
      // A clip's still (the scene when it started): the reviewer looks at it, and the player shows it before the clip plays.
      if ((found.type === 'webm' || found.type === 'mp4') && typeof body.poster === 'string') { const still = (a.media ?? []).find((m) => m.hash === body.poster && m.use === 'post' && m.type !== 'webm' && m.type !== 'mp4'); if (still) { posterHash = still.hash; a.media = (a.media ?? []).filter((m) => m !== still) } }
      kind = found.type === 'webm' || found.type === 'mp4' ? 'clip' : kind === 'moment' || kind === 'recap' ? kind : 'photo'
    }
    if (!text && !media) return no('empty', 'Write something or add a photo.')
    if (text) { const bad = screened(text, 'Your post') ?? aiRefusal(db, id, text, true, 'Your post'); if (bad) return bad }
    const crewId = typeof body.crew === 'string' ? body.crew : undefined
    const crew = crewId ? f.crews[crewId] : undefined
    if (crewId && (!crew || !crew.members.includes(id))) return no('invalid_crew', 'Choose one of your crews to post to.')
    const vis = allowedVisibility(body.vis, { adult: adult(db, id) || aiOf(db, id), media: Boolean(media), publicMedia: publicMedia(), crew: Boolean(crew) })
    if (typeof vis !== 'string') return vis
    const at = lifePlace(session), label = cleanLine(body.label, FEED.place)
    if (label) { const bad = screened(label, 'The place'); if (bad) return bad }
    const post: PostRecord = { id: newId(f, 'p'), by: id, at: now(), kind, body: text, place: { city: at.city, ...(at.venue ? { venue: at.venue } : {}), ...(label ? { label } : {}) }, vis, ...(crew ? { crew: crew.id } : {}), ...(media ? { media } : {}), ...(posterHash ? { poster: posterHash } : {}), ...(gist ? { gist } : {}), ...(aiOf(db, id) ? { ai: 1 as const } : {}) }
    f.posts[post.id] = post
    indexPost(f, a, post)
    d.posts += 1
    const push: Push = []
    return { ok: true, post: postView(db, f, post, id), push }
  }
  function removePost(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | Refused {
    const f = peekFeed(db), post = f && typeof body.id === 'string' ? f.posts[body.id] : undefined
    if (!f || !post || post.by !== session.publicId) return no('unknown_post', 'That post is not there any more.')
    dropPost(f, post)
    return { ok: true }
  }
  function visiblePost(db: Db, f: FeedCollection | undefined, idValue: unknown, viewer: string | null): PostRecord | Refused {
    const post = f && typeof idValue === 'string' ? f.posts[idValue] : undefined
    if (!f || !post || !canSee(post, relation(db, f, post, viewer))) return no('unknown_post', 'That post is not there any more.')
    return post
  }
  function react(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; post: PostView; push: Push } | Refused {
    const id = session.publicId, f = peekFeed(db), post = visiblePost(db, f, body.id, id)
    if ('ok' in post) return post
    const emoji = body.emoji === null ? null : typeof body.emoji === 'string' && REACTION.test(body.emoji) ? body.emoji : undefined
    if (emoji === undefined) return no('invalid_reaction', 'Choose an emoji.')
    const rx = (post.rx ??= {}), before = rx[id]
    if (emoji === null) delete rx[id]
    else {
      if (!Object.values(rx).includes(emoji) && new Set(Object.values(rx)).size >= FEED.reactionsKinds) return no('too_many_reactions', 'This post has all the kinds of reaction it can hold.')
      rx[id] = emoji
    }
    const push: Push = []
    if (emoji && !before && post.by !== id) tell(db, f!, post.by, { kind: 'reaction', text: `${nameOf(db, f, id)} reacted ${emoji} to your post`, post: post.id, from: person(db, f, id, post.by) }, push)
    return { ok: true, post: postView(db, f!, post, id), push }
  }
  function reply(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; post: PostView; push: Push } | Refused {
    const id = session.publicId, f = peekFeed(db), post = visiblePost(db, f, body.id, id)
    if ('ok' in post) return post
    const mute = mutedRefusal(id); if (mute) return mute
    if (!canReply(post, relation(db, f!, post, id))) return no('cannot_reply', adult(db, id) ? 'Replies to this post are for the author\'s friends.' : 'Until you are confirmed as 18 or older, you can reply to friends and crews only.')
    const text = cleanBody(body.body, FEED.reply)
    if (!text) return no('empty', 'Write a reply.')
    const bad = screened(text, 'Your reply') ?? aiRefusal(db, id, text, !adult(db, post.by), 'Your reply'); if (bad) return bad
    const a = author(f!, db, id), d = dayOf(a)
    if (d.replies >= FEED.repliesPerDay) return no('daily_limit', 'You have replied a lot today. Try again tomorrow.')
    const list = (post.replies ??= [])
    const r: Reply = { n: (post.rn = (post.rn ?? 0) + 1), by: id, at: now(), body: text, ...(aiOf(db, id) ? { ai: 1 as const } : {}) }
    list.push(r)
    if (list.length > FEED.repliesKept) list.splice(0, list.length - FEED.repliesKept)
    d.replies += 1
    const push: Push = []
    const from = (to: string): FeedPerson => person(db, f, id, to)
    if (post.by !== id) tell(db, f!, post.by, { kind: 'reply', text: `${nameOf(db, f, id)} replied: ${text.slice(0, 60)}`, post: post.id, from: from(post.by) }, push)
    // Mentions: @handle of someone who can see the post.
    for (const m of new Set([...text.matchAll(/@([a-z][a-z0-9._]{2,19})/g)].map((x) => x[1]!)).values()) {
      const target = f!.handles[m]
      if (target && target !== id && target !== post.by && canSee(post, relation(db, f!, post, target))) tell(db, f!, target, { kind: 'mention', text: `${nameOf(db, f, id)} mentioned you`, post: post.id, from: from(target) }, push)
    }
    return { ok: true, post: postView(db, f!, post, id, true), push }
  }
  function removeReply(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | Refused {
    const f = peekFeed(db), post = f && typeof body.id === 'string' ? f.posts[body.id] : undefined, n = Number(body.n)
    const r = post?.replies?.find((x) => x.n === n)
    if (!post || !r || (r.by !== session.publicId && post.by !== session.publicId)) return no('unknown_reply', 'That reply is not there any more.')
    post.replies = post.replies!.filter((x) => x !== r)
    return { ok: true }
  }
  function thread(db: Db, viewer: string | null, idValue: unknown): { ok: true; post: PostView } | Refused {
    const f = peekFeed(db), post = visiblePost(db, f, idValue, viewer)
    return 'ok' in post ? post : { ok: true, post: postView(db, f!, post, viewer, true) }
  }

  // ---- media ----------------------------------------------------------------------------------------------------------------------
  function noteMedia(db: Db, session: SessionRecord, media: FeedMedia, use: 'post' | 'portrait'): { ok: true; media: FeedMedia } | Refused {
    const f = feedOf(ctx, db), a = author(f, db, session.publicId)
    const list = (a.media ??= []).filter((m) => now() - m.at < FEED.media.pendingMs)
    for (const old of list.splice(0, Math.max(0, list.length - FEED.media.pending + 1))) trash.push(old.hash)
    list.push({ ...media, at: now(), use })
    a.media = list
    if (use === 'portrait') {
      if (a.portrait && a.portrait.hash !== media.hash) trash.push(a.portrait.hash)
      a.portrait = { hash: media.hash, at: now(), type: media.type === 'png' || media.type === 'webp' ? media.type : 'jpeg' }
      a.media = list.filter((m) => m.hash !== media.hash)
    }
    return { ok: true, media }
  }
  /** May this viewer have the bytes of this hash? Portraits are public; post media follows its post. */
  function mediaAllowed(db: Db, viewer: string | null, hash: string): FeedMedia | null {
    const f = peekFeed(db)
    if (!f || !HASH.test(hash)) return null
    if (viewer) { const own = f.authors[viewer]?.media?.find((m) => m.hash === hash); if (own) return own }
    for (const id of [...f.world.slice(-200), ...(viewer ? f.authors[viewer]?.posts ?? [] : [])]) { const p = f.posts[id]; if ((p?.media?.hash === hash || p?.poster === hash) && canSee(p, relation(db, f, p, viewer))) return p.poster === hash ? { hash, type: 'jpeg', w: p.media?.w ?? 0, h: p.media?.h ?? 0 } : p.media! }
    // Wider search, bounded: the viewer's circle.
    if (viewer) for (const other of Object.keys(playersOf(db)[viewer]?.friends ?? {}).concat((f.authors[viewer]?.crews ?? []).flatMap((c) => f.crews[c]?.members ?? []))) for (const id of (f.authors[other]?.posts ?? []).slice(-60)) { const p = f.posts[id]; if ((p?.media?.hash === hash || p?.poster === hash) && canSee(p, relation(db, f, p, viewer))) return p.poster === hash ? { hash, type: 'jpeg', w: p.media?.w ?? 0, h: p.media?.h ?? 0 } : p.media! }
    return null
  }
  const portraitOf = (db: Db, id: string): { hash: string; type: 'png' | 'webp' | 'jpeg' } | null => peekFeed(db)?.authors[id]?.portrait ?? null

  // ---- the weekly recap (a draft, like a moment) ----------------------------------------------------------------------------------
  /** Drafts above this are recaps: RECAP_BASE + the Lagos week. Gist numbers never reach it. */
  const RECAP_BASE = 1_000_000_000
  function recapDraft(f: FeedCollection, a: AuthorRecord, id: string): void {
    const t = now(), week = lagosTime(t).week, n = RECAP_BASE + week
    if ((a.drafts ?? []).some((d) => d.n === n) || a.recapWeek === week) return
    const since = t - 7 * 86400000
    const posts = (a.posts ?? []).map((p) => f.posts[p]).filter((p): p is PostRecord => Boolean(p) && p!.at >= since && p!.kind !== 'recap')
    const went = (a.events ?? []).map((k) => f.events[k]).filter((e): e is EventRecord => Boolean(e) && !e!.gone && e!.end >= since && e!.end <= t && e!.going.includes(id))
    const done = (a.gigs ?? []).map((k) => f.gigs[k]).filter((g): g is GigRecord => Boolean(g) && g!.worker === id && (g!.doneAt ?? 0) >= since)
    const replies = posts.reduce((sum, p) => sum + (p.replies?.length ?? 0), 0)
    if (!posts.length && !went.length && !done.length) return
    const places = new Map<string, number>()
    for (const p of posts) { const where = p.place?.label || (p.place?.city && p.place.city !== 'world' ? cityName(p.place.city) ?? '' : ''); if (where) places.set(where, (places.get(where) ?? 0) + 1) }
    const top = [...places].sort((x, y) => y[1] - x[1])[0]?.[0]
    const bits = [posts.length ? `${posts.length} post${posts.length === 1 ? '' : 's'}` : '', replies ? `${replies} repl${replies === 1 ? 'y' : 'ies'}` : '', went.length ? `${went.length} event${went.length === 1 ? '' : 's'} (${went.slice(0, 2).map((e) => e.title).join(', ')})` : '', done.length ? `${done.length} gig${done.length === 1 ? '' : 's'} done` : ''].filter(Boolean)
    const text = `My week on Allworld: ${bits.join(', ')}.${top ? ` Mostly around ${top}.` : ''}`.slice(0, FEED.body)
    const drafts = (a.drafts ??= []).filter((d) => d.n < RECAP_BASE)
    drafts.push({ n, at: t, city: posts[0]?.place?.city ?? 'world', kind: 'recap', text })
    a.drafts = drafts.slice(-FEED.drafts)
    a.recapWeek = week
  }

  // ---- profile --------------------------------------------------------------------------------------------------------------------
  function me(db: Db, session: SessionRecord): FeedMe {
    const f = feedOf(ctx, db), id = session.publicId, a = author(f, db, id)
    a.drafts = (a.drafts ?? []).filter((x) => now() - x.at < FEED.draftMs)
    recapDraft(f, a, id)
    if (!a.code) { a.code = randomCode((c) => Object.hasOwn(f.codes, c)); f.codes[a.code] = { k: 'friend', id } }
    return {
      profile: profileView(db, f, id, id), drafts: (a.drafts ?? []).slice().reverse() as Draft[], inbox: (a.inbox ?? []).slice().reverse().map((l) => (l.at <= (a.seenAt ?? 0) ? { ...l, seen: true as const } : l)),
      unseen: unseenOf(a), crews: (a.crews ?? []).map((c) => f.crews[c]).filter((c): c is CrewRecord => Boolean(c)).map((c) => crewView(db, f, c, id)),
      publicMedia: publicMedia(), media: mediaOn(),
    }
  }
  function seen(db: Db, session: SessionRecord): { ok: true; push: Push } {
    const f = feedOf(ctx, db), a = author(f, db, session.publicId)
    a.seenAt = now()
    return { ok: true, push: [[session.publicId, { type: 'feed-inbox', unseen: 0 }]] }
  }
  function editProfile(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; profile: ProfileView } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id)
    const mute = mutedRefusal(id); if (mute) return mute
    if ('bio' in body) {
      const bio = cleanLine(body.bio, FEED.bio)
      if (bio) { const bad = screened(bio, 'Your bio'); if (bad) return bad; a.bio = bio } else delete a.bio
    }
    if ('status' in body) {
      const text = cleanLine(body.status, FEED.status)
      if (text) {
        const bad = screened(text, 'Your status'); if (bad) return bad
        const where = lifePlace(session)
        a.status = { text, at: now(), ...(body.withPlace !== false && where.city !== 'world' ? { place: cityName(where.city) ?? where.city } : {}) }
      } else delete a.status
    }
    if ('open' in body) {
      if (body.open === true) { if (!adult(db, id) && !aiOf(db, id)) return no('adults_only', 'Only players confirmed as 18 or older can let anyone follow them.'); a.open = 1 }
      else delete a.open
    }
    return { ok: true, profile: profileView(db, f, id, id) }
  }
  function setHandle(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; profile: ProfileView } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id)
    const refusal = handleRefusal(body.handle); if (refusal) return refusal
    const handle = cleanHandle(body.handle)!
    if (a.handle === handle) return { ok: true, profile: profileView(db, f, id, id) }
    if (a.handleAt && now() - a.handleAt < FEED.handleEveryMs) return no('too_soon', 'You can change your handle once a month.')
    const bad = screened(handle.replace(/[._]/g, ' '), 'That handle'); if (bad) return bad
    if (f.handles[handle] && f.handles[handle] !== id) return no('handle_taken', `@${handle} is taken. Try another.`)
    if (a.handle) delete f.handles[a.handle]
    f.handles[handle] = id; a.handle = handle; a.handleAt = now()
    return { ok: true, profile: profileView(db, f, id, id) }
  }
  /** `@handle`, a public id, or a friend code. */
  function resolve(db: Db, value: unknown): string | null {
    const f = peekFeed(db)
    if (typeof value !== 'string') return null
    if (value.startsWith('@')) { const h = cleanHandle(value); return h && f?.handles[h] ? f.handles[h]! : null }
    if (UUID.test(value)) return exists(db, value) ? value : null
    const code = cleanCode(value), hit = code ? f?.codes[code] : undefined
    return hit?.k === 'friend' ? hit.id : null
  }
  function profile(db: Db, viewer: string | null, value: unknown): { ok: true; profile: ProfileView } | Refused {
    const id = resolve(db, value)
    if (!id || (viewer && blocked(viewer, id))) return no('unknown_player', 'That person was not found.')
    const f = peekFeed(db) ?? ({ authors: {}, crews: {}, posts: {}, world: [], cities: {}, handles: {}, codes: {}, events: {}, gigs: {}, reports: [], seq: 0, v: 1 } as FeedCollection)
    return { ok: true, profile: profileView(db, f, id, viewer) }
  }
  function code(db: Db, value: unknown, viewer: string | null): { ok: true; kind: 'friend' | 'crew' | 'event'; profile?: ProfileView; crew?: CrewView; event?: EventView } | Refused {
    const f = peekFeed(db), c = cleanCode(value), hit = c ? f?.codes[c] : undefined
    if (!f || !hit) return no('unknown_code', 'That code was not found. Check the six letters.')
    if (hit.k === 'friend') { if (viewer && blocked(viewer, hit.id)) return no('unknown_code', 'That code was not found. Check the six letters.'); return { ok: true, kind: 'friend', profile: profileView(db, f, hit.id, viewer) } }
    if (hit.k === 'crew') { const k = f.crews[hit.id]; return k && !k.banned ? { ok: true, kind: 'crew', crew: crewView(db, f, k, viewer) } : no('unknown_code', 'That crew is gone.') }
    const e = f.events[hit.id]; return e && !e.gone ? { ok: true, kind: 'event', event: eventView(db, f, e, viewer) } : no('unknown_code', 'That event is gone.')
  }

  // ---- follow and suggestions -----------------------------------------------------------------------------------------------------
  function follow(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; profile: ProfileView; push: Push } | Refused {
    const id = session.publicId, target = typeof body.id === 'string' ? body.id : ''
    if (!exists(db, target) || target === id || blocked(id, target)) return no('unknown_player', 'That person was not found.')
    const f = feedOf(ctx, db), a = author(f, db, id), t = author(f, db, target), follows = (a.follows ??= {})
    const push: Push = []
    if (body.on === false) { if (follows[target]) { delete follows[target]; t.followers = Math.max(0, (t.followers ?? 1) - 1) } }
    else {
      if (!followable(db, f, target)) return no('not_followable', 'This person has not opened their profile to followers. Add them as a friend instead.')
      if (!follows[target]) {
        if (Object.keys(follows).length >= FEED.follows) return no('too_many', `You follow ${FEED.follows} people, the most you can.`)
        follows[target] = now(); t.followers = (t.followers ?? 0) + 1
        tell(db, f, target, { kind: 'follow', text: `${nameOf(db, f, id)} followed you`, from: person(db, f, id, target) }, push)
      }
    }
    return { ok: true, profile: profileView(db, f, target, id), push }
  }
  function suggestions(db: Db, session: SessionRecord): { ok: true; people: Suggestion[] } {
    const id = session.publicId, players = playersOf(db), me = players[id], f = peekFeed(db)
    const mine = new Set(Object.keys(me?.friends ?? {}).filter((x) => friends(db, id, x)))
    const skip = (x: string): boolean => x === id || mine.has(x) || blocked(id, x) || Boolean(me?.out?.[x] || me?.in?.[x]) || !exists(db, x)
    const score = new Map<string, { mutual: number; why: string; points: number }>()
    const add = (x: string, points: number, why: string, mutual = 0): void => { if (skip(x)) return; const s = score.get(x) ?? { mutual: 0, why, points: 0 }; s.points += points; s.mutual += mutual; if (points >= 2 || !s.why) s.why = why; score.set(x, s) }
    for (const friend of mine) for (const x of Object.keys(players[friend]?.friends ?? {})) if (friends(db, friend, x)) add(x, 3, 'Friends with people you know', 1)
    for (const k of f?.authors[id]?.crews ?? []) for (const x of f?.crews[k]?.members ?? []) add(x, 4, `In your crew ${f?.crews[k]?.name ?? ''}`.trim())
    // Matched from contacts both ways (server/feed/contacts.ts): high, after a waiting request.
    for (const x of ((db as unknown as { contacts?: { found?: Record<string, { ids: string[] }> } }).contacts?.found?.[id]?.ids ?? [])) add(x, 20, 'In your contacts')
    // Asked you for friendship already: shown first.
    for (const x of Object.keys(me?.in ?? {})) if (!blocked(id, x) && exists(db, x) && !mine.has(x)) score.set(x, { mutual: 0, why: 'Asked to be your friend', points: 100 })
    // Active posters in the player's city, when there is little else.
    if (score.size < FEED.suggestions && f) {
      const city = lifePlace(session).city
      for (const pid of (f.cities[city]?.posts ?? []).slice(-60)) { const p = f.posts[pid]; if (p && p.vis === 'public' && !p.ai) add(p.by, 1, 'Posts in your city') }
    }
    for (const [x, s] of score) if (s.mutual > 1) s.why = `${s.mutual} mutual friends`
    const people = [...score].sort((a, b) => b[1].points - a[1].points).slice(0, FEED.suggestions).map(([x, s]) => ({ person: person(db, f, x, id), why: s.why, mutual: s.mutual }))
    return { ok: true, people }
  }

  // ---- crews ----------------------------------------------------------------------------------------------------------------------
  function createCrew(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; crew: CrewView } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id), d = dayOf(a)
    const name = cleanCrewName(body.name); if (!name) return no('invalid_name', `A crew name is ${FEED.crew.nameMin} to ${FEED.crew.nameMax} letters.`)
    const bad = screened(name, 'That name'); if (bad) return bad
    const about = cleanLine(body.about, FEED.crew.about); if (about) { const b = screened(about, 'The description'); if (b) return b }
    if ((a.crews ?? []).length >= FEED.crew.perPlayer) return no('too_many', `You are in ${FEED.crew.perPlayer} crews, the most you can be in.`)
    if (d.crews >= FEED.crew.createPerDay) return no('daily_limit', 'You have made enough crews today.')
    const colour = colourOk(body.colour) ? body.colour : 'gold'
    const kind = isCommunityKind(body.kind) ? body.kind : 'crew'
    if (kind !== 'crew' && !adult(db, id) && !aiOf(db, id)) return no('adults_only', 'Starting a community is for players confirmed as 18 or older. You can start a crew of friends.')
    // A real place from the catalogue (bringing in a city or a state the game knows), or one the founder imagined.
    let place: CrewRecord['place'] | undefined
    const real = cityCatalogueEntry(body.city)
    if (real) {
      // Its local government (one of the city's local units, the route loads them first), for a neighbours' community.
      const unit = unitOf(real.id, body.lga)
      if (typeof body.lga === 'string' && body.lga && !unit) return no('unknown_area', 'That area is not part of this city.')
      place = { city: real.id, state: real.state.name, ...(real.countryName ? { country: real.countryName } : {}), real: 1, ...(unit ? { lga: unit.id } : {}) }
    }
    else if (typeof body.state === 'string') { const st = cityCatalogue().find((x) => x.state.id === body.state); if (st) place = { state: st.state.name, ...(st.countryName ? { country: st.countryName } : {}), real: 1 } }
    if (!place && typeof body.placeName === 'string') { const pn = cleanLine(body.placeName, 40); if (pn) { const bad = screened(pn, 'The place'); if (bad) return bad; place = { name: pn } } }
    const locals = kind !== 'crew' && place?.real && isLocalScope(body.locals) && (body.locals !== 'city' || place.city) && (body.locals !== 'lga' || place.lga) ? body.locals : undefined
    if (locals && !qualifies(place, locals, badgeOf(a))) return no('badge_needed', 'To keep it for locals, first confirm where you are in My profile: your own badge must be in that place.')
    let cover: string | undefined
    if (typeof body.cover === 'string' && body.cover) { const m = (a.media ?? []).find((x) => x.hash === body.cover && x.use === 'post' && x.type !== 'webm' && x.type !== 'mp4'); if (m) { cover = m.hash; a.media = (a.media ?? []).filter((x) => x !== m) } }
    const crew: CrewRecord = { id: newId(f, 'c'), name, colour, about, owner: id, members: [id], code: randomCode((c) => Object.hasOwn(f.codes, c)), at: now(), ...(kind !== 'crew' ? { kind } : {}), ...(place ? { place } : {}), ...(locals ? { locals } : {}), ...(body.open === true && kind !== 'crew' ? { open: 1 as const } : {}), ...(cover ? { cover } : {}) }
    f.crews[crew.id] = crew; f.codes[crew.code] = { k: 'crew', id: crew.id }
    ;(a.crews ??= []).push(crew.id); d.crews += 1
    if (kind !== 'crew') { const home = place?.city ?? lifePlace(session).city, lists = (f.cities[home] ??= { posts: [], events: [], gigs: [] }); const list = (lists.communities ??= []); list.push(crew.id); if (list.length > 500) list.splice(0, list.length - 500) }
    return { ok: true, crew: crewView(db, f, crew, id) }
  }
  function joinCrew(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; crew: CrewView; push: Push } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), c = cleanCode(body.code), hit = c ? f.codes[c] : undefined
    const byId = typeof body.id === 'string' ? f.crews[body.id] : undefined
    const crew = hit?.k === 'crew' ? f.crews[hit.id] : byId?.open ? byId : undefined
    if (!crew || crew.banned) return no('unknown_code', 'That link was not found.')
    if (crew.members.includes(id)) return { ok: true, crew: crewView(db, f, crew, id), push: [] }
    if (crew.kicked?.[id] && now() - crew.kicked[id]! < 7 * 86400000) return no('not_allowed', 'You were asked to leave this crew. You can come back after a week.')
    if (crew.members.some((m) => blocked(m, id))) return no('not_allowed', 'You cannot join this crew.')
    if (crew.members.length >= sizeOf(crew.kind)) return no('crew_full', `It has ${sizeOf(crew.kind)} members, the most it can hold.`)
    const a = author(f, db, id)
    if (crew.locals && !qualifies(crew.place, crew.locals, badgeOf(a))) return no('locals_only', `${crew.name} is for people in ${scopeWords(crew)}. Confirm where you are in My profile (your device checks it; your position is never sent), then join.`)
    if ((a.crews ?? []).length >= FEED.crew.perPlayer) return no('too_many', `You are in ${FEED.crew.perPlayer} crews, the most you can be in.`)
    crew.members.push(id); (a.crews ??= []).push(crew.id)
    const push: Push = []
    for (const m of crew.kind && crew.kind !== 'crew' ? [crew.owner, ...(crew.mods ?? [])] : crew.members) if (m !== id) tell(db, f, m, { kind: 'crew', text: `${nameOf(db, f, id)} joined ${crew.name}`, from: person(db, f, id, m) }, push)
    return { ok: true, crew: crewView(db, f, crew, id), push }
  }
  function leaveCrew(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | Refused {
    const id = session.publicId, f = peekFeed(db), crew = f && typeof body.id === 'string' ? f.crews[body.id] : undefined
    const target = typeof body.member === 'string' ? body.member : id
    if (!f || !crew || !crew.members.includes(target)) return no('unknown_crew', 'That crew was not found.')
    if (target !== id && crew.owner !== id && !(crew.mods?.includes(id) && target !== crew.owner && !crew.mods.includes(target))) return no('not_owner', 'Only the founder or a moderator can ask someone to leave.')
    removeFromCrew(f, crew, target)
    if (target !== id) (crew.kicked ??= {})[target] = now()
    return { ok: true }
  }
  function removeFromCrew(f: FeedCollection, crew: CrewRecord, id: string): void {
    crew.members = crew.members.filter((m) => m !== id)
    if (crew.mods) crew.mods = crew.mods.filter((m) => m !== id)
    const a = f.authors[id]; if (a?.crews) a.crews = a.crews.filter((c) => c !== crew.id)
    if (!crew.members.length) { delete f.codes[crew.code]; delete f.crews[crew.id]; return }
    if (crew.owner === id) crew.owner = crew.members[0]!
  }
  function crew(db: Db, viewer: string | null, idValue: unknown): { ok: true; crew: CrewView } | Refused {
    const f = peekFeed(db), c = f && typeof idValue === 'string' ? f.crews[idValue] : undefined
    return f && c ? { ok: true, crew: crewView(db, f, c, viewer) } : no('unknown_crew', 'That crew was not found.')
  }

  /** Open communities of a city (where a community's real place is, or its founder lives), newest first; `kind` narrows them. */
  function discover(db: Db, viewer: string | null, city: string, kind: string | null): { ok: true; communities: CrewView[] } {
    const f = peekFeed(db)
    if (!f) return { ok: true, communities: [] }
    const list = (f.cities[city]?.communities ?? []).slice().reverse().map((k) => f.crews[k]).filter((c): c is CrewRecord => Boolean(c) && !c!.banned && c!.open === 1 && (!kind || c!.kind === kind) && !blocked(viewer ?? '', c!.owner))
    return { ok: true, communities: list.slice(0, FEED.community.directory).map((c) => crewView(db, f, c, viewer)) }
  }
  /** The founder names or removes a moderator (a member). */
  /** The founder keeps a community for locals (local government, city, state or country of its real place) or opens it to all again. Members stay. */
  function setLocals(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; crew: CrewView } | Refused {
    const id = session.publicId, f = peekFeed(db), crew = f && typeof body.id === 'string' ? f.crews[body.id] : undefined
    if (!f || !crew || crew.owner !== id) return no('not_owner', 'Only the founder decides who may join.')
    if (body.locals === null || body.locals === 'all') { delete crew.locals; return { ok: true, crew: crewView(db, f, crew, id) } }
    if (!isLocalScope(body.locals) || !crew.place?.real || (body.locals === 'city' && !crew.place.city) || (body.locals === 'lga' && !crew.place.lga)) return no('invalid_scope', 'Only a community based on a real place can be kept for its locals.')
    if (!qualifies(crew.place, body.locals, badgeOf(f.authors[id]))) return no('badge_needed', 'First confirm where you are in My profile: your own badge must be in that place.')
    crew.locals = body.locals
    return { ok: true, crew: crewView(db, f, crew, id) }
  }
  /**
   * The location badge. The device found itself in `city` (the position stayed on it), and maybe in `lga`, one of that city's local units
   * (the route loads the city's rules first); `country` is the network's two-letter country as the host saw this request (Cloudflare),
   * compared with the city's and kept only as yes. `on: false` removes it. Each change keeps this month's counts (countHere) right.
   */
  function setLocated(db: Db, session: SessionRecord, body: Record<string, unknown>, country: string): { ok: true; profile: ProfileView } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id)
    if (body.on === false) { uncount(f, a.located, now()); delete a.located; return { ok: true, profile: profileView(db, f, id, id) } }
    if (!adult(db, id)) return no('adults_only', 'The location badge is for players confirmed as 18 or older.')
    const city = cityCatalogueEntry(body.city)
    if (!city) return no('unknown_city', 'That place is not on the world map.')
    // A local unit the city does not have is refused; one the server cannot check (the city's rules did not load) is left out.
    const unit = unitOf(city.id, body.lga)
    if (typeof body.lga === 'string' && body.lga && !unit && cityRules(city.id)) return no('unknown_area', 'That area is not part of this city.')
    const day = String(today())
    if (a.locatedDay?.day !== day) a.locatedDay = { day, n: 0 }
    if (a.locatedDay.n >= LOCATED.perDay) return no('daily_limit', 'You have checked enough times today. Try again tomorrow.')
    a.locatedDay.n += 1
    const iso = (city.countryISO ?? 'ng').toLowerCase(), net = /^[A-Za-z]{2}$/.test(country) && country.toLowerCase() === iso
    uncount(f, a.located, now())
    a.located = { city: city.id, at: now(), ...(net ? { net: 1 as const } : {}), ...(unit ? { lga: unit.id } : {}) }
    countHere(f, a.located, 1, now())
    return { ok: true, profile: profileView(db, f, id, id) }
  }
  function setMod(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; crew: CrewView } | Refused {
    const id = session.publicId, f = peekFeed(db), crew = f && typeof body.id === 'string' ? f.crews[body.id] : undefined, member = typeof body.member === 'string' ? body.member : ''
    if (!f || !crew || crew.owner !== id) return no('not_owner', 'Only the founder names moderators.')
    if (!crew.members.includes(member) || member === id) return no('not_member', 'Choose a member.')
    const mods = (crew.mods ?? []).filter((m) => m !== member)
    if (body.on !== false) { if (mods.length >= FEED.community.mods) return no('too_many', `A community has at most ${FEED.community.mods} moderators.`); mods.push(member) }
    crew.mods = mods
    return { ok: true, crew: crewView(db, f, crew, id) }
  }
  /** Give the community its world: a group chat its founder made (and owns), whose room is the 3D world. Its link lets members in. */
  function attachWorld(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; crew: CrewView } | Refused {
    const id = session.publicId, f = peekFeed(db), crew = f && typeof body.id === 'string' ? f.crews[body.id] : undefined
    if (!f || !crew || crew.owner !== id) return no('not_owner', 'Only the founder gives the community its world.')
    const conv = typeof body.conv === 'string' ? body.conv : ''
    const group = (db as unknown as { social?: { convs?: Record<string, { kind?: string; owner?: string }> } }).social?.convs?.[conv]
    if (!/^g\.\d{1,15}$/.test(conv) || !group || group.kind !== 'group' || group.owner !== id) return no('not_your_group', 'Choose a group chat you created.')
    if (Object.values(f.crews).some((c) => c !== crew && c.conv === conv)) return no('group_taken', 'That group already belongs to another community.')
    crew.conv = conv
    return { ok: true, crew: crewView(db, f, crew, id) }
  }

  // ---- events ---------------------------------------------------------------------------------------------------------------------
  function createEvent(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; event: EventView; post: PostView | null } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id), d = dayOf(a)
    const mute = mutedRefusal(id); if (mute) return mute
    const title = cleanLine(body.title, FEED.event.title); if (title.length < 3) return no('invalid_title', 'Give the event a name.')
    const about = cleanBody(body.about, FEED.event.about)
    for (const [text, what] of [[title, 'The title'], [about, 'The description']] as const) if (text) { const bad = screened(text, what) ?? aiRefusal(db, id, text, true, what); if (bad) return bad }
    if (d.events >= FEED.event.perDay) return no('daily_limit', 'You have planned enough events today.')
    const timing = eventTiming(body.start, body.hours, now()); if ('ok' in timing) return timing
    const where = lifePlace(session), city = typeof body.city === 'string' && ctx.cityIds.includes(body.city as never) ? body.city : where.city
    const label = cleanLine(body.place, FEED.place) || 'The Square'; { const bad = screened(label, 'The place'); if (bad) return bad }
    const cap = Math.max(2, Math.min(FEED.event.cap, Math.round(Number(body.cap) || 50)))
    const cohosts = (Array.isArray(body.cohosts) ? body.cohosts : []).filter((x): x is string => typeof x === 'string' && friends(db, id, x)).slice(0, FEED.event.cohosts)
    const event: EventRecord = { id: newId(f, 'e'), by: id, title, about, city, label, start: timing.start, end: timing.end, cap, going: [id], maybe: [], cohosts, code: randomCode((c) => Object.hasOwn(f.codes, c)), at: now() }
    f.events[event.id] = event; f.codes[event.code] = { k: 'event', id: event.id }
    remember(a, 'events', event.id)
    const lists = (f.cities[city] ??= { posts: [], events: [], gigs: [] }); lists.events.push(event.id); if (lists.events.length > FEED.event.upcoming) lists.events.splice(0, lists.events.length - FEED.event.upcoming)
    d.events += 1
    // The event is also a post in the city, so the feed carries the invitation (friends only for a player under 18).
    let view: PostView | null = null
    if (d.posts < FEED.postsPerDay) {
      const vis: Visibility = adult(db, id) || aiOf(db, id) ? 'public' : 'friends'
      const post: PostRecord = { id: newId(f, 'p'), by: id, at: now(), kind: 'event', body: about, place: { city, label }, vis, ev: event.id, ...(aiOf(db, id) ? { ai: 1 as const } : {}) }
      f.posts[post.id] = post; indexPost(f, a, post); event.post = post.id; d.posts += 1
      view = postView(db, f, post, id)
    }
    return { ok: true, event: eventView(db, f, event, id), post: view }
  }
  function rsvp(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; event: EventView; push: Push } | Refused {
    const id = session.publicId, f = peekFeed(db), e = f && typeof body.id === 'string' ? f.events[body.id] : undefined
    if (!f || !e || e.gone || blocked(id, e.by)) return no('unknown_event', 'That event was not found.')
    if (eventPhase(e, now()) === 'over') return no('event_over', 'That event has ended.')
    const answer = body.answer === 'going' || body.answer === 'maybe' ? body.answer : null
    const was = e.going.includes(id) ? 'going' : e.maybe.includes(id) ? 'maybe' : null
    if (id === e.by && answer !== 'going') return no('host', 'You are hosting this event. Cancel it instead.')
    if (answer === 'going' && was !== 'going' && id !== e.by && !e.cohosts.includes(id) && needsTicket(db, e.id, id)) return no('ticket_needed', 'This event has tickets. Buy one to go.')
    e.going = e.going.filter((x) => x !== id); e.maybe = e.maybe.filter((x) => x !== id)
    if (answer === 'going') { if (e.going.length >= e.cap) { if (was === 'maybe') e.maybe.push(id); return no('event_full', 'This event is full.') } e.going.push(id) }
    if (answer === 'maybe') e.maybe.push(id)
    if (answer) remember(author(f, db, id), 'events', e.id)
    const push: Push = []
    if (answer === 'going' && was !== 'going') tell(db, f, e.by, { kind: 'rsvp', text: `${nameOf(db, f, id)} is coming to ${e.title}`, ...(e.post ? { post: e.post } : {}), from: person(db, f, id, e.by) }, push)
    return { ok: true, event: eventView(db, f, e, id), push }
  }
  function cancelEvent(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; push: Push } | Refused {
    const id = session.publicId, f = peekFeed(db), e = f && typeof body.id === 'string' ? f.events[body.id] : undefined
    if (!f || !e || e.gone || (e.by !== id)) return no('unknown_event', 'That event was not found.')
    e.gone = 1; delete f.codes[e.code]
    const push: Push = []
    for (const g of [...e.going, ...e.maybe]) if (g !== id) tell(db, f, g, { kind: 'rsvp', text: `${e.title} was called off`, from: person(db, f, id, g) }, push)
    if (e.post) { const p = f.posts[e.post]; if (p) dropPost(f, p) }
    return { ok: true, push }
  }
  function events(db: Db, viewer: string | null, city: string): { ok: true; events: EventView[]; mine: EventView[] } {
    const f = peekFeed(db)
    if (!f) return { ok: true, events: [], mine: [] }
    const list = (f.cities[city]?.events ?? []).map((k) => f.events[k]).filter((e): e is EventRecord => Boolean(e) && !e!.gone && eventPhase(e!, now()) !== 'over' && !blocked(viewer ?? '', e!.by))
    const mine = viewer ? (f.authors[viewer]?.events ?? []).map((k) => f.events[k]).filter((e): e is EventRecord => Boolean(e) && !e!.gone && eventPhase(e!, now()) !== 'over' && (e!.going.includes(viewer) || e!.maybe.includes(viewer))) : []
    // Near you first: events hosted by someone with a badge in the viewer's local government (or held at a place named after it), then in
    // the viewer's badge city; soonest first within each.
    const badge = viewer ? badgeOf(f.authors[viewer]) : undefined, area = badge?.lga ? unitName(badge.city, badge.lga).toLowerCase() : ''
    const near = (e: EventRecord): Nearness | null => (badge && area && e.city === badge.city && `${e.label} ${e.venue ?? ''}`.toLowerCase().includes(area) ? 'lga' : nearTo(f, badge, e.by, e.city))
    return { ok: true, events: nearFirst(list.sort((a, b) => a.start - b.start), near).map((e) => eventView(db, f, e, viewer)), mine: mine.sort((a, b) => a.start - b.start).slice(0, 20).map((e) => eventView(db, f, e, viewer)) }
  }
  function event(db: Db, viewer: string | null, value: unknown): { ok: true; event: EventView } | Refused {
    const f = peekFeed(db)
    const e = f ? (typeof value === 'string' && f.events[value]) || (() => { const c = cleanCode(value), hit = c ? f.codes[c] : undefined; return hit?.k === 'event' ? f.events[hit.id] : undefined })() : undefined
    return f && e && !e.gone ? { ok: true, event: eventView(db, f, e, viewer) } : no('unknown_event', 'That event was not found.')
  }
  /** Heartbeat: a line in the inbox of everyone going, about 30 minutes before. Bounded per beat. */
  function remind(db: Db): Push {
    const f = peekFeed(db), push: Push = []
    if (!f) return push
    let n = 0
    for (const lists of Object.values(f.cities)) for (const k of lists.events) {
      const e = f.events[k]
      if (!e || e.gone || e.reminded || e.start - now() > 30 * 60000 || e.start < now() - 60000) continue
      e.reminded = 1
      for (const g of e.going) tell(db, f, g, { kind: 'rsvp', text: `${e.title} starts soon at ${e.label}`, ...(e.post ? { post: e.post } : {}) }, push)
      if (++n >= 20) return push
    }
    return push
  }

  // ---- gigs and reviews -----------------------------------------------------------------------------------------------------------
  function createGig(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; gig: GigView } | Refused {
    const id = session.publicId, f = feedOf(ctx, db), a = author(f, db, id), d = dayOf(a)
    const mute = mutedRefusal(id); if (mute) return mute
    if (!adult(db, id) && !aiOf(db, id)) return no('adults_only', 'Posting a gig is for players confirmed as 18 or older. You can still apply to gigs.')
    const title = cleanLine(body.title, FEED.gig.title); if (title.length < 3) return no('invalid_title', 'Say what the gig is.')
    const about = cleanBody(body.about, FEED.gig.about)
    for (const [text, what] of [[title, 'The title'], [about, 'The description']] as const) if (text) { const bad = screened(text, what) ?? aiRefusal(db, id, text, true, what); if (bad) return bad }
    const reward = rewardOf(body.reward); if (reward === null) return no('invalid_reward', `A reward is ₦0 to ₦${FEED.gig.rewardMax.toLocaleString('en-NG')} in game money.`)
    if (d.gigs >= FEED.gig.perDay) return no('daily_limit', 'You have posted enough gigs today.')
    const city = lifePlace(session).city
    const gig: GigRecord = { id: newId(f, 'g'), by: id, city, title, about, reward, at: now(), state: 'open', applicants: [] }
    f.gigs[gig.id] = gig
    remember(a, 'gigs', gig.id)
    const lists = (f.cities[city] ??= { posts: [], events: [], gigs: [] }); lists.gigs.push(gig.id); if (lists.gigs.length > FEED.gig.open) for (const old of lists.gigs.splice(0, lists.gigs.length - FEED.gig.open)) { const g = f.gigs[old]; if (g && g.state === 'open') g.state = 'closed' }
    d.gigs += 1
    return { ok: true, gig: gigView(db, f, gig, id) }
  }
  function gigOf(db: Db, body: Record<string, unknown>): { f: FeedCollection; g: GigRecord } | Refused {
    const f = peekFeed(db), g = f && typeof body.id === 'string' ? f.gigs[body.id] : undefined
    return f && g ? { f, g } : no('unknown_gig', 'That gig was not found.')
  }
  function gigAct(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; gig: GigView; push: Push } | Refused {
    const id = session.publicId, found = gigOf(db, body); if ('ok' in found) return found
    const { f, g } = found, op = body.op, push: Push = []
    if (blocked(id, g.by)) return no('unknown_gig', 'That gig was not found.')
    if (op === 'apply') {
      if (g.by === id) return no('own_gig', 'This is your own gig.')
      if (g.state !== 'open') return no('gig_closed', 'This gig is not open any more.')
      if (!g.applicants.includes(id)) { if (g.applicants.length >= FEED.gig.applicants) return no('gig_full', 'Enough people have applied already.'); g.applicants.push(id); remember(author(f, db, id), 'gigs', g.id); tell(db, f, g.by, { kind: 'gig', text: `${nameOf(db, f, id)} applied for ${g.title}`, from: person(db, f, id, g.by) }, push) }
    } else if (op === 'withdraw') { g.applicants = g.applicants.filter((x) => x !== id) }
    else if (op === 'choose') {
      if (g.by !== id) return no('not_owner', 'Only the poster chooses.')
      const worker = typeof body.worker === 'string' ? body.worker : ''
      if (g.state !== 'open' || !g.applicants.includes(worker)) return no('invalid_worker', 'Choose someone who applied.')
      g.state = 'taken'; g.worker = worker
      tell(db, f, worker, { kind: 'gig', text: `${nameOf(db, f, id)} chose you for ${g.title}`, from: person(db, f, id, worker) }, push)
    } else if (op === 'done') {
      if (g.by !== id || g.state !== 'taken' || !g.worker) return no('not_taken', 'Mark it done once someone has taken it.')
      g.state = 'done'; g.doneAt = now()
      const w = author(f, db, g.worker); w.gigsDone = (w.gigsDone ?? 0) + 1
      tell(db, f, g.worker, { kind: 'gig', text: `${g.title} is done. Leave a review for ${nameOf(db, f, id)}.`, from: person(db, f, id, g.worker) }, push)
    } else if (op === 'close') {
      if (g.by !== id) return no('not_owner', 'Only the poster can close it.')
      if (g.state === 'open' || g.state === 'taken') g.state = 'closed'
    } else if (op === 'review') {
      if (g.state !== 'done' || !g.worker || (id !== g.by && id !== g.worker)) return no('cannot_review', 'Only the two people of a finished gig review it.')
      const side = id === g.by ? 'poster' : 'worker', other = id === g.by ? g.worker : g.by
      if (g.reviews?.[side]) return no('reviewed', 'You have reviewed this gig.')
      const stars = starsOf(body.stars); if (stars === null) return no('invalid_stars', 'Choose 1 to 5 stars.')
      const text = cleanLine(body.text, FEED.gig.review); if (text) { const bad = screened(text, 'Your review'); if (bad) return bad }
      ;(g.reviews ??= {})[side] = { stars, text, at: now() }
      const o = author(f, db, other), r = (o.reviews ??= { n: 0, sum: 0, recent: [] })
      r.n += 1; r.sum += stars; r.recent.push({ by: id, stars, text, at: now() }); if (r.recent.length > 20) r.recent.splice(0, r.recent.length - 20)
      tell(db, f, other, { kind: 'review', text: `${nameOf(db, f, id)} gave you ${stars} star${stars === 1 ? '' : 's'}`, from: person(db, f, id, other) }, push)
    } else return no('invalid_op', 'Unknown gig step.')
    return { ok: true, gig: gigView(db, f, g, id), push }
  }
  function gigs(db: Db, viewer: string | null, city: string): { ok: true; gigs: GigView[]; mine: GigView[] } {
    const f = peekFeed(db)
    if (!f) return { ok: true, gigs: [], mine: [] }
    const open = (f.cities[city]?.gigs ?? []).map((k) => f.gigs[k]).filter((g): g is GigRecord => Boolean(g) && g!.state === 'open' && !blocked(viewer ?? '', g!.by))
    const mine = viewer ? (f.authors[viewer]?.gigs ?? []).map((k) => f.gigs[k]).filter((g): g is GigRecord => Boolean(g) && g!.state !== 'closed' && (g!.by === viewer || g!.worker === viewer || g!.applicants.includes(viewer))) : []
    // Near you first (posted by someone with a badge in the viewer's local government, then in the viewer's badge city), newest first within each.
    const badge = viewer ? badgeOf(f.authors[viewer]) : undefined
    return { ok: true, gigs: nearFirst(open.reverse(), (g) => nearTo(f, badge, g.by, g.city)).map((g) => gigView(db, f, g, viewer)), mine: mine.reverse().map((g) => gigView(db, f, g, viewer)) }
  }
  function vouch(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; profile: ProfileView; push: Push } | Refused {
    const id = session.publicId, target = typeof body.id === 'string' ? body.id : '', skill = SKILLS.find((s) => s === body.skill) as Skill | undefined
    if (!skill) return no('invalid_skill', 'Choose a skill.')
    if (!friends(db, id, target)) return no('friends_only', 'You can vouch for a friend.')
    const f = feedOf(ctx, db), t = author(f, db, target), list = ((t.vouches ??= {})[skill] ??= [])
    const push: Push = []
    if (body.on === false) t.vouches[skill] = list.filter((x) => x !== id)
    else if (!list.includes(id)) { list.push(id); if (list.length > 200) list.shift(); tell(db, f, target, { kind: 'vouch', text: `${nameOf(db, f, id)} vouched for your ${skill.toLowerCase()}`, from: person(db, f, id, target) }, push) }
    return { ok: true, profile: profileView(db, f, target, id), push }
  }

  // ---- moments --------------------------------------------------------------------------------------------------------------------
  /**
   * The gist just recorded a public line naming these people. A confirmed adult gets it as a draft to post in one tap; an AI character's
   * moment is posted for it (marked, at most FEED.aiMomentsPerDay a day), so the feed is never empty of things that really happened.
   */
  function noteMoment(db: Db, item: { n: number; at: number; city: string; kind: string; text: string }, ids: readonly string[]): void {
    if (!ids.length) return
    const f = feedOf(ctx, db)
    for (const id of new Set(ids)) {
      if (!exists(db, id)) continue
      const ai = aiOf(db, id)
      if (!ai && !adult(db, id)) continue
      const a = author(f, db, id)
      if (ai) {
        const d = dayOf(a)
        if (d.ai >= FEED.aiMomentsPerDay) continue
        d.ai += 1
        const post: PostRecord = { id: newId(f, 'p'), by: id, at: now(), kind: 'moment', body: item.text, place: { city: item.city }, vis: 'public', gist: item.n, ai: 1 }
        f.posts[post.id] = post; indexPost(f, a, post)
        continue
      }
      const drafts = (a.drafts ??= []).filter((x) => now() - x.at < FEED.draftMs && x.n !== item.n)
      drafts.push({ n: item.n, at: item.at, city: item.city, kind: item.kind, text: item.text })
      if (drafts.length > FEED.drafts) drafts.splice(0, drafts.length - FEED.drafts)
      a.drafts = drafts
    }
  }
  function dropDraft(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } {
    const a = peekFeed(db)?.authors[session.publicId]
    if (a?.drafts) a.drafts = a.drafts.filter((x) => x.n !== Number(body.n))
    return { ok: true }
  }

  // ---- reports and the operator ---------------------------------------------------------------------------------------------------
  function report(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; review: { kind: ReportRecord['kind']; id: string; rn?: number } | null } | Refused {
    const id = session.publicId, f = peekFeed(db)
    const kind = (['post', 'reply', 'crew', 'event', 'gig', 'profile'] as const).find((k) => k === body.kind)
    const reason = REPORT_REASONS.find((r) => r === body.reason) ?? 'other'
    if (!f || !kind || typeof body.id !== 'string' || body.id.length < 1 || body.id.length > 80) return no('invalid_report', 'That could not be reported.')
    if (f.reports.some((r) => r.by === id && r.kind === kind && r.id === body.id && r.n === (body.n ?? undefined) && !r.done)) return { ok: true, review: null }
    f.reports.push({ kind, id: body.id, ...(typeof body.n === 'number' ? { n: body.n } : {}), by: id, reason, at: now() })
    if (f.reports.length > FEED.reports) f.reports.splice(0, f.reports.length - FEED.reports)
    // Two different people reporting a post hide it for everyone (its author still sees it) until an operator looks.
    if (kind === 'post') {
      const post = f.posts[body.id]
      if (post) { const by = new Set([...(post.reports ?? []), id]); post.reports = [...by].slice(0, 20); if (by.size >= FEED.reportsToHide) post.hidden = 1 }
    }
    // The AI reviewer looks at it at once (server/feed/review.ts, after this transaction commits).
    return { ok: true, review: { kind, id: body.id, ...(typeof body.n === 'number' ? { rn: body.n } : {}) } }
  }
  function queue(db: Db): { ok: true; items: (ReportRecord & { text: string; author: string | null; hidden: boolean })[] } {
    const f = peekFeed(db)
    if (!f) return { ok: true, items: [] }
    const textOf = (r: ReportRecord): { text: string; author: string | null; hidden: boolean } => {
      if (r.kind === 'post' || r.kind === 'reply') { const p = f.posts[r.id]; const reply = r.kind === 'reply' ? p?.replies?.find((x) => x.n === r.n) : null; return { text: (reply?.body ?? p?.body ?? '(removed)').slice(0, 300), author: reply?.by ?? p?.by ?? null, hidden: Boolean(p?.hidden) } }
      if (r.kind === 'crew') { const c = f.crews[r.id]; return { text: c ? `${c.name}: ${c.about}` : '(removed)', author: c?.owner ?? null, hidden: false } }
      if (r.kind === 'event') { const e = f.events[r.id]; return { text: e ? `${e.title}: ${e.about}` : '(removed)', author: e?.by ?? null, hidden: Boolean(e?.gone) } }
      if (r.kind === 'gig') { const g = f.gigs[r.id]; return { text: g ? `${g.title}: ${g.about}` : '(removed)', author: g?.by ?? null, hidden: g?.state === 'closed' } }
      const a = f.authors[r.id]; return { text: [a?.handle ? `@${a.handle}` : '', a?.bio ?? '', a?.status?.text ?? ''].filter(Boolean).join(' · ') || '(nothing)', author: r.id, hidden: false }
    }
    return { ok: true, items: f.reports.filter((r) => !r.done).slice(-200).reverse().map((r) => ({ ...r, ...textOf(r) })) }
  }
  // ---- decisions: the reviewer's and the operator's, every one reversible ----------------------------------------------------------
  /** What the reviewer reads of a reported or new thing: its words, the picture to look at (a hash in the media store), who made it. */
  function snapshot(db: Db, kind: ReportRecord['kind'], id: string, rn?: number): { text: string; image?: string; author: string | null; reasons: string[]; reporters: number; public: boolean } | null {
    const f = peekFeed(db)
    if (!f) return null
    const reports = f.reports.filter((r) => r.kind === kind && r.id === id && (rn === undefined || r.n === rn) && !r.done)
    const base = { reasons: [...new Set(reports.map((r) => r.reason))], reporters: new Set(reports.map((r) => r.by)).size }
    if (kind === 'post') {
      const p = f.posts[id]; if (!p || p.gone) return null
      const image = p.media && (p.media.type === 'jpeg' || p.media.type === 'png' || p.media.type === 'webp') ? p.media.hash : p.poster
      return { ...base, text: p.body, ...(image ? { image } : {}), author: p.by, public: p.vis === 'public' || p.vis === 'city' }
    }
    if (kind === 'reply') { const r = f.posts[id]?.replies?.find((x) => x.n === rn); return r && !r.gone ? { ...base, text: r.body, author: r.by, public: true } : null }
    if (kind === 'crew') { const c = f.crews[id]; return c && !c.banned ? { ...base, text: `${c.name}\n${c.about}`, author: c.owner, public: true } : null }
    if (kind === 'event') { const e = f.events[id]; return e && !e.gone ? { ...base, text: `${e.title}\n${e.about}\n${e.label}`, author: e.by, public: true } : null }
    if (kind === 'gig') { const g = f.gigs[id]; return g && g.state !== 'closed' ? { ...base, text: `${g.title}\n${g.about}`, author: g.by, public: true } : null }
    const a = f.authors[id]; if (!a) return null
    return { ...base, text: [a.handle ? `@${a.handle}` : '', a.bio ?? '', a.status?.text ?? ''].filter(Boolean).join('\n'), ...(a.portrait ? { image: a.portrait.hash } : {}), author: id, public: true }
  }
  /** Apply one decision and log it. `keep` closes the reports and unhides what reports hid. Returns the decision, or a refusal. */
  function decide(db: Db, input: { by: 'ai' | 'operator'; kind: ReportRecord['kind']; id: string; rn?: number; action: 'remove' | 'hide' | 'keep'; category: string; reason: string; saw?: 'text' | 'image' }, push: Push = []): { ok: true; decision: DecisionRecord; push: Push } | Refused {
    const f = peekFeed(db)
    if (!f) return no('unknown_target', 'That is not there any more.')
    const { kind, id, rn, action } = input
    const before: Record<string, unknown> = {}
    let author: string | null = null, what = ''
    if (kind === 'post') {
      const p = f.posts[id]; if (!p) return no('unknown_target', 'That post is not there any more.')
      Object.assign(before, { hidden: p.hidden ?? null, gone: p.gone ?? null, reports: p.reports ?? [] }); author = p.by; what = 'your post'
      if (action === 'remove') p.gone = 1; else if (action === 'hide') p.hidden = 1; else { delete p.hidden; p.reports = [] }
    } else if (kind === 'reply') {
      const r = f.posts[id]?.replies?.find((x) => x.n === rn); if (!r) return no('unknown_target', 'That reply is not there any more.')
      Object.assign(before, { gone: r.gone ?? null }); author = r.by; what = 'your reply'
      if (action !== 'keep') r.gone = 1
    } else if (kind === 'crew') {
      const c = f.crews[id]; if (!c) return no('unknown_target', 'That crew is not there any more.')
      Object.assign(before, { banned: c.banned ?? null }); author = c.owner; what = `your crew ${c.name}`
      if (action !== 'keep') c.banned = 1
    } else if (kind === 'event') {
      const e = f.events[id]; if (!e) return no('unknown_target', 'That event is not there any more.')
      const p = e.post ? f.posts[e.post] : undefined
      Object.assign(before, { gone: e.gone ?? null, postGone: p?.gone ?? null }); author = e.by; what = `your event ${e.title}`
      if (action !== 'keep') { e.gone = 1; if (p) p.gone = 1 }
    } else if (kind === 'gig') {
      const g = f.gigs[id]; if (!g) return no('unknown_target', 'That gig is not there any more.')
      Object.assign(before, { state: g.state }); author = g.by; what = `your gig ${g.title}`
      if (action !== 'keep') g.state = 'closed'
    } else {
      const a = f.authors[id]; if (!a) return no('unknown_target', 'That profile is not there any more.')
      Object.assign(before, { bio: a.bio ?? null, status: a.status ?? null, portrait: a.portrait ?? null, handle: a.handle ?? null, handleAt: a.handleAt ?? null }); author = id; what = 'your profile'
      if (action !== 'keep') { delete a.bio; delete a.status; delete a.portrait; if (a.handle && f.handles[a.handle] === id) delete f.handles[a.handle]; delete a.handle }
    }
    for (const r of f.reports) if (r.kind === kind && r.id === id && (rn === undefined || r.n === rn)) r.done = 1
    const decision: DecisionRecord = { n: (f.dn = (f.dn ?? 0) + 1), at: now(), by: input.by, kind, id, ...(rn !== undefined ? { rn } : {}), action, category: input.category.slice(0, 40), reason: input.reason.slice(0, 200), before, ...(input.saw ? { saw: input.saw } : {}) }
    const list = (f.decisions ??= []); list.push(decision); if (list.length > 500) list.splice(0, list.length - 500)
    if (author && action !== 'keep') tell(db, f, author, { kind: 'moderation', text: `${action === 'remove' ? 'We removed' : 'We hid'} ${what}: ${decision.reason || decision.category}. If this is a mistake, report a problem and a person will look again.` }, push)
    return { ok: true, decision, push }
  }
  /** Put back what a decision changed (the operator's undo). A second undo changes nothing. */
  function undo(db: Db, n: number, by: string): { ok: true; decision: DecisionRecord } | Refused {
    const f = peekFeed(db), d = f?.decisions?.find((x) => x.n === n)
    if (!f || !d) return no('unknown_decision', 'That decision is not in the log any more.')
    if (d.undone) return { ok: true, decision: d }
    const b = d.before, set = <T extends object>(target: T, key: keyof T & string): void => { const v = b[key]; if (v === null || v === undefined) delete (target as Record<string, unknown>)[key]; else (target as Record<string, unknown>)[key] = v }
    if (d.kind === 'post') { const p = f.posts[d.id]; if (p) { set(p, 'hidden'); set(p, 'gone'); if (Array.isArray(b.reports)) p.reports = b.reports as string[] } }
    else if (d.kind === 'reply') { const r = f.posts[d.id]?.replies?.find((x) => x.n === d.rn); if (r) set(r, 'gone') }
    else if (d.kind === 'crew') { const c = f.crews[d.id]; if (c) set(c, 'banned') }
    else if (d.kind === 'event') { const e = f.events[d.id]; if (e) { set(e, 'gone'); const p = e.post ? f.posts[e.post] : undefined; if (p) { if (b.postGone === null) delete p.gone; else p.gone = 1 } } }
    else if (d.kind === 'gig') { const g = f.gigs[d.id]; if (g && typeof b.state === 'string') g.state = b.state as GigRecord['state'] }
    else { const a = f.authors[d.id]; if (a) { for (const k of ['bio', 'status', 'portrait', 'handleAt'] as const) set(a, k); const h = b.handle; if (typeof h === 'string' && (!f.handles[h] || f.handles[h] === d.id)) { f.handles[h] = d.id; a.handle = h } } }
    d.undone = { at: now(), by }
    return { ok: true, decision: d }
  }
  /** The admin's view: the newest decisions with what they were about, and the reports nobody has decided yet. */
  function decisions(db: Db): { ok: true; decisions: (DecisionRecord & { text: string; author: string | null })[]; open: number } {
    const f = peekFeed(db)
    if (!f) return { ok: true, decisions: [], open: 0 }
    const textOf = (d: DecisionRecord): { text: string; author: string | null } => {
      if (d.kind === 'post') { const p = f.posts[d.id]; return { text: p?.body ?? '(gone)', author: p?.by ?? null } }
      if (d.kind === 'reply') { const r = f.posts[d.id]?.replies?.find((x) => x.n === d.rn); return { text: r?.body ?? '(gone)', author: r?.by ?? null } }
      if (d.kind === 'crew') { const c = f.crews[d.id]; return { text: c ? `${c.name}: ${c.about}` : '(gone)', author: c?.owner ?? null } }
      if (d.kind === 'event') { const e = f.events[d.id]; return { text: e ? `${e.title}: ${e.about}` : '(gone)', author: e?.by ?? null } }
      if (d.kind === 'gig') { const g = f.gigs[d.id]; return { text: g ? `${g.title}: ${g.about}` : '(gone)', author: g?.by ?? null } }
      return { text: [d.before.handle ? `@${String(d.before.handle)}` : '', String(d.before.bio ?? ''), String((d.before.status as { text?: string } | null)?.text ?? '')].filter(Boolean).join(' · ') || '(profile)', author: d.id }
    }
    return { ok: true, decisions: (f.decisions ?? []).slice(-200).reverse().map((d) => ({ ...d, ...textOf(d) })), open: f.reports.filter((r) => !r.done).length }
  }
  /** Old removals leave the store for good after 30 days (the time to undo them); their bytes go too. Bounded per call. */
  function purge(db: Db): void {
    const f = peekFeed(db)
    if (!f?.decisions?.length) return
    const old = now() - 30 * 86400000
    let n = 0
    for (const d of f.decisions) {
      if (d.at > old || d.undone || d.action !== 'remove' || d.before.purged) continue
      if (d.kind === 'post') { const p = f.posts[d.id]; if (p?.gone) { if (p.poster) trash.push(p.poster); dropPost(f, p) } }
      else if (d.kind === 'reply') { const post = f.posts[d.id]; if (post?.replies) post.replies = post.replies.filter((r) => !(r.n === d.rn && r.gone)) }
      d.before.purged = true
      if (++n >= 50) return
    }
  }
  /** Operator (bearer token): { kind, id, n?, action: 'remove' | 'clear' | 'restore', decision? }. Clear is keep; restore undoes a decision. */
  function moderate(db: Db, body: Record<string, unknown>): { ok: true } | Refused {
    if (body.action === 'restore') { const r = undo(db, Number(body.decision), 'operator'); return r.ok ? { ok: true } : r }
    const kind = (['post', 'reply', 'crew', 'event', 'gig', 'profile'] as const).find((k) => k === body.kind)
    if (!kind || typeof body.id !== 'string' || (body.action !== 'remove' && body.action !== 'clear')) return no('invalid_action', 'remove, clear or restore')
    const r = decide(db, { by: 'operator', kind, id: body.id, ...(typeof body.n === 'number' ? { rn: body.n } : {}), action: body.action === 'clear' ? 'keep' : 'remove', category: 'operator', reason: typeof body.reason === 'string' ? body.reason : '' })
    return r.ok ? { ok: true } : r
  }

  return {
    publicMedia, mediaOn, takeTrash, read, thread, me, seen, profile, code, resolve, editProfile, setHandle, createPost, removePost, react, reply, removeReply,
    noteMedia, mediaAllowed, portraitOf, snapshot, decide, undo, decisions, purge, follow, suggestions, createCrew, joinCrew, leaveCrew, crew, discover, setMod, setLocals, setLocated, attachWorld, createEvent, rsvp, cancelEvent, events, event, remind,
    createGig, gigAct, gigs, vouch, noteMoment, dropDraft, report, queue, moderate, profileView, crewView, eventView,
    peek: peekFeed,
  }
}

/** ERASURE (server/admin/erasure-data.ts): take erased players out of every feed record. Their media's bytes go on `trash` for the heartbeat. */
export function forgetFeedPlayers(db: Db, ids: ReadonlySet<string>): void {
  const f = peekFeed(db), hashes: string[] = []
  if (!f) return
  const strip = (list: string[]): string[] => list.filter((x) => !ids.has(x))
  for (const id of ids) {
    const a = f.authors[id]
    if (!a) continue
    for (const pid of a.posts ?? []) { const p = f.posts[pid]; if (p?.media) hashes.push(p.media.hash); delete f.posts[pid] }
    if (a.portrait) hashes.push(a.portrait.hash)
    for (const m of a.media ?? []) hashes.push(m.hash)
    if (a.handle && f.handles[a.handle] === id) delete f.handles[a.handle]
    if (a.code && f.codes[a.code]?.id === id) delete f.codes[a.code]
    for (const followed of Object.keys(a.follows ?? {})) { const t = f.authors[followed]; if (t?.followers) t.followers -= 1 }
    uncount(f, a.located, Date.now())
    delete f.authors[id]
  }
  const alive = (pid: string): boolean => Object.hasOwn(f.posts, pid)
  f.world = f.world.filter(alive)
  for (const lists of Object.values(f.cities)) lists.posts = lists.posts.filter(alive)
  for (const p of Object.values(f.posts)) {
    if (p.replies) p.replies = p.replies.filter((r) => !ids.has(r.by))
    if (p.rx) for (const id of ids) delete p.rx[id]
    if (p.reports) p.reports = strip(p.reports)
  }
  for (const a of Object.values(f.authors)) {
    if (a.follows) for (const id of ids) delete a.follows[id]
    if (a.inbox) a.inbox = a.inbox.filter((l) => !(l.from && ids.has(l.from.id)))
    if (a.vouches) for (const skill of Object.keys(a.vouches) as Skill[]) a.vouches[skill] = strip(a.vouches[skill] ?? [])
    if (a.reviews) a.reviews.recent = a.reviews.recent.filter((r) => !ids.has(r.by))
  }
  for (const c of Object.values(f.crews)) {
    c.members = strip(c.members)
    if (c.mods) c.mods = strip(c.mods)
    if (c.kicked) for (const id of ids) delete c.kicked[id]
    if (!c.members.length) { delete f.codes[c.code]; delete f.crews[c.id] } else if (ids.has(c.owner)) c.owner = c.members[0]!
  }
  for (const e of Object.values(f.events)) {
    e.going = strip(e.going); e.maybe = strip(e.maybe); e.cohosts = strip(e.cohosts)
    if (ids.has(e.by)) { delete f.codes[e.code]; delete f.events[e.id] }
  }
  for (const lists of Object.values(f.cities)) { lists.events = lists.events.filter((k) => Object.hasOwn(f.events, k)) }
  for (const g of Object.values(f.gigs)) {
    g.applicants = strip(g.applicants)
    if (g.worker && ids.has(g.worker)) delete g.worker
    if (ids.has(g.by)) delete f.gigs[g.id]
  }
  for (const lists of Object.values(f.cities)) lists.gigs = lists.gigs.filter((k) => Object.hasOwn(f.gigs, k))
  f.reports = f.reports.filter((r) => !ids.has(r.by) && !(r.kind === 'profile' && ids.has(r.id)))
  if (hashes.length) f.trash = [...(f.trash ?? []), ...hashes].slice(-5000)
}
