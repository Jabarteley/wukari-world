/**
 * OWNER: market
 * The Allworld Market under /api/market/: a play-money commodity exchange, one per city. The shared record and every rule are in
 * server/market/service.ts and src/game/market-model.ts; the contract of each body is in src/types/market.ts; the design is docs/MARKET.md.
 *
 * Conventions (the same as /api/business/)
 *   - GET routes take `?city=<cityId>`; POST routes take `cityId` in the JSON body. A deposit or a withdrawal works for the
 *     city the caller's character is in; orders, cancels and the anonymous choice work from anywhere.
 *   - Malformed requests throw (400/401/429). A well-formed request the rules refuse answers 200 `{ ok: false, code, reason }`
 *     with a reason a player can act on, and changes nothing.
 *   - Every write that moves naira or goods takes a MANDATORY `requestId` (`<unix ms>:<uuid>`) and goes through ctx.once:
 *     the same id again returns the first outcome with `duplicate: true`.
 *   - Everything is in-game naira through the wallet ledger. There is no real-money path (docs/REAL-VALUE.md).
 *
 * Routes (every answer carries the market view of the city: quotes, the tape, the caller's account, the limits)
 *   GET  /api/market/view?city=                       MarketViewResponse; works signed out (account: null)
 *   GET  /api/market/history?city=&commodity=         MarketHistoryResponse: the reference price each hour of the last 7 days
 *   POST /api/market/deposit   { cityId, amount, requestId }                                   → MarketWriteResponse (+ state)
 *   POST /api/market/withdraw  { cityId, amount, requestId }                                   → MarketWriteResponse (+ state)
 *   POST /api/market/order     { cityId, commodity, side, price, units, now?, requestId }      → MarketWriteResponse (+ fills)
 *   POST /api/market/cancel    { cityId, order, requestId }                                    → MarketWriteResponse
 *   POST /api/market/anon      { cityId, anon }                                                → MarketWriteResponse
 */
import type { CityId } from '../../src/types/protocol.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, RouteResult } from '../types.ts';
import { isCommodity } from '../../src/game/market-model.ts';
import { marketService } from '../market/service.ts';

type Body = Record<string, unknown>;
type Step = (db: Db, request: RouteRequest, cityId: CityId, body: Body) => object;

export default function marketRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const { store, fail } = ctx;
  const market = marketService(ctx);
  const cityParam = (value: unknown): CityId => { const found = ctx.cityIds.find((id) => id === value); if (typeof value !== 'string' || found === undefined) throw fail(400, 'invalid_city'); return found; };
  const limit = (bucket: string, key: string, count: number): void => { if (!ctx.allow(`market:${bucket}:${key}`, count)) throw fail(429, 'market_rate_limited'); };
  /** Prices need the server's secret salt: the first look at the market makes it, once. Every other read writes nothing. */
  const salted = async (): Promise<void> => { if (!await store.read((db) => market.hasSalt(db))) await store.transact((db) => { market.ensureSalt(db); }); };
  /** A write: one transaction under the caller's rate limit. */
  const write = (bucket: string, perMinute: number, step: Step): RouteHandler => async (request): Promise<RouteResult> => {
    const body = await request.json();
    const cityId = cityParam(body.cityId);
    const answer = await store.transact((db) => {
      limit(bucket, request.requireSession(db).publicId, perMinute);
      return step(db, request, cityId, body);
    });
    return { body: answer, renew: true };
  };

  return {
    'GET /api/market/view': async (request) => {
      const cityId = cityParam(request.query.get('city'));
      await salted();
      return { body: await store.read((db) => { limit('read', request.session(db)?.publicId ?? `ip:${request.ip}`, 120); return market.view(db, request, cityId); }) };
    },
    'GET /api/market/history': async (request) => {
      const cityId = cityParam(request.query.get('city')), commodity = request.query.get('commodity');
      if (!isCommodity(commodity)) throw fail(400, 'invalid_commodity');
      limit('history', `ip:${request.ip}`, 120);
      await salted();
      return { body: await store.read((db) => market.history(db, cityId, commodity)) };
    },
    'POST /api/market/deposit': write('money', 20, (db, request, cityId, body) => market.deposit(db, request, cityId, body)),
    'POST /api/market/withdraw': write('money', 20, (db, request, cityId, body) => market.withdraw(db, request, cityId, body)),
    'POST /api/market/order': write('order', 60, (db, request, cityId, body) => market.order(db, request, cityId, body)),
    'POST /api/market/cancel': write('cancel', 60, (db, request, cityId, body) => market.cancel(db, request, cityId, body)),
    'POST /api/market/anon': write('anon', 20, (db, request, cityId, body) => market.anon(db, request, cityId, body)),
  };
}
