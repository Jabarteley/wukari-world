/**
 * OWNER: market
 * The operator's side of the Allworld Market, under /api/mod/market/. Same access rules as routes/moderation.ts
 * (routes/growth-mod.ts operatorGuard): 404 unless the server was started with MODERATOR_TOKEN, the token only in the
 * `Authorization: Bearer` header. Every change is written to the moderation audit.
 *
 *   POST /api/mod/market/freeze  { publicId, frozen, reason? }   → { ok, code: 'frozen' | 'unfrozen' }
 *       A frozen trader cannot place orders, and their resting orders are not matched; they can still cancel and withdraw.
 */
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';
import { marketService } from '../market/service.ts';
import { moderationService } from '../moderation/service.ts';
import { operatorGuard } from './growth-mod.ts';

export default function marketOperatorRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const operator = operatorGuard(ctx);
  const market = marketService(ctx), moderation = moderationService(ctx);
  const note = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 200) : '');
  return {
    'POST /api/mod/market/freeze': operator((db, request, body) => {
      const done = market.modFreeze(db, body.publicId, body.frozen);
      if (!done) throw ctx.fail(404, 'unknown_player');
      moderation.audit(db, done.code === 'frozen' ? 'market-freeze' : 'market-unfreeze', done.id, note(body.reason), request.ip);
      return { ok: true, code: done.code };
    }, { write: true }),
  };
}
