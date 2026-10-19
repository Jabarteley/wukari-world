// OWNER: social — billboards of running boosts (docs/PROMOTE.md): the free boards of a city take its boosted businesses and nothing else changes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fillBoards, boardAd } from './boards.ts'
import { BILLBOARD, CATEGORIES, boardSafe } from './model.ts'
import { readFile } from 'node:fs/promises'
import type { AdsView, Ad } from '../types/civic.ts'
import type { BoardListing } from '../types/neighbourhood.ts'

const palette = { colours: [{ id: 'green', label: 'Green', bg: '#256b45', ink: '#fff' }, { id: 'red', label: 'Red', bg: '#b23a2e', ink: '#fff' }, { id: 'gold', label: 'Gold', bg: '#e8a643', ink: '#20232c' }], icons: [{ id: 'star', icon: '⭐' }, { id: 'food', icon: '🍲' }, { id: 'shop', icon: '🛍️' }] }
const rented: Ad = { text: 'Rented', colour: 'green', icon: 'star', by: { id: 'p', name: 'Ada' }, at: 1, expiresAt: 2, mine: false, price: 500 }
const view = (ads: (Ad | null)[]): AdsView => ({ palette, sea: { rows: 0, cols: 0, price: 0, shoreRows: 0, shorePrice: 0, days: 0, maxPerPlayer: 0, plots: [] },
  billboards: { price: 500, days: 7, maxPerPlayer: 1, slots: ads.map((ad, i) => ({ slot: `bb-0${i + 1}`, near: 'park', road: 'Road', price: 500, ad })) } })
const board = (id: string, more: Partial<BoardListing> = {}): BoardListing => ({ id, name: `Shop ${id}`, category: 'food', categoryLabel: 'Food and drinks', area: 'Yaba', tier: 'boost', owner: { id: `o${id}`, name: 'Owner' }, ...more })

test('boards: businesses take the free boards in the order the server rotated them; a rented board is never replaced', () => {
  const ads = view([rented, null, null, rented, null])
  const out = fillBoards(ads, [board('a'), board('b')], 100)
  assert.deepEqual(out.billboards.slots.map((s) => s.ad?.text ?? null), ['Rented', 'Shop a', 'Shop b', 'Rented', null], 'a, b, then the third free board stays for rent');
  assert.equal(out.billboards.slots[0]!.ad, rented)
  assert.deepEqual(out.billboards.slots[1]!.ad!.business, { id: 'a', label: 'Food and drinks' })
  assert.equal(ads.billboards.slots[1]!.ad, null, 'the input is not changed')
  assert.deepEqual(out.billboards.slots.map((s) => s.price), [500, 500, 500, 500, 500])
})

test('boards: nothing to fill, or nothing to fill it with, returns the ads as they are', () => {
  const full = view([rented, rented]), free = view([null, null])
  assert.equal(fillBoards(full, [board('a')], 0), full)
  assert.equal(fillBoards(free, [], 0), free)
  assert.equal(fillBoards({ ...free, billboards: { ...free.billboards, slots: [] } }, [board('a')], 0).billboards.slots.length, 0)
})

test('boards: a business wears the colour and icon of its kind from the palette, and falls back when the palette lacks them', () => {
  const ad = boardAd(view([null]), board('a', { category: 'food', photo: 'ab12' }), 5, 500)
  assert.deepEqual([ad.colour, ad.icon, ad.business, ad.by, ad.mine, ad.at], ['red', 'food', { id: 'a', label: 'Food and drinks', photo: 'ab12' }, { id: 'oa', name: 'Owner' }, false, 5])
  const spare = boardAd({ ...view([null]), palette: { colours: [{ id: 'teal', label: 'Teal', bg: '#1f8a86', ink: '#fff' }], icons: [] } }, board('b', { category: 'tech' }), 0, 1)
  assert.deepEqual([spare.colour, spare.icon], ['teal', 'star'])
  for (const [category] of CATEGORIES) assert.ok(boardAd(view([null]), board('c', { category }), 0, 1).colour, category)
})

test('boards: the words of a business stay plain text for the renderer to escape', () => {
  const ad = boardAd(view([null]), board('a', { name: '<img src=x onerror=alert(1)>' }), 0, 1)
  assert.equal(ad.text, '<img src=x onerror=alert(1)>')
})

test('boards: nightlife, alcohol and gambling words keep a business off the boards (not off the directory)', () => {
  for (const name of ['Moonlight Lounge', 'Rooftop Bar', 'Club Zenith', 'Lagos Wine House', 'Betting Shop']) assert.equal(boardSafe({ name, about: '', area: '' }), false, name)
  assert.equal(boardSafe({ name: 'Ada Tailoring', about: 'Weddings, 18+ only', area: 'Yaba' }), false)
  assert.equal(boardSafe({ name: 'Bola Cars', about: 'Hire a car for the weekend', area: 'Barbados' }), true, 'a word inside a word is not a match')
  assert.equal(boardSafe({ name: 'Iya Basira Foods', about: 'Amala and ewedu', area: 'Yaba' }), true)
  assert.ok(BILLBOARD.max >= 1 && BILLBOARD.rotateMs >= 60000)
})

test('boards: the three maps draw a business\'s board as a button that raises one window event, and the Map panel answers it; no module is shared between them', async () => {
  // The renderers are separate lazy chunks: a module shared by all of them would be a new file in the first download's list of chunks, so each
  // carries its few lines itself (docs/PROMOTE.md). This keeps the four of them naming the same event and the same photo address.
  const files = ['src/map3d/map3d.ts', 'src/map3d/map2d.ts', 'src/city-map.ts', 'src/app/features/travel/MapApp.vue']
  const sources = await Promise.all(files.map((f) => readFile(new URL(`../../${f}`, import.meta.url), 'utf8')))
  for (const [i, source] of sources.entries()) assert.match(source, /jaw:map-business/, files[i])
  for (const [i, source] of sources.slice(0, 2).entries()) { assert.match(source, /\/api\/feed\/media\/\$\{encodeURIComponent\(chip\.photo\)\}/, files[i]); assert.match(source, /createElement\(chip\.business \? 'button' : 'div'\)/, files[i]) }
  assert.match(sources[2]!, /make\(slot\.ad\?\.business \? 'button' : 'div'/)
  assert.match(sources[3]!, /fetchJson[^\n]*promote\/contact[^\n]*via: 'board'/)
  assert.match(sources[3]!, /shell\.open\('promote', \{ listing \}\)/)
  for (const source of sources) assert.doesNotMatch(source, /business-chip/)
})
