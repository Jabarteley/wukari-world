/**
 * OWNER: social
 * STAGE ROOMS: hosted talks (docs/SOCIAL-GLUE.md), Phase 2's stage mode (server/world-events/stages.ts) at a time people were told about.
 *
 *   PLAN     an adult picks a title, a time, a length, up to five speakers among their friends (adults), and where: the Square, the public
 *            venue they are standing in, or the 3D world of a community they belong to. The talk is an ordinary feed event (so it has a
 *            page, "remind me" is going, and the feed's reminder goes out half an hour before); a community's talk is kept off the city's
 *            list and its post is for the community's members only.
 *   OPEN     from 15 minutes before the start until the end, the host (or an admin) standing in the room opens the stage: the host
 *            moderates, the speakers are invited to take their seats, the audience raises hands and asks questions (the stage's own rules:
 *            adults to speak, questions screened, one vote each). Everyone who asked to be reminded is told it has started.
 *   RECORDING is not built: the voice is peer to peer in the room's circle and nothing of it reaches the server (docs/SOCIAL-GLUE.md).
 * Portable: no Node imports.
 */
import { GLUE, isTalkMinutes, talkPhase, talkStartRefusal } from '../../src/glue/model.ts'
import type { TalkView, TalksView } from '../../src/types/glue.ts'
import { SQUARE_ROOM, roomKeyOf } from '../../src/places/model.ts'
import { characterCity } from '../character.ts'
import { feedService } from '../feed/service.ts'
import { peekFeed } from '../feed/data.ts'
import { stagesService } from '../world-events/stages.ts'
import { placeName, venueName } from '../world-events/service.ts'
import { glueOf, peekGlue } from './data.ts'
import type { TalkRecord } from './data.ts'
import { glueKit, idOf, no } from './common.ts'
import type { No } from './common.ts'
import { inboxLine } from './inbox.ts'
import type { InboxPush } from './inbox.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'
import type { Stage } from '../../src/world-events/stage.ts'

const NOT_A_PLACE = new Set(['home', 'neighbourhood', 'city-street'])

