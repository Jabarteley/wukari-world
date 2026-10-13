import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_ENTRY_CODES, countryAtlasLevel, mapEntryOf } from './atlasMetadata.ts'
import { catalogueFromRows } from './catalogue.ts'
import { cityCatalogue, registerCityForTest } from './registry.ts'
import { regionEntry } from '../../map3d/regions.ts'
import { fictionalCity } from './testing/fictionalCity.test-fixture.ts'

test('a user-assigned module code reaches the world-map entry it stands for, and nothing else changes', () => {
  assert.deepEqual([mapEntryOf('xs'), mapEntryOf('xn')], ['sol', 'cyn'])
  for (const code of ['so', 'cy', 'ng', 'xk', 'sol', 'cyn', '', 'constructor', '__proto__', 'toString']) assert.equal(mapEntryOf(code), code, code)
  assert.deepEqual([...MAP_ENTRY_CODES].sort(), ['xn', 'xs'])
  // The entries sit on their continent's level (Africa, Asia) whichever form of the id is asked for.
  assert.deepEqual([countryAtlasLevel('xs'), countryAtlasLevel('sol'), countryAtlasLevel('xn'), countryAtlasLevel('cyn')], ['africa', 'africa', 'asia', 'asia'])
  assert.equal(countryAtlasLevel('so'), 'africa')
  assert.equal(countryAtlasLevel('xk'), 'europe')
})

test('a catalogue row of a disputed entry names the map entry, so the atlas opens it', () => {
  const rows = [['hargeisa', 'Hargeisa', 'xs-hargeisa', '', 44.06, 9.56, 1, 'xs', 'Somaliland'], ['kyrenia', 'Kyrenia', 'xn-kyrenia', '', 33.32, 35.34, 1, 'xn', 'Northern Cyprus'],
    ['mogadishu', 'Mogadishu', 'so-mogadishu', '', 45.34, 2.04, 1, 'so', 'Somalia']] as const
  const entries = catalogueFromRows(rows)
  const of = (id: string) => entries.find((entry) => entry.id === id)
  assert.deepEqual([of('hargeisa')?.countryISO, of('hargeisa')?.countryName], ['sol', 'Somaliland'])
  assert.deepEqual([of('kyrenia')?.countryISO, of('kyrenia')?.countryName], ['cyn', 'Northern Cyprus'])
  assert.equal(of('mogadishu')?.countryISO, 'so', 'Somalia keeps its own entry')
})

test('a registered city module with a user-assigned code opens exactly its map entry', (t) => {
  const somaliland = registerCityForTest({ ...fictionalCity, id: 'test-hargeisa', rules: { ...fictionalCity.rules, id: 'test-hargeisa', name: 'Test Hargeisa', state: { id: 'xs-test-hargeisa', name: 'Test Hargeisa', unit: 'district' }, country: { id: 'xs', name: 'Somaliland' }, links: [] } })
  t.after(() => somaliland.dispose())
  assert.equal(cityCatalogue().find((city) => city.id === 'test-hargeisa')?.countryISO, 'sol')
  const sol = regionEntry('country', 'sol')
  assert.deepEqual([sol.status, sol.city, sol.level], ['open', 'test-hargeisa', 'africa'])
  assert.notEqual(regionEntry('country', 'so').city, 'test-hargeisa', 'Somalia is not opened by the Somaliland city')
  assert.notEqual(regionEntry('country', 'xs').status, 'open', 'the module code is not a map entry')
  assert.notEqual(regionEntry('country', 'cyn').status, 'open', 'Northern Cyprus stays closed until its own city exists')
})
