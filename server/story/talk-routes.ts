import { storyTalk } from './talk-service.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'

export default function storyTalkRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const service = storyTalk(ctx)
  return {
    'GET /api/story/talk': async request => ({ body: await service.view(request), renew: true }),
    'POST /api/story/talk': async request => ({ body: await service.turn(request), renew: true }),
  }
}
