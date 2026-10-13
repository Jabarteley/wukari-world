import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'
import { destinationVenueIds } from '../africa/types.ts'

test('willemstad: generated map and content contracts', async () => {
  await assertCityMapContract(city, await city.loadMap())
  const content = await city.loadContent()
  assertCityContentContract(city, content, { profile: 'opened' })
  assert.ok(PLACES.length >= 20)
  assert.equal(new Set(PLACES.map(p => p.osm)).size, PLACES.length)
  assert.equal(new Set(PLACES.map(p => p.name.normalize('NFKC').toLowerCase())).size, PLACES.length)
  const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(content.venues.some(v => v.id === id))
    if (slot !== 'airport') assert.ok(PLACES.some(p => p.slot === slot))
  }
  assert.equal(FACTS.names?.roadHub, PLACES.find(p => p.slot === 'transit')?.name)
  assert.ok(GEOMETRY.land.length > 0)
  assert.ok(TERRAIN.roads.length > 0)
  assert.ok(TERRAIN.names.filter(n => n.kind === 'neighbourhood').length >= 5, 'five source-backed neighbourhood labels remain required')
})
