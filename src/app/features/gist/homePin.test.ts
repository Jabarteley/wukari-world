// The home-city pin: what is kept, the weather line, and an event time on two clocks.
import assert from 'node:assert/strict'
import test from 'node:test'
import { homeTimes, pinPaths, readPin, spanIn, weatherCredit, weatherLine, weatherNow } from './homePinModel.ts'
import { setHomePin, homePin } from './homePinStore.ts'

const lagos = { city: 'lagos', name: 'Lagos', tz: 'Africa/Lagos' }
const NOW = Date.UTC(2026, 9, 16, 12, 30)

test('a kept pin is read defensively', () => {
  assert.deepEqual(readPin(JSON.stringify(lagos)), lagos)
  assert.deepEqual(readPin(lagos), lagos)
  for (const bad of [null, '', 'x', '{"city":"lagos"}', JSON.stringify({ ...lagos, tz: 'Mars/Base' }), JSON.stringify({ ...lagos, city: '../x' }), JSON.stringify({ ...lagos, name: '' }), 5]) assert.equal(readPin(bad), null, String(bad))
  assert.equal(readPin({ ...lagos, name: 'x'.repeat(200) })?.name.length, 60)
  assert.equal(pinPaths('port-harcourt').feed, '/api/world/feed?id=port-harcourt')
  assert.equal(pinPaths('ibadan').gist, '/api/world/gist?id=ibadan&limit=5')
})

test('the weather is the hour that began last, and only if it is recent', () => {
  const answer = { weather: { at: NOW, hours: [[NOW - 5 * 3600000, 'rain', 20], [NOW - 40 * 60000, 'cloud', 27.4], [NOW + 3600000, 'clear', 30]] }, credits: { weather: 'Weather: a public source' } }
  assert.deepEqual(weatherNow(answer, NOW), { sky: 'Cloudy', tempC: 27.4 })
  assert.equal(weatherLine(weatherNow(answer, NOW)), 'Cloudy, 27°C')
  assert.equal(weatherNow(answer, NOW + 4 * 3600000), null, 'stale hours say nothing')
  assert.equal(weatherNow({ weather: null }, NOW), null)
  assert.equal(weatherNow(null, NOW), null)
  assert.equal(weatherLine(null), 'Weather not available right now.')
  assert.equal(weatherLine({ sky: 'Rain', tempC: null }), 'Rain')
  assert.equal(weatherCredit(answer), 'Weather: a public source')
  assert.equal(weatherCredit({ credits: 4 }), '')
})

test('an event time is shown on the device clock and on the home city clock', () => {
  const start = Date.UTC(2026, 9, 16, 19, 0), end = Date.UTC(2026, 9, 17, 1, 0) // 8:00 pm to 2:00 am in Lagos
  assert.match(spanIn(start, end, 'Africa/Lagos'), /8:00 pm – 2:00 am/)
  const line = homeTimes(start, end, lagos, 'America/Chicago')
  assert.match(line, /2:00 pm – 8:00 pm your time/)
  assert.match(line, /8:00 pm – 2:00 am in Lagos/)
  assert.equal(homeTimes(start, end, lagos, 'Africa/Lagos'), '', 'at home both clocks agree: nothing to add')
  assert.equal(homeTimes(start, end, null, 'America/Chicago'), '')
  assert.match(homeTimes(start, end, { city: 'accra', name: 'Accra', tz: 'Africa/Accra' }, 'Europe/London'), /in Accra/)
})

test('the pin is kept on this device and can be removed', () => {
  const kept = new Map<string, string>()
  const store = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) }
  setHomePin(lagos, store)
  assert.deepEqual(homePin.value, lagos)
  assert.deepEqual(readPin(kept.get('allworld.homepin')), lagos)
  setHomePin(null, store)
  assert.equal(homePin.value, null)
  assert.equal(kept.size, 0)
  setHomePin(lagos, { getItem: () => null, setItem: () => { throw new Error('full') }, removeItem: () => {} })
  assert.deepEqual(homePin.value, lagos, 'a full store still pins for this visit')
  setHomePin(null, store)
})
