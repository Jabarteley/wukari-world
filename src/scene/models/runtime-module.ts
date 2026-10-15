/**
 * OWNER: scenes / Nigeria runtime integration.
 * Lazy, material-preserving owner for one independently streamed static module.
 * No scene registration: a host must first approve placement, navigation and its remaining budget.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';

type Point = readonly [number, number, number];
export interface RuntimeNavigation {
  /** Metres, glTF Y-up. Entrance is [x, z, yaw], unlike anchor positions. */
  entrance: Point;
  walkable: readonly (readonly [number, number, number, number])[];
  collision: readonly { id: string; min: Point; max: Point }[];
  anchors: readonly { id: string; position: Point; kind: string }[];
}
export interface RuntimeRequest {
  id: string;
  near: { url: string; sha256: string };
  far: { url: string; sha256: string };
  tier: 'near' | 'far';
  indoors: boolean;
  /** Nearest distance from the camera to the placed module bounds, in game units. */
  distance: number;
  navigation: RuntimeNavigation;
  position: Point;
  /** Quarter turns only: host collision uses axis-aligned boxes. */
  yaw: number;
  /** Remaining host allowance, including this module's shadow passes. */
  budget: { triangles: number; drawCalls: number; shadowPasses: number };
}
export interface RuntimePlacement {
  root: THREE.Group;
  tier: 'near' | 'far';
  triangles: number;
  drawCalls: number;
  textureBytes: number;
  entrance: { position: THREE.Vector3; yaw: number };
  anchors: { id: string; kind: string; position: THREE.Vector3 }[];
  collision: { id: string; box: THREE.Box3 }[];
  walkable: THREE.Vector3[][];
}
export const RUNTIME_METRE_SCALE = 2.45 / 1.75;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXTURE_BYTES = 9 * 1024 * 1024;

/** Free each resource once, including decoded ImageBitmaps shared by multiple texture slots. */
export function disposeRuntimeRoot(root: THREE.Object3D): void {
  const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>(), images = new Set<{ close?: () => void }>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometry.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value as THREE.Texture);
    }
  });
  for (const texture of textures) {
    const data = texture.source.data;
    for (const item of Array.isArray(data) ? data : [data]) if (item) images.add(item);
    texture.dispose();
  }
  for (const image of images) image.close?.();
  for (const material of materials) material.dispose();
  for (const item of geometry) item.dispose();
  root.removeFromParent(); root.clear();
}

function embeddedGlb(bytes: ArrayBuffer): void {
  const view = new DataView(bytes);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid runtime GLB');
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20) throw new Error('Invalid runtime GLB JSON');
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  if (doc.scenes?.length !== 1 || (doc.scene != null && doc.scene !== 0) || (doc.cameras?.length ?? 0) || (doc.animations?.length ?? 0) || (doc.skins?.length ?? 0) || doc.extensions?.KHR_lights_punctual?.lights?.length ||
    (doc.meshes ?? []).some((mesh: { primitives: { mode?: number }[] }) => mesh.primitives.some(p => p.mode != null && p.mode !== 4))) throw new Error('Runtime GLB requires one static triangle scene without cameras or lights');
  if ([...(doc.buffers ?? []), ...(doc.images ?? [])].some(item => item.uri != null)) throw new Error('Runtime GLB must embed every resource');
}

async function openRuntime(url: string, sha256: string, signal: AbortSignal): Promise<THREE.Group> {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`Runtime GLB HTTP ${response.status}`);
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE_BYTES) throw new Error('Runtime GLB exceeds byte limit');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== sha256) throw new Error('Runtime GLB hash mismatch');
  embeddedGlb(bytes.buffer);
  signal.throwIfAborted();
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  signal.throwIfAborted();
  const loaded = await new GLTFLoader().parseAsync(bytes.buffer, '');
  // parseAsync cannot be cancelled. The serialized owner disposes a stale result before starting another parse.
  return loaded.scene;
}

