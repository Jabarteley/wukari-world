/**
 * OWNER: social
 * GROUP TRIPS (docs/SOCIAL-GLUE.md): a crew or a community books one trip together, everyone says yes, and they leave and arrive together.
 *
 *   PLAN    a member picks who comes (other members, at most eleven; everyone when the crew is that small), and the trip: a danfo from the
 *           venue they stand in to another venue of the city, or a flight from their city to another. Each person invited is told.
 *   ANSWER  each says yes or no; the organiser may let go of someone who has not answered, or call the trip off. An open trip lapses after
 *           a day.
 *   GO      when everyone has answered and two or more are going, the organiser presses Go. Every one going must be connected, in the
 *           trip's city, free (not on another trip or task) and, for a danfo, standing at the meeting point. Then, in ONE transaction, the
 *           game's own travel runs for each of them (`travel` with mode danfo, or `estate.relocate` with mode air: the same action as the
 *           Ride and Travel apps, each paying their own fare by the same rules). If it refuses anyone (no money, a ride debt), the whole
 *           transaction is undone, nobody leaves and nobody pays, and the organiser is told who and why. They all leave from the same
 *           place at the same moment by the same route, so they arrive together.
 *   CARD    once gone, the trip card ("5 of us took a danfo from Ojota to Lekki, together") for the share sheet.
 * Nothing moves money besides the fares the travel rules charge. Portable: no Node imports.
 */
import { GLUE, isTripMode, listNames, tripCardLine, tripReady } from '../../src/glue/model.ts'
import type { TripAnswer } from '../../src/glue/model.ts'
import type { TripView, TripsView } from '../../src/types/glue.ts'
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts'
import { venueFor } from '../../src/game/cities/runtime.ts'
import type { CityId } from '../../src/types/protocol.ts'
import { characterCity } from '../character.ts'
import { peekFeed } from '../feed/data.ts'
import { presenceOf } from '../social/presence.ts'
import { placeName, venueName } from '../world-events/service.ts'
import { glueOf, peekGlue } from './data.ts'
import type { TripRecord } from './data.ts'
import { glueKit, idOf, no } from './common.ts'
import type { No } from './common.ts'
import { inboxLine } from './inbox.ts'
import type { InboxPush } from './inbox.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

const NOT_A_STOP = new Set(['home', 'neighbourhood', 'city-street'])
/** Thrown inside the Go transaction to undo every departure in it; the route turns it into the refusal. */
export class TripRefused extends Error {
  readonly code: string
  readonly reason: string
  constructor(code: string, reason: string) { super(reason); this.code = code; this.reason = reason }
}

