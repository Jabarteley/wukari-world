import { aiAnswer, asksIfAi, crisisWords, helpText } from '../moderation/ai-intercept.ts'
import { agentWords } from '../moderation/agent-words.ts'
import { screenText } from '../moderation/text.ts'
import { cleanReply, intentOf } from '../house/talk.ts'
import type { AskInput, AskResult } from '../models/router.ts'
import { parseTalkBankEvidence, TALK_TEXT_MAX, validateTalkBank } from '../../scripts/talk-factory/bank.ts'
import type { TalkBankEvidenceV1, TalkBankV1, TalkTopic } from '../../scripts/talk-factory/bank.ts'
import type { OpeningInfo } from '../../src/game/clock.ts'
import type { TalkAccounting, TalkHistoryLine, TalkResult } from '../../src/types/story-talk.ts'
import { buildTalkPrompt } from './talk-prompt.ts'

export type { TalkAccounting, TalkHistoryLine, TalkResult } from '../../src/types/story-talk.ts'

const ZERO = { kind: 'zero', routerCalls: 0, costMicro: 0 } as const
const NUMBER_TOKEN = /\d[\d,]*(?:\.\d+)?/g
const TOPIC_WORDS: readonly [TalkTopic, RegExp][] = [
  ['market', /\bmarket|stall|trade|buy|shop\b/i],
  ['food', /\bfood|eat|dish|meal|cook|drink\b/i],
  ['weather', /\bweather|rain|sun|hot|cold|wind\b/i],
  ['work', /\bwork|job|career|business\b/i],
  ['city', /\bcity|town|place|area|history\b/i],
  ['festival', /\bfestival|event|tonight|celebration|party|show\b/i],
  ['directions', /\bwhere|direction|route|find|way to|how do i get\b/i],
]

export interface TalkAuthority {
  actorId: string
  characterKey: string
  playerKey: string
  city: { id: string; name: string; country: string | null }
  venue: {
    id: string
    name: string
    availability: { kind: 'opening-info'; value: OpeningInfo } | { kind: 'rules'; text: string }
  }
  regular: { id: string; name: string; role: string }
  bank: {
    revision: string
    load(): Promise<{ bank: unknown; evidence: unknown }>
  }
  stillAuthorized(): Promise<boolean>
  admitAttempt(request: TalkRequest): Promise<'fresh' | 'duplicate' | 'unauthorized'>
}

export interface TalkRequest {
  clientId: string
  question: string
  history?: readonly TalkHistoryLine[]
}

export interface TalkCoreDependencies {
  ready(): Promise<void>
  ask(input: AskInput): Promise<AskResult>
  canAsk(input: AskInput): boolean
  now(): number
  validateClientId?(clientId: string): boolean
  ttlMs?: number
  maxEntries?: number
}

interface BankBundle {
  bank: TalkBankV1
  evidence: TalkBankEvidenceV1
}

interface Timed<T> {
  value: T
  expiresAt: number
}

interface Receipt {
  fingerprint: string
  promise: Promise<TalkResult>
  expiresAt: number
  settled: boolean
}

interface ResponseEntry extends Timed<TalkResult> {
  actorId: string
}

const oneLine = (value: string, max = 600): string => value.replace(/\s+/g, ' ').trim().slice(0, max)

function hash(value: string): number {
  let out = 2166136261
  for (let at = 0; at < value.length; at++) out = Math.imul(out ^ value.charCodeAt(at), 16777619)
  return out >>> 0
}

function choose(lines: readonly string[], seed: string): string {
  return lines[hash(seed) % lines.length] ?? ''
}

function safeOutput(text: string, allowed: ReadonlySet<string>): string | null {
  const cleaned = cleanReply(text, { allowed, verdict: null, role: 'seller' })
  if (!cleaned || cleaned.length > TALK_TEXT_MAX) return null
  if (!agentWords(cleaned, { toMinor: true }).ok) return null
  if (screenText(cleaned, { contact: true, what: 'NPC reply' })) return null
  // Reject visible cutoff shapes; terminal punctuation alone is not a grammar proof.
  if (!/[.!?]$/.test(cleaned) || /(?:\.(?:\s*\.)+|…)[.!?]*$/.test(cleaned)
    || /\b(?:and|or|but|nor)[.!?]+$/i.test(cleaned)) return null
  return cleaned
}

function numberTokens(lines: readonly string[]): Set<string> {
  const out = new Set<string>()
  for (const line of lines) {
    for (const token of line.match(NUMBER_TOKEN) ?? []) out.add(token.replace(/,/g, '').replace(/\.0+$/, ''))
  }
  return out
}

