import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { brotliCompressSync, constants } from 'node:zlib';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { glbChunks, imageSize, parseGltf, rebuild, viewBytes, writeGlb } from '../assets/glb.ts';
import type { Doc, Json } from '../assets/glb.ts';
import { gltfpack } from '../assets/prepare.ts';

export const REGIONS = ['niger-delta', 'yoruba-southwest', 'sahel-north', 'igbo-southeast', 'gulf-guinea', 'sahel-francophone', 'east-africa', 'swahili-coast', 'southern-africa', 'maghreb', 'western-europe', 'east-asia', 'south-asia', 'americas-oceania'] as const;
export const PROPS = ['market-stall', 'canopy', 'crate-stack', 'produce-stand', 'cooking-stand', 'water-tank', 'generator', 'minibus', 'three-wheeler', 'bench', 'bollard', 'planter', 'broadleaf-tree', 'palm', 'acacia', 'wall', 'gate', 'kiosk', 'street-lamp', 'sign-frame'] as const;
export const HERO_TEMPLATES = ['market', 'gate', 'tower', 'lattice-tower', 'colonnade', 'bridge', 'rock', 'waterfront', 'landscape', 'retail-building', 'landmark'] as const;
export const LANDMARK_COMPOSITIONS = ['three-figures', 'terraced-fort', 'masonry-ring-tower', 'four-tower-castle', 'sphere-towers', 'round-tower-fort', 'lotus-stupa', 'terraced-stairs', 'courtyard-mosque', 'twin-bell-cathedral', 'pentagonal-fort', 'red-fort-pavilions', 'doric-temple', 'guildhall-square', 'civic-pavilions', 'observation-tower', 'flame-obelisk', 'borehole-site', 'domed-basilica', 'hexagonal-clock', 'bell-tower-church', 'verandah-house', 'latte-stones', 'cenotaph', 'barracks-court', 'clock-fort', 'inclined-stairs', 'gable-store', 'octagonal-lighthouse'] as const;
const restrictedBuildingCountries = ['ng', 'gh', 'fr', 'gf', 'gp', 'mq', 're', 'yt', 'bl', 'mf', 'pm', 'pf', 'nc', 'wf', 'tf', 'cp'];
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LIMITS = { propTriangles: 1500, heroTriangles: 4000, kitBrotli: 300_000, heroBytes: 60_000, rawBytes: 2 * 1024 * 1024, decodedBytes: 16 * 1024 * 1024 } as const;
const PHYSICAL_HERO_SOURCES = [
  'scripts/scene-factory/assets.ts', 'scripts/scene-factory/blender/physical_hero.py',
  'scripts/scene-factory/blender/physical_landscape.py', 'scripts/scene-factory/blender/physical_retail.py',
  'scripts/scene-factory/blender/physical_landmarks.py', 'scripts/scene-factory/blender/kit.py',
  'scripts/scene-factory/blender/construction.py', 'scripts/scene-factory/blender/shared.py',
  'scripts/assets/blender/common.py', 'scripts/assets/glb.ts', 'scripts/assets/prepare.ts',
] as const;
type Triple = [number, number, number];
type Kind = 'kit' | 'hero';
export interface HeroAtlasBinding { region: (typeof REGIONS)[number]; sha256: string }
export interface GeometryReport { node: string; triangles: number; bounds: { min: Triple; max: Triple }; footprint: [number, number, number, number] }
export interface AssetReport {
  version: 1; kind: Kind; id: string; url: string; sha256: string; rawBytes: number; brotliBytes: number;
  triangles: number; parts: GeometryReport[]; extensions: string[];
  atlas?: { width: 1024; height: 1024; mimeType: 'image/webp'; sha256: string };
  inputs?: { rawSha256: string; scriptsSha256: string; styleSha256?: string; provenance?: HeroRecord; node: string; packer: 'gltfpack@1.3.0' };
}
export interface HeroRecord {
  surface?: { kind: 'regional-atlas'; region: (typeof REGIONS)[number] };
  city: string; country: string; name: string; category: 'monument' | 'market' | 'natural-feature' | 'building';
  builtYear?: number; sourceUrls: string[]; sourceRef: string; sourceLicence: string; accessed: string;
  geometryLicence: 'AGPL-3.0-or-later'; generator: (typeof HERO_TEMPLATES)[number];
  parameters: { width: number; depth: number; height: number; seed: number; palette: string[]; composition?: 'cross-lane' | 'covered-lane' | 'court' | 'neutral-trade' | 'open-lagoon' | 'paired-ponds' | 'forest' | 'open-park' | 'hill' | 'bare-coast' | 'low-cay' | 'ice-valley' | 'gully' | 'riverbank' | 'confluence' | 'stone-arches' | 'pontoon' | (typeof LANDMARK_COMPOSITIONS)[number] };
  evidence: string;
}
const fail = (message: string): never => { throw new Error(message); };
const check = (condition: unknown, message: string): void => { if (!condition) fail(message); };
const whole = (n: unknown, min = 0): n is number => Number.isSafeInteger(n) && Number(n) >= min;
const finite = (a: unknown, length: number): a is number[] => Array.isArray(a) && a.length === length && a.every(Number.isFinite);
const hash = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
export const brotliBytes = (bytes: Uint8Array): number => brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length } }).length;
const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateHeroRecord(record: unknown): asserts record is HeroRecord {
  const r = record as HeroRecord;
  check(r && typeof r === 'object', 'Hero record must be an object');
  if (r.surface !== undefined) check(r.surface && Object.keys(r.surface).sort().join(',') === 'kind,region' && r.surface.kind === 'regional-atlas' && (REGIONS as readonly string[]).includes(r.surface.region), 'Invalid hero surface declaration');
  check(typeof r.city === 'string' && idPattern.test(r.city), 'Invalid hero city');
  check(typeof r.country === 'string' && /^[a-z]{2}$/.test(r.country), 'Hero country needs its ISO code');
  check(typeof r.name === 'string' && r.name.trim().length >= 2, 'Hero needs its real feature name');
  check(['monument', 'market', 'natural-feature', 'building'].includes(r.category), 'Hero category is unknown');
  check(Array.isArray(r.sourceUrls) && r.sourceUrls.length > 0 && r.sourceUrls.every(url => { try { return new URL(url).protocol === 'https:'; } catch { return false; } }), 'Hero needs exact HTTPS sources');
  for (const key of ['sourceRef', 'sourceLicence', 'evidence'] as const) check(typeof r[key] === 'string' && r[key].trim().length > 5, `Hero needs ${key}`);
  check(typeof r.accessed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.accessed) && Number.isFinite(Date.parse(r.accessed)), 'Hero needs source access date');
  check(r.geometryLicence === 'AGPL-3.0-or-later', 'Procedural hero geometry licence mismatch');
  check((HERO_TEMPLATES as readonly string[]).includes(r.generator), 'Unknown hero generator');
  if (r.builtYear !== undefined) check(Number.isInteger(r.builtYear) && r.builtYear > -10000 && r.builtYear <= new Date().getUTCFullYear(), 'Invalid construction year');
  if (restrictedBuildingCountries.includes(r.country) && r.category === 'building') check(r.builtYear !== undefined && r.builtYear < 1950, 'Restricted-country building needs a sourced pre-1950 construction year');
  const p = r.parameters;
  check(p && ['width', 'depth', 'height'].every(k => Number.isFinite(p[k as 'width']) && p[k as 'width'] >= 0.1 && p[k as 'width'] <= 60), 'Hero dimensions must be between 0.1 and 60 metres');
  check(whole(p.seed), 'Hero seed must be a nonnegative integer');
  check(Array.isArray(p.palette) && p.palette.length >= 4 && p.palette.length <= 16 && p.palette.every(c => /^#[a-f0-9]{6}$/i.test(c)), 'Hero needs 4–16 palette colours');
  const categories: Record<(typeof HERO_TEMPLATES)[number], string[]> = {
    market: ['market'], gate: ['building', 'monument'], tower: ['building', 'monument'], 'lattice-tower': ['building', 'monument'],
    colonnade: ['building', 'monument'], bridge: ['building', 'monument'], rock: ['natural-feature'], waterfront: ['natural-feature'], landscape: ['natural-feature'], 'retail-building': ['building'], landmark: ['building', 'monument'],
  };
  check(categories[r.generator].includes(r.category), 'Hero category does not match generator');
  if (r.generator === 'landscape' || r.generator === 'landmark') check(p.composition !== undefined, 'Landscape and landmark need an explicit composition');
  if (p.composition !== undefined) {
    const allowed: readonly string[] = r.generator === 'landmark' ? LANDMARK_COMPOSITIONS : r.generator === 'market' ? ['cross-lane', 'covered-lane', 'court', 'neutral-trade'] : r.generator === 'waterfront' ? ['open-lagoon', 'paired-ponds'] : r.generator === 'landscape' ? ['forest', 'open-park', 'hill', 'bare-coast', 'low-cay', 'ice-valley', 'gully', 'riverbank', 'confluence'] : r.generator === 'bridge' ? ['stone-arches', 'pontoon'] : [];
    check(allowed.includes(p.composition), 'Unsupported hero composition for generator');
  }
}

function strictGlb(bytes: Buffer): Doc {
  check(bytes.length >= 28 && bytes.length <= LIMITS.rawBytes, 'GLB byte limit or truncated header');
  check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'Invalid GLB header');
  const jsonLength = bytes.readUInt32LE(12), binAt = 20 + jsonLength;
  check(jsonLength % 4 === 0 && binAt + 8 <= bytes.length && bytes.readUInt32LE(16) === 0x4e4f534a, 'Invalid GLB JSON chunk');
  check(bytes.readUInt32LE(binAt + 4) === 0x004e4942 && bytes.readUInt32LE(binAt) % 4 === 0 && binAt + 8 + bytes.readUInt32LE(binAt) === bytes.length, 'Invalid GLB binary chunk');
  const doc = glbChunks(bytes), j = doc.json;
  check(j.asset?.version === '2.0' && j.scenes?.length === 1 && (j.scene ?? 0) === 0, 'Exactly one glTF 2.0 scene is required');
  check(!j.animations?.length && !j.skins?.length && !j.cameras?.length, 'Only static scenery is allowed');
  check(Array.isArray(j.buffers) && j.buffers.length >= 1 && j.buffers.length <= 2 && j.buffers.every((b: Json) => b.uri === undefined && whole(b.byteLength)), 'External or invalid buffers');
  check(j.buffers[0].byteLength <= doc.bin.length && doc.bin.length - j.buffers[0].byteLength <= 3, 'Embedded buffer length mismatch');
  const allowed = new Set(['EXT_meshopt_compression', 'KHR_mesh_quantization', 'EXT_texture_webp', 'KHR_texture_transform']);
  const declared = new Set<string>(j.extensionsUsed ?? []);
  for (const ext of [...declared, ...(j.extensionsRequired ?? [])]) check(allowed.has(ext), `Unsupported extension ${ext}`);
  const scan = (v: unknown): void => {
    if (!v || typeof v !== 'object') return;
    for (const [key, val] of Object.entries(v)) {
      if (key === 'extensions') for (const ext of Object.keys(val as object)) check(allowed.has(ext) && declared.has(ext), `Undeclared or unsupported extension ${ext}`);
      scan(val);
    }
  };
  scan(j);
  return doc;
}

