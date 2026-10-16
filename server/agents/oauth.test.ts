// Sign-in for web assistants (docs/AGENTS.md "Sign-in for web assistants"): the discovery documents, the 401 challenge, registration, the whole
// code flow with PKCE, the token working on the MCP endpoint like a key, refresh, revocation, refusals and erasure. A real server, as a program
// (the assistant's own server) and a browser (the person) would call it.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { world, HOUR } from './test-world.ts';
import type { Json, Owner, World } from './test-world.ts';
import { OAUTH, ASSISTANT_HOSTS, challengeOf, challenge as challengeHeader, originOf, redirectTarget } from './oauth-rules.ts';
import { AGENT_DENY, routeDenied } from './access.ts';

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const verifier = (n = 0): string => `verifier-${n}-`.padEnd(64, 'abcdefghijklmnopqrstuvwxyz0123456789');
const s256 = (text: string): string => createHash('sha256').update(text).digest('base64url');

/** The assistant's server registers itself. */
async function register(w: World, body: Json = { client_name: 'Claude', redirect_uris: [REDIRECT] }): Promise<{ status: number; json: Json }> {
  const response = await fetch(`${w.f.base}/api/agents/oauth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, json: await response.json() as Json };
}
/** The assistant's server asks the token endpoint (form encoded, no cookie, no Origin). */
async function trade(w: World, form: Record<string, string>): Promise<{ status: number; json: Json; headers: Headers }> {
  const response = await fetch(`${w.f.base}/api/agents/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() });
  return { status: response.status, json: await response.json() as Json, headers: response.headers };
}
/** The request an assistant sends the person's browser to, as the query the approval page keeps. */
const asked = (clientId: string, n = 0, extra: Record<string, string> = {}): string => {
  const query = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: s256(verifier(n)), code_challenge_method: 'S256', state: `state-${n}` });
  for (const [name, value] of Object.entries(extra)) query.set(name, value);
  return query.toString();
};
/** The person approves in the game: the cookie, the anti-forgery token, this host as the origin. */
async function approve(w: World, who: Owner, request: string, choice: Json = { approve: true, mode: 'own' }): Promise<Json & { status: number }> {
  return w.post('/api/agents/oauth/authorize', { request, ...choice }, who.cookie);
}
const codeIn = (redirect: unknown): string => new URL(String(redirect)).searchParams.get('code') ?? '';

async function signedInWithClient(t: Parameters<typeof world>[0]) {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const client = (await register(w)).json.client_id as string;
  return { w, ada, client };
}
/** The whole way to a pair of tokens. */
async function connect(w: World, who: Owner, client: string, n = 0, choice: Json = { approve: true, mode: 'own' }) {
  const decided = await approve(w, who, asked(client, n), choice);
  assert.equal(decided.status, 200, JSON.stringify(decided));
  const code = codeIn(decided.redirect);
  const tokens = await trade(w, { grant_type: 'authorization_code', client_id: client, code, code_verifier: verifier(n), redirect_uri: REDIRECT });
  return { decided, code, tokens };
}

test('the discovery documents: protected resource and authorization server metadata, with the endpoints and only S256', async (t) => {
  const w = await world(t);
  const base = w.f.base;
  for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const doc = await response.json() as Json;
    assert.equal(doc.resource, `${base}/mcp`);
    assert.deepEqual(doc.authorization_servers, [base]);
    assert.deepEqual(doc.bearer_methods_supported, ['header']);
    assert.deepEqual(doc.scopes_supported, [OAUTH.scope]);
  }
  const server = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json() as Json;
  assert.equal(server.issuer, base);
  assert.equal(server.authorization_endpoint, `${base}/oauth/authorize`);
  assert.equal(server.token_endpoint, `${base}/api/agents/oauth/token`);
  assert.equal(server.registration_endpoint, `${base}/api/agents/oauth/register`);
  assert.deepEqual(server.code_challenge_methods_supported, ['S256']);
  assert.deepEqual(server.grant_types_supported, ['authorization_code', 'refresh_token']);
  assert.deepEqual(server.response_types_supported, ['code']);
  assert.deepEqual(server.token_endpoint_auth_methods_supported, ['none']);
  assert.equal(server.authorization_response_iss_parameter_supported, true);
  // A route a page cannot reach from another site: these are open to programs like /mcp, and they are read only.
  assert.equal((await fetch(`${base}/.well-known/oauth-authorization-server`, { method: 'POST' })).status, 404);
});

