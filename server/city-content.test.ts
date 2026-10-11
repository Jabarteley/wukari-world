import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createLife } from '../src/life.ts'
import { loadCityContent, registerCityForTest } from '../src/game/cities/registry.ts'
import { fictionalCity } from '../src/game/cities/testing/fictionalCity.test-fixture.ts'
import { settleCity } from './life-service.ts'
import { warmCityContentFailure } from './request-city-content.ts'
import { createStore } from './store.ts'
import { missingCityContentIds, prepareSessionCities, requireSessionCities, sessionCityIds } from './city-content.ts'
import type { Db, SessionRecord } from './types.ts'

test('preparation covers current, away and archived lives without changing saved records or receipts', async () => {
  await loadCityContent('lagos')
  const state = createLife(null, { cityId: 'lagos', now: 1_800_000_000_000 })
  const session: SessionRecord = {
    secret: 'test-city-content', publicId: 'test-player', name: 'Player', expiresAt: 1_900_000_000_000,
    cities: { lagos: { state, updatedAt: state.t, salt: '0123456789abcdef' } }, actions: {},
    legacyLives: { 'ibadan:123': { state: { ...state, estate: { ...state.estate, city: 'ibadan' } }, updatedAt: state.t, salt: 'fedcba9876543210' } },
    legacyLifeCities: { 'ibadan:123': 'ibadan' },
  }
  const saved = JSON.stringify(session)
  assert.deepEqual(sessionCityIds(session, ['abuja']), ['abuja', 'lagos', 'ibadan'])
  assert.throws(() => requireSessionCities(session, ['abuja']), { code: 'city_content_unavailable', status: 503 })
  assert.equal(JSON.stringify(session), saved)
  await prepareSessionCities(session, ['abuja'])
  assert.doesNotThrow(() => requireSessionCities(session, ['abuja']))
  assert.equal(JSON.stringify(session), saved)
})

test('only registered city ids are accepted as preparation inputs', () => {
  assert.deepEqual(sessionCityIds(undefined, ['lagos', 'lagos', '../private', null, 1]), ['lagos'])
})

test('a cold stored city aborts the real transaction byte-for-byte, warms outside it, and the same receipt applies once on retry', async (t) => {
  await loadCityContent('lagos')
  const registration = registerCityForTest(fictionalCity)
  const directory = await mkdtemp(join(tmpdir(), 'joinallworld-city-content-'))
  const store = await createStore<Db>(directory)
  t.after(async () => { registration.dispose(); await store.close().catch(() => {}); await rm(directory, { recursive: true, force: true }) })

  const state = createLife(null, { cityId: 'lagos', now: 1_800_000_000_000 })
  const session: SessionRecord = {
    secret: 'cold-city', publicId: 'cold-player', name: 'Player', expiresAt: 1_900_000_000_000,
    cities: { [fictionalCity.id]: { state: { ...state, estate: { ...state.estate, city: fictionalCity.id } }, updatedAt: state.t, salt: '0123456789abcdef' } },
    actions: {},
  }
  await store.transact((db) => { db.sessions[session.secret] = session })
  const file = join(directory, 'devices.json')
  const beforeMemory = await store.read((db) => JSON.stringify(db.sessions[session.secret]))
  const beforeFile = await readFile(file, 'utf8')
  let failure: unknown = null
  try {
    await store.transact((db) => {
      const stored = db.sessions[session.secret]
      if (!stored) throw new Error('missing test session')
      const life = settleCity(stored, fictionalCity.id, state.t + 1)
      life.cash -= 1
      Reflect.set(stored.actions, 'same-request', { at: state.t, ok: true, code: 'applied' })
    })
  } catch (error) {
    failure = error
  }
  assert.ok(failure instanceof Error)
  assert.equal(failure.message, 'city_content_unavailable')
  assert.equal(Reflect.get(failure, 'status'), 503)
  assert.equal(Reflect.get(failure, 'code'), 'city_content_unavailable')
  assert.deepEqual(missingCityContentIds(failure), [fictionalCity.id])
  assert.equal(await store.read((db) => JSON.stringify(db.sessions[session.secret])), beforeMemory)
  assert.equal(await readFile(file, 'utf8'), beforeFile)

  await warmCityContentFailure(failure)
  const apply = () => store.transact((db) => {
    const stored = db.sessions[session.secret]
    if (!stored) throw new Error('missing test session')
    if (Object.hasOwn(stored.actions, 'same-request')) return 'duplicate'
    const life = settleCity(stored, fictionalCity.id, state.t + 1)
    life.cash -= 1
    Reflect.set(stored.actions, 'same-request', { at: state.t, ok: true, code: 'applied' })
    return 'applied'
  })
  assert.equal(await apply(), 'applied')
  const once = await store.read((db) => {
    const stored = db.sessions[session.secret]
    if (!stored) throw new Error('missing test session')
    return { cash: stored.cities[fictionalCity.id]?.state.cash, receipts: Object.keys(stored.actions) }
  })
  assert.equal(await apply(), 'duplicate')
  assert.deepEqual(await store.read((db) => {
    const stored = db.sessions[session.secret]
    if (!stored) throw new Error('missing test session')
    return { cash: stored.cities[fictionalCity.id]?.state.cash, receipts: Object.keys(stored.actions) }
  }), once)
})
