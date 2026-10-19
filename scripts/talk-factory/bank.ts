import { agentWords } from '../../server/moderation/agent-words.ts'
import { screenText } from '../../server/moderation/text.ts'
import type { CityId } from '../../src/game/cities/ids.ts'

export const TALK_TOPICS = ['market', 'food', 'weather', 'work', 'city', 'festival', 'directions'] as const
export const TALK_VOICES = ['plain', 'pidgin', 'formal', 'jokey'] as const
export const TALK_LANGS = ['en', 'pcm'] as const
export const TALK_LINE_MIN = 60
export const TALK_LINE_MAX = 150
export const TALK_TEXT_MAX = 140
export const TALK_BANK_MAX_BYTES = 32_000

export type TalkTopic = typeof TALK_TOPICS[number]
export type TalkVoice = typeof TALK_VOICES[number]
export type TalkLang = typeof TALK_LANGS[number]

export interface PhraseSourceV1 {
  kind: 'human'
  citation: string
  contributor: string
}

export interface HumanPhrasebookEntryV1 {
  lang: string
  text: string
  gloss: string
  source: PhraseSourceV1
}

export interface TalkBankV1 {
  city: CityId
  npc: string
  voice: TalkVoice
  lang: TalkLang
  greet: string[]
  ambient: string[]
  about: Record<TalkTopic, string[]>
  bye: string[]
  phrases: HumanPhrasebookEntryV1[]
}

export interface SourcedFieldV1 {
  id: string
  name: string
  source: string
}

export interface SourcedFactV1 {
  id: string
  text: string
  source: string
}

export interface ApprovedTalkLineV1 {
  text: string
  sources: string[]
}

export interface TalkPhraseSelectionV1 {
  lang: string
  text: string
}

export interface TalkBankInputV1 {
  city: SourcedFieldV1
  npc: SourcedFieldV1
  venue: SourcedFieldV1
  voice: TalkVoice
  lang: TalkLang
  facts: SourcedFactV1[]
  greet: ApprovedTalkLineV1[]
  ambient: ApprovedTalkLineV1[]
  about: Record<TalkTopic, ApprovedTalkLineV1[]>
  bye: ApprovedTalkLineV1[]
  phrases: TalkPhraseSelectionV1[]
}

export interface TalkBankEvidenceV1 {
  city: SourcedFieldV1
  npc: SourcedFieldV1
  venue: SourcedFieldV1
  facts: SourcedFactV1[]
  phrasebook: HumanPhrasebookEntryV1[]
}

export class TalkBankError extends Error {
  override readonly name = 'TalkBankError'
}

type JsonRecord = Record<string, unknown>
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LANGUAGE = /^(?:[a-z]{2,8}(?:-[a-z0-9]{1,8})*|x(?:-[a-z0-9]{1,8})+)$/
const DIGIT_TOKEN = /[\p{Sc}]?\d+(?:[.,:/-]\d+)*(?:[%\p{L}]+)?/gu
const RESERVED_SOURCES = new Set(['city', 'npc', 'venue'])

function fail(message: string): never { throw new TalkBankError(message) }

function exactObject(value: unknown, label: string, keys: readonly string[]): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be a plain object`)
  const record = value as JsonRecord, allowed = new Set(keys)
  for (const key of Object.keys(record)) if (!allowed.has(key)) fail(`${label} has unknown field ${key}`)
  for (const key of keys) if (!Object.hasOwn(record, key)) fail(`${label} is missing ${key}`)
  return record
}

function text(value: unknown, label: string, max: number, trim = false): string {
  if (typeof value !== 'string') fail(`${label} must be text`)
  const clean = value.trim()
  if (!clean) fail(`${label} must not be empty`)
  if (!trim && clean !== value) fail(`${label} must be trimmed`)
  if (clean.length > max) fail(`${label} exceeds ${max} characters`)
  return clean
}

function id(value: unknown, label: string, trim = false): string {
  const clean = text(value, label, 80, trim)
  if (!ID.test(clean)) fail(`${label} must be a lower-case id`)
  return clean
}

function oneOf<T extends string>(value: unknown, label: string, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) fail(`${label} is not supported`)
  return value as T
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`)
  return value
}

