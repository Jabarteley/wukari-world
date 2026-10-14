import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'
import { HOUR_MS, clearObservedWeather, observedWeatherOf } from '../../../game/weather-observed.ts'
import { feedCredits, takeCredits } from './feedCredits.ts'
import { FEED_EVERY_MS, startWorldFeed, takeFeed } from './worldFeed.ts'

const T = Date.UTC(2026, 9, 14, 12)
const answer = (kind = 'rain') => ({ day: '2026-10-14', rates: { NGN: 1328 }, weather: { at: T, hours: [[T, kind, 24]] }, credits: { weather: 'Weather data from MET Norway', weatherUrl: 'https://www.met.no/en', rates: null, ratesUrl: null } })

test('an answer sets the city sky; an answer without weather clears it; junk changes nothing', () => {
  clearObservedWeather()
  takeFeed('lagos', answer())
  assert.deepEqual(observedWeatherOf('lagos')?.hours, [[T, 'rain', 24]])
  takeFeed('lagos', null)
  takeFeed('lagos', 'nonsense')
  assert.equal(observedWeatherOf('lagos')?.hours.length, 1)
  takeFeed('lagos', { ...answer(), weather: null })
  assert.equal(observedWeatherOf('lagos'), null)
  clearObservedWeather()
})

test('the fallback rates credit shows only while the feed says so, and only an https link', () => {
  takeCredits({ weather: 'Weather data from MET Norway', weatherUrl: 'https://www.met.no/en', rates: 'Rates By Exchange Rate API', ratesUrl: 'https://www.exchangerate-api.com' })
  assert.deepEqual([feedCredits.rates, feedCredits.ratesUrl], ['Rates By Exchange Rate API', 'https://www.exchangerate-api.com'])
  takeCredits({ rates: 'Rates By Exchange Rate API', ratesUrl: 'javascript:alert(1)' })
  assert.equal(feedCredits.ratesUrl, null)
  takeCredits({ rates: null })
  assert.deepEqual([feedCredits.rates, feedCredits.ratesUrl, feedCredits.weather], [null, null, 'Weather data from MET Norway'])
})

test('the client reads on start, on a city change, and every 30 minutes while visible', async () => {
  clearObservedWeather()
  const paths: string[] = []
  const timers: { run: () => void; ms: number }[] = []
  let visible = true
  const city = ref('lagos')
  const stop = startWorldFeed({
    fetchJson: async (path) => { paths.push(path); return answer(path.includes('accra') ? 'fog' : 'storm') },
    cityId: city, visible: () => visible, now: () => T,
    setTimer: (run, ms) => { const timer = { run, ms }; timers.push(timer); return timer }, clearTimer: () => {},
  })
  const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5))
  await flush()
  assert.deepEqual(paths, ['/api/world/feed?id=lagos'])
  assert.equal(timers.at(-1)?.ms, FEED_EVERY_MS)
  city.value = 'accra'
  await flush()
  assert.deepEqual(paths.at(-1), '/api/world/feed?id=accra')
  assert.equal(observedWeatherOf('accra')?.hours[0]?.[1], 'fog')
  timers.at(-1)?.run()
  await flush()
  assert.equal(paths.length, 3, 'the timer reads again')
  visible = false
  timers.at(-1)?.run()
  await flush()
  stop()
  clearObservedWeather()
  assert.ok(HOUR_MS > 0)
})

test('a failed read changes nothing', async () => {
  clearObservedWeather()
  takeFeed('lagos', answer())
  const stop = startWorldFeed({ fetchJson: async () => { throw new Error('offline') }, cityId: ref('lagos'), visible: () => true, now: () => T, setTimer: () => null, clearTimer: () => {} })
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(observedWeatherOf('lagos')?.hours.length, 1)
  stop()
  clearObservedWeather()
})

test('an answer gives the city its money; the display city follows the feed and a day does not move', async () => {
  const { money } = await import('../../../game/money.ts')
  const { clearMoney } = await import('../../../game/money-feed.ts')
  clearMoney()
  const london = { day: '2026-10-14', rates: { NGN: 1500, GBP: 0.75, USD: 1 }, currency: { code: 'GBP', symbol: '£', decimals: 2 }, weather: null, credits: null }
  takeFeed('london', london)
  assert.equal(money(6800, 'london'), '£3.40')
  takeFeed('london', { ...london, rates: { NGN: 1500, GBP: 0.9, USD: 1 } })
  assert.equal(money(6800, 'london'), '£3.40', 'frozen for the day')
  takeFeed('accra', { ...london, currency: { code: 'GHS', symbol: 'GH₵', decimals: 2 }, rates: { NGN: 1500, GHS: 15, USD: 1 } })
  assert.equal(money(4500, 'accra'), 'GH₵ 45.00')
  takeFeed('nairobi', { ...london, currency: { code: 'KES', symbol: 'KSh', decimals: 2 }, rates: { NGN: 1500, KES: 130, USD: 1 } })
  assert.equal(money(138462, 'nairobi'), 'KSh 12,000')
  assert.equal(money(6800, 'lagos'), '₦6,800', 'no money held: naira')
  clearMoney()
})

