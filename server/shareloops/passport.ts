/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * PASSPORT STAMPS. Every real city the character has been to stamps its passport, once, with the time it first arrived. The stamps live on
 * the character (`SessionRecord.passport`: city id → server ms), so they follow it across devices and are erased with it.
 *
 *   stampPassport   called where an intercity trip is filed (server/character.ts fileCharacter), inside the same transaction as the
 *                   arrival: the city it arrived in, and the city it left if that had no stamp yet (a life that began there). It also
 *                   stamps the character's own city the first time a settlement sees it, so the city a life starts in has its stamp.
 *   passportView    the stamps with each city's name, country and continent (the atlas's own: Nigeria is in Africa), and how many open
 *                   cities each continent has, so a page can say "3 of 41". The page itself is drawn on the device.
 *
 * Nothing here is shown to anyone but the player: there is no public passport. Only city ids and times are kept, never a position.
 */
import { ATLAS_LEVEL_METADATA, countryAtlasLevel } from '../../src/game/cities/atlasMetadata.ts';
import { cityCatalogue, cityCatalogueEntry } from '../../src/game/cities/index.ts';
import type { PassportStamp, PassportView } from '../../src/types/shareloops.ts';
import type { SessionRecord } from '../types.ts';
export { PASSPORT_MAX, stampPassport } from './stamp.ts';

/** The continent a city's stamp goes on: the atlas level of its country, Nigeria's being Africa. Null when the catalogue does not know it. */
export function continentOf(country: string): string | null {
  const level = countryAtlasLevel(country);
  if (!level) return null;
  return level === 'nigeria' ? 'africa' : level;
}
/** "Africa", "North America"… from the atlas's own names. */
export const continentName = (id: string): string => ATLAS_LEVEL_METADATA.find((level) => level.id === id)?.name ?? id;

/** The stamps, oldest first, each with the names the catalogue gives it. A stamp of a city the catalogue no longer knows is left out. */
export function passportView(session: Pick<SessionRecord, 'passport'>): PassportView {
  const stamps: PassportStamp[] = [];
  for (const [city, at] of Object.entries(session.passport ?? {})) {
    let entry = null;
    try { entry = cityCatalogueEntry(city); } catch { entry = null; }
    if (!entry || typeof at !== 'number') continue;
    const country = (entry.countryISO ?? 'ng').toLowerCase(), continent = continentOf(country);
    if (!continent) continue;
    stamps.push({ city, name: entry.name, country, countryName: entry.countryName ?? 'Nigeria', continent, at });
  }
  stamps.sort((a, b) => a.at - b.at || a.city.localeCompare(b.city));
  return { stamps, open: openByContinent() };
}

let counted: Record<string, number> | null = null;
/** Open cities per continent (counted once: the catalogue does not change while a host runs). */
export function openByContinent(): Record<string, number> {
  if (counted) return counted;
  const out: Record<string, number> = {};
  try {
    for (const city of cityCatalogue()) {
      if (!city.open || city.id.startsWith('test-')) continue;
      const continent = continentOf((city.countryISO ?? 'ng').toLowerCase());
      if (continent) out[continent] = (out[continent] ?? 0) + 1;
    }
  } catch { return out; }
  counted = out;
  return out;
}
