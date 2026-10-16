/**
 * OWNER: social
 * Clans, ladders and city leagues, under /api/clans/. Thin adapters: the rules are in src/clans/ and server/clans/ (docs/CLANS.md).
 *
 *   GET  /api/clans/me                      { clan | null, colours, cap, homeCity, canCreate }
 *   GET  /api/clans/preview?code=           what a code is (public facts), before joining
 *   POST /api/clans/create  { name, colour, city?, clientId }
 *   POST /api/clans/join    { code }          POST /api/clans/leave      POST /api/clans/kick { id }
 *   POST /api/clans/role    { id, role: deputy | member | leader }       POST /api/clans/edit { name?, colour?, city? }
 *   POST /api/clans/code                      a new invite code (leader or deputy)
 *   POST /api/clans/venue   { city, venue } | { venue: null }   the venue where the clan holds a room (leader; 10 or more people)
 *   POST /api/clans/prize   { cityId }        claim the last war's prize (game money)
 *   GET  /api/clans/boards?period=week|season&game=   friends, city, weekly group, clan, country, then everyone
 *   GET  /api/clans/league?game=              this week's cities and countries, and last week's winner
 * Answers are { ok: true, code, … } or { ok: false, code, reason } (HTTP 200); a malformed request is 400. Every route but preview
 * and league needs the device session and shares the social routes' per-player rate limit.
 */
import { HTTP_PER_MINUTE } from './social.ts';
import { socialService, MATERIAL } from '../social/service.ts';
import { clanService } from '../clans/service.ts';
import { ladderService } from '../clans/ladder.ts';
import { validGame, fromArena } from '../../src/clans/results.ts';
import { characterCity } from '../character.ts';
import { prepareStoredCityContent } from '../request-city-content.ts';
import type { ArenaFinished } from '../../src/clans/results.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts';

export default function clanRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const social = socialService(ctx), clans = clanService(ctx), ladder = ladderService(ctx);
  // Finished games reach the ladders in the transaction that recorded them (tables), or by this event (the arena).
  if (ctx.checks) ctx.checks.gameResult = (db, result) => ladder.record(db, result);
  ctx.on?.('game-result', (done: unknown) => {
    const result = fromArena(done as ArenaFinished);
    if (!result) return;
    const work = ctx.store.transact((db) => ladder.record(db, result), { durable: false }).catch(() => undefined);
    ctx.waitUntil?.(work);
  });
  async function run<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord) => R): Promise<R> {
    const result = await ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true });
      if (!ctx.allow(`social:http:${session.publicId}`, HTTP_PER_MINUTE)) throw ctx.fail(429, 'rate_limited');
      return social.finish(db, call(db, session));
    }, { durable: (value) => request.method !== 'GET' || Reflect.get(value, MATERIAL) === true, waitForObserved: true, committed: (value) => social.committed(value) });
    return social.deliver(result) as R;
  }
  const game = (request: RouteRequest): string | null => { const g = request.query.get('game'); if (g === null || g === '' || g === 'all') return null; if (!validGame(g)) throw ctx.fail(400, 'invalid_game'); return g; };
  const noStore = { 'Cache-Control': 'no-store' };
  return {
    'GET /api/clans/me': async (request) => ({ body: await run(request, (db, session) => clans.mine(db, session)), renew: true }),
    'GET /api/clans/preview': async (request) => {
      if (!ctx.allow(`clans:preview:${request.ip}`, 30, 60000)) throw ctx.fail(429, 'rate_limited');
      return { body: await ctx.store.read((db) => clans.preview(db, request.query.get('code'))), headers: noStore };
    },
    'POST /api/clans/create': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => clans.create(db, session, body)), renew: true }; },
    'POST /api/clans/join': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => clans.join(db, session, body)), renew: true }; },
    'POST /api/clans/leave': async (request) => ({ body: await run(request, (db, session) => clans.leave(db, session)), renew: true }),
    'POST /api/clans/kick': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => clans.kick(db, session, body)), renew: true }; },
    'POST /api/clans/role': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => clans.role(db, session, body)), renew: true }; },
    'POST /api/clans/edit': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => clans.edit(db, session, body)), renew: true }; },
    'POST /api/clans/venue': async (request) => {
      const body = await request.json();
      // The venue is checked against its city's content, which is loaded on demand.
      if (typeof body.city === 'string' && ctx.cityIds.some((x) => x === body.city)) { const held = await ctx.store.read((db) => request.requireSession(db)); await prepareStoredCityContent(ctx, held, [body.city]); }
      return { body: await run(request, (db, session) => clans.venue(db, session, body)), renew: true };
    },
    'POST /api/clans/code': async (request) => ({ body: await run(request, (db, session) => clans.newCode(db, session)), renew: true }),
    'POST /api/clans/prize': async (request) => {
      const body = await request.json();
      const city = await ctx.store.read((db) => { const session = request.requireSession(db); return characterCity(session) ?? (typeof body.cityId === 'string' && ctx.cityIds.some((x) => x === body.cityId) ? body.cityId : null); });
      if (!city) throw ctx.fail(400, 'invalid_city');
      const held = await ctx.store.read((db) => request.requireSession(db));
      await prepareStoredCityContent(ctx, held, [city]);
      return { body: await run(request, (db, session) => clans.prize(db, session, city)), renew: true };
    },
    'GET /api/clans/boards': async (request) => {
      const period = request.query.get('period') === 'season' ? 'season' as const : 'week' as const, g = game(request);
      const body = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        if (!ctx.allow(`social:http:${session.publicId}`, HTTP_PER_MINUTE)) throw ctx.fail(429, 'rate_limited');
        return { ok: true as const, ...ladder.boards(db, session.publicId, period, g) };
      }, { durable: false });
      return { body, headers: noStore, renew: true };
    },
    'GET /api/clans/league': async (request) => {
      if (!ctx.allow(`clans:league:${request.ip}`, 60, 60000)) throw ctx.fail(429, 'rate_limited');
      const g = game(request);
      return { body: await ctx.store.read((db) => ({ ok: true as const, ...ladder.league(db, request.session(db)?.publicId ?? null, g) })), headers: { 'Cache-Control': 'private, max-age=30' } };
    },
  };
}
