import type * as THREE from 'three';
import type { GLTFLoaderPlugin } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createKit } from '../kit.ts';
import { createGltfSource } from '../models/gltf-source.ts';
import type { ModelData, ModelPart } from '../models/scene-models.ts';
import type { MeasuredAsset } from './contract.ts';
import type { RecipeAssetRef, RecipeRuntimeMetadata } from './pack.ts';
import { parseAssetRef, requireRecipe, sha256 } from './pack.ts';

interface ImageHandle { width: number; height: number; close?(): void }
export interface PreparedAtlas { readonly key: string; readonly texture: THREE.Texture; readonly image: ImageHandle; users: number }
export interface PreparedAsset { readonly measurement: MeasuredAsset; readonly models: ReadonlyMap<string, ModelData>; readonly atlas?: PreparedAtlas }
export interface PreparedCityAssets { readonly kit: PreparedAsset; readonly hero?: PreparedAsset }
interface GlbDocument {
  asset?: { version?: string }; scene?: number; scenes?: { nodes?: number[] }[];
  animations?: unknown[]; skins?: unknown[]; cameras?: unknown[];
  extensions?: Record<string, unknown>; extensionsUsed?: string[]; extensionsRequired?: string[];
  buffers?: { uri?: string; byteLength: number; extensions?: { EXT_meshopt_compression?: { fallback?: boolean } } }[];
  bufferViews?: { buffer?: number; byteOffset?: number; byteLength: number; extensions?: { EXT_meshopt_compression?: { count: number; byteStride: number; buffer: number; byteOffset?: number; byteLength: number } } }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
  textures?: { source?: number; extensions?: { EXT_texture_webp?: { source: number } } }[];
  materials?: { alphaMode?: string; doubleSided?: boolean; normalTexture?: unknown; emissiveTexture?: unknown; occlusionTexture?: unknown; emissiveFactor?: number[];
    pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: { index: number }; metallicRoughnessTexture?: unknown } }[];
  meshes?: { primitives: { mode?: number; material?: number; targets?: unknown; attributes?: Record<string, number> }[] }[];
  nodes?: { camera?: unknown; skin?: unknown; extensions?: Record<string, unknown> }[];
}