async function decodedViews(doc: Doc): Promise<Uint8Array[]> {
  await MeshoptDecoder.ready;
  let allocated = 0;
  return (doc.json.bufferViews ?? []).map((v: Json, i: number) => {
    check(whole(v.byteLength, 1) && whole(v.buffer) && v.buffer < doc.json.buffers.length, `Invalid view ${i}`);
    const e = v.extensions?.EXT_meshopt_compression;
    if (e) {
      check(e.buffer === 0 && whole(e.byteOffset ?? 0) && whole(e.byteLength, 1) && (e.byteOffset ?? 0) + e.byteLength <= doc.bin.length, `Invalid compressed view ${i}`);
      check(whole(e.count, 1) && whole(e.byteStride, 1) && e.byteStride <= 256 && e.count * e.byteStride === v.byteLength, `Invalid decoded length ${i}`);
      check(['ATTRIBUTES', 'TRIANGLES', 'INDICES'].includes(e.mode) && ['NONE', 'OCTAHEDRAL', 'QUATERNION', 'EXPONENTIAL'].includes(e.filter ?? 'NONE'), `Invalid compression mode ${i}`);
      allocated += v.byteLength;
      check(allocated <= LIMITS.decodedBytes, 'Decoded geometry exceeds memory cap');
      const result = new Uint8Array(v.byteLength);
      MeshoptDecoder.decodeGltfBuffer(result, e.count, e.byteStride, doc.bin.subarray(e.byteOffset ?? 0, (e.byteOffset ?? 0) + e.byteLength), e.mode, e.filter ?? 'NONE');
      return result;
    }
    const start = v.byteOffset ?? 0;
    check(v.buffer === 0 && whole(start) && start + v.byteLength <= doc.bin.length, `Unbacked view ${i}`);
    return doc.bin.subarray(start, start + v.byteLength);
  });
}

