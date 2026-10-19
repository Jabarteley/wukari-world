/** Static instances of the same dressed body used by the player and previews. */
import type * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Kit } from '../kit.ts';
import { hash, kitResources } from '../build.ts';
import { normalizeLook } from '../characters.ts';
import type { AvatarGroup, Crowd, CrowdPerson, CrowdTag, Look, Pose } from '../characters.ts';
import { createBody, SIT } from './skinned.ts';
import { requestNativeRender } from '../character-lab/native-body.ts';
import { preloadNativeStaticLod, simplifyNativeStaticGeometryOffThread } from './native-static-lod.ts';
import { totalRenderCost } from './render-cost.ts';
import { bakeSliceSpent, nextBakeSlice } from './bake-slicer.ts';
import type { BodyPose, SkinnedBody } from './skinned.ts';

interface Part { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; triangles: number; wardrobeBatchKey?: string }
interface Template {
  foundation: string;
  parts: Part[];
  /** For a 'lod' template: the same baked parts before simplification, in the same order and with the same materials. */
  full?: Part[];
  top: number;
  triangles: number;
  refs: number;
  dispose(): void;
}
interface Cache { entries: Map<string, Template>; pending: Map<string,Promise<Template>>; disposed:boolean; dispose(): void }
const caches = new WeakMap<Kit, Cache>();
const MAX_TEMPLATES = 24;
const CROWD_LOOKS = 6;

export interface StaticAvatarOptions {
  seed?: unknown;
  pose?: Pose;
  stride?: number;
  seat?: number;
  sceneScale?: number;
  detail?: 'full' | 'lod';
  wardrobeDetail?: 'full' | 'ambient';
  sleeping?: boolean;
  x?: number; y?: number; z?: number; ry?: number;
}

/** Optional full affine transform for a figure captured inside nested scene batches. */
export interface CanonicalCrowdPerson extends CrowdPerson { matrix?: readonly number[]; /** An owambe's aso-ebi colour ('#rrggbb'): the top in it, in aso-oke (src/festivals/party.ts asoEbiLook). */ dress?: string }

function poseFor(pose: Pose | undefined): BodyPose {
  switch (pose) {
    case 'walk': return 'walk';
    case 'jog': return 'jog';
    case 'sit': return 'sit';
    case 'dance': return 'dance';
    case 'work': case 'wave': return 'interact';
    default: return 'idle';
  }
}

/** A lookless background person picks one of six canonical, fully dressed looks. */
function crowdLook(person: CrowdPerson, index: number): { look: Look; seed: unknown } {
  const seed = person.seed ?? person.id ?? person.name ?? index;
  const appearanceSeed = person.look == null ? `canonical-crowd-${hash(String(seed)) % CROWD_LOOKS}` : seed;
  const look = normalizeLook(person.look, appearanceSeed), dress = (person as CanonicalCrowdPerson).dress;
  return { look: dress ? { ...look, outfitColor: dress, fabric: 'asooke' } : look, seed: appearanceSeed };
}

function trianglesOf(geometry: THREE.BufferGeometry): number {
  const available = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  const start = Math.max(0, Math.floor(geometry.drawRange.start));
  return Math.max(0, Math.floor(Math.min(Math.max(0, available - start), geometry.drawRange.count) / 3));
}

/** Native textures/material properties remain authoritative; identical surfaces can share one draw across poses. */
function nativeMaterialKey(material: THREE.Material | THREE.Material[]): string | null {
  if(Array.isArray(material))return null;
  const value=material as THREE.MeshStandardMaterial;
  return JSON.stringify([value.type,value.color?.toArray(),value.emissive?.toArray(),value.roughness,value.metalness,value.opacity,value.transparent,value.alphaTest,value.side,value.vertexColors,value.depthWrite,value.blending,
    ...['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap'].map(key=>(value as unknown as Record<string,THREE.Texture|undefined>)[key]?.uuid)]);
}

function geometryLayout(geometry: THREE.BufferGeometry): string {
  return JSON.stringify([
    Boolean(geometry.index),
    Object.keys(geometry.attributes).sort().map((name) => {
      const attribute = geometry.getAttribute(name);
      return [name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name];
    }),
  ]);
}

/** Keep only the drawn triangles before a merge; BufferGeometryUtils does not honor drawRange. */
function drawnGeometry(T: typeof THREE, source: THREE.BufferGeometry): THREE.BufferGeometry {
  const result = source.clone();
  const index = source.index;
  const available = index?.count ?? source.getAttribute('position')?.count ?? 0;
  const start = Math.max(0, Math.floor(source.drawRange.start));
  const count = Math.max(0, Math.floor(Math.min(Math.max(0, available - start), source.drawRange.count) / 3) * 3);
  if (index) {
    const values = index.array.slice(start, start + count);
    result.setIndex(new T.BufferAttribute(values, 1));
  } else {
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = attribute.array.slice(start * attribute.itemSize, (start + count) * attribute.itemSize);
      result.setAttribute(name, new T.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
  }
  result.setDrawRange(0, count);
  result.clearGroups();
  return result;
}

function flipWinding(geometry: THREE.BufferGeometry): void {
  const index = geometry.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
    return;
  }
  for (const attribute of Object.values(geometry.attributes)) {
    for (let i = 0; i < attribute.count; i += 3) {
      for (let component = 0; component < attribute.itemSize; component++) {
        const b = attribute.getComponent(i + 1, component);
        attribute.setComponent(i + 1, component, attribute.getComponent(i + 2, component));
        attribute.setComponent(i + 2, component, b);
      }
    }
    attribute.needsUpdate = true;
  }
}

