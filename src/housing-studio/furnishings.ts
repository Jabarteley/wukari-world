import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FURNITURE } from '../game/content/furniture.ts';
import { footprint } from '../game/home-layout.ts';
import { createBatch, sceneMaterials } from '../scene/build.ts';
import type { Kit } from '../scene/kit.ts';
import type { HousingRecipe } from './fixtures.ts';
import { housingAssetManifest } from './asset-manifest.ts';
import { STOREY, edge } from './shell.ts';

const SHAPES: Record<string,string> = {sofa:'two-seat-sofa',bed:'single-bed',wardrobe:'wardrobe',chair:'dining-chair',desk:'dining-table',tv:'flat-panel-television',plant:'broadleaf-planter',basin:'knee-clearance-public-washbasin',fridge:'display-fridge',cooker:'four-burner-stove',floorlamp:'floor-lamp'};
export function buildHousingFurnishings(kit: Kit, recipe: HousingRecipe, changed:()=>void) {
  const group=new THREE.Group(), floors=Array.from({length:3},()=>new THREE.Group());group.add(...floors);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const templates=new Map<string,Promise<THREE.Group>>(), owned:THREE.Object3D[]=[], batches:THREE.Mesh[]=[];
  const failures:string[]=[];let gone=false,loaded=0;
  const tile=10/recipe.grid;
  function fallback(shape:string,w:number,d:number) {
    const b=createBatch(THREE),white='#eeeae1',wood='#70513c';
    if(shape==='rug') {
      b.box(0,.02,0,w*.93,.025,d*.93,'#637a7e');
      b.box(0,.036,0,w*.80,.012,d*.80,'#bcc1b8');
      for(let i=-2;i<=2;i++)b.box(i*w*.13,.044,0,.035,.008,d*.65,'#64797d');
    } else if(shape==='tv') {
      b.box(0,.29,0,w*.9,.48,d*.76,wood);
      for(const x of [-w*.22,w*.22]){b.box(x,.30,d*.39,w*.42,.34,.025,'#a58362');b.box(x,.39,d*.415,.09,.025,.025,'#c7bc9a');}
      for(const x of [-w*.37,w*.37])for(const z of [-d*.29,d*.29])b.box(x,.04,z,.055,.08,.055,'#353c38');
    } else if(shape==='toilet') {
      b.cyl(0,.22,0,.22,.44,white,{seg:12,sx:.8,sz:1.15});b.cyl(0,.47,.05,.28,.09,white,{seg:16,sz:1.2});b.cyl(0,.52,.05,.19,.015,'#565e5b',{seg:16,sz:1.2});b.box(0,.58,-.24,.46,.55,.19,white);b.box(.14,.84,-.24,.07,.02,.05,'#bab9b0');
    } else if(shape==='tub') {
      b.box(0,.22,0,w*.92,.44,d*.9,white);b.box(0,.45,0,w*.76,.03,d*.64,'#bfd4d1');
      for(const s of [-1,1])b.box(0,.47,s*d*.4,w*.92,.09,d*.12,white);
    } else if(shape==='cooker') {
      b.box(0,.43,0,w*.9,.86,d*.84,white);b.box(0,.88,0,w*.94,.04,d*.88,'#2d3433');b.box(0,.42,d*.43,w*.65,.4,.02,'#303937');
      for(const x of [-w*.22,w*.22])for(const z of [-d*.22,d*.22])b.cyl(x,.91,z,.12,.02,'#777c77',{seg:12});
    } else if(shape==='shower') {
      b.box(0,.04,0,w*.9,.08,d*.9,white);b.box(0,1.03,-d*.4,w*.9,2,.04,'#d0dbd5');b.cyl(.18,1.38,-d*.34,.025,1.1,'#9aaca7',{seg:8});b.cyl(.18,1.94,-d*.15,.13,.03,'#8d9c98',{seg:12});
      b.box(-w*.43,1.05,0,.03,2,d*.9,'#c8dcda',{layer:'glass'});
    } else if(shape==='floorlamp') {
      b.cyl(0,.04,0,.24,.08,'#3c4542',{seg:12});b.cyl(0,.8,0,.025,1.5,'#b9a574',{seg:8});b.cyl(0,1.55,0,.25,.32,'#eee2be',{seg:12});
    } else if(shape==='art') {
      b.box(0,.0,0,.65,.85,.05,wood);b.box(0,0,.03,.54,.74,.015,'#d4c4a4');
      for(let i=-2;i<=2;i++)b.box(i*.09,Math.sin(i)*.13,.04,.035,.4,.01,'#34545a',{rz:.3*i});
    } else {b.box(0,.3,0,w*.85,.6,d*.85,wood);}
    const built=b.build(sceneMaterials(kit));batches.push(...built.meshes);const object=new THREE.Group();object.add(...built.meshes);return object;
  }
  for(const item of recipe.items) {
    const def=FURNITURE[item.itemId]; if(!def)continue;
    const f=item.floor??0, size=footprint(def,item.rot), mount=new THREE.Group();floors[f]!.add(mount);
    mount.position.set(edge(item.x+size.w/2,recipe.grid),f*STOREY+.025,edge(item.y+size.h/2,recipe.grid));
    mount.rotation.y=-item.rot*Math.PI/2;
    mount.userData.wall=!!def.wall;
    if(def.wall){mount.position.set(edge(item.x+.5,recipe.grid),f*STOREY+1.75,-4.87);}
    const assetId=item.itemId==='lounge-armchair'?'wood-armchair':SHAPES[def.shape];
    const entry=housingAssetManifest.find(row=>row.id===assetId);
    const proxy=fallback(def.shape,def.w*tile,def.h*tile);mount.add(proxy);
    if(!entry)continue;
    let template=templates.get(entry.id);
    if(!template){template=loader.loadAsync(entry.url).then(gltf=>{owned.push(gltf.scene);return gltf.scene;});templates.set(entry.id,template);}
    void template.then(source=>{
      if(gone)return;
      const object=source.clone(true);
      const [width,height,depth]=entry.dimensions;
      const fit=Math.min(def.w*tile*.88/width,def.h*tile*.88/depth,def.shape==='tv'?1.05/height:2.15/height);
      object.scale.setScalar(fit);
      object.position.y=-entry.bounds[1]*fit+(def.shape==='tv'?.55:0);

      object.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true;}});
      proxy.visible=def.shape==='tv';mount.add(object);loaded++;changed();
    }).catch(()=>{if(!gone){failures.push(entry.id);changed();}});
  }
  return {group,visible(floor:number,first=false,camera={x:20,z:20}){floors.forEach((g,i)=>{g.visible=i===floor;for(const child of g.children)if(child.userData.wall)child.visible=first||camera.z>=-5;});},get loaded(){return loaded;},get failures(){return failures;},
    dispose(){gone=true;for(const mesh of batches)mesh.geometry.dispose();
      void Promise.allSettled(templates.values()).then(()=>{
        const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
        for(const object of owned)object.traverse(child=>{if(child instanceof THREE.Mesh){geometries.add(child.geometry);for(const m of Array.isArray(child.material)?child.material:[child.material])materials.add(m);}});
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      });group.removeFromParent();
    }};
}
