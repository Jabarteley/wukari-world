/** Small original garment meshes fitted to, and weighted from, the native rig. */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Appearance } from './appearance.ts';
export function shirt(body:T.SkinnedMesh,a:Appearance){
  const female=a.preset==='female',dy=female?-.04:0,width=female?.205:.245,depth=female?.17:.165;
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  const rows=[[.94,.88],[1,.87],[1.13,.87],[1.29,1],[1.40,1],[1.455,.90],[1.49,.27]];
  for(let row=0;row<rows.length;row++)for(let col=0;col<=32;col++){
    const [y,scale]=rows[row]!,angle=col/32*Math.PI*2;
    positions.push(Math.sin(angle)*width*scale!,y!+dy,-.024+Math.cos(angle)*depth*scale!);uv.push(col/32,row/rows.length);
    if(row+1<rows.length&&col<32){const n=row*33+col;indices.push(n,n+1,n+33,n+1,n+34,n+33);}
  }
  const torso=new T.BufferGeometry();torso.setAttribute('position',new T.Float32BufferAttribute(positions,3));torso.setAttribute('uv',new T.Float32BufferAttribute(uv,2));torso.setIndex(indices);torso.computeVertexNormals();
  const parts:T.BufferGeometry[]=[torso];
  for(const sign of [-1,1]){
    const sleeve=new T.CylinderGeometry(.082,.087,female?.18:.23,20,3,true);sleeve.rotateZ(Math.PI/2);sleeve.translate(sign*(female?.245:.31),female?1.418:1.455,female?-.054:-.065);parts.push(sleeve);
  }
  if(a.outfit==='polo'){const collar=new T.TorusGeometry(.062,.011,8,24);collar.rotateX(Math.PI/2);collar.translate(0,1.49+dy,-.024);parts.push(collar);}
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const p=geometry.getAttribute('position'),source=body.geometry.getAttribute('position'),joints=body.geometry.getAttribute('skinIndex'),weights=body.geometry.getAttribute('skinWeight');
  const skinIndex=new Uint16Array(p.count*4),skinWeight=new Float32Array(p.count*4),colors=new Float32Array(p.count*3),top=new T.Color(a.top),inner=new T.Color('#e3dfce');
  for(let i=0;i<p.count;i++){
    let nearest=0,best=Infinity;
    for(let j=0;j<source.count;j++){const d=(p.getX(i)-source.getX(j))**2+(p.getY(i)-source.getY(j))**2+(p.getZ(i)-source.getZ(j))**2;if(d<best){best=d;nearest=j;}}
    for(let k=0;k<4;k++){skinIndex[i*4+k]=joints.getComponent(nearest,k);skinWeight[i*4+k]=weights.getComponent(nearest,k);}
    (a.outfit==='jacket'&&Math.abs(p.getX(i))<.045&&p.getZ(i)>.03?inner:top).toArray(colors,i*3);
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.93,side:T.DoubleSide}),mesh=new T.SkinnedMesh(geometry,material);mesh.name='casual-shirt';mesh.bind(body.skeleton,body.bindMatrix);mesh.frustumCulled=false;
  body.parent!.add(mesh);
  return {geometry,material};
}