function accessor(doc: Doc, views: Uint8Array[], index: unknown): number[][] {
  check(whole(index) && index < doc.json.accessors?.length, 'Invalid accessor index');
  const a = doc.json.accessors[index as number] as Json;
  const component = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType as number];
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type as string];
  check(component && width && whole(a.count, 1) && a.count <= 200000 && !a.sparse, 'Invalid or unsupported accessor');
  check(whole(a.bufferView) && views[a.bufferView], 'Missing accessor view');
  const data = views[a.bufferView]!, v = doc.json.bufferViews[a.bufferView] as Json;
  const stride = v.byteStride ?? component! * width!, start = a.byteOffset ?? 0;
  check(whole(start) && whole(stride, component! * width!) && stride % component! === 0 && start % component! === 0 && start + (a.count - 1) * stride + component! * width! <= data.byteLength, 'Accessor exceeds its view');
  const reader = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const read = (offset: number): number => {
    const raw = a.componentType === 5126 ? reader.getFloat32(offset, true) : a.componentType === 5125 ? reader.getUint32(offset, true) : a.componentType === 5123 ? reader.getUint16(offset, true) : a.componentType === 5122 ? reader.getInt16(offset, true) : a.componentType === 5121 ? reader.getUint8(offset) : reader.getInt8(offset);
    if (!a.normalized) return raw;
    check(a.componentType !== 5126 && a.componentType !== 5125, 'Invalid normalized component');
    return a.componentType === 5120 ? Math.max(-1, raw / 127) : a.componentType === 5122 ? Math.max(-1, raw / 32767) : raw / (a.componentType === 5121 ? 255 : 65535);
  };
  return Array.from({ length: a.count }, (_, n) => Array.from({ length: width! }, (_, k) => read(start + n * stride + k * component!)));
}

