import type { CityContent } from '../types/content.ts'
import type { StorySignatureKind, StorySignatureView } from '../types/story.ts'

const SPECIAL: Readonly<Record<string, StorySignatureKind>> = Object.freeze({
  lagos: 'arena-race',
  ibadan: 'tables',
  'port-harcourt': 'business',
  abuja: 'politics',
  kano: 'haggle',
  calabar: 'festival',
  nairobi: 'tables',
  accra: 'business',
  tokyo: 'arena-race',
  paris: 'tables',
})

const FALLBACKS: readonly StorySignatureKind[] = Object.freeze([
  'haggle', 'tables', 'arena-race', 'arena-fight', 'arena-football', 'business',
])

const WORDS: Readonly<Record<StorySignatureKind, Omit<StorySignatureView, 'kind' | 'venue'>>> = Object.freeze({
  haggle: { label: 'Market bargain', description: 'Read the seller, make an offer and close a fair local deal.' },
  tables: { label: 'City tables', description: 'Take a seat and learn the game people gather around here.' },
  'arena-race': { label: 'City race', description: 'Run the city route and learn where speed matters.' },
  'arena-fight': { label: 'City bout', description: 'Meet a local challenger and hold your ground.' },
  'arena-football': { label: 'City football', description: 'Join the local match and make the decisive play.' },
  business: { label: 'Market maker', description: 'Open a small stall and learn what this city trades.' },
  festival: { label: 'City festival', description: 'Show up for a gathering that belongs to this place.' },
  politics: { label: 'City voice', description: 'Take part in the civic life of the city.' },
  clan: { label: 'City circle', description: 'Join a local circle and earn a place in it.' },
})

const hash = (value: string): number => {
  let out = 2166136261
  for (let index = 0; index < value.length; index += 1) out = Math.imul(out ^ value.charCodeAt(index), 16777619)
  return out >>> 0
}

export const signatureKindFor = (cityId: string): StorySignatureKind => SPECIAL[cityId] ?? FALLBACKS[hash(cityId) % FALLBACKS.length]!

const venueFor = (kind: StorySignatureKind, content: CityContent | null): string | null => {
  if (!content) return null
  if (kind === 'tables') return content.tablePlaces?.[0]?.venueId ?? null
  const score = (venue: CityContent['venues'][number]): number => {
    const scene = venue.kind, category = venue.definition.category
    if ((kind === 'haggle' || kind === 'business') && scene === 'market') return 3
    if (kind === 'festival' && (scene === 'park' || category === 'fun')) return 3
    if (kind === 'politics' && (scene === 'polling' || scene === 'statehouse' || category === 'civic')) return 3
    if (kind === 'clan' && (scene === 'park' || category === 'fun')) return 2
    if (kind.startsWith('arena-') && (scene === 'park' || scene === 'club' || category === 'fun')) return 2
    return 0
  }
  return [...content.venues].filter(row => row.id !== 'home').sort((a, b) => score(b) - score(a))[0]?.id ?? null
}

export function signatureFor(cityId: string, content: CityContent | null): StorySignatureView {
  const kind = signatureKindFor(cityId)
  return { kind, ...WORDS[kind], venue: venueFor(kind, content) }
}
