import { cityCatalogue, loadCityNetwork, playableCityIds } from '../game/cities/registry.ts'
import { GENERATED_CITY_CATALOGUE_ROWS } from '../game/cities/catalogue.generated.ts'
import { catalogueIndex } from './model.ts'
export async function loadCatalogue() {
  await loadCityNetwork()
  return catalogueIndex(cityCatalogue(), playableCityIds(), GENERATED_CITY_CATALOGUE_ROWS)
}
export { loadCityContent } from '../game/cities/registry.ts'
