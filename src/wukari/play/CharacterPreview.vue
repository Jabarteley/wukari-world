<script setup lang="ts">
import { onMounted,onBeforeUnmount,ref,watch } from 'vue';
import * as THREE from 'three';
import { createAvatar,preloadCharacters } from './avatar.ts';
import { hairstyles,type Appearance } from './appearance.ts';
const props=defineProps<{look:Appearance}>(),emit=defineEmits<{thumbnails:[value:Record<string,string>]}>();
const host=ref<HTMLDivElement>(),view=ref('front'),zoom=ref(0),turntable=ref(false),error=ref(''),ready=ref(false);
let renderer:THREE.WebGLRenderer,observer:ResizeObserver,person:ReturnType<typeof createAvatar>,scene:THREE.Scene,camera:THREE.PerspectiveCamera;
let previous=0,disposed=false;
function turn(value:string){turntable.value=false;view.value=value;if(person)person.root.rotation.y=value==='quarter'?.62:value==='side'?Math.PI/2:value==='back'?Math.PI:0;}
function frame(){if(!camera)return;const faceY=props.look.preset==='female'?1.655:1.70,target=.94+(faceY-.94)*zoom.value;camera.position.set(0,target+.10*(1-zoom.value),3.7-zoom.value*3.05);camera.lookAt(0,target,0);}
watch(zoom,frame);
function resize(){if(!host.value||!renderer)return;const r=host.value.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();frame();}
watch(()=>props.look,()=>{if(!ready.value)return;person.dispose();person=createAvatar(props.look);scene.add(person.root);turn(view.value);frame();},{deep:true});
onMounted(async()=>{
 try{
  await preloadCharacters();if(disposed)return;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.value!.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Live character preview');
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#f1f5ff','#71837d',2));const light=new THREE.DirectionalLight('#fff1df',2.7);light.position.set(-2,4,5);scene.add(light);const fill=new THREE.DirectionalLight('#c5e5ff',1);fill.position.set(3,2,-2);scene.add(fill);
  camera=new THREE.PerspectiveCamera(33,1,.1,20);
  // One shared preview context renders actual model thumbnails, not invented icons.
  const thumbs:Record<string,string>={};renderer.setPixelRatio(1);renderer.setSize(160,160,false);
  // Keep the live actor's shader/texture leases warm while thumbnails render;
  // serial samples must not repeatedly tear down and recompile the same rig.
  person=createAvatar(props.look);scene.add(person.root);camera.position.set(0,props.look.preset==='female'?1.665:1.71,.67);camera.lookAt(0,props.look.preset==='female'?1.655:1.70,0);renderer.render(scene,camera);person.root.visible=false;
  for(const hair of hairstyles){const sample=createAvatar({...props.look,hair});scene.add(sample.root);camera.position.set(0,props.look.preset==='female'?1.665:1.71,.67);camera.lookAt(0,props.look.preset==='female'?1.655:1.70,0);renderer.render(scene,camera);thumbs[hair]=renderer.domElement.toDataURL('image/png');sample.dispose();}
  emit('thumbnails',thumbs);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  person.root.visible=true;ready.value=true;observer=new ResizeObserver(resize);observer.observe(host.value!);resize();
  renderer.setAnimationLoop(time=>{const dt=previous?Math.min(.05,(time-previous)/1000):0;previous=time;if(turntable.value)person.root.rotation.y+=dt*.45;person.animate(time/1000,0,false,false,dt);renderer.render(scene,camera);});
 }catch(e){error.value=e instanceof Error?e.message:String(e);}
});
onBeforeUnmount(()=>{disposed=true;renderer?.setAnimationLoop(null);observer?.disconnect();person?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();});
</script>
<template><div class="portrait" :data-preset="look.preset" :data-hair="look.hair" :data-ready="ready"><div ref="host" class="preview-canvas"></div><p v-if="!ready" class="preview-loading" role="status">{{ error||'Preparing your character…' }}</p><div class="preview-views" aria-label="Character angles"><button v-for="angle in ['front','quarter','side','back']" :key="angle" :aria-label="angle==='quarter'?'Three-quarter view':angle+' view'" :aria-pressed="view===angle&&!turntable" @click="turn(angle)">{{ angle==='quarter'?'¾':angle }}</button><button :aria-pressed="turntable" aria-label="Rotate character turntable" @click="turntable=!turntable">↻</button></div><label class="face-zoom">Body <input aria-label="Face preview zoom" type="range" min="0" max="1" step="0.05" v-model.number="zoom"/> Face</label></div></template>
<style scoped>.portrait{position:relative;min-height:370px;background:radial-gradient(ellipse at 50% 55%,#f3e5c8,#c6d6bf 65%,#a8c1ac);border-radius:18px;overflow:hidden}.preview-canvas{position:absolute;inset:0 0 86px}.preview-canvas :deep(canvas){display:block;width:100%;height:100%}.preview-views{position:absolute;bottom:45px;left:0;right:0;display:flex;justify-content:center;gap:4px}.preview-views button{text-transform:capitalize;min-height:44px;border:1px solid #829784;border-radius:20px;background:#f8f5e7dd;font-size:10px;padding:7px 12px}.preview-views button[aria-pressed=true]{background:#244f40;color:white}.face-zoom{position:absolute;bottom:10px;left:12px;right:12px;display:flex;align-items:center;gap:10px;font-size:10px;color:#335144}.face-zoom input{flex:1;min-width:0;accent-color:#315e47}.preview-loading{position:absolute;inset:30px;font-size:13px}</style>