function cached(result: TalkResult): TalkResult {
  if (result.kind !== 'reply') return result
  return { ...result, source: 'cache', accounting: ZERO }
}

function contextKey(context: TalkAuthority): string {
  return JSON.stringify([
    context.actorId, context.characterKey, context.playerKey, context.city.id, context.city.name, context.city.country,
    context.venue.id, context.venue.name, context.venue.availability,
    context.regular.id, context.regular.name, context.regular.role, context.bank.revision,
  ])
}

function requestKey(context: TalkAuthority, request: TalkRequest): string {
  return JSON.stringify([contextKey(context), oneLine(request.question), (request.history ?? []).slice(-4).map(line => [line.from, oneLine(line.text, 240)])])
}

/** Stable request identity; changing clock-derived opening text must not permit another attempt. */
export function talkAttemptKey(context: TalkAuthority, request: TalkRequest): string {
  return JSON.stringify([context.actorId, context.characterKey, context.playerKey, context.city.id, context.venue.id,
    context.regular.id, context.bank.revision, request.question.replace(/\s+/g, ' ').trim(),
    (request.history ?? []).map(line => [line.from, line.text.replace(/\s+/g, ' ').trim()])])
}

function accountingOf(asked: AskResult): TalkAccounting {
  if (asked.attempts.length === 0) return { kind: 'zero', routerCalls: 1, costMicro: 0 }
  // Zero fields can also mean omitted wire usage in the protected gateway; keep those totals unknown.
  if (asked.ok && asked.attempts.length === 1 && asked.attempts[0]?.ok && asked.usage
    && Number.isSafeInteger(asked.usage.input) && asked.usage.input > 0
    && Number.isSafeInteger(asked.usage.output) && asked.usage.output > 0
    && Number.isSafeInteger(asked.costMicro) && asked.costMicro >= 0) {
    return { kind: 'live', routerCalls: 1, costMicro: asked.costMicro }
  }
  return { kind: 'unknown', routerCalls: 1, cost: 'unknown' }
}

function availabilityText(context: TalkAuthority): string {
  const availability = context.venue.availability
  return availability.kind === 'opening-info'
    ? `In the game, ${context.venue.name}: ${availability.value.status}.`
    : `In the game, ${context.venue.name}: ${availability.text}`
}

function topicOf(question: string): TalkTopic | null {
  for (const [topic, pattern] of TOPIC_WORDS) if (pattern.test(question)) return topic
  return null
}

function fallbackLine(bank: TalkBankV1, seed: string): string {
  return choose(bank.ambient.length ? bank.ambient : bank.about.city, `fallback:${seed}`)
}

function safeAuthored(text: string, allowed: ReadonlySet<string>): string | null {
  const clean = oneLine(text, TALK_TEXT_MAX + 1)
  if (!clean || clean.length > TALK_TEXT_MAX || !agentWords(clean, { toMinor: true }).ok) return null
  if (screenText(clean, { contact: true, what: 'NPC reply' })) return null
  for (const token of clean.match(NUMBER_TOKEN) ?? []) if (!allowed.has(token.replace(/,/g, '').replace(/\.0+$/, ''))) return null
  return clean
}

function bankReply(context: TalkAuthority, request: TalkRequest, bank: TalkBankV1): TalkResult | null {
  const seed = requestKey(context, request)
  const intent = intentOf(request.question, 'seller', false)
  let text = ''
  if (intent === 'greet') text = choose(bank.greet, seed)
  else if (intent === 'bye') text = choose(bank.bye, seed)
  else if (intent === 'hours') text = availabilityText(context)
  else if (intent === 'prices' || intent === 'offer' || intent === 'pressure') text = `Check the prices posted in the ${context.venue.name} shop.`
  else if (intent === 'directions') text = choose(bank.about.directions, seed)
  else {
    const topic = topicOf(request.question)
    if (topic) text = choose(bank.about[topic], seed)
    else return null
  }
  if (intent === 'hours' || intent === 'prices' || intent === 'offer' || intent === 'pressure') {
    text = safeAuthored(text, numberTokens([availabilityText(context), context.venue.name])) ?? fallbackLine(bank, seed)
  }
  const result: Extract<TalkResult, { kind: 'reply' }> = {
    kind: 'reply', source: 'bank', name: context.regular.name, ai: true, text, accounting: ZERO,
  }
  if (intent === 'greet' && bank.phrases.length) {
    const phrase = bank.phrases[hash(seed) % bank.phrases.length]
    if (phrase) result.phrase = { lang: phrase.lang, text: phrase.text, gloss: phrase.gloss, beta: true }
  }
  return result
}


