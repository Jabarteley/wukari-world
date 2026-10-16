/**
 * SIGN-IN FOR WEB ASSISTANTS (OAuth): the numbers and the pure rules, in one place (design: docs/AGENTS.md "Sign-in for web assistants").
 * Follows the MCP authorization specification of 2026-07-28: OAuth 2.1 with PKCE (S256 only), protected resource metadata (RFC 9728),
 * authorization server metadata (RFC 8414), dynamic client registration (RFC 7591, kept by the spec for backwards compatibility: both
 * ChatGPT and Claude register this way), resource indicators (RFC 8707) and the issuer in the authorization response (RFC 9207).
 * Nothing here reads a clock, a context or the store.
 */
import { sha256Hex } from '../../src/game/util.ts';

export const OAUTH = Object.freeze({
  /** An access token lives this long. It is an agent key with an end date, so everything an agent key does, it does, until then. */
  accessMs: 60 * 60000,
  /** A refresh token works once, for this long after it was issued; each use gives a new one (so a connection that is used stays signed in). */
  refreshMs: 30 * 86400000,
  /** An authorization code works once, for this long. */
  codeMs: 2 * 60000,
  /** Clients (assistants) the server remembers, and how many one address may register in an hour. */
  clientsMax: 5000,
  clientsPerAddressHour: 20,
  /** A client nobody has signed in through for this long is forgotten. */
  clientIdleMs: 90 * 86400000,
  redirectUrisMax: 5,
  redirectUriLength: 300,
  clientNameLength: 40,
  /** The one scope. A grant plays like an agent key: every action a person may run, minus the deny list (server/agents/access.ts). */
  scope: 'allworld:play',
  /** Longest query string the authorization page takes. */
  queryLength: 2048,
});

/** The hosts of the two assistants' own callbacks. Their redirect addresses must be https; any path on these hosts. */
export const ASSISTANT_HOSTS: readonly string[] = Object.freeze(['chatgpt.com', 'chat.openai.com', 'platform.openai.com', 'claude.ai', 'claude.com']);

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

export interface RedirectTarget { host: string; local: boolean }
/**
 * Is this redirect address one a client may register and be sent to? Exactly: https on an assistant's host, or http on this computer
 * (localhost, 127.0.0.1, [::1], any port) for development. No user name, no fragment, no dot segments. Returns what it points at, or null.
 */
export function redirectTarget(value: unknown): RedirectTarget | null {
  if (typeof value !== 'string' || value.length > OAUTH.redirectUriLength || /[\u0000-\u0020\u007f\\<>"]/.test(value)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.username || url.password || url.hash || value.includes('#')) return null;
  if (url.href !== value && url.href !== `${value}/`) return null;
  if (url.pathname.split('/').some((part) => part === '..' || part === '.')) return null;
  if (url.protocol === 'https:') return ASSISTANT_HOSTS.includes(url.hostname) && url.port === '' ? { host: url.hostname, local: false } : null;
  if (url.protocol === 'http:' && LOOPBACK.test(url.hostname)) return { host: url.hostname.replace(/^\[|\]$/g, ''), local: true };
  return null;
}

/** A client's name as it is shown on the approval page: plain text, short. */
export function cleanClientName(value: unknown): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text || /[\u0000-\u001f\u007f<>]/.test(text)) return 'An AI assistant';
  return text.slice(0, OAUTH.clientNameLength);
}