export async function validateAsset(bytes: Buffer, kind: Kind, id: string, expectedNodes?: readonly string[], binding?: HeroAtlasBinding): Promise<AssetReport> {
  check(idPattern.test(id), 'Invalid asset id');
  check(kind === 'kit' || kind === 'hero', 'Invalid asset kind');
  if (kind === 'kit') check((REGIONS as readonly string[]).includes(id), 'Unknown region');
  if (binding !== undefined) check(kind === 'hero' && binding && Object.keys(binding).sort().join(',') === 'region,sha256' && (REGIONS as readonly string[]).includes(binding.region) && /^[a-f0-9]{64}$/.test(binding.sha256), 'Invalid hero atlas binding');
  const doc = strictGlb(bytes), j = doc.json;
  const compressed = (j.bufferViews ?? []).filter((v: Json) => v.extensions?.EXT_meshopt_compression).length;
  check(compressed > 0 && j.extensionsRequired?.includes('EXT_meshopt_compression'), 'Meshopt compression is required');
  check(j.meshes?.length > 0 && j.meshes.length <= (kind === 'kit' ? PROPS.length : 1), 'Invalid mesh count');
  const views = await decodedViews(doc);
  let atlas: AssetReport['atlas'];
  if (kind === 'kit' || binding) {
    check(j.images?.length === 1 && j.textures?.length === 1 && j.materials?.length === 1, 'Kit needs exactly one image, texture and material');
    const image = j.images[0] as Json;
    check(image.uri === undefined && image.mimeType === 'image/webp' && whole(image.bufferView), 'Kit image must be embedded WebP');
    const data = Buffer.from(views[image.bufferView] ?? []);
    check(data.length >= 30 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' && data.readUInt32LE(4) + 8 === data.length, 'Invalid WebP container');
    const size = imageSize(data);
    check(size[0] === 1024 && size[1] === 1024, 'Kit atlas must be 1024 by 1024');
    check(j.textures[0].extensions?.EXT_texture_webp?.source === 0 && j.materials[0].pbrMetallicRoughness?.baseColorTexture?.index === 0, 'Kit material must sample its WebP atlas');
    atlas = { width: 1024, height: 1024, mimeType: 'image/webp', sha256: hash(data) };
    if (binding) {
      check(atlas.sha256 === binding.sha256, 'Hero atlas differs from regional kit');
      const factor = j.materials[0].pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
      check(finite(factor, 4) && factor.every(value => value === 1), 'Atlas hero needs a white material factor');
    }
  } else check(!j.images?.length && !j.textures?.length && j.materials?.length === 1, 'Hero requires one vertex-colour material and no textures');
  for (const m of j.materials as Json[]) check((m.alphaMode ?? 'OPAQUE') === 'OPAQUE' && !m.doubleSided && !m.normalTexture && !m.emissiveTexture && !m.occlusionTexture && !m.pbrMetallicRoughness?.metallicRoughnessTexture, 'Only opaque single-sided base-colour scenery is allowed');
  const nodes = j.nodes as Json[];
  check(Array.isArray(nodes) && nodes.length <= 200, 'Invalid node count');
  const wanted = [...(expectedNodes ?? (kind === 'kit' ? PROPS : [id]))].sort();
  const expectedNames = new Set(wanted);
  const visited = new Set<number>(), partNames = new Set<string>(), usedMeshes = new Set<number>();
  const parts: GeometryReport[] = [];
  const vector = new Vector3();
  const walk = (index: number, parent: Matrix4, wrappedName?: string): void => {
    check(whole(index) && nodes[index] && !visited.has(index), 'Cyclic, reused or missing node'); visited.add(index);
    const node = nodes[index]!;
    check(node.skin === undefined && node.camera === undefined && !node.weights, 'Unsupported node');
    const local = new Matrix4();
    if (node.matrix) {
      check(finite(node.matrix, 16) && node.matrix[3] === 0 && node.matrix[7] === 0 && node.matrix[11] === 0 && node.matrix[15] === 1, 'Invalid affine node matrix'); local.fromArray(node.matrix);
    }
    else {
      check(finite(node.translation ?? [0, 0, 0], 3) && finite(node.rotation ?? [0, 0, 0, 1], 4) && finite(node.scale ?? [1, 1, 1], 3), 'Invalid node transform');
      const q = new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]);
      check(Math.abs(q.length() - 1) < 1e-4, 'Non-unit node quaternion');
      local.compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), q, new Vector3().fromArray(node.scale ?? [1, 1, 1]));
    }
    const world = parent.clone().multiply(local);
    check(world.determinant() > 1e-12, 'Mirrored or collapsed node transform');
    const children = node.children ?? [];
    check(Array.isArray(children), 'Invalid node children');
    if (wrappedName !== undefined) check(node.name === undefined && node.mesh !== undefined && children.length === 0, 'Ambiguous named wrapper child');
    if (node.mesh === undefined && node.name !== undefined) {
      check(wrappedName === undefined && typeof node.name === 'string' && expectedNames.has(node.name) && children.length === 1, 'Invalid logical part wrapper');
      const child = children[0];
      check(whole(child) && nodes[child] && nodes[child]!.name === undefined && nodes[child]!.mesh !== undefined && (nodes[child]!.children === undefined || Array.isArray(nodes[child]!.children) && nodes[child]!.children.length === 0), 'Ambiguous named wrapper child');
      walk(child, world, node.name); return;
    }
    if (node.mesh !== undefined) {
      const logicalName = wrappedName ?? node.name;
      check(whole(node.mesh) && j.meshes[node.mesh] && typeof logicalName === 'string' && idPattern.test(logicalName) && expectedNames.has(logicalName) && !partNames.has(logicalName) && children.length === 0, 'Invalid or duplicate named mesh');
      partNames.add(logicalName); usedMeshes.add(node.mesh);
      const mesh = j.meshes[node.mesh] as Json;
      check(mesh.primitives?.length === 1 && !mesh.weights, 'Each prop needs one static primitive');
      const p = mesh.primitives[0] as Json;
      check((p.mode ?? 4) === 4 && !p.targets && p.material === 0, 'Invalid triangle primitive');
      const attributes = p.attributes as Json;
      check(attributes && Object.keys(attributes).every(key => ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0'].includes(key)), 'Unsupported vertex attribute');
      check(j.accessors[attributes.POSITION]?.type === 'VEC3' && j.accessors[attributes.NORMAL]?.type === 'VEC3' && j.accessors[p.indices]?.type === 'SCALAR' && [5121, 5123, 5125].includes(j.accessors[p.indices]?.componentType) && !j.accessors[p.indices]?.normalized, 'Required indexed positions/normals missing');
      for (const key of [attributes.POSITION, attributes.NORMAL, p.indices]) check(j.bufferViews[j.accessors[key].bufferView]?.extensions?.EXT_meshopt_compression, 'Geometry must use compressed views');
      const positions = accessor(doc, views, attributes.POSITION), normals = accessor(doc, views, attributes.NORMAL), indices = accessor(doc, views, p.indices).flat();
      check(indices.length % 3 === 0 && normals.length === positions.length, 'Triangle or normal count mismatch');
      for (const key of Object.keys(attributes)) {
        const values = accessor(doc, views, attributes[key]);
        check(values.length === positions.length && values.every(a => a.every(Number.isFinite)), `Invalid ${key}`);
        if (key === 'COLOR_0') check(values.every(a => a.every(c => c >= 0 && c <= 1)), 'Vertex colour outside unit range');
      }
      check(normals.every(n => { const length = Math.hypot(...n); return length > 0.8 && length < 1.2; }), 'Invalid decoded normals');
      if (kind === 'kit' || binding) check(j.accessors[attributes.TEXCOORD_0]?.type === 'VEC2', 'Atlas UVs missing');
      else check(['VEC3', 'VEC4'].includes(j.accessors[attributes.COLOR_0]?.type), 'Hero vertex colours missing');
      if (binding) {
        const texture = j.materials[0].pbrMetallicRoughness.baseColorTexture, transform = texture.extensions?.KHR_texture_transform ?? {};
        const offset = transform.offset ?? [0, 0], scale = transform.scale ?? [1, 1], rotation = transform.rotation ?? 0;
        check((texture.texCoord ?? 0) === 0 && (transform.texCoord ?? 0) === 0 && finite(offset, 2) && finite(scale, 2) && scale.every(value => value > 0) && Number.isFinite(rotation), 'Invalid hero atlas UV transform');
        const c = Math.cos(rotation), s = Math.sin(rotation);
        check(accessor(doc, views, attributes.TEXCOORD_0).every(uv => {
          const x = uv[0]! * scale[0]!, y = uv[1]! * scale[1]!;
          return [offset[0]! + c * x - s * y, offset[1]! + s * x + c * y].every(value => value >= -0.001 && value <= 1.001);
        }), 'Hero atlas UVs outside image');
      }
      check(indices.every(i => whole(i) && i < positions.length), 'Index outside vertex range');
      const min: Triple = [Infinity, Infinity, Infinity], max: Triple = [-Infinity, -Infinity, -Infinity];
      for (const position of positions) {
        vector.fromArray(position).applyMatrix4(world);
        vector.toArray().forEach((value, axis) => { min[axis] = Math.min(min[axis]!, value); max[axis] = Math.max(max[axis]!, value); });
      }
      check(min.every(Number.isFinite) && max.every(Number.isFinite) && min.every((value, axis) => max[axis]! - value > 0.001 && max[axis]! - value <= 60.1), 'Invalid decoded bounds');
      check(Math.abs(min[1]) <= 0.03 && Math.abs(min[0] + max[0]) <= 0.06 && Math.abs(min[2] + max[2]) <= 0.06, 'Geometry must be centred horizontally and grounded');
      for (let i = 0; i < indices.length; i += 3) {
        const a = new Vector3().fromArray(positions[indices[i]!]!), b = new Vector3().fromArray(positions[indices[i + 1]!]!), c = new Vector3().fromArray(positions[indices[i + 2]!]!);
        check(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20, 'Degenerate decoded triangle');
      }
      const triangles = indices.length / 3;
      check(triangles <= (kind === 'kit' ? LIMITS.propTriangles : LIMITS.heroTriangles), `${logicalName} exceeds triangle cap`);
      parts.push({ node: logicalName, triangles, bounds: { min, max }, footprint: [min[0], min[2], max[0], max[2]] });
    }
    for (const child of children) walk(child, world);
  };
  for (const root of j.scenes[0].nodes ?? []) walk(root, new Matrix4());
  check(visited.size === nodes.length && usedMeshes.size === j.meshes.length, 'Unreachable nodes or meshes');
  check(JSON.stringify([...partNames].sort()) === JSON.stringify(wanted), 'Final named parts differ from contract');
  const rawBytes = bytes.length, compressedBytes = brotliBytes(bytes);
  check(compressedBytes <= (kind === 'kit' ? LIMITS.kitBrotli : LIMITS.heroBytes), 'Brotli size exceeds budget');
  if (kind === 'hero') check(rawBytes <= LIMITS.heroBytes, 'Hero raw bytes exceed budget');
  return { version: 1, kind, id, url: `/assets/scene-${kind === 'kit' ? 'kits' : 'heroes'}/${id}.glb`, sha256: hash(bytes), rawBytes, brotliBytes: compressedBytes, triangles: parts.reduce((sum, p) => sum + p.triangles, 0), parts: parts.sort((a, b) => a.node.localeCompare(b.node)), extensions: [...(j.extensionsUsed ?? [])].sort(), ...(atlas ? { atlas } : {}) };
}

