/**
 * OWNER: social
 * THE HOME-CITY PIN, on the server (docs/SMALLER-FEATURES.md #16). A player abroad pins the city they come from; the pin is kept WITH THE CHARACTER
 * (`SessionRecord.homeCity`, optional), so it follows an account to every device. The device keeps a copy as a cache and, when the server has none and
 * the device has one, uploads it once. It is part of the account export and goes with the character when the character is erased.
 * It is shown only to its owner: nothing here is public, in a gist, on a map or on a profile card.
 * Portable: no Node imports.
 */
export interface HomeCity { city: string; name: string; tz: string }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const validZone = (tz: string): boolean => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

/** A pin as stored: a catalogue-style city id, a short plain name, a time zone this host knows. Anything else: null. */
export function readHomeCity(value: unknown): HomeCity | null {
  if (!record(value)) return null;
  const { city, name, tz } = value;
  if (typeof city !== 'string' || !/^[a-z0-9-]{2,40}$/.test(city) || typeof name !== 'string' || typeof tz !== 'string' || tz.length > 64 || !validZone(tz)) return null;
  const clean = name.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 60);
  return clean ? { city, name: clean, tz } : null;
}
