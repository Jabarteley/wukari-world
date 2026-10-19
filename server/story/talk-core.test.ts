import assert from 'node:assert/strict'
import test from 'node:test'
import type { AskInput, AskResult } from '../models/router.ts'
import type { TalkBankEvidenceV1, TalkBankV1, TalkTopic } from '../../scripts/talk-factory/bank.ts'
import { createTalkCore } from './talk-core.ts'
import type { TalkAuthority, TalkResult } from './talk-core.ts'

const topics: readonly TalkTopic[] = ['market', 'food', 'weather', 'work', 'city', 'festival', 'directions']
const letters = (value: number): string => {
  let out = '', left = value + 1
  while (left) { left--; out = String.fromCharCode(97 + left % 26) + out; left = Math.floor(left / 26) }
  return out
}

function bundle(cityId: TalkBankV1['city'] = 'kano', cityName = 'Kano', venueId = 'kurmi-market', venueName = 'Kurmi Market', npcId = 'amina') {
  const evidence: TalkBankEvidenceV1 = {
    city: { id: cityId, name: cityName, source: 'fixture city source' },
    npc: { id: npcId, name: 'Amina', source: 'fixture regular source' },
    venue: { id: venueId, name: venueName, source: 'fixture venue source' },
    facts: [{ id: 'location-fact', text: `${venueName} is in ${cityName}.`, source: 'fixture fact source' }],
    phrasebook: [{ lang: 'ha', text: 'Sannu', gloss: 'Hello', source: { kind: 'human', citation: 'fixture citation', contributor: 'fixture contributor' } }],
  }
  const ambient = Array.from({ length: 50 }, (_, at) => `${cityName} ${venueName} ambient ${letters(at)}`)
  const about: Record<TalkTopic, string[]> = {
    market: [], food: [], weather: [], work: [], city: [], festival: [], directions: [],
  }
  for (const [at, topic] of topics.entries()) about[topic] = [`${cityName} ${venueName} ${topic} ${letters(60 + at)}`]
  const bank: TalkBankV1 = {
    city: cityId, npc: npcId, voice: 'plain', lang: 'en',
    greet: [`Welcome to ${cityName} at ${venueName}.`], ambient, about,
    bye: [`Goodbye from ${cityName} ${venueName} alpha.`, `Goodbye from ${cityName} ${venueName} beta.`],
    phrases: evidence.phrasebook,
  }
  return { bank, evidence }
}

function authority(actorId = 'actor-a', cityId: TalkBankV1['city'] = 'kano', cityName = 'Kano', venueId = 'kurmi-market', venueName = 'Kurmi Market'): TalkAuthority {
  const loaded = bundle(cityId, cityName, venueId, venueName)
  return {
    actorId, characterKey: `life-${actorId}`, playerKey: `player-${actorId}`,
    city: { id: cityId, name: cityName, country: 'ng' },
    venue: { id: venueId, name: venueName, availability: { kind: 'rules', text: 'Open during game daytime.' } },
    regular: { id: 'amina', name: 'Amina', role: 'market guide' },
    bank: { revision: 'fixture-revision', load: async () => loaded },
    stillAuthorized: async () => true, admitAttempt: async () => 'fresh',
  }
}

const success = (text: string, costMicro = 7): AskResult => ({
  ok: true, text, model: '', provider: 'gateway', free: false, usage: { input: 50, output: 10 }, costMicro, attempts: [{ model: '', provider: 'gateway', ok: true }],
})

function assertReply(result: TalkResult): asserts result is Extract<TalkResult, { kind: 'reply' }> {
  assert.equal(result.kind, 'reply')
}

test('authoritative city and venue bind deterministic greetings with a human beta phrase', async () => {
  let calls = 0
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 10, ask: async () => { calls++; return success('unused') } })
  const kano = await core.talk(authority(), { clientId: 'greet-kano', question: 'Hello' })
  const accra = await core.talk(authority('actor-b', 'accra', 'Accra', 'makola-market', 'Makola Market'), { clientId: 'greet-accra', question: 'Hello' })
  const tokyo = await core.talk(authority('actor-c', 'tokyo', 'Tokyo', 'market-game', 'Tokyo Market'), { clientId: 'greet-tokyo', question: 'Hello' })
  assertReply(kano); assertReply(accra); assertReply(tokyo)
  assert.match(kano.text, /Kano.*Kurmi Market/)
  assert.match(accra.text, /Accra.*Makola Market/)
  assert.match(tokyo.text, /Tokyo.*Tokyo Market/)
  assert.equal(new Set([kano.text, accra.text, tokyo.text]).size, 3)
  assert.deepEqual(kano.phrase, { lang: 'ha', text: 'Sannu', gloss: 'Hello', beta: true })
  assert.equal(kano.ai, true)
  assert.equal(calls, 0)
})

