import './studio.css';
import { createVenueWorld, type VenueWorld } from '../venue-world.ts';
import { createLife } from '../life.ts';
import { loadCityContent } from '../game/cities/registry.ts';
import { installBundledProgression } from '../game/progression/source-provider.ts';
import { createFirstPerson } from '../scene/first-person/controller.ts';
import { stairSpot } from '../game/home-plan.ts';
import { RECIPES, recipePlan, type HousingRecipe } from './fixtures.ts';
import { buildHousingInterior } from './interior.ts';
import { buildHousingExterior } from './exterior.ts';
import { edge } from './shell.ts';
import { withHousingFrontDoor, type HousingFrontDoorState } from './front-door.ts';

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const scene=byId('scene'),select=byId<HTMLSelectElement>('house'),status=byId('status'),rooms=byId('rooms');
let world:VenueWorld|null=null,home:ReturnType<typeof buildHousingInterior>|null=null;
let recipe:HousingRecipe=RECIPES[0]!,first=false,overview=false,epoch=0,disposed=false;
let exterior:ReturnType<typeof withHousingFrontDoor>|null=null,front:HousingFrontDoorState={open:false};
let queue:{x:number;z:number}[]=[],destination:{floor:number;room:number}|null=null;
let target:{x:number;z:number}|null=null,walkStarted=0;
let state:ReturnType<typeof createLife>;
const keys:Record<string,string>={w:'walk-up',s:'walk-down',a:'walk-left',d:'walk-right',arrowup:'walk-up',arrowdown:'walk-down',arrowleft:'walk-left',arrowright:'walk-right'};
function key(action:string,down:boolean,jog=false){window.dispatchEvent(new CustomEvent(down?'jaw:key':'jaw:key-up',{detail:{action,mode:'venue',jog}}));}
function stopTour(){queue=[];target=null;destination=null;}
function nextLeg(){
  if(!world||!home)return;
  if(!queue.length&&destination){
    const r=recipePlan(recipe).floors[destination.floor]?.[destination.room];
    if(r&&home.floor===destination.floor){
      const point=home.walk.grid?.nearest(edge(r.x+r.w/2,recipe.grid),edge(r.y+r.h/2,recipe.grid));
      if(point)queue.push(point);
    }
    destination=null;
  }
  target=queue.shift()??null;
  if(target){walkStarted=performance.now();if(!world.walkTo(target.x,target.z)){stopTour();status.textContent='That route is blocked. Walk to a clear part of the room.';}}
}
function walkRoom(floor:number,room:number){
  if(!world||!home||world.location!=='home')return;
  stopTour();const plan=recipePlan(recipe);
  for(let f=home.floor;f!==floor;f+=floor>f?1:-1){
    const up=floor>f,s=plan.stairs.find(s=>s.floor===(up?f:f-1));if(!s)return;
    for(const end of up?[0,1] as const:[1,0] as const){const p=stairSpot(s,end);queue.push({x:edge(p.x,recipe.grid),z:edge(p.y,recipe.grid)});}
    // Clear the ramp before turning into the upper/lower landing.
    const finish=stairSpot(s,up?1:0),dir=(up?1:-1)*s.dir;
    queue.push({x:edge(finish.x+dir*.8,recipe.grid),z:edge(finish.y,recipe.grid)});
  }
  destination={floor,room};status.textContent=`Walking to ${plan.floors[floor]![room]!.label.toLowerCase()}…`;nextLeg();
}
function showRooms(){
  rooms.replaceChildren();const plan=recipePlan(recipe);
  plan.floors.forEach((list,floor)=>{for(let i=0;i<list.length;i++){
    const button=document.createElement('button');button.type='button';button.textContent=`${floor===0?'':floor===1?'↑ ': '↑↑ '}${list[i]!.label}`;
    button.title=`Walk to ${list[i]!.label}, ${floor===0?'ground floor':floor===1?'first floor':'roof terrace'}`;
    button.addEventListener('click',()=>walkRoom(floor,i));rooms.append(button);
  }});
}
function location(next:'home'|'neighbourhood'){
  if(!world)return;stopTour();state={...state,location:next,activeAction:null};world.setLocation(next);world.setState(state);
  byId('door').textContent=next==='home'?'Walk outside':'Walk inside';
  rooms.querySelectorAll('button').forEach(button=>button.disabled=next!=='home');
  status.textContent=next==='home'?'Welcome home. Pick a room, or explore with W A S D.':'Walk around your compound, then use the front door to enter.';
}
async function openHouse(next:HousingRecipe){
  const load=++epoch;stopTour();world?.dispose();world=null;home=null;exterior=null;recipe=next;front={open:false};
  status.textContent='Preparing your home…';byId('description').textContent=recipe.description;byId('place').textContent=recipe.label;
  await loadCityContent(recipe.city);if(load!==epoch||disposed)return;
  installBundledProgression();
  state=createLife({location:'neighbourhood',home:{custom:true,items:recipe.items},estate:{city:recipe.city,living:'own',tier:recipe.grid===14?'villa':recipe.grid===12?'duplex':recipe.grid===10?'bungalow':'bq',style:recipe.style}}, {cityId:recipe.city,now:Date.UTC(2026,9,15,11)});
  world=createVenueWorld(scene,{location:'neighbourhood',cityId:recipe.city,
    buildHome:kit=>home=buildHousingInterior(kit,recipe,()=>first,()=>world?.update(),()=>overview,front),
    buildNeighbourhood:kit=>exterior=withHousingFrontDoor(buildHousingExterior(kit,recipe),front),
    onHomeDoor:direction=>location(direction==='inside'?'home':'neighbourhood')});
  world.setPlayer({name:'You',seed:'housing-studio',look:state.onboarding.look});world.setState(state);if(first)world.setView(createFirstPerson);
  showRooms();location('neighbourhood');world.resize();
}
function toggleFrontDoor(){
  const door=world?.location==='home'?home?.frontDoor:exterior?.frontDoor;
  if(door?.toggle()){world?.update();status.textContent=`Front door ${door.open?'opened':'closed'}.`;}
  else if(door)status.textContent='Step clear of the front doorway to close it.';
}
function toggleDoor(){
  if(!world)return;
  const p=world.diagnostics().avatar;
  const entry=world.location==='home'?home?.homeDoor:exterior?.homeDoor;
  const nearby=world.location==='home'?home?.doors.nearest(p.x,p.z,home.floor):null;
  const distance=entry&&(world.location!=='home'||home?.floor===0)?Math.hypot(entry.x-p.x,entry.z-p.z):Infinity;
  if(distance<2&&(!nearby||distance<Math.hypot(nearby.x-p.x,nearby.z-p.z))){toggleFrontDoor();return;}
  if(world.location!=='home'||!home)return;
  if(home.doors.toggleNearest(p.x,p.z,home.floor)){stopTour();world.update();status.textContent='Door '+(home.doors.nearest(p.x,p.z,home.floor)?.open?'opened.':'closed.');}
  else status.textContent='Stand beside the doorway to open or close it.';
}
function setView(value:boolean){first=value;if(first){overview=false;byId('overview').setAttribute('aria-pressed','false');}world?.setView(first?createFirstPerson:null);home?.refreshPresentation();world?.update();byId('first').setAttribute('aria-pressed',String(first));byId('third').setAttribute('aria-pressed',String(!first));}
for(const entry of RECIPES){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label;select.append(option);}
select.addEventListener('change',()=>void openHouse(RECIPES.find(r=>r.id===select.value)!).catch(failed));
byId('internal-door').addEventListener('click',toggleDoor);
byId('front-door').addEventListener('click',toggleFrontDoor);
byId('overview').addEventListener('click',()=>{
  overview=!overview;
  if(overview)setView(false);
  byId('overview').setAttribute('aria-pressed',String(overview));
  home?.refreshPresentation();world?.resize();world?.recentre();world?.update();
});
byId('first').addEventListener('click',()=>setView(true));byId('third').addEventListener('click',()=>setView(false));
byId('door').addEventListener('click',()=>{stopTour();if(world?.walkHomeDoor())status.textContent='Walking to the front door…';});
window.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.target instanceof Element&&event.target.closest('input,select,textarea'))return;if(event.key.toLowerCase()==='f'&&!event.repeat){event.preventDefault();toggleDoor();return;}const action=keys[event.key.toLowerCase()];if(action){event.preventDefault();stopTour();key(action,true,event.shiftKey);}});
window.addEventListener('keyup',event=>{const action=keys[event.key.toLowerCase()];if(action)key(action,false);});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-walk]')){
  const action=`walk-${button.dataset.walk}`;
  button.addEventListener('pointerdown',event=>{event.preventDefault();stopTour();button.setPointerCapture(event.pointerId);key(action,true);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>key(action,false));
}
const timer=setInterval(()=>{
  if(!world)return;const d=world.diagnostics();
  byId<HTMLButtonElement>('overview').disabled=world.location!=='home';
  const frontDoor=world.location==='home'?home?.frontDoor:exterior?.frontDoor;
  byId<HTMLButtonElement>('front-door').disabled=!frontDoor||frontDoor.busy;
  byId('front-door').textContent=`${frontDoor?.open?'Close':'Open'} front door`;
  byId('level').textContent=world.location==='home'?`${home?.floor===0?'Ground floor':home?.floor===1?'First floor':'Roof terrace'} · ${first?'First person':overview?'Floor overview':'Third person'}`:'The compound';
  byId('metrics').textContent=`${d.triangles??0} visible triangles · ${d.drawCalls??0} draw calls\nPosition ${d.avatar.x.toFixed(2)}, ${d.avatar.y.toFixed(2)}, ${d.avatar.z.toFixed(2)}\nFloor ${home?.floor??0} · ${d.avatar.moving?'walking':d.avatar.blocked?'blocked':'standing'}\nModels ${home?.assets.loaded??0} loaded · ${home?.assets.failures.length??0} failed`;
  const nearby=world.location==='home'?home?.doors.nearest(d.avatar.x,d.avatar.z,home.floor):null;
  const internal=byId<HTMLButtonElement>('internal-door');internal.disabled=!nearby;internal.textContent=nearby?`${nearby.open?'Close':'Open'} ${nearby.label.toLowerCase()} door · F`:'Approach a room door';
  if(target){
    if(Math.hypot(d.avatar.x-target.x,d.avatar.z-target.z)<.35&&!d.avatar.moving){target=null;nextLeg();if(!target)status.textContent='You have arrived. Drag to look around.';}
    else if(performance.now()-walkStarted>20000){stopTour();status.textContent='Route paused. Use the walk controls to continue.';}
  }
},200);
const resize=new ResizeObserver(()=>world?.resize());resize.observe(scene);
function failed(error:unknown){status.textContent=`The home could not load: ${error instanceof Error?error.message:String(error)}`;console.error(error);}
window.addEventListener('pagehide',()=>{disposed=true;++epoch;clearInterval(timer);resize.disconnect();world?.dispose();},{once:true});
void openHouse(recipe).catch(failed);