export async function checkedGlb(bytes: Uint8Array<ArrayBuffer>, measured: MeasuredAsset): Promise<void> {
  requireRecipe(bytes.length === measured.rawBytes && await sha256(bytes) === measured.sha256, 'asset byte/hash mismatch');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  requireRecipe(bytes.length >= 28 && view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2 && view.getUint32(8, true) === bytes.length && view.getUint32(16, true) === 0x4e4f534a, 'invalid GLB header');
  const length = view.getUint32(12, true), binHeader = 20 + length;
  requireRecipe(length % 4 === 0 && binHeader + 8 <= bytes.length && view.getUint32(binHeader + 4, true) === 0x004e4942 && binHeader + 8 + view.getUint32(binHeader, true) === bytes.length, 'invalid GLB chunks');
  const doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, binHeader))) as GlbDocument;
  requireRecipe(doc.asset?.version === '2.0' && doc.scenes?.length === 1 && (doc.scene ?? 0) === 0 && !doc.animations?.length && !doc.skins?.length && !doc.cameras?.length && !doc.extensions?.KHR_lights_punctual, 'requires one static GLB scene');
  requireRecipe(doc.buffers && doc.buffers.length >= 1 && doc.buffers.length <= 2 && doc.buffers.every((b, i) => !b.uri && Number.isSafeInteger(b.byteLength) && b.byteLength > 0 && b.byteLength <= 16 * 1024 * 1024 && (i === 0 || b.extensions?.EXT_meshopt_compression?.fallback === true)) && doc.buffers[0]!.byteLength <= view.getUint32(binHeader, true), 'requires embedded GLB buffer and bounded Meshopt fallback');
  requireRecipe(doc.nodes?.every(n => n.skin === undefined && n.camera === undefined && !n.extensions?.KHR_lights_punctual), 'unsupported GLB node');
  const supported = new Set(['EXT_meshopt_compression', 'KHR_mesh_quantization', 'KHR_texture_transform', 'EXT_texture_webp']);
  requireRecipe([...(doc.extensionsUsed ?? []), ...(doc.extensionsRequired ?? [])].every(x => supported.has(x)), 'unsupported GLB extension');
  requireRecipe(doc.extensionsUsed?.includes('EXT_meshopt_compression'), 'Meshopt compression required');
  let decodedBytes = 0;
  for (const b of doc.bufferViews ?? []) {
    requireRecipe(Number.isSafeInteger(b.buffer ?? 0) && doc.buffers[b.buffer ?? 0] && Number.isSafeInteger(b.byteLength) && b.byteLength > 0 && Number.isSafeInteger(b.byteOffset ?? 0) && (b.byteOffset ?? 0) >= 0 && (b.byteOffset ?? 0) + b.byteLength <= doc.buffers[b.buffer ?? 0]!.byteLength, 'invalid GLB buffer view');
    const compressed = b.extensions?.EXT_meshopt_compression;
    if (compressed) {
      requireRecipe(Number.isSafeInteger(compressed.count) && compressed.count > 0 && Number.isSafeInteger(compressed.byteStride) && compressed.byteStride > 0, 'invalid Meshopt allocation');
      requireRecipe(compressed.buffer === 0 && Number.isSafeInteger(compressed.byteOffset ?? 0) && (compressed.byteOffset ?? 0) >= 0 && Number.isSafeInteger(compressed.byteLength) && compressed.byteLength > 0 && (compressed.byteOffset ?? 0) + compressed.byteLength <= doc.buffers[0]!.byteLength, 'invalid compressed buffer range');
      decodedBytes += compressed.count * compressed.byteStride;
    } else decodedBytes += b.byteLength;
  }
  requireRecipe(decodedBytes <= 16 * 1024 * 1024, 'GLB decoded allocation exceeds limit');
  requireRecipe(doc.meshes?.length === measured.parts.length && doc.meshes.every(m => m.primitives.length === 1 && m.primitives.every(p => (p.mode ?? 4) === 4 && p.material === 0 && !p.targets && p.attributes?.POSITION !== undefined && p.attributes.NORMAL !== undefined && (measured.atlas ? p.attributes.TEXCOORD_0 !== undefined : p.attributes.COLOR_0 !== undefined))), 'invalid GLB primitives');
  requireRecipe(doc.materials?.length === 1, 'requires one GLB material');
  const material = doc.materials[0]!, pbr = material.pbrMetallicRoughness;
  requireRecipe((material.alphaMode ?? 'OPAQUE') === 'OPAQUE' && !material.doubleSided && !material.normalTexture && !material.emissiveTexture && !material.occlusionTexture && !pbr?.metallicRoughnessTexture && (material.emissiveFactor ?? [0, 0, 0]).every(v => v === 0), 'unsupported scenery material');
  requireRecipe((pbr?.baseColorFactor ?? [1, 1, 1, 1]).length === 4 && (pbr?.baseColorFactor ?? [1, 1, 1, 1]).every(v => v === 1), 'base colour must be baked into vertices or atlas');
  if (measured.atlas) {
    requireRecipe(doc.images?.length === 1 && doc.textures?.length === 1 && pbr?.baseColorTexture?.index === 0 && doc.textures[0]!.extensions?.EXT_texture_webp?.source === 0, 'requires one WebP atlas');
    const image = doc.images[0]!;
    requireRecipe(!image.uri && image.mimeType === 'image/webp' && Number.isSafeInteger(image.bufferView), 'requires embedded WebP');
    const data = doc.bufferViews?.[image.bufferView!];
    requireRecipe(data && !data.extensions && Number.isSafeInteger(data.byteOffset ?? 0) && (data.byteOffset ?? 0) >= 0 && (data.byteOffset ?? 0) + data.byteLength <= doc.buffers[0]!.byteLength, 'invalid atlas buffer view');
    const start = binHeader + 8 + (data.byteOffset ?? 0);
    requireRecipe(await sha256(bytes.slice(start, start + data.byteLength)) === measured.atlas.sha256, 'embedded atlas hash mismatch');
  } else requireRecipe(!doc.images?.length && !doc.textures?.length && !pbr?.baseColorTexture, 'untextured asset contains a texture');
}

