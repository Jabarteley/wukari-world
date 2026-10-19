import { createHash } from 'node:crypto'
import { link, lstat, mkdir, open, readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { once, requestBody, type ChatMessage, type Target } from '../../server/companion/gateway.ts'
import {
  DEFAULT_GATEWAY_URL, DEFAULT_LISTS, OPENROUTER_URL, PRICES,
  type Entry, type Price, type Provider,
} from '../../server/models/catalog.ts'
import { validateTalkBank, type HumanPhrasebookEntryV1, type TalkBankV1 } from './bank.ts'
import {
  TALK_DRAFT_MAX_TOKENS, parseTalkDraftBinding, prepareTalkDraft,
  type TalkDraftBindingV1,
} from './draft.ts'
import {
  FACTORY_ACCOUNTING_SOURCE, type FactoryJournal, type FactoryRunV1,
} from './journal.ts'

export const TALK_RUN_TIMEOUT_MS = 60_000

const SOURCE_FILES = [
  'scripts/talk-factory/bank.ts',
  'scripts/talk-factory/draft.ts',
  'scripts/talk-factory/journal.ts',
  'scripts/talk-factory/runner.ts',
  'server/companion/gateway.ts',
  'server/models/catalog.ts',
] as const

const BASE_URLS: Readonly<Record<Provider, string>> = Object.freeze({ gateway: DEFAULT_GATEWAY_URL, openrouter: OPENROUTER_URL })

export class TalkRunnerError extends Error { override readonly name = 'TalkRunnerError' }

export interface TalkRunSlotV1 { id: string; entryIndex: number; plain: boolean; maxMicro: number }
export interface TalkRunEntryV1 { provider: Provider; id: string; role: 'primary' | 'fallback'; price: Price; slots: readonly [TalkRunSlotV1, TalkRunSlotV1] }
export interface TalkRunPlanV1 {
  version: 1
  runId: string
  sourceDigest: string
  sourceHashes: Readonly<Record<string, string>>
  inputSha256: string
  configSha256: string
  binding: TalkDraftBindingV1
  request: { purpose: 'agent-talk'; messages: readonly ChatMessage[]; maxTokens: typeof TALK_DRAFT_MAX_TOKENS; carriesPlayerWords: false }
  timeoutMs: typeof TALK_RUN_TIMEOUT_MS
  entries: readonly TalkRunEntryV1[]
  targetPath: string
  candidatePath: string
  reservation: {
    runId: string
    inputSha256: string
    configSha256: string
    publicIds: string[]
    kind: 'draft'
    slots: Array<{ id: string; maxMicro: number }>
  }
}

export interface ProviderAccessV1 { key: string; baseUrl: string }
export interface WireResponseV1 { status: number; body: string; headers?: Readonly<Record<string, string>> }
export type TalkTransport = (url: string, init: { method: 'POST'; signal: AbortSignal; redirect: 'manual'; headers: Readonly<Record<string, string>>; body: string }) => Promise<WireResponseV1>

export interface TalkRunnerHooks {
  afterDispatchClaim?(value: { runId: string; slotId: string }): Promise<void> | void
  afterPrepare?(): Promise<void> | void
  afterLink?(): Promise<void> | void
  afterDirectorySync?(): Promise<void> | void
}

export interface TalkPublicationIo { syncDirectory(path: string): Promise<void> }

export interface TalkRunnerOptions {
  journal: FactoryJournal
  outputRoot: string
  repoRoot: string
  provider(provider: Provider): ProviderAccessV1 | null | Promise<ProviderAccessV1 | null>
  transport: TalkTransport
  now?: () => number
  hooks?: TalkRunnerHooks
  publicationIo?: TalkPublicationIo
}

export type TalkRunResultV1 =
  | { status: 'committed' | 'recovered'; runId: string; targetPath: string; sha256: string; bank: TalkBankV1 }
  | { status: 'invalid-reply' | 'request-failed' | 'cancelled' | 'finished-no-output' | 'reconciliation-needed'; runId: string }

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type TransportOutcome = { kind: 'value'; value: WireResponseV1 } | { kind: 'error'; error: unknown }
type StartedTransport = { outcome: Promise<TransportOutcome>; signal: AbortSignal; cleanup(): void }
type ActiveAttempt = { active: boolean; receipt: number | null; authorizations: Promise<StartedTransport | null>[] }

function fail(message: string): never { throw new TalkRunnerError(message) }
function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex') }
function utf8(value: string): number { return Buffer.byteLength(value, 'utf8') }

function canonical(value: unknown): string {
  const visit = (item: unknown): Json => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item
    if (typeof item === 'number' && Number.isFinite(item)) return item
    if (Array.isArray(item)) return item.map(visit)
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, visit(Reflect.get(item, key))]))
    fail('canonical data contains an unsupported value')
  }
  return JSON.stringify(visit(value))
}