function encodeWebp(bytes: Buffer, work: string): Buffer {
  const input = join(work, 'atlas.png'), output = join(work, 'atlas.webp');
  writeFileSync(input, bytes);
  execFileSync('cwebp', ['-quiet', '-lossless', '-z', '9', input, '-o', output], { stdio: 'pipe', timeout: 120_000 });
  return readFileSync(output);
}

export async function prepareAsset(input: Buffer, kind: Kind, id: string, binding?: HeroAtlasBinding): Promise<{ bytes: Buffer; report: AssetReport }> {
  const work = mkdtempSync(join(tmpdir(), 'allworld-scene-prepare-'));
  try {
    const doc = parseGltf(input);
    check(kind === 'kit' || binding ? doc.json.images?.length === 1 : !doc.json.images?.length, 'Unexpected raw image count');
    for (const material of doc.json.materials ?? []) {
      delete material.extensions; delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
      material.emissiveFactor = [0, 0, 0]; material.doubleSided = false; material.alphaMode = 'OPAQUE';
    }
    const images = kind === 'kit' || binding ? [{ bytes: encodeWebp(Buffer.from(viewBytes(doc, doc.json.images[0].bufferView)), work), mimeType: 'image/webp' }] : undefined;
    const normalized = rebuild(doc, { clips: {}, ...(images ? { images } : {}) });
    const bytes = gltfpack(writeGlb(normalized));
    const report = await validateAsset(bytes, kind, id, undefined, binding);
    const scripts: readonly string[] = kind === 'hero' && binding ? PHYSICAL_HERO_SOURCES : [
      'scripts/scene-factory/assets.ts', 'scripts/scene-factory/blender/shared.py', `scripts/scene-factory/blender/${kind}.py`,
      'scripts/assets/blender/common.py', 'scripts/assets/glb.ts', 'scripts/assets/prepare.ts',
      'scripts/scene-factory/blender/market_sample.py', 'scripts/scene-factory/blender/construction.py',
    ];
    report.inputs = { rawSha256: hash(input), scriptsSha256: hash(Buffer.from(scripts.map(path => `${path}:${hash(readFileSync(join(repo, path)))}`).join('\n'))), node: process.version, packer: 'gltfpack@1.3.0' };
    return { bytes, report };
  } finally { rmSync(work, { recursive: true, force: true }); }
}

