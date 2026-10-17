import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceLife, createLife, dispatch, makeContext, viewLife } from '../life.ts'
import { loadCityContent } from '../game/cities/registry.ts'
import { missionCatalogues } from '../game/systems/missions.ts'
import { publicArrivalVenue } from '../game/cities/runtime.ts'
import { episodesForCity } from '../game/content/episodes.ts'
import { emit } from '../game/registry.ts'

await Promise.all(['lagos', 'ibadan'].map(loadCityContent))

const context = (storyMode: boolean) => ({ now: 1_000_000, cityId: 'lagos', storyMode, seed: 'story-system-test' })

test('new and legacy lives default to free mode with no chosen start', () => {
  const state = createLife(null, context(true))
  assert.deepEqual(state.story, { version: 1, trackingSince: 1_000_000, mode: 'free', start: null, cities: {}, helped: [] })
})

test('the trusted capability controls the mode action and the first switch fixes the start city', () => {
  const state = createLife(null, context(true))
  const hidden = dispatch(state, { type: 'story.mode', payload: { mode: 'story' } }, context(false))
  assert.equal(hidden.ok, false)
  assert.equal(hidden.code, 'story_disabled')
  assert.equal(state.story.mode, 'free')
  const changed = dispatch(state, { type: 'story.mode', payload: { mode: 'story' } }, context(true))
  assert.equal(changed.ok, true)
  assert.equal(state.story.mode, 'story')
  assert.equal(state.story.start, 'lagos')
  assert.equal(viewLife(state, context(true)).story.enabled, true)
  assert.equal(viewLife(state, context(false)).story.enabled, false)
})

test('a helper pass remains bounded in free mode and while the admin capability is off', () => {
  const state = createLife(null, context(true))
  state.story.helper = { session: 'session-1', host: 'host-1', kind: 'two-seat', city: 'lagos', venue: state.location, until: 2_000_000,
    from: { city: 'lagos', venue: state.location, spot: state.spot } }
  const other = viewLife(state, context(true)).travel.destinations.find(row => row.id !== state.location && row.id !== 'home')
  assert.ok(other)
  const result = dispatch(state, { type: 'travel', payload: { id: other.id, mode: 'trek' } }, context(false))
  assert.equal(result.ok, false)
  assert.equal(result.code, 'story_helper_active')
})

test('an errand helper may use other public venues in the host city without opening another city', () => {
  const state = createLife(null, context(true))
  const other = viewLife(state, context(true)).travel.destinations.find(row => row.id !== state.location && row.id !== 'home')
  assert.ok(other)
  state.story.helper = { session: 'session-1', host: 'host-1', kind: 'errand', city: 'lagos', venue: state.location, until: 2_000_000,
    from: { city: 'lagos', venue: state.location, spot: state.spot } }
  const result = dispatch(state, { type: 'travel', payload: { id: other.id, mode: 'trek' } }, context(false))
  assert.notEqual(result.code, 'story_helper_active')
})

test('the street door applies the same Story venue gate as travel', () => {
  const state = createLife(null, context(true))
  assert.equal(dispatch(state, { type: 'story.mode', payload: { mode: 'story' } }, context(true)).ok, true)
  const locked = viewLife(state, context(true)).story.venues.find(venue => venue.locked)
  assert.ok(locked)
  state.location = 'city-street'
  const result = dispatch(state, { type: 'street.place', payload: { from: 'city-street', to: locked.id } }, { ...context(true), internal: true })
  assert.equal(result.code, 'story_locked')
})

test('only an authentic local errand occurrence survives on a Roots receipt', () => {
  const state = createLife(null, context(true))
  const mission = [...missionCatalogues.authoredIds].map(id => missionCatalogues.byId.get(id)).find(row => row?.cityId === 'lagos')
  assert.ok(mission)
  const missionRewardId = `mission:v1:lagos:daily:1:${mission.id}`
  state.story.cities.lagos = { missions: [], venues: [], roots: { id: 'roots-1', kind: 'errand', completedAt: 900_000, missionRewardId } }
  const restored = createLife(structuredClone(state), context(true))
  assert.equal(restored.story.cities.lagos?.roots?.missionRewardId, missionRewardId)
  state.story.cities.lagos.roots = { id: 'roots-2', kind: 'two-seat', completedAt: 900_000, missionRewardId }
  const nonErrand = createLife(structuredClone(state), context(true))
  assert.equal(nonErrand.story.cities.lagos?.roots?.missionRewardId, undefined)
})

