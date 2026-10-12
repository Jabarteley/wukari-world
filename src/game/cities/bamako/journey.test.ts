import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife, dispatch, advanceLife } from '../../../life.ts'
import { isKnownCityId, loadCityContent, loadCityLinks } from '../registry.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'

test('bamako: Lagos flight, a real-place meal, save reload and homeward flight preserve the original home', async () => {
  assert.equal(isKnownCityId('bamako'), true, 'Bamako is in the generated city registry')
  await Promise.all([loadCityContent('lagos'), loadCityContent('bamako')])
  const content = await loadCityContent('bamako')
  const links = await loadCityLinks()
  const link = links.find(item => item.mode === 'air' && ((item.a === 'lagos' && item.b === 'bamako') || (item.a === 'bamako' && item.b === 'lagos')))
  assert.ok(link, 'the beta flight between Lagos and Bamako is available')
  let now = Date.UTC(2026, 9, 9, 9)
  let state = createLife(null, { cityId: 'lagos', now, isNew: true })
  state.onboarding.done = true
  state.cash = 2_000_000
  const context = () => ({ cityId: state.estate.city, now, trustedSave: true, seed: 'bamako-journey' })
  assert.equal(dispatch(state, { type: 'estate.set-lga', payload: { lga: 'ikeja' } }, context()).ok, true)
  assert.equal(dispatch(state, { type: 'estate.move-in', payload: {} }, context()).ok, true)
  const beforeHome = structuredClone({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living })
  const finish = (): void => {
    for (let iteration = 0; state.activeAction && iteration < 300; iteration++) { now += 1000; advanceLife(state, 1, context()) }
    assert.equal(state.activeAction, null)
  }
  const fare = state.cash
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'bamako', mode: 'air' } }, context()).code, 'departed')
  assert.equal(state.cash, fare - link.fare)
  finish()
  assert.equal(state.estate.city, 'bamako')
  assert.equal(state.location, city.rules.hubs.find(hub => hub.mode === 'air')?.venueId)
  state = createLife(JSON.parse(JSON.stringify(state)), context())
  const meal = content.venues.find(venue => venue.id === 'bamako-meal-stop')
  assert.ok(meal)
  assert.equal(dispatch(state, { type: 'travel', payload: { id: meal.id, mode: 'trek' } }, context()).code, 'started')
  finish()
  assert.equal(dispatch(state, { type: 'spot', payload: { id: 'counter' } }, context()).ok, true)
  state.needs.hunger = 10
  assert.equal(dispatch(state, { type: 'activity', payload: { id: 'bamako-visitor-meal' } }, context()).ok, true)
  finish()
  assert.ok(state.needs.hunger > 10)
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'lagos', mode: 'air' } }, context()).code, 'departed')
  finish()
  assert.equal(state.estate.city, 'lagos')
  assert.deepEqual({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living }, beforeHome)
  assert.equal(FACTS.airport.id, 'bamako-airport')
})