test('the MCP endpoint answers 401 with a challenge that points at the metadata when no token, or a bad one, is sent; sign-up with no key moved to ?signup=1', async (t) => {
  const w = await world(t);
  const none = await w.mcp(null, 'initialize', { protocolVersion: '2025-06-18' }, { challenge: true });
  assert.equal(none.status, 401);
  const header = none.headers.get('www-authenticate') ?? '';
  assert.match(header, /^Bearer /);
  assert.match(header, new RegExp(`resource_metadata="${w.f.base}/.well-known/oauth-protected-resource/mcp"`));
  assert.ok(!header.includes('error='), 'no token at all is not an error');
  const url = /resource_metadata="([^"]+)"/.exec(header)?.[1] ?? '';
  assert.equal((await fetch(url)).status, 200, 'the challenge leads to a document');
  const bad = await w.mcp('awk_wrongwrongwrongwrongwrongwrongwrongwrongwr', 'tools/list');
  assert.equal(bad.status, 401);
  assert.match(bad.headers.get('www-authenticate') ?? '', /error="invalid_token"/);
  assert.match(bad.headers.get('www-authenticate') ?? '', /resource_metadata=/);
  const other = await w.mcp('not-a-key', 'tools/list');
  assert.equal(other.status, 401);
  assert.match(other.headers.get('www-authenticate') ?? '', /error="invalid_token"/);
  // The keyless sign-up of an agent still works, where it is now offered.
  assert.equal(((await w.mcp(null, 'initialize', { protocolVersion: '2025-06-18' })).json.result as Json).protocolVersion, '2025-06-18');
  assert.equal((await w.signup('Robo Ada')).ok, true);
  assert.equal(challengeHeader('https://x.test').includes('scope="allworld:play"'), true);
});