function writeAtomic(path: string, bytes: Uint8Array | string): void {
  mkdirSync(dirname(path), { recursive: true });
  const staged = `${path}.stage-${process.pid}`;
  try { writeFileSync(staged, bytes); renameSync(staged, path); } finally { rmSync(staged, { force: true }); }
}

async function cli(): Promise<void> {
  const args = process.argv.slice(2), command = args.shift();
  const option = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
  if (command === '--help' || !command) {
    console.log('assets.ts validate --kind kit|hero --id ID --file FILE [--report FILE]\nassets.ts prepare --kind kit|hero --id ID --file RAW --out GLB --report JSON (--style JSON | --heroes JSON)\nassets.ts build --kind kit|hero --id ID --out GLB --report JSON (--style JSON | --heroes JSON) [--blender PATH]\nassets.ts provenance --heroes JSON\nassets.ts self-test');
    return;
  }
  if (command === 'self-test') { await selfTest(); return; }
  if (command === 'provenance') {
    const rows = JSON.parse(readFileSync(option('heroes') ?? fail('--heroes required'), 'utf8')) as unknown;
    check(Array.isArray(rows) && rows.length > 0, 'Hero records must be a nonempty array');
    const seen = new Set<string>();
    for (const row of rows as HeroRecord[]) { validateHeroRecord(row); check(!seen.has(row.city), 'Duplicate hero city'); seen.add(row.city); }
    console.log(`Validated ${seen.size} hero source records`); return;
  }
  const kind = option('kind') as Kind, id = option('id') ?? '';
  check((kind === 'kit' || kind === 'hero') && idPattern.test(id), '--kind kit|hero and --id required');
  const atlasBinding = async (record?: HeroRecord): Promise<HeroAtlasBinding | undefined> => {
    if (!record?.surface) { check(!option('atlas-kit'), '--atlas-kit requires a hero surface declaration'); return; }
    const kit = await validateAsset(readFileSync(option('atlas-kit') ?? fail('--atlas-kit required for a regional-atlas hero')), 'kit', record.surface.region);
    check(kit.atlas, 'Regional kit has no validated atlas');
    return { region: record.surface.region, sha256: kit.atlas!.sha256 };
  };
  if (command === 'validate') {
    let record: HeroRecord | undefined;
    if (option('heroes')) {
      check(kind === 'hero', '--heroes is only valid for a hero');
      const rows = JSON.parse(readFileSync(option('heroes')!, 'utf8'));
      check(Array.isArray(rows), 'Hero source list must be an array');
      const matches = rows.filter((row: HeroRecord) => row.city === id);
      check(matches.length === 1, 'Expected exactly one sourced hero');
      validateHeroRecord(matches[0]); record = matches[0];
    }
    const report = await validateAsset(readFileSync(option('file') ?? fail('--file required')), kind, id, undefined, await atlasBinding(record));
    if (option('report')) writeAtomic(resolve(option('report')!), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report)); return;
  }
  check(command === 'prepare' || command === 'build', `Unknown command ${command}`);
  const out = resolve(option('out') ?? fail('--out required')), reportPath = resolve(option('report') ?? fail('--report required'));
  check(out !== reportPath, 'Asset and report paths must differ');
  const work = mkdtempSync(join(tmpdir(), 'allworld-scene-build-'));
  try {
    let input = option('file'), provenance: HeroRecord | undefined, styleSha256: string | undefined, rawReceipt: string | undefined;
    const extra: string[] = [];
    if (kind === 'kit') {
      check((REGIONS as readonly string[]).includes(id), 'Unknown region');
      const style = resolve(option('style') ?? fail('--style required for a sourced regional palette and roof form'));
      const styleBytes = readFileSync(style); styleSha256 = hash(styleBytes);
      const styleData = JSON.parse(styleBytes.toString('utf8'));
      check(styleData.id === id && Array.isArray(styleData.sourceUrls) && styleData.sourceUrls.length > 0 && styleData.sourceUrls.every((url: unknown) => typeof url === 'string' && url.startsWith('https://')), 'Region style needs matching id and sourceUrls');
      extra.push('--region', id, '--style', style);
    } else {
      const rows = JSON.parse(readFileSync(option('heroes') ?? fail('--heroes required'), 'utf8')) as HeroRecord[];
      check(Array.isArray(rows), 'Hero source list must be an array');
      const matching = rows.filter(row => row.city === id);
      check(matching.length === 1, 'Expected exactly one sourced hero for this city');
      validateHeroRecord(matching[0]); provenance = matching[0];
      const recordFile = join(work, 'hero.json'); writeFileSync(recordFile, JSON.stringify(provenance)); extra.push('--record', recordFile);
      if (provenance.surface) {
        const canonicalRows = JSON.parse(readFileSync(join(repo, 'scripts/scene-factory/heroes.json'), 'utf8')) as HeroRecord[];
        const canonical = canonicalRows.filter(row => row.city === id);
        check(canonical.length === 1 && isDeepStrictEqual(provenance, canonical[0]), 'Regional-atlas provenance must exactly match the canonical hero record');
        const style = resolve(option('style') ?? fail('--style required for a regional-atlas hero'));
        const styleBytes = readFileSync(style), durableStyle = readFileSync(join(repo, `scripts/scene-factory/styles/${provenance.surface.region}.json`));
        check(styleBytes.equals(durableStyle), 'Hero style must exactly match its durable surface region');
        styleSha256 = hash(styleBytes);
        rawReceipt = join(work, 'physical-hero-receipt.json');
        extra.push('--style', style, '--region', provenance.surface.region,
          '--profile', id === 'accra' ? 'accra-v5-exact' : 'physical-v1', '--receipt', rawReceipt);
      }
    }
    const binding = await atlasBinding(provenance);
    if (command === 'build') {
      const blender = option('blender') ?? process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';
      check(existsSync(blender), 'Set --blender to an installed binary');
      input = join(work, 'raw.glb');
      const script = kind === 'hero' && provenance?.surface ? 'physical_hero.py' : `${kind}.py`;
      execFileSync(blender, ['--background', '--factory-startup', '--threads', '2', '--python-exit-code', '1', '--python', join(repo, 'scripts/scene-factory/blender', script), '--', '--out', input, ...extra], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 300_000 });
      if (rawReceipt) {
        const receipt = JSON.parse(readFileSync(rawReceipt, 'utf8')) as { schema?: unknown; city?: unknown; rawSha256?: unknown; record?: unknown };
        check(receipt.schema === 'physical-hero-raw-export' && receipt.city === id && receipt.rawSha256 === hash(readFileSync(input)) && isDeepStrictEqual(receipt.record, provenance), 'Physical hero raw receipt differs from the current export or canonical provenance');
      }
    }
    const prepared = await prepareAsset(readFileSync(input ?? fail('--file required')), kind, id, binding);
    if (prepared.report.inputs) { if (provenance) prepared.report.inputs.provenance = provenance; if (styleSha256) prepared.report.inputs.styleSha256 = styleSha256; }
    writeAtomic(out, prepared.bytes); writeAtomic(reportPath, `${JSON.stringify(prepared.report, null, 2)}\n`);
    console.log(JSON.stringify(prepared.report));
  } finally { rmSync(work, { recursive: true, force: true }); }
}

