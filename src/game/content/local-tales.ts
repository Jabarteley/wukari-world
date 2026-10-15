import type { AuthoredContentBatch, LocalCityTales, LocalCountryArc } from '../../types/local-tales.ts'
import type { WorldStorySeed } from '../../types/world-progression.ts'
import { WORLD_STORY_SEEDS } from './world-progression.generated.ts'
import batch01 from './local-tales/batch-01.ts'
import batch02 from './local-tales/batch-02.ts'

/**
 * Only batches that have passed the separate content review belong here. Keep this list empty
 * until the integration owner accepts a whole-country batch and adds its explicit import.
 */
export const ACCEPTED_LOCAL_TALE_BATCHES: readonly AuthoredContentBatch[] = Object.freeze([batch01, batch02])

export interface AcceptedLocalCity {
  tales: LocalCityTales
  seed: WorldStorySeed
  country: LocalCountryArc
}

const seedByCity = new Map(WORLD_STORY_SEEDS.map(seed => [seed.cityId, seed]))
const expectedCitiesByCountry = new Map<string, Set<string>>()
for (const seed of WORLD_STORY_SEEDS) {
  const cities = expectedCitiesByCountry.get(seed.countryId) ?? new Set<string>()
  cities.add(seed.cityId)
  expectedCitiesByCountry.set(seed.countryId, cities)
}

const cities = new Map<string, AcceptedLocalCity>()
const countries = new Map<string, LocalCountryArc>()
for (const [batchIndex, batch] of ACCEPTED_LOCAL_TALE_BATCHES.entries()) {
  const arcs = new Map(batch.countries.map(arc => [arc.countryId, arc]))
  for (const arc of batch.countries) {
    if (countries.has(arc.countryId)) throw new TypeError(`Accepted local tale country ${arc.countryId} is duplicated`)
    const expected = expectedCitiesByCountry.get(arc.countryId)
    const supplied = new Set(batch.cities.filter(city => seedByCity.get(city.cityId)?.countryId === arc.countryId).map(city => city.cityId))
    if (!expected || expected.size !== supplied.size || [...expected].some(cityId => !supplied.has(cityId))) {
      throw new TypeError(`Accepted local tale batch ${batchIndex} must contain the whole ${arc.countryId} city set`)
    }
    countries.set(arc.countryId, arc)
  }
  for (const tales of batch.cities) {
    const seed = seedByCity.get(tales.cityId)
    if (!seed) throw new TypeError(`Accepted local tale city ${tales.cityId} has no world story seed`)
    const country = arcs.get(seed.countryId)
    if (!country) throw new TypeError(`Accepted local tale city ${tales.cityId} has no country arc in its batch`)
    if (cities.has(tales.cityId)) throw new TypeError(`Accepted local tale city ${tales.cityId} is duplicated`)
    cities.set(tales.cityId, { tales, seed, country })
  }
}

export const ACCEPTED_LOCAL_CITIES: ReadonlyMap<string, AcceptedLocalCity> = cities
export const ACCEPTED_LOCAL_COUNTRIES: ReadonlyMap<string, LocalCountryArc> = countries
export const ACCEPTED_LOCAL_CITY_IDS: ReadonlySet<string> = new Set(cities.keys())
export const ACCEPTED_LOCAL_COUNTRY_IDS: ReadonlySet<string> = new Set(countries.keys())
export const acceptedLocalCity = (cityId: string): AcceptedLocalCity | null => cities.get(cityId) ?? null
export const hasAcceptedLocalCity = (cityId: string): boolean => cities.has(cityId)

