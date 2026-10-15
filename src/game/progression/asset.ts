import type { ProgressionMissionSnapshot } from './provider.ts'
import type { EpisodeDefinition } from '../../types/episodes.ts'
import type { JourneyDefinition } from '../../types/journeys.ts'

export type ProgressionAssetKind = 'episodes' | 'journeys' | 'missions'
export interface ProgressionAssetManifestRow {
  readonly kind: ProgressionAssetKind
  readonly order: number
  readonly path: string
  readonly sha256: string
  readonly bytes: number
  readonly count: number
}
export interface EpisodeProgressionAsset { readonly version: 1; readonly kind: 'episodes'; readonly order: number; readonly items: readonly EpisodeDefinition[] }
export interface JourneyProgressionAsset {
  readonly version: 1; readonly kind: 'journeys'; readonly order: 0
  readonly items: readonly JourneyDefinition[]
  readonly acceptedCityIds: readonly string[]
  readonly acceptedCountryIds: readonly string[]
}
export interface MissionProgressionAsset { readonly version: 1; readonly kind: 'missions'; readonly order: 0; readonly value: ProgressionMissionSnapshot }
export type ProgressionAsset = EpisodeProgressionAsset | JourneyProgressionAsset | MissionProgressionAsset
export type ProgressionAssetReader = (path: string) => Promise<Uint8Array>
