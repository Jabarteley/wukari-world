<script lang="ts">
// Bounded across menu visits; thumbnails contain no live WebGL resources.
const thumbnailCache=new Map<string,Record<string,string>>();
</script>
<script setup lang="ts">
import { onMounted,onBeforeUnmount,ref,watch } from 'vue';
import * as THREE from 'three';
import { createAvatar,preloadCharacters } from './avatar.ts';
import { hairstyles,type Appearance } from './appearance.ts';
const props=defineProps<{look:Appearance;showHairstyles?:boolean}>(),emit=defineEmits<{thumbnails:[value:Record<string,string>]}>();
const host=ref<HTMLDivElement>(),view=ref('front'),zoom=ref(0),footPreview=ref(false),turntable=ref(false),error=ref(''),ready=ref(false);
let renderer:THREE.WebGLRenderer,observer:ResizeObserver,person:ReturnType<typeof createAvatar>,scene:THREE.Scene,camera:THREE.PerspectiveCamera;
let previous=0,disposed=false,generation=0,lastThumbnailKey='';
function turn(value:string){turntable.value=false;view.value=value;if(person)person.root.rotation.y=value==='quarter'?.62:value==='side'?Math.PI/2:value==='back'?Math.PI:0;}
function frame(){if(!camera)return;if(footPreview.value){camera.position.set(0,.26,.68);camera.lookAt(0,.08,0);return;}const faceY=props.look.preset==='female'?1.655:1.70,target=.94+(faceY-.94)*zoom.value;camera.position.set(0,target+.10*(1-zoom.value),3.7-zoom.value*3.05);camera.lookAt(0,target,0);}
watch(zoom,()=>{footPreview.value=false;frame();});
function resize(){if(!host.value||!renderer)return;const r=host.value.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();frame();}
async function thumbnails(){
 if(!props.showHairstyles)return;
 const look={...props.look},key=[look.preset,look.skin,look.hairColor,look.body].join('/');if(key===lastThumbnailKey)return;lastThumbnailKey=key;const own=++generation,cached=thumbnailCache.get(key);if(cached){emit('thumbnails',cached);return;}emit('thumbnails',{});
 const thumbs:Record<string,string>={};
 for(const hair of hairstyles){
  await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(disposed||own!==generation)return;
  const sample=createAvatar({...look,hair});person.root.visible=false;scene.add(sample.root);
  try{renderer.setPixelRatio(1);renderer.setSize(160,160,false);camera.aspect=1;camera.updateProjectionMatrix();camera.position.set(0,look.preset==='female'?1.665:1.71,.67);camera.lookAt(0,look.preset==='female'?1.655:1.70,0);renderer.render(scene,camera);thumbs[hair]=renderer.domElement.toDataURL('image/png');}
  finally{sample.dispose();person.root.visible=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));resize();renderer.render(scene,camera);}
 }
 if(disposed||own!==generation)return;
 thumbnailCache.set(key,thumbs);if(thumbnailCache.size>4)thumbnailCache.delete(thumbnailCache.keys().next().value!);emit('thumbnails',thumbs);
}
watch(()=>props.look,()=>{if(!ready.value)return;person.dispose();person=createAvatar(props.look);scene.add(person.root);turn(view.value);frame();void thumbnails();},{deep:true});
onMounted(async()=>{
 try{
  await preloadCharacters();if(disposed)return;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));host.value!.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Live character preview');
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#f1f5ff','#71837d',2));const light=new THREE.DirectionalLight('#fff1df',2.7);light.position.set(-2,4,5);scene.add(light);const fill=new THREE.DirectionalLight('#c5e5ff',1);fill.position.set(3,2,-2);scene.add(fill);
  camera=new THREE.PerspectiveCamera(33,1,.1,20);person=createAvatar(props.look);scene.add(person.root);ready.value=true;observer=new ResizeObserver(resize);observer.observe(host.value!);resize();
  renderer.setAnimationLoop(time=>{const dt=previous?Math.min(.05,(time-previous)/1000):0;previous=time;if(document.hidden)return;if(turntable.value)person.root.rotation.y+=dt*.45;person.animate(time/1000,0,false,false,dt);renderer.render(scene,camera);});
  void thumbnails();
 }catch(e){error.value=e instanceof Error?e.message:String(e);}
});
onBeforeUnmount(()=>{disposed=true;generation++;renderer?.setAnimationLoop(null);observer?.disconnect();person?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();});
</script>
<template><div class="portrait" :data-preset="look.preset" :data-hair="look.hair" :data-ready="ready"><div ref="host" class="preview-canvas"></div><p v-if="!ready" class="preview-loading" role="status">{{ error||'Preparing your character…' }}</p><div class="preview-views" aria-label="Character angles"><button v-for="angle in ['front','quarter','side','back']" :key="angle" :aria-label="angle==='quarter'?'Three-quarter view':angle+' view'" :aria-pressed="view===angle&&!turntable" @click="turn(angle)">{{ angle==='quarter'?'¾':angle }}</button><button :aria-pressed="turntable" aria-label="Rotate character turntable" @click="turntable=!turntable">↻</button><button aria-label="Footwear view" :aria-pressed="footPreview" @click="footPreview=!footPreview;frame()">Shoes</button></div><label class="face-zoom">Body <input aria-label="Face preview zoom" type="range" min="0" max="1" step="0.05" v-model.number="zoom"/> Face</label></div></template>
<style scoped>.portrait{position:relative;min-height:370px;background:radial-gradient(ellipse at 50% 55%,#f3e5c8,#c6d6bf 65%,#a8c1ac);border-radius:18px;overflow:hidden}.preview-canvas{position:absolute;inset:0 0 86px}.preview-canvas :deep(canvas){display:block;width:100%;height:100%}.preview-views{position:absolute;bottom:45px;left:0;right:0;display:flex;justify-content:center;gap:4px}.preview-views button{text-transform:capitalize;min-height:44px;border:1px solid #829784;border-radius:20px;background:#f8f5e7dd;font-size:10px;padding:7px 12px}.preview-views button[aria-pressed=true]{background:#244f40;color:white}.face-zoom{position:absolute;bottom:10px;left:12px;right:12px;display:flex;align-items:center;gap:10px;font-size:10px;color:#335144}.face-zoom input{flex:1;min-width:0;accent-color:#315e47}.preview-loading{position:absolute;inset:30px;font-size:13px}</style>