test('rules, bank topics and game safety notices make zero router calls', async () => {
  let calls = 0
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 10, ask: async () => { calls++; return success('unused') } })
  const context = authority()
  const questions = ['Hello', 'When do you open?', 'Where is the market?', 'How much is it?', 'Tell me about food', 'Goodbye']
  for (const [at, question] of questions.entries()) {
    const result = await core.talk(context, { clientId: `rules-${at}`, question })
    assertReply(result)
    assert.deepEqual(result.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  }
  const identity = await core.talk(context, { clientId: 'identity', question: 'Are you a real person?' })
  const crisis = await core.talk(context, { clientId: 'crisis', question: 'I want to hurt myself' })
  assert.equal(identity.kind, 'notice'); assert.equal(crisis.kind, 'notice')
  if (identity.kind === 'notice') assert.match(identity.text, /game|AI/i)
  if (crisis.kind === 'notice') assert.match(crisis.text, /game with AI characters/i)
  assert.equal(calls, 0)
})

test('live output is screened, charged from the returned cost, and cached deliveries cost zero', async () => {
  let calls = 0
  const answers = [success('Call me on 08000000000', 11), { ok: false, why: 'failed', attempts: [] } satisfies AskResult]
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 20, ask: async () => answers[calls++] ?? success('A safe answer.', 5) })
  const context = authority()
  const unsafe = await core.talk(context, { clientId: 'unsafe-one', question: 'What do you think about this?' })
  assertReply(unsafe)
  assert.equal(unsafe.source, 'fallback')
  assert.deepEqual(unsafe.accounting, { kind: 'live', routerCalls: 1, costMicro: 11 })
  assert.doesNotMatch(unsafe.text, /0800/)
  const cached = await core.talk(context, { clientId: 'unsafe-two', question: 'What do you think about this?' })
  assertReply(cached)
  assert.equal(cached.source, 'cache')
  assert.deepEqual(cached.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  const refused = await core.talk(context, { clientId: 'refused', question: 'What else can you say?' })
  assertReply(refused)
  assert.deepEqual(refused.accounting, { kind: 'zero', routerCalls: 1, costMicro: 0 })
  assert.equal(calls, 2)
})

test('live requests use the bounded player-word policy and unsafe numbers or throws use accounted fallbacks', async () => {
  const inputs: AskInput[] = []
  const numbered = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 25, ask: async input => { inputs.push(input); return success('There are 99 stalls here.', 13) } })
  const result = await numbered.talk(authority(), { clientId: 'numbered', question: 'What makes a good conversation?' })
  assertReply(result)
  assert.equal(result.source, 'fallback')
  assert.deepEqual(result.accounting, { kind: 'live', routerCalls: 1, costMicro: 13 })
  assert.equal(inputs.length, 1)
  assert.equal(inputs[0]?.purpose, 'agent-talk')
  assert.equal(inputs[0]?.carriesPlayerWords, true)
  assert.equal(inputs[0]?.playerId, 'player-actor-a')
  assert.equal(inputs[0]?.maxTokens, 16)
  assert.equal(inputs[0]?.timeoutMs, 1500)
  assert.match(inputs[0]!.messages[0]!.content, /English only; one complete sentence, <=8 words/)
  assert.ok(inputs[0]!.messages.reduce((sum, message) => sum + new TextEncoder().encode(message.content).byteLength, 0) <= 250)

  const throwing = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 26, ask: async () => { throw new Error('fixture transport failure') } })
  const unknown = await throwing.talk(authority(), { clientId: 'thrown', question: 'Which pattern do you like?' })
  assertReply(unknown)
  assert.equal(unknown.source, 'fallback')
  assert.deepEqual(unknown.accounting, { kind: 'unknown', routerCalls: 1, cost: 'unknown' })
})

