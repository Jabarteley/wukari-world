/** Static instances of the same dressed body used by the player and previews. */
import type * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Kit } from '../kit.ts';
import { hash, kitResources } from '../build.ts';
import { normalizeLook } from '../characters.ts';
import type { AvatarGroup, Crowd, CrowdPerson, CrowdTag, Look, Pose } from '../characters.ts';
import { createBody, SIT } from './skinned.ts';
import { requestNativeRender } from '../character-lab/native-body.ts';
import { preloadNativeStaticLod, simplifyNativeStaticGeometry } from './native-static-lod.ts';
import type { BodyPose, SkinnedBody } from './skinned.ts';

interface Part { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; triangles: number; wardrobeBatchKey?: string }
interface Template {
  foundation: string;
  parts: Part[];
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
export interface CanonicalCrowdPerson extends CrowdPerson { matrix?: readonly number[] }

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
  return { look: normalizeLook(person.look, appearanceSeed), seed: appearanceSeed };
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

/** Bake a sampled SkinnedMesh into normal static geometry while preserving UV, region and wardrobe attributes. */
function bakeGeometry(T: typeof THREE, mesh: THREE.Mesh): THREE.BufferGeometry {
  const source = mesh.geometry;
  const result = source.clone();
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  if (!position || !normal || position.itemSize !== 3 || normal.itemSize !== 3) {
    result.dispose();
    throw new Error('canonical body is missing position or normal attributes');
  }
  const positions = new Float32Array(position.count * 3);
  const normals = new Float32Array(normal.count * 3);
  const point = new T.Vector3(), end = new T.Vector3(), direction = new T.Vector3();
  const normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    direction.fromBufferAttribute(normal, i);
    end.copy(point).add(direction);
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) { (mesh as THREE.SkinnedMesh).applyBoneTransform(i, point); (mesh as THREE.SkinnedMesh).applyBoneTransform(i, end); }
    direction.subVectors(end, point).applyMatrix3(normalMatrix).normalize();
    mesh.getVertexPosition(i, point);
    point.applyMatrix4(mesh.matrixWorld);
    positions.set([point.x, point.y, point.z], i * 3);
    normals.set([direction.x, direction.y, direction.z], i * 3);
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

async function makeTemplate(kit: Kit, look: Look, seed: unknown, options: StaticAvatarOptions): Promise<Template> {
  const body: SkinnedBody = createBody(kit, look, seed, options.sceneScale ?? 1, {
    detail: options.detail ?? 'full', wardrobeDetail: options.wardrobeDetail ?? 'full',
  });
  try {
    await body.ready;
    if ((options.detail ?? 'full') === 'lod') await preloadNativeStaticLod();
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
    try {
      let top = -Infinity;
      for (const mesh of sourceMeshes) {
        const geometry = bakeGeometry(kit.THREE, mesh);
        const material = materials.forMesh(mesh);
        const triangles = trianglesOf(geometry);
        geometry.computeBoundingBox();
        top = Math.max(top, geometry.boundingBox?.max.y ?? 0);
        const wardrobeBatchKeyValue = nativeMaterialKey(material);
        sourceParts.push({ geometry, material, triangles, ...(wardrobeBatchKeyValue ? { wardrobeBatchKey: `${wardrobeBatchKeyValue}|${geometryLayout(geometry)}` } : {}) });
      }
      let parts = sourceParts;
      if ((options.detail ?? 'full') === 'lod') {
        const total=parts.reduce((sum,part)=>sum+part.triangles,0), ratio=Math.min(1,1600/Math.max(1,total));
        parts=parts.map(part=>{const geometry=simplifyNativeStaticGeometry(part.geometry,ratio);part.geometry.dispose();return {...part,geometry,triangles:trianglesOf(geometry)};});
      }
      let disposed = false;
      return {
        foundation: String(body.object.userData.characterFoundation ?? 'unknown'),
        parts, top, triangles: parts.reduce((sum, part) => sum + part.triangles, 0), refs: 0,
        dispose() {
          if (disposed) return;
          disposed = true;
          for (const part of parts) part.geometry.dispose();
          materials.dispose();
        },
      };
    } catch (error) {
      for (const part of sourceParts) part.geometry.dispose();
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
      task=makeTemplate(kit,look,seed,{...options,stride:phase}).then(value=>{
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

/** A movable still figure; its meshes share a bounded posed template, never a live skeleton. */
export function createCanonicalStaticAvatar(kit: Kit, look: unknown, options: StaticAvatarOptions = {}): AvatarGroup {
  const seed = options.seed ?? 'canonical-avatar';
  const read = normalizeLook(look, seed);
  const group = new kit.THREE.Group() as AvatarGroup;
  group.name = 'native-static-avatar';
  Object.assign(group.userData, { canonicalCharacter:true,characterFoundation:'native53',characterDetail:options.detail??'full',characterStatus:'loading',characterReservedTriangles:34000,characterReservedDrawCalls:10,look:read,top:2.6*(options.sceneScale??1),triangles:34000 });
  group.position.set(options.x??0,options.y??0,options.z??0);group.rotation.y=options.ry??0;
  const registry=kitResources(kit).disposers;
  let disposed=false,held:Awaited<ReturnType<typeof acquire>>|undefined;
  const dispose=()=>{if(disposed)return;disposed=true;registry.delete(dispose);group.removeFromParent();held?.release();};
  registry.add(dispose);group.userData.dispose=dispose;
  group.userData.ready=acquire(kit,read,seed,options).then(value=>{
    if(disposed){value.release();return;}held=value;
    for(const part of held.template.parts){const mesh=new kit.THREE.Mesh(part.geometry,part.material);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);}
    Object.assign(group.userData,{characterStatus:'ready',characterReservedTriangles:0,characterReservedDrawCalls:0,top:held.template.top,triangles:held.template.triangles});
    requestNativeRender(kit);
  }).catch(error=>{if(!disposed){group.userData.characterStatus='error';group.userData.characterError=String(error?.message??error);requestNativeRender(kit);}});
  return group;
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
  const wardrobeGroups = new Map<string, { material: THREE.Material; entries: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] }>();
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const tags: CrowdTag[] = [];
  let triangles = people.length*34000, disposed=false;
  Object.assign(group.userData,{characterFoundation:'native53',characterStatus:'loading',characterReservedTriangles:triangles,characterReservedDrawCalls:people.length*10});
  const registry=kitResources(kit).disposers;
  const dispose=()=>{if(disposed)return;disposed=true;registry.delete(dispose);for(const child of group.children)if((child as THREE.InstancedMesh).isInstancedMesh)(child as THREE.InstancedMesh).dispose();for(const geometry of ownedGeometries)geometry.dispose();group.removeFromParent();for(const bucket of buckets.values())bucket.held.release();};
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
      for (const part of held.template.parts) {
        if (part.wardrobeBatchKey) {
          let batch = wardrobeGroups.get(part.wardrobeBatchKey);
          if (!batch) {
            batch = { material: part.material as THREE.Material, entries: [] };
            wardrobeGroups.set(part.wardrobeBatchKey, batch);
          }
          for (const matrix of matrices) batch.entries.push({ geometry: part.geometry, matrix });
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
          group.add(mesh);
        }
        for (const matrix of matrices) if (matrix.determinant() < 0) {
          const geometry = transformed(part, matrix);
          ownedGeometries.push(geometry);
          const mesh = new kit.THREE.Mesh(geometry, part.material);
          mesh.name = 'canonical-crowd-mirrored-part';
          mesh.receiveShadow = true;
          group.add(mesh);
        }
      }
    }
    for (const batch of wardrobeGroups.values()) {
      const prepared: THREE.BufferGeometry[] = [];
      try {
        for (const entry of batch.entries) prepared.push(transformed({ geometry: entry.geometry, material: batch.material, triangles: 0 }, entry.matrix));
        const geometry = prepared.length === 1 ? prepared.pop()! : mergeGeometries(prepared, false);
        if (!geometry) throw new Error('compatible canonical wardrobe geometries failed to merge');
        ownedGeometries.push(geometry);
        const mesh = new kit.THREE.Mesh(geometry, batch.material);
        mesh.name = 'canonical-crowd-wardrobe-batch';
        mesh.receiveShadow = true;
        group.add(mesh);
      } finally {
        for (const geometry of prepared) geometry.dispose();
      }
    }
  } catch (error) {
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
