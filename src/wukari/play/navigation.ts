import {gateFootprints} from './entrance-layout.ts';
import { buildingCollision, inside, permittedForSimulation, segmentDistance, type Point, type Study } from './model.ts';

/** Read-only broad phase; exact predicates and source coordinates stay authoritative. */
export function navigation(study: Study,roofExtra=0) {
  const size=16,gateWalls=gateFootprints(study).map(points=>({points}));
  function grid<T>(items:T[],bounds:(item:T)=>{minX:number;maxX:number;minZ:number;maxZ:number}){
    const cells=new Map<string,T[]>();
    for(const item of items){const b=bounds(item);for(let x=Math.floor(b.minX/size);x<=Math.floor(b.maxX/size);x++)for(let z=Math.floor(b.minZ/size);z<=Math.floor(b.maxZ/size);z++){const key=x+','+z,cell=cells.get(key)??[];cell.push(item);cells.set(key,cell);}}
    return cells;
  }
  const buildings=grid(study.buildings,b=>({minX:Math.min(...b.points.map(p=>p.x))-.4,maxX:Math.max(...b.points.map(p=>p.x))+.4,minZ:Math.min(...b.points.map(p=>p.z))-.4,maxZ:Math.max(...b.points.map(p=>p.z))+.4}));
  const eligible=new Set(study.roads.filter(r=>permittedForSimulation(r.tags)).map(r=>r.id));
  const surfaces=grid((study.roadSurface??[]).filter(s=>eligible.has(s.roadId)),s=>({minX:Math.min(s.a.x,s.b.x)-s.halfWidth,maxX:Math.max(s.a.x,s.b.x)+s.halfWidth,minZ:Math.min(s.a.z,s.b.z)-s.halfWidth,maxZ:Math.max(s.a.z,s.b.z)+s.halfWidth}));
  const key=(p:Point)=>Math.floor(p.x/size)+','+Math.floor(p.z/size);
  const walk=grid((study.pedestrians?.pieces??[]).filter(s=>s.component===study.pedestrians?.component),s=>({minX:Math.min(s.a.x,s.b.x)-s.halfWidth,maxX:Math.max(s.a.x,s.b.x)+s.halfWidth,minZ:Math.min(s.a.z,s.b.z)-s.halfWidth,maxZ:Math.max(s.a.z,s.b.z)+s.halfWidth}));
  function canStand(p:Point){
    if(Math.abs(p.x)>study.halfSize-2||Math.abs(p.z)>study.halfSize-2||buildingCollision(p,buildings.get(key(p))??[])||buildingCollision(p,gateWalls))return false;
    if(study.pedestrians)return (walk.get(key(p))??[]).some(s=>segmentDistance(p,s.a,s.b)<=s.halfWidth-.35);
    if(study.roadSurface)return (surfaces.get(key(p))??[]).some(s=>segmentDistance(p,s.a,s.b)<=Math.min(2,s.halfWidth-.4));
    return study.roads.some(r=>eligible.has(r.id)&&r.points.some((b,i)=>i>0&&segmentDistance(p,r.points[i-1]!,b)<=2));
  }
  const visited=new Set<Study['buildings'][number]>();
  /** Exact vertical extrusion side intersections; upward follow arm starts outside buildings. */
  function cameraDistance(origin:Point&{y:number},offset:Point&{y:number}){
    visited.clear();let fraction=1;
    for(let x=Math.floor(Math.min(origin.x,origin.x+offset.x)/size);x<=Math.floor(Math.max(origin.x,origin.x+offset.x)/size);x++)for(let z=Math.floor(Math.min(origin.z,origin.z+offset.z)/size);z<=Math.floor(Math.max(origin.z,origin.z+offset.z)/size);z++){
      for(const b of buildings.get(x+','+z)??[]){if(visited.has(b))continue;visited.add(b);
        const raw=Number(b.tags.height?.replace(/\s*m$/,'')),height=Number.isFinite(raw)&&raw>=2&&raw<=60?raw+roofExtra:(study.entrance?.contextBuilding?.id===b.id?study.entrance.contextBuilding.height:3.6)+roofExtra;
        const roofT=(height-origin.y)/offset.y;if(roofT>=0&&roofT<fraction&&inside({x:origin.x+offset.x*roofT,z:origin.z+offset.z*roofT},b.points))fraction=roofT;
        for(let i=1;i<b.points.length;i++){const a=b.points[i-1]!,v=b.points[i]!,dx=v.x-a.x,dz=v.z-a.z,den=offset.x*dz-offset.z*dx;if(Math.abs(den)<1e-10)continue;
          const ax=a.x-origin.x,az=a.z-origin.z,t=(ax*dz-az*dx)/den,u=(ax*offset.z-az*offset.x)/den;
          if(t>=0&&t<fraction&&u>=0&&u<=1&&origin.y+offset.y*t<=height)fraction=t;
        }
      }
    }
    return fraction*Math.hypot(offset.x,offset.y,offset.z);
  }
  const crossing=(p:Point)=>(walk.get(key(p))??[]).some(s=>s.kind==='crossing'&&segmentDistance(p,s.a,s.b)<=s.halfWidth-.35);
  const onVehicleRoad=(p:Point)=>(surfaces.get(key(p))??[]).some(s=>segmentDistance(p,s.a,s.b)<=s.halfWidth+.4);
  return {canStand,cameraDistance,crossing,onVehicleRoad};
}