test('visible cutoffs use accounted authored fallback and cached retries make no extra call', async () => {
  for (const text of ['A quiet conversation can be nice and', 'A quiet conversation can be nice', 'I enjoy quiet conversation...', 'I enjoy quiet conversation…', 'I enjoy quiet conversation. . .', 'I enjoy quiet conversation...!', 'I enjoy quiet conversation and.']) {
    for (const usageKnown of [true, false]) {
      let calls = 0
      const reply = success(text, 13)
      if (!reply.ok) throw new Error('Expected successful fixture')
      const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 25,
        ask: async () => { calls++; return { ...reply, usage: usageKnown ? reply.usage : null } },
      })
      const context = authority(), request = { clientId: 'cutoff', question: 'Any thoughts?' }
      const result = await core.talk(context, request)
      assertReply(result)
      assert.equal(result.source, 'fallback'); assert.equal(result.ai, true)
      assert.ok(bundle().bank.ambient.includes(result.text))
      assert.deepEqual(result.accounting, usageKnown
        ? { kind: 'live', routerCalls: 1, costMicro: 13 }
        : { kind: 'unknown', routerCalls: 1, cost: 'unknown' })
      const retry = await core.talk(context, request)
      assertReply(retry)
      assert.equal(retry.source, 'cache'); assert.equal(retry.text, result.text); assert.equal(retry.ai, true)
      assert.deepEqual(retry.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
      assert.equal(calls, 1)
    }
  }
})

test('a complete brief sentence remains live after the cutoff check', async () => {
  const text = 'I enjoy a quiet conversation.'
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 25, ask: async () => success(text, 13) })
  const result = await core.talk(authority(), { clientId: 'complete', question: 'Any thoughts?' })
  assertReply(result)
  assert.equal(result.source, 'live'); assert.equal(result.text, text); assert.equal(result.ai, true)
  assert.deepEqual(result.accounting, { kind: 'live', routerCalls: 1, costMicro: 13 })
})

test('same nonce joins once, changed payload is refused, and actors never share live cache', async () => {
  let calls = 0, release = (_value: AskResult): void => { throw new Error('pending resolver was not installed') }
  let announce = (): void => { throw new Error('start announcer was not installed') }
  const pending = new Promise<AskResult>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { announce = resolve })
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 30, ask: async () => { calls++; announce(); return calls === 1 ? pending : success('Another safe answer.') } })
  const context = authority()
  const first = core.talk(context, { clientId: 'same', question: 'What makes a good conversation?' })
  const joined = core.talk(context, { clientId: 'same', question: 'What makes a good conversation?' })
  await started
  const conflict = await core.talk(context, { clientId: 'same', question: 'Changed question' })
  assert.deepEqual(conflict, { kind: 'rejected', reason: 'nonce-conflict', accounting: { kind: 'zero', routerCalls: 0, costMicro: 0 } })
  assert.equal(calls, 1)
  release(success('A safe live answer.', 3))
  const [initial, duplicate] = await Promise.all([first, joined])
  assertReply(initial); assertReply(duplicate)
  assert.equal(initial.source, 'live'); assert.equal(duplicate.source, 'cache')
  const other = await core.talk(authority('actor-b'), { clientId: 'other', question: 'What makes a good conversation?' })
  assertReply(other)
  assert.equal(other.source, 'live')
  assert.equal(calls, 2)
})

test('TTL, receipt capacity and actor erasure fence late pending delivery and cache fills', async () => {
  let now = 100, calls = 0, release = (_value: AskResult): void => { throw new Error('pending resolver was not installed') }
  let announce = (): void => { throw new Error('start announcer was not installed') }
  const pending = new Promise<AskResult>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { announce = resolve })
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => now, ttlMs: 5, maxEntries: 2, ask: async () => { calls++; announce(); return calls === 1 ? pending : success('Fresh safe answer.') } })
  const context = authority()
  const old = core.talk(context, { clientId: 'pending', question: 'What makes a good conversation?' })
  const joined = core.talk(context, { clientId: 'pending', question: 'What makes a good conversation?' })
  await started
  core.forgetActors([context.actorId])
  release(success('Late safe answer.', 9))
  const [erased, erasedJoiner] = await Promise.all([old, joined])
  assert.deepEqual(erased, { kind: 'cancelled', reason: 'actor-forgotten', accounting: { kind: 'live', routerCalls: 1, costMicro: 9 } })
  assert.deepEqual(erasedJoiner, erased)
  const fresh = await core.talk(context, { clientId: 'pending', question: 'What makes a good conversation?' })
  assertReply(fresh)
  assert.equal(fresh.source, 'live')
  assert.equal(calls, 2)
  now += 6
  await core.talk(context, { clientId: 'expired', question: 'What is your favourite colour?' })
  assert.equal(calls, 3)
  const held = new Promise<AskResult>(() => {})
  const limited = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => now, maxEntries: 1, ask: async (_input: AskInput) => held })
  void limited.talk(context, { clientId: 'one', question: 'Which colour do you like?' })
  await Promise.resolve()
  const capacity = await limited.talk(authority('actor-b'), { clientId: 'two', question: 'Which pattern do you like?' })
  assert.equal(capacity.kind, 'rejected')
  if (capacity.kind === 'rejected') assert.equal(capacity.reason, 'capacity')
})

