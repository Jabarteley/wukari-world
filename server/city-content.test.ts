import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife } from '../src/life.ts'
import { loadCityContent } from '../src/game/cities/registry.ts'
import { prepareSessionCities, requireSessionCities, sessionCityIds } from './city-content.ts'
import type { SessionRecord } from './types.ts'

test('preparation covers current, away and archived lives without changing saved records or receipts', async () => {
  await loadCityContent('lagos')
  const state = createLife(null, { cityId: 'lagos', now: 1_800_000_000_000 })
  const session: SessionRecord = {
    secret: 'test-city-content', publicId: 'test-player', name: 'Player', expiresAt: 1_900_000_000_000,
    cities: { lagos: { state, updatedAt: state.t, salt: '0123456789abcdef' } }, actions: {},
    legacyLives: { 'ibadan:123': { state: { ...state, estate: { ...state.estate, city: 'ibadan' } }, updatedAt: state.t, salt: 'fedcba9876543210' } },
    legacyLifeCities: { 'ibadan:123': 'ibadan' },
  }
  const saved = JSON.stringify(session)
  assert.deepEqual(sessionCityIds(session, ['abuja']), ['abuja', 'lagos', 'ibadan'])
  assert.throws(() => requireSessionCities(session, ['abuja']), { code: 'city_content_unavailable', status: 503 })
  assert.equal(JSON.stringify(session), saved)
  await prepareSessionCities(session, ['abuja'])
  assert.doesNotThrow(() => requireSessionCities(session, ['abuja']))
  assert.equal(JSON.stringify(session), saved)
})

test('only registered city ids are accepted as preparation inputs', () => {
  assert.deepEqual(sessionCityIds(undefined, ['lagos', 'lagos', '../private', null, 1]), ['lagos'])
})
