import assert from 'node:assert/strict'
import test from 'node:test'
import type { StreetJourney } from '../street/types.ts'
import type { StoryProgressView } from '../types/story.ts'
import { storyStreetWalkView, type StoryStreetWalkInput } from './streetWalk.ts'

const coverage = [{ cityId: 'lagos', streetVersion: 'street-v1-test', venueIds: ['library'] }]
const story: StoryProgressView = {
  enabled: true, mode: 'story', cityId: 'lagos', start: 'lagos', chapter: 3, chapterLabel: 'Roots', nextStep: 'Finish Roots.',
  progress: { missions: 6, venues: 6 }, signature: { kind: 'haggle', label: 'Haggle', description: 'Practise.', venue: 'market' },
  helped: [], cities: [{ id: 'lagos', label: 'Lagos', chapter: 3, unlocked: true }],
  venues: [{ id: 'library', label: 'The Library', chapter: 3, locked: false, reason: null }],
}
const journeyBase = {
  id: 'journey-one', version: 'street-v1-test', anchor: { lga: 'ikeja', estate: 0, plot: 1 },
  point: { x: 1, z: 2 }, seq: 1, acceptedAt: 1, credit: 0.75,
}
const walking = (city = 'lagos'): StreetJourney => ({ ...journeyBase, kind: 'walking', city })
const venueJourney = (city: string, venue: string): StreetJourney => ({ ...journeyBase, kind: 'venue', city, venue, door: `venue:${venue}` })
const input = (fields: Partial<StoryStreetWalkInput> = {}): StoryStreetWalkInput => ({
  enabled: true, story, currentCityId: 'lagos', currentVenueId: 'neighbourhood', connected: true, activeAction: false,
  visiting: false, pending: false, journey: null, coverage, ...fields,
})

test('offers the existing estate-gate walk for a current Roots city with mapped chapter venues', () => {
  assert.deepEqual(storyStreetWalkView(input()), { kind: 'start', actionLabel: 'Walk into the city', venueCount: 1, reason: null })
  assert.deepEqual(storyStreetWalkView(input({ story: { ...story, chapter: 4, chapterLabel: 'Complete' } })), { kind: 'start', actionLabel: 'Walk into the city', venueCount: 1, reason: null })
})

test('keeps locked, unmapped, disabled, free-roam, and other-city states on the ordinary scene flow', () => {
  const locked: StoryProgressView = { ...story, venues: story.venues.map(row => ({ ...row, locked: true, reason: 'Locked' })) }
  for (const candidate of [
    input({ story: locked }), input({ coverage: [] }), input({ enabled: false }),
    input({ story: { ...story, mode: 'free' } }), input({ currentCityId: 'ibadan' }),
  ]) assert.equal(storyStreetWalkView(candidate), null)
})

test('returns through the exact mapped doorway only for the matching accepted city and venue journey', () => {
  const accepted = venueJourney('lagos', 'library')
  assert.deepEqual(storyStreetWalkView(input({ currentVenueId: 'library', journey: accepted })), {
    kind: 'return', actionLabel: 'Return to the street', venueCount: 1, venueLabel: 'The Library', reason: null,
  })
  assert.deepEqual(storyStreetWalkView(input({ currentVenueId: 'library', journey: venueJourney('lagos', 'market') })), {
    kind: 'mapped-venue', venueLabel: 'The Library',
  })
  assert.deepEqual(storyStreetWalkView(input({ currentVenueId: 'library', journey: venueJourney('ibadan', 'library') })), {
    kind: 'mapped-venue', venueLabel: 'The Library',
  })
})

test('recognises only a current accepted walk and explains public-store refusal conditions', () => {
  assert.equal(storyStreetWalkView(input({ currentVenueId: 'city-street', journey: walking() }))?.kind, 'walking')
  assert.equal(storyStreetWalkView(input({ currentVenueId: 'city-street', journey: walking('ibadan') })), null)
  assert.equal(storyStreetWalkView(input({ connected: false }))?.reason, 'Reconnect to walk into the city.')
  assert.equal(storyStreetWalkView(input({ activeAction: true }))?.reason, 'Finish or cancel your current activity first.')
  assert.equal(storyStreetWalkView(input({ visiting: true }))?.reason, 'Finish this home visit before walking into the city.')
  assert.equal(storyStreetWalkView(input({ pending: true }))?.reason, 'The street is changing. Please wait.')
})
