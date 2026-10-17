/**
 * OWNER: spaces
 * AI Spaces, under /api/spaces (server/spaces/service.ts; docs/SPACES.md). Answers are { ok: true, code, … } or { ok: false, code,
 * reason } (HTTP 200); a malformed request is 400. Every route needs the device session.
 *
 *   GET  /api/spaces/status                          { ai }: whether AI design is on (the Import box works either way)
 *   POST /api/spaces/design  { target, roomId?, prompt, keep? }   a plan from the player's words (the model router)
 *   POST /api/spaces/check   { target, roomId?, plan }            a pasted plan, checked and priced (no model)
 *   POST /api/spaces/apply   { target, roomId?, plan, requestId } make the home or the room the plan
 */
import { spacesService } from '../spaces/service.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function spacesRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const spaces = spacesService(ctx);
  const limited = (publicId: string): void => { if (!ctx.allow(`spaces:http:${publicId}`, 30)) throw ctx.fail(429, 'rate_limited'); };
  const gate = async (request: Parameters<RouteHandler>[0]): Promise<void> => { limited(await ctx.store.read((db) => request.requireSession(db).publicId)); };
  return {
    'GET /api/spaces/status': async (request) => { await gate(request); return { body: { ok: true, code: 'ok', ai: spaces.aiOn() } }; },
    'POST /api/spaces/design': async (request) => { await gate(request); return { body: await spaces.design(request), renew: true }; },
    'POST /api/spaces/check': async (request) => { await gate(request); return { body: await spaces.check(request), renew: true }; },
    'POST /api/spaces/apply': async (request) => { await gate(request); return { body: await spaces.apply(request), renew: true }; },
  };
}
