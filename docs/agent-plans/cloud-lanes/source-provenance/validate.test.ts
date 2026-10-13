import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { ROOT, LIMITS, assertSupportedSchema, loadBundle, readBounded, registryErrors, schemaErrors, sha256, validatePacket } from './validate.ts'
import type { Packet, Receipt } from './validate.ts'

const bundle = loadBundle()
const fixture = (): Packet => JSON.parse(readFileSync(join(ROOT, 'fixtures/lawful.packet.json'), 'utf8')) as Packet
const result = (value: unknown) => validatePacket(value, bundle)

test('lawful original fixture verifies actual source, license, evidence and all three basis labels', () => {
  const packet = fixture()
  assert.deepEqual(result(packet), { ok: true, eligibleForProduction: false, errors: [], checkedFiles: 3, checkedBytes: 35342 })
  assert.deepEqual(new Set(packet.observations.map(o => o.basis)), new Set(['measured', 'estimated', 'authored']))
  const geometry = JSON.parse(readFileSync(join(ROOT, 'fixtures/original-block.json'), 'utf8'))
  const [a, b] = geometry.footprint as number[][]
  const measured = Math.hypot(b![0]! - a![0]!, b![1]! - a![1]!)
  const evidence = JSON.parse(readFileSync(join(ROOT, 'fixtures/measurement.json'), 'utf8'))
  assert.equal(measured, 12)
  assert.equal(evidence.widthM, measured)
  assert.equal(evidence.context, 'synthetic')
})

interface Rejection { id: string; changes: { path: string[]; value?: unknown; remove?: boolean }[]; errors: string[] }
const cases: Rejection[] = JSON.parse(readFileSync(join(ROOT, 'fixtures/rejections.json'), 'utf8'))
for (const c of cases) test(`rejection fixture: ${c.id}`, () => {
  const packet = fixture()
  for (const change of c.changes) {
    let target = packet as unknown as Record<string, unknown>
    for (const key of change.path.slice(0, -1)) target = target[key] as Record<string, unknown>
    const key = change.path.at(-1)!
    if (change.remove) delete target[key]
    else target[key] = change.value
  }
  const validation = result(packet)
  assert.equal(validation.ok, false)
  for (const expected of c.errors) assert.ok(validation.errors.some(e => e.includes(expected)), `${expected}\n${validation.errors.join('\n')}`)
})

test('every external source is gated; allowed runtime visualization never means geometry permission', () => {
  assert.equal(bundle.registry.sources.length, 9)
  assert.equal(bundle.registry.sources.filter(s => s.admission === 'fixture-only').length, 1)
  for (const s of bundle.registry.sources.slice(1)) {
    assert.equal(s.acquisition, null)
    assert.ok(s.unresolvedRights.length)
    const packet = fixture(); packet.inputs[0]!.sourceId = s.id
    assert.equal(result(packet).ok, false)
  }
  const google = bundle.registry.sources.find(s => s.id === 'google-maps-runtime')!
  assert.equal(google.rights.runtime_display, 'conditional')
  assert.equal(google.rights.derive_geometry, 'forbidden')
  assert.equal(google.rights.redistribute_derived, 'forbidden')
})

test('malformed, non-finite coordinates, excessively nested and oversized values fail before file I/O', () => {
  for (const value of [null, [], 'string', 42]) assert.equal(result(value).ok, false)
  for (const bad of [NaN, Infinity, -Infinity]) {
    const p = fixture() as unknown as { observations: { value: unknown }[] }
    p.observations[0]!.value = [3.4, bad]
    const r = result(p)
    assert.equal(r.ok, false)
    assert.ok(r.errors.some(e => e.includes('Non-finite')))
    assert.equal(r.checkedFiles, 0)
  }
  assert.ok(result(JSON.parse('{"coordinate":1e400}')).errors.some(e => e.includes('Non-finite')))
  const deep: Record<string, unknown> = {}; let cursor = deep
  for (let i = 0; i <= LIMITS.depth; i++) { cursor.next = {}; cursor = cursor.next as Record<string, unknown> }
  assert.ok(result(deep).errors.some(e => e.includes('complexity')))
  const p = fixture() as unknown as { observations: unknown[] }
  p.observations = Array.from({ length: 129 }, (_, i) => ({ ...fixture().observations[0], id: `field-${i}` }))
  assert.ok(result(p).errors.some(e => e.includes('too many items')))
})

test('duplicate identities and field provenance are rejected even with distinct object values', () => {
  const p = fixture()
  p.inputs.push({ ...p.inputs[0]!, release: 'other-release' })
  assert.ok(result(p).errors.some(e => e.includes('duplicate id')))
  const q = fixture()
  q.observations.push({ ...q.observations[0]!, id: 'different-id' })
  assert.ok(result(q).errors.some(e => e.includes('Duplicate provenance')))
})

test('registry rejects duplicate sources, unavailable-evidence grants and Google extraction overrides', () => {
  const duplicate = structuredClone(bundle.registry)
  duplicate.sources.push({ ...duplicate.sources[0]!, release: 'different' })
  assert.ok(registryErrors(duplicate, bundle.schema).some(e => e.includes('duplicate id')))
  const unsupported = structuredClone(bundle.registry)
  unsupported.sources.find(s => s.id === 'srtm-unverified')!.rights.derive_geometry = 'allowed'
  assert.ok(registryErrors(unsupported, bundle.schema).some(e => e.includes('unavailable evidence')))
  const changed = structuredClone(bundle.registry)
  changed.sources.find(s => s.id === 'google-maps-runtime')!.rights.derive_geometry = 'allowed'
  assert.ok(registryErrors(changed, bundle.schema).some(e => e.includes('Google reusable-asset prohibition')))
})

