/** Lane-local, offline contract. No runtime integration or legal approval.
 * The trusted Git commit pins pins.json; hashes detect changes, not authenticity.
 * Only the JSON Schema subset used by schema.v1.json is implemented here.
 */
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = dirname(fileURLToPath(import.meta.url))
export const LIMITS = Object.freeze({ fileBytes: 1_048_576, packetBytes: 262_144, totalBytes: 4_194_304, depth: 32, nodes: 20_000 })
type Obj = Record<string, unknown>
export interface Receipt { path: string; bytes: number; sha256: string }
interface Attribution { id: string; text: string; url: string }
type Use = 'derive_geometry' | 'redistribute_raw' | 'redistribute_derived' | 'runtime_display'
interface Source {
  id: string; release: string | null; sourceUrl: string
  acquisition: { file: Receipt; capturedAt: string; acquiredAt: string } | null
  status: string; coverage: { status: string }
  license: { id: string; retainedText: Receipt | null }
  rights: Record<Use, 'allowed' | 'conditional' | 'forbidden' | 'unresolved'>
  admission: 'fixture-only' | 'quarantined' | 'runtime-only'
  attribution: Attribution[]; unresolvedRights: string[]
  evidence: { checkedAt: string; result: string }[]
}
export interface Registry { schemaVersion: number; baselineCommit: string; reviewedAt: string; sources: Source[] }
interface Input {
  id: string; sourceId: string; sourceUrl: string; release: string; capturedAt: string; acquiredAt: string
  file: Receipt; licenseId: string; licenseText: Receipt; uses: Use[]; attributionIds: string[]
}
interface Observation {
  id: string; featureId: string; property: string; basis: string; context: string; inputIds: string[]
  unit: string; observedAt: string | null; beta: boolean; evidence: Receipt; confidence: string
  uncertainty: { status: string; plusMinus: number | null; unit: string }
}
export interface Packet {
  schemaSha256: string; registrySha256: string
  owner: { lane: string; branch: string; baseCommit: string }
  pilot: { scope: string; blockId: string | null; sourceCrs: string; axisOrder: string; units: string; verticalDatum: string; realWorldTransform: string | null }
  inputs: Input[]; observations: Observation[]
  derivations: { id: string; inputIds: string[]; output: Receipt }[]
  attribution: Attribution[]; unresolvedRights: string[]
}
export interface Bundle { schema: Obj; registry: Registry; schemaSha256: string; registrySha256: string }
export interface Result { ok: boolean; eligibleForProduction: false; errors: string[]; checkedFiles: number; checkedBytes: number }
const fail = (message: string): never => { throw new Error(message) }
export const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v)
const equal = (a: unknown, b: unknown): boolean => {
  if (object(a) && object(b)) return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => Object.hasOwn(b, k) && equal(a[k], b[k]))
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i]))
  return a === b
}
const isDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v.replace('Z', '.000Z')
const isHttps = (v: string): boolean => {
  try { const u = new URL(v); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password } catch { return false }
}

/** Reject non-JSON data and excessive work even when called directly, before schema recursion. */
function boundedJson(value: unknown): void {
  let count = 0
  const seen = new Set<object>()
  function visit(v: unknown, depth: number): void {
    if (++count > LIMITS.nodes || depth > LIMITS.depth) fail('JSON complexity limit exceeded')
    if (v === null || typeof v === 'boolean') return
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail('Non-finite number'); return }
    if (typeof v === 'string') { if (v.length > LIMITS.packetBytes) fail('String limit exceeded'); return }
    if (typeof v !== 'object') fail('Non-JSON value')
    const item = v as object
    if (seen.has(item)) fail('Cyclic or aliased object')
    seen.add(item)
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) fail('Non-JSON object')
    for (const entry of Object.values(item)) visit(entry, depth + 1)
    seen.delete(item)
  }
  visit(value, 0)
}

