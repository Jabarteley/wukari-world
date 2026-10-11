import { GENERATED_CITY_CATALOGUE_ROWS } from './catalogue.generated.ts'
import { GENERATED_CITY_LOADERS } from '#city-loaders'
import type { CityModule, CityModuleRules } from '../../types/content.ts'

/** The city facts needed before any city's rules arrive. Keep this list small: it is paid once for every city. */
export interface CityCatalogueEntry {
  readonly id: string
  readonly name: string
  readonly state: { readonly id: string; readonly name: string }
  readonly countryISO?: string
  readonly countryName?: string
  readonly lon: number
  readonly lat: number
  readonly open: boolean
  readonly airport: boolean
  readonly generatedLinkPolicy?: CityModuleRules['generatedLinkPolicy']
  readonly teaser?: string
  readonly preview?: readonly string[]
}

/** Compact generated form: open is implicit, 1/0 encodes airport, and an empty state name repeats the city name. */
export type CityCatalogueRow = readonly [id: string, name: string, stateId: string, stateName: string, lon: number, lat: number, airport: 0 | 1, countryISO?: string, countryName?: string, generatedLinkPolicy?: CityModuleRules['generatedLinkPolicy']]

export type CityModuleLoader = () => Promise<CityModule>

const RESERVED_CITIES: readonly CityCatalogueEntry[] = Object.freeze([
  Object.freeze({
    id: 'kaduna', name: 'Kaduna', state: Object.freeze({ id: 'kaduna', name: 'Kaduna State' }),
    lon: 7.4359863, lat: 10.5182899, open: false, airport: false,
    teaser: 'A city on the Kaduna River, at the end of the railway from Abuja. It is not open yet.',
    preview: Object.freeze(['The railway from Idu to Rigasa', 'Homes and local governments', 'Road travel to neighbouring cities']),
  }),
])

/** Generated open cities plus the small closed-city catalogue. Full rules, content and maps live behind loaders. */
const generatedRows: readonly CityCatalogueRow[] = GENERATED_CITY_CATALOGUE_ROWS
const GENERATED_CITY_CATALOGUE: readonly CityCatalogueEntry[] = Object.freeze(generatedRows.map(([id, name, stateId, stateName, lon, lat, airport, countryISO, countryName, generatedLinkPolicy]) => Object.freeze({
  id, name, state: Object.freeze({ id: stateId, name: stateName === '' ? name : stateName }), lon, lat, open: true, airport: airport === 1,
  ...(countryISO ? { countryISO, countryName } : {}),
  ...(generatedLinkPolicy ? { generatedLinkPolicy } : {}),
})))
export const CITY_CATALOGUE: readonly CityCatalogueEntry[] = Object.freeze([
  ...GENERATED_CITY_CATALOGUE.slice(0, 4),
  ...RESERVED_CITIES.filter(city => !GENERATED_CITY_CATALOGUE.some(open => open.id === city.id)),
  ...GENERATED_CITY_CATALOGUE.slice(4),
])

export const CITY_LOADERS: Readonly<Record<string, CityModuleLoader | undefined>> = Object.freeze(Object.fromEntries(
  GENERATED_CITY_CATALOGUE.map((city, index) => [city.id, GENERATED_CITY_LOADERS[index]]),
))
