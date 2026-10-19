import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { compileLocalTalkBank } from '../../scripts/talk-factory/local.ts'
import { cachedCityContent, loadCityContent, cityName } from '../../src/game/cities/registry.ts'
import { createLife } from '../../src/life.ts'
import { settingsOf } from '../admin/settings.ts'
import { routerOf } from '../models/service.ts'
import { ROUTE_MODULES } from '../routes/index.ts'
import { fixture, flakyDisk } from '../test-fixture.ts'
import type { FlakyDisk } from '../test-fixture.ts'
import type { Db, RouteContext, RouteModule } from '../types.ts'
import { forgetStoryTalk, installStoryTalkAssets } from './talk-service.ts'
import type { StoryTalkTurn, StoryTalkView } from './talk-service.ts'

const NOW = Date.UTC(2026, 9, 18, 12)
const bytesOf = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value))
const digest = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex')

async function scene(t: TestContext, { enabled = true, provider, disk, modelsAgentTalk = 'gateway:openai/gpt-5.6-luna' }: {
  enabled?: boolean
  provider?: () => Promise<Response>
  disk?: FlakyDisk
  modelsAgentTalk?: string | null
} = {}) {
  const captured: { ctx?: RouteContext } = {}
  const module: RouteModule = ctx => { captured.ctx = ctx; return {} }
  let calls = 0
  const f = await fixture(t, {
    ...(disk ? { disk } : {}), routes: [...ROUTE_MODULES, module], env: { AI_GATEWAY_API_KEY: 'fixture-talk-key' },
    fetch: async url => {
      assert.match(url, /^https:\/\/ai-gateway\.vercel\.sh\//)
      calls++
      return provider ? provider() : successful()
    },
  })
  const ctx = captured.ctx
  assert.ok(ctx)
  f.advance(NOW - f.now())
  await Promise.all(['lagos', 'kano'].map(loadCityContent))
  const content = cachedCityContent('kano')
  assert.ok(content)
  const venue = content.venues.find(row => row.id === 'kurmi-market')
  assert.ok(venue)
  const regulars = content.regulars.filter(row => row.venueId === venue.id)
  assert.ok(regulars.length)
  const who = await f.device('Local talk player')
  const sessionOf = (db: Db) => { const value = ctx.core.sessionByPublicId(db, who.id); assert.ok(value); return value }
  await f.server.store.transact(db => {
    const state = createLife({ name: who.name }, { now: NOW, cityId: 'kano' })
    state.onboarding.done = true; state.onboarding.required = false; state.location = venue.id
    sessionOf(db).cities = { kano: { state, updatedAt: NOW, salt: 'talk-fixture-character-first' } }
    sessionOf(db).character = { v: 2, city: 'kano' }
  })
  const setEnabled = async (value: boolean): Promise<void> => {
    const settings = settingsOf(ctx)
    const change = await f.server.store.transact(db => settings.change(db, 'storyMode', value, 'local-fixture'))
    settings.sync(change.values)
  }
  await setEnabled(enabled)
  if (modelsAgentTalk !== null) {
    const settings = settingsOf(ctx)
    const change = await f.server.store.transact(db => settings.change(db, 'modelsAgentTalk', modelsAgentTalk, 'local-fixture'))
    settings.sync(change.values)
  }
  const banks = regulars.map(row => {
    const evidence = {
      city: { id: 'kano', name: cityName('kano') ?? 'Kano', source: 'fixture canonical city' },
      npc: { id: row.id, name: row.definition.name, source: 'fixture canonical regular' },
      venue: { id: venue.id, name: venue.name, source: 'fixture canonical venue' },
      facts: [{ id: 'npc-role', text: row.definition.role, source: 'fixture canonical role' }], phrasebook: [],
    }
    return { npc: row.id, venue: venue.id, bank: compileLocalTalkBank({ ...evidence, voice: 'plain', lang: 'en', phrases: [] }), evidence }
  })
  const pack = bytesOf({ schema: 'allworld-city-talk', version: 1, city: 'kano', banks })
  const sha256 = digest(pack), path = `/assets/talk-banks/kano-${sha256}.json`
  const index = bytesOf({ schema: 'allworld-talk-index', version: 1, cities: [{ city: 'kano', path, sha256, bytes: pack.byteLength, banks: banks.length }] })
  let assetReads = 0
  const assets = async (wanted: string): Promise<Uint8Array> => { assetReads++; if (wanted === '/assets/talk-banks/index.json') return index; assert.equal(wanted, path); return pack }
  installStoryTalkAssets(ctx, assets)
  const post = async (question = 'Hello', fields: Record<string, unknown> = {}) => {
    const response = await f.request('/api/story/talk', { npc: regulars[0]!.id, clientId: f.id(), question, ...fields }, who.cookie)
    return { status: response.status, body: await response.json() as StoryTalkTurn }
  }
  const get = async () => { const response = await f.request('/api/story/talk', undefined, who.cookie); return await response.json() as StoryTalkView }
  return { f, ctx, who, content, venue, regulars, sessionOf, post, get, setEnabled, assets, calls: () => calls, assetReads: () => assetReads }
}

function successful(): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'A quiet conversation can be nice.' } }], usage: { prompt_tokens: 100, completion_tokens: 12 } }), { headers: { 'Content-Type': 'application/json' } })
}

