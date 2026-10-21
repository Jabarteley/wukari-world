/** No mapped street furniture exists in this local window: all placements are scenery. */
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildingCollision,lineDistance,type Point,type Study} from './model.ts';
import {footprintClearance} from './roads.ts';
import {signTexture} from './labels.ts';
export interface Prop extends Point {kind:'pole'|'tree'|'shelter'|'sign';yaw:number;radius:number;illustrative:true}
export function sceneryPositions(study:Study){const props:Prop[]=[],wires:{a:Point;b:Point}[]=[];const roads=[...study.roads].sort((a,b)=>Number(!!b.tags.name)-Number(!!a.tags.name)||a.distanceM-b.distanceM);
 function safe(p:Point,radius:number){return Math.abs(p.x)<study.halfSize-5&&Math.abs(p.z)<study.halfSize-5&&!buildingCollision(p,study.buildings,radius)&&study.roads.every(r=>lineDistance(p,r.points)>radius+2.5)&&props.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>radius+q.radius+2);}
 for(const road of roads){let previous:Point|undefined;for(let i=1;i<road.points.length;i++){const a=road.points[i-1]!,b=road.points[i]!,length=Math.hypot(b.x-a.x,b.z-a.z);if(length<30)continue;const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
  for(let d=17;d<length-8;d+=44){if(props.filter(p=>p.kind==='pole').length>=85)break;const p={x:a.x+dx*d+dz*4.5,z:a.z+dz*d-dx*4.5};if(!safe(p,.35)){previous=undefined;continue;}props.push({...p,kind:'pole',radius:.35,yaw:Math.atan2(dx,dz),illustrative:true});if(previous&&Math.hypot(p.x-previous.x,p.z-previous.z)<60&&study.buildings.every(b=>footprintClearance(previous!,p,b.points)>1))wires.push({a:previous,b:p});previous=p;
   const tree={x:p.x+dz*5,z:p.z-dx*5};if(safe(tree,1.7))props.push({...tree,kind:'tree',yaw:0,radius:1.7,illustrative:true});
   if(props.filter(p=>p.kind==='shelter').length<2){const bus={x:p.x+dz*5+dx*7,z:p.z-dx*5+dz*7};if(safe(bus,2.1))props.push({...bus,kind:'shelter',yaw:Math.atan2(dx,dz),radius:2.1,illustrative:true});}
   if(road.tags.name&&props.filter(p=>p.kind==='sign').length<3){const sign={x:p.x-dx*5,z:p.z-dz*5};if(safe(sign,.4))props.push({...sign,kind:'sign',radius:.4,yaw:Math.atan2(dx,dz),illustrative:true});}
  }
 }}return {props,wires};}
export function infrastructure(study:Study){const positions=study.id==='town'?sceneryPositions(study):{props:[] as Prop[],wires:[] as {a:Point;b:Point}[]},group=new T.Group(),textures:T.Texture[]=[],materials:T.Material[]=[],templates=new Map<Prop['kind'],T.InstancedMesh>();
 function model(kind:Prop['kind']){const parts:T.BufferGeometry[]=[];function add(g:T.BufferGeometry,color:string){const geometry=g.index?g.toNonIndexed():g.clone();geometry.deleteAttribute('uv');const count=geometry.getAttribute('position').count,c=new T.Color(color),colors=new Float32Array(count*3);for(let i=0;i<count;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));parts.push(geometry);g.dispose();}function box(x:number,y:number,z:number,w:number,h:number,d:number,c:string){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);add(g,c);}function pole(x:number,z:number,height:number,radius:number,color:string){const g=new T.CylinderGeometry(radius*.7,radius,height,6);g.translate(x,height/2,z);add(g,color);}
  if(kind==='pole'){pole(0,0,6.6,.12,'#99917d');box(0,6.2,0,2,.12,.15,'#625c4c');box(0,5.8,.7,.08,.08,1.4,'#65746f');box(0,5.75,1.3,.45,.13,.28,'#e9d9a3');for(const x of [-.65,.65])box(x,6.4,0,.10,.25,.10,'#444f48');}
  if(kind==='tree'){pole(0,0,3,.15,'#6b5940');const g=new T.SphereGeometry(1.6,7,5);g.scale(1,.65,1);g.translate(0,3.1,0);add(g,'#718463');const small=new T.SphereGeometry(1.0,7,5);small.translate(.4,3.5,.2);add(small,'#7c8f6a');}
  if(kind==='shelter'){for(const x of [-1.25,1.25])for(const z of [-.65,.65])pole(x,z,2.65,.055,'#69736c');box(0,2.7,0,3,.16,1.8,'#71857d');box(0,.55,0,2.4,.1,.45,'#977951');box(0,1.05,-.65,2.6,.8,.08,'#b3b498');}
  if(kind==='sign'){pole(0,0,2.9,.055,'#6a776a');box(0,2.6,0,2.0,.65,.08,'#d8d6ad');}
  const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());const m=new T.MeshLambertMaterial({vertexColors:true}),mesh=new T.InstancedMesh(g,m,Math.max(1,positions.props.filter(p=>p.kind===kind).length));mesh.count=0;mesh.frustumCulled=false;materials.push(m);group.add(mesh);return mesh;
 }
 for(const kind of ['pole','tree','shelter','sign'] as const)templates.set(kind,model(kind));
 const wireVertices:number[]=[];for(const {a,b}of positions.wires)for(const side of [-.65,.65])for(let i=0;i<8;i++){const f=(t:number)=>[a.x+(b.x-a.x)*t+side,6.5-Math.sin(Math.PI*t)*.8,a.z+(b.z-a.z)*t];wireVertices.push(...f(i/8),...f((i+1)/8));}const wireGeometry=new T.BufferGeometry();wireGeometry.setAttribute('position',new T.Float32BufferAttribute(wireVertices,3));const wireMaterial=new T.LineBasicMaterial({color:'#444e43'});group.add(new T.LineSegments(wireGeometry,wireMaterial));
 for(const p of positions.props.filter(p=>p.kind==='shelter'||p.kind==='sign')){const texture=signTexture(p.kind==='shelter'?'Bus shelter / scenery':'F242 / OSM road name','Illustrative placement / not verified');textures.push(texture);const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),mesh=new T.Mesh(new T.PlaneGeometry(p.kind==='shelter'?2.7:2.0,.675),material);materials.push(material);mesh.position.set(p.x,p.kind==='shelter'?2.35:2.6,p.z+.06);mesh.rotation.y=p.yaw;group.add(mesh);}
 const dummy=new T.Object3D();let lastX=Infinity,lastZ=Infinity,lastRadius=0;
 function update(p:Point,radius:number){if(Math.hypot(p.x-lastX,p.z-lastZ)<10&&radius===lastRadius)return;lastX=p.x;lastZ=p.z;lastRadius=radius;for(const [kind,mesh]of templates){let n=0;for(const q of positions.props){if(q.kind!==kind||Math.hypot(q.x-p.x,q.z-p.z)>radius)continue;dummy.position.set(q.x,0,q.z);dummy.rotation.set(0,q.yaw,0);dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);}mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}}
 return{group,positions,update,dispose(){textures.forEach(t=>t.dispose());}};
}
