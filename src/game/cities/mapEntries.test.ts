import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_ENTRY_CODES, countryAtlasLevel, mapEntryOf } from './atlasMetadata.ts'
import { catalogueFromRows } from './catalogueRows.ts'
import { cityCatalogue, registerCityForTest } from './registry.ts'
import { regionEntry } from '../../map3d/regions.ts'
import { fictionalCity } from './testing/fictionalCity.test-fixture.ts'

test('a user-assigned module code reaches the world-map entry it stands for, and nothing else changes', () => {
  assert.deepEqual([mapEntryOf('xs'), mapEntryOf('xn'), mapEntryOf('xg'), mapEntryOf('xa'), mapEntryOf('cx'), mapEntryOf('cc')], ['sol', 'cyn', 'kas', 'atc', 'ioa', 'ioa'])
  for (const code of ['so', 'cy', 'ng', 'xk', 'sol', 'cyn', 'kas', 'atc', 'ioa', 'aq', 'in', 'pk', 'au', '', 'constructor', '__proto__', 'toString']) assert.equal(mapEntryOf(code), code, code)
  assert.deepEqual([...MAP_ENTRY_CODES].sort(), ['cc', 'cx', 'xa', 'xg', 'xn', 'xs'])
  // The Siachen Glacier sits on the Asia level, the Ashmore and Cartier Islands on Oceania, whichever form of the id is asked for.
  assert.deepEqual([countryAtlasLevel('xg'), countryAtlasLevel('kas'), countryAtlasLevel('xa'), countryAtlasLevel('atc')], ['asia', 'asia', 'oceania', 'oceania'])
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
  // The released Hargeisa (release M) may open the entry first; either way it is a city of the entry, never of Somalia.
  assert.deepEqual([sol.status, sol.level], ['open', 'africa'])
  assert.equal(cityCatalogue().find((city) => city.id === sol.city)?.countryISO, 'sol')
  assert.notEqual(regionEntry('country', 'so').city, 'test-hargeisa', 'Somalia is not opened by the Somaliland city')
  assert.notEqual(regionEntry('country', 'xs').status, 'open', 'the module code is not a map entry')
  const cyn = regionEntry('country', 'cyn')
  assert.ok(cyn.status !== 'open' || cityCatalogue().find((city) => city.id === cyn.city)?.countryISO === 'cyn', 'Northern Cyprus opens only through a city of its own (Kyrenia since release L)')
})

test('an outpost module opens a context-only entry (Antarctica) and a disputed territory entry, each with an open-city teaser', (t) => {
  const module = (id: string, name: string, country: { id: string; name: string }) => registerCityForTest({ ...fictionalCity, id, rules: { ...fictionalCity.rules, id, name, state: { id: `${country.id}-${id}`, name, unit: 'district' }, country, links: [] } })
  const antarctica = module('test-estrellas', 'Test Estrellas', { id: 'aq', name: 'Antarctica' })
  const siachen = module('test-siachen', 'Test Siachen', { id: 'xg', name: 'Siachen Glacier' })
  t.after(() => { antarctica.dispose(); siachen.dispose() })
  const aq = regionEntry('country', 'aq')
  assert.deepEqual([aq.status, aq.city, aq.level], ['open', 'test-estrellas', 'antarctica'])
  assert.equal(aq.teaser, 'Antarctica is open through Test Estrellas.', 'the context-only line is not used for an open entry')
  const kas = regionEntry('country', 'kas')
  assert.deepEqual([kas.status, kas.city, kas.level], ['open', 'test-siachen', 'asia'])
  assert.notEqual(regionEntry('country', 'in').city, 'test-siachen', 'India is not opened by the glacier')
  assert.notEqual(regionEntry('country', 'pk').city, 'test-siachen', 'Pakistan is not opened by the glacier')
  assert.notEqual(regionEntry('country', 'atc').status, 'open', 'Ashmore and Cartier stays closed until its own city exists')
})
