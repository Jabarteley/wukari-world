import type { Kit } from '../scene/kit.ts';
import { createBatch, sceneMaterials } from '../scene/build.ts';
import { planOf, wallsOf, slabOf, roomAt } from '../game/home-plan.ts';
import { plotOf, doorSlot } from '../game/home-layout.ts';
import { FURNITURE } from '../game/content/furniture.ts';
import type { HousingRecipe } from './fixtures.ts';

export const STOREY = 3.4;
export const edge = (n: number, grid: number) => -5 + n * 10 / grid;

/** Width of the canonical wall models in src/scene/home-scene.ts, before their mounting scale. */
const WALL_MODEL_WIDTH: Readonly<Record<string, number>> = { lamp:.22,strip:.9,fan:.64,mirror:.74,calendar:.4,art:.74 };

/** A visual skin over the existing house plan. All coordinates remain in the host's units. */
export function buildHousingShell(kit: Kit, recipe: HousingRecipe, options: { wall?: string } = {}) {
  const plan = planOf(plotOf(recipe.grid, true)), tile = 10 / recipe.grid;
  const w = plan.plot.w * tile, d = plan.plot.d * tile;
  const b = createBatch(kit.THREE), root = new kit.THREE.Group();
  const stone = recipe.city === 'abuja' ? '#ddd7ca' : '#e6e1d7';
  const wall = options.wall ?? '#f1eee7', wood = '#725442', metal = '#343b39';
  const box = b.box.bind(b);
  const run = (x0: number,z0: number,x1: number,z1: number,y: number,h: number,t: number,c: string,part: string) =>
    box((x0+x1)/2,y+h/2,(z0+z1)/2,Math.abs(x1-x0)||t,h,Math.abs(z1-z0)||t,c,{part});
  const wallMounts = (floor:number,side:'back'|'left') => recipe.items.flatMap(item=>{
    const def=FURNITURE[item.itemId];if(!def?.wall||(item.floor??0)!==floor||(item.rot===0?'back':'left')!==side)return [];
    const centre=edge((side==='back'?item.x:item.y)+.5,recipe.grid),scale=Math.max(tile,.8),half=(WALL_MODEL_WIDTH[def.shape]??.8)*scale/2;
    return [{centre,half}];
  });
  const windowWall = (length: number, floor: number, side: string) => {
    const part = `${floor}:outer:${side}`, y = floor * STOREY;
    const segment = length / Math.max(1, Math.round(length/3.4));
    const wallCentre = side === 'back' || side === 'left' ? -5.1 : (side === 'front' ? -5+d : -5+w)+.1;
    const across = (x:number,z:number,wide:number,deep:number,yy:number,hh:number,c:string,layer?:'glass') => {
      const pos = side === 'back'||side === 'front' ? [x,wallCentre] : [wallCentre,z];
      box(pos[0]!, yy, pos[1]!, side==='back'||side==='front'?wide:deep,hh,side==='back'||side==='front'?deep:wide,c,{part,...(layer?{layer}:{})});
    };
    for(let start=0;start<length-.01;start+=segment) {
      const centre=-5+start+segment/2, win=segment*.63;
      const low=-5+start,high=low+segment;
      // Leave the existing animated front door and its clear opening on the left facade.
      const doorZ=edge(doorSlot(recipe.grid)+.5,recipe.grid);
      const tx=(side==='left'?0:side==='right'?plan.plot.w-.1:(centre+5)/tile);
      const tz=(side==='back'?0:side==='front'?plan.plot.d-.1:(centre+5)/tile);
      const balcony=/balcony/i.test(plan.floors[floor]?.[roomAt(plan,floor,tx,tz)]?.label??'');
      if(balcony){
        across(centre,centre,segment,.10,y+.08,.16,stone);
        across(centre,centre,segment,.035,y+.57,.96,'#9bb5b0','glass');
        across(centre,centre,segment,.08,y+1.08,.06,metal);
        for(const sign of [-1,1])across(centre+sign*segment/2,centre+sign*segment/2,.055,.09,y+.57,1.02,metal);
        if(side==='back'||side==='left')for(const item of wallMounts(floor,side))if(item.centre>=low&&item.centre<high)
          across(item.centre,item.centre,item.half*2,.2,y+STOREY/2,STOREY,wall);
        continue;
      }
      const wallBacking=(side==='back'||side==='left')&&wallMounts(floor,side).some(item=>item.centre-item.half<high&&item.centre+item.half>low);
      const isDoor=floor===0 && side==='left' && doorZ>=-5+start && doorZ< -5+start+segment;
      if(isDoor) {
        const half=Math.min(tile*.86,1.5)/2;
        if(doorZ-half>low) across(0,(low+doorZ-half)/2,doorZ-half-low,.2,y+STOREY/2,STOREY,wall);
        if(high>doorZ+half) across(0,(high+doorZ+half)/2,high-doorZ-half,.2,y+STOREY/2,STOREY,wall);
        across(0,doorZ,half*2,.2,y+2.85,1.1,wall);
      } else if(wallBacking) {
        across(centre,centre,segment,.2,y+STOREY/2,STOREY,wall);
      } else {
        across(centre,centre,segment,.2,y+.48,.96,stone);
        across(centre,centre,segment,.2,y+3.02,.76,wall);
        for(const sign of [-1,1]) across(centre+sign*(segment+win)/4,centre+sign*(segment+win)/4,(segment-win)/2,.2,y+1.8,1.68,wall);
        across(centre,centre,win,.035,y+1.8,1.64,'#8caeac','glass');
        for(const dx of [-win/2,0,win/2]) across(centre+dx,centre+dx,.055,.24,y+1.8,1.72,metal);
        for(const yy of [1,2.63]) across(centre,centre,win+.09,.25,y+yy,.07,metal);
        across(centre,centre,win+.18,.34,y+.92,.08,stone);
      }
    }
  };
  for(let floor=0;floor<plan.floors.length;floor++) {
    const base=floor*STOREY, part=`${floor}:floor`;
    const terrace = plan.floors[floor]!.length===1 && /terrace/i.test(plan.floors[floor]![0]!.label);
    const slabs = floor ? slabOf(plan,floor) : [[0,0,plan.plot.w,plan.plot.d]];
    for(const [a,c,e,f] of slabs) box(edge((a!+e!)/2,recipe.grid),base-.08,edge((c!+f!)/2,recipe.grid),(e!-a!)*tile,.16,(f!-c!)*tile,stone,{part});
    // Large format warm stone tiles with fine joints, rather than a high contrast checkerboard.
    for(let x=0;x<plan.plot.w;x+=2) for(let z=0;z<plan.plot.d;z+=2) {
      const fits=slabs.some(([a,c,e,f])=>x>=a!&&z>=c!&&x+2<=e!&&z+2<=f!);
      if(fits) box(edge(x+1,recipe.grid),base+.001,edge(z+1,recipe.grid),tile*2-.018,.014,tile*2-.018,(x+z)%6?'#d7d2c8':'#ded9d0',{part});
    }
    for(const r of plan.floors[floor]!) {
      if(/balcony|terrace/i.test(r.label)) continue;
      const cx=edge(r.x+r.w/2,recipe.grid),cz=edge(r.y+r.h/2,recipe.grid);
      // Raised POP ceiling inset, lit perimeter and central luminaire, based on Lagos photo references.
      const cp=`${floor}:ceiling`;
      // Stair halls keep the same open well as the walkable plan.
      if(!/hall|landing/i.test(r.label)) box(cx,base+3.28,cz,r.w*tile-.08,.13,r.h*tile-.08,'#faf7ef',{part:cp});
      const cw=Math.max(.6,r.w*tile-1),cd=Math.max(.6,r.h*tile-1);
      for(const sx of [-1,1]) box(cx+sx*cw/2,base+3.14,cz,.06,.04,cd,'#ffe4b5',{part:cp,layer:'glow'});
      for(const sz of [-1,1]) box(cx,base+3.14,cz+sz*cd/2,cw,.04,.06,'#ffe4b5',{part:cp,layer:'glow'});
      b.cyl(cx,base+3.04,cz,.22,.07,'#d2ba81',{part:cp,seg:12});
    }
    for(const s of wallsOf(plan,floor)) {
      const x0=edge(s.x0,recipe.grid),x1=edge(s.x1,recipe.grid),z0=edge(s.y0,recipe.grid),z1=edge(s.y1,recipe.grid);
      run(x0,z0,x1,z1,base,.85,.12,wall,`${floor}:low`);
      run(x0,z0,x1,z1,base+.85,2.37,.12,wall,`${floor}:inner`);
      run(x0,z0,x1,z1,base,.12,.15,wood,`${floor}:trim`);
    }
    if(!terrace) for(const side of ['back','front','left','right']) windowWall(side==='back'||side==='front'?w:d,floor,side);
    else {
      for(const z of [-5.06,-5+d+.06]) run(-5,z,-5+w,z,base,1.05,.12,stone,`${floor}:outer:front`);
      for(const x of [-5.06,-5+w+.06]) run(x,-5,x,-5+d,base,1.05,.12,stone,`${floor}:outer:left`);
      // A saved wall item on an open terrace still gets a real backing, without closing the terrace around it.
      for(const {centre,half} of wallMounts(floor,'back')) run(centre-half,-5.1,centre+half,-5.1,base,STOREY,.2,wall,`${floor}:outer:back`);
      for(const {centre,half} of wallMounts(floor,'left')) run(-5.1,centre-half,-5.1,centre+half,base,STOREY,.2,wall,`${floor}:outer:left`);
    }
    // Horizontal facade bands and restrained walnut entry screen.
    if(!terrace) for(const z of [-5.12,-5+d+.12]) box(-5+w/2,base+3.25,z,w+.45,.22,.34,metal,{part:`${floor}:outer:${z<0?'back':'front'}`});
  }
  for(const s of plan.stairs) {
    const count=Math.max(s.w*2,Math.ceil(STOREY/(.18*tile*.72*2.45/1.81))), dx=s.w*tile/count;
    for(let i=0;i<count;i++) {
      const h=(i+1)*STOREY/count, x=edge(s.x+(s.dir===1?i+.5:count-i-.5)*s.w/count,recipe.grid);
      box(x,s.floor*STOREY+h/2,edge(s.y+s.h/2,recipe.grid),dx+.015,h,s.h*tile,'#b4ab9a',{part:`${s.floor}:stairs`});
      box(x,s.floor*STOREY+h+.012,edge(s.y+s.h/2,recipe.grid),dx+.025,.025,s.h*tile,'#e3ded4',{part:`${s.floor}:stairs`});
    }
    for(const z of [edge(s.y,recipe.grid),edge(s.y+s.h,recipe.grid)]) {
      for(let i=0;i<=10;i++) {
        const x=edge(s.x+s.w*i/10,recipe.grid),up=s.dir===1?i/10:1-i/10;
        box(x,s.floor*STOREY+up*STOREY+.48,z,.035,.95,.035,metal,{part:`${s.floor}:stairs`});
      }
      const runLength=Math.hypot(s.w*tile,STOREY);
      box(edge(s.x+s.w/2,recipe.grid),s.floor*STOREY+STOREY/2+.96,z,runLength,.055,.055,wood,{part:`${s.floor}:stairs`,rz:s.dir*Math.atan2(STOREY,s.w*tile)});
    }
  }
  for(const s of plan.stairs) {
    const x=edge(s.x+(s.dir===1?s.w:0),recipe.grid)+s.dir*.38;
    box(x,(s.floor+1)*STOREY-.08,edge(s.y+s.h/2,recipe.grid),.76,.16,s.h*tile,stone,{part:`${s.floor}:landing-cap`});
  }
  const built=b.build(sceneMaterials(kit)); root.add(...built.meshes);
  const visible=(floor:number,first:boolean,exterior=false,camera={x:20,z:20},overview=false)=> {
    for(const mesh of built.meshes) {
      const [n,kind,side]=String(mesh.userData.part).split(':'); const f=Number(n);
      const wallShown=side==='back'?camera.z>=-5:side==='left'?camera.x>=-5:side==='front'?camera.z<=d-5:camera.x<=w-5;
      mesh.visible=exterior ? kind==='outer'||kind==='ceiling'||kind==='floor' :
        (f===floor || (kind==='stairs'||first&&kind==='floor')&&f===floor-1) && (kind!=='ceiling'||first) && (kind!=='outer'||first||wallShown) && (kind!=='inner'||first||!overview);
    }
  };
  return {group:root,plan,triangles:built.triangles,visible,dispose(){for(const m of built.meshes)m.geometry.dispose();root.removeFromParent();}};
}
