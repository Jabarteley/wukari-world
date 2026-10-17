import assert from 'node:assert/strict'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { fixture, snapshot } from '../test-fixture.ts'
import type { Device } from '../test-fixture.ts'
import type { RouteContext, RouteModule } from '../types.ts'
import { ROUTE_MODULES } from '../routes/index.ts'
import { settingsOf } from '../admin/settings.ts'
import { characterCity } from '../character.ts'
import { createLife } from '../../src/life.ts'
import { loadCityContent, cachedCityContent } from '../../src/game/cities/registry.ts'
import { episodeById } from '../../src/game/content/episodes.ts'
import { missionCatalogues } from '../../src/game/systems/missions.ts'
import { chapterOf, storyBlock } from '../../src/story/ladder.ts'
import { STORY_HELP_MS } from '../../src/story/coop.ts'
import type { StoryHelpKind } from '../../src/types/story.ts'
import type { StoryHelpView, StoryHelpResult } from '../../src/app/features/story/coopModel.ts'
import { forgetStoryHelp, peekStoryHelp, storyCoop } from './coop.ts'
import { helpProof, playHelpTable } from './games.ts'

const NOW = Date.UTC(2026, 9, 17, 12)
const city = 'kano'

async function scene(t: TestContext, on = true) {
  let captured: RouteContext | null = null
  const capture: RouteModule = ctx => { captured = ctx; return {} }
  const f = await fixture(t, { routes: [...ROUTE_MODULES, capture] })
  const ctx = captured as RouteContext | null
  assert.ok(ctx)
  f.advance(NOW - f.now())
  await Promise.all(['lagos', city].map(loadCityContent))
  const setting = settingsOf(ctx)
  async function enabled(value: boolean) {
    const changed = await f.server.store.transact(db => setting.change(db, 'storyMode', value, 'local-test'))
    setting.sync(changed.values)
  }
  if (on) await enabled(true)
  const host = await f.device('Story host'), helper = await f.device('Story helper'), stranger = await f.device('Story outsider')
  await f.server.store.transact(db => {
    for (const [device, start] of [[host, city], [helper, 'lagos'], [stranger, 'lagos']] as const) {
      const session = ctx.core.sessionByPublicId(db, device.id)
      assert.ok(session)
      const state = createLife({ name: device.name }, { now: f.now(), cityId: start })
      state.onboarding.done = true; state.onboarding.required = false
      state.story.mode = 'story'; state.story.start = start; state.story.trackingSince = NOW - 1000
      session.cities = { [start]: { state, updatedAt: f.now(), salt: 'story-test-salt-0123456789' } }
      session.character = { v: 2, city: start }
    }
    const session = ctx.core.sessionByPublicId(db, host.id)
    assert.ok(session)
    const state = ctx.settle(session, city), content = cachedCityContent(city)
    assert.ok(content)
    for (const kind of ['city', 'country'] as const) {
      const episode = episodeById(`place-${city}-${kind}-story`)
      assert.ok(episode)
      state.episodes.mementos[episode.memento.id] = { id: episode.memento.id, version: 1, episodeId: episode.id,
        episodeVersion: 1, grantedAt: NOW - 10, origins: ['human'], rewardId: episode.memento.rewardId }
      state.episodes.runs[episode.id] = { id: episode.id, version: 1, chapter: 3, startedAt: NOW - 100,
        lastSeenAt: NOW - 10, choice: 'work', outcomeTags: [], observations: [], assistance: [], completedAt: null, mementoGranted: true,
        receipts: { 1: { chapter: 1, completedAt: NOW - 90, source: episode.intro.proof, reference: 'local-intro', origin: 'human' },
          2: { chapter: 2, completedAt: NOW - 80, source: episode.choices.find(row => row.id === 'work')!.proof, reference: 'local-work', origin: 'human' } } }
    }
    const missions = [...missionCatalogues.byId.values()].filter(row => row.cityId === city && missionCatalogues.authoredIds.has(row.id)).slice(0, 6)
    assert.equal(missions.length, 6)
    state.story.cities[city] = { missions: missions.map((row, i) => `mission:v1:${city}:${missionCatalogues.scopeIds.weekly.has(row.id) ? 'weekly' : 'daily'}:${100 + i}:${row.id}`), venues: content.venues.filter(row => row.id !== 'home').slice(0, 6).map(row => row.id) }
    const country = episodeById(`place-${city}-country-story`)
    assert.ok(country)
    state.location = country.location.venue; state.spot = country.chapters[2].destination.spot
    assert.equal(chapterOf(state, city), 3)
  })
  const post = async (path: string, body: Record<string, unknown>, who: Device) => {
    const response = await f.request(path, { clientId: f.id(), ...body }, who.cookie)
    return { status: response.status, ...await response.json() as StoryHelpResult & { error?: string; duplicate?: boolean } }
  }
  for (const device of [host, helper, stranger]) await f.request('/api/social/me', undefined, device.cookie)
  assert.equal((await post('/api/social/friends/request', { to: helper.id, cityId: city }, host)).code, 'requested')
  assert.equal((await post('/api/social/friends/answer', { from: host.id, accept: true, cityId: 'lagos' }, helper)).code, 'accepted')
  const stateOf = (device: Device) => f.server.store.read(db => {
    const session = ctx.core.sessionByPublicId(db, device.id)
    assert.ok(session)
    const current = characterCity(session)
    assert.ok(current)
    return snapshot(session.cities[current]!.state)
  })
  const view = async (device: Device): Promise<StoryHelpView> => {
    const response = await f.request('/api/story/help', undefined, device.cookie)
    assert.equal(response.status, 200)
    return response.json() as Promise<StoryHelpView>
  }
  const call = (kind: StoryHelpKind = 'second-answer', clientId = f.id(), to = helper.id) => post('/api/story/help', {
    clientId, to, kind, episodeId: `place-${city}-country-story`, chapter: 3,
  }, host)
  // The UI contract must keep matching the real server projection at compile time.
  const contract = (db: Parameters<ReturnType<typeof storyCoop>['list']>[0], who: Parameters<ReturnType<typeof storyCoop>['list']>[1]): StoryHelpView => storyCoop(ctx).list(db, who)
  void contract
  return { f, ctx, host, helper, stranger, post, view, call, stateOf, enabled }
}

