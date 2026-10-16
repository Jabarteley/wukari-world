/**
 * OWNER: world
 * The city gist: short public lines of what happened in a city (docs/GIST.md). Reads the ledger of server/gist/ledger.ts.
 *
 *   GET /api/world/gist?id=<city id>[&since=<n>][&limit=<1..50>]   PUBLIC, no session needed; limited per address; cached for 15 seconds.
 *        { city, items: [{ n, at, city, kind, text }], latest }   newest first; the city's own lines and the world's (the Square, the nation)
 *        `since` returns only lines numbered above it; `latest` is the newest number the world has, so a reader can ask again cheaply.
 *   Public on purpose: every line was already public when it was written and holds no id; nothing here is about the caller.
 *   The city is `id`, not `city`, so the host does not load that city's content first (request-city-content.ts).
 */
import { addressBucket } from '../host-context.ts';
import { gistService, peekGist } from '../gist/ledger.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { readEpisode, weekKept, weekOfName } from '../gist/episode.ts';
import { episodePageHtml, noEpisodeHtml } from '../gist/episode-page.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function gistRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const gist = gistService(ctx);
  // The ledger follows the public record, the counts and the calendar on the host's heartbeat.
  ctx.on?.('heartbeat', () => { void gist.tick(); });
  const whole = (value: string | null, fallback: number, max: number): number => { const n = value === null ? NaN : Number(value); return Number.isSafeInteger(n) && n >= 0 ? Math.min(n, max) : fallback; };
  /** The week a request asks for: the current one when none is named; null when it is not a Monday or not one of the last eight. */
  const weekAsked = (name: string | null | undefined): number | null => {
    const now = ctx.now();
    if (!name) return lagosTime(now).week;
    const week = weekOfName(name);
    return week !== null && weekKept(week, now) ? week : null;
  };
  const episodeOf = (city: string, week: number) => ctx.store.read((db) => readEpisode(ctx, db, city, week));
  // The public page /episode/<city>[/<monday>]: small HTML with its own preview tags (docs/EPISODES.md). Cached a few minutes by the host.
  ctx.pages?.set('/episode/', async ({ path, origin, ip }) => {
    if (!ctx.allow(`episode:page:${addressBucket(ip)}`, 60, 60000)) return { status: 429, cache: false, html: noEpisodeHtml(origin) };
    let parts: string[];
    try { parts = decodeURIComponent(path.slice('/episode/'.length)).split('/').filter(Boolean); } catch { return { status: 404, cache: false, html: noEpisodeHtml(origin) }; }
    const city = parts[0] ?? '', week = parts.length <= 2 ? weekAsked(parts[1]) : null;
    if (!ctx.cityIds.some((id) => id === city) || week === null) return { status: 404, cache: false, html: noEpisodeHtml(origin) };
    return { status: 200, html: episodePageHtml(await episodeOf(city, week), origin) };
  });
  return {
    'GET /api/world/episode': async (request) => {
      if (!ctx.allow(`episode:${addressBucket(request.ip)}`, 30, 60000)) throw Object.assign(ctx.fail(429, 'episode_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const city = request.query.get('id');
      if (!city || !ctx.cityIds.some((id) => id === city)) throw ctx.fail(400, 'invalid_city');
      const week = weekAsked(request.query.get('week'));
      if (week === null) throw ctx.fail(400, 'invalid_week');
      return { body: { episode: await episodeOf(city, week) }, headers: { 'Cache-Control': 'public, max-age=300' } };
    },
    'GET /api/world/gist': async (request) => {
      if (!ctx.allow(`gist:${addressBucket(request.ip)}`, 30, 60000)) throw Object.assign(ctx.fail(429, 'gist_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const city = request.query.get('id');
      if (!city || !ctx.cityIds.some((id) => id === city)) throw ctx.fail(400, 'invalid_city');
      const since = whole(request.query.get('since'), 0, Number.MAX_SAFE_INTEGER), limit = Math.max(1, whole(request.query.get('limit'), 30, 50));
      const body = await ctx.store.read((db) => ({ city, items: gist.recent(db, city, { since, limit }).map(({ n, at, city: where, kind, text }) => ({ n, at, city: where, kind, text })), latest: peekGist(db).seq }));
      return { body, headers: { 'Cache-Control': 'public, max-age=15' } };
    },
  };
}
