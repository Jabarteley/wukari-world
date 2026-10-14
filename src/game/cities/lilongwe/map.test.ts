import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { destinationVenueIds } from '../africa/types.ts'
import { buildCity, CITY_TRIANGLE_BUDGET } from '../../../map3d/city-build.ts'
import { buildNetwork } from '../../../map3d/roads.ts'
import { createKit } from '../../../scene/kit.ts'
import { CITY_DRAW_CALLS } from '../../../budgets.ts'
import { KINDS } from '../../../scene/venue-scenes.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'

const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)

test('lilongwe: real place content and map contracts hold', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id}`)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), `${slot} has a source place`)
  }
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  assert.ok(PLACES.length >= 20, `${PLACES.length} source-backed places`)
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length)
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name)
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat })
  const [west, south, east, north] = FACTS.bounds
  assert.ok(FACTS.airport.lon >= west + 0.008 && FACTS.airport.lon <= east - 0.008)
  assert.ok(FACTS.airport.lat >= south + 0.008 && FACTS.airport.lat <= north - 0.008)
  for (const venue of venues) assert.ok(KINDS.includes(venue.kind), `${venue.id} scene kind ${venue.kind}`)
})

test('lilongwe: terrain contains mapped water, roads and neighbourhood labels', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'water is drawn')
  assert.ok(TERRAIN.roads.length >= 50, `${TERRAIN.roads.length} road rows`)
  assert.equal(TERRAIN.names.length, 3)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 8)
  assert.ok(geometry.water.length > 0)
  assert.ok(scene.districts.length >= 2)
  assert.match(geometry.source, /OpenStreetMap/u)
  const size = new TextEncoder().encode(JSON.stringify(TERRAIN)).byteLength + new TextEncoder().encode(JSON.stringify(GEOMETRY)).byteLength
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('lilongwe: the built city stays inside the triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => Reflect.get(child, 'isMesh') === true).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})
