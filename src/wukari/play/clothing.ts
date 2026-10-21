/** Continuous garment clipped from the licensed native body, retaining its rig weights. */
import * as T from 'three';
import type { Appearance } from './appearance.ts';
export function clothingCut(x:number,y:number,preset:Appearance['preset'],outfit:Appearance['outfit']='tee'){
  const female=preset==='female',long=['hoodie','jacket','shirt'].includes(outfit);
  return Math.min(y-.94,(long?(female?.65:.72):(female?.325:.375))-Math.abs(x),(female?1.448:1.49)+Math.min(.09,Math.abs(x)*.45)-y);
}
type Vertex={p:T.Vector3;n:T.Vector3;w:Map<number,number>};
/** Exact complementary body cut prevents skin/garment z-fighting at cuffs and hem. */
export function maskClothing(g:T.BufferGeometry,preset:Appearance['preset'],outfit:Appearance['outfit']='tee'){
  const names=Object.keys(g.attributes),attributes=names.map(name=>g.getAttribute(name) as T.BufferAttribute),arrays=attributes.map(a=>Array.from(a.array)),position=names.indexOf('position'),skin=names.indexOf('skinIndex'),weight=names.indexOf('skinWeight'),p=g.getAttribute('position'),source=g.index;
  const female=preset==='female',cuff=['hoodie','jacket','shirt'].includes(outfit)?(female?.65:.72):(female?.325:.375),cuts=[(x:number,y:number)=>y-.94,(x:number)=> cuff-x,(x:number)=>cuff+x,(x:number,y:number)=>(female?1.448:1.49)+Math.min(.09,Math.abs(x)*.45)-y];
  type V={id:number;values:number[][]};
  const vertex=(id:number):V=>({id,values:attributes.map(a=>Array.from({length:a.itemSize},(_,k)=>a.getComponent(id,k)))});
  function mix(a:V,b:V,t:number):V{const values=a.values.map((v,i)=>v.map((n,k)=>T.MathUtils.lerp(n,b.values[i]![k]!,t))),joints=new Map<number,number>();for(const [v,f]of [[a,1-t],[b,t]] as const)for(let k=0;k<4;k++){const id=v.values[skin]![k]!;joints.set(id,(joints.get(id)??0)+v.values[weight]![k]!*f);}const top=[...joints].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,[,w])=>s+w,0);values[skin]=Array.from({length:4},(_,i)=>top[i]?.[0]??0);values[weight]=Array.from({length:4},(_,i)=>(top[i]?.[1]??0)/sum);return{id:-1,values};}
  const index:number[]=[];
  function emit(poly:V[]){for(const v of poly)if(v.id<0){v.id=arrays[position]!.length/3;v.values.forEach((a,i)=>arrays[i]!.push(...a));}for(let j=1;j+1<poly.length;j++)index.push(poly[0]!.id,poly[j]!.id,poly[j+1]!.id);}
  for(let i=0;i<(source?.count??p.count);i+=3){const ids=[source?source.getX(i):i,source?source.getX(i+1):i+1,source?source.getX(i+2):i+2];if(cuts.some(c=>ids.every(id=>c(p.getX(id),p.getY(id))<0))){index.push(...ids);continue;}if(cuts.every(c=>ids.every(id=>c(p.getX(id),p.getY(id))>=0)))continue;let poly=ids.map(vertex);
    for(const cut of cuts){const inside:V[]=[],outside:V[]=[];for(let j=0;j<poly.length;j++){const a=poly[j]!,b=poly[(j+1)%poly.length]!,d=cut(a.values[position]![0]!,a.values[position]![1]!),e=cut(b.values[position]![0]!,b.values[position]![1]!);if(d>=0)inside.push(a);else outside.push(a);if((d>=0)!==(e>=0)){const v=mix(a,b,d/(d-e));inside.push(v);outside.push(v);}}if(outside.length>2)emit(outside);poly=inside;if(!poly.length)break;}
  }
  names.forEach((name,i)=>g.setAttribute(name,new T.BufferAttribute(name==='skinIndex'?new Uint16Array(arrays[i]!):new Float32Array(arrays[i]!),attributes[i]!.itemSize)));g.setIndex(index);
}
export function shirt(body:T.SkinnedMesh,a:Appearance){
  const g=body.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight'),ix=g.index;
  const positions:number[]=[],normals:number[]=[],joints:number[]=[],weights:number[]=[],colors:number[]=[];
  const top=new T.Color(a.top),inner=new T.Color('#e3dfce');
  const vertex=(i:number):Vertex=>{const w=new Map<number,number>();for(let k=0;k<4;k++)w.set(si.getComponent(i,k),(w.get(si.getComponent(i,k))??0)+sw.getComponent(i,k));return {p:new T.Vector3().fromBufferAttribute(p,i),n:new T.Vector3().fromBufferAttribute(n,i),w};};
  function interpolate(a:Vertex,b:Vertex,t:number):Vertex{const w=new Map<number,number>();for(const [j,v]of a.w)w.set(j,v*(1-t));for(const [j,v]of b.w)w.set(j,(w.get(j)??0)+v*t);return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),w};}
  // Sequential half-space clips create true continuous cuffs, hem and neckline.
  const cuff=['hoodie','jacket','shirt'].includes(a.outfit)?(a.preset==='female'?.65:.72):(a.preset==='female'?.325:.375);
  const cuts=[(v:Vertex)=>v.p.y-.94,(v:Vertex)=>cuff-v.p.x,(v:Vertex)=>cuff+v.p.x,(v:Vertex)=>(a.preset==='female'?1.448:1.49)+Math.min(.09,Math.abs(v.p.x)*.45)-v.p.y];
  function emit(v:Vertex){const q=v.p.clone().addScaledVector(v.n,.009);
    // A soft fabric envelope relaxes torso anatomy, without separate shoulder pieces.
    if(Math.abs(q.x)<.235&&q.y<1.47){const fade=T.MathUtils.smoothstep(1.47-q.y,0,.065)*T.MathUtils.smoothstep(.235-Math.abs(q.x),0,.06),depth=a.preset==='female'?.175:.168;const z=-.025+Math.sign(q.z+.025)*depth*Math.sqrt(Math.max(.1,1-(q.x/.265)**2));q.z=T.MathUtils.lerp(q.z,z,fade);const normal=new T.Vector3(q.x/(.265*.265),0,(q.z+.025)/(depth*depth)).normalize();v.n.lerp(normal,fade).normalize();}
    q.y=Math.max(.943,q.y);q.toArray(positions,positions.length);v.n.toArray(normals,normals.length);
    const w=[...v.w].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,[,v])=>s+v,0);for(let k=0;k<4;k++){joints.push(w[k]?.[0]??0);weights.push((w[k]?.[1]??0)/sum);}
    const panel=a.outfit==='jacket'&&Math.abs(q.x)<.044&&q.z>.04;const c=panel?inner:top.clone();if(a.outfit==='polo'&&q.y>(a.preset==='female'?1.425:1.465)&&Math.abs(q.x)<.10)c.multiplyScalar(.83);c.toArray(colors,colors.length);
  }
  for(let i=0;i<(ix?.count??p.count);i+=3){const ids=[ix?ix.getX(i):i,ix?ix.getX(i+1):i+1,ix?ix.getX(i+2):i+2];if(ids.every(id=>p.getY(id)<.93)||ids.every(id=>p.getY(id)>1.59)||ids.every(id=>p.getX(id)>cuff)||ids.every(id=>p.getX(id)<-cuff))continue;let poly=ids.map(vertex);for(const cut of cuts){const out:Vertex[]=[];for(let j=0;j<poly.length;j++){const u=poly[j]!,v=poly[(j+1)%poly.length]!,du=cut(u),dv=cut(v);if(du>=0)out.push(u);if((du>=0)!==(dv>=0))out.push(interpolate(u,v,du/(du-dv)));}poly=out;if(!poly.length)break;}for(let j=1;j+1<poly.length;j++){emit(poly[0]!);emit(poly[j]!);emit(poly[j+1]!);}}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide}),mesh=new T.SkinnedMesh(geometry,material);mesh.name='casual-shirt';mesh.bind(body.skeleton,body.bindMatrix);mesh.frustumCulled=false;body.parent!.add(mesh);
  return {geometry,material,mesh};
}
