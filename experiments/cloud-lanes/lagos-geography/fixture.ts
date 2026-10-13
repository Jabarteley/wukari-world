import type { AdapterConfig, AssetSpec, LocalPoint } from './adapter.ts'

export const BASELINE = '81d9f599d87dfb34adf49cd9337a0b05678e5e0d'
export const COORDINATOR = '844da27a549d30c5148c1cb5b5927b7d0f5bfde6'
export const PROPOSAL_ID = 'yaba-game-anchor-200m-proposal-v1'
/** Existing approximate game anchor, NOT independently located, observed or surveyed here. */
export const CONFIG: AdapterConfig = {
  anchor: { frame: 'lonlat-degrees', lon: 3.382, lat: 6.5075 },
  scene: { unitsPerMetre: 1, yawRadians: 0, translation: { x: 0, y: 0, z: 0 } },
}
export const point = (east: number, north: number, up = 0): LocalPoint => ({ frame: 'block-local-metres', east, north, up })
/** Closed ring, counter-clockwise in east/north; original authoring AOI, not a real parcel. */
export const PROPOSED_BOUNDARY = [point(-100, -100), point(100, -100), point(100, 100), point(-100, 100), point(-100, -100)]
export interface SyntheticFeature {
  id: string; label: string; ground: LocalPoint; headingDegrees: number
  footprintMetres: { width: number; depth: number }
  height: { nominalMetres: number; scenarioRangeMetres: [number, number]; realWorldErrorBoundMetres: null; method: 'synthetic-assumption'; confidence: 'not-measured' }
  asset: AssetSpec
}
const height = (nominalMetres: number, scenarioRangeMetres: [number, number]): SyntheticFeature['height'] => ({
  nominalMetres, scenarioRangeMetres, realWorldErrorBoundMetres: null, method: 'synthetic-assumption', confidence: 'not-measured',
})
// No correspondence to existing buildings/roads/trees is asserted. Keys do not resolve runtime assets.
export const SYNTHETIC_FEATURES: readonly SyntheticFeature[] = [
  { id: 'synthetic-building-a', label: 'Synthetic massing A', ground: point(-32, 24), headingDegrees: 90,
    footprintMetres: { width: 14, depth: 18 }, height: height(8, [5, 12]),
    asset: { near: 'synthetic:massing-a', far: 'synthetic:massing-a-far', metresPerModelUnit: 1, groundAnchorModel: { x: 0, y: 0, z: 0 }, forward: '+z' } },
  { id: 'synthetic-building-b', label: 'Synthetic massing B with nonzero pivot', ground: point(35, -28, 0.4), headingDegrees: 210,
    footprintMetres: { width: 12, depth: 16 }, height: height(5, [3, 9]),
    asset: { near: 'synthetic:massing-b', far: 'synthetic:massing-b-far', metresPerModelUnit: 0.01, groundAnchorModel: { x: 50, y: -100, z: 75 }, forward: '+z' } },
  { id: 'synthetic-prop-a', label: 'Synthetic placement marker', ground: point(4, 62, 0.15), headingDegrees: 0,
    footprintMetres: { width: 0.6, depth: 0.6 }, height: height(4, [2, 6]),
    asset: { near: 'synthetic:marker-a', metresPerModelUnit: 1, groundAnchorModel: { x: 0, y: 0, z: 0 }, forward: '+z' } },
]
