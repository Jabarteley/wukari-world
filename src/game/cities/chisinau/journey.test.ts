import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife, dispatch, advanceLife } from '../../../life.ts'
import { loadCityContent } from '../registry.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'

test('chisinau: flight from Lagos, a meal at the real restaurant, saved reload and the homeward flight keep the original home', async () => {
  await Promise.all([loadCityContent('lagos'), loadCityContent('chisinau')])
  const link = city.rules.links.find(item => item.mode === 'air')
  assert.ok(link, 'the flight between Lagos and destination is kept')
  const content = await loadCityContent('chisinau')
  let now = Date.UTC(2026, 9, 9, 9)
  const context = () => ({ cityId: state.estate.city, now, trustedSave: true, seed: 'chisinau-journey' })
  let state = createLife(null, { cityId: 'lagos', now, isNew: true })
  state.onboarding.done = true
  // Fund the two quoted flights on top of the usual 2,000,000 for the move-in and the meal. A fare is 20,000 + 80 per km, so
  // far cities (Pacific, South-East Asia) cost over a million each way and a fixed purse cannot pay for the homeward flight.
  state.cash = 2_000_000 + 2 * link.fare
  assert.equal(dispatch(state, { type: 'estate.set-lga', payload: { lga: 'ikeja' } }, context()).ok, true)
  assert.equal(dispatch(state, { type: 'estate.move-in', payload: {} }, context()).ok, true)
  const beforeHome = structuredClone({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living })
  const finish = (): void => {
    for (let iteration = 0; state.activeAction && iteration < 300; iteration += 1) { now += 1000; advanceLife(state, 1, context()) }
    assert.equal(state.activeAction, null)
  }
  const fare = state.cash
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'chisinau', mode: 'air' } }, context()).code, 'departed')
  assert.equal(state.cash, fare - link.fare)
  finish()
  assert.equal(state.estate.city, 'chisinau')
  assert.equal(state.location, city.rules.hubs.find(hub => hub.mode === 'air')?.venueId)
  state = createLife(JSON.parse(JSON.stringify(state)), context())
  const meal = content.venues.find(venue => venue.id === 'chisinau-meal-stop')
  assert.ok(meal)
  assert.equal(dispatch(state, { type: 'travel', payload: { id: meal.id, mode: 'trek' } }, context()).code, 'started')
  finish()
  assert.equal(dispatch(state, { type: 'spot', payload: { id: 'counter' } }, context()).ok, true)
  state.needs.hunger = 10
  assert.equal(dispatch(state, { type: 'activity', payload: { id: 'chisinau-visitor-meal' } }, context()).ok, true)
  finish()
  assert.ok(state.needs.hunger > 10)
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'lagos', mode: 'air' } }, context()).code, 'departed')
  finish()
  assert.equal(state.estate.city, 'lagos')
  assert.deepEqual({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living }, beforeHome)
  assert.ok(FACTS.airport.id)
})
