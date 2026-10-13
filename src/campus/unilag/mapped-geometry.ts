import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BufferGeometry, Group, InstancedMesh } from 'three';
import type { Kit } from '../../scene/kit.ts';
import { createBatch, sceneMaterials } from '../../scene/build.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import { boundsOf } from './geo.ts';
import type { CampusMapBuilding, MetrePoint, MetreRing } from './geo.ts';
import { standalones } from './standalone.ts';
import { landmarkHeight, bodyColour, drawLandmarkCrowns, drawMainGate, isSenateTower, paintBuilding, roofColour } from './architecture.ts';
import { CAMPUS_TREES } from './landscape.ts';
import { instances, primitiveGeometry } from '../shared/geometry.ts';

/** OSM footprints are preserved; facade rhythm and untagged heights are interpretations. */
export function createMappedGeometry(kit: Kit) {
  const { THREE } = kit;
  const group = new THREE.Group();
  const materials = sceneMaterials(kit);
  const tileSize = 256;
  const tiles = new Map<string, CampusMapBuilding[]>();
  const resident = new Map<string, { group: Group; detail: boolean }>();
  const detailGroup = new THREE.Group(); detailGroup.name = 'Near campus facades'; group.add(detailGroup);
  let detailKey = '', treeKey = '';
  let nearTrees: InstancedMesh | null = null, farTrees: InstancedMesh | null = null;
  const DETAIL_RADIUS = 120, DETAIL_TRIANGLES = 5500, HIGH_TREES = 24;
  let rebuilds = 0;
  const tile = (x: number, z: number) => `${Math.floor(x / tileSize)}:${Math.floor(z / tileSize)}`;
  for (const b of CAMPUS_MAP.buildings) {
    const [x0,z0,x1,z1] = boundsOf(b.ring), key = tile((x0+x1)/2,(z0+z1)/2);
    const list = tiles.get(key) ?? []; list.push(b); tiles.set(key,list);
  }
  const shapeOf = (ring: MetreRing) => new THREE.Shape(ring.map(([x,z]) => new THREE.Vector2(x,-z)));
  function polygon(ring: MetreRing, height: number, color: string): BufferGeometry {
    const geometry = height > 0
      ? new THREE.ExtrudeGeometry(shapeOf(ring), { depth: height, bevelEnabled: false, curveSegments: 1 })
      : new THREE.ShapeGeometry(shapeOf(ring));
    geometry.rotateX(-Math.PI/2);
    const c = new THREE.Color(color), colors = new Float32Array(geometry.attributes.position!.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    if(!geometry.index)return geometry;
    const expanded=geometry.toNonIndexed();geometry.dispose();return expanded;
  }
  function merged(geometries: BufferGeometry[], into: Group) {
    if(!geometries.length)return;
    const geometry=mergeGeometries(geometries,false);
    geometries.forEach(g=>g.dispose());
    if(!geometry)return;
    const mesh=new THREE.Mesh(geometry,materials.solid);mesh.castShadow=true;mesh.receiveShadow=true;into.add(mesh);
  }
  function clear(node: Group) {
    node.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();if(object instanceof THREE.InstancedMesh)object.dispose();});
    node.removeFromParent();node.clear();
  }
    const parts=CAMPUS_MAP.buildings.flatMap(b=>{
      if(b.osm.id!==653186158)return [b];
      // The long OSM outline includes the low podium. The southern tower is an
      // estimated massing split checked against the May 2025 overhead image.
      const ring:MetrePoint[]=[];
      const depth=([x,z]:MetrePoint)=>(x-1514)*-.382+(z+181)*-.924-24;
      for(let i=1;i<b.ring.length;i++){
        const a=b.ring[i-1]!,p=b.ring[i]!,da=depth(a),dp=depth(p);
        if(da<=0)ring.push(a);
        if((da<=0)!==(dp<=0)){const t=da/(da-dp);ring.push([a[0]+(p[0]-a[0])*t,a[1]+(p[1]-a[1])*t]);}
      }
      if(ring[0])ring.push(ring[0]);
      return [b,{...b,ring,height:43}];
    }).map(b=>{const height=landmarkHeight(b);return height===b.height?b:{...b,height};}).concat(standalones().map(s=>s.building));
  const bodies: BufferGeometry[] = [], roofs: BufferGeometry[] = [];
  for (const b of parts) {
    const color=bodyColour(b);
    bodies.push(polygon(b.ring,b.height,color));
    const roof=polygon(b.ring,0,roofColour(b));roof.translate(0,b.height+.035,0);roofs.push(roof);
  }
  const mass=new THREE.Group();mass.name='All mapped footprints and roofs';mass.userData.footprints=CAMPUS_MAP.buildings.length;mass.userData.parts=parts.length;merged(bodies,mass);merged(roofs,mass);group.add(mass);
  const distanceTo = (b: CampusMapBuilding,x: number,z: number): number => { const [x0,z0,x1,z1]=boundsOf(b.ring); return Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1)); };
  let night=false;
  /** Lit windows are separate glow meshes: invisible by day, shown at dusk and night. */
  function applyGlow(node:Group){node.traverse(o=>{if(o instanceof THREE.Mesh&&o.material===materials.glow)o.visible=night;});}
  function facadeDetail(buildings: CampusMapBuilding[]) {
    clear(detailGroup);group.add(detailGroup);const batch=createBatch(THREE);const budget={left:DETAIL_TRIANGLES};
    for(const b of buildings){if(budget.left<40)break;if(isSenateTower(b))continue;paintBuilding(batch,b,budget);}
    const remaining=budget.left;
    for(const mesh of batch.build(materials).meshes)detailGroup.add(mesh);detailGroup.userData.triangles=DETAIL_TRIANGLES-remaining;applyGlow(detailGroup);rebuilds++;
  }
  const land=new THREE.Group();land.name='UNILAG mapped ground';group.add(land);
  const groundGeometries=[polygon(CAMPUS_MAP.boundary,0,'#778b65')];
  for(const surface of CAMPUS_MAP.surfaces){
    const color=surface.kind==='pool'?'#469eb4':surface.kind==='water'?'#4a8187':surface.kind==='pitch'?'#5b8055':surface.kind==='sports'?'#84936c':'#526e55';
    const geometry=polygon(surface.ring,0,color);geometry.translate(0,surface.kind==='pitch'||surface.kind==='pool'?.035:.014,0);groundGeometries.push(geometry);
  }
  merged(groundGeometries,land);
  const treeGeometry=primitiveGeometry(kit,b=>{
    b.cyl(0,3,0,.32,6,'#786c50',{seg:7});
    b.ico(0,7.4,0,4.4,3.1,4.1,'#476a47');
    b.ico(-2.2,6.2,1.2,3.2,2.5,3.1,'#668258');
    b.ico(2.4,7.1,-.9,2.8,2.6,3,'#597a4e');
  });
  const farTreeGeometry=primitiveGeometry(kit,b=>{
    b.cone(0,4.6,0,4.4,8.4,'#56764f',{seg:3,open:true});
  });
  const TREE_TONES=['#ffffff','#e4efcc','#f4f2dc','#cfe3d2','#fff0c0','#d9e8c0'];
  function treeDetail(x:number,z:number){
    const near=CAMPUS_TREES.map((tree,index)=>({tree,index,distance:Math.hypot(tree.x-x,tree.z-z)})).filter(item=>item.distance<140).sort((a,b)=>a.distance-b.distance).slice(0,HIGH_TREES), indices=new Set(near.map(item=>item.index)),key=[...indices].sort((a,b)=>a-b).join(',');
    if(key===treeKey&&farTrees)return;treeKey=key;
    nearTrees?.removeFromParent();nearTrees?.dispose();farTrees?.removeFromParent();farTrees?.dispose();
    const item=(p:typeof CAMPUS_TREES[number])=>({x:p.x,y:0,z:p.z,sx:p.size,sy:p.size,sz:p.size,ry:p.x*.37,color:TREE_TONES[Math.floor(Math.abs(Math.sin(p.x*3.1+p.z*7.7))*6)%6]});
    nearTrees=instances(kit,treeGeometry,near.map(({tree})=>item(tree)));farTrees=instances(kit,farTreeGeometry,CAMPUS_TREES.filter((_,i)=>!indices.has(i)).map(item));
    if(nearTrees)land.add(nearTrees);if(farTrees)land.add(farTrees);rebuilds++;
  }
  const roads=createBatch(THREE);
  for(const surface of CAMPUS_MAP.surfaces.filter(s=>s.kind==='pitch')){
    const [x0,z0,x1,z1]=boundsOf(surface.ring),cx=(x0+x1)/2,cz=(z0+z1)/2;
    for(let i=1;i<surface.ring.length;i++){
      const a=surface.ring[i-1]!,b=surface.ring[i]!;
      const ax=cx+(a[0]-cx)*.94,az=cz+(a[1]-cz)*.94,bx=cx+(b[0]-cx)*.94,bz=cz+(b[1]-cz)*.94;
      roads.at((ax+bx)/2,.055,(az+bz)/2,Math.atan2(bx-ax,bz-az),b=>b.quad(0,0,0,.13,Math.hypot(bx-ax,bz-az),'#e3dfc9',{rx:-Math.PI/2}));
    }
  }
  for(const road of CAMPUS_MAP.roads)for(let i=1;i<road.points.length;i++){
    const [ax,az]=road.points[i-1]!,[bx,bz]=road.points[i]!,length=Math.hypot(bx-ax,bz-az);
    if(length<.05)continue;
    const ry=Math.atan2(bx-ax,bz-az),x=(ax+bx)/2,z=(az+bz)/2;
    const foot=['footway','path','pedestrian','steps'].includes(road.highway);
    roads.at(x,.025,z,ry,b=>b.quad(0,0,0,road.width+1.8,length+.3,'#c8c4b3',{rx:-Math.PI/2}));
    roads.at(x,.065,z,ry,b=>b.quad(0,0,0,road.width,length+.3,foot?'#b7ae95':'#565e5e',{rx:-Math.PI/2}));
    if(!foot&&road.width>=6)for(let d=2;d<length-2;d+=10)roads.at(ax+(bx-ax)*d/length,.102,az+(bz-az)*d/length,ry,b=>b.quad(0,0,0,.13,3,'#d9d5bc',{rx:-Math.PI/2}));
  }
  for(const mesh of roads.build(materials).meshes){mesh.receiveShadow=true;land.add(mesh);}

  // Gate silhouette follows Ei'eke's May 2025 photograph. Dimensions are estimated.
  const gate=createBatch(THREE);
  gate.at(0,0,0,-Math.PI/2,()=>drawMainGate(gate));
  const gateGroup=new THREE.Group();gateGroup.name='Main gate photo interpretation';for(const mesh of gate.build(materials).meshes)gateGroup.add(mesh);group.add(gateGroup);
  const crownBatch=createBatch(THREE);drawLandmarkCrowns(crownBatch,parts);
  const crown=new THREE.Group();crown.name='Senate House tower and landmark crowns';for(const mesh of crownBatch.build(materials).meshes){mesh.castShadow=true;crown.add(mesh);}applyGlow(crown);group.add(crown);
  for(const x of [-16,0,16]){
    const width=x===0?5:1.4;
    const vertices=x===0?[[-width/2,6.8],[-width/2,12.5],[0,9],[width/2,12.5],[width/2,6.8]]:[[-width/2,6.8],[-width/2,13],[width/2,10.8],[width/2,6.8]];
    const shape=new THREE.Shape(vertices.map(p=>new THREE.Vector2(p[0]!,p[1]!)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false});geometry.translate(x,0,-1.5);geometry.rotateY(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,kit.material('#d6bd86'));mesh.castShadow=true;gateGroup.add(mesh);
  }
  function update(x:number,z:number,time?:string){
    if(time!==undefined&&(time!=='day')!==night){night=time!=='day';applyGlow(detailGroup);applyGlow(crown);}
    const near=parts.filter(b=>distanceTo(b,x,z)<=DETAIL_RADIUS).sort((a,b)=>{const priority=(part:CampusMapBuilding)=>part.osm.id===653186158&&distanceTo(part,x,z)<60?-1:0;return priority(a)-priority(b)||distanceTo(a,x,z)-distanceTo(b,x,z)||b.height-a.height;}),key=near.map(b=>`${b.osm.id}:${b.height}`).sort().join(',');
    if(key!==detailKey){detailKey=key;facadeDetail(near);resident.clear();for(const b of near){const bounds=boundsOf(b.ring);resident.set(tile((bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2),{group:detailGroup,detail:true});}}
    treeDetail(x,z);
  }
  let disposed=false;
  return {group,update,get rebuilds(){return rebuilds;},get resident(){return [...resident.keys()];},dispose(){if(disposed)return;disposed=true;resident.clear();nearTrees?.dispose();farTrees?.dispose();nearTrees?.removeFromParent();farTrees?.removeFromParent();clear(mass);clear(detailGroup);clear(land);clear(gateGroup);clear(crown);treeGeometry.dispose();farTreeGeometry.dispose();group.removeFromParent();group.clear();}};
}
