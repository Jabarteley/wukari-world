import { createHash, randomUUID } from 'node:crypto'
import type { Stats } from 'node:fs'
import { lstat, mkdir, open, readFile, realpath, rename, rm, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  parseTalkBankEvidence, validateTalkBank,
  type HumanPhrasebookEntryV1, type TalkBankEvidenceV1, type TalkBankV1,
} from './bank.ts'
import type { TalkDraftBindingV1 } from './draft.ts'
import { extractTalkDraftInputs, type TalkDraftInputsPlanV1 } from './inputs.ts'
import { compileLocalTalkBank } from './local.ts'

const DEFAULT_REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const REGION_REGISTRY = 'scripts/scene-factory/regions.json'
const PHRASEBOOK_DIRECTORY = 'scripts/talk-factory/phrasebooks'
const PHRASEBOOK_MANIFEST = `${PHRASEBOOK_DIRECTORY}/manifest.json`
const PUBLIC_INDEX = 'public/assets/talk-banks/index.json'
const WORLD_MANIFEST = 'scripts/talk-factory/generated/world-manifest.json'
const EXPECTED_CITY_COUNT = 284
const CITY_FILE_MAX_BYTES = 5_000_000
const SHA256 = /^[a-f0-9]{64}$/u
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const CITY_OUTPUT = /^public\/assets\/talk-banks\/[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{64}\.json$/u

const HUMAN_PHRASES = {
  accra: { lang: 'tw', file: 'tw.json', text: 'Meda wo ase (Medaase)' },
  kano: { lang: 'ha', file: 'ha.json', text: 'Sannu!' },
  tokyo: { lang: 'ja', file: 'ja.json', text: 'ありがとうございます' },
} as const

type Command = 'build' | 'check'

export interface TalkWorldPlanOptions { repoRoot?: string }
export interface TalkWorldPlannedFile { readonly path: string; readonly bytes: Buffer }
export interface TalkWorldSummary {
  readonly cities: number
  readonly banks: number
  readonly bytes: number
  readonly maxCityBytes: number
  readonly externalSpendUsd: 0
}
export interface PreparedTalkWorld {
  readonly files: readonly TalkWorldPlannedFile[]
  readonly summary: TalkWorldSummary
  readonly manifestSha256: string
}
export interface TalkWorldDependencies {
  readFile: typeof readFile
  extractInputs: (options: Parameters<typeof extractTalkDraftInputs>[0]) => Promise<TalkDraftInputsPlanV1>
  compileBank: (binding: unknown) => TalkBankV1
  validateBank: (bank: unknown, evidence: unknown) => TalkBankV1
  parseEvidence: (evidence: unknown) => TalkBankEvidenceV1
  expectedCityCount: number
  cityFileMaxBytes: number
}
export interface TalkWorldInstallerOptions { command: Command; repoRoot: string }
export interface TalkWorldInstallerDependencies {
  prepare: (options: TalkWorldPlanOptions) => Promise<PreparedTalkWorld>
  uniqueId: () => string
}
export interface TalkWorldInstallerSummary extends TalkWorldSummary {
  readonly command: Command
  readonly planned: number
  readonly written: number
  readonly deleted: number
  readonly unchanged: number
  readonly manifestSha256: string
}

interface SourcePin { path: string; sha256: string }
interface CityRegion { city: string; region: string }
interface ManifestOutput { path: string; sha256: string; bytes: number }
interface PlannedFile extends ManifestOutput { bytesValue: Buffer }
interface Snapshot extends ManifestOutput { bytesValue: Buffer; dev: number; ino: number; mtimeMs: number }
interface ValidatedPlan { files: Map<string, PlannedFile>; summary: TalkWorldSummary; manifestSha256: string }

const DEFAULT_DEPENDENCIES: TalkWorldDependencies = {
  readFile,
  extractInputs: options => extractTalkDraftInputs(options),
  compileBank: binding => compileLocalTalkBank(binding),
  validateBank: (bank, evidence) => validateTalkBank(bank, evidence),
  parseEvidence: evidence => parseTalkBankEvidence(evidence),
  expectedCityCount: EXPECTED_CITY_COUNT,
  cityFileMaxBytes: CITY_FILE_MAX_BYTES,
}
const DEFAULT_INSTALLER_DEPENDENCIES: TalkWorldInstallerDependencies = {
  prepare: options => prepareTalkWorld(options),
  uniqueId: randomUUID,
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    requireValue(Number.isFinite(value), 'canonical JSON cannot contain a non-finite number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  requireValue(value !== null && typeof value === 'object', 'canonical JSON accepts JSON data only')
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right, 'en'))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

function jsonBytes(value: unknown): Buffer { return Buffer.from(`${canonical(value)}\n`) }

function plainObject(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, `${label} must be a plain object`)
  return value as Record<string, unknown>
}

