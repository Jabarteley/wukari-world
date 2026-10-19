import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TALK_HISTORY_MAX, TALK_HISTORY_TEXT_MAX,
  beginTalkRequest, boundTalkHistory, completeTalkReply, createTalkModel, discardTalkRequest,
  reconcileTalkContext, retryTalkRequest, type TalkContext,
} from './talkModel.ts'

const context = (overrides: Partial<TalkContext> = {}): TalkContext => ({
  character: 'character-one', city: 'accra', venue: 'makola-market', npc: 'market-guide', enabled: true, connected: true, ...overrides,
})

test('history sent to the server is the last four lines with every line bounded to 240 characters', () => {
  const history = Array.from({ length: 7 }, (_, at) => ({ from: at % 2 ? 'npc' as const : 'player' as const, text: `${at}:${'x'.repeat(300)}` }))
  const bounded = boundTalkHistory(history)
  assert.equal(bounded.length, TALK_HISTORY_MAX)
  assert.deepEqual(bounded.map(line => line.text.slice(0, 2)), ['3:', '4:', '5:', '6:'])
  assert.equal(bounded.every(line => line.text.length === TALK_HISTORY_TEXT_MAX), true)

  const seeded = { ...createTalkModel(context()), history }
  const request = beginTalkRequest(seeded, 'market-guide', 'client-1', '  Where is the market?  ')
  assert.equal(request.payload.question, 'Where is the market?')
  assert.deepEqual(request.payload.history, bounded)
})

test('an explicit retry reuses the exact npc, client id, question, and history payload', () => {
  const initial = {
    ...createTalkModel(context()),
    history: [{ from: 'player' as const, text: 'Hello' }, { from: 'npc' as const, text: 'Welcome.' }],
  }
  const started = beginTalkRequest(initial, 'market-guide', 'fixed-client-id', 'Opening hours?')
  const retried = retryTalkRequest(started.state)
  assert.strictEqual(retried.payload, started.payload)
  assert.deepEqual(retried.payload, {
    npc: 'market-guide', clientId: 'fixed-client-id', question: 'Opening hours?', history: initial.history,
  })
  assert.deepEqual(retried.token, started.token)
})

test('character, city, venue, npc, feature, and connectivity changes clear retry/history and fence old responses', () => {
  const changes: Partial<TalkContext>[] = [
    { character: 'character-two' }, { city: 'kano' }, { venue: 'arts-centre' }, { npc: 'artist' }, { enabled: false }, { connected: false },
  ]
  for (const change of changes) {
    const started = beginTalkRequest(createTalkModel(context()), 'market-guide', 'client-2', 'Hello')
    const next = reconcileTalkContext({ ...started.state, history: [{ from: 'npc', text: 'Old reply' }] }, context(change))
    assert.equal(next.generation, started.state.generation + 1)
    assert.deepEqual(next.history, []); assert.equal(next.retry, null)
    assert.equal(completeTalkReply(next, started.token, 'Late reply'), null)
  }
})

test('accepted replies append one bounded exchange and reject oversized server text', () => {
  const started = beginTalkRequest(createTalkModel(context()), 'market-guide', 'client-3', 'Hello')
  const completed = completeTalkReply(started.state, started.token, 'Welcome to Accra.')
  assert.ok(completed)
  assert.deepEqual(completed.history, [{ from: 'player', text: 'Hello' }, { from: 'npc', text: 'Welcome to Accra.' }])
  assert.equal(completed.retry, null)
  const oversized = beginTalkRequest(completed, 'market-guide', 'client-4', 'Directions?')
  assert.throws(() => completeTalkReply(oversized.state, oversized.token, 'x'.repeat(141)), /too long/)
})

test('a definitive refusal can discard only the pending request, fence its old response, and start with a new id', () => {
  const history = [{ from: 'player' as const, text: 'Earlier question' }, { from: 'npc' as const, text: 'Earlier reply' }]
  const started = beginTalkRequest({ ...createTalkModel(context()), history }, 'market-guide', 'refused-id', 'Hello again')
  const discarded = discardTalkRequest(started.state)
  assert.deepEqual(discarded.history, history)
  assert.equal(discarded.retry, null)
  assert.equal(discarded.generation, started.state.generation + 1)
  assert.equal(completeTalkReply(discarded, started.token, 'Late refused reply'), null)

  const replacement = beginTalkRequest(discarded, 'market-guide', 'new-user-id', 'Hello again')
  assert.equal(replacement.payload.clientId, 'new-user-id')
  assert.deepEqual(replacement.payload.history, history)
})