test('schema subset is explicit, rejects unknown validators and external references', () => {
  const unsupported = { ...bundle.schema, dependentRequired: {} }
  assert.throws(() => assertSupportedSchema(unsupported), /Unsupported schema keyword/)
  assert.throws(() => assertSupportedSchema({ ...bundle.schema, $ref: 'https://example.com/schema.json' }), /local \$defs/)
  assert.ok(schemaErrors({}, bundle.schema, 'missing-definition').length)
})

function temporaryRoot(fn: (root: string) => void): void {
  const root = mkdtempSync(join(ROOT, 'evidence', '.test-'))
  try {
    for (const name of ['pins.json', 'registry.v1.json', 'schema.v1.json', 'fixtures']) cpSync(join(ROOT, name), join(root, name), { recursive: true })
    fn(root)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('actual source/license/measurement byte tampering fails, and pinned schema cannot drift', () => {
  for (const path of ['fixtures/original-block.json', 'fixtures/LICENSE-AGPL-3.0.txt', 'fixtures/measurement.json']) temporaryRoot(root => {
    writeFileSync(join(root, path), 'tampered\n')
    assert.equal(validatePacket(fixture(), bundle, root).ok, false)
  })
  for (const path of ['schema.v1.json', 'registry.v1.json']) temporaryRoot(root => {
    writeFileSync(join(root, path), readFileSync(join(root, path), 'utf8') + '\n')
    assert.throws(() => loadBundle(root), /Receipt mismatch/)
  })
})

test('rehashed substituted source is rejected against admitted registry input', () => temporaryRoot(root => {
  const bytes = Buffer.from('{"unrelated":"not admitted"}\n')
  writeFileSync(join(root, 'fixtures/substitute.json'), bytes)
  const p = fixture()
  p.inputs[0]!.file = { path: 'fixtures/substitute.json', bytes: bytes.length, sha256: sha256(bytes) }
  assert.ok(validatePacket(p, bundle, root).errors.some(e => e.includes('input bytes/dates are not pinned')))
}))

test('symlinks, traversal, oversized files and conflicting receipts cannot be read as evidence', () => temporaryRoot(root => {
  symlinkSync(join(ROOT, 'fixtures/original-block.json'), join(root, 'link.json'))
  assert.throws(() => readBounded(root, 'link.json'), /Symlink forbidden/)
  for (const path of ['../outside', 'fixtures/../pins.json', '/tmp/file', 'fixtures\\file', 'https://example.com/']) assert.throws(() => readBounded(root, path), /Unsafe relative path/)
  writeFileSync(join(root, 'too-large.json'), Buffer.alloc(LIMITS.fileBytes + 1))
  assert.throws(() => readBounded(root, 'too-large.json'), /File size\/type limit/)
  const p = fixture(); p.observations[0]!.evidence = { ...p.inputs[0]!.file, bytes: 1 }
  assert.ok(validatePacket(p, bundle, root).errors.some(e => e.includes('Conflicting receipts')))
}))

test('aggregate evidence bytes are bounded', () => temporaryRoot(root => {
  const bytes = Buffer.alloc(900_000, 32)
  const p = fixture()
  for (let i = 0; i < 5; i++) {
    const receipt: Receipt = { path: `fixtures/evidence-${i}.json`, bytes: bytes.length, sha256: sha256(bytes) }
    writeFileSync(join(root, receipt.path), bytes)
    p.observations.push({ ...p.observations[0]!, id: `extra-${i}`, property: `extra-${i}`, evidence: receipt })
  }
  const r = validatePacket(p, bundle, root)
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('Aggregate byte limit')))
  assert.ok(r.checkedBytes <= LIMITS.totalBytes)
}))

test('CLI validates default fixture and registry; malformed input exits nonzero without network or stack trace', () => {
  const script = join(ROOT, 'validate.ts')
  const valid = JSON.parse(execFileSync(process.execPath, [script], { encoding: 'utf8', timeout: 5000 }))
  assert.equal(valid.ok, true); assert.equal(valid.eligibleForProduction, false)
  const registry = JSON.parse(execFileSync(process.execPath, [script, '--registry'], { encoding: 'utf8', timeout: 5000 }))
  assert.equal(registry.sources, 9); assert.equal(registry.externalAssetsAdmitted, 0)
  const bad = spawnSync(process.execPath, [script, 'fixtures/rejections.json'], { encoding: 'utf8', timeout: 5000 })
  assert.equal(bad.status, 1)
  assert.equal(JSON.parse(bad.stdout).ok, false)
  const missing = spawnSync(process.execPath, [script, 'missing.json'], { encoding: 'utf8', timeout: 5000 })
  assert.equal(missing.status, 1)
  assert.ok(missing.stderr.includes('ENOENT'))
  assert.ok(!missing.stderr.includes('at main'))
})


test('false byte counts and failed hashes still consume the aggregate read budget', () => temporaryRoot(root => {
  const bytes = Buffer.alloc(900_000, 32)
  const p = fixture()
  for (let i = 0; i < 5; i++) {
    const path = `fixtures/false-size-${i}.json`
    writeFileSync(join(root, path), bytes)
    p.observations.push({ ...p.observations[0]!, id: `false-size-${i}`, property: `false-size-${i}`, evidence: { path, bytes: 1, sha256: sha256(bytes) } })
  }
  const r = validatePacket(p, bundle, root)
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('File size/type limit')))
  assert.equal(r.checkedBytes, 35_342 + 4 * 900_000)
  assert.ok(r.checkedBytes <= LIMITS.totalBytes)
}))