function copy<T>(value: T): T { return structuredClone(value) }

function deeplyFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const item of Object.values(value as Record<string, unknown>)) deeplyFreeze(item)
  }
  return value
}

async function sourceHashes(repoRoot: string): Promise<Readonly<Record<string, string>>> {
  const root = resolve(repoRoot), rows: Array<[string, string]> = []
  for (const relative of SOURCE_FILES) rows.push([relative, sha256(await readFile(join(root, relative)))])
  return Object.freeze(Object.fromEntries(rows))
}

function configuredPrice(entry: Entry): Price {
  const price = PRICES[entry.id]
  if (!price) fail(`catalogue entry ${entry.provider} has no configured price`)
  if (![price.input, price.output].every(value => Number.isFinite(value) && value >= 0)) fail('catalogue price is invalid')
  return { input: price.input, output: price.output }
}

function reservedMicro(messages: readonly ChatMessage[], price: Price): number {
  const input = messages.reduce((sum, message) => sum + utf8(message.content), 0) + messages.length * 64 + 256
  const amount = Math.max(1, Math.ceil(input * price.input + TALK_DRAFT_MAX_TOKENS * price.output))
  if (!Number.isSafeInteger(amount)) fail('configured reservation is not a safe integer')
  return amount
}

function slotId(index: number, plain: boolean): string { return `entry-${index + 1}-${plain ? 'plain' : 'default'}` }

export async function planTalkRun(rawBinding: unknown, raw: { repoRoot: string; outputRoot: string }): Promise<TalkRunPlanV1> {
  if (!raw || typeof raw !== 'object' || typeof raw.repoRoot !== 'string' || typeof raw.outputRoot !== 'string') fail('plan paths are required')
  if (!isAbsolute(raw.outputRoot)) fail('output root must be absolute')
  const repoRoot = resolve(raw.repoRoot), outputRoot = resolve(raw.outputRoot)
  const binding = parseTalkDraftBinding(rawBinding), prepared = prepareTalkDraft(binding)
  const hashes = await sourceHashes(repoRoot), sourceDigest = sha256(canonical(hashes))
  const listed = DEFAULT_LISTS['agent-talk'].map(entry => ({ provider: entry.provider, id: entry.id }))
  if (!listed.length) fail('agent talk catalogue is empty')
  const entries: TalkRunEntryV1[] = listed.map((entry, index) => {
    const price = configuredPrice(entry), maxMicro = reservedMicro(prepared.request.messages, price)
    return {
      ...entry, role: index === 0 ? 'primary' : 'fallback', price,
      slots: [
        { id: slotId(index, false), entryIndex: index, plain: false, maxMicro },
        { id: slotId(index, true), entryIndex: index, plain: true, maxMicro },
      ],
    }
  })
  const identity = sha256(canonical({ city: binding.city.id, npc: binding.npc.id }))
  const runId = `talk-${identity.slice(0, 40)}`
  const targetPath = join(outputRoot, `${binding.city.id}--${binding.npc.id}.json`)
  const candidatePath = join(outputRoot, `.${runId}.candidate.json`)
  const request = copy(prepared.request) as TalkRunPlanV1['request']
  const inputSha256 = sha256(canonical(binding))
  const config = { version: 1, timeoutMs: TALK_RUN_TIMEOUT_MS, request, listed, prices: entries.map(entry => entry.price), bases: BASE_URLS, hashes, targetPath }
  const configSha256 = sha256(canonical(config))
  const reservation = {
    runId, inputSha256, configSha256,
    publicIds: [binding.city.id, binding.npc.id, binding.venue.id], kind: 'draft' as const,
    slots: entries.flatMap(entry => entry.slots.map(slot => ({ id: slot.id, maxMicro: slot.maxMicro }))),
  }
  return deeplyFreeze({ version: 1, runId, sourceDigest, sourceHashes: hashes, inputSha256, configSha256, binding: copy(binding), request, timeoutMs: TALK_RUN_TIMEOUT_MS, entries, targetPath, candidatePath, reservation })
}

