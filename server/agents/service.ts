/**
 * AGENT ACCESS: what is stored and the rules around it (design: docs/AGENTS.md). Every function here runs inside one store
 * transaction (or a read) and either returns or throws; nothing here sends anything or keeps a secret.
 *
 *   agents.keys[<hash>]        one AGENT KEY, filed under the SHA-256 of the key itself. The key is shown to its owner once and is never
 *                              stored: a copy of the database cannot be used to play. Who it is for, how it plays, when it was last
 *                              used, its counters and its audit trail (the last few calls, bounded).
 *   agents.owners[<account>]   the account's keys and agent characters (so the caps are a count, not a scan).
 *   agents.chars[<publicId>]   an AGENT CHARACTER: an extra life owned by an account, permanently marked as agent-played, and what the
 *                              agents board shows about it.
 *   agents.off                 the operator's switch: while it is set every agent call is refused.
 *
 * An agent CHARACTER is an ordinary session record of its own (no account, a secret nobody holds) with `agent: { char: true, owner }`.
 * A key for the player's OWN character resolves, on each call, to the session the account has in play.
 */
import type { CityId } from '../../src/types/protocol.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { UUID_PATTERN, validateName } from '../protocol.ts';
import { accountOfSession } from '../admin/gate.ts';
import { characterCity } from '../character.ts';
import { screenText } from '../moderation/text.ts';
import { findActivity } from '../../src/game/systems/activities.ts';
import { checkLook } from '../../src/game/systems/onboarding.ts';
import { initialVenuePosition, venueRoomKey } from '../protocol.ts';
import { agentMark } from './policy.ts';
import type { LifeState } from '../../src/types/life.ts';
import type { RouteRequest } from '../types.ts';
import { eraseAgents } from './privacy.ts';
import { AGENT_ACCOUNT_MIN_AGE_MS, AGENT_LIMITS, UNCLAIMED } from './policy.ts';
import type { AgentMode } from './policy.ts';

export interface AuditEntry { at: number; tool: string; ok: boolean; code: string; rid?: string; aid?: string }
export interface AgentKey {
  /** What the owner's list and the revoke button call it. Not secret. */
  id: string
  account: string
  mode: AgentMode
  /** The character the key plays: the account's own character (pinned) or an agent character. */
  publicId: string
  name: string
  /** '*' (every action a person may run, minus the deny list), or a narrower list of action types. */
  scopes: string[]
  /** An agent that signed itself up and has not been claimed: no account yet. */
  unclaimed?: true
  createdAt: number
  lastUsedAt: number | null
  calls: number
  /** UTC day of `today`. */
  day: number
  today: number
  /** Game refusals in a row. */
  refusals: number
  reports: number
  suspended?: { at: number; reason: 'refusals' | 'reports' | 'operator' }
  audit: AuditEntry[]
}
/** What an agent call changed, written once after the call: counters, audit, the AI-played mark, the character's board line. */
/** The figures of the agent league, read from the settled life after a call. */
export interface LeagueFacts { cash: number; earned: number; week: number; shifts: number; won: number; friends: number; offices: number }
export interface AgentOutcome { tool: string; ok: boolean; code: string; rid?: string; aid?: string; sent?: boolean; refused?: boolean; facts?: LeagueFacts; say?: string }
export interface AgentOwner { keys: string[]; chars: string[] }
/** An agent character (claimed or not) and the figures the league and its page show. */
export interface AgentCharacter {
  name: string; slug: string
  /** The owning account, or '' while unclaimed. */
  account: string
  ownerName?: string
  builtWith?: string
  city: string; createdAt: number; claimedAt?: number
  cash: number; week: number; earned: number; at: number; reports: number
  /** What the league measures against: the balance and the games won at the start of the Lagos week `w0.week`. */
  w0: { week: number; cash: number; won: number }
  shifts: number; won: number; friends: number; offices: number
  /** The last few public things it did, for its page. */
  recent: { at: number; text: string }[]
}
export interface ClaimRecord { publicId: string; keyHash: string; createdAt: number; expiresAt: number; claimedBy?: string; claimedAt?: number }
export interface AgentsCollection {
  v: 1
  /** The operator's play switch: while set, every agent call is refused. */
  off?: { at: number }
  /** The operator's creation switch: while set, no agent can sign itself up (play is unaffected). */
  createOff?: { at: number }
  /** Operator settings that change without a release. */
  settings?: { ceiling?: number; createCap?: number }
  /** New self-made agent accounts counted on `day`. */
  created?: { day: number; n: number }
  keys: Record<string, AgentKey>; owners: Record<string, AgentOwner>; chars: Record<string, AgentCharacter>
  /** Claim links by the digest of their token. */
  claims: Record<string, ClaimRecord>
  /** Agent names (lower case, url-safe) → public id: a name is unique among agents and is its page address. */
  names: Record<string, string>
}

/** A refusal the endpoint turns into a plain sentence for the agent (or the owner). */
export const refusal = (ctx: Pick<RouteContext, 'fail'>, status: number, code: string, reason: string): Error => Object.assign(ctx.fail(status, code), { reason });

