// OWNER: shell — the online pill, cache first (./pulseCache.ts): the kept numbers show at once, the first answer replaces them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPulse } from './usePulse.ts'
import { PULSE_SPEC, seedPulse } from './pulseCache.ts'
import { writeCache } from '../../state/cacheFirst.ts'

function fake() {
  const data = new Map<string, string>()
  return { data, get length() { return data.size }, key: (i: number) => [...data.keys()][i] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, removeItem: (k: string) => { data.delete(k) } }
}
const numbers = (online: number) => ({ online, visits: 10, today: 3, cities: { lagos: online } })
const make = (answer: () => Promise<unknown>, now: () => number) => createPulse({ fetchJson: answer, now, visible: () => true, setTimer: () => 0, clearTimer: () => undefined })

test('the kept numbers show with their old time, and the first poll replaces them', async () => {
  const store = fake()
  writeCache(PULSE_SPEC, numbers(7), 1000, store)
  const pulse = make(() => Promise.resolve(numbers(9)), () => 5000)
  seedPulse(pulse, 5000, store)
  assert.deepEqual([pulse.state.numbers?.online, pulse.state.at], [7, 1000], 'old time, so the pill is amber')
  pulse.start()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual([pulse.state.numbers?.online, pulse.state.at], [9, 5000])
  pulse.stop()
})
test('numbers older than half an hour, or junk, are not shown', () => {
  const store = fake()
  writeCache(PULSE_SPEC, numbers(7), 1000, store)
  const old = make(() => Promise.resolve(null), () => 0)
  seedPulse(old, 1000 + 31 * 60000, store)
  assert.equal(old.state.numbers, null)
  store.data.set([...store.data.keys()][0]!, '{"v":1,"at":2000,"d":{"online":"many"}}')
  const junk = make(() => Promise.resolve(null), () => 0)
  seedPulse(junk, 3000, store)
  assert.equal(junk.state.numbers, null)
})
test('numbers that already arrived are never overwritten by the kept ones', () => {
  const store = fake()
  writeCache(PULSE_SPEC, numbers(7), 1000, store)
  const pulse = make(() => Promise.resolve(null), () => 4000)
  pulse.take({ ...numbers(12) })
  seedPulse(pulse, 4000, store)
  assert.equal(pulse.state.numbers?.online, 12)
})
