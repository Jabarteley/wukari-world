import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { CityContentAssetError, loadCityContentAsset, type CityContentAssetManifestRow } from './content-asset.ts'

const encoder = new TextEncoder()
const valid = (id = 'test-city') => ({ version: 1, cityId: id, rules: { id, status: 'open', units: [], districts: [], hubs: [] }, content: { cityId: id, venues: [], regulars: [], workplaces: [], housing: [] } })
const fixture = (value: unknown, id = 'test-city'): { row: CityContentAssetManifestRow; bytes: Uint8Array } => {
  const bytes = encoder.encode(JSON.stringify(value)), sha256 = createHash('sha256').update(bytes).digest('hex')
  return { bytes, row: { id, path: `/assets/cities/${id}.${sha256}.json`, sha256, bytes: bytes.byteLength } }
}
const code = async (work: Promise<unknown>): Promise<string | undefined> => {
  try { await work; return undefined } catch (error) { assert.ok(error instanceof CityContentAssetError); return error.code }
}

test('loads authenticated bytes and preserves the rules and content payload', async () => {
  const found = fixture(valid())
  const loaded = await loadCityContentAsset(found.row, async path => { assert.equal(path, found.row.path); return found.bytes })
  assert.deepEqual(loaded, valid())
})

test('rejects bad manifest, length, hash, JSON and identity before returning content', async () => {
  const found = fixture(valid())
  assert.equal(await code(loadCityContentAsset({ ...found.row, path: '/wrong' }, async () => found.bytes)), 'invalid_manifest')
  assert.equal(await code(loadCityContentAsset({ ...found.row, bytes: found.row.bytes + 1 }, async () => found.bytes)), 'too_large')
  const changed = found.bytes.slice(); changed[changed.length - 1] = changed[changed.length - 1] === 125 ? 93 : 125
  assert.equal(await code(loadCityContentAsset(found.row, async () => changed)), 'hash_mismatch')
  const invalidBytes = encoder.encode('{'), invalidHash = createHash('sha256').update(invalidBytes).digest('hex')
  const invalidJson: CityContentAssetManifestRow = { id: 'test-city', path: `/assets/cities/test-city.${invalidHash}.json`, sha256: invalidHash, bytes: invalidBytes.byteLength }
  assert.equal(await code(loadCityContentAsset(invalidJson, async () => invalidBytes)), 'invalid_json')
  const wrong = fixture(valid('other-city'), 'test-city')
  assert.equal(await code(loadCityContentAsset(wrong.row, async () => wrong.bytes)), 'invalid_payload')
})

test('a failed read is retryable and a later call reads again', async () => {
  const found = fixture(valid())
  let reads = 0
  const read = async (): Promise<Uint8Array> => { if (++reads === 1) throw new Error('temporary'); return found.bytes }
  assert.equal(await code(loadCityContentAsset(found.row, read)), 'read_failed')
  assert.deepEqual(await loadCityContentAsset(found.row, read), valid())
  assert.equal(reads, 2)
})
