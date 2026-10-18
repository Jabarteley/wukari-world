/**
 * OWNER: social
 * EARN under /api/earn/ (docs/EARN.md; rules in server/earn/service.ts). Real money through Bachs, never held by Allworld.
 *   GET  /api/earn/me                          my payout account, sales (bought and sold), creator pool points and shares
 *   POST /api/earn/account { email? }          open (or continue) my Bachs payout account: the address of Bachs's own onboarding page
 *   POST /api/earn/account/refresh             ask Bachs where my account stands
 *   GET  /api/earn/ready?id=                   can this player be paid (a ready payout account)? yes or no only
 *   POST /api/earn/price { event, price }      a ticket price for my event (0: free)
 *   POST /api/earn/pay { kind: ticket|gig, id, amount?, email }   a Bachs checkout paying the host or the worker directly
 *   POST /api/earn/pay/verify { ref }          after the checkout: Allworld asks Bachs itself
 * Admin: GET /api/admin/earn, POST /api/admin/earn/pay (server/routes/earn-admin.ts).
 */
import { HTTP_PER_MINUTE } from './social.ts'
import { earnService } from '../earn/service.ts'
import { registerAdminSetting } from '../admin/settings.ts'
import { EARN } from '../../src/earn/model.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function earnRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const earn = earnService(ctx)
  registerAdminSetting(ctx, { key: 'earnOpen', label: 'Earn: real-money payments open', help: 'Players can open a Bachs payout account, sell event tickets and pay gig workers (needs the BACHS_API_KEY secret).', kind: 'boolean', default: () => true })
  registerAdminSetting(ctx, { key: 'earnTicketFee', label: 'Earn: Allworld fee on tickets, percent', help: 'Taken by Bachs when a ticket is paid; the rest goes to the host.', kind: 'number', min: 0, max: 30, default: () => EARN.ticket.fee })
  registerAdminSetting(ctx, { key: 'earnGigFee', label: 'Earn: Allworld fee on gigs, percent', help: 'Taken by Bachs when a gig worker is paid; the rest goes to the worker.', kind: 'number', min: 0, max: 30, default: () => EARN.gig.fee })
  registerAdminSetting(ctx, { key: 'poolShare', label: 'Creator pool: percent of revenue shared', help: 'Of each month\'s business-boost revenue, split among creators by real engagement.', kind: 'number', min: 0, max: 90, default: () => EARN.pool.share })
  registerAdminSetting(ctx, { key: 'poolThreshold', label: 'Creator pool: smallest payout, naira', help: 'A smaller share is carried to the next month.', kind: 'number', min: 1000, max: 1_000_000, default: () => EARN.pool.threshold })
  const origin = (): string => { const o = typeof ctx.env === 'function' ? ctx.env('PUBLIC_ORIGIN') : ''; return /^https:\/\/[a-z0-9.-]+$/i.test(o ?? '') ? o! : 'https://joinallworld.com' }
  const later = (work: Promise<unknown>): void => { if (ctx.waitUntil) ctx.waitUntil(work.catch(() => undefined)); else void work.catch(() => undefined) }
  /** Ask Bachs about a sale; mark it paid when it went through. */
  async function settle(s: { id: string; ref: string; checkout?: string; account: string; at: number }) {
    const said = await earn.pay.verify({ ref: s.ref, ...(s.checkout ? { checkout: s.checkout } : {}), account: s.account })
    if (said?.paid) return ctx.store.transact((db) => earn.markPaid(db, s.id, said.amount))
    if (said && ctx.now() - s.at > 2 * 86400000) await ctx.store.transact((db) => earn.cancelSale(db, s.id))
    return null
  }
  let lastBeat = 0
  ctx.on?.('heartbeat', () => {
    if (ctx.now() - lastBeat < 5 * 60000) return
    lastBeat = ctx.now()
    later(ctx.store.transact((db) => earn.closeMonths(db)))
    if (earn.pay.on()) later(ctx.store.transact((db) => earn.awaiting(db)).then((sales) => Promise.all(sales.map(settle))))
  })
  async function write<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord) => R): Promise<R> {
    return ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true })
      if (!ctx.allow(`social:http:${session.publicId}`, HTTP_PER_MINUTE)) throw ctx.fail(429, 'rate_limited')
      return call(db, session)
    })
  }
  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : {} }
  const busy = { ok: false, code: 'provider_unavailable', reason: 'Bachs did not answer. Try again in a minute.' }
  return {
    'GET /api/earn/me': async (request) => ({ body: await ctx.store.read((db) => earn.me(db, request.requireSession(db))), headers: NO_STORE }),
    'POST /api/earn/account': async (request) => {
      const b = await body(request)
      const asked = await ctx.store.read((db) => { const s = request.requireSession(db); return { session: s, r: earn.canOpen(db, s, b) } })
      if (!asked.r.ok) return { body: asked.r }
      if (!ctx.allow(`earn:account:${asked.session.publicId}`, 10, 3600000)) throw ctx.fail(429, 'rate_limited')
      const { email, name, existing } = asked.r
      const state = existing ? await earn.pay.account(existing.acct) : await earn.pay.createAccount({ email, name, idempotency: `aw-acct-${asked.session.publicId}` })
      if (!state) return { body: busy }
      await ctx.store.transact((db) => earn.keepAccount(db, asked.session.publicId, state.id, email, state))
      const url = await earn.pay.accountLink(state.id, `${origin()}/?earn=account`, existing?.status === 'ready' ? 'update' : 'onboarding')
      return { body: url ? { ok: true, url } : busy }
    },
    'POST /api/earn/account/refresh': async (request) => {
      const session = await ctx.store.read((db) => request.requireSession(db))
      if (!ctx.allow(`earn:refresh:${session.publicId}`, 30, 3600000)) throw ctx.fail(429, 'rate_limited')
      const a = await ctx.store.read((db) => earn.peek(db)?.accounts[session.publicId])
      if (!a) return { body: { ok: false, code: 'no_account', reason: 'Open your payout account first.' } }
      const state = await earn.pay.account(a.acct)
      if (!state) return { body: busy }
      const status = await ctx.store.transact((db) => earn.setStatus(db, session.publicId, state))
      return { body: status ? { ok: true, status } : busy }
    },
    'GET /api/earn/ready': async (request) => ({ body: await ctx.store.read((db) => { request.requireSession(db); const id = request.query.get('id') ?? ''; return { ok: true as const, ready: earn.peek(db)?.accounts[id]?.status === 'ready' } }), headers: NO_STORE }),
    'POST /api/earn/price': async (request) => { const b = await body(request); return { body: await write(request, (db, s) => earn.setPrice(db, s, b)) } },
    'POST /api/earn/pay': async (request) => {
      const b = await body(request)
      const r = await write(request, (db, s) => earn.startSale(db, s, b))
      if (!r.ok) return { body: r }
      const s = r.sale
      const page = await earn.pay.checkout({ ref: s.ref, amount: s.amount, fee: s.fee, account: s.account, email: s.email ?? '', name: await ctx.store.read((db) => earn.nameOf(db, s.buyer)), back: `${origin()}/?earn=${encodeURIComponent(s.ref)}`, source: `allworld_${s.kind}` })
      if (!page) { await ctx.store.transact((db) => earn.cancelSale(db, s.id)); return { body: { ok: false, code: 'checkout_failed', reason: 'The payment page could not be opened. Try again in a minute.' } } }
      return { body: await ctx.store.transact((db) => { earn.keepCheckout(db, s.id, page.id); return { ok: true as const, pay: page.url, sale: earn.saleView(db, earn.peek(db)!.sales[s.id]!, s.buyer) } }) }
    },
    'POST /api/earn/pay/verify': async (request) => {
      const b = await body(request)
      const session = await ctx.store.read((db) => request.requireSession(db))
      if (!ctx.allow(`earn:verify:${session.publicId}`, 30, 3600000)) throw ctx.fail(429, 'rate_limited')
      const found = await ctx.store.read((db) => earn.ownSale(db, session.publicId, b.ref) ?? null)
      if (!found) return { body: { ok: false, code: 'unknown_sale', reason: 'That payment was not found.' } }
      const view = () => ctx.store.read((db) => ({ ok: true as const, sale: earn.saleView(db, earn.peek(db)!.sales[found.id]!, session.publicId) }))
      if (found.status === 'paid') return { body: await view() }
      if (found.status !== 'pending') return { body: { ok: false, code: 'closed', reason: 'That payment was cancelled.' } }
      const done = await settle(found)
      if (!done?.ok) return { body: { ok: false, code: 'not_paid', reason: 'The payment has not gone through yet. If you paid, wait a minute and check again.' } }
      return { body: await view() }
    },
  }
}