export function talksService(ctx: RouteContext) {
  const kit = glueKit(ctx), stages = stagesService(ctx)
  const inRoom = (id: string, room: string): boolean => ctx.checks?.inRoom?.(id, room) === true

  /** Where this person may host a talk now: the Square, the public venue they stand in, their communities' worlds. */
  function rooms(db: Db, session: SessionRecord): { room: string; label: string; city: string; crew?: string }[] {
    const out: { room: string; label: string; city: string; crew?: string }[] = [{ room: SQUARE_ROOM, label: 'The Square', city: 'world' }]
    const city = characterCity(session), venue = city ? session.cities?.[city]?.state?.location : undefined
    if (city && typeof venue === 'string' && !NOT_A_PLACE.has(venue)) out.push({ room: `${city}:${venue}`, label: `${venueName(city, venue)}, ${placeName(city)}`, city })
    const f = peekFeed(db)
    for (const key of f?.authors[session.publicId]?.crews ?? []) {
      const crew = f!.crews[key]
      if (crew && !crew.banned && crew.conv && crew.members.includes(session.publicId)) out.push({ room: roomKeyOf(crew.conv), label: `${crew.name}'s world`, city: 'world', crew: crew.id })
    }
    return out
  }
  /** May this viewer see the talk? A community's talk: its members only. Never someone in a block with the host. */
  function visible(db: Db, t: TalkRecord, viewer: string): boolean {
    if (kit.blocked(db, t.by, viewer)) return false
    if (!t.crew) return true
    return peekFeed(db)?.crews[t.crew]?.members.includes(viewer) === true
  }
  function view(db: Db, t: TalkRecord, viewer: string): TalkView | null {
    const e = peekFeed(db)?.events[t.id]
    if (!e || e.gone) return null
    const stage = (db as unknown as { worldEvents?: { stages?: Record<string, Stage> } }).worldEvents?.stages?.[t.room]
    const stageOpen = Boolean(t.opened && stage && stage.endsAt > ctx.now() && stage.openedAt >= t.opened - 1000)
    const phase = talkPhase({ start: e.start, end: e.end, stageOpen }, ctx.now())
    const host = { id: t.by, name: kit.nameOf(db, t.by) }
    return { id: t.id, event: t.id, title: e.title, about: e.about, start: e.start, end: e.end, phase, host, speakers: t.speakers.map((id) => ({ id, name: kit.nameOf(db, id) })),
      room: t.room, place: t.place, city: t.city, going: e.going.length, reminded: e.going.includes(viewer), mine: t.by === viewer,
      canOpen: phase === 'open' && (t.by === viewer) && inRoom(viewer, t.room) }
  }
  function list(db: Db, session: SessionRecord): TalksView {
    const g = peekGlue(db), me = session.publicId
    const talks = (g?.talkList ?? []).map((id) => g!.talks[id]).filter((t): t is TalkRecord => Boolean(t) && visible(db, t!, me))
      .map((t) => view(db, t, me)).filter((v): v is TalkView => Boolean(v) && v!.phase !== 'over').sort((a, b) => a.start - b.start).slice(0, 40)
    return { ok: true, talks, rooms: rooms(db, session).map(({ room, label }) => ({ room, label })) }
  }
  function create(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; talk: TalkView } | No {
    const me = session.publicId
    if (!kit.adult(db, me)) return no('adults_only', 'Hosting a talk is for people confirmed as 18 or older.')
    const muted = ctx.checks?.muted?.(me); if (muted) return no(muted.code, muted.reason)
    const where = rooms(db, session).find((r) => r.room === body.room)
    if (!where) return no('invalid_room', 'Choose the Square, the place you are standing in, or a community you belong to.')
    const late = talkStartRefusal(body.start, ctx.now()); if (late) return no('invalid_time', late)
    const minutes = isTalkMinutes(body.minutes) ? body.minutes : 60
    const speakers = [...new Set((Array.isArray(body.speakers) ? body.speakers : []).map(idOf).filter((x): x is string => x !== null && x !== me))]
    if (speakers.length > GLUE.talk.speakers) return no('too_many_speakers', `Invite at most ${GLUE.talk.speakers} speakers.`)
    for (const id of speakers) {
      if (!kit.friends(db, me, id) || kit.blocked(db, me, id)) return no('friends_only', 'Speakers are chosen among your friends.')
      if (!kit.adult(db, id) && !kit.ai(db, id)) return no('adults_only', `${kit.nameOf(db, id)} cannot speak: speakers are confirmed as 18 or older.`)
    }
    const g = glueOf(ctx, db), day = Math.floor(ctx.now() / 86400000)
    const today = g.talkList.filter((id) => g.talks[id]?.by === me && Math.floor(g.talks[id]!.at / 86400000) === day).length
    if (today >= GLUE.talk.perDay) return no('daily_limit', 'You have planned enough talks today.')
    const feed = feedService(ctx)
    const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim().slice(0, GLUE.talk.titleMax) : ''
    if (title.length < GLUE.talk.titleMin) return no('invalid_title', 'Give the talk a title.')
    const about = typeof body.about === 'string' ? body.about.trim().slice(0, GLUE.talk.aboutMax) : ''
    const city = where.city === 'world' ? (characterCity(session) ?? 'lagos') : where.city
    const made = feed.createEvent(db, session, { title: `Talk: ${title}`.slice(0, 60), about: about || `A talk at ${where.label}. Raise your hand to speak; ask your question in writing.`, start: body.start, hours: minutes / 60, place: where.label, city })
    if (!made.ok) return no(made.code, made.reason)
    const id = made.event.id
    if (where.crew) {
      // A community's talk is for its members: off the city's list and the link, and its post is the community's own.
      const f = peekFeed(db)!, e = f.events[id]!
      const lists = f.cities[e.city]; if (lists) lists.events = lists.events.filter((x) => x !== id)
      delete f.codes[e.code]
      const post = e.post ? f.posts[e.post] : undefined; if (post) { post.vis = 'crew'; post.crew = where.crew }
    }
    const t: TalkRecord = { id, by: me, room: where.room, place: where.label, city, speakers, at: ctx.now(), ...(where.crew ? { crew: where.crew } : {}) }
    g.talks[id] = t; g.talkList.push(id)
    while (g.talkList.length > 200) delete g.talks[g.talkList.shift()!]
    return { ok: true, talk: view(db, t, me)! }
  }
  /** "Remind me" (going) or not. */
  function remind(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; talk: TalkView } | No {
    const t = typeof body.id === 'string' ? peekGlue(db)?.talks[body.id] : undefined
    if (!t || !visible(db, t, session.publicId)) return no('unknown_talk', 'That talk was not found.')
    if (t.by === session.publicId) return no('host', 'You are hosting this talk.')
    const r = feedService(ctx).rsvp(db, session, { id: t.id, answer: body.on === false ? null : 'going' })
    if (!r.ok) return no(r.code, r.reason)
    return { ok: true, talk: view(db, t, session.publicId)! }
  }
  /** The host opens the stage (inside a transaction): returns the stage to commit, and the people to tell. */
  function open(db: Db, session: SessionRecord, body: Record<string, unknown>, admin: boolean): { ok: true; stage: Stage; room: string; push: InboxPush } | No {
    const g = peekGlue(db), t = typeof body.id === 'string' ? g?.talks[body.id] : undefined, me = session.publicId
    if (!t) return no('unknown_talk', 'That talk was not found.')
    if (t.by !== me && !admin) return no('not_host', 'Only the host opens the stage.')
    const e = peekFeed(db)?.events[t.id]
    if (!e || e.gone) return no('unknown_talk', 'That talk was called off.')
    const now = ctx.now()
    if (now < e.start - GLUE.talk.openEarlyMs) return no('too_early', 'The stage opens 15 minutes before the start.')
    if (now >= e.end) return no('talk_over', 'This talk has ended.')
    if (!admin && !inRoom(me, t.room)) return no('not_here', `Go to ${t.place} first: the stage opens where you stand.`)
    if (stages.live(t.room)) return no('stage_open', 'Another stage is open in that room now. Wait for it to end.')
    const invited = t.speakers.filter((id) => !kit.blocked(db, me, id)).map((id) => ({ id, name: kit.nameOf(db, id) }))
    const stage = stages.open(db, t.room, { kind: 'talk', title: e.title.replace(/^Talk: /, ''), minutes: Math.ceil((e.end - now) / 60000), moderator: t.by, invited })
    glueOf(ctx, db).talks[t.id]!.opened = now
    const push: InboxPush = []
    for (const id of [...new Set([...e.going, ...t.speakers])]) if (id !== me) inboxLine(ctx, db, id, { kind: 'rsvp', text: `${e.title.replace(/^Talk: /, '')} is live now at ${t.place}`, ...(e.post ? { post: e.post } : {}) }, push)
    return { ok: true, stage, room: t.room, push }
  }
  /** The host calls it off: the feed event goes (its own call-off tells everyone going), and an open stage ends. */
  function cancel(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; room: string | null; stage: Stage | null } | No {
    const g = peekGlue(db), t = typeof body.id === 'string' ? g?.talks[body.id] : undefined
    if (!t || t.by !== session.publicId) return no('unknown_talk', 'That talk is not yours.')
    const r = feedService(ctx).cancelEvent(db, session, { id: t.id })
    if (!r.ok) return no(r.code, r.reason)
    const stage = t.opened ? stages.close(db, t.room) : null
    return { ok: true, room: stage ? t.room : null, stage }
  }
  /**
   * Heartbeat: the half-hour reminder of a community's talk (a talk in a venue or the Square is on its city's list, so the feed's own
   * reminder sends it). One line to everyone going, once.
   */
  function remindCommunities(db: Db): InboxPush {
    const g = peekGlue(db), f = peekFeed(db), push: InboxPush = []
    if (!g || !f) return push
    for (const id of g.talkList) {
      const t = g.talks[id], e = f.events[id]
      if (!t?.crew || !e || e.gone || e.reminded || e.start - ctx.now() > 30 * 60000 || e.start < ctx.now() - 60000) continue
      e.reminded = 1
      for (const who of e.going) if (who !== t.by) inboxLine(ctx, db, who, { kind: 'rsvp', text: `${e.title} starts soon at ${t.place}`, ...(e.post ? { post: e.post } : {}) }, push)
    }
    return push
  }
  return { rooms, list, create, remind, open, cancel, remindCommunities }
}

/** ERASURE: talks a person hosted go (their feed events go with the feed's own erasure); they leave every speaker list. */
export function forgetTalks(db: Db, ids: ReadonlySet<string>): void {
  const g = peekGlue(db)
  if (!g?.talks) return
  for (const id of [...g.talkList]) {
    const t = g.talks[id]
    if (!t) continue
    if (ids.has(t.by)) { delete g.talks[id]; g.talkList = g.talkList.filter((x) => x !== id); continue }
    if (t.speakers.some((x) => ids.has(x))) t.speakers = t.speakers.filter((x) => !ids.has(x))
  }
}
