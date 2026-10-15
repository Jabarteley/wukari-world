import { PROGRESSION_CONTENT_ASSETS } from './assets.generated.ts'
import type { ProgressionAsset, ProgressionAssetManifestRow, ProgressionAssetReader } from './asset.ts'
import {
  installProgressionSnapshot, MAX_PROGRESSION_ASSET_BYTES, PROGRESSION_SNAPSHOT_VERSION,
  progressionReady, type ProgressionMissionSnapshot,
} from './provider.ts'
import type { EpisodeDefinition } from '../../types/episodes.ts'
import type { JourneyDefinition } from '../../types/journeys.ts'

declare const crypto: { subtle: { digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer> } }
declare const TextDecoder: new (label: string, options: { fatal: boolean }) => { decode(data: Uint8Array): string }

let readAsset: ProgressionAssetReader | undefined
let loading: Promise<void> | null = null
export function installProgressionAssetReader(reader: ProgressionAssetReader): void { readAsset = reader }
export function installBundledProgression(): void { /* Worker content is installed inside its explicit startup barrier. */ }

const HASH = /^[0-9a-f]{64}$/
const PATH = /^\/assets\/progression\/(episodes-\d+|journeys|missions)\.[0-9a-f]{64}\.json$/
const validRow = (row: ProgressionAssetManifestRow): boolean => ['episodes', 'journeys', 'missions'].includes(row.kind)
  && Number.isSafeInteger(row.order) && row.order >= 0 && HASH.test(row.sha256) && PATH.test(row.path)
  && row.path.endsWith(`.${row.sha256}.json`) && Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= MAX_PROGRESSION_ASSET_BYTES
  && Number.isSafeInteger(row.count) && row.count >= 0
const sha256 = async (bytes: Uint8Array): Promise<string> => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')

async function readRow(row: ProgressionAssetManifestRow, read: ProgressionAssetReader): Promise<ProgressionAsset> {
  if (!validRow(row)) throw new TypeError('Invalid progression asset manifest row')
  const bytes = await read(row.path)
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== row.bytes || bytes.byteLength > MAX_PROGRESSION_ASSET_BYTES) throw new TypeError(`Progression asset ${row.kind} has an unexpected byte length`)
  if (await sha256(bytes) !== row.sha256) throw new TypeError(`Progression asset ${row.kind} failed its integrity check`)
  let value: unknown
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown }
  catch (cause) { throw new TypeError(`Progression asset ${row.kind} is not valid UTF-8 JSON`, { cause }) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`Invalid progression ${row.kind} payload`)
  const asset = value as Partial<ProgressionAsset>
  if (asset.version !== PROGRESSION_SNAPSHOT_VERSION || asset.kind !== row.kind || asset.order !== row.order) throw new TypeError(`Progression asset ${row.kind} does not match its manifest`)
  const count = asset.kind === 'missions'
    ? Array.isArray(asset.value?.definitions) ? asset.value.definitions.length : -1
    : Array.isArray((asset as Partial<Extract<ProgressionAsset, { kind: 'episodes' | 'journeys' }>>).items)
      ? (asset as Extract<ProgressionAsset, { kind: 'episodes' | 'journeys' }>).items.length : -1
  if (count !== row.count) throw new TypeError(`Progression asset ${row.kind} has an unexpected row count`)
  return asset as ProgressionAsset
}

/** Load every shard, validate the whole catalogue, then publish one pointer. Failed attempts cache nothing. */
export function loadProgressionAssets(reader: ProgressionAssetReader | undefined = readAsset): Promise<void> {
  if (progressionReady()) return Promise.resolve()
  if (!reader) return Promise.reject(Object.assign(new Error('progression_content_unavailable'), { code: 'progression_content_unavailable', retryable: true }))
  loading ??= (async () => {
    const rows = [...PROGRESSION_CONTENT_ASSETS]
    const episodeRows = rows.filter(row => row.kind === 'episodes').sort((a, b) => a.order - b.order)
    if (!episodeRows.length || episodeRows.some((row, index) => row.order !== index)
      || rows.filter(row => row.kind === 'journeys').length !== 1 || rows.filter(row => row.kind === 'missions').length !== 1) throw new TypeError('Incomplete progression asset manifest')
    const assets = await Promise.all(rows.map(row => readRow(row, reader)))
    const episodes = assets.filter((asset): asset is Extract<ProgressionAsset, { kind: 'episodes' }> => asset.kind === 'episodes')
      .sort((a, b) => a.order - b.order).flatMap(asset => asset.items) as EpisodeDefinition[]
    const journeys = assets.find((asset): asset is Extract<ProgressionAsset, { kind: 'journeys' }> => asset.kind === 'journeys')
    const missions = assets.find((asset): asset is Extract<ProgressionAsset, { kind: 'missions' }> => asset.kind === 'missions')
    if (!journeys || !missions) throw new TypeError('Incomplete progression asset payload')
    installProgressionSnapshot({ version: 1, episodes, journeys: journeys.items as readonly JourneyDefinition[],
      acceptedCityIds: journeys.acceptedCityIds, acceptedCountryIds: journeys.acceptedCountryIds,
      missions: missions.value as ProgressionMissionSnapshot })
  })().catch(error => { loading = null; throw error })
  return loading
}
