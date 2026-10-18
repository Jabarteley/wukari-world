/**
 * OWNER: social
 * The operator's view of the feed (docs/FEED.md, "Reports"), under /api/mod/feed. Authenticated by the operator's bearer token.
 *   GET  /api/mod/feed                         open reports, newest first, with the text reported
 *   POST /api/mod/feed { kind, id, n?, action: remove | clear }
 */
import { feedService } from '../feed/service.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'

export default function feedModRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const feed = feedService(ctx)
  return {
    'GET /api/mod/feed': async (request) => {
      if (!request.moderator()) throw ctx.fail(401, 'moderator_required')
      return { body: await ctx.store.read((db) => feed.queue(db)) }
    },
    'POST /api/mod/feed': async (request) => {
      if (!request.moderator()) throw ctx.fail(401, 'moderator_required')
      const body = await request.json()
      const outcome = await ctx.store.transact((db) => { feed.takeTrash(); const r = feed.moderate(db, body); return { r, trash: feed.takeTrash() } })
      if (outcome.trash.length && ctx.models) ctx.waitUntil?.(ctx.models.remove(outcome.trash).catch(() => undefined))
      return { body: outcome.r }
    },
  }
}