async function readBytes(ref: RecipeAssetRef): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(ref.url);
  requireRecipe(response.ok && response.body, `asset HTTP ${response.status}`);
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      requireRecipe(length <= ref.measurement.rawBytes, 'asset exceeds declared bytes'); chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return bytes;
}

function checkPart(part: ModelPart, measured: MeasuredAsset['parts'][number], atlas: string): void {
  requireRecipe(part.name === measured.node && part.atlas === atlas && part.index.length === measured.triangles * 3 && part.position.length % 3 === 0 && part.normal.length === part.position.length, 'decoded part identity/count mismatch');
  const count = part.position.length / 3;
  requireRecipe(count > 0 && part.index.every(i => i < count) && [part.position, part.normal, part.color, part.uv].every(a => !a || a.every(Number.isFinite)), 'invalid decoded arrays');
  requireRecipe(!part.color || part.color.length === count * 3, 'invalid decoded colour count');
  requireRecipe(!atlas || (part.uv && part.uv.length === count * 2 && part.uv.every(n => n >= -1e-5 && n <= 1 + 1e-5)), 'invalid decoded atlas UVs');
  for (let axis = 0; axis < 3; axis++) {
    let min = Infinity, max = -Infinity;
    for (let i = axis; i < part.position.length; i += 3) { min = Math.min(min, part.position[i]!); max = Math.max(max, part.position[i]!); }
    requireRecipe(Math.abs(min - measured.bounds.min[axis]!) <= 1e-5 && Math.abs(max - measured.bounds.max[axis]!) <= 1e-5, 'decoded bounds differ from measurement');
  }
}

