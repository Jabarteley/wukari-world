/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Residents everywhere")
 * THE WORLD OF RESIDENTS: which residents live in which open cities. Authored residents (life.ts, roster.ts) keep their cities' first slots, generated ones (generate.ts) fill
 * the rest up to the number asked for. Reads the city catalogue (id, name, country, place) which is part of the module graph on both hosts: it needs no city loaded
 * and adds nothing to startup. Venues of a city are read from its content only if that content is already loaded (somebody is there); never loaded from here.
 */
import { cachedCityContent, cityCatalogueEntry } from '../../src/game/cities/index.ts';
import { generatedById, rosterFor } from './generate.ts';
import type { CityFacts } from './generate.ts';
import { RESIDENTS, residentId } from './life.ts';
import type { Resident } from './life.ts';
import { hash } from './persona.ts';

export const PER_CITY_MAX = 5;
/** The facts the generator needs about an open city, or null for an unknown id. */
export function factsOf(id: string): CityFacts | null {
  try {
    const entry = cityCatalogueEntry(id);
    return entry ? { id, name: entry.name, iso: (entry.countryISO ?? 'ng').toLowerCase(), lon: entry.lon, lat: entry.lat } : null;
  } catch { return null; }
}
const authoredIn = (city: string): Resident[] => RESIDENTS.filter((who) => who.city === city);

const cache = new Map<string, Resident[]>();
/** The residents of one city: `per` of them (0 to 5), authored first, then generated. Memoised: the same objects every time. */
export function residentsInCity(city: string, per: number): readonly Resident[] {
  const count = Math.max(0, Math.min(PER_CITY_MAX, Math.round(per)));
  if (count === 0) return [];
  const key = `${city}|${count}`;
  let found = cache.get(key);
  if (!found) {
    const facts = factsOf(city);
    // A city the catalogue does not know still keeps its authored residents (a test city); it gets no generated ones.
    found = facts ? rosterFor(facts, count, authoredIn(city)) : authoredIn(city).slice(0, count);
    cache.set(key, found);
  }
  return found;
}
/** Everyone who lives in the given cities, city by city in the order given. */
export function residentsOfCities(cities: readonly string[], per: number): Resident[] {
  const out: Resident[] = [];
  for (const city of cities) out.push(...residentsInCity(city, per));
  return out;
}
/** A resident by id: an authored one, or a generated one rebuilt from its id (the Prayers page and the acts of the owner use this). */
export function residentById(id: string): Resident | null {
  return RESIDENTS.find((who) => residentId(who) === id) ?? generatedById(id, factsOf, authoredIn);
}

// ---- venues by kind -----------------------------------------------------------------------------------------------------------------------------
/** The id of a venue of one of the kinds in this city (the first kind that exists, preferred in order), chosen among a few by `seed`; null when the city's content is not loaded or has none. */
export function venueOfKind(city: string, kinds: readonly string[], seed: string): string | null {
  const venues = cachedCityContent(city)?.venues;
  if (!venues) return null;
  for (const kind of kinds) {
    const matches = venues.filter((venue) => venue.kind === kind && venue.id !== 'home');
    if (matches.length) return matches[hash(seed) % Math.min(matches.length, 5)]!.id;
  }
  return null;
}
