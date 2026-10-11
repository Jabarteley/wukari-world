import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { registerCityForTest } from '../src/game/cities/registry.ts'
import { fictionalCity, fictionalNeighbourCity } from '../src/game/cities/testing/fictionalCity.test-fixture.ts'
import { requireSessionCities } from './city-content.ts'
import { transactWithCityContent } from './prepared-city-transaction.ts'
import { ROUTE_MODULES } from './routes/index.ts'
import { fixture } from './test-fixture.ts'
import type { Db, SessionRecord } from './types.ts'

const player = (db: Db, publicId: string): SessionRecord => {
  const session = Object.values(db.sessions).find(row => row.publicId === publicId)
  assert.ok(session)
  return session
}

test('cold HTTP preflight aborts without a write, then runs business and result-dependent hooks once', { timeout: 10000 }, async t => {
  let calls = 0, durableCalls = 0, committedCalls = 0
  let inspectCold: () => Promise<void> = async () => {}
  const registration = registerCityForTest({ ...fictionalCity, loadContent: async () => {
    await inspectCold()
    return fictionalCity.loadContent()
  } })
  t.after(() => registration.dispose())
  const f = await fixture(t, { routes: [...ROUTE_MODULES, ctx => ({
    'POST /api/prepared-proof': async request => ({ body: await transactWithCityContent(ctx, request, [], db => {
      calls++
      const session = request.requireSession(db, { renew: true })
      session.name = 'Prepared player'
      return { ok: true, name: session.name }
    }, { durable: result => { durableCalls++; return result.ok }, committed: result => { committedCalls++; assert.equal(result.name, 'Prepared player') }, waitForObserved: true }) }),
  })] })
  const who = await f.device('Cold player')
  await f.request('/api/life?city=lagos', null, who.cookie)
  await f.server.store.transact(db => {
    const session = player(db, who.id), state = session.cities.lagos?.state
    assert.ok(state)
    session.legacyLives = { [`${fictionalCity.id}:old`]: { state: { ...state, estate: { ...state.estate, city: fictionalCity.id } }, updatedAt: state.t, salt: '0123456789abcdef' } }
    session.legacyLifeCities = { [`${fictionalCity.id}:old`]: fictionalCity.id }
  })
  const before = await readFile(join(f.dir, 'devices.json'), 'utf8')
  const sessionsBefore = await f.server.store.read(db => JSON.stringify(db.sessions))
  inspectCold = async () => {
    assert.equal(await f.server.store.read(db => JSON.stringify(db.sessions)), sessionsBefore, 'the storage queue remains available during asset I/O')
    assert.deepEqual([calls, durableCalls, committedCalls], [0, 0, 0])
    assert.equal(await readFile(join(f.dir, 'devices.json'), 'utf8'), before)
  }
  const response = await f.request('/api/prepared-proof', {}, who.cookie)
  assert.equal(response.status, 200)
  await response.json()
  assert.deepEqual([calls, durableCalls, committedCalls], [1, 1, 1])
})

test('a business readiness failure is never treated as a preflight retry', async t => {
  let calls = 0
  const registration = registerCityForTest(fictionalCity)
  t.after(() => registration.dispose())
  const f = await fixture(t, { routes: [...ROUTE_MODULES, ctx => ({
    'POST /api/prepared-proof': async request => ({ body: await transactWithCityContent(ctx, request, [], db => {
      calls++
      const session = request.requireSession(db, { renew: true })
      session.name = 'Must be discarded'
      requireSessionCities(session, [fictionalCity.id])
      return { ok: true }
    }) }),
  })] })
  const who = await f.device('Ready player')
  const before = await readFile(join(f.dir, 'devices.json'), 'utf8')
  const response = await f.request('/api/prepared-proof', {}, who.cookie)
  assert.equal(response.status, 503)
  await response.json()
  assert.equal(calls, 1)
  assert.equal(await readFile(join(f.dir, 'devices.json'), 'utf8'), before)
})

test('a newly stored cold city after loading refuses the second preflight without invoking business', async t => {
  let calls = 0
  let addReference: () => Promise<void> = async () => {}
  const registrations = [registerCityForTest({ ...fictionalCity, loadContent: async () => {
    await addReference()
    return fictionalCity.loadContent()
  } }), registerCityForTest(fictionalNeighbourCity)]
  t.after(() => registrations.forEach(registration => registration.dispose()))
  const f = await fixture(t, { routes: [...ROUTE_MODULES, ctx => ({
    'POST /api/prepared-proof': async request => ({ body: await transactWithCityContent(ctx, request, [fictionalCity.id], db => {
      calls++
      request.requireSession(db, { renew: true }).name = 'Must not run'
      return { ok: true }
    }) }),
  })] })
  const who = await f.device('Raced player')
  await f.request('/api/life?city=lagos', null, who.cookie)
  addReference = () => f.server.store.transact(db => {
    const session = player(db, who.id), state = session.cities.lagos?.state
    assert.ok(state)
    session.legacyLives = { [`${fictionalNeighbourCity.id}:old`]: { state: { ...state, estate: { ...state.estate, city: fictionalNeighbourCity.id } }, updatedAt: state.t, salt: '0123456789abcdef' } }
    session.legacyLifeCities = { [`${fictionalNeighbourCity.id}:old`]: fictionalNeighbourCity.id }
  })
  const response = await f.request('/api/prepared-proof', {}, who.cookie)
  assert.equal(response.status, 503)
  await response.json()
  assert.equal(calls, 0)
  assert.equal(await f.server.store.read(db => player(db, who.id).name), 'Raced player')
})
