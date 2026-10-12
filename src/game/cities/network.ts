// The world network: every city's catalogue facts (place, state, country, airport), the land component of each city and the authored
// routes between cities. It is one lazy chunk in the browser (`city-network`, vite.config.ts), fetched when the game is idle after it is
// ready and awaited by everything that reads other cities (the travel list, the atlas and city pickers, homeward quotes, ride credit,
// the airport desk, a visiting or travelling life): a resident's startup needs only the startup index (catalogue.ts, CITY_INDEX).
// Node and the Worker read it at once (network-static.ts). The tables are generated (scripts/city/build-catalogue.ts,
// scripts/city/build-land-components.py); nothing here is written by hand.
import { GENERATED_CITY_CATALOGUE_ROWS } from './catalogue.generated.ts'
import { GENERATED_CITY_LAND_COMPONENTS } from './land-components.generated.ts'
import { AUTHORED_CITY_LINKS } from './routes.generated.ts'
import { catalogueFromRows, type CityCatalogueEntry } from './catalogue.ts'
import type { CityLandComponentRow } from './generatedLinks.ts'
import type { CityLink } from '../../types/content.ts'

export interface CityNetwork {
  readonly catalogue: readonly CityCatalogueEntry[]
  readonly land: readonly CityLandComponentRow[]
  readonly authoredLinks: readonly CityLink[]
}

export const CITY_NETWORK: CityNetwork = Object.freeze({
  catalogue: catalogueFromRows(GENERATED_CITY_CATALOGUE_ROWS),
  land: GENERATED_CITY_LAND_COMPONENTS,
  authoredLinks: AUTHORED_CITY_LINKS,
})

/** The full catalogue, for scripts and hosts that read it directly. */
export const CITY_CATALOGUE: readonly CityCatalogueEntry[] = CITY_NETWORK.catalogue
