import { navigation } from './navigation.ts';
import { graphics,FrameSamples,textureBytes } from './performance.ts';
import { roadSurfaces } from './roads.ts';
import { createAvatar } from './avatar.ts';
import { defaultAppearance, defaultSettings, type Appearance, type Settings } from './appearance.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { advance, bearingOf, type Study, type Motion, type Point } from './model.ts';

export interface Status { mode: string; position: Point; bearing: number; speed: number; distance: number; blocked: boolean; draws: number; triangles: number; fps: number }
export interface PerformanceReport {frames:number;fps:number;p50Ms:number;p95Ms:number;over33ms:number;updateCpuMs:number;renderSubmitCpuMs:number;[key:string]:unknown}
export interface PlayScene { measure():Promise<PerformanceReport>; dispose(): void; enter(): boolean; explore(): void; reset(): void; key(key: string, pressed: boolean): void; overview(): void; pause(value: boolean): void; status(): Status; appearance(value: Appearance): void; settings(value: Settings): void }

/** Lightweight stylised extrusion of exact recorded footprints; dimensions/terrain illustrative. */
export function createPlay(host: HTMLElement, study: Study, minimap: HTMLCanvasElement, report: (s: Status) => void): PlayScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor('#cee0dc');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Wukari geographic 3D view. Drag to rotate; use movement controls after pressing Play.');
  const nav=navigation(study);
  const scene = new THREE.Scene(),playFog=new THREE.Fog('#cee0dc',180,800);scene.fog=playFog;
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 2400);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - .08; controls.minDistance = 4; controls.maxDistance = study.halfSize * 3;
  scene.add(new THREE.HemisphereLight('#f4fbff', '#b89b6f', 2.4));
  const sunlight = new THREE.DirectionalLight('#fff1d0', 2.5); sunlight.position.set(-120, 180, 80); scene.add(sunlight);
  const world = new THREE.Group(); scene.add(world);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(study.halfSize * 2, study.halfSize * 2), new THREE.MeshLambertMaterial({ color: '#d8c7a3' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.08; world.add(ground);
  const buildingGeometries: THREE.BufferGeometry[] = [], roofGeometries: THREE.BufferGeometry[] = [];
  for (const feature of study.buildings) {
    const shape = new THREE.Shape(feature.points.map(p => new THREE.Vector2(p.x, -p.z)));
    const rawHeight = Number(feature.tags.height?.replace(/\s*m$/, ''));
    const height = Number.isFinite(rawHeight) && rawHeight >= 2 && rawHeight <= 60 ? rawHeight : 3.6;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
    geometry.rotateX(-Math.PI / 2); buildingGeometries.push(geometry);
    const roof = new THREE.ShapeGeometry(shape); roof.rotateX(-Math.PI / 2); roof.translate(0, height + .015, 0); roofGeometries.push(roof.toNonIndexed()); roof.dispose();
  }
  const merged = (geometries: THREE.BufferGeometry[], color: string): THREE.Mesh | null => {
    if (!geometries.length) return null;
    // Match attribute sets across geometry constructors before merging.
    for (const g of geometries) { g.deleteAttribute('uv'); g.clearGroups(); }
    const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    if (!geometry) throw new Error('Geographic geometry merge failed');
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })); world.add(mesh); return mesh;
  };
  merged(buildingGeometries, '#e5dac3'); merged(roofGeometries, '#a66b4f');
  const roadVertices: number[] = [], edges: number[] = [];
  const surfaces=study.roadSurface??roadSurfaces(study).pieces,caps=new Map<string,{x:number;z:number;radius:number}>();
  for(const {a,b,halfWidth:radius} of surfaces){
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(!length)continue;
    const nx=-dz/length*radius,nz=dx/length*radius;
    roadVertices.push(a.x+nx,.015,a.z+nz,a.x-nx,.015,a.z-nz,b.x+nx,.015,b.z+nz,a.x-nx,.015,a.z-nz,b.x-nx,.015,b.z-nz,b.x+nx,.015,b.z+nz);
    // Each exact-clearance capsule is independently safe, including curved joins.
    for(const p of [a,b]){const key=p.x+','+p.z,previous=caps.get(key);if(!previous||previous.radius<radius)caps.set(key,{...p,radius});}
    edges.push(a.x,.04,a.z,b.x,.04,b.z);
  }
  for(const {x,z,radius} of caps.values())for(let j=0;j<10;j++){const u=j*Math.PI/5,v=(j+1)*Math.PI/5;roadVertices.push(x,.015,z,x+Math.cos(u)*radius,.015,z+Math.sin(u)*radius,x+Math.cos(v)*radius,.015,z+Math.sin(v)*radius);}
  const roadGeometry = new THREE.BufferGeometry(); roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3)); roadGeometry.computeVertexNormals();
  world.add(new THREE.Mesh(roadGeometry, new THREE.MeshLambertMaterial({ color: '#667471', side: THREE.DoubleSide })));
  const centerGeometry = new THREE.BufferGeometry(); centerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
  const centerLines=new THREE.LineSegments(centerGeometry,new THREE.LineBasicMaterial({color:'#91a19b',transparent:true,opacity:.5}));world.add(centerLines);
  world.updateMatrixWorld(true);world.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
  for (const candidate of study.candidates) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 14, 12), new THREE.MeshBasicMaterial({ color: '#dc773e' }));
    marker.position.set(candidate.point.x, 7, candidate.point.z); world.add(marker);
  }
  let person = createAvatar(defaultAppearance);
  const avatar = new THREE.Group(); avatar.visible=false; avatar.add(person.root); scene.add(avatar);
  let preferences = {...defaultSettings};
  let state: Motion = { ...(study.spawn?.point ?? { x: 0, z: 0 }), yaw: 0, moving: false, sprinting: false, blocked: false, distance: 0 };
  let walking = false, paused = false, followYaw = 0, followPitch = .12, cameraDistance = 5, down: { x: number; y: number; id: number } | null = null;
  const keys = new Set<string>();
  let lastTime = 0, frames = 0, fps = 0, measureAt = 0, publishedAt = 0;
  const viewDirection=new THREE.Vector3();
  const status = (): Status => ({ mode: walking ? (state.sprinting ? 'Sprinting' : state.moving ? 'Walking' : 'Standing') : 'Exploration · no character', position: { x: state.x, z: state.z }, bearing: bearingOf(camera.getWorldDirection(viewDirection)),
    speed: walking && state.moving ? state.sprinting ? 6 : 2.4 : 0, distance: state.distance, blocked: state.blocked, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps });
  const overview = () => { scene.fog=null;controls.target.set(0, 0, 0); camera.position.set(0, study.halfSize * 1.05, study.halfSize * .9); camera.far = 2400; controls.update(); };
  overview();
  const reset = () => {
    keys.clear(); state = { ...(study.spawn?.point ?? { x: 0, z: 0 }), yaw: 0, moving: false, sprinting: false, blocked: false, distance: 0 };
    const road = study.roads.find(r => r.id === study.spawn?.roadId), index = road?.nodes.indexOf(study.spawn?.nodeId ?? -1) ?? -1;
    const next = index >= 0 ? road?.points[index + 1] ?? road?.points[index - 1] : undefined;
    followYaw = next ? Math.atan2(state.x - next.x, state.z - next.z) : 0;
    followPitch = .12; cameraDistance = 5; if (walking) camera.position.set(state.x + Math.sin(followYaw)*5, 3.2, state.z + Math.cos(followYaw)*5);
    renderer.domElement.focus();
  };
  const enter = () => { if (!study.spawn?.eligible) return false; walking = true;camera.far=graphics[preferences.quality].far;camera.updateProjectionMatrix();scene.fog=playFog; reset(); controls.enabled = false; avatar.visible = true; renderer.domElement.focus(); return true; };
  const explore = () => { walking = false; keys.clear(); avatar.visible = false; controls.enabled = true; overview(); };
  const key = (name: string, pressed: boolean) => { if (pressed) keys.add(name.toLowerCase()); else keys.delete(name.toLowerCase()); };
  const keyDown = (e: KeyboardEvent) => { if (!walking || paused || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName))) return; if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','q','e'].includes(e.key.toLowerCase())) { e.preventDefault(); key(e.key, true); } };
  const keyUp = (e: KeyboardEvent) => key(e.key, false);
  const clear = () => { keys.clear(); down = null; };
  const pointerDown = (e: PointerEvent) => { if (!walking) return; renderer.domElement.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const pointerMove = (e: PointerEvent) => { if (!walking || !down || down.id !== e.pointerId) return; followYaw -= (e.clientX - down.x) * .006 * preferences.sensitivity; followPitch = THREE.MathUtils.clamp(followPitch + (e.clientY - down.y) * .004 * preferences.sensitivity, .12, .85); down = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const pointerUp = () => { down = null; };
  const wheel = (e: WheelEvent) => { if (walking) { e.preventDefault(); cameraDistance = THREE.MathUtils.clamp(cameraDistance + e.deltaY * .01, 3, 19); } };
  const contextMenu = (e: Event) => e.preventDefault();
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('lostpointercapture', pointerUp); canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', contextMenu);
  const resize = () => { const r = host.getBoundingClientRect(); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); renderer.setSize(r.width, r.height, false); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const map = minimap.getContext('2d')!, mapSize = 200;
  minimap.width = minimap.height = mapSize;
  const mapPoint = (p: Point) => ({ x: mapSize / 2 + p.x / study.halfSize * 94, y: mapSize / 2 + p.z / study.halfSize * 94 });
  const base = document.createElement('canvas'); base.width = base.height = mapSize; const m = base.getContext('2d')!;
  m.fillStyle = '#e0d8bf'; m.fillRect(0,0,mapSize,mapSize);
  for (const b of study.buildings) { m.beginPath(); b.points.forEach((p,i) => { const q = mapPoint(p); if (!i) m.moveTo(q.x,q.y); else m.lineTo(q.x,q.y); }); m.fillStyle = '#a08d6c'; m.fill(); }
  m.strokeStyle = '#425e5a'; m.lineWidth = 1.5;
  for (const r of study.roads) { m.beginPath(); r.points.forEach((p,i) => { const q = mapPoint(p); if (!i) m.moveTo(q.x,q.y); else m.lineTo(q.x,q.y); }); m.stroke(); }
  for (const c of study.candidates) { const q = mapPoint(c.point); m.fillStyle = '#ca6333'; m.beginPath(); m.arc(q.x,q.y,3,0,Math.PI*2); m.fill(); }
  const desired = new THREE.Vector3(), target = new THREE.Vector3(), offset = new THREE.Vector3();
  let sample:FrameSamples|undefined,sampleStart=0,sampleResolve:((value:PerformanceReport)=>void)|undefined;
  const input={x:0,z:0};
  renderer.setAnimationLoop(time => {
    const frameMs=lastTime?time-lastTime:0,updateStart=performance.now();
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0; lastTime = time;
    if (paused||document.hidden) {if(sample){sampleResolve?.({...sample.result(),interrupted:true});sample=undefined;sampleResolve=undefined;}lastTime=time;return;}
    if (walking) {
      followYaw += ((keys.has('q') ? 1 : 0) - (keys.has('e') ? 1 : 0)) * dt * 1.6 * preferences.sensitivity;
      input.x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);input.z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      state = advance(state,input,followYaw,keys.has('shift'),dt,study,nav.canStand);
      avatar.position.set(state.x, 0, state.z);
      const turn = Math.atan2(Math.sin(state.yaw-avatar.rotation.y),Math.cos(state.yaw-avatar.rotation.y));
      avatar.rotation.y += turn*(1-Math.exp(-dt*14));
      person.animate(time/1000,state.distance,state.moving,state.sprinting,dt);
      target.set(state.x, 1.1, state.z);
      offset.set(Math.sin(followYaw) * cameraDistance, 1 + followPitch * cameraDistance, Math.cos(followYaw) * cameraDistance);
      // Camera-to-target ray shortens the follow arm before an extruded footprint.
      const distance=nav.cameraDistance({x:target.x,y:target.y,z:target.z},{x:offset.x,y:offset.y,z:offset.z});
      if(distance<offset.length())offset.setLength(Math.max(.8,distance-.4));
      desired.copy(target).add(offset); camera.position.lerp(desired, 1 - Math.exp(-dt * 12)); camera.lookAt(target);
    } else controls.update();
    const renderStart=performance.now();renderer.render(scene,camera);
    if(sample){sample.push(frameMs,renderStart-updateStart,performance.now()-renderStart);if(time-sampleStart>=20000){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),size=new THREE.Vector2();renderer.getDrawingBufferSize(size);let bytes=0;const seen=new Set<ArrayBufferLike>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){for(const a of (Object.values(o.geometry.attributes) as THREE.BufferAttribute[])){const buffer=a.array.buffer;if(!seen.has(buffer)){seen.add(buffer);bytes+=buffer.byteLength;}}const index=o.geometry.index;if(index&&!seen.has(index.array.buffer)){seen.add(index.array.buffer);bytes+=index.array.buffer.byteLength;}}});const result={...sample.result(),quality:preferences.quality,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[host.clientWidth,host.clientHeight],buffer:[size.x,size.y],dpr:devicePixelRatio,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometryBufferBytes:bytes,estimatedTextureBytes:textureBytes(scene),resources:{...renderer.info.memory,programs:renderer.info.programs?.length??0},gpuTimeMs:null,note:'20-second foreground browser sample; CPU submission is not GPU duration. Counts exclude driver overhead and cached templates.'};sample=undefined;sampleResolve?.(result);sampleResolve=undefined;}}

    frames++; if (time - measureAt >= 1000) { fps = frames * 1000 / (time - measureAt); frames = 0; measureAt = time; }
    if (time - publishedAt > 100) {
      publishedAt = time; map.drawImage(base,0,0); if (walking) { const p = mapPoint(state); map.save(); map.translate(p.x,p.y); map.rotate(status().bearing*Math.PI/180); map.fillStyle = '#086c60'; map.beginPath(); map.moveTo(0,-6); map.lineTo(4,5); map.lineTo(-4,5); map.closePath(); map.fill(); map.restore(); }
      report(status());
    }
  });
  return { enter, explore, reset, overview, key, status,
    measure(){if(sample)throw Error('A measurement is already running');sample=new FrameSamples();sampleStart=performance.now();return new Promise(resolve=>{sampleResolve=resolve;});},
    appearance(value) { person.dispose(); person=createAvatar(value);avatar.add(person.root); },
    settings(value) { preferences={...value};const preset=graphics[value.quality];renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelCap)*preset.scale);camera.far=walking?preset.far:2400;camera.updateProjectionMatrix();playFog.far=preset.far;playFog.near=preset.far*.5;centerLines.visible=preset.lines;resize(); },
    pause(value) { paused=value;clear();lastTime=0;if(value)renderer.render(scene,camera);report(status()); }, dispose() {
    sampleResolve?.({...sample!.result(),cancelled:true});sampleResolve=undefined;sample=undefined;renderer.setAnimationLoop(null); person.dispose(); observer.disconnect(); controls.dispose();
    window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear);
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', contextMenu);
    scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
}
