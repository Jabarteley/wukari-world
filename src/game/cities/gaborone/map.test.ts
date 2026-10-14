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

test('gaborone: the opened content and map contracts hold for the real-place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('gaborone: every sourced game venue keeps its id and cached place evidence', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const venue of venues) {
    if (venue.id !== ids.polling) {
      assert.doesNotMatch(venue.name, /game venue|starter/iu, venue.id)
      assert.doesNotMatch(venue.district, /starter/iu, venue.id)
    }
  }
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} keeps its id`)
    if (slot !== 'airport' && slot !== 'polling') assert.ok(PLACES.some(place => place.slot === slot), `${slot} is a real place`)
  }
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length, 'no place twice')
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name, 'the early road hub name is the real station')
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat }, 'the arrival point is the sourced airport point')
  assert.ok(venues.some(venue => venue.kind === 'airport'))
  assert.ok(venues.some(venue => venue.kind === 'hub'))
  assert.ok(venues.some(venue => venue.kind === 'hospital'))
  assert.ok(venues.some(venue => venue.kind === 'market'))
  assert.ok(venues.some(venue => venue.kind === 'worship'))
  assert.ok(venues.some(venue => venue.kind === 'quad'))
  assert.ok(venues.some(venue => venue.kind === 'viewing'))
  assert.ok(venues.some(venue => venue.kind === 'walk'))
})

test('gaborone: the map has the outline, inland water, main roads and neighbourhood names', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'water is drawn')
  assert.ok(TERRAIN.roads.length >= 150, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 5)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 8 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'neighbourhood names are on the ground')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('gaborone: the built city stays inside the triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => Reflect.get(child, 'isMesh') === true).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})
