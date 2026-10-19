import assert from 'node:assert/strict'
import test from 'node:test'
import { readAnswer, requestBody } from '../../server/companion/gateway.ts'
import { DEFAULT_LISTS } from '../../server/models/catalog.ts'
import { TALK_TOPICS, type ApprovedTalkLineV1, type HumanPhrasebookEntryV1 } from './bank.ts'
import {
  TALK_DRAFT_MAX_TOKENS, TALK_DRAFT_REPLY_MAX_BYTES, TALK_DRAFT_REPLY_MAX_UNITS, TALK_DRAFT_TARGET_LINES, prepareTalkDraft,
  type TalkDraftBindingV1,
} from './draft.ts'

const NATIVE: HumanPhrasebookEntryV1 = {
  lang: 'x-test', text: 'Fixture native greeting', gloss: 'A fixture greeting',
  source: { kind: 'human', citation: 'Reviewed phrasebook fixture', contributor: 'Fixture writer' },
}

function word(index: number): string {
  return String.fromCharCode(97 + Math.floor(index / 26) % 26) + String.fromCharCode(97 + index % 26)
}

function binding(): TalkDraftBindingV1 {
  return {
    city: { id: 'kano', name: 'Kano', source: '/private/repo/cities/kano.json' },
    npc: { id: 'market-seller', name: 'Market seller', source: 'sk-fixture-secret' },
    venue: { id: 'kantin-kwari', name: 'Kantin Kwari Market', source: '/private/repo/venues.json' },
    voice: 'plain', lang: 'en',
    facts: [{ id: 'market-setting', text: 'The market has cloth stalls.', source: '/private/repo/facts.json' }],
    phrasebook: [structuredClone(NATIVE)], phrases: [{ lang: NATIVE.lang, text: NATIVE.text }],
  }
}

function line(text: string, sources: string[] = ['city', 'venue']): ApprovedTalkLineV1 { return { text, sources } }

function response(): Record<string, unknown> {
  const rows = (section: string, count: number) => Array.from({ length: count }, (_, at) => line(`The ${section} note ${word(at)} belongs to Kantin Kwari Market in Kano.`))
  return {
    greet: [line('Welcome to Kantin Kwari Market in Kano.')],
    ambient: rows('ambient', 10),
    about: Object.fromEntries(TALK_TOPICS.map(topic => [topic, rows(topic, 6)])),
    bye: rows('goodbye', 7),
  }
}

test('request is deterministic, bounded and contains only public binding fields', () => {
  const first = prepareTalkDraft(binding()).request, second = prepareTalkDraft(binding()).request
  assert.deepEqual(first, second)
  assert.deepEqual(Object.keys(first).sort(), ['carriesPlayerWords', 'maxTokens', 'messages', 'purpose'])
  assert.equal(first.purpose, 'agent-talk')
  assert.equal(first.carriesPlayerWords, false)
  assert.equal(first.maxTokens, TALK_DRAFT_MAX_TOKENS)
  const prompt = first.messages.map(message => message.content).join('\n')
  for (const hidden of ['/private/repo', 'sk-fixture-secret', NATIVE.text, NATIVE.gloss, NATIVE.source.citation, NATIVE.source.contributor]) assert.equal(prompt.includes(hidden), false, hidden)
  assert.match(prompt, /"city":\{"id":"kano","name":"Kano"\}/)
  assert.match(prompt, /"facts":\[\{"id":"market-setting","text":"The market has cloth stalls\."\}\]/)
})

test('invalid evidence, settings and phrase selections fail before a request exists', () => {
  assert.throws(() => prepareTalkDraft({ ...binding(), venue: { id: 'bad id', name: 'Market', source: 'fixture' } }), /evidence\.venue\.id must be a lower-case id/)
  assert.throws(() => prepareTalkDraft({ ...binding(), voice: 'invented' }), /binding\.voice is not supported/)
  assert.throws(() => prepareTalkDraft({ ...binding(), phrases: [{ lang: 'x-test', text: 'Unsupplied phrase' }] }), /not in the supplied phrasebook/)
  assert.throws(() => prepareTalkDraft({ ...binding(), credential: 'secret' }), /binding has unknown field credential/)
})

