// OWNER: shell — the gist, cache first (./gistStore.ts): the kept lines show at once, the server's answer replaces them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { gist, loadGist } from './gistStore.ts'
import { writeCache } from '../../state/cacheFirst.ts'

function fake() {
  const data = new Map<string, string>()
  return { data, get length() { return data.size }, key: (i: number) => [...data.keys()][i] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, removeItem: (k: string) => { data.delete(k) } }
}
const line = (n: number, text: string) => ({ n, at: 1000 + n, city: 'lagos', kind: 'x', text })
const reset = (): void => { gist.city = ''; gist.lines = []; gist.at = 0; gist.loading = false; gist.failed = false }

test('the kept lines are there before the server answers, then the answer replaces them and is kept', async () => {
  reset()
  const store = fake()
  writeCache({ name: 'gist.lagos', version: 1, maxAgeMs: 1e9 }, [line(1, 'old news')], 1000, store)
  let release: (value: unknown) => void = () => undefined
  const asking = loadGist(() => new Promise((resolve) => { release = resolve }), 'lagos', 2000, false, store)
  assert.deepEqual(gist.lines.map((l) => l.text), ['old news'], 'shown at once')
  assert.equal(gist.loading, true)
  release({ items: [line(2, 'fresh news')] })
  await asking
  assert.deepEqual(gist.lines.map((l) => l.text), ['fresh news'], 'replaced')
  const kept = JSON.parse([...store.data.values()][0]!) as { d: { text: string }[] }
  assert.equal(kept.d[0]!.text, 'fresh news')
})
test('a failed read leaves the kept lines on screen and says it failed', async () => {
  reset()
  const store = fake()
  writeCache({ name: 'gist.lagos', version: 1, maxAgeMs: 1e9 }, [line(1, 'old news')], 1000, store)
  await loadGist(() => Promise.reject(new Error('offline')), 'lagos', 2000, false, store)
  assert.deepEqual([gist.lines.length, gist.failed], [1, true])
})
test('another city does not show this one\'s lines', async () => {
  reset()
  const store = fake()
  writeCache({ name: 'gist.lagos', version: 1, maxAgeMs: 1e9 }, [line(1, 'lagos news')], 1000, store)
  await loadGist(() => Promise.reject(new Error('offline')), 'accra', 2000, false, store)
  assert.deepEqual(gist.lines, [])
})