function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b) }

function expectedPhrases(binding: TalkDraftBindingV1): HumanPhrasebookEntryV1[] {
  const supplied = new Map(binding.phrasebook.map(entry => [`${entry.lang}\u0000${entry.text}`, entry]))
  return binding.phrases.map(selection => supplied.get(`${selection.lang}\u0000${selection.text}`) ?? fail('selected phrase disappeared from its phrasebook'))
}

function checkedBank(value: unknown, binding: TalkDraftBindingV1): TalkBankV1 {
  const bank = validateTalkBank(value, {
    city: binding.city, npc: binding.npc, venue: binding.venue,
    facts: binding.facts, phrasebook: binding.phrasebook,
  })
  if (bank.voice !== binding.voice || bank.lang !== binding.lang || !same(bank.phrases, expectedPhrases(binding))) fail('bank does not match the bound voice, language and phrase selections')
  return bank
}

function observedCost(body: string, price: Price): number | null {
  let parsed: unknown
  try { parsed = JSON.parse(body) } catch { return null }
  if (!parsed || typeof parsed !== 'object') return null
  const usage = Reflect.get(parsed, 'usage')
  if (!usage || typeof usage !== 'object') return null
  const input = Reflect.get(usage, 'prompt_tokens'), output = Reflect.get(usage, 'completion_tokens')
  if (typeof input !== 'number' || typeof output !== 'number' || !Number.isSafeInteger(input) || !Number.isSafeInteger(output) || input < 0 || output < 0) return null
  const amount = Math.ceil(input * price.input + output * price.output)
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null
}

function isMissing(error: unknown): boolean { return !!error && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT' }

async function regularFile(path: string): Promise<boolean> {
  try { const found = await lstat(path); return found.isFile() && !found.isSymbolicLink() } catch (error) { if (isMissing(error)) return false; throw error }
}

async function assertAbsent(path: string, label: string): Promise<void> {
  try { await lstat(path); fail(`${label} already exists`) } catch (error) { if (!isMissing(error)) throw error }
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, 'r')
  try { await handle.sync() } finally { await handle.close() }
}

async function assertOutputRoot(path: string): Promise<void> {
  const found = await lstat(path)
  if (!found.isDirectory() || found.isSymbolicLink()) fail('output root must be a real directory')
}

function outputSync(options: TalkRunnerOptions): Promise<void> {
  return (options.publicationIo?.syncDirectory ?? syncDirectory)(options.outputRoot)
}

async function readVerifiedBank(path: string, sha: string, binding: TalkDraftBindingV1): Promise<{ bank: TalkBankV1; bytes: Buffer }> {
  if (!await regularFile(path)) fail('artifact is absent or is not a regular file')
  const bytes = await readFile(path)
  if (sha256(bytes) !== sha) fail('artifact digest does not match the journal')
  let parsed: unknown
  try { parsed = JSON.parse(bytes.toString('utf8')) } catch { fail('artifact is not valid JSON') }
  return { bank: checkedBank(parsed, binding), bytes }
}

function matchesReservation(run: FactoryRunV1, plan: TalkRunPlanV1): boolean {
  return run.inputSha256 === plan.inputSha256 && run.configSha256 === plan.configSha256 && same(run.publicIds, plan.reservation.publicIds)
    && same(run.slots.map(slot => ({ id: slot.id, maxMicro: slot.maxMicro })), plan.reservation.slots)
}

async function recover(plan: TalkRunPlanV1, options: TalkRunnerOptions, run: FactoryRunV1): Promise<TalkRunResultV1> {
  if (!matchesReservation(run, plan)) fail('existing run does not match this binding, configuration or target')
  if (!run.artifact) {
    if (run.finalReason === null || run.finalReason === 'success') return { status: 'reconciliation-needed', runId: plan.runId }
    return { status: 'finished-no-output', runId: plan.runId }
  }
  if (run.artifact.path !== plan.targetPath) fail('journal artifact target does not match this plan')
  await assertOutputRoot(options.outputRoot)
  if (await regularFile(plan.targetPath)) await readVerifiedBank(plan.targetPath, run.artifact.sha256, plan.binding)
  else {
    await readVerifiedBank(plan.candidatePath, run.artifact.sha256, plan.binding)
    await link(plan.candidatePath, plan.targetPath)
  }
  await outputSync(options)
  const bank = (await readVerifiedBank(plan.targetPath, run.artifact.sha256, plan.binding)).bank
  await options.journal.markCommitted(plan.runId, { sha256: run.artifact.sha256, path: plan.targetPath })
  return { status: 'recovered', runId: plan.runId, targetPath: plan.targetPath, sha256: run.artifact.sha256, bank }
}

