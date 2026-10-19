import assert from 'node:assert/strict'
import test from 'node:test'
import { cityContent, loadCityContent } from '../../src/game/cities/registry.ts'
import {
  TALK_BANK_MAX_BYTES, TALK_TEXT_MAX, TALK_TOPICS, compileTalkBank, validateTalkBank,
  type ApprovedTalkLineV1, type HumanPhrasebookEntryV1, type TalkBankEvidenceV1, type TalkBankInputV1,
} from './bank.ts'

const PHRASEBOOK: HumanPhrasebookEntryV1[] = [{
  lang: 'x-test', text: 'Fixture greeting', gloss: 'Test greeting',
  source: { kind: 'human', citation: 'talk-bank unit fixture', contributor: 'Fixture writer' },
}]

function word(index: number): string {
  return String.fromCharCode(97 + Math.floor(index / 26) % 26) + String.fromCharCode(97 + index % 26)
}

function approved(text: string, sources: string[] = ['city', 'venue']): ApprovedTalkLineV1 { return { text, sources } }

function fixture(cityId = 'kano', cityName = 'Kano', venueId = 'kantin-kwari', venueName = 'Kantin Kwari Market'): TalkBankInputV1 {
  const at = (section: string, count: number) => Array.from({ length: count }, (_, index) => approved(`The ${section} note ${word(index)} belongs to ${venueName} in ${cityName}.`))
  return {
    city: { id: cityId, name: cityName, source: `fixture city ${cityId}` },
    npc: { id: 'market-seller', name: 'Market seller', source: 'fixture role' },
    venue: { id: venueId, name: venueName, source: `fixture venue ${venueId}` },
    voice: 'plain', lang: 'en', facts: [],
    greet: [approved(`Welcome to ${venueName} in ${cityName}.`)],
    ambient: at('ambient', 10),
    about: Object.fromEntries(TALK_TOPICS.map(topic => [topic, at(topic, 6)])) as TalkBankInputV1['about'],
    bye: at('goodbye', 7),
    phrases: [],
  }
}

function proof(input: TalkBankInputV1, phrasebook = PHRASEBOOK): TalkBankEvidenceV1 {
  return { city: input.city, npc: input.npc, venue: input.venue, facts: input.facts, phrasebook }
}

test('compiler is deterministic and keeps three market greetings city and venue specific', () => {
  const inputs = [
    fixture('kano', 'Kano', 'kantin-kwari', 'Kantin Kwari Market'),
    fixture('accra', 'Accra', 'makola-market', 'Makola Market'),
    fixture('tokyo', 'Tokyo', 'toyosu-market', 'Toyosu Market'),
  ]
  const banks = inputs.map(input => compileTalkBank(input, PHRASEBOOK))
  assert.deepEqual(banks, inputs.map(input => compileTalkBank(input, PHRASEBOOK)))
  assert.equal(new Set(banks.map(bank => bank.greet[0])).size, 3)
  for (const [at, bank] of banks.entries()) {
    assert.equal(bank.greet[0]?.includes(inputs[at]!.city.name), true)
    assert.equal(bank.greet[0]?.includes(inputs[at]!.venue.name), true)
    assert.equal(Object.values(bank.about).flat().length + bank.greet.length + bank.ambient.length + bank.bye.length, 60)
  }
})

test('every spoken field passes both safety filters', () => {
  const contact = fixture()
  contact.ambient[0] = approved('Send me your phone number.')
  assert.throws(() => compileTalkBank(contact, PHRASEBOOK), /failed agentWords: agent_words_contact/)

  const threat = fixture()
  threat.ambient[0] = approved('Go kill yourself now.')
  assert.throws(() => compileTalkBank(threat, PHRASEBOOK), /failed text filter: text_blocked/)
})

test('duplicates and unknown schema fields are refused', () => {
  const duplicate = fixture()
  duplicate.ambient[1] = { ...duplicate.ambient[0]! }
  assert.throws(() => compileTalkBank(duplicate, PHRASEBOOK), /duplicate trimmed line/)

  const unknownInput = { ...fixture(), invented: true }
  assert.throws(() => compileTalkBank(unknownInput, PHRASEBOOK), /input has unknown field invented/)

  const source = fixture(), bank = compileTalkBank(source, PHRASEBOOK)
  assert.throws(() => validateTalkBank({ ...bank, invented: true }, proof(source)), /bank has unknown field invented/)
})

