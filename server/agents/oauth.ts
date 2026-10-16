/**
 * SIGN-IN FOR WEB ASSISTANTS: what is stored and the rules around it (design: docs/AGENTS.md "Sign-in for web assistants").
 * Every function here runs inside one store transaction (or a read) and returns a plain answer; nothing here sends anything.
 *
 * A person who connects ChatGPT or Claude by its web connector is not asked to paste a key: the assistant sends them to the game's own
 * approval page, they approve, and the assistant is handed an ACCESS TOKEN that is an agent key with an end date (AgentKey.oauth in
 * service.ts). It is stored where keys are stored, counted in the same cap, listed in Settings and revoked there, limited, marked AI-played and
 * capped by the same code as a key made by hand. What is new is only the way a key reaches the assistant.
 *
 * STORED   ctx.collection(db, 'oauth') = OAuthCollection (below): its own collection, so the agents collection every MCP call writes does not grow with it.
 *   clients   the assistants that registered (RFC 7591): a name and exact redirect addresses. No person is named. Bounded, idle ones forgotten.
 *   codes     authorization codes by their digest: who approved (the account id), the key waiting for the trade, the PKCE challenge. Two minutes, once.
 *   refresh   refresh tokens by their digest: the grant they renew. A use gives a new one and ends the old.
 *   A token or a code itself is never stored, only its SHA-256. Erasure: `forgetOAuth` (server/agents/privacy.ts, called when an account is deleted and by server/admin/erasure-data.ts).
 */
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { accountOfSession } from '../admin/gate.ts';
import { hashOfKey, newKeySecret } from './service.ts';
import type { AgentKey, AgentService } from './service.ts';
import {
  OAUTH, challengeOf, cleanClientName, hashOfCode, hashOfRefresh, isChallenge, isClientId, isCode, isOurResource, isRefreshToken, isVerifier, newClientId, newCode, newRefreshToken,
  pendingHash, redirectTarget, sameText, scopeAllowed,
} from './oauth-rules.ts';

export interface OAuthClient { name: string; uris: string[]; at: number; seen: number }
export interface CodeRecord { client: string; account: string; uri: string; challenge: string; keyId: string; exp: number; used?: true }
export interface RefreshRecord { client: string; account: string; keyId: string; exp: number }
export interface OAuthCollection { v: 1; clients: Record<string, OAuthClient>; codes: Record<string, CodeRecord>; refresh: Record<string, RefreshRecord> }

/** A refusal in the words OAuth clients read: an error code and a sentence, with the status it is sent under. */
export interface Failure { ok: false; status: number; error: string; description: string; redirect?: string }
const failure = (status: number, error: string, description: string): Failure => ({ ok: false, status, error, description });

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = <T>(map: Record<string, T> | undefined, key: string): T | undefined => {
  const value = map && key !== '__proto__' ? map[key] : undefined;
  return value !== null && typeof value === 'object' ? value : undefined;
};

/** What a pending authorization request asks for, checked. */
export interface Asked { clientId: string; client: OAuthClient; uri: string; challenge: string; state?: string; resource?: string }

