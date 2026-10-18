import type { CityCatalogueEntry, CityCatalogueRow } from '../game/cities/catalogue.ts'
import type { CityContent, CityVenueContent } from '../types/content.ts'

export interface CatalogueCity { id: string; name: string; countryId: string; countryName: string; region: string }
export interface CatalogueCountry { id: string; name: string; cities: CatalogueCity[] }
export type CatalogueRoute = { page: 'countries' } | { page: 'cities'; countryId: string | null } | { page: 'scenes'; cityId: string | null; venueId: string | null }
const compare = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en')

export function catalogueIndex(catalogue: readonly CityCatalogueEntry[], playable: readonly string[], rows: readonly CityCatalogueRow[]): CatalogueCountry[] {
  const open = new Set(playable)
  // Keep content country identities: the map deliberately combines some territories under one map entry.
  const identities = new Map(rows.map(row => [row[0], { id: row[7] ?? 'ng', name: row[8] ?? 'Nigeria' }]))
  const countries = new Map<string, CatalogueCountry>()
  for (const city of catalogue) {
    if (!city.open || !open.has(city.id)) continue
    const country = identities.get(city.id)
    if (!country) throw new Error(`Country identity missing for ${city.id}`)
    let group = countries.get(country.id)
    if (!group) { group = { ...country, cities: [] }; countries.set(country.id, group) }
    group.cities.push({ id: city.id, name: city.name, countryId: country.id, countryName: country.name, region: city.state.name })
  }
  for (const country of countries.values()) country.cities.sort(compare)
  return [...countries.values()].sort(compare)
}

export function readRoute(url: URL): CatalogueRoute {
  const path = url.pathname.replace(/\/+$/, '')
  if (path === '/county' || path === '/county/index.html') return { page: 'countries' }
  if (path === '/cities' || path === '/cities/index.html') return { page: 'cities', countryId: url.searchParams.get('country') }
  if (path === '/cities/scenes' || path === '/cities/scenes/index.html') return { page: 'scenes', cityId: url.searchParams.get('city'), venueId: url.searchParams.get('venue') }
  throw new Error('Unknown catalogue page')
}
export const countryUrl = (id: string): string => `/cities?${new URLSearchParams({ country: id })}`
export const sceneUrl = (city: string, venue?: string): string => `/cities/scenes?${new URLSearchParams({ city, ...(venue ? { venue } : {}) })}`
export function publicVenues(content: CityContent): readonly CityVenueContent[] {
  return content.venues.filter(venue => venue.definition.category !== 'home' && (!venue.definition.cities || venue.definition.cities.includes(content.cityId)))
}
export function neighbours<T extends { id: string }>(rows: readonly T[], id: string): { previous: T | null; next: T | null } {
  const at = rows.findIndex(row => row.id === id)
  return { previous: at > 0 ? rows[at - 1]! : null, next: at >= 0 && at + 1 < rows.length ? rows[at + 1]! : null }
}
export const matches = (query: string, ...values: string[]): boolean => values.join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
