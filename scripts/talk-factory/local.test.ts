import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { cityContent, loadCityContent } from '../../src/game/cities/registry.ts'
import { TALK_BANK_MAX_BYTES, TALK_TEXT_MAX, TALK_TOPICS, type HumanPhrasebookEntryV1 } from './bank.ts'
import type { TalkDraftBindingV1 } from './draft.ts'
import { extractTalkDraftInputs } from './inputs.ts'
import { compileLocalTalkBank } from './local.ts'
import { PLACES as JAKARTA_PLACES } from '../../src/game/cities/jakarta/places.ts'
import { PLACES as KINGSTON_PLACES } from '../../src/game/cities/kingston/places.ts'

const CITY_INPUTS = {
  kano: { region: 'sahel-north', phrasebook: 'ha', phrase: { lang: 'ha', text: 'Sannu!' } },
  accra: { region: 'gulf-guinea', phrasebook: 'tw', phrase: { lang: 'tw', text: 'Meda wo ase (Medaase)' } },
  tokyo: { region: 'east-asia', phrasebook: 'ja', phrase: { lang: 'ja', text: 'ありがとうございます' } },
} as const

async function phrasebook(code: string): Promise<HumanPhrasebookEntryV1[]> {
  return JSON.parse(await readFile(new URL(`./phrasebooks/${code}.json`, import.meta.url), 'utf8')) as HumanPhrasebookEntryV1[]
}

async function actual(city: keyof typeof CITY_INPUTS): Promise<TalkDraftBindingV1[]> {
  const input = CITY_INPUTS[city]
  return (await extractTalkDraftInputs({
    cityId: city, region: input.region, voice: 'plain', lang: 'en',
    phrasebook: await phrasebook(input.phrasebook), phrases: [input.phrase],
  })).bindings
}

function fixture(overrides: Partial<TalkDraftBindingV1> = {}): TalkDraftBindingV1 {
  return {
    city: { id: 'kano', name: 'Kano', source: 'fixture-city' },
    npc: { id: 'market-guide', name: 'Market guide', source: 'fixture-npc' },
    venue: { id: 'kantin-kwari', name: 'Kantin Kwari Market', source: 'fixture-venue' },
    voice: 'plain', lang: 'en',
    facts: [
      { id: 'npc-role', text: 'Market guide', source: 'fixture-role' },
      { id: 'venue-target-cloth', text: 'Cloth area', source: 'fixture-area' },
      { id: 'city-food-1', text: 'tuwo shinkafa', source: 'fixture-culture' },
      { id: 'city-known-for-1', text: 'indigo dyeing and leatherwork', source: 'fixture-culture' },
      { id: 'city-place-name-1', text: 'Kantin Kwari Market', source: 'fixture-place' },
      { id: 'city-place-kind-1', text: 'market', source: 'fixture-place' },
    ],
    phrasebook: [], phrases: [], ...overrides,
  }
}

function lines(bank: ReturnType<typeof compileLocalTalkBank>): string[] {
  return [...bank.greet, ...bank.ambient, ...TALK_TOPICS.flatMap(topic => bank.about[topic]), ...bank.bye]
}

test('actual Kano, Accra and Tokyo bindings produce deterministic distinct 60-line English banks', async () => {
  const greetings: string[] = []
  for (const city of ['kano', 'accra', 'tokyo'] as const) {
    const binding = (await actual(city))[0]!
    const first = compileLocalTalkBank(binding), second = compileLocalTalkBank(binding)
    assert.deepEqual(first, second)
    assert.equal(first.voice, 'plain'); assert.equal(first.lang, 'en')
    assert.equal(first.city, binding.city.id); assert.equal(first.npc, binding.npc.id)
    assert.equal(first.greet.length, 1); assert.equal(first.ambient.length, 10); assert.equal(first.bye.length, 7)
    assert.deepEqual(TALK_TOPICS.map(topic => first.about[topic].length), Array(7).fill(6))
    const spoken = lines(first)
    assert.equal(spoken.length, 60); assert.equal(new Set(spoken).size, 60)
    assert.equal(spoken.every(line => line.length <= TALK_TEXT_MAX), true)
    assert.equal(spoken.some(line => /\ba (?:airport|office) venue\b/iu.test(line)), false)
    assert.ok(Buffer.byteLength(JSON.stringify(first)) <= TALK_BANK_MAX_BYTES)
    assert.ok(first.greet[0]!.includes(binding.city.name)); assert.ok(first.greet[0]!.includes(binding.venue.name))
    assert.equal(spoken.some(line => /meet you at/iu.test(line)), false)
    greetings.push(first.greet[0]!)
  }
  assert.equal(new Set(greetings).size, 3)
})

