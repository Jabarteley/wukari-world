/** Dev-only host. All rendering and input lives here; rules modules stay pure. */
import * as THREE from 'three';
import type { Group } from 'three';
import { createKit } from '../../scene/kit.ts';
import { createWalker } from '../../scene/movement.ts';
import { createMotionLoop } from '../../scene/motion-loop.ts';
import { buildUnilag } from './scene.ts';
import { SHUTTLE_STOPS, shuttleRoute, shuttlePose } from './shuttle.ts';
import { buildShuttle } from './shuttle-scene.ts';
import { CAMPUS_NPCS } from './content.ts';
import { BUILDINGS, ZONES, ROADS, ANCHORS, ENTRANCE } from './layout.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import { pointInRing, boundsOf } from './geo.ts';
import { standalones } from './standalone.ts';
import type { Kit } from '../../scene/kit.ts';
import type { MotionLoop } from '../../scene/motion-loop.ts';
import type { Walker } from './host.ts';

interface Trip { to: string; active: { origin: string; dest: string; duration: number; remaining: number } }
interface ShuttleView { group: Group; dispose(): void }
const finite = (value: unknown): value is number => Number.isFinite(value);

const $=<T extends HTMLElement = HTMLElement>(id: string): T=>document.getElementById(id) as T;
const renderer=new THREE.WebGLRenderer({canvas:$<HTMLCanvasElement>('world'),antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,1800),kit: Kit=createKit(),campus=buildUnilag(kit);
world.add(campus.group);
campus.setCrowd(Object.values(CAMPUS_NPCS).flatMap(npc=>{const a=ANCHORS[npc.at];if(!a)return [];const at=campus.walk.grid.nearest(a.x+3,a.z+3);return at?[{...npc,name:npc.name+' · '+npc.role,...at}]:[];}));
const hemi=new THREE.HemisphereLight('#c6e0e6','#68765a',2),sun=new THREE.DirectionalLight('#fff0d2',2.4);
sun.position.set(80,140,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:420});sun.shadow.normalBias=.3;world.add(hemi,sun,sun.target);
const bus: ShuttleView=buildShuttle(kit);bus.group.visible=false;world.add(bus.group);
const walker: Walker=createWalker({speed:8,jogSpeed:18});walker.setGrid(campus.walk.grid);walker.place(ENTRANCE.x,ENTRANCE.z,0);
let yaw=-Math.PI/2,tilt=.32,distance=32,lookHeight=2,focus={dx:0,dz:0},gridVisible=false,frameCount=0,phase=0,trip: Trip | null=null;
const keys=new Set<string>(),labels=new Map<string, HTMLSpanElement>(),map=$<HTMLCanvasElement>('map'),ctx=map.getContext('2d')!;
const screenPoint=new THREE.Vector3(),labelRay=new THREE.Raycaster(),rayStart=new THREE.Vector3(),rayDirection=new THREE.Vector3(),hitPoint=new THREE.Vector3();
const occluders=campus.walk.solids.map(([x0,y0,z0,x1,y1,z1])=>new THREE.Box3(new THREE.Vector3(x0,y0,z0),new THREE.Vector3(x1,y1,z1)));
for(const b of BUILDINGS){const opt=document.createElement('option');opt.value=b.id;opt.textContent=b.label;$<HTMLSelectElement>('destination').append(opt);}
$<HTMLSelectElement>('destination').value='senate';
for(const zone of ZONES){const o=document.createElement('option');o.value=zone.id;o.textContent=zone.label;$<HTMLSelectElement>('zone').append(o);}
for(const stop of SHUTTLE_STOPS){const o=document.createElement('option');o.value=stop.id;o.textContent=stop.label;$<HTMLSelectElement>('shuttle-to').append(o);}$<HTMLSelectElement>('shuttle-to').value='senate';