const KEYWORDS = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'anyOf', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern', 'format', 'minimum', 'maximum'])
/** A new schema keyword must be implemented, never silently ignored. */
export function assertSupportedSchema(schema: Obj): void {
  boundedJson(schema)
  function visit(s: unknown): void {
    if (!object(s)) fail('Schema node must be an object')
    const rule = s as Obj
    for (const k of Object.keys(rule)) if (!KEYWORDS.has(k)) fail(`Unsupported schema keyword: ${k}`)
    if (rule.format !== undefined && !['date-time', 'https-url'].includes(String(rule.format))) fail('Unsupported schema format')
    if (rule.type !== undefined && !['object', 'array', 'string', 'number', 'integer', 'null', 'boolean'].includes(String(rule.type))) fail('Unsupported schema type')
    if (rule.additionalProperties !== undefined && rule.additionalProperties !== false) fail('Only closed object schemas supported')
    for (const key of ['$defs', 'properties']) if (object(rule[key])) for (const child of Object.values(rule[key])) visit(child)
    if (rule.items !== undefined) visit(rule.items)
    if (Array.isArray(rule.anyOf)) rule.anyOf.forEach(visit)
    if (rule.$ref !== undefined) {
      const match = /^#\/\$defs\/([A-Za-z][A-Za-z0-9]*)$/.exec(String(rule.$ref))
      if (!match || !object(schema.$defs) || !Object.hasOwn(schema.$defs, match[1]!)) fail('Only existing local $defs references supported')
    }
  }
  visit(schema)
}

export function schemaErrors(value: unknown, schema: Obj, definition: string): string[] {
  const errors: string[] = []
  try { boundedJson(value); assertSupportedSchema(schema) } catch (e) { return [String(e)] }
  function check(v: unknown, s: Obj, path: string, depth = 0): string[] {
    if (depth > LIMITS.depth) return [`${path}: schema recursion limit`]
    const out: string[] = []
    const err = (why: string): void => { out.push(`${path}: ${why}`) }
    if (typeof s.$ref === 'string') {
      const target = (schema.$defs as Obj)[s.$ref.slice('#/$defs/'.length)] as Obj
      out.push(...check(v, target, path, depth + 1))
    }
    if (Array.isArray(s.anyOf) && !s.anyOf.some(part => check(v, part as Obj, path, depth + 1).length === 0)) err('does not match any allowed shape')
    if (Object.hasOwn(s, 'const') && !equal(v, s.const)) err('wrong constant/version')
    if (Array.isArray(s.enum) && !s.enum.some(x => equal(x, v))) err('not an allowed value')
    if (s.type !== undefined) {
      const matches = s.type === 'null' ? v === null : s.type === 'object' ? object(v) : s.type === 'array' ? Array.isArray(v) : s.type === 'integer' ? Number.isSafeInteger(v) : typeof v === s.type
      if (!matches) { err(`expected ${String(s.type)}`); return out }
    }
    if (typeof v === 'string') {
      if (typeof s.minLength === 'number' && v.trim().length < s.minLength) err('blank/short string')
      if (typeof s.maxLength === 'number' && v.length > s.maxLength) err('string too long')
      if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(v)) err('pattern mismatch')
      if (s.format === 'date-time' && !isDate(v)) err('invalid UTC timestamp')
      if (s.format === 'https-url' && !isHttps(v)) err('invalid HTTPS URL')
    }
    if (typeof v === 'number') {
      if (typeof s.minimum === 'number' && v < s.minimum) err('below minimum')
      if (typeof s.maximum === 'number' && v > s.maximum) err('above maximum')
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) err('too few items')
      if (typeof s.maxItems === 'number' && v.length > s.maxItems) { err('too many items'); return out }
      if (s.uniqueItems === true && v.some((x, i) => v.slice(0, i).some(y => equal(x, y)))) err('duplicate items')
      if (object(s.items)) v.forEach((x, i) => out.push(...check(x, s.items as Obj, `${path}[${i}]`, depth + 1)))
    }
    if (object(v) && object(s.properties)) {
      for (const key of (s.required as string[] ?? [])) if (!Object.hasOwn(v, key)) err(`missing ${key}`)
      for (const [key, val] of Object.entries(v)) {
        if (!Object.hasOwn(s.properties, key)) { if (s.additionalProperties === false) err(`unknown key ${key}`) }
        else out.push(...check(val, s.properties[key] as Obj, `${path}.${key}`, depth + 1))
      }
    }
    return out
  }
  if (!object(schema.$defs) || !Object.hasOwn(schema.$defs, definition)) return ['Unknown schema definition']
  errors.push(...check(value, schema.$defs[definition] as Obj, '$'))
  return errors
}

