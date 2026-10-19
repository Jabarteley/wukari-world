/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * One passport stamp, written where an intercity trip is filed (server/character.ts fileCharacter), inside the arrival's own transaction.
 * No imports, so the character module stays as light as it was; the names and continents are read later (./passport.ts).
 */
import type { SessionRecord } from '../types.ts';

/** At most this many stamps (more than the cities there are; a bound for a stored record). */
export const PASSPORT_MAX = 400;
const CITY = /^[a-z0-9-]{1,40}$/;

/** Stamp a city once, at `now`. False when it was already stamped, or cannot be. */
export function stampPassport(session: Pick<SessionRecord, 'passport'>, city: unknown, now: number): boolean {
  if (typeof city !== 'string' || !CITY.test(city) || city.startsWith('test-') || !Number.isSafeInteger(now)) return false;
  const book = session.passport && typeof session.passport === 'object' ? session.passport : (session.passport = {});
  if (Object.hasOwn(book, city) || Object.keys(book).length >= PASSPORT_MAX) return false;
  book[city] = now;
  return true;
}

