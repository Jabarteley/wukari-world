/**
 * OWNER: social
 * THE ECONOMY DASHBOARD of a city (docs/NEIGHBOURHOOD.md), public and read-only: no session, no name beyond the rich list the game already shows.
 *   GET /api/economy?city=       { city, cityName, rich, prices, government, circulation }   (server/economy/dashboard.ts)
 *   GET /economy/<city>          the same as a small HTML page with preview tags (ctx.pages: both hosts; the Worker lists the prefix)
 * Game naira only. Limited per address; the page is cached by the host for a few minutes.
 */
import { addressBucket } from '../host-context.ts'
import { economyView } from '../economy/dashboard.ts'
import { economyNotFoundHtml, economyPageHtml } from '../economy/page.ts'
import { loadCityRules } from '../../src/game/cities/registry.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'

export default function economyRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const ttl = (): number => ctx.config.sessionTtlMs
  const view = async (city: string) => { await loadCityRules(city).catch(() => null); return ctx.store.read((db) => economyView(db, city, ctx.now(), ttl())) }
  const known = (city: string): boolean => ctx.cityIds.some((id) => id === city)
  ctx.pages?.set('/economy/', async ({ path, origin, ip }) => {
    if (!ctx.allow(`economy:page:${addressBucket(ip)}`, 60, 60000)) return { status: 429, cache: false, html: economyNotFoundHtml(origin) }
    let city: string
    try { city = decodeURIComponent(path.slice('/economy/'.length)).split('/')[0] ?? '' } catch { return { status: 404, cache: false, html: economyNotFoundHtml(origin) } }
    if (!known(city)) return { status: 404, cache: false, html: economyNotFoundHtml(origin) }
    return { status: 200, html: economyPageHtml(await view(city), origin) }
  })
  return {
    'GET /api/economy': async (request) => {
      if (!ctx.allow(`economy:${addressBucket(request.ip)}`, 60, 60000)) throw ctx.fail(429, 'rate_limited')
      const city = request.query.get('city') ?? ctx.cityIds[0] ?? 'lagos'
      if (!known(city)) throw ctx.fail(400, 'invalid_city')
      return { body: { ok: true, ...(await view(city)) }, headers: { 'Cache-Control': 'public, max-age=60' } }
    },
  }
}
