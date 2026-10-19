import { randomUUID } from 'node:crypto'
import { open, readFile, rename, rm, lstat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const FACTORY_JOURNAL_SCHEMA = 'allworld-factory-journal' as const
export const FACTORY_JOURNAL_VERSION = 1 as const
export const FACTORY_CAP_MICRO = 200_000_000
export const FACTORY_ACCOUNTING_SOURCE = 'configured-table-usage' as const
export const FACTORY_REASON_CODES = ['success', 'invalid-reply', 'request-failed', 'cancelled', 'worker-failed'] as const

export type FactoryRunKind = 'draft' | 'gpu'
export type FactoryReasonCode = typeof FACTORY_REASON_CODES[number]
export type FactoryRunState = 'reserved' | 'dispatching' | 'accounted' | 'held' | 'output-prepared' | 'committed'
export type FactorySlotState = 'reserved' | 'dispatched' | 'accounted' | 'held' | 'released'

export interface FactorySlotV1 {
  id: string
  maxMicro: number
  state: FactorySlotState
  observedMicro: number | null
  accountingSource: typeof FACTORY_ACCOUNTING_SOURCE | null
}

export interface FactoryArtifactV1 {
  sha256: string
  path: string
  state: 'prepared' | 'committed'
}

export interface FactoryRunV1 {
  runId: string
  inputSha256: string
  configSha256: string
  publicIds: string[]
  kind: FactoryRunKind
  state: FactoryRunState
  finalReason: FactoryReasonCode | null
  slots: FactorySlotV1[]
  artifact: FactoryArtifactV1 | null
}

export interface FactoryLedgerFaultV1 {
  code: 'accounting-overrun'
  runId: string
  slotId: string
  maxMicro: number
  observedMicro: number
  source: typeof FACTORY_ACCOUNTING_SOURCE
}

export interface FactoryLedgerV1 {
  schema: typeof FACTORY_JOURNAL_SCHEMA
  version: typeof FACTORY_JOURNAL_VERSION
  sourceDigest: string
  capMicro: typeof FACTORY_CAP_MICRO
  priorExternalSpendMicro: number
  workerComputeCost: 'unknown'
  fault: FactoryLedgerFaultV1 | null
  runs: FactoryRunV1[]
}

export interface FactoryTotalsV1 {
  settledMicro: number
  heldMicro: number
  exposureMicro: number
  remainingMicro: number
  workerComputeCost: 'unknown'
}

export interface FactoryJournalIo {
  readText(path: string): Promise<string>
  writeExclusive(path: string, text: string): Promise<void>
  stat(path: string): Promise<{ dev: number; ino: number; isFile(): boolean }>
  replace(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
  syncDirectory(path: string): Promise<void>
}

export interface FactoryJournalOptions { io?: FactoryJournalIo }

export class FactoryJournalError extends Error {
  override readonly name = 'FactoryJournalError'
}

type JsonRecord = Record<string, unknown>
type FileIdentity = { dev: number; ino: number }
const SHA256 = /^[a-f0-9]{64}$/
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/
const MAX_PUBLIC_IDS = 256
const MAX_SLOTS = 256
const MAX_PATH = 1_000

function fail(message: string): never { throw new FactoryJournalError(message) }

function exactObject(value: unknown, label: string, keys: readonly string[]): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be a plain object`)
  const row = value as JsonRecord, allowed = new Set(keys)
  for (const key of Object.keys(row)) if (!allowed.has(key)) fail(`${label} has unknown field ${key}`)
  for (const key of keys) if (!Object.hasOwn(row, key)) fail(`${label} is missing ${key}`)
  return row
}

function stringValue(value: unknown, label: string, maximum: number): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label} must be bounded trimmed text`)
  return value
}

function identifier(value: unknown, label: string): string {
  const found = stringValue(value, label, 80)
  if (!SAFE_ID.test(found)) fail(`${label} must be a safe id`)
  return found
}

function digest(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SHA256.test(value)) fail(`${label} must be a lower-case SHA-256`)
  return value
}

function amount(value: unknown, label: string, maximum = FACTORY_CAP_MICRO): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum) fail(`${label} must be a safe integer from 0 to ${maximum}`)
  return value
}

function safeAmount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(`${label} must be a nonnegative safe integer`)
  return value
}

function positiveAmount(value: unknown, label: string): number {
  const found = amount(value, label)
  if (found === 0) fail(`${label} must be greater than zero`)
  return found
}