// ---- the last rates are kept on the phone ----
import { money } from '../../../game/money.ts'
import { clearMoney } from '../../../game/money-feed.ts'
import { RATES_KEEP_MS, ratesKey, recall } from './worldFeed.ts'

const london = (day = '2026-10-14') => ({ day, rates: { NGN: 1500, GBP: 0.75, EUR: 0.9 }, currency: { code: 'GBP', symbol: '£', decimals: 2 }, weather: null, credits: null })
const memory = (initial: Record<string, string> = {}) => { const data = { ...initial }; return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v } } }
const never = (): Promise<unknown> => new Promise(() => {})
const start = (store: ReturnType<typeof memory>, now: number, fetchJson: (p: string) => Promise<unknown>) => startWorldFeed({ fetchJson, cityId: ref('london'), visible: () => true, now: () => now, setTimer: () => 0, clearTimer: () => {}, storage: store })

test('an answer is kept, and on the next visit its rates are used before the feed answers', () => {
  clearMoney()
  const store = memory()
  takeFeed('london', london(), T, store)
  assert.ok(store.data[ratesKey('london')], 'kept')
  assert.ok(!store.data[ratesKey('london')]!.includes('EUR'), 'only the rates money needs')
  clearMoney()
  assert.equal(money(1500, 'london'), '₦1,500')
  const stop = start(store, T + 60000, never)
  assert.equal(money(1500, 'london'), '£0.75', 'the kept rate, with no answer yet')
  stop(); clearMoney()
})

test('a rate kept for the same day stays frozen when the feed answers; a new day replaces it', async () => {
  clearMoney()
  const store = memory()
  takeFeed('london', london(), T, store)
  clearMoney()
  const stop = start(store, T + 1000, async () => ({ ...london(), rates: { NGN: 1500, GBP: 0.5 } }))
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(money(1500, 'london'), '£0.75', 'same day: the first rates stay')
  takeFeed('london', { ...london('2026-10-15'), rates: { NGN: 1500, GBP: 0.6 } }, T + 86400000, store)
  assert.equal(money(1500, 'london'), '£0.60')
  stop(); clearMoney()
})

test('a kept answer older than about three days is ignored; just under is used', () => {
  const store = memory()
  takeFeed('london', london(), T, store)
  assert.equal(recall('london', T + RATES_KEEP_MS - 1, store)?.code, 'GBP')
  assert.equal(recall('london', T + RATES_KEEP_MS, store), null)
  assert.equal(recall('london', T - 1, store), null, 'a clock set back is not trusted either')
  clearMoney()
  start(store, T + RATES_KEEP_MS + 1, never)()
  assert.equal(money(1500, 'london'), '₦1,500')
  clearMoney()
})

test('junk in storage is ignored: not JSON, wrong shapes, bad numbers, a storage that throws', () => {
  const key = ratesKey('london')
  const good = JSON.stringify({ at: T, ...london() })
  for (const junk of ['{nope', 'null', '[]', '"x"', '42', JSON.stringify({ at: 'now', ...london() }), JSON.stringify({ at: T, day: 5 }), JSON.stringify({ at: T, ...london(), rates: { NGN: 0, GBP: 1 } }), JSON.stringify({ at: T, ...london(), rates: { NGN: 1500, GBP: 'x' } }), JSON.stringify({ at: T, ...london(), currency: { code: 'GBP', symbol: '£', decimals: 7 } })]) assert.equal(recall('london', T + 1, memory({ [key]: junk })), null, junk)
  assert.equal(recall('london', T + 1, memory({ [key]: good }))?.code, 'GBP')
  assert.equal(recall('london', T, { getItem: () => { throw new Error('off') }, setItem: () => {} }), null)
  assert.doesNotThrow(() => takeFeed('london', london(), T, { getItem: () => null, setItem: () => { throw new Error('full') } }))
  clearMoney()
})