test('registration: an assistant registers exact redirect addresses; others are refused', async (t) => {
  const w = await world(t);
  const made = await register(w, { client_name: 'ChatGPT', redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect', 'http://localhost:6274/oauth/callback'], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'client_secret_post' });
  assert.equal(made.status, 201, JSON.stringify(made.json));
  assert.match(String(made.json.client_id), /^awo_[A-Za-z0-9_-]{22}$/);
  assert.equal(made.json.token_endpoint_auth_method, 'none', 'only public clients (PKCE) exist here; the server says so');
  assert.deepEqual(made.json.redirect_uris, ['https://chatgpt.com/connector_platform_oauth_redirect', 'http://localhost:6274/oauth/callback']);
  for (const uri of ['http://chatgpt.com/cb', 'https://evil.example/cb', 'https://claude.ai.evil.example/cb', 'https://claude.ai/cb#frag', 'https://user@claude.ai/cb', 'https://claude.ai:8443/cb', 'http://evil.example:3000/cb', 'javascript:alert(1)', 'myapp://cb', 'https://claude.ai/a/../b']) {
    const refused = await register(w, { redirect_uris: [uri] });
    assert.equal(refused.status, 400, uri);
    assert.equal(refused.json.error, 'invalid_redirect_uri', uri);
  }
  assert.equal((await register(w, { redirect_uris: [] })).status, 400);
  assert.equal((await register(w, { redirect_uris: [REDIRECT], grant_types: ['client_credentials'] })).json.error, 'invalid_client_metadata');
  assert.equal((await register(w, { client_name: '<script>alert(1)</script>', redirect_uris: [REDIRECT] })).json.client_name, 'An AI assistant');
  assert.deepEqual(ASSISTANT_HOSTS.filter((host) => redirectTarget(`https://${host}/x`) === null), []);
  assert.deepEqual(redirectTarget('http://127.0.0.1:3000/callback'), { host: '127.0.0.1', local: true });
  assert.deepEqual(redirectTarget('http://[::1]:3000/callback'), { host: '::1', local: true });
  // Registration is limited per address.
  let last = 201;
  for (let i = 0; i < OAUTH.clientsPerAddressHour + 1 && last === 201; i += 1) last = (await register(w)).status;
  assert.equal(last, 429);
});

test('the whole flow: approve in the game, trade the code with PKCE, and the token plays like a key (same mark, same limits, listed and revocable in Settings)', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const request = asked(client, 1, { resource: `${w.f.base}/mcp`, scope: OAUTH.scope });
  // The approval page's question: who asks, where they return to, the person's standing. A signed-out browser can read it.
  const peek = await w.json(`/api/agents/oauth/authorize?request=${encodeURIComponent(request)}`, null, ada.cookie);
  assert.equal(peek.status, 200, JSON.stringify(peek));
  assert.deepEqual([peek.app, peek.goesTo, peek.local, peek.signedIn, peek.hasCharacter], ['Claude', 'claude.ai', false, true, true]);
  const decided = await approve(w, ada, request);
  assert.equal(decided.status, 200, JSON.stringify(decided));
  const back = new URL(String(decided.redirect));
  assert.equal(`${back.origin}${back.pathname}`, REDIRECT);
  assert.equal(back.searchParams.get('state'), 'state-1', 'state is echoed');
  assert.equal(back.searchParams.get('iss'), w.f.base, 'the issuer is named in the response (RFC 9207)');
  const code = back.searchParams.get('code') ?? '';
  assert.match(code, /^awx_[A-Za-z0-9_-]{43}$/);
  // The key waits for its code: it is not listed, and cannot be used, before the trade.
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 0);
  const tokens = await trade(w, { grant_type: 'authorization_code', client_id: client, code, code_verifier: verifier(1), redirect_uri: REDIRECT, resource: `${w.f.base}/mcp` });
  assert.equal(tokens.status, 200, JSON.stringify(tokens.json));
  assert.equal(tokens.headers.get('cache-control'), 'no-store');
  assert.equal(tokens.json.token_type, 'Bearer');
  assert.equal(tokens.json.expires_in, OAUTH.accessMs / 1000);
  const access = String(tokens.json.access_token), refresh = String(tokens.json.refresh_token);
  assert.match(access, /^awk_[A-Za-z0-9_-]{43}$/, 'an access token is an agent key');
  assert.match(refresh, /^awr_[A-Za-z0-9_-]{43}$/);
  // It plays like a key.
  const life = await w.tool(access, 'get_my_life');
  assert.equal(life.ok, true, JSON.stringify(life.data));
  assert.equal((await w.mcp(access, 'tools/list')).status, 200);
  const stored = await w.stored((db) => JSON.stringify(db));
  assert.ok(!stored.includes(access) && !stored.includes(refresh) && !stored.includes(code), 'only digests are stored');
  assert.equal(JSON.stringify(await w.stored((db) => db.oauth)).includes(verifier(1)), false);
  // Listed where keys are listed, with the assistant named; revocable there; counted in the same cap.
  const list = await w.json('/api/agents', null, ada.cookie);
  const row = (list.keys as Json[])[0] as Json;
  assert.deepEqual([(list.keys as Json[]).length, row.name, row.mode, row.signIn, row.calls], [1, 'Claude', 'own', 'Claude', 1]);
  // The AI mark shows on the person's own character while the assistant acts for it, as for a key.
  const marked = await w.stored((db) => Object.values(db.sessions).find((session) => session.publicId === ada.id)?.agent);
  assert.ok(marked?.at !== undefined);
  // The deny list holds for a token: it never mints keys or reaches the account.
  assert.equal((await w.tool(access, 'call_api', { method: 'POST', path: '/api/agents/oauth/authorize', body: { request: asked(client, 2), approve: true } })).data.code, 'not_allowed');
  assert.ok(routeDenied('/api/agents/oauth/token') && AGENT_DENY.some((item) => item.prefixes.includes('/api/agents/oauth')));
  assert.equal((await w.tool(access, 'call_api', { method: 'GET', path: '/api/account' })).data.code, 'not_allowed');
  // Settings revokes it: the token stops at once, and so does its refresh token.
  assert.equal((await w.post(`/api/agents/keys/${row.id}/revoke`, {}, ada.cookie)).status, 200);
  const dead = await w.mcp(access, 'tools/list');
  assert.equal(dead.status, 401);
  assert.match(dead.headers.get('www-authenticate') ?? '', /invalid_token/);
  const refreshed = await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: refresh });
  assert.deepEqual([refreshed.status, refreshed.json.error], [400, 'invalid_grant']);
});

