// The location badge's check, without a DOM (docs/FEED.md, "Location badge"): which city of the world map this device is in.
//
// LOCATION PRIVACY (the same rule as world/lgaCardModel.ts and locate/locateModel.ts). The browser is asked for a position only when the
// player presses the button, once, with high accuracy off. The position is a local value of this function: it is tested against the
// registry's city coordinates and the city packs fetched to this device, and what comes out is a city id and a name, and (inside a city
// pack's boundaries) the local government's id and name, found the same way as world/lgaCardModel.ts does. It is never stored, logged,
// put in an event or sent; the one request afterwards carries the city id (and the local government's id) only, and only when the player
// says yes.
import { nearestCities } from '../../../paths.ts'
import { loadCityNetwork } from '../../../game/cities/registry.ts'
import { LOCATED } from '../../../feed/model.ts'
import { loadCityPackApi } from '../world/cityPack.ts'
import type { CityPackApi } from '../world/cityPack.ts'

/** `lga` and `lgaName`: the local government the device is inside, when the city has boundaries and the device is surely in one. */
export type CityCheck = { kind: 'found'; city: string; name: string; lga?: string; lgaName?: string } | { kind: 'none'; line: string }

export interface LocateCityDeps {
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined
  secure?: boolean
  packs?: () => Promise<CityPackApi>
}

const WHY: Readonly<Record<number, string>> = {
  1: 'Location is switched off for this site, so nothing was checked.',
  2: 'This device could not work out where it is. Try again outside or with Wi-Fi on.',
  3: 'Finding you took too long. Try again in a moment.',
}
export const NOT_NEAR = 'You do not seem to be in a city on the world map yet, so there is no badge to give.'
export const IMPRECISE = 'This device only knows roughly where it is (a computer located by its network, for example). Try on your phone.'

export async function locateCity(deps: LocateCityDeps = { geolocation: globalThis.navigator?.geolocation, secure: globalThis.isSecureContext !== false }): Promise<CityCheck> {
  if (deps.secure === false) return { kind: 'none', line: 'Browsers only share a location with secure (https) pages.' }
  const { geolocation } = deps
  if (!geolocation) return { kind: 'none', line: 'This browser cannot share a location.' }
  try {
    const at = await new Promise<{ lat: number; lon: number; accuracy: number }>((resolve, reject) => geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (error) => reject(error), { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }))
    if (!(at.accuracy <= LOCATED.accuracyM)) return { kind: 'none', line: IMPRECISE }
    const [packs] = await Promise.all([(deps.packs ?? loadCityPackApi)(), loadCityNetwork()])
    const near = [...nearestCities(at.lat, at.lon, 3), ...nearestCities(at.lat, at.lon, 3, { open: false })].sort((a, b) => a.km - b.km)
    // Inside a city's real boundary where the city has one; otherwise close to its centre.
    for (const c of near) {
      if (!packs.has(c.id)) continue
      const pack = await packs.load(c.id)
      const unit = pack ? packs.resolve(pack, at.lat, at.lon) : null
      // Only a local government the position is inside (`sure`); a guess at the nearest one is left out, and the badge is the city alone.
      if (unit) return { kind: 'found', city: c.id, name: c.name, ...(unit.sure ? { lga: unit.id, lgaName: unit.name } : {}) }
    }
    const close = near.find((c) => c.km <= LOCATED.km && !packs.has(c.id))
    return close ? { kind: 'found', city: close.id, name: close.name } : { kind: 'none', line: NOT_NEAR }
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code
    return { kind: 'none', line: typeof code === 'number' ? WHY[code] ?? WHY[2]! : WHY[2]! }
  }
}
