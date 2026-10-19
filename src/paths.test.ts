// The short-address table (src/paths.ts): parsing, aliases, precedence, the collision rule and the nearest-city helper.
import assert from 'node:assert/strict'
import test from 'node:test'
import { cityCatalogueEntry, knownCityIds, loadCityRules } from './game/cities/registry.ts'
import {
  CITY_ALIASES, FIXED_WORDS, GAME_SLUGS, PANEL_WORDS, PHONE_TABLE, PLACE_WORDS, RESERVED_PREFIXES, isReservedPath, kmBetween, knownStateIds, nearestCities, nearestCity, openCitiesOf, openCityIds, parsePath, pathCollisions, pathOf, streetPlace,
} from './paths.ts'

const city = (id: string, extra: { page?: 'games'; venue?: string } = {}) => ({ kind: 'city', city: id, page: extra.page ?? null, venue: extra.venue ?? null })

test('the games: /games, each game, and the aliases', () => {
  assert.deepEqual(parsePath('/games'), { kind: 'games', game: null })
  for (const game of GAME_SLUGS) assert.deepEqual(parsePath(`/games/${game}`), { kind: 'games', game })
  assert.deepEqual(parsePath('/play'), { kind: 'games', game: null })
  assert.deepEqual(parsePath('/chess'), { kind: 'games', game: 'chess' })
  assert.deepEqual(parsePath('/word'), { kind: 'games', game: 'oro' })
  assert.deepEqual(parsePath('/games/unknown'), { kind: 'games', game: null }, 'an unknown game is the hub')
  assert.deepEqual(PHONE_TABLE, { chess: 'phone-chess', weave: 'phone-weave', whot: 'phone-whot', penalties: 'phone-penalty', ayo: 'phone-ayo' })
})

test('every registry city answers at /<id>, and a state with one open city is that city', () => {
  for (const id of openCityIds()) assert.deepEqual(parsePath(`/${id}`), city(id), id)
  assert.deepEqual(parsePath('/fct'), city('abuja'))
  assert.deepEqual(parsePath('/oyo'), city('ibadan'))
  assert.deepEqual(parsePath('/rivers'), city('port-harcourt'))
  assert.deepEqual(parsePath('/lagos'), city('lagos'))
  assert.deepEqual(parsePath('/kano'), city('kano'))
  assert.ok(openCityIds().length >= 9)
})

test('aliases, case and trailing slashes', () => {
  assert.deepEqual(parsePath('/ph'), city('port-harcourt'))
  assert.deepEqual(parsePath('/portharcourt'), city('port-harcourt'))
  assert.deepEqual(parsePath('/ijebuode'), city('ijebu-ode'))
  assert.deepEqual(parsePath('/Abuja/'), city('abuja'))
  assert.deepEqual(parsePath('/KANO/Games'), city('kano', { page: 'games' }))
  assert.deepEqual(parsePath('/abuja?x=1#y'), city('abuja'), 'query and fragment are not part of the path')
})

test('a state with several open cities, and a capital that opened', () => {
  assert.ok(openCitiesOf('ogun').length > 1)
  assert.deepEqual(parsePath('/ogun'), { kind: 'state', state: 'ogun' })
  // Every state now has an open city: Kaduna's address is its city page.
  assert.equal(cityCatalogueEntry('kaduna')?.open, true)
  assert.deepEqual(parsePath('/kaduna'), city('kaduna'))
})

test('the atlas levels and the panels', () => {
  assert.deepEqual(parsePath('/nigeria'), { kind: 'atlas', level: 'nigeria' })
  assert.deepEqual(parsePath('/world'), { kind: 'atlas', level: 'world' })
  assert.deepEqual(parsePath('/map'), { kind: 'atlas', level: 'world' })
  for (const panel of PANEL_WORDS) assert.deepEqual(parsePath(`/${panel}`), { kind: 'panel', panel })
})

