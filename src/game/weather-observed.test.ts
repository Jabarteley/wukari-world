import assert from 'node:assert/strict'
import test from 'node:test'
import { weatherAt } from './systems/health.ts'
import { HEALTH } from './content/health.ts'
import { HOUR_MS, clearObservedWeather, observedSkyAt, onObservedWeather, readObservedWeather, setObservedWeather, skyKindOf, skyWords } from './weather-observed.ts'
import type { ObservedHour } from './weather-observed.ts'

const blockMs = HEALTH.weather.blockMinutes * 60000
const T = Date.UTC(2026, 9, 14, 12)

test('MET symbol codes map to the game skies', () => {
  const cases: [string, string | null][] = [
    ['clearsky_day', 'clear'], ['clearsky_night', 'clear'], ['fair_polartwilight', 'clear'], ['partlycloudy_day', 'cloud'], ['cloudy', 'cloud'], ['fog', 'fog'],
    ['lightrain', 'lrain'], ['lightrainshowers_day', 'lrain'], ['rain', 'rain'], ['rainshowers_night', 'rain'], ['heavyrain', 'hrain'], ['heavyrainshowers_day', 'hrain'],
    ['rainandthunder', 'storm'], ['heavyrainandthunder', 'storm'], ['lightrainshowersandthunder_day', 'storm'], ['sleet', 'sleet'], ['lightsleetandthunder', 'storm'],
    ['snow', 'snow'], ['heavysnowshowers_night', 'snow'], ['mystery', null],
  ]
  for (const [code, kind] of cases) assert.equal(skyKindOf(code), kind, code)
  assert.equal(skyKindOf(7), null)
})

test('the words: rain soaks, snow and fog do not, heat needs 33 degrees', () => {
  assert.deepEqual([skyWords('lrain', 20).raining, skyWords('storm', 20).raining, skyWords('sleet', 1).raining, skyWords('hrain', 20).raining], [true, true, true, true])
  assert.deepEqual([skyWords('snow', -2).raining, skyWords('fog', 9).raining, skyWords('cloud', 20).raining], [false, false, false])
  assert.equal(skyWords('storm', 20).over?.label, 'Thunderstorm')
  assert.equal(skyWords('clear', 33).over?.label, 'Hot')
  assert.equal(skyWords('cloud', 35).over?.label, 'Hot')
  assert.equal(skyWords('clear', 32.9).over, undefined, 'plain clear keeps the cycle wording')
  assert.equal(skyWords('rain', 40).over?.label, 'Rain', 'rain is never "hot"')
})

test('weatherAt uses the observed hour, and the cycle when there is none', () => {
  clearObservedWeather()
  try {
    const cycle = weatherAt(T, 'lagos')
    assert.equal(cycle.observed, undefined)
    setObservedWeather('lagos', { hours: [[T, 'storm', 24.5]] })
    const sky = weatherAt(T + 5 * 60000, 'lagos')
    assert.equal(sky.raining, true)
    assert.equal(sky.id, 'rain')
    assert.equal(sky.label, 'Thunderstorm')
    assert.equal(sky.observed, true)
    assert.equal(sky.tempC, 24.5)
    assert.equal(sky.until, Math.floor((T + 5 * 60000) / blockMs) * blockMs + blockMs, 'the block still ends on the 20-minute grid')
    // the hour after the list: the cycle again, unchanged
    assert.deepEqual(weatherAt(T + HOUR_MS, 'lagos'), weatherAt(T + HOUR_MS, 'lagos'))
    assert.equal(weatherAt(T + HOUR_MS, 'lagos').observed, undefined)
    setObservedWeather('lagos', null)
    assert.deepEqual(weatherAt(T, 'lagos'), cycle)
    setObservedWeather('lagos', { hours: [[T, 'clear', 20]] })
    assert.equal(weatherAt(T, 'lagos').raining, false)
    assert.equal(weatherAt(T, 'lagos').label, cycle.raining ? weatherAt(T, 'lagos').label : cycle.label, 'clear keeps the city own dry wording')
    setObservedWeather('lagos', { hours: [[T, 'clear', 34]] })
    assert.equal(weatherAt(T, 'lagos').label, 'Hot')
    assert.equal(weatherAt(T, 'lagos').id, 'clear')
  } finally { clearObservedWeather() }
})

test('the same list gives the same sky for every block of the hour and on every caller (determinism)', () => {
  clearObservedWeather()
  const hours: ObservedHour[] = [[T, 'rain', 22], [T + HOUR_MS, 'cloud', 23]]
  try {
    setObservedWeather('lagos', { hours })
    const a = [0, 1, 2, 3, 4, 5].map((i) => weatherAt(T + i * blockMs, 'lagos'))
    clearObservedWeather()
    setObservedWeather('lagos', { hours: JSON.parse(JSON.stringify(hours)) as ObservedHour[] })
    const b = [0, 1, 2, 3, 4, 5].map((i) => weatherAt(T + i * blockMs, 'lagos'))
    assert.deepEqual(a, b)
    assert.deepEqual(a.slice(0, 3).map((s) => s.label), ['Rain', 'Rain', 'Rain'])
    assert.deepEqual(a.slice(3).map((s) => s.label), ['Cloudy', 'Cloudy', 'Cloudy'])
    assert.equal(observedSkyAt('lagos', T + HOUR_MS - 1)?.kind, 'rain')
    assert.equal(observedSkyAt('lagos', T + HOUR_MS)?.kind, 'cloud')
    assert.equal(observedSkyAt('accra', T), null, 'another city has none')
  } finally { clearObservedWeather() }
})

test('a list from outside is cleaned, and listeners hear only real changes', () => {
  clearObservedWeather()
  const heard: string[] = []
  const stop = onObservedWeather((id) => heard.push(id))
  try {
    assert.equal(readObservedWeather({ hours: [[T, 'tornado', 1], 'x', [-1, 'rain', 1]] }), null)
    assert.deepEqual(readObservedWeather({ hours: [[T + HOUR_MS, 'rain', 20.04], [T, 'fog', 'warm']] }), { hours: [[T, 'fog', null], [T + HOUR_MS, 'rain', 20]] })
    assert.equal(readObservedWeather(null), null)
    assert.equal(readObservedWeather({ hours: Array.from({ length: 40 }, (_, i) => [T + i * HOUR_MS, 'clear', 20]) })?.hours.length, 24)
    setObservedWeather('lagos', { hours: [[T, 'rain', 20]] })
    setObservedWeather('lagos', { hours: [[T, 'rain', 20]] })
    setObservedWeather('lagos', null)
    setObservedWeather('lagos', null)
    assert.deepEqual(heard, ['lagos', 'lagos'])
  } finally { stop(); clearObservedWeather() }
})
