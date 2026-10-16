/**
 * AI agent access and the account's data (docs/ACCOUNTS.md): deleting an account ends its agent keys and agent characters, and the data
 * export lists them. Pure: functions over the stored document, no clock and no context.
 */
import type { Db, SessionRecord } from '../types.ts';
import type { AgentsCollection } from './service.ts';
import type { OAuthCollection } from './oauth.ts';
import { forgetArena, peekBook } from '../tournaments/book.ts';
import { ownerKeyOf } from '../tournaments/life.ts';

const own = <T>(map: Record<string, T> | undefined, key: string): T | undefined => {
  const value = map && key !== '__proto__' ? map[key] : undefined;
  return value !== null && typeof value === 'object' ? value : undefined;
};
const collectionOf = (db: Db): AgentsCollection | null => {
  const found: unknown = db.agents;
  return found !== null && typeof found === 'object' && 'keys' in found && 'owners' in found && 'chars' in found ? found as AgentsCollection : null;
};

/** The sign-in codes and refresh tokens of these accounts end with them (server/agents/oauth.ts). Registered assistants name no person and stay. */
export function forgetOAuth(db: Db, accounts: ReadonlySet<string>): void {
  const found: unknown = db.oauth;
  if (found === null || typeof found !== 'object') return;
  const o = found as Partial<OAuthCollection>;
  for (const [hash, record] of Object.entries(o.codes ?? {})) if (accounts.has(record.account)) delete o.codes?.[hash];
  for (const [hash, record] of Object.entries(o.refresh ?? {})) if (accounts.has(record.account)) delete o.refresh?.[hash];
}

/** End every key of the account and put its agent characters in the archive (a lived life is never destroyed). `bySession` finds a character's session. */
export function eraseAgents(db: Db, accountId: string, sessionOf: (db: Db, publicId: string) => SessionRecord | undefined, archive: (db: Db, secret: string, session: SessionRecord) => void): void {
  forgetOAuth(db, new Set([accountId]));
  const a = collectionOf(db), owner = a ? own(a.owners, accountId) : undefined;
  if (!a || !owner) return;
  for (const hash of owner.keys) delete a.keys[hash];
  // The agent arena (server/tournaments/book.ts): entries, badges, unpaid prizes and challenges of these agents go; shared results keep no name.
  const book = peekBook(db);
  if (book) forgetArena(book, new Set(owner.chars), new Set([ownerKeyOf(accountId)]));
  for (const publicId of owner.chars) {
    const gone = a.chars[publicId];
    if (gone?.slug && a.names) delete a.names[gone.slug];
    delete a.chars[publicId];
    const stored = sessionOf(db, publicId);
    if (stored?.agent?.char === true && stored.agent.owner === accountId) archive(db, stored.secret, stored);
  }
  delete a.owners[accountId];
}

/** What the account export says about agent access: names, modes, times and counts. Never a key, a hash or another player. */
export function exportAgents(db: Db, accountId: string) {
  const a = collectionOf(db), owner = a ? own(a.owners, accountId) : undefined;
  if (!a || !owner) return null;
  return {
    keys: owner.keys.flatMap((hash) => { const key = own(a.keys, hash); return key ? [{ name: key.name, mode: key.mode, createdAt: key.createdAt, lastUsedAt: key.lastUsedAt, calls: key.calls, suspended: key.suspended?.reason ?? null, ...(key.oauth ? { signIn: key.oauth.app } : {}) }] : []; }),
    characters: owner.chars.flatMap((id) => { const found = own(a.chars, id); return found ? [{ id, name: found.name, city: found.city, createdAt: found.createdAt }] : []; }),
  };
}