export function createRuntimeModule(kit: Kit, parent: THREE.Group, options: {
  changed?: (placement: RuntimePlacement | null) => void;
  open?: (url: string, sha256: string, signal: AbortSignal) => Promise<THREE.Group>;
} = {}) {
  const { THREE } = kit;
  let resident: RuntimePlacement | null = null, controller: AbortController | null = null;
  let generation = 0, disposed = false, queue = Promise.resolve(false);
  function drop() {
    if (!resident) return;
    disposeRuntimeRoot(resident.root); resident = null; options.changed?.(null);
  }
  function place(root: THREE.Group, request: RuntimeRequest, tier: 'near' | 'far'): RuntimePlacement {
    const holder = new THREE.Group(); holder.name = `runtime:${request.id}:${tier}`;
    holder.position.fromArray(request.position); holder.rotation.y = request.yaw;
    holder.scale.setScalar(RUNTIME_METRE_SCALE); holder.add(root); holder.updateMatrixWorld(true);
    let triangles = 0, drawCalls = 0, textureBytes = 0;
    const images = new Set<object>(), materials = new Set<THREE.Material>();
    root.traverse(object => {
      if ((object as THREE.Light).isLight || (object as THREE.Camera).isCamera) throw new Error('Runtime module must use host lighting and camera');
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) throw new Error('Runtime module must be static');
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0) / 3;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      drawCalls += (Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1) * (1 + request.budget.shadowPasses);
      for (const material of list) {
        if (!(material as THREE.MeshStandardMaterial).isMeshStandardMaterial) throw new Error('Runtime module requires PBR materials');
        materials.add(material);
        if (material.transparent && material.side === THREE.DoubleSide && !material.forceSinglePass) drawCalls++;
        for (const value of Object.values(material)) {
          if (!value?.isTexture) continue;
          const data = (value as THREE.Texture).source.data;
          if (!data || !Number.isFinite(data.width) || !Number.isFinite(data.height) || data.width <= 0 || data.height <= 0) throw new Error('Invalid runtime texture dimensions');
          if (images.has(data)) continue;
          images.add(data); textureBytes += Math.ceil(data.width * data.height * 4 * 4 / 3);
        }
      }
    });
    if (!triangles || triangles > Math.min(11500, request.budget.triangles) || drawCalls > Math.min(20, request.budget.drawCalls) || textureBytes > MAX_TEXTURE_BYTES) throw new Error('Runtime module exceeds remaining host budget');
    const point = (p: Point) => new THREE.Vector3(...p).applyMatrix4(holder.matrix);
    const nav = request.navigation;
    const result: RuntimePlacement = {
      root: holder, tier, triangles, drawCalls, textureBytes,
      entrance: { position: point([nav.entrance[0], 0, nav.entrance[1]]), yaw: nav.entrance[2] + request.yaw },
      anchors: nav.anchors.map(anchor => ({ id: anchor.id, kind: anchor.kind, position: point(anchor.position) })),
      collision: nav.collision.map(box => ({ id: box.id, box: new THREE.Box3(new THREE.Vector3(...box.min), new THREE.Vector3(...box.max)).applyMatrix4(holder.matrix) })),
      walkable: nav.walkable.map(([x0, z0, x1, z1]) => [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]].map(p => point(p as [number, number, number]))),
    };
    for (const material of materials) kit.adopt(material);
    return result;
  }
  const forget = kit.onDispose(dispose);
  function dispose() {
    if (disposed) return;
    disposed = true; generation++; controller?.abort(); drop(); forget();
  }
  return {
    get placement() { return resident; },
    /** Unloads the inactive tier BEFORE parsing the next. Call only when the selection changes. */
    select(request: RuntimeRequest | null): Promise<boolean> {
      if (disposed) return Promise.resolve(false);
      const own = ++generation;
      controller?.abort(); drop();
      queue = queue.catch(() => false).then(async () => {
        if (disposed || own !== generation || !request) return false;
        if (![...request.position, request.yaw, request.budget.triangles, request.budget.drawCalls, request.budget.shadowPasses, request.distance].every(Number.isFinite) || request.budget.triangles < 0 || request.budget.drawCalls < 0 || request.distance < 0) throw new Error('Invalid runtime placement');
        if (!Number.isInteger(request.budget.shadowPasses) || request.budget.shadowPasses < 0 || Math.abs(request.yaw / (Math.PI / 2) - Math.round(request.yaw / (Math.PI / 2))) > 1e-8) throw new Error('Runtime requires quarter-turn yaw and a nonnegative shadow pass count');
        const nav = request.navigation;
        const finite = (values: readonly number[], length: number) => values.length === length && values.every(Number.isFinite);
        if (!finite(nav.entrance, 3) || nav.anchors.some(a => !finite(a.position, 3)) ||
          nav.walkable.some(r => !finite(r, 4) || r[0] >= r[2] || r[1] >= r[3]) ||
          nav.collision.some(b => !finite(b.min, 3) || !finite(b.max, 3) || b.min.some((v, i) => v > b.max[i]!))) throw new Error('Invalid runtime navigation');
        const tier = request.indoors || request.distance < 30 ? 'near' : request.tier, file = request[tier];
        if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid runtime digest');
        const abort = new AbortController(); controller = abort;
        let root: THREE.Group | null = null, placed: RuntimePlacement | null = null;
        try {
          root = await (options.open ?? openRuntime)(file.url, file.sha256, abort.signal);
          if (disposed || own !== generation) { disposeRuntimeRoot(root); return false; }
          placed = place(root, request, tier);
          resident = placed; parent.add(placed.root); options.changed?.(placed); return true;
        } catch (error) {
          if (placed) { disposeRuntimeRoot(placed.root); if (resident === placed) resident = null; }
          else if (root) disposeRuntimeRoot(root);
          if (disposed || own !== generation || abort.signal.aborted) return false;
          throw error;
        } finally { if (controller === abort) controller = null; }
      });
      return queue;
    },
    dispose,
  };
}