async function selfTest(): Promise<void> {
  const { MeshoptEncoder } = await import('meshoptimizer'); await MeshoptEncoder.ready;
  const raw = [new Float32Array([-1, 0, -1, 1, 0, -1, 0, 1, 1]), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), new Uint8Array([255, 180, 80, 255, 255, 180, 80, 255, 255, 180, 80, 255]), new Uint16Array([0, 1, 2])];
  const chunks: Buffer[] = [], views: Json[] = []; let length = 0;
  raw.forEach((array, i) => {
    const stride = i < 2 ? 12 : i === 2 ? 4 : 2, mode = i === 3 ? 'TRIANGLES' : 'ATTRIBUTES';
    const encoded = Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(array.buffer), 3, stride, mode));
    views.push({ buffer: 1, byteLength: 3 * stride, ...(i < 3 ? { byteStride: stride } : {}), extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: length, byteLength: encoded.length, byteStride: stride, count: 3, mode } } });
    const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4); encoded.copy(padded); chunks.push(padded); length += padded.length;
  });
  const json: Json = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], scene: 0, nodes: [{ name: 'fixture', mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }], bufferViews: views, accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 2, componentType: 5121, count: 3, type: 'VEC4', normalized: true }, { bufferView: 3, componentType: 5123, count: 3, type: 'SCALAR' }], extensionsUsed: ['EXT_meshopt_compression'], extensionsRequired: ['EXT_meshopt_compression'] };
  const pack = (j: Json, bin = Buffer.concat(chunks)): Buffer => {
    const b = writeGlb({ json: j, bin }), doc = glbChunks(b);
    doc.json.buffers.push({ byteLength: 128 });
    const text = Buffer.from(JSON.stringify(doc.json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(padded);
    const out = Buffer.alloc(28 + padded.length + doc.bin.length); out.writeUInt32LE(0x46546c67); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8); out.writeUInt32LE(padded.length, 12); out.writeUInt32LE(0x4e4f534a, 16); padded.copy(out, 20); out.writeUInt32LE(doc.bin.length, 20 + padded.length); out.writeUInt32LE(0x004e4942, 24 + padded.length); doc.bin.copy(out, 28 + padded.length); return out;
  };
  const good = pack(json), result = await validateAsset(good, 'hero', 'fixture');
  check(result.triangles === 1 && result.parts[0]?.bounds.max[1] === 1 && result.sha256 === hash(good), 'Positive decoded fixture failed');
  const wrapped = structuredClone(json);
  wrapped.nodes = [{ mesh: 0, translation: [-1, -0.5, -1], scale: [0.5, 0.5, 0.5] }, { name: 'fixture', children: [0], translation: [0, 1, 0], scale: [2, 2, 2], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2] }];
  wrapped.scenes[0].nodes = [1]; wrapped.extensionsUsed.push('KHR_mesh_quantization');
  const quantized = new Uint16Array([0, 0, 0, 0, 4, 0, 0, 0, 2, 2, 4, 0]);
  const quantizedBytes = Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(quantized.buffer), 3, 8, 'ATTRIBUTES'));
  const quantizedChunk = Buffer.alloc(Math.ceil(quantizedBytes.length / 4) * 4); quantizedBytes.copy(quantizedChunk);
  const wrappedChunks = [quantizedChunk, ...chunks.slice(1)];
  let offset = 0;
  wrapped.bufferViews.forEach((view: Json, i: number) => { view.extensions.EXT_meshopt_compression.byteOffset = offset; offset += wrappedChunks[i]!.length; });
  wrapped.bufferViews[0].byteLength = 24; wrapped.bufferViews[0].byteStride = 8;
  Object.assign(wrapped.bufferViews[0].extensions.EXT_meshopt_compression, { byteLength: quantizedBytes.length, byteStride: 8 });
  wrapped.accessors[0].componentType = 5123;
  const wrappedBin = Buffer.concat(wrappedChunks), wrappedBytes = pack(wrapped, wrappedBin);
  const wholeHash = hash(wrappedBytes), binHash = hash(glbChunks(wrappedBytes).bin);
  const wrapperReport = await validateAsset(wrappedBytes, 'hero', 'fixture');
  check(wrapperReport.parts[0]?.node === 'fixture' && wrapperReport.triangles === 1, 'Logical wrapper identity failed');
  check(wrapperReport.parts[0]!.bounds.min.every((v, i) => Math.abs(v - [-2, 0, -2][i]!) < 1e-8) && wrapperReport.parts[0]!.bounds.max.every((v, i) => Math.abs(v - [2, 2, 2][i]!) < 1e-8), 'Wrapper and child world transforms were not both retained');
  check(hash(wrappedBytes) === wholeHash && hash(glbChunks(wrappedBytes).bin) === binHash, 'Validation changed packed bytes or BIN payload');
  const invalidWrappers: Array<(j: Json) => void> = [
    j => { j.nodes.push(structuredClone(j.nodes[0])); j.nodes[1].children = [0, 2]; },
    j => { j.nodes.push({ name: 'fixture', children: [3] }, structuredClone(j.nodes[0])); j.scenes[0].nodes = [1, 2]; },
    j => { j.scenes[0].nodes = [1, 1]; },
    j => { j.nodes.push({ name: 'fixture', children: [0] }); j.scenes[0].nodes = [1, 2]; },
    j => { j.nodes[0].children = [1]; },
    j => { j.nodes = [j.nodes[0]]; j.scenes[0].nodes = [0]; },
    j => { j.nodes[0].name = 'fixture'; },
    j => { j.nodes[0].name = 'conflict'; },
    j => { j.nodes[1].name = 'other'; },
    j => { j.nodes[1].children = []; },
    j => { delete j.nodes[0].mesh; j.nodes[0].name = 'fixture'; j.nodes[0].children = [2]; j.nodes.push({ mesh: 0 }); },
    j => { j.nodes[1].children = [99]; },
  ];
  let wrapperFailures = 0;
  for (const mutate of invalidWrappers) { const bad = structuredClone(wrapped); mutate(bad); try { await validateAsset(pack(bad, wrappedBin), 'hero', 'fixture'); } catch { wrapperFailures++; } }
  check(wrapperFailures === invalidWrappers.length, 'Ambiguous wrapper hierarchy escaped validation');
  let missingPartRefused = false; try { await validateAsset(wrappedBytes, 'hero', 'fixture', ['fixture', 'missing']); } catch { missingPartRefused = true; }
  check(missingPartRefused, 'Missing expected logical part escaped validation');
  let refused = 0;
  const badCases: Array<(j: Json) => void> = [j => { j.nodes[0].name = 'other'; }, j => { j.nodes[0].children = [0]; }, j => { j.bufferViews[0].extensions.EXT_meshopt_compression.count = 999999; }, j => { j.nodes[0].translation = [0, 4, 0]; }, j => { j.meshes[0].primitives[0].mode = 1; }, j => { j.extensionsUsed.push('KHR_draco_mesh_compression'); }, j => { j.accessors[3].count = 9999; }, j => { j.materials[0].doubleSided = true; }, j => { j.animations = [{}]; }, j => { delete j.meshes[0].primitives[0].attributes.COLOR_0; }];
  for (const change of badCases) {
    const bad = structuredClone(json); change(bad);
    try { await validateAsset(pack(bad), 'hero', 'fixture'); } catch { refused++; }
  }
  check(refused === badCases.length, 'Malformed GLB escaped validation');
  const broken = Buffer.from(good); broken[broken.length - chunks.reduce((n, b) => n + b.length, 0)] = 0;
  let decodeRefused = false; try { await validateAsset(broken, 'hero', 'fixture'); } catch { decodeRefused = true; }
  check(decodeRefused, 'Invalid Meshopt payload escaped validation');
  let sourceRefused = false; try { validateHeroRecord({ city: 'unknown' }); } catch { sourceRefused = true; }
  check(sourceRefused, 'Incomplete hero provenance escaped validation');
  const source: HeroRecord = { city: 'fixture', country: 'fr', name: 'Synthetic fixture', category: 'building', builtYear: 1889, sourceUrls: ['https://example.org/fixture'], sourceRef: 'synthetic-fixture', sourceLicence: 'synthetic factual reference', accessed: '2026-10-17', geometryLicence: 'AGPL-3.0-or-later', generator: 'lattice-tower', parameters: { width: 2, depth: 2, height: 4, seed: 1, palette: ['#ffffff', '#eeeeee', '#dddddd', '#cccccc'] }, evidence: 'Synthetic validation fixture only' };
  validateHeroRecord(source);
  const invalidSources: Array<(r: HeroRecord) => void> = [r => { r.builtYear = 1950; }, r => { delete r.builtYear; }, r => { r.category = 'unknown' as HeroRecord['category']; }, r => { r.category = 'natural-feature'; }, r => { r.sourceUrls = []; }, r => { r.parameters.width = Infinity; }, r => { r.geometryLicence = 'unknown' as HeroRecord['geometryLicence']; }];
  let sourceFailures = 0;
  for (const mutate of invalidSources) { const row = structuredClone(source); mutate(row); try { validateHeroRecord(row); } catch { sourceFailures++; } }
  check(sourceFailures === invalidSources.length, 'Invalid source record escaped validation');
  console.log(`Synthetic validation passed: direct and quantized-wrapper geometry with unchanged packed/BIN hashes, ${wrapperFailures + 1} hierarchy refusals, ${refused} malformed documents, corrupt compression, ${sourceFailures + 1} invalid provenance records; no asset files written.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
