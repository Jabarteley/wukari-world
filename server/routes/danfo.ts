/**
 * OWNER: danfo
 * DRIVE A DANFO under /api/danfo/ (docs/DANFO.md; the rules are in server/danfo/service.ts). Game naira only.
 *   GET  /api/danfo/park?city=                    the motor park: the city's lines, this week's best on each, my day, my run, runs leaving now
 *   POST /api/danfo/start { cityId, routeId, requestId }          start a run (the server draws the seed and the traffic)
 *   POST /api/danfo/stop { runId, stop, call: served|passed }     the next stop; the server's clock checks it was possible
 *   POST /api/danfo/finish { runId, requestId, hardBrakes, crashes }   the end of the line: settled, capped, paid, ranked
 *   POST /api/danfo/abandon { runId }             leave my run (nothing is paid), or get down from someone's bus
 *   GET  /api/danfo/run?id=                        one run as its driver or crew sees it (the ride-along view polls this)
 *   POST /api/danfo/join { runId, role }           ride along as a passenger or as the conductor
 *   POST /api/danfo/leave { runId }                get down
 *   POST /api/danfo/shout { runId }                the conductor calls the next stop (a line from the city's bank)
 *   POST /api/danfo/collect { runId, requestId }   the conductor's share of a finished run
 *   GET  /api/danfo/board?route=                   a line's weekly board
 * Admin settings: danfoOpen (the motor park is open), danfo3d (the 3D road view is offered to devices that can draw it).
 */
import { registerAdminSetting } from '../admin/settings.ts'
import { danfoService } from '../danfo/service.ts'
import type { Small } from '../danfo/service.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function danfoRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const danfo = danfoService(ctx)
  registerAdminSetting(ctx, { key: 'danfoOpen', label: 'Danfo: the motor park is open', help: 'Players can drive danfo runs for game naira, ride along and see the weekly boards.', kind: 'boolean', default: () => true })
  registerAdminSetting(ctx, { key: 'danfo3d', label: 'Danfo: 3D road view', help: 'Devices that can draw it get the 3D road; off, everyone drives the 2D lanes.', kind: 'boolean', default: () => true })

  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {} }
  const limited = (session: SessionRecord): void => { if (!ctx.allow(`danfo:${session.publicId}`, 120, 60_000)) throw ctx.fail(429, 'rate_limited') }
  async function write<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord, b: Record<string, unknown>) => R): Promise<{ body: R; renew: true }> {
    const b = await body(request)
    const result = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(session); return call(db, session, b) })
    return { body: result, renew: true }
  }
  /** A write that creates or pays something: exactly once per request id. The receipt is small; the run is read after it. */
  async function once(request: RouteRequest, kind: string, call: (db: Db, session: SessionRecord, b: Record<string, unknown>) => Small | { ok: false; code: string; reason: string }) {
    const b = await body(request)
    if (typeof b.requestId !== 'string') throw ctx.fail(400, 'invalid_request')
    ctx.onceId(b.requestId)
    const result = await ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true }); limited(session)
      const done = ctx.once(db, session, { id: b.requestId as string, kind, fingerprint: { runId: b.runId ?? null, routeId: b.routeId ?? null } }, () => call(db, session, b))
      if (!done.ok) return done
      const read = danfo.run(db, session, done.runId)
      return read.ok ? { ...read, ...(done.paid !== undefined ? { paid: done.paid } : {}), ...('duplicate' in done ? { duplicate: true } : {}) } : read
    })
    return { body: result, renew: true as const }
  }
  return {
    'GET /api/danfo/park': async (request) => ({ body: await ctx.store.read((db) => danfo.park(db, request.requireSession(db), request.query.get('city') ?? '', ctx.now())), headers: NO_STORE }),
    'POST /api/danfo/start': (request) => once(request, 'danfo.start', (db, session, b) => danfo.start(db, session, b)),
    'POST /api/danfo/stop': (request) => write(request, (db, session, b) => danfo.stop(db, session, b)),
    'POST /api/danfo/finish': (request) => once(request, 'danfo.finish', (db, session, b) => danfo.finish(db, session, b)),
    'POST /api/danfo/abandon': (request) => write(request, (db, session, b) => danfo.abandon(db, session, b)),
    'GET /api/danfo/run': async (request) => ({ body: await ctx.store.read((db) => danfo.run(db, request.requireSession(db), request.query.get('id'))), headers: NO_STORE }),
    'POST /api/danfo/join': (request) => write(request, (db, session, b) => danfo.join(db, session, b)),
    'POST /api/danfo/leave': (request) => write(request, (db, session, b) => danfo.leave(db, session, b)),
    'POST /api/danfo/shout': (request) => write(request, (db, session, b) => danfo.shout(db, session, b)),
    'POST /api/danfo/collect': (request) => once(request, 'danfo.collect', (db, session, b) => danfo.collect(db, session, b)),
    'GET /api/danfo/board': async (request) => ({ body: await ctx.store.read((db) => danfo.board(db, request.requireSession(db), request.query.get('route'), ctx.now())), headers: NO_STORE }),
  }
}
