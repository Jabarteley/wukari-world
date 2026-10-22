/** Original zebra paint inside reviewed virtual crossings; not mapped real infrastructure. */
import {segmentDistance,type Point,type Study} from './model.ts';
import {roadJoinWidths} from './roads.ts';
export interface Zebra {a:Point;b:Point;roadId:number;bars:Point[][];illustrative:true}
export function zebraCrossings(study:Study):Zebra[]{
 const surfaces=study.roadSurface??[],joined=roadJoinWidths(surfaces),widths=new Map(surfaces.map(s=>[s,Math.min(joined(s).a,joined(s).b)]));
 const cells=new Map<string,typeof surfaces>();for(const s of surfaces)for(let x=Math.floor((Math.min(s.a.x,s.b.x)-4)/16);x<=Math.floor((Math.max(s.a.x,s.b.x)+4)/16);x++)for(let z=Math.floor((Math.min(s.a.z,s.b.z)-4)/16);z<=Math.floor((Math.max(s.a.z,s.b.z)+4)/16);z++){const k=x+','+z,list=cells.get(k)??[];list.push(s);cells.set(k,list);}
 const result:Zebra[]=[],spawn=study.spawn?.point??{x:0,z:0};
 const routes=(study.pedestrians?.pieces??[]).filter(p=>p.kind==='crossing'&&p.component===study.pedestrians?.component).sort((a,b)=>segmentDistance(spawn,a.a,a.b)-segmentDistance(spawn,b.a,b.b));
 for(const p of routes){const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,len=Math.hypot(dx,dz);if(len<3)continue;const ux=dx/len,uz=dz/len,nx=-uz*.72,nz=ux*.72,bars:Point[][]=[];let roadId:number|undefined;
  for(let d=.4;d<len-.3;d+=.72){const mid={x:p.a.x+ux*d,z:p.a.z+uz*d},near=cells.get(Math.floor(mid.x/16)+','+Math.floor(mid.z/16))??[];
   const bar=[{x:mid.x-ux*.17+nx,z:mid.z-uz*.17+nz},{x:mid.x-ux*.17-nx,z:mid.z-uz*.17-nz},{x:mid.x+ux*.17-nx,z:mid.z+uz*.17-nz},{x:mid.x+ux*.17+nx,z:mid.z+uz*.17+nz}];
   const surface=near.find(s=>s.halfWidth>=1.2&&bar.every(q=>segmentDistance(q,s.a,s.b)<widths.get(s)!-.035));
   if(surface){bars.push(bar);roadId=surface.roadId;}
  }
  if(bars.length<3||roadId===undefined)continue;
  const center=bars[Math.floor(bars.length/2)]!.reduce((a,v)=>({x:a.x+v.x/4,z:a.z+v.z/4}),{x:0,z:0});
  // A junction can have many network connectors; never stack duplicate painted crossings.
  if(result.some(q=>segmentDistance(center,q.a,q.b)<8))continue;
  result.push({a:p.a,b:p.b,roadId,bars,illustrative:true});
 }
 return result;
}
