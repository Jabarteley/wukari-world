import { loadCityContent } from '../../../game/cities/registry.ts'
await Promise.all(['lagos', 'accra', 'abuja'].map((city) => loadCityContent(city)))
// OWNER: growth - Detty December in the Events app (docs/DETTY-DECEMBER.md): the rows at the cities' real venues, the calendar row they
// replace, the notice line, today's drop by date and the card's text and link.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DROPS, DEFAULT_NIGHTS } from '../../../festivals/detty.ts'
import { DETTY_CITIES, watMidnight } from '../../../festivals/detty-dates.ts'
import { venuesFor } from '../../../game/cities/runtime.ts'
import type { DettyFeed } from '../../../festivals/detty-client.ts'
import { SEASON_FESTIVAL, cardLink, cardText, dettyRows, dropToday, keepFestivalRow, noticeOf } from './dettyEvents.ts'
import { cardLines } from './dettyCard.ts'

const HOUR = 3600000
const wat = (y: number, m: number, d: number, h = 12): number => watMidnight(y, m, d) + h * HOUR
const feed = (change: Partial<DettyFeed> = {}): DettyFeed => ({ now: 0, on: true, preview: false, day: 1, year: 2026, key: '2026', cities: DETTY_CITIES, nights: [...DEFAULT_NIGHTS], drops: [...DEFAULT_DROPS], card: false, at: 0, ...change })

test('the rows are at venues each city really has, a week of them, and none elsewhere or out of season', () => {
  for (const city of DETTY_CITIES) {
    const ids = new Set(venuesFor(city).map((venue) => venue.id))
    const rows = dettyRows(feed(), wat(2026, 12, 1, 0), 7, city)
    assert.equal(rows.length, 7, city)
    for (const row of rows) assert.ok(ids.has(row.venue), `${city}: ${row.title} at ${row.venue}`)
    assert.ok(rows.every((row) => row.spray === false && row.table === null && row.key.startsWith(`detty:${city}:`)))
  }
  // Accra has no Labadi Beach venue yet: its day out is at the park, and says so.
  assert.equal(dettyRows(feed(), wat(2026, 12, 2, 0), 1, 'accra')[0]?.title, 'Park day')
  assert.equal(dettyRows(feed(), wat(2026, 12, 2, 0), 1, 'lagos')[0]?.title, 'Beach day')
  assert.equal(dettyRows(feed(), wat(2026, 12, 5, 0), 1, 'lagos')[0]?.venueLabel, 'Home')
  assert.deepEqual(dettyRows(feed(), wat(2026, 12, 1, 0), 7, 'kano'), [])
  assert.deepEqual(dettyRows(feed(), wat(2026, 10, 19, 0), 7, 'lagos'), [])
  assert.equal(dettyRows(feed({ preview: true }), wat(2026, 10, 19, 0), 7, 'lagos').length, 7, 'a preview shows them')
  assert.deepEqual(dettyRows(null, wat(2026, 12, 1, 0), 7, 'lagos'), [])
})

test('the calendar’s own Detty December row gives way in the three cities while the season is on, and only there', () => {
  const row = { id: SEASON_FESTIVAL }, dec = wat(2026, 12, 10)
  assert.equal(keepFestivalRow(row, feed(), dec, 'lagos'), false)
  assert.equal(keepFestivalRow(row, feed(), dec, 'kano'), true)
  assert.equal(keepFestivalRow(row, null, dec, 'lagos'), true, 'until the season is known the calendar row stays')
  assert.equal(keepFestivalRow({ id: 'christmas' }, feed(), dec, 'lagos'), true)
})

test('the notice line and today’s drop follow the date in WAT; the preview says so', () => {
  assert.equal(noticeOf(feed(), wat(2026, 12, 5), 'accra'), 'Detty December in Accra, day 5 of 31')
  assert.equal(noticeOf(feed(), wat(2026, 12, 5), 'kano'), null)
  assert.equal(noticeOf(feed({ preview: true }), wat(2026, 10, 19), 'lagos'), 'Detty December in Lagos, day 19 of 31 (preview)')
  assert.equal(noticeOf(feed(), wat(2026, 10, 19), 'lagos'), null)
  assert.equal(dropToday(feed(), wat(2026, 12, 25)), DEFAULT_DROPS[24])
  assert.equal(dropToday(feed({ drops: ['Only this'] }), wat(2026, 12, 25)), 'Only this')
  assert.equal(dropToday(feed(), wat(2027, 1, 2)), null)
})

test('the card’s text ends with the season’s link, and its picture writes only the public facts', () => {
  const facts = { year: 2026, nights: 4, parties: 2, cities: ['Lagos', 'Abuja'], returnee: true }
  const link = cardLink('https://joinallworld.com')
  assert.equal(link, 'https://joinallworld.com/detty?utm_source=share&utm_medium=card&utm_campaign=detty')
  assert.equal(cardText(facts, link), `I did Detty December in Allworld 2026: 4 nights out · 2 owambes · Lagos and Abuja · Returnee.\n${link}`)
  assert.deepEqual(cardLines(facts), ['DETTY DECEMBER 2026', 'I did Detty December in Allworld', '4 nights out · 2 owambes · Lagos and Abuja · Returnee', 'joinallworld.com/detty'])
})