test('generation invalidation cancels a pending thrown delivery without inventing zero cost', async () => {
  let reject = (_reason: Error): void => { throw new Error('pending rejecter was not installed') }
  let announce = (): void => { throw new Error('start announcer was not installed') }
  const pending = new Promise<AskResult>((_resolve, rejectPromise) => { reject = rejectPromise })
  const started = new Promise<void>(resolve => { announce = resolve })
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 200, ask: async () => { announce(); return pending } })
  const delivery = core.talk(authority(), { clientId: 'generation', question: 'What makes a good conversation?' })
  await started
  core.invalidateGeneration()
  reject(new Error('fixture transport failure'))
  const cancelled = await delivery
  assert.deepEqual(cancelled, { kind: 'cancelled', reason: 'generation-invalidated', accounting: { kind: 'unknown', routerCalls: 1, cost: 'unknown' } })
})

test('settled actor churn and erasing unrelated actors preserve an active paid reply', async () => {
  let release = (_value: AskResult): void => { throw new Error('pending resolver was not installed') }
  let announce = (): void => { throw new Error('start announcer was not installed') }
  const pending = new Promise<AskResult>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { announce = resolve })
  let calls = 0
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 300, maxEntries: 2, ask: async () => { calls++; announce(); return pending } })
  const delivery = core.talk(authority(), { clientId: 'active', question: 'What makes a good conversation?' })
  await started
  assertReply(await core.talk(authority('actor-b'), { clientId: 'greet-b', question: 'Hello' }))
  assertReply(await core.talk(authority('actor-c'), { clientId: 'greet-c', question: 'Hello' }))
  core.forgetActors(Array.from({ length: 20 }, (_, at) => `unrelated-${at}`))
  release(success('A safe live answer.', 17))
  const reply = await delivery
  assertReply(reply)
  assert.equal(reply.source, 'live')
  assert.deepEqual(reply.accounting, { kind: 'live', routerCalls: 1, costMicro: 17 })
  assert.equal(calls, 1)
})

test('a new character cannot reuse the previous character live cache', async () => {
  let calls = 0
  const core = createTalkCore({ ready: async () => {}, canAsk: () => true, now: () => 400, ask: async () => { calls++; return success('A safe live answer.', 5) } })
  const previous = authority()
  assertReply(await core.talk(previous, { clientId: 'old-life', question: 'What makes a good conversation?' }))
  const next = { ...previous, characterKey: 'a-new-life' }
  const reply = await core.talk(next, { clientId: 'new-life', question: 'What makes a good conversation?' })
  assertReply(reply)
  assert.equal(reply.source, 'live')
  assert.equal(calls, 2)
})