test('friend help rejects strangers, verifies both answers, returns the helper and never unlocks their ladder', async t => {
  const s = await scene(t)
  assert.equal((await s.call('second-answer', s.f.id(), s.stranger.id)).code, 'friends_only')
  const before = await s.stateOf(s.helper), key = s.f.id(), called = await s.call('second-answer', key)
  assert.equal(called.code, 'help_called'); assert.ok(called.id)
  const duplicate = await s.call('second-answer', key)
  assert.equal(duplicate.id, called.id); assert.equal(duplicate.duplicate, true)
  assert.equal((await s.view(s.host)).remainingCalls, 2)
  assert.equal((await s.post('/api/story/help/join', { id: called.id }, s.stranger)).code, 'help_session_expired')
  assert.equal((await s.post('/api/story/help/join', { id: called.id }, s.helper)).code, 'help_joined')
  const joined = await s.stateOf(s.helper)
  assert.equal(joined.estate.city, city); assert.equal(joined.story.helper?.session, called.id)
  assert.deepEqual(joined.story.cities, before.story.cities)
  const episode = episodeById(`place-${city}-country-story`)
  assert.ok(episode)
  const questions = [episode.challenges.work, episode.challenges.study]
  assert.equal((await s.view(s.helper)).sessions[0]?.question?.prompt, questions[1]!.prompt)
  const wrong = questions[0]!.options.find(option => option.id !== questions[0]!.correct)
  assert.ok(wrong)
  assert.equal((await s.post('/api/story/help/answer', { id: called.id, answer: wrong.id }, s.host)).code, 'try_again')
  assert.equal((await s.stateOf(s.host)).story.cities[city]?.roots, undefined)
  assert.equal((await s.post('/api/story/help/answer', { id: called.id, answer: questions[0]!.correct }, s.host)).code, 'answer_recorded')
  assert.equal(chapterOf(await s.stateOf(s.host), city), 3)
  assert.equal((await s.post('/api/story/help/answer', { id: called.id, answer: questions[1]!.correct }, s.helper)).code, 'help_completed')
  assert.equal(chapterOf(await s.stateOf(s.host), city), 4)
  const after = await s.stateOf(s.helper)
  assert.equal(after.estate.city, before.estate.city); assert.equal(after.location, before.location); assert.equal(after.spot, before.spot)
  assert.equal(after.story.helper, undefined); assert.equal(after.story.helped.length, 1)
  assert.deepEqual(after.story.cities, before.story.cities)
  assert.equal(storyBlock(after, city), 'story_locked')
})