export class RecipeAssetStore {
  private assets = new Map<string, Promise<PreparedAsset>>();
  private signatures = new Map<string, string>();
  private atlases = new Map<string, PreparedAtlas>();
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  get retainedImageBytes(): number { return this.atlases.size * 1024 * 1024 * 4; }
  prepare(ref: RecipeAssetRef, region: string): Promise<PreparedAsset> {
    requireRecipe(!this.disposed, 'asset store disposed');
    const checked = parseAssetRef(ref, ref.measurement.kind, ref.measurement.id);
    requireRecipe(checked.measurement.kind !== 'kit' || checked.measurement.id === region, 'kit region mismatch');
    const key = `${region}:${checked.url}`, signature = JSON.stringify(checked);
    const prior = this.assets.get(key);
    if (prior) { requireRecipe(this.signatures.get(key) === signature, 'asset measurement changed under the same hash'); return prior; }
    const job = this.queue.then(() => this.decode(checked, region));
    this.queue = job.catch(() => {});
    this.assets.set(key, job); this.signatures.set(key, signature);
    void job.catch(() => { if (this.assets.get(key) === job) { this.assets.delete(key); this.signatures.delete(key); } });
    return job;
  }
  async prepareCity(metadata: RecipeRuntimeMetadata): Promise<PreparedCityAssets> {
    const kit = await this.prepare(metadata.assets.kit, metadata.region);
    const hero = metadata.assets.hero ? await this.prepare(metadata.assets.hero, metadata.region) : undefined;
    return { kit, ...(hero ? { hero } : {}) };
  }
  async dispose(): Promise<void> {
    this.disposed = true; await this.queue;
    requireRecipe([...this.atlases.values()].every(a => a.users === 0), 'cannot dispose atlases used by a Kit');
    for (const atlas of this.atlases.values()) { atlas.texture.dispose(); atlas.image.close?.(); }
    this.atlases.clear(); this.assets.clear(); this.signatures.clear();
  }
  private async decode(ref: RecipeAssetRef, region: string): Promise<PreparedAsset> {
    requireRecipe(!this.disposed, 'asset store disposed');
    const bytes = await readBytes(ref), measured = ref.measurement;
    await checkedGlb(bytes, measured);
    const atlasKey = measured.atlas ? `${region}:${measured.atlas.sha256}` : '';
    const retained = this.atlases.get(atlasKey);
    const kit = createKit(), { THREE } = kit;
    const images = new Set<ImageHandle>(), closed = new Set<ImageHandle>();
    const resources = new Set<THREE.Texture | THREE.Material | THREE.BufferGeometry>();
    const freed = new Set<THREE.Texture | THREE.Material | THREE.BufferGeometry>();
    const hold = <T extends THREE.Texture | THREE.Material | THREE.BufferGeometry>(resource: T): T => {
      if (!resources.has(resource)) { resources.add(resource); resource.addEventListener('dispose', () => freed.add(resource)); } return resource;
    };
    const close = (image: ImageHandle) => { if (image !== retained?.image && !closed.has(image)) { closed.add(image); image.close?.(); } };
    let source: ReturnType<typeof createGltfSource> | undefined, published: PreparedAtlas | undefined;
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]);
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      if (atlasKey) loader.register(parser => ({ name: 'recipe-atlas-ownership', beforeRoot: async () => {
        const texture: unknown = await parser.getDependency('texture', 0);
        requireRecipe(texture instanceof THREE.Texture, 'atlas decode failed'); hold(texture);
        const image = texture.source.data as ImageHandle | null;
        if (image) images.add(image);
        requireRecipe(image && image.width === 1024 && image.height === 1024, 'decoded atlas dimensions differ');
        if (retained && image !== retained.image) { texture.source = retained.texture.source; close(image); }
      } } satisfies GLTFLoaderPlugin));
      const root = (await loader.parseAsync(bytes.buffer, '')).scene;
      root.traverse(object => {
        const mesh = object as THREE.Mesh; if (!mesh.isMesh) return;
        hold(mesh.geometry);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        requireRecipe(materials.length === 1, 'decoded material count mismatch');
        const original = materials[0] as THREE.MeshStandardMaterial; hold(original);
        requireRecipe(Boolean(original.map) === Boolean(atlasKey), 'decoded atlas missing');
        const material = hold(original.clone());
        if (original.map) { hold(original.map); material.map = hold(original.map.clone()); }
        mesh.material = material;
      });
      source = createGltfSource(kit, { urls: { [measured.sha256]: ref.url }, atlasOf: () => atlasKey, open: async () => ({ scene: root }) });
      const data = await source.load(measured.sha256);
      requireRecipe(data.parts.length === measured.parts.length && data.triangles === measured.triangles && new Set(data.parts.map(p => p.name)).size === data.parts.length, 'decoded asset coverage mismatch');
      const models = new Map<string, ModelData>();
      for (const part of data.parts) {
        const expected = measured.parts.find(p => p.node === part.name); requireRecipe(expected, 'unexpected decoded node');
        checkPart(part, expected, atlasKey);
        const key = `${measured.sha256}:${part.name}`;
        Object.freeze(part);
        models.set(part.name, Object.freeze({ key, parts: Object.freeze([part]) as unknown as ModelPart[], anchors: Object.freeze({}), triangles: expected.triangles }));
      }
      if (atlasKey) {
        const texture = source.texture(atlasKey); requireRecipe(texture, 'prepared atlas missing');
        if (retained) published = retained;
        else {
          const image = texture.source.data as ImageHandle;
          requireRecipe(images.has(image) && !closed.has(image), 'unowned decoded image');
          published = { key: atlasKey, texture: texture.clone(), image, users: 0 };
          this.atlases.set(atlasKey, published);
        }
      }
      return Object.freeze({ measurement: measured, models, ...(published ? { atlas: published } : {}) });
    } finally {
      source?.dispose?.();
      for (const resource of resources) if (!freed.has(resource)) resource.dispose();
      for (const image of images) if (image !== published?.image) close(image);
      kit.dispose();
    }
  }
}

export const recipeAssets = new RecipeAssetStore();
