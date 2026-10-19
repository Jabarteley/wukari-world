/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md)
 * THE PERSON'S ROUTES FOR PHASE 3: Spot the AI, their landlord, boss and rival, and the download of what AI characters remember about them. Registered with the agent
 * routes (server/routes/agents.ts), so under /api/agents/. Every route is about the signed-in session's own record; the writes need the Origin and the anti-forgery
 * token like the other agent routes.
 *
 *   GET  /api/agents/spot                          this week's game: { state: open | played | not_enough, rounds?, played?, opted, adult }
 *   POST /api/agents/spot/guess  { ai: n[], csrf } one play a week: the line numbers you say an AI said → { result: { s, of, better, players, rounds } }
 *   POST /api/agents/spot/opt    { on, csrf }      let my public lines be used (adults), or not (deletes them at once)
 *   GET  /api/agents/roles?city=                   my landlord, boss and rival in that city, with their line for today
 *   POST /api/agents/roles/ask   { city, what: 'time' | 'lower', csrf }   ask the landlord for more time or a lower rent (no money moves)
 *   GET  /api/agents/memory/export[?agent=]        what AI characters remember about me, for a JSON file (`file` is its name): every character, or one (also one that has left)
 */
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { castMember } from './cast-ids.ts';
import { continuityFor } from './continuity.ts';
import { exportMemory } from './memory.ts';
import { rolesFor } from './roles.ts';
import { spotFor } from './spot.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function lifeRoutes(ctx: RouteContext, guard: (request: RouteRequest, body: Record<string, unknown>) => Promise<void>, limited: (request: RouteRequest, session: string) => void): Record<RouteKey, RouteHandler> {
  const reading = (request: RouteRequest, session: string): void => { if (!ctx.allow(`ai-life:${session}`, 60, 60000) || !ctx.allow(`ai-life:ip:${request.ip}`, 240, 60000)) throw ctx.fail(429, 'rate_limited'); };
  const cityOf = (value: unknown): string => { if (typeof value !== 'string' || !ctx.cityIds.includes(value)) throw ctx.fail(400, 'invalid_city'); return value; };
  const lifeIn = (db: Db, session: { cities?: Record<string, { state?: unknown } | undefined> }, city: string): unknown => session.cities?.[city]?.state ?? null;
  return {
    'GET /api/agents/spot': async (request) => {
      await spotFor(ctx).flush(true);
      const body = await ctx.store.transact((db) => { const session = request.requireSession(db); reading(request, session.publicId); return spotFor(ctx).view(db, session.publicId); }, { durable: false });
      return { body, headers: NO_STORE };
    },
    'POST /api/agents/spot/guess': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const done = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return spotFor(ctx).guess(db, session.publicId, body.ai); });
      if (!done.ok) throw Object.assign(ctx.fail(done.code === 'invalid_picks' ? 400 : 409, done.code), { reason: done.reason });
      return { body: done, headers: NO_STORE, renew: true };
    },
    'POST /api/agents/spot/opt': async (request) => {
      const body = await request.json();
      await guard(request, body);
      if (typeof body.on !== 'boolean') throw ctx.fail(400, 'invalid_flag');
      const done = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return spotFor(ctx).opt(db, session.publicId, body.on === true); });
      if (!done.ok) throw Object.assign(ctx.fail(403, done.code), { reason: done.reason });
      return { body: done, headers: NO_STORE, renew: true };
    },
    'GET /api/agents/roles': async (request) => {
      const city = cityOf(request.query.get('city') ?? 'lagos');
      const found = await ctx.store.read((db) => { const session = request.requireSession(db); reading(request, session.publicId); return { id: session.publicId, state: structuredClone(lifeIn(db, session as never, city)) }; });
      return { body: await rolesFor(ctx).view(found.id, city, found.state), headers: NO_STORE };
    },
    'POST /api/agents/roles/ask': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const city = cityOf(body.city);
      const done = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return rolesFor(ctx).askLandlord(db, session.publicId, city, lifeIn(db, session as never, city), body.what); }, { durable: false });
      if (!done.ok) throw Object.assign(ctx.fail(done.code === 'invalid_ask' ? 400 : 409, done.code), { reason: done.reason });
      return { body: done, headers: NO_STORE, renew: true };
    },
    'GET /api/agents/memory/export': async (request) => {
      const agent = request.query.get('agent');
      if (agent !== null && !castMember(agent)) throw ctx.fail(400, 'invalid_agent');
      const body = await ctx.store.read((db) => {
        const session = request.requireSession(db);
        reading(request, session.publicId);
        const kept = exportMemory(db, [session.publicId], ctx.now()).map((entry) => ({ ...entry, characters: entry.characters.filter((item) => agent === null || item.agent === agent).map((item) => {
          const who = castMember(item.agent), notice = continuityFor(ctx).noticeFor(item.agent);
          return { ...item, name: who?.name ?? null, ...(who?.left !== undefined ? { left: new Date(who.left).toISOString().slice(0, 10) } : {}), ...(notice ? { leaving: new Date(notice.until).toISOString().slice(0, 10) } : {}) };
        }) }));
        return { kind: 'allworld-ai-memory', v: 1, at: new Date(ctx.now()).toISOString(), note: 'What AI characters of Allworld remember about you. You can delete any of it from their cards in Settings.', players: kept };
      });
      // The phone saves it as a file (AgentMemory.vue), as the account export is saved: a route sets no download header (server/host-context.ts ROUTE_HEADERS).
      return { body: { ...body, file: `allworld-ai-memory${agent ? `-${agent.replace(/[^a-z0-9.-]/gi, '')}` : ''}.json` }, headers: NO_STORE };
    },
  };
}
