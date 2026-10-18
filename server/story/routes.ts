import { registerAdminSetting } from '../admin/settings.ts'
import { socialService } from '../social/service.ts'
import { transactWithCityContent } from '../prepared-city-transaction.ts'
import { storyCoop } from './coop.ts'
import { storySignature } from './signature.ts'
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts'

export default function storyRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  registerAdminSetting(ctx, { key: 'storyMode', label: 'Story mode', help: 'Allow the per-character Story mode switch and friend challenges. Free roam remains the default.', kind: 'boolean', default: () => false })
  const service = storyCoop(ctx), signature = storySignature(ctx), social = socialService(ctx)
  const run = async (request: RouteRequest, op: Parameters<typeof service.perform>[2]) => {
    const body = await request.json()
    await service.prepare(request, body)
    const result = await transactWithCityContent(ctx, request, [], db => {
      const session = request.requireSession(db, { renew: true })
      return social.finish(db, service.perform(db, session, op, body))
    }, { waitForObserved: true, committed: value => social.committed(value) })
    const done = social.deliver(result)
    const job = done.job
    return { body: done.reply, renew: true, ...(job ? { after: () => service.send(job) } : {}) }
  }
  return {
    'GET /api/story/help': async request => {
      await service.prepare(request)
      const result = await transactWithCityContent(ctx, request, [], db => social.finish(db, service.list(db, request.requireSession(db, { renew: true }))), { waitForObserved: true, committed: value => social.committed(value) })
      return { body: social.deliver(result), renew: true }
    },
    'POST /api/story/help': request => run(request, 'call'),
    'POST /api/story/help/join': request => run(request, 'join'),
    'POST /api/story/help/answer': request => run(request, 'answer'),
    'POST /api/story/help/seat': request => run(request, 'seat'),
    'POST /api/story/help/errand': request => run(request, 'errand'),
    'POST /api/story/help/end': request => run(request, 'end'),
    'GET /api/story/signature': async request => ({
      body: await transactWithCityContent(ctx, request, [], db => signature.view(db, request.requireSession(db, { renew: true })), { waitForObserved: true }),
      renew: true,
    }),
    'POST /api/story/signature': async request => {
      const parsed: unknown = await request.json()
      const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
      ctx.onceId(body.clientId)
      return {
        body: await transactWithCityContent(ctx, request, [], db => signature.perform(db, request.requireSession(db, { renew: true }), body), { waitForObserved: true }),
        renew: true,
      }
    },
  }
}
