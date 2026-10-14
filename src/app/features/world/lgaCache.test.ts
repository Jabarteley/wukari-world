// OWNER: shell — the local-government directory and the Hall of Records, cache first (./lgaCache.ts, ../politics/recordsCache.ts),
// and the sign-out that clears what they kept (../account/useAccount.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLgaDirectory } from './worldModel.ts'
import { keepLga, recallLga } from './lgaCache.ts'
import { keepRecords, recallRecords } from '../politics/recordsCache.ts'
import { forgetDeviceLife } from '../account/useAccount.ts'
import { STORAGE_KEY } from '../../../storage-key.ts'
import type { FetchJson } from '../../types/client.ts'

function fake() {
  const data = new Map<string, string>()
  return { data, get length() { return data.size }, key: (i: number) => [...data.keys()][i] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, removeItem: (k: string) => { data.delete(k) } }
}
const person = (id: string, you = false) => ({ id, name: `Name ${id}`, online: false, you })
const info = { residents: 5, houses: 4, online: 1 }

test('the kept directory page shows before the server answers, then the answer replaces it and is kept for this player', async () => {
  const store = fake()
  keepLga('p1', 'lagos', 'ikeja', { info: info as never, items: [person('old', true)] as never, next: null }, 1000, store)
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => { release = resolve })
  const fetchJson = (async (path: string) => { await gate; return path.includes('/people') ? { items: [person('new', true)], next: 25 } : info }) as FetchJson
  const directory = createLgaDirectory({ fetchJson, cityId: () => 'lagos', kept: { recall: (city, id) => recallLga('p1', city, id, 2000, store), keep: (city, id, page) => keepLga('p1', city, id, page, 2000, store) } })
  const loading = directory.load('ikeja')
  const page = directory.pageOf('ikeja')
  assert.deepEqual([page.items?.map((i) => i.id), page.loading], [['old'], true], 'the kept page is there at once')
  release()
  await loading
  assert.deepEqual([page.items?.map((i) => i.id), page.next, page.loading], [['new'], 25, false])
  assert.deepEqual(recallLga('p1', 'lagos', 'ikeja', 2000, store)?.items.map((i) => i.id), ['new'])
  assert.equal(recallLga('p2', 'lagos', 'ikeja', 2000, store), null, 'another player never gets it')
})
test('a search is not seeded from the cache and is not kept', async () => {
  const store = fake()
  keepLga('p1', 'lagos', 'ikeja', { info: info as never, items: [person('old')] as never, next: null }, 1000, store)
  const fetchJson = (async (path: string) => (path.includes('/people') ? { items: [person('hit')], next: null } : info)) as FetchJson
  const directory = createLgaDirectory({ fetchJson, cityId: () => 'lagos', kept: { recall: (city, id) => recallLga('p1', city, id, 2000, store), keep: (city, id, page) => keepLga('p1', city, id, page, 2000, store) } })
  directory.pageOf('ikeja').q = 'hit'
  await directory.load('ikeja')
  assert.deepEqual(directory.pageOf('ikeja').items?.map((i) => i.id), ['hit'])
  assert.deepEqual(recallLga('p1', 'lagos', 'ikeja', 2000, store)?.items.map((i) => i.id), ['old'])
})
test('the kept record page round trips, per filter', () => {
  const store = fake()
  keepRecords('all', { entries: [], before: null, head: 'h', count: 3 }, 1000, store)
  assert.equal(recallRecords('all', 2000, store)?.head, 'h')
  assert.equal(recallRecords('election' as never, 2000, store), null)
})
test('signing out (or switching character) removes the saved life and everything kept', () => {
  const store = fake()
  keepLga('p1', 'lagos', 'ikeja', { info: info as never, items: [], next: null }, 1000, store)
  keepRecords('all', { entries: [], before: null, head: 'h', count: 3 }, 1000, store)
  store.data.set(STORAGE_KEY, '{}')
  store.data.set('unrelated', 'stays')
  forgetDeviceLife(store)
  assert.deepEqual([...store.data.keys()], ['unrelated'])
})
