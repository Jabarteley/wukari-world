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

test('kinshasa: the opened content and map contracts hold for the real-place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('kinshasa: every game venue is a real named place with a recorded OpenStreetMap source, and the ids a saved life uses are unchanged', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  for (const venue of venues) {
    assert.doesNotMatch(venue.name, /game venue|starter/iu, venue.id)
    assert.doesNotMatch(venue.district, /starter/iu, venue.id)
  }
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} keeps its id`)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), `${slot} is a real place`)
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
  const kinds = new Set(venues.map(venue => venue.kind))
  for (const kind of ['airport', 'hub', 'hospital', 'market', 'worship', 'quad', 'viewing', 'walk']) assert.ok(kinds.has(kind as never), kind)
})

test('kinshasa: the map has the outline, the Congo River, main roads and neighbourhood names, and stays within the geometry bounds', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'water is drawn')
  assert.ok(TERRAIN.roads.length >= 60, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 10)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 60 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'neighbourhood names are on the ground')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('kinshasa: the built city stays inside the triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => (child as { isMesh?: boolean }).isMesh).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})


test('kinshasa: the airport has at least 900 metres of clearance inside the sourced play bounds', () => {
  const [west, south, east, north] = FACTS.bounds
  const lonScale = 111320 * Math.cos(FACTS.airport.lat * Math.PI / 180)
  const clearances = [(FACTS.airport.lon - west) * lonScale, (east - FACTS.airport.lon) * lonScale, (FACTS.airport.lat - south) * 110574, (north - FACTS.airport.lat) * 110574]
  assert.ok(Math.min(...clearances) >= 900, `${Math.min(...clearances)} metres`)
  assert.ok(PLACES.length >= 20)
})