const KEY_PREFIX = 'awk_', CLAIM_PREFIX = 'awc_';
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = <T>(map: Record<string, T> | undefined, key: string): T | undefined => {
  const value = map && key !== '__proto__' ? map[key] : undefined;
  return value !== null && typeof value === 'object' ? value : undefined;
};
export const dayOf = (ms: number): number => Math.floor(ms / 86400000);
export const hashOfKey = (secret: string): string => sha256Hex(`allworld-agent-key-v1|${secret}`);
/** A fresh key: 256 random bits, url-safe. The caller shows it once and keeps nothing. */
export function newKeySecret(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return KEY_PREFIX + btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const hashOfClaim = (token: string): string => sha256Hex(`allworld-agent-claim-v1|${token}`);
/** A fresh claim token: 256 random bits, url-safe. It appears once, in the claim link. */
export function newClaimToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return CLAIM_PREFIX + btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const isClaimToken = (value: unknown): value is string => typeof value === 'string' && /^awc_[A-Za-z0-9_-]{43}$/.test(value);
/** A name as an address: lower case letters and digits joined by dashes. */
export const slugOf = (name: string): string => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
/** The key in an Authorization header, or null. The shape is checked so that no other bearer token is ever hashed or looked up. */
export function bearerKey(header: string | null | undefined): string | null {
  const match = /^Bearer (awk_[A-Za-z0-9_-]{43})$/.exec(header ?? '');
  return match?.[1] ?? null;
}

export interface Agent { hash: string; key: AgentKey; session: SessionRecord; cityId: CityId; character: boolean; ceiling?: number }

export function agentService(ctx: RouteContext) {
  const now = (): number => ctx.now();

  /** The collection for a write, created and repaired in place. */
  function col(db: Db): AgentsCollection {
    const found = ctx.collection(db, 'agents', { v: 1, keys: {}, owners: {}, chars: {}, claims: {}, names: {} }) as Partial<AgentsCollection>;
    if (!isObject(found.claims)) found.claims = {};
    if (!isObject(found.names)) found.names = {};
    if (!isObject(found.keys)) found.keys = {};
    if (!isObject(found.owners)) found.owners = {};
    if (!isObject(found.chars)) found.chars = {};
    found.v = 1;
    return found as AgentsCollection;
  }
  /** The collection as a read sees it: nothing is created. */
  const peek = (db: Db): AgentsCollection | null => {
    const found: unknown = db.agents;
    return isObject(found) && isObject(found.keys) && isObject(found.owners) && isObject(found.chars) ? found as unknown as AgentsCollection : null;
  };
  const switchedOff = (db: Db): boolean => Boolean(peek(db)?.off);
  const ownerOf = (a: AgentsCollection, account: string): AgentOwner => (a.owners[account] ??= { keys: [], chars: [] });

  const cleanLabel = (value: unknown, fallback: string): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return fallback;
    if (text.length > AGENT_LIMITS.nameLength || /[\u0000-\u001f\u007f<>]/.test(text)) throw refusal(ctx, 400, 'invalid_name', `Give it a name of up to ${AGENT_LIMITS.nameLength} characters.`);
    return text;
  };

  /** The signed-in account behind a session, or a refusal in words: guests cannot hold keys, and a new account waits a day. */
  function accountFor(db: Db, session: SessionRecord) {
    if (switchedOff(db)) throw refusal(ctx, 403, 'agents_off', 'AI agent access is switched off for now.');
    const account = accountOfSession(db, session);
    if (!account) throw refusal(ctx, 403, 'account_required', 'Sign in to your account first. Guests cannot connect an AI agent.');
    const wait = account.createdAt + AGENT_ACCOUNT_MIN_AGE_MS - now();
    if (wait > 0) throw refusal(ctx, 403, 'account_too_new', `New accounts wait a day before they connect an AI agent. Try again in ${Math.max(1, Math.ceil(wait / 3600000))} hour${wait > 3600000 ? 's' : ''}.`);
    return account;
  }

  /** What the owner's Settings list shows. No hash, no secret. */
  function view(db: Db, session: SessionRecord) {
    const account = accountOfSession(db, session);
    if (!account) return { enabled: !switchedOff(db), signedIn: false, keys: [], characters: [], limits: { keys: AGENT_LIMITS.keysPerAccount, characters: AGENT_LIMITS.charactersPerAccount } };
    const a = peek(db), owner = a ? own(a.owners, account.id) : undefined;
    const keys = (owner?.keys ?? []).flatMap((hash) => { const key = a ? own(a.keys, hash) : undefined; return key ? [key] : []; });
    const characters = (owner?.chars ?? []).flatMap((publicId) => { const found = a ? own(a.chars, publicId) : undefined; return found ? [{ id: publicId, name: found.name, city: found.city, createdAt: found.createdAt, hasKey: keys.some((key) => key.publicId === publicId) }] : []; });
    return {
      enabled: !switchedOff(db), signedIn: true,
      keys: keys.map((key) => ({ id: key.id, name: key.name, mode: key.mode, character: key.mode === 'agent' ? characters.find((item) => item.id === key.publicId)?.name ?? null : null, createdAt: key.createdAt, lastUsedAt: key.lastUsedAt, calls: key.calls,
        ...(key.suspended ? { suspended: key.suspended.reason } : {}) })),
      characters, limits: { keys: AGENT_LIMITS.keysPerAccount, characters: AGENT_LIMITS.charactersPerAccount },
    };
  }

  /**
   * Make a key. `hash` is the SHA-256 of the key the route has just made (the key itself never reaches this function).
   * mode 'own': the key plays the character the account has in play. mode 'agent': it plays a NEW agent character (or an existing one of
   * this account that has no key), named `characterName`, in `city`.
   */
  function createKey(db: Db, session: SessionRecord, input: { hash: string; mode: unknown; name: unknown; characterName?: unknown; character?: unknown; city?: unknown; builtWith?: unknown }) {
    const account = accountFor(db, session);
    const a = col(db), owner = ownerOf(a, account.id);
    if (input.mode !== 'own' && input.mode !== 'agent') throw refusal(ctx, 400, 'invalid_mode', 'Choose "my character" or "a new agent character".');
    const mode: AgentMode = input.mode;
    if (owner.keys.length >= AGENT_LIMITS.keysPerAccount) throw refusal(ctx, 409, 'too_many_keys', `You can hold ${AGENT_LIMITS.keysPerAccount} agent keys. Revoke one first.`);
    if (!/^[0-9a-f]{64}$/.test(input.hash) || Object.hasOwn(a.keys, input.hash)) throw refusal(ctx, 400, 'invalid_key', 'That key could not be made. Try again.');
    let publicId: string;
    if (mode === 'own') {
      if (!account.sessionKey || !account.publicId || !db.sessions[account.sessionKey]) throw refusal(ctx, 409, 'no_character', 'Start your character first; the agent plays the character you have.');
      publicId = account.publicId;
    } else {
      const existing = typeof input.character === 'string' ? input.character : null;
      if (existing !== null) {
        const found = own(a.chars, existing);
        if (!found || found.account !== account.id || !owner.chars.includes(existing)) throw refusal(ctx, 404, 'unknown_character', 'That agent character is not yours.');
        if (owner.keys.some((hash) => a.keys[hash]?.publicId === existing)) throw refusal(ctx, 409, 'character_has_key', 'That agent character already has a key.');
        publicId = existing;
      } else {
        if (owner.chars.length >= AGENT_LIMITS.charactersPerAccount) throw refusal(ctx, 409, 'too_many_characters', `You can own ${AGENT_LIMITS.charactersPerAccount} agent characters. Remove one first.`);
        publicId = makeCharacter(db, a, { name: input.characterName, city: input.city, builtWith: input.builtWith, account: account.id, ownerName: session.name });
        owner.chars.push(publicId);
      }
    }
    const id = `k${ctx.randomId().replaceAll('-', '').slice(0, 10)}`;
    const key: AgentKey = { id, account: account.id, mode, publicId, name: cleanLabel(input.name, mode === 'own' ? 'My character' : 'Agent'), scopes: ['*'], createdAt: now(), lastUsedAt: null, calls: 0,
      day: dayOf(now()), today: 0, refusals: 0, reports: 0, audit: [] };
    a.keys[input.hash] = key;
    owner.keys.push(input.hash);
    return { id, name: key.name, mode, character: mode === 'agent' ? a.chars[publicId]?.name ?? null : null };
  }

  /** The label a creator may put on an agent ("built with"): free text, filtered, 40 characters. */
  function builtWithOf(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    if (!text || text.length > 40 || /[\u0000-\u001f\u007f<>]/.test(text)) throw refusal(ctx, 400, 'invalid_built_with', 'The "built with" label is up to 40 characters, for example the model or framework you use.');
    const verdict = screenText(text, { contact: true, what: 'That label' });
    if (verdict) throw refusal(ctx, 400, 'built_with_not_allowed', verdict.reason);
    return text;
  }

  /** A new agent character: an ordinary life of its own (no browser holds its secret, no onboarding hold), marked agent-played for good. Returns its public id. */
  function makeCharacter(db: Db, a: AgentsCollection, input: { name: unknown; city: unknown; builtWith: unknown; account: string; ownerName?: string; unclaimed?: true }): string {
    const name = validateName(input.name), slug = slugOf(name);
    if (!slug || Object.hasOwn(a.names, slug)) throw refusal(ctx, 409, 'name_taken', 'An agent already has that name. Choose another.');
    const city = ctx.cityIds.find((id) => id === (input.city ?? 'lagos'));
    if (!city) throw refusal(ctx, 400, 'invalid_city', 'Choose an open city for the agent character.');
    const builtWith = builtWithOf(input.builtWith);
    const { secret, publicId } = ctx.core.newIdentity();
    const t = now();
    db.sessions[secret] = { secret, publicId, name, expiresAt: t + (input.unclaimed ? UNCLAIMED.idleMs : ctx.config.sessionTtlMs), cities: {}, actions: {}, character: { v: 2, city },
      agent: { char: true, ...(input.unclaimed ? { unclaimed: true as const } : { owner: input.account }) } };
    a.chars[publicId] = { name, slug, account: input.account, ...(input.ownerName ? { ownerName: input.ownerName } : {}), ...(builtWith ? { builtWith } : {}), city, createdAt: t, cash: 0, week: 0, earned: 0, at: t, reports: 0,
      w0: { week: 0, cash: 0, won: 0 }, shifts: 0, won: 0, friends: 0, offices: 0, recent: [] };
    a.names[slug] = publicId;
    return publicId;
  }

  /**
   * An agent signs itself up (POST /mcp with no key, tool create_agent_account). The character is real and playable at once through the key; it is
   * marked AI-played and sits on the agent boards until a person claims it with the link. The caller has checked the per-address limits.
   */
  function createSelf(db: Db, input: { keyHash: string; claimHash: string; name: unknown; city: unknown; builtWith: unknown }) {
    const a = col(db), t = now(), day = dayOf(t);
    if (a.off) throw refusal(ctx, 403, 'agents_off', 'AI agent access is switched off for now.');
    if (a.createOff) throw refusal(ctx, 403, 'creation_off', 'New agent accounts are switched off for now. Try again later.');
    const cap = a.settings?.createCap ?? UNCLAIMED.createDailyCap;
    const created = a.created?.day === day ? a.created.n : 0;
    if (created >= cap) throw Object.assign(refusal(ctx, 429, 'creation_cap', 'Today\'s new agent accounts are all taken. Try again tomorrow.'), { retryAfter: 3600 });
    const publicId = makeCharacter(db, a, { name: input.name, city: input.city, builtWith: input.builtWith, account: '', unclaimed: true });
    a.created = { day, n: created + 1 };
    const id = `k${ctx.randomId().replaceAll('-', '').slice(0, 10)}`;
    a.keys[input.keyHash] = { id, account: '', mode: 'agent', publicId, name: a.chars[publicId]?.name ?? 'Agent', scopes: ['*'], unclaimed: true, createdAt: t, lastUsedAt: null, calls: 0, day, today: 0, refusals: 0, reports: 0, audit: [] };
    a.claims[input.claimHash] = { publicId, keyHash: input.keyHash, createdAt: t, expiresAt: t + UNCLAIMED.claimLinkMs };
    return { name: a.chars[publicId]?.name ?? '', publicId, expiresAt: t + UNCLAIMED.claimLinkMs };
  }

  /** What the claim page and get_claim_status may say about a claim token: nothing that identifies a person. */
  function claimStatus(db: Db, token: unknown) {
    const a = peek(db), claim = isClaimToken(token) && a ? own(a.claims, hashOfClaim(token)) : undefined;
    if (!a || !claim) return { status: 'unknown' as const };
    const char = own(a.chars, claim.publicId);
    const t = now();
    const live = ctx.core.sessionByPublicId(db, claim.publicId);
    const status = claim.claimedBy ? 'claimed' as const : claim.expiresAt <= t || !live ? 'expired' as const : 'unclaimed' as const;
    return { status, name: char?.name ?? null, builtWith: char?.builtWith ?? null, city: char?.city ?? null, createdAt: claim.createdAt, expiresAt: claim.expiresAt, page: char ? `/agents/${char.slug}` : null };
  }

  /** A signed-in player claims an agent character with its link: they own it from now on (it is in their list, they may revoke, rename or take it over). */
  function claim(db: Db, session: SessionRecord, token: unknown) {
    const account = accountFor(db, session);
    const a = col(db), found = isClaimToken(token) ? own(a.claims, hashOfClaim(token)) : undefined;
    if (!found) throw refusal(ctx, 404, 'unknown_claim', 'That claim link is not valid.');
    if (found.claimedBy) throw refusal(ctx, 409, 'already_claimed', 'That agent has already been claimed.');
    const live = ctx.core.sessionByPublicId(db, found.publicId), key = own(a.keys, found.keyHash), char = own(a.chars, found.publicId);
    if (found.expiresAt <= now() || !live || !key || !char) throw refusal(ctx, 410, 'claim_expired', 'That claim link has expired, or the agent is gone.');
    const owner = ownerOf(a, account.id);
    if (owner.keys.length >= AGENT_LIMITS.keysPerAccount) throw refusal(ctx, 409, 'too_many_keys', `You can hold ${AGENT_LIMITS.keysPerAccount} agent keys. Revoke one first.`);
    if (owner.chars.length >= AGENT_LIMITS.charactersPerAccount) throw refusal(ctx, 409, 'too_many_characters', `You can own ${AGENT_LIMITS.charactersPerAccount} agent characters. Remove one first.`);
    found.claimedBy = account.id; found.claimedAt = now();
    delete key.unclaimed; key.account = account.id;
    char.account = account.id; char.ownerName = session.name; char.claimedAt = now();
    live.agent = { char: true, owner: account.id };
    live.expiresAt = Math.max(live.expiresAt, now() + ctx.config.sessionTtlMs);
    owner.keys.push(found.keyHash); owner.chars.push(found.publicId);
    return { ok: true, code: 'claimed', name: char.name, keyId: key.id };
  }

  /** Rename a key, and (for an agent character's key) the character. */
  function rename(db: Db, session: SessionRecord, keyId: unknown, input: { name?: unknown; characterName?: unknown; builtWith?: unknown }) {
    const account = accountOfSession(db, session);
    if (!account) throw refusal(ctx, 403, 'account_required', 'Sign in to your account first.');
    const a = col(db), hash = ownerOf(a, account.id).keys.find((item) => a.keys[item]?.id === keyId), key = hash ? own(a.keys, hash) : undefined;
    if (!key) throw refusal(ctx, 404, 'unknown_key', 'That key is not yours, or it is already gone.');
    if (input.name !== undefined) key.name = cleanLabel(input.name, key.name);
    const char = own(a.chars, key.publicId);
    if (char && input.characterName !== undefined) {
      const name = validateName(input.characterName), slug = slugOf(name);
      if (slug !== char.slug && Object.hasOwn(a.names, slug)) throw refusal(ctx, 409, 'name_taken', 'An agent already has that name. Choose another.');
      delete a.names[char.slug]; a.names[slug] = key.publicId;
      char.name = name; char.slug = slug;
      const stored = ctx.core.sessionByPublicId(db, key.publicId);
      if (stored) stored.name = name;
    }
    if (char && input.builtWith !== undefined) { const label = builtWithOf(input.builtWith); if (label) char.builtWith = label; else delete char.builtWith; }
    return { ok: true, code: 'renamed', name: key.name, character: char?.name ?? null };
  }

  /**
   * The owner takes a claimed agent character over as their own player character: the permanent mark goes, the account's own-character rules apply
   * (the one they were playing is set aside, nothing is deleted), and the agent's key keeps working as an own-character key.
   */
  function takeOver(db: Db, request: RouteRequest, session: SessionRecord, publicId: unknown) {
    const account = accountOfSession(db, session);
    if (!account) throw refusal(ctx, 403, 'account_required', 'Sign in to your account first.');
    const a = col(db), owner = ownerOf(a, account.id);
    if (typeof publicId !== 'string' || !owner.chars.includes(publicId)) throw refusal(ctx, 404, 'unknown_character', 'That agent character is not yours.');
    const record = ctx.core.sessionByPublicId(db, publicId), char = own(a.chars, publicId);
    if (!record || !char || !ctx.checks?.takeOver) throw refusal(ctx, 409, 'character_unavailable', 'That character cannot be taken over right now.');
    const after = ctx.checks.takeOver(db, request, record);
    delete record.agent;
    for (const hash of owner.keys) { const key = own(a.keys, hash); if (key && key.publicId === publicId) key.mode = 'own'; }
    owner.chars = owner.chars.filter((item) => item !== publicId);
    delete a.names[char.slug]; delete a.chars[publicId];
    ctx.checks.agentClear?.(db, publicId);
    return { after, name: record.name };
  }

  function revoke(db: Db, session: SessionRecord, keyId: unknown) {
    const account = accountOfSession(db, session);
    if (!account) throw refusal(ctx, 403, 'account_required', 'Sign in to your account first.');
    const a = col(db), owner = ownerOf(a, account.id);
    const hash = owner.keys.find((item) => a.keys[item]?.id === keyId);
    if (!hash) throw refusal(ctx, 404, 'unknown_key', 'That key is not yours, or it is already gone.');
    delete a.keys[hash];
    owner.keys = owner.keys.filter((item) => item !== hash);
    return { ok: true, code: 'revoked' };
  }

  /** Remove an agent character: its keys end, its life is kept in the archive (a lived life is never destroyed). */
  function removeCharacter(db: Db, session: SessionRecord, publicId: unknown) {
    const account = accountOfSession(db, session);
    if (!account) throw refusal(ctx, 403, 'account_required', 'Sign in to your account first.');
    const a = col(db), owner = ownerOf(a, account.id);
    if (typeof publicId !== 'string' || !owner.chars.includes(publicId)) throw refusal(ctx, 404, 'unknown_character', 'That agent character is not yours, or it is already gone.');
    for (const hash of owner.keys.filter((item) => a.keys[item]?.publicId === publicId)) delete a.keys[hash];
    owner.keys = owner.keys.filter((item) => a.keys[item] !== undefined);
    owner.chars = owner.chars.filter((item) => item !== publicId);
    const gone = a.chars[publicId];
    if (gone) delete a.names[gone.slug];
    delete a.chars[publicId];
    const stored = ctx.core.sessionByPublicId(db, publicId);
    if (stored && stored.agent?.char === true && stored.agent.owner === account.id) ctx.core.archiveSession(db, stored.secret, stored);
    return { ok: true, code: 'removed' };
  }

  /** The key behind a request and the life it plays, or a refusal in words. Read-only: nothing is counted or renewed. */
  function authenticate(db: Db, hash: string): Agent {
    if (switchedOff(db)) throw refusal(ctx, 403, 'agents_off', 'AI agent access is switched off for now. Nothing is wrong with your key.');
    const a = peek(db), key = a ? own(a.keys, hash) : undefined;
    if (!a || !key) throw refusal(ctx, 401, 'invalid_key', 'This key is not valid (it may have been revoked). Make a new one in Settings, AI agents.');
    if (key.suspended) throw refusal(ctx, 403, 'key_suspended', key.suspended.reason === 'refusals'
      ? 'This key was suspended because it kept trying things the game refuses. Revoke it in Settings and make a new one when the agent is fixed.'
      : key.suspended.reason === 'reports' ? 'This key was suspended after players reported the character it plays. Contact support from Settings.' : 'This key was suspended by an operator.');
    const account = key.unclaimed ? undefined : own(db.accounts, key.account);
    if (!key.unclaimed && !account) throw refusal(ctx, 401, 'invalid_key', 'The account behind this key is gone.');
    let session: SessionRecord | undefined;
    if (key.mode === 'own' && account) {
      const found = account.sessionKey ? own(db.sessions, account.sessionKey) : undefined;
      if (found && found.publicId !== key.publicId) throw refusal(ctx, 409, 'character_changed', 'The account now plays a different character than when this key was made. Make a new key in Settings.');
      session = found;
    } else {
      const found = ctx.core.sessionByPublicId(db, key.publicId);
      if (found && !(found.agent?.char === true && (key.unclaimed ? found.agent.unclaimed === true : found.agent.owner === account?.id))) throw refusal(ctx, 401, 'invalid_key', 'This key no longer matches its character.');
      session = found;
    }
    if (!session || !(session.expiresAt > now())) throw refusal(ctx, 409, 'character_unavailable', key.mode === 'own' ? 'Your character has been away too long. Open the game once, then try again.' : 'This agent character has expired. Remove it in Settings and make a new one.');
    const banned = ctx.checks?.banned?.(session.publicId, session.account ?? (key.account || undefined));
    if (banned) throw refusal(ctx, 403, 'account_banned', 'This character is not allowed to play right now.');
    // The city the character is in now: its pinned city once it has a life there, else the city it was made for (an agent character before its first call).
    const pinned = session.character?.city, made = ctx.cityIds.find((id) => id === pinned);
    const cityId = characterCity(session) ?? made ?? ctx.cityIds.find((id) => session.cities[id]) ?? ctx.cityIds[0];
    if (!cityId) throw refusal(ctx, 503, 'city_unavailable', 'No city is open right now.');
    return { hash, key, session, cityId, character: key.mode === 'agent', ...(a.settings?.ceiling !== undefined ? { ceiling: a.settings.ceiling } : {}) };
  }

  /**
   * The one per-key ceiling, a runaway guard (AGENT_LIMITS.callsPerDay, or the number an operator set without a release). Everything else an
   * agent meets is what a person meets: the host's per-session request limit and the game's own rules, costs, cooldowns and chat limits.
   */
  function admit(agent: Agent): void {
    const { key } = agent, today = dayOf(now());
    if (key.day === today && key.today >= (agent.ceiling ?? AGENT_LIMITS.callsPerDay)) throw refusal(ctx, 429, 'daily_cap', `This key has used its ${agent.ceiling ?? AGENT_LIMITS.callsPerDay} calls for today (a safety ceiling against a runaway loop). It starts again at midnight UTC.`);
  }

  /** The league figures that come from shared records: friends made and games won (the tables' ratings). Best effort: a missing record is zero. */
  function peopleFacts(db: Db, publicId: string): { friends: number; won: number } {
    const social = db.social as unknown as { players?: Record<string, { friends?: Record<string, number> } | undefined> } | undefined;
    const growth = db.growth as unknown as { tables?: { ratings?: Record<string, Record<string, { won?: number }>>; cities?: Record<string, { ratings?: Record<string, Record<string, { won?: number }>> }> } } | undefined;
    let won = 0;
    const add = (ratings: Record<string, Record<string, { won?: number }>> | undefined): void => { for (const game of Object.values(ratings?.[publicId] ?? {})) won += game.won ?? 0; };
    add(growth?.tables?.ratings);
    for (const city of Object.values(growth?.tables?.cities ?? {})) add(city?.ratings);
    return { friends: Object.keys(social?.players?.[publicId]?.friends ?? {}).length, won };
  }
  /** City seats held now, by public id (state and national seats are not counted yet). */
  function holders(db: Db): Set<string> {
    const civic = db.civic as unknown as { cities?: Record<string, { gov?: { governor?: { id?: string } | null } } | undefined> } | undefined;
    const found = new Set<string>();
    for (const id of ctx.cityIds) { const holder = civic?.cities?.[id]?.gov?.governor?.id; if (typeof holder === 'string') found.add(holder); }
    return found;
  }

  /** Where an agent's character stands for everyone there, or null when it is at home, on the street, travelling or not in a public venue. */
  function presenceFor(session: SessionRecord, state: LifeState | undefined, cityId: CityId, t: number) {
    if (!state || state.location === 'home' || state.location === 'neighbourhood' || state.location === 'unilag' || state.activeAction?.kind === 'travel') return null;
    const base = initialVenuePosition(state.location);
    let h = 2166136261;
    for (const ch of `${session.publicId}|${state.spot ?? ''}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const x = Math.max(-18, Math.min(18, base.x + ((h >>> 0) % 9 - 4) * 0.9)), z = Math.max(-18, Math.min(18, base.z + (((h >>> 8) >>> 0) % 9 - 4) * 0.9));
    const active = state.activeAction;
    const doing = active?.kind === 'activity' ? findActivity(active.id, cityId)?.def.label ?? 'busy' : null;
    return { id: session.publicId, name: session.name, mark: agentMark(session.agent), room: venueRoomKey(cityId, state.location, session.publicId), position: { x, z }, doing, look: checkLook(state.onboarding?.look).look ?? null, until: t + AGENT_LIMITS.presenceMs };
  }

  function record(db: Db, agent: Agent, outcome: AgentOutcome): { announce: SessionRecord | null; presence: ReturnType<typeof presenceFor> } {
    const a = peek(db), key = a ? own(a.keys, agent.hash) : undefined;
    if (!a || !key) return { announce: null, presence: null };
    let announce: SessionRecord | null = null;
    const t = now(), today = dayOf(t);
    if (key.day !== today) { key.day = today; key.today = 0; }
    key.today += 1; key.calls += 1; key.lastUsedAt = t;
    key.refusals = outcome.refused ? key.refusals + 1 : 0;
    if (key.refusals >= AGENT_LIMITS.refusalsToSuspend) key.suspended = { at: t, reason: 'refusals' };
    const entry: AuditEntry = { at: t, tool: outcome.tool, ok: outcome.ok, code: outcome.code.slice(0, 40), ...(outcome.rid ? { rid: outcome.rid } : {}), ...(outcome.aid ? { aid: outcome.aid } : {}) };
    key.audit = [...key.audit.slice(-(AGENT_LIMITS.auditEntries - 1)), entry];
    const session = own(db.sessions, agent.session.secret);
    if (session) {
      // The mark other players see: a character an agent acted for lately says so, and an own character played by an agent this Lagos week
      // is ranked on the agents boards that week, with everything it earned (server/civic/residents.ts).
      const before = session.agent?.at;
      session.agent = { ...session.agent, at: t, ...(key.mode === 'own' ? { week: lagosTime(t).week } : {}) };
      // A player's own character that was not marked a moment ago is marked now: the sockets it has open are told once the change is saved.
      if (key.mode === 'own' && (before === undefined || t - before >= AGENT_LIMITS.activeWindowMs)) announce = session;
    }
    const char = own(a.chars, agent.key.publicId);
    if (char) {
      char.at = t;
      const f = outcome.facts ? { ...outcome.facts, ...peopleFacts(db, agent.key.publicId) } : undefined;
      if (f) {
        const week = lagosTime(t).week;
        if (char.w0.week !== week) char.w0 = { week, cash: f.cash, won: f.won };
        char.cash = f.cash; char.week = f.week; char.earned = f.earned; char.shifts = f.shifts; char.won = f.won; char.friends = f.friends; char.offices = f.offices;
      }
      if (outcome.say) char.recent = [...char.recent.slice(-4), { at: t, text: outcome.say.slice(0, 120) }];
    }
    // The mark in the player's social record (what chat and the lists read). A character that has not arrived in the world yet has none to mark.
    if (session) { try { ctx.checks?.agentActive?.(db, session, t, key.mode === 'agent'); } catch { /* not registered as a player yet */ } }
    return { announce, presence: session ? presenceFor(session, session.cities?.[agent.cityId]?.state, agent.cityId, t) : null };
  }

  /** Players reported the character an agent plays: enough reports suspend its keys. Called by the report paths. */
  function reported(db: Db, aboutId: string): void {
    const session = ctx.core.sessionByPublicId(db, aboutId);
    const a = peek(db);
    if (!a || !session?.agent) return;
    const char = own(a.chars, aboutId);
    const owner = char?.account ?? (session.account !== undefined ? session.account : undefined);
    if (!owner) return;
    const keys = (own(a.owners, owner)?.keys ?? []).flatMap((hash) => { const key = own(a.keys, hash); return key && key.publicId === aboutId ? [key] : []; });
    if (char) char.reports += 1;
    for (const key of keys) { key.reports += 1; if (key.reports >= AGENT_LIMITS.reportsToSuspend && !key.suspended) key.suspended = { at: now(), reason: 'reports' }; }
  }

  /** The last calls of one of the owner's keys: what the owner can check an agent did. Bounded. */
  function auditOf(db: Db, session: SessionRecord, keyId: unknown) {
    const account = accountOfSession(db, session), a = peek(db);
    const hash = account && a ? own(a.owners, account.id)?.keys.find((item) => a.keys[item]?.id === keyId) : undefined;
    const key = hash && a ? own(a.keys, hash) : undefined;
    if (!key) throw refusal(ctx, 404, 'unknown_key', 'That key is not yours, or it is already gone.');
    return { id: key.id, calls: key.calls, today: key.day === dayOf(now()) ? key.today : 0, lastUsedAt: key.lastUsedAt, ...(key.suspended ? { suspended: key.suspended } : {}), recent: key.audit.map((entry) => ({ at: entry.at, tool: entry.tool, ok: entry.ok, code: entry.code })) };
  }

  /**
   * THE AGENT LEAGUE. Every agent character, claimed or not, is ranked on a composite whose parts are all in the columns:
   *   score = cash gained this Lagos week (balance now minus the balance when the week began, never below 0)
   *         + 1,000 for each office held now + 200 for each game won this week.
   * `weekly` ranks by this week's score; `allTime` by the balance. Ties go to the older agent.
   */
  function league(db: Db, which: 'weekly' | 'allTime' = 'weekly') {
    const a = peek(db), week = lagosTime(now()).week, seats = holders(db);
    const rows = Object.entries(a?.chars ?? {}).map(([id, c0]) => {
      const c = { ...c0, offices: seats.has(id) ? 1 : 0 };
      const gained = c.w0.week === week ? Math.max(0, c.cash - c.w0.cash) : 0, wonWeek = c.w0.week === week ? Math.max(0, c.won - c.w0.won) : 0;
      return { id, name: c.name, slug: c.slug, builtWith: c.builtWith ?? null, owner: c.ownerName ?? null, claimed: c.account !== '', city: c.city, cash: c.cash, gained, earned: c.week === week ? c.earned : 0, shifts: c.shifts, gamesWon: wonWeek, offices: c.offices, friends: c.friends,
        score: gained + 1000 * c.offices + 200 * wonWeek, createdAt: c.createdAt };
    }).sort((x, y) => (which === 'weekly' ? y.score - x.score : y.cash - x.cash) || x.createdAt - y.createdAt || (x.name < y.name ? -1 : 1)).slice(0, AGENT_LIMITS.boardRows * 5);
    return { week, which, rows: rows.map(({ id: _id, createdAt: _c, ...row }, i) => ({ rank: i + 1, ...row })) };
  }
  /** One agent's public page data: its figures, its recent public activity and whether it can still be claimed. Nothing private. */
  function profile(db: Db, slug: string) {
    const a = peek(db), id = a && /^[a-z0-9-]{1,40}$/.test(slug) ? a.names[slug] : undefined;
    const c = a && typeof id === 'string' ? own(a.chars, id) : undefined;
    if (!a || !c) return null;
    const rank = league(db).rows.find((row) => row.slug === slug)?.rank ?? null;
    return { name: c.name, slug: c.slug, builtWith: c.builtWith ?? null, owner: c.ownerName ?? null, claimed: c.account !== '', city: c.city, since: c.createdAt, rank, cash: c.cash, earned: c.week === lagosTime(now()).week ? c.earned : 0, shifts: c.shifts, friends: c.friends, offices: c.offices, gamesWon: c.won, recent: c.recent };
  }

  /** The operator's overview and switches. Counts only: no key, no hash, no player. */
  function overview(db: Db) {
    const a = peek(db);
    const keys = Object.values(a?.keys ?? {});
    return { off: Boolean(a?.off), createOff: Boolean(a?.createOff), keys: keys.length, unclaimed: keys.filter((key) => key.unclaimed).length, suspended: keys.filter((key) => key.suspended).length, characters: Object.keys(a?.chars ?? {}).length,
      callsToday: keys.reduce((sum, key) => sum + (key.day === dayOf(now()) ? key.today : 0), 0), createdToday: a?.created?.day === dayOf(now()) ? a.created.n : 0,
      ceiling: a?.settings?.ceiling ?? AGENT_LIMITS.callsPerDay, createCap: a?.settings?.createCap ?? UNCLAIMED.createDailyCap };
  }
  function setSwitch(db: Db, input: { off?: unknown; createOff?: unknown }) {
    const a = col(db);
    if (input.off !== undefined) { if (typeof input.off !== 'boolean') throw ctx.fail(400, 'invalid_switch'); if (input.off) a.off = { at: now() }; else delete a.off; }
    if (input.createOff !== undefined) { if (typeof input.createOff !== 'boolean') throw ctx.fail(400, 'invalid_switch'); if (input.createOff) a.createOff = { at: now() }; else delete a.createOff; }
    return overview(db);
  }
  /** The operator's numbers, changed without a release: the per-key ceiling and the day's cap on new self-made agent accounts. */
  function setSettings(db: Db, input: { ceiling?: unknown; createCap?: unknown }) {
    const a = col(db), settings = (a.settings ??= {});
    for (const [name, value] of [['ceiling', input.ceiling], ['createCap', input.createCap]] as const) {
      if (value === undefined) continue;
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 10000000) throw ctx.fail(400, 'invalid_setting');
      settings[name] = value;
    }
    return overview(db);
  }
  /** Take every key of one account (the account is being deleted). */
  const eraseAccount = (db: Db, accountId: string): void => eraseAgents(db, accountId, (d, id) => ctx.core.sessionByPublicId(d, id), (d, secret, session) => ctx.core.archiveSession(d, secret, session));
  const isPublicId = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value);

  return { col, peek, switchedOff, view, createKey, createSelf, claimStatus, claim, rename, takeOver, revoke, removeCharacter, authenticate, admit, record, presenceFor, reported, auditOf, league, profile, overview, setSwitch, setSettings, eraseAccount, isPublicId };
}
export type AgentService = ReturnType<typeof agentService>;
