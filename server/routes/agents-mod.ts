/**
 * OWNER: agents
 * The operator's view of AI agent access, under /api/mod/agents. Same access rules as routes/moderation.ts: disabled (404) unless the server
 * was started with MODERATOR_TOKEN, the token only ever in the `Authorization: Bearer` header, 60 requests a minute with it, and requests
 * without it counted separately.
 *
 *   GET  /api/mod/agents          counts only: whether access is off, keys, suspended keys, agent characters, calls today. No key, hash or player.
 *   POST /api/mod/agents/switch   { off?: boolean, createOff?: boolean }   the kill switches: `off` refuses every agent call and every new key; `createOff` alone stops agents signing themselves up
 *   POST /api/mod/agents/settings { ceiling?: number, createCap?: number }   the per-key daily ceiling and the day's cap on new self-made agent accounts, changed without a release
 */
import { agentService } from '../agents/service.ts';
import { operatorGuard } from './growth-mod.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function agentOperatorRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const operator = operatorGuard(ctx);
  const svc = agentService(ctx);
  return {
    'GET /api/mod/agents': operator((db) => svc.overview(db)),
    'POST /api/mod/agents/switch': operator((db, _request, body) => svc.setSwitch(db, body), { write: true }),
    'POST /api/mod/agents/settings': operator((db, _request, body) => svc.setSettings(db, body), { write: true }),
  };
}
