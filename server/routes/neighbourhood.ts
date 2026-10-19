/**
 * OWNER: social
 * THE NEIGHBOURHOOD under /api/neighbourhood/ (docs/NEIGHBOURHOOD.md; rules in server/neighbourhood/service.ts). Everything here is for a
 * signed-in person whose location badge names the area; the badge is the feed's (the position never left the phone).
 *   GET  /api/neighbourhood/board                      the noticeboard of my area, and my own notices still being checked or refused
 *   POST /api/neighbourhood/notices        { kind, body }          post one (an adult; the AI reviewer reads it before it is up)
 *   POST /api/neighbourhood/notices/vote   { id, vote: up|down|null }   "still true?"
 *   POST /api/neighbourhood/notices/report { id }
 *   POST /api/neighbourhood/notices/remove { id }                  my own
 *   GET  /api/neighbourhood/meetups                    the "Meet your neighbours" meetups of my city, my area first; the communities I could host one for
 *   POST /api/neighbourhood/meetups/plan   { crew, title?, about?, place?, price? }   a community founder plans this month's meetup
 * Admin: GET /api/admin/neighbourhood, POST /api/admin/neighbourhood/act, POST /api/admin/neighbourhood/meetup (server/routes/neighbourhood-admin.ts).
 */
import { HTTP_PER_MINUTE } from './social.ts'
import { neighbourhoodService } from '../neighbourhood/service.ts'
import { judge } from '../feed/review.ts'
import { loadCityRules } from '../../src/game/cities/registry.ts'
import { peekFeed } from '../feed/data.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function neighbourhoodRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const hood = neighbourhoodService(ctx)
  /** The reviewer reads a notice (words only); tried again on the heartbeat when it had no answer. */
  async function reviewNotice(id: string): Promise<void> {
    const seen = await ctx.store.read((db) => hood.toReview(db, id))
    if (!seen) return
    const verdict = await judge(ctx, { kind: 'neighbourhood notice', text: seen.text, facts: seen.facts }).catch(() => null)
    await ctx.store.transact((db) => hood.reviewed(db, id, verdict)).catch(() => undefined)
  }
  const later = (work: Promise<unknown>): void => { if (ctx.waitUntil) ctx.waitUntil(work.catch(() => undefined)); else void work.catch(() => undefined) }
  let lastBeat = 0
  ctx.on?.('heartbeat', () => {
    if (ctx.now() - lastBeat < 5 * 60000) return
    lastBeat = ctx.now()
    later(ctx.store.read((db) => hood.pending(db)).then((ids) => Promise.all(ids.map(reviewNotice))))
  })
  async function write<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord) => R): Promise<R> {
    return ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true })
      if (!ctx.allow(`social:http:${session.publicId}`, HTTP_PER_MINUTE)) throw ctx.fail(429, 'rate_limited')
      return call(db, session)
    })
  }
  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : {} }
  /** The city rules of the person's badge city, so its local governments are known by name before the service reads them. */
  const unitsOf = async (city: string | undefined): Promise<void> => { if (city) await loadCityRules(city).catch(() => null) }
  const badgeCity = (request: RouteRequest): Promise<string | undefined> => ctx.store.read((db) => { const s = request.session(db); return s ? peekFeed(db)?.authors[s.publicId]?.located?.city : undefined })
  return {
    'GET /api/neighbourhood/board': async (request) => {
      await unitsOf(await badgeCity(request))
      return { body: await ctx.store.read((db) => hood.board(db, request.requireSession(db).publicId)), headers: NO_STORE }
    },
    'POST /api/neighbourhood/notices': async (request) => {
      const b = await body(request)
      await unitsOf(await badgeCity(request))
      const r = await write(request, (db, s) => hood.post(db, s, b))
      if (!r.ok) return { body: r }
      const { review, ...rest } = r
      later(reviewNotice(review))
      return { body: rest, renew: true }
    },
    'POST /api/neighbourhood/notices/vote': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => hood.vote(db, s, b)) } },
    'POST /api/neighbourhood/notices/report': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => hood.report(db, s, b))
      if (!r.ok) return { body: r }
      if (r.review) later(reviewNotice(r.review))
      return { body: { ok: true } }
    },
    'POST /api/neighbourhood/notices/remove': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => hood.remove(db, s, b)) } },
    'GET /api/neighbourhood/meetups': async (request) => {
      await unitsOf(await badgeCity(request))
      return { body: await ctx.store.read((db) => hood.meetups(db, request.session(db)?.publicId ?? null)), headers: NO_STORE }
    },
    'POST /api/neighbourhood/meetups/plan': async (request) => {
      const b = await body(request)
      await unitsOf(await badgeCity(request))
      return { body: await write(request, (db, s) => hood.planAsFounder(db, s, b)) }
    },
  }
}
