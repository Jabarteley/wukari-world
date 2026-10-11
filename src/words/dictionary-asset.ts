export const MAX_DICTIONARY_ASSET_BYTES = 2_000_000

export interface DictionaryAssetManifest {
  readonly path: string
  readonly sha256: string
  readonly bytes: number
  readonly firstLength: number
  readonly wordCounts: readonly number[]
}

export type DictionaryAssetReader = (path: string) => Promise<Uint8Array>

export class DictionaryAssetError extends Error {
  readonly retryable = true
  readonly code: 'reader_unavailable' | 'invalid_manifest' | 'read_failed' | 'invalid_size' | 'hash_mismatch' | 'invalid_text'
  constructor(code: DictionaryAssetError['code'], message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DictionaryAssetError'
    this.code = code
  }
}

declare const crypto: { subtle: { digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer> } }
declare const TextDecoder: new (label: string, options: { fatal: boolean }) => { decode(data: Uint8Array): string }

const HASH = /^[0-9a-f]{64}$/
const PATH = /^\/assets\/words\/dictionary\.[0-9a-f]{64}\.txt$/

function validManifest(manifest: DictionaryAssetManifest): boolean {
  return HASH.test(manifest.sha256) && PATH.test(manifest.path)
    && manifest.path === `/assets/words/dictionary.${manifest.sha256}.txt`
    && Number.isSafeInteger(manifest.bytes) && manifest.bytes > 0 && manifest.bytes <= MAX_DICTIONARY_ASSET_BYTES
    && Number.isSafeInteger(manifest.firstLength) && manifest.firstLength > 0
    && manifest.wordCounts.length > 0 && manifest.wordCounts.every(count => Number.isSafeInteger(count) && count > 0)
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function readPackedDictionary(manifest: DictionaryAssetManifest, read: DictionaryAssetReader): Promise<string> {
  if (!validManifest(manifest)) throw new DictionaryAssetError('invalid_manifest', 'Invalid dictionary asset manifest')
  let bytes: Uint8Array
  try { bytes = await read(manifest.path) }
  catch (cause) { throw new DictionaryAssetError('read_failed', 'The dictionary asset could not be read', { cause }) }
  if (!(bytes instanceof Uint8Array)) throw new DictionaryAssetError('read_failed', 'The dictionary reader returned invalid bytes')
  if (bytes.byteLength !== manifest.bytes || bytes.byteLength > MAX_DICTIONARY_ASSET_BYTES) throw new DictionaryAssetError('invalid_size', 'The dictionary asset has an unexpected byte length')
  if (await sha256(bytes) !== manifest.sha256) throw new DictionaryAssetError('hash_mismatch', 'The dictionary asset failed its integrity check')
  let packed: string
  try { packed = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch (cause) { throw new DictionaryAssetError('invalid_text', 'The dictionary asset is not valid UTF-8 text', { cause }) }
  if (!packed) throw new DictionaryAssetError('invalid_text', 'The dictionary asset is empty')
  return packed
}

let reader: DictionaryAssetReader | null = null

export function installDictionaryAssetReader(next: DictionaryAssetReader): void { reader = next }

/** Worker/default host entry selected through #word-dictionary. Failed calls cache nothing, so dict.ready() can retry. */
export async function loadPackedDictionary(manifest: DictionaryAssetManifest): Promise<string> {
  if (!reader) throw new DictionaryAssetError('reader_unavailable', 'The dictionary asset reader is unavailable')
  return readPackedDictionary(manifest, reader)
}
