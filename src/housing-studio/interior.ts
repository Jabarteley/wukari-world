import { buildHomeScene } from '../scene/home-scene.ts';
import type { Kit } from '../scene/kit.ts';
import type { LifeState } from '../types/life.ts';
import type { HousingRecipe } from './fixtures.ts';
import { buildHousingShell } from './shell.ts';
import { buildHousingFurnishings } from './furnishings.ts';
import { buildHousingDoors } from './doors.ts';
import type { WalkGrid } from '../scene/walk-grid.ts';

/** The existing Home remains the authority for walking, stairs, doors, body and furniture actions. */
export function buildHousingInterior(kit: Kit,recipe: HousingRecipe,first:()=>boolean,changed:()=>void) {
  const home=buildHomeScene(kit,{visit:{grid:recipe.grid,style:recipe.style,items:recipe.items,owned:true}});
  let camera={x:20,z:20};
  const shell=buildHousingShell(kit,recipe),furnishings=buildHousingFurnishings(kit,recipe,changed);
  const doors=buildHousingDoors(kit,recipe);
  home.group.add(shell.group,furnishings.group,doors.group);
  // The host holds a grid reference while walking. Delegate each query so a door
  // or floor change takes effect without replacing the shared movement controller.
  const currentGrid=()=>doors.grid(home.walk.grid!,home.floor);
  const grid: WalkGrid={
    get bounds(){return currentGrid().bounds;},get cell(){return currentGrid().cell;},
    get cols(){return currentGrid().cols;},get rows(){return currentGrid().rows;},get cells(){return currentGrid().cells;},
    free:(...args)=>currentGrid().free(...args),nearest:(...args)=>currentGrid().nearest(...args),
    clearLine:(...args)=>currentGrid().clearLine(...args),path:(...args)=>currentGrid().path(...args),ascii:(...args)=>currentGrid().ascii(...args),
  };
  function present(){
    // Suppress only the old static batches. Keep the animated hinge, UI markers and avatar owned by Home.
    home.group.traverse(object=>{if(object.name.startsWith('home-room-')||object.name.startsWith('home-furniture-'))object.visible=false;});
    shell.visible(home.floor,first(),false,camera);furnishings.visible(home.floor,first(),camera);doors.visible(home.floor,first());
  }
  const wrapper=Object.create(home) as typeof home & {assets: typeof furnishings;doors: typeof doors;refreshPresentation:()=>void};
  wrapper.walk=Object.create(home.walk);
  Object.defineProperty(wrapper.walk,'grid',{get:()=>home.walk.grid?grid:null});
  Object.defineProperty(wrapper.walk,'solids',{get:()=>[...home.walk.solids,...doors.solids(home.floor)]});
  wrapper.doors=doors;
  wrapper.screens=()=>[];
  wrapper.assets=furnishings;wrapper.refreshPresentation=present;
  wrapper.update=(state:LifeState)=>{const changed=home.update(state);present();return changed;};
  wrapper.look=(x:number,z:number)=>{const changed=home.look(x,z);camera={x,z};present();return changed;};
  wrapper.dispose=()=>{doors.dispose();furnishings.dispose();shell.dispose();home.dispose();};
  return wrapper;
}
