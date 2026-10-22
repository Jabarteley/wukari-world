/** Display-only road ribbons. Original vertices/footprints are never mutated.
 * Constant-width pieces have an exact segment-to-footprint clearance bound, so
 * their entire capsule (ribbon plus joins) lies outside the unchanged buildings.
 */
import { inside, segmentDistance, type Point, type Study } from './model.ts';
export interface RoadPiece { roadId:number; segment:number; a:Point; b:Point; halfWidth:number }
export interface RoadConflict { roadId:number; buildingId:number; segment:number; clearanceM:number; kind:'source-centerline'|'illustrative-width'; decision:string }
/** Shared endpoint widths taper only inward, retaining the exact capsule clearance bound. */
export function roadJoinWidths(pieces:RoadPiece[]){
 const widths=new Map<string,number>(),key=(id:number,p:Point)=>id+':'+p.x+','+p.z;
 for(const s of pieces)for(const p of [s.a,s.b]){const k=key(s.roadId,p);widths.set(k,Math.min(widths.get(k)??Infinity,s.halfWidth));}
 return (s:RoadPiece)=>({a:widths.get(key(s.roadId,s.a))??s.halfWidth,b:widths.get(key(s.roadId,s.b))??s.halfWidth});
}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
export function segmentClearance(a:Point,b:Point,c:Point,d:Point):number {
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b));
}
export function footprintClearance(a:Point,b:Point,ring:Point[]):number {
  if(inside(a,ring)||inside(b,ring))return 0;
  let distance=Infinity;
  for(let i=1;i<ring.length;i++)distance=Math.min(distance,segmentClearance(a,b,ring[i-1]!,ring[i]!));
  return distance;
}
export function roadSurfaces(study:Pick<Study,'roads'|'buildings'>):{pieces:RoadPiece[];conflicts:RoadConflict[]} {
  const boxes=study.buildings.map(b=>({b,minX:Math.min(...b.points.map(p=>p.x)),maxX:Math.max(...b.points.map(p=>p.x)),minZ:Math.min(...b.points.map(p=>p.z)),maxZ:Math.max(...b.points.map(p=>p.z))}));
  const pieces:RoadPiece[]=[],conflicts:RoadConflict[]=[];
  for(const road of study.roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1]!,b=road.points[i]!,nominal=['path','footway'].includes(road.tags.highway??'')?1:2.5;
    const near=boxes.filter(q=>q.maxX>=Math.min(a.x,b.x)-nominal&&q.minX<=Math.max(a.x,b.x)+nominal&&q.maxZ>=Math.min(a.z,b.z)-nominal&&q.minZ<=Math.max(a.z,b.z)+nominal);
    for(const {b:building} of near){const distance=footprintClearance(a,b,building.points);if(distance<nominal+.05)conflicts.push({roadId:road.id,buildingId:building.id,segment:i-1,clearanceM:distance,kind:distance<1e-6?'source-centerline':'illustrative-width',decision:distance<1e-6?'Suppress conflicting surface intervals; original record retained for review.':'Narrow illustrative surface within exact building clearance; centerline unchanged.'});}
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/4));
    const at=(t:number):Point=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
    for(let k=0;k<steps;k++){
      const start=at(k/steps),end=at((k+1)/steps);
      const clearance=Math.min(nominal+.05,...near.map(q=>footprintClearance(start,end,q.b.points)));
      const halfWidth=Math.max(0,Math.min(nominal,clearance-.05));
      // Tiny fragments are not presented as a usable road surface.
      if(halfWidth>=.12)pieces.push({roadId:road.id,segment:i-1,a:start,b:end,halfWidth});
    }
  }
  return {pieces,conflicts};
}