function drawMap(){
  const [x0,z0,x1,z1]=CAMPUS_MAP.bounds;
  const scaleX=map.width/(x1-x0),scaleZ=map.height/(z1-z0);
  const point=(x: number,z: number): [number,number]=>[(x-x0)*scaleX,(z-z0)*scaleZ];
  ctx.fillStyle='#e4e6d5';ctx.fillRect(0,0,map.width,map.height);

  for(const zone of ZONES){const [x,z,x1,z1]=zone.bounds,[px,pz]=point(x,z);ctx.strokeStyle='#b8c6ad';ctx.lineWidth=.5;ctx.strokeRect(px,pz,(x1-x)*scaleX,(z1-z)*scaleZ);}
  ctx.strokeStyle='#fdf7e6';ctx.lineWidth=3;
  for(const r of ROADS){ctx.beginPath();r.points.forEach(([x,z],i)=>{const p=point(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();}
  for(const b of CAMPUS_MAP.buildings){ctx.beginPath();b.ring.forEach(([x,z],i)=>{const p=point(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fillStyle='#829681';ctx.fill();}
  if(gridVisible){const g=campus.navigation.grids.get(campus.zone!)!;ctx.fillStyle='#994a3866';for(let r=0;r<g.rows;r+=2)for(let c=0;c<g.cols;c+=2)if(g.cells[r*g.cols+c]){const [x,z]=point(g.bounds[0]+c*g.cell,g.bounds[1]+r*g.cell);ctx.fillRect(x,z,2*scaleX,2*scaleZ);}}
  for(const friend of campus.walk.people()){const p=point(friend.x,friend.z);ctx.fillStyle='#686ab8';ctx.beginPath();ctx.arc(...p,2.5,0,Math.PI*2);ctx.fill();}
  const p=point(walker.x,walker.z);ctx.fillStyle='#db7142';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(...p,4,0,Math.PI*2);ctx.fill();ctx.stroke();
}
/** Footprints with their heights, so the orbit camera can be kept out of buildings (solids share the CAMPUS_MAP.buildings order). */
const solidBoxes=[...campus.walk.solids,...standalones().map(({building:b})=>{const [x0,z0,x1,z1]=boundsOf(b.ring);return [x0,0,z0,x1,b.height,z1] as typeof campus.walk.solids[number];})];
const blockers=[...CAMPUS_MAP.buildings,...standalones().map(s=>s.building)].map((b,i)=>({ring:b.ring,bounds:solidBoxes[i]!}));
const insideBuilding=(x: number,y: number,z: number)=>blockers.some(({ring,bounds:[x0,,z0,x1,h,z1]})=>x>x0-.8&&x<x1+.8&&z>z0-.8&&z<z1+.8&&y<h+2&&(pointInRing([x,z],ring)||blockerNear(ring,x,z)));
function blockerNear(ring: readonly (readonly [number,number])[],x: number,z: number){for(let i=1;i<ring.length;i++){const [ax,az]=ring[i-1]!,[bx,bz]=ring[i]!,dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-ax-dx*t,z-az-dz*t)<.8)return true;}return false;}
const fog=new THREE.Fog('#bfd1d3',260,1750),background=new THREE.Color();
function draw(){
  // Orbit camera arm: stops before the first building on its ray (never inside or behind a wall), never below the ground.
  const fx=walker.x+focus.dx,fz=walker.z+focus.dz,ty=lookHeight,wantX=fx+Math.sin(yaw)*Math.cos(tilt)*distance,wantY=Math.max(1.4,Math.sin(tilt)*distance+ty),wantZ=fz+Math.cos(yaw)*Math.cos(tilt)*distance;
  let arm=1;
  for(let t=.1;t<=1;t+=.02)if(insideBuilding(fx+(wantX-fx)*t,ty+(wantY-ty)*t,fz+(wantZ-fz)*t)){arm=Math.max(.12,t-.06);break;}
  camera.position.set(fx+(wantX-fx)*arm,Math.max(1.4,ty+(wantY-ty)*arm),fz+(wantZ-fz)*arm);
  camera.lookAt(fx,ty,fz);
  // A wider near plane at altitude gives the depth buffer 10-20x more precision for the distant ground, roofs and water.
  const near=Math.max(.3,distance*arm*.04);if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}
  background.set(campus.background);world.background=background;const f=campus.fog;fog.color.set(f.color);fog.near=f.near;fog.far=f.far;world.fog=fog;
  const light=campus.lighting();hemi.color.set(light.hemi[0]);hemi.groundColor.set(light.hemi[1]);hemi.intensity=light.hemi[2];sun.color.set(light.sun[0]);sun.intensity=light.sun[1];
  document.body.dataset.time=campus.time;
  sun.position.set(walker.x-70,140,walker.z+60);sun.target.position.set(walker.x,0,walker.z);
  renderer.render(world,camera);frameCount++;
  for(const node of labels.values())node.hidden=true;
  const visible=campus.tags().map(tag=>({...tag,dist:Math.hypot(tag.position.x-walker.x,tag.position.z-walker.z)})).filter(t=>t.dist<100).sort((a,b)=>a.dist-b.dist).slice(0,innerWidth<600?5:10);
  const placed: Array<{ x: number; y: number }>=[];
  for(const tag of visible){
    rayStart.copy(camera.position);rayDirection.set(tag.position.x,tag.position.y,tag.position.z).sub(rayStart);
    const tagDistance=rayDirection.length();labelRay.set(rayStart,rayDirection.normalize());labelRay.far=tagDistance-.7;
    if(occluders.some(box=>labelRay.ray.intersectBox(box,hitPoint)&&hitPoint.distanceTo(rayStart)<tagDistance-.7))continue;
    screenPoint.set(tag.position.x,tag.position.y,tag.position.z).project(camera);
    const x=(screenPoint.x+1)*innerWidth/2,y=(1-screenPoint.y)*innerHeight/2;
    if(screenPoint.z>1||x<20||x>innerWidth-20||y<170||y>innerHeight-210||placed.some(p=>Math.abs(p.x-x)<100&&Math.abs(p.y-y)<28))continue;
    let node=labels.get(tag.id);if(!node){node=document.createElement('span');node.className='name-tag';labels.set(tag.id,node);$('labels').append(node);}
    node.textContent=tag.name;node.hidden=false;node.style.left=x+'px';node.style.top=y+'px';placed.push({x,y});
  }
  const stats=campus.stats();$('stats').textContent=`${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.render.calls} calls · ${stats.resident.length} detailed zones`;
  $('motion').textContent=`${frameCount} frames · ${loop.running?'Moving':'Idle'}`;
  $<HTMLSelectElement>('zone').value=String(campus.zone);
  $('zone-name').textContent=ZONES.find(z=>z.id===campus.zone)?.label||'Campus';drawMap();
}
const loop=createMotionLoop((dt: number)=>{
  if(trip){trip.active.remaining=Math.max(0,trip.active.remaining-dt);const at=shuttlePose(trip.active);showTrip(at);draw();if(trip.active.remaining<=0){const destination=trip.to;trip=null;bus.group.visible=false;campus.walk.avatar.visible=true;jump(destination);$('status').textContent='Shuttle preview arrived. No game balance was changed.';return false;}return true;}

  walker.input(Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft')),Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown')),keys.has('Shift'));
  // Calling input(0,0) preserves the walker's existing path.
  const moved=walker.step(dt,yaw);if(moved)focus.dx=focus.dz=0;phase+=dt*(walker.jogging?9:5);
  campus.walk.move(walker.x,0,walker.z,walker.ry);campus.walk.gait(phase,phase);
  if(!moved)campus.walk.rest();draw();return moved||walker.hasInput;
},{onHidden(){keys.clear();walker.stop();},onVisible(){draw();}});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();draw();}
/** Entrances face the anchor's +z side (the anchor sits 2 m in front of the footprint), so frame from there, low enough to read the door and sign. */
function framePreset(id: string){
  const keep=id==='senate'||id==='main-gate'||id==='lagoon-front',anchor=ANCHORS[id];
  lookHeight=2;focus.dx=focus.dz=0;
  if(id==='lagoon-front'){yaw=-Math.PI/2;tilt=.38;distance=75;return;}
  // Node-mapped landmarks have no footprint of their own: use the nearest mapped building within 14 m of the anchor.
  let best: {h: number;size: number} | null=null,bestScore=Infinity,face=0;
  if(anchor&&!keep)solidBoxes.forEach(([x0,,z0,x1,h,z1])=>{const d=Math.hypot(Math.max(x0-anchor.x,0,anchor.x-x1),Math.max(z0-anchor.z,0,anchor.z-z1)),score=d-Math.min(h,30)*.2;if(d<14&&h>3&&score<bestScore){bestScore=score;best={h,size:Math.max(x1-x0,z1-z0)};face=d===0?z1+2.5-anchor.z:0;}});
  const b=BUILDINGS.find(item=>item.id===id),h=best?(best as {h:number}).h:b?.h||0,size=best?(best as {size:number}).size:Math.max(b?.w||0,b?.d||0);
  if(b?.kind==='open-space'){yaw=.55;tilt=.42;distance=62;return;}
  if(keep||!(h>0)){yaw=.55;tilt=.62;distance=id==='senate'?125:48;return;}
  focus.dz=face;yaw=.3;tilt=.3;distance=Math.round(Math.min(95,Math.max(30,h*1.7+14,size*.5+18)));lookHeight=Math.min(10,Math.max(2,h*.3));
}
function jump(id: string){trip=null;bus.group.visible=false;campus.walk.avatar.visible=true;const a=ANCHORS[id];if(!a)return false;loop.stop();walker.stop();if(!campus.setSpot(id))return false;walker.place(a.x,a.z,a.ry);$<HTMLSelectElement>('destination').value=id;framePreset(id);draw();return true;}
function go(id: string){trip=null;bus.group.visible=false;campus.walk.avatar.visible=true;const a=ANCHORS[id];if(a&&walker.goTo(a.x,a.z,{arrive(){ $('status').textContent=`You reached ${a.label}.`; }})){ $('status').textContent=`Walking to ${a.label}…`;loop.wake();return true;}$('status').textContent='That destination is not reachable from here.';return false;}
function showTrip(at: { x: number; z: number; ry: number } | null){if(!at)return;walker.place(at.x,at.z,at.ry);campus.setPosition(at.x,at.z);bus.group.visible=true;campus.walk.avatar.visible=false;bus.group.position.set(at.x,.2,at.z);bus.group.rotation.y=at.ry;}
function ridePreview(destination: string,progress: number | null=null){
 const from=[...SHUTTLE_STOPS].filter(s=>s.id!==destination).sort((a,b)=>Math.hypot(a.anchor.x-walker.x,a.anchor.z-walker.z)-Math.hypot(b.anchor.x-walker.x,b.anchor.z-walker.z))[0];
 const route=from&&shuttleRoute(from.id,destination);if(!route)return false;loop.stop();walker.stop();keys.clear();
 const active={origin:from.id,dest:destination,duration:route.duration,remaining:route.duration};trip={to:destination,active};distance=46;
 $('status').textContent=`Shuttle preview · ${from.label} to ${SHUTTLE_STOPS.find(s=>s.id===destination)!.label}`;
 if(progress!==null){active.remaining=route.duration*(1-progress);showTrip(shuttlePose(active));draw();}else loop.wake();return true;
}
$('ride').onclick=()=>ridePreview($<HTMLSelectElement>('shuttle-to').value);
$<HTMLSelectElement>('zone').onchange=()=>{const z=ZONES.find(z=>z.id===$<HTMLSelectElement>('zone').value)!,p=campus.navigation.grids.get(z.id)!.nearest((z.bounds[0]+z.bounds[2])/2,(z.bounds[1]+z.bounds[3])/2);loop.stop();walker.stop();trip=null;bus.group.visible=false;campus.walk.avatar.visible=true;walker.place(p!.x,p!.z,0);campus.setPosition(p!.x,p!.z);draw();};
$('walk').onclick=()=>go($<HTMLSelectElement>('destination').value);
$('jump').onclick=()=>{jump($<HTMLSelectElement>('destination').value);$('status').textContent='Preview position changed. Use Walk there to follow a route.';};
$<HTMLSelectElement>('destination').onchange=drawMap;
$<HTMLSelectElement>('time').onchange=()=>{campus.setTime($<HTMLSelectElement>('time').value);draw();};
$('grid').onclick=()=>{gridVisible=!gridVisible;$('grid').setAttribute('aria-pressed',String(gridVisible));drawMap();};
$('help').onclick=()=>{$('controls').hidden=!$('controls').hidden;$('help').setAttribute('aria-expanded',String(!$('controls').hidden));};
addEventListener('resize',resize);
addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes((e.target as HTMLElement).tagName))return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(e.key)){e.preventDefault();keys.add(e.key);loop.wake();}});
addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>{keys.clear();walker.stop();});
let drag: { x: number; y: number } | null=null;
$<HTMLCanvasElement>('world').onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};$<HTMLCanvasElement>('world').setPointerCapture(e.pointerId);};
$<HTMLCanvasElement>('world').onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;tilt=Math.min(1.35,Math.max(.10,tilt+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};draw();};
$<HTMLCanvasElement>('world').onpointerup=()=>drag=null;$<HTMLCanvasElement>('world').onpointercancel=()=>drag=null;
$<HTMLCanvasElement>('world').addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(8,Math.min(1400,distance+e.deltaY*.07));draw();},{passive:false});
for(const button of document.querySelectorAll<HTMLElement>('[data-move]')){const key={up:'w',left:'a',right:'d',down:'s'}[button.dataset.move as 'up'|'left'|'right'|'down']; button.onpointerdown=(e: PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);loop.wake();};button.onpointerup=button.onpointercancel=()=>keys.delete(key);}
map.onclick=e=>{const r=map.getBoundingClientRect(),x=CAMPUS_MAP.bounds[0]+(e.clientX-r.left)/r.width*(CAMPUS_MAP.bounds[2]-CAMPUS_MAP.bounds[0]),z=CAMPUS_MAP.bounds[1]+(e.clientY-r.top)/r.height*(CAMPUS_MAP.bounds[3]-CAMPUS_MAP.bounds[1]);const at=campus.walk.grid.nearest(x,z);if(at&&walker.goTo(at.x,at.z))loop.wake();else $('status').textContent='Choose a walkable part of campus.';};
// Inspection interface exists only on the dev page, with no game-server writes.
(globalThis as typeof globalThis & { campusPreview?: object }).campusPreview={campus,walker,renderer,jump,go,draw,ridePreview,setTime(value: string){campus.setTime(value);$<HTMLSelectElement>('time').value=value;draw();},get frames(){return frameCount;},get idle(){return !loop.running;},setView(values: { yaw?: number; tilt?: number; distance?: number }){if(finite(values.yaw))yaw=values.yaw;if(finite(values.tilt))tilt=values.tilt;if(finite(values.distance))distance=values.distance;draw();},dispose(){loop.dispose();campus.dispose();bus.dispose();kit.dispose();renderer.dispose();}};
resize();
