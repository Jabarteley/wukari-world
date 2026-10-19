// The world event's words on the page (eventWords.ts) and the scene's dressing from a city change (src/world-events/client.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import { chipWords, howWords, untilWords, whenWords } from './eventWords.ts'
import { changeDressing, loadChanges } from '../../../world-events/client.ts'

const SAT_20_LAGOS = Date.UTC(2026, 9, 24, 19)
const base = { startsAt: SAT_20_LAGOS, cityName: 'Lagos', percent: 42, done: false, drop: null }

test('the chip says when, then how far: announced, warm-up with a drop, live, done', () => {
  assert.equal(whenWords(SAT_20_LAGOS), 'Sat 20:00')
  assert.equal(chipWords({ ...base, phase: 'announced' }, 0), 'World event Sat 20:00 · Lagos')
  assert.equal(chipWords({ ...base, phase: 'warmup' }, SAT_20_LAGOS - 34 * 60000), 'Warm-up · starts in 34 min')
  assert.equal(chipWords({ ...base, phase: 'warmup', drop: { id: 'd0', closesAt: 0, left: 3 } }, SAT_20_LAGOS - 65 * 60000), 'Drop in the Square! · starts in 1h 05m')
  assert.equal(chipWords({ ...base, phase: 'live' }, SAT_20_LAGOS), 'Lagos · 42%')
  assert.equal(chipWords({ ...base, phase: 'done', done: true }, SAT_20_LAGOS), 'Lagos did it!')
  assert.equal(untilWords(0), 'now'); assert.equal(untilWords(26 * 3600000), 'in 1d 2h')
})

test('how to help follows the goal', () => {
  assert.match(howWords({ goal: 'deliver', cityName: 'Lagos' }, ['Market', 'Freedom Park']), /Pick up a load at Market in Lagos, carry it to Freedom Park/)
  assert.match(howWords({ goal: 'gather', cityName: 'Accra' }, []), /all over Accra/)
  assert.match(howWords({ goal: 'answer', cityName: 'Lagos' }, []), /One try each/)
})

test('a city that reached its goal is dressed in the event’s colours until its change ends', async () => {
  await loadChanges(async () => ({ changes: [{ city: 'lagos', label: 'The new footbridge', colours: ['#f0a830', '#2a9d8f'], until: 5000, week: 7 }, { junk: true }] }))
  assert.deepEqual(changeDressing('lagos', 1000), { id: 'world-event-7', name: 'The new footbridge', colour: '#f0a830', second: '#2a9d8f', label: 'The new footbridge' })
  assert.equal(changeDressing('lagos', 5000), null)
  assert.equal(changeDressing('accra', 1000), null)
})
