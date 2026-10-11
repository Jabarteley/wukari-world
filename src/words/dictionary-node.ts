import { readFile } from 'node:fs/promises'
import { readPackedDictionary, type DictionaryAssetManifest } from './dictionary-asset.ts'

/** Node reads the same generated file the release package serves. */
export function loadPackedDictionary(manifest: DictionaryAssetManifest): Promise<string> {
  const dist = new URL('../../dist/', import.meta.url)
  return readPackedDictionary(manifest, path => readFile(new URL(path.replace(/^\//, ''), dist)))
}
