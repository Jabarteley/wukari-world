import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const config=await (await fetch('scratch/review-config.json')).json();
const loader=new GLTFLoader();
const keys=['human','skin','cropProxy','bunProxy','wardrobe'];
const sources=Object.fromEntries(await Promise.all(keys.map(async k=>[k,await loader.loadAsync(config.paths[k])])));
const meshes=g=>{const m=new Map();g.traverse(x=>{if(x.isMesh)m.set(x.name,x)});return m};
const body= sources.human.scene, skin=meshes(sources.skin.scene);
let transferred=0;
for(const [name,m] of meshes(body)){
 if(name===config.placeholder){m.visible=false;continue;}
 if(!config.lids.includes(name)){if(!skin.has(name))throw Error('Missing named skin source: '+name);m.material=skin.get(name).material;transferred++;}
}
if(transferred!==26)throw Error('Unexpected skin transfer count '+transferred);
for(const name of config.skinAddedMeshes){const cap=skin.get(name);if(!cap)throw Error('Missing cap');body.add(cap);}
body.add(sources.wardrobe.scene);
const scene=new THREE.Scene();scene.background=new THREE.Color('#1b2d39');scene.add(body);
scene.add(new THREE.HemisphereLight(0xeef7ff,0x797060,2.1));
const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(3,5,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xb2cadc,1.3);fill.position.set(-3,2,-1);scene.add(fill);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(320,430);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.info.autoReset=false;
const camera=new THREE.PerspectiveCamera(31,320/430,.01,20);
const gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
const receipt={stage:'diagnostic-partial-binding',transferredSkinMeshes:transferred,lidMaterials:'unaltered human candidate fallback; old UV maps rejected',skeleton:false,bodyMask:false,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),views:[],budgets:{previewTriangles:34000,venueDrawCallsComparator:60},runtimeAdopted:false};
const apply=(values={})=>scene.traverse(n=>{if(!n.isMesh||!n.morphTargetDictionary)return;for(const [name,i]of Object.entries(n.morphTargetDictionary)){let v=values[name]??0;if(name.startsWith('corrective.height.'))v=(values['body.height']??0)*(values['expression.'+name.split('.').at(-1)]??0);if(name.startsWith('corrective.blinkArc')){const b=values['expression.blink'+name.split('blinkArc')[1]]??0;v=4*b*(1-b)}n.morphTargetInfluences[i]=v;}});
const stats=()=>{let triangles=0,primitives=0;const materials=new Set();scene.traverseVisible(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;primitives++;for(const m of(Array.isArray(n.material)?n.material:[n.material]))materials.add(m)}});return{triangles,primitives,materials:materials.size}};
let active=null;
function select(style){if(active)scene.remove(active);active=sources[style].scene;scene.add(active);apply({});}
const views=[
 ['Full body / front',[0,1.05,4.2],[0,.88,0],{}],
 ['Full body / three-quarter',[2.8,1.2,3.6],[0,.9,0],{}],
 ['Portrait / neutral',[0,1.64,.67],[0,1.635,0],{}],
 ['Portrait / half blink',[0,1.64,.67],[0,1.635,0],{'expression.blinkLeft':.5,'expression.blinkRight':.5}],
 ['Portrait / full blink',[0,1.64,.67],[0,1.635,0],{'expression.blinkLeft':1,'expression.blinkRight':1}],
 ['Short + broad / happy',[1.5,1.16,3.8],[0,.86,0],{'body.height':-1,'body.shoulderWidth':1,'expression.smileLeft':1,'expression.smileRight':1}]
];
for(const style of ['cropProxy','bunProxy']){
 select(style);const selected=stats();if(selected.triangles>34000)throw Error('Preview geometry exceeds unchanged cap');
 for(const [label,position,target,weights]of views){
  apply(weights);camera.position.fromArray(position);camera.lookAt(...target);scene.updateMatrixWorld(true);renderer.info.reset();renderer.render(scene,camera);
  receipt.views.push({style,label,weights,...selected,renderedTriangles:renderer.info.render.triangles,renderCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length??null,withinPreviewComparator:selected.triangles<=34000,withinVenueCallsComparator:renderer.info.render.calls<=60});
  const card=document.createElement('div');card.className='card';const img=document.createElement('img');img.src=renderer.domElement.toDataURL('image/png');card.append(img);const caption=document.createElement('div');caption.className='label';caption.innerHTML=`<span class="style">${style==='cropProxy'?'Crop silhouette':'Bun silhouette'} · ${selected.triangles.toLocaleString()} triangles</span><br>${label}`;card.append(caption);document.querySelector('#views').append(card);
 }
}
// One real swap back and garment removal/restoration; no unbounded idle loop.
select('cropProxy');apply({});const neutral=sources.human.scene.getObjectByName('Head_continuous_anatomy');receipt.returnedToNeutral=neutral.morphTargetInfluences.every(x=>x===0);
sources.wardrobe.scene.visible=false;receipt.withoutWardrobe=stats();sources.wardrobe.scene.visible=true;receipt.restoredWardrobe=stats();
const geometry=new Set(),material=new Set(),texture=new Set();for(const {scene:s}of Object.values(sources))s.traverse(n=>{if(n.geometry)geometry.add(n.geometry);for(const m of(n.material?Array.isArray(n.material)?n.material:[n.material]:[])){material.add(m);for(const v of Object.values(m))if(v?.isTexture)texture.add(v)}});
for(const g of geometry)g.dispose();for(const m of material)m.dispose();for(const t of texture)t.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();
receipt.cleanup={geometriesDisposed:geometry.size,materialsDisposed:material.size,texturesDisposed:texture.size,geometryAfter:renderer.info.memory.geometries,textureAfter:renderer.info.memory.textures,sceneChildren:scene.children.length,rendererDisposed:true,contextLossRequested:true};
window.__reviewReceipt=receipt;window.__reviewReady=true;