test('the entry-page words: /shops and /sell, /services, /cities', () => {
  assert.deepEqual(parsePath('/shops'), { kind: 'panel', panel: 'shops' })
  assert.deepEqual(parsePath('/sell'), { kind: 'panel', panel: 'shops' })
  assert.deepEqual(parsePath('/services'), { kind: 'panel', panel: 'services' })
  assert.deepEqual(parsePath('/cities'), { kind: 'atlas', level: 'world' })
  assert.equal(parsePath('/agents'), null, 'agents has no place to go to once the life exists')
})

test('a city page and a venue under it', () => {
  assert.deepEqual(parsePath('/abuja/games'), city('abuja', { page: 'games' }))
  assert.deepEqual(parsePath('/abuja/some-venue'), city('abuja', { venue: 'some-venue' }))
  assert.deepEqual(parsePath('/lagos/games/extra'), city('lagos', { page: 'games' }))
  assert.equal(parsePath('/games/abuja')?.kind, 'games', 'a fixed word wins over what follows it')
})

test('a street and a visit: an open city (or its alias), and for a street a place word kept for the city\'s rules to name', () => {
  assert.deepEqual(parsePath('/street/lagos/yaba'), { kind: 'street', city: 'lagos', place: 'yaba' })
  assert.deepEqual(parsePath('/Street/Lagos/Ikeja/'), { kind: 'street', city: 'lagos', place: 'ikeja' })
  assert.deepEqual(parsePath('/street/ph/diobu'), { kind: 'street', city: 'port-harcourt', place: 'diobu' })
  assert.deepEqual(parsePath('/visit/lagos'), { kind: 'street', city: 'lagos', place: null })
  assert.deepEqual(parsePath('/visit/lagos/yaba'), { kind: 'street', city: 'lagos', place: null }, 'a visit is the whole city')
  assert.deepEqual(parsePath('/street/lagos'), { kind: 'street', city: 'lagos', place: null }, 'a street without a place is the visit')
  for (const path of ['/street', '/visit', '/street/nowhere/yaba', '/visit/nowhere', '/visit/ogun', '/street/lagos/ya ba', '/street/__proto__/x']) assert.equal(parsePath(path), null, path)
  assert.equal(pathOf({ kind: 'street', city: 'lagos', place: 'yaba' }), '/street/lagos/yaba')
  assert.equal(pathOf({ kind: 'street', city: 'lagos', place: null }), '/visit/lagos')
  for (const word of PLACE_WORDS) assert.ok(FIXED_WORDS.includes(word), word)
  assert.ok(pathCollisions(['lagos', 'port-harcourt', 'ijebu-ode', 'visit'], ['lagos']).includes('visit'), 'a city called "visit" fails the collision check')
})

test('a street\'s place, from the city\'s rules: a local unit, or a district on the unit it lies in; nothing before the rules are loaded', async () => {
  await loadCityRules('lagos')
  assert.deepEqual(streetPlace('lagos', 'ikeja'), { id: 'ikeja', name: 'Ikeja', unit: 'ikeja' })
  assert.deepEqual(streetPlace('lagos', 'yaba'), { id: 'yaba', name: 'Yaba', unit: 'lagos-mainland' })
  assert.equal(streetPlace('lagos', 'no-such'), null)
  assert.equal(streetPlace('lagos', null), null)
  assert.equal(streetPlace('not-a-city', 'ikeja'), null)
})

test('unknown paths and reserved prefixes are never places', () => {
  for (const path of ['/', '', '/nowhere', '/a.png', '/abuja.html', '//games', '/games//chess', '/ab uja', '/%61buja', '/constructor', '/__proto__', '/hasOwnProperty']) assert.equal(parsePath(path), null, path)
  for (const prefix of RESERVED_PREFIXES) { assert.equal(parsePath(`/${prefix}/x`), null, prefix); assert.equal(isReservedPath(`/${prefix}/x`), true, prefix) }
  assert.equal(isReservedPath('/favicon.svg'), true)
  assert.equal(isReservedPath('/assets/app.js'), true)
  assert.equal(isReservedPath('/games'), false)
  assert.equal(isReservedPath('/'), false)
  assert.equal(isReservedPath('/whatever'), false)
})

