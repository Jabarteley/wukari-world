// The readers that run at mount (the tour, the map level chip, the companion's snapshot) before the whole city index has arrived:
// they answer with the cities known so far, never throw and never report; once the index loads they give the full list.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cityIndexReady, loadCityIndex, playableCityIds, playableCityIdsSoFar, startupCityIndexForTest } from '../game/cities/registry.ts'
import { openWorld } from './features/tour/tourWorld.ts'
import { openCityIds } from './openCities.ts'

test('before the city index is loaded the open-city readers do not throw or report, and after it they list every open city', async () => {
  const whole = [...playableCityIds()]
  const startup = new Set(whole.filter((id, at) => at < 3))
  assert.ok(whole.length > startup.size, 'the world has more open cities than the startup index')
  const errors: unknown[] = [], real = console.error
  console.error = (...args: unknown[]) => { errors.push(args) }
  const browser = startupCityIndexForTest((id) => startup.has(id))
  try {
    assert.equal(cityIndexReady(), false)
    assert.throws(() => playableCityIds(), /needs the whole city index/, 'the guarded reader still refuses')
    assert.deepEqual([...playableCityIdsSoFar()], whole.filter((id) => startup.has(id)))
    assert.deepEqual([...openCityIds()], whole.filter((id) => startup.has(id)))
    const early = openWorld(whole[0]!)
    assert.deepEqual(early.cities.length, startup.size - 1)
    assert.equal(typeof early.country, 'string')
    await loadCityIndex()
    assert.equal(cityIndexReady(), true)
    assert.deepEqual([...openCityIds()], whole)
    assert.equal(openWorld(whole[0]!).cities.length, whole.length - 1)
  } finally { console.error = real; browser.dispose() }
  assert.deepEqual(errors, [])
})
