import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { destinationVenueIds } from '../africa/types.ts'
import type { SceneKind } from '../../../types/content.ts'
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

test('ouagadougou: opened content and map contracts hold for the PBF place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('ouagadougou: every authored venue has a distinct real place and source element', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), `${slot} venue ${id} keeps its id`)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), `${slot} is sourced`)
  }
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
    assert.doesNotMatch(place.name, /game venue|starter/iu)
    assert.doesNotMatch(place.district, /starter/iu)
  }
  assert.ok(PLACES.length >= 20, `${PLACES.length} real named places`)
  assert.equal(new Set(PLACES.map(place => place.osm)).size, PLACES.length, 'no source element is used twice')
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length, 'no place name is duplicated')
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name)
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat })
  const kinds = new Set<SceneKind>(venues.map(venue => venue.kind))
  for (const kind of ['airport', 'hub', 'hospital', 'market', 'worship', 'quad', 'viewing', 'walk'] as const) assert.ok(kinds.has(kind), kind)
})

test('ouagadougou: the map has safe land, reservoir water, roads and neighbourhood labels', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'mapped water is drawn')
  assert.ok(TERRAIN.roads.length >= 150, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 10)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 150 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'neighbourhood labels are on the ground')
  assert.equal(scene.lgas[0]?.name, FACTS.names.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})

test('ouagadougou: city geometry stays within triangle and draw-call budgets', async () => {
  const pack = await (await city.loadMap()).loadScene()
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} })
  assert.ok(built.triangles > 5000 && built.triangles < CITY_TRIANGLE_BUDGET, `${built.triangles} triangles`)
  const meshes = built.group.children.filter(child => child.type === 'Mesh').length
  assert.ok(meshes <= CITY_DRAW_CALLS.value, `${meshes} draw calls`)
})
