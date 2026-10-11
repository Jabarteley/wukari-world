import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { DictionaryAssetError, readPackedDictionary, type DictionaryAssetManifest } from './dictionary-asset.ts'
import { DICTIONARY_ASSET } from './dictionary-asset.generated.ts'
import { loadPackedDictionary as loadNodeDictionary } from './dictionary-node.ts'
import { PACKED } from './data/dictionary.ts'

const bytes = new TextEncoder().encode('packed dictionary text')
const hash = createHash('sha256').update(bytes).digest('hex')
const manifest: DictionaryAssetManifest = { path: `/assets/words/dictionary.${hash}.txt`, sha256: hash, bytes: bytes.byteLength, firstLength: 2, wordCounts: [1] }
const code = async (work: Promise<unknown>): Promise<string | undefined> => {
  try { await work; return undefined } catch (error) { assert.ok(error instanceof DictionaryAssetError); return error.code }
}

test('reads and authenticates the packed dictionary text', async () => {
  assert.equal(await readPackedDictionary(manifest, async path => { assert.equal(path, manifest.path); return bytes }), 'packed dictionary text')
})

test('rejects malformed manifests, sizes, hashes and text', async () => {
  assert.equal(await code(readPackedDictionary({ ...manifest, path: '/wrong' }, async () => bytes)), 'invalid_manifest')
  assert.equal(await code(readPackedDictionary({ ...manifest, bytes: bytes.byteLength + 1 }, async () => bytes)), 'invalid_size')
  const changed = bytes.slice(); changed[0] = 88
  assert.equal(await code(readPackedDictionary(manifest, async () => changed)), 'hash_mismatch')
  const invalid = new Uint8Array([0xff]), invalidHash = createHash('sha256').update(invalid).digest('hex')
  const invalidManifest: DictionaryAssetManifest = { path: `/assets/words/dictionary.${invalidHash}.txt`, sha256: invalidHash, bytes: 1, firstLength: 2, wordCounts: [1] }
  assert.equal(await code(readPackedDictionary(invalidManifest, async () => invalid)), 'invalid_text')
})

test('a failed read is retryable by calling the stateless reader again', async () => {
  let reads = 0
  const read = async (): Promise<Uint8Array> => { if (++reads === 1) throw new Error('temporary'); return bytes }
  assert.equal(await code(readPackedDictionary(manifest, read)), 'read_failed')
  assert.equal(await readPackedDictionary(manifest, read), 'packed dictionary text')
  assert.equal(reads, 2)
})

test('the Node source reads the generated release artifact exactly', async () => {
  assert.equal(await loadNodeDictionary(DICTIONARY_ASSET), PACKED)
})
