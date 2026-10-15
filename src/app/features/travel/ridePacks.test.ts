// The ride packs (docs/CITY-TEXTURE.md): chosen by city, way and time of day; no line twice in a trip; a city without a pack falls back; the same trip, the same lines.
import assert from 'node:assert/strict'
import test from 'node:test'
import { GENERIC, PACKS, lineCount, lineIndex, packFor, partOfDay, rideLines } from './ridePacks.ts'

const MORNING = Date.UTC(2026, 9, 14, 7), EVENING = Date.UTC(2026, 9, 14, 17), NIGHT = Date.UTC(2026, 9, 14, 22)
const ask = (city: string, mode: string, now = EVENING, seconds = 24, to = 'Ikeja') => ({ city, mode, now, from: 'Home', to, seconds })

test('the part of the day follows the city clock, not the viewer', () => {
  assert.equal(partOfDay(MORNING, 1), 'morning')
  assert.equal(partOfDay(EVENING, 1), 'evening')
  assert.equal(partOfDay(NIGHT, 1), 'night')
  assert.equal(partOfDay(Date.UTC(2026, 9, 14, 20), 3), 'night', 'Nairobi is two hours ahead of Lagos')
  assert.equal(partOfDay(Number.NaN, 1), partOfDay(0, 1), 'a bad clock reads as the epoch, never throws')
})

test('a danfo ride in Lagos gets Lagos lines, a trip never repeats a line, and the same trip gets the same lines', () => {
  const lines = rideLines(ask('lagos', 'danfo'))
  assert.equal(lines.length, lineCount(24))
  assert.equal(new Set(lines.map((line) => line.text)).size, lines.length)
  const lagos = packFor('lagos')?.modes.danfo?.map((line) => line.text) ?? []
  assert.ok(lines.every((line) => lagos.includes(line.text)), 'all from the Lagos pack')
  assert.deepEqual(rideLines(ask('lagos', 'danfo')), lines)
  assert.notDeepEqual(rideLines(ask('lagos', 'danfo', EVENING, 24, 'Yaba')).map((line) => line.text), lines.map((line) => line.text), 'a different route, different lines')
})

test('lines for the route and the time of day come first, and a line for another time or place never shows', () => {
  const toOshodi = rideLines({ ...ask('lagos', 'danfo', EVENING, 24, 'Oshodi market'), seconds: 40 })
  assert.ok(toOshodi.some((line) => /Oshodi! Oshodi!/.test(line.text)), 'the Oshodi call on an Oshodi trip')
  for (const now of [MORNING, EVENING, NIGHT]) for (const line of rideLines(ask('lagos', 'danfo', now, 40, 'Freedom Park'))) {
    assert.ok(!line.near, 'a route line stays off other routes')
    if (line.when) assert.ok(line.when.includes(partOfDay(now, 1)), line.text)
  }
  assert.ok(rideLines(ask('lagos', 'danfo', MORNING, 40, 'Park')).every((line) => !/Evening rush|go-slow ahead/i.test(line.text)))
})

test('every way of travelling has lines in Lagos, and the other starter packs follow the same shape', () => {
  for (const mode of ['danfo', 'okada', 'keke']) assert.ok(rideLines(ask('lagos', mode)).length >= 2, mode)
  for (const city of ['accra', 'nairobi', 'johannesburg']) {
    const pack = packFor(city)
    assert.ok(pack, city)
    assert.ok(pack.modes.danfo && pack.modes.danfo.length >= 8, `${city} has a minibus pack`)
    assert.ok(rideLines(ask(city, 'danfo')).length >= 2, city)
  }
  assert.equal(packFor('cape-town'), packFor('johannesburg'))
})

test('a city or a way with no pack falls back to the generic lines; a walk or a train gets none', () => {
  assert.ok(rideLines(ask('oslo', 'danfo')).every((line) => GENERIC.modes.danfo?.some((own) => own.text === line.text)))
  assert.ok(rideLines(ask('oslo', 'danfo')).length >= 2)
  const accraCab = rideLines(ask('accra', 'cab'))
  assert.ok(accraCab.every((line) => GENERIC.modes.cab?.some((own) => own.text === line.text)), 'Accra has no cab lines of its own: the generic ones')
  assert.deepEqual(rideLines(ask('lagos', 'rail')), [])
  assert.deepEqual(rideLines(ask('lagos', 'unknown-mode')), [])
})

test('how many lines follow the trip, and the line on screen follows the bar', () => {
  assert.deepEqual([4, 8, 15, 60, 0, Number.NaN].map(lineCount), [2, 2, 4, 6, 2, 2])
  assert.deepEqual([0, 0.34, 0.67, 1].map((fraction) => lineIndex(fraction, 3)), [0, 1, 2, 2])
  assert.equal(lineIndex(0.5, 0), -1)
})

test('no pack is only about danger or scams, and no line is empty or very long', () => {
  const words = /\b(rob|robber|thief|thieves|scam|scammer|kidnap|danger|dangerous|steal|stolen|pickpocket)\b/i
  for (const pack of [...PACKS, GENERIC]) for (const [mode, lines] of Object.entries(pack.modes)) for (const line of lines) {
    assert.ok(line.text.length > 8 && line.text.length <= 160, `${pack.id}/${mode}: ${line.text}`)
    assert.ok(!words.test(line.text), `${pack.id}/${mode}: ${line.text}`)
  }
})
