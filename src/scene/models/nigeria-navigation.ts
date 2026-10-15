/** Fixed, zero-yaw batch001 placement. All exported distances are game units.
 * Source: allworld-assets 8d01a5b83ab23a64b621def4784ffd0c93684c81.
 * Host supplements below correct conservative sidecars against the pinned GLB triangles.
 * Near and far use identical navigation; this does not invent traversable interiors.
 */
import type { WalkRect } from '../walk-grid.ts';

export const NIGERIA_METRE_SCALE = 2.45 / 1.75;
type Solid = [number, number, number, number, number, number];
export interface NigeriaAnchor { x: number; y: number; z: number; ry: number }
export interface NigeriaNavigation {
  units: 'game';
  bounds: WalkRect;
  walkable: WalkRect[];
  block: WalkRect[];
  solids: Solid[];
  entrance: NigeriaAnchor;
  anchors: Record<string, NigeriaAnchor>;
  support: { rect: WalkRect; y: number }[];
  provenance: string[];
}

/** Exact rectangle-union complement. Block these cells, then collision; never clear over walls.
 * Adjacent strips are merged to keep walk-grid construction bounded for these small unions.
 */
export function rectangleUnionComplement(bounds: WalkRect, walkable: readonly WalkRect[]): WalkRect[] {
  const valid = (r: readonly number[]) => r.length === 4 && r.every(Number.isFinite) && r[0]! < r[2]! && r[1]! < r[3]!;
  if (!valid(bounds) || !walkable.every(valid)) throw new Error('Invalid navigation rectangle');
  const [x0, z0, x1, z1] = bounds;
  const clipped = walkable.map(([a,b,c,d]): WalkRect => [Math.max(x0,a),Math.max(z0,b),Math.min(x1,c),Math.min(z1,d)]).filter(valid);
  const xs = [...new Set([x0,x1,...clipped.flatMap(r=>[r[0],r[2]])])].sort((a,b)=>a-b);
  const zs = [...new Set([z0,z1,...clipped.flatMap(r=>[r[1],r[3]])])].sort((a,b)=>a-b);
  const result: WalkRect[] = [];
  for (let j=0;j<zs.length-1;j++) {
    let run: WalkRect | null = null;
    for (let i=0;i<xs.length-1;i++) {
      const a=xs[i]!, b=zs[j]!, c=xs[i+1]!, d=zs[j+1]!, x=(a+c)/2,z=(b+d)/2;
      const covered=clipped.some(r=>x>=r[0] && x<=r[2] && z>=r[1] && z<=r[3]);
      if (covered) { run=null; continue; }
      if (run) run[2]=c;
      else { run=[a,b,c,d]; result.push(run); }
    }
  }
  return result;
}
const rect = (r: WalkRect): WalkRect => r.map(v=>v*NIGERIA_METRE_SCALE) as WalkRect;
const anchor = (x: number,z: number,y=0,ry=0): NigeriaAnchor => ({x:x*NIGERIA_METRE_SCALE,y:y*NIGERIA_METRE_SCALE,z:z*NIGERIA_METRE_SCALE,ry});
const sidecarCollision = {"lagos-broad-street-01":[{"id":"rear-wall","min":[-9.5,0,-9.15],"max":[9.5,21,-8.85]},{"id":"end-wall--9.5","min":[-9.64,0,-9],"max":[-9.36,21,0]},{"id":"end-wall-9.5","min":[9.36,0,-9],"max":[9.64,21,0]},{"id":"column-0","min":[-9.625,0,-0.38],"max":[-9.375,21,0.26]},{"id":"column-1","min":[-6.458333333333334,0,-0.38],"max":[-6.208333333333334,21,0.26]},{"id":"column-2","min":[-3.291666666666667,0,-0.38],"max":[-3.041666666666667,21,0.26]},{"id":"column-3","min":[-0.125,0,-0.38],"max":[0.125,21,0.26]},{"id":"column-4","min":[3.041666666666666,0,-0.38],"max":[3.291666666666666,21,0.26]},{"id":"column-5","min":[6.208333333333334,0,-0.38],"max":[6.458333333333334,21,0.26]},{"id":"column-6","min":[9.375,0,-0.38],"max":[9.625,21,0.26]},{"id":"counter-0","min":[-9.175,0.185,-1.225],"max":[-6.825,1.235,-0.675]},{"id":"shop-rear-0","min":[-9.4,0,-4.575],"max":[-6.6,3.15,-4.425]},{"id":"jamb-0-0","min":[-9.475,0,-0.3],"max":[-9.325000000000001,3.1,0]},{"id":"jamb-0-1","min":[-6.675,0,-0.3],"max":[-6.5249999999999995,3.1,0]},{"id":"counter-1","min":[-6.2250000000000005,0.185,-1.225],"max":[-3.575,1.235,-0.675]},{"id":"shop-rear-1","min":[-6.45,0,-4.575],"max":[-3.3500000000000005,3.15,-4.425]},{"id":"jamb-1-0","min":[-6.525,0,-0.3],"max":[-6.375,3.1,0]},{"id":"jamb-1-1","min":[-3.4250000000000007,0,-0.3],"max":[-3.2750000000000004,3.1,0]},{"id":"counter-2","min":[-2.975,0.185,-1.225],"max":[-0.2250000000000001,1.235,-0.675]},{"id":"shop-rear-2","min":[-3.2,0,-4.575],"max":[0.0,3.15,-4.425]},{"id":"jamb-2-0","min":[-3.2750000000000004,0,-0.3],"max":[-3.125,3.1,0]},{"id":"jamb-2-1","min":[-0.075,0,-0.3],"max":[0.075,3.1,0]},{"id":"counter-3","min":[0.32499999999999996,0.185,-1.225],"max":[3.2749999999999995,1.235,-0.675]},{"id":"shop-rear-3","min":[0.09999999999999987,0,-4.575],"max":[3.5,3.15,-4.425]},{"id":"jamb-3-0","min":[0.02499999999999987,0,-0.3],"max":[0.17499999999999988,3.1,0]},{"id":"jamb-3-1","min":[3.425,0,-0.3],"max":[3.575,3.1,0]},{"id":"counter-4","min":[3.875,0.185,-1.225],"max":[6.725,1.235,-0.675]},{"id":"shop-rear-4","min":[3.65,0,-4.575],"max":[6.949999999999999,3.15,-4.425]},{"id":"jamb-4-0","min":[3.5749999999999997,0,-0.3],"max":[3.725,3.1,0]},{"id":"jamb-4-1","min":[6.874999999999999,0,-0.3],"max":[7.0249999999999995,3.1,0]},{"id":"counter-5","min":[7.2749999999999995,0.185,-1.225],"max":[8.924999999999999,1.235,-0.675]},{"id":"shop-rear-5","min":[7.05,0,-4.575],"max":[9.15,3.15,-4.425]},{"id":"jamb-5-0","min":[6.975,0,-0.3],"max":[7.125,3.1,0]},{"id":"jamb-5-1","min":[9.075000000000001,0,-0.3],"max":[9.225,3.1,0]}],"abuja-mosque-boulevard-01":[{"id":"mosque","min":[-25,0,-49],"max":[25,54,-1]},{"id":"office","min":[36,0,-46],"max":[54,26,-24]}]} as const;
function collision(id: keyof typeof sidecarCollision): Solid[] {
  return sidecarCollision[id].map(b=>[...b.min,...b.max].map(v=>v*NIGERIA_METRE_SCALE) as Solid);
}
function make(bounds: WalkRect, areas: WalkRect[], solids: Solid[], entrance: NigeriaAnchor, anchors: Record<string,NigeriaAnchor>, support: {rect: WalkRect;y:number}[], provenance: string[]): NigeriaNavigation {
  // WalkGrid rounds its dimensions upward; explicit outside walls block the partial edge cell
  // and keep the avatar radius on the declared supported surface.
  const [x0,z0,x1,z1]=bounds;
  const edges: WalkRect[]=[[x0-1,z0-1,x0,z1+1],[x1,z0-1,x1+1,z1+1],[x0-1,z0-1,x1+1,z0],[x0-1,z1,x1+1,z1+1]];
  return { units:'game',bounds,walkable:areas,solids,entrance,anchors,support,provenance,
    block:[...edges,...rectangleUnionComplement(bounds,areas),...solids.map((b): WalkRect=>[b[0],b[2],b[3],b[5]])] };
}
const lagosAreas=[rect([-9.2,.65,9.2,2.65])];
const lagosSolids=collision('lagos-broad-street-01');
// Pinned near GLB has a low furniture slab at the original entrance, absent from far and sidecar.
lagosSolids.push([-.1,.185,1.725,1.3,.79,2.475].map(v=>v*NIGERIA_METRE_SCALE) as Solid);
const lagosEntrance=anchor(-2,2,.185,Math.PI);
const abujaAreas=[rect([-54,25.5,54,30.5]),rect([-54,5.5,54,24]),rect([-54,0,54,4]),rect([-1.5,0,1.5,29])];
export const NIGERIA_BATCH001_NAVIGATION: Record<'lagos-broad-street-01'|'abuja-mosque-boulevard-01',NigeriaNavigation> = {
  'lagos-broad-street-01':make(rect([-9.2,.65,9.2,2.65]),lagosAreas,lagosSolids,lagosEntrance,{
    exit:lagosEntrance,'shop-approach':anchor(-1.6,1.1,.185),
    stalls:anchor(-8,1.1,.185,Math.PI),food:anchor(-4,1.1,.185,Math.PI),spice:anchor(0,1.1,.185,Math.PI),wholesale:anchor(4,1.1,.185,Math.PI),work:anchor(8,1.1,.185,Math.PI),
  },[{rect:rect([-9.2,.65,9.2,2.65]),y:.185*NIGERIA_METRE_SCALE}],[
    'Manifest a0549210b773233f63ea24145d72956415e47d3c0755a85e0dd8a58735c0ad1a; collision boxes copied exactly and scaled.',
    'Support top .185 metres from both GLBs. Arrival moved from obstructed (0,2) to clear (-2,2); furniture blocker applied to both tiers.',
    'Existing market action IDs mapped along exterior frontage. Sidecar authorizes sidewalk only; shops/upper floors remain scenery.',
  ]),
  'abuja-mosque-boulevard-01':make(rect([-54,0,54,30.5]),abujaAreas,collision('abuja-mosque-boulevard-01'),anchor(0,28),{
    'street-entry':anchor(0,28),'landmark-view':anchor(0,23),visit:anchor(0,23,0,Math.PI),work:anchor(4,28,0,Math.PI),
  },[...abujaAreas.map(r=>({rect:r,y:0})),{rect:rect([-54,14.2,54,15.8]),y:.18*NIGERIA_METRE_SCALE}],[
    'Manifest 15b2727c4d4ec0a3161676e53da8262b0a64231421e47c7b227df3da442466fa; collision boxes copied exactly and scaled.',
    'Northern sidewalk cropped from z=-2 to z=0 metres: unsupported strip excluded with clearance. Mosque remains blocked.',
    'Both tiers contain raised median z14.2..15.8 top .18 metres. Host must use declared support height and render matching fallback; no synthetic ramp or interior claimed.',
  ]),
};
/** Highest declared drawn support, null outside supported rectangles. Collision remains authoritative for movement. */
export function nigeriaSupportHeight(nav: NigeriaNavigation,x: number,z: number): number | null {
  if (!Number.isFinite(x)||!Number.isFinite(z)) return null;
  let y: number|null=null;
  for (const p of nav.support) if(x>=p.rect[0]&&x<=p.rect[2]&&z>=p.rect[1]&&z<=p.rect[3]) y=Math.max(y??-Infinity,p.y);
  return y;
}
