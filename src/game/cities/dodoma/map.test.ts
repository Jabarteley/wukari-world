import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { destinationVenueIds } from '../africa/types.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'

const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)

test('dodoma: the opened content and map contracts hold for the real-place map', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('dodoma: sourced places, transit name and airport clearance agree', async () => {
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
  assert.ok(PLACES.length >= 20, `${PLACES.length} real sourced venues`)
  assert.equal(new Set(PLACES.map(place => place.name)).size, PLACES.length, 'no place twice')
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name, 'the road hub uses the source terminal name')
  assert.equal(FACTS.names?.roadHub, PLACES.find(place => place.slot === 'transit')?.name, 'the early road hub is the same source name')
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat }, 'the arrival point is the sourced airport point')
  const latitudeMetres = 110_574
  const longitudeMetres = 111_320 * Math.cos(FACTS.airport.lat * Math.PI / 180)
  const margins = [(FACTS.airport.lon - FACTS.bounds[0]) * longitudeMetres, (FACTS.bounds[2] - FACTS.airport.lon) * longitudeMetres, (FACTS.airport.lat - FACTS.bounds[1]) * latitudeMetres, (FACTS.bounds[3] - FACTS.airport.lat) * latitudeMetres]
  assert.ok(Math.min(...margins) >= 900, `${margins.map(value => Math.round(value)).join(', ')} metre airport margins`)
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u)
    assert.ok(place.lon >= FACTS.bounds[0] && place.lon <= FACTS.bounds[2] && place.lat >= FACTS.bounds[1] && place.lat <= FACTS.bounds[3], place.name)
  }
  const kinds = new Set(venues.map(venue => venue.kind))
  for (const kind of ['airport', 'hub', 'hospital', 'market', 'worship', 'office', 'viewing', 'walk']) assert.ok(kinds.has(kind as never), kind)
})

test('dodoma: the inland map contains sourced water, roads and neighbourhood names', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(geometry.water.length > 0, 'mapped inland water is drawn')
  assert.ok(TERRAIN.roads.length > 0, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 5, `${TERRAIN.names.length} sourced neighbourhood labels`)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length > 0 && scene.water && scene.water.length > 0)
  assert.ok(scene.districts.length >= 5, 'at least five neighbourhood labels survive collision filtering')
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
  const size = JSON.stringify(TERRAIN).length + JSON.stringify(GEOMETRY).length
  assert.ok(size < 400_000, `${size} bytes of map data`)
})