function oneOf<T extends string>(value: unknown, label: string, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) fail(`${label} is not supported`)
  return value as T
}

function uniqueIds(value: unknown, label: string, maximum: number, empty = false): string[] {
  if (!Array.isArray(value) || value.length > maximum || (!empty && value.length === 0)) fail(`${label} must contain ${empty ? `at most ${maximum}` : `1-${maximum}`} ids`)
  const out = value.map((item, at) => identifier(item, `${label}[${at}]`))
  if (new Set(out).size !== out.length) fail(`${label} contains a duplicate`)
  return out
}

function parseSlot(value: unknown, label: string): FactorySlotV1 {
  const row = exactObject(value, label, ['id', 'maxMicro', 'state', 'observedMicro', 'accountingSource'])
  const maxMicro = positiveAmount(row.maxMicro, `${label}.maxMicro`)
  const state = oneOf(row.state, `${label}.state`, ['reserved', 'dispatched', 'accounted', 'held', 'released'] as const)
  let observedMicro: number | null = null
  let accountingSource: typeof FACTORY_ACCOUNTING_SOURCE | null = null
  if (state === 'accounted') {
    observedMicro = amount(row.observedMicro, `${label}.observedMicro`, maxMicro)
    if (row.accountingSource !== FACTORY_ACCOUNTING_SOURCE) fail(`${label}.accountingSource is invalid`)
    accountingSource = FACTORY_ACCOUNTING_SOURCE
  } else if (row.observedMicro !== null || row.accountingSource !== null) fail(`${label} cannot carry accounting data in state ${state}`)
  return { id: identifier(row.id, `${label}.id`), maxMicro, state, observedMicro, accountingSource }
}

function parseArtifact(value: unknown, label: string): FactoryArtifactV1 | null {
  if (value === null) return null
  const row = exactObject(value, label, ['sha256', 'path', 'state'])
  return {
    sha256: digest(row.sha256, `${label}.sha256`),
    path: stringValue(row.path, `${label}.path`, MAX_PATH),
    state: oneOf(row.state, `${label}.state`, ['prepared', 'committed'] as const),
  }
}

function parseFault(value: unknown): FactoryLedgerFaultV1 | null {
  if (value === null) return null
  const row = exactObject(value, 'ledger.fault', ['code', 'runId', 'slotId', 'maxMicro', 'observedMicro', 'source'])
  if (row.code !== 'accounting-overrun') fail('ledger.fault.code is invalid')
  if (row.source !== FACTORY_ACCOUNTING_SOURCE) fail('ledger.fault.source is invalid')
  const maxMicro = positiveAmount(row.maxMicro, 'ledger.fault.maxMicro')
  const observedMicro = safeAmount(row.observedMicro, 'ledger.fault.observedMicro')
  if (observedMicro <= maxMicro) fail('ledger.fault must record an accounting overrun')
  return {
    code: 'accounting-overrun', runId: identifier(row.runId, 'ledger.fault.runId'), slotId: identifier(row.slotId, 'ledger.fault.slotId'),
    maxMicro, observedMicro, source: FACTORY_ACCOUNTING_SOURCE,
  }
}

function parseRun(value: unknown, label: string): FactoryRunV1 {
  const row = exactObject(value, label, ['runId', 'inputSha256', 'configSha256', 'publicIds', 'kind', 'state', 'finalReason', 'slots', 'artifact'])
  const runId = identifier(row.runId, `${label}.runId`)
  const state = oneOf(row.state, `${label}.state`, ['reserved', 'dispatching', 'accounted', 'held', 'output-prepared', 'committed'] as const)
  const finalReason = row.finalReason === null ? null : oneOf(row.finalReason, `${label}.finalReason`, FACTORY_REASON_CODES)
  if (!Array.isArray(row.slots) || row.slots.length === 0 || row.slots.length > MAX_SLOTS) fail(`${label}.slots must contain 1-${MAX_SLOTS} slots`)
  const slots = row.slots.map((slot, at) => parseSlot(slot, `${label}.slots[${at}]`))
  if (new Set(slots.map(slot => slot.id)).size !== slots.length) fail(`${label}.slots contains a duplicate id`)
  const artifact = parseArtifact(row.artifact, `${label}.artifact`)
  const states = new Set(slots.map(slot => slot.state))
  if (state === 'reserved' && (states.size !== 1 || !states.has('reserved') || finalReason !== null || artifact !== null)) fail(`${label} reserved state is inconsistent`)
  if (state === 'dispatching' && (!states.has('dispatched') && !states.has('accounted') || states.has('held') || states.has('released') || finalReason !== null || artifact !== null)) fail(`${label} dispatching state is inconsistent`)
  if ((state === 'accounted' || state === 'held') && (finalReason === null || artifact !== null || states.has('reserved') || states.has('dispatched'))) fail(`${label} finalized state is inconsistent`)
  if (state === 'accounted' && states.has('held')) fail(`${label} accounted state cannot retain a hold`)
  if (state === 'held' && !states.has('held')) fail(`${label} held state requires a held slot`)
  if ((state === 'output-prepared' || state === 'committed') && (finalReason !== 'success' || states.has('reserved') || states.has('dispatched') || artifact === null || artifact.state !== (state === 'committed' ? 'committed' : 'prepared'))) fail(`${label} artifact state is inconsistent`)
  return {
    runId,
    inputSha256: digest(row.inputSha256, `${label}.inputSha256`),
    configSha256: digest(row.configSha256, `${label}.configSha256`),
    publicIds: uniqueIds(row.publicIds, `${label}.publicIds`, MAX_PUBLIC_IDS),
    kind: oneOf(row.kind, `${label}.kind`, ['draft', 'gpu'] as const),
    state, finalReason, slots, artifact,
  }
}

