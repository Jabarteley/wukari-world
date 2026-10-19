/**
 * OWNER: minigames
 * LOCAL MINI-GAMES under /api/minigames/ (docs/MINI-GAMES.md; the rules are in server/minigames/). Game naira only, settled by the server.
 *   GET  /api/minigames/haggle/stalls?city=              the city's market: its traders with what they remember of me, my buys today, my best haggle
 *   POST /api/minigames/haggle/open { cityId, trader, item }                        start (or resume) today's talk about an item
 *   POST /api/minigames/haggle/offer { cityId, trader, item, offer, requestId }     one offer; the server decides, the trader answers
 *   POST /api/minigames/haggle/buy { cityId, trader, item, requestId }              turn the held deal into a real purchase
 *   POST /api/minigames/skit/check { title, captions }                              the words of a skit pass the text filter
 *   GET  /api/minigames/seasons?city=                    NYSC camp and JAMB season: switches, my progress
 *   POST /api/minigames/nysc/join | duty | pass-out      the camp, three weeks
 *   POST /api/minigames/jamb/join | today | answer | mock/start | mock/submit      the revision season
 * Admin settings: haggleOpen, haggleModel, skitOpen, nyscOn (+ nyscBatch), jambOn (+ jambYear).
 */
import { registerAdminSetting } from '../admin/settings.ts'
import { haggleService } from '../minigames/haggle.ts'
import { jambService } from '../minigames/jamb.ts'
import { nyscService } from '../minigames/nysc.ts'
import { skitService } from '../minigames/skit.ts'
import { no } from '../minigames/common.ts'
import type { Small } from '../minigames/common.ts'
import type { HaggleTraderView } from '../../src/types/minigames.ts'
import { countryOfCity } from '../moderation/ai-intercept.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function minigamesRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const haggle = haggleService(ctx), skit = skitService(ctx), nysc = nyscService(ctx), jamb = jambService(ctx)
  registerAdminSetting(ctx, { key: 'haggleOpen', label: 'Mini-games: the market haggle is open', help: 'Players can haggle with the market traders and buy at the price they win.', kind: 'boolean', default: () => true })
  registerAdminSetting(ctx, { key: 'haggleModel', label: 'Mini-games: traders may be rephrased by a model', help: 'Off: written lines only. On: a few lines a person a day are rephrased by a model, under the model budget.', kind: 'boolean', default: () => true })
  registerAdminSetting(ctx, { key: 'skitOpen', label: 'Mini-games: the skit studio is open', help: 'Players can check the words of a skit before they record it.', kind: 'boolean', default: () => true })
  registerAdminSetting(ctx, { key: 'nyscOn', label: 'Season: NYSC camp is open', help: 'Nigeria only. Players can join this batch and live the three weeks of camp for game naira.', kind: 'boolean', default: () => false })
  registerAdminSetting(ctx, { key: 'nyscBatch', label: 'Season: NYSC batch label', help: 'A new label starts a new batch: everyone can join again. Keep it short, for example 2026-C.', kind: 'text', max: 12, default: () => '2026-C' })
  registerAdminSetting(ctx, { key: 'jambOn', label: 'Season: JAMB season is open', help: 'Nigeria only. Players can join this season: daily practice, a mock exam and a results-day card for game naira.', kind: 'boolean', default: () => false })
  registerAdminSetting(ctx, { key: 'jambYear', label: 'Season: JAMB season label', help: 'A new label starts a new season: everyone can join again. Keep it short, for example 2027.', kind: 'text', max: 12, default: () => '2027' })

  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {} }
  const limited = (session: SessionRecord): void => { if (!ctx.allow(`minigames:${session.publicId}`, 120, 60_000)) throw ctx.fail(429, 'rate_limited') }
  async function write<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord, b: Record<string, unknown>, now: number) => R): Promise<{ body: R; renew: true }> {
    const b = await body(request)
    const result = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(session); return call(db, session, b, ctx.now()) })
    return { body: result, renew: true }
  }
  /** A write that charges, pays or advances something: exactly once per request id. `then` reads the new state after the write. */
  async function once<R extends object>(request: RouteRequest, kind: string, call: (db: Db, session: SessionRecord, b: Record<string, unknown>, now: number) => Small | { ok: false; code: string; reason: string },
    then: (db: Db, session: SessionRecord, b: Record<string, unknown>, done: Small, now: number) => R, parsed?: Record<string, unknown>) {
    const b = parsed ?? await body(request)
    if (typeof b.requestId !== 'string') throw ctx.fail(400, 'invalid_request')
    ctx.onceId(b.requestId)
    const result = await ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true }); limited(session)
      const done = ctx.once(db, session, { id: b.requestId as string, kind, fingerprint: { c: b.cityId ?? null, t: b.trader ?? null, i: b.item ?? b.id ?? b.duty ?? null, o: b.offer ?? b.option ?? b.choice ?? null, a: Array.isArray(b.answers) ? b.answers.join(',') : null } }, (at) => call(db, session, b, at))
      if (!done.ok) return done
      return { ...then(db, session, b, done, ctx.now()), ...('duplicate' in done ? { duplicate: true } : {}) }
    })
    return { body: result, renew: true as const }
  }

  const stalls = (request: RouteRequest) => ctx.store.read((db) => haggle.stalls(db, request.requireSession(db), request.query.get('city') ?? '', ctx.now()))
  const traderAfter = (db: Db, session: SessionRecord, b: Record<string, unknown>, now: number) => haggle.traderView(db, session, typeof b.cityId === 'string' ? b.cityId : '', b.trader, now)

  return {
    'GET /api/minigames/haggle/stalls': async (request) => ({ body: await stalls(request), headers: NO_STORE }),
    'POST /api/minigames/haggle/open': (request) => write(request, (db, session, b, now) => haggle.open(db, session, b, now)),
    'POST /api/minigames/haggle/offer': async (request) => {
      const b = await body(request)
      const first = await once(request, 'minigames.offer', (db, session, p, at) => haggle.offer(db, session, p, at),
        (db, session, p, done, now) => { const trader = traderAfter(db, session, p, now); return trader ? { ok: true as const, trader, said: done.said ?? '', viaModel: false } : no('unknown_trader', 'There is no such trader in this market.') }, b)
      const answer = first.body as { ok?: boolean; duplicate?: boolean; trader?: HaggleTraderView; said?: string; viaModel?: boolean }
      if (!answer.ok || answer.duplicate || !answer.trader) return first
      // The model may say the verdict another way: outside the transaction, within the daily caps, and held to the same amounts and the same verdict. The price never changes.
      const now = ctx.now()
      const made = await ctx.store.read((db) => haggle.rephrasePlan(db, request.requireSession(db), b, now)).then((plan) => (plan ? haggle.rephraseAsk(plan) : null)).catch(() => null)
      if (!made) return first
      const used = await ctx.store.transact((db) => { const session = request.requireSession(db); return haggle.useRephrase(db, session, b, now, made) ? traderAfter(db, session, b, now) : null })
      return used ? { body: { ...answer, trader: used, said: made.text, viaModel: true }, renew: true as const } : first
    },
    'POST /api/minigames/haggle/buy': (request) => once(request, 'minigames.buy', (db, session, b, at) => haggle.buy(db, session, b, at),
      (db, session, b, done, now) => { const trader = traderAfter(db, session, b, now); return trader ? { ok: true as const, trader, said: done.said ?? '', paid: done.paid ?? 0, best: haggle.bestOf(db, session) } : no('unknown_trader', 'There is no such trader in this market.') }),

    'POST /api/minigames/skit/check': (request) => write(request, (db, session, b, now) => skit.check(db, session, b, now)),

    'GET /api/minigames/seasons': async (request) => ({
      body: await ctx.store.read((db) => {
        const session = request.requireSession(db), city = request.query.get('city') ?? '', now = ctx.now()
        return { ok: true as const, seasons: { nigeria: countryOfCity(city) === 'ng', city, nysc: nysc.view(db, session, now), jamb: jamb.view(db, session, now) } }
      }), headers: NO_STORE }),
    'POST /api/minigames/nysc/join': (request) => once(request, 'minigames.nysc.join', (db, session, b, at) => nysc.join(db, session, b, at), (db, session, _b, _done, now) => ({ ok: true as const, nysc: nysc.view(db, session, now) })),
    'POST /api/minigames/nysc/duty': (request) => once(request, 'minigames.nysc.duty', (db, session, b, at) => nysc.duty(db, session, b, at), (db, session, _b, done, now) => ({ ok: true as const, nysc: nysc.view(db, session, now), paid: done.paid ?? 0 })),
    'POST /api/minigames/nysc/pass-out': (request) => once(request, 'minigames.nysc.passout', (db, session, b, at) => nysc.passOut(db, session, b, at), (db, session, _b, done, now) => ({ ok: true as const, nysc: nysc.view(db, session, now), paid: done.paid ?? 0 })),
    'POST /api/minigames/jamb/join': (request) => once(request, 'minigames.jamb.join', (db, session, b, at) => jamb.join(db, session, b, at), (db, session, _b, _done, now) => ({ ok: true as const, jamb: jamb.view(db, session, now) })),
    'POST /api/minigames/jamb/today': (request) => write(request, (db, session, b, now) => jamb.today(db, session, b, now)),
    'POST /api/minigames/jamb/answer': (request) => once(request, 'minigames.jamb.answer', (db, session, b, at) => jamb.answer(db, session, b, at),
      (db, session, b, _done, now) => { const result = jamb.answerResult(db, session, b.id); return result ? { ok: true as const, jamb: jamb.view(db, session, now), result } : no('not_today', 'That question is not one of today\'s.') }),
    'POST /api/minigames/jamb/mock/start': (request) => once(request, 'minigames.jamb.mock', (db, session, b, at) => jamb.mockStart(db, session, b, at), (db, session, _b, _done, now) => ({ ok: true as const, jamb: jamb.view(db, session, now) })),
    'POST /api/minigames/jamb/mock/submit': (request) => once(request, 'minigames.jamb.submit', (db, session, b, at) => jamb.mockSubmit(db, session, b, at), (db, session, _b, _done, now) => ({ ok: true as const, jamb: jamb.view(db, session, now) })),
  }
}
