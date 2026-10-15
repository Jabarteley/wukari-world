// The open cities for a reader that runs at mount, before the whole city index may have arrived (a browser build keeps Nigeria's rows
// only; the rest is the lazy `city-index` chunk). It answers with the cities known so far, never throws and never reports, starts the
// load, and (read inside a computed or a render) refreshes the reader when the index lands.
import { ref } from 'vue'
import { cityIndexReady, loadCityIndex, playableCityIdsSoFar } from '../game/cities/registry.ts'

const landed = ref(0)

export function openCityIds(): readonly string[] {
  void landed.value
  if (!cityIndexReady()) loadCityIndex().then(() => { landed.value += 1 }, () => undefined)
  return playableCityIdsSoFar()
}
