// `#city-network` for the browser: the world network is a lazy chunk (`city-network`), never part of the first download.
// registry.ts fetches it through loadCityNetwork(); the old synchronous readers refuse to answer before it is in.
import type { CityNetwork } from './network.ts'

export const CITY_NETWORK_AT_START: CityNetwork | null = null
export const fetchCityNetwork = (): Promise<CityNetwork> => import('./network.ts').then((module) => module.CITY_NETWORK)