function enterHelp(until = 2_000_000) {
  const state = createLife(null, context(true))
  const from = { city: state.estate.city, venue: state.location, spot: state.spot }
  const episode = episodesForCity('ibadan', {}).find(row => row.id === 'place-ibadan-city-story')
  assert.ok(episode)
  const result = dispatch(state, { type: 'story.help.enter', payload: {
    session: 'session-1', host: 'host-1', kind: 'second-answer', city: 'ibadan', venue: episode.location.venue, until,
  } }, { ...context(true), internal: true })
  assert.equal(result.code, 'help_entered')
  return { state, from, episode }
}

test('expired and disabled helper passes restore the exact city, venue and spot', () => {
  for (const storyMode of [true, false]) {
    const until = storyMode ? 1_000_500 : 2_000_000
    const { state, from } = enterHelp(until)
    const result = advanceLife(state, 1, { now: 1_001_000, cityId: 'ibadan', storyMode, seed: `help-return-${storyMode}` })
    assert.equal(result.ok, true)
    assert.equal(state.story.helper, undefined)
    assert.deepEqual({ city: state.estate.city, venue: state.location, spot: state.spot }, from)
  }
})

test('an expired helper pass waits for an active action, then restores after cancellation', () => {
  const { state, from } = enterHelp(1_000_500)
  const call = dispatch(state, { type: 'social.call', payload: { id: 'mummy' } }, { now: 1_000_100, cityId: 'ibadan', storyMode: true, seed: 'help-call' })
  assert.equal(call.code, 'calling')

  advanceLife(state, 1, { now: 1_001_000, cityId: 'ibadan', storyMode: true, seed: 'help-deferred' })
  assert.ok(state.story.helper)
  assert.equal(state.estate.city, 'ibadan')
  assert.equal(state.story.helper.until, 1_000_500)

  assert.equal(dispatch(state, { type: 'cancel' }, { now: 1_001_001, cityId: 'ibadan', storyMode: true, seed: 'help-cancel' }).ok, true)
  advanceLife(state, 1, { now: 1_002_000, cityId: 'ibadan', storyMode: true, seed: 'help-finished' })
  assert.equal(state.story.helper, undefined)
  assert.deepEqual({ city: state.estate.city, venue: state.location, spot: state.spot }, from)
})

test('helper activity produces neither own tale observations nor Story tallies', () => {
  const { state, episode } = enterHelp()
  const helperContext = makeContext({ now: 1_000_100, cityId: 'ibadan', storyMode: true, seed: 'helper-observations', executionOrigin: 'human' })
  const mission = [...missionCatalogues.authoredIds].map(id => missionCatalogues.byId.get(id)).find(row => row?.cityId === 'ibadan')
  assert.ok(mission)
  const scope = missionCatalogues.scopeIds.daily.has(mission.id) ? 'daily' as const : 'weekly' as const
  const before = structuredClone(state.story.cities.ibadan)

  emit(state, 'npc.interacted', { npc: episode.intro.npcId, action: 'hello', success: true }, helperContext)
  emit(state, 'mission.completed', {
    rewardId: `mission:v1:ibadan:${scope}:1:${mission.id}`, id: mission.id, scope, period: 1,
    cityId: 'ibadan', earnedOrigin: 'human', completedAt: helperContext.now,
  }, helperContext)
  emit(state, 'travel.arrived', { venue: publicArrivalVenue('ibadan').id, from: episode.location.venue, mode: 'trek' }, helperContext)

  assert.equal(state.episodes.runs[episode.id], undefined)
  assert.deepEqual(state.story.cities.ibadan, before)
})
