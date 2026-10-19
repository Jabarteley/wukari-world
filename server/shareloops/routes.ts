/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * The share loops' routes. Every answer is facts the player may already see; the cards are drawn on the device and shared from there.
 *
 *   GET /api/loops/passport                     the caller's stamps (the character's own city is stamped here too the first time)
 *   GET /api/loops/wrapped?month=YYYY-MM         the caller's month in figures (this month or the two before), ./wrapped.ts
 *   GET /api/loops/fame?id=<city>                this week's board of a city and the caller's badge, ./fame.ts
 *   GET /api/loops/frontpage?id=<city>           yesterday's front page of a city, PUBLIC (no session), cached five minutes, ./frontpage.ts
 *
 * Also wired here: the 'visit-ended' event feeds the fame board and Wrapped's homes, and on a live host (ctx.worldFeed) the heartbeat writes
 * the model front pages. A probe session or an AI agent's character gets the same answers; their visits still count (they are visitors).
 */
import { addressBucket } from '../host-context.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { characterCity } from '../character.ts';
import { stampPassport } from './stamp.ts';
import { passportView } from './passport.ts';
import { monthAllowed, monthOf, wrappedOf } from './wrapped.ts';
import { fameView, noteVisit } from './fame.ts';
import { frontPageOf, frontPages } from './frontpage.ts';
import { loopsOf } from './store.ts';
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export default function shareLoopRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  // A visit that ended: one visitor for the home's week, one home for the guest's month. Never blocks the visit itself.
  ctx.on?.('visit-ended', (data: { hostId?: unknown; guestId?: unknown; cityId?: unknown }) => {
    const { hostId, guestId, cityId } = data ?? {};
    if (typeof hostId !== 'string' || typeof guestId !== 'string' || typeof cityId !== 'string') return;
    const work = ctx.store.transact((db) => { noteVisit(loopsOf(ctx, db), hostId, guestId, cityId, ctx.now()); }, { durable: false }).catch(() => undefined);
    ctx.waitUntil?.(work);
  });
  if (ctx.worldFeed) {
    const pages = frontPages(ctx);
    ctx.on?.('heartbeat', () => { void pages.tick().catch(() => undefined); });
  }
  const limited = (request: RouteRequest, key: string, n: number): void => {
    if (!ctx.allow(`loops:${key}:${addressBucket(request.ip)}`, n, 60000)) throw Object.assign(ctx.fail(429, 'loops_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
  };
  const known = (city: unknown): city is string => typeof city === 'string' && ctx.cityIds.some((id) => id === city);
  const adult = (db: Parameters<NonNullable<NonNullable<RouteContext['checks']>['adult']>>[0], id: string): boolean => ctx.checks?.adult?.(db, id) === true;
  return {
    'GET /api/loops/passport': async (request) => {
      const passport = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: false });
        // The character's own city: stamped the first time it is seen here, as an arrival would (a life begins in a city without a trip).
        stampPassport(session, characterCity(session), ctx.now());
        return passportView(session);
      });
      return { body: { passport }, headers: NO_STORE };
    },
    'GET /api/loops/wrapped': async (request) => {
      limited(request, 'wrapped', 20);
      const asked = request.query.get('month'), now = ctx.now(), month = asked || monthOf(now);
      if (!monthAllowed(month, now)) throw ctx.fail(400, 'invalid_month');
      const wrapped = await ctx.store.read((db) => wrappedOf(db, request.requireSession(db, { renew: false }), month, now));
      if (!wrapped) throw ctx.fail(400, 'invalid_month');
      return { body: { wrapped }, headers: NO_STORE };
    },
    'GET /api/loops/fame': async (request) => {
      limited(request, 'fame', 30);
      const city = request.query.get('id');
      if (!known(city)) throw ctx.fail(400, 'invalid_city');
      const fame = await ctx.store.read((db) => {
        const session = request.requireSession(db, { renew: false });
        const social = (db as Record<string, unknown>)['social'], players = record(social) && record(social.players) ? social.players : {};
        const name = (id: string): string => { const found = players[id]; return record(found) && typeof found.name === 'string' ? found.name : ''; };
        return fameView(db, city, lagosTime(ctx.now()).week, session.publicId, { adult: (id) => adult(db, id), name });
      });
      return { body: { fame }, headers: NO_STORE };
    },
    'GET /api/loops/frontpage': async (request) => {
      limited(request, 'front', 30);
      const city = request.query.get('id');
      if (!known(city)) throw ctx.fail(400, 'invalid_city');
      const page = await ctx.store.read((db) => frontPageOf(db, city, ctx.now()));
      return { body: { page }, headers: { 'Cache-Control': 'public, max-age=300' } };
    },
  };
}