function parseLedger(value: unknown): FactoryLedgerV1 {
  const row = exactObject(value, 'ledger', ['schema', 'version', 'sourceDigest', 'capMicro', 'priorExternalSpendMicro', 'workerComputeCost', 'fault', 'runs'])
  if (row.schema !== FACTORY_JOURNAL_SCHEMA || row.version !== FACTORY_JOURNAL_VERSION) fail('ledger schema or version is not supported')
  if (row.capMicro !== FACTORY_CAP_MICRO) fail('ledger cap does not match the programme cap')
  if (row.workerComputeCost !== 'unknown') fail('ledger worker compute cost must remain unknown')
  if (!Array.isArray(row.runs)) fail('ledger.runs must be an array')
  const runs = row.runs.map((run, at) => parseRun(run, `ledger.runs[${at}]`))
  if (new Set(runs.map(run => run.runId)).size !== runs.length) fail('ledger contains a duplicate run id')
  const fault = parseFault(row.fault)
  const ledger: FactoryLedgerV1 = {
    schema: FACTORY_JOURNAL_SCHEMA,
    version: FACTORY_JOURNAL_VERSION,
    sourceDigest: digest(row.sourceDigest, 'ledger.sourceDigest'),
    capMicro: FACTORY_CAP_MICRO,
    priorExternalSpendMicro: amount(row.priorExternalSpendMicro, 'ledger.priorExternalSpendMicro'),
    workerComputeCost: 'unknown',
    fault,
    runs,
  }
  if (fault) {
    const run = runs.find(item => item.runId === fault.runId), slot = run?.slots.find(item => item.id === fault.slotId)
    if (!slot || slot.maxMicro !== fault.maxMicro || (slot.state !== 'dispatched' && slot.state !== 'held')) fail('ledger.fault does not match a held dispatched slot')
  }
  if (totalsOf(ledger).exposureMicro > FACTORY_CAP_MICRO) fail('ledger exposure exceeds the programme cap')
  return ledger
}

function clone<T>(value: T): T { return structuredClone(value) }
function serialize(value: FactoryLedgerV1): string { return `${JSON.stringify(value, null, 2)}\n` }
function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right) }
function identity(value: { dev: number; ino: number }): FileIdentity { return { dev: value.dev, ino: value.ino } }
function sameIdentity(left: FileIdentity, right: FileIdentity): boolean { return left.dev === right.dev && left.ino === right.ino }

function totalsOf(ledger: FactoryLedgerV1): FactoryTotalsV1 {
  let settledMicro = ledger.priorExternalSpendMicro, heldMicro = 0
  for (const run of ledger.runs) for (const slot of run.slots) {
    if (slot.state === 'accounted') settledMicro += slot.observedMicro!
    else if (slot.state !== 'released') heldMicro += slot.maxMicro
  }
  const exposureMicro = settledMicro + heldMicro
  if (!Number.isSafeInteger(exposureMicro)) fail('ledger exposure is not a safe integer')
  return { settledMicro, heldMicro, exposureMicro, remainingMicro: FACTORY_CAP_MICRO - exposureMicro, workerComputeCost: 'unknown' }
}

