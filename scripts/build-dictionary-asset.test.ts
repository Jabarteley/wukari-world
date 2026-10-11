import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { readPackedDictionary } from '../src/words/dictionary-asset.ts'
import { PACKED, FIRST_LENGTH, WORD_COUNTS } from '../src/words/data/dictionary.ts'
import { buildDictionaryAsset } from './build-dictionary-asset.ts'

test('generator emits deterministic bytes and metadata equal to the authored dictionary', async (t) => {
  const folder = join(tmpdir(), `allworld-dictionary-${process.pid}-${Date.now()}`)
  t.after(() => rm(folder, { recursive: true, force: true }))
  const first = await buildDictionaryAsset({ outDir: join(folder, 'first'), typescriptPath: join(folder, 'dictionary-asset.generated.ts') })
  const second = await buildDictionaryAsset({ outDir: join(folder, 'second') })
  assert.deepEqual(first, second)
  assert.equal(first.firstLength, FIRST_LENGTH)
  assert.deepEqual(first.wordCounts, WORD_COUNTS)
  const name = first.path.split('/').at(-1)!
  const bytes = new Uint8Array(await readFile(join(folder, 'first', name)))
  assert.equal(await readPackedDictionary(first, async () => bytes), PACKED)
  assert.equal(bytes.byteLength, Buffer.byteLength(PACKED, 'utf8'))
  assert.match(await readFile(join(folder, 'dictionary-asset.generated.ts'), 'utf8'), /DICTIONARY_ASSET/)
})
