import { createWalkGrid } from '../../scene/walk-grid.ts';
import type { WalkCircle, WalkGrid, WalkPoint, WalkRect } from '../../scene/walk-grid.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import type { MetreRing } from './geo.ts';
import { ANCHORS, ZONES, zoneAtPoint } from './layout.ts';
import type { CampusZone } from './layout.ts';
import { CAMPUS_TREES } from './landscape.ts';
import { propBlocks } from './life-plan.ts';
import { standaloneBlocks } from './standalone.ts';

export interface CampusWalk { grids:Map<string,WalkGrid>; zoneAt:(x:number,z:number)=>CampusZone|null; route:(from:WalkPoint,to:WalkPoint)=>WalkPoint[]|null }
const CELL=2, RADIUS=.4;
/** Block every cell whose centre is inside the ring or within RADIUS of its edge: scanline fill plus a stroke per edge, so cost follows the outline, not the bounding box. */
function blockRing(grid:WalkGrid,ring:MetreRing):void{
  const [minX,minZ]=grid.bounds,{cols,rows,cell,cells}=grid;
  let z0=Infinity,z1=-Infinity;for(const p of ring){if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}
  const r0=Math.max(0,Math.floor((z0-RADIUS-minZ)/cell)),r1=Math.min(rows-1,Math.floor((z1+RADIUS-minZ)/cell));
  const crossings:number[]=[];
  for(let row=r0;row<=r1;row++){
    const z=minZ+(row+.5)*cell;crossings.length=0;
    for(let i=1;i<ring.length;i++){const [ax,az]=ring[i-1]!,[bx,bz]=ring[i]!;if((az>z)===(bz>z))continue;crossings.push(ax+(bx-ax)*(z-az)/(bz-az));}
    crossings.sort((a,b)=>a-b);
    for(let k=0;k+1<crossings.length;k+=2){
      const c0=Math.max(0,Math.ceil((crossings[k]!-minX)/cell-.5)),c1=Math.min(cols-1,Math.floor((crossings[k+1]!-minX)/cell-.5));
      for(let c=c0;c<=c1;c++)cells[row*cols+c]=1;
    }
  }
  for(let i=1;i<ring.length;i++){
    const [ax,az]=ring[i-1]!,[bx,bz]=ring[i]!,dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz||1;
    const c0=Math.max(0,Math.floor((Math.min(ax,bx)-RADIUS-minX)/cell)),c1=Math.min(cols-1,Math.floor((Math.max(ax,bx)+RADIUS-minX)/cell));
    const rr0=Math.max(0,Math.floor((Math.min(az,bz)-RADIUS-minZ)/cell)),rr1=Math.min(rows-1,Math.floor((Math.max(az,bz)+RADIUS-minZ)/cell));
    for(let row=rr0;row<=rr1;row++){const z=minZ+(row+.5)*cell;for(let c=c0;c<=c1;c++){
      const x=minX+(c+.5)*cell,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len2));
      if(Math.hypot(x-ax-dx*t,z-az-dz*t)<=RADIUS)cells[row*cols+c]=1;
    }}
  }
}

export function createGeographicCampusWalk(extraFootprints:Record<string,Array<WalkRect|WalkCircle>>={}):CampusWalk{
  const gateColumns:WalkRect[]=[[-1.5,-2.5,1.5,2.5],[-1.5,-16.7,1.5,-15.3],[-1.5,15.3,1.5,16.7]];
  const treeTrunks:WalkCircle[]=CAMPUS_TREES.map(tree=>[tree.x,tree.z,.45*tree.size]);
  const grid=createWalkGrid({bounds:[CAMPUS_MAP.bounds[0],CAMPUS_MAP.bounds[1],CAMPUS_MAP.bounds[2],CAMPUS_MAP.bounds[3]],block:[...gateColumns,...treeTrunks,...propBlocks(),...standaloneBlocks(),...Object.values(extraFootprints).flat()],cell:CELL,radius:RADIUS});
  const [minX,minZ]=grid.bounds;
  // A trunk smaller than the cell diagonal may contain no cell centre; always
  // claim its containing cell so the rendered trunk cannot be walked through.
  for(const tree of CAMPUS_TREES){const column=Math.floor((tree.x-minX)/grid.cell),row=Math.floor((tree.z-minZ)/grid.cell);if(column>=0&&row>=0&&column<grid.cols&&row<grid.rows)grid.cells[row*grid.cols+column]=1;}
  for(let row=0;row<grid.rows;row++){
    const z=minZ+(row+.5)*grid.cell, crossings:number[]=[];
    for(let index=1;index<CAMPUS_MAP.boundary.length;index++){
      const [ax,az]=CAMPUS_MAP.boundary[index-1]!,[bx,bz]=CAMPUS_MAP.boundary[index]!;
      if((az>z)===(bz>z))continue;
      crossings.push(ax+(bx-ax)*(z-az)/(bz-az));
    }
    crossings.sort((a,b)=>a-b);
    for(let column=0;column<grid.cols;column++){
      const x=minX+(column+.5)*grid.cell;let inside=false;
      for(let index=0;index+1<crossings.length;index+=2)if(x>=crossings[index]!&&x<=crossings[index+1]!){inside=true;break;}
      if(!inside)grid.cells[row*grid.cols+column]=1;
    }
  }
  for(const feature of [...CAMPUS_MAP.buildings,...CAMPUS_MAP.surfaces.filter(surface=>surface.kind==='water'||surface.kind==='wetland'||surface.kind==='pool')])blockRing(grid,feature.ring);
  const grids=new Map(ZONES.map(zone=>[zone.id,grid]));
  const zoneAt=(x:number,z:number)=>Number.isFinite(x)&&Number.isFinite(z)?zoneAtPoint(x,z):null;
  for(const anchor of Object.values(ANCHORS)){
    if(grid.free(anchor.x,anchor.z))continue;
    const nearest=grid.nearest(anchor.x,anchor.z,20);if(!nearest)continue;
    anchor.x=nearest.x;anchor.z=nearest.z;anchor.zone=zoneAt(nearest.x,nearest.z)?.id??anchor.zone;
  }
  const route=(from:WalkPoint,to:WalkPoint):WalkPoint[]|null=>{
    if(!zoneAt(from.x,from.z)||!zoneAt(to.x,to.z)||!grid.free(from.x,from.z)||!grid.free(to.x,to.z))return null;
    if(from.x===to.x&&from.z===to.z)return [];
    const path=grid.path(from.x,from.z,to.x,to.z),last=path?.at(-1);
    return path&&last&&Math.abs(last.x-to.x)<1e-7&&Math.abs(last.z-to.z)<1e-7?path:null;
  };
  return {grids,zoneAt,route};
}
