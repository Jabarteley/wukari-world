/**
 * OWNER: social
 * THE SOCIAL GLUE under /api/glue/ (docs/SOCIAL-GLUE.md; rules in src/glue/model.ts, services in server/glue/). Every route needs a session.
 * Answers are { ok: true, … } or { ok: false, code, reason } (HTTP 200); writes are rate limited per person.
 *
 *   GET  /api/glue/close                           my close friends, my switch, and where the close friends who share with me are now
 *   GET  /api/glue/close/now                       only the lines (the HUD asks this once a minute while the page is visible)
 *   POST /api/glue/close     { on? , add? , remove? , ids? }
 *   GET  /api/glue/talks                           upcoming talks I may see, and the rooms I may host one in
 *   POST /api/glue/talks     { title, about?, start, minutes, room, speakers[] }
 *   POST /api/glue/talks/remind { id, on }   ·   /open { id }   ·   /cancel { id }
 *   GET  /api/glue/board?key=crew:<id>|campus:unilag
 *   POST /api/glue/board/posts { board, body }  ·  /same { id, on }  ·  /report { id, aboutMe? }  ·  /moderate { id, action: remove|restore }
 *   GET  /api/glue/trips?crew=
 *   POST /api/glue/trips     { crew, mode: danfo|flight, to, members?, cityId }
 *   POST /api/glue/trips/answer { id, yes }  ·  /manage { id, action: drop|cancel, member? }  ·  /go { id, cityId }
 *   GET  /api/glue/family
 *   POST /api/glue/family/propose { to, ring }  ·  /answer { id, yes }  ·  /withdraw  ·  /ceremony  ·  /home { on }  ·  /divorce
 * A change someone else should see at once is sent as a `world-live` frame of kind `glue` (src/types/world-events.ts); the page reads again.
 */
import { adminOf } from '../admin/gate.ts'
import { judge } from '../feed/review.ts'
import { closeService } from '../glue/close.ts'
import { talksService } from '../glue/talks.ts'
import { boardService } from '../glue/board.ts'
import { tripsService, TripRefused } from '../glue/trips.ts'
import { marriageService } from '../glue/marriage.ts'
import { sendInbox } from '../glue/inbox.ts'
import type { InboxPush } from '../glue/inbox.ts'
import { stagesService } from '../world-events/stages.ts'
import type { ServerFrame } from '../../src/types/protocol.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
type Glue = 'close' | 'trip' | 'family' | 'talk'