function targetFor(entry: TalkRunEntryV1, access: ProviderAccessV1): Target {
  if (!access || typeof access.key !== 'string' || !access.key || /\s/.test(access.key)) fail('provider access is unavailable')
  if (access.baseUrl !== BASE_URLS[entry.provider]) fail('provider base does not match the fixed catalogue endpoint')
  return { key: access.key, baseUrl: access.baseUrl, maxOutputTokens: TALK_DRAFT_MAX_TOKENS, kind: entry.provider, feature: 'agent-talk' }
}

function exactWire(entry: TalkRunEntryV1, plan: TalkRunPlanV1, access: ProviderAccessV1, call: number, url: string, init: Record<string, unknown>): boolean {
  const plain = call === 1, target = targetFor(entry, access)
  const expectedUrl = entry.provider === 'openrouter' ? `${access.baseUrl}/chat/completions` : `${access.baseUrl}/v1/chat/completions`
  const expectedBody = JSON.stringify(requestBody(target, entry.id, entry.role, plan.request.messages, 'anonymous', plain))
  const headers = init.headers
  return url === expectedUrl && init.method === 'POST' && init.redirect === 'manual' && init.body === expectedBody
    && !!headers && typeof headers === 'object'
    && Reflect.get(headers, 'Authorization') === `Bearer ${access.key}`
    && Reflect.get(headers, 'Content-Type') === 'application/json'
    && Reflect.get(headers, 'Accept') === 'application/json'
}

async function assertPlanCurrent(plan: TalkRunPlanV1, options: Pick<TalkRunnerOptions, 'repoRoot' | 'outputRoot'>): Promise<void> {
  const fresh = await planTalkRun(plan.binding, { repoRoot: options.repoRoot, outputRoot: options.outputRoot })
  if (!same(fresh, plan)) fail('factory plan, sources or configuration changed')
}

async function withinDeadline<T>(promise: Promise<T>, cancelled: AbortSignal | undefined, deadline: number, now: () => number): Promise<{ ok: true; value: T } | { ok: false }> {
  if (cancelled?.aborted || now() >= deadline) return { ok: false }
  let timer: ReturnType<typeof setTimeout> | undefined
  let cancel!: () => void
  const ended = new Promise<{ ok: false }>(resolve => { cancel = () => resolve({ ok: false }) })
  cancelled?.addEventListener('abort', cancel, { once: true })
  timer = setTimeout(cancel, Math.max(1, deadline - now()))
  try { return await Promise.race([promise.then(value => ({ ok: true as const, value })), ended]) }
  finally { clearTimeout(timer); cancelled?.removeEventListener('abort', cancel) }
}

function transportSignal(gateway: AbortSignal, cancelled: AbortSignal | undefined, deadline: number, now: () => number): { signal: AbortSignal; cleanup(): void } {
  const control = new AbortController(), sources = [gateway, ...(cancelled ? [cancelled] : [])]
  const abort = () => control.abort()
  for (const source of sources) source.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, Math.max(1, deadline - now()))
  if (sources.some(source => source.aborted) || now() >= deadline) control.abort()
  return {
    signal: control.signal,
    cleanup() { clearTimeout(timer); for (const source of sources) source.removeEventListener('abort', abort) },
  }
}

async function transportResult(promise: Promise<TransportOutcome>, signal: AbortSignal): Promise<TransportOutcome | { kind: 'aborted' }> {
  if (signal.aborted) return { kind: 'aborted' }
  let abort!: () => void
  const stopped = new Promise<{ kind: 'aborted' }>(resolve => { abort = () => resolve({ kind: 'aborted' }) })
  signal.addEventListener('abort', abort, { once: true })
  try {
    return await Promise.race([promise, stopped])
  } finally { signal.removeEventListener('abort', abort) }
}

