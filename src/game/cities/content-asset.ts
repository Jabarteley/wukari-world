import type { CityContent, CityModuleRules } from '../../types/content.ts'

declare const crypto: { subtle: { digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer> } }
declare const TextDecoder: new (label: string, options: { fatal: boolean }) => { decode(data: Uint8Array): string }

export const CITY_CONTENT_ASSET_VERSION = 1 as const
export const MAX_CITY_CONTENT_ASSET_BYTES = 5_000_000

export interface CityContentAssetManifestRow {
  readonly id: string
  readonly path: string
  readonly sha256: string
  readonly bytes: number
}

export interface CityContentAsset {
  readonly version: typeof CITY_CONTENT_ASSET_VERSION
  readonly cityId: string
  readonly rules: CityModuleRules
  readonly content: CityContent
}

export type CityContentAssetReader = (path: string) => Promise<Uint8Array>

export class CityContentAssetError extends Error {
  readonly retryable = true
  readonly code: 'invalid_manifest' | 'read_failed' | 'too_large' | 'hash_mismatch' | 'invalid_json' | 'invalid_payload'
  constructor(code: CityContentAssetError['code'], message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CityContentAssetError'
    this.code = code
  }
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const ID = /^[a-z][a-z0-9-]{0,60}$/
const HASH = /^[0-9a-f]{64}$/
const ASSET_PATH = /^\/assets\/cities\/[a-z][a-z0-9-]{0,60}\.[0-9a-f]{64}\.json$/

function validRow(row: CityContentAssetManifestRow): boolean {
  return ID.test(row.id) && HASH.test(row.sha256) && ASSET_PATH.test(row.path)
    && row.path === `/assets/cities/${row.id}.${row.sha256}.json`
    && Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= MAX_CITY_CONTENT_ASSET_BYTES
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function parsePayload(value: unknown, expectedId: string): CityContentAsset {
  if (!object(value) || value.version !== CITY_CONTENT_ASSET_VERSION || value.cityId !== expectedId || !object(value.rules) || !object(value.content)) {
    throw new CityContentAssetError('invalid_payload', `City content asset ${expectedId} has an invalid envelope`)
  }
  if (value.rules.id !== expectedId || value.rules.status !== 'open' || value.content.cityId !== expectedId
    || !Array.isArray(value.rules.units) || !Array.isArray(value.rules.districts) || !Array.isArray(value.rules.hubs)
    || !Array.isArray(value.content.venues) || !Array.isArray(value.content.regulars) || !Array.isArray(value.content.workplaces)
    || !Array.isArray(value.content.housing)) {
    throw new CityContentAssetError('invalid_payload', `City content asset ${expectedId} does not match its manifest`)
  }
  return value as unknown as CityContentAsset
}

/** Read and authenticate one immutable city payload. A rejected call caches nothing; its caller may retry. */
export async function loadCityContentAsset(row: CityContentAssetManifestRow, read: CityContentAssetReader): Promise<CityContentAsset> {
  if (!validRow(row)) throw new CityContentAssetError('invalid_manifest', 'Invalid city content asset manifest row')
  let bytes: Uint8Array
  try { bytes = await read(row.path) }
  catch (cause) { throw new CityContentAssetError('read_failed', `City content asset ${row.id} could not be read`, { cause }) }
  if (!(bytes instanceof Uint8Array)) throw new CityContentAssetError('read_failed', `City content asset ${row.id} reader returned invalid bytes`)
  if (bytes.byteLength !== row.bytes || bytes.byteLength > MAX_CITY_CONTENT_ASSET_BYTES) {
    throw new CityContentAssetError('too_large', `City content asset ${row.id} has an unexpected byte length`)
  }
  if (await sha256(bytes) !== row.sha256) throw new CityContentAssetError('hash_mismatch', `City content asset ${row.id} failed its integrity check`)
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown }
  catch (cause) { throw new CityContentAssetError('invalid_json', `City content asset ${row.id} is not valid UTF-8 JSON`, { cause }) }
  return parsePayload(parsed, row.id)
}