export function tripsService(ctx: RouteContext) {
  const kit = glueKit(ctx), presence = presenceOf(ctx), now = (): number => ctx.now()
  const placeLabel = (t: Pick<TripRecord, 'mode' | 'city'>, id: string): string => (t.mode === 'flight' ? placeName(id) : venueName(t.city, id))
  const lapsed = (t: TripRecord): boolean => t.state === 'open' && now() - t.at > GLUE.trip.openMs

  function view(db: Db, t: TripRecord, viewer: string): TripView {
    const crew = peekFeed(db)?.crews[t.crew]
    const members = Object.entries(t.members).map(([id, answer]) => ({ id, name: kit.nameOf(db, id), answer }))
    const state = lapsed(t) ? 'called-off' : t.state
    const fromName = placeLabel(t, t.from), toName = placeLabel(t, t.to)
    const going = members.filter((m) => m.answer === 'yes').length
    return { id: t.id, crew: t.crew, crewName: crew?.name ?? 'Crew', mode: t.mode, city: t.city, from: t.from, fromName, to: t.to, toName, by: { id: t.by, name: kit.nameOf(db, t.by) },
      members, state, ...(t.leftAt ? { leftAt: t.leftAt } : {}), ...(t.arriveAt ? { arriveAt: t.arriveAt } : {}), mine: t.by === viewer,
      myAnswer: t.members[viewer] ?? null, ready: state === 'open' ? tripReady(members) : null,
      ...(state === 'gone' ? { card: tripCardLine({ mode: t.mode, fromName, toName, count: going }) } : {}) }
  }
  /** The trips of the crews a person is in that they are part of (or could see as a member), newest first. */
  function list(db: Db, session: SessionRecord, crewId?: unknown): TripsView {
    const me = session.publicId, f = peekFeed(db), g = peekGlue(db)
    const crews = (typeof crewId === 'string' ? [crewId] : f?.authors[me]?.crews ?? []).filter((k) => f?.crews[k]?.members.includes(me))
    const trips = crews.flatMap((k) => (g?.crewTrips[k] ?? []).map((id) => g!.trips[id]).filter((t): t is TripRecord => Boolean(t)))
      .filter((t) => t.members[me] !== undefined).sort((a, b) => b.at - a.at).slice(0, 20).map((t) => view(db, t, me))
    return { ok: true, trips }
  }
  function create(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; trip: TripView; push: InboxPush } | No {
    const me = session.publicId, f = peekFeed(db), crew = f && typeof body.crew === 'string' ? f.crews[body.crew] : undefined
    if (!crew || crew.banned || !crew.members.includes(me)) return no('not_member', 'Choose a crew or community you are in.')
    if (!isTripMode(body.mode)) return no('invalid_mode', 'Choose a danfo or a flight.')
    const city = characterCity(session)
    const state = city ? session.cities?.[city]?.state : undefined
    if (!city || !state) return no('no_life', 'Start your life in a city first.')
    if (state.activeAction) return no('busy', 'Finish what you are doing first.')
    let from: string, to = typeof body.to === 'string' ? body.to : ''
    if (body.mode === 'danfo') {
      from = state.location
      if (NOT_A_STOP.has(from)) return no('not_a_stop', 'Go to a place in town first: the danfo leaves from where you stand, and everyone meets you there.')
      let known = false; try { known = Boolean(venueFor(city, to)) } catch { known = false }
      if (!known || to === from || NOT_A_STOP.has(to)) return no('invalid_destination', 'Choose another place in this city.')
    } else {
      from = city
      if (!cityCatalogueEntry(to) || to === city) return no('invalid_destination', 'Choose another city to fly to.')
    }
    const others = crew.members.filter((id) => id !== me && !kit.blocked(db, me, id) && !kit.ai(db, id))
    const picked = Array.isArray(body.members) ? [...new Set(body.members.map(idOf).filter((x): x is string => x !== null))] : others.length < GLUE.trip.members ? others : null
    if (!picked) return no('choose_people', 'Choose who comes: a trip takes twelve people at most.')
    if (!picked.length) return no('choose_people', 'Choose at least one person to come.')
    if (picked.length > GLUE.trip.members - 1) return no('too_many', `A trip takes ${GLUE.trip.members} people at most, you included.`)
    if (picked.some((id) => !others.includes(id))) return no('not_member', 'Everyone on a trip is in the crew.')
    const g = glueOf(ctx, db), mine = (g.crewTrips[crew.id] ?? []).map((id) => g.trips[id]).filter((t) => t && t.by === me && now() - t.at < 86400000).length
    if (mine >= GLUE.trip.perDay) return no('daily_limit', 'You have planned enough trips today.')
    const members: Record<string, TripAnswer> = { [me]: 'yes' }
    for (const id of picked) members[id] = 'waiting'
    const t: TripRecord = { id: `T${(++g.seq).toString(36)}${ctx.randomId().slice(0, 4)}`, crew: crew.id, by: me, mode: body.mode, city, from, to, members, at: now(), state: 'open' }
    g.trips[t.id] = t
    const list = (g.crewTrips[crew.id] ??= []); list.push(t.id); while (list.length > 30) delete g.trips[list.shift()!]
    const push: InboxPush = [], from_ = { id: me, name: kit.nameOf(db, me) }
    const where = `${t.mode === 'flight' ? 'a flight' : 'a danfo'} to ${placeLabel(t, to)}`
    for (const id of picked) inboxLine(ctx, db, id, { kind: 'crew', text: `${from_.name} is booking ${where} for ${crew.name}. Coming? Answer in Communities.`, from: { ...from_ } }, push)
    return { ok: true, trip: view(db, t, me), push }
  }
  const find = (db: Db, id: unknown): TripRecord | undefined => (typeof id === 'string' ? peekGlue(db)?.trips[id] : undefined)
  function answer(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; trip: TripView } | No {
    const t = find(db, body.id), me = session.publicId
    if (!t || t.members[me] === undefined) return no('unknown_trip', 'That trip was not found.')
    if (t.state !== 'open' || lapsed(t)) return no('trip_closed', 'That trip is no longer being booked.')
    if (t.by === me) return no('organiser', 'You are organising this trip.')
    if (typeof body.yes !== 'boolean') return no('invalid_answer', 'Say yes or no.')
    t.members[me] = body.yes ? 'yes' : 'no'
    return { ok: true, trip: view(db, t, me) }
  }
  /** The organiser lets go of someone (they are off the trip), or calls the trip off. */
  function manage(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; trip: TripView } | No {
    const t = find(db, body.id), me = session.publicId
    if (!t || t.by !== me) return no('unknown_trip', 'That trip is not yours.')
    if (t.state !== 'open') return no('trip_closed', 'That trip is no longer being booked.')
    if (body.action === 'cancel') { t.state = 'called-off'; return { ok: true, trip: view(db, t, me) } }
    const who = idOf(body.member)
    if (body.action === 'drop' && who && who !== me && t.members[who] !== undefined) { delete t.members[who]; return { ok: true, trip: view(db, t, me) } }
    return no('invalid_action', 'Drop someone or call the trip off.')
  }
  /**
   * GO (inside a transaction). Every check first, naming the person it is about; then the travel action for each, in the same transaction.
   * A refusal from the travel rules throws TripRefused, which undoes every departure made before it.
   */
  function go(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; trip: TripView; push: InboxPush } | No {
    const t = find(db, body.id), me = session.publicId
    if (!t || t.by !== me) return no('unknown_trip', 'That trip is not yours.')
    if (t.state !== 'open' || lapsed(t)) return no('trip_closed', 'That trip is no longer being booked.')
    const members = Object.entries(t.members).map(([id, answer]) => ({ id, name: kit.nameOf(db, id), answer }))
    const notReady = tripReady(members); if (notReady) return no('not_ready', notReady)
    const going = members.filter((m) => m.answer === 'yes')
    const sessions: [string, SessionRecord][] = []
    for (const m of going) {
      const s = ctx.core?.sessionByPublicId?.(db, m.id)
      if (!s || s.expiresAt <= now()) return no('member_away', `${m.name} cannot come right now.`)
      if (!presence.sockets(m.id).length) return no('member_offline', `Waiting for ${m.name} to come online.`)
      if (characterCity(s) !== t.city) return no('member_elsewhere', `${m.name} is in another city.`)
      sessions.push([m.id, s])
    }
    const states = sessions.map(([id, s]) => [id, ctx.settle(s, t.city as CityId)] as const)
    const away = states.filter(([, st]) => t.mode === 'danfo' && st.location !== t.from).map(([id]) => kit.nameOf(db, id))
    if (away.length) return no('not_at_meeting_point', `Waiting for ${listNames(away)} to get to ${placeLabel(t, t.from)}.`)
    const busy = states.filter(([, st]) => st.activeAction).map(([id]) => kit.nameOf(db, id))
    if (busy.length) return no('member_busy', `${listNames(busy)} ${busy.length === 1 ? 'is' : 'are'} busy with something else.`)
    let arrive = now()
    for (const [id, st] of states) {
      const done = ctx.act(st, { type: t.mode === 'danfo' ? 'travel' : 'estate.relocate', cityId: t.city as CityId,
        payload: t.mode === 'danfo' ? { id: t.to, mode: 'danfo' } : { to: t.to, mode: 'air' },
        actionId: `trip|${t.id}|${id}`, stateGuard: 'a group trip departs once: it is marked gone in this same transaction' })
      if (!done.ok) throw new TripRefused(done.code, `${kit.nameOf(db, id)} cannot leave: ${done.reason ?? 'the trip was refused'}`)
      const left = done.state.activeAction
      if (left) arrive = Math.max(arrive, now() + left.remaining * 1000)
    }
    t.state = 'gone'; t.leftAt = now(); t.arriveAt = arrive
    const push: InboxPush = []
    for (const m of going) if (m.id !== me) inboxLine(ctx, db, m.id, { kind: 'crew', text: `You are on the way to ${placeLabel(t, t.to)} together.` }, push)
    return { ok: true, trip: view(db, t, me), push }
  }
  return { list, create, answer, manage, go, view }
}

/** ERASURE: trips a person organised go; they leave every other trip. */
export function forgetTrips(db: Db, ids: ReadonlySet<string>): void {
  const g = peekGlue(db)
  if (!g?.trips) return
  for (const [crew, list] of Object.entries(g.crewTrips)) {
    const kept = list.filter((id) => { const t = g.trips[id]; if (!t) return false; if (ids.has(t.by)) { delete g.trips[id]; return false } for (const x of ids) delete t.members[x]; return true })
    if (kept.length) g.crewTrips[crew] = kept; else delete g.crewTrips[crew]
  }
}
