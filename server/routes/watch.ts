/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md)
 * Shared watching under /api/watch/: match predictions, Allworld House and artist premieres. Thin adapters: the rules are src/watch/, the
 * services server/watch/.
 *
 *   GET  /api/watch/matches?city=            the fixtures this city's country is shown, the caller's picks, results, badges
 *   POST /api/watch/predict { fixture, winner, score? }    a pick before kick-off (never an amount)
 *   GET  /api/watch/board?season=            the season's board (default: this season)
 *   GET  /api/watch/house                    Allworld House: the season, the housemates (AI), the diary lines, the weeks, my vote
 *   POST /api/watch/house/vote { mate }      an adult's save vote, once a week
 *   GET  /api/watch/premieres                approved artists' premieres; my application; my events (for an approved artist)
 *   POST /api/watch/artist/apply { name, about?, links?, track }
 *   POST /api/watch/premiere { event, world? }           an approved artist turns one of their Plans events into a premiere
 *   POST /api/watch/premiere/cancel { id }
 *
 * Answers are { ok: true, … } or { ok: false, code, reason } (HTTP 200); malformed is 400. Writes are rate limited per player.
 */
import { seasonOf } from '../../src/watch/predictions.ts';
import { predictionsService } from '../watch/predictions.ts';
import { houseService } from '../watch/house.ts';
import { premieresService } from '../watch/premieres.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const SEASON = /^\d{4}\/\d{2}$/;
export default function watchRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const predictions = predictionsService(ctx), house = houseService(ctx), premieres = premieresService(ctx);
  ctx.startup?.push(house.load());
  const limited = (key: string, count: number): void => { if (!ctx.allow(key, count, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a moment.' }); };
  const body = async (request: RouteRequest): Promise<Record<string, unknown>> => { const b = await request.json(); return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {}; };
  async function write<R extends object>(request: RouteRequest, kind: string, call: (db: Db, session: SessionRecord, b: Record<string, unknown>) => R): Promise<{ body: R; renew: true }> {
    const b = await body(request);
    const result = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(`watch:${kind}:${session.publicId}`, 30); return call(db, session, b); });
    return { body: result, renew: true };
  }
  return {
    'GET /api/watch/matches': async (request) => {
      const city = request.query.get('city') ?? '';
      if (!ctx.cityIds.some((id) => id === city)) throw ctx.fail(400, 'invalid_city');
      return { body: await ctx.store.read((db) => predictions.matches(db, request.requireSession(db).publicId, city, ctx.now())), headers: NO_STORE };
    },
    'POST /api/watch/predict': (request) => write(request, 'predict', (db, session, b) => predictions.predict(db, session, b, ctx.now())),
    'GET /api/watch/board': async (request) => {
      const asked = request.query.get('season'), season = asked && SEASON.test(asked) ? asked : seasonOf(ctx.now());
      return { body: await ctx.store.read((db) => predictions.board(db, request.requireSession(db).publicId, season)), headers: NO_STORE };
    },
    'GET /api/watch/house': async (request) => ({ body: await ctx.store.read((db) => house.view(db, request.requireSession(db).publicId, ctx.now())), headers: NO_STORE }),
    'POST /api/watch/house/vote': (request) => write(request, 'vote', (db, session, b) => house.vote(db, session, b, ctx.now())),
    'GET /api/watch/premieres': async (request) => ({ body: await ctx.store.read((db) => premieres.list(db, request.requireSession(db).publicId)), headers: NO_STORE }),
    'POST /api/watch/artist/apply': (request) => write(request, 'apply', (db, session, b) => premieres.apply(db, session, b)),
    'POST /api/watch/premiere': (request) => write(request, 'premiere', (db, session, b) => premieres.schedule(db, session, b)),
    'POST /api/watch/premiere/cancel': (request) => write(request, 'premiere', (db, session, b) => premieres.cancel(db, session, b)),
  };
}
