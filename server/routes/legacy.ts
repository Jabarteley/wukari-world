/**
 * OWNER: world
 * Passing property on (docs/LEGACY.md). Needs a session; every write takes a `requestId` (`<ms>:<uuid>`) and is exactly-once.
 *
 *   GET  /api/world/legacy                    { heirs, friends, kinds, adult, outgoing, incoming, nextGiftAt }   never cached
 *   POST /api/world/legacy/preview  { to, include }                  what would move and what would stay, or why not (changes nothing)
 *   POST /api/world/legacy/pass     { requestId, to, include }       to an heir of the same account: moved now. To a friend: an offer
 *   POST /api/world/legacy/accept   { requestId, offer }             the receiver takes an offer (rechecked against both lives)
 *   POST /api/world/legacy/decline  { requestId, offer }             the receiver turns it down
 *   POST /api/world/legacy/cancel   { requestId, offer }             the giver takes it back
 * `include` = { houses, cars, shop, furniture, belongings, goodwill, titles }: booleans.
 */
import { legacyService, readInclude } from '../legacy/service.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts';

export default function legacyRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const legacy = legacyService(ctx);
  type Write = (db: Db, session: SessionRecord, body: Record<string, unknown>) => Record<string, unknown> & { push: [string, unknown][]; changed: [string, number][] };
  const write = (step: Write): RouteHandler => async (request: RouteRequest) => {
    const input = await request.json();
    const result = await ctx.store.transact((db) => step(db, request.requireSession(db, { renew: true }), input));
    const { push, changed, ...body } = result;
    return { body, renew: true, headers: { 'Cache-Control': 'no-store' }, after: () => legacy.deliver(push, changed) };
  };
  return {
    'GET /api/world/legacy': async (request) => ({ body: await ctx.store.read((db) => legacy.view(db, request.requireSession(db, { renew: false }))), headers: { 'Cache-Control': 'no-store' } }),
    'POST /api/world/legacy/preview': async (request) => {
      const input = await request.json();
      return { body: await ctx.store.read((db) => legacy.preview(db, request.requireSession(db, { renew: false }), typeof input.to === 'string' ? input.to : '', readInclude(input.include))), headers: { 'Cache-Control': 'no-store' } };
    },
    'POST /api/world/legacy/pass': write(legacy.pass),
    'POST /api/world/legacy/accept': write(legacy.accept),
    'POST /api/world/legacy/decline': write(legacy.decline),
    'POST /api/world/legacy/cancel': write(legacy.cancel),
  };
}
