/** Original replaceable proposed entrance artwork. Not a reconstruction of the actual FUW gate. */
import * as THREE from 'three';
import type {Study} from './model.ts';
export function entranceView(study:Study){
 const group=new THREE.Group(),textures:THREE.Texture[]=[];const e=study.entrance;if(!e)return {group,dispose(){}};
 group.position.set(e.point.x,0,e.point.z);group.rotation.y=e.yaw;
 const stone=new THREE.MeshStandardMaterial({color:'#e8dfcd',roughness:.9}),green=new THREE.MeshStandardMaterial({color:'#164d3e',roughness:.65,metalness:.18}),trim=new THREE.MeshStandardMaterial({color:'#c7a55b',roughness:.5,metalness:.35});
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);group.add(o);return o;}
 for(const sign of [-1,1]){const x=e.halfSpan*sign;box(1, .3,1.5,x,.15,0,stone);box(.8,5.9,1,x,3.1,0,stone);box(1.1,.22,1.35,x,6.1,0,trim);box(.22,4.9,1.02,x,3.4,0,green);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),new THREE.MeshBasicMaterial({color:'#fff4bc'}));lamp.position.set(x,6.45,0);group.add(lamp);}
 // Vehicle clear height5.1m; the two continuous pedestrian corridors pass inside the supports.
 box(e.halfSpan*2,.9,1.25,0,5.7,0,green);box(e.halfSpan*2+.6,.18,1.5,0,6.24,0,trim);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-e.halfSpan,6.3,0),new THREE.Vector3(-3,7.1,0),new THREE.Vector3(0,7.5,0),new THREE.Vector3(3,7.1,0),new THREE.Vector3(e.halfSpan,6.3,0)]);group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,28,.15,6,false),trim));
 const c=document.createElement('canvas');c.width=2048;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#164d3e';ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff8dd';ctx.font='bold 91px Arial';ctx.fillText('FEDERAL UNIVERSITY WUKARI',1024,96);ctx.font='36px Arial';ctx.fillStyle='#e5cc8d';ctx.fillText('ENTRANCE AREA  •  PROPOSED ARTISTIC REPRESENTATION',1024,196);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.minFilter=THREE.LinearMipmapLinearFilter;textures.push(texture);
 for(const sign of [-1,1]){const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(e.halfSpan*2-.4,1.32),new THREE.MeshBasicMaterial({map:texture}));signMesh.position.set(0,5.83,sign*.636);if(sign<0)signMesh.rotation.y=Math.PI;group.add(signMesh);}
 // No invented gatehouse, compound wall, access road or campus building.
 return {group,dispose(){textures.forEach(t=>t.dispose());}};
}
