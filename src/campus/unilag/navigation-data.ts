import type { MetreBounds, MetreRing } from './geo.ts'
import type { CampusAnchor, CampusZone } from './layout.ts'

export interface CampusNavigationRoad { readonly id: string; readonly width: number; readonly points: readonly (readonly [x: number, z: number])[] }
export interface CampusNavigationEntrance { readonly x: number; readonly y: number; readonly z: number; readonly ry: number; readonly zone: string }
export interface CampusNavigationData {
  readonly bounds: MetreBounds
  readonly boundary: MetreRing
  readonly blockedRings: readonly MetreRing[]
  readonly buildingRingCount: number
  readonly treeCells: readonly number[]
  readonly roads: readonly CampusNavigationRoad[]
  readonly anchors: readonly CampusAnchor[]
  readonly zones: readonly CampusZone[]
  readonly entrance: CampusNavigationEntrance
}

export const CAMPUS_NAVIGATION_CELL = 2
export const CAMPUS_NAVIGATION_RADIUS = .4

export function campusNavigationGridDimensions(bounds: MetreBounds): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.ceil((bounds[2] - bounds[0]) / CAMPUS_NAVIGATION_CELL)),
    rows: Math.max(1, Math.ceil((bounds[3] - bounds[1]) / CAMPUS_NAVIGATION_CELL)),
  }
}

export function validateCampusNavigationTreeCells(bounds: MetreBounds, cells: readonly number[]): void {
  const { cols, rows } = campusNavigationGridDimensions(bounds)
  let previous = -1
  for (const index of cells) {
    if (!Number.isInteger(index) || index <= previous || index >= cols * rows) throw new Error('Campus navigation tree cells must be sorted, unique and in range')
    previous = index
  }
}
