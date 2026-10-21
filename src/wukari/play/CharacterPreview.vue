<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { createAvatar } from './avatar.ts';
import type { Appearance } from './appearance.ts';
const props=defineProps<{look:Appearance}>(), host=ref<HTMLDivElement>(), view=ref('front');
let renderer:THREE.WebGLRenderer, observer:ResizeObserver, person:ReturnType<typeof createAvatar>, scene:THREE.Scene, camera:THREE.PerspectiveCamera;
let previous=0;
function turn(value:string){view.value=value;if(person)person.root.rotation.y=value==='side'?Math.PI/2:value==='back'?Math.PI:0;}
watch(()=>props.look,()=>{if(!scene)return;person.dispose();person=createAvatar(props.look);scene.add(person.root);turn(view.value);},{deep:true});
onMounted(()=>{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.value!.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Live character preview');
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8ed','#7e8a83',2.5));const light=new THREE.DirectionalLight('#fff3db',2.5);light.position.set(-2,4,4);scene.add(light);
  camera=new THREE.PerspectiveCamera(33,1,.1,20);camera.position.set(0,1.2,3.8);camera.lookAt(0,.95,0);
  person=createAvatar(props.look);scene.add(person.root);
  observer=new ResizeObserver(()=>{const r=host.value!.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();});observer.observe(host.value!);
  renderer.setAnimationLoop(time=>{const dt=previous?Math.min(.05,(time-previous)/1000):0;previous=time;person.animate(time/1000,0,false,false,dt);renderer.render(scene,camera);});
});
onBeforeUnmount(()=>{renderer?.setAnimationLoop(null);observer?.disconnect();person?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();});
</script>
<template><div class="portrait"><div ref="host" class="preview-canvas"></div><div class="preview-views" aria-label="Character angles"><button v-for="angle in ['front','side','back']" :key="angle" :aria-pressed="view===angle" @click="turn(angle)">{{ angle }}</button></div><span class="preview-caption">Your look. Your Wukari.</span></div></template>
<style scoped>.portrait{position:relative;min-height:330px;background:radial-gradient(ellipse at 50% 55%,#f3e5c8 0%,#c6d6bf 65%,#a8c1ac 100%);border-radius:18px;overflow:hidden}.preview-canvas{position:absolute;inset:0 0 40px}.preview-canvas :deep(canvas){display:block;width:100%;height:100%}.preview-views{position:absolute;bottom:40px;left:0;right:0;display:flex;justify-content:center;gap:5px}.preview-views button{text-transform:capitalize;min-height:36px;border:1px solid #829784;border-radius:20px;background:#f8f5e7bb;font-size:11px;padding:7px 15px}.preview-views button[aria-pressed=true]{background:#244f40;color:white}.preview-caption{position:absolute;bottom:14px;width:100%;text-align:center;font-size:10px;letter-spacing:2px;color:#335144}</style>
