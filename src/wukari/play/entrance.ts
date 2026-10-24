/** Original photo-guided FUW gateway. Approximate scale/placement; no reference pixels redistributed. */
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {gateDesign,gateWorld} from './entrance-layout.ts';
import {segmentDistance} from './model.ts';
import {footprintClearance} from './roads.ts';
import type {Study,Point} from './model.ts';
export function entranceView(study:Study){
 const group=new T.Group(),textures:T.Texture[]=[],occluders:T.Object3D[]=[];const e=study.entrance;
 if(!e)return {group,lighting(_evening:boolean,_quality:string){},cameraDistance(_origin:T.Vector3,_offset:T.Vector3){return Infinity;},dispose(){}};
 group.position.set(e.point.x,0,e.point.z);group.rotation.y=e.yaw;
 const cream=new T.MeshStandardMaterial({color:'#e2d9bc',roughness:.88}),metal=new T.MeshStandardMaterial({color:'#929995',metalness:.55,roughness:.42}),steel=new T.MeshStandardMaterial({color:'#454b48',metalness:.45,roughness:.6}),roof=new T.MeshStandardMaterial({color:'#765447',metalness:.2,roughness:.75});
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,mat:T.Material){const ready=g.index?g.toNonIndexed():g;if(ready!==g)g.dispose();ready.deleteAttribute('uv');const list=batches.get(mat)??[];list.push(ready);batches.set(mat,list);}
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);add(g,mat);}
 function beam(a:T.Vector3,b:T.Vector3,width:number,mat:T.Material){const g=new T.BoxGeometry(width,a.distanceTo(b),width),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());g.applyQuaternion(rotation);g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);add(g,mat);}
 // Deep cream side walls with open arched pedestrian portals, not painted-on holes.
 const shape=new T.Shape();shape.moveTo(3.55,0);shape.lineTo(4.35,0);shape.lineTo(4.35,2.35);shape.absarc(5.3,2.35,.95,Math.PI,0,true);shape.lineTo(6.25,0);shape.lineTo(7.25,0);shape.lineTo(7.25,6.15);shape.lineTo(6.8,6.15);shape.lineTo(6.8,6.45);shape.lineTo(6.05,6.45);shape.lineTo(6.05,6.15);shape.lineTo(4.1,6.15);shape.lineTo(4.1,6.45);shape.lineTo(3.55,6.45);shape.closePath();
 for(const sign of [-1,1]){const outline=sign<0?new T.Shape(shape.getPoints(16).map(v=>new T.Vector2(-v.x,v.y))):shape;const g=new T.ExtrudeGeometry(outline,{depth:3.2,bevelEnabled:false,curveSegments:16});g.translate(0,0,-1.6);add(g,cream);
  // Open vehicle gate leaves folded along the entry, with recognisable vertical bars and rails.
  for(let z=-1.4;z<=1.6;z+=.19)box(.045,3.15,.045,sign*3.32,1.8,z,metal);
  for(const y of [.24,1.6,3.38])box(.07,.07,3.15,sign*3.32,y,.1,metal);
  for(const z of [-1.47,1.67])box(.085,3.3,.085,sign*3.32,1.82,z,metal);
  // Side gates remain open; bars sit against the outer jamb, leaving the path unobstructed.
  for(let z=-1.45;z<.1;z+=.18)box(.035,2.25,.035,sign*6.22,1.24,z,metal);
  for(const y of [.15,1.2,2.35])box(.045,.055,1.7,sign*6.22,y,-.65,metal);
  for(const z of [-1.63,1.63]){const vent=new T.CylinderGeometry(.17,.17,.035,16);vent.rotateX(Math.PI/2);vent.translate(sign*5.3,3.78,z);add(vent,steel);}
 }
 // Split stepped sign blocks match the photographs; the generic green/gold arch is gone.
 box(8.7,.68,.42,0,5.19,-1.39,cream);box(8.7,.68,.32,0,5.19,1.44,cream);box(3.35,.75,.62,2.45,5.9,-1.3,cream);box(3.95,1.05,.62,-1.9,6.05,-1.3,cream);
 box(8.2,.16,3.35,0,5.46,.02,roof);
 for(const z of [-1.15,0,1.15]){beam(new T.Vector3(-3.55,4.91,z),new T.Vector3(3.55,4.91,z),.09,steel);for(let x=-3.55;x<3.5;x+=1.18){beam(new T.Vector3(x,4.91,z),new T.Vector3(x+.59,5.35,z),.055,steel);beam(new T.Vector3(x+.59,5.35,z),new T.Vector3(Math.min(3.55,x+1.18),4.91,z),.055,steel);}}
 function sign(lines:string[],width:number,height:number,x:number,y:number,z:number,back=false){const c=document.createElement('canvas');c.width=1024;c.height=384;const ctx=c.getContext('2d')!;ctx.fillStyle='#e2d9bc';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#303a31';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+(lines.length>1?116:100)+'px Georgia';lines.forEach((line,i)=>ctx.fillText(line,512,192+(i-(lines.length-1)/2)*145,940));const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;textures.push(texture);const mesh=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,toneMapped:false}));mesh.position.set(x,y,z);if(!back)mesh.rotation.y=Math.PI;group.add(mesh);}
 for(const front of [true,false]){const z=front?-1.626:1.626;sign(['FEDERAL'],3.15,.65,2.45,5.94,z,!front);sign(['UNIVERSITY','WUKARI'],3.75,.94,-1.9,6.09,z,!front);sign(['ESTABLISHED IN 2011'],2.65,.35,-5.35,5.47,z,!front);}
 // Original plaque-zone artwork; no posters, logos or protected photo textures copied.
 box(1.8,1.15,.06,-5.3,4.42,-1.65,metal);box(1.66,1.01,.065,-5.3,4.42,-1.69,cream);
 const curb=new T.MeshStandardMaterial({color:'#d9d8cb',roughness:.95}),grass=new T.MeshStandardMaterial({color:'#65834d',roughness:1}),foliage=new T.MeshStandardMaterial({color:'#3f6942',roughness:1});
 for(const p of study.pedestrians?.pieces??[]){if(p.component!==study.pedestrians?.component||p.kind==='crossing'||Math.min(Math.hypot(p.a.x-e.point.x,p.a.z-e.point.z),Math.hypot(p.b.x-e.point.x,p.b.z-e.point.z))>22)continue;const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,len=Math.hypot(dx,dz);if(len<4||len>35)continue;for(const sign of [-1,1]){const nx=-dz/len*(p.halfWidth+.025)*sign,nz=dx/len*(p.halfWidth+.025)*sign,a=new T.Vector3(p.a.x+nx,.075,p.a.z+nz),b=new T.Vector3(p.b.x+nx,.075,p.b.z+nz);const inverse=new T.Matrix4().compose(new T.Vector3(e.point.x,0,e.point.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),e.yaw),new T.Vector3(1,1,1)).invert();const count=Math.max(1,Math.ceil(len));for(let j=0;j<count;j++){const u=a.clone().lerp(b,j/count),v=a.clone().lerp(b,(j+1)/count),mid=u.clone().add(v).multiplyScalar(.5);if((study.pedestrians?.pieces??[]).some(other=>other!==p&&other.component===study.pedestrians?.component&&segmentDistance({x:mid.x,z:mid.z},other.a,other.b)<other.halfWidth-.025))continue;u.applyMatrix4(inverse);v.applyMatrix4(inverse);beam(u,v,.075,curb);}}}
 for(const q of [{x:-10,z:-6},{x:10,z:-6},{x:-10,z:5},{x:10,z:5}]){const p=gateWorld(study,q),radius=1.7;if(study.buildings.some(b=>footprintClearance(p,p,b.points)<radius+.4)||(study.roadSurface??[]).some(r=>segmentDistance(p,r.a,r.b)<r.halfWidth+radius+.5)||(study.pedestrians?.pieces??[]).some(w=>segmentDistance(p,w.a,w.b)<w.halfWidth+radius+.3))continue;const disk=new T.CircleGeometry(radius,24);disk.rotateX(-Math.PI/2);disk.translate(q.x,-.055,q.z);add(disk,grass);for(let i=0;i<5;i++){const bush=new T.IcosahedronGeometry(.32,1);bush.scale(1,.8,1);bush.translate(q.x+Math.cos(i*1.256)*.95,.23,q.z+Math.sin(i*1.256)*.95);add(bush,foliage);}}
 for(const [mat,geoms]of batches){const merged=mergeGeometries(geoms);geoms.forEach(g=>g.dispose());if(merged){const mesh=new T.Mesh(merged,mat);group.add(mesh);if(mat===cream||mat===roof)occluders.push(mesh);}}
 const lampMaterial=new T.MeshStandardMaterial({color:'#faf2d5',emissive:'#ffd398',emissiveIntensity:.2}),lights:T.PointLight[]=[];
 for(const x of [-3.1,3.1]){const fixture=new T.Mesh(new T.BoxGeometry(.7,.07,.32),lampMaterial);fixture.position.set(x,4.77,.4);group.add(fixture);const light=new T.PointLight('#ffd5a0',0,15,2);light.position.set(x,4.55,.4);light.visible=false;group.add(light);lights.push(light);}
 const ray=new T.Raycaster();group.updateMatrixWorld(true);
 return {group,lighting(evening:boolean,quality:string){lampMaterial.emissiveIntensity=evening?2:.2;lights.forEach(l=>{l.visible=evening&&quality!=='low';l.intensity=l.visible?24:0;});},cameraDistance(origin:T.Vector3,offset:T.Vector3){if(Math.hypot(origin.x-e.point.x,origin.z-e.point.z)>30)return Infinity;ray.set(origin,offset.clone().normalize());ray.far=offset.length();return ray.intersectObjects(occluders,false)[0]?.distance??Infinity;},dispose(){textures.forEach(t=>t.dispose());}};
}
