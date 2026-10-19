import type { StreetJourney } from '../street/types.ts'
import type { StoryView } from '../types/story.ts'

export interface StoryStreetCoverage {
  cityId: string
  streetVersion: string
  venueIds: readonly string[]
}

export interface StoryStreetWalkInput {
  enabled: boolean
  story: StoryView
  currentCityId: string
  currentVenueId: string
  connected: boolean
  activeAction: boolean
  visiting: boolean
  pending: boolean
  journey: StreetJourney | null
  coverage: readonly StoryStreetCoverage[]
}

interface StoryStreetWalkBase {
  venueCount: number
  reason: string | null
}

export type StoryStreetWalkView =
  | (StoryStreetWalkBase & { kind: 'start'; actionLabel: 'Walk into the city' })
  | (StoryStreetWalkBase & { kind: 'walking'; actionLabel: 'Continue walking' })
  | (StoryStreetWalkBase & { kind: 'return'; actionLabel: 'Return to the street'; venueLabel: string })
  | { kind: 'mapped-venue'; venueLabel: string }

function unavailableReason(input: StoryStreetWalkInput): string | null {
  if (!input.connected) return 'Reconnect to walk into the city.'
  if (input.activeAction) return 'Finish or cancel your current activity first.'
  if (input.visiting) return 'Finish this home visit before walking into the city.'
  if (input.pending) return 'The street is changing. Please wait.'
  return null
}

export function storyStreetWalkView(input: StoryStreetWalkInput): StoryStreetWalkView | null {
  const story = input.story
  if (!input.enabled || !story.enabled || story.mode !== 'story' || story.chapter < 3 || story.cityId !== input.currentCityId) return null

  const city = input.coverage.find(row => row.cityId === input.currentCityId)
  if (!city) return null
  const chapterVenues = city.venueIds.flatMap(id => {
    const venue = story.venues.find(row => row.id === id)
    return venue?.chapter === 3 && !venue.locked ? [venue] : []
  })
  if (!chapterVenues.length) return null

  const reason = unavailableReason(input)
  if (input.currentVenueId === 'neighbourhood') {
    return { kind: 'start', actionLabel: 'Walk into the city', venueCount: chapterVenues.length, reason }
  }
  if (input.currentVenueId === 'city-street') {
    return input.journey?.kind === 'walking' && input.journey.city === input.currentCityId
      ? { kind: 'walking', actionLabel: 'Continue walking', venueCount: chapterVenues.length, reason }
      : null
  }

  const mapped = chapterVenues.find(row => row.id === input.currentVenueId)
  if (!mapped) return null
  if (input.journey?.kind === 'venue' && input.journey.city === input.currentCityId && input.journey.venue === input.currentVenueId) {
    return { kind: 'return', actionLabel: 'Return to the street', venueCount: chapterVenues.length, venueLabel: mapped.label, reason }
  }
  return { kind: 'mapped-venue', venueLabel: mapped.label }
}
