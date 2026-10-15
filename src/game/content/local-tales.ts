import type { LocalCountryArc } from '../../types/local-tales.ts'
import type { AcceptedLocalCity } from './local-tales-source.ts'
import {
  progressionAcceptedCityIds, progressionAcceptedCountryIds,
  progressionSourceCities, progressionSourceCountries,
} from '../progression/provider.ts'
import { installBundledProgression } from '#progression-provider'

installBundledProgression()

export type { AcceptedLocalCity } from './local-tales-source.ts'
export const ACCEPTED_LOCAL_CITIES: ReadonlyMap<string, AcceptedLocalCity> = progressionSourceCities<AcceptedLocalCity>()
export const ACCEPTED_LOCAL_COUNTRIES: ReadonlyMap<string, LocalCountryArc> = progressionSourceCountries<LocalCountryArc>()
export const ACCEPTED_LOCAL_CITY_IDS: ReadonlySet<string> = progressionAcceptedCityIds()
export const ACCEPTED_LOCAL_COUNTRY_IDS: ReadonlySet<string> = progressionAcceptedCountryIds()
export const acceptedLocalCity = (cityId: string): AcceptedLocalCity | null => ACCEPTED_LOCAL_CITIES.get(cityId) ?? null
export const hasAcceptedLocalCity = (cityId: string): boolean => ACCEPTED_LOCAL_CITY_IDS.has(cityId)
