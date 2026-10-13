import type { WalkCircle, WalkGrid, WalkPoint, WalkRect } from '../../scene/walk-grid.ts';
import type { CampusBuilding } from './layout.ts';
import { createGeographicCampusWalk } from './navigation.ts';
import type { CampusWalk } from './navigation.ts';

export type { WalkCircle, WalkGrid, WalkPoint, WalkRect, CampusWalk };
export interface PortalHop { zone:string; portal:import('./layout.ts').Portal }

/** Legacy rectangle view for consumers that have not yet adopted map polygons. */
export function footprintOf(building:CampusBuilding):WalkRect[]{
  if(building.kind==='open-space'||building.kind==='gate'||building.w<=0||building.d<=0)return [];
  return [[building.x-building.w/2,building.z-building.d/2,building.x+building.w/2,building.z+building.d/2]];
}

let shared:CampusWalk|undefined;
/** Without extra footprints the campus has one walk model (grid and routes) for the scene, the shuttle and the host to share. */
export function createCampusWalk(extraFootprints:Record<string,Array<WalkRect|WalkCircle>>={}):CampusWalk{
  if(Object.keys(extraFootprints).length)return createGeographicCampusWalk(extraFootprints);
  return shared??=createGeographicCampusWalk();
}
