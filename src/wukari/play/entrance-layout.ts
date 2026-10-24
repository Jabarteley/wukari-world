/** Photo-guided proportions, not surveyed architecture. All dimensions are virtual metres. */
import type {Point,Study} from './model.ts';
export const gateDesign={vehicleHalfWidth:3.55,clearHeight:4.85,pedestrianInner:4.35,pedestrianOuter:6.25,outerHalfWidth:7.25,depth:3.2,height:6.5,walkOffset:5.3} as const;
export function gateWorld(study:Study,p:Point):Point {const e=study.entrance!,c=Math.cos(e.yaw),s=Math.sin(e.yaw);return {x:e.point.x+p.x*c+p.z*s,z:e.point.z-p.x*s+p.z*c};}
export function gateLocal(study:Study,p:Point):Point {const e=study.entrance!,c=Math.cos(e.yaw),s=Math.sin(e.yaw),x=p.x-e.point.x,z=p.z-e.point.z;return {x:x*c-z*s,z:x*s+z*c};}
export function gateFootprints(study:Study):Point[][]{if(!study.entrance||study.entrance.design!=='photo-guided')return [];const rings:Point[][]=[];for(const sign of [-1,1])for(const [lo,hi]of [[3.55,4.35],[6.25,7.25]]){const ring=[{x:sign*lo!,z:-1.6},{x:sign*hi!,z:-1.6},{x:sign*hi!,z:1.6},{x:sign*lo!,z:1.6}];rings.push([...ring,ring[0]!].map(p=>gateWorld(study,p)));}return rings;}
