import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife, dispatch, advanceLife } from '../../../life.ts'
import { loadCityContent } from '../registry.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'

test('mbabane: air arrival, real meal and return preserve the home', async () => {
  await Promise.all([loadCityContent('lagos'), loadCityContent('mbabane')])
  const link = city.rules.links.find(item => item.mode === 'air')
  assert.ok(link)
  const content = await loadCityContent('mbabane')
  let now = Date.UTC(2026, 9, 11, 9)
  const context = () => ({ cityId: state.estate.city, now, trustedSave: true, seed: 'mbabane-journey' })
  let state = createLife(null, { cityId: 'lagos', now, isNew: true })
  state.onboarding.done = true
  state.cash = 2_000_000
  assert.equal(dispatch(state, { type: 'estate.set-lga', payload: { lga: 'ikeja' } }, context()).ok, true)
  assert.equal(dispatch(state, { type: 'estate.move-in', payload: {} }, context()).ok, true)
  const beforeHome = structuredClone({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living })
  const finish = (): void => {
    for (let iteration = 0; state.activeAction && iteration < 300; iteration += 1) { now += 1000; advanceLife(state, 1, context()) }
    assert.equal(state.activeAction, null)
  }
  const fare = state.cash
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'mbabane', mode: 'air' } }, context()).code, 'departed')
  assert.equal(state.cash, fare - link.fare)
  finish()
  assert.equal(state.estate.city, 'mbabane')
  state = createLife(JSON.parse(JSON.stringify(state)), context())
  const meal = content.venues.find(venue => venue.id === 'mbabane-meal-stop')
  assert.ok(meal)
  assert.equal(dispatch(state, { type: 'travel', payload: { id: meal.id, mode: 'trek' } }, context()).code, 'started')
  finish()
  assert.equal(dispatch(state, { type: 'spot', payload: { id: 'counter' } }, context()).ok, true)
  state.needs.hunger = 10
  assert.equal(dispatch(state, { type: 'activity', payload: { id: 'mbabane-visitor-meal' } }, context()).ok, true)
  finish()
  assert.ok(state.needs.hunger > 10)
  assert.equal(dispatch(state, { type: 'estate.relocate', payload: { to: 'lagos', mode: 'air' } }, context()).code, 'departed')
  finish()
  assert.equal(state.estate.city, 'lagos')
  assert.deepEqual({ lga: state.estate.lga, plot: state.estate.plot, style: state.estate.style, home: state.estate.home, living: state.estate.living }, beforeHome)
  assert.equal(FACTS.airport.id, 'mbabane-airport')
})
