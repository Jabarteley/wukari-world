import type { MetreBounds, MetreRing } from './geo.ts'
import type { CampusAnchor, CampusZone } from './layout.ts'

export type CampusNavigationTree = readonly [x: number, z: number, size: number]
export interface CampusNavigationRoad { readonly id: string; readonly width: number; readonly points: readonly (readonly [x: number, z: number])[] }
export interface CampusNavigationEntrance { readonly x: number; readonly y: number; readonly z: number; readonly ry: number; readonly zone: string }
export interface CampusNavigationData {
  readonly bounds: MetreBounds
  readonly boundary: MetreRing
  readonly blockedRings: readonly MetreRing[]
  readonly buildingRingCount: number
  readonly trees: readonly CampusNavigationTree[]
  readonly roads: readonly CampusNavigationRoad[]
  readonly anchors: readonly CampusAnchor[]
  readonly zones: readonly CampusZone[]
  readonly entrance: CampusNavigationEntrance
}
