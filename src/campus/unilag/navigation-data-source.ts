import { CAMPUS_MAP } from './map.generated.ts'
import { ANCHORS, ENTRANCE, ZONES } from './layout.ts'
import { CAMPUS_TREES } from './landscape.ts'
import { createWalkGrid } from '../../scene/walk-grid.ts'
import type { WalkCircle } from '../../scene/walk-grid.ts'
import { CAMPUS_NAVIGATION_CELL, CAMPUS_NAVIGATION_RADIUS, campusNavigationGridDimensions, validateCampusNavigationTreeCells } from './navigation-data.ts'
import type { CampusNavigationData } from './navigation-data.ts'

const treeGrid = createWalkGrid({
  bounds: [...CAMPUS_MAP.bounds],
  block: CAMPUS_TREES.map((tree): WalkCircle => [tree.x, tree.z, .45 * tree.size]),
  cell: CAMPUS_NAVIGATION_CELL,
  radius: CAMPUS_NAVIGATION_RADIUS,
})
const [minX, minZ] = treeGrid.bounds
for (const tree of CAMPUS_TREES) {
  const column = Math.floor((tree.x - minX) / treeGrid.cell), row = Math.floor((tree.z - minZ) / treeGrid.cell)
  if (column >= 0 && row >= 0 && column < treeGrid.cols && row < treeGrid.rows) treeGrid.cells[row * treeGrid.cols + column] = 1
}
const treeCells: number[] = []
for (let index = 0; index < treeGrid.cells.length; index++) if (treeGrid.cells[index]) treeCells.push(index)
const dimensions = campusNavigationGridDimensions(CAMPUS_MAP.bounds)
if (treeGrid.cols !== dimensions.cols || treeGrid.rows !== dimensions.rows) throw new Error('Campus navigation tree grid dimensions differ')
validateCampusNavigationTreeCells(CAMPUS_MAP.bounds, treeCells)

export const CAMPUS_NAVIGATION_DATA: CampusNavigationData = {
  bounds: CAMPUS_MAP.bounds,
  boundary: CAMPUS_MAP.boundary,
  blockedRings: [
    ...CAMPUS_MAP.buildings.map(building => building.ring),
    ...CAMPUS_MAP.surfaces.filter(surface => surface.kind === 'water' || surface.kind === 'wetland' || surface.kind === 'pool').map(surface => surface.ring),
  ],
  buildingRingCount: CAMPUS_MAP.buildings.length,
  treeCells,
  roads: CAMPUS_MAP.roads.map(road => ({ id: road.id, width: road.width, points: road.points })),
  anchors: Object.values(ANCHORS),
  zones: ZONES,
  entrance: ENTRANCE,
}
