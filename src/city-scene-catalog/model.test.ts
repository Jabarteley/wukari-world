import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cachedCityContent, cityCatalogue, loadCityContent, loadCityNetwork, playableCityIds } from '../game/cities/registry.ts'
import { GENERATED_CITY_CATALOGUE_ROWS } from '../game/cities/catalogue.generated.ts'
import { catalogueIndex, countryUrl, matches, neighbours, publicVenues, readRoute, sceneUrl } from './model.ts'
import { sceneEvidence } from './evidence.ts'
import { loadCatalogue } from './data.ts'

test('catalogue covers every playable city and source country without loading city content', async () => {
  await loadCityNetwork()
  const ids = playableCityIds(), before = ids.filter(id => cachedCityContent(id))
  const countries = await loadCatalogue(), cities = countries.flatMap(country => country.cities)
  assert.equal(ids.length, 284)
  assert.equal(countries.length, 243)
  assert.equal(cities.length, ids.length)
  assert.deepEqual([...cities.map(city => city.id)].sort(), [...ids].sort())
  assert.deepEqual(ids.filter(id => cachedCityContent(id)), before)
  for (const row of GENERATED_CITY_CATALOGUE_ROWS) {
    const city = cities.find(city => city.id === row[0])
    assert.ok(city, row[0]); assert.equal(city.countryId, row[7] ?? 'ng')
  }
})

test('source country codes retain territories combined by the map', async () => {
  await loadCityNetwork()
  const countries = catalogueIndex(cityCatalogue(), playableCityIds(), GENERATED_CITY_CATALOGUE_ROWS)
  const christmas = countries.find(country => country.id === 'cx'), cocos = countries.find(country => country.id === 'cc')
  assert.ok(christmas); assert.ok(cocos); assert.notEqual(christmas.id, cocos.id)
  for (const city of [...christmas.cities, ...cocos.cities]) assert.equal(cityCatalogue().find(row => row.id === city.id)?.countryISO, 'ioa')
})

test('routes preserve real identifiers, trailing slash and deep-link selection', () => {
  const url = (path: string) => new URL(path, 'https://example.test')
  assert.deepEqual(readRoute(url('/county/')), { page: 'countries' })
  assert.deepEqual(readRoute(url(countryUrl('ng'))), { page: 'cities', countryId: 'ng' })
  assert.deepEqual(readRoute(url(sceneUrl('port-harcourt', 'a&b /?'))), { page: 'scenes', cityId: 'port-harcourt', venueId: 'a&b /?' })
  assert.deepEqual(readRoute(url('/cities/scenes/index.html?city=paris')), { page: 'scenes', cityId: 'paris', venueId: null })
  assert.throws(() => readRoute(url('/unknown')))
  assert.equal(matches('sao', 'São Tomé'), true)
  const rows = [{ id: 'a' }, { id: 'b' }]
  assert.deepEqual(neighbours(rows, 'a'), { previous: null, next: rows[1] })
  assert.deepEqual(neighbours(rows, 'missing'), { previous: null, next: null })
})

test('every public venue is reachable with its exact city and venue identifiers', async t => {
  await loadCityNetwork()
  let venues = 0
  for (const id of playableCityIds()) {
    const content = await loadCityContent(id), publicRows = publicVenues(content)
    assert.ok(publicRows.length > 0, `${id} has public scenes`)
    assert.equal(new Set(publicRows.map(row => row.id)).size, publicRows.length, id)
    for (const venue of publicRows) {
      assert.ok(content.venues.includes(venue))
      assert.deepEqual(readRoute(new URL(sceneUrl(id, venue.id), 'https://example.test')), { page: 'scenes', cityId: id, venueId: venue.id })
      assert.ok(venue.definition.scene.kind)
      venues++
    }
  }
  assert.ok(venues > 284)
  t.diagnostic(`Covered ${playableCityIds().length} cities and ${venues} public venues`)
})

test('names and venue ids do not change shared-builder evidence', () => {
  const first = sceneEvidence({ id: 'first', label: 'A sign', scene: { kind: 'market' } }, null)
  const second = sceneEvidence({ id: 'second', label: 'Another sign', scene: { kind: 'market' } }, null)
  assert.deepEqual(first, second)
  assert.equal(first.source, 'Shared scene builder')
  assert.match(first.detail, /do not establish unique geometry/)
})

test('entry graph loads renderer only after a scene selection and does not load all scenes', async () => {
  const main = await readFile(new URL('./main.ts', import.meta.url), 'utf8')
  assert.ok(main.includes("await import('./renderer.ts')"))
  assert.ok(!/import\s+\{[^}]+\}\s+from\s+['"]\.\/renderer/.test(main))
  const renderer = await readFile(new URL('./renderer.ts', import.meta.url), 'utf8')
  assert.ok(renderer.includes('await loadCityScenes(cityId)'))
  assert.ok(!renderer.includes('loadAllCityScenes'))
})

test('a registered recipe takes precedence over a venue parametric design without a uniqueness claim', async () => {
  const content = await loadCityContent('abakaliki'), venue = content.venues.find(venue => venue.definition.scene.design)
  assert.ok(venue)
  const recipe = { mood: 'outdoor' as const, build() {} }
  assert.equal(sceneEvidence(venue.definition, recipe).source, 'Parametric design')
  const evidence = sceneEvidence(venue.definition, recipe, 'registered-recipe')
  assert.equal(evidence.source, 'Recipe-derived scene')
  assert.match(evidence.detail, /not visual approval, realism or unique geometry/)
  assert.equal(sceneEvidence(venue.definition, null, 'registered-recipe').source, 'Parametric design')
})

test('public venue filtering excludes private homes and city-restricted venues', async () => {
  const content = await loadCityContent('lagos'), original = content.venues[0]!
  const privateHome = { ...original, definition: { ...original.definition, category: 'home' as const } }
  const elsewhere = { ...original, definition: { ...original.definition, cities: ['ibadan'] } }
  const filtered = publicVenues({ ...content, venues: [original, privateHome, elsewhere] })
  assert.deepEqual(filtered, [original])
})
