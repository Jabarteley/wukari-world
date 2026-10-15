/**
 * OWNER: world
 * LEGACY, THE STORED COLLECTION (docs/LEGACY.md section 7): `legacy = { v: 1, seq, offers, done, people }`, created by the first hand-over. Types and a
 * read that repairs what it finds and writes nothing. Kept apart so the accounts module can erase and export it without loading the service.
 * Portable: no Node imports.
 */
import type { Manifest, Kind } from './move.ts';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const empty = (): LegacyCollection => ({ v: 1, seq: 0, offers: {}, done: [], people: {} });

export interface Offer { id: string; from: string; fromName: string; to: string; toName: string; at: number; expires: number; manifest: Manifest; worth: number }
export interface Done { n: number; id: string; kind: Kind; result: 'passed' | 'accepted' | 'declined' | 'cancelled' | 'expired' | 'void'; at: number; from: string; to: string }
export interface Person { out?: number; in?: number; worth?: number }
export interface LegacyCollection { v: 1; seq: number; offers: Record<string, Offer>; done: Done[]; people: Record<string, Person> }
/** The collection as stored, repaired field by field; a fresh one when there is none. Writes nothing. */
export function peekLegacy(db: unknown): LegacyCollection {
  const found = record(db) ? db.legacy : undefined;
  if (!record(found) || found.v !== 1) return empty();
  const out = empty();
  if (Number.isSafeInteger(found.seq)) out.seq = found.seq as number;
  if (record(found.offers)) out.offers = found.offers as Record<string, Offer>;
  if (Array.isArray(found.done)) out.done = found.done as Done[];
  if (record(found.people)) out.people = found.people as Record<string, Person>;
  return out;
}

