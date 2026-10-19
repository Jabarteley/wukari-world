/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md "Admin"). The same gate and audit log as every admin route.
 *   GET  /api/admin/watch      the fixtures with their pick counts and results, the Allworld House season, the artists' queue, the premieres
 *   POST /api/admin/watch      { action, … }
 *        result.save { fixture, home, away }       the result of a fixture (there is no score feed); a second save corrects it
 *        house.start { room?, cities?, mates?, now? }   a new season: the housemates are AI residents; `now` starts it this week
 *        house.stop                                 end the season now; nobody is evicted
 *        artist.approve { id } / artist.decline { id, reason? }   an artist's application (public id)
 *        premiere.remove { id }                     take a premiere down
 * Each change writes one audit line.
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts';
import type { Admin } from '../admin/gate.ts';
import { audit } from '../admin/store.ts';
import { predictionsService } from '../watch/predictions.ts';
import { houseService } from '../watch/house.ts';
import { premieresService } from '../watch/premieres.ts';
import { peekWatch } from '../watch/data.ts';
import type { HouseSeason } from '../../src/watch/house.ts';
import type { WatchAdminAction, WatchAdminView } from '../../src/types/watch.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ACTIONS: readonly WatchAdminAction[] = ['result.save', 'house.start', 'house.stop', 'artist.approve', 'artist.decline', 'premiere.remove'];
type Refused = { ok: false; code: string; reason: string };

export default function watchAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const predictions = predictionsService(ctx), house = houseService(ctx), premieres = premieresService(ctx);
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request);
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request));
    if (!admin) { countFailure(ctx, request); throw notFound(ctx); }
    accountBudget(ctx, admin, write);
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' });
    return admin;
  }
  function page(db: Db): WatchAdminView {
    const now = ctx.now(), col = peekWatch(db), season = col.house.season;
    const votes = season ? Object.entries(col.votes).filter(([key]) => key.startsWith(`${season.id}:`)).reduce((sum, [, map]) => sum + Object.keys(map ?? {}).length, 0) : 0;
    return { fixtures: predictions.adminList(db), house: house.view(db, null, now), votes, ...premieres.adminList(db) };
  }
  function change(db: Db, action: WatchAdminAction, body: Record<string, unknown>): { summary: string; target: string; season?: HouseSeason | null } | Refused {
    const now = ctx.now();
    if (action === 'result.save') { const done = predictions.enterResult(db, body, now); return done.ok ? { summary: done.summary, target: String(body.fixture) } : done; }
    if (action === 'house.start') { const done = house.start(db, body, now); return done.ok ? { summary: done.summary, target: done.season.id, season: done.season } : done; }
    if (action === 'house.stop') { const done = house.stop(db, now); return done.ok ? { summary: done.summary, target: 'house', season: done.season } : done; }
    if (action === 'artist.approve' || action === 'artist.decline') { const done = premieres.decide(db, body.id, action === 'artist.approve', body.reason); return done.ok ? { summary: done.summary, target: String(body.id) } : done; }
    const done = premieres.remove(db, body.id);
    return done.ok ? { summary: done.summary, target: String(body.id) } : done;
  }
  return {
    'GET /api/admin/watch': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => page(db)), headers: NO_STORE }; },
    'POST /api/admin/watch': async (request) => {
      const admin = await enter(request, true), body = await request.json() as Record<string, unknown>;
      const action = ACTIONS.find((item) => item === body.action);
      if (!action) throw ctx.fail(400, 'invalid_action');
      const done = await ctx.store.transact((db) => {
        const result = change(db, action, body);
        if ('ok' in result) return result;
        audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'watch', target: result.target.slice(0, 80), targetName: result.target.slice(0, 80), params: { action }, summary: result.summary, reason: '' });
        return { ok: true as const, ...result };
      });
      if (!done.ok) return { body: done, headers: NO_STORE };
      if (done.season !== undefined) house.sync(done.season);
      return { body: { ok: true, summary: done.summary }, headers: NO_STORE };
    },
  };
}
