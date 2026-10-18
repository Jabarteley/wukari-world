import assert from 'node:assert/strict'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { fixture } from '../test-fixture.ts'
import type { Device } from '../test-fixture.ts'
import type { RouteContext, RouteModule } from '../types.ts'
import { ROUTE_MODULES } from '../routes/index.ts'
import { settingsOf } from '../admin/settings.ts'
import { characterCity } from '../character.ts'
import { createLife } from '../../src/life.ts'
import { cachedCityContent, loadCityContent } from '../../src/game/cities/registry.ts'
import { signatureFor } from '../../src/story/signatures.ts'
import { HAGGLE } from '../house/haggle.ts'
import { forgetStoryHelp, peekStoryHelp } from './coop.ts'
import type { StorySignatureView } from './signature.ts'

const NOW = Date.UTC(2026, 9, 18, 10)
const city = 'kano'

async function scene(t: TestContext, on = true) {
  let captured: RouteContext | null = null
  const capture: RouteModule = ctx => { captured = ctx; return {} }
  const f = await fixture(t, { routes: [...ROUTE_MODULES, capture] })
  const ctx = captured as RouteContext | null
  assert.ok(ctx)
  f.advance(NOW - f.now())
  await loadCityContent(city)
  const setting = settingsOf(ctx)
  async function enabled(value: boolean) {
    const changed = await f.server.store.transact(db => setting.change(db, 'storyMode', value, 'local-test'))
    setting.sync(changed.values)
  }
  if (on) await enabled(true)
  const player = await f.device('Market player')
  await f.server.store.transact(db => {
    const session = ctx.core.sessionByPublicId(db, player.id)
    assert.ok(session)
    const state = createLife({ name: player.name, cash: 12_345 }, { now: f.now(), cityId: city })
    const signature = signatureFor(city, cachedCityContent(city))
    assert.equal(signature.kind, 'haggle'); assert.ok(signature.venue)
    state.onboarding.done = true; state.onboarding.required = false
    state.story.mode = 'free'; state.story.start = city
    state.location = signature.venue; state.spot = 'visit'
    session.cities = { [city]: { state, updatedAt: f.now(), salt: 'story-signature-test-salt-0001' } }
    session.character = { v: 2, city }
  })
  const get = async (who: Device = player): Promise<StorySignatureView> => {
    const response = await f.request('/api/story/signature', undefined, who.cookie)
    assert.equal(response.status, 200)
    return response.json() as Promise<StorySignatureView>
  }
  const post = async (body: Record<string, unknown>, who: Device = player) => {
    const response = await f.request('/api/story/signature', body, who.cookie)
    return { status: response.status, ...await response.json() as StorySignatureView & { error?: string; code?: string; reason?: string; duplicate?: boolean } }
  }
  const state = () => f.server.store.read(db => {
    const session = ctx.core.sessionByPublicId(db, player.id)
    assert.ok(session)
    const current = characterCity(session)
    assert.ok(current)
    return session.cities[current]!.state
  })
  return { f, ctx, player, get, post, state, enabled }
}

test('a practice bargain accepts an offer, retries exactly and never exposes the hidden thresholds', async t => {
  const s = await scene(t), before = (await s.state()).cash, first = await s.get()
  assert.deepEqual([first.enabled, first.available, first.city, first.venue], [true, true, city, 'kurmi-market'])
  assert.ok(first.item)
  assert.equal(JSON.stringify(first).includes('floor'), false)
  assert.equal(JSON.stringify(first).includes('fair'), false)

  const clientId = s.f.id(), accepted = await s.post({ clientId, offer: first.item.list })
  assert.deepEqual([accepted.ok, accepted.code, accepted.verdict?.kind, accepted.item?.deal], [true, 'offer_checked', 'accept', first.item.list])
  assert.equal((await s.state()).cash, before, 'the practice quote never charges game cash')
  const retry = await s.post({ clientId, offer: first.item.list })
  assert.equal(retry.duplicate, true)
  assert.deepEqual(retry.item, accepted.item)
  const conflict = await s.post({ clientId, offer: first.item.list - 10 })
  assert.deepEqual([conflict.status, conflict.error], [409, 'client_id_conflict'])

  const reset = await s.post({ clientId: s.f.id(), reset: true })
  assert.deepEqual([reset.code, reset.item?.ask, reset.item?.rounds, reset.item?.deal], ['bargain_restarted', first.item.list, 0, null])
})

