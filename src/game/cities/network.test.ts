// The world city network is not part of a resident's startup (src/game/cities/registry.ts, network.ts). In Node it is in from the
// start, so these tests unload it to run as the browser does before loadCityNetwork() has settled: the synchronous readers of the
// network must refuse (never answer with partial data), and a resident's life must build and show with the startup index alone.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CityNetworkNotReadyError, allCityLinks, catalogueCitiesInState, cityCatalogue, cityCatalogueEntry, cityLinks, cityName, cityNetworkReady,
  isCityId, isKnownCityId, knownCities, knownCityIds, linksFrom, loadCityContent, loadCityNetwork, loadCityRules, playableCityIds,
  registeredCityIds, unloadCityNetworkForTest,
} from './registry.ts'
import { CITY_INDEX, CITY_WORLD_FIGURES } from './catalogue.ts'
import { CITY_CATALOGUE } from './network.ts'
import { lifeNeedsCityNetwork, loadLifeCities } from './lifeCities.ts'
import { worldFigures } from '../../app/features/start/entryModel.ts'
import { helpOf } from '../../app/features/relief/reliefHelp.ts'
import { createLife, viewLife } from '../../life.ts'
import { makeContext } from '../util.ts'
import type { LifeState } from '../../types/life.ts'

await Promise.all([loadCityRules('lagos'), loadCityRules('ibadan'), loadCityContent('lagos'), loadCityContent('ibadan')])
const ctx = (cityId = 'lagos') => makeContext({ now: Date.UTC(2026, 0, 5, 8), cityId, seed: 'network' })
/** A life settled at home in Lagos: the resident path. */
function resident(): LifeState {
  const state = createLife(null, ctx())
  state.estate.home = 'lagos'
  return state
}
/** Run `body` as the browser does before the network is in; the network is put back afterwards. */
async function withoutNetwork(body: () => void | Promise<void>): Promise<void> {
  const unloaded = unloadCityNetworkForTest()
  try { await body() } finally { unloaded.dispose() }
}

test('every synchronous reader of the world network refuses before it is in, with a clear error', async () => {
  await withoutNetwork(() => {
    assert.equal(cityNetworkReady(), false)
    const readers: [string, () => unknown][] = [
      ['cityCatalogue', () => cityCatalogue()], ['cityCatalogueEntry', () => cityCatalogueEntry('ibadan')], ['catalogueCitiesInState', () => catalogueCitiesInState('oyo')],
      ['knownCities', () => knownCities()], ['allCityLinks', () => allCityLinks()], ['cityLinks', () => cityLinks('lagos')], ['linksFrom', () => linksFrom('lagos')],
    ]
    for (const [name, read] of readers) {
      assert.throws(read, (error: unknown) => error instanceof CityNetworkNotReadyError && error.code === 'city_network_not_ready' && /await loadCityNetwork\(\)/.test(error.message), `${name} refuses`)
    }
  })
  assert.equal(cityNetworkReady(), true)
})

test('the startup index answers the id and name readers without the network, exactly as the network does', async () => {
  const withNetwork = { known: knownCityIds(), registered: registeredCityIds(), playable: playableCityIds(), names: knownCityIds().map((id) => cityName(id)) }
  assert.deepEqual(withNetwork.known, CITY_CATALOGUE.map((city) => city.id), 'known ids are the catalogue, in its order')
  assert.deepEqual(withNetwork.registered, CITY_CATALOGUE.filter((city) => city.open).map((city) => city.id))
  assert.deepEqual(withNetwork.names, CITY_CATALOGUE.map((city) => city.name))
  await withoutNetwork(() => {
    assert.deepEqual({ known: knownCityIds(), registered: registeredCityIds(), playable: playableCityIds(), names: knownCityIds().map((id) => cityName(id)) }, withNetwork)
    for (const city of CITY_CATALOGUE) {
      assert.equal(isCityId(city.id), city.open, `${city.id} open`)
      assert.equal(isKnownCityId(city.id), true, `${city.id} known`)
    }
    assert.equal(isCityId('atlantis'), false)
    assert.equal(cityName('atlantis'), null)
  })
})

test('the startup index and the landing figures are generated from the same catalogue as the network', () => {
  assert.deepEqual(CITY_INDEX.map((city) => [city.id, city.name]), CITY_CATALOGUE.filter((city) => city.open).map((city) => [city.id, city.name]))
  assert.deepEqual(CITY_WORLD_FIGURES, worldFigures(CITY_CATALOGUE))
})

test('a resident life builds, shows and reads its relief card with the startup index alone; its travel list waits for the network', async () => {
  const state = resident()
  assert.equal(lifeNeedsCityNetwork(state), false)
  const loaded = viewLife(state, ctx()).estate.links
  assert.ok(loaded && loaded.length > 0, 'with the network the travel list is there')
  await withoutNetwork(async () => {
    await loadLifeCities(structuredClone(state))
    assert.equal(cityNetworkReady(), false, 'loading a resident life does not fetch the network')
    const rebuilt = createLife(structuredClone(state), ctx())
    const view = viewLife(rebuilt, ctx())
    assert.equal(view.estate.links, null, 'the travel list is null, never partial, until the network is in')
    assert.equal(view.estate.ride.offer, null)
    assert.equal(view.estate.ride.journey, null)
    rebuilt.needs.hunger = 5; rebuilt.cash = 0
    assert.ok(helpOf(rebuilt, ctx()), 'the relief card of a resident needs no network')
  })
})

test('a life away from home, on a trip or owing a ride loads the network before it is rebuilt', async () => {
  const visitor = resident(); visitor.estate.city = 'ibadan'; visitor.estate.lga = null
  const travelling = resident(); travelling.activeAction = { kind: 'intercity', id: 'ibadan', duration: 30, remaining: 30, mode: 'road', fare: 3500, from: 'lagos' }
  const owing = resident(); owing.travel.rideDebt = 1000
  for (const [what, state] of [['visitor', visitor], ['travelling', travelling], ['owing', owing]] as const) {
    assert.equal(lifeNeedsCityNetwork(state), true, what)
    await withoutNetwork(async () => {
      await loadLifeCities(structuredClone(state))
      assert.equal(cityNetworkReady(), true, `${what}: loaded`)
    })
  }
  for (const odd of [null, 'x', {}, { estate: {} }, { estate: { city: 'lagos' }, activeAction: 'x' }, { estate: { city: 'lagos' }, travel: 'x' }]) assert.equal(lifeNeedsCityNetwork(odd), true, 'anything unreadable counts as needing it')
})

test('loadCityNetwork is idempotent and fills the authored routes', async () => {
  await withoutNetwork(async () => {
    await Promise.all([loadCityNetwork(), loadCityNetwork()])
    assert.equal(cityNetworkReady(), true)
    assert.ok(linksFrom('lagos').some((link) => link.to === 'ibadan' && link.mode === 'rail'))
    assert.equal(cityCatalogueEntry('ibadan')?.state.id, 'oyo')
  })
})
