import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { CITY_CONTENT_ASSETS } from '../src/game/cities/content-assets.generated.ts'
import { cachedCityContent, loadCityContent, registeredCityIds } from '../src/game/cities/registry.ts'
import { createServer } from './server.ts'

test('Node host serves a real city life and loads every authenticated payload from the built checkout dist directory', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'joinallworld-node-cities-'))
  const dataDir = join(directory, 'data')
  const built = fileURLToPath(new URL('../dist', import.meta.url))
  for (const row of CITY_CONTENT_ASSETS) {
    assert.equal(cachedCityContent(row.id), null, `${row.id} begins cold`)
  }
  const server = await createServer({ dataDir, now: () => 1_800_000_000_000, env: {}, log: () => {} })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await rm(directory, { recursive: true, force: true })
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
  const made = await fetch(`${origin}/api/session`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'City reader' }),
  })
  assert.equal(made.status, 200)
  await made.json()
  const cookie = (made.headers.get('set-cookie') ?? '').split(';')[0]
  assert.ok(cookie)
  const response = await fetch(`${origin}/api/life?city=kigali`, { headers: { origin, cookie } })
  assert.equal(response.status, 200)
  const result: unknown = await response.json()
  assert.ok(result && typeof result === 'object')
  const state: unknown = Reflect.get(result, 'state')
  assert.ok(state && typeof state === 'object')
  const estate: unknown = Reflect.get(state, 'estate')
  assert.ok(estate && typeof estate === 'object')
  assert.equal(Reflect.get(estate, 'city'), 'kigali')

  assert.equal(CITY_CONTENT_ASSETS.length, registeredCityIds().length)
  for (const row of CITY_CONTENT_ASSETS) {
    const expected: unknown = JSON.parse(await readFile(join(built, row.path), 'utf8'))
    assert.ok(expected && typeof expected === 'object')
    assert.deepEqual(await loadCityContent(row.id), Reflect.get(expected, 'content'), row.id)
  }
})
