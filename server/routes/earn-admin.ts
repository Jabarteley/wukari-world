/**
 * OWNER: social
 * Earn for the admins (the same gate and audit log as every admin route).
 *   GET  /api/admin/earn                 creator pool months (pot, shares, who is ready, what was sent) and this month's sales
 *   POST /api/admin/earn/pay { month }   founder only: send a payable month's shares as Bachs transfers to every ready account
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts'
import type { Admin } from '../admin/gate.ts'
import { audit } from '../admin/store.ts'
import { earnService } from '../earn/service.ts'
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function earnAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const earn = earnService(ctx)
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request)
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request))
    if (!admin) { countFailure(ctx, request); throw notFound(ctx) }
    accountBudget(ctx, admin, write)
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' })
    return admin
  }
  return {
    'GET /api/admin/earn': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => earn.admin(db)), headers: NO_STORE } },
    'POST /api/admin/earn/pay': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      if (!admin.root) return { body: { ok: false, code: 'founder_only', reason: 'Only the founder sends creator pool money.' }, headers: NO_STORE }
      if (!earn.pay.on()) return { body: { ok: false, code: 'earn_closed', reason: 'Bachs is not set up (BACHS_API_KEY).' }, headers: NO_STORE }
      const month = typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month) ? body.month : ''
      if (!month) throw ctx.fail(400, 'invalid_month')
      const list = await ctx.store.read((db) => earn.payList(db, month))
      if (!Array.isArray(list)) return { body: list, headers: NO_STORE }
      let paid = 0
      for (const row of list) {
        const r = await earn.pay.transfer({ account: row.acct, amount: row.amount, ref: `aw-pool-${month}-${row.id}`, group: `pool-${month}` })
        if (!r) continue
        paid++
        await ctx.store.transact((db) => {
          earn.notePaid(db, month, row.id, row.amount, r.status)
          audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'earn-pool-transfer', target: row.id, targetName: earn.nameOf(db, row.id), params: { month, amount: row.amount }, summary: `Creator pool ${month}: ₦${row.amount} sent`, reason: '' })
        })
      }
      const waiting = await ctx.store.read((db) => { const m = earn.peek(db)?.pool.months[month]; return Object.keys(m?.due ?? {}).filter((id) => !m?.paid?.[id]).length })
      return { body: { ok: true, paid, waiting }, headers: NO_STORE }
    },
  }
}