export default function glueRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const close = closeService(ctx), talks = talksService(ctx), board = boardService(ctx), trips = tripsService(ctx), family = marriageService(ctx), stages = stagesService(ctx)
  const tell = (ids: readonly string[], what: Glue): void => { for (const id of new Set(ids)) ctx.push(id, { type: 'world-live', kind: 'glue', what } as unknown as ServerFrame) }
  const later = (work: Promise<unknown>): void => { if (ctx.waitUntil) ctx.waitUntil(work.catch(() => undefined)); else void work.catch(() => undefined) }
  const isAdmin = (request: RouteRequest, db: Db): boolean => { try { return adminOf(ctx, db, request) !== null } catch { return false } }
  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : {} }
  async function write<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord, admin: boolean) => R): Promise<R> {
    return ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true })
      if (!ctx.allow(`glue:${session.publicId}`, 40, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a moment.' })
      return call(db, session, isAdmin(request, db))
    })
  }
  const read = <R>(request: RouteRequest, call: (db: Db, session: SessionRecord, admin: boolean) => R): Promise<R> => ctx.store.read((db) => call(db, request.requireSession(db), isAdmin(request, db)))
  /** Send what a committed write owes: inbox lines, glue frames. */
  const deliver = <R extends { ok: boolean; push?: InboxPush }>(r: R): Omit<R, 'push'> => { if (r.ok) sendInbox(ctx, r.push); const { push: _push, ...rest } = r; return rest }

  // ---- the gist board's reviewer ----------------------------------------------------------------------------------------------------
  async function reviewPost(id: string): Promise<void> {
    const seen = await ctx.store.read((db) => board.toReview(db, id))
    if (!seen) return
    const verdict = await judge(ctx, { kind: 'anonymous gist board post', text: seen.text, facts: seen.facts }).catch(() => null)
    const push = await ctx.store.transact((db) => board.reviewed(db, id, verdict)).catch(() => undefined)
    sendInbox(ctx, push)
  }
  let lastReview = 0, lastRemind = 0
  ctx.on?.('heartbeat', () => {
    const t = ctx.now()
    if (t - lastReview >= 5 * 60000) { lastReview = t; later(ctx.store.read((db) => board.pending(db)).then((ids) => Promise.all(ids.map(reviewPost)))) }
    if (t - lastRemind >= 60000) { lastRemind = t; later(ctx.store.transact((db) => talks.remindCommunities(db), { durable: false }).then((push) => sendInbox(ctx, push))) }
  })

  return {
    // ---- close friends ----------------------------------------------------------------------------------------------------------------
    'GET /api/glue/close': async (request) => ({ body: await read(request, (db, s) => close.view(db, s.publicId)), headers: NO_STORE }),
    'GET /api/glue/close/now': async (request) => ({ body: await read(request, (db, s) => ({ ok: true, now: close.now(db, s.publicId) })), headers: NO_STORE }),
    'POST /api/glue/close': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => close.set(db, s.publicId, b))
      if (!r.ok) return { body: r }
      tell(r.tell, 'close')
      return { body: r.view, renew: true }
    },

    // ---- talks ------------------------------------------------------------------------------------------------------------------------
    'GET /api/glue/talks': async (request) => ({ body: await read(request, (db, s) => talks.list(db, s)), headers: NO_STORE }),
    'POST /api/glue/talks': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => talks.create(db, s, b)), renew: true } },
    'POST /api/glue/talks/remind': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => talks.remind(db, s, b)), renew: true } },
    'POST /api/glue/talks/open': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s, admin) => talks.open(db, s, b, admin))
      if (!r.ok) return { body: r }
      stages.committed(r.room, r.stage)
      sendInbox(ctx, r.push); tell(r.push.map(([id]) => id), 'talk')
      return { body: { ok: true, room: r.room }, renew: true }
    },
    'POST /api/glue/talks/cancel': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => talks.cancel(db, s, b))
      if (r.ok && r.room) stages.committed(r.room, r.stage)
      return { body: r.ok ? { ok: true } : r, renew: true }
    },

    // ---- the gist board ---------------------------------------------------------------------------------------------------------------
    'GET /api/glue/board': async (request) => {
      const key = request.query.get('key')
      const view = await read(request, (db, s, admin) => board.board(db, s, key, admin))
      // A reader of a campus board joins the names it screens for (at most once in ten minutes).
      if (view.ok && view.key === 'campus:unilag') later(ctx.store.transact((db) => { const s = request.requireSession(db); if (ctx.allow(`glue:reader:${s.publicId}`, 1, 600000)) board.noteReader(db, 'campus:unilag', s.publicId) }, { durable: false }))
      return { body: view, headers: NO_STORE }
    },
    'POST /api/glue/board/posts': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => board.post(db, s, b))
      if (!r.ok) return { body: r }
      later(reviewPost(r.review))
      return { body: { ok: true, post: r.post }, renew: true }
    },
    'POST /api/glue/board/same': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => board.same(db, s, b)) } },
    'POST /api/glue/board/report': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => board.report(db, s, b))
      if (!r.ok) return { body: r }
      if (r.review) later(reviewPost(r.review))
      return { body: { ok: true } }
    },
    'POST /api/glue/board/moderate': async (request) => { const b = await body(request); return { body: deliver(await write(request, (db, s, admin) => board.moderate(db, s, b, admin))) } },

    // ---- group trips ------------------------------------------------------------------------------------------------------------------
    'GET /api/glue/trips': async (request) => ({ body: await read(request, (db, s) => trips.list(db, s, request.query.get('crew') ?? undefined)), headers: NO_STORE }),
    'POST /api/glue/trips': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => trips.create(db, s, b))
      if (r.ok) tell(r.trip.members.map((m) => m.id), 'trip')
      return { body: deliver(r), renew: true }
    },
    'POST /api/glue/trips/answer': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => trips.answer(db, s, b))
      if (r.ok) tell(r.trip.members.map((m) => m.id), 'trip')
      return { body: r, renew: true }
    },
    'POST /api/glue/trips/manage': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => trips.manage(db, s, b))
      if (r.ok) tell(r.trip.members.map((m) => m.id), 'trip')
      return { body: r, renew: true }
    },
    'POST /api/glue/trips/go': async (request) => {
      const b = await body(request)
      try {
        const r = await write(request, (db, s) => trips.go(db, s, b))
        if (r.ok) tell(r.trip.members.map((m) => m.id), 'trip')
        return { body: deliver(r), renew: true }
      } catch (error) {
        // One person's travel was refused: the whole transaction was undone, nobody left and nobody paid.
        if (error instanceof TripRefused) return { body: { ok: false, code: error.code, reason: error.reason } }
        throw error
      }
    },

    // ---- family life ------------------------------------------------------------------------------------------------------------------
    'GET /api/glue/family': async (request) => ({ body: await read(request, (db, s) => family.mine(db, s)), headers: NO_STORE }),
    'POST /api/glue/family/propose': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => family.propose(db, s, b))
      if (r.ok && typeof b.to === 'string') tell([b.to.toLowerCase()], 'family')
      return { body: deliver(r), renew: true }
    },
    'POST /api/glue/family/answer': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => family.answer(db, s, b))
      if (r.ok) tell(r.push.map(([id]) => id), 'family')
      return { body: deliver(r), renew: true }
    },
    'POST /api/glue/family/withdraw': async (request) => ({ body: await write(request, (db, s) => family.withdraw(db, s)), renew: true }),
    'POST /api/glue/family/ceremony': async (request) => {
      const r = await write(request, (db, s) => family.ceremony(db, s))
      if (!r.ok) return { body: r }
      family.announce(r.room, r.names, r.line)
      tell(r.push.map(([id]) => id), 'family')
      const { room: _room, names: _names, ...rest } = deliver(r)
      return { body: rest, renew: true }
    },
    'POST /api/glue/family/home': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => family.shareHome(db, s, b)), renew: true } },
    'POST /api/glue/family/divorce': async (request) => {
      const r = await write(request, (db, s) => family.divorce(db, s))
      if (r.ok) tell(r.push.map(([id]) => id), 'family')
      return { body: deliver(r), renew: true }
    },
  }
}