test('reply cannot replace trusted metadata or smuggle phrase fields', () => {
  const prepared = prepareTalkDraft(binding()), supplied = response()
  for (const extra of [{ city: 'other' }, { npc: 'other' }, { voice: 'jokey' }, { lang: 'pcm' }, { facts: [] }, { phrases: [] }]) {
    assert.throws(() => prepared.compile(JSON.stringify({ ...supplied, ...extra })), /talk draft reply has unknown field/)
  }
  const lineSmuggle = structuredClone(supplied) as { ambient: Array<Record<string, unknown>> }
  lineSmuggle.ambient[0]!.native = NATIVE.text
  assert.throws(() => prepared.compile(JSON.stringify(lineSmuggle)), /input\.ambient\[0\] has unknown field native/)
})

test('malformed, fenced, oversized and unsafe replies are rejected', () => {
  const prepared = prepareTalkDraft(binding())
  assert.throws(() => prepared.compile('{'), /must be one plain JSON object/)
  assert.throws(() => prepared.compile('```json\n{}\n```'), /must be one plain JSON object/)
  assert.throws(() => prepared.compile('x'.repeat(TALK_DRAFT_REPLY_MAX_BYTES + 1)), /maximum is 32000/)
  const unsafe = structuredClone(response()) as { ambient: ApprovedTalkLineV1[] }
  unsafe.ambient[0] = line('Send me your phone number.')
  assert.throws(() => prepared.compile(JSON.stringify(unsafe)), /failed agentWords: agent_words_contact/)
})

test('successful compile binds identities and copies selected native entries exactly', () => {
  const prepared = prepareTalkDraft(binding())
  const bank = prepared.compile(JSON.stringify(response()))
  assert.equal(bank.city, 'kano')
  assert.equal(bank.npc, 'market-seller')
  assert.equal(bank.voice, 'plain')
  assert.equal(bank.lang, 'en')
  assert.deepEqual(bank.phrases, [NATIVE])
  assert.equal(bank.greet.length + bank.ambient.length + Object.values(bank.about).flat().length + bank.bye.length, 60)

  const changed = binding(), preparedBeforeChange = prepareTalkDraft(changed)
  changed.phrasebook[0]!.gloss = 'Mutated after preparation'
  assert.deepEqual(preparedBeforeChange.compile(JSON.stringify(response())).phrases, [NATIVE])
})

test('a compact complete draft survives the real gateway reader and uses its actual token field', () => {
  const prepared = prepareTalkDraft(binding()), content = JSON.stringify(response())
  assert.ok(content.length <= TALK_DRAFT_REPLY_MAX_UNITS)
  const answer = readAnswer({ choices: [{ message: { content } }], usage: { prompt_tokens: 400, completion_tokens: 1800 } })
  assert.ok(answer)
  assert.equal(answer.text, content)
  const bank = prepared.compile(answer.text)
  assert.equal(bank.greet.length + bank.ambient.length + Object.values(bank.about).flat().length + bank.bye.length, TALK_DRAFT_TARGET_LINES)
  const model = DEFAULT_LISTS['agent-talk'][0]!
  const body = requestBody({ maxOutputTokens: prepared.request.maxTokens, kind: model.provider, feature: prepared.request.purpose }, model.id, 'primary', prepared.request.messages, 'anonymous')
  assert.equal(body.max_tokens, 4096)
  assert.equal(body.stream, false)
  assert.equal(requestBody({ maxOutputTokens: prepared.request.maxTokens }, model.id, 'primary', prepared.request.messages, 'anonymous', true).max_completion_tokens, 4096)
  assert.match(prepared.request.messages[0]!.content, /exactly 60 unique trimmed English lines/)
})

test('gateway-sized replies and names that cannot fit the greeting are refused before publication', () => {
  const prepared = prepareTalkDraft(binding())
  assert.throws(() => prepared.compile(' '.repeat(TALK_DRAFT_REPLY_MAX_UNITS + 1)), /UTF-16 units; maximum is 7600/)
  const long = binding()
  long.city.name = 'City '.repeat(24).trim()
  long.venue.name = 'Venue '.repeat(20).trim()
  assert.throws(() => prepareTalkDraft(long), /cannot fit one greeting/)
})