test('native phrases are copied exactly from the separately supplied phrasebook', () => {
  const source = fixture()
  source.phrases = [{ lang: PHRASEBOOK[0]!.lang, text: PHRASEBOOK[0]!.text }]
  const bank = compileTalkBank(source, PHRASEBOOK)
  assert.deepEqual(bank.phrases, PHRASEBOOK)

  const unmatched = fixture()
  unmatched.phrases = [{ lang: 'x-test', text: 'Unsupplied fixture phrase' }]
  assert.throws(() => compileTalkBank(unmatched, PHRASEBOOK), /not in the supplied phrasebook/)

  const changed = structuredClone(bank)
  changed.phrases[0]!.gloss = 'Changed gloss'
  assert.throws(() => validateTalkBank(changed, proof(source)), /not an exact supplied phrasebook entry/)

  const padded = structuredClone(PHRASEBOOK)
  padded[0]!.text = ` ${padded[0]!.text} `
  assert.throws(() => compileTalkBank(source, padded), /must be trimmed/)
  const paddedSelection = structuredClone(source)
  paddedSelection.phrases[0]!.text = ` ${paddedSelection.phrases[0]!.text} `
  assert.throws(() => compileTalkBank(paddedSelection, PHRASEBOOK), /must be trimmed/)
})

test('digit tokens must exactly occur in a supplied fact or identity field', () => {
  const source = fixture()
  source.facts = [{ id: 'basket-price', text: 'The practice basket is listed at ₦700.', source: 'fixture price sheet' }]
  source.ambient[0] = approved('A practice basket at Kantin Kwari Market in Kano is listed at ₦700.', ['city', 'venue', 'basket-price'])
  assert.equal(compileTalkBank(source, PHRASEBOOK).ambient[0]?.includes('₦700'), true)

  source.ambient[0] = approved('A practice basket at Kantin Kwari Market in Kano is listed at ₦701.', ['city', 'venue', 'basket-price'])
  assert.throws(() => compileTalkBank(source, PHRASEBOOK), /unsourced digit token ₦701/)
})

test('line length, line count and serialized byte caps are enforced independently', () => {
  const long = fixture()
  long.ambient[0] = approved('x'.repeat(TALK_TEXT_MAX + 1))
  assert.throws(() => compileTalkBank(long, PHRASEBOOK), /exceeds 140 characters/)

  const tooMany = fixture()
  tooMany.ambient.push(...Array.from({ length: 91 }, (_, index) => approved(`The extra note ${word(index + 20)} belongs to Kantin Kwari Market in Kano.`)))
  assert.throws(() => compileTalkBank(tooMany, PHRASEBOOK), /has 151 English lines/)

  const large = fixture()
  large.ambient.push(...Array.from({ length: 90 }, (_, index) => approved(`The added note ${word(index + 20)} belongs to Kantin Kwari Market in Kano.`)))
  const pad = (line: ApprovedTalkLineV1): ApprovedTalkLineV1 => ({ ...line, text: `${line.text} ${'é'.repeat(TALK_TEXT_MAX - line.text.length - 1)}` })
  large.greet = large.greet.map(pad)
  large.ambient = large.ambient.map(pad)
  large.about = Object.fromEntries(TALK_TOPICS.map(topic => [topic, large.about[topic].map(pad)])) as TalkBankInputV1['about']
  large.bye = large.bye.map(pad)
  assert.throws(() => compileTalkBank(large, PHRASEBOOK), new RegExp(`bytes; maximum is ${TALK_BANK_MAX_BYTES}`))
})

test('the exact long Tallinn venue identity fits its existing spoken-line limit', async () => {
  await loadCityContent('tallinn')
  const venue = cityContent('tallinn').venues.find(row => row.id === 'tallinn-community-notices')
  assert.ok(venue)
  assert.equal(venue.name.length, 123)
  const source = fixture('tallinn', 'Tallinn', venue.id, venue.name)
  source.greet = [approved(`Tallinn: ${venue.name}`)]
  const short = (section: string, count: number) => Array.from({ length: count }, (_, at) => approved(`${section} thought ${word(at)}.`))
  source.ambient = short('Ambient', 10)
  source.about = Object.fromEntries(TALK_TOPICS.map(topic => [topic, short(topic, 6)])) as TalkBankInputV1['about']
  source.bye = short('Goodbye', 7)
  const bank = compileTalkBank(source, PHRASEBOOK)
  assert.equal(bank.greet[0], `Tallinn: ${venue.name}`)
  assert.equal(bank.greet[0]!.length, 132)
  assert.deepEqual(validateTalkBank(bank, proof(source)), bank)
  source.venue.name = 'x'.repeat(TALK_TEXT_MAX + 1)
  assert.throws(() => compileTalkBank(source, PHRASEBOOK), /venue.name exceeds 140 characters/)
})
