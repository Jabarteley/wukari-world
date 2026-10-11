import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AGENT_CHOICES, ENTRY_TILES, entryPitch, entryShown, isPathAddress, liveLine, worldFigures } from './entryModel.ts'

const calm = { problem: false, pathAddress: false, editing: false, sending: false }

test('a first visit sees the entry page; a refusal, a short address, an edited character or a Play on its way go to the creator', () => {
  assert.equal(entryShown(calm), true)
  for (const key of Object.keys(calm) as (keyof typeof calm)[]) assert.equal(entryShown({ ...calm, [key]: true }), false, key)
})

test('invite and share addresses keep the entry page; short addresses, /unilag and /signup do not', () => {
  for (const path of ['/', '', '/index.html', '/v/abc123', '/s/ABCDEF']) assert.equal(isPathAddress(path), false, path)
  for (const path of ['/abuja', '/games', '/unilag', '/signup', '/lagos/games']) assert.equal(isPathAddress(path), true, path)
})

test('the figures come from the catalogue: only open cities, each country once', () => {
  const figures = worldFigures([{ open: true }, { open: true, countryISO: 'GH' }, { open: true, countryISO: 'GH' }, { open: false, countryISO: 'KE' }])
  assert.deepEqual(figures, { cities: 3, countries: 2 })
})

test('the live line never says 0, and drops the count until there is one', () => {
  const f = { cities: 60, countries: 21 }
  assert.equal(liveLine(128, f), '128 in Allworld now · 60 cities, 21 countries')
  assert.equal(liveLine(1234, f), '1,234 in Allworld now · 60 cities, 21 countries')
  assert.equal(liveLine(0, f), '60 cities, 21 countries')
  assert.equal(liveLine(null, f), '60 cities, 21 countries')
  assert.equal(liveLine(1, { cities: 1, countries: 1 }), '1 in Allworld now · 1 city, 1 country')
})

test('the pitch and the tiles use the approved words', () => {
  assert.equal(entryPitch(60), '60 real cities across Africa, and more opening. Free, in your browser, no download.')
  assert.deepEqual(ENTRY_TILES.map((tile) => tile.label), ['Live in a real city', 'Work and earn', 'Open a shop for your real business', 'Friends, voice and games'])
  assert.deepEqual(AGENT_CHOICES.map((choice) => choice.title), ['Let an agent play my character', 'Give an agent its own character'])
})