test('the avoidable meet wording is absent for an audited community-venue shape', () => {
  const bank = compileLocalTalkBank(fixture({
    city: { id: 'bamako', name: 'Bamako', source: 'actual-city' },
    venue: { id: 'bamako-community-notices', name: 'Community notices (game venue)', source: 'actual-venue' },
    facts: [
      { id: 'npc-role', text: 'Community guide', source: 'actual-role' },
      { id: 'city-place-name-1', text: 'Community notices (game venue)', source: 'actual-place' },
      { id: 'city-place-kind-1', text: 'statehouse', source: 'actual-place' },
    ],
  }))
  assert.equal(lines(bank).some(line => /meet you at/iu.test(line)), false)
  assert.ok(bank.ambient.includes('It is good to talk with you in Bamako.'))
})

test('audited unsafe non-pilot venue identities use sourced generic display labels without speaking or changing the binding name', () => {
  const cases = [
    { city: { id: 'jakarta', name: 'Jakarta' }, place: JAKARTA_PLACES.find(place => place.key === 'osm-way-1082234947'), greeting: 'Welcome to this food place in Jakarta.' },
    { city: { id: 'kingston', name: 'Kingston' }, place: KINGSTON_PLACES.find(place => place.key === 'osm-node-307991768'), greeting: 'Welcome to this walking place in Kingston.' },
  ] as const
  for (const row of cases) {
    assert.ok(row.place)
    const binding = fixture({
      city: { ...row.city, source: 'actual-city' },
      venue: { id: `${row.city.id}-${row.place.key}`, name: row.place.name, source: `OpenStreetMap ${row.place.osm}` },
      facts: [
        { id: 'npc-role', text: 'Local guide', source: 'actual-role' },
        { id: 'city-place-name-1', text: row.place.name, source: `OpenStreetMap ${row.place.osm}` },
        { id: 'city-place-kind-1', text: row.place.kind, source: `OpenStreetMap ${row.place.osm}` },
      ],
    }), original = structuredClone(binding)
    const bank = compileLocalTalkBank(binding)
    assert.deepEqual(binding, original)
    assert.equal(bank.greet[0], row.greeting)
    assert.equal(lines(bank).some(line => line.includes(row.place.name)), false)
    assert.ok(lines(bank).some(line => line === `The ${row.city.name} map also shows ${row.city.id === 'jakarta' ? 'a food place' : 'a walking place'}.`))
  }
})

test('unsafe venue identities remain fail closed without an exact paired kind fact', () => {
  assert.throws(() => compileLocalTalkBank(fixture({
    city: { id: 'jakarta', name: 'Jakarta', source: 'actual-city' },
    venue: { id: 'jakarta-unsafe', name: 'J.CO Donuts & Coffee', source: 'actual-venue' },
    facts: [{ id: 'npc-role', text: 'Local guide', source: 'actual-role' }],
  })), /failed agentWords: agent_words_link/)
})

test('selected human phrases are copied exactly and caller bindings stay immutable', async () => {
  const binding = (await actual('tokyo'))[0]!, original = structuredClone(binding)
  const bank = compileLocalTalkBank(binding)
  assert.deepEqual(binding, original)
  const selected = original.phrases.map(selection => original.phrasebook.find(entry => entry.lang === selection.lang && entry.text === selection.text))
  assert.equal(selected.every(Boolean), true)
  assert.deepEqual(bank.phrases, selected)
  binding.phrasebook[0]!.gloss = 'changed after compilation'
  assert.deepEqual(bank.phrases, selected)
})

test('the actual 132-character Tallinn greeting fits while an impossible combined identity is refused', async () => {
  await loadCityContent('tallinn')
  const venue = cityContent('tallinn').venues.find(row => row.id === 'tallinn-community-notices')
  assert.ok(venue); assert.equal(venue.name.length, 123)
  const bank = compileLocalTalkBank(fixture({
    city: { id: 'tallinn', name: 'Tallinn', source: 'actual-city' },
    venue: { id: venue.id, name: venue.name, source: 'actual-venue' },
  }))
  assert.equal(bank.greet[0], `Tallinn: ${venue.name}`)
  assert.equal(bank.greet[0]!.length, 132)

  assert.throws(() => compileLocalTalkBank(fixture({
    city: { id: 'edge', name: 'Edge', source: 'fixture-city' },
    venue: { id: 'edge-venue', name: 'x'.repeat(TALK_TEXT_MAX), source: 'fixture-venue' },
  })), /cannot fit one local greeting/)
})

