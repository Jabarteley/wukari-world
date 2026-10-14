import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'
import { destinationVenueIds } from '../africa/types.ts'

const EMPTY_SLOTS: readonly string[] = ["community","clinic","recreation","market","worship"]

test('adamstown: generated map and content contracts', async () => {
  await assertCityMapContract(city, await city.loadMap())
  const content = await city.loadContent()
  assertCityContentContract(city, content, { profile: 'opened' })
  assert.ok(PLACES.length >= 3)
  assert.equal(new Set(PLACES.map(p => p.osm)).size, PLACES.length)
  assert.equal(new Set(PLACES.map(p => p.name.normalize('NFKC').toLowerCase())).size, PLACES.length)
  const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(content.venues.some(v => v.id === id))
    if (slot !== 'airport' && !EMPTY_SLOTS.includes(slot)) assert.ok(PLACES.some(p => p.slot === slot))
  }
  // outpost profile: these slots have no honest source, so they keep the game's own fictional venue (recorded in the recipe, the selection and the receipt).
  assert.deepEqual(EMPTY_SLOTS, Object.keys(ids).filter(slot => slot !== 'airport' && !PLACES.some(p => p.slot === slot)))
  for (const slot of EMPTY_SLOTS) assert.ok(content.venues.find(v => v.id === ids[slot as keyof typeof ids])?.name.endsWith('(game venue)'), slot + ' keeps its fictional game venue')
  assert.equal(FACTS.names?.roadHub, PLACES.find(p => p.slot === 'transit')?.name ?? content.venues.find(v => v.id === ids.transit)?.name)
  // outpost profile: travel is restricted to the authored links (charter, ship) plus the Lagos connection.
  assert.equal(FACTS.generatedLinkPolicy, 'authored-only')
  assert.equal(city.rules.generatedLinkPolicy, 'authored-only')
  assert.equal(city.rules.links.length, (FACTS.links?.length ?? 0) + 1)

  assert.ok(GEOMETRY.land.length > 0)
  // outpost profile: a place with no mapped road is allowed (offline-extract.py road ladder down to tracks; none is required).
  assert.ok(TERRAIN.names.filter(n => n.kind === 'neighbourhood').length >= 2, '2 source-backed neighbourhood labels remain required')
})
