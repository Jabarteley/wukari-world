/** Low-cost regional styling; only tagged polygons are geographic ground-cover evidence. */
import * as T from 'three';
import type {Study} from './model.ts';
import {zebraCrossings} from './crossings.ts';
export function terrain(study:Study){
 const group=new T.Group(),g=new T.PlaneGeometry(study.halfSize*2,study.halfSize*2,80,80);g.rotateX(-Math.PI/2);
 const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),soil=new T.Color('#bcb18e'),grass=new T.Color('#7d9565');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),mix=T.MathUtils.smoothstep(Math.sin(x*.013)+Math.cos(z*.019)+Math.sin((x+z)*.031)*.4,-.65,.85);soil.clone().lerp(grass,mix*.88).toArray(colors,i*3);}
 g.setAttribute('color',new T.BufferAttribute(colors,3));const ground=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true}));ground.position.y=-.08;group.add(ground);
 for(const f of study.groundCover??[]){const tag=f.tags.landuse??f.tags.natural??f.tags.leisure,color=['grass','meadow','forest','wood','park','garden'].includes(tag??'')?'#7e9866':['scrub','farmland','orchard'].includes(tag??'')?'#a3a16b':undefined;if(!color)continue;
  const shape=new T.Shape(f.points.map(p=>new T.Vector2(p.x,-p.z))),geom=new T.ShapeGeometry(shape);geom.rotateX(-Math.PI/2);const mesh=new T.Mesh(geom,new T.MeshLambertMaterial({color,side:T.DoubleSide}));mesh.position.y=-.07;group.add(mesh);
 }
 return group;
}
export function pedestrianView(study:Study){
 const group=new T.Group(),walk:number[]=[],cross:number[]=[];
 for(const p of study.pedestrians?.pieces??[]){
  // Disconnected/rejected areas remain inspectable in the debug map, not misleading walkable paving.
  if(p.component!==study.pedestrians?.component)continue;
  if(p.kind==='crossing')continue;
  const out=walk,dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,len=Math.hypot(dx,dz);if(!len)continue;const nx=-dz/len*p.halfWidth,nz=dx/len*p.halfWidth,y=.04;
  out.push(p.a.x+nx,y,p.a.z+nz,p.a.x-nx,y,p.a.z-nz,p.b.x+nx,y,p.b.z+nz,p.a.x-nx,y,p.a.z-nz,p.b.x-nx,y,p.b.z-nz,p.b.x+nx,y,p.b.z+nz);
  for(const v of [p.a,p.b])for(let j=0;j<10;j++){const a=j*Math.PI/5,b=(j+1)*Math.PI/5;out.push(v.x,y,v.z,v.x+Math.cos(a)*p.halfWidth,y,v.z+Math.sin(a)*p.halfWidth,v.x+Math.cos(b)*p.halfWidth,y,v.z+Math.sin(b)*p.halfWidth);}
 }
 for(const crossing of zebraCrossings(study))for(const bar of crossing.bars)for(const i of [0,1,2,0,2,3]){const p=bar[i]!;cross.push(p.x,.028,p.z);}
 for(const [positions,color]of [[walk,'#d6d1bd'],[cross,'#ffffff']] as const){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new T.Mesh(g,new T.MeshLambertMaterial({color,side:T.DoubleSide}));if(positions===cross)mesh.name='illustrative-zebra-crossing-paint';group.add(mesh);}
 return group;
}