export function oauthService(ctx: RouteContext, svc: AgentService) {
  const now = (): number => ctx.now();
  function col(db: Db): OAuthCollection {
    const found = ctx.collection(db, 'oauth', { v: 1, clients: {}, codes: {}, refresh: {} }) as Partial<OAuthCollection>;
    if (!isObject(found.clients)) found.clients = {};
    if (!isObject(found.codes)) found.codes = {};
    if (!isObject(found.refresh)) found.refresh = {};
    found.v = 1;
    return found as OAuthCollection;
  }
  const peek = (db: Db): OAuthCollection | null => {
    const found: unknown = db.oauth;
    return isObject(found) && isObject(found.clients) && isObject(found.codes) && isObject(found.refresh) ? found as unknown as OAuthCollection : null;
  };

  /** Forget what has run out. Called when something is written, never on a read. */
  function sweep(o: OAuthCollection): void {
    const t = now();
    for (const [hash, record] of Object.entries(o.codes)) if (record.exp <= t) delete o.codes[hash];
    for (const [hash, record] of Object.entries(o.refresh)) if (record.exp <= t) delete o.refresh[hash];
    for (const [id, client] of Object.entries(o.clients)) if (client.seen + OAUTH.clientIdleMs <= t) delete o.clients[id];
  }

  /** RFC 7591: an assistant registers its redirect addresses and is given an id. Only public clients (PKCE, no secret) exist here. */
  function register(db: Db, body: Record<string, unknown>): { ok: true; status: 201; body: object } | Failure {
    const uris = body.redirect_uris;
    if (!Array.isArray(uris) || uris.length < 1 || uris.length > OAUTH.redirectUrisMax) return failure(400, 'invalid_redirect_uri', `Send between 1 and ${OAUTH.redirectUrisMax} redirect_uris.`);
    const kept: string[] = [];
    for (const item of uris) {
      if (typeof item !== 'string' || redirectTarget(item) === null) return failure(400, 'invalid_redirect_uri', 'A redirect address must be https on the assistant\'s own host, or http on localhost, with no fragment.');
      if (!kept.includes(item)) kept.push(item);
    }
    const types = body.response_types;
    if (types !== undefined && (!Array.isArray(types) || !types.every((item) => item === 'code'))) return failure(400, 'invalid_client_metadata', 'Only the "code" response type is offered.');
    const grants = body.grant_types;
    if (grants !== undefined && (!Array.isArray(grants) || !grants.every((item) => item === 'authorization_code' || item === 'refresh_token'))) return failure(400, 'invalid_client_metadata', 'Only the authorization_code and refresh_token grants are offered.');
    const o = col(db), t = now();
    sweep(o);
    if (Object.keys(o.clients).length >= OAUTH.clientsMax) {
      // Full: the one that has waited longest without anyone signing in through it makes room.
      const oldest = Object.entries(o.clients).sort((x, y) => x[1].seen - y[1].seen)[0];
      if (oldest) delete o.clients[oldest[0]];
    }
    let clientId = newClientId();
    while (Object.hasOwn(o.clients, clientId)) clientId = newClientId();
    const name = cleanClientName(body.client_name);
    o.clients[clientId] = { name, uris: kept, at: t, seen: t };
    return { ok: true, status: 201, body: { client_id: clientId, client_id_issued_at: Math.floor(t / 1000), client_name: name, redirect_uris: kept, grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', scope: OAUTH.scope } };
  }

  /** The authorization request, checked in the order that decides whether the redirect address may be trusted at all (RFC 6749 section 4.1.2.1). */
  function ask(db: Db, query: URLSearchParams, origin: string): { ok: true; asked: Asked } | Failure {
    const o = peek(db), id = query.get('client_id') ?? '';
    const client = isClientId(id) && o ? own(o.clients, id) : undefined;
    if (!client) return failure(400, 'invalid_request', 'This sign-in link is not valid: the assistant is not registered. Start again from the assistant.');
    const given = query.get('redirect_uri');
    const uri = given ?? (client.uris.length === 1 ? client.uris[0] : undefined);
    if (!uri || !client.uris.includes(uri) || redirectTarget(uri) === null) return failure(400, 'invalid_request', 'This sign-in link is not valid: its return address is not the one the assistant registered. Start again from the assistant.');
    // From here the address is trusted: a refusal goes back to the assistant.
    const state = query.get('state') ?? undefined;
    const back = (error: string, description: string): Failure => ({ ...failure(400, error, description), redirect: errorRedirect(uri, error, description, state, origin) });
    if (state !== undefined && state.length > 512) return back('invalid_request', 'The state value is too long.');
    if (query.get('response_type') !== 'code') return back('unsupported_response_type', 'Only response_type=code is offered.');
    const method = query.get('code_challenge_method'), challenge = query.get('code_challenge');
    if (method !== 'S256') return back('invalid_request', 'PKCE with code_challenge_method=S256 is required.');
    if (!isChallenge(challenge)) return back('invalid_request', 'The code_challenge is missing or not a valid S256 challenge.');
    const resource = query.get('resource') ?? undefined;
    if (resource !== undefined && !isOurResource(resource, origin)) return back('invalid_target', 'The resource must be this server\'s MCP address.');
    const scope = query.get('scope');
    if (scope !== null && !scopeAllowed(scope)) return back('invalid_scope', `The only scope offered is ${OAUTH.scope}.`);
    return { ok: true, asked: { clientId: id, client, uri, challenge, ...(state !== undefined ? { state } : {}), ...(resource !== undefined ? { resource } : {}) } };
  }

  const errorRedirect = (uri: string, error: string, description: string, state: string | undefined, origin: string): string => {
    const url = new URL(uri);
    url.searchParams.set('error', error); url.searchParams.set('error_description', description);
    if (state !== undefined) url.searchParams.set('state', state);
    url.searchParams.set('iss', origin);
    return url.href;
  };

  /** What the approval page shows: who asks, where they go back to, and the person's own standing. Reads only. */
  function preview(db: Db, session: SessionRecord | undefined, query: URLSearchParams, origin: string) {
    const checked = ask(db, query, origin);
    if (!checked.ok) return checked;
    const { asked } = checked, target = redirectTarget(asked.uri);
    const account = session ? accountOfSession(db, session) : undefined;
    const a = svc.peek(db), owner = account && a ? own(a.owners, account.id) : undefined;
    const chars = (owner?.chars ?? []).flatMap((publicId) => { const found = a ? own(a.chars, publicId) : undefined; return found ? [{ id: publicId, name: found.name }] : []; });
    return {
      ok: true as const,
      app: asked.client.name, goesTo: target?.host ?? '', local: target?.local === true,
      switchedOff: svc.switchedOff(db),
      signedIn: account !== undefined, name: account && session ? session.name : null,
      hasCharacter: Boolean(account?.sessionKey && account.publicId && db.sessions[account.sessionKey]),
      characters: chars,
    };
  }

  /** The person says yes or no. Yes makes the key (waiting for its code to be traded) and the code; either way the answer says where to send them. */
  function decide(db: Db, session: SessionRecord, query: URLSearchParams, origin: string, choice: { approve: boolean; mode: unknown; characterName?: unknown; character?: unknown; city?: unknown }): { ok: true; redirect: string } | Failure {
    const checked = ask(db, query, origin);
    if (!checked.ok) return checked;
    const { asked } = checked;
    if (!choice.approve) return { ok: true, redirect: errorRedirect(asked.uri, 'access_denied', 'The person refused.', asked.state, origin) };
    const account = svc.accountFor(db, session), a = svc.col(db), owner = svc.ownerOf(a, account.id), o = col(db);
    sweep(o);
    // Signing in again through the same assistant replaces what it had before, so a reconnection never runs into the cap on keys.
    const mode = choice.mode;
    const existing = typeof choice.character === 'string' ? choice.character : null;
    for (const hash of [...owner.keys]) {
      const key = own(a.keys, hash);
      if (!key?.oauth || key.oauth.client !== asked.clientId) continue;
      if (key.mode === 'own' ? mode === 'own' : existing !== null && key.publicId === existing) { delete a.keys[hash]; owner.keys = owner.keys.filter((item) => item !== hash); }
    }
    const code = newCode(), codeHash = hashOfCode(code), t = now();
    const made = svc.createKey(db, session, { hash: pendingHash(codeHash), mode, name: asked.client.name.slice(0, 24), characterName: choice.characterName, ...(existing ? { character: existing } : {}), city: choice.city, builtWith: mode === 'agent' && !existing ? asked.client.name : undefined,
      oauth: { client: asked.clientId, app: asked.client.name, until: t + OAUTH.codeMs, pending: true } });
    o.codes[codeHash] = { client: asked.clientId, account: account.id, uri: asked.uri, challenge: asked.challenge, keyId: made.id, exp: t + OAUTH.codeMs };
    const url = new URL(asked.uri);
    url.searchParams.set('code', code);
    if (asked.state !== undefined) url.searchParams.set('state', asked.state);
    url.searchParams.set('iss', origin);
    return { ok: true, redirect: url.href };
  }

  /** The key a grant stands for, found by its id among its owner's keys. */
  function keyOf(db: Db, account: string, keyId: string): { hash: string; key: AgentKey } | null {
    const a = svc.peek(db), owner = a ? own(a.owners, account) : undefined;
    const hash = owner && a ? owner.keys.find((item) => a.keys[item]?.id === keyId) : undefined;
    const key = hash && a ? own(a.keys, hash) : undefined;
    return hash && key ? { hash, key } : null;
  }
  /** End a grant: its key, and every refresh token that would renew it. */
  function end(db: Db, account: string, keyId: string): void {
    const found = keyOf(db, account, keyId), a = svc.col(db), o = col(db);
    if (found) { delete a.keys[found.hash]; const owner = a.owners[account]; if (owner) owner.keys = owner.keys.filter((item) => item !== found.hash); }
    for (const [hash, record] of Object.entries(o.refresh)) if (record.keyId === keyId && record.account === account) delete o.refresh[hash];
  }

  /** Give the grant's key a new access token (and the grant a new refresh token): the key moves to its new digest and keeps everything else. */
  function renew(db: Db, record: { client: string; account: string; keyId: string }, found: { hash: string; key: AgentKey }, app: string) {
    const a = svc.col(db), o = col(db), owner = svc.ownerOf(a, record.account), t = now();
    const access = newKeySecret(), refresh = newRefreshToken();
    const hash = hashOfKey(access);
    delete a.keys[found.hash];
    found.key.oauth = { client: record.client, app, until: t + OAUTH.accessMs };
    a.keys[hash] = found.key;
    owner.keys = owner.keys.map((item) => (item === found.hash ? hash : item));
    o.refresh[hashOfRefresh(refresh)] = { client: record.client, account: record.account, keyId: record.keyId, exp: t + OAUTH.refreshMs };
    const client = own(o.clients, record.client);
    if (client) client.seen = t;
    return { access_token: access, token_type: 'Bearer', expires_in: Math.floor(OAUTH.accessMs / 1000), refresh_token: refresh, scope: OAUTH.scope };
  }

  /** The token endpoint: a code for tokens (with the PKCE verifier), or a refresh token for new ones. */
  function token(db: Db, form: URLSearchParams, origin: string): { ok: true; body: object } | Failure {
    const grant = form.get('grant_type'), clientId = form.get('client_id') ?? '';
    const o = col(db), client = isClientId(clientId) ? own(o.clients, clientId) : undefined;
    if (!client) return failure(401, 'invalid_client', 'This client is not registered here. Register it first (registration_endpoint).');
    const resource = form.get('resource');
    if (resource !== null && !isOurResource(resource, origin)) return failure(400, 'invalid_target', 'The resource must be this server\'s MCP address.');
    if (grant === 'authorization_code') {
      const code = form.get('code'), verifier = form.get('code_verifier');
      if (!isCode(code)) return failure(400, 'invalid_grant', 'The code is not valid.');
      const hash = hashOfCode(code), record = own(o.codes, hash);
      if (!record) return failure(400, 'invalid_grant', 'The code is not valid, or it has already been used.');
      // A code traded twice is a stolen or replayed one: what it made is ended, as the standard asks.
      if (record.used) { end(db, record.account, record.keyId); delete o.codes[hash]; return failure(400, 'invalid_grant', 'This code has already been used. The sign-in it made has been ended; start again.'); }
      if (record.exp <= now()) { delete o.codes[hash]; return failure(400, 'invalid_grant', 'The code has expired. Start again.'); }
      // Whatever follows, this code is spent.
      record.used = true;
      if (record.client !== clientId) return failure(400, 'invalid_grant', 'The code was not issued to this client.');
      const uri = form.get('redirect_uri');
      if (uri !== null && uri !== record.uri) return failure(400, 'invalid_grant', 'The redirect_uri is not the one the code was issued for.');
      if (!isVerifier(verifier) || !sameText(challengeOf(verifier), record.challenge)) return failure(400, 'invalid_grant', 'The code_verifier does not match the code_challenge.');
      const found = keyOf(db, record.account, record.keyId);
      if (!found) return failure(400, 'invalid_grant', 'The person has since ended this sign-in.');
      return { ok: true, body: renew(db, record, found, client.name) };
    }
    if (grant === 'refresh_token') {
      const given = form.get('refresh_token');
      if (!isRefreshToken(given)) return failure(400, 'invalid_grant', 'The refresh token is not valid.');
      const hash = hashOfRefresh(given), record = own(o.refresh, hash);
      if (!record || record.client !== clientId) return failure(400, 'invalid_grant', 'The refresh token is not valid, has been used, or the sign-in was ended. Sign in again.');
      delete o.refresh[hash];
      if (record.exp <= now()) return failure(400, 'invalid_grant', 'The refresh token has expired. Sign in again.');
      const found = keyOf(db, record.account, record.keyId);
      if (!found) return failure(400, 'invalid_grant', 'The person has ended this sign-in. Sign in again.');
      return { ok: true, body: renew(db, record, found, client.name) };
    }
    return failure(400, 'unsupported_grant_type', 'Use grant_type authorization_code or refresh_token.');
  }

  /** RFC 7009: whoever holds a token may end the sign-in it belongs to. An unknown token is not an error. */
  function revoke(db: Db, form: URLSearchParams): void {
    const given = form.get('token');
    const a = svc.peek(db), o = peek(db);
    if (!a || !o || typeof given !== 'string') return;
    if (isRefreshToken(given)) {
      const record = own(o.refresh, hashOfRefresh(given));
      if (record) end(db, record.account, record.keyId);
      return;
    }
    const key = /^awk_[A-Za-z0-9_-]{43}$/.test(given) ? own(a.keys, hashOfKey(given)) : undefined;
    if (key?.oauth && key.account) end(db, key.account, key.id);
  }

  return { col, peek, register, ask, preview, decide, token, revoke, sweep };
}
export type OAuthService = ReturnType<typeof oauthService>;
