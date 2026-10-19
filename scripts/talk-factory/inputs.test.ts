import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { extractCityBrief } from '../scene-factory/facts.ts'
import { cityContent } from '../../src/game/cities/registry.ts'
import { spotsOf } from '../../src/life.ts'
import { castOf, venueFor } from '../../server/house/cast.ts'
import { cityCastOf } from '../../server/story/cast.ts'
import { compileLocalTalkBank } from './local.ts'
import { prepareTalkDraft } from './draft.ts'
import { extractTalkDraftInputs } from './inputs.ts'
import type { HumanPhrasebookEntryV1 } from './bank.ts'

const cityInputs = {
  kano: { cityId: 'kano', region: 'sahel-north', voice: 'plain', lang: 'en', phrasebook: 'ha', phrases: [{ lang: 'ha', text: 'Sannu!' }] },
  accra: { cityId: 'accra', region: 'gulf-guinea', voice: 'plain', lang: 'en', phrasebook: 'tw', phrases: [{ lang: 'tw', text: 'Meda wo ase (Medaase)' }] },
  tokyo: { cityId: 'tokyo', region: 'east-asia', voice: 'formal', lang: 'en', phrasebook: 'ja', phrases: [{ lang: 'ja', text: 'ありがとうございます' }] },
} as const