test('three calls per day, exact retry keys, flag disable and helper expiry keep their bounds', async t => {
  const s = await scene(t)
  for (let i = 0; i < 3; i++) {
    const call = await s.call()
    assert.equal(call.code, 'help_called'); assert.ok(call.id)
    if (i === 2) {
      assert.equal((await s.post('/api/story/help/join', { id: call.id }, s.helper)).code, 'help_joined')
      s.f.advance(STORY_HELP_MS + 1)
      const response = await s.f.request(`/api/life?city=${city}`, undefined, s.helper.cookie)
      assert.equal(response.status, 200)
      assert.equal((await s.stateOf(s.helper)).estate.city, 'lagos')
    } else assert.equal((await s.post('/api/story/help/end', { id: call.id }, s.host)).code, 'help_ended')
  }
  assert.equal((await s.call()).code, 'help_call_limit')
  await s.enabled(false)
  assert.equal((await s.call()).code, 'story_disabled')
  const view = await s.view(s.host)
  assert.equal(view.enabled, false); assert.deepEqual(view.sessions, [])
})

test('an errand cannot be claimed from client words, and erasure removes both sides of every pass', async t => {
  const s = await scene(t), call = await s.call('errand')
  assert.ok(call.id)
  await s.post('/api/story/help/join', { id: call.id }, s.helper)
  assert.equal((await s.post('/api/story/help/errand', { id: call.id, rewardId: 'made-up-reward' }, s.helper)).code, 'errand_not_verified')
  await s.f.server.store.transact(db => forgetStoryHelp(db, new Set([s.host.id])))
  assert.equal(await s.f.server.store.read(db => Object.keys(peekStoryHelp(db)?.sessions ?? {}).length), 0)
  const expired = await s.stateOf(s.helper)
  assert.equal(expired.story.helper?.host, 'former-player')
  assert.equal(expired.story.helper?.until, 1)
  s.f.advance(1)
  await s.f.request(`/api/life?city=${city}`, undefined, s.helper.cookie)
  assert.equal((await s.stateOf(s.helper)).estate.city, 'lagos')
})