/**
 * What a bake reads from a posed mesh, captured at once so the bake can run in slices over several frames (./bake-slicer.ts)
 * and still read the pose of the instant it was captured. Each bone's skinning matrix is the same product three.js forms per
 * vertex in SkinnedMesh.applyBoneTransform, formed once: the bytes baked are the same. The geometry itself (the body's own,
 * which nothing else changes while it is baked) is copied when its turn comes.
 */
interface PosedMesh {
  source: THREE.BufferGeometry;
  /** The copy the bake writes its result into, once made. */
  geometry?: THREE.BufferGeometry;
  matrixWorld: THREE.Matrix4;
  normalMatrix: THREE.Matrix3;
  skin: { bind: THREE.Matrix4; bindInverse: THREE.Matrix4; bones: THREE.Matrix4[]; index: THREE.BufferAttribute | THREE.InterleavedBufferAttribute; weight: THREE.BufferAttribute | THREE.InterleavedBufferAttribute } | null;
  morph: { targets: (THREE.BufferAttribute | THREE.InterleavedBufferAttribute)[]; influences: number[]; relative: boolean } | null;
}

function capturePose(T: typeof THREE, mesh: THREE.Mesh): PosedMesh {
  const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? mesh as THREE.SkinnedMesh : null;
  const geometry = mesh.geometry;
  const morphTargets = geometry.morphAttributes.position, influences = mesh.morphTargetInfluences;
  return {
    source: geometry,
    matrixWorld: mesh.matrixWorld.clone(),
    normalMatrix: new T.Matrix3().getNormalMatrix(mesh.matrixWorld),
    skin: skinned ? {
      bind: skinned.bindMatrix.clone(), bindInverse: skinned.bindMatrixInverse.clone(),
      bones: skinned.skeleton.bones.map((bone, index) => new T.Matrix4().multiplyMatrices(bone.matrixWorld, skinned.skeleton.boneInverses[index]!)),
      index: geometry.attributes.skinIndex!, weight: geometry.attributes.skinWeight!,
    } : null,
    morph: morphTargets && influences ? { targets: [...morphTargets], influences: [...influences], relative: geometry.morphTargetsRelative } : null,
  };
}

