import { parseTalkBankEvidence, validateTalkBank } from '../../scripts/talk-factory/bank.ts'
import type { TalkBankEvidenceV1, TalkBankV1 } from '../../scripts/talk-factory/bank.ts'

export const TALK_CITY_MAX_BYTES = 5_000_000
const INDEX_MAX_BYTES = 256_000
const RETAINED_CITIES = 8
const CITY_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const SHA256 = /^[a-f0-9]{64}$/
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))

export interface TalkCityReference {
  city: string
  path: string
  sha256: string
  bytes: number
  banks: number
}

export type TalkAssetReader = (path: string, maxBytes: number) => Promise<Uint8Array>
interface PackedBank { venue: string; bank: unknown; evidence: unknown }

function referenceOf(value: unknown): TalkCityReference {
  if (!object(value) || !exactKeys(value, ['city', 'path', 'sha256', 'bytes', 'banks'])
    || typeof value.city !== 'string' || !CITY_ID.test(value.city)
    || typeof value.sha256 !== 'string' || !SHA256.test(value.sha256)
    || typeof value.path !== 'string' || value.path !== `/assets/talk-banks/${value.city}-${value.sha256}.json`
    || typeof value.bytes !== 'number' || !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || value.bytes > TALK_CITY_MAX_BYTES
    || typeof value.banks !== 'number' || !Number.isSafeInteger(value.banks) || value.banks <= 0 || value.banks > 10_000) throw new TypeError('Invalid talk city reference')
  return { city: value.city, path: value.path, sha256: value.sha256, bytes: value.bytes, banks: value.banks }
}

function jsonOf(bytes: Uint8Array, maximum: number): unknown {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > maximum) throw new TypeError('Talk asset byte limit')
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function indexOf(value: unknown): ReadonlyMap<string, TalkCityReference> {
  if (!object(value) || !exactKeys(value, ['schema', 'version', 'cities']) || value.schema !== 'allworld-talk-index'
    || value.version !== 1 || !Array.isArray(value.cities) || value.cities.length === 0 || value.cities.length > 512) throw new TypeError('Invalid talk index')
  const result = new Map<string, TalkCityReference>()
  for (const row of value.cities) {
    const reference = referenceOf(row)
    if (result.has(reference.city)) throw new TypeError('Duplicate talk city')
    result.set(reference.city, reference)
  }
  return result
}

function packOf(value: unknown, reference: TalkCityReference): ReadonlyMap<string, PackedBank> {
  if (!object(value) || !exactKeys(value, ['schema', 'version', 'city', 'banks']) || value.schema !== 'allworld-city-talk'
    || value.version !== 1 || value.city !== reference.city || !Array.isArray(value.banks) || value.banks.length !== reference.banks) throw new TypeError('Talk city identity or count mismatch')
  const result = new Map<string, PackedBank>()
  for (const row of value.banks) {
    if (!object(row) || !exactKeys(row, ['npc', 'venue', 'bank', 'evidence']) || typeof row.npc !== 'string' || !row.npc || row.npc.length > 200
      || typeof row.venue !== 'string' || !row.venue || row.venue.length > 200 || result.has(row.npc)) throw new TypeError('Invalid or duplicate talk regular')
    result.set(row.npc, { venue: row.venue, bank: row.bank, evidence: row.evidence })
  }
  return result
}

/** Static city data is loaded only after a server-authorized regular is selected. */
export function createTalkBankReader(read: TalkAssetReader) {
  let index: Promise<ReadonlyMap<string, TalkCityReference>> | null = null
  const cities = new Map<string, Promise<ReadonlyMap<string, PackedBank>>>()

  function loadIndex(): Promise<ReadonlyMap<string, TalkCityReference>> {
    if (index) return index
    const loading = read('/assets/talk-banks/index.json', INDEX_MAX_BYTES).then(bytes => indexOf(jsonOf(bytes, INDEX_MAX_BYTES)))
    index = loading
    void loading.catch(() => { if (index === loading) index = null })
    return loading
  }

  async function reference(city: string): Promise<TalkCityReference> {
    const found = (await loadIndex()).get(city)
    if (!found) throw new TypeError('Talk city unavailable')
    return { ...found }
  }

  function loadCity(input: TalkCityReference): Promise<ReadonlyMap<string, PackedBank>> {
    const row = referenceOf(input)
    const existing = cities.get(row.sha256)
    if (existing) { cities.delete(row.sha256); cities.set(row.sha256, existing); return existing }
    const loading = (async () => {
      const bytes = await read(row.path, row.bytes)
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== row.bytes) throw new TypeError('Talk city byte mismatch')
      const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
      const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
      if (actual !== row.sha256) throw new TypeError('Talk city hash mismatch')
      return packOf(jsonOf(bytes, TALK_CITY_MAX_BYTES), row)
    })()
    cities.set(row.sha256, loading)
    while (cities.size > RETAINED_CITIES) cities.delete(cities.keys().next().value ?? '')
    void loading.catch(() => { if (cities.get(row.sha256) === loading) cities.delete(row.sha256) })
    return loading
  }

  async function load(row: TalkCityReference, npc: string, venue: string): Promise<{ bank: TalkBankV1; evidence: TalkBankEvidenceV1 }> {
    const entry = (await loadCity(row)).get(npc)
    if (!entry || entry.venue !== venue) throw new TypeError('Talk regular is not at this venue')
    const evidence = parseTalkBankEvidence(entry.evidence)
    const bank = validateTalkBank(entry.bank, evidence)
    if (bank.city !== row.city || bank.npc !== npc || evidence.city.id !== row.city || evidence.npc.id !== npc || evidence.venue.id !== venue) throw new TypeError('Talk bank identity mismatch')
    return { bank, evidence }
  }

  return { reference, load }
}