/** All reads stay below a caller-owned root, including symlink checks. Never follows URLs. */
export function readBounded(root: string, path: string, limit = LIMITS.fileBytes): Buffer {
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*(?:\/[a-zA-Z0-9_.-]+)*$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) fail(`Unsafe relative path: ${path}`)
  const base = realpathSync(root)
  let current = base
  for (const part of path.split('/')) {
    current = resolve(current, part)
    if (lstatSync(current).isSymbolicLink()) fail(`Symlink forbidden: ${path}`)
  }
  const rel = relative(base, realpathSync(current))
  if (isAbsolute(rel) || rel.startsWith(`..${sep}`) || rel === '..') fail('Path escaped root')
  const stat = lstatSync(current)
  if (!stat.isFile() || stat.size < 1 || stat.size > limit) fail(`File size/type limit: ${path}`)
  const bytes = readFileSync(current)
  if (bytes.length > limit) fail(`File grew past limit: ${path}`)
  return bytes
}

export function verifyReceipt(root: string, receipt: Receipt): Buffer {
  const bytes = readBounded(root, receipt.path)
  if (bytes.length !== receipt.bytes || sha256(bytes) !== receipt.sha256) fail(`Receipt mismatch: ${receipt.path}`)
  return bytes
}

function uniqueIds(items: { id: string }[], label: string, errors: string[]): void {
  const ids = new Set<string>()
  for (const item of items) { if (ids.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`); ids.add(item.id) }
}
export function registryErrors(value: unknown, schema: Obj): string[] {
  const errors = schemaErrors(value, schema, 'registry')
  if (errors.length) return errors
  const registry = value as Registry
  uniqueIds(registry.sources, 'sources', errors)
  for (const source of registry.sources) {
    uniqueIds(source.attribution, source.id, errors)
    if (source.admission === 'fixture-only' && (source.id !== 'original-synthetic' || source.unresolvedRights.length || !source.license.retainedText || Object.values(source.rights).some(r => r !== 'allowed'))) errors.push(`${source.id}: invalid fixture admission`)
    if (source.admission === 'fixture-only' && (!source.acquisition || source.status !== 'admitted-fixture' || source.coverage.status !== 'synthetic-only')) errors.push(`${source.id}: fixture requires exact acquired bytes and synthetic coverage`)
    if (source.admission !== 'fixture-only' && (source.acquisition || source.status === 'admitted-fixture')) errors.push(`${source.id}: external acquisition not admitted in v1`)
    if (source.admission !== 'fixture-only' && !source.unresolvedRights.length) errors.push(`${source.id}: unresolved admission needs explicit blockers`)
    if (source.evidence.every(e => e.result === 'unavailable') && Object.values(source.rights).some(r => r === 'allowed' || r === 'conditional')) errors.push(`${source.id}: unavailable evidence cannot grant rights`)
    if (source.id === 'google-maps-runtime' && (source.admission !== 'runtime-only' || ['derive_geometry', 'redistribute_raw', 'redistribute_derived'].some(use => source.rights[use as Use] !== 'forbidden'))) errors.push('Google reusable-asset prohibition changed')
  }
  return errors
}

export function loadBundle(root = ROOT): Bundle {
  const pins: unknown = JSON.parse(readBounded(root, 'pins.json').toString())
  if (!object(pins) || pins.schemaVersion !== 1 || !Array.isArray(pins.files) || pins.files.length !== 3 || Object.keys(pins).sort().join(',') !== 'files,schemaVersion') fail('Invalid pins file')
  const expected = ['schema.v1.json', 'registry.v1.json', 'fixtures/LICENSE-AGPL-3.0.txt']
  const files = new Map<string, Buffer>()
  for (const [i, unknownPin] of (pins as { files: unknown[] }).files.entries()) {
    if (!object(unknownPin) || Object.keys(unknownPin).sort().join(',') !== 'bytes,path,sha256' || unknownPin.path !== expected[i] || !Number.isSafeInteger(unknownPin.bytes) || !/^[a-f0-9]{64}$/.test(String(unknownPin.sha256))) fail('Invalid pin entry/order')
    const pin = unknownPin as unknown as Receipt
    files.set(pin.path, verifyReceipt(root, pin))
  }
  const schema = JSON.parse(files.get('schema.v1.json')!.toString()) as Obj
  const registry: unknown = JSON.parse(files.get('registry.v1.json')!.toString())
  const errors = registryErrors(registry, schema)
  if (errors.length) fail(errors.join('\n'))
  for (const source of (registry as Registry).sources) {
    if (source.license.retainedText) verifyReceipt(root, source.license.retainedText)
    if (source.acquisition) verifyReceipt(root, source.acquisition.file)
  }
  return { schema, registry: registry as Registry, schemaSha256: sha256(files.get('schema.v1.json')!), registrySha256: sha256(files.get('registry.v1.json')!) }
}

export function validatePacket(value: unknown, bundle: Bundle, root = ROOT): Result {
  const errors = schemaErrors(value, bundle.schema, 'packet')
  const result: Result = { ok: false, eligibleForProduction: false, errors, checkedFiles: 0, checkedBytes: 0 }
  if (errors.length) return result
  const packet = value as Packet
  const checked = new Map<string, Receipt>()
  const checkReceipt = (receipt: Receipt): void => {
    const previous = checked.get(receipt.path)
    if (previous) { if (!equal(previous, receipt)) errors.push(`Conflicting receipts: ${receipt.path}`); return }
    if (result.checkedBytes + receipt.bytes > LIMITS.totalBytes) { errors.push('Aggregate byte limit exceeded'); return }
    checked.set(receipt.path, receipt)
    try {
      // Failed hashes still consume the byte budget; a false byte count cannot buy more I/O.
      const bytes = readBounded(root, receipt.path, Math.min(LIMITS.fileBytes, LIMITS.totalBytes - result.checkedBytes))
      result.checkedBytes += bytes.length
      if (bytes.length !== receipt.bytes || sha256(bytes) !== receipt.sha256) fail(`Receipt mismatch: ${receipt.path}`)
      result.checkedFiles++
    } catch (e) { errors.push(String(e)) }
  }
  if (packet.schemaSha256 !== bundle.schemaSha256) errors.push('Schema pin mismatch')
  if (packet.registrySha256 !== bundle.registrySha256) errors.push('Registry pin mismatch')
  if (packet.owner.baseCommit !== bundle.registry.baselineCommit) errors.push('Baseline pin mismatch')
  if (packet.unresolvedRights.length) errors.push('Unresolved packet rights block admission')
  if (packet.pilot.scope !== 'synthetic-fixture') errors.push('v1 admits synthetic fixtures only; real pilot requires parent-reviewed registry/schema revision')
  if (packet.pilot.scope === 'synthetic-fixture' && (packet.pilot.blockId !== null || packet.pilot.sourceCrs !== 'LOCAL_SYNTHETIC' || packet.pilot.axisOrder !== 'east-north-up' || packet.pilot.units !== 'm' || packet.pilot.verticalDatum !== 'synthetic-zero' || packet.pilot.realWorldTransform !== null)) errors.push('Synthetic fixture must not claim real-world geography')
  uniqueIds(packet.inputs, 'inputs', errors)
  uniqueIds(packet.observations, 'observations', errors)
  uniqueIds(packet.derivations, 'derivations', errors)
  uniqueIds(packet.attribution, 'attribution', errors)
  const inputs = new Map(packet.inputs.map(i => [i.id, i]))
  const requiredCredits = new Map<string, Attribution>()
  for (const input of packet.inputs) {
    checkReceipt(input.file); checkReceipt(input.licenseText)
    const source = bundle.registry.sources.find(s => s.id === input.sourceId)
    if (!source) { errors.push(`${input.id}: unknown source`); continue }
    if (source.admission !== 'fixture-only') errors.push(`${input.id}: ${source.admission} source is not admitted`)
    if (source.unresolvedRights.length) errors.push(`${input.id}: source rights unresolved`)
    for (const use of input.uses) if (source.rights[use] !== 'allowed') errors.push(`${input.id}: ${use} is ${source.rights[use]}`)
    if (!source.acquisition || !equal(input.file, source.acquisition.file) || input.capturedAt !== source.acquisition.capturedAt || input.acquiredAt !== source.acquisition.acquiredAt) errors.push(`${input.id}: input bytes/dates are not pinned to source`)
    if (input.licenseId !== source.license.id) errors.push(`${input.id}: license mismatch`)
    if (!source.license.retainedText || !equal(input.licenseText, source.license.retainedText)) errors.push(`${input.id}: license text is not pinned to source`)
    if (input.sourceUrl !== source.sourceUrl || input.release !== source.release) errors.push(`${input.id}: source URL/release mismatch`)
    if (Date.parse(input.capturedAt) > Date.parse(input.acquiredAt)) errors.push(`${input.id}: captured after acquisition`)
    const expectedIds = source.attribution.map(a => a.id).sort()
    if (!equal([...input.attributionIds].sort(), expectedIds)) errors.push(`${input.id}: attribution references incomplete or invented`)
    for (const a of source.attribution) {
      if (requiredCredits.has(a.id) && !equal(requiredCredits.get(a.id), a)) errors.push(`Conflicting attribution id ${a.id}`)
      requiredCredits.set(a.id, a)
    }
  }
  if (!equal([...packet.attribution].sort((a, b) => a.id.localeCompare(b.id)), [...requiredCredits.values()].sort((a, b) => a.id.localeCompare(b.id)))) errors.push('Attribution text/URL missing, changed or invented')
  const checkInputs = (ids: string[], label: string): void => { for (const id of ids) if (!inputs.has(id)) errors.push(`${label}: missing input ${id}`) }
  const fields = new Set<string>()
  for (const o of packet.observations) {
    checkInputs(o.inputIds, o.id); checkReceipt(o.evidence)
    const field = `${o.featureId}/${o.property}`
    if (fields.has(field)) errors.push(`Duplicate provenance for ${field}`)
    fields.add(field)
    if (o.context !== 'synthetic') errors.push(`${o.id}: fixture cannot claim field/remote/source measurement`)
    if (o.uncertainty.unit !== o.unit) errors.push(`${o.id}: uncertainty units mismatch`)
    if (o.uncertainty.status === 'bounded' ? o.uncertainty.plusMinus === null : o.uncertainty.plusMinus !== null) errors.push(`${o.id}: inconsistent uncertainty bound`)
    if (o.basis === 'measured' && (!o.observedAt || o.uncertainty.status !== 'bounded' || o.confidence !== 'known-error-bound')) errors.push(`${o.id}: measurement requires timestamp and known uncertainty`)
    if (o.basis !== 'measured' && (!o.beta || o.observedAt !== null)) errors.push(`${o.id}: estimate/authored values need beta and no measurement timestamp`)
    if (o.basis === 'estimated' && !['low', 'medium', 'high'].includes(o.confidence)) errors.push(`${o.id}: estimate needs explicit confidence`)
    if (o.basis === 'authored' && o.confidence !== 'not-applicable') errors.push(`${o.id}: authored confidence must be not-applicable`)
    if (o.basis === 'estimated' && o.uncertainty.status === 'not-applicable') errors.push(`${o.id}: estimate requires bounded or unknown uncertainty`)
    if (o.basis === 'authored' && o.uncertainty.status !== 'not-applicable') errors.push(`${o.id}: authored value has no measurement uncertainty`)
  }
  for (const d of packet.derivations) {
    checkInputs(d.inputIds, d.id); checkReceipt(d.output)
    for (const id of d.inputIds) if (inputs.has(id) && !inputs.get(id)!.uses.includes('derive_geometry')) errors.push(`${d.id}: derivation input lacks derive_geometry use`)
  }
  result.ok = errors.length === 0
  return result
}

function main(): void {
  try {
    const args = process.argv.slice(2)
    if (args.length > 1) fail('Usage: node validate.ts [lane-relative packet path | --registry]')
    const bundle = loadBundle()
    if (args[0] === '--registry') {
      process.stdout.write(JSON.stringify({ ok: true, sources: bundle.registry.sources.length, externalAssetsAdmitted: 0, schemaSha256: bundle.schemaSha256, registrySha256: bundle.registrySha256 }, null, 2) + '\n')
      return
    }
    const value: unknown = JSON.parse(readBounded(ROOT, args[0] ?? 'fixtures/lawful.packet.json', LIMITS.packetBytes).toString())
    const result = validatePacket(value, bundle)
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (!result.ok) process.exitCode = 1
  } catch (e) { process.stderr.write(`${String(e)}\n`); process.exitCode = 1 }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
