// What the tour may say about the world: the cities that are open besides the one the player is in, read from the
// city registry (the ones known so far until the whole city index has arrived, then all of them), so a city is named only once it can be travelled to and a new one appears without a change here.
import { cityCatalogueEntry, cityName, cityNetworkReady, cityRules } from '../../../game/cities/registry.ts'
import { openCityIds } from '../../openCities.ts'
import type { TourWorld } from './tourModel.ts'

export function openWorld(cityId: string): TourWorld {
  const cities = openCityIds().filter(id => id !== cityId).flatMap(id => { const name = cityName(id); return name ? [name] : [] })
  const country = cityRules(cityId)?.country.name ?? (cityNetworkReady() ? cityCatalogueEntry(cityId)?.countryName : undefined) ?? 'Nigeria'
  return { cities, country }
}
