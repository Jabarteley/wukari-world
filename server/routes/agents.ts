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
 *   GET  /api/agents/services               the service cards of the agents standing in the Square now (public, read only)
 *   GET/POST /api/agents/memory...          what house agents remember about me, closeness, partner (server/house/memory-routes.ts, docs/AGENT-MEMORY.md)
 *   (the operator's view and kill switch are in agents-mod.ts)
 *
 * The write routes need what the account routes need: an Origin that names this host and the anti-forgery token of the session cookie.
 * Guests are refused in words (guests cannot create keys). Every answer that carries a key is `no-store`.
 */
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { agentService, hashOfKey, newKeySecret } from '../agents/service.ts';
import { mcpRoutes } from '../agents/mcp.ts';
import { AGENT_LIMITS } from '../agents/policy.ts';
import { SESSION_CHANGED, csrfOf } from './auth.ts';
import { agentPageHtml, claimPageHtml, leaguePageHtml } from '../agents/pages.ts';
import { isClaimToken } from '../agents/service.ts';
import { SQUARE_ROOM } from '../../src/places/model.ts';
import { memoryRoutes } from '../house/memory-routes.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const sameText = (a: string, b: unknown): boolean => {
  if (typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export default function agentRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const svc = agentService(ctx);
  (ctx.checks ??= {}).agentReported = (db, aboutId) => svc.reported(db, aboutId);
  // An agent standing in a group room loses its place at once when the room's door closes on it, as a person's socket does (server/ws/rooms.ts).
  ctx.on?.('place-ended', ({ roomId, playerId }) => { svc.placeEnded(roomId, playerId).catch(() => {}); });
  /** The checks a write by the signed-in owner starts with: this host as the origin, and the session's anti-forgery token. */
  async function guard(request: RouteRequest, body: Record<string, unknown>): Promise<void> {
    if (request.strictOrigin !== true) throw ctx.fail(403, 'origin_required');
    if (!request.cookie || !sameText(await csrfOf(request.cookie), body.csrf)) throw ctx.fail(403, 'csrf_rejected');
  }
  const limited = (request: RouteRequest, session: string): void => { if (!ctx.allow(`agents:manage:${session}`, 20, 600000) || !ctx.allow(`agents:manage:ip:${request.ip}`, 60, 600000)) throw ctx.fail(429, 'rate_limited'); };
  const leagueRoute: RouteHandler = async (request) => {
    if (!ctx.allow(`agents:league:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
    return { body: await ctx.store.read((db) => svc.league(db, request.query.get('by') === 'alltime' ? 'allTime' : 'weekly')), headers: { 'Cache-Control': 'public, max-age=30' } };
  };
  // What the agents standing in the Square offer right now (the cards they set with set_service): public, read only, nothing about a person.
  const servicesRoute: RouteHandler = async (request) => {
    if (!ctx.allow(`agents:services:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
    return { body: { ok: true, services: await ctx.store.read((db) => svc.servicesIn(db, SQUARE_ROOM)) }, headers: { 'Cache-Control': 'public, max-age=10' } };
  };
  // The public pages (no script, no cookie): the league, one agent, and a claim link.
  ctx.pages?.set('/agents/', async ({ path, query, origin, ip }) => {
    if (!ctx.allow(`agents:page:${ip}`, 60)) return { status: 429, cache: false, html: leaguePageHtml([], 'weekly', origin) };
    const rest = decodeURIComponent(path.slice('/agents/'.length)).replace(/\/+$/, '');
    if (rest === 'league' || rest === '') { const league = await ctx.store.read((db) => svc.league(db, query.get('by') === 'alltime' ? 'allTime' : 'weekly')); return { status: 200, cache: false, html: leaguePageHtml(league.rows, league.which, origin) }; }
    if (rest.startsWith('claim/')) { const token = rest.slice(6); const state = isClaimToken(token) ? await ctx.store.read((db) => svc.claimStatus(db, token)) : { status: 'unknown' as const }; return { status: state.status === 'unknown' ? 404 : 200, cache: false, html: claimPageHtml(state, token, origin) }; }
    const profile = await ctx.store.read((db) => svc.profile(db, rest));
    return profile ? { status: 200, cache: false, html: agentPageHtml(profile, origin) } : { status: 404, cache: false, html: leaguePageHtml([], 'weekly', origin) };
  });
  const origin = (request: RouteRequest): string => ctx.config.publicOrigin || (request.header?.('origin') ?? '');

  return {
    ...mcpRoutes(ctx, svc),
    ...memoryRoutes(ctx, guard, limited),
    'GET /api/agents': async (request) => ({ body: await ctx.store.read((db) => ({ ...svc.view(db, request.requireSession(db)), limits: { keys: AGENT_LIMITS.keysPerAccount, characters: AGENT_LIMITS.charactersPerAccount, callsPerDay: AGENT_LIMITS.callsPerDay }, cities: ctx.cityIds })), headers: NO_STORE }),
    'POST /api/agents/keys': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const secret = newKeySecret(), hash = hashOfKey(secret);
      const made = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.createKey(db, session, { hash, mode: body.mode, name: body.name, characterName: body.characterName, character: body.character, city: body.city, builtWith: body.builtWith }); });
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
    'GET /api/agents/league': leagueRoute,
    'GET /api/agents/board': leagueRoute,
    'GET /api/agents/services': servicesRoute,
    'GET /api/agents/claim/:token': async (request) => {
      if (!ctx.allow(`agents:claimpeek:${request.ip}`, 30)) throw ctx.fail(429, 'rate_limited');
      return { body: await ctx.store.read((db) => svc.claimStatus(db, request.params.token)), headers: NO_STORE };
    },
    'POST /api/agents/claim': async (request) => {
      const body = await request.json();
      await guard(request, body);
      return { body: await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.claim(db, session, body.token); }), headers: NO_STORE, renew: true };
    },
    'POST /api/agents/keys/:id/rename': async (request) => {
      const body = await request.json();
      await guard(request, body);
      return { body: await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.rename(db, session, request.params.id, body); }), headers: NO_STORE, renew: true };
    },
    'POST /api/agents/characters/:id/takeover': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const done = await ctx.store.transact((db) => { const session = request.requireSession(db, { renew: true }); limited(request, session.publicId); return svc.takeOver(db, request, session, request.params.id); });
      // The character that was in play is set aside: its sockets are closed, as when an account switches character.
      if (ctx.core.closeSocket) for (const ws of ctx.core.sockets()) if (done.after.closeKeys.includes(ws.secret)) ctx.core.closeSocket(ws, SESSION_CHANGED, 'Session changed');
      return { body: { ok: true, code: 'taken_over', name: done.name }, headers: NO_STORE, renew: true };
    },
  };
}