test('the server owns the floor, refusal and finite rounds', async t => {
  const s = await scene(t), first = await s.get()
  assert.ok(first.item)
  const floor = Math.ceil(first.item.list * 0.85 / 10) * 10
  const refused = await s.post({ clientId: s.f.id(), offer: floor - 10 })
  assert.deepEqual([refused.verdict?.kind, refused.item?.rounds, refused.item?.ask], ['refuse', 1, first.item.list])

  await s.post({ clientId: s.f.id(), reset: true })
  const counter = await s.post({ clientId: s.f.id(), offer: floor })
  assert.equal(counter.verdict?.kind, 'counter')
  assert.ok((counter.verdict?.price ?? 0) >= floor)
  assert.equal(JSON.stringify(counter).includes('floor'), false)

  await s.post({ clientId: s.f.id(), reset: true })
  for (let round = 1; round <= HAGGLE.rounds; round += 1) {
    const answer = await s.post({ clientId: s.f.id(), offer: 0 })
    assert.deepEqual([answer.verdict?.kind, answer.item?.rounds], ['refuse', round])
  }
  const final = await s.post({ clientId: s.f.id(), offer: 0 })
  assert.deepEqual([final.verdict?.kind, final.item?.rounds], ['final', HAGGLE.rounds])
})

test('authentication, the admin flag, venue and Story chapter gates are authoritative', async t => {
  const off = await scene(t, false)
  const unauthenticated = await off.f.request('/api/story/signature')
  assert.equal(unauthenticated.status, 401)
  const hidden = await off.get()
  assert.deepEqual([hidden.enabled, hidden.available], [false, false])
  const disabled = await off.post({ clientId: off.f.id(), offer: hidden.item?.list ?? 2_000 })
  assert.deepEqual([disabled.ok, disabled.code], [false, 'story_disabled'])

  await off.enabled(true)
  await off.f.server.store.transact(db => {
    const session = off.ctx.core.sessionByPublicId(db, off.player.id)
    assert.ok(session)
    const state = session.cities[city]!.state
    state.story.mode = 'story'; state.location = 'racecourse'; state.spot = 'visit'
  })
  const elsewhere = await off.get()
  assert.equal(elsewhere.available, false); assert.match(elsewhere.reason ?? '', /Go to Kurmi Market/)
  await off.f.server.store.transact(db => {
    const session = off.ctx.core.sessionByPublicId(db, off.player.id)
    assert.ok(session)
    session.cities[city]!.state.location = 'kurmi-market'
  })
  const early = await off.get()
  assert.equal(early.available, false); assert.match(early.reason ?? '', /Chapter 2/)
  await off.f.server.store.transact(db => {
    const session = off.ctx.core.sessionByPublicId(db, off.player.id)
    assert.ok(session)
    session.cities[city]!.state.story.mode = 'free'
  })
  assert.equal((await off.get()).available, true)

  await off.f.server.store.transact(db => {
    const session = off.ctx.core.sessionByPublicId(db, off.player.id)
    assert.ok(session)
    session.cities[city]!.state.activeAction = { kind: 'call', id: 'mummy', duration: 8, remaining: 8 }
  })
  const busy = await off.get()
  assert.equal(busy.available, false); assert.match(busy.reason ?? '', /current action/)
  await off.f.server.store.transact(db => {
    const session = off.ctx.core.sessionByPublicId(db, off.player.id)
    assert.ok(session)
    const state = session.cities[city]!.state
    state.activeAction = null
    state.story.helper = { session: 'signature-help', host: 'story-host', kind: 'two-seat', city, venue: 'kurmi-market', until: off.f.now() + 60_000,
      from: { city, venue: 'kurmi-market', spot: 'visit' } }
  })
  const helping = await off.get()
  assert.equal(helping.available, false); assert.match(helping.reason ?? '', /help session/)
})

test('erasure removes the current bargain without retaining a history counter', async t => {
  const s = await scene(t), view = await s.get()
  assert.ok(view.item)
  await s.post({ clientId: s.f.id(), offer: 0 })
  assert.equal(await s.f.server.store.read(db => peekStoryHelp(db)?.bargains?.[s.player.id]?.rounds), 1)
  await s.f.server.store.transact(db => forgetStoryHelp(db, new Set([s.player.id])))
  assert.equal(await s.f.server.store.read(db => peekStoryHelp(db)?.bargains?.[s.player.id]), undefined)
})
