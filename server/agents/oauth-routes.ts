/**
 * SIGN-IN FOR WEB ASSISTANTS: the HTTP routes (rules and storage: oauth.ts, oauth-rules.ts; design: docs/AGENTS.md).
 *
 *   GET  /.well-known/oauth-protected-resource[/mcp]   (served by the hosts as /api/agents/oauth/resource)  RFC 9728 metadata: this MCP server and its authorization server
 *   GET  /.well-known/oauth-authorization-server       (… /api/agents/oauth/server)                         RFC 8414 metadata: the endpoints below
 *   POST /api/agents/oauth/register                    RFC 7591 dynamic client registration (JSON in, a client id out)
 *   GET  /oauth/authorize                              the approval page: the game itself, a lazy chunk that is fetched only for this address (src/app/features/agents/oauthEntry.ts)
 *   GET  /api/agents/oauth/authorize?<the request>     what the approval page shows: who asks, where they return to, the person's standing (no session needed)
 *   POST /api/agents/oauth/authorize                   { request, approve, mode, … csrf }: the signed-in person's yes or no → { redirect }
 *   POST /api/agents/oauth/token                       a code and its PKCE verifier, or a refresh token, for tokens (form encoded)
 *   POST /api/agents/oauth/revoke                      RFC 7009: end a sign-in with one of its tokens (form encoded)
 *
 * The token, registration and revocation routes are called by the assistants' servers: no cookie and no Origin. The decision route is the
 * person's own and needs the same checks as every write from Settings (this host as the origin, the session's anti-forgery token).
 * Every answer that carries a token or a code is `no-store`.
 */
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import type { AgentService } from './service.ts';
import { oauthService } from './oauth.ts';
import type { Failure } from './oauth.ts';
import { OAUTH, metadata, originOf } from './oauth-rules.ts';
import { MCP_PATH, MCP_ROUTE } from './mcp.ts';

/** The route a host serves an address outside /api/ with, for the addresses that are open to programs (no page origin, no cookie): /mcp and the discovery documents. Null for any other path. */
export const openRouteOf = (pathname: string): string | null => (pathname === MCP_PATH ? MCP_ROUTE : Object.hasOwn(WELL_KNOWN, pathname) ? WELL_KNOWN[pathname] ?? null : null);
const NO_STORE = { 'Cache-Control': 'no-store' };
/** The paths the hosts serve under /.well-known/, and the routes they map to. */
export const WELL_KNOWN: Readonly<Record<string, string>> = Object.freeze({
  '/.well-known/oauth-protected-resource': '/api/agents/oauth/resource',
  '/.well-known/oauth-protected-resource/mcp': '/api/agents/oauth/resource',
  '/.well-known/oauth-authorization-server': '/api/agents/oauth/server',
});

export function oauthRoutes(ctx: RouteContext, svc: AgentService, guard: (request: RouteRequest, body: Record<string, unknown>) => Promise<void>): Record<RouteKey, RouteHandler> {
  const oauth = oauthService(ctx, svc);
  const originFor = (request: RouteRequest): string => originOf(ctx.config.publicOrigin, request.header?.('host') ?? null);
  const limited = (request: RouteRequest, what: string, count: number, windowMs: number): void => { if (!ctx.allow(`oauth:${what}:${request.ip}`, count, windowMs)) throw Object.assign(ctx.fail(429, 'rate_limited'), { retryAfter: 60 }); };
  /** An OAuth refusal in the shape clients read (RFC 6749 section 5.2), never cached. */
  const refused = (found: Failure) => ({ status: found.status, bare: true as const, body: { error: found.error, error_description: found.description }, headers: NO_STORE });
  const form = async (request: RouteRequest): Promise<URLSearchParams> => {
    if (!request.rawBody) throw ctx.fail(400, 'invalid_request');
    return new URLSearchParams(new TextDecoder().decode(await request.rawBody(8192, 'form')));
  };

  return {
    'GET /api/agents/oauth/resource': (request) => ({ status: 200, bare: true, body: metadata(originFor(request)).resource, headers: { 'Cache-Control': 'public, max-age=300' } }),
    'GET /api/agents/oauth/server': (request) => ({ status: 200, bare: true, body: metadata(originFor(request)).server, headers: { 'Cache-Control': 'public, max-age=300' } }),
    'POST /api/agents/oauth/register': async (request) => {
      limited(request, 'register', OAUTH.clientsPerAddressHour, 3600000);
      const body = await request.json();
      const made = await ctx.store.transact((db) => oauth.register(db, body), { durable: true });
      return made.ok ? { status: made.status, bare: true, body: made.body, headers: NO_STORE } : refused(made);
    },
    'GET /api/agents/oauth/authorize': async (request) => {
      limited(request, 'peek', 120, 600000);
      const query = new URLSearchParams(request.query.get('request') ?? '');
      if ((request.query.get('request') ?? '').length > OAUTH.queryLength) throw ctx.fail(400, 'invalid_request');
      const origin = originFor(request);
      const shown = await ctx.store.read((db) => oauth.preview(db, request.session(db), query, origin));
      return shown.ok ? { body: shown, headers: NO_STORE } : { status: shown.status, body: { error: shown.error, reason: shown.description, ...(shown.redirect ? { redirect: shown.redirect } : {}) }, headers: NO_STORE };
    },
    'POST /api/agents/oauth/authorize': async (request) => {
      const body = await request.json();
      await guard(request, body);
      limited(request, 'decide', 60, 600000);
      const raw = typeof body.request === 'string' ? body.request : '';
      if (raw.length > OAUTH.queryLength) throw ctx.fail(400, 'invalid_request');
      const origin = originFor(request);
      const decided = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        return oauth.decide(db, session, new URLSearchParams(raw), origin, { approve: body.approve === true, mode: body.mode, characterName: body.characterName, character: body.character, city: body.city });
      });
      return decided.ok ? { body: { ok: true, redirect: decided.redirect }, headers: NO_STORE, renew: true } : { status: decided.status, body: { error: decided.error, reason: decided.description, ...(decided.redirect ? { redirect: decided.redirect } : {}) }, headers: NO_STORE };
    },
    'POST /api/agents/oauth/token': async (request) => {
      limited(request, 'token', 120, 600000);
      const params = await form(request), origin = originFor(request);
      const traded = await ctx.store.transact((db) => oauth.token(db, params, origin), { durable: true });
      return traded.ok ? { status: 200, bare: true, body: traded.body, headers: NO_STORE } : refused(traded);
    },
    'POST /api/agents/oauth/revoke': async (request) => {
      limited(request, 'revoke', 60, 600000);
      const params = await form(request);
      await ctx.store.transact((db) => { oauth.revoke(db, params); }, { durable: true });
      return { status: 200, bare: true, body: {}, headers: NO_STORE };
    },
  };
}
