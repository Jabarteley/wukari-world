import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { money, nairaHint, setCityMoney, setDisplayCity } from './money.ts'
import { clearMoney, compactMoney, readCityMoney } from './money-feed.ts'
import { naira } from './util.ts'

afterEach(() => clearMoney())

const feed = (code: string, symbol: string, perUsd: number, decimals = 2, day = '2026-10-14', ngn = 1500) => ({ day, rates: { NGN: ngn, USD: 1, [code]: perUsd }, currency: { code, symbol, decimals } })
const give = (city: string, ...args: Parameters<typeof feed>) => setCityMoney(city, readCityMoney(feed(...args)))
const legacy = (v: unknown): string => `₦${Math.round(Number(v) || 0).toLocaleString('en-NG')}`

test('Nigerian cities and cities without a rate write exactly the old naira text', () => {
  give('lagos', 'NGN', '₦', 1500)
  for (const v of [0, 1, 999, 1000, 5000, 1234567.5, -300, -0.4, 'x', null, undefined, NaN, 1e12]) {
    assert.equal(money(v, 'lagos'), legacy(v), String(v))
    assert.equal(money(v, 'no-rate-city'), legacy(v))
    assert.equal(money(v), legacy(v), 'no display city')
    assert.equal(naira(v), legacy(v))
  }
  assert.equal(money(5000, 'lagos'), '₦5,000')
  assert.equal(nairaHint(5000, 'lagos'), null)
})

test('a city is written in its own money at the day rate', () => {
  give('london', 'GBP', '£', 0.75, 2) // 1500 NGN = 1 USD = 0.75 GBP: 1 GBP = 2000 NGN
  assert.equal(money(6800, 'london'), '£3.40')
  assert.equal(money(2_000_000, 'london'), '£1,000')
  give('accra', 'GHS', 'GH₵', 15, 2) // 1 GHS = 100 NGN
  assert.equal(money(4500, 'accra'), 'GH₵ 45.00')
  assert.equal(money(450_000, 'accra'), 'GH₵ 4,500')
  give('nairobi', 'KES', 'KSh', 130, 2) // 1 KES = 11.538 NGN
  assert.equal(money(138_462, 'nairobi'), 'KSh 12,000')
  assert.equal(money(0, 'nairobi'), 'KSh 0.00')
})

test('decimals: none for yen-like money; two otherwise; whole units from 100 up', () => {
  give('tokyo', 'JPY', '¥', 150, 0)
  assert.equal(money(15_000, 'tokyo'), '¥1,500')
  assert.equal(money(1_000, 'tokyo'), '¥100')
  give('paris', 'EUR', '€', 1, 2)
  assert.equal(money(149_999, 'paris'), '€100')
  assert.equal(money(148_500, 'paris'), '€99.00')
  assert.equal(money(1500, 'paris'), '€1.00')
})

test('a small non-zero amount is never written as zero', () => {
  give('london', 'GBP', '£', 0.75, 2)
  assert.equal(money(1, 'london'), '£0.01')
  assert.equal(money(-1, 'london'), '-£0.01')
  give('tokyo', 'JPY', '¥', 150, 0)
  assert.equal(money(1, 'tokyo'), '¥1')
  assert.equal(money(0, 'tokyo'), '¥0')
})

test('the day freezes a city: same day keeps the first rates, a new day replaces them', () => {
  give('london', 'GBP', '£', 0.75, 2, '2026-10-14')
  const before = money(6800, 'london')
  give('london', 'GBP', '£', 0.9, 2, '2026-10-14', 1000)
  assert.equal(money(6800, 'london'), before)
  give('london', 'GBP', '£', 0.9, 2, '2026-10-15', 1000)
  assert.equal(money(6800, 'london'), '£6.12')
})

test('the display city decides naira() and the hint shows the naira value', () => {
  give('accra', 'GHS', 'GH₵', 15, 2)
  assert.equal(naira(10_000), '₦10,000')
  setDisplayCity('accra')
  assert.equal(naira(10_000), 'GH₵ 100')
  assert.equal(nairaHint(10_000), '≈ ₦10,000')
  setDisplayCity('lagos')
  assert.equal(naira(10_000), '₦10,000', 'a city with no rate falls back')
})

test('a USD city needs only the naira rate; junk answers are refused', () => {
  setCityMoney('houston', readCityMoney({ day: '2026-10-14', rates: { NGN: 1500, USD: 1 }, currency: { code: 'USD', symbol: '$', decimals: 2 } }))
  assert.equal(money(15_000, 'houston'), '$10.00')
  for (const bad of [null, 'x', {}, { day: null, rates: { NGN: 1 }, currency: { code: 'USD', symbol: '$', decimals: 2 } }, { day: 'd', rates: { NGN: 1500 }, currency: { code: 'GBP', symbol: '£', decimals: 2 } }, { day: 'd', rates: { NGN: 0, GBP: 1 }, currency: { code: 'GBP', symbol: '£', decimals: 2 } }, { day: 'd', rates: { NGN: 1, GBP: 1 }, currency: null }]) assert.equal(readCityMoney(bad), null)
})

test('the short form follows the city', () => {
  give('london', 'GBP', '£', 0.75, 2)
  assert.equal(compactMoney(1_000_000_000, 'london'), '£500k')
  assert.equal(compactMoney(10_000, 'london'), '£5.00')
  assert.equal(compactMoney(5, 'lagos'), null)
})