test('PKCE and the code: a wrong verifier, a reused code, a wrong redirect, a wrong client and an expired code are all refused', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const other = (await register(w, { client_name: 'Other', redirect_uris: ['http://localhost:9000/cb'] })).json.client_id as string;
  // Wrong verifier: refused, and the code is spent.
  const first = await approve(w, ada, asked(client, 1));
  const codeA = codeIn(first.redirect);
  let answer = await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeA, code_verifier: verifier(99) });
  assert.deepEqual([answer.status, answer.json.error], [400, 'invalid_grant']);
  answer = await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeA, code_verifier: verifier(1) });
  assert.equal(answer.json.error, 'invalid_grant', 'a code is not given a second chance after a wrong verifier');
  // A verifier of the wrong shape, and a missing one.
  const second = await approve(w, ada, asked(client, 2));
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(second.redirect), code_verifier: 'short' })).json.error, 'invalid_grant');
  const third = await approve(w, ada, asked(client, 3));
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(third.redirect) })).json.error, 'invalid_grant');
  // A wrong redirect_uri at the trade, and a wrong client.
  const fourth = await approve(w, ada, asked(client, 4));
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(fourth.redirect), code_verifier: verifier(4), redirect_uri: 'https://claude.ai/other' })).json.error, 'invalid_grant');
  const fifth = await approve(w, ada, asked(client, 5));
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: other, code: codeIn(fifth.redirect), code_verifier: verifier(5) })).json.error, 'invalid_grant');
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: 'awo_doesnotexistdoesnot1', code: codeIn(fifth.redirect), code_verifier: verifier(5) })).json.error, 'invalid_client');
  // A code used twice: the second use is refused, and what the first made is ended.
  const sixth = await approve(w, ada, asked(client, 6));
  const codeF = codeIn(sixth.redirect);
  const good = await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeF, code_verifier: verifier(6) });
  assert.equal(good.status, 200);
  assert.equal((await w.mcp(String(good.json.access_token), 'tools/list')).status, 200);
  const replay = await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeF, code_verifier: verifier(6) });
  assert.deepEqual([replay.status, replay.json.error], [400, 'invalid_grant']);
  assert.equal((await w.mcp(String(good.json.access_token), 'tools/list')).status, 401, 'a replayed code ends the sign-in it made');
  assert.equal((await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: String(good.json.refresh_token) })).json.error, 'invalid_grant');
  // An expired code.
  const seventh = await approve(w, ada, asked(client, 7));
  w.f.advance(OAUTH.codeMs + 1000);
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(seventh.redirect), code_verifier: verifier(7) })).json.error, 'invalid_grant');
  // Other grants and a wrong resource.
  assert.equal((await trade(w, { grant_type: 'client_credentials', client_id: client })).json.error, 'unsupported_grant_type');
  const eighth = await approve(w, ada, asked(client, 8));
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(eighth.redirect), code_verifier: verifier(8), resource: 'https://other.example/mcp' })).json.error, 'invalid_target');
  // A JSON body is not the token endpoint's form.
  const json = await fetch(`${w.f.base}/api/agents/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(json.status, 415);
});

test('the authorization request: an unknown client or a redirect that was not registered is never redirected to; PKCE S256 is required; refusing sends access_denied', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const ask = (query: string) => w.json(`/api/agents/oauth/authorize?request=${encodeURIComponent(query)}`, null, ada.cookie);
  const unknown = await ask(asked('awo_doesnotexistdoesnot1'));
  assert.deepEqual([unknown.status, unknown.error, unknown.redirect], [400, 'invalid_request', undefined]);
  const wrongUri = await ask(asked(client, 0, { redirect_uri: 'https://claude.ai/not-registered' }));
  assert.deepEqual([wrongUri.status, wrongUri.redirect], [400, undefined], 'the address is matched exactly');
  assert.equal((await ask(asked(client, 0, { redirect_uri: `${REDIRECT}/` }))).redirect, undefined);
  // From a trusted address on, a refusal goes back to the assistant with the standard error.
  for (const [extra, error] of [[{ code_challenge_method: 'plain' }, 'invalid_request'], [{ response_type: 'token' }, 'unsupported_response_type'], [{ code_challenge: 'short' }, 'invalid_request'], [{ resource: 'https://other.example/mcp' }, 'invalid_target'], [{ scope: 'admin' }, 'invalid_scope']] as [Record<string, string>, string][]) {
    const answer = await ask(asked(client, 0, extra));
    assert.equal(answer.status, 400, JSON.stringify(extra));
    assert.equal(answer.error, error, JSON.stringify(extra));
    const back = new URL(String(answer.redirect));
    assert.deepEqual([back.searchParams.get('error'), back.searchParams.get('state'), back.searchParams.get('iss')], [error, 'state-0', w.f.base]);
  }
  assert.equal((await approve(w, ada, asked(client, 0, { code_challenge_method: 'plain' }))).status, 400, 'an approval of a bad request makes nothing');
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 0);
  // No answer to give without a method of S256 even when the challenge is a real one.
  assert.equal(challengeOf(verifier(3)), s256(verifier(3)));
  // Refusing: access_denied, with the state, and nothing stored.
  const refused = await approve(w, ada, asked(client, 1), { approve: false });
  const back = new URL(String(refused.redirect));
  assert.deepEqual([refused.status, back.searchParams.get('error'), back.searchParams.get('state'), back.searchParams.get('code')], [200, 'access_denied', 'state-1', null]);
  assert.equal(Object.keys(await w.stored((db) => (db.oauth as { codes: object }).codes)).length, 0);
});

test('without a session, or as a guest, nothing is approved; a young account waits; the origin and the anti-forgery token are checked', async (t) => {
  const { w, client } = await signedInWithClient(t);
  const request = asked(client);
  const peek = await w.json(`/api/agents/oauth/authorize?request=${encodeURIComponent(request)}`);
  assert.deepEqual([peek.status, peek.signedIn, peek.app], [200, false, 'Claude'], 'the question can be read without signing in');
  assert.equal((await w.json('/api/agents/oauth/authorize', { request, approve: true, mode: 'own' })).status, 403, 'no session, no anti-forgery token: refused');
  const none = await w.call('/api/agents/oauth/authorize', { request, approve: true, mode: 'own', csrf: 'x' });
  assert.ok([401, 403].includes(none.status));
  const guest = await w.guest('Guesty');
  const asGuest = await w.post('/api/agents/oauth/authorize', { request, approve: true, mode: 'own' }, guest.cookie);
  assert.deepEqual([asGuest.status, asGuest.error], [403, 'account_required']);
  const young = await w.owner('Young1', 'Young', false);
  const asYoung = await w.post('/api/agents/oauth/authorize', { request, approve: true, mode: 'own' }, young.cookie);
  assert.deepEqual([asYoung.status, asYoung.error], [403, 'account_too_new']);
  const ada = await w.owner('Ada9', 'Ada9');
  assert.equal((await w.json('/api/agents/oauth/authorize', { request, approve: true, mode: 'own', csrf: 'wrong' }, ada.cookie)).error, 'csrf_rejected');
  const noOrigin = await fetch(`${w.f.base}/api/agents/oauth/authorize`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: ada.cookie }, body: JSON.stringify({ request, approve: true, mode: 'own', csrf: await w.csrf(ada.cookie) }) });
  assert.equal(noOrigin.status, 403);
  // The operator's switch holds for sign-ins too.
  await w.change((db) => { (db.agents as { off?: { at: number } } | undefined) ?? (db.agents = { v: 1, keys: {}, owners: {}, chars: {}, claims: {}, names: {} } as never); (db.agents as { off?: { at: number } }).off = { at: 1 }; });
  assert.equal((await w.json(`/api/agents/oauth/authorize?request=${encodeURIComponent(request)}`, null, ada.cookie)).switchedOff, true);
  assert.equal((await approve(w, ada, request)).error, 'agents_off');
});

test('refresh: each use gives a new pair and ends the old; an access token ends in an hour with a challenge; a refresh token ends in thirty days', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const { tokens } = await connect(w, ada, client);
  const access1 = String(tokens.json.access_token), refresh1 = String(tokens.json.refresh_token);
  await w.tool(access1, 'get_my_life');
  w.f.advance(OAUTH.accessMs + 1000);
  const expired = await w.mcp(access1, 'tools/list');
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get('www-authenticate') ?? '', /error="invalid_token"/);
  assert.match(String(((expired.json.error as Json).data as Json).code), /token_expired/);
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 1, 'the sign-in is still listed while it can be renewed');
  const renewed = await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: refresh1 });
  assert.equal(renewed.status, 200, JSON.stringify(renewed.json));
  const access2 = String(renewed.json.access_token), refresh2 = String(renewed.json.refresh_token);
  assert.notEqual(access2, access1);
  assert.notEqual(refresh2, refresh1);
  assert.equal((await w.tool(access2, 'get_my_life')).ok, true);
  assert.equal((await w.mcp(access1, 'tools/list')).status, 401, 'the old access token is gone');
  assert.equal((await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: refresh1 })).json.error, 'invalid_grant', 'a refresh token works once');
  // It is the same sign-in: one row, its counters kept.
  const rows = (await w.json('/api/agents', null, ada.cookie)).keys as Json[];
  assert.deepEqual([rows.length, rows[0]?.calls], [1, 2]);
  // Another client cannot use it.
  const other = (await register(w, { client_name: 'Other', redirect_uris: ['http://localhost:9000/cb'] })).json.client_id as string;
  assert.equal((await trade(w, { grant_type: 'refresh_token', client_id: other, refresh_token: refresh2 })).json.error, 'invalid_grant');
  // Thirty days without a refresh ends it.
  w.f.advance(OAUTH.refreshMs + 1000);
  assert.equal((await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: refresh2 })).json.error, 'invalid_grant');
});

test('revocation with a token, and signing in again replaces the old sign-in of the same assistant (the cap on keys is not eaten)', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const { tokens } = await connect(w, ada, client, 1);
  const revoke = (token: string) => fetch(`${w.f.base}/api/agents/oauth/revoke`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, client_id: client }).toString() });
  assert.equal((await revoke('awr_notarealtokennotarealtokennotarealtoken1')).status, 200, 'an unknown token is not an error');
  assert.equal((await w.mcp(String(tokens.json.access_token), 'tools/list')).status, 200);
  assert.equal((await revoke(String(tokens.json.refresh_token))).status, 200);
  assert.equal((await w.mcp(String(tokens.json.access_token), 'tools/list')).status, 401);
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 0);
  // Reconnecting four times leaves one sign-in, not four.
  for (let n = 10; n < 14; n += 1) assert.equal((await connect(w, ada, client, n)).tokens.status, 200);
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 1);
  // The same through an access token.
  const last = await connect(w, ada, client, 20);
  assert.equal((await revoke(String(last.tokens.json.access_token))).status, 200);
  assert.equal(((await w.json('/api/agents', null, ada.cookie)).keys as Json[]).length, 0);
});

test('a character of its own: the sign-in makes an agent character, always marked AI, and reconnecting reuses it', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  await w.checkPhone(ada);
  const first = await connect(w, ada, client, 1, { approve: true, mode: 'agent', characterName: 'Claude Walker' });
  assert.equal(first.tokens.status, 200, JSON.stringify(first.decided));
  const access = String(first.tokens.json.access_token);
  const life = await w.tool(access, 'get_my_life');
  assert.equal(life.ok, true, JSON.stringify(life.data));
  const view = await w.json('/api/agents', null, ada.cookie);
  assert.deepEqual([(view.keys as Json[]).length, (view.keys as Json[])[0]?.character, (view.characters as Json[]).length], [1, 'Claude Walker', 1]);
  const id = (view.characters as Json[])[0]?.id as string;
  const mark = await w.stored((db) => Object.values(db.sessions).find((session) => session.publicId === id)?.agent);
  assert.equal(mark?.char, true);
  // Again, naming the same character: the old sign-in is replaced and the character is kept.
  const again = await connect(w, ada, client, 2, { approve: true, mode: 'agent', character: id });
  assert.equal(again.tokens.status, 200, JSON.stringify(again.decided));
  const after = await w.json('/api/agents', null, ada.cookie);
  assert.deepEqual([(after.keys as Json[]).length, (after.characters as Json[]).length], [1, 1]);
  assert.equal((await w.mcp(access, 'tools/list')).status, 401, 'the replaced token is gone');
});

test('erasure: deleting the account ends its sign-ins, codes and refresh tokens', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  const { tokens } = await connect(w, ada, client, 1);
  const pending = await approve(w, ada, asked(client, 2));
  const count = () => w.stored((db) => { const o = db.oauth as { codes: object; refresh: object; clients: object }; return [Object.keys(o.codes).length, Object.keys(o.refresh).length, Object.keys(o.clients).length]; });
  assert.deepEqual(await count(), [2, 1, 1]);
  const deleted = await w.post('/api/account/delete', { idToken: await w.token('Ada1'), confirm: 'delete' }, ada.cookie);
  assert.equal(deleted.status, 200, JSON.stringify(deleted));
  assert.equal((await w.mcp(String(tokens.json.access_token), 'tools/list')).status, 401);
  assert.deepEqual(await count(), [0, 0, 1], 'codes and refresh tokens go; the assistant\'s registration names no person and stays');
  assert.equal((await trade(w, { grant_type: 'authorization_code', client_id: client, code: codeIn(pending.redirect), code_verifier: verifier(2) })).json.error, 'invalid_grant');
  assert.equal((await trade(w, { grant_type: 'refresh_token', client_id: client, refresh_token: String(tokens.json.refresh_token) })).json.error, 'invalid_grant');
});

test('sweeping: a key whose code was never traded frees its place; a full registry makes room; an idle assistant is forgotten', async (t) => {
  const { w, ada, client } = await signedInWithClient(t);
  for (let n = 0; n < 3; n += 1) {
    const other = (await register(w, { client_name: `Tool ${n}`, redirect_uris: [`http://localhost:${9100 + n}/cb`] })).json.client_id as string;
    assert.equal((await approve(w, ada, asked(other, n, { redirect_uri: `http://localhost:${9100 + n}/cb` }))).status, 200);
  }
  const full = await approve(w, ada, asked(client, 5));
  assert.equal(full.error, 'too_many_keys', 'three waiting keys fill the cap');
  w.f.advance(OAUTH.codeMs + 1000);
  assert.equal((await approve(w, ada, asked(client, 5))).status, 200, 'once their codes ran out, the places are free');
  w.f.advance(OAUTH.clientIdleMs + HOUR);
  await register(w, { redirect_uris: [REDIRECT] });
  const clients = await w.stored((db) => Object.keys((db.oauth as { clients: object }).clients).length);
  assert.equal(clients, 1, 'the others were idle for 90 days');
  assert.equal(originOf('', 'joinallworld.com'), 'https://joinallworld.com');
  assert.equal(originOf('', '127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(originOf('https://x.test', 'evil.example'), 'https://x.test');
});
