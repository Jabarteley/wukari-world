import { readPublicProfile } from '../public-profile.ts'
import { publicProfilePageHtml, unavailableProfilePageHtml } from '../public-profile-page.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'

const headers = { 'Cache-Control': 'no-store' }

export default function profileRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  ctx.pages?.set('/p/', async ({ path, query, origin, ip, method }) => {
    if (method !== 'GET' && method !== 'HEAD') return { status: 405, cache: false, html: unavailableProfilePageHtml(origin) }
    if (!ctx.allow(`profile:page:${ip}`, 60, 60000)) return { status: 429, cache: false, html: unavailableProfilePageHtml(origin) }
    const id = path.startsWith('/p/') ? path.slice(3) : ''
    const result = await readPublicProfile(ctx, { id, after: query.has('after') ? query.get('after') : null })
    if (!result.ok) return { status: result.code === 'invalid_profile_cursor' ? 400 : 404, cache: false, html: unavailableProfilePageHtml(origin) }
    return { status: 200, cache: false, html: publicProfilePageHtml(result.profile, origin) }
  })

  return {
    'GET /api/profiles/:id': async (request) => {
      if (!ctx.allow(`profile:read:${request.ip}`, 60, 60000)) throw ctx.fail(429, 'rate_limited')
      const viewer = await ctx.store.read(db => request.session(db)?.publicId ?? null)
      const result = await readPublicProfile(ctx, { id: request.params.id ?? '', after: request.query.has('after') ? request.query.get('after') : null, viewer })
      if (!result.ok) throw ctx.fail(result.code === 'invalid_profile_cursor' ? 400 : 404, result.code)
      return { body: { profile: result.profile }, headers }
    },
  }
}