test('a claimed local mission verifies an errand once and counts toward the host, with normal mission rewards', async t => {
  const s = await scene(t), call = await s.call('errand')
  assert.ok(call.id)
  assert.equal((await s.post('/api/story/help/join', { id: call.id }, s.helper)).code, 'help_joined')
  await s.f.server.store.transact(db => {
    const session = s.ctx.core.sessionByPublicId(db, s.helper.id)
    assert.ok(session)
    const state = s.ctx.settle(session, city)
    state.location = 'racecourse'; state.spot = 'visit'
    state.missions.daily = [{ id: 'd-local-kano-tale-life', n: 0, marks: [], claimed: false }]
  })
  const activity = await s.f.action(s.helper.cookie, { cityId: city, type: 'activity', payload: { id: 'kano-racecourse-visit' } })
  assert.equal(activity.ok, true)
  s.f.advance(9_000)
  const read = await s.f.request(`/api/life?city=${city}`, undefined, s.helper.cookie)
  assert.equal(read.status, 200)
  const earned = await s.stateOf(s.helper), pending = earned.missions.pending.find(row => row.id === 'd-local-kano-tale-life')
  assert.ok(pending)
  const claimed = await s.f.action(s.helper.cookie, { cityId: city, type: 'missions.claim', payload: { id: pending.id, rewardId: pending.rewardId } })
  assert.equal(claimed.ok, true)
  assert.equal((await s.post('/api/story/help/errand', { id: call.id, rewardId: pending.rewardId }, s.helper)).code, 'help_session_changed', 'hand-in is at the host challenge venue')
  const travel = await s.f.action(s.helper.cookie, { cityId: city, type: 'travel', payload: { id: 'nassarawa-garden', mode: 'trek' } })
  assert.equal(travel.ok, true)
  s.f.advance(((travel.state.activeAction?.remaining ?? 0) + 1) * 1000)
  await s.f.request(`/api/life?city=${city}`, undefined, s.helper.cookie)
  const verified = await s.stateOf(s.helper)
  assert.ok(verified.missions.grants.some(row => row.rewardId === pending.rewardId), JSON.stringify({ pending, grants: verified.missions.grants }))
  const key = s.f.id()
  const result = await s.post('/api/story/help/errand', { id: call.id, rewardId: pending.rewardId, clientId: key }, s.helper)
  assert.equal(result.code, 'help_completed', JSON.stringify({ grants: verified.missions.grants,
    session: await s.f.server.store.read(db => snapshot(peekStoryHelp(db)?.sessions[call.id!])), pending,
    authored: missionCatalogues.authoredIds.has(pending.id) }))
  assert.equal((await s.post('/api/story/help/errand', { id: call.id, rewardId: pending.rewardId, clientId: key }, s.helper)).duplicate, true)
  const host = await s.stateOf(s.host), helper = await s.stateOf(s.helper)
  assert.equal(host.story.cities[city]?.missions.filter(id => id === pending.rewardId).length, 1)
  assert.equal(host.story.cities[city]?.roots?.missionRewardId, pending.rewardId)
  assert.equal(chapterOf(host, city), 4)
  assert.equal(helper.story.helped.length, 1)
  assert.equal(helper.estate.city, 'lagos')
  assert.equal(storyBlock(helper, city), 'story_locked')
})

test('two-seat challenge accepts moves only from the current friend and completes with a server-verified win', async t => {
  const s = await scene(t), call = await s.call('two-seat')
  assert.ok(call.id)
  await s.post('/api/story/help/join', { id: call.id }, s.helper)
  assert.equal((await s.post('/api/story/help/seat', { id: call.id, cards: [0, 1] }, s.helper)).code, 'other_seat_turn')
  for (let move = 0; move < 30; move++) {
    const session = await s.f.server.store.read(db => snapshot(peekStoryHelp(db)!.sessions[call.id!]!))
    assert.equal(session.proof.kind, 'two-seat')
    if (session.proof.kind !== 'two-seat') throw new Error('table expected')
    if (session.phase === 'completed') {
      assert.equal(chapterOf(await s.stateOf(s.host), city), 4)
      assert.equal((await s.stateOf(s.helper)).story.helped.length, 1)
      return
    }
    if (session.proof.result === 'lost') {
      s.f.advance(1)
      assert.equal((await s.post('/api/story/help/seat', { id: call.id, restart: true }, s.host)).code, 'table_restarted')
      continue
    }
    const proof = session.proof, free = proof.board.map((_, i) => i).filter(i => !proof.found.includes(i))
    const a = free[0]!, b = free.find(i => i !== a && proof.board[i] === proof.board[a])!
    const result = await s.post('/api/story/help/seat', { id: call.id, cards: [a, b] }, proof.turn === 'host' ? s.host : s.helper)
    assert.equal(result.ok, true)
  }
  assert.fail('a correctly played table must be winnable')
})

test('the memory table needs both seats and server-owned matching pairs', () => {
  const table = helpProof('two-seat', 'proof-test')
  assert.equal(table.kind, 'two-seat')
  if (table.kind !== 'two-seat') throw new Error('table expected')
  assert.equal(playHelpTable(table, 'helper', [0, 1]).code, 'other_seat_turn')
  assert.equal(playHelpTable(table, 'host', [0, 0]).code, 'invalid_cards')
  while (table.result === 'playing') {
    const free = table.board.map((_, i) => i).filter(i => !table.found.includes(i))
    const a = free[0]!, b = free.find(i => i !== a && table.board[i] === table.board[a])!
    const result = playHelpTable(table, table.turn, [a, b])
    assert.equal(result.ok, true)
    if (result.won) {
      assert.ok(table.played.host > 0 && table.played.helper > 0)
      assert.ok(table.team > table.house)
      return
    }
  }
  assert.equal(table.result, 'lost')
})
