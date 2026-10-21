/** Quaternius CC0 humanoid topology/rig; models/provenance.json and LICENSE.txt.
 * Original fitted hair/palette dressing; source face topology is unchanged.
 * Metres, +Z forward. Two immutable templates; instances own geometry/materials/rigs.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { shirt,clothingCut,maskClothing } from './clothing.ts';
import { fittedHair } from './hair.ts';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finishWardrobe,shoeGeometries} from './wardrobe.ts';
import type { Appearance } from './appearance.ts';
const templates=new Map<string,THREE.Group>();
const bodyMasks=new WeakMap<THREE.BufferGeometry,Map<string,THREE.BufferGeometry>>();
let loading:Promise<void>|undefined;
export function preloadCharacters():Promise<void>{
  return loading??=Promise.all(['male','female'].map(async preset=>{
    if(templates.has(preset))return;
    const gltf=await new GLTFLoader().loadAsync(`/models/${preset}.glb`);templates.set(preset,gltf.scene);
  })).then(()=>{}).catch(error=>{loading=undefined;throw error;});
}
export function createAvatar(a:Appearance,template:THREE.Group|undefined=templates.get(a.preset)){
  if(!template)throw Error('Character assets not ready. Retry loading your character.');
  const root=new THREE.Group(),model=clone(template);root.add(model);model.updateMatrixWorld(true);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],textures:THREE.Texture[]=[],skeletons=new Set<THREE.Skeleton>();
  let bodyMesh:THREE.Mesh|undefined,sourceBodyGeometry:THREE.BufferGeometry|undefined;
  const bones=new Map<string,{bone:THREE.Bone;rest:THREE.Quaternion;axes:THREE.Vector3[]}>();
  model.traverse(o=>{
    if(o instanceof THREE.Bone){const inverse=o.getWorldQuaternion(new THREE.Quaternion()).invert();bones.set(o.name,{bone:o,rest:o.quaternion.clone(),axes:[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)].map(v=>v.applyQuaternion(inverse))});}
    if(o instanceof THREE.Mesh){
      const sourceGeometry:THREE.BufferGeometry=o.geometry;o.geometry=o.geometry.clone();geometries.push(o.geometry);
      const original=Array.isArray(o.material)?o.material[0]!:o.material;
      const material=original.clone() as THREE.MeshStandardMaterial;materials.push(material);o.material=material;
      // Share immutable decoded images, but own GPU texture handles/listeners per
      // actor. Closing one preview must neither leak a context nor break peers.
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap'] as const){const texture=material[key];if(texture){const owned=texture.clone();material[key]=owned;textures.push(owned);}}
      if(o instanceof THREE.SkinnedMesh){skeletons.add(o.skeleton);o.frustumCulled=false;}
      if(material.name==='Brows'){material.color.set(a.hairColor);return;}
      if(material.name==='MI_Eyes')return;bodyMesh=o;
      sourceBodyGeometry=sourceGeometry.clone();const key=['hoodie','jacket','shirt'].includes(a.outfit)?'long':'short',cuts=bodyMasks.get(sourceGeometry)??new Map<string,THREE.BufferGeometry>();let fitted=cuts.get(key);if(!fitted){fitted=sourceGeometry.clone();maskClothing(fitted,a.preset,a.outfit);fitted.computeVertexNormals();cuts.set(key,fitted);bodyMasks.set(sourceGeometry,cuts);}
      o.geometry.dispose();geometries.pop();o.geometry=fitted.clone();geometries.push(o.geometry);if(a.footwear!=='sandals'&&o.geometry.index){const ix=o.geometry.index,p=o.geometry.getAttribute('position'),visible:number[]=[];for(let i=0;i<ix.count;i+=3){if([0,1,2].every(k=>p.getY(ix.getX(i+k))<.105))continue;visible.push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));}o.geometry.setIndex(visible);}
      const p=o.geometry.getAttribute('position');if(a.footwear==='sandals')for(let i=0;i<p.count;i++)if(p.getY(i)<.038)p.setY(i,.038);const colors=new Float32Array(p.count*3),garment=new Float32Array(p.count);
      const skin=new THREE.Color(a.skin),bottom=new THREE.Color(a.trousers),shoe=new THREE.Color(a.shoes),lip=skin.clone().lerp(new THREE.Color('#a75c57'),.25);
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x);
        const shirt=clothingCut(x,y,a.preset,a.outfit)>.001,trousers=y<=1&&y>(a.bottom==='shorts'?.60:.10)&&ax<.30,foot=y<.105&&ax<.28;
        let c=trousers?bottom:foot?(a.footwear==='sandals'?skin:shoe):skin;
        const lipY=a.preset==='female'?1.615:1.641;
        if(ax<.028&&Math.abs(y-lipY)<.009&&z>.075)c=lip;
        c.toArray(colors,i*3);
        if(shirt||trousers)garment[i]=1;
      }
      // Mask covered body triangles instead of allowing anatomy to poke through
      // the separate shirt. Native face/neck, exposed arms and source files remain.
      o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));o.geometry.setAttribute('garment',new THREE.BufferAttribute(garment,1));material.vertexColors=true;material.color.set('#ffffff');material.roughness=.78;
      material.onBeforeCompile=shader=>{
        shader.vertexShader='attribute float garment; varying float vGarment;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGarment=garment;');
        shader.fragmentShader='varying float vGarment;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','vec3 fabricNormal=normal;\n#include <normal_fragment_maps>\nnormal=normalize(mix(normal,fabricNormal,vGarment));');
      };material.customProgramCacheKey=()=> 'wukari-fitted-clothes-v1';
    }
  });
  const visibleGeometry=bodyMesh!.geometry;bodyMesh!.geometry=sourceBodyGeometry!;
  const garmentMesh=shirt(bodyMesh as THREE.SkinnedMesh,a);finishWardrobe(bodyMesh as THREE.SkinnedMesh,a,garmentMesh);geometries.push(garmentMesh.geometry);materials.push(garmentMesh.material);bodyMesh!.geometry=visibleGeometry;sourceBodyGeometry!.dispose();
  // Fitted footwear follows each native foot bone; source fingers/toes stay intact.
  for(const side of ['l','r']){
    const foot=bones.get('foot_'+side)!.bone,world=foot.getWorldPosition(new THREE.Vector3()),inverse=foot.matrixWorld.clone().invert();
    const parts=shoeGeometries(a.footwear),colored:THREE.BufferGeometry[]=[];
    for(const {geometry,part} of parts){const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.deleteAttribute('uv');const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),color=new THREE.Color(part==='sole'?(a.footwear==='sandals'?'#514634':'#d7d5c7'):part==='trim'?'#8e958d':a.shoes);for(let i=0;i<p.count;i++)color.toArray(colors,i*3);g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.translate(world.x,0,0);g.applyMatrix4(inverse);colored.push(g);geometry.dispose();}
    const geometry=mergeGeometries(colored)!;colored.forEach(g=>g.dispose());const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:a.footwear==='casual'?.65:.88,side:THREE.DoubleSide});const shoe=new THREE.Mesh(geometry,material);shoe.name='fitted-shoe-'+side;foot.add(shoe);geometries.push(geometry);materials.push(material);
  }
  const head=bones.get('Head')!.bone,hairFit=fittedHair(head,bodyMesh!,a),hair=hairFit.group;geometries.push(...hairFit.geometries);materials.push(...hairFit.materials);
  model.scale.x=a.body==='broad'?1.08:a.body==='slender'?.94:1;
  const shadowGeometry=new THREE.CircleGeometry(.28,24),shadowMaterial=new THREE.MeshBasicMaterial({color:'#344339',transparent:true,opacity:.18,depthWrite:false});
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);geometries.push(shadowGeometry);materials.push(shadowMaterial);
  const q=new THREE.Quaternion();
  function rotate(name:string,x=0,y=0,z=0){const b=bones.get(name);if(!b)return;b.bone.quaternion.copy(b.rest);if(x)b.bone.quaternion.multiply(q.setFromAxisAngle(b.axes[0]!,x));if(y)b.bone.quaternion.multiply(q.setFromAxisAngle(b.axes[1]!,y));if(z)b.bone.quaternion.multiply(q.setFromAxisAngle(b.axes[2]!,z));}
  let blend=0,run=0,phase=0,previousDistance=0;
  function animate(time:number,distance:number,moving:boolean,sprinting:boolean,dt:number){
    const ease=1-Math.exp(-dt*10);blend+=(Number(moving)-blend)*ease;run+=(Number(sprinting)-run)*ease;
    phase=(phase+Math.max(0,distance-previousDistance)*(4.5-run*1.3))%(Math.PI*2);previousDistance=distance;
    const wave=Math.sin(phase),amp=(.46+run*.23)*blend;
    rotate('spine_03',run*.11*blend,0,wave*.025*blend+Math.sin(time*.8)*.008*(1-blend));rotate('Head',0,Math.sin(time*.55)*.025*(1-blend));
    for(const [side,sign]of [['l',1],['r',-1]] as const){const w=wave*sign;
      rotate('thigh_'+side,-w*amp);rotate('calf_'+side,Math.max(0,-w)*(.7+run*.5)*blend);rotate('foot_'+side,w*amp-Math.max(0,-w)*(.7+run*.5)*blend);
      rotate('upperarm_'+side,w*amp*.8,0,-sign*1.40);rotate('lowerarm_'+side,0,-sign*(.16+run*.85*blend));
    }
    bones.get('spine_02')!.bone.scale.y=1+Math.sin(time*2)*.004*(1-blend);
  }
  animate(0,0,false,false,1);
  return {root,hair,head,animate,dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());skeletons.forEach(s=>s.dispose());}};
}
