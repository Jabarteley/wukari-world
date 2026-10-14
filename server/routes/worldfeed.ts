/**
 * OWNER: world
 * The world feed for one city: the day's real exchange rates and the city's real weather (docs/WORLD-FEED.md).
 *
 *   GET /api/world/feed?id=<city id>   PUBLIC, no session needed; limited per address; cached for five minutes.
 *        { day, rates, weather, credits }   (besides `serverTime`)
 *        day      the UTC day of the rates ("2026-10-14"), or null while the server has none yet
 *        rates    units of currency one US dollar buys, only the city's own currency, NGN and USD
 *        weather  { at, hours: [[hourStart ms, kind, tempC|null], ...] } for the city, or null (then the old cycle applies)
 *        credits  { weather, weatherUrl, rates, ratesUrl }  the words the page must show; `rates` is null unless the fallback source was used
 *   The city is `id`, not `city`, on purpose: a `city` query makes the host load that city's content first (request-city-content.ts), which this
 *   route never needs.
 *   Nothing here waits on an outside service: it answers from what the server already holds.
 */
import { addressBucket } from '../host-context.ts';
import { worldFeedOf } from '../world-feed/service.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function worldFeedRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const feed = worldFeedOf(ctx);
  return {
    'GET /api/world/feed': async (request) => {
      if (!ctx.allow(`feed:${addressBucket(request.ip)}`, 30, 60000)) throw Object.assign(ctx.fail(429, 'feed_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const city = request.query.get('id');
      if (!city || !ctx.cityIds.some((id) => id === city)) throw ctx.fail(400, 'invalid_city');
      return { body: { ...feed.answer(city) }, headers: { 'Cache-Control': 'public, max-age=300' } };
    },
  };
}
