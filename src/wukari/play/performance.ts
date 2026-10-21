import type { Settings } from './appearance.ts';
import * as T from 'three';

export const graphics = {
  low: {scale:.75, pixelCap:1, far:220, lines:false},
  balanced: {scale:1, pixelCap:1.25, far:500, lines:true},
  high: {scale:1, pixelCap:1.75, far:1000, lines:true},
} satisfies Record<Settings['quality'],{scale:number;pixelCap:number;far:number;lines:boolean}>;

/** Bounded storage, no objects allocated per sample. CPU timings are not GPU timings. */
export class FrameSamples {
  private frames=new Float64Array(7200);
  private updates=new Float64Array(7200);
  private renders=new Float64Array(7200);
  count=0;
  push(frame:number,update:number,render:number){if(this.count>=this.frames.length||frame<=0||!Number.isFinite(frame+update+render))return;const i=this.count++;this.frames[i]=frame;this.updates[i]=update;this.renders[i]=render;}
  result(){
    const frames=Array.from(this.frames.subarray(0,this.count)).sort((a,b)=>a-b),mean=(a:Float64Array)=>this.count?a.subarray(0,this.count).reduce((s,v)=>s+v,0)/this.count:0;
    return {frames:this.count,fps:mean(this.frames)?1000/mean(this.frames):0,p50Ms:frames[Math.floor(this.count*.5)]??0,p95Ms:frames[Math.floor(this.count*.95)]??0,over33ms:frames.filter(v=>v>1000/30).length,updateCpuMs:mean(this.updates),renderSubmitCpuMs:mean(this.renders)};
  }
}

/** Estimated texture storage only; driver allocations/MSAA/cache overhead are unavailable. */
export function textureBytes(scene:T.Object3D){
  const seen=new Set<T.Texture>();let bytes=0;
  function add(texture:T.Texture|null|undefined){if(!texture||seen.has(texture))return;seen.add(texture);const image=texture.image as {width?:number;height?:number}|undefined;if(image?.width&&image.height)bytes+=image.width*image.height*(texture.type===T.FloatType?16:4)*(texture.generateMipmaps?4/3:1);}
  scene.traverse(o=>{if(o instanceof T.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials)for(const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap'] as const)add((m as T.MeshStandardMaterial)[key]);if(o instanceof T.SkinnedMesh)add(o.skeleton.boneTexture);}});
  return Math.round(bytes);
}
