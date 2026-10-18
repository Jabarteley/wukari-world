/**
 * OWNER: social
 * Allworld for Business for the admins (the same gate and audit log as every admin route).
 *   GET  /api/admin/promote                      orders (newest first), listings, revenue this month and in all
 *   POST /api/admin/promote/act  { order, action: paid | cancel } | { listing, action: approve | remove | restore, note? }
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts'
import type { Admin } from '../admin/gate.ts'
import { audit } from '../admin/store.ts'
import { promoteService } from '../promote/service.ts'
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function promoteAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const promote = promoteService(ctx)
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request)
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request))
    if (!admin) { countFailure(ctx, request); throw notFound(ctx) }
    accountBudget(ctx, admin, write)
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' })
    return admin
  }
  return {
    'GET /api/admin/promote': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => promote.admin(db)), headers: NO_STORE } },
    'POST /api/admin/promote/act': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      const action = typeof body.action === 'string' ? body.action : ''
      if (!['paid', 'cancel', 'approve', 'remove', 'restore'].includes(action)) throw ctx.fail(400, 'invalid_action')
      const result = await ctx.store.transact((db) => {
        const r = promote.act(db, body)
        if (r.ok) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: `promote-${action}`, target: String(body.order ?? body.listing ?? ''), targetName: body.order ? 'order' : 'listing', params: {}, summary: `Business ${body.order ? 'order' : 'listing'} ${action}`, reason: typeof body.note === 'string' ? body.note : '' })
        return r
      })
      return { body: result, headers: NO_STORE }
    },
  }
}
