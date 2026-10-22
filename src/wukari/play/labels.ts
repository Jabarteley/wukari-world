import * as T from 'three';
import type {Study} from './model.ts';
export function signTexture(text:string,subtitle:string){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;
 c.fillStyle='#153e36';c.fillRect(0,0,1024,256);c.strokeStyle='#f3f4df';c.lineWidth=6;c.strokeRect(8,8,1008,240);c.fillStyle='#ffffff';c.textAlign='center';
 const words=text.split(' '),lines:string[]=[''];for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).trim().length>26&&lines[i])lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}
 c.font='600 52px Arial, sans-serif';lines.slice(0,2).forEach((line,i)=>c.fillText(line,512,lines.length>1?72+i*62:110,970));c.font='32px Arial, sans-serif';c.fillStyle='#dce8d6';c.fillText(subtitle,512,216,970);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;return texture;
}
export function roadLabels(study:Study){
 const group=new T.Group(),materials:T.SpriteMaterial[]=[],textures=new Map<string,T.CanvasTexture>();let count=0;
 const roads=[...study.roads].filter(r=>r.tags.name).sort((a,b)=>{const p=study.spawn?.point??{x:0,z:0};return Math.min(...a.points.map(v=>Math.hypot(v.x-p.x,v.z-p.z)))-Math.min(...b.points.map(v=>Math.hypot(v.x-p.x,v.z-p.z)));});
 const placed:T.Vector3[]=[];
 for(const r of roads){let texture=textures.get(r.tags.name!);if(!texture){texture=signTexture(r.tags.name!,r.tags.ref?`${r.tags.ref} / OSM name`:'OSM road name');textures.set(r.tags.name!,texture);}
  const points=[...r.points].sort((a,b)=>{const p=study.spawn?.point??{x:0,z:0};return Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z);});
  for(const p of points){if(count>=14||placed.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<110))continue;const material=new T.SpriteMaterial({map:texture,depthTest:true}),sprite=new T.Sprite(material);sprite.position.set(p.x,4.7,p.z);sprite.scale.set(14,3.5,1);group.add(sprite);placed.push(sprite.position);materials.push(material);count++;}
 }
 return {group,update(camera:T.Camera){for(const o of group.children){const distance=o.position.distanceTo(camera.position);o.visible=distance>20&&distance<170;}},dispose(){textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
