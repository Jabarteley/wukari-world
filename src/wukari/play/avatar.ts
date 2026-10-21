/** Quaternius CC0 humanoid topology/rig; models/provenance.json and LICENSE.txt.
 * Original fitted hair/palette dressing; source face topology is unchanged.
 * Metres, +Z forward. Two immutable templates; instances own geometry/materials/rigs.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { shirt } from './clothing.ts';
import { fittedHair } from './hair.ts';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Appearance } from './appearance.ts';
const templates=new Map<string,THREE.Group>();
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
  let bodyMesh:THREE.Mesh|undefined;
  const bones=new Map<string,{bone:THREE.Bone;rest:THREE.Quaternion;axes:THREE.Vector3[]}>();
  model.traverse(o=>{
    if(o instanceof THREE.Bone){const inverse=o.getWorldQuaternion(new THREE.Quaternion()).invert();bones.set(o.name,{bone:o,rest:o.quaternion.clone(),axes:[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)].map(v=>v.applyQuaternion(inverse))});}
    if(o instanceof THREE.Mesh){
      o.geometry=o.geometry.clone();geometries.push(o.geometry);
      const original=Array.isArray(o.material)?o.material[0]!:o.material;
      const material=original.clone() as THREE.MeshStandardMaterial;materials.push(material);o.material=material;
      // Share immutable decoded images, but own GPU texture handles/listeners per
      // actor. Closing one preview must neither leak a context nor break peers.
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap'] as const){const texture=material[key];if(texture){const owned=texture.clone();material[key]=owned;textures.push(owned);}}
      if(o instanceof THREE.SkinnedMesh){skeletons.add(o.skeleton);o.frustumCulled=false;}
      if(material.name==='Brows'){material.color.set(a.hairColor);return;}
      if(material.name==='MI_Eyes')return;bodyMesh=o;
      const p=o.geometry.getAttribute('position'),colors=new Float32Array(p.count*3),garment=new Float32Array(p.count),covered=new Uint8Array(p.count);
      const skin=new THREE.Color(a.skin),top=new THREE.Color(a.top),bottom=new THREE.Color(a.trousers),shoe=new THREE.Color(a.shoes),lip=skin.clone().lerp(new THREE.Color('#a75c57'),.25);
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),neck=a.preset==='female'?1.44:1.48;
        const shirt=y>.94&&((ax<.225&&y<neck+Math.min(.05,ax*.3))||(ax>=.20&&ax<.40&&y>1.30&&y<1.56)),trousers=y<=.96&&y>.10&&ax<.30,foot=y<.105&&ax<.28;
        let c=shirt?top:trousers?bottom:foot?shoe:skin;
        const lipY=a.preset==='female'?1.615:1.641;
        if(ax<.028&&Math.abs(y-lipY)<.009&&z>.075)c=lip;
        c.toArray(colors,i*3);
        if(shirt||trousers)garment[i]=1;if(shirt)covered[i]=1;
      }
      // Mask covered body triangles instead of allowing anatomy to poke through
      // the separate shirt. Native face/neck, exposed arms and source files remain.
      const sourceIndex=o.geometry.index;
      if(sourceIndex){const visible:number[]=[];for(let i=0;i<sourceIndex.count;i+=3){const a=sourceIndex.getX(i),b=sourceIndex.getX(i+1),c=sourceIndex.getX(i+2);if(covered[a]!+covered[b]!+covered[c]!<2)visible.push(a,b,c);}o.geometry.setIndex(visible);}
      o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));o.geometry.setAttribute('garment',new THREE.BufferAttribute(garment,1));o.geometry.computeVertexNormals();material.vertexColors=true;material.color.set('#ffffff');material.roughness=.78;
      material.onBeforeCompile=shader=>{
        shader.vertexShader='attribute float garment; varying float vGarment;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGarment=garment;');
        shader.fragmentShader='varying float vGarment;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','vec3 fabricNormal=normal;\n#include <normal_fragment_maps>\nnormal=normalize(mix(normal,fabricNormal,vGarment));');
      };material.customProgramCacheKey=()=> 'wukari-fitted-clothes-v1';
    }
  });
  const garmentMesh=shirt(bodyMesh as THREE.SkinnedMesh,a);geometries.push(garmentMesh.geometry);materials.push(garmentMesh.material);
  // Fitted footwear follows each native foot bone; source fingers/toes stay intact.
  for(const side of ['l','r']){
    const foot=bones.get('foot_'+side)!.bone,world=foot.getWorldPosition(new THREE.Vector3()),inverse=foot.matrixWorld.clone().invert();
    for(const sole of [false,true]){
      const height=sole?.025:a.footwear==='boots'?.19:.085;
      const g=new RoundedBoxGeometry(.13,height,.28,2,.025);g.translate(world.x,sole?.018:height/2,0);g.applyMatrix4(inverse);
      const m=new THREE.MeshStandardMaterial({color:sole?'#343a3b':a.shoes,roughness:.85});foot.add(new THREE.Mesh(g,m));geometries.push(g);materials.push(m);
    }
  }
  const head=bones.get('Head')!.bone,hairFit=fittedHair(head,bodyMesh!,a),hair=hairFit.group;geometries.push(...hairFit.geometries);materials.push(...hairFit.materials);
  model.scale.x=a.body==='broad'?1.08:a.body==='slender'?.94:1;
  const shadowGeometry=new THREE.CircleGeometry(.28,24),shadowMaterial=new THREE.MeshBasicMaterial({color:'#344339',transparent:true,opacity:.18,depthWrite:false});
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);geometries.push(shadowGeometry);materials.push(shadowMaterial);
  const q=new THREE.Quaternion();
  function rotate(name:string,x=0,y=0,z=0){const b=bones.get(name);if(!b)return;b.bone.quaternion.copy(b.rest);for(const [i,angle]of [x,y,z].entries())if(angle)b.bone.quaternion.multiply(q.setFromAxisAngle(b.axes[i]!,angle));}
  let blend=0,run=0,phase=0,previousDistance=0;
  function animate(time:number,distance:number,moving:boolean,sprinting:boolean,dt:number){
    const ease=1-Math.exp(-dt*10);blend+=(Number(moving)-blend)*ease;run+=(Number(sprinting)-run)*ease;
    phase=(phase+Math.max(0,distance-previousDistance)*(4.5-run*1.3))%(Math.PI*2);previousDistance=distance;
    const wave=Math.sin(phase),amp=(.46+run*.23)*blend;
    rotate('spine_03',run*.11*blend,0,wave*.025*blend+Math.sin(time*.8)*.008*(1-blend));rotate('Head',0,Math.sin(time*.55)*.025*(1-blend));
    for(const [side,sign]of [['l',1],['r',-1]] as const){const w=wave*sign;
      rotate('thigh_'+side,-w*amp);rotate('calf_'+side,Math.max(0,-w)*(.7+run*.5)*blend);
      rotate('upperarm_'+side,w*amp*.8,0,-sign*1.40);rotate('lowerarm_'+side,0,-sign*(.16+run*.85*blend));
    }
    bones.get('spine_02')!.bone.scale.y=1+Math.sin(time*2)*.004*(1-blend);root.updateMatrixWorld(true);
  }
  animate(0,0,false,false,1);
  return {root,hair,head,animate,dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());skeletons.forEach(s=>s.dispose());}};
}
