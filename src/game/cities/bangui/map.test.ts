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

test('bangui: opened content and map contracts hold for the real-place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('bangui: each venue has a recorded source place and the road hub keeps the source station name', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  for (const venue of venues) {
    assert.doesNotMatch(venue.name, /game venue|starter/iu, venue.id)
    assert.doesNotMatch(venue.district, /starter/iu, venue.id)
  }
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} keeps its id`)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), `${slot} uses a source place`)
  }
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  assert.ok(PLACES.length >= 20, `${PLACES.length} named source venues`)
  assert.equal(new Set(PLACES.map(place => place.osm)).size, PLACES.length, 'no source element is used twice')
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length, 'no place name is repeated')
  assert.equal(city.rules.hub.road, 'Terminal Nord')
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name)
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat })
  const kinds = new Set(venues.map(venue => venue.kind))
  for (const kind of ['airport', 'hub', 'hospital', 'market', 'worship', 'office', 'viewing', 'walk']) assert.ok(kinds.has(kind as never), kind)
})

test('bangui: source names, river geometry and roads remain grounded in the supplied layers', async () => {
  const expectedNames = new Set(['Point Kilométre 0', 'PK5', 'Lakouanga'])
  assert.deepEqual(new Set(TERRAIN.names.filter(name => name.kind === 'neighbourhood').map(name => name.name)), expectedNames)
  assert.ok(TERRAIN.names.some(name => name.kind === 'water' && name.name === 'M’Pama'))
  assert.ok(TERRAIN.roads.length >= 100, `${TERRAIN.roads.length} source-backed main road rows`)
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(geometry.water.length > 0, 'mapped water is drawn')
  assert.match(geometry.source, /Geofabrik Central African Republic 2026-10-09/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 100 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.some(label => !label.water && expectedNames.has(label.name)), 'a real neighbourhood label survives the collision filter')
  assert.ok(scene.districts.filter(label => !label.water).every(label => expectedNames.has(label.name)), 'every neighbourhood plate uses a source label')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('bangui: the built city stays inside triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => (child as { isMesh?: boolean }).isMesh).length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})
