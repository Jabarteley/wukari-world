// The full catalogue from the generated rows. Read by network.ts only (the lazy world network), so the first download does not carry it.
import { RESERVED_CITIES } from './catalogue.ts'
import type { CityCatalogueEntry, CityCatalogueRow } from './catalogue.ts'
import { mapEntryOf } from './mapEntry.ts'

/** The full catalogue from the generated rows (read by network.ts): the generated open cities plus the small closed-city catalogue. */
export function catalogueFromRows(rows: readonly CityCatalogueRow[]): readonly CityCatalogueEntry[] {
  const generated = rows.map(([id, name, stateId, stateName, lon, lat, airport, countryISO, countryName, authoredOnly]) => Object.freeze({
    id, name, state: Object.freeze({ id: stateId, name: stateName === '' ? name : stateName }), lon, lat, open: true, airport: airport === 1,
    ...(countryISO ? { countryISO: mapEntryOf(countryISO), countryName } : {}),
    ...(authoredOnly === 1 ? { generatedLinkPolicy: 'authored-only' as const } : {}),
  }))
  return Object.freeze([
    ...generated.slice(0, 4),
    ...RESERVED_CITIES.filter(city => !generated.some(open => open.id === city.id)),
    ...generated.slice(4),
  ])
}
