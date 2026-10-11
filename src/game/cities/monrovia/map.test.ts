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

test('monrovia: opened content and map contracts hold', async () => {
  const map = await city.loadMap()
  await assertCityMapContract(city, map)
  assertCityContentContract(city, await city.loadContent(), { profile: 'opened' })
})

test('monrovia: source places are unique, named and retain the airport inside the map bounds', async () => {
  const content = await city.loadContent()
  const venues = content.venues.filter(venue => venue.id !== 'home')
  assert.ok(PLACES.length >= 20, `${PLACES.length} source places`)
  assert.equal(new Set(PLACES.map(place => place.osm)).size, PLACES.length, 'each source element is used once')
  for (const place of PLACES) {
    assert.match(place.osm, /^(node|way|relation)\/\d+$/u, place.name)
    const venue = venues.find(item => item.name === place.name)
    assert.ok(venue, `${place.osm} ${place.name} becomes a venue`)
    assert.equal(venue.kind, place.kind, `${place.osm} keeps its scene kind`)
  }
  for (const venue of venues) {
    assert.doesNotMatch(venue.name, /game venue|starter/iu, venue.id)
    assert.doesNotMatch(venue.district, /starter/iu, venue.id)
  }
  const named = new Map(venues.map(venue => [venue.id, venue]))
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(named.has(id), slot)
    if (slot !== 'airport') assert.ok(PLACES.some(place => place.slot === slot), slot)
  }
  assert.equal(city.rules.hub.road, PLACES.find(place => place.slot === 'transit')?.name, 'road hub follows the selected source name')
  assert.equal(FACTS.names?.roadHub, PLACES.find(place => place.slot === 'transit')?.name, 'facts road hub is the exact source name')
  const airport = named.get(ids.airport)
  assert.equal(airport?.name, FACTS.airport.name)
  assert.deepEqual(airport?.position, { kind: 'lon-lat', lon: FACTS.airport.lon, lat: FACTS.airport.lat })
  const [west, south, east, north] = FACTS.bounds
  const lonMetres = 111_320 * Math.cos(FACTS.airport.lat * Math.PI / 180)
  const airportMargin = Math.min((FACTS.airport.lon - west) * lonMetres, (east - FACTS.airport.lon) * lonMetres,
    (FACTS.airport.lat - south) * 110_574, (north - FACTS.airport.lat) * 110_574)
  assert.ok(airportMargin >= 900, `airport is ${Math.round(airportMargin)} m inside the play bounds`)
})

test('monrovia: coast water, roads and neighbourhood names load into the scene', async () => {
  const map = await city.loadMap()
  const geometry = await map.loadGeometry()
  assert.ok(GEOMETRY.land.length > 0 && GEOMETRY.land.every(polygon => polygon[0] && polygon[0].length >= 4))
  assert.ok(TERRAIN.water.length > 0 && TERRAIN.reachWater.length > 0)
  assert.ok(TERRAIN.roads.length >= 20, `${TERRAIN.roads.length} road rows`)
  assert.ok(TERRAIN.names.length >= 5)
  assert.match(geometry.source, /OpenStreetMap/u)
  const scene = await map.loadScene()
  assert.ok(scene.roads.length >= 20)
  assert.ok(scene.water?.length)
  assert.ok(scene.districts.length >= 5)
  assert.equal(scene.lgas[0]?.name, FACTS.names?.area)
})