function safeSpokenText(value: string, label: string): void {
  const words = agentWords(value, { toMinor: true })
  if (!words.ok) fail(`${label} failed agentWords: ${words.code}`)
  const screened = screenText(value, { contact: true, what: label })
  if (screened) fail(`${label} failed text filter: ${screened.code}`)
}

function sourcedField(value: unknown, label: string, trim = false): SourcedFieldV1 {
  const row = exactObject(value, label, ['id', 'name', 'source'])
  return { id: id(row.id, `${label}.id`, trim), name: text(row.name, `${label}.name`, TALK_TEXT_MAX, trim), source: text(row.source, `${label}.source`, 500, trim) }
}

function sourcedFacts(value: unknown, trim = false): SourcedFactV1[] {
  const out: SourcedFactV1[] = [], seen = new Set<string>()
  for (const [at, item] of array(value, 'facts').entries()) {
    const row = exactObject(item, `facts[${at}]`, ['id', 'text', 'source'])
    const fact = { id: id(row.id, `facts[${at}].id`, trim), text: text(row.text, `facts[${at}].text`, 500, trim), source: text(row.source, `facts[${at}].source`, 500, trim) }
    if (RESERVED_SOURCES.has(fact.id)) fail(`fact id ${fact.id} is reserved`)
    if (seen.has(fact.id)) fail(`duplicate fact id ${fact.id}`)
    seen.add(fact.id); out.push(fact)
  }
  return out
}

function phraseSource(value: unknown, label: string, trim = false): PhraseSourceV1 {
  const row = exactObject(value, label, ['kind', 'citation', 'contributor'])
  if (row.kind !== 'human') fail(`${label}.kind must be human`)
  return { kind: 'human', citation: text(row.citation, `${label}.citation`, 500, trim), contributor: text(row.contributor, `${label}.contributor`, 120, trim) }
}

function phrase(value: unknown, label: string, trim = false): HumanPhrasebookEntryV1 {
  const row = exactObject(value, label, ['lang', 'text', 'gloss', 'source'])
  const lang = text(row.lang, `${label}.lang`, 40, trim)
  if (!LANGUAGE.test(lang) || TALK_LANGS.includes(lang as TalkLang)) fail(`${label}.lang must identify a native phrase language`)
  return {
    lang,
    text: text(row.text, `${label}.text`, TALK_TEXT_MAX, trim),
    gloss: text(row.gloss, `${label}.gloss`, TALK_TEXT_MAX, trim),
    source: phraseSource(row.source, `${label}.source`, trim),
  }
}

function phrasebook(value: unknown, trim = false): HumanPhrasebookEntryV1[] {
  const out: HumanPhrasebookEntryV1[] = [], seen = new Set<string>()
  for (const [at, item] of array(value, 'phrasebook').entries()) {
    const entry = phrase(item, `phrasebook[${at}]`, trim), key = phraseKey(entry)
    if (seen.has(key)) fail(`duplicate phrasebook entry ${entry.lang}:${entry.text}`)
    seen.add(key); out.push(entry)
  }
  return out
}

function phraseKey(value: Pick<HumanPhrasebookEntryV1, 'lang' | 'text'>): string { return `${value.lang}\u0000${value.text}` }

function samePhrase(left: HumanPhrasebookEntryV1, right: HumanPhrasebookEntryV1): boolean {
  return left.lang === right.lang && left.text === right.text && left.gloss === right.gloss && left.source.kind === right.source.kind && left.source.citation === right.source.citation && left.source.contributor === right.source.contributor
}

function digitTokens(value: string): string[] { return [...value.matchAll(DIGIT_TOKEN)].map(match => match[0]) }

function allowedDigits(evidence: Pick<TalkBankEvidenceV1, 'city' | 'npc' | 'venue' | 'facts'>): Set<string> {
  return new Set([evidence.city.id, evidence.city.name, evidence.npc.id, evidence.npc.name, evidence.venue.id, evidence.venue.name, ...evidence.facts.map(fact => fact.text)].flatMap(digitTokens))
}

function checkDigits(value: string, label: string, allowed: ReadonlySet<string>): void {
  for (const token of digitTokens(value)) if (!allowed.has(token)) fail(`${label} uses unsourced digit token ${token}`)
}

