import assert from 'node:assert/strict'
import test from 'node:test'
import type { EpisodeChapterReceipt, EpisodeId, EpisodeMementoReceipt, EpisodeRun } from '../types/episodes.ts'
import type { LifeState } from '../types/life.ts'
import type { StoryCityReceipts, StoryState } from '../types/story.ts'
import { chapterOf, completedCities, storyBlock, venueOpen } from './ladder.ts'

const NOW = 2_000_000
const city = 'kano'
const receipt = (chapter: 1 | 2): EpisodeChapterReceipt => ({ chapter, completedAt: 100 + chapter, source: 'local-conversation', reference: `proof-${chapter}`, origin: 'human' })
const run = (): EpisodeRun => ({
  id: `place-${city}-city-story`, version: 1, chapter: 3, startedAt: 1, lastSeenAt: 102, choice: 'help', outcomeTags: [],
  receipts: { 1: receipt(1), 2: receipt(2) }, observations: [], assistance: [], completedAt: null, mementoGranted: false,
})
const memento = (kind: 'city' | 'country', at: number): EpisodeMementoReceipt => {
  const id = `place-${city}-${kind}-story` as EpisodeId
  const mementoId = `${id}-memento` as EpisodeMementoReceipt['id']
  return { id: mementoId, version: 1, episodeId: id, episodeVersion: 1, grantedAt: at, origins: ['human'], rewardId: `episode:${id}:v1:memento` }
}
const tally = (missions: number, venues: number, roots = false): StoryCityReceipts => ({
  missions: Array.from({ length: missions }, (_, index) => `mission-${index}`),
  venues: Array.from({ length: venues }, (_, index) => `venue-${index}`),
  ...(roots ? { roots: { id: 'roots-1', kind: 'second-answer' as const, completedAt: 500 } } : {}),
})
const state = (options: { run?: boolean; cityMemento?: number; countryMemento?: number; missions?: number; venues?: number; roots?: boolean; trackingSince?: number; mode?: 'free' | 'story'; tracked?: boolean } = {}): LifeState => {
  const story: StoryState = {
    version: 1, trackingSince: options.trackingSince ?? 50, mode: options.mode ?? 'story', start: city,
    cities: options.tracked === false ? {} : { [city]: tally(options.missions ?? 0, options.venues ?? 0, options.roots) }, helped: [],
  }
  const mementos: Record<string, EpisodeMementoReceipt> = {}
  if (options.cityMemento) mementos[`place-${city}-city-story-memento`] = memento('city', options.cityMemento)
  if (options.countryMemento) mementos[`place-${city}-country-story-memento`] = memento('country', options.countryMemento)
  return { t: NOW, story, episodes: { version: 1, trackingSince: 1, runs: options.run ? { [`place-${city}-city-story`]: run() } : {}, mementos } } as unknown as LifeState
}

test('the ladder is ordered and a completed collection cannot skip earlier chapters', () => {
  assert.equal(chapterOf(state({ cityMemento: 100, countryMemento: 200, missions: 8, venues: 6 }), city), 0)
  assert.equal(chapterOf(state({ run: true }), city), 1)
  assert.equal(chapterOf(state({ run: true, cityMemento: 100, missions: 3 }), city), 2)
  assert.equal(chapterOf(state({ run: true, cityMemento: 100, countryMemento: 200, missions: 6, venues: 6 }), city), 3)
})

test('chapter four needs the collection and either Roots help or eight authored mission occurrences', () => {
  assert.equal(chapterOf(state({ run: true, cityMemento: 100, countryMemento: 200, missions: 8, venues: 6 }), city), 4)
  assert.equal(chapterOf(state({ run: true, cityMemento: 100, countryMemento: 200, missions: 6, venues: 6, roots: true }), city), 4)
})

test('a canonical collection completed before tracking began immediately grandfathers a veteran city', () => {
  const veteran = state({ cityMemento: 100, countryMemento: 200, trackingSince: 1_000, tracked: false })
  assert.equal(chapterOf(veteran, city), 4)
  assert.deepEqual(completedCities(veteran), [city])
})

test('free roam returns before city and venue gates inspect lazy world data', () => {
  const free = state({ mode: 'free' })
  assert.equal(storyBlock(free, 'city-that-is-not-loaded'), null)
  assert.equal(venueOpen(free, city, 'venue-that-is-not-loaded'), null)
})