export function createTalkCore(dependencies: TalkCoreDependencies) {
  const ttlMs = Math.max(1, Math.floor(dependencies.ttlMs ?? 30_000))
  const maxEntries = Math.max(1, Math.floor(dependencies.maxEntries ?? 256))
  const receipts = new Map<string, Receipt>()
  const responses = new Map<string, ResponseEntry>()
  const banks = new Map<string, Timed<Promise<BankBundle>>>()
  const actorTokens = new Map<string, object>()
  let generation = 0

  const touch = <T>(map: Map<string, T>, key: string, value: T): void => { map.delete(key); map.set(key, value) }
  const tokenOf = (actorId: string): object => {
    const found = actorTokens.get(actorId)
    if (found) { touch(actorTokens, actorId, found); return found }
    const token = {}; touch(actorTokens, actorId, token)
    return token
  }
  const prune = (now: number): void => {
    for (const [key, entry] of receipts) if (entry.expiresAt <= now) receipts.delete(key)
    for (const [key, entry] of responses) if (entry.expiresAt <= now) responses.delete(key)
    for (const [key, entry] of banks) if (entry.expiresAt <= now) banks.delete(key)
    while (responses.size > maxEntries) responses.delete(responses.keys().next().value ?? '')
    while (banks.size > maxEntries) banks.delete(banks.keys().next().value ?? '')
    const pendingActors = new Set([...receipts].filter(([, entry]) => !entry.settled).map(([key]) => key.split('\u0000', 1)[0]))
    for (const actorId of actorTokens.keys()) if (!pendingActors.has(actorId)) actorTokens.delete(actorId)
  }
  const cancellation = (actorId: string, startedGeneration: number, startedToken: object, accounting: TalkAccounting): TalkResult | null => {
    if (generation !== startedGeneration) return { kind: 'cancelled', reason: 'generation-invalidated', accounting }
    if (actorTokens.get(actorId) !== startedToken) return { kind: 'cancelled', reason: 'actor-forgotten', accounting }
    return null
  }

  async function loadBank(context: TalkAuthority, now: number): Promise<BankBundle> {
    const key = JSON.stringify([context.city.id, context.venue.id, context.regular.id, context.bank.revision])
    const existing = banks.get(key)
    if (existing && existing.expiresAt > now) { touch(banks, key, existing); return existing.value }
    const promise = context.bank.load().then(raw => {
      const bank = validateTalkBank(raw.bank, raw.evidence)
      const evidence = parseTalkBankEvidence(raw.evidence)
      if (bank.city !== context.city.id || bank.npc !== context.regular.id) throw new Error('talk bank identity mismatch')
      if (evidence.city.id !== context.city.id || evidence.npc.id !== context.regular.id || evidence.venue.id !== context.venue.id) throw new Error('talk evidence identity mismatch')
      return { bank, evidence }
    })
    touch(banks, key, { value: promise, expiresAt: now + ttlMs })
    return promise
  }

  async function answer(context: TalkAuthority, request: TalkRequest, startedGeneration: number, startedToken: object): Promise<TalkResult> {
    if (asksIfAi(request.question)) return { kind: 'notice', source: 'game', notice: 'identity', text: aiAnswer([context.regular.name]), accounting: ZERO }
    if (crisisWords(request.question)) return { kind: 'notice', source: 'game', notice: 'crisis', text: helpText(context.city.country), accounting: ZERO }
    let bundle: BankBundle
    try { bundle = await loadBank(context, dependencies.now()) }
    catch { return cancellation(context.actorId, startedGeneration, startedToken, ZERO) ?? { kind: 'rejected', reason: 'bank-invalid', accounting: ZERO } }
    const cancelledBeforeReply = cancellation(context.actorId, startedGeneration, startedToken, ZERO)
    if (cancelledBeforeReply) return cancelledBeforeReply
    const deterministic = bankReply(context, request, bundle.bank)
    if (deterministic) return deterministic
    const key = requestKey(context, request)
    const found = responses.get(key)
    if (found && found.expiresAt > dependencies.now()) { touch(responses, key, found); return cached(found.value) }
    const fallback = fallbackLine(bundle.bank, key)
    const allowed = numberTokens([...bundle.evidence.facts.map(fact => fact.text), availabilityText(context)])
    let result: TalkResult
    let prompt = buildTalkPrompt(context, request, bundle)
    if (!prompt) {
      result = { kind: 'reply', source: 'fallback', name: context.regular.name, ai: true, text: fallback, accounting: ZERO }
    } else {
      const bankFallback = (): TalkResult => ({ kind: 'reply', source: 'fallback', name: context.regular.name, ai: true, text: fallback, accounting: ZERO })
      try {
        await dependencies.ready()
        const cancelledReady = cancellation(context.actorId, startedGeneration, startedToken, ZERO)
        if (cancelledReady) return cancelledReady
        if (!dependencies.canAsk(prompt)) {
          prompt = buildTalkPrompt(context, request, { ...bundle, evidence: { ...bundle.evidence, facts: [] } })
          if (!prompt || !dependencies.canAsk(prompt)) return bankFallback()
        }
        if (!await context.stillAuthorized()) return { kind: 'cancelled', reason: 'authority-changed', accounting: ZERO }
        const cancelledAuthorized = cancellation(context.actorId, startedGeneration, startedToken, ZERO)
        if (cancelledAuthorized) return cancelledAuthorized
        const admission = await context.admitAttempt(request)
        const cancelledAdmitted = cancellation(context.actorId, startedGeneration, startedToken, ZERO)
        if (cancelledAdmitted) return cancelledAdmitted
        if (admission === 'unauthorized') return { kind: 'cancelled', reason: 'authority-changed', accounting: ZERO }
        if (admission === 'duplicate') return { kind: 'rejected', reason: 'already-attempted', accounting: ZERO }
        // No await between this last local fence and entering the router. Admission is the authority linearization point.
        if (!dependencies.canAsk(prompt)) return bankFallback()
      } catch {
        return cancellation(context.actorId, startedGeneration, startedToken, ZERO) ?? bankFallback()
      }
      try {
        const asked = await dependencies.ask(prompt)
        const accounting = accountingOf(asked)
        if (!asked.ok) result = { kind: 'reply', source: 'fallback', name: context.regular.name, ai: true, text: fallback, accounting }
        else {
          const safe = safeOutput(asked.text, allowed)
          result = {
            kind: 'reply', source: safe ? 'live' : 'fallback', name: context.regular.name, ai: true,
            text: safe ?? fallback, accounting,
          }
        }
      } catch {
        result = { kind: 'reply', source: 'fallback', name: context.regular.name, ai: true, text: fallback, accounting: { kind: 'unknown', routerCalls: 1, cost: 'unknown' } }
      }
    }
    const cancelledAfterRouter = cancellation(context.actorId, startedGeneration, startedToken, result.accounting)
    if (cancelledAfterRouter) return cancelledAfterRouter
    touch(responses, key, { actorId: context.actorId, value: result, expiresAt: dependencies.now() + ttlMs })
    prune(dependencies.now())
    return result
  }

  async function talk(context: TalkAuthority, request: TalkRequest): Promise<TalkResult> {
    const now = dependencies.now(); prune(now)
    if (!request.clientId || dependencies.validateClientId?.(request.clientId) === false) return { kind: 'rejected', reason: 'invalid-client', accounting: ZERO }
    const receiptKey = `${context.actorId}\u0000${request.clientId}`
    const fingerprint = talkAttemptKey(context, request)
    const prior = receipts.get(receiptKey)
    if (prior && prior.expiresAt > now) {
      if (prior.fingerprint !== fingerprint) return { kind: 'rejected', reason: 'nonce-conflict', accounting: ZERO }
      touch(receipts, receiptKey, prior)
      return cached(await prior.promise)
    }
    if (receipts.size >= maxEntries) {
      const oldestSettled = [...receipts].find(([, entry]) => entry.settled)
      if (oldestSettled) receipts.delete(oldestSettled[0])
      else return { kind: 'rejected', reason: 'capacity', accounting: ZERO }
    }
    const startedGeneration = generation, startedToken = tokenOf(context.actorId)
    const promise = answer(context, request, startedGeneration, startedToken)
    const receipt: Receipt = { fingerprint, promise, expiresAt: Number.POSITIVE_INFINITY, settled: false }
    touch(receipts, receiptKey, receipt)
    const settle = (): void => {
      if (receipts.get(receiptKey) === receipt) { receipt.settled = true; receipt.expiresAt = dependencies.now() + ttlMs }
    }
    void promise.then(settle, settle)
    return promise
  }

  function forgetActors(ids: readonly string[]): void {
    const forgotten = new Set(ids)
    for (const id of forgotten) actorTokens.delete(id)
    for (const key of receipts.keys()) if (forgotten.has(key.split('\u0000', 1)[0] ?? '')) receipts.delete(key)
    for (const [key, entry] of responses) if (forgotten.has(entry.actorId)) responses.delete(key)
    prune(dependencies.now())
  }

  function invalidateGeneration(): void {
    generation++
    receipts.clear(); responses.clear(); banks.clear(); actorTokens.clear()
  }

  return { talk, forgetActors, invalidateGeneration }
}