/** Bake a sampled SkinnedMesh into normal static geometry while preserving UV, region and wardrobe attributes. */
async function bakeGeometry(T: typeof THREE, posed: PosedMesh, alive: () => void): Promise<THREE.BufferGeometry> {
  // A copy of the source as BufferGeometry.clone() makes it, less the morph targets: the bake drops them (morphAttributes = {}),
  // so they are left out of the copy instead of copied and dropped. The posed morph targets are read from the source.
  const morphAttributes = posed.source.morphAttributes;
  posed.source.morphAttributes = {};
  let result: THREE.BufferGeometry;
  try { result = posed.geometry = posed.source.clone(); } finally { posed.source.morphAttributes = morphAttributes; }
  const position = result.getAttribute('position');
  const normal = result.getAttribute('normal');
  if (!position || !normal || position.itemSize !== 3 || normal.itemSize !== 3) {
    throw new Error('canonical body is missing position or normal attributes');
  }
  const positions = new Float32Array(position.count * 3);
  const normals = new Float32Array(normal.count * 3);
  const point = new T.Vector3(), end = new T.Vector3(), direction = new T.Vector3();
  const base = new T.Vector3(), scaled = new T.Vector3(), morphed = new T.Vector3(), sum = new T.Vector3(), target = new T.Vector3();
  const skinIndex = new T.Vector4(), skinWeight = new T.Vector4();
  const { skin, morph, matrixWorld, normalMatrix } = posed;
  // SkinnedMesh.applyBoneTransform, step for step, with the captured matrices.
  const applyBones = (index: number, value: THREE.Vector3): THREE.Vector3 => {
    if (!skin) return value;
    skinIndex.fromBufferAttribute(skin.index as THREE.BufferAttribute, index);
    skinWeight.fromBufferAttribute(skin.weight as THREE.BufferAttribute, index);
    base.copy(value).applyMatrix4(skin.bind);
    value.set(0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const weight = skinWeight.getComponent(i);
      if (weight !== 0) value.addScaledVector(scaled.copy(base).applyMatrix4(skin.bones[skinIndex.getComponent(i)]!), weight);
    }
    return value.applyMatrix4(skin.bindInverse);
  };
  for (let i = 0; i < position.count; i++) {
    if ((i & 255) === 255 && bakeSliceSpent()) { await nextBakeSlice(); alive(); }
    point.fromBufferAttribute(position, i);
    direction.fromBufferAttribute(normal, i);
    end.copy(point).add(direction);
    if (skin) { applyBones(i, point); applyBones(i, end); }
    direction.subVectors(end, point).applyMatrix3(normalMatrix).normalize();
    // Mesh.getVertexPosition (and SkinnedMesh's): without morph targets it is the skinned point just computed.
    let vertex = point;
    if (morph || !skin) {
      vertex = morphed.fromBufferAttribute(position, i);
      if (morph) {
        sum.set(0, 0, 0);
        for (let m = 0; m < morph.targets.length; m++) {
          const influence = morph.influences[m]!;
          if (influence === 0) continue;
          target.fromBufferAttribute(morph.targets[m]!, i);
          if (morph.relative) sum.addScaledVector(target, influence);
          else sum.addScaledVector(target.sub(vertex), influence);
        }
        vertex.add(sum);
      }
      applyBones(i, vertex);
    }
    vertex.applyMatrix4(matrixWorld);
    positions[i * 3] = vertex.x; positions[i * 3 + 1] = vertex.y; positions[i * 3 + 2] = vertex.z;
    normals[i * 3] = direction.x; normals[i * 3 + 1] = direction.y; normals[i * 3 + 2] = direction.z;
  }
  result.setAttribute('position', new T.BufferAttribute(positions, 3));
  result.setAttribute('normal', new T.BufferAttribute(normals, 3));
  result.deleteAttribute('skinIndex');
  result.deleteAttribute('skinWeight');
  result.morphAttributes = {};
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

function cacheFor(kit: Kit): Cache {
  let cache = caches.get(kit);
  if (cache) return cache;
  const entries = new Map<string, Template>();
  cache = {
    entries, pending:new Map(),disposed:false,
    dispose() {
      this.disposed=true;
      for (const entry of entries.values()) entry.dispose();
      entries.clear();
      caches.delete(kit);
    },
  };
  caches.set(kit, cache);
  kitResources(kit);
  kit.onDispose(() => cache?.dispose());
  return cache;
}

/**
 * Bake one posed template. The work runs in time slices (./bake-slicer.ts): never in the frame that asked for it, at most about
 * BAKE_SLICE_MS of it per frame. The pose and the materials are captured in one step, as before, so the bytes are the same.
 */
async function makeTemplate(kit: Kit, look: Look, seed: unknown, options: StaticAvatarOptions, alive: () => void): Promise<Template> {
  await nextBakeSlice(); alive();
  const body: SkinnedBody = createBody(kit, look, seed, options.sceneScale ?? 1, {
    detail: options.detail ?? 'full', wardrobeDetail: options.wardrobeDetail ?? 'full', sliced: true,
  });
  try {
    await body.ready;
    if ((options.detail ?? 'full') === 'lod') await preloadNativeStaticLod();
    if (bakeSliceSpent()) await nextBakeSlice();
    alive();
    const pose = poseFor(options.pose);
    if (pose === 'walk' || pose === 'jog') body.stride((options.stride ?? 0.25) * Math.PI * 2, pose === 'jog');
    else body.show(pose);
    if (pose === 'sit') body.sitOn(0, options.seat ?? SIT.contact * body.scale, 0, 0);
    if (options.sleeping) body.setPresentation('sleeping');
    body.object.updateMatrixWorld(true);
    const sourceParts: Part[] = [];
    const sourceMeshes: THREE.Mesh[] = [];
    body.object.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.visible && trianglesOf(mesh.geometry)) sourceMeshes.push(mesh);
    });
    if (!sourceMeshes.length) throw new Error('canonical body has no visible mesh');
    const materials = body.staticMaterials();
    const captured: PosedMesh[] = [];
    try {
      // Everything the bake reads from the live body, in one step: then the slices below cannot see a different pose.
      const surfaces = sourceMeshes.map((mesh) => {
        captured.push(capturePose(kit.THREE, mesh));
        const material = materials.forMesh(mesh);
        return { material, key: nativeMaterialKey(material) };
      });
      let top = -Infinity;
      for (const [index, posed] of captured.entries()) {
        const geometry = await bakeGeometry(kit.THREE, posed, alive);
        const { material, key: wardrobeBatchKeyValue } = surfaces[index]!;
        const triangles = trianglesOf(geometry);
        geometry.computeBoundingBox();
        top = Math.max(top, geometry.boundingBox?.max.y ?? 0);
        sourceParts.push({ geometry, material, triangles, ...(wardrobeBatchKeyValue ? { wardrobeBatchKey: `${wardrobeBatchKeyValue}|${geometryLayout(geometry)}` } : {}) });
      }
      let parts = sourceParts, full: Part[] | undefined;
      if ((options.detail ?? 'full') === 'lod') {
        // The unsimplified bake is kept (CPU memory only until drawn) so a figure near the camera can show it: see NEAR_DETAIL.
        const total=parts.reduce((sum,part)=>sum+part.triangles,0), ratio=Math.min(1,1600/Math.max(1,total));
        full=sourceParts;
        // Meshoptimizer runs in a worker (./native-static-lod.ts); the parts are prepared and finished here, in slices.
        const pause = (): Promise<void> | null => bakeSliceSpent() ? nextBakeSlice() : null;
        const tasks: Promise<THREE.BufferGeometry>[] = [];
        for (const part of sourceParts) {
          const wait = pause();
          if (wait) { await wait; alive(); }
          tasks.push(simplifyNativeStaticGeometryOffThread(part.geometry, ratio, pause));
        }
        const settled = await Promise.allSettled(tasks);
        const failed = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        const geometries = settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
        if (failed) { for (const geometry of geometries) geometry.dispose(); throw failed.reason; }
        try { alive(); } catch (error) { for (const geometry of geometries) geometry.dispose(); throw error; }
        parts=sourceParts.map((part, index)=>{const geometry=geometries[index]!;return {...part,geometry,triangles:trianglesOf(geometry)};});
      }
      let disposed = false;
      return {
        foundation: String(body.object.userData.characterFoundation ?? 'unknown'),
        parts, ...(full ? { full } : {}), top, triangles: parts.reduce((sum, part) => sum + part.triangles, 0), refs: 0,
        dispose() {
          if (disposed) return;
          disposed = true;
          for (const part of parts) part.geometry.dispose();
          for (const part of full ?? []) part.geometry.dispose();
          materials.dispose();
        },
      };
    } catch (error) {
      for (const posed of captured) posed.geometry?.dispose();
      materials.dispose();
      throw error;
    }
  } finally {
    body.dispose();
  }
}