function approvedLine(value: unknown, label: string, sourceIds: ReadonlySet<string>): ApprovedTalkLineV1 {
  const row = exactObject(value, label, ['text', 'sources'])
  const line = text(row.text, `${label}.text`, TALK_TEXT_MAX, true)
  const sources = array(row.sources, `${label}.sources`).map((source, at) => id(source, `${label}.sources[${at}]`, true))
  if (!sources.length) fail(`${label}.sources must not be empty`)
  if (new Set(sources).size !== sources.length) fail(`${label}.sources contains a duplicate`)
  for (const source of sources) if (!sourceIds.has(source)) fail(`${label}.sources has unknown source ${source}`)
  return { text: line, sources }
}

function approvedLines(value: unknown, label: string, sourceIds: ReadonlySet<string>): ApprovedTalkLineV1[] {
  return array(value, label).map((line, at) => approvedLine(line, `${label}[${at}]`, sourceIds))
}

function input(value: unknown): TalkBankInputV1 {
  const row = exactObject(value, 'input', ['city', 'npc', 'venue', 'voice', 'lang', 'facts', 'greet', 'ambient', 'about', 'bye', 'phrases'])
  const city = sourcedField(row.city, 'input.city', true), npc = sourcedField(row.npc, 'input.npc', true), venue = sourcedField(row.venue, 'input.venue', true)
  const facts = sourcedFacts(row.facts, true), sourceIds = new Set(['city', 'npc', 'venue', ...facts.map(fact => fact.id)])
  const aboutRow = exactObject(row.about, 'input.about', TALK_TOPICS)
  const about = Object.fromEntries(TALK_TOPICS.map(topic => [topic, approvedLines(aboutRow[topic], `input.about.${topic}`, sourceIds)])) as Record<TalkTopic, ApprovedTalkLineV1[]>
  const selections: TalkPhraseSelectionV1[] = [], selected = new Set<string>()
  for (const [at, item] of array(row.phrases, 'input.phrases').entries()) {
    const pick = exactObject(item, `input.phrases[${at}]`, ['lang', 'text'])
    const lang = text(pick.lang, `input.phrases[${at}].lang`, 40), phraseText = text(pick.text, `input.phrases[${at}].text`, TALK_TEXT_MAX)
    const key = phraseKey({ lang, text: phraseText })
    if (selected.has(key)) fail(`duplicate phrase selection ${lang}:${phraseText}`)
    selected.add(key); selections.push({ lang, text: phraseText })
  }
  const greet = approvedLines(row.greet, 'input.greet', sourceIds)
  for (const [at, line] of greet.entries()) {
    if (!line.sources.includes('city') || !line.sources.includes('venue')) fail(`input.greet[${at}] must cite city and venue`)
    if (!line.text.includes(city.name) || !line.text.includes(venue.name)) fail(`input.greet[${at}] must name ${city.name} and ${venue.name}`)
  }
  return {
    city, npc, venue,
    voice: oneOf(row.voice, 'input.voice', TALK_VOICES),
    lang: oneOf(row.lang, 'input.lang', TALK_LANGS),
    facts, greet,
    ambient: approvedLines(row.ambient, 'input.ambient', sourceIds),
    about,
    bye: approvedLines(row.bye, 'input.bye', sourceIds),
    phrases: selections,
  }
}

export function parseTalkBankEvidence(value: unknown): TalkBankEvidenceV1 {
  const row = exactObject(value, 'evidence', ['city', 'npc', 'venue', 'facts', 'phrasebook'])
  return {
    city: sourcedField(row.city, 'evidence.city'),
    npc: sourcedField(row.npc, 'evidence.npc'),
    venue: sourcedField(row.venue, 'evidence.venue'),
    facts: sourcedFacts(row.facts),
    phrasebook: phrasebook(row.phrasebook),
  }
}

function outputLines(value: unknown, label: string, seen: Set<string>, digits: ReadonlySet<string>): string[] {
  const lines = array(value, label).map((line, at) => text(line, `${label}[${at}]`, TALK_TEXT_MAX))
  if (!lines.length) fail(`${label} must not be empty`)
  for (const [at, line] of lines.entries()) {
    if (seen.has(line)) fail(`duplicate trimmed line ${line}`)
    seen.add(line); safeSpokenText(line, `${label}[${at}]`); checkDigits(line, `${label}[${at}]`, digits)
  }
  return lines
}