const SECRET_BYTES = 32;
function randomText(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** A fresh authorization code, refresh token or client id: 256 random bits (a client id, 128), url-safe, with a prefix that says what it is. */
export const newCode = (): string => `awx_${randomText()}`;
export const newRefreshToken = (): string => `awr_${randomText()}`;
export const newClientId = (): string => `awo_${randomText().slice(0, 22)}`;
export const isCode = (value: unknown): value is string => typeof value === 'string' && /^awx_[A-Za-z0-9_-]{43}$/.test(value);
export const isRefreshToken = (value: unknown): value is string => typeof value === 'string' && /^awr_[A-Za-z0-9_-]{43}$/.test(value);
export const isClientId = (value: unknown): value is string => typeof value === 'string' && /^awo_[A-Za-z0-9_-]{22}$/.test(value);
/** Only the digest of a code or a refresh token is stored. (An access token is an agent key: hashOfKey in service.ts.) */
export const hashOfCode = (code: string): string => sha256Hex(`allworld-oauth-code-v1|${code}`);
export const hashOfRefresh = (token: string): string => sha256Hex(`allworld-oauth-refresh-v1|${token}`);
/** Where a key waits between the approval and the exchange of its code: a digest nobody can present as a key. */
export const pendingHash = (codeHash: string): string => sha256Hex(`allworld-oauth-pending-v1|${codeHash}`);

/** PKCE (RFC 7636), S256 only. A challenge is 43 url-safe characters; a verifier 43 to 128 of the unreserved set. */
export const isChallenge = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const isVerifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
export function challengeOf(verifier: string): string {
  const hex = sha256Hex(verifier);
  let text = '';
  for (let i = 0; i < hex.length; i += 2) text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Compare two strings in time that does not depend on where they differ. */
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The address of the MCP endpoint on this origin: what a token is issued for (RFC 8707). */
export const resourceOf = (origin: string): string => `${origin}/mcp`;
/** Does a `resource` parameter name this server? The endpoint itself or the origin, with or without a trailing slash. */
export function isOurResource(value: string, origin: string): boolean {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed === origin || trimmed === resourceOf(origin);
}
/** The scope parameter: absent, or made of the one scope (and `offline_access`, which refresh tokens make true anyway). */
export function scopeAllowed(value: string): boolean {
  return value.split(/\s+/).filter(Boolean).every((item) => item === OAUTH.scope || item === 'offline_access');
}

export interface Metadata { resource: object; server: object }
/** The two discovery documents (RFC 9728 and RFC 8414). `origin` is this site's public origin: the issuer. */
export function metadata(origin: string): Metadata {
  const api = `${origin}/api/agents/oauth`;
  return {
    resource: { resource: resourceOf(origin), authorization_servers: [origin], scopes_supported: [OAUTH.scope], bearer_methods_supported: ['header'], resource_name: 'Allworld', resource_documentation: `${origin}/agents/join` },
    server: {
      issuer: origin, authorization_endpoint: `${origin}/oauth/authorize`, token_endpoint: `${api}/token`, registration_endpoint: `${api}/register`, revocation_endpoint: `${api}/revoke`,
      scopes_supported: [OAUTH.scope], response_types_supported: ['code'], response_modes_supported: ['query'], grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], revocation_endpoint_auth_methods_supported: ['none'],
      authorization_response_iss_parameter_supported: true, client_id_metadata_document_supported: false, service_documentation: `${origin}/agents/join`,
    },
  };
}

/** The value of the WWW-Authenticate header on a 401 from the MCP endpoint (RFC 9728 section 5.1, RFC 6750 section 3). */
export function challenge(origin: string, problem?: { error: 'invalid_token'; description: string }): string {
  const parts = [`resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`, `scope="${OAUTH.scope}"`];
  if (problem) parts.unshift(`error="${problem.error}"`, `error_description="${problem.description.replace(/[^\x20-\x7e]|["\\]/g, '')}"`);
  return `Bearer ${parts.join(', ')}`;
}

/** This site's own origin as the metadata documents state it: the configured public origin, else the host the request named (http for this computer, https for anything else). */
export function originOf(configured: string, host: string | null): string {
  if (configured) return configured;
  const name = host !== null && /^[A-Za-z0-9.-]{1,253}(:\d{1,5})?$/.test(host) ? host : 'localhost';
  return `${LOOPBACK.test(name.replace(/:\d+$/, '')) ? 'http' : 'https'}://${name}`;
}
