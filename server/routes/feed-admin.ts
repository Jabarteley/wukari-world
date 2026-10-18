/**
 * OWNER: social
 * The feed's decisions for the admins (signed-in admin accounts, the same gate and audit log as every admin route: server/admin/gate.ts).
 *   GET  /api/admin/feed                       the AI reviewer's and operators' newest decisions, with the text they were about
 *   POST /api/admin/feed/undo   { n, reason? } put back what decision n changed (removed or hidden things come back)
 *   POST /api/admin/feed/act    { kind, id, rn?, action: remove | hide | keep, reason? }   an admin's own decision, also undoable
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts'
import type { Admin } from '../admin/gate.ts'
import { audit } from '../admin/store.ts'
import { feedService } from '../feed/service.ts'
import type { Push } from '../feed/service.ts'
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }
const KINDS = ['post', 'reply', 'crew', 'event', 'gig', 'profile'] as const

export default function feedAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const feed = feedService(ctx)
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request)
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request))
    if (!admin) { countFailure(ctx, request); throw notFound(ctx) }
    accountBudget(ctx, admin, write)
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' })
    return admin
  }
  return {
    'GET /api/admin/feed': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => feed.decisions(db)), headers: NO_STORE } },
    'POST /api/admin/feed/undo': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      const n = Number(body.n)
      if (!Number.isSafeInteger(n) || n < 1) throw ctx.fail(400, 'invalid_decision')
      const result = await ctx.store.transact((db) => {
        const r = feed.undo(db, n, admin.name)
        if (r.ok) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'feed-undo', target: `${r.decision.kind}:${r.decision.id}`, targetName: r.decision.kind, params: { n }, summary: `Undid the ${r.decision.by === 'ai' ? 'AI reviewer' : 'operator'}'s ${r.decision.action} (${r.decision.category})`, reason: typeof body.reason === 'string' ? body.reason : '' })
        return r
      })
      return { body: result, headers: NO_STORE }
    },
    'POST /api/admin/feed/act': async (request) => {
      const admin = await enter(request, true), body = await request.json()
      const kind = KINDS.find((k) => k === body.kind), action = body.action === 'remove' || body.action === 'hide' || body.action === 'keep' ? body.action : null
      if (!kind || !action || typeof body.id !== 'string' || body.id.length > 80) throw ctx.fail(400, 'invalid_action')
      const id: string = body.id
      const push: Push = []
      const result = await ctx.store.transact((db) => {
        const r = feed.decide(db, { by: 'operator', kind, id, ...(typeof body.rn === 'number' ? { rn: body.rn } : {}), action, category: 'admin', reason: typeof body.reason === 'string' ? body.reason.slice(0, 200) : '' }, push)
        if (r.ok) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: `feed-${action}`, target: `${kind}:${id}`, targetName: kind, params: {}, summary: `Feed ${kind} ${action}`, reason: typeof body.reason === 'string' ? body.reason : '' })
        return r.ok ? { ok: true as const, n: r.decision.n } : r
      })
      for (const [to, frame] of push) ctx.push(to, frame)
      return { body: result, headers: NO_STORE }
    },
  }
}
