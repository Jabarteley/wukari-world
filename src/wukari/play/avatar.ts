/** Original procedural art. Joint/stride approach follows Allworld scene/characters.ts (AGPL).
 * Metres, feet on y=0; the body turns local -Z art toward +Z for advance() yaw zero.
 * Geometry is grouped by anatomical joint and merged by material to keep draw calls bounded.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Appearance } from './appearance.ts';
export function createAvatar(a: Appearance) {
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body); body.rotation.y=Math.PI;
  const resources: THREE.BufferGeometry[]=[], materials: THREE.Material[]=[];
  const palette: Record<string,THREE.MeshStandardMaterial>={};
  const mat=(c:string)=>palette[c]??(palette[c]=(()=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.82});materials.push(m);return m;})());
  const bins=new Map<THREE.Group,Map<string,THREE.BufferGeometry[]>>();
  function ell(parent: THREE.Group,c:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,segments=16) {
    const g=new THREE.SphereGeometry(1,segments,12);g.scale(sx,sy,sz);g.translate(x,y,z);
    let map=bins.get(parent);if(!map){map=new Map();bins.set(parent,map);}const list=map.get(c)??[];list.push(g);map.set(c,list);
  }
  function joint(parent:THREE.Group,name:string,x:number,y:number,z:number){const j=new THREE.Group();j.name=name;j.position.set(x,y,z);parent.add(j);return j;}
  function taper(parent:THREE.Group,c:string,x:number,y:number,z:number,upper:number,lower:number,height:number,depth=1){
    const g=new THREE.CylinderGeometry(upper,lower,height,16);g.scale(1,1,depth);g.translate(x,y,z);
    let map=bins.get(parent);if(!map){map=new Map();bins.set(parent,map);}const list=map.get(c)??[];list.push(g);map.set(c,list);
  }
  const torso=joint(body,'torso',0,1.02,0), head=joint(torso,'head',0,.52,0);
  head.scale.setScalar(.86);
  const skin=a.skin, hair=a.hairColor, top=a.top, dark=a.trousers;
  // Tailored shirt silhouette: shoulder, chest and hem share a continuous surface.
  const shirt=new THREE.LatheGeometry([new THREE.Vector2(0,-.055),new THREE.Vector2(.198,-.055),new THREE.Vector2(.205,.06),new THREE.Vector2(.224,.29),new THREE.Vector2(.235,.36),new THREE.Vector2(.16,.415),new THREE.Vector2(.078,.435),new THREE.Vector2(0,.435)],24);
  shirt.scale(1,1,.61);bins.set(torso,new Map([[top,[shirt]]]));
  ell(torso,dark,0,-.10,0,.20,.13,.12);
  ell(torso,skin,0,.46,0,.078,.105,.074);
  // Skull, cheeks and jaw are separate volumes, with eyes inset into a front face.
  ell(head,skin,0,.13,0,.15,.205,.135);ell(head,skin,0,.035,-.034,.12,.112,.112);
  for(const side of [-1,1]) {
    ell(head,skin,side*.15,.11,0,.032,.052,.028);ell(head,'#8b5344',side*.171,.11,-.008,.008,.029,.015);
    ell(head,'#fff5e8',side*.060,.155,-.121,.038,.021,.016);
    ell(head,'#3a2921',side*.059,.155,-.135,.015,.017,.007);
    ell(head,'#100f12',side*.059,.155,-.141,.007,.011,.004);
    ell(head,'#ffffff',side*.055,.161,-.145,.004,.004,.002,8);
    ell(head,hair,side*.060,.194,-.122,.041,.009,.012);
  }
  ell(head,skin,0,.113,-.145,.019,.037,.030);
  ell(head,'#a26559',0,.037,-.145,.040,.010,.009);
  ell(head,'#452a28',0,.040,-.153,.033,.003,.003);
  ell(head,skin,0,.009,-.105,.055,.026,.025);
  // Sculpted hair cap: a partial sphere leaves the entire face clear.
  const cap=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.52);cap.scale(.159,.183,.145);cap.translate(0,.15,.008);
  const hairBins=bins.get(head)!;hairBins.set(hair,[...(hairBins.get(hair)??[]),cap]);
  if(a.hair==='crop') for(const s of [-1,1])ell(head,hair,s*.139,.188,.015,.023,.066,.10);
  if(a.hair==='curls'||a.hair==='twists') {
    for(let row=0;row<4;row++)for(let i=0;i<10;i++){
      const t=i*Math.PI*2/10+row*.3, r=Math.sin((row+1)*.32)*.16;
      ell(head,hair,Math.cos(t)*r,.335-row*.032,Math.sin(t)*r+.012,a.hair==='curls'?.047:.024,a.hair==='curls'?.043:.068,.038,10);
    }
  }
  if(a.hair==='bun'){ell(head,hair,0,.27,.123,.083,.083,.075);ell(head,hair,0,.19,.127,.13,.11,.04);}
  if(a.outfit==='polo'||a.outfit==='jacket')for(const s of [-1,1])ell(torso,a.outfit==='jacket'?'#e9e2d1':top,s*.065,.415,-.10,.065,.043,.021);
  if(a.outfit==='jacket') {ell(torso,'#e9e2d1',0,.22,-.130,.068,.22,.012);for(const s of [-1,1])ell(torso,top,s*.12,.20,-.124,.055,.24,.025);}
  const arms:THREE.Group[]=[],elbows:THREE.Group[]=[],legs:THREE.Group[]=[],knees:THREE.Group[]=[];
  for(const s of [-1,1]) {
    const arm=joint(torso,`arm${s}`,s*.27,.36,0); arms.push(arm);
    ell(arm,top,0,-.012,0,.079,.078,.079);
    taper(arm,top,0,-.075,0,.080,.072,.15);
    taper(arm,a.outfit==='jacket'?top:skin,0,-.215,0,.064,.052,.14);
    const elbow=joint(arm,'elbow',0,-.28,0);elbows.push(elbow);
    ell(elbow,a.outfit==='jacket'?top:skin,0,0,0,.052,.052,.052);
    taper(elbow,a.outfit==='jacket'?top:skin,0,-.105,0,.052,.037,.21);
    ell(elbow,skin,0,-.259,-.008,.049,.069,.030);
    ell(elbow,skin,-s*.037,-.245,-.028,.020,.038,.023);
    const leg=joint(body,`leg${s}`,s*.112,.96,0);legs.push(leg);
    taper(leg,dark,0,-.20,0,.103,.079,.40,1.05);
    const knee=joint(leg,'knee',0,-.405,0);knees.push(knee);
    ell(knee,dark,0,0,0,.079,.079,.083);
    taper(knee,dark,0,-.205,.004,.078,.057,.41,1.05);
    ell(knee,a.shoes,0,-.46,-.052,.085,.073,.159);
    if(a.footwear==='boots')taper(knee,a.shoes,0,-.375,0,.075,.081,.17);
    ell(knee,'#424848',0,-.502,-.055,.086,.021,.158);
    for(let l=0;l<3;l++)ell(knee,'#c2c3b9',0,-.42,-.071-l*.025,.051,.006,.006,8);
  }
  body.scale.set(a.body==='broad'?1.13:a.body==='slender'?.89:1,1,a.body==='broad'?1.08:1);
  for(const [parent,map] of bins)for(const [c,geometries]of map){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(merged){resources.push(merged);parent.add(new THREE.Mesh(merged,mat(c)));}}
  const shadowGeometry=new THREE.CircleGeometry(.30,24),shadowMaterial=new THREE.MeshBasicMaterial({color:'#344339',transparent:true,opacity:.18,depthWrite:false});
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;root.add(shadow);resources.push(shadowGeometry);materials.push(shadowMaterial);
  let blend=0,run=0,phase=0,previousDistance=0;
  function animate(time:number,distance:number,moving:boolean,sprinting:boolean,dt:number){
    const ease=1-Math.exp(-dt*10);blend+=(Number(moving)-blend)*ease;run+=(Number(sprinting)-run)*ease;
    // Integrate travelled distance. Multiplying total distance by a changing gait
    // rate would jump the pose when sprinting after a long walk.
    phase=(phase+Math.max(0,distance-previousDistance)*(4.5-run*1.3))%(Math.PI*2);previousDistance=distance;
    const wave=Math.sin(phase),amp=(.55+run*.24)*blend;
    body.position.y=Math.abs(Math.sin(phase))*.025*blend+Math.sin(time*2)*.003*(1-blend);
    torso.rotation.x=-run*.10*blend;torso.rotation.z=Math.sin(time*.9)*.012*(1-blend)+wave*.025*blend;
    torso.scale.y=1+Math.sin(time*2)*.007*(1-blend);head.rotation.y=Math.sin(time*.6)*.035*(1-blend);
    for(let i=0;i<2;i++){const w=i===0?wave:-wave;legs[i]!.rotation.x=w*amp;knees[i]!.rotation.x=-Math.max(0,-w)*(.65+run*.6)*blend;arms[i]!.rotation.x=-w*amp*.78;arms[i]!.rotation.z=(i===0?-1:1)*.09;elbows[i]!.rotation.x=.12+run*.9*blend+Math.max(0,w)*.13*blend;}
  }
  animate(0,0,false,false,1);
  return {root,animate,dispose(){root.removeFromParent();resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
