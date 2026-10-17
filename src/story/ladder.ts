import type { LifeState, WorldCityId } from '../types/life.ts'
import type { EpisodeMementoId, PlaceEpisodeId } from '../types/episodes.ts'
import type { StoryChapter, StoryCityReceipts } from '../types/story.ts'
import { cachedCityContent, cityName, cityNetworkReady, isOpenCityId, linksFrom } from '../game/cities/registry.ts'
import { venueFor } from '../game/cities/runtime.ts'
import { journeyCompletionAt } from '../game/journeys.ts'
import { signatureFor } from './signatures.ts'
import { localTalesJourneyId, venueChapter } from './slots.ts'

export const STORY_CHAPTERS = Object.freeze(['Arrive', 'Settle', 'Belong', 'Roots', 'Complete'] as const)

const receiptsFor = (state: LifeState, cityId: string): StoryCityReceipts => state.story.cities[cityId as WorldCityId] ?? { missions: [], venues: [] }
const runFor = (state: LifeState, cityId: string) => state.episodes.runs[`place-${cityId}-city-story` as PlaceEpisodeId]
const mementoAt = (state: LifeState, cityId: string, kind: 'city' | 'country'): number | null => {
  const id = `place-${cityId}-${kind}-story` as PlaceEpisodeId
  const mementoId = `${id}-memento` as EpisodeMementoId
  const saved = state.episodes.mementos[mementoId]
  return saved?.id === mementoId && saved.version === 1 && saved.episodeId === id && saved.episodeVersion === 1
    && saved.rewardId === `episode:${id}:v1:memento` && Number.isSafeInteger(saved.grantedAt) && saved.grantedAt > 0 && saved.grantedAt <= state.t
    ? saved.grantedAt : null
}

const cityCollectionAt = (state: LifeState, cityId: string): number | null => {
  const id = localTalesJourneyId(cityId)
  return id ? journeyCompletionAt(state, id) : null
}

export function chapterOf(state: LifeState, cityId: string): StoryChapter {
  const tally = receiptsFor(state, cityId)
  const collectionAt = cityCollectionAt(state, cityId)
  const veteran = collectionAt !== null && collectionAt < state.story.trackingSince
    && mementoAt(state, cityId, 'city') !== null && mementoAt(state, cityId, 'country') !== null
  if (veteran) return 4
  const run = runFor(state, cityId)
  if (!run?.receipts[1] || !run.receipts[2]) return 0
  if (!mementoAt(state, cityId, 'city') || tally.missions.length < 3) return 1
  if (!mementoAt(state, cityId, 'country') || tally.missions.length < 6 || tally.venues.length < 6) return 2
  if (collectionAt === null || (!tally.roots && tally.missions.length < 8)) return 3
  return 4
}

const helperActive = (state: LifeState): boolean => Boolean(state.story.helper && state.story.helper.until > state.t)

export function completedCities(state: LifeState): WorldCityId[] {
  const cities = new Set<WorldCityId>(Object.keys(state.story.cities).filter((city): city is WorldCityId => isOpenCityId(city)))
  for (const id of Object.keys(state.episodes.mementos)) {
    const match = /^place-(.+)-city-story-memento$/.exec(id)
    if (match?.[1] && isOpenCityId(match[1])) cities.add(match[1])
  }
  return [...cities].filter(city => chapterOf(state, city) === 4)
}

export function cityUnlocked(state: LifeState, cityId: string): boolean {
  if (state.story.mode !== 'story') return true
  if (helperActive(state) && state.story.helper?.city === cityId) return true
  if (state.story.start === cityId || chapterOf(state, cityId) === 4) return true
  return cityNetworkReady() && completedCities(state).some(city => linksFrom(city).some(link => link.status !== 'coming' && link.to === cityId))
}

export function storyBlock(state: LifeState, cityId: string): 'story_locked' | null {
  if (state.story.mode !== 'story' || cityUnlocked(state, cityId)) return null
  return 'story_locked'
}

export function storyBlockReason(cityId: string): string {
  return `Finish a connected city's story before entering ${cityName(cityId) ?? cityId}.`
}

export function venueOpen(state: LifeState, cityId: string, venueId: string): 'story_locked' | null {
  if (state.story.mode !== 'story') return null
  const helper = state.story.helper
  const venue = venueFor(cityId, venueId)
  if (helperActive(state) && helper?.city === cityId && (helper.venue === venueId || helper.kind === 'errand' && venueId !== 'home' && venue && !venue.cities)) return null
  const content = cachedCityContent(cityId)
  if (!venue || venueChapter(cityId, venue, content) <= chapterOf(state, cityId)) return null
  return 'story_locked'
}

export function venueBlockReason(state: LifeState, cityId: string, venueId: string): string {
  const venue = venueFor(cityId, venueId), need = venue ? venueChapter(cityId, venue, cachedCityContent(cityId)) : 4
  return `${venue?.label ?? venueId} opens at chapter ${need}: ${STORY_CHAPTERS[need]}.`
}

export function nextStep(state: LifeState, cityId: string): string {
  const tally = receiptsFor(state, cityId), chapter = chapterOf(state, cityId)
  if (chapter === 0) return `Finish the first two chapters of ${cityName(cityId) ?? cityId}'s city tale.`
  if (chapter === 1) return `Finish the city tale and ${Math.max(0, 3 - tally.missions.length)} more local missions.`
  if (chapter === 2) return `Finish the country tale, six local missions and visit six venues.`
  if (chapter === 3) return tally.roots || tally.missions.length >= 8
    ? 'Complete the city tales collection.'
    : `Finish a Roots help challenge or ${Math.max(0, 8 - tally.missions.length)} more local missions.`
  return 'This city is complete. Its connected cities are open.'
}

export function storySignature(cityId: string) {
  return signatureFor(cityId, cachedCityContent(cityId))
}