function parseJson(bytes: Buffer, label: string): unknown {
  try { return JSON.parse(bytes.toString('utf8')) as unknown } catch { throw new Error(`${label} must contain valid JSON`) }
}

function identifier(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && IDENTIFIER.test(value), `${label} must be a lower-case identifier`)
  return value
}

function sourcePath(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.length > 0 && value.trim() === value && !isAbsolute(value) && !value.includes('\\'), `${label} must be a relative POSIX path`)
  requireValue(value.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), `${label} escapes the repository`)
  return value
}

function ownedPath(value: unknown, label: string): string {
  const path = sourcePath(value, label)
  requireValue(path === PUBLIC_INDEX || path === WORLD_MANIFEST || CITY_OUTPUT.test(path), `${label} is outside the talk installer ownership boundary`)
  return path
}

function exactKeys(row: Record<string, unknown>, keys: readonly string[], label: string): void {
  const expected = [...keys].sort((a, b) => a.localeCompare(b, 'en'))
  const actual = Object.keys(row).sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label} has unknown or missing fields`)
}

function parseRegions(value: unknown, expectedCityCount: number): CityRegion[] {
  const root = plainObject(value, 'region registry')
  requireValue(root.schema === 'allworld-scene-region-registry' && root.version === 1, 'region registry schema/version is unsupported')
  requireValue(Array.isArray(root.regions), 'region registry.regions must be an array')
  const rows: CityRegion[] = []
  for (const [at, input] of root.regions.entries()) {
    const region = plainObject(input, `region registry.regions[${at}]`)
    const regionId = identifier(region.id, `region registry.regions[${at}].id`)
    requireValue(Array.isArray(region.cityIds), `region ${regionId}.cityIds must be an array`)
    for (const [cityAt, city] of region.cityIds.entries()) rows.push({ city: identifier(city, `region ${regionId}.cityIds[${cityAt}]`), region: regionId })
  }
  rows.sort((left, right) => left.city.localeCompare(right.city, 'en'))
  requireValue(rows.length === expectedCityCount, `region registry must contain ${expectedCityCount} playable cities`)
  requireValue(new Set(rows.map(row => row.city)).size === rows.length, 'region registry contains a duplicate playable city')
  return rows
}

function parsePhrasebookManifest(value: unknown): Map<string, { file: string; sha256: string }> {
  const root = plainObject(value, 'phrasebook manifest')
  requireValue(root.version === 1 && root.status === 'beta', 'phrasebook manifest must be version 1 beta input')
  requireValue(Array.isArray(root.entries), 'phrasebook manifest.entries must be an array')
  const result = new Map<string, { file: string; sha256: string }>()
  for (const [at, input] of root.entries.entries()) {
    const row = plainObject(input, `phrasebook manifest.entries[${at}]`)
    const lang = identifier(row.lang, `phrasebook manifest.entries[${at}].lang`)
    requireValue(typeof row.file === 'string' && /^[a-z0-9-]+\.json$/u.test(row.file), `phrasebook ${lang} file is invalid`)
    requireValue(typeof row.sha256 === 'string' && SHA256.test(row.sha256), `phrasebook ${lang} SHA-256 is invalid`)
    requireValue(!result.has(lang), `phrasebook manifest duplicates ${lang}`)
    result.set(lang, { file: row.file, sha256: row.sha256 })
  }
  return result
}

function emittedVenueName(bank: TalkBankV1, binding: TalkDraftBindingV1): string | null {
  if (bank.greet.length !== 1) return null
  const line = bank.greet[0]!, welcomePrefix = 'Welcome to ', welcomeSuffix = ` in ${binding.city.name}.`, compactPrefix = `${binding.city.name}: `
  if (line.startsWith(welcomePrefix) && line.endsWith(welcomeSuffix)) return line.slice(welcomePrefix.length, -welcomeSuffix.length)
  if (line.startsWith(compactPrefix)) return line.slice(compactPrefix.length)
  return null
}

function validatedEvidence(binding: TalkDraftBindingV1, bank: TalkBankV1, dependencies: TalkWorldDependencies): TalkBankEvidenceV1 {
  const canonicalEvidence = {
    city: binding.city, npc: binding.npc, venue: binding.venue,
    facts: binding.facts, phrasebook: binding.phrasebook,
  }
  let canonicalError: unknown
  try {
    const evidence = dependencies.parseEvidence(canonicalEvidence)
    const validated = dependencies.validateBank(bank, evidence)
    requireValue(canonical(validated) === canonical(bank), `validated bank differs from emitted bank for ${binding.npc.id}`)
    return evidence
  } catch (error) { canonicalError = error }

  const alias = emittedVenueName(bank, binding)
  if (alias === null || alias === binding.venue.name || !alias.startsWith('this ')) throw canonicalError
  const placeName = binding.facts.find(fact => fact.id.startsWith('city-place-name-') && fact.text === binding.venue.name)
  const placeSuffix = placeName?.id.slice('city-place-name-'.length)
  const placeKind = placeSuffix === undefined ? undefined : binding.facts.find(fact => fact.id === `city-place-kind-${placeSuffix}`)
  requireValue(placeKind !== undefined, `compiled display alias has no exact sourced venue-kind pair for ${binding.npc.id}`)
  const evidence = dependencies.parseEvidence({
    ...canonicalEvidence,
    venue: { ...binding.venue, name: alias, source: placeKind.source },
  })
  requireValue(evidence.city.id === binding.city.id && evidence.npc.id === binding.npc.id && evidence.venue.id === binding.venue.id, `compiled display alias changed canonical identity for ${binding.npc.id}`)
  requireValue(canonical(evidence.facts) === canonical(binding.facts) && canonical(evidence.phrasebook) === canonical(binding.phrasebook), `compiled display alias changed source evidence for ${binding.npc.id}`)
  const validated = dependencies.validateBank(bank, evidence)
  requireValue(canonical(validated) === canonical(bank), `validated aliased bank differs from emitted bank for ${binding.npc.id}`)
  return evidence
}

async function readPinned(root: string, path: string, dependencies: TalkWorldDependencies): Promise<{ path: string; bytes: Buffer; sha256: string }> {
  const relativePath = sourcePath(path, 'source path'), bytes = await dependencies.readFile(join(root, ...relativePath.split('/')))
  return { path: relativePath, bytes, sha256: sha256(bytes) }
}

function addSourcePin(pins: Map<string, string>, pin: SourcePin): void {
  const previous = pins.get(pin.path)
  requireValue(previous === undefined || previous === pin.sha256, `conflicting source pin for ${pin.path}`)
  pins.set(pin.path, pin.sha256)
}

export async function prepareTalkWorld(options: TalkWorldPlanOptions = {}, dependencies: TalkWorldDependencies = DEFAULT_DEPENDENCIES): Promise<PreparedTalkWorld> {
  const root = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT)
  requireValue(Number.isSafeInteger(dependencies.expectedCityCount) && dependencies.expectedCityCount > 0, 'expected city count is invalid')
  requireValue(Number.isSafeInteger(dependencies.cityFileMaxBytes) && dependencies.cityFileMaxBytes > 0 && dependencies.cityFileMaxBytes <= CITY_FILE_MAX_BYTES, 'city file byte cap is invalid')

  const regionFile = await readPinned(root, REGION_REGISTRY, dependencies)
  const phraseManifestFile = await readPinned(root, PHRASEBOOK_MANIFEST, dependencies)
  const cities = parseRegions(parseJson(regionFile.bytes, 'region registry'), dependencies.expectedCityCount)
  const phraseManifest = parsePhrasebookManifest(parseJson(phraseManifestFile.bytes, 'phrasebook manifest'))
  const phrasebooks = new Map<string, HumanPhrasebookEntryV1[]>()
  const sourcePins = new Map<string, string>()
  addSourcePin(sourcePins, regionFile); addSourcePin(sourcePins, phraseManifestFile)

  for (const selection of Object.values(HUMAN_PHRASES)) {
    const declared = phraseManifest.get(selection.lang)
    requireValue(declared !== undefined && declared.file === selection.file, `phrasebook manifest does not support ${selection.lang} from ${selection.file}`)
    const source = await readPinned(root, `${PHRASEBOOK_DIRECTORY}/${selection.file}`, dependencies)
    requireValue(source.sha256 === declared.sha256, `phrasebook ${selection.file} differs from its manifest SHA-256`)
    const value = parseJson(source.bytes, `phrasebook ${selection.file}`)
    requireValue(Array.isArray(value), `phrasebook ${selection.file} must be an array`)
    phrasebooks.set(selection.lang, value as HumanPhrasebookEntryV1[])
    addSourcePin(sourcePins, source)
  }

  for (const path of ['scripts/talk-factory/bank.ts', 'scripts/talk-factory/draft.ts', 'scripts/talk-factory/inputs.ts', 'scripts/talk-factory/local.ts', 'scripts/talk-factory/world.ts']) {
    addSourcePin(sourcePins, await readPinned(root, path, dependencies))
  }

  const cityFiles: PlannedFile[] = [], cityReferences: { city: string; path: string; sha256: string; bytes: number; banks: number }[] = []
  const cityInputs: unknown[] = []
  let totalBanks = 0, maxCityBytes = 0

  for (const row of cities) {
    const selection = HUMAN_PHRASES[row.city as keyof typeof HUMAN_PHRASES]
    const phrasebook = selection ? phrasebooks.get(selection.lang) : []
    requireValue(phrasebook !== undefined, `selected phrasebook is missing for ${row.city}`)
    const input = await dependencies.extractInputs({
      cityId: row.city, region: row.region, voice: 'plain', lang: 'en', repoRoot: root,
      phrasebook, phrases: selection ? [{ lang: selection.lang, text: selection.text }] : [],
    })
    requireValue(input.cityId === row.city && input.region === row.region, `talk input identity differs for ${row.city}`)
    for (const pin of input.sourceHashes) addSourcePin(sourcePins, pin)
    const sortedBindings = [...input.bindings].sort((left, right) => left.npc.id.localeCompare(right.npc.id, 'en'))
    requireValue(sortedBindings.length > 0 && new Set(sortedBindings.map(binding => binding.npc.id)).size === sortedBindings.length, `talk input NPC coverage is invalid for ${row.city}`)
    const banks = sortedBindings.map(binding => {
      requireValue(binding.city.id === row.city && binding.voice === 'plain' && binding.lang === 'en', `talk binding identity differs for ${binding.npc.id}`)
      const bank = dependencies.compileBank(binding)
      const evidence = validatedEvidence(binding, bank, dependencies)
      requireValue(bank.city === row.city && bank.npc === binding.npc.id, `compiled talk bank identity differs for ${binding.npc.id}`)
      return { npc: binding.npc.id, venue: binding.venue.id, bank, evidence }
    })
    const cityBytes = jsonBytes({ schema: 'allworld-city-talk', version: 1, city: row.city, banks })
    requireValue(cityBytes.length <= dependencies.cityFileMaxBytes, `city talk file for ${row.city} is ${cityBytes.length} bytes; maximum is ${dependencies.cityFileMaxBytes}`)
    const citySha256 = sha256(cityBytes), publicPath = `/assets/talk-banks/${row.city}-${citySha256}.json`
    const physicalPath = `public${publicPath}`
    cityFiles.push({ path: physicalPath, bytesValue: cityBytes, sha256: citySha256, bytes: cityBytes.length })
    cityReferences.push({ city: row.city, path: publicPath, sha256: citySha256, bytes: cityBytes.length, banks: banks.length })
    cityInputs.push({
      city: row.city, region: row.region, inputSha256: input.inputSha256, cityBrief: input.cityBrief,
      requestHashes: [...input.requestHashes].sort((left, right) => left.npcId.localeCompare(right.npcId, 'en')),
    })
    totalBanks += banks.length; maxCityBytes = Math.max(maxCityBytes, cityBytes.length)
  }

  const indexBytes = jsonBytes({ schema: 'allworld-talk-index', version: 1, cities: cityReferences })
  const indexFile: PlannedFile = { path: PUBLIC_INDEX, bytesValue: indexBytes, sha256: sha256(indexBytes), bytes: indexBytes.length }
  const outputs = [...cityFiles, indexFile].sort((left, right) => left.path.localeCompare(right.path, 'en'))
    .map(({ path, sha256: digest, bytes }) => ({ path, sha256: digest, bytes }))
  const summary: TalkWorldSummary = Object.freeze({
    cities: cityReferences.length, banks: totalBanks,
    bytes: cityFiles.reduce((sum, file) => sum + file.bytes, 0),
    maxCityBytes, externalSpendUsd: 0,
  })
  const manifestBytes = jsonBytes({
    schema: 'allworld-talk-world-manifest', version: 1,
    mode: { kind: 'deterministic-local', voice: 'plain', language: 'en', externalSpendUsd: 0 },
    phrasebooks: { status: 'beta', selectedCities: Object.keys(HUMAN_PHRASES).sort((a, b) => a.localeCompare(b, 'en')) },
    sources: [...sourcePins].map(([path, digest]) => ({ path, sha256: digest })).sort((left, right) => left.path.localeCompare(right.path, 'en')),
    cityInputs, cities: cityReferences, outputs, summary,
  })
  const manifestFile: PlannedFile = { path: WORLD_MANIFEST, bytesValue: manifestBytes, sha256: sha256(manifestBytes), bytes: manifestBytes.length }
  const files = [...cityFiles, indexFile, manifestFile].sort((left, right) => left.path.localeCompare(right.path, 'en'))
    .map(({ path, bytesValue }) => Object.freeze({ path, bytes: Buffer.from(bytesValue) }))
  return Object.freeze({ files: Object.freeze(files), summary, manifestSha256: manifestFile.sha256 })
}

function parseManifest(bytes: Buffer, label: string): Map<string, ManifestOutput> {
  const root = plainObject(parseJson(bytes, label), label)
  requireValue(root.schema === 'allworld-talk-world-manifest' && root.version === 1, `${label} schema/version is unsupported`)
  requireValue(Array.isArray(root.outputs), `${label}.outputs must be an array`)
  const result = new Map<string, ManifestOutput>()
  for (const [at, input] of root.outputs.entries()) {
    const row = plainObject(input, `${label}.outputs[${at}]`)
    exactKeys(row, ['path', 'sha256', 'bytes'], `${label}.outputs[${at}]`)
    const path = ownedPath(row.path, `${label}.outputs[${at}].path`)
    requireValue(path !== WORLD_MANIFEST, `${label} must not list itself`)
    requireValue(typeof row.sha256 === 'string' && SHA256.test(row.sha256), `${label}.outputs[${at}].sha256 is invalid`)
    requireValue(typeof row.bytes === 'number' && Number.isSafeInteger(row.bytes) && row.bytes > 0, `${label}.outputs[${at}].bytes is invalid`)
    requireValue(!result.has(path), `${label} duplicates ${path}`)
    result.set(path, { path, sha256: row.sha256, bytes: row.bytes })
  }
  return result
}

function validatePlan(input: PreparedTalkWorld): ValidatedPlan {
  requireValue(input !== null && typeof input === 'object' && Array.isArray(input.files), 'talk world plan is invalid')
  requireValue(typeof input.manifestSha256 === 'string' && SHA256.test(input.manifestSha256), 'talk world manifest digest is invalid')
  const files = new Map<string, PlannedFile>()
  for (const [at, file] of input.files.entries()) {
    requireValue(file !== null && typeof file === 'object', `talk world plan file ${at} is invalid`)
    const path = ownedPath(file.path, `talk world plan file ${at}.path`)
    requireValue(Buffer.isBuffer(file.bytes) && file.bytes.length > 0, `talk world plan file ${path} has invalid bytes`)
    requireValue(!files.has(path), `talk world plan duplicates ${path}`)
    const bytesValue = Buffer.from(file.bytes)
    files.set(path, { path, bytesValue, sha256: sha256(bytesValue), bytes: bytesValue.length })
  }
  const manifest = files.get(WORLD_MANIFEST)
  requireValue(manifest !== undefined && manifest.sha256 === input.manifestSha256, 'talk world manifest bytes differ from its digest')
  const declared = parseManifest(manifest.bytesValue, 'planned talk world manifest')
  const expected = [...files.keys()].filter(path => path !== WORLD_MANIFEST).sort((a, b) => a.localeCompare(b, 'en'))
  const recorded = [...declared.keys()].sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(expected.length === recorded.length && expected.every((path, index) => path === recorded[index]), 'talk world manifest output inventory differs from the plan')
  for (const path of expected) {
    const file = files.get(path)!, row = declared.get(path)!
    requireValue(file.sha256 === row.sha256 && file.bytes === row.bytes, `talk world manifest output identity differs for ${path}`)
  }
  return { files, summary: input.summary, manifestSha256: input.manifestSha256 }
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT'
}

async function optionalLstat(path: string): Promise<Stats | null> {
  try { return await lstat(path) } catch (error) { if (isMissing(error)) return null; throw error }
}

async function assertSafeAncestors(repoRoot: string, path: string): Promise<void> {
  const root = resolve(repoRoot), rootInfo = await lstat(root)
  requireValue(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), 'repo root must be a regular directory')
  const rootReal = await realpath(root), parts = ownedPath(path, 'talk output path').split('/'), current: string[] = []
  for (let index = 0; index < parts.length; index++) {
    current.push(parts[index]!)
    const absolute = join(root, ...current), info = await optionalLstat(absolute)
    if (info === null) break
    requireValue(!info.isSymbolicLink(), `talk installer path has a symlink ancestor: ${current.join('/')}`)
    const resolved = await realpath(absolute), fromRoot = relative(rootReal, resolved)
    requireValue(fromRoot === '' || !fromRoot.startsWith('../') && fromRoot !== '..' && !isAbsolute(fromRoot), `talk installer path escapes the repository: ${current.join('/')}`)
    if (index < parts.length - 1) requireValue(info.isDirectory(), `talk installer ancestor is not a directory: ${current.join('/')}`)
  }
}

async function snapshot(repoRoot: string, path: string): Promise<Snapshot | null> {
  await assertSafeAncestors(repoRoot, path)
  const absolute = join(resolve(repoRoot), ...path.split('/')), before = await optionalLstat(absolute)
  if (before === null) return null
  requireValue(before.isFile() && !before.isSymbolicLink(), `talk output must be a regular file: ${path}`)
  const bytesValue = await readFile(absolute), after = await lstat(absolute)
  requireValue(after.isFile() && !after.isSymbolicLink() && before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs, `talk output changed while it was read: ${path}`)
  return { path, bytesValue, sha256: sha256(bytesValue), bytes: bytesValue.length, dev: after.dev, ino: after.ino, mtimeMs: after.mtimeMs }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && Buffer.from(left).equals(Buffer.from(right))
}

async function priorManifest(repoRoot: string): Promise<{ snapshot: Snapshot | null; outputs: Map<string, ManifestOutput> }> {
  const current = await snapshot(repoRoot, WORLD_MANIFEST)
  return { snapshot: current, outputs: current === null ? new Map() : parseManifest(current.bytesValue, 'installed talk world manifest') }
}

async function assertSnapshot(repoRoot: string, path: string, expected: Snapshot | null): Promise<void> {
  const current = await snapshot(repoRoot, path)
  if (expected === null) { requireValue(current === null, `talk output appeared after preflight: ${path}`); return }
  requireValue(current !== null && current.dev === expected.dev && current.ino === expected.ino && current.bytes === expected.bytes && current.mtimeMs === expected.mtimeMs && sameBytes(current.bytesValue, expected.bytesValue), `talk output changed after preflight: ${path}`)
}

async function atomicWrite(repoRoot: string, file: PlannedFile, previous: Snapshot | null, uniqueId: () => string): Promise<void> {
  const root = resolve(repoRoot), target = join(root, ...file.path.split('/')), parent = dirname(target)
  await assertSafeAncestors(root, file.path); await mkdir(parent, { recursive: true }); await assertSafeAncestors(root, file.path)
  const id = uniqueId(); requireValue(typeof id === 'string' && /^[a-zA-Z0-9-]{8,128}$/u.test(id), 'talk installer unique ID is invalid')
  const temporary = join(parent, `.${file.path.split('/').at(-1)!}.talk-install-${id}`)
  let identity: { dev: number; ino: number } | null = null
  try {
    const handle = await open(temporary, 'wx', 0o644)
    try { const info = await handle.stat(); identity = { dev: info.dev, ino: info.ino }; await handle.writeFile(file.bytesValue); await handle.sync() } finally { await handle.close() }
    requireValue(sha256(await readFile(temporary)) === file.sha256, `temporary talk output differs for ${file.path}`)
    await assertSnapshot(root, file.path, previous); await assertSafeAncestors(root, file.path)
    await rename(temporary, target); identity = null
    const installed = await snapshot(root, file.path)
    requireValue(installed !== null && installed.sha256 === file.sha256 && installed.bytes === file.bytes, `installed talk output differs for ${file.path}`)
  } finally {
    if (identity !== null) {
      const info = await optionalLstat(temporary)
      if (info && info.isFile() && !info.isSymbolicLink() && info.dev === identity.dev && info.ino === identity.ino) await rm(temporary, { force: true })
    }
  }
}

async function verifiedDelete(repoRoot: string, previous: Snapshot): Promise<void> {
  await assertSnapshot(repoRoot, previous.path, previous)
  await unlink(join(resolve(repoRoot), ...previous.path.split('/')))
}

async function checkPlan(repoRoot: string, plan: ValidatedPlan): Promise<void> {
  const installedManifest = await snapshot(repoRoot, WORLD_MANIFEST), problems: string[] = []
  let priorOutputs = new Map<string, ManifestOutput>()
  if (installedManifest !== null) {
    try { priorOutputs = parseManifest(installedManifest.bytesValue, 'installed talk world manifest') }
    catch (error) {
      const planned = plan.files.get(WORLD_MANIFEST)!
      if (sameBytes(installedManifest.bytesValue, planned.bytesValue)) throw error
    }
  }
  for (const file of plan.files.values()) {
    const current = file.path === WORLD_MANIFEST ? installedManifest : await snapshot(repoRoot, file.path)
    if (current === null) problems.push(`missing:${file.path}`)
    else if (!sameBytes(current.bytesValue, file.bytesValue)) problems.push(`changed:${file.path}`)
  }
  for (const path of priorOutputs.keys()) if (!plan.files.has(path) && await snapshot(repoRoot, path) !== null) problems.push(`extra-owned:${path}`)
  if (problems.length) throw new Error(`talk world check failed: ${problems.sort((a, b) => a.localeCompare(b, 'en')).join(', ')}`)
}

export async function runTalkWorldInstaller(options: TalkWorldInstallerOptions, dependencies: TalkWorldInstallerDependencies = DEFAULT_INSTALLER_DEPENDENCIES): Promise<TalkWorldInstallerSummary> {
  const repoRoot = resolve(options.repoRoot), plan = validatePlan(await dependencies.prepare({ repoRoot }))
  if (options.command === 'check') {
    await checkPlan(repoRoot, plan)
    return { command: 'check', planned: plan.files.size, written: 0, deleted: 0, unchanged: plan.files.size, manifestSha256: plan.manifestSha256, ...plan.summary }
  }
  requireValue(options.command === 'build', 'talk installer command is invalid')
  const prior = await priorManifest(repoRoot), existing = new Map<string, Snapshot | null>(), writes: PlannedFile[] = [], obsolete: Snapshot[] = []
  let unchanged = 0
  for (const file of plan.files.values()) {
    const current = file.path === WORLD_MANIFEST ? prior.snapshot : await snapshot(repoRoot, file.path)
    existing.set(file.path, current)
    if (current !== null && sameBytes(current.bytesValue, file.bytesValue)) {
      if (file.path !== WORLD_MANIFEST) requireValue(prior.outputs.has(file.path), `refusing foreign talk output collision: ${file.path}`)
      unchanged++; continue
    }
    if (file.path !== WORLD_MANIFEST && current !== null) {
      const owned = prior.outputs.get(file.path)
      requireValue(owned !== undefined, `refusing foreign talk output collision: ${file.path}`)
      requireValue(owned.sha256 === current.sha256 && owned.bytes === current.bytes, `refusing tampered talk output: ${file.path}`)
    }
    writes.push(file)
  }
  for (const [path, owned] of prior.outputs) {
    if (plan.files.has(path)) continue
    const current = await snapshot(repoRoot, path)
    if (current === null) continue
    requireValue(current.sha256 === owned.sha256 && current.bytes === owned.bytes, `refusing tampered obsolete talk output: ${path}`)
    obsolete.push(current)
  }

  const manifest = plan.files.get(WORLD_MANIFEST)!, dataWrites = writes.filter(file => file.path !== WORLD_MANIFEST)
    .sort((left, right) => left.path === PUBLIC_INDEX ? 1 : right.path === PUBLIC_INDEX ? -1 : left.path.localeCompare(right.path, 'en'))
  const completedWrites: PlannedFile[] = [], completedDeletes: Snapshot[] = []
  try {
    for (const file of dataWrites) { await atomicWrite(repoRoot, file, existing.get(file.path) ?? null, dependencies.uniqueId); completedWrites.push(file) }
    for (const file of obsolete.sort((left, right) => left.path.localeCompare(right.path, 'en'))) { await verifiedDelete(repoRoot, file); completedDeletes.push(file) }
    if (writes.some(file => file.path === WORLD_MANIFEST)) { await atomicWrite(repoRoot, manifest, prior.snapshot, dependencies.uniqueId); completedWrites.push(manifest) }
    await checkPlan(repoRoot, plan)
  } catch (error) {
    const rollbackErrors: string[] = []
    for (const file of [...completedWrites].reverse()) {
      try {
        const before = existing.get(file.path) ?? null, current = await snapshot(repoRoot, file.path)
        requireValue(current !== null && current.sha256 === file.sha256, `rollback target changed: ${file.path}`)
        if (before === null) await verifiedDelete(repoRoot, current)
        else await atomicWrite(repoRoot, { path: before.path, bytesValue: before.bytesValue, sha256: before.sha256, bytes: before.bytes }, current, dependencies.uniqueId)
      } catch (rollbackError) { rollbackErrors.push(rollbackError instanceof Error ? rollbackError.message : String(rollbackError)) }
    }
    for (const file of [...completedDeletes].reverse()) {
      try { await atomicWrite(repoRoot, { path: file.path, bytesValue: file.bytesValue, sha256: file.sha256, bytes: file.bytes }, null, dependencies.uniqueId) }
      catch (rollbackError) { rollbackErrors.push(rollbackError instanceof Error ? rollbackError.message : String(rollbackError)) }
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(rollbackErrors.length ? `${message}; rollback failed: ${rollbackErrors.join('; ')}` : `${message}; prior owned bytes restored`)
  }
  return {
    command: 'build', planned: plan.files.size, written: writes.length, deleted: obsolete.length,
    unchanged, manifestSha256: plan.manifestSha256, ...plan.summary,
  }
}

export function parseTalkWorldCli(argv: readonly string[]): TalkWorldInstallerOptions {
  const command = argv[0]
  requireValue(command === 'build' || command === 'check', 'usage: world.ts <build|check> [--repo-root <path>]')
  requireValue(argv.length === 1 || argv.length === 3 && argv[1] === '--repo-root' && typeof argv[2] === 'string' && argv[2].length > 0, 'usage: world.ts <build|check> [--repo-root <path>]')
  return { command, repoRoot: argv.length === 3 ? resolve(argv[2]!) : DEFAULT_REPO_ROOT }
}

export async function runTalkWorldCli(argv: readonly string[] = process.argv.slice(2)): Promise<TalkWorldInstallerSummary> {
  const summary = await runTalkWorldInstaller(parseTalkWorldCli(argv))
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return summary
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runTalkWorldCli().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}
