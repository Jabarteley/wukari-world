import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { destinationVenueIds } from '../africa/types.ts'
import { buildCity, CITY_TRIANGLE_BUDGET } from '../../../map3d/city-build.ts'
import { pointInPart } from '../../../map3d/lga.ts'
import { buildNetwork } from '../../../map3d/roads.ts'
import { createKit } from '../../../scene/kit.ts'
import { CITY_DRAW_CALLS } from '../../../budgets.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'

const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)

test('djibouti: opened content and map contracts hold for the sourced real-place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('djibouti: game venues resolve to distinct mapped elements and preserve starter ids', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  const named = new Map(venues.map(venue => [venue.id, venue]))
  assert.ok(PLACES.length >= 20, `${PLACES.length} real mapped places`)
  assert.equal(new Set(PLACES.map(place => place.osm)).size, PLACES.length, 'no source element is reused')
  for (const venue of venues) {
    assert.doesNotMatch(venue.name, /game venue|starter/iu, venue.id)
    assert.doesNotMatch(venue.district, /starter/iu, venue.id)
  }
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} keeps its id`)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), `${slot} is source-backed`)
  }
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name, 'the road hub uses its exact source display name')
  assert.equal(city.rules.hub.road, FACTS.names?.roadHub)
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat }, 'arrival uses the sourced airport point')
})

test('djibouti: mapped water, main roads and neighborhood labels fit the geometry bounds', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'source-mapped water is drawn')
  assert.ok(TERRAIN.roads.length >= 50, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 5)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 50 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'sourced neighborhood names are on the ground')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = new TextEncoder().encode(JSON.stringify(TERRAIN)).length + new TextEncoder().encode(JSON.stringify(GEOMETRY)).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('djibouti: built scene stays within triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5_000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => (child as { isMesh?: boolean }).isMesh).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})


test('djibouti: airport and ordinary district labels stay on dry ground', () => {
  const { lon, lat } = FACTS.airport
  const margins = [(lon - FACTS.bounds[0]) * 111320 * Math.cos(lat * Math.PI / 180), (FACTS.bounds[2] - lon) * 111320 * Math.cos(lat * Math.PI / 180), (lat - FACTS.bounds[1]) * 110574, (FACTS.bounds[3] - lat) * 110574]
  assert.ok(Math.min(...margins) >= 900, `${Math.min(...margins)} metres airport clearance`)
  assert.ok(!TERRAIN.water.some(part => pointInPart(lon, lat, part)), 'airport stays on land')
  for (const label of TERRAIN.names.filter(label => label.kind === 'neighbourhood')) {
    assert.ok(!TERRAIN.water.some(part => pointInPart(label.lon, label.lat, part)), `${label.name} stays on land`)
  }
})
