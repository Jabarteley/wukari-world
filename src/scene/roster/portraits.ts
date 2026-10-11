// The roster's 2D faces: a 256 px head-and-shoulders portrait and a full-figure thumbnail per character and outfit. Plain addresses
// (no Three.js): the creator, the contacts, the chat and the share cards read them. Fetched by the browser only when an image is drawn.
import { rosterEntry } from '../../game/roster.ts';
import { pickOf } from './map.ts';

const urls = import.meta.glob<string>('./portraits/*.png', { query: '?url', import: 'default', eager: true });

/** The head-and-shoulders portrait of a character in an outfit, or null when the file is not shipped. */
export const portraitUrl = (id: string, outfit = 0): string | null => urls[`./portraits/portrait-${id}-o${outfit}.png`] ?? null;
/** The whole-figure thumbnail of a character in an outfit (the creator's outfit choices). */
export const thumbUrl = (id: string, outfit = 0): string | null => urls[`./portraits/figure-${id}-o${outfit}.png`] ?? null;

/** The portrait of whoever a look (as saved, or as the server relays it) and a seed describe: the roster character they wear. Null when no character is on. */
export function portraitOf(look: unknown, seed: unknown): string | null {
  const pick = pickOf(look, seed);
  return pick && rosterEntry(pick.id) ? portraitUrl(pick.id, pick.outfit) : null;
}
