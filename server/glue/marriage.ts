/**
 * OWNER: social
 * FAMILY LIFE (docs/SOCIAL-GLUE.md; decision 5 of docs/WOW-PLAN.md: marriage between two adult players and a shared home, no child arc).
 *
 *   PROPOSE   a confirmed adult asks an ordinary friend who is a confirmed adult, with a ring (cosmetic: gold, silver, rose gold, coral
 *             beads). Never an AI-played character, never across a block, never someone married, engaged or with a proposal out. The
 *             proposal waits a week; the one who asked may take it back.
 *   ACCEPT    only the person asked can say yes (their consent), and every rule is checked again when they do. Then they are engaged.
 *   CEREMONY  either of them, when BOTH stand in the same place in the game (a venue, the Square or a group room, never a home): the
 *             people in the room are the guests, the moment goes to everyone there, and they are married. An engagement lapses after
 *             thirty days without one.
 *   HOME      each spouse may offer their own home as the couple's: the other then walks in at any time, even while the owner is out,
 *             and may arrange it in 3D (the furniture of a life stays its owner's: the houses rules). Taken back at any time.
 *   END       either spouse ends it alone, at once (no consent of the other is needed to leave). Nothing is paid or split: no money moves
 *             beyond what the existing rules move. The shared home goes with it.
 * The badge on a person's card (marriedBadge, ./data.ts) says who they are married to and since when. Portable: no Node imports.
 */
import { GLUE, RINGS, ceremonyLine, isRing, proposalRefusal, ringLabel } from '../../src/glue/model.ts'
import type { FamilyLifeView, MarriageView } from '../../src/types/glue.ts'
import type { ServerFrame } from '../../src/types/protocol.ts'
import { presenceOf, describeRoom } from '../social/presence.ts'
import { placeName, venueName } from '../world-events/service.ts'
import { glueOf, marriageOf, peekGlue } from './data.ts'
import type { MarriageRecord } from './data.ts'
import { glueKit, idOf, no } from './common.ts'
import type { No } from './common.ts'
import { inboxLine } from './inbox.ts'
import type { InboxPush } from './inbox.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

type SocialRow = { homeFor?: string }
const playerOf = (db: Db, id: string): SocialRow | undefined => (db as unknown as { social?: { players?: Record<string, SocialRow> } }).social?.players?.[id]
/** The social record's mirror of a shared home (it lets the spouse's visit last while the owner is out: server/social/service.ts pruneHouse). */
function unshare(db: Db, owner: string, spouse: string): void { const p = playerOf(db, owner); if (p?.homeFor === spouse) delete p.homeFor }

/** A room a wedding may be held in, in words; null for a home or a street. */
export function weddingPlace(room: string): string | null {
  if (room.includes(':home:')) return null
  const r = describeRoom(room)
  if (r.cityId === 'world') return r.venue === 'square' ? 'the Square' : 'their group room'
  if (r.venue === 'neighbourhood' || r.venue === 'city-street') return null
  return `${venueName(r.cityId, r.venue)}, ${placeName(r.cityId)}`
}

