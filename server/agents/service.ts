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
import { atLeast, tierRank } from '../../src/game/trust/index.ts';
import { UUID_PATTERN, validateName } from '../protocol.ts';
import { accountOfSession } from '../admin/gate.ts';
import { characterCity } from '../character.ts';
import { trustService } from '../trust/service.ts';
import { eraseAgents } from './privacy.ts';
import { AGENT_ACCOUNT_MIN_AGE_MS, AGENT_CHARACTER_MIN_TIER, AGENT_LIMITS, DEFAULT_AGENT_SCOPES } from './policy.ts';
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
  scopes: string[]
  createdAt: number
  lastUsedAt: number | null
  calls: number
  /** UTC day of `today`. */
  day: number
  today: number
  msgDay: number
  msgToday: number
  /** Game refusals in a row. */
  refusals: number
  reports: number
  suspended?: { at: number; reason: 'refusals' | 'reports' | 'operator' }
  audit: AuditEntry[]
}
/** What an agent call changed, written once after the call: counters, audit, the AI-played mark, the character's board line. */
export interface AgentOutcome { tool: string; ok: boolean; code: string; rid?: string; aid?: string; sent?: boolean; refused?: boolean; facts?: { cash: number; earned: number; week: number } }
export interface AgentOwner { keys: string[]; chars: string[] }
export interface AgentCharacter { name: string; account: string; city: string; createdAt: number; cash: number; week: number; earned: number; at: number; reports: number }
export interface AgentsCollection { v: 1; off?: { at: number }; keys: Record<string, AgentKey>; owners: Record<string, AgentOwner>; chars: Record<string, AgentCharacter> }

/** A refusal the endpoint turns into a plain sentence for the agent (or the owner). */
export const refusal = (ctx: Pick<RouteContext, 'fail'>, status: number, code: string, reason: string): Error => Object.assign(ctx.fail(status, code), { reason });

const KEY_PREFIX = 'awk_';
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
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
/** The key in an Authorization header, or null. The shape is checked so that no other bearer token is ever hashed or looked up. */
export function bearerKey(header: string | null | undefined): string | null {
  const match = /^Bearer (awk_[A-Za-z0-9_-]{43})$/.exec(header ?? '');
  return match?.[1] ?? null;
}

export interface Agent { hash: string; key: AgentKey; session: SessionRecord; cityId: CityId; character: boolean }

