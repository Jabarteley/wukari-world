/** Hair fitted against the licensed head surface, with no changes to the face. */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Appearance } from './appearance.ts';
export function fittedHair(head:T.Bone,body:T.Mesh,a:Appearance){
  const group=new T.Group();group.name='fitted-hair';head.add(group);
  const source=body.geometry,pos=source.getAttribute('position'),normal=source.getAttribute('normal'),index=source.index;
  const transform=head.matrixWorld.clone().invert().multiply(body.matrixWorld),normals=new T.Matrix3().getNormalMatrix(transform);
  type Vertex={p:T.Vector3;n:T.Vector3};
  const surface:number[]=[],capPosition:number[]=[],capNormal:number[]=[],capColor:number[]=[];
  const skin=new T.Color(a.skin),color=new T.Color(a.hairColor);
  const clip=(input:Vertex[],distance:(p:T.Vector3)=>number):Vertex[]=>{
    const out:Vertex[]=[];
    for(let i=0;i<input.length;i++){const v=input[i]!,u=input[(i+1)%input.length]!,d=distance(v.p),e=distance(u.p);if(d>=0)out.push(v);if((d>=0)!==(e>=0)){const t=d/(d-e);out.push({p:v.p.clone().lerp(u.p,t),n:v.n.clone().lerp(u.n,t).normalize()});}}
    return out;
  };
  for(let i=0;i<(index?.count??pos.count);i+=3){
    const vertices:Vertex[]=[];
    for(let k=0;k<3;k++){const j=index?index.getX(i+k):i+k;vertices.push({p:new T.Vector3().fromBufferAttribute(pos,j).applyMatrix4(transform),n:new T.Vector3().fromBufferAttribute(normal,j).applyNormalMatrix(normals)});}
    if(vertices.some(v=>v.p.y<.015))continue;
    vertices.forEach(v=>surface.push(v.p.x,v.p.y,v.p.z));
    // Clip against a high fade and forehead hairline; never place a cap on ears.
    let polygon=clip(vertices,p=>p.y-.105);polygon=clip(polygon,p=>p.y-.5*p.z-.112);
    for(let k=1;k+1<polygon.length;k++)for(const v of [polygon[0]!,polygon[k]!,polygon[k+1]!]){
      const p=v.p.clone().addScaledVector(v.n,.0018);capPosition.push(p.x,p.y,p.z);capNormal.push(v.n.x,v.n.y,v.n.z);
      const density=a.hair==='buzz'?T.MathUtils.clamp((p.y-.105)/.045,.18,.90):T.MathUtils.clamp((p.y-.105)/.035,.12,1);
      skin.clone().lerp(color,density).toArray(capColor,capColor.length);
    }
  }
  const scalpGeometry=new T.BufferGeometry();scalpGeometry.setAttribute('position',new T.Float32BufferAttribute(surface,3));scalpGeometry.computeVertexNormals();
  const scalpMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),scalp=new T.Mesh(scalpGeometry,scalpMaterial);
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  function top(x:number,z:number){ray.set(new T.Vector3(x,.4,z),down);const hit=ray.intersectObject(scalp)[0];return hit?hit.point.y:.20;}
  const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(capPosition,3));cap.setAttribute('normal',new T.Float32BufferAttribute(capNormal,3));cap.setAttribute('color',new T.Float32BufferAttribute(capColor,3));
  const capMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,side:T.DoubleSide});group.add(new T.Mesh(cap,capMaterial));
  const parts:T.BufferGeometry[]=[];
  function curl(p:T.Vector3,r:number){const g=new T.SphereGeometry(r,10,8);g.scale(1,.9,1);g.translate(p.x,p.y,p.z);parts.push(g);}
  function strand(points:T.Vector3[],r:number){parts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,r,10,false));curl(points[0]!,r);curl(points.at(-1)!,r);}
  if(a.hair==='low-fade'||a.hair==='short-afro'||a.hair==='curly-afro'){
    const rows=a.hair==='low-fade'?5:8,cols=24,r=a.hair==='low-fade'?.007:a.hair==='short-afro'?.013:.020,spread=a.hair==='curly-afro'?1.25:1;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const radius=(row+.3)/rows*.079,phi=col/cols*Math.PI*2+row*.37,x=Math.sin(phi)*radius,z=.012+Math.cos(phi)*radius*1.28;
      curl(new T.Vector3(x*spread,Math.max(.16+r,top(x,z)+r*.45+(spread-1)*.045),z*spread),r);
    }
  }
  if(a.hair==='cornrows')for(let row=-3;row<=3;row++){
    const x=row*.022,points:T.Vector3[]=[],extent=Math.sqrt(1-(x/.09)**2);
    for(let k=0;k<=32;k++){
      const z=(.075-k/32*.175)*extent;ray.set(new T.Vector3(x,.4,z),down);const hit=ray.intersectObject(scalp)[0];
      if(hit)points.push(new T.Vector3(x+Math.sin(k*2.2)*.001,z>.04?Math.max(.15,hit.point.y+.003):hit.point.y+.003,z));
    }
    if(points.length>2)strand(points,.0045);
  }
  if(a.hair==='box-braids'||a.hair==='locs')for(let row=0;row<3;row++)for(let col=0;col<14;col++){
    const phi=col/14*Math.PI*2+row*.24,radius=.025+row*.022,x=Math.sin(phi)*radius,z=.01+Math.cos(phi)*radius,side=x>=0?1:-1,back=Math.cos(phi)<-.15;
    const p=new T.Vector3(x,top(x,z)+.004,z);
    const edge=new T.Vector3(back?Math.sin(phi)*.10:side*.105,.145,back?-.095:0);
    const end=new T.Vector3(edge.x*1.08,-.18,edge.z-.02);
    const r=a.hair==='box-braids'?.0045:.007;
    strand([p,new T.Vector3((p.x+edge.x)/2,Math.max(p.y,.205), (p.z+edge.z)/2),edge,edge.clone().lerp(end,.35),end],r);
    if(a.hair==='box-braids')for(let k=0;k<16;k++){
      const q=edge.clone().lerp(end,k/16);q.x+=Math.sin(k*2.4)*.002;curl(q,.005);
    }
  }
  if(a.hair==='bun'){
    for(let k=0;k<20;k++){const t=k/20*Math.PI*2;curl(new T.Vector3(Math.sin(t)*.030,.17+Math.cos(t)*.027,-.11),.015);}
  }
  const material=new T.MeshStandardMaterial({color:a.hairColor,roughness:.94});
  let merged:T.BufferGeometry|undefined;
  if(parts.length){const expanded=parts.map(g=>{const n=g.index?g.toNonIndexed():g.clone();n.deleteAttribute('uv');return n;});merged=mergeGeometries(expanded)!;group.add(new T.Mesh(merged,material));[...parts,...expanded].forEach(g=>g.dispose());}
  scalpGeometry.dispose();scalpMaterial.dispose();
  return {group,geometries:merged?[cap,merged]:[cap],materials:[capMaterial,material]};
}
