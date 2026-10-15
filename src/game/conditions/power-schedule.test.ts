// The published power plan and what a cut does to play (docs/CITY-TEXTURE.md): the plan is the grid's own, the gear protects a home, and no cut blocks anything social.
import { loadCityContent as preloadCityContent } from '../cities/registry.ts'
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent))
import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceLife, createLife, dispatch } from '../../life.ts'
import { lagosTime } from '../clock.ts'
import { makeContext } from '../util.ts'
import type { LifeContext, LifeState } from '../../types/life.ts'
import { powerCutAt, powerCutsOn } from './grid.ts'
import { LITRE_PRICE } from './power.ts'
import { powerSchedule, scheduleWords } from './power-schedule.ts'
import { cutWords } from './power-words.ts'
import { powerOf } from '../systems/home.ts'

const ctxAt = (now: number): LifeContext => makeContext({ now, cityId: 'lagos', seed: 'texture' })
const DISTRICT = 'Yaba'
const NOON = Date.UTC(2026, 0, 5, 11)

/** The first day from 5 January 2026 on whose cuts start after noon, so the plan is not empty at `NOON`. */
function dayWithCut(): { day: number; from: number; to: number } {
  for (let day = lagosTime(NOON).day; day < lagosTime(NOON).day + 60; day++) { const [cut] = powerCutsOn('lagos', DISTRICT, day); if (cut) return { day, ...cut } }
  throw new Error('no cut in 60 days')
}

test('the plan is deterministic, and it is the cuts the grid really makes', () => {
  assert.deepEqual(powerSchedule('lagos', DISTRICT, NOON), powerSchedule('lagos', DISTRICT, NOON))
  const found = dayWithCut(), at = Date.UTC(1970, 0, 1) + found.day * 86400000 - 3600000 + 6 * 3600000
  const plan = powerSchedule('lagos', DISTRICT, at)
  assert.deepEqual(plan.map((day) => day.label), ['Today', 'Tomorrow'])
  for (const cut of plan.flatMap((day) => day.cuts)) assert.ok(powerCutAt('lagos', DISTRICT, cut.from + 60000), 'the grid is off inside every published cut')
  assert.ok(plan[0]?.cuts.every((cut) => cut.to > at), 'a cut that is over is not published')
})

test('the plan reads kindly in words, with "no cut planned" for a clear day', () => {
  const clear = scheduleWords('Yaba', [{ label: 'Today', cuts: [] }, { label: 'Tomorrow', cuts: [] }])
  assert.equal(clear, 'Light plan for Yaba. Today: no cut planned. Tomorrow: no cut planned.')
  const found = dayWithCut()
  const words = scheduleWords('Yaba', [{ label: 'Today', cuts: [found] }, { label: 'Tomorrow', cuts: [] }])
  assert.match(words, /^Light plan for Yaba\. Today: \d{1,2}(:\d\d)?(AM|PM) to \d{1,2}(:\d\d)?(AM|PM)/)
})

test('a cut says what the room does: the inverter is quiet, the generator is loud, nothing is a torch', () => {
  assert.match(cutWords('Yaba', null, false, 'inverter'), /inverter takes over without a sound/)
  assert.match(cutWords('Yaba', null, false, 'generator'), /generator coughs, then roars/)
  assert.match(cutWords('Yaba', null, false), /Phone torch on/)
  assert.match(cutWords('Yaba', null, false), /^NEPA has taken light in Yaba\./)
  assert.match(cutWords('Yaba', null, true, 'generator'), new RegExp(`${LITRE_PRICE.toLocaleString('en-NG')}|out of petrol`))
})

const GENERATOR = { id: 'f1', itemId: 'generator', x: 4, y: 4, rot: 0 }
const INVERTER = { id: 'f2', itemId: 'inverter', x: 3, y: 4, rot: 0 }
const room = (items: object[], fuel: number, now: number): LifeState => createLife({ location: 'home', cash: 100000, home: { items, fuel, custom: true, stocked: true } }, ctxAt(now))

test('a generator with petrol or an inverter protects the home in a cut; a bare room does not; the cost rules are the shop prices', () => {
  const found = dayWithCut(), during = found.from + 600000
  // The district of the default room is Yaba: the same cut.
  assert.equal(powerOf(room([INVERTER], 0, during), during).source, 'inverter')
  assert.equal(powerOf(room([GENERATOR], 7200, during), during).source, 'generator')
  assert.equal(powerOf(room([GENERATOR], 0, during), during).source, 'none')
  assert.equal(powerOf(room([], 0, during), during).source, 'none')
  assert.equal(powerOf(room([], 0, found.to + 60000), found.to + 60000).source, 'grid')
  const bought = room([], 0, during)
  const before = bought.cash
  const refuel = dispatch(bought, { type: 'home.refuel', payload: { litres: 1 } } as never, ctxAt(during))
  assert.equal(refuel.ok, false, 'petrol needs a generator in the room')
  assert.equal(bought.cash, before, 'and costs nothing when refused')
})

test('nothing social is blocked by a cut: a player in the dark can still go out and meet people', () => {
  const found = dayWithCut(), during = found.from + 600000
  const state = room([], 0, during)
  assert.equal(powerOf(state, during).source, 'none')
  advanceLife(state, 5, ctxAt(during))
  const result = dispatch(state, { type: 'travel', payload: { id: 'park', mode: 'trek' } } as never, ctxAt(during))
  assert.equal(result.ok, true, 'travelling to meet people works with the light off')
  assert.ok(!state.social.notices.some((notice) => /blocked|cannot|can't/i.test(notice.text) && notice.kind === 'power'), 'a power notice only informs')
})