async function writeCandidate(path: string, bytes: Buffer): Promise<void> {
  try {
    const handle = await open(path, 'wx', 0o600)
    try { await handle.writeFile(bytes); await handle.sync() } finally { await handle.close() }
  } catch (error) {
    if (!error || typeof error !== 'object' || Reflect.get(error, 'code') !== 'EEXIST') throw error
    const existing = await readFile(path).catch(() => Buffer.alloc(0))
    if (!await regularFile(path) || !existing.equals(bytes)) fail('candidate already exists with different bytes')
  }
}

export function createTalkRunner(options: TalkRunnerOptions): { execute(plan: TalkRunPlanV1, signal?: AbortSignal): Promise<TalkRunResultV1> } {
  const now = options.now ?? Date.now
  let serial: Promise<void> = Promise.resolve()
  const queued = <T>(work: () => Promise<T>): Promise<T> => {
    const result = serial.then(work)
    serial = result.then(() => undefined, () => undefined)
    return result
  }

  const execute = async (plan: TalkRunPlanV1, signal?: AbortSignal): Promise<TalkRunResultV1> => {
    if (!plan || plan.version !== 1) fail('runner plan is invalid')
    await assertPlanCurrent(plan, options)
    const current = await options.journal.getRun(plan.runId)
    if (current) return recover(plan, options, current)
    await mkdir(options.outputRoot, { recursive: true })
    await assertOutputRoot(options.outputRoot)
    await assertAbsent(plan.targetPath, 'output target')
    const reserved = await options.journal.reserve(plan.reservation)
    if (reserved.status !== 'reserved') return recover(plan, options, reserved.run)

    if (signal?.aborted) { await options.journal.finalize(plan.runId, { reason: 'cancelled' }); return { status: 'cancelled', runId: plan.runId } }
    const deadline = now() + plan.timeoutMs
    const access = new Map<Provider, ProviderAccessV1 | null>()
    try {
      for (const provider of new Set(plan.entries.map(entry => entry.provider))) {
        const obtained = await withinDeadline(Promise.resolve().then(() => options.provider(provider)), signal, deadline, now)
        if (!obtained.ok) {
          await options.journal.finalize(plan.runId, { reason: 'cancelled' })
          return { status: 'cancelled', runId: plan.runId }
        }
        const found = await obtained.value
        if (!found) { access.set(provider, null); continue }
        const snapshot = Object.freeze({ key: found.key, baseUrl: found.baseUrl })
        targetFor(plan.entries.find(entry => entry.provider === provider)!, snapshot)
        access.set(provider, snapshot)
      }
    } catch {
      await options.journal.finalize(plan.runId, { reason: 'cancelled' })
      throw new TalkRunnerError('provider snapshot unavailable')
    }
    let transmitted = 0, reply: string | null = null, fatal: unknown = null, deadlineEnded = false

    for (const entry of plan.entries) {
      if (fatal || reply || signal?.aborted || now() >= deadline) { deadlineEnded ||= now() >= deadline; break }
      const found = access.get(entry.provider)
      if (!found) continue
      const target = targetFor(entry, found)
      const active: ActiveAttempt = { active: true, receipt: null, authorizations: [] }
      let calls = 0
      const fetcher = async (url: string, rawInit?: object): Promise<unknown> => {
        const call = calls++, slot = entry.slots[call]
        if (!slot || !rawInit || typeof rawInit !== 'object' || !exactWire(entry, plan, found, call, url, rawInit as Record<string, unknown>)) {
          fatal = new TalkRunnerError('gateway request did not match the fixed plan'); active.active = false; throw fatal
        }
        const init = rawInit as { method: 'POST'; signal: AbortSignal; redirect: 'manual'; headers: Readonly<Record<string, string>>; body: string }
        const allowed = (): boolean => !fatal && active.active && !signal?.aborted && !init.signal.aborted && now() < deadline
        const authorization = (async (): Promise<StartedTransport | null> => {
          try {
            const claim = await options.journal.claimDispatch(plan.runId, slot.id)
            if (claim.status !== 'claimed') throw new TalkRunnerError('dispatch slot was not freshly authorized')
            if (!allowed()) { deadlineEnded ||= signal?.aborted === true || init.signal.aborted || now() >= deadline; return null }
            await options.hooks?.afterDispatchClaim?.({ runId: plan.runId, slotId: slot.id })
            if (!allowed()) { deadlineEnded ||= signal?.aborted === true || init.signal.aborted || now() >= deadline; return null }
            await assertPlanCurrent(plan, options)
            if (!allowed()) { deadlineEnded ||= signal?.aborted === true || init.signal.aborted || now() >= deadline; return null }
            const linked = transportSignal(init.signal, signal, deadline, now)
            if (!allowed() || linked.signal.aborted) { linked.cleanup(); deadlineEnded = true; return null }
            transmitted += 1
            try {
              const sent = options.transport(url, { ...init, signal: linked.signal })
              const outcome = sent.then(value => ({ kind: 'value' as const, value }), error => ({ kind: 'error' as const, error }))
              return { outcome, signal: linked.signal, cleanup: linked.cleanup }
            } catch (error) {
              linked.cleanup(); throw error
            }
          } catch (error) {
            fatal ??= error
            throw error
          }
        })()
        active.authorizations.push(authorization)
        const started = await authorization
        if (!started) throw new TalkRunnerError('request authorization ended')
        const outcome = await transportResult(started.outcome, started.signal)
        started.cleanup()
        if (outcome.kind === 'aborted') {
          deadlineEnded = true; active.active = false; throw new TalkRunnerError('request deadline reached')
        }
        if (outcome.kind === 'error') {
          if (signal?.aborted || started.signal.aborted || now() >= deadline) deadlineEnded = true
          else fatal ??= outcome.error
          active.active = false; throw outcome.error
        }
        const response = outcome.value
        if (!active.active) throw new TalkRunnerError('request completed after its attempt closed')
        if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599 || typeof response.body !== 'string') {
          fatal = new TalkRunnerError('transport returned an invalid response'); active.active = false; throw fatal
        }
        const headers = Object.fromEntries(Object.entries(response.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]))
        return {
          status: response.status,
          headers: { get(name: string): string | null { return headers[name.toLowerCase()] ?? null } },
          async text(): Promise<string> {
            if (active.active && response.status >= 200 && response.status < 300) active.receipt = observedCost(response.body, entry.price)
            return response.body
          },
        }
      }
      const left = Math.max(1, deadline - now())
      const answer = await once(fetcher, target, entry.id, entry.role, plan.request.messages, 'anonymous', left)
      active.active = false
      const authorizationResults = await Promise.allSettled(active.authorizations)
      const rejected = authorizationResults.find(result => result.status === 'rejected')
      if (rejected && rejected.status === 'rejected') fatal ??= rejected.reason
      if (fatal) break
      for (let call = 0; call < calls; call += 1) {
        const slot = entry.slots[call]
        if (slot && call === calls - 1 && active.receipt !== null) {
          await options.journal.accountDispatch(plan.runId, slot.id, { observedMicro: active.receipt, source: FACTORY_ACCOUNTING_SOURCE })
        }
      }
      if (answer.ok) reply = answer.text
      else if (answer.why === 'timeout') deadlineEnded = true
    }

    if (fatal) throw new TalkRunnerError('dispatch authorization or transport failed')
    if (!reply) {
      const cancelled = transmitted === 0 || signal?.aborted || deadlineEnded
      await options.journal.finalize(plan.runId, { reason: cancelled ? 'cancelled' : 'request-failed' })
      return { status: cancelled ? 'cancelled' : 'request-failed', runId: plan.runId }
    }

    let bank: TalkBankV1
    try { bank = checkedBank(prepareTalkDraft(plan.binding).compile(reply), plan.binding) }
    catch { await options.journal.finalize(plan.runId, { reason: 'invalid-reply' }); return { status: 'invalid-reply', runId: plan.runId } }
    const bytes = Buffer.from(`${JSON.stringify(bank)}\n`), digest = sha256(bytes)
    await writeCandidate(plan.candidatePath, bytes)
    await options.journal.finalize(plan.runId, { reason: 'success' })
    await options.journal.prepareArtifact(plan.runId, { sha256: digest, path: plan.targetPath })
    await options.hooks?.afterPrepare?.()
    await link(plan.candidatePath, plan.targetPath)
    await options.hooks?.afterLink?.()
    await outputSync(options)
    await options.hooks?.afterDirectorySync?.()
    const verified = await readVerifiedBank(plan.targetPath, digest, plan.binding)
    await options.journal.markCommitted(plan.runId, { sha256: digest, path: plan.targetPath })
    return { status: 'committed', runId: plan.runId, targetPath: plan.targetPath, sha256: digest, bank: verified.bank }
  }

  return { execute: (plan, signal) => queued(() => execute(plan, signal)) }
}