async function acquire(kit: Kit, look: Look, seed: unknown, options: StaticAvatarOptions): Promise<{ template: Template; release(): void }> {
  const cache = cacheFor(kit);
  const pose = poseFor(options.pose);
  const phase = pose === 'walk' || pose === 'jog' ? (Math.round((options.stride ?? 0.25) * 8) % 8) / 8 : 0;
  const key = JSON.stringify([look.native ?? look, pose, phase, options.seat ?? 0, options.sceneScale ?? 1, options.sleeping ?? false, options.detail ?? 'full', options.wardrobeDetail ?? 'full']);
  let template = cache.entries.get(key);
  if (template) { cache.entries.delete(key); cache.entries.set(key, template); }
  else {
    let task=cache.pending.get(key);
    if(!task){
      task=makeTemplate(kit,look,seed,{...options,stride:phase},()=>{if(cache.disposed)throw new Error('Character scene was disposed while loading');}).then(value=>{
        if(cache.disposed){value.dispose();throw new Error('Character scene was disposed while loading');}
        for(const [oldKey,old] of cache.entries){if(cache.entries.size<MAX_TEMPLATES)break;if(old.refs===0){cache.entries.delete(oldKey);old.dispose();}}
        if(cache.entries.size<MAX_TEMPLATES)cache.entries.set(key,value);
        return value;
      }).finally(()=>cache.pending.delete(key));
      cache.pending.set(key,task);
    }
    template=await task;
  }
  template.refs++;
  let released = false;
  return { template, release() {
    if (released) return;
    released = true;
    template.refs--;
    if (![...cache.entries.values()].includes(template) && template.refs === 0) template.dispose();
  } };
}

/**
 * NEAR DETAIL. A 'lod' figure is the posed native body simplified to about 1,600 triangles, which turns a face into a smear. A figure
 * whose face would be bigger than about 25 px (a 0.3-unit face, 43 degree fov, 800 px tall view: about 12 units from the camera) is
 * drawn from the same bake before simplification instead: the exact posed native body with its own textured materials, the same
 * surface the player's own body draws. Nothing is reshaped; only which of the two baked meshes is drawn changes.
 *
 * Who: the figures nearest the camera, in front of it and in its view, inside `enter` (kept until past `leave`: no flicker at the
 * edge), at most `max` per kit. When: decided while the renderer walks the scene (a hook object first in each holder), so a change is
 * drawn by the frame that asked for it. Cost: the same meshes and materials, so no extra draw calls (a batched crowd re-merges its
 * per-material batches); a near figure keeps its admitted lod cost as a reservation, so the scene's admission does not churn.
 */
export const NEAR_DETAIL: Readonly<{ enter: number; leave: number; max: number; fov: number }> = Object.freeze({ enter: 12, leave: 14.5, max: 3, fov: 43 });

/** `?neardetail=off` (or localStorage 'aw.neardetail' = 'off') keeps every background figure on its lod mesh: for A/B checks. */
function nearDetailOff(): boolean {
  try {
    const asked = new URLSearchParams((globalThis.location as { search?: string } | undefined)?.search ?? '').get('neardetail');
    return (asked ?? (globalThis.localStorage as Storage | undefined)?.getItem('aw.neardetail') ?? '').trim().toLowerCase() === 'off';
  } catch { return false; }
}

interface NearFigure { head: THREE.Vector3; full: boolean; want: boolean }
interface NearHolder { root: THREE.Object3D; figures: NearFigure[]; apply(): void }
interface NearState { holders: Set<NearHolder>; camera: THREE.Camera | null; fresh: boolean; off: boolean; seen: THREE.Matrix4; frustum: THREE.Frustum; matrix: THREE.Matrix4; point: THREE.Vector3; eye: THREE.Vector3; forward: THREE.Vector3; sphere: THREE.Sphere }
const nearStates = new WeakMap<Kit, NearState>();

