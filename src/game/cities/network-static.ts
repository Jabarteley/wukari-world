// `#city-network` for Node, the Worker and the type checker: the world network is part of the module graph, ready at import.
import { CITY_NETWORK, type CityNetwork } from './network.ts'

export const CITY_NETWORK_AT_START: CityNetwork | null = CITY_NETWORK
export const fetchCityNetwork = (): Promise<CityNetwork> => Promise.resolve(CITY_NETWORK)
