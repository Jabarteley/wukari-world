import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient } from './client.ts'
import { cachedCityContent, loadCityContent } from './game/cities/registry.ts'
import { contentFor } from './game/cities/runtime.ts'

await loadCityContent('lagos')

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const messageOf = (value: unknown): string => value instanceof Error ? value.message : ''

test('a returning session loads its held city before publishing that city to reactive shell readers', async () => {
  assert.equal(cachedCityContent('abuja'), null, 'the destination starts cold')
  let coldRead: Error | null = null
  let client: ReturnType<typeof createClient>
  client = createClient({
    fetch: async (path) => String(path).startsWith('/api/session')
      ? json({ session: { id: 'player-1', name: 'Ada', cities: ['abuja'] }, serverTime: 1000 })
      : json({ state: { name: 'Ada', estate: { city: 'abuja' } }, rev: 1, serverTime: 1000 }),
    storage: { getItem: () => null, setItem() {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    onSession() {
      try { contentFor(client.cityId) }
      catch (error) { coldRead = error instanceof Error ? error : new Error(String(error)); throw error }
    },
  })

  const connected = await client.connect()
  assert.equal(coldRead, null, messageOf(coldRead))
  assert.equal(connected, true)
  assert.equal(client.cityId, 'abuja')
})