test('the canonical address of every intent parses back to itself', () => {
  const paths = ['/games', ...GAME_SLUGS.map((game) => `/games/${game}`), ...openCityIds().map((id) => `/${id}`), ...openCityIds().map((id) => `/${id}/games`), '/ogun', '/kaduna', '/nigeria', '/world', ...PANEL_WORDS.map((panel) => `/${panel}`), '/abuja/park-1', '/street/lagos/yaba', '/visit/abuja']
  for (const path of paths) { const intent = parsePath(path); assert.ok(intent, path); assert.equal(pathOf(intent), path); assert.deepEqual(parsePath(pathOf(intent)), intent) }
  assert.equal(pathOf(parsePath('/ph') ?? { kind: 'atlas', level: 'world' }), '/port-harcourt')
  assert.equal(pathOf(parsePath('/fct') ?? { kind: 'atlas', level: 'world' }), '/abuja')
  assert.equal(pathOf(parsePath('/play') ?? { kind: 'atlas', level: 'world' }), '/games')
})

test('precedence: no city id, state slug or alias is a fixed word or a reserved prefix', () => {
  assert.deepEqual(pathCollisions(), [])
  const words = new Set([...FIXED_WORDS, ...RESERVED_PREFIXES])
  for (const id of knownCityIds()) assert.ok(!words.has(id), `city ${id}`)
  for (const state of knownStateIds()) assert.ok(!words.has(state), `state ${state}`)
  for (const [alias, target] of Object.entries(CITY_ALIASES)) { assert.ok(!words.has(alias), alias); assert.ok(knownCityIds().includes(target), `${alias} -> ${target}`); assert.ok(!knownCityIds().includes(alias), alias) }
})

test('a future city that takes a fixed word fails the collision check instead of breaking the address', () => {
  const base = ['lagos', 'port-harcourt', 'ijebu-ode']
  assert.deepEqual(pathCollisions(base, ['lagos']), [])
  assert.deepEqual(pathCollisions([...base, 'games'], ['lagos']), ['games'])
  assert.deepEqual(pathCollisions([...base, 'api'], ['lagos']), ['api'])
  assert.deepEqual(pathCollisions(base, ['lagos', 'messages']), ['messages'])
  assert.ok(pathCollisions(['lagos'], ['lagos']).includes('ph'), 'an alias whose city is missing is reported')
  assert.ok(pathCollisions([...base, 'ph'], ['lagos']).includes('ph'), 'a city that takes an alias is reported')
})

test('the nearest open city comes from the registry coordinates', () => {
  assert.equal(nearestCity(12.0, 8.52)?.id, 'kano')
  assert.equal(nearestCity(6.5, 3.4)?.id, 'lagos')
  assert.equal(nearestCity(9.07, 7.49)?.id, 'abuja')
  // Every catalogue city is open: from Kaduna's marker the nearest open city is Kaduna, and no place is coming.
  const kaduna = cityCatalogueEntry('kaduna')
  assert.ok(kaduna)
  assert.equal(nearestCity(kaduna.lat, kaduna.lon)?.id, 'kaduna')
  assert.ok((nearestCity(kaduna.lat, kaduna.lon)?.km ?? 99) < 1)
  assert.equal(nearestCity(kaduna.lat, kaduna.lon, { open: false }), null)
  const three = nearestCities(6.5, 3.4, 3)
  assert.equal(three.length, 3)
  assert.deepEqual([...three].sort((a, b) => a.km - b.km), three, 'nearest first')
  assert.ok(Math.abs(kmBetween(6.52, 3.38, 6.52, 3.38)) < 1e-9)
  assert.ok(Math.abs(kmBetween(0, 0, 0, 1) - 111.2) < 0.5)
  // Far from everything (the other side of the world) it still answers with a city.
  assert.ok(nearestCity(-33.9, 151.2))
})
