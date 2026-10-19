import assert from 'node:assert/strict'
import test from 'node:test'
import type { Chosen } from '../../game/chatter/types.ts'
import type { StoryTalkView } from '../../types/story-talk.ts'
import { cityTalkContextKey, createCityTalk } from './cityTalk.ts'
import type { CityTalkContext } from './cityTalk.ts'

const context = (): CityTalkContext => ({ identity: 'player', bornAt: 100, city: 'kano', venue: 'market', enabled: true, connected: true })
const chosen = (): Chosen => ({ slot: 41, startsAt: 900, exchangeId: 'original', beta: true,
  first: { npcId: 'amina', name: 'Amina · AI', text: 'Original first.' }, second: { npcId: 'bala', name: 'Bala · AI', text: 'Original second.' } })
function view(city = 'kano', venue = 'market'): Extract<StoryTalkView, { enabled: true }> {
  return { ok: true, enabled: true, available: true, reason: null, city: { id: city, name: city }, venue: { id: venue, name: venue, status: 'Open' },
    regulars: [
      { id: 'amina', name: 'Server Amina', role: 'guide', ai: true, ambient: ['Amina first.', 'Amina second.'] },
      { id: 'bala', name: 'Server Bala', role: 'seller', ai: true, ambient: ['Bala first.', 'Bala second.'] },
    ] }
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('same-context requests coalesce and deterministically use each speaker bank without changing metadata', async () => {
  const pending = deferred<unknown>(), original = chosen(), before = structuredClone(original)
  let calls = 0
  const adapter = createCityTalk({ fetchView: () => { calls++; return pending.promise }, now: () => 0 })
  const first = adapter.replace(context(), original), token = adapter.generation, second = adapter.replace(context(), original)
  await Promise.resolve()
  assert.equal(calls, 1)
  pending.resolve(view())
  const [a, b] = await Promise.all([first, second])
  assert.deepEqual(a, b)
  assert.ok(view().regulars[0]!.ambient!.includes(a.first.text))
  assert.ok(view().regulars[1]!.ambient!.includes(a.second.text))
  assert.deepEqual({ ...a, first: { ...a.first, text: original.first.text }, second: { ...a.second, text: original.second.text } }, original)
  assert.deepEqual(original, before)
  assert.equal(adapter.isCurrent(context(), token), true)
  assert.deepEqual(await adapter.replace(context(), original), a)
  assert.equal(calls, 1)
  const swapped: Chosen = { ...original, first: original.second, second: original.first }
  const reversed = await adapter.replace(context(), swapped)
  assert.equal(reversed.first.text, a.second.text)
  assert.equal(reversed.second.text, a.first.text)
})

test('disabled, disconnected and missing identities return the exact original synchronously with no requests', () => {
  let calls = 0
  const adapter = createCityTalk({ fetchView: async () => { calls++; return view() }, now: () => 0 }), original = chosen()
  for (const current of [{ ...context(), enabled: false }, { ...context(), connected: false }, { ...context(), identity: null }]) {
    assert.equal(adapter.replace(current, original), original)
  }
  assert.equal(calls, 0)
})

test('wrong city, venue, NPC and invalid payloads preserve the original template', async () => {
  const missing = view(); missing.regulars = missing.regulars.slice(0, 1)
  const duplicate = view(); duplicate.regulars.push({ ...duplicate.regulars[0]! })
  const invalid: unknown[] = [null, { ok: false }, { ok: true, enabled: false, reason: 'off' }, { ...view(), available: false }, view('accra'), view('kano', 'other'), missing, duplicate]
  for (const ambient of [undefined, [], Array.from({ length: 9 }, () => 'Too many.'), [''], ['   '], ['x'.repeat(141)], ['two\nlines'], ['hidden\u0000control'], ['hidden\u202econtrol'], [17]]) {
    invalid.push({ ...view(), regulars: [{ ...view().regulars[0], ambient }, view().regulars[1]] })
  }
  invalid.push({ ...view(), regulars: [{ ...view().regulars[0], ai: false }, view().regulars[1]] })
  invalid.push({ ...view(), regulars: [{ ...view().regulars[0], id: 'foreign-npc' }, view().regulars[1]] })
  for (const payload of invalid) {
    const original = chosen(), adapter = createCityTalk({ fetchView: async () => payload, now: () => 0 })
    assert.equal(await adapter.replace(context(), original), original)
  }
})

test('city, character, identity and flag changes fence late responses, including returning to the original context', async () => {
  const variants = [{ ...context(), city: 'accra' }, { ...context(), venue: 'other' }, { ...context(), bornAt: 101 }, { ...context(), identity: 'next-player' }, { ...context(), enabled: false }, { ...context(), connected: false }]
  for (const next of variants) {
    const pending = deferred<unknown>(), original = chosen()
    const adapter = createCityTalk({ fetchView: () => pending.promise, now: () => 0 })
    const stale = adapter.replace(context(), original), oldToken = adapter.generation
    await Promise.resolve()
    const current = adapter.replace(next, original)
    assert.equal(adapter.isCurrent(next, oldToken), false)
    adapter.clear()
    const returned = adapter.replace(context(), original)
    pending.resolve(view())
    assert.equal(await stale, original)
    assert.equal(await current, original)
    assert.equal(adapter.isCurrent(context(), oldToken), false)
    assert.notEqual(await returned, original)
  }
})

test('clear cancels undispatched acquisition and stale failures cannot evict a newer cache', async () => {
  let calls = 0
  const old = deferred<unknown>(), fresh = deferred<unknown>(), original = chosen()
  const adapter = createCityTalk({ fetchView: () => { calls++; return calls === 1 ? old.promise : fresh.promise }, now: () => 0 })
  const undispatched = adapter.replace(context(), original)
  adapter.clear()
  assert.equal(await undispatched, original)
  assert.equal(calls, 0)
  const stale = adapter.replace(context(), original)
  await Promise.resolve()
  adapter.clear()
  const latest = adapter.replace(context(), original)
  await Promise.resolve()
  fresh.resolve(view())
  const result = await latest
  old.reject(new Error('old request failed'))
  assert.equal(await stale, original)
  assert.deepEqual(await adapter.replace(context(), original), result)
  assert.equal(calls, 2)
})

test('failed and invalid acquisitions retry, resolved rows expire after the short TTL', async () => {
  let now = 0, calls = 0
  const pending = deferred<unknown>(), original = chosen()
  const adapter = createCityTalk({ fetchView: () => { calls++; return calls === 1 ? pending.promise : Promise.resolve(calls === 2 ? null : view()) }, now: () => now, ttlMs: 20 })
  const failed = adapter.replace(context(), original)
  await Promise.resolve(); pending.reject(new Error('offline'))
  assert.equal(await failed, original)
  assert.equal(await adapter.replace(context(), original), original)
  assert.notEqual(await adapter.replace(context(), original), original)
  assert.equal(calls, 3)
  now = 19; await adapter.replace(context(), original)
  assert.equal(calls, 3)
  now = 20; await adapter.replace(context(), original)
  assert.equal(calls, 4)
})

test('context keys are unambiguous and live playback checks reject unobserved identity changes', async () => {
  const adapter = createCityTalk({ fetchView: async () => view(), now: () => 0 })
  await adapter.replace(context(), chosen())
  const token = adapter.generation
  assert.notEqual(cityTalkContextKey({ ...context(), identity: 'a|b', city: 'c' }), cityTalkContextKey({ ...context(), identity: 'a', city: 'b|c' }))
  assert.equal(adapter.isCurrent({ ...context(), bornAt: 101 }, token), false)
  assert.equal(adapter.isCurrent({ ...context(), connected: false }, token), false)
  assert.equal(adapter.isCurrent({ ...context(), venue: 'other' }, token), false)
})
