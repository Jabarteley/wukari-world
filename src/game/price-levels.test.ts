// Real price levels (docs/PRICE-LEVELS.md): the table, the scaling, Nigeria unchanged, London dear, Accra near Lagos, ratios sane, old saves.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PRICE_LEVEL_DATA } from './price-levels-data.ts'
import { LEVEL_MAX, LEVEL_MIN, priceLevelOf, scaleCityContent, scaleNaira } from './price-levels.ts'
import { loadCityContent, cachedCityContent } from './cities/registry.ts'
import { LAGOS_CONTENT } from './cities/lagos/content.ts'
import { INGREDIENTS } from './content/food.ts'
import { createLife } from '../life.ts'
import { groceryPrice } from './systems/home.ts'
import { makeContext } from './util.ts'
import { CURRENCY_COUNTRIES } from './currency.ts'
import type { CityContent } from '../types/content.ts'

const level = (country: string): number => priceLevelOf(PRICE_LEVEL_DATA, country)
const json = (value: unknown): string => JSON.stringify(value)

test('the table: a year, a source, a licence and one level per country', () => {
  assert.ok(Number.isInteger(PRICE_LEVEL_DATA.year) && PRICE_LEVEL_DATA.year >= 2021)
  assert.match(PRICE_LEVEL_DATA.url, /^https:\/\/data\.worldbank\.org\//)
  assert.equal(PRICE_LEVEL_DATA.licence, 'CC BY 4.0')
  const rows = Object.entries(PRICE_LEVEL_DATA.levels)
  assert.ok(rows.length >= 150, `${rows.length} countries`)
  for (const [code, [value, year]] of rows) {
    assert.match(code, /^[a-z]{2}$/)
    assert.ok(value > 0.05 && value < 3, `${code} ${value}`)
    assert.ok(year <= PRICE_LEVEL_DATA.year && year >= PRICE_LEVEL_DATA.year - 3, `${code} ${year}`)
  }
  assert.equal(PRICE_LEVEL_DATA.levels['us']?.[0], 1, 'the United States is the base of the World Bank series')
  assert.ok(PRICE_LEVEL_DATA.levels['ng'], 'Nigeria is in the table: every level is against it')
})

test('the loader: Nigeria is 1, London dear, Accra near Lagos, junk and unknown are 1, everything is inside the range', () => {
  assert.equal(level('ng'), 1)
  assert.equal(priceLevelOf(PRICE_LEVEL_DATA), 1)
  assert.equal(priceLevelOf(PRICE_LEVEL_DATA, 'nigeria'), 1)
  assert.equal(level('zz'), 1)
  assert.equal(level('GB'), level('gb'), 'any case')
  assert.ok(level('gb') > 2 && level('gb') <= LEVEL_MAX, `London ${level('gb')}`)
  assert.ok(level('gh') > 0.8 && level('gh') < 1.25, `Accra ${level('gh')}`)
  assert.ok(level('ke') > 0.8 && level('ke') < 1.3, `Nairobi ${level('ke')}`)
  assert.ok(level('us') > level('gb') || level('us') >= 2, 'the United States is dear too')
  assert.ok(level('in') < 1 && level('in') >= LEVEL_MIN, `India ${level('in')}`)
  assert.equal(level('kas'), level('in'), 'a map entry reads as the country whose money it uses')
  for (const country of CURRENCY_COUNTRIES) assert.ok(level(country) >= LEVEL_MIN && level(country) <= LEVEL_MAX, country)
  const wild = { ...PRICE_LEVEL_DATA, levels: { ng: [0.1, 2021], aa: [9, 2021], bb: [0.0001, 2021] } as const }
  assert.equal(priceLevelOf(wild, 'aa'), LEVEL_MAX)
  assert.equal(priceLevelOf(wild, 'bb'), LEVEL_MIN)
  assert.equal(priceLevelOf({ ...PRICE_LEVEL_DATA, levels: {} }, 'gb'), 1, 'no Nigeria row: no scaling')
})

test('scaleNaira: rounds like the game writes money, never to zero, level 1 untouched', () => {
  assert.equal(scaleNaira(2400, 1), 2400)
  assert.equal(scaleNaira(2400, 2.5), 6000)
  assert.equal(scaleNaira(2450, 2.51), 6100)
  assert.equal(scaleNaira(250, 2.5), 630)
  assert.equal(scaleNaira(30, 2.5), 75)
  assert.equal(scaleNaira(1, 0.5), 1)
  assert.equal(scaleNaira(0, 3), 0)
})

test('Nigerian cities are unchanged byte for byte; foreign ones carry their level', async () => {
  assert.equal(scaleCityContent(LAGOS_CONTENT, 1), LAGOS_CONTENT)
  for (const id of ['lagos', 'ibadan', 'abuja', 'kano']) {
    const content = await loadCityContent(id)
    assert.equal(content.priceLevel, undefined, id)
  }
  assert.equal(await loadCityContent('lagos'), LAGOS_CONTENT, 'the very same object')
  const prices = (content: CityContent) => json([content.housing.map((h) => [h.definition.rent, h.definition.moveIn]), content.workplaces.map((w) => [w.definition.shift, w.definition.track ? w.definition.ladder : null]), content.venues.map((v) => v.definition.spots)])
  assert.equal(prices(await loadCityContent('lagos')), prices(LAGOS_CONTENT))
  const london = await loadCityContent('london'), accra = await loadCityContent('accra')
  assert.equal(london.priceLevel, level('gb'))
  assert.equal(accra.priceLevel, level('gh'))
})

const entryRents = (content: CityContent) => content.housing.map((h) => h.definition.rent)
const entryPays = (content: CityContent) => content.workplaces.map((w) => w.definition.track ? w.definition.ladder[0]!.pay : w.definition.shift.reward ?? 0)

test('London is dear and pays more; Accra is close to Lagos (rent, wages, shop prices)', async () => {
  await Promise.all([loadCityContent('accra'), loadCityContent('london')])
  const { CONTENT: rawLondon } = await import('./cities/london/content.ts')
  const london = await loadCityContent('london'), accra = await loadCityContent('accra')
  const rawRents = entryRents(rawLondon), rents = entryRents(london)
  assert.ok(rents.length > 0)
  rents.forEach((rent, index) => assert.ok(rent >= (rawRents[index] ?? 0) * 2, `rent ${rent} vs ${rawRents[index]}`))
  const rawPays = entryPays(rawLondon), pays = entryPays(london)
  pays.forEach((pay, index) => assert.ok(pay >= (rawPays[index] ?? 0) * 2, `pay ${pay} vs ${rawPays[index]}`))
  const { CONTENT: rawAccra } = await import('./cities/accra/content.ts')
  const near = (a: number[], b: number[]) => a.forEach((value, index) => { const base = b[index] ?? 0; assert.ok(value >= base * 0.8 && value <= base * 1.25, `${value} vs ${base}`) })
  near(entryRents(accra), entryRents(rawAccra)); near(entryPays(accra), entryPays(rawAccra))
  assert.ok(london.workplaces.length === rawLondon.workplaces.length && london.venues.length === rawLondon.venues.length, 'nothing lost')
  // activity prices and rewards are scaled, and the original content is not mutated
  const sum = (content: CityContent) => content.venues.flatMap((v) => Object.values(v.definition.spots).flatMap((s) => s.activities)).reduce((total, a) => total + (a.cost ?? 0) + (a.reward ?? 0), 0)
  assert.ok(sum(london) >= sum(rawLondon))
  assert.equal(sum(rawLondon), sum(await import('./cities/london/content.ts').then((m) => m.CONTENT)))
  // shop prices go through the 'shop.price' modifier with the city's level
  const at = Date.UTC(2026, 0, 5, 9), lagosCtx = makeContext({ now: at, cityId: 'lagos' }), londonCtx = makeContext({ now: at, cityId: 'london' })
  const rice = INGREDIENTS['rice']!
  assert.equal(groceryPrice(createLife(null, lagosCtx), rice, 1, lagosCtx), rice.price, 'Lagos groceries cost what they always did')
  assert.equal(groceryPrice(createLife(null, londonCtx), rice, 1, londonCtx), scaleNaira(rice.price, level('gb')))
  assert.ok(groceryPrice(createLife(null, londonCtx), rice, 1, londonCtx) >= rice.price * 2)
  const accraCtx = makeContext({ now: at, cityId: 'accra' })
  const inAccra = groceryPrice(createLife(null, accraCtx), rice, 1, accraCtx)
  assert.ok(inAccra >= rice.price * 0.8 && inAccra <= rice.price * 1.25, `Accra rice ${inAccra}`)
})

test('wages stay in step with prices in every country: a shift still buys a day of food, rent keeps its share of pay', () => {
  const base = LAGOS_CONTENT
  const food = Object.values(INGREDIENTS).map((item) => item.price).sort((a, b) => a - b).slice(0, 3)
  const entry = (content: CityContent) => Math.min(...content.workplaces.filter((w) => w.definition.track).map((w) => (w.definition as { ladder: { pay: number }[] }).ladder[0]!.pay))
  const baseRatio = base.housing[0]!.definition.rent / entry(base)
  for (const country of Object.keys(PRICE_LEVEL_DATA.levels)) {
    const at = level(country), scaled = scaleCityContent(base, at)
    const day = food.reduce((total, price) => total + scaleNaira(price, at), 0)
    assert.ok(entry(scaled) >= day, `${country}: a shift pays ${entry(scaled)}, three packs cost ${day}`)
    const ratio = scaled.housing[0]!.definition.rent / entry(scaled)
    assert.ok(Math.abs(ratio - baseRatio) / baseRatio < 0.15, `${country}: rent/pay ${ratio} vs ${baseRatio}`)
    const helper = scaled.workplaces.find((w) => !w.definition.track)
    if (helper) assert.ok((helper.definition.shift.reward ?? 0) * 3 >= scaleNaira(Math.min(...Object.values(INGREDIENTS).map((i) => i.price)), at), country)
  }
})

test('old saves load: nothing stored is rewritten', async () => {
  await loadCityContent('london')
  const at = Date.UTC(2026, 0, 5, 9)
  const old = createLife(null, makeContext({ now: at, cityId: 'london', isNew: true }))
  old.cash = 123456
  const saved = JSON.parse(json(old)) as typeof old
  const loaded = createLife(saved, makeContext({ now: at, cityId: 'london' }))
  assert.equal(loaded.cash, 123456)
  assert.equal(json(loaded.economy), json(old.economy))
  assert.equal(json(createLife(JSON.parse(json(loaded)), makeContext({ now: at, cityId: 'london' }))), json(loaded), 'a second load changes nothing')
  assert.ok(cachedCityContent('london'))
  const lagos = createLife(null, makeContext({ now: at, cityId: 'lagos', isNew: true }))
  assert.equal(json(createLife(JSON.parse(json(lagos)), makeContext({ now: at, cityId: 'lagos' }))), json(lagos))
})
