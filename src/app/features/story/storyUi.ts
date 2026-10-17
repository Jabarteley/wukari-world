import { ref } from 'vue'
import type { StoryView } from '../../../types/story.ts'
import type { StorySignatureKind } from '../../../types/story.ts'
import { publicStoryHelpId } from '../messages/messagesModel.ts'

export const storyHelpFocus = ref<string | null>(null)

export function setStoryHelpFocus(value: unknown): string | null {
  const id = publicStoryHelpId(value)
  storyHelpFocus.value = id
  return id
}

export function signaturePanelId(kind: StorySignatureKind): string {
  if (kind === 'tables') return 'tables'
  if (kind.startsWith('arena-')) return 'games'
  if (kind === 'business' || kind === 'haggle') return 'business'
  if (kind === 'politics') return 'politics'
  if (kind === 'festival') return 'events'
  return 'games'
}

export function storyVenueLock(story: StoryView | undefined, venueId: string): string | null {
  if (story?.enabled !== true || story.mode !== 'story') return null
  const venue = story.venues.find((row) => row.id === venueId)
  if (!venue?.locked) return null
  return venue.reason || `Reach chapter ${venue.chapter} to enter ${venue.label}.`
}

export function unlockedCityCount(story: StoryView): number {
  return story.cities.reduce((count, city) => count + Number(city.unlocked), 0)
}