function nearState(kit: Kit): NearState {
  let state = nearStates.get(kit);
  if (!state) {
    const T = kit.THREE;
    state = { holders: new Set(), camera: null, fresh: false, off: false, seen: new T.Matrix4(), frustum: new T.Frustum(), matrix: new T.Matrix4(), point: new T.Vector3(), eye: new T.Vector3(), forward: new T.Vector3(), sphere: new T.Sphere(new T.Vector3(), 0.6) };
    nearStates.set(kit, state);
  }
  return state;
}

function drawable(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object, last: THREE.Object3D = object;
  for (; node; node = node.parent) { if (!node.visible) return false; last = node; }
  return (last as THREE.Scene).isScene === true;
}

/** Which figures are near this render's camera. Once per camera view per task: every holder's hook in one render shares the answer. */
function decideNear(kit: Kit, camera: THREE.Camera): void {
  const state = nearState(kit);
  const off = nearDetailOff();
  if (state.fresh && state.camera === camera && state.off === off && state.seen.equals(camera.matrixWorld)) return;
  state.camera = camera; state.fresh = true; state.off = off; state.seen.copy(camera.matrixWorld);
  queueMicrotask(() => { state.fresh = false; state.camera = null; });
  const fov = (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? (camera as THREE.PerspectiveCamera).fov : NEAR_DETAIL.fov;
  const reach = Math.tan((NEAR_DETAIL.fov * Math.PI) / 360) / Math.max(1e-3, Math.tan((fov * Math.PI) / 360));
  const enter = NEAR_DETAIL.enter * reach, leave = NEAR_DETAIL.leave * reach;
  state.frustum.setFromProjectionMatrix(state.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  state.eye.setFromMatrixPosition(camera.matrixWorld);
  camera.getWorldDirection(state.forward);
  const kept: { figure: NearFigure; d: number }[] = [], newcomers: { figure: NearFigure; d: number }[] = [];
  for (const holder of state.holders) {
    const shown = !off && drawable(holder.root);
    for (const figure of holder.figures) {
      figure.want = false;
      if (!shown) continue;
      const point = state.point.copy(figure.head).applyMatrix4(holder.root.matrixWorld);
      const d = point.distanceTo(state.eye);
      if (point.sub(state.eye).dot(state.forward) <= 0) continue;
      state.sphere.center.copy(figure.head).applyMatrix4(holder.root.matrixWorld);
      if (!state.frustum.intersectsSphere(state.sphere)) continue;
      if (figure.full ? d < leave : d < enter) (figure.full ? kept : newcomers).push({ figure, d });
    }
  }
  const order = (a: { d: number }, b: { d: number }): number => a.d - b.d;
  for (const { figure } of [...kept.sort(order), ...newcomers.sort(order)].slice(0, NEAR_DETAIL.max)) figure.want = true;
}

/** A hook first among the holder's children: the renderer calls an LOD's update(camera) before it walks the LOD's later siblings. */
function addNearHook(kit: Kit, holder: NearHolder): () => void {
  const state = nearState(kit);
  const hook = new kit.THREE.LOD();
  hook.name = 'near-detail-hook';
  hook.update = (camera: THREE.Camera) => { decideNear(kit, camera); holder.apply(); };
  holder.root.children.unshift(hook);
  hook.parent = holder.root;
  state.holders.add(holder);
  // Diagnostics: where each figure's head is in the world, and whether it is drawn near.
  holder.root.userData.nearDetailHeads = () => holder.figures.map(figure => {
    const head = figure.head.clone().applyMatrix4(holder.root.matrixWorld);
    return { x: head.x, y: head.y, z: head.z, full: figure.full };
  });
  return () => { state.holders.delete(holder); hook.removeFromParent(); };
}

/** The admitted (lod) cost stays what the scene's budget sees while a figure is drawn near: a reservation in place of measuring it. */
function reserveAdmitted(root: THREE.Object3D, near: boolean, admitted: { triangles: number; drawCalls: number }): void {
  root.userData.nearDetail = near;
  root.userData.characterReservedTriangles = near ? Math.max(1, admitted.triangles) : 0;
  root.userData.characterReservedDrawCalls = near ? admitted.drawCalls : 0;
}

/** A movable still figure; its meshes share a bounded posed template, never a live skeleton. */
export function createCanonicalStaticAvatar(kit: Kit, look: unknown, options: StaticAvatarOptions = {}): AvatarGroup {
  const seed = options.seed ?? 'canonical-avatar';
  const read = normalizeLook(look, seed);
  const group = new kit.THREE.Group() as AvatarGroup;
  group.name = 'native-static-avatar';
  Object.assign(group.userData, { canonicalCharacter:true,characterFoundation:'native53',characterDetail:options.detail??'full',characterStatus:'loading',characterReservedTriangles:34000,characterReservedDrawCalls:10,look:read,top:2.6*(options.sceneScale??1),triangles:34000 });
  group.position.set(options.x??0,options.y??0,options.z??0);group.rotation.y=options.ry??0;
  const registry=kitResources(kit).disposers;
  let disposed=false,held:Awaited<ReturnType<typeof acquire>>|undefined,unhook:(()=>void)|null=null;
  const dispose=()=>{if(disposed)return;disposed=true;registry.delete(dispose);unhook?.();unhook=null;group.removeFromParent();held?.release();};
  registry.add(dispose);group.userData.dispose=dispose;
  group.userData.ready=acquire(kit,read,seed,options).then(value=>{
    if(disposed){value.release();return;}held=value;
    const template=held.template,meshes=template.parts.map(part=>{const mesh=new kit.THREE.Mesh(part.geometry,part.material);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return mesh;});
    Object.assign(group.userData,{characterStatus:'ready',characterReservedTriangles:0,characterReservedDrawCalls:0,top:template.top,triangles:template.triangles});
    const full=template.full;
    if(full&&full.length===meshes.length){
      const figure:NearFigure={head:new kit.THREE.Vector3(0,template.top*0.92,0),full:false,want:false};
      const admitted={triangles:template.triangles,drawCalls:meshes.length};
      unhook=addNearHook(kit,{root:group,figures:[figure],apply(){
        if(figure.want===figure.full)return;
        figure.full=figure.want;
        meshes.forEach((mesh,index)=>{mesh.geometry=(figure.full?full:template.parts)[index]!.geometry;});
        reserveAdmitted(group,figure.full,admitted);
      }});
    }
    requestNativeRender(kit);
  }).catch(error=>{if(!disposed){group.userData.characterStatus='error';group.userData.characterError=String(error?.message??error);requestNativeRender(kit);}});
  return group;
}

/**
 * mergeGeometries(geometries, false) for the crowd's own batches, with typed arrays: the same attributes in the same order, the
 * same index values and index type, the same bytes. Anything unusual (interleaved data, morph targets, mixed indexing, other
 * array types) goes to mergeGeometries itself.
 */
function mergeBatch(T: typeof THREE, geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const first = geometries[0]!;
  const names = Object.keys(first.attributes);
  const plain = geometries.every(geometry => Boolean(geometry.index) === Boolean(first.index) && !Object.keys(geometry.morphAttributes).length
    && geometry.morphTargetsRelative === first.morphTargetsRelative && Object.keys(geometry.attributes).length === names.length
    && names.every(name => {
      const attribute = geometry.attributes[name] as THREE.BufferAttribute | undefined, model = first.attributes[name] as THREE.BufferAttribute;
      return attribute && !(attribute as unknown as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute && attribute.array.constructor === model.array.constructor
        && attribute.itemSize === model.itemSize && attribute.normalized === model.normalized && attribute.gpuType === model.gpuType;
    })) && !Object.keys(first.morphAttributes).length;
  if (!plain) return mergeGeometries(geometries, false);
  const merged = new T.BufferGeometry();
  if (first.index) {
    let length = 0;
    for (const geometry of geometries) length += geometry.index!.count;
    const values = new Uint32Array(length);
    let at = 0, offset = 0, wide = false;
    for (const geometry of geometries) {
      const index = geometry.index!, source = index.array;
      for (let j = 0; j < index.count; j++) { const value = source[j]! + offset; values[at++] = value; if (value >= 65535) wide = true; }
      offset += geometry.attributes.position!.count;
    }
    // BufferGeometry.setIndex(array) picks the type from the values the same way (arrayNeedsUint32).
    merged.setIndex(wide ? new T.Uint32BufferAttribute(values, 1) : new T.Uint16BufferAttribute(values, 1));
  }
  for (const name of names) {
    const model = first.attributes[name] as THREE.BufferAttribute;
    let length = 0;
    for (const geometry of geometries) length += geometry.attributes[name]!.count * model.itemSize;
    const TypedArray = model.array.constructor as unknown as { new(length: number): THREE.TypedArray };
    const array = new TypedArray(length);
    const attribute = new T.BufferAttribute(array, model.itemSize, model.normalized);
    let offset = 0;
    for (const geometry of geometries) { const part = geometry.attributes[name] as THREE.BufferAttribute; array.set(part.array, offset); offset += part.count * model.itemSize; }
    if (model.gpuType !== undefined) attribute.gpuType = model.gpuType;
    merged.setAttribute(name, attribute);
  }
  return merged;
}

function tagFor(person: CrowdPerson, index: number, top: number): CrowdTag {
  const kind = person.kind === 'npc' || person.kind === 'self' ? person.kind : 'player';
  const name = String(person.name ?? person.id ?? '');
  return {
    id: String(person.id ?? `person-${index}`), name, kind,
    text: kind === 'player' ? `@${name}` : name,
    marker: kind === 'npc' ? 'dot' : kind === 'self' ? 'crown' : 'tag',
    colour: kind === 'npc' ? '#58d68a' : kind === 'self' ? '#ffd34d' : '#6fb4ff',
    position: { x: person.x ?? 0, y: (person.y ?? 0) + top, z: person.z ?? 0 },
  };
}

/** Instanced canonical bodies, grouped by identical look and pose. No GLB parse or skeleton survives creation. */
export function buildCanonicalCrowd(kit: Kit, people: readonly CanonicalCrowdPerson[] = [], options: { detail?: 'full' | 'lod' } = {}): Crowd {
  const group = new kit.THREE.Group();
  group.name = 'canonical-crowd';
  group.userData.canonicalCharacter = true;
  const buckets = new Map<Template, { held: Awaited<ReturnType<typeof acquire>>; people: CanonicalCrowdPerson[] }>();
  type BatchEntry = { geometry: THREE.BufferGeometry; full?: THREE.BufferGeometry; figure: NearFigure; matrix: THREE.Matrix4; lod?: THREE.BufferGeometry; near?: THREE.BufferGeometry };
  const wardrobeGroups = new Map<string, { material: THREE.Material; entries: BatchEntry[]; mesh?: THREE.Mesh }>();
  const nearFigures: NearFigure[] = [];
  let unhook: (() => void) | null = null;
  const ownedGeometries: THREE.BufferGeometry[] = [];
  // Every mesh joins the group at once when the crowd is complete (the bake runs over several frames): never half a crowd.
  const built: THREE.Mesh[] = [];
  const drop = (): void => { for (const mesh of built) if (!mesh.parent && (mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose(); };
  const tags: CrowdTag[] = [];
  let triangles = people.length*34000, disposed=false;
  Object.assign(group.userData,{characterFoundation:'native53',characterStatus:'loading',characterReservedTriangles:triangles,characterReservedDrawCalls:people.length*10});
  const registry=kitResources(kit).disposers;
  const dispose=()=>{if(disposed)return;disposed=true;registry.delete(dispose);unhook?.();unhook=null;for(const batch of wardrobeGroups.values())for(const entry of batch.entries){entry.lod?.dispose();entry.near?.dispose();}for(const child of group.children)if((child as THREE.InstancedMesh).isInstancedMesh)(child as THREE.InstancedMesh).dispose();for(const geometry of ownedGeometries)geometry.dispose();group.removeFromParent();for(const bucket of buckets.values())bucket.held.release();};
  registry.add(dispose);
  const ready=(async()=>{
  triangles=0;
  try {
    for (const [index,person] of people.entries()) {
      const { look, seed } = crowdLook(person, index);
      const held = await acquire(kit, look, seed, {
        pose: person.pose, stride: person.stride, seat: person.seat, sceneScale: person.scale,
        sleeping: person.sleeping, detail: options.detail ?? 'lod', wardrobeDetail: options.detail === 'full' ? 'full' : 'ambient',
      });
      if(disposed){held.release();return;}
      let bucket = buckets.get(held.template);
      if (!bucket) { bucket = { held, people: [] }; buckets.set(held.template, bucket); }
      else held.release();
      bucket.people.push(person);
      group.userData.characterFoundation = held.template.foundation;
      group.userData.characterDetail = options.detail ?? 'lod';
      tags.push(tagFor(person, index, held.template.top));
      triangles += held.template.triangles;
    }
    const position = new kit.THREE.Vector3();
    const rotation = new kit.THREE.Quaternion();
    const scale = new kit.THREE.Vector3(1, 1, 1);
    const up = new kit.THREE.Vector3(0, 1, 0);
    const personMatrix = (person: CanonicalCrowdPerson): THREE.Matrix4 => {
      const matrix = new kit.THREE.Matrix4();
      if (person.matrix) {
        if (person.matrix.length !== 16 || !person.matrix.every(Number.isFinite)) throw new Error('canonical crowd matrix must contain 16 finite numbers');
        return matrix.fromArray(person.matrix);
      }
      position.set(person.x ?? 0, person.y ?? 0, person.z ?? 0);
      rotation.setFromAxisAngle(up, person.ry ?? 0);
      return matrix.compose(position, rotation, scale);
    };
    const transformed = (part: Part, matrix: THREE.Matrix4): THREE.BufferGeometry => {
      const geometry = drawnGeometry(kit.THREE, part.geometry);
      // No morph targets survive the bake; the flag must agree for the near (unsimplified) and lod parts to merge.
      geometry.morphTargetsRelative = false;
      try {
        geometry.applyMatrix4(matrix);
        if (matrix.determinant() < 0) flipWinding(geometry);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        return geometry;
      } catch (error) { geometry.dispose(); throw error; }
    };
    for (const { held, people: members } of buckets.values()) {
      const matrices = members.map(personMatrix);
      const full = held.template.full && held.template.full.length === held.template.parts.length ? held.template.full : null;
      // One near-detail figure per member whose every part is batched: its head, in the crowd's own coordinates.
      const figures = matrices.map(matrix => {
        const figure: NearFigure = { head: new kit.THREE.Vector3(0, held.template.top * 0.92, 0).applyMatrix4(matrix), full: false, want: false };
        if (full && held.template.parts.every(part => part.wardrobeBatchKey)) nearFigures.push(figure);
        return figure;
      });
      for (const [partIndex, part] of held.template.parts.entries()) {
        if (part.wardrobeBatchKey) {
          let batch = wardrobeGroups.get(part.wardrobeBatchKey);
          if (!batch) {
            batch = { material: part.material as THREE.Material, entries: [] };
            wardrobeGroups.set(part.wardrobeBatchKey, batch);
          }
          matrices.forEach((matrix, index) => batch!.entries.push({ geometry: part.geometry, ...(full ? { full: full[partIndex]!.geometry } : {}), figure: figures[index]!, matrix }));
          continue;
        }
        const positive = matrices.filter(matrix => matrix.determinant() >= 0);
        if (positive.length) {
          const mesh = new kit.THREE.InstancedMesh(part.geometry, part.material, positive.length);
          mesh.name = 'canonical-crowd-part';
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          positive.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
          mesh.instanceMatrix.needsUpdate = true;
          built.push(mesh);
        }
        for (const matrix of matrices) if (matrix.determinant() < 0) {
          const geometry = transformed(part, matrix);
          ownedGeometries.push(geometry);
          const mesh = new kit.THREE.Mesh(geometry, part.material);
          mesh.name = 'canonical-crowd-mirrored-part';
          mesh.receiveShadow = true;
          built.push(mesh);
        }
      }
    }
    // Each member's part, placed once and kept, so a near member can be swapped in by a re-merge of the batch alone.
    const merge = (batch: { material: THREE.Material; entries: BatchEntry[] }): THREE.BufferGeometry => {
      const prepared = batch.entries.map(entry => {
        if (entry.figure.full && entry.full) return entry.near ??= transformed({ geometry: entry.full, material: batch.material, triangles: 0 }, entry.matrix);
        return entry.lod ??= transformed({ geometry: entry.geometry, material: batch.material, triangles: 0 }, entry.matrix);
      });
      for (const entry of batch.entries) if (!(entry.figure.full && entry.full) && entry.near) { entry.near.dispose(); delete entry.near; }
      const geometry = prepared.length === 1 ? prepared[0]!.clone() : mergeBatch(kit.THREE, prepared);
      if (!geometry) throw new Error('compatible canonical wardrobe geometries failed to merge');
      return geometry;
    };
    // Place each member's part ahead of the merge, in time slices (./bake-slicer.ts); merge() then only joins them.
    for (const batch of wardrobeGroups.values()) {
      for (const entry of batch.entries) {
        if (bakeSliceSpent()) { await nextBakeSlice(); if (disposed) { drop(); return; } }
        if (!(entry.figure.full && entry.full)) entry.lod ??= transformed({ geometry: entry.geometry, material: batch.material, triangles: 0 }, entry.matrix);
      }
    }
    for (const batch of wardrobeGroups.values()) {
      if (bakeSliceSpent()) { await nextBakeSlice(); if (disposed) { drop(); return; } }
      const geometry = merge(batch);
      ownedGeometries.push(geometry);
      const mesh = new kit.THREE.Mesh(geometry, batch.material);
      mesh.name = 'canonical-crowd-wardrobe-batch';
      mesh.receiveShadow = true;
      built.push(mesh);
      batch.mesh = mesh;
    }
    if (disposed) { drop(); return; }
    for (const mesh of built) group.add(mesh);
    if (nearFigures.length && !disposed) {
      let admitted = { triangles: 0, drawCalls: 0 };
      unhook = addNearHook(kit, { root: group, figures: nearFigures, apply() {
        const changed = new Set(nearFigures.filter(figure => figure.want !== figure.full));
        if (!changed.size) return;
        if (!group.userData.nearDetail) admitted = totalRenderCost(group);
        for (const figure of nearFigures) figure.full = figure.want;
        // Only a batch holding a figure that changed is merged again; any other would come out the same.
        for (const batch of wardrobeGroups.values()) {
          if (!batch.entries.some(entry => changed.has(entry.figure))) continue;
          const mesh = batch.mesh!, old = mesh.geometry, geometry = merge(batch);
          mesh.geometry = geometry;
          ownedGeometries.splice(ownedGeometries.indexOf(old), 1, geometry);
          old.dispose();
        }
        reserveAdmitted(group, nearFigures.some(figure => figure.full), admitted);
      } });
    }
  } catch (error) {
    drop();
    for (const child of group.children) if ((child as THREE.InstancedMesh).isInstancedMesh) (child as THREE.InstancedMesh).dispose();
    for (const geometry of ownedGeometries) geometry.dispose();
    for (const bucket of buckets.values()) bucket.held.release();
    throw error;
  }
  Object.assign(group.userData,{characterStatus:'ready',characterReservedTriangles:0,characterReservedDrawCalls:0,triangles});
  requestNativeRender(kit);
  })();
  group.userData.ready=ready;
  ready.catch(error=>{if(!disposed){group.userData.characterStatus='error';group.userData.characterError=String(error?.message??error);requestNativeRender(kit);}});
  return { group, tags, get triangles(){return group.userData.characterStatus==='loading'?people.length*34000:triangles;}, dispose };
}
