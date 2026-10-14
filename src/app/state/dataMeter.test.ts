import assert from 'node:assert/strict'
import { test } from 'node:test'
import { METER_KEY, addToday, costOf, createMeter, dayKey, formatBytes, readToday, usedLine } from './dataMeter.ts'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime()
/** A localStorage that remembers. */
const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, data } }

test('the day is the local calendar day', () => {
  assert.equal(dayKey(at(2026, 10, 14)), '2026-10-14')
  assert.equal(dayKey(at(2026, 1, 5, 0)), '2026-01-05')
  assert.equal(dayKey(at(2026, 12, 31, 23)), '2026-12-31')
})

test('a cached response costs nothing; a fetched one costs what crossed the wire', () => {
  assert.equal(costOf({ transferSize: 0 }), 0, 'cached')
  assert.equal(costOf({ transferSize: 51234 }), 51234)
  assert.equal(costOf({}), 0)
  assert.equal(costOf({ transferSize: -5 }), 0)
  assert.equal(costOf({ transferSize: Number.NaN }), 0)
  assert.equal(costOf({ transferSize: 1.4 }), 1)
})

test("today's total adds up, and starts again on a new day", () => {
  const store = memory()
  assert.deepEqual(readToday(store, at(2026, 10, 14)), { day: '2026-10-14', bytes: 0 })
  addToday(store, at(2026, 10, 14, 9), 1000)
  assert.deepEqual(addToday(store, at(2026, 10, 14, 23), 500), { day: '2026-10-14', bytes: 1500 })
  assert.equal(readToday(store, at(2026, 10, 14, 23)).bytes, 1500)
  // Past midnight: yesterday's total is not today's.
  assert.equal(readToday(store, at(2026, 10, 15, 0)).bytes, 0)
  assert.deepEqual(addToday(store, at(2026, 10, 15, 0), 70), { day: '2026-10-15', bytes: 70 })
  // A damaged record is nothing, not an error.
  store.data.set(METER_KEY, '{"day":"2026-10-15","bytes":"lots"}')
  assert.equal(readToday(store, at(2026, 10, 15)).bytes, 0)
  store.data.set(METER_KEY, 'not json')
  assert.equal(readToday(store, at(2026, 10, 15)).bytes, 0)
  assert.equal(readToday(null, at(2026, 10, 15)).bytes, 0)
  assert.doesNotThrow(() => addToday({ getItem: () => null, setItem: () => { throw new Error('full') } }, 0, 5))
})

test('bytes are shown the way a data plan counts them', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(640), '640 B')
  assert.equal(formatBytes(999), '999 B')
  assert.equal(formatBytes(1000), '1 KB')
  assert.equal(formatBytes(12_400), '12 KB')
  assert.equal(formatBytes(3_200_000), '3.2 MB')
  assert.equal(formatBytes(11_000_000), '11 MB')
  assert.equal(formatBytes(999_600), '1 MB', 'no 1000 KB')
  assert.equal(formatBytes(1_200_000_000), '1.2 GB')
  assert.equal(formatBytes(Number.NaN), '0 B')
  assert.equal(usedLine(3_200_000, 11_000_000), 'Data used: 3.2 MB this session · 11 MB today')
})

/** A meter whose browser parts are by hand. */
function rig(start: number, store = memory()) {
  let now = start, feed: ((entries: { transferSize?: number }[]) => void) | null = null, save: (() => void) | null = null
  const timers: (() => void)[] = []
  const meter = createMeter({
    storage: store, now: () => now,
    observe: (onEntries) => { feed = onEntries },
    onLeave: (run) => { save = run },
    setTimer: (run) => { timers.push(run); return timers.length }, clearTimer: () => {},
  })
  return { meter, store, give: (...sizes: number[]) => feed!(sizes.map((transferSize) => ({ transferSize }))), leave: () => save!(), advance: (ms: number) => { now += ms }, jump: (to: number) => { now = to }, flush: () => { while (timers.length) timers.shift()!() } }
}

test('the meter counts the session and today, and cached entries add nothing', () => {
  const { meter, give } = rig(at(2026, 10, 14, 10))
  give(1000, 0, 0, 2500)
  assert.equal(meter.session(), 3500)
  assert.equal(meter.today(), 3500)
  give(0)
  assert.equal(meter.session(), 3500)
})

test('the meter keeps what earlier visits today downloaded, and saves on a timer and when the page is left', () => {
  const store = memory()
  addToday(store, at(2026, 10, 14, 8), 8_000_000)
  const { meter, give, leave, flush } = rig(at(2026, 10, 14, 10), store)
  give(3_000_000)
  assert.equal(meter.session(), 3_000_000)
  assert.equal(meter.today(), 11_000_000)
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 8_000_000, 'not written yet')
  flush()
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 11_000_000)
  give(1000); leave()
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 11_001_000)
  leave()
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 11_001_000, 'saving twice adds nothing twice')
})

test('two tabs add to one total instead of overwriting each other', () => {
  const store = memory()
  const a = rig(at(2026, 10, 14, 10), store), b = rig(at(2026, 10, 14, 10), store)
  a.give(1000); b.give(2000)
  a.meter.save(); b.meter.save()
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 3000)
})

test('at midnight the session goes on and today starts again from 0', () => {
  const { meter, give, store, jump } = rig(at(2026, 10, 14, 23))
  give(5000)
  assert.equal(meter.today(), 5000)
  jump(at(2026, 10, 15, 0))
  assert.equal(meter.today(), 0, 'what was counted before midnight is yesterday\'s')
  give(700)
  assert.equal(meter.session(), 5700)
  assert.equal(meter.today(), 700)
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 5000, 'yesterday was saved to its own day')
  meter.save()
  assert.equal(readToday(store, at(2026, 10, 15)).bytes, 700)
})

test('listeners hear each change, and stop() saves', () => {
  const { meter, give, store } = rig(at(2026, 10, 14, 10))
  let heard = 0
  const stop = meter.subscribe(() => { heard += 1 })
  give(10); give(0); give(20)
  assert.equal(heard, 2, 'a cached entry changes nothing')
  stop(); give(5)
  assert.equal(heard, 2)
  meter.stop()
  assert.equal(readToday(store, at(2026, 10, 14)).bytes, 35)
})
