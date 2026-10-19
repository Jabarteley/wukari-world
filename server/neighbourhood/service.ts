/**
 * OWNER: social
 * THE NEIGHBOURHOOD (docs/NEIGHBOURHOOD.md): the noticeboard of an area, and "Meet your neighbours".
 *
 *   AREA     the place a person's location badge names: its local government, or its city when the badge has none. The badge is the
 *            feed's own (docs/FEED.md): the device found itself there and the position never left it.
 *   NOTICE   an adult with a badge posts to their area's board: power, water, lost and found, roadworks. The AI reviewer (server/feed/
 *            review.ts judge) reads every one first; it goes up on "keep", is refused with the reason otherwise, and waits when no model
 *            could answer (tried again on the heartbeat, then left for an admin). People with a badge in the area vote "still true?":
 *            a yes keeps it up longer, three more noes than yeses end it, and every notice ends with time. Anyone in the area can
 *            report one (two reports send it back to the reviewer); its author can remove it; an admin can remove or restore it.
 *   MEETUP   one "Meet your neighbours" a month per local government: the first Saturday, 16:00 WAT. An admin or the founder of a
 *            community of that local government plans it; it is an ordinary feed event (so it is a post in the city, an RSVP, a reminder),
 *            free or ticketed through Earn, and only people whose badge is in the same local government may go (meetupRefusal).
 * Portable: no Node imports.
 */
import { NOTICE, NOTICE_KINDS, MEETUP, areaKey, areaOf, badgeIn, cleanNotice, extendedUntil, isNoticeKind, leftText, monthKey, nextMeetupStart, noticeEnded, noticeKindLabel } from '../../src/neighbourhood/model.ts'
import type { NoticeKind } from '../../src/neighbourhood/model.ts'
import type { AreaView, BoardView, MeetupView, MeetupsView, NoticeView } from '../../src/types/neighbourhood.ts'
import { cityCatalogueEntry, cityName, cityRules } from '../../src/game/cities/registry.ts'
import { lagosTime } from '../../src/game/clock.ts'
import { screenText } from '../moderation/text.ts'
import { peekFeed } from '../feed/data.ts'
import { feedService } from '../feed/service.ts'
import { earnService } from '../earn/service.ts'
import { badgeNow, neighbourhoodOf, peekNeighbourhood } from './data.ts'
import type { MeetupRecord, NoticeRecord } from './data.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

type No = { ok: false; code: string; reason: string }
const no = (code: string, reason: string): No => ({ ok: false, code, reason })
const titleCase = (id: string): string => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const unitName = (city: string, id: string): string => cityRules(city)?.units.find((u) => u.id === id)?.name ?? titleCase(id)

