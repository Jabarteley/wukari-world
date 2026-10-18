/**
 * OWNER: spaces
 * What AI Spaces keeps: the collection `spaces`, additive (a server without it reads as empty).
 *
 *   spaces.homes[publicId]   { title, at }   the title of the plan a player last applied to their home (it passed the text filter
 *                                            and agentWords); read by the `space` share card (server/growth/share.ts)
 *   spaces.hosts[publicId]   { kind, persona, on, at, guests?: { [guestId]: { n, at } } }   the AI host of a player's home (./host.ts):
 *                                            how many times each guest came, for "welcome back"; at most 50 guests, 90 days
 *
 * Erased with the player (eraseSpaces, called from server/admin/erasure-data.ts): their own records, and their visits in other hosts' books.
 */
import type { Db } from '../types.ts';

export interface SpaceHome { title: string; at: number }
export interface SpaceHost { kind: string; persona: string; on: boolean; at: number; guests?: Record<string, { n: number; at: number }> }
export interface SpacesCollection { homes: Record<string, SpaceHome>; hosts: Record<string, SpaceHost> }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** The collection, made on first write. */
export function spacesOf(db: Db): SpacesCollection {
  const found = (db as Record<string, unknown>)['spaces'];
  if (isRecord(found) && isRecord(found['homes'])) {
    if (!isRecord(found['hosts'])) found['hosts'] = {};
    return found as unknown as SpacesCollection;
  }
  const made: SpacesCollection = { homes: {}, hosts: {} };
  (db as Record<string, unknown>)['spaces'] = made;
  return made;
}
/** Read only: a player's home title, or ''. */
export function homeTitleOf(db: Db, publicId: string): string {
  const homes = (db as Record<string, { homes?: Record<string, SpaceHome> } | undefined>)['spaces']?.homes;
  const found = homes && Object.hasOwn(homes, publicId) ? homes[publicId] : undefined;
  return typeof found?.title === 'string' ? found.title : '';
}
/** Forget players (erasure). Returns how many records went. */
export function eraseSpaces(db: Db, ids: Iterable<string>): number {
  const col = (db as Record<string, { homes?: Record<string, SpaceHome>; hosts?: Record<string, SpaceHost> } | undefined>)['spaces'];
  if (!col) return 0;
  let gone = 0;
  const list = [...ids];
  for (const id of list) {
    if (col.homes && Object.hasOwn(col.homes, id)) { delete col.homes[id]; gone++; }
    if (col.hosts && Object.hasOwn(col.hosts, id)) { delete col.hosts[id]; gone++; }
    for (const host of Object.values(col.hosts ?? {})) if (host.guests && Object.hasOwn(host.guests, id)) { delete host.guests[id]; gone++; }
  }
  return gone;
}
