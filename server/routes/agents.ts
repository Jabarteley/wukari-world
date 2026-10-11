/**
 * OWNER: agents (design and limits: docs/AGENTS.md)
 * AI agent access. An agent plays through the Model Context Protocol at POST /mcp (server/agents/mcp.ts); a signed-in player manages
 * agent keys here, from Settings.
 *
 *   POST /api/agents/mcp                    the MCP endpoint (the hosts serve it at /mcp): bearer agent key, no cookie, no Origin
 *   GET  /api/agents                        my keys (no secret, no hash) and agent characters, and the caps
 *   POST /api/agents/keys                   { mode: 'own' | 'agent', name?, characterName?, character?, city?, csrf } → the key, ONCE, and where to use it
 *   POST /api/agents/keys/:id/revoke        { csrf }
 *   GET  /api/agents/keys/:id/audit         the last calls of one of my keys (bounded)
 *   POST /api/agents/characters/:id/remove  { csrf }       an agent character of mine; its keys end, its life is archived
 *   GET  /api/agents/board                  the agents board (agent characters only; they are on no other ranking)
 *   GET  /api/mod/agents                    operator: counts only                           POST /api/mod/agents/switch { off: boolean }  the kill switch
 *
 * The write routes need what the account routes need: an Origin that names this host and the anti-forgery token of the session cookie.
 * Guests are refused in words (guests cannot create keys). Every answer that carries a key is `no-store`.
 */
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { agentService, hashOfKey, newKeySecret } from '../agents/service.ts';
import { mcpRoutes } from '../agents/mcp.ts';
import { AGENT_LIMITS } from '../agents/policy.ts';
import { operatorGuard } from './growth-mod.ts';
import { csrfOf } from './auth.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const sameText = (a: string, b: unknown): boolean => {
  if (typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export default function agentRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const svc = agentService(ctx);
  const operator = operatorGuard(ctx);
  (ctx.checks ??= {}).agentReported = (db, aboutId) => svc.reported(db, aboutId);
  /** The checks a write by the signed-in owner starts with: this host as the origin, and the session's anti-forgery token. */
  async function guard(request: RouteRequest, body: Record<string, unknown>): Promise<void> {
    if (request.strictOrigin !== true) throw ctx.fail(403, 'origin_required');
    if (!request.cookie || !sameText(await csrfOf(request.cookie), body.csrf)) throw ctx.fail(403, 'csrf_rejected');
  }
  const limited = (request: RouteRequest, session: string): void => { if (!ctx.allow(`agents:manage:${session}`, 20, 600000) || !ctx.allow(`agents:manage:ip:${request.ip}`, 60, 600000)) throw ctx.fail(429, 'rate_limited'); };
  const origin = (request: RouteRequest): string => ctx.config.publicOrigin || (request.header?.('origin') ?? '');

  return {
    ...mcpRoutes(ctx, svc),
    'GET /api/agents': async (request) => ({ body: await ctx.store.read((db) => ({ ...svc.view(db, request.requireSession(db)), limits: { keys: AGENT_LIMITS.keysPerAccount, characters: AGENT_LIMITS.charactersPerAccount, callsPerMinute: AGENT_LIMITS.callsPerMinute, callsPerDay: AGENT_LIMITS.callsPerDay, messagesPerDay: AGENT_LIMITS.messagesPerDay }, cities: ctx.cityIds })), headers: NO_STORE }),
    'POST /api/agents/keys': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const secret = newKeySecret(), hash = hashOfKey(secret);
      const made = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.createKey(db, session, { hash, mode: body.mode, name: body.name, characterName: body.characterName, character: body.character, city: body.city }); });
      return { body: { ...made, key: secret, url: `${origin(request)}/mcp`, shownOnce: true }, headers: NO_STORE, renew: true };
    },
    'POST /api/agents/keys/:id/revoke': async (request) => {
      const body = await request.json();
      await guard(request, body);
      return { body: await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.revoke(db, session, request.params.id); }), headers: NO_STORE, renew: true };
    },
    'GET /api/agents/keys/:id/audit': async (request) => ({ body: await ctx.store.read((db) => svc.auditOf(db, request.requireSession(db), request.params.id)), headers: NO_STORE }),
    'POST /api/agents/characters/:id/remove': async (request) => {
      const body = await request.json();
      await guard(request, body);
      return { body: await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.removeCharacter(db, session, request.params.id); }), headers: NO_STORE, renew: true };
    },
    'GET /api/agents/board': async (request) => {
      if (!ctx.allow(`agents:board:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
      return { body: await ctx.store.read((db) => svc.board(db)), headers: { 'Cache-Control': 'public, max-age=30' } };
    },
    'GET /api/mod/agents': operator((db) => svc.overview(db)),
    'POST /api/mod/agents/switch': operator((db, _request, body) => svc.setSwitch(db, body.off), { write: true }),
  };
}