export function marriageService(ctx: RouteContext) {
  const kit = glueKit(ctx), presence = presenceOf(ctx), now = (): number => ctx.now()
  /** A record that still holds: a proposal within its week, an engagement within its month, or a marriage. */
  const current = (m: MarriageRecord | undefined): m is MarriageRecord => Boolean(m) && (m!.state === 'married' || (m!.state === 'proposed' ? now() - m!.at < GLUE.marriage.proposalMs : now() - m!.at < GLUE.marriage.engagedMs))
  const recordOf = (db: Db, id: string): MarriageRecord | undefined => { const g = peekGlue(db), key = g?.wed?.[id], m = key ? g!.marriages[key] : undefined; return current(m) && (m.a === id || m.b === id) ? m : undefined }
  function view(db: Db, m: MarriageRecord, viewer: string): MarriageView {
    const other = m.a === viewer ? m.b : m.a
    return { id: m.id, state: m.state, with: { id: other, name: kit.nameOf(db, other) }, by: m.a, ring: m.ring, ringLabel: ringLabel(m.ring), at: m.at,
      ...(m.since ? { since: m.since } : {}), ...(m.venue ? { venue: m.venue } : {}), ...(m.guests ? { guests: m.guests.map((id) => kit.nameOf(db, id)) } : {}), shared: [...m.shared] }
  }
  function mine(db: Db, session: SessionRecord): FamilyLifeView {
    const me = session.publicId, g = peekGlue(db), m = recordOf(db, me)
    const asked = (g?.asked?.[me] ?? []).map((id) => g!.marriages[id]).filter((x): x is MarriageRecord => current(x) && x.state === 'proposed' && x.b === me).map((x) => view(db, x, me))
    return { ok: true, marriage: m ? view(db, m, me) : null, asked, rings: RINGS.map(([id, label]) => ({ id, label })) }
  }
  /** Drop a record and every index that points at it. */
  function drop(db: Db, m: MarriageRecord): void {
    const g = glueOf(ctx, db)
    unshare(db, m.a, m.b); unshare(db, m.b, m.a)
    for (const id of [m.a, m.b]) if (g.wed[id] === m.id) delete g.wed[id]
    const list = g.asked[m.b]; if (list) { const kept = list.filter((x) => x !== m.id); if (kept.length) g.asked[m.b] = kept; else delete g.asked[m.b] }
    delete g.marriages[m.id]
  }
  function refusal(db: Db, a: string, b: string, ignore?: MarriageRecord): string | null {
    const taken = (id: string): boolean => { const m = recordOf(db, id); return Boolean(m && m !== ignore && m.id !== ignore?.id) }
    return proposalRefusal({ self: a === b, adultA: kit.adult(db, a), adultB: kit.adult(db, b), aiA: kit.ai(db, a), aiB: kit.ai(db, b), friends: kit.friends(db, a, b), blocked: kit.blocked(db, a, b), takenA: taken(a), takenB: taken(b), nameB: kit.nameOf(db, b) })
  }
  function propose(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; family: FamilyLifeView; push: InboxPush } | No {
    const me = session.publicId, to = idOf(body.to)
    if (!to || !kit.known(db, to)) return no('unknown_player', 'That player was not found.')
    if (!isRing(body.ring)) return no('invalid_ring', 'Choose a ring.')
    const why = refusal(db, me, to); if (why) return no('not_allowed', why)
    if (!ctx.allow(`glue:propose:${me}`, 3, 86400000)) return no('rate_limited', 'You have asked enough for today.')
    const g = glueOf(ctx, db)
    // A proposal or engagement of mine that lapsed is cleared before a new one.
    const stale = g.wed[me] ? g.marriages[g.wed[me]!] : undefined
    if (stale && !current(stale)) drop(db, stale); else if (g.wed[me] && !stale) delete g.wed[me]
    const list = (g.asked[to] ?? []).filter((id) => current(g.marriages[id]))
    if (list.length >= 10) return no('inbox_full', `${kit.nameOf(db, to)} has many proposals waiting.`)
    const m: MarriageRecord = { id: `M${(++g.seq).toString(36)}${ctx.randomId().slice(0, 4)}`, a: me, b: to, state: 'proposed', ring: body.ring, at: now(), shared: [] }
    g.marriages[m.id] = m; g.wed[me] = m.id; list.push(m.id); g.asked[to] = list
    const push: InboxPush = []
    inboxLine(ctx, db, to, { kind: 'crew', text: `${kit.nameOf(db, me)} asked you to marry them (${ringLabel(m.ring).toLowerCase()}). Answer in Family.`, from: { id: me, name: kit.nameOf(db, me) } }, push)
    return { ok: true, family: mine(db, session), push }
  }
  function answer(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; family: FamilyLifeView; push: InboxPush } | No {
    const me = session.publicId, g = peekGlue(db), m = typeof body.id === 'string' ? g?.marriages[body.id] : undefined
    if (!m || m.b !== me || m.state !== 'proposed' || !current(m)) return no('no_proposal', 'That proposal is no longer waiting.')
    if (typeof body.yes !== 'boolean') return no('invalid_answer', 'Say yes or no.')
    const push: InboxPush = []
    if (!body.yes) {
      drop(db, m)
      inboxLine(ctx, db, m.a, { kind: 'crew', text: `${kit.nameOf(db, me)} said no to your proposal.` }, push)
      return { ok: true, family: mine(db, session), push }
    }
    // Both people's consent: the asker's when they asked, this person's now. Every rule again, as things stand now.
    const why = refusal(db, m.a, m.b, m); if (why) return no('not_allowed', why)
    const w = glueOf(ctx, db)
    m.state = 'engaged'; m.at = now(); w.wed[me] = m.id
    const left = (w.asked[me] ?? []).filter((x) => x !== m.id); if (left.length) w.asked[me] = left; else delete w.asked[me]
    inboxLine(ctx, db, m.a, { kind: 'crew', text: `${kit.nameOf(db, me)} said yes! Meet at a place in town to hold the ceremony.` }, push)
    return { ok: true, family: mine(db, session), push }
  }
  /** The one who asked takes it back, or either calls off an engagement. */
  function withdraw(db: Db, session: SessionRecord): { ok: true; family: FamilyLifeView } | No {
    const me = session.publicId, m = recordOf(db, me)
    if (!m || m.state === 'married') return no('nothing_to_withdraw', 'There is no proposal or engagement to call off.')
    if (m.state === 'proposed' && m.a !== me) return no('nothing_to_withdraw', 'Answer the proposal instead.')
    drop(db, m)
    return { ok: true, family: mine(db, session) }
  }
  /** The ceremony (inside a transaction): both in one place in the game; returns the room and the moment to send there. */
  function ceremony(db: Db, session: SessionRecord): { ok: true; family: FamilyLifeView; room: string; line: string; names: string; push: InboxPush } | No {
    const me = session.publicId, m = recordOf(db, me)
    if (!m || m.state !== 'engaged') return no('not_engaged', 'Get engaged first: ask, and wait for a yes.')
    const why = refusal(db, m.a, m.b, m); if (why) return no('not_allowed', why)
    const shared = presence.status(m.a).rooms.filter((room) => presence.status(m.b).rooms.includes(room) && weddingPlace(room))
    const room = shared[0]
    if (!room) return no('not_together', `Stand in the same place as ${kit.nameOf(db, m.a === me ? m.b : m.a)}: a venue, the Square or a group room (not a home).`)
    const guests = presence.inRoom(room).map((p) => p.id).filter((id) => id !== m.a && id !== m.b && !kit.blocked(db, id, m.a) && !kit.blocked(db, id, m.b))
    const venue = weddingPlace(room)!
    m.state = 'married'; m.since = now(); m.venue = venue; m.guests = guests.slice(0, GLUE.marriage.guestsNamed)
    const a = kit.nameOf(db, m.a), b = kit.nameOf(db, m.b)
    const line = ceremonyLine(a, b, venue, m.guests.map((id) => kit.nameOf(db, id)))
    const push: InboxPush = []
    for (const id of [m.a, m.b]) inboxLine(ctx, db, id, { kind: 'crew', text: line }, push)
    return { ok: true, family: mine(db, session), room, line, names: `${a} & ${b}`, push }
  }
  /** Offer my own home as our home, or take the offer back. */
  function shareHome(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; family: FamilyLifeView } | No {
    const me = session.publicId, m = marriageOf(db, me)
    if (!m) return no('not_married', 'Only a married couple shares a home.')
    m.shared = m.shared.filter((x) => x !== me)
    const other = m.a === me ? m.b : m.a, p = playerOf(db, me)
    if (body.on !== false) { m.shared.push(me); if (p) p.homeFor = other } else unshare(db, me, other)
    return { ok: true, family: mine(db, session) }
  }
  /** Either spouse ends the marriage alone. No money moves. */
  function divorce(db: Db, session: SessionRecord): { ok: true; family: FamilyLifeView; push: InboxPush } | No {
    const me = session.publicId, m = marriageOf(db, me)
    if (!m) return no('not_married', 'You are not married.')
    const other = m.a === me ? m.b : m.a, push: InboxPush = []
    drop(db, m)
    inboxLine(ctx, db, other, { kind: 'crew', text: `${kit.nameOf(db, me)} ended your marriage.` }, push)
    return { ok: true, family: mine(db, session), push }
  }
  /** After a committed ceremony: the moment to everyone in the room (the world-event moment frame, src/types/world-events.ts). */
  function announce(room: string, names: string, line: string): void {
    const frame = { type: 'world-live', kind: 'moment', title: 'A wedding', name: names, text: line }
    for (const id of ctx.checks?.roomMembers?.(room) ?? []) ctx.push(id, frame as unknown as ServerFrame)
  }
  return { mine, propose, answer, withdraw, ceremony, shareHome, divorce, announce }
}

/** ERASURE: every proposal, engagement and marriage a person is in goes, with its indexes; the other person is simply unmarried. */
export function forgetMarriages(db: Db, ids: ReadonlySet<string>): void {
  const g = peekGlue(db)
  if (!g?.marriages) return
  for (const m of Object.values(g.marriages)) {
    if (!ids.has(m.a) && !ids.has(m.b)) { if (m.guests) m.guests = m.guests.filter((x) => !ids.has(x)); continue }
    for (const id of [m.a, m.b]) if (g.wed[id] === m.id) delete g.wed[id]
    unshare(db, m.a, m.b); unshare(db, m.b, m.a)
    const list = g.asked[m.b]; if (list) { const kept = list.filter((x) => x !== m.id); if (kept.length) g.asked[m.b] = kept; else delete g.asked[m.b] }
    delete g.marriages[m.id]
  }
  for (const id of ids) { delete g.wed[id]; delete g.asked[id] }
}