export function validateTalkBank(value: unknown, rawEvidence: unknown): TalkBankV1 {
  const proof = parseTalkBankEvidence(rawEvidence), row = exactObject(value, 'bank', ['city', 'npc', 'voice', 'lang', 'greet', 'ambient', 'about', 'bye', 'phrases'])
  const city = id(row.city, 'bank.city') as CityId, npc = id(row.npc, 'bank.npc')
  if (city !== proof.city.id) fail('bank.city does not match evidence.city')
  if (npc !== proof.npc.id) fail('bank.npc does not match evidence.npc')
  const digits = allowedDigits(proof), seen = new Set<string>()
  const greet = outputLines(row.greet, 'bank.greet', seen, digits)
  for (const [at, line] of greet.entries()) if (!line.includes(proof.city.name) || !line.includes(proof.venue.name)) fail(`bank.greet[${at}] must name ${proof.city.name} and ${proof.venue.name}`)
  const ambient = outputLines(row.ambient, 'bank.ambient', seen, digits)
  const aboutRow = exactObject(row.about, 'bank.about', TALK_TOPICS)
  const about = Object.fromEntries(TALK_TOPICS.map(topic => [topic, outputLines(aboutRow[topic], `bank.about.${topic}`, seen, digits)])) as Record<TalkTopic, string[]>
  const bye = outputLines(row.bye, 'bank.bye', seen, digits)
  if (seen.size < TALK_LINE_MIN || seen.size > TALK_LINE_MAX) fail(`bank has ${seen.size} English lines; expected ${TALK_LINE_MIN}-${TALK_LINE_MAX}`)

  const available = new Map(proof.phrasebook.map(entry => [phraseKey(entry), entry]))
  const phrases: HumanPhrasebookEntryV1[] = [], phraseSeen = new Set<string>()
  for (const [at, item] of array(row.phrases, 'bank.phrases').entries()) {
    const entry = phrase(item, `bank.phrases[${at}]`), key = phraseKey(entry), supplied = available.get(key)
    if (!supplied || !samePhrase(entry, supplied)) fail(`bank.phrases[${at}] is not an exact supplied phrasebook entry`)
    if (phraseSeen.has(key)) fail(`duplicate native phrase ${entry.lang}:${entry.text}`)
    phraseSeen.add(key)
    safeSpokenText(entry.text, `bank.phrases[${at}].text`); safeSpokenText(entry.gloss, `bank.phrases[${at}].gloss`)
    checkDigits(entry.text, `bank.phrases[${at}].text`, digits); checkDigits(entry.gloss, `bank.phrases[${at}].gloss`, digits)
    phrases.push(entry)
  }
  const bank: TalkBankV1 = {
    city, npc,
    voice: oneOf(row.voice, 'bank.voice', TALK_VOICES),
    lang: oneOf(row.lang, 'bank.lang', TALK_LANGS),
    greet, ambient, about, bye, phrases,
  }
  const bytes = new TextEncoder().encode(JSON.stringify(bank)).byteLength
  if (bytes > TALK_BANK_MAX_BYTES) fail(`bank is ${bytes} bytes; maximum is ${TALK_BANK_MAX_BYTES}`)
  return bank
}

export function compileTalkBank(rawInput: unknown, rawPhrasebook: unknown): TalkBankV1 {
  const draft = input(rawInput), supplied = phrasebook(rawPhrasebook), available = new Map(supplied.map(entry => [phraseKey(entry), entry]))
  const phrases = draft.phrases.map((selection, at) => {
    const entry = available.get(phraseKey(selection))
    if (!entry) fail(`input.phrases[${at}] is not in the supplied phrasebook`)
    return entry
  })
  const bank = {
    city: draft.city.id,
    npc: draft.npc.id,
    voice: draft.voice,
    lang: draft.lang,
    greet: draft.greet.map(line => line.text),
    ambient: draft.ambient.map(line => line.text),
    about: Object.fromEntries(TALK_TOPICS.map(topic => [topic, draft.about[topic].map(line => line.text)])),
    bye: draft.bye.map(line => line.text),
    phrases,
  }
  return validateTalkBank(bank, { city: draft.city, npc: draft.npc, venue: draft.venue, facts: draft.facts, phrasebook: supplied })
}