test('the local fallback refuses non-English and non-plain generation requests', () => {
  assert.throws(() => compileLocalTalkBank(fixture({ lang: 'pcm' })), /English output only/)
  for (const voice of ['pidgin', 'formal', 'jokey'] as const) {
    assert.throws(() => compileLocalTalkBank(fixture({ voice })), /plain voice only/)
  }
})

test('identity and sourced-fact safety failures remain fail closed', () => {
  assert.throws(() => compileLocalTalkBank(fixture({
    city: { id: 'unsafe', name: 'Send me your phone number', source: 'fixture-city' },
  })), /failed agentWords: agent_words_contact/)
  assert.throws(() => compileLocalTalkBank(fixture({
    facts: [{ id: 'npc-role', text: 'Go kill yourself now', source: 'fixture-role' }],
  })), /failed text filter: text_blocked/)
})

test('generated digits come only from supplied identity and fact tokens', () => {
  const binding = fixture({
    city: { id: 'city-7', name: 'City 7', source: 'fixture-city' },
    venue: { id: 'hall-12', name: 'Hall 12', source: 'fixture-venue' },
    facts: [
      { id: 'npc-role', text: 'Guide 2', source: 'fixture-role' },
      { id: 'venue-target-area', text: 'Area 3', source: 'fixture-area' },
    ],
  })
  const bank = compileLocalTalkBank(binding)
  const outputDigits = lines(bank).flatMap(line => [...line.matchAll(/\d+/gu)].map(match => match[0]))
  assert.ok(outputDigits.length > 0)
  assert.equal(outputDigits.every(token => new Set(['7', '12', '2', '3']).has(token)), true)
})

test('actual role, area, culture and public-place facts produce distinct source-bound lines', async () => {
  const binding = (await actual('kano'))[0]!, bank = compileLocalTalkBank(binding)
  const role = binding.facts.find(fact => fact.id === 'npc-role')
  const area = binding.facts.find(fact => fact.id.startsWith('venue-target-'))
  const food = binding.facts.find(fact => fact.id.startsWith('city-food-'))
  const known = binding.facts.find(fact => fact.id.startsWith('city-known-for-'))
  const placeName = binding.facts.find(fact => fact.id === 'city-place-name-1')
  const placeKind = binding.facts.find(fact => fact.id === 'city-place-kind-1')
  assert.ok(role)
  assert.ok(bank.about.work.some(line => line === `My role here is ${role.text}.`))
  if (area && `Around here, look for ${area.text}.`.length <= TALK_TEXT_MAX) {
    assert.ok(bank.about.directions.includes(`Around here, look for ${area.text}.`))
  }
  assert.ok(food); assert.ok(bank.about.food.includes(`Have you tried ${food.text}?`))
  assert.ok(known); assert.ok(bank.about.city.includes(`People in ${binding.city.name} talk about ${known.text}.`))
  assert.ok(placeName && placeKind)
  assert.ok(lines(bank).some(line => line.includes(placeName.text)))
  assert.equal(lines(bank).some(line => line.includes('venue kind') || line.includes('city profile')), false)
  assert.equal(lines(bank).some(line => /\b(?:price|cost|hours|history)\b/iu.test(line)), false)
})

test('Kano and Accra output keeps extracted facts and human phrases unchanged', async () => {
  for (const city of ['kano', 'accra'] as const) {
    const binding = (await actual(city))[0]!, original = structuredClone(binding)
    const bank = compileLocalTalkBank(binding)
    assert.deepEqual(binding, original)
    const role = binding.facts.find(fact => fact.id === 'npc-role')
    const places = binding.facts.filter(fact => fact.id.startsWith('city-place-name-'))
    assert.ok(role); assert.ok(places.length > 0)
    assert.ok(bank.about.work.includes(`My role here is ${role.text}.`))
    assert.ok(lines(bank).some(line => places.some(place => line.includes(place.text))))
    assert.deepEqual(bank.phrases, binding.phrases.map(selection => binding.phrasebook.find(entry => entry.lang === selection.lang && entry.text === selection.text)))
  }
})

test('invalid proof and unmatched native selections are rejected before output', () => {
  assert.throws(() => compileLocalTalkBank(fixture({
    facts: [{ id: 'npc-role', text: 'Guide', source: '' }],
  })), /facts\[0\]\.source must not be empty/)
  assert.throws(() => compileLocalTalkBank({ ...fixture(), inventedProof: true }), /binding has unknown field inventedProof/)
  assert.throws(() => compileLocalTalkBank(fixture({
    phrases: [{ lang: 'x-test', text: 'Unsupplied words' }],
  })), /not in the supplied phrasebook/)
})