async function sourcePhrasebook(code: string): Promise<HumanPhrasebookEntryV1[]> {
  return JSON.parse(await readFile(new URL(`./phrasebooks/${code}.json`, import.meta.url), 'utf8')) as HumanPhrasebookEntryV1[]
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  assert.ok(value && typeof value === 'object')
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

async function plan(city: keyof typeof cityInputs) {
  const input = cityInputs[city]
  return extractTalkDraftInputs({
    ...input,
    phrasebook: await sourcePhrasebook(input.phrasebook),
  })
}

test('Kano inputs are deterministic, sorted, and retain literal role and effective target labels', async () => {
  const first = await plan('kano'), second = await plan('kano')
  assert.deepEqual(first, second)
  assert.match(first.inputSha256, /^[a-f0-9]{64}$/u)
  assert.equal(first.cityId, 'kano')
  assert.deepEqual(first.bindings.map(binding => binding.npc.id), [...first.bindings.map(binding => binding.npc.id)].sort((a, b) => a.localeCompare(b, 'en')))
  assert.equal(first.counts.bindings, first.counts.regulars + (first.counts.houseAgents ?? 0))
  assert.equal(first.counts.houseAgents, castOf('kano').length)
  assert.equal(first.counts.preparedRequests, first.counts.bindings)
  assert.equal(first.counts.phrasebookEntries, 1)
  assert.equal(first.counts.selectedPhrasesPerBinding, 1)

  const brief = await extractCityBrief({ cityId: 'kano', region: 'sahel-north' })
  for (const binding of first.bindings.filter(row => !row.npc.id.startsWith('kano-house-'))) {
    const regular = brief.regulars.find(row => row.id === binding.npc.id)
    const venue = brief.venues.find(row => row.id === binding.venue.id)
    assert.ok(regular && venue)
    assert.equal(binding.city.id, brief.city.id)
    assert.equal(binding.city.name, brief.city.name)
    assert.equal(binding.npc.name, regular.name)
    assert.equal(binding.venue.name, venue.name)
    assert.equal(binding.facts.find(fact => fact.id === 'npc-role')?.text, regular.role)
    assert.deepEqual(binding.facts.slice(0, 1 + venue.effectiveSpots.length), [
      { id: 'npc-role', text: regular.role, source: `city-content:${brief.digests.contentSha256}` },
      ...venue.effectiveSpots.map(spot => ({ id: `venue-target-${spot.id}`, text: spot.name, source: `city-brief:${brief.digests.inputSha256}` })),
    ])
  }
  assert.ok(first.sourceHashes.some(row => row.path === 'src/game/systems/social.ts'))
  assert.ok(first.sourceHashes.some(row => row.path === 'src/game/systems/activities.ts'))
  assert.ok(first.sourceHashes.some(row => row.path === 'server/house/cast.ts'))
})

test('Kano and Lagos bindings retain exact culture and bounded public venue facts from loaded content', async () => {
  for (const [cityId, region] of [['kano', 'sahel-north'], ['lagos', 'gulf-guinea']] as const) {
    const result = await extractTalkDraftInputs({ cityId, region, voice: 'plain', lang: 'en', phrasebook: [], phrases: [] })
    const content = cityContent(cityId), binding = result.bindings.find(row => !row.npc.id.startsWith(`${cityId}-house-`))!
    const contentSource = binding.npc.source
    assert.deepEqual(binding.facts.filter(fact => fact.id.startsWith('city-food-')).map(fact => fact.text), content.culture.food)
    assert.deepEqual(binding.facts.filter(fact => fact.id.startsWith('city-known-for-')).map(fact => fact.text), content.culture.knownFor)
    const names = binding.facts.filter(fact => fact.id.startsWith('city-place-name-'))
    const kinds = binding.facts.filter(fact => fact.id.startsWith('city-place-kind-'))
    assert.equal(names.length, kinds.length); assert.ok(names.length > 1); assert.ok(names.length <= 12)
    for (let at = 0; at < names.length; at++) {
      const venue = content.venues.find(row => row.name === names[at]!.text && row.kind === kinds[at]!.text)
      assert.ok(venue); assert.notEqual(venue.kind, 'home')
      assert.equal(names[at]!.source, contentSource); assert.equal(kinds[at]!.source, contentSource)
    }
    assert.equal(binding.facts.some(fact => fact.id.startsWith('npc-quote-')), false)
  }
})

test('Accra and Tokyo bindings exactly cover current regular identities, venues, roles, and runtime spots', async () => {
  for (const city of ['accra', 'tokyo'] as const) {
    const input = cityInputs[city], brief = await extractCityBrief({ cityId: input.cityId, region: input.region })
    const result = await plan(city)
    const regularBindings = result.bindings.filter(binding => !binding.npc.id.startsWith(`${city}-house-`))
    assert.equal(regularBindings.length, brief.regulars.length)
    assert.equal(result.bindings.length, brief.regulars.length + castOf(city).length)
    for (const binding of regularBindings) {
      const regular = brief.regulars.find(row => row.id === binding.npc.id)
      const venue = brief.venues.find(row => row.id === binding.venue.id)
      assert.ok(regular && venue)
      assert.equal(binding.npc.name, regular.name)
      assert.equal(binding.npc.source, `city-content:${brief.digests.contentSha256}`)
      assert.equal(binding.facts.find(fact => fact.id === 'npc-role')?.text, regular.role)
      assert.deepEqual(binding.facts.filter(fact => fact.id.startsWith('venue-target-')).map(fact => fact.id.slice('venue-target-'.length)), spotsOf(venue.id, city).map(spot => spot.id).sort((a, b) => a.localeCompare(b, 'en')))
    }
  }
})

test('house inputs keep canonical cast identity, actual post, source pin, and compilable 60-line banks', async () => {
  const result = await extractTalkDraftInputs({ cityId: 'lagos', region: 'gulf-guinea', voice: 'plain', lang: 'en', phrasebook: [], phrases: [] })
  const content = cityContent('lagos'), cast = cityCastOf('lagos')
  const houseBindings = result.bindings.filter(binding => binding.npc.id.startsWith('lagos-house-'))
  const castPin = result.sourceHashes.find(row => row.path === 'server/house/cast.ts')
  assert.ok(castPin)
  assert.equal(result.counts.regulars, content.regulars.length)
  assert.equal(result.counts.houseAgents, cast.length)
  assert.equal(houseBindings.length, cast.length)
  for (const binding of houseBindings) {
    const key = binding.npc.id.slice('lagos-house-'.length), spec = cast.find(row => row.key === key)
    assert.ok(spec)
    const post = venueFor('lagos', spec.post, spec.role), venue = content.venues.find(row => row.id === post)
    assert.ok(venue)
    assert.equal(binding.npc.name, spec.name)
    assert.equal(binding.venue.id, venue.id)
    assert.equal(binding.venue.name, venue.name)
    assert.equal(binding.facts.find(fact => fact.id === 'npc-role')?.text, spec.role)
    assert.equal(binding.facts.find(fact => fact.id === 'house-card')?.text, spec.card)
    assert.equal(binding.npc.source, `server/house/cast.ts#sha256=${castPin.sha256}`)
    const bank = compileLocalTalkBank(binding)
    assert.equal(bank.city, 'lagos')
    assert.equal(bank.npc, binding.npc.id)
    assert.equal(bank.greet.length + bank.ambient.length + Object.values(bank.about).flat().length + bank.bye.length, 60)
  }
})

test('the existing draft bridge removes provenance, phrasebook text, and native phrases from requests', async () => {
  const result = await plan('kano'), binding = result.bindings[0]!
  const prepared = prepareTalkDraft(binding), request = prepared.request.messages.map(message => message.content).join('\n')
  const requestHash = result.requestHashes.find(row => row.npcId === binding.npc.id)
  assert.ok(requestHash)
  assert.equal(requestHash.sha256, createHash('sha256').update(canonical(prepared.request)).digest('hex'))
  assert.deepEqual(Object.keys(requestHash).sort(), ['npcId', 'sha256'])
  assert.equal(result.requestHashes.length, result.bindings.length)
  assert.ok(!JSON.stringify(result.requestHashes).includes('Return one plain JSON object'))
  const native = binding.phrasebook[0]!
  for (const hidden of [binding.city.source, binding.npc.source, binding.venue.source, native.text, native.gloss, native.source.citation, native.source.contributor, 'https://', 'src/game/cities']) {
    assert.equal(request.includes(hidden), false, hidden)
  }
  assert.match(request, new RegExp(`"city":\\{\\"id\\":\\"${binding.city.id}\\",\\"name\\":\\"${binding.city.name}\\"\\}`))
  assert.ok(result.counts.preparedPromptBytes > 0)
})

test('selected phrase entries are copied exactly without changing caller data', async () => {
  const phrasebook = await sourcePhrasebook('ja')
  const phrases = [{ lang: 'ja', text: 'ありがとうございます' }]
  const originalBook = structuredClone(phrasebook), originalPhrases = structuredClone(phrases)
  const result = await extractTalkDraftInputs({ cityId: 'tokyo', region: 'east-asia', voice: 'formal', lang: 'en', phrasebook, phrases })
  assert.deepEqual(phrasebook, originalBook)
  assert.deepEqual(phrases, originalPhrases)
  assert.deepEqual(result.bindings[0]?.phrasebook, originalBook)
  assert.deepEqual(result.bindings[0]?.phrases, originalPhrases)
  phrasebook[0]!.gloss = 'mutated by test after extraction'
  assert.equal(result.bindings[0]?.phrasebook[0]?.gloss, originalBook[0]?.gloss)
})

test('unsupported city, region, voice, language, and phrase selections are refused by the canonical readers', async () => {
  const valid = { ...cityInputs.kano, phrasebook: await sourcePhrasebook('ha') }
  await assert.rejects(extractTalkDraftInputs({ ...valid, cityId: 'unknown-city' }), /unknown catalogue city/)
  await assert.rejects(extractTalkDraftInputs({ ...valid, region: 'unknown-region' }), /region must be one of/)
  await assert.rejects(extractTalkDraftInputs({ ...valid, voice: 'invented' }), /binding\.voice is not supported/)
  await assert.rejects(extractTalkDraftInputs({ ...valid, lang: 'ha' }), /binding\.lang is not supported/)
  await assert.rejects(extractTalkDraftInputs({ ...valid, phrases: [{ lang: 'ha', text: 'Unprovided words' }] }), /not in the supplied phrasebook/)
  await assert.rejects(extractTalkDraftInputs({ ...valid, phrases: [{ lang: 'ha', text: 'Sannu!', extra: true }] }), /has unknown field extra/)
})
