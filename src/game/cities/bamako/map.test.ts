import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { destinationVenueIds } from '../africa/types.ts'
import { buildCity, CITY_TRIANGLE_BUDGET } from '../../../map3d/city-build.ts'
import { buildNetwork } from '../../../map3d/roads.ts'
import { createKit } from '../../../scene/kit.ts'
import { CITY_DRAW_CALLS } from '../../../budgets.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'

const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)

test('bamako: the opened content and map contracts hold for the sourced map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('bamako: named places retain their source evidence and airport placement', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  const named = new Map(venues.map(venue => [venue.id, venue]))
  assert.ok(PLACES.length >= 20, `${PLACES.length} source-linked places`)
  assert.ok(TERRAIN.names.filter(label => label.kind === 'neighbourhood').length >= 10)
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length, 'each selected source place is distinct')
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} is present`)
    if (slot !== 'airport' && slot !== 'polling') assert.ok(PLACES.some(place => place.slot === slot), `${slot} has a sourced place`)
  }
  assert.equal(named.get(ids.airport)?.name, FACTS.airport.name)
  assert.deepEqual(named.get(ids.airport)?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat })
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name)
})

test('bamako: the map carries valid land, Niger River water, roads and district labels', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'mapped inland water is drawn')
  assert.ok(TERRAIN.roads.length >= 100, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 10)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 100 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'neighbourhood names are on the ground')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('bamako: the built city stays inside the triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => Reflect.get(child, 'isMesh') === true).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})
