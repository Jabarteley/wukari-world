/**
 * OWNER: spaces
 * AI Spaces, under /api/spaces (server/spaces/service.ts; docs/SPACES.md). Answers are { ok: true, code, … } or { ok: false, code,
 * reason } (HTTP 200); a malformed request is 400. Every route needs the device session.
 *
 *   GET  /api/spaces/status                          { ai }: whether AI design is on (the Import box works either way)
 *   POST /api/spaces/design  { target, roomId?, prompt, keep? }   a plan from the player's words (the model router)
 *   POST /api/spaces/check   { target, roomId?, plan }            a pasted plan, checked and priced (no model)
 *   POST /api/spaces/apply   { target, roomId?, plan, requestId } make the home or the room the plan
 *   GET  /api/spaces/host                            the AI host of my home (server/spaces/host.ts)
 *   POST /api/spaces/host    { kind | null, persona?, on }      choose, change or remove it
 *   GET  /api/spaces/games                           the built-in lite games and mine (server/spaces/games.ts)
 *   GET  /api/spaces/game?id=                        one lite game's definition, for its screen
 *   POST /api/spaces/games   { def }                 import a lite game
 *   GET  /api/spaces/models                          my 3D models and whether I may upload (server/spaces/models.ts)
 *   POST /api/spaces/models?name=   (body: the .glb, model/gltf-binary)   upload one
 *   POST /api/spaces/models/rename { id, name } · /delete { id } · /report { by, id }
 *   GET  /api/spaces/model-file/:hash                a model's bytes, by content hash
 */
import { spacesService } from '../spaces/service.ts';
import { gamesService } from '../spaces/games.ts';
import { hostService } from '../spaces/host.ts';
import { modelsService } from '../spaces/models.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function spacesRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const spaces = spacesService(ctx), hosts = hostService(ctx), games = gamesService(ctx), models = modelsService(ctx);
  const limited = (publicId: string): void => { if (!ctx.allow(`spaces:http:${publicId}`, 30)) throw ctx.fail(429, 'rate_limited'); };
  const gate = async (request: Parameters<RouteHandler>[0]): Promise<void> => { limited(await ctx.store.read((db) => request.requireSession(db).publicId)); };
  const change = (fn: (db: Parameters<typeof models.rename>[0], session: Parameters<typeof models.rename>[1], body: Record<string, unknown>) => object): RouteHandler => async (request) => {
    await gate(request);
    const body = await request.json();
    return { body: await ctx.store.transact((db) => fn(db, request.requireSession(db, { renew: true }), body)), renew: true };
  };
  return {
    'GET /api/spaces/models': async (request) => { await gate(request); return { body: await ctx.store.read((db) => models.mine(db, request.requireSession(db))) }; },
    'POST /api/spaces/models': async (request) => { await gate(request); return { body: await models.upload(request), renew: true }; },
    'POST /api/spaces/models/rename': change((db, session, body) => models.rename(db, session, body)),
    'POST /api/spaces/models/delete': change((db, session, body) => models.remove(db, session, body)),
    'POST /api/spaces/models/report': change((db, session, body) => models.report(db, session, body)),
    // Fetched once per model by every visitor of a space: its own, roomier limit.
    'GET /api/spaces/model-file/:hash': async (request) => {
      const id = await ctx.store.read((db) => request.requireSession(db).publicId);
      if (!ctx.allow(`spaces:model-file:${id}`, 240)) throw ctx.fail(429, 'rate_limited');
      return models.file(request);
    },
    'GET /api/spaces/status': async (request) => { await gate(request); return { body: { ok: true, code: 'ok', ai: spaces.aiOn() } }; },
    'POST /api/spaces/design': async (request) => { await gate(request); return { body: await spaces.design(request), renew: true }; },
    'POST /api/spaces/check': async (request) => { await gate(request); return { body: await spaces.check(request), renew: true }; },
    'POST /api/spaces/apply': async (request) => { await gate(request); return { body: await spaces.apply(request), renew: true }; },
    'GET /api/spaces/host': async (request) => { await gate(request); return { body: await ctx.store.read((db) => hosts.read(db, request.requireSession(db))) }; },
    'POST /api/spaces/host': async (request) => {
      await gate(request);
      const body = await request.json();
      return { body: await ctx.store.transact((db) => hosts.write(db, request.requireSession(db, { renew: true }), body)), renew: true };
    },
    'GET /api/spaces/games': async (request) => { await gate(request); return { body: await ctx.store.read((db) => games.list(db, request.requireSession(db))) }; },
    'GET /api/spaces/game': async (request) => { await gate(request); return { body: games.one(request.query.get('id')) }; },
    'POST /api/spaces/games': async (request) => {
      await gate(request);
      const body = await request.json();
      return { body: await ctx.store.transact((db) => games.importGame(db, request.requireSession(db, { renew: true }), body)), renew: true };
    },
  };
}