export function neighbourhoodService(ctx: RouteContext) {
  const now = (): number => ctx.now()
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  const nameOf = (db: Db, id: string): string => (db as unknown as { social?: { players?: Record<string, { name?: string }> } }).social?.players?.[id]?.name ?? 'A neighbour'
  const areaView = (city: string, lga?: string): AreaView => {
    const cn = cityCatalogueEntry(city)?.name ?? cityName(city) ?? city, ln = lga ? unitName(city, lga) : undefined
    return { key: areaKey(city, lga), city, cityName: cn, ...(lga ? { lga, lgaName: ln } : {}), name: ln ? `${ln}, ${cn}` : cn }
  }
  const areaOfKey = (key: string): AreaView => { const [city, lga] = key.split('/'); return areaView(city!, lga) }

  // ---- the noticeboard ----------------------------------------------------------------------------------------------------------------
  function noticeView(db: Db, n: NoticeRecord, viewer: string): NoticeView {
    const mine = n.by === viewer
    return { id: n.id, kind: n.kind, kindLabel: noticeKindLabel(n.kind), body: n.body, at: n.at, until: n.until, left: leftText(n.until, now()), up: n.up.length, down: n.down.length, mine,
      vote: n.up.includes(viewer) ? 'up' : n.down.includes(viewer) ? 'down' : null, by: nameOf(db, n.by),
      ...(mine && (n.status === 'review' || n.status === 'refused') ? { status: n.status } : {}), ...(mine && n.reason && n.status === 'refused' ? { reason: n.reason } : {}) }
  }
  const votesOf = (n: NoticeRecord) => ({ at: n.at, until: n.until, kind: n.kind, up: n.up.length, down: n.down.length })
  const onBoard = (n: NoticeRecord): boolean => n.status === 'live' && noticeEnded(votesOf(n), now()) === null

  function board(db: Db, viewer: string): { ok: true } & BoardView | No {
    const badge = badgeNow(db, viewer, now())
    if (!badge) return no('badge_needed', 'The noticeboard is for people confirmed in the area. Confirm where you are in My profile (your device checks it; your position is never sent).')
    const area = areaOf(badge)!, c = peekNeighbourhood(db)
    const all = (c?.areas[area]?.notices ?? []).map((id) => c!.notices[id]).filter((n): n is NoticeRecord => Boolean(n))
    const live = all.filter(onBoard).sort((a, b) => b.at - a.at).slice(0, NOTICE.perPage).map((n) => noticeView(db, n, viewer))
    const mine = all.filter((n) => n.by === viewer && (n.status === 'review' || n.status === 'refused')).slice(-5).map((n) => noticeView(db, n, viewer))
    return { ok: true, area: areaOfKey(area), notices: live, mine, kinds: NOTICE_KINDS.map(([id, label, hint]) => ({ id, label, hint })), canPost: adult(db, viewer) }
  }
  function post(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; notice: NoticeView; review: string } | No {
    const id = session.publicId
    if (!adult(db, id)) return no('adults_only', 'Posting to the noticeboard is for people confirmed as 18 or older.')
    const badge = badgeNow(db, id, now())
    if (!badge) return no('badge_needed', 'Confirm where you are in My profile first: the noticeboard is for people in the area.')
    const muted = ctx.checks?.muted?.(id); if (muted) return no(muted.code, muted.reason)
    if (!isNoticeKind(body.kind)) return no('invalid_kind', 'Choose power, water, lost and found, or roadworks.')
    const text = cleanNotice(body.body)
    if (text.length < NOTICE.min) return no('too_short', 'Say what you saw, in a sentence.')
    const bad = screenText(text, { what: 'The notice', contact: true }); if (bad) return no(bad.code, bad.reason)
    const c = neighbourhoodOf(ctx, db), area = areaOf(badge)!, day = lagosTime(now()).day
    const d = c.days[id]?.d === day ? c.days[id]! : (c.days[id] = { d: day, n: 0 })
    if (d.n >= NOTICE.perDay) return no('daily_limit', 'You have posted enough notices today.')
    const list = (c.areas[area] ??= { notices: [] }).notices
    if (list.some((k) => { const n = c.notices[k]; return n && n.by === id && n.body === text && now() - n.at < NOTICE.repeatMs && n.status !== 'removed' })) return no('duplicate', 'You posted that already.')
    const n: NoticeRecord = { id: `N${(++c.seq).toString(36)}${ctx.randomId().slice(0, 4)}`, area, kind: body.kind as NoticeKind, by: id, body: text, at: now(), until: now() + NOTICE.lifeMs[body.kind as NoticeKind], up: [], down: [], status: 'review' }
    c.notices[n.id] = n; list.push(n.id); d.n += 1
    // The board keeps the newest 300 notices of an area; older ones are long over.
    while (list.length > 300) delete c.notices[list.shift()!]
    return { ok: true, notice: noticeView(db, n, id), review: n.id }
  }
  /** "Still true?" yes or no from someone with a badge in the area; the same person changing their mind replaces the vote. */
  function vote(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; notice: NoticeView } | No {
    const id = session.publicId, c = peekNeighbourhood(db), n = c && typeof body.id === 'string' ? c.notices[body.id] : undefined
    if (!c || !n || n.status !== 'live') return no('unknown_notice', 'That notice is not on the board.')
    if (!badgeIn(badgeNow(db, id, now()), n.area)) return no('badge_needed', 'Only people confirmed in this area can say whether it is still true.')
    if (noticeEnded(votesOf(n), now())) return no('notice_over', 'That notice has ended.')
    if (n.by === id) return no('own_notice', 'You posted this one. Remove it instead when it is over.')
    const choice = body.vote === 'up' || body.vote === 'down' ? body.vote : null
    n.up = n.up.filter((x) => x !== id); n.down = n.down.filter((x) => x !== id)
    if (choice === 'up') { n.up.push(id); if (n.up.length > NOTICE.votersKept) n.up.shift(); n.until = extendedUntil(n, now()) }
    if (choice === 'down') { n.down.push(id); if (n.down.length > NOTICE.votersKept) n.down.shift() }
    return { ok: true, notice: noticeView(db, n, id) }
  }
  /** A report: two different people send it back to the reviewer, who reads it with that fact. Returns the id to review, if any. */
  function report(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; review: string | null } | No {
    const id = session.publicId, c = peekNeighbourhood(db), n = c && typeof body.id === 'string' ? c.notices[body.id] : undefined
    if (!c || !n || n.status !== 'live') return no('unknown_notice', 'That notice is not on the board.')
    if (!badgeIn(badgeNow(db, id, now()), n.area)) return no('badge_needed', 'Only people confirmed in this area can report a notice.')
    if (n.by === id) return no('own_notice', 'That is your own notice.')
    const reports = (n.reports ??= [])
    if (!reports.includes(id)) reports.push(id)
    if (reports.length >= NOTICE.reportsToReview) { n.status = 'review'; n.tries = 0; return { ok: true, review: n.id } }
    return { ok: true, review: null }
  }
  function remove(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | No {
    const c = peekNeighbourhood(db), n = c && typeof body.id === 'string' ? c.notices[body.id] : undefined
    if (!c || !n || n.by !== session.publicId || n.status === 'removed') return no('unknown_notice', 'That notice is not yours.')
    n.status = 'removed'
    return { ok: true }
  }
  /** The reviewer's answer for a notice in review. */
  function reviewed(db: Db, id: string, verdict: { action: 'keep' | 'hide' | 'remove'; reason: string } | null): void {
    const n = peekNeighbourhood(db)?.notices[id]
    if (!n || n.status !== 'review') return
    if (!verdict) { n.tries = (n.tries ?? 0) + 1; return }
    if (verdict.action === 'keep') { n.status = 'live'; delete n.reason; n.reports = [] }
    else { n.status = 'refused'; n.reason = verdict.reason || 'This notice cannot go on the board.' }
  }
  /** What the reviewer is told: the words, the kind, and that people reported it when they did. */
  function toReview(db: Db, id: string): { text: string; facts: string } | null {
    const n = peekNeighbourhood(db)?.notices[id]
    if (!n || n.status !== 'review') return null
    return { text: `${noticeKindLabel(n.kind)}: ${n.body}`, facts: `A notice on the neighbourhood board of ${areaOfKey(n.area).name}, read by people who live nearby, adults only. Allowed: reports of power cuts, water, roadworks, traffic and lost and found. Not allowed: naming or accusing a person, rumours about crimes, addresses or phone numbers, selling, politics, panic.${n.reports?.length ? ` ${n.reports.length} neighbours reported it.` : ''}` }
  }
  const pending = (db: Db): string[] => Object.values(peekNeighbourhood(db)?.notices ?? {}).filter((n) => n.status === 'review' && (n.tries ?? 0) < NOTICE.reviewTries).slice(0, 3).map((n) => n.id)

  // ---- meetups ------------------------------------------------------------------------------------------------------------------------
  function meetupView(db: Db, m: MeetupRecord, viewer: string | null): MeetupView | null {
    const shown = feedService(ctx).event(db, viewer, m.event)
    if (!shown.ok) return null
    return { event: shown.event, area: areaView(m.city, m.lga), month: m.month, canGo: viewer ? meetupGo(db, m, viewer) : false }
  }
  const meetupGo = (db: Db, m: MeetupRecord, viewer: string): boolean => {
    const e = peekFeed(db)?.events[m.event]
    return Boolean(e) && (e!.by === viewer || e!.cohosts.includes(viewer) || badgeIn(badgeNow(db, viewer, now()), areaKey(m.city, m.lga)))
  }
  /** The meetups of the viewer's badge city, their own local government's first; and the communities they could plan one for. */
  function meetups(db: Db, viewer: string | null): { ok: true } & MeetupsView {
    const badge = viewer ? badgeNow(db, viewer, now()) : null, c = peekNeighbourhood(db), f = peekFeed(db)
    const next = nextMeetupStart(now())
    if (!viewer || !badge) return { ok: true, area: null, meetups: [], next, plannable: [] }
    const list = Object.values(c?.meetups ?? {}).filter((m) => m.city === badge.city).map((m) => ({ m, e: f?.events[m.event] })).filter((x) => x.e && !x.e.gone && x.e.end > now())
      .sort((a, b) => Number(b.m.lga === badge.lga) - Number(a.m.lga === badge.lga) || a.e!.start - b.e!.start)
      .map(({ m }) => meetupView(db, m, viewer)).filter((v): v is MeetupView => Boolean(v))
    const plannable = (f?.authors[viewer]?.crews ?? []).map((k) => f!.crews[k]).filter((cr): cr is NonNullable<typeof cr> => Boolean(cr) && cr!.owner === viewer && Boolean(cr!.kind) && Boolean(cr!.place?.real && cr!.place.city && cr!.place.lga) && !cr!.banned && badgeIn(badge, areaKey(cr!.place!.city!, cr!.place!.lga!)))
      .map((cr) => ({ crew: cr.id, name: cr.name, area: areaView(cr.place!.city!, cr.place!.lga!) }))
    return { ok: true, area: areaView(badge.city, badge.lga), meetups: list, next, plannable }
  }
  interface PlanInput { city: string; lga: string; via: 'admin' | 'founder'; crew?: string; body: Record<string, unknown> }
  /** Plan this month's (or next month's) meetup of a local government as the host: one an area a month, free or with a ticket price. */
  function plan(db: Db, session: SessionRecord, input: PlanInput): { ok: true; meetup: MeetupView; priceNote?: string } | No {
    const id = session.publicId
    if (!cityCatalogueEntry(input.city) || !cityRules(input.city)?.units.some((u) => u.id === input.lga)) return no('unknown_area', 'That area is not part of this city.')
    const area = areaKey(input.city, input.lga), start = nextMeetupStart(now()), month = monthKey(start), c = neighbourhoodOf(ctx, db)
    const taken = c.months[`${area}:${month}`]
    if (taken && peekFeed(db)?.events[taken] && !peekFeed(db)!.events[taken]!.gone) return no('already_planned', `${areaView(input.city, input.lga).name} already has its meetup for ${month}.`)
    const saved = c.templates[area], b = input.body
    const name = unitName(input.city, input.lga)
    const title = cleanNotice(b.title).slice(0, 60) || saved?.title || `${MEETUP.title}: ${name}`.slice(0, 60)
    const about = (typeof b.about === 'string' ? b.about.trim().slice(0, 280) : '') || saved?.about || `A monthly meetup for people confirmed in ${name}. Come and meet the people who live near you.`
    const place = (typeof b.place === 'string' ? b.place.trim().slice(0, 60) : '') || saved?.place || `${name} neighbours`
    const price = b.price === undefined ? saved?.price : Math.round(Number(b.price)) || 0
    const made = feedService(ctx).createEvent(db, session, { title, about, start, hours: MEETUP.hours, place, city: input.city, cap: MEETUP.cap })
    if (!made.ok) return no(made.code, made.reason)
    const rec: MeetupRecord = { event: made.event.id, city: input.city, lga: input.lga, month, by: id, via: input.via, ...(input.crew ? { crew: input.crew } : {}) }
    c.meetups[rec.event] = rec; c.months[`${area}:${month}`] = rec.event
    let priceNote: string | undefined
    if (price && price > 0) { const r = earnService(ctx).setPrice(db, session, { event: rec.event, price }); if (!r.ok) priceNote = r.reason }
    c.templates[area] = { by: id, ...(input.crew ? { crew: input.crew } : {}), title, about, place, ...(price && !priceNote ? { price } : {}) }
    return { ok: true, meetup: meetupView(db, rec, id)!, ...(priceNote ? { priceNote } : {}) }
  }
  /** A community founder's plan: their own community of a real local government, and their own badge there. */
  function planAsFounder(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; meetup: MeetupView; priceNote?: string } | No {
    const id = session.publicId, f = peekFeed(db), crew = f && typeof body.crew === 'string' ? f.crews[body.crew] : undefined
    if (!crew || crew.owner !== id || crew.banned || !crew.kind) return no('not_founder', 'Choose a community you founded.')
    if (!crew.place?.real || !crew.place.city || !crew.place.lga) return no('no_area', 'Only a community of a local government can host its meetup. Set its area when you start it.')
    if (!adult(db, id)) return no('adults_only', 'Hosting a meetup is for people confirmed as 18 or older.')
    if (!badgeIn(badgeNow(db, id, now()), areaKey(crew.place.city, crew.place.lga))) return no('badge_needed', 'Your own location badge must be in this area to host its meetup. Confirm where you are in My profile.')
    return plan(db, session, { city: crew.place.city, lga: crew.place.lga, via: 'founder', crew: crew.id, body })
  }
  /** An admin hosts any local government's meetup as themselves. */
  function planAsAdmin(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; meetup: MeetupView; priceNote?: string } | No {
    if (typeof body.city !== 'string' || typeof body.lga !== 'string') return no('unknown_area', 'Choose a city and a local government.')
    return plan(db, session, { city: body.city, lga: body.lga, via: 'admin', body })
  }

  function admin(db: Db) {
    const c = peekNeighbourhood(db)
    if (!c) return { ok: true as const, notices: [], meetups: [] }
    const notices = Object.values(c.notices).filter((n) => n.status !== 'removed' || n.reason).sort((a, b) => b.at - a.at).slice(0, 100)
      .map((n) => ({ id: n.id, area: areaOfKey(n.area).name, kind: n.kind, by: nameOf(db, n.by), body: n.body, at: n.at, status: n.status, reason: n.reason ?? '', up: n.up.length, down: n.down.length, reports: n.reports?.length ?? 0, ended: noticeEnded(votesOf(n), now()) ?? '' }))
    const meetups = Object.values(c.meetups).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 100).map((m) => ({ event: m.event, area: areaView(m.city, m.lga).name, month: m.month, by: nameOf(db, m.by), via: m.via, going: peekFeed(db)?.events[m.event]?.going.length ?? 0 }))
    return { ok: true as const, notices, meetups }
  }
  function act(db: Db, body: Record<string, unknown>): { ok: true } | No {
    const n = peekNeighbourhood(db)?.notices[typeof body.notice === 'string' ? body.notice : '']
    if (!n) return no('unknown_notice', 'That notice was not found.')
    if (body.action === 'remove') { n.status = 'refused'; n.reason = cleanNotice(body.note).slice(0, 200) || 'Removed by Allworld.'; return { ok: true } }
    if (body.action === 'restore') { n.status = 'live'; delete n.reason; n.reports = []; return { ok: true } }
    return no('invalid_action', 'remove or restore')
  }
  return { board, post, vote, report, remove, reviewed, toReview, pending, meetups, planAsFounder, planAsAdmin, admin, act, areaView, peek: peekNeighbourhood }
}

/** ERASURE: a person's notices go, their votes and reports are taken back, and the meetups they hosted lose their record (their events go with the feed's). */
export function forgetNeighbourhoodPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekNeighbourhood(db)
  if (!c) return
  for (const n of Object.values(c.notices)) {
    if (ids.has(n.by)) { delete c.notices[n.id]; const list = c.areas[n.area]?.notices; if (list) c.areas[n.area]!.notices = list.filter((x) => x !== n.id); continue }
    n.up = n.up.filter((x) => !ids.has(x)); n.down = n.down.filter((x) => !ids.has(x)); if (n.reports) n.reports = n.reports.filter((x) => !ids.has(x))
  }
  for (const m of Object.values(c.meetups)) if (ids.has(m.by)) { delete c.meetups[m.event]; for (const k of Object.keys(c.months)) if (c.months[k] === m.event) delete c.months[k] }
  for (const [k, t] of Object.entries(c.templates)) if (ids.has(t.by)) delete c.templates[k]
  for (const id of ids) delete c.days[id]
}
