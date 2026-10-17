import assert from 'node:assert/strict'
import test from 'node:test'
import type { CityContent, VenueDefinition } from '../types/content.ts'
import { WORLD_STORY_SEEDS } from '../game/content/world-progression.generated.ts'
import { proofVenues, venueChapter } from './slots.ts'
import { signatureKindFor } from './signatures.ts'

const venue = (id: string, category: VenueDefinition['category'] = 'civic', kind: VenueDefinition['scene']['kind'] = 'office') => ({ id, category, scene: { kind } })

test('every authored city opens every tale proof destination at chapter zero', () => {
  for (const seed of WORLD_STORY_SEEDS) {
    assert.deepEqual([...proofVenues(seed.cityId)].sort(), [...new Set([seed.host.venue, seed.practical.venue, seed.discovery.venue])].sort())
    for (const id of proofVenues(seed.cityId)) assert.equal(venueChapter(seed.cityId, venue(id), null), 0, `${seed.cityId}/${id}`)
    assert.equal(venueChapter(seed.cityId, venue('home', 'home', 'home'), null), 0, `${seed.cityId}/home`)
  }
})

test('chapter zero includes one market or meal even when it is not a tale proof venue', () => {
  const market = venue('central-market', 'civic', 'market')
  const meal = venue('city-meal', 'food', 'buka')
  const content = { venues: [{ id: market.id, kind: 'market', definition: market }, { id: meal.id, kind: 'buka', definition: meal }] } as unknown as CityContent
  assert.equal(venueChapter('kano', market, content), 0)
})

test('Nigerian signature choices stay hand picked and every city receives a stable style', () => {
  assert.equal(signatureKindFor('lagos'), 'arena-race')
  assert.equal(signatureKindFor('kano'), 'haggle')
  assert.equal(signatureKindFor('ibadan'), 'tables')
  assert.equal(signatureKindFor('port-harcourt'), 'business')
  assert.equal(signatureKindFor('abuja'), 'politics')
  assert.equal(signatureKindFor('calabar'), 'festival')
  for (const seed of WORLD_STORY_SEEDS) assert.equal(signatureKindFor(seed.cityId), signatureKindFor(seed.cityId))
})