const NODE_IO: FactoryJournalIo = {
  readText: path => readFile(path, 'utf8'),
  async writeExclusive(path, text) {
    const file = await open(path, 'wx', 0o600)
    try { await file.writeFile(text, 'utf8'); await file.sync() } finally { await file.close() }
  },
  stat: path => lstat(path),
  replace: (from, to) => rename(from, to),
  remove: path => rm(path),
  async syncDirectory(path) {
    const directory = await open(path, 'r')
    try { await directory.sync() } finally { await directory.close() }
  },
}

async function checkedFile(io: FactoryJournalIo, path: string): Promise<{ text: string; identity: FileIdentity }> {
  const before = await io.stat(path)
  if (!before.isFile()) fail(`${path} is not a regular file`)
  const text = await io.readText(path), after = await io.stat(path)
  const first = identity(before), second = identity(after)
  if (!sameIdentity(first, second)) fail(`${path} was replaced while being read`)
  return { text, identity: second }
}

interface LockOwnership { path: string; token: string; text: string; identity: FileIdentity }
interface ProgrammeIdentity { path: string; text: string; identity: FileIdentity }

async function acquireLock(path: string, io: FactoryJournalIo): Promise<LockOwnership> {
  const lockPath = `${path}.lock`, token = randomUUID()
  const text = `${JSON.stringify({ schema: FACTORY_JOURNAL_SCHEMA, version: FACTORY_JOURNAL_VERSION, owner: token })}\n`
  try { await io.writeExclusive(lockPath, text); await io.syncDirectory(dirname(lockPath)) } catch (error) {
    throw new FactoryJournalError(`factory journal lock is unavailable; ownership is uncertain: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
  const found = await checkedFile(io, lockPath)
  if (found.text !== text) fail('factory journal lock changed during acquisition')
  return { path: lockPath, token, text, identity: found.identity }
}

async function verifyLock(lock: LockOwnership, io: FactoryJournalIo): Promise<void> {
  const found = await checkedFile(io, lock.path)
  if (!sameIdentity(found.identity, lock.identity) || found.text !== lock.text) fail('factory journal lock ownership is uncertain')
}

async function releaseLock(lock: LockOwnership, io: FactoryJournalIo): Promise<void> {
  await verifyLock(lock, io)
  await io.remove(lock.path)
  await io.syncDirectory(dirname(lock.path))
}

function parseJson(text: string, label: string): unknown {
  try { return JSON.parse(text) } catch { fail(`${label} is not valid JSON`) }
}

function runOf(ledger: FactoryLedgerV1, runId: string): FactoryRunV1 {
  const found = ledger.runs.find(run => run.runId === runId)
  if (!found) fail(`unknown run ${runId}`)
  return found
}

export class FactoryJournal {
  readonly path: string
  readonly #io: FactoryJournalIo
  readonly #lock: LockOwnership
  readonly #programme: ProgrammeIdentity
  #ledger: FactoryLedgerV1
  #text: string
  #identity: FileIdentity
  #serial = 0
  #closed = false
  #latched: FactoryJournalError | null = null
  #operations: Promise<void> = Promise.resolve()
  #retainLock = false
  readonly #createdRunIds = new Set<string>()

  constructor(path: string, io: FactoryJournalIo, lock: LockOwnership, programme: ProgrammeIdentity, ledger: FactoryLedgerV1, text: string, fileIdentity: FileIdentity) {
    this.path = path; this.#io = io; this.#lock = lock; this.#programme = programme; this.#ledger = ledger; this.#text = text; this.#identity = fileIdentity
  }

  #enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.#operations.then(work)
    this.#operations = result.then(() => undefined, () => undefined)
    return result
  }

  snapshot(): Promise<FactoryLedgerV1> { return this.#enqueue(() => this.#snapshot()) }
  totals(): Promise<FactoryTotalsV1> { return this.#enqueue(() => this.#totals()) }
  getRun(runId: unknown): Promise<FactoryRunV1 | null> { return this.#enqueue(() => this.#getRun(runId)) }
  reserve(value: unknown): Promise<{ status: 'reserved' | 'existing'; run: FactoryRunV1 }> { return this.#enqueue(() => this.#reserve(value)) }
  claimDispatch(runId: unknown, slotId: unknown): Promise<{ status: 'claimed' | 'already-claimed'; slot: FactorySlotV1 }> { return this.#enqueue(() => this.#claimDispatch(runId, slotId)) }
  accountDispatch(runId: unknown, slotId: unknown, value: unknown): Promise<FactoryRunV1> { return this.#enqueue(() => this.#accountDispatch(runId, slotId, value)) }
  finalize(runId: unknown, value: unknown): Promise<FactoryRunV1> { return this.#enqueue(() => this.#finalize(runId, value)) }
  prepareArtifact(runId: unknown, value: unknown): Promise<FactoryRunV1> { return this.#enqueue(() => this.#prepareArtifact(runId, value)) }
  markCommitted(runId: unknown, value: unknown): Promise<FactoryRunV1> { return this.#enqueue(() => this.#markCommitted(runId, value)) }
  close(): Promise<void> { return this.#enqueue(() => this.#close()) }

  #assertMutable(): void {
    if (this.#ledger.fault) fail(`factory journal has terminal fault ${this.#ledger.fault.code}`)
  }

  async #verifyOwners(): Promise<void> {
    await verifyLock(this.#lock, this.#io)
    const programme = await checkedFile(this.#io, this.#programme.path)
    if (!sameIdentity(programme.identity, this.#programme.identity) || programme.text !== this.#programme.text) fail('factory journal programme identity was replaced or changed')
  }

  async #verifyLedger(expectedIdentity: FileIdentity, expectedText: string): Promise<void> {
    const found = await checkedFile(this.#io, this.path)
    if (!sameIdentity(found.identity, expectedIdentity) || found.text !== expectedText) fail('factory journal ledger was replaced or changed outside this session')
  }

  async #ready(): Promise<void> {
    if (this.#closed) fail('factory journal session is closed')
    if (this.#latched) throw this.#latched
    try {
      await this.#verifyOwners()
      await this.#verifyLedger(this.#identity, this.#text)
    } catch (error) {
      this.#latched = new FactoryJournalError(`factory journal is latched: ${error instanceof Error ? error.message : 'unreadable state'}`)
      throw this.#latched
    }
  }

  async #persist(candidate: FactoryLedgerV1): Promise<void> {
    parseLedger(candidate)
    const text = serialize(candidate), temporary = `${this.path}.tmp-${this.#lock.token}-${++this.#serial}`
    const expectedIdentity = this.#identity, expectedText = this.#text
    let replaced = false
    try {
      await this.#io.writeExclusive(temporary, text)
      const written = await checkedFile(this.#io, temporary)
      if (written.text !== text) fail('factory journal temporary write verification failed')
      await this.#verifyOwners()
      await this.#verifyLedger(expectedIdentity, expectedText)
      const authorized = await checkedFile(this.#io, temporary)
      if (!sameIdentity(authorized.identity, written.identity) || authorized.text !== text) fail('factory journal temporary file was replaced before commit')
      await this.#io.replace(temporary, this.path); replaced = true
      const installed = await checkedFile(this.#io, this.path)
      if (!sameIdentity(installed.identity, written.identity) || installed.text !== text) fail('factory journal destination is not the authorized temporary file')
      await this.#verifyOwners()
      await this.#io.syncDirectory(dirname(this.path))
      const found = await checkedFile(this.#io, this.path)
      if (!sameIdentity(found.identity, written.identity) || found.text !== text) fail('factory journal persistence verification failed')
      await this.#verifyOwners()
      this.#ledger = candidate; this.#text = text; this.#identity = found.identity
    } catch (error) {
      if (!replaced) await this.#io.remove(temporary).catch(() => {})
      this.#latched = new FactoryJournalError(`factory journal persistence failed and is latched: ${error instanceof Error ? error.message : 'unknown error'}`)
      throw this.#latched
    }
  }

  async #snapshot(): Promise<FactoryLedgerV1> { await this.#ready(); return clone(this.#ledger) }
  async #totals(): Promise<FactoryTotalsV1> { await this.#ready(); return totalsOf(this.#ledger) }

  async #getRun(rawRunId: unknown): Promise<FactoryRunV1 | null> {
    await this.#ready()
    const runId = identifier(rawRunId, 'runId'), found = this.#ledger.runs.find(run => run.runId === runId)
    return found ? clone(found) : null
  }

  async #reserve(raw: unknown): Promise<{ status: 'reserved' | 'existing'; run: FactoryRunV1 }> {
    await this.#ready()
    this.#assertMutable()
    const row = exactObject(raw, 'reservation', ['runId', 'inputSha256', 'configSha256', 'publicIds', 'kind', 'slots'])
    const slotsRaw = row.slots
    if (!Array.isArray(slotsRaw) || slotsRaw.length === 0 || slotsRaw.length > MAX_SLOTS) fail(`reservation.slots must contain 1-${MAX_SLOTS} slots`)
    const slots: FactorySlotV1[] = slotsRaw.map((slot, at) => {
      const item = exactObject(slot, `reservation.slots[${at}]`, ['id', 'maxMicro'])
      return { id: identifier(item.id, `reservation.slots[${at}].id`), maxMicro: positiveAmount(item.maxMicro, `reservation.slots[${at}].maxMicro`), state: 'reserved', observedMicro: null, accountingSource: null }
    })
    if (new Set(slots.map(slot => slot.id)).size !== slots.length) fail('reservation.slots contains a duplicate id')
    const proposed: FactoryRunV1 = {
      runId: identifier(row.runId, 'reservation.runId'),
      inputSha256: digest(row.inputSha256, 'reservation.inputSha256'),
      configSha256: digest(row.configSha256, 'reservation.configSha256'),
      publicIds: uniqueIds(row.publicIds, 'reservation.publicIds', MAX_PUBLIC_IDS),
      kind: oneOf(row.kind, 'reservation.kind', ['draft', 'gpu'] as const),
      state: 'reserved', finalReason: null, slots, artifact: null,
    }
    const existing = this.#ledger.runs.find(run => run.runId === proposed.runId)
    if (existing) {
      const original = { ...existing, state: 'reserved' as const, finalReason: null, artifact: null, slots: existing.slots.map(slot => ({ ...slot, state: 'reserved' as const, observedMicro: null, accountingSource: null })) }
      if (!same(original, proposed)) fail(`run ${proposed.runId} already exists with conflicting reservation data`)
      return { status: 'existing', run: clone(existing) }
    }
    const candidate = clone(this.#ledger); candidate.runs.push(proposed)
    if (totalsOf(candidate).exposureMicro > FACTORY_CAP_MICRO) fail('reservation would exceed the programme cap')
    await this.#persist(candidate)
    this.#createdRunIds.add(proposed.runId)
    return { status: 'reserved', run: clone(proposed) }
  }

  async #claimDispatch(rawRunId: unknown, rawSlotId: unknown): Promise<{ status: 'claimed' | 'already-claimed'; slot: FactorySlotV1 }> {
    await this.#ready()
    this.#assertMutable()
    const runId = identifier(rawRunId, 'runId'), slotId = identifier(rawSlotId, 'slotId')
    const current = runOf(this.#ledger, runId), slot = current.slots.find(item => item.id === slotId)
    if (!slot) fail(`unknown slot ${slotId} in run ${runId}`)
    if (slot.state !== 'reserved') {
      if (slot.state === 'released') fail(`slot ${slotId} was finalized without dispatch`)
      return { status: 'already-claimed', slot: clone(slot) }
    }
    if (!this.#createdRunIds.has(runId)) fail(`run ${runId} is recovery-only and cannot authorize a new dispatch`)
    if (current.state !== 'reserved' && current.state !== 'dispatching') fail(`run ${runId} cannot dispatch in state ${current.state}`)
    const candidate = clone(this.#ledger), run = runOf(candidate, runId), claimed = run.slots.find(item => item.id === slotId)!
    claimed.state = 'dispatched'; run.state = 'dispatching'
    await this.#persist(candidate)
    return { status: 'claimed', slot: clone(claimed) }
  }

  async #accountDispatch(rawRunId: unknown, rawSlotId: unknown, raw: unknown): Promise<FactoryRunV1> {
    await this.#ready()
    this.#assertMutable()
    const runId = identifier(rawRunId, 'runId'), slotId = identifier(rawSlotId, 'slotId')
    const row = exactObject(raw, 'accounting', ['observedMicro', 'source'])
    if (row.source !== FACTORY_ACCOUNTING_SOURCE) fail(`accounting.source must be ${FACTORY_ACCOUNTING_SOURCE}`)
    const current = runOf(this.#ledger, runId), slot = current.slots.find(item => item.id === slotId)
    if (!slot) fail(`unknown slot ${slotId} in run ${runId}`)
    const observedMicro = safeAmount(row.observedMicro, 'accounting.observedMicro')
    if (slot.state === 'accounted') {
      if (slot.observedMicro !== observedMicro || slot.accountingSource !== row.source) fail(`slot ${slotId} already has conflicting accounting`)
      return clone(current)
    }
    if (slot.state !== 'dispatched' && slot.state !== 'held') fail(`slot ${slotId} has not been dispatched`)
    if (observedMicro > slot.maxMicro) {
      const candidate = clone(this.#ledger)
      candidate.fault = { code: 'accounting-overrun', runId, slotId, maxMicro: slot.maxMicro, observedMicro, source: FACTORY_ACCOUNTING_SOURCE }
      this.#retainLock = true
      await this.#persist(candidate)
      this.#retainLock = false
      fail(`accounting overrun for ${runId}/${slotId} durably fenced the factory journal`)
    }
    const candidate = clone(this.#ledger), run = runOf(candidate, runId), accounted = run.slots.find(item => item.id === slotId)!
    accounted.state = 'accounted'; accounted.observedMicro = observedMicro; accounted.accountingSource = FACTORY_ACCOUNTING_SOURCE
    if (run.state === 'held' && !run.slots.some(item => item.state === 'held')) run.state = 'accounted'
    await this.#persist(candidate)
    return clone(run)
  }

  async #finalize(rawRunId: unknown, raw: unknown): Promise<FactoryRunV1> {
    await this.#ready()
    this.#assertMutable()
    const runId = identifier(rawRunId, 'runId'), row = exactObject(raw, 'finalization', ['reason'])
    const reason = oneOf(row.reason, 'finalization.reason', FACTORY_REASON_CODES), current = runOf(this.#ledger, runId)
    if (current.finalReason !== null) {
      if (current.finalReason !== reason) fail(`run ${runId} already has a conflicting final reason`)
      return clone(current)
    }
    if (current.state !== 'reserved' && current.state !== 'dispatching') fail(`run ${runId} cannot be finalized in state ${current.state}`)
    const candidate = clone(this.#ledger), run = runOf(candidate, runId)
    for (const slot of run.slots) {
      if (slot.state === 'reserved') slot.state = 'released'
      else if (slot.state === 'dispatched') slot.state = 'held'
    }
    run.finalReason = reason; run.state = run.slots.some(slot => slot.state === 'held') ? 'held' : 'accounted'
    await this.#persist(candidate)
    return clone(run)
  }

  async #prepareArtifact(rawRunId: unknown, raw: unknown): Promise<FactoryRunV1> {
    await this.#ready()
    this.#assertMutable()
    const runId = identifier(rawRunId, 'runId'), row = exactObject(raw, 'artifact', ['sha256', 'path'])
    const artifact: FactoryArtifactV1 = { sha256: digest(row.sha256, 'artifact.sha256'), path: stringValue(row.path, 'artifact.path', MAX_PATH), state: 'prepared' }
    const current = runOf(this.#ledger, runId)
    if (current.artifact) {
      const prepared = { ...current.artifact, state: 'prepared' as const }
      if (!same(prepared, artifact)) fail(`run ${runId} already has conflicting artifact data`)
      return clone(current)
    }
    if ((current.state !== 'accounted' && current.state !== 'held') || current.finalReason !== 'success') fail(`run ${runId} is not ready to prepare output`)
    const candidate = clone(this.#ledger), run = runOf(candidate, runId)
    run.artifact = artifact; run.state = 'output-prepared'
    await this.#persist(candidate)
    return clone(run)
  }

  async #markCommitted(rawRunId: unknown, raw: unknown): Promise<FactoryRunV1> {
    await this.#ready()
    this.#assertMutable()
    const runId = identifier(rawRunId, 'runId'), row = exactObject(raw, 'commit', ['sha256', 'path'])
    const expected = { sha256: digest(row.sha256, 'commit.sha256'), path: stringValue(row.path, 'commit.path', MAX_PATH) }
    const current = runOf(this.#ledger, runId)
    if (!current.artifact || current.artifact.sha256 !== expected.sha256 || current.artifact.path !== expected.path) fail(`run ${runId} commit does not match its prepared artifact`)
    if (current.state === 'committed') return clone(current)
    if (current.state !== 'output-prepared' || current.artifact.state !== 'prepared') fail(`run ${runId} has no prepared artifact to commit`)
    const candidate = clone(this.#ledger), run = runOf(candidate, runId)
    run.artifact!.state = 'committed'; run.state = 'committed'
    await this.#persist(candidate)
    return clone(run)
  }

  async #close(): Promise<void> {
    if (this.#closed) return
    if (this.#retainLock) fail('factory journal close refused while terminal fault persistence is uncertain')
    try { await releaseLock(this.#lock, this.#io); this.#closed = true } catch (error) {
      this.#latched = new FactoryJournalError(`factory journal close refused: ${error instanceof Error ? error.message : 'uncertain lock ownership'}`)
      throw this.#latched
    }
  }
}

function journalPath(rawPath: unknown): string {
  if (typeof rawPath !== 'string' || !rawPath || rawPath.trim() !== rawPath || rawPath.length > MAX_PATH || /[\u0000-\u001f\u007f]/.test(rawPath)) fail('journal path must be bounded trimmed text')
  return resolve(rawPath)
}

async function programmeIdentity(path: string, expectedDigest: string, io: FactoryJournalIo): Promise<ProgrammeIdentity> {
  const markerPath = `${path}.initialized`, found = await checkedFile(io, markerPath)
  const row = exactObject(parseJson(found.text, 'factory journal programme identity'), 'programme identity', ['schema', 'version', 'sourceDigest'])
  if (row.schema !== FACTORY_JOURNAL_SCHEMA || row.version !== FACTORY_JOURNAL_VERSION || digest(row.sourceDigest, 'programme identity.sourceDigest') !== expectedDigest) fail('factory journal programme identity does not match')
  return { path: markerPath, text: found.text, identity: found.identity }
}

async function openLocked(path: string, expectedDigest: string, io: FactoryJournalIo, lock: LockOwnership): Promise<FactoryJournal> {
  const programme = await programmeIdentity(path, expectedDigest, io)
  const found = await checkedFile(io, path), ledger = parseLedger(parseJson(found.text, 'factory journal ledger'))
  if (ledger.sourceDigest !== expectedDigest) fail('factory journal source digest does not match')
  return new FactoryJournal(path, io, lock, programme, ledger, found.text, found.identity)
}

export async function initializeFactoryJournal(rawPath: unknown, raw: unknown, options: FactoryJournalOptions = {}): Promise<FactoryJournal> {
  const path = journalPath(rawPath), row = exactObject(raw, 'initialization', ['sourceDigest', 'priorExternalSpendMicro'])
  const sourceDigest = digest(row.sourceDigest, 'initialization.sourceDigest')
  const ledger: FactoryLedgerV1 = {
    schema: FACTORY_JOURNAL_SCHEMA, version: FACTORY_JOURNAL_VERSION, sourceDigest, capMicro: FACTORY_CAP_MICRO,
    priorExternalSpendMicro: amount(row.priorExternalSpendMicro, 'initialization.priorExternalSpendMicro'), workerComputeCost: 'unknown', fault: null, runs: [],
  }
  const io = options.io ?? NODE_IO, lock = await acquireLock(path, io)
  try {
    try { await io.stat(path); fail('factory journal is already initialized') } catch (error) {
      if (error instanceof FactoryJournalError) throw error
      if (!error || typeof error !== 'object' || (error as { code?: unknown }).code !== 'ENOENT') throw error
    }
    const markerPath = `${path}.initialized`
    const markerText = `${JSON.stringify({ schema: FACTORY_JOURNAL_SCHEMA, version: FACTORY_JOURNAL_VERSION, sourceDigest })}\n`
    await io.writeExclusive(markerPath, markerText)
    await io.syncDirectory(dirname(path))
    const temporary = `${path}.tmp-${lock.token}-initialize`, text = serialize(ledger)
    let replaced = false
    try {
      await io.writeExclusive(temporary, text)
      await io.replace(temporary, path); replaced = true
      await io.syncDirectory(dirname(path))
    } catch (error) {
      if (!replaced) await io.remove(temporary).catch(() => {})
      throw error
    }
    return await openLocked(path, sourceDigest, io, lock)
  } catch (error) {
    await releaseLock(lock, io).catch(() => {})
    throw error
  }
}

export async function openFactoryJournal(rawPath: unknown, raw: unknown, options: FactoryJournalOptions = {}): Promise<FactoryJournal> {
  const path = journalPath(rawPath), row = exactObject(raw, 'open', ['sourceDigest']), sourceDigest = digest(row.sourceDigest, 'open.sourceDigest')
  const io = options.io ?? NODE_IO, lock = await acquireLock(path, io)
  try { return await openLocked(path, sourceDigest, io, lock) }
  catch (error) { await releaseLock(lock, io).catch(() => {}); throw error }
}

export function nodeFactoryJournalIo(): FactoryJournalIo { return { ...NODE_IO } }