test('an oversized question or denied live estimate returns a marked bank answer without router access', async () => {
  let asked = 0, quoted = 0
  const core = createTalkCore({ ready: async () => {}, now: () => 500, canAsk: () => { quoted++; return false }, ask: async () => { asked++; return success('unused') } })
  const oversized = await core.talk(authority(), { clientId: 'too-large', question: 'x'.repeat(600) })
  assertReply(oversized)
  assert.equal(oversized.source, 'fallback')
  assert.equal(oversized.ai, true)
  assert.deepEqual(oversized.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  assert.equal(quoted, 0)
  const denied = await core.talk(authority(), { clientId: 'denied', question: 'Which pattern do you like?' })
  assertReply(denied)
  assert.equal(denied.source, 'fallback')
  assert.deepEqual(denied.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
  assert.equal(quoted, 2)
  assert.equal(asked, 0)
})

test('an optional fact can be omitted for budget while full question and safety stay unchanged', async () => {
  const seen: AskInput[] = [], quoted: AskInput[] = []
  const core = createTalkCore({ ready: async () => {}, now: () => 1,
    canAsk: input => { quoted.push(input); return !input.messages[0]!.content.includes('\nFact: ') },
    ask: async input => { seen.push(input); return success('A safe answer.') },
  })
  const question = 'Any thoughts?'
  const result = await core.talk(authority(), { clientId: 'optional-fact', question })
  assertReply(result); assert.equal(result.source, 'live')
  assert.equal(quoted.length, 3)
  assert.equal(seen.length, 1)
  assert.equal(seen[0]?.messages[1]?.content, question)
  assert.equal(seen[0]?.messages[0]?.content, quoted[0]!.messages[0]!.content.split('\nFact: ')[0])
  assert.equal(seen[0]?.maxTokens, 16)
})

test('authority lost during bank or readiness waits prevents reservation and dispatch', async () => {
  for (const stage of ['bank', 'ready']) {
    let release = () => {}, entered = () => {}, authorized = true, calls = 0, admissions = 0
    const gate = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    const context = authority(), loaded = bundle()
    context.bank.load = async () => { if (stage === 'bank') { entered(); await gate }; return loaded }
    context.stillAuthorized = async () => authorized
    context.admitAttempt = async () => { admissions++; return 'fresh' }
    const core = createTalkCore({ ready: async () => { if (stage === 'ready') { entered(); await gate } }, now: () => 1, canAsk: () => true, ask: async () => { calls++; return success('unused') } })
    const pending = core.talk(context, { clientId: stage, question: 'Any thoughts?' })
    await started; authorized = false; release()
    assert.deepEqual(await pending, { kind: 'cancelled', reason: 'authority-changed', accounting: { kind: 'zero', routerCalls: 0, costMicro: 0 } })
    assert.equal(calls, 0); assert.equal(admissions, 0)
  }
})

test('durable admission waits are followed by cancellation and budget fences before dispatch', async () => {
  for (const change of ['actor', 'generation', 'budget', 'authority', 'write-failure']) {
    let release = () => {}, entered = () => {}, allowed = true, calls = 0
    const gate = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    const context = authority()
    context.admitAttempt = async () => { entered(); await gate; if (change === 'write-failure') throw new Error('durable write failed'); return change === 'authority' ? 'unauthorized' : 'fresh' }
    const core = createTalkCore({ ready: async () => {}, now: () => 1, canAsk: () => allowed, ask: async () => { calls++; return success('unused') } })
    const pending = core.talk(context, { clientId: change, question: 'Any thoughts?' })
    await started
    if (change === 'actor') core.forgetActors([context.actorId])
    if (change === 'generation') core.invalidateGeneration()
    if (change === 'budget') allowed = false
    release()
    const result = await pending
    assert.equal(calls, 0)
    assert.deepEqual(result.accounting, { kind: 'zero', routerCalls: 0, costMicro: 0 })
    if (change === 'actor' || change === 'generation' || change === 'authority') assert.equal(result.kind, 'cancelled')
    else { assertReply(result); assert.equal(result.source, 'fallback') }
  }
})

test('failed attempts, successful fallbacks and incomplete usage never claim known total spend', async () => {
  const failed = { model: '', provider: 'gateway' as const, ok: false, why: 'status' as const }
  const clean = success('A safe answer.')
  assert.equal(clean.ok, true)
  if (!clean.ok) throw new Error('expected success fixture')
  const cases: [AskResult, TalkResult['accounting']['kind']][] = [
    [{ ok: false, why: 'off', attempts: [] }, 'zero'],
    [{ ok: false, why: 'failed', attempts: [failed] }, 'unknown'],
    [{ ...clean, attempts: [failed, ...clean.attempts] }, 'unknown'],
    [{ ...clean, usage: null }, 'unknown'],
    [{ ...clean, usage: { input: 50, output: 0 } }, 'unknown'],
    [{ ...clean, usage: { input: 0, output: 10 } }, 'unknown'],
    [clean, 'live'],
  ]
  for (const [answer, kind] of cases) {
    const core = createTalkCore({ ready: async () => {}, now: () => 1, canAsk: () => true, ask: async () => answer })
    const result = await core.talk(authority(), { clientId: 'accounting', question: 'Any thoughts?' })
    assertReply(result); assert.equal(result.accounting.kind, kind)
  }
})
