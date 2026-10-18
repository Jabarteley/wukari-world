import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife, dispatch, makeContext, viewLife } from '../life.ts'
import { linksFrom, loadCityContent, playableCityIds } from '../game/cities/registry.ts'
import { publicArrivalVenue } from '../game/cities/runtime.ts'
import { arriveInCity } from '../game/api.ts'
import { settleCity } from '../../server/life-service.ts'
import type { ActionBody } from '../types/actions.ts'
import type { LifeState, WorldCityId } from '../types/life.ts'
import type { SessionRecord } from '../../server/types.ts'

const NOW = 1_000_000
await Promise.all(['lagos', 'ibadan'].map(loadCityContent))

const context = (storyMode: boolean, cityId: WorldCityId = 'lagos', internal = false) => ({
  now: NOW,
  cityId,
  storyMode,
  seed: `story-doors-${cityId}-${storyMode}`,
  ...(internal ? { internal: true } : {}),
})

function life(mode: 'free' | 'story', cityId: WorldCityId = 'lagos'): LifeState {
  const state = createLife({ cash: 1_000_000 }, context(true, cityId))
  state.story.mode = mode
  state.story.start = cityId
  return state
}

function send(state: LifeState, body: ActionBody, storyMode: boolean, internal = false) {
  return dispatch(state, body, context(storyMode, state.estate.city, internal))
}

function assertStoryDoor(body: ActionBody, make: () => LifeState, internal = false): void {
  const story = make()
  assert.equal(send(story, body, true, internal).code, 'story_locked')

  const free = make()
  free.story.mode = 'free'
  assert.notEqual(send(free, body, true, internal).code, 'story_locked')

  const disabled = make()
  assert.notEqual(send(disabled, body, false, internal).code, 'story_locked')
}

test('relocation blocks both linked and unlinked city doors only while Story mode is active', () => {
  const linked = linksFrom('ibadan').find(row => row.to === 'lagos')
  assert.ok(linked)
  const linkedBody: ActionBody<'estate.relocate'> = { type: 'estate.relocate', payload: { to: linked.to, mode: linked.mode } }
  assertStoryDoor(linkedBody, () => life('story', 'ibadan'))

  const linkedCities = new Set(linksFrom('ibadan').map(row => row.to))
  const unlinked = playableCityIds().find(city => city !== 'ibadan' && !linkedCities.has(city))
  assert.ok(unlinked)
  const unlinkedBody: ActionBody<'estate.relocate'> = { type: 'estate.relocate', payload: { to: unlinked, mode: 'air' } }
  assertStoryDoor(unlinkedBody, () => life('story', 'ibadan'))
})

test('server joins cannot cross a locked city or enter a locked local venue', () => {
  const cityJoin: ActionBody<'social.server'> = {
    type: 'social.server',
    payload: { op: 'join', city: 'ibadan', venue: publicArrivalVenue('ibadan').id, name: 'A friend' },
  }
  assertStoryDoor(cityJoin, () => life('story'), true)

  const sample = life('story')
  const story = viewLife(sample, context(true)).story
  assert.ok(story.enabled)
  const locked = story.venues.find(row => row.locked)
  assert.ok(locked)
  const venueJoin: ActionBody<'social.server'> = {
    type: 'social.server',
    payload: { op: 'join', city: 'lagos', venue: locked.id, name: 'A friend' },
  }
  assertStoryDoor(venueJoin, () => life('story'), true)
})

test('the homeward and street doors use the same Story locks', () => {
  const away = () => {
    const state = life('story')
    arriveInCity(state, { id: 'ibadan', mode: 'road' }, makeContext(context(true)), publicArrivalVenue('ibadan').id)
    state.story.start = 'ibadan'
    state.cash = 0
    return state
  }
  const sample = away()
  const quote = viewLife(sample, context(true, 'ibadan')).estate.ride.journey
  assert.ok(quote)
  const homeward: ActionBody<'homeward.accept'> = { type: 'homeward.accept', payload: { quote: quote.key } }
  assertStoryDoor(homeward, away)

  const streetLife = () => {
    const state = life('story')
    state.location = 'city-street'
    state.spot = null
    return state
  }
  const streetSample = streetLife()
  const story = viewLife(streetSample, context(true)).story
  assert.ok(story.enabled)
  const locked = story.venues.find(row => row.locked)
  assert.ok(locked)
  const street: ActionBody<'street.place'> = { type: 'street.place', payload: { from: 'city-street', to: locked.id } }
  assertStoryDoor(street, streetLife, true)
})

test('server settlement cannot open an arbitrary city around the Story door', () => {
  const session: SessionRecord = {
    secret: 'story-door-test', publicId: 'story-door-public', name: 'Player', expiresAt: 1e15, cities: {}, actions: {},
  }
  settleCity(session, 'lagos', NOW, true)
  assert.throws(() => settleCity(session, 'ibadan', NOW + 1, true), { code: 'city_moved', city: 'lagos' })
  assert.deepEqual(Object.keys(session.cities), ['lagos'])
})
