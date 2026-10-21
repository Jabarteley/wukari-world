import {inside,buildingCollision,type Study,type Point} from './model.ts';
import {footprintClearance} from './roads.ts';
export const vehicleKinds=['motorcycle','car','suv','truck','trailer'] as const;
export type VehicleKind=typeof vehicleKinds[number];
export const vehicleSize={motorcycle:[.65,1.9],car:[1.45,3.4],suv:[1.65,3.9],truck:[1.8,5.4],trailer:[2,8.5]} satisfies Record<VehicleKind,number[]>;
export interface Edge {a:Point;b:Point;from:number;to:number;roadId:number;segment:number;length:number;width:number}
export interface Vehicle extends Point {id:number;kind:VehicleKind;edge:Edge;t:number;yaw:number;speed:number;distance:number;age:number;stopped:number;alpha:number;turns:number}
export function trafficGraph(study:Study){
 const widths=new Map<string,{min:number;length:number}>();for(const p of study.roadSurface??[]){const key=p.roadId+'/'+p.segment,q=widths.get(key)??{min:Infinity,length:0};q.min=Math.min(q.min,p.halfWidth);q.length+=Math.hypot(p.b.x-p.a.x,p.b.z-p.a.z);widths.set(key,q);}
 const edges:Edge[]=[],adjacency=new Map<number,Edge[]>();
 for(const road of study.roads){const t=road.tags;if(!['residential','service','living_street','primary','secondary','tertiary','unclassified'].includes(t.highway??'')||['no','private','permit','military'].includes(t.access??'')||['no','private'].includes(t.motor_vehicle??'')||t.bridge||t.tunnel||t.ford||t.construction)continue;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1]!,b=road.points[i]!,length=Math.hypot(b.x-a.x,b.z-a.z),w=widths.get(road.id+'/'+(i-1));if(!w||w.length<length-.01||w.min<.6||length<3)continue;
   const base={a,b,from:road.nodes[i-1]!,to:road.nodes[i]!,roadId:road.id,segment:i-1,length,width:w.min};if(t.oneway!=='-1')edges.push(base);if(t.oneway!=='yes'&&t.oneway!=='1'&&t.junction!=='roundabout')edges.push({...base,a:b,b:a,from:base.to,to:base.from});
  }
 }
 for(const edge of edges){const list=adjacency.get(edge.from)??[];list.push(edge);adjacency.set(edge.from,list);}return {edges,adjacency};
}
export function vehicleRing(v:Pick<Vehicle,'x'|'z'|'yaw'|'kind'>){const [width,length]=vehicleSize[v.kind],s=Math.sin(v.yaw),c=Math.cos(v.yaw);const ring=[[-width!/2,-length!/2],[width!/2,-length!/2],[width!/2,length!/2],[-width!/2,length!/2]].map(([x,z])=>({x:v.x+x!*c+z!*s,z:v.z-x!*s+z!*c}));return [...ring,ring[0]!];}
export function trafficSimulation(study:Study){
 const graph=trafficGraph(study),vehicles:Vehicle[]=[],boxes=study.buildings.map(b=>({b,minX:Math.min(...b.points.map(p=>p.x)),maxX:Math.max(...b.points.map(p=>p.x)),minZ:Math.min(...b.points.map(p=>p.z)),maxZ:Math.max(...b.points.map(p=>p.z))}));let serial=0,seed=931,spawnClock=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function clear(v:Pick<Vehicle,'x'|'z'|'yaw'|'kind'>){const ring=vehicleRing(v),[width,length]=vehicleSize[v.kind],radius=Math.hypot(width!,length!)/2+.1;for(const q of boxes){if(q.minX>v.x+radius||q.maxX<v.x-radius||q.minZ>v.z+radius||q.maxZ<v.z-radius)continue;if(ring.some(p=>inside(p,q.b.points))||q.b.points.some(p=>inside(p,ring)))return false;for(let i=1;i<ring.length;i++)if(footprintClearance(ring[i-1]!,ring[i]!,q.b.points)<.08)return false;}return true;}
 function blocks(p:Point,margin=.45){return vehicles.some(v=>{if(v.alpha<.1)return false;const dx=p.x-v.x,dz=p.z-v.z,c=Math.cos(v.yaw),s=Math.sin(v.yaw),[w,l]=vehicleSize[v.kind];return Math.abs(dx*c-dz*s)<w!/2+margin&&Math.abs(dx*s+dz*c)<l!/2+margin;});}
 function spawn(player:Point){const order:VehicleKind[]=['motorcycle','motorcycle','car','motorcycle','suv','motorcycle','truck','motorcycle','trailer','motorcycle','car','motorcycle'];const kind=order[serial%order.length]!,[width,length]=vehicleSize[kind];
  const intro=serial===0?[...graph.edges].filter(e=>(e.b.z-e.a.z)>0).sort((a,b)=>Math.hypot((a.a.x+a.b.x)/2-player.x,(a.a.z+a.b.z)/2-player.z+55)-Math.hypot((b.a.x+b.b.x)/2-player.x,(b.a.z+b.b.z)/2-player.z+55)):[];
  for(let i=0;i<100;i++){const edge=serial===0?intro[i]:graph.edges[Math.floor(random()*graph.edges.length)];if(!edge||edge.width<width!/2+.25||edge.length<length!+3)continue;const t=serial===0?Math.max(.05,Math.min(.95,((player.x-edge.a.x)*(edge.b.x-edge.a.x)+(player.z-55-edge.a.z)*(edge.b.z-edge.a.z))/(edge.length*edge.length))):.25+random()*.5,x=edge.a.x+(edge.b.x-edge.a.x)*t,z=edge.a.z+(edge.b.z-edge.a.z)*t,d=Math.hypot(x-player.x,z-player.z);if(d<35||d>180||Math.abs(x)>study.halfSize-10||Math.abs(z)>study.halfSize-10)continue;const candidate:Vehicle={id:serial,kind,edge,t,x,z,yaw:Math.atan2(edge.b.x-edge.a.x,edge.b.z-edge.a.z),speed:0,distance:0,age:0,stopped:0,alpha:0,turns:0};if(!clear(candidate)||vehicles.some(v=>Math.hypot(v.x-x,v.z-z)<(vehicleSize[v.kind][1]!+length!)/2+5))continue;serial++;vehicles.push(candidate);return;}
 }
 function step(dt:number,player:Point,density:number){dt=Math.min(.05,Math.max(0,dt));spawnClock+=dt;if(density>vehicles.length&&spawnClock>.3){spawnClock=0;spawn(player);}for(const [vehicleIndex,v] of vehicles.entries()){v.age+=dt;const playerDistance=Math.hypot(v.x-player.x,v.z-player.z);const retire=(v.stopped>18&&playerDistance>45)||(vehicleIndex>=density&&(playerDistance>35||density===0));const opacity=retire?0:Math.min(1,v.age/1.5)*Math.min(1,Math.max(0,(240-playerDistance)/25));v.alpha+=Math.max(-dt/1.5,Math.min(dt/1.5,opacity-v.alpha));
   const remaining=(1-v.t)*v.edge.length,target=remaining<vehicleSize[v.kind][1]!+5?2:v.kind==='motorcycle'?6:v.kind==='trailer'?4:5;v.speed=Math.min(target,v.speed+dt*1.4);let travel=v.speed*dt,blocked=false;
   while(travel>1e-6){const amount=Math.min(.1,travel,Math.max(0,(1-v.t)*v.edge.length));if(amount<1e-6){const choices=(graph.adjacency.get(v.edge.to)??[]).filter(e=>e.width>=vehicleSize[v.kind][0]!/2+.25&&e.to!==v.edge.from&&((e.b.x-e.a.x)*Math.sin(v.yaw)+(e.b.z-e.a.z)*Math.cos(v.yaw))/e.length>(v.kind==='trailer'?.65:-.65));if(!choices.length){blocked=true;break;}const next=choices[Math.floor(random()*choices.length)]!;v.edge=next;v.t=0;v.turns++;continue;}
    const t=v.t+amount/v.edge.length,x=v.edge.a.x+(v.edge.b.x-v.edge.a.x)*t,z=v.edge.a.z+(v.edge.b.z-v.edge.a.z)*t,desired=Math.atan2(v.edge.b.x-v.edge.a.x,v.edge.b.z-v.edge.a.z),turn=Math.atan2(Math.sin(desired-v.yaw),Math.cos(desired-v.yaw)),yaw=v.yaw+turn*Math.min(1,dt*5),candidate={...v,x,z,yaw};const gap=(vehicleSize[v.kind][1]!)/2+1.3;
    if(Math.hypot(x-player.x,z-player.z)<gap||vehicles.some(o=>o!==v&&Math.hypot(o.x-x,o.z-z)<(vehicleSize[o.kind][1]!+vehicleSize[v.kind][1]!)/2+1)||!clear(candidate)){blocked=true;break;}
    v.x=x;v.z=z;v.yaw=yaw;v.t=t;v.distance+=amount;travel-=amount;
   }
   if(blocked){v.speed=0;v.stopped+=dt;}else v.stopped=0;
  }
  for(let i=vehicles.length-1;i>=0;i--){const v=vehicles[i]!,d=Math.hypot(v.x-player.x,v.z-player.z);if(v.age>2&&v.alpha<=.001&&(d>215||(v.stopped>18&&d>45)||vehicles.length>density))vehicles.splice(i,1);}
 }
 return {vehicles,graph,step,clear,blocks};
}
