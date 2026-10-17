import type { CityContent, VenueDefinition } from '../types/content.ts'
import type { StoryChapter } from '../types/story.ts'
import { WORLD_STORY_SEEDS } from '../game/content/world-progression.generated.ts'
import { signatureFor } from './signatures.ts'

const seeds = new Map(WORLD_STORY_SEEDS.map(seed => [seed.cityId, seed]))

export function proofVenues(cityId: string): ReadonlySet<string> {
  const seed = seeds.get(cityId)
  return new Set(seed ? [seed.host.venue, seed.practical.venue, seed.discovery.venue] : [])
}

export function hostVenue(cityId: string): string | null {
  return seeds.get(cityId)?.host.venue ?? null
}

export function localTalesJourneyId(cityId: string): string | null {
  const seed = seeds.get(cityId)
  return seed ? `${seed.countryId}:${seed.cityId}:local-tales` : null
}

function firstWelcomeVenue(content: CityContent | null): string | null {
  if (!content) return null
  return content.venues.find(row => row.kind === 'market')?.id
    ?? content.venues.find(row => row.definition.category === 'food')?.id
    ?? content.venues.find(row => row.id !== 'home')?.id
    ?? null
}

export function venueChapter(cityId: string, venue: Pick<VenueDefinition, 'id' | 'category' | 'scene'>, content: CityContent | null): StoryChapter {
  if (venue.id === 'home' || venue.id === 'neighbourhood' || venue.id === 'city-street') return 0
  if (proofVenues(cityId).has(venue.id) || firstWelcomeVenue(content) === venue.id) return 0
  if (venue.category === 'work' || venue.scene.kind === 'worship' || venue.scene.kind === 'airport' || venue.scene.kind === 'hub') return 1
  if (signatureFor(cityId, content).venue === venue.id || venue.category === 'care' || venue.category === 'fun') return 2
  return 3
}
