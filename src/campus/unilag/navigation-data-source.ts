import { CAMPUS_MAP } from './map.generated.ts'
import { ANCHORS, ENTRANCE, ZONES } from './layout.ts'
import { CAMPUS_TREES } from './landscape.ts'
import type { CampusNavigationData } from './navigation-data.ts'

export const CAMPUS_NAVIGATION_DATA: CampusNavigationData = {
  bounds: CAMPUS_MAP.bounds,
  boundary: CAMPUS_MAP.boundary,
  blockedRings: [
    ...CAMPUS_MAP.buildings.map(building => building.ring),
    ...CAMPUS_MAP.surfaces.filter(surface => surface.kind === 'water' || surface.kind === 'wetland' || surface.kind === 'pool').map(surface => surface.ring),
  ],
  buildingRingCount: CAMPUS_MAP.buildings.length,
  trees: CAMPUS_TREES.map(tree => [tree.x, tree.z, tree.size]),
  roads: CAMPUS_MAP.roads.map(road => ({ id: road.id, width: road.width, points: road.points })),
  anchors: Object.values(ANCHORS),
  zones: ZONES,
  entrance: ENTRANCE,
}
