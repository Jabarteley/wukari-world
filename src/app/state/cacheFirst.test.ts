// OWNER: shell — the cache-first helper (./cacheFirst.ts): max age, version, junk, quota, the size cap, per-player keys, clearing.
import test from 'node:test'
import assert from 'node:assert/strict'
import { CACHE_CAP, CACHE_PREFIX, ENTRY_MAX, clearCache, readCache, writeCache } from './cacheFirst.ts'
import type { CacheSpec } from './cacheFirst.ts'

/** A Storage in memory; `quota` (characters in all) makes setItem throw like a full browser store. */
function fake(quota = Infinity) {
  const data = new Map<string, string>()
  const size = (): number => [...data].reduce((sum, [k, v]) => sum + k.length + v.length, 0)
  return {
    data,
    get length() { return data.size },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem(k: string, v: string) { const before = data.get(k); data.set(k, v); if (size() > quota) { if (before === undefined) data.delete(k); else data.set(k, before); throw new DOMException('full', 'QuotaExceededError') } },
    removeItem: (k: string) => { data.delete(k) },
  }
}
const spec = (extra: Partial<CacheSpec> = {}): CacheSpec => ({ name: 'thing', version: 1, maxAgeMs: 1000, ...extra })
const any = (value: unknown): unknown => value

test('a kept value is read back with the time it was kept', () => {
  const store = fake()
  assert.equal(writeCache(spec(), { a: 1 }, 5000, store), true)
  assert.deepEqual(readCache(spec(), any, 5500, store), { value: { a: 1 }, at: 5000 })
})
test('nothing kept reads null, and so does storage that is not there', () => {
  assert.equal(readCache(spec(), any, 0, fake()), null)
  assert.equal(readCache(spec(), any, 0, undefined), null)
  assert.equal(writeCache(spec(), 1, 0, undefined), false)
})
test('older than the max age is not shown and is removed', () => {
  const store = fake()
  writeCache(spec(), 'x', 1000, store)
  assert.equal(readCache(spec(), any, 2000, store)?.value, 'x', 'exactly the max age is still allowed')
  assert.equal(readCache(spec(), any, 2001, store), null)
  assert.equal(store.data.size, 0)
})
test('a record from the future (a clock set back) is not trusted', () => {
  const store = fake()
  writeCache(spec(), 'x', 10_000_000, store)
  assert.equal(readCache(spec(), any, 1000, store), null)
})
test('another version is dropped', () => {
  const store = fake()
  writeCache(spec({ version: 1 }), 'old', 1000, store)
  assert.equal(readCache(spec({ version: 2 }), any, 1000, store), null)
  assert.equal(store.data.size, 0)
})
test('junk is dropped: not JSON, the wrong shape, or a value the caller refuses', () => {
  const store = fake()
  const key = `${CACHE_PREFIX}_/thing`
  for (const junk of ['{nope', 'null', '"text"', '{"v":1}', '{"v":1,"at":"x","d":1}']) {
    store.data.set(key, junk)
    assert.equal(readCache(spec(), any, 1000, store), null, junk)
    assert.equal(store.data.has(key), false, `${junk} is removed`)
  }
  writeCache(spec(), { n: 'text' }, 1000, store)
  assert.equal(readCache(spec(), (v) => (typeof (v as { n: unknown }).n === 'number' ? v : null), 1000, store), null)
  assert.equal(store.data.size, 0)
})
test('each player has a record of their own; public data has none', () => {
  const store = fake()
  writeCache(spec({ scope: 'p1' }), 'mine', 1000, store)
  writeCache(spec({ scope: 'p2' }), 'theirs', 1000, store)
  writeCache(spec(), 'public', 1000, store)
  assert.equal(readCache(spec({ scope: 'p1' }), any, 1000, store)?.value, 'mine')
  assert.equal(readCache(spec({ scope: 'p2' }), any, 1000, store)?.value, 'theirs')
  assert.equal(readCache(spec(), any, 1000, store)?.value, 'public')
  assert.equal(readCache(spec({ scope: 'p3' }), any, 1000, store), null)
})
test('a record that is too big is not kept, and does not leave an older copy behind', () => {
  const store = fake()
  writeCache(spec(), 'small', 1000, store)
  assert.equal(writeCache(spec(), 'x'.repeat(ENTRY_MAX), 1100, store), false)
  assert.equal(store.data.size, 0)
})
test('over the total cap the oldest go first, and the new one stays', () => {
  const store = fake()
  const chunk = 'y'.repeat(30_000)
  for (let i = 0; i < 8; i++) writeCache(spec({ name: `n${i}`, maxAgeMs: 1e9 }), chunk, 1000 + i, store)
  const total = [...store.data].reduce((sum, [k, v]) => sum + k.length + v.length, 0)
  assert.ok(total <= CACHE_CAP, `held ${total}`)
  assert.ok(store.data.has(`${CACHE_PREFIX}_/n7`), 'the newest is kept')
  assert.equal(store.data.has(`${CACHE_PREFIX}_/n0`), false, 'the oldest went')
})
test('a full browser store lets the oldest go and tries again; with nothing left to drop it gives up quietly', () => {
  const store = fake(2000)
  writeCache(spec({ name: 'a' }), 'a'.repeat(600), 1, store)
  writeCache(spec({ name: 'b' }), 'b'.repeat(600), 2, store)
  assert.equal(writeCache(spec({ name: 'c' }), 'c'.repeat(1200), 3, store), true)
  assert.equal(store.data.has(`${CACHE_PREFIX}_/a`), false)
  assert.equal(writeCache(spec({ name: 'd' }), 'd'.repeat(5000), 4, store), false)
})
test('storage that throws on every call changes nothing', () => {
  const broken = { get length(): number { throw new Error('off') }, key: () => { throw new Error('off') }, getItem: () => { throw new Error('off') }, setItem: () => { throw new Error('off') }, removeItem: () => { throw new Error('off') } }
  assert.equal(readCache(spec(), any, 0, broken), null)
  assert.equal(writeCache(spec(), 1, 0, broken), false)
  assert.doesNotThrow(() => clearCache(broken))
})
test('clearing drops every kept record and nothing else', () => {
  const store = fake()
  writeCache(spec({ scope: 'p1' }), 1, 1000, store)
  writeCache(spec(), 2, 1000, store)
  store.data.set('joinallworld-life-v1', '{}')
  clearCache(store)
  assert.deepEqual([...store.data.keys()], ['joinallworld-life-v1'])
})
