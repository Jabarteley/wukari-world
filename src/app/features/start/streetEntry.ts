// A STREET ON THE ENTRY PAGE (docs/ENTRY.md): what `/street/<city>/<place>` and `/visit/<city>` name, "Find my street", and the dive behind
// the card. EntryPage.vue fetches this after its first paint, only for those addresses or when "Find my street" is tapped: none of it is in
// the first download, and Play never waits on the dive (the backdrop starts on its own and only ever draws under the card).
//
// LOCATION PRIVACY (the same rule as findCity.ts). "Find my street" is findCity, which works the place out on this device and hands back a
// city id and a local unit's id and name. Nothing here sees more than that, and nothing is stored or sent until the visitor presses Play:
// then the street (ids only) is kept for this tab, as any address is (paths/intent.ts), and the address bar no longer carries the old one.
import { loadCityContent, loadCityNetwork, loadCityRules } from '../../../game/cities/registry.ts'
import { parsePath, placeFacts, streetPlace } from '../../../paths.ts'
import { deviceHints } from '../../../map3d/dive-host.ts'
import { diveTier, entryBackdrop } from '../../../map3d/dive.ts'
import type { EntryDive } from '../../../map3d/entry-dive.ts'
import { cleanAddress } from '../../../quick-start/entry.ts'
import type { CityFind } from './findCity.ts'

/** A street the entry page goes down to: an open city and, for a street, one of its local units or districts (names from the city's rules). */
export interface StreetTarget { city: string; cityName: string; place: { id: string; name: string } | null }

/** The street or visit an address names, with the names the city's rules give it; null for any other address, or a city that is not open. */
export async function streetOf(pathname: string): Promise<StreetTarget | null> {
  await loadCityNetwork()
  const intent = parsePath(pathname)
  if (intent?.kind !== 'street') return null
  if (intent.place) await loadCityRules(intent.city).catch(() => undefined)
  const facts = placeFacts(intent.city)
  const found = streetPlace(intent.city, intent.place)
  return facts ? { city: facts.id, cityName: facts.name, place: found ? { id: found.id, name: found.name } : null } : null
}

/** "Find my street": where this device is, as an open city and the local unit it is in (findCity.ts, on this device), or the nearest open city. */
export async function findStreet(): Promise<{ found: CityFind; target: StreetTarget | null }> {
  const found = await (await import('./findCity.ts')).findCity()
  if (found.kind === 'none') return { found, target: null }
  return { found, target: { city: found.city, cityName: found.name, place: found.kind === 'in' ? { id: found.unit.id, name: found.unit.name } : null } }
}

/** "Yaba, Lagos", or the city alone. */
export const targetName = (target: StreetTarget): string => (target.place ? `${target.place.name}, ${target.cityName}` : target.cityName)

/**
 * The dive behind the card: none on a device that saves data or is weak (the picture stays), the atlas faded in over the city for reduced
 * motion, the timed dive otherwise. Resolves null when there is none; it never throws (the picture is the fallback for everything).
 */
export async function startBackdrop(box: HTMLElement, target: StreetTarget): Promise<EntryDive | null> {
  const hints = { ...deviceHints(), reduced: Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) }
  const backdrop = entryBackdrop(hints)
  if (backdrop === 'still') return null
  try {
    // The maps read other cities as soon as their modules run: the world network is in first (as src/app/scene/mapLoaders.ts does).
    await loadCityNetwork()
    const start = await (await import('../../../map3d/entry-dive.ts')).loadEntryDive()
    return start({ box, backdrop, tier: diveTier({ ...hints, reduced: false }), target: { city: target.city, name: targetName(target) } })
  } catch { return null }
}

/** The city's content, asked for as soon as the card knows the street, so that Play can start the life there at once. False if it failed. */
export async function cityReady(city: string): Promise<boolean> {
  try { await loadCityContent(city); return true } catch { return false }
}

/** Play with a street "Find my street" chose: the address is cleaned (so it is not read instead) and the street is kept for the life about to exist. */
export async function keepStreet(target: StreetTarget): Promise<void> {
  cleanAddress()
  const [{ keepIntent }, { startPaths }] = await Promise.all([import('../paths/intent.ts'), import('../paths/arrive.ts')])
  keepIntent({ kind: 'street', city: target.city, place: target.place?.id ?? null })
  startPaths()
}
