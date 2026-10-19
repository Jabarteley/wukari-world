/**
 * OWNER: social
 * The neighbourhood for the admins (the same gate and audit log as every admin route).
 *   GET  /api/admin/neighbourhood                 notices (newest first, with reports and the reviewer's reason) and the meetups planned
 *   POST /api/admin/neighbourhood/act    { notice, action: remove | restore, note? }
 *   POST /api/admin/neighbourhood/meetup { city, lga, title?, about?, place?, price? }   the admin hosts that local government's meetup this month
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts'
import type { Admin } from '../admin/gate.ts'
import { audit } from '../admin/store.ts'
import { neighbourhoodService } from '../neighbourhood/service.ts'
import { loadCityRules } from '../../src/game/cities/registry.ts'
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
export default function neighbourhoodAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const hood = neighbourhoodService(ctx)
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request)
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request))
    if (!admin) { countFailure(ctx, request); throw notFound(ctx) }
    accountBudget(ctx, admin, write)
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' })
    return admin
  }
  return {
    'GET /api/admin/neighbourhood': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => hood.admin(db)), headers: NO_STORE } },
    'POST /api/admin/neighbourhood/act': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      const action = typeof body.action === 'string' ? body.action : ''
      if (!['remove', 'restore'].includes(action)) throw ctx.fail(400, 'invalid_action')
      const result = await ctx.store.transact((db) => {
        const r = hood.act(db, body)
        if (r.ok) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: `neighbourhood-${action}`, target: String(body.notice ?? ''), targetName: 'notice', params: {}, summary: `Neighbourhood notice ${action}`, reason: typeof body.note === 'string' ? body.note : '' })
        return r
      })
      return { body: result, headers: NO_STORE }
    },
    'POST /api/admin/neighbourhood/meetup': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      if (typeof body.city === 'string') await loadCityRules(body.city).catch(() => null)
      const result = await ctx.store.transact((db) => {
        const r = hood.planAsAdmin(db, admin.session, body)
        if (r.ok) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'neighbourhood-meetup', target: r.meetup.event.id, targetName: 'meetup', params: {}, summary: `Planned the ${r.meetup.area.name} meetup`, reason: '' })
        return r
      })
      return { body: result, headers: NO_STORE }
    },
  }
}