export function agentService(ctx: RouteContext) {
  const now = (): number => ctx.now();
  const trust = trustService(ctx);

  /** The collection for a write, created and repaired in place. */
  function col(db: Db): AgentsCollection {
    const found = ctx.collection(db, 'agents', { v: 1, keys: {}, owners: {}, chars: {} }) as Partial<AgentsCollection>;
    if (!record(found.keys)) found.keys = {};
    if (!record(found.owners)) found.owners = {};
    if (!record(found.chars)) found.chars = {};
    found.v = 1;
    return found as AgentsCollection;
  }
  /** The collection as a read sees it: nothing is created. */
  const peek = (db: Db): AgentsCollection | null => {
    const found: unknown = db.agents;
    return record(found) && record(found.keys) && record(found.owners) && record(found.chars) ? found as unknown as AgentsCollection : null;
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
  function createKey(db: Db, session: SessionRecord, input: { hash: string; mode: unknown; name: unknown; characterName?: unknown; character?: unknown; city?: unknown }) {
    const account = accountFor(db, session);
    const a = col(db), owner = ownerOf(a, account.id);
    if (input.mode !== 'own' && input.mode !== 'agent') throw refusal(ctx, 400, 'invalid_mode', 'Choose "my character" or "a new agent character".');
    const mode: AgentMode = input.mode;
    if (owner.keys.length >= AGENT_LIMITS.keysPerAccount) throw refusal(ctx, 409, 'too_many_keys', `You can hold ${AGENT_LIMITS.keysPerAccount} agent keys. Revoke one first.`);
    if (!/^[0-9a-f]{64}$/.test(input.hash) || Object.hasOwn(a.keys, input.hash)) throw refusal(ctx, 400, 'invalid_key', 'That key could not be made. Try again.');
    let publicId: string;
    let city: CityId | null = null;
    if (mode === 'own') {
      if (!account.sessionKey || !account.publicId || !db.sessions[account.sessionKey]) throw refusal(ctx, 409, 'no_character', 'Start your character first; the agent plays the character you have.');
      publicId = account.publicId;
    } else {
      const tier = trust.tierOf(db, session);
      if (!atLeast(tier, AGENT_CHARACTER_MIN_TIER)) throw refusal(ctx, 403, 'verification_required', `An agent character is an extra life in the world, so it needs an account with a checked ${AGENT_CHARACTER_MIN_TIER === 'phone' ? 'phone number' : 'identity'} (yours is ${tierRank(tier) >= 1 ? 'a plain account' : 'a guest'}). You can still connect an agent to your own character.`);
      const existing = typeof input.character === 'string' ? input.character : null;
      if (existing !== null) {
        const found = own(a.chars, existing);
        if (!found || found.account !== account.id || !owner.chars.includes(existing)) throw refusal(ctx, 404, 'unknown_character', 'That agent character is not yours.');
        if (owner.keys.some((hash) => a.keys[hash]?.publicId === existing)) throw refusal(ctx, 409, 'character_has_key', 'That agent character already has a key.');
        publicId = existing;
      } else {
        if (owner.chars.length >= AGENT_LIMITS.charactersPerAccount) throw refusal(ctx, 409, 'too_many_characters', `You can own ${AGENT_LIMITS.charactersPerAccount} agent characters. Remove one first.`);
        const name = validateName(input.characterName);
        city = ctx.cityIds.find((id) => id === (input.city ?? 'lagos')) ?? null;
        if (!city) throw refusal(ctx, 400, 'invalid_city', 'Choose an open city for the agent character.');
        const { secret, publicId: id } = ctx.core.newIdentity();
        // An ordinary life of its own: no account, no browser holds its secret, no onboarding hold. It is marked as agent-played for good.
        db.sessions[secret] = { secret, publicId: id, name, expiresAt: now() + ctx.config.sessionTtlMs, cities: {}, actions: {}, character: { v: 2, city }, agent: { char: true, owner: account.id } };
        a.chars[id] = { name, account: account.id, city, createdAt: now(), cash: 0, week: 0, earned: 0, at: now(), reports: 0 };
        owner.chars.push(id);
        publicId = id;
      }
    }
    const id = `k${ctx.randomId().replaceAll('-', '').slice(0, 10)}`;
    const key: AgentKey = { id, account: account.id, mode, publicId, name: cleanLabel(input.name, mode === 'own' ? 'My character' : 'Agent'), scopes: [...DEFAULT_AGENT_SCOPES], createdAt: now(), lastUsedAt: null, calls: 0,
      day: dayOf(now()), today: 0, msgDay: dayOf(now()), msgToday: 0, refusals: 0, reports: 0, audit: [] };
    a.keys[input.hash] = key;
    owner.keys.push(input.hash);
    return { id, name: key.name, mode, character: mode === 'agent' ? a.chars[publicId]?.name ?? null : null };
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
    const account = own(db.accounts, key.account);
    if (!account) throw refusal(ctx, 401, 'invalid_key', 'The account behind this key is gone.');
    let session: SessionRecord | undefined;
    if (key.mode === 'own') {
      const found = account.sessionKey ? own(db.sessions, account.sessionKey) : undefined;
      if (found && found.publicId !== key.publicId) throw refusal(ctx, 409, 'character_changed', 'The account now plays a different character than when this key was made. Make a new key in Settings.');
      session = found;
    } else {
      const found = ctx.core.sessionByPublicId(db, key.publicId);
      if (found && !(found.agent?.char === true && found.agent.owner === account.id)) throw refusal(ctx, 401, 'invalid_key', 'This key no longer matches its character.');
      session = found;
    }
    if (!session || !(session.expiresAt > now())) throw refusal(ctx, 409, 'character_unavailable', key.mode === 'own' ? 'Your character has been away too long. Open the game once, then try again.' : 'This agent character has expired. Remove it in Settings and make a new one.');
    const banned = ctx.checks?.banned?.(session.publicId, session.account ?? key.account);
    if (banned) throw refusal(ctx, 403, 'account_banned', 'This character is not allowed to play right now.');
    // The city the character is in now: its pinned city once it has a life there, else the city it was made for (an agent character before its first call).
    const pinned = session.character?.city, made = ctx.cityIds.find((id) => id === pinned);
    const cityId = characterCity(session) ?? made ?? ctx.cityIds.find((id) => session.cities[id]) ?? ctx.cityIds[0];
    if (!cityId) throw refusal(ctx, 503, 'city_unavailable', 'No city is open right now.');
    return { hash, key, session, cityId, character: key.mode === 'agent' };
  }

  /**
   * The per-key limits, checked before a tool runs: a minute (in memory, shared by every request to this host) and a day (stored with the
   * key). A call over either is refused in words and costs the game nothing. A call that gets through is counted by `record`.
   */
  function admit(agent: Agent, { message = false }: { message?: boolean } = {}): void {
    const { key } = agent, today = dayOf(now());
    if (!ctx.allow(`agent:min:${key.id}`, AGENT_LIMITS.callsPerMinute, 60000)) throw Object.assign(refusal(ctx, 429, 'rate_limited', `That is more than ${AGENT_LIMITS.callsPerMinute} calls a minute. Wait a little and carry on.`), { retryAfter: 30 });
    if (key.day === today && key.today >= AGENT_LIMITS.callsPerDay) throw refusal(ctx, 429, 'daily_cap', `This key has used its ${AGENT_LIMITS.callsPerDay} calls for today. It starts again at midnight UTC.`);
    if (message) {
      if (!ctx.allow(`agent:msg:${key.id}`, AGENT_LIMITS.messagesPerMinute, 60000)) throw refusal(ctx, 429, 'rate_limited', 'You are messaging too fast for an agent. Wait a minute.');
      if (key.msgDay === today && key.msgToday >= AGENT_LIMITS.messagesPerDay) throw refusal(ctx, 429, 'message_cap', `Agents may send ${AGENT_LIMITS.messagesPerDay} messages a day. Try again tomorrow.`);
    }
  }

  function record(db: Db, agent: Agent, outcome: AgentOutcome): { announce: SessionRecord | null } {
    const a = peek(db), key = a ? own(a.keys, agent.hash) : undefined;
    if (!a || !key) return { announce: null };
    let announce: SessionRecord | null = null;
    const t = now(), today = dayOf(t);
    if (key.day !== today) { key.day = today; key.today = 0; }
    if (key.msgDay !== today) { key.msgDay = today; key.msgToday = 0; }
    key.today += 1; key.calls += 1; key.lastUsedAt = t;
    if (outcome.sent) key.msgToday += 1;
    key.refusals = outcome.refused ? key.refusals + 1 : 0;
    if (key.refusals >= AGENT_LIMITS.refusalsToSuspend) key.suspended = { at: t, reason: 'refusals' };
    const entry: AuditEntry = { at: t, tool: outcome.tool, ok: outcome.ok, code: outcome.code.slice(0, 40), ...(outcome.rid ? { rid: outcome.rid } : {}), ...(outcome.aid ? { aid: outcome.aid } : {}) };
    key.audit = [...key.audit.slice(-(AGENT_LIMITS.auditEntries - 1)), entry];
    const session = own(db.sessions, agent.session.secret);
    if (session) {
      // The mark other players see: a character an agent acted for lately says so, and an own character played by an agent this Lagos week
      // is left out of that week's rankings (server/civic/residents.ts).
      const before = session.agent?.at;
      session.agent = { ...session.agent, at: t, ...(key.mode === 'own' ? { week: lagosTime(t).week } : {}) };
      // A player's own character that was not marked a moment ago is marked now: the sockets it has open are told once the change is saved.
      if (key.mode === 'own' && (before === undefined || t - before >= AGENT_LIMITS.activeWindowMs)) announce = session;
    }
    const char = own(a.chars, agent.key.publicId);
    if (char && outcome.facts) { char.cash = outcome.facts.cash; char.week = outcome.facts.week; char.earned = outcome.facts.earned; char.at = t; }
    // The mark in the player's social record (what chat and the lists read). A character that has not arrived in the world yet has none to mark.
    if (session) { try { ctx.checks?.agentActive?.(db, session, t, key.mode === 'agent'); } catch { /* not registered as a player yet */ } }
    return { announce };
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

  /** The agents board: agent characters only, this Lagos week, best first. They are on no other board. */
  function board(db: Db) {
    const a = peek(db), week = lagosTime(now()).week;
    const rows = Object.values(a?.chars ?? {}).map((item) => ({ name: item.name, city: item.city, cash: item.cash, earned: item.week === week ? item.earned : 0 }))
      .sort((x, y) => y.earned - x.earned || y.cash - x.cash || (x.name < y.name ? -1 : 1)).slice(0, AGENT_LIMITS.boardRows);
    return { week, rows: rows.map((row, i) => ({ rank: i + 1, ...row })), note: 'Characters played by AI agents. They are not on the player rankings.' };
  }

  /** The operator's overview and switch. Counts only: no key, no hash, no player. */
  function overview(db: Db) {
    const a = peek(db);
    const keys = Object.values(a?.keys ?? {});
    return { off: Boolean(a?.off), keys: keys.length, suspended: keys.filter((key) => key.suspended).length, characters: Object.keys(a?.chars ?? {}).length, callsToday: keys.reduce((sum, key) => sum + (key.day === dayOf(now()) ? key.today : 0), 0) };
  }
  function setSwitch(db: Db, off: unknown) {
    if (typeof off !== 'boolean') throw ctx.fail(400, 'invalid_switch');
    const a = col(db);
    if (off) a.off = { at: now() }; else delete a.off;
    return overview(db);
  }
  /** Take every key of one account (the account is being deleted). */
  const eraseAccount = (db: Db, accountId: string): void => eraseAgents(db, accountId, (d, id) => ctx.core.sessionByPublicId(d, id), (d, secret, session) => ctx.core.archiveSession(d, secret, session));
  const isPublicId = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value);

  return { col, peek, switchedOff, view, createKey, revoke, removeCharacter, authenticate, admit, record, reported, auditOf, board, overview, setSwitch, eraseAccount, isPublicId };
}
export type AgentService = ReturnType<typeof agentService>;
