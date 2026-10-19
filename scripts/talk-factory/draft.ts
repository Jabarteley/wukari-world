import type { AskInput } from '../../server/models/router.ts'
import {
  TALK_LANGS, TALK_TEXT_MAX, TALK_TOPICS, TALK_VOICES, TalkBankError,
  compileTalkBank, parseTalkBankEvidence,
  type HumanPhrasebookEntryV1, type TalkBankEvidenceV1, type TalkBankV1,
  type TalkLang, type TalkPhraseSelectionV1, type TalkVoice,
} from './bank.ts'

export const TALK_DRAFT_PROMPT_MAX_BYTES = 16_000
export const TALK_DRAFT_REPLY_MAX_BYTES = 32_000
export const TALK_DRAFT_REPLY_MAX_UNITS = 7_600
export const TALK_DRAFT_TARGET_LINES = 60
export const TALK_DRAFT_MAX_TOKENS = 4_096

export interface TalkDraftBindingV1 extends TalkBankEvidenceV1 {
  voice: TalkVoice
  lang: TalkLang
  phrases: TalkPhraseSelectionV1[]
}

export interface PreparedTalkDraftV1 {
  request: AskInput
  compile(replyText: unknown): TalkBankV1
}

type JsonRecord = Record<string, unknown>
const BINDING_KEYS = ['city', 'npc', 'venue', 'voice', 'lang', 'facts', 'phrasebook', 'phrases'] as const
const REPLY_KEYS = ['greet', 'ambient', 'about', 'bye'] as const

function fail(message: string): never { throw new TalkBankError(message) }

