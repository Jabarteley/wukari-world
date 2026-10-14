import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCityIndex, loadCityNetwork, cityCatalogue } from './cities/registry.ts'
import { CURRENCY_CODES, currencyByCode, currencyOfCountry } from './currency.ts'

test('every country the city catalogue uses has a currency; a city without a country is in Nigeria', async () => {
  await loadCityIndex(); await loadCityNetwork()
  const missing = [...new Set(cityCatalogue().map((city) => city.countryISO).filter((iso): iso is string => Boolean(iso)))].filter((iso) => currencyOfCountry(iso) === null)
  assert.deepEqual(missing, [])
  assert.equal(currencyOfCountry(undefined)?.code, 'NGN')
  assert.equal(currencyOfCountry('xx'), null)
})

test('code, symbol and decimals', () => {
  assert.deepEqual(currencyOfCountry('ng'), { code: 'NGN', symbol: '₦', decimals: 2 })
  assert.deepEqual(currencyOfCountry('GH'), { code: 'GHS', symbol: 'GH₵', decimals: 2 })
  assert.equal(currencyOfCountry('ke')?.code, 'KES')
  assert.equal(currencyOfCountry('gb')?.symbol, '£')
  assert.equal(currencyOfCountry('jp')?.decimals, 0)
  assert.equal(currencyOfCountry('ug')?.decimals, 0)
  assert.equal(currencyOfCountry('kw')?.decimals, 3)
  assert.equal(currencyOfCountry('sn')?.code, 'XOF')
  assert.equal(currencyOfCountry('de')?.code, 'EUR')
  assert.equal(currencyByCode('zar')?.symbol, 'R')
  assert.ok(CURRENCY_CODES.includes('NGN') && CURRENCY_CODES.includes('USD') && CURRENCY_CODES.length > 100)
})
