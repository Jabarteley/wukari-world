/** Conservative virtual walking space. Offsets are illustrative, never surveyed sidewalks. */
import {buildingCollision, segmentDistance, type Point, type Study} from './model.ts';
import {footprintClearance, segmentClearance} from './roads.ts';
export interface WalkPiece {a:Point;b:Point;roadId:number;kind:'mapped-path'|'illustrative-corridor'|'crossing';halfWidth:number;component?:number}
export interface PedestrianNetwork {pieces:WalkPiece[];spawn:Point|null;component:number;rejected:number;lengthM:number;policy:string}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(p:Point)=>p.x.toFixed(4)+','+p.z.toFixed(4);
export function pedestrianNetwork(study:Study):PedestrianNetwork {
  const pieces:WalkPiece[]=[], radius=.85;let rejected=0;
  const obstacles=study.obstacles??[];
  const surfaces=study.roadSurface??[];
  const surfaceCells=new Map<string,typeof surfaces>();
  for(const s of surfaces)for(let x=Math.floor((Math.min(s.a.x,s.b.x)-s.halfWidth-2)/16);x<=Math.floor((Math.max(s.a.x,s.b.x)+s.halfWidth+2)/16);x++)for(let z=Math.floor((Math.min(s.a.z,s.b.z)-s.halfWidth-2)/16);z<=Math.floor((Math.max(s.a.z,s.b.z)+s.halfWidth+2)/16);z++){const k=x+','+z,list=surfaceCells.get(k)??[];list.push(s);surfaceCells.set(k,list);}
  function nearSurfaces(a:Point,b:Point){const result=new Set<(typeof surfaces)[number]>();for(let x=Math.floor(Math.min(a.x,b.x)/16);x<=Math.floor(Math.max(a.x,b.x)/16);x++)for(let z=Math.floor(Math.min(a.z,b.z)/16);z<=Math.floor(Math.max(a.z,b.z)/16);z++)for(const s of surfaceCells.get(x+','+z)??[])result.add(s);return result;}
  const box=(a:Point,b:Point,r:number)=>({minX:Math.min(a.x,b.x)-r,maxX:Math.max(a.x,b.x)+r,minZ:Math.min(a.z,b.z)-r,maxZ:Math.max(a.z,b.z)+r});
  const bounds=study.buildings.map(b=>({b,...box({x:Math.min(...b.points.map(p=>p.x)),z:Math.min(...b.points.map(p=>p.z))},{x:Math.max(...b.points.map(p=>p.x)),z:Math.max(...b.points.map(p=>p.z))},1)}));
  function clear(a:Point,b:Point,width:number,roadClear:boolean){
    const q=box(a,b,width+.45);
    if([a,b].some(p=>Math.abs(p.x)>study.halfSize-3||Math.abs(p.z)>study.halfSize-3))return false;
    if(bounds.some(o=>o.maxX>=q.minX&&o.minX<=q.maxX&&o.maxZ>=q.minZ&&o.minZ<=q.maxZ&&footprintClearance(a,b,o.b.points)<width+.10))return false;
    if(obstacles.some(o=>o.points.slice(1).some((p,i)=>segmentClearance(a,b,o.points[i]!,p)<width+.25)))return false;
    if(obstacles.some(o=>o.points.length===1&&segmentDistance(o.points[0]!,a,b)<width+.4))return false;
    if(study.streetObstacles?.some(o=>segmentDistance(o,a,b)<width+o.radius+.15))return false;
    return !roadClear||[...nearSurfaces(a,b)].every(s=>segmentClearance(a,b,s.a,s.b)>=s.halfWidth+width+.20);
  }
  for(const road of study.roads){
    if(['no','private','customers','permit','military'].includes(road.tags.access??'')||['no','private','use_sidepath'].includes(road.tags.foot??'')||road.tags.bridge||road.tags.tunnel||road.tags.ford||road.tags.construction)continue;
    const mapped=['footway','path','pedestrian'].includes(road.tags.highway??'');
    if(!mapped&&!['primary','secondary','tertiary','residential','service','living_street','unclassified'].includes(road.tags.highway??''))continue;
    for(const side of mapped?[0]:[-1,1]){
      const points=road.points.map((p,i)=>{
        if(!side)return {...p};
        const prev=road.points[Math.max(0,i-1)]!,next=road.points[Math.min(road.points.length-1,i+1)]!;
        const normals=[{x:p.x-prev.x,z:p.z-prev.z},{x:next.x-p.x,z:next.z-p.z}].filter(v=>Math.hypot(v.x,v.z)>.001).map(v=>{const n=Math.hypot(v.x,v.z);return{x:-v.z/n,z:v.x/n};});
        const n=normals.reduce((s,v)=>({x:s.x+v.x,z:s.z+v.z}),{x:0,z:0}),len=Math.hypot(n.x,n.z)||1,unit={x:n.x/len,z:n.z/len};
        const projection=Math.max(.7,unit.x*(normals[0]?.x??0)+unit.z*(normals[0]?.z??0));
        return {x:p.x+unit.x*side*3.9/projection,z:p.z+unit.z*side*3.9/projection};
      });
      for(let i=1;i<points.length;i++){
        const a=points[i-1]!,b=points[i]!,length=distance(a,b),steps=Math.max(1,Math.ceil(length/2));
        let run:WalkPiece|undefined;
        for(let j=0;j<steps;j++){
          const at=(t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}),u=at(j/steps),v=at((j+1)/steps);
          // Mapped paths must also clear vehicle surfaces, excluding their own path ribbon.
          const allowed=clear(u,v,radius,!mapped)&&(!mapped||[...nearSurfaces(u,v)].filter(s=>s.roadId!==road.id).every(s=>segmentClearance(u,v,s.a,s.b)>=s.halfWidth+radius+.2));
          if(allowed){if(run)run.b=v;else {run={a:u,b:v,halfWidth:radius,roadId:road.id,kind:mapped?'mapped-path':'illustrative-corridor'};pieces.push(run);}}else {rejected++;run=undefined;}
        }
      }
    }
  }
  const nodes=new Map<string,{p:Point;edges:number[]}>();
  function add(p:WalkPiece,index:number){for(const v of [p.a,p.b]){const k=key(v),n=nodes.get(k)??{p:v,edges:[]};n.edges.push(index);nodes.set(k,n);}}
  pieces.forEach(add);
  const degree=new Map<number,Set<number>>(),source=new Map<number,Point>();
  for(const r of study.roads)for(let i=1;i<r.nodes.length;i++)for(const [a,b,p]of [[r.nodes[i-1]!,r.nodes[i]!,r.points[i-1]!],[r.nodes[i]!,r.nodes[i-1]!,r.points[i]!]] as const){const set=degree.get(a)??new Set();set.add(b);degree.set(a,set);source.set(a,p);}
  const junctions=[...degree].filter(([,s])=>s.size>2).map(([id])=>source.get(id)!);
  const ends=[...nodes.values()].filter(n=>n.edges.length===1),grid=new Map<string,typeof ends>();
  for(const n of ends){const k=Math.floor(n.p.x/12)+','+Math.floor(n.p.z/12),list=grid.get(k)??[];list.push(n);grid.set(k,list);}
  const paired=new Set<string>(),crossed=new Set<string>();
  for(const n of ends)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)for(const m of grid.get((Math.floor(n.p.x/12)+x)+','+(Math.floor(n.p.z/12)+z))??[]){
    const d=distance(n.p,m.p),id=[key(n.p),key(m.p)].sort().join('/');if(d<.05||d>11||paired.has(id))continue;paired.add(id);
    if(!clear(n.p,m.p,radius,false))continue;
    const across=!clear(n.p,m.p,radius,true);
    if(across&&![...nearSurfaces(n.p,m.p)].some(s=>segmentClearance(n.p,m.p,s.a,s.b)<.001))continue;
    const junction=junctions.findIndex(j=>distance(j,n.p)<14&&distance(j,m.p)<14);
    if(across&&junction<0)continue;
    const crossKey=junction+':'+[pieces[n.edges[0]!]!.roadId,pieces[m.edges[0]!]!.roadId].sort().join(':');
    if(n.edges.length>=3||m.edges.length>=3||(across&&crossed.has(crossKey)))continue;
    // Connect only nearby ends; every crossing is explicit and yields to simulated vehicles.
    const p:WalkPiece={a:n.p,b:m.p,halfWidth:radius,roadId:pieces[n.edges[0]!]!.roadId,kind:across?'crossing':'illustrative-corridor'};
    add(p,pieces.length);pieces.push(p);
    if(across)crossed.add(crossKey);
  }
  let component=0;const lengths=new Map<number,number>();
  for(let i=0;i<pieces.length;i++){if(pieces[i]!.component)continue;const stack=[i];component++;
    while(stack.length){const index=stack.pop()!,p=pieces[index]!;if(p.component)continue;p.component=component;lengths.set(component,(lengths.get(component)??0)+distance(p.a,p.b));for(const v of [p.a,p.b])for(const e of nodes.get(key(v))?.edges??[])if(!pieces[e]!.component)stack.push(e);}
  }
  const reference=study.spawn?.point??{x:0,z:0};let best:WalkPiece|undefined,bestScore=Infinity;
  for(const p of pieces){if(p.kind==='crossing'||(lengths.get(p.component!)??0)<80)continue;const mid={x:(p.a.x+p.b.x)/2,z:(p.a.z+p.b.z)/2},score=distance(mid,reference);if(score<bestScore){bestScore=score;best=p;}}
  return {pieces,spawn:best?{x:(best.a.x+best.b.x)/2,z:(best.a.z+best.b.z)/2}:null,component:best?.component??0,rejected,lengthM:lengths.get(best?.component??0)??0,policy:'Gameplay-only pedestrian network. Mapped path geometry or clearance-checked illustrative offsets/crossings; public access and physical safety unverified. Rejected intervals are gaps, never bridges through buildings.'};
}
export function pedestrianStand(p:Point,study:Study){const net=study.pedestrians;return !!net&&net.pieces.some(s=>s.component===net.component&&segmentDistance(p,s.a,s.b)<=s.halfWidth-.35)&&!buildingCollision(p,study.buildings,.4);}
