import { GENERATED_CITY_FIGURES, GENERATED_CITY_INDEX, GENERATED_CITY_LOADERS } from '#city-loaders'
import type { CityModule } from '../../types/content.ts'

/** The city facts of the world network (src/game/cities/network.ts): every city's place, state and country. */
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
  readonly teaser?: string
  readonly preview?: readonly string[]
}

/** Compact generated form: open is implicit, 1/0 encodes airport, and an empty state name repeats the city name. */
export type CityCatalogueRow = readonly [id: string, name: string, stateId: string, stateName: string, lon: number, lat: number, airport: 0 | 1, countryISO?: string, countryName?: string]

/**
 * One open city in the startup index (loaders.generated.ts): its id and display name. Keep it this small: it is the only per-city
 * table the first download carries, so it is paid once for every city in the world.
 */
export type CityIndexRow = readonly [id: string, name: string]

export type CityModuleLoader = () => Promise<CityModule>

export const RESERVED_CITIES: readonly CityCatalogueEntry[] = Object.freeze([
  Object.freeze({
    id: 'kaduna', name: 'Kaduna', state: Object.freeze({ id: 'kaduna', name: 'Kaduna State' }),
    lon: 7.4359863, lat: 10.5182899, open: false, airport: false,
    teaser: 'A city on the Kaduna River, at the end of the railway from Abuja. It is not open yet.',
    preview: Object.freeze(['The railway from Idu to Rigasa', 'Homes and local governments', 'Road travel to neighbouring cities']),
  }),
])

/** The open cities of the startup index, in catalogue order. */
export const CITY_INDEX: readonly { readonly id: string; readonly name: string }[] = Object.freeze(GENERATED_CITY_INDEX.map(([id, name]) => Object.freeze({ id, name })))

/** How many cities are open, in how many countries (the landing's figures), without the world network. */
export const CITY_WORLD_FIGURES: { readonly cities: number; readonly countries: number } = GENERATED_CITY_FIGURES

/** The reserved (closed) cities that no open city has replaced. */
export const CLOSED_RESERVED_CITIES: readonly CityCatalogueEntry[] = Object.freeze(RESERVED_CITIES.filter((city) => !CITY_INDEX.some((open) => open.id === city.id)))

/** The full catalogue from the generated rows (read by network.ts): the generated open cities plus the small closed-city catalogue. */
export function catalogueFromRows(rows: readonly CityCatalogueRow[]): readonly CityCatalogueEntry[] {
  const generated = rows.map(([id, name, stateId, stateName, lon, lat, airport, countryISO, countryName]) => Object.freeze({
    id, name, state: Object.freeze({ id: stateId, name: stateName === '' ? name : stateName }), lon, lat, open: true, airport: airport === 1,
    ...(countryISO ? { countryISO, countryName } : {}),
  }))
  return Object.freeze([
    ...generated.slice(0, 4),
    ...RESERVED_CITIES.filter(city => !generated.some(open => open.id === city.id)),
    ...generated.slice(4),
  ])
}

export const CITY_LOADERS: Readonly<Record<string, CityModuleLoader | undefined>> = Object.freeze(Object.fromEntries(
  CITY_INDEX.map((city, index) => [city.id, GENERATED_CITY_LOADERS[index]]),
))
