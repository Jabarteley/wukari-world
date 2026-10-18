/**
 * OWNER: spaces
 * What AI Spaces keeps: the collection `spaces`, additive (a server without it reads as empty).
 *
 *   spaces.homes[publicId]   { title, at }   the title of the plan a player last applied to their home (it passed the text filter
 *                                            and agentWords); read by the `space` share card (server/growth/share.ts)
 *
 * Erased with the player (eraseSpaces, called from server/admin/erasure-data.ts). Nothing else of a design is stored.
 */
import type { Db } from '../types.ts';

export interface SpaceHome { title: string; at: number }
export interface SpacesCollection { homes: Record<string, SpaceHome> }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** The collection, made on first write. */
export function spacesOf(db: Db): SpacesCollection {
  const found = (db as Record<string, unknown>)['spaces'];
  if (isRecord(found) && isRecord(found['homes'])) return found as unknown as SpacesCollection;
  const made: SpacesCollection = { homes: {} };
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
  const homes = (db as Record<string, { homes?: Record<string, SpaceHome> } | undefined>)['spaces']?.homes;
  if (!homes) return 0;
  let gone = 0;
  for (const id of ids) if (Object.hasOwn(homes, id)) { delete homes[id]; gone++; }
  return gone;
}
