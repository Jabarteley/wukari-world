/**
 * "Find my old street" (docs/SHARE-LOOPS.md): the pure parts of the childhood-street video. The caption, the search over open cities and a
 * city's own local units and districts, how long the recording runs (the entry dive's own path, src/map3d/dive.ts) and where the shared
 * link leads (`/street/<city>/<place>`, the street's entry page with the same dive).
 *
 * LOCATION PRIVACY. Nothing here reads where the device is. A person picks a city and a place by name, or asks the existing on-device finder
 * (src/app/features/start/streetEntry.ts findStreet), which hands back ids and names only. Nothing about the place is stored or sent: it
 * leaves the device only inside the video and its link, and only when the person shares them.
 */
import { DIVE_MS, ENTRY_COUNTRY_MS, ENTRY_WORLD_MS, LITE } from '../../../map3d/dive.ts'
import type { DiveTier } from '../../../map3d/dive.ts'
import { loopText, plain } from './loopsModel.ts'

/** The first words of the caption; the person picks one. */
export const CAPTIONS = Object.freeze(['Where I grew up', 'My old street', 'Where I live now', 'Where it all started'] as const)
export type Caption = typeof CAPTIONS[number]

export interface StreetChoice { city: string; cityName: string; place: { id: string; name: string } | null }

/** "Where I grew up · Surulere, Lagos" (or the city alone). */
export function captionOf(caption: string, choice: StreetChoice): string {
  const first = CAPTIONS.find((item) => item === caption) ?? CAPTIONS[0]
  const where = choice.place ? `${plain(choice.place.name, 32)}, ${plain(choice.cityName, 32)}` : plain(choice.cityName, 32)
  return `${first} · ${where}`
}

/** The street's own address: the entry page that plays the same dive for whoever opens the link. */
export const streetPath = (choice: StreetChoice): string => (choice.place ? `/street/${choice.city}/${choice.place.id}` : `/visit/${choice.city}`)

export function streetText(caption: string, choice: StreetChoice, link: string): string {
  return loopText([`${captionOf(caption, choice)} 📍`, 'From space to the street, in Allworld. Find yours.'], link)
}

/** Words folded for matching: lower case, accents off, only letters and digits. */
export const fold = (text: string): string => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The best matches for what was typed: names starting with it first, then names containing it; at most `max`. */
export function matchPlaces<T extends { name: string }>(items: readonly T[], typed: string, max = 8): T[] {
  const want = fold(typed)
  if (!want) return items.slice(0, max)
  const starts: T[] = [], contains: T[] = []
  for (const item of items) {
    const name = fold(item.name)
    if (name.startsWith(want) || name.split(' ').some((word) => word.startsWith(want))) starts.push(item)
    else if (name.includes(want)) contains.push(item)
  }
  return [...starts.sort((a, b) => a.name.localeCompare(b.name)), ...contains.sort((a, b) => a.name.localeCompare(b.name))].slice(0, max)
}

/** A city's places to pick from: its local units, then its districts (named with their unit when the names alone would repeat). */
export function placesOf(rules: { units: readonly { id: string; name: string }[]; districts: readonly { id: string; name: string; localUnitId: string }[] } | null): { id: string; name: string }[] {
  if (!rules) return []
  const out = rules.units.map((unit) => ({ id: unit.id, name: unit.name }))
  const names = new Set(out.map((item) => fold(item.name)))
  for (const district of rules.districts) {
    if (!rules.units.some((unit) => unit.id === district.localUnitId)) continue
    if (names.has(fold(district.name))) continue
    names.add(fold(district.name))
    out.push({ id: district.id, name: district.name })
  }
  return out
}

/** How long the recording runs: the entry dive's path on this device (world, country, then the dive) and a short hold on the street. */
export const HOLD_MS = 1800
export function recordingMs(tier: DiveTier): number {
  const k = tier === 'lite' ? LITE : 1
  return Math.round((ENTRY_WORLD_MS + ENTRY_COUNTRY_MS) * k + DIVE_MS * k) + HOLD_MS
}

/** Where the frame of a `w` x `h` source is cut for a `outW` x `outH` story (the middle, filling the frame). */
export function coverCrop(w: number, h: number, outW: number, outH: number): { sx: number; sy: number; sw: number; sh: number } {
  const width = Math.max(1, w), height = Math.max(1, h), want = outW / outH
  if (width / height > want) { const sw = Math.round(height * want); return { sx: Math.round((width - sw) / 2), sy: 0, sw, sh: height } }
  const sh = Math.round(width / want)
  return { sx: 0, sy: Math.round((height - sh) / 2), sw: width, sh }
}

/** The clouds of the dive host (src/map3d/dive-host.ts) as it moves them: how far a half has drifted (percent) and how big it is. */
export function cloudMotion(transform: string): { shift: number; scale: number } {
  const shift = /translate3d\((-?[\d.]+)%/.exec(transform), scale = /scale\(([\d.]+)\)/.exec(transform)
  return { shift: shift ? Number(shift[1]) || 0 : 0, scale: scale ? Number(scale[1]) || 1 : 1 }
}
