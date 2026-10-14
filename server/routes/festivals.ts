/**
 * OWNER: growth
 * Festivals and match nights, the public read (the rules: src/festivals/, what an admin changed: server/admin/festivals.ts).
 *
 *   GET /api/world/festivals?city=<id>
 *        { now, city, country, extras: { festivals, hidden }, fixtures }   PUBLIC and the same for everyone: no session, nothing about
 *        any player. `country` is the city's country code (lower case); `extras` and `fixtures` are the admin's edits, which the page
 *        feeds to the same pure functions the server uses (activeFestivals, mainOccurrences, matchNights), so the Events app and the
 *        venue scenes need no second answer. Limited per address; cached for a minute.
 */
import { addressBucket } from '../host-context.ts';
import { festivalsOf } from '../admin/festivals.ts';
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts';
import { countryKey } from '../../src/festivals/calendar.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

/** The country code of a city: Nigeria's cities carry none in the catalogue. */
export function countryOfCity(cityId: string): string | null {
  try { const entry = cityCatalogueEntry(cityId); return entry ? countryKey(entry.countryISO ?? 'ng') : null; } catch { return null; }
}

export default function festivalRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const service = festivalsOf(ctx);
  return {
    'GET /api/world/festivals': async (request) => {
      if (!ctx.allow(`festivals:${addressBucket(request.ip)}`, 60, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const city = request.query.get('city') ?? '';
      if (!ctx.cityIds.some((id) => id === city)) throw ctx.fail(400, 'invalid_city');
      return { body: { now: ctx.now(), city, country: countryOfCity(city) ?? 'ng', extras: service.extras(), fixtures: service.fixtures() }, headers: { 'Cache-Control': 'public, max-age=60' } };
    },
  };
}