test('authentication and the trusted flag precede asset or router access', async t => {
  const s = await scene(t, { enabled: false })
  assert.equal((await s.f.request('/api/story/talk')).status, 401)
  const hidden = await s.get()
  assert.equal(hidden.enabled, false)
  if (hidden.enabled) throw new Error('Expected disabled local conversations')
  assert.deepEqual({ ok: hidden.ok, enabled: hidden.enabled, reason: hidden.reason }, { ok: true, enabled: false, reason: 'City conversations are unavailable right now.' })
  assert.equal(Reflect.get(hidden, 'serverTime'), s.f.now())
  const off = await s.post()
  assert.equal(off.body.ok, false)
  assert.equal(s.assetReads(), 0); assert.equal(s.calls(), 0)
})

test('only current-venue regulars are exposed and common questions cost zero in the real router ledger', async t => {
  const s = await scene(t)
  const view = await s.get()
  assert.equal(view.enabled, true)
  if (!view.enabled) throw new Error('Expected enabled local conversation')
  assert.equal(view.venue.id, s.venue.id)
  assert.deepEqual(view.regulars.map(row => row.id), s.regulars.map(row => row.id))
  assert.match(view.venue.status, /^In the game:/)
  const router = routerOf(s.ctx); await router.ready()
  const before = router.today().ledger.requests
  for (const question of ['Hello', 'When do you open?', 'Where can I go?']) {
    const { body } = await s.post(question)
    assert.equal(body.ok, true)
    if (!body.ok) throw new Error('Expected a conversation reply')
    assert.equal(body.result.kind, 'reply')
    assert.deepEqual(body.result.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  }
  assert.equal(s.calls(), 0); assert.equal(router.today().ledger.requests, before)
  assert.equal(s.assetReads(), 2)
  const wrong = await s.post('Hello', { npc: 'a-regular-at-another-venue' })
  assert.equal(wrong.body.ok, false); assert.equal(s.calls(), 0)
  assert.equal((await s.post('Hello', { venue: 'nassarawa-garden' })).status, 400)
})

test('the actual default chain fails closed before paid dispatch when the full prompt exceeds admission', async t => {
  const s = await scene(t, { modelsAgentTalk: null })
  const router = routerOf(s.ctx); await router.ready()
  const before = { requests: router.today().ledger.requests, micro: router.today().ledger.micro }
  const result = await s.post('Thoughts?')
  assert.equal(result.body.ok, true)
  if (!result.body.ok || result.body.result.kind !== 'reply') throw new Error('Expected an authored fallback')
  assert.equal(result.body.result.source, 'fallback')
  assert.deepEqual(result.body.result.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  const after = router.today().ledger
  assert.equal(s.calls(), 0)
  assert.equal(after.requests, before.requests)
  assert.equal(after.micro, before.micro)
  assert.equal(after.byPurpose['agent-talk'], undefined)
})

test('live cost is accounted by the real router, a retry is free, and a new character gets no old cache', async t => {
  const s = await scene(t), clientId = s.f.id()
  const first = await s.post('Thoughts?', { clientId })
  assert.equal(first.body.ok, true)
  if (!first.body.ok || first.body.result.kind !== 'reply' || first.body.result.accounting.kind !== 'live') throw new Error('Expected a paid live reply')
  const amount = first.body.result.accounting.costMicro
  assert.ok(amount > 0 && amount < 100)
  assert.equal(routerOf(s.ctx).today().ledger.byPurpose['agent-talk']?.micro, amount)
  const retry = await s.post('Thoughts?', { clientId })
  assert.equal(retry.body.ok, true)
  if (!retry.body.ok) throw new Error('Expected retry reply')
  assert.deepEqual(retry.body.result.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  assert.equal(s.calls(), 1)
  await s.f.server.store.transact(db => { s.sessionOf(db).cities.kano!.salt = 'talk-fixture-character-second' })
  const fresh = await s.post('Thoughts?')
  assert.equal(fresh.body.ok, true); assert.equal(s.calls(), 2)
  assert.doesNotMatch(JSON.stringify(fresh.body), /fixture-character|playerKey|characterKey|actorId/)
})

test('travel while the provider waits releases storage and suppresses late text with its real cost', { timeout: 5_000 }, async t => {
  let announce = (): void => {}, release = (): void => {}
  const started = new Promise<void>(resolve => { announce = resolve })
  const gate = new Promise<void>(resolve => { release = resolve })
  t.after(() => release())
  const s = await scene(t, { provider: async () => { announce(); await gate; return successful() } })
  const pending = s.post('Thoughts?')
  await started
  const elsewhere = s.content.venues.find(row => row.kind === 'park' && row.id !== s.venue.id)
  assert.ok(elsewhere)
  await s.f.server.store.transact(db => { s.sessionOf(db).cities.kano!.state.location = elsewhere.id })
  release()
  const result = await pending
  assert.equal(result.body.ok, false)
  if (result.body.ok) throw new Error('Expected withheld reply')
  assert.equal(result.body.code, 'place-changed')
  assert.equal(result.body.accounting.kind, 'live')
  assert.equal('result' in result.body, false)
  assert.equal(s.calls(), 1)
})

test('erasure fences late paid text and replacing assets clears cached replies', { timeout: 5_000 }, async t => {
  let announce = (): void => {}, release = (): void => {}
  const started = new Promise<void>(resolve => { announce = resolve })
  const gate = new Promise<void>(resolve => { release = resolve })
  t.after(() => release())
  const s = await scene(t, { provider: async () => { announce(); await gate; return successful() } })
  const pending = s.post('Thoughts?')
  await started
  forgetStoryTalk(s.ctx, [s.who.id])
  release()
  const result = await pending
  assert.equal(result.body.ok, true)
  if (!result.body.ok) throw new Error('Expected cancelled delivery')
  assert.equal(result.body.result.kind, 'cancelled')
  assert.equal(result.body.result.accounting.kind, 'live')
  assert.equal('text' in result.body.result, false)
  const oldCalls = s.calls()
  installStoryTalkAssets(s.ctx, s.assets)
  const next = await s.post('Thoughts?')
  assert.equal(next.body.ok, true); assert.equal(s.calls(), oldCalls + 1)
})

test('a bank load cannot authorize paid dispatch after travel or feature disablement', { timeout: 5_000 }, async t => {
  for (const change of ['travel', 'flag']) {
    const s = await scene(t)
    let enter = () => {}, release = () => {}
    const entered = new Promise<void>(resolve => { enter = resolve }), gate = new Promise<void>(resolve => { release = resolve })
    t.after(() => release())
    installStoryTalkAssets(s.ctx, async path => { if (path !== '/assets/talk-banks/index.json') { enter(); await gate }; return s.assets(path) })
    const pending = s.post('What makes a good conversation?')
    await entered
    if (change === 'flag') await s.setEnabled(false)
    else await s.f.server.store.transact(db => { s.sessionOf(db).cities.kano!.state.location = 'home' })
    release()
    const result = await pending
    assert.equal(result.body.ok, false)
    assert.equal(s.calls(), 0)
    await s.f.server.store.read(db => { assert.equal(Object.values(s.sessionOf(db).once ?? {}).filter(row => row.kind === 'story.talk.attempt').length, 0) })
  }
})

test('paid dispatch waits for durable admission and duplicate IDs survive local expiry and reset', { timeout: 5_000 }, async t => {
  const disk = flakyDisk(), s = await scene(t, { disk }), clientId = s.f.id()
  let reserved = () => {}, release = () => {}
  const entered = new Promise<void>(resolve => { reserved = resolve })
  const originalOnce = s.ctx.once
  s.ctx.once = (db, session, descriptor, run) => {
    const result = originalOnce(db, session, descriptor, run)
    if (descriptor.kind === 'story.talk.attempt' && !('duplicate' in result)) { release = disk.hold(); reserved() }
    return result
  }
  t.after(() => release())
  const pending = s.post('Thoughts?', { clientId })
  await entered
  assert.equal(s.calls(), 0, 'reservation callback is not yet a durable commit')
  release()
  const first = await pending
  assert.equal(first.body.ok, true)
  assert.equal(s.calls(), 1)
  await s.f.server.store.read(db => {
    const receipt = Object.entries(s.sessionOf(db).once ?? {}).find(([id]) => id === clientId)?.[1]
    assert.ok(receipt); assert.equal(receipt.kind, 'story.talk.attempt')
    assert.match(receipt.fp, /^[a-f0-9]{64}$/)
    assert.deepEqual(receipt.result, { ok: true })
    assert.doesNotMatch(JSON.stringify(receipt), /conversation|history|reply|question/)
  })
  s.f.advance(31_000)
  for (const reset of [false, true]) {
    if (reset) installStoryTalkAssets(s.ctx, s.assets)
    const repeat = await s.post('Thoughts?', { clientId })
    assert.equal(repeat.body.ok, true)
    if (!repeat.body.ok) throw new Error('expected a duplicate receipt result')
    assert.deepEqual(repeat.body.result, { kind: 'rejected', reason: 'already-attempted', accounting: { kind: 'zero', routerCalls: 0, costMicro: 0 } })
    assert.equal(s.calls(), 1)
  }
})