function exactObject(value: unknown, label: string, keys: readonly string[]): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be a plain object`)
  const row = value as JsonRecord, allowed = new Set(keys)
  for (const key of Object.keys(row)) if (!allowed.has(key)) fail(`${label} has unknown field ${key}`)
  for (const key of keys) if (!Object.hasOwn(row, key)) fail(`${label} is missing ${key}`)
  return row
}

function selectedPhrases(value: unknown, phrasebook: readonly HumanPhrasebookEntryV1[]): TalkPhraseSelectionV1[] {
  if (!Array.isArray(value)) fail('binding.phrases must be an array')
  const available = new Map(phrasebook.map(entry => [`${entry.lang}\u0000${entry.text}`, entry]))
  const seen = new Set<string>()
  return value.map((item, at) => {
    const row = exactObject(item, `binding.phrases[${at}]`, ['lang', 'text'])
    if (typeof row.lang !== 'string' || row.lang.trim() !== row.lang || !row.lang || row.lang.length > 40) fail(`binding.phrases[${at}].lang must be trimmed text`)
    if (typeof row.text !== 'string' || row.text.trim() !== row.text || !row.text || row.text.length > TALK_TEXT_MAX) fail(`binding.phrases[${at}].text must be trimmed text`)
    const selection = { lang: row.lang, text: row.text }, key = `${selection.lang}\u0000${selection.text}`
    if (!available.has(key)) fail(`binding.phrases[${at}] is not in the supplied phrasebook`)
    if (seen.has(key)) fail(`duplicate phrase selection ${selection.lang}:${selection.text}`)
    seen.add(key)
    return selection
  })
}

export function parseTalkDraftBinding(value: unknown): TalkDraftBindingV1 {
  const row = exactObject(value, 'binding', BINDING_KEYS)
  const proof = parseTalkBankEvidence({ city: row.city, npc: row.npc, venue: row.venue, facts: row.facts, phrasebook: row.phrasebook })
  if (typeof row.voice !== 'string' || !TALK_VOICES.includes(row.voice as TalkVoice)) fail('binding.voice is not supported')
  if (typeof row.lang !== 'string' || !TALK_LANGS.includes(row.lang as TalkLang)) fail('binding.lang is not supported')
  return { ...proof, voice: row.voice as TalkVoice, lang: row.lang as TalkLang, phrases: selectedPhrases(row.phrases, proof.phrasebook) }
}

function bytes(value: string): number { return new TextEncoder().encode(value).byteLength }

function promptFor(value: TalkDraftBindingV1): readonly AskInput['messages'][number][] {
  const greeting = value.venue.name.includes(value.city.name) ? value.venue.name
    : value.city.name.includes(value.venue.name) ? value.city.name : `${value.city.name}: ${value.venue.name}`
  if (greeting.length > TALK_TEXT_MAX) fail('city and venue names cannot fit one greeting without changing their identities')
  const instructions = [
    'Return one plain JSON object with exactly greet, ambient, about and bye.',
    'Each line is an object with exactly text and sources. Sources contain only supplied identity or fact IDs.',
    `About has exactly these keys: ${TALK_TOPICS.join(', ')}.`,
    `Write exactly ${TALK_DRAFT_TARGET_LINES} unique trimmed English lines in the requested style. Every section and topic must be non-empty.`,
    `Use compact JSON without indentation, at most ${TALK_DRAFT_REPLY_MAX_UNITS} UTF-16 units in total. Aim for 64 characters per line except when exact greeting names require more.`,
    'Every greeting must name the supplied city and venue and cite city and venue.',
    `Keep each line at most ${TALK_TEXT_MAX} characters. Do not use code fences.`,
    'Use only supplied identities and facts. Do not invent or infer quotes, history, prices, hours, translations or other facts.',
    'Facts named venue-target-* are labels of areas inside this venue. Use them only as area names.',
    'Do not produce native phrases or add identity, voice, language, fact or phrase fields.',
  ].join(' ')
  const supplied = JSON.stringify({
    city: { id: value.city.id, name: value.city.name },
    npc: { id: value.npc.id, name: value.npc.name },
    venue: { id: value.venue.id, name: value.venue.name },
    voice: value.voice,
    lang: value.lang,
    facts: value.facts.map(fact => ({ id: fact.id, text: fact.text })),
  })
  const messages = [{ role: 'system' as const, content: instructions }, { role: 'user' as const, content: supplied }]
  const size = messages.reduce((total, message) => total + bytes(message.content), 0)
  if (size > TALK_DRAFT_PROMPT_MAX_BYTES) fail(`talk draft prompt is ${size} bytes; maximum is ${TALK_DRAFT_PROMPT_MAX_BYTES}`)
  for (const phrase of value.phrases) if (messages.some(message => message.content.includes(phrase.text))) fail('selected native phrase overlaps request content')
  return messages
}

function reply(value: unknown): JsonRecord {
  if (typeof value !== 'string') fail('talk draft reply must be text')
  const size = bytes(value)
  if (size > TALK_DRAFT_REPLY_MAX_BYTES) fail(`talk draft reply is ${size} bytes; maximum is ${TALK_DRAFT_REPLY_MAX_BYTES}`)
  if (value.length > TALK_DRAFT_REPLY_MAX_UNITS) fail(`talk draft reply is ${value.length} UTF-16 units; maximum is ${TALK_DRAFT_REPLY_MAX_UNITS}`)
  let parsed: unknown
  try { parsed = JSON.parse(value) } catch { fail('talk draft reply must be one plain JSON object') }
  return exactObject(parsed, 'talk draft reply', REPLY_KEYS)
}

export function prepareTalkDraft(rawBinding: unknown): PreparedTalkDraftV1 {
  const bound = parseTalkDraftBinding(rawBinding), messages = promptFor(bound)
  const request: AskInput = { purpose: 'agent-talk', messages, maxTokens: TALK_DRAFT_MAX_TOKENS, carriesPlayerWords: false }
  return {
    request,
    compile(replyText: unknown): TalkBankV1 {
      const lines = reply(replyText)
      return compileTalkBank({
        city: bound.city, npc: bound.npc, venue: bound.venue,
        voice: bound.voice, lang: bound.lang, facts: bound.facts,
        greet: lines.greet, ambient: lines.ambient, about: lines.about, bye: lines.bye,
        phrases: bound.phrases,
      }, bound.phrasebook)
    },
  }
}
