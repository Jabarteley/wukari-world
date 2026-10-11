import assert from 'node:assert/strict'
import test from 'node:test'
import { cachedCityContent, registerCityForTest } from '../src/game/cities/registry.ts'
import { fictionalCity } from '../src/game/cities/testing/fictionalCity.test-fixture.ts'
import { buildRoutes } from './routes/index.ts'
import { buildSocketHandlers } from './ws/index.ts'
import { prepareStoredCityContent, requestedCityIds } from './request-city-content.ts'
import type { Db, RouteContext, RouteRequest, WsConnection } from './types.ts'

const context = (): RouteContext => {
  const core: Record<string, unknown> = {
    sessionOf: () => undefined,
    sockets: () => [],
    socketsOf: () => [],
    log: () => {},
  }
  return {
    store: { read: async (read: (db: Db) => unknown) => read({ sessions: {} } as Db) },
    fail: (status: number, code: string) => Object.assign(new Error(code), { status, code }),
    core,
    now: () => 1,
  } as unknown as RouteContext
}

const request = (json: RouteRequest['json'], query = ''): RouteRequest => ({
  method: 'POST', path: '/api/test', params: {}, query: new URLSearchParams(query), ip: '127.0.0.1',
  moderator: () => false, json, session: () => undefined, requireSession: () => { throw new Error('unused') },
  secret: undefined, raw: {},
})

test('request city discovery accepts only explicit catalogue cities', () => {
  assert.deepEqual(requestedCityIds({ cityId: 'lagos', city: '../private', to: 'ibadan', payload: { to: 'abuja', id: 'library' } }), ['lagos', 'ibadan', 'abuja'])
  assert.deepEqual(requestedCityIds({ nested: { cityId: 'kano' }, payload: ['lagos'] }), [])
})

test('route barrier preserves the handler parser limit and prepares its parsed city before dispatch continues', async () => {
  const ctx = context()
  let parsedWith: number | undefined, handled = false
  const routes = buildRoutes(ctx, [() => ({
    'POST /api/test': async (incoming) => {
      const body = await incoming.json(37)
      assert.equal(body.cityId, 'ibadan')
      assert.ok(cachedCityContent('ibadan'))
      handled = true
      return { body: { ok: true } }
    },
  })])
  const incoming = request(async (limit) => { parsedWith = limit; return { cityId: 'ibadan' } })
  await routes.match('POST', '/api/test')!.handler(incoming)
  assert.equal(parsedWith, 37)
  assert.equal(handled, true)
})

test('route barrier prepares a valid path city before the handler', async () => {
  const ctx = context()
  const routes = buildRoutes(ctx, [() => ({
    'GET /api/test/:city': () => { assert.ok(cachedCityContent('abuja')); return { body: { ok: true } } },
  })])
  const matched = routes.match('GET', '/api/test/abuja')!
  const incoming = request(async () => ({}))
  incoming.method = 'GET'; incoming.params = matched.params
  await matched.handler(incoming)
})

test('raw-body routes are not parsed early', async () => {
  const ctx = context()
  let parses = 0, rawReads = 0
  const routes = buildRoutes(ctx, [() => ({
    'POST /api/test': async (incoming) => { await incoming.rawBody!(128); return { body: { ok: true } } },
  })])
  const incoming = request(async () => { parses += 1; return {} })
  incoming.rawBody = async () => { rawReads += 1; return new Uint8Array() }
  await routes.match('POST', '/api/test')!.handler(incoming)
  assert.deepEqual([parses, rawReads], [0, 1])
})

test('socket barrier prepares an explicit city before the registered handler', async () => {
  const ctx = context()
  let handled = false
  const dispatch = buildSocketHandlers(ctx, [() => ({ messages: {
    'city-read': async () => { assert.ok(cachedCityContent('kano')); handled = true },
  } })])
  const ws = { session: { id: 'public', name: 'Player' }, secret: 'secret' } as WsConnection
  await dispatch.messages.get('city-read')!.handle(ws, { type: 'city-read', cityId: 'kano' })
  assert.equal(handled, true)
})

test('asset failures become retryable city-content errors', async () => {
  const id = 'test-load-failure'
  const registration = registerCityForTest({
    ...fictionalCity,
    id,
    rules: { ...fictionalCity.rules, id },
    loadContent: async () => { throw new Error('private transport detail') },
  })
  try {
    await assert.rejects(prepareStoredCityContent(context(), undefined, [id]), {
      status: 503,
      code: 'city_content_unavailable',
      retryable: true,
      reason: 'City content is not ready. Please retry.',
    })
  } finally {
    registration.dispose()
  }
})
