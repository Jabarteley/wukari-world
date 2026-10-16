// Small, dependency-free glTF 2.0 toolkit for the asset pipeline (scripts/assets/prepare.ts and budget.ts).
// Two halves:
//   - reading a prepared (meshopt-compressed) .glb without decoding it: its JSON, triangle count and embedded image sizes,
//     which is all budget.ts needs (glbJson, trianglesOf, glbImages);
//   - editing an unprepared .glb or .gltf (external .bin and images are pulled in, one binary buffer is kept): keep only
//     some animations (renamed) and meshes, scale, measure triangles and bounds in world space, garbage-collect everything
//     unreachable, and write a .glb. No sparse accessors, no compression: those make the editor refuse rather than guess.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// glTF is open-ended JSON; the pipeline only reads the fields it names, so the document is loosely typed on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>;
export interface Doc { json: Json; bin: Buffer }

const SUPPORTED_EXTENSIONS = new Set(['EXT_texture_webp', 'KHR_materials_emissive_strength', 'KHR_materials_specular', 'KHR_materials_ior', 'KHR_texture_transform', 'KHR_materials_unlit']);

const align = (b: Buffer, fill = 0): Buffer => (b.length % 4 === 0 ? b : Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]));

function uriBytes(uri: string, base: string): Buffer {
  if (uri.startsWith('data:')) return Buffer.from(uri.slice(uri.indexOf(',') + 1), uri.slice(0, uri.indexOf(',')).includes(';base64') ? 'base64' : 'utf8');
  return readFileSync(join(base, decodeURIComponent(uri)));
}

const GLB_MAGIC = 0x46546c67;
export const isGlb = (b: Buffer): boolean => b.length >= 20 && b.readUInt32LE(0) === GLB_MAGIC;

/** The two chunks of a .glb as they are (nothing decoded, no buffer resolved). */
export function glbChunks(file: Buffer): Doc {
  if (!isGlb(file)) throw new Error('not a .glb file');
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as Json;
  const binStart = 20 + jsonLength;
  const bin = binStart + 8 <= file.length ? Buffer.from(file.subarray(binStart + 8, binStart + 8 + file.readUInt32LE(binStart))) : Buffer.alloc(0);
  return { json, bin };
}
export const glbJson = (file: Buffer): Json => glbChunks(file).json;

/** Triangles the default scene draws, counting every instance of a shared mesh. Reads the JSON only, so it works on compressed files. */
export function trianglesOf(j: Json): number {
  let total = 0;
  const nodes = (j.nodes ?? []) as Json[];
  const go = (n: number, depth: number): void => {
    if (depth > 64) throw new Error('node tree too deep (a cycle?)');
    const node = nodes[n]!;
    if (node.mesh !== undefined) {
      for (const p of j.meshes[node.mesh].primitives as Json[]) {
        const mode = p.mode ?? 4;
        const count = p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count;
        total += mode === 4 ? Math.floor(count / 3) : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0;
      }
    }
    for (const c of (node.children ?? []) as number[]) go(c, depth + 1);
  };
  for (const r of (j.scenes?.[j.scene ?? 0]?.nodes ?? []) as number[]) go(r, 0);
  return total;
}

/** Pixel size of a PNG, JPEG or WebP, read from its header. */
export function imageSize(b: Buffer): [number, number] {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tag = b.toString('ascii', 12, 16);
    if (tag === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (tag === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (tag === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]!;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error('unreadable image size');
}

export interface ImageInfo { index: number; mimeType: string; width: number; height: number; bytes: number; uri?: string }
/** Images of a .glb: embedded ones are measured from their bytes; ones named by `uri` are listed for the caller to measure. */
export function glbImages(file: Buffer): ImageInfo[] {
  const { json, bin } = glbChunks(file);
  return ((json.images ?? []) as Json[]).map((img, index) => {
    if (img.uri !== undefined) return { index, mimeType: String(img.mimeType ?? ''), width: 0, height: 0, bytes: 0, uri: String(img.uri) };
    const v = (json.bufferViews as Json[])[img.bufferView]!;
    if ((v.buffer ?? 0) !== 0) throw new Error(`image ${index} is not in the .glb's own buffer`);
    const bytes = bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
    const [width, height] = imageSize(bytes);
    return { index, mimeType: String(img.mimeType ?? ''), width, height, bytes: bytes.length };
  });
}

/** Parse a .glb (bytes) or a .gltf (bytes plus the directory its files sit in) into one JSON and one buffer. */
export function parseGltf(file: Buffer, dir = '.'): Doc {
  const glb = isGlb(file) ? glbChunks(file) : undefined;
  const json: Json = glb ? glb.json : JSON.parse(file.toString('utf8')) as Json;
  // Checked before any buffer is read: a compressed file's fallback buffer has no bytes at all.
  for (const ext of [...(json.extensionsRequired ?? []), ...(json.extensionsUsed ?? [])] as string[]) {
    if (!SUPPORTED_EXTENSIONS.has(ext)) throw new Error(`glTF extension ${ext} is not supported by the asset pipeline (is the file already prepared?)`);
  }
  for (const a of (json.accessors ?? []) as Json[]) if (a.sparse) throw new Error('sparse accessors are not supported by the asset pipeline');
  const buffers: Buffer[] = [];
  ((json.buffers ?? []) as Json[]).forEach((b, i) => {
    if (glb && i === 0 && b.uri === undefined) buffers.push(glb.bin);
    else if (typeof b.uri === 'string') buffers.push(uriBytes(b.uri, dir));
    else throw new Error(`buffer ${i} has no data`);
  });
  // Merge every buffer into one and point every view at it.
  const offsets = buffers.map(() => 0);
  let total = 0;
  const parts: Buffer[] = [];
  buffers.forEach((b, i) => { offsets[i] = total; const p = align(b); parts.push(p); total += p.length; });
  for (const v of (json.bufferViews ?? []) as Json[]) { v.byteOffset = (v.byteOffset ?? 0) + (offsets[v.buffer] ?? 0); v.buffer = 0; }
  // Images that name a file become views too.
  const bin: Buffer[] = [...parts];
  for (const img of (json.images ?? []) as Json[]) {
    if (img.uri === undefined) continue;
    const bytes = uriBytes(String(img.uri), dir);
    json.bufferViews ??= [];
    (json.bufferViews as Json[]).push({ buffer: 0, byteOffset: total, byteLength: bytes.length });
    img.bufferView = json.bufferViews.length - 1;
    img.mimeType ??= /\.jpe?g$/i.test(String(img.uri)) ? 'image/jpeg' : /\.webp$/i.test(String(img.uri)) ? 'image/webp' : 'image/png';
    delete img.uri;
    const p = align(bytes); bin.push(p); total += p.length;
  }
  json.buffers = [{ byteLength: total }];
  return { json, bin: Buffer.concat(bin) };
}

export const readGltf = (path: string): Doc => parseGltf(readFileSync(path), dirname(path));

/** Serialise to a .glb. Images with a `uri` (shared atlas files) stay external. */
export function writeGlb(doc: Doc): Buffer {
  const json = { ...doc.json, buffers: doc.bin.length ? [{ byteLength: doc.bin.length }] : undefined } as Json;
  if (!doc.bin.length) delete json.bufferViews;
  const jsonBytes = align(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const bin = align(doc.bin);
  const total = 12 + 8 + jsonBytes.length + (bin.length ? 8 + bin.length : 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonBytes.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonBytes.copy(out, 20);
  if (bin.length) { const at = 20 + jsonBytes.length; out.writeUInt32LE(bin.length, at); out.writeUInt32LE(0x004e4942, at + 4); bin.copy(out, at + 8); }
  return out;
}

export const viewBytes = (doc: Doc, view: number): Buffer => { const v = (doc.json.bufferViews as Json[])[view]!; return doc.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength); };

// ---------------------------------------------------------------------------------------------------------------
// Garbage-collecting rebuild
// ---------------------------------------------------------------------------------------------------------------

export interface RebuildOptions {
  /** Keep only these animations, mapped old name -> new name. Unlisted animations are dropped. Undefined keeps all. */
  clips?: Record<string, string>;
  /** Remove every mesh and skin (an animation-only file keeps the joints). */
  dropMeshes?: boolean;
  /** Keep only the meshes on nodes with these names; the nodes stay (a weapon's hand slot keeps its place). */
  keepMeshes?: string[];
  /** Replace image bytes by index (the texture step); mimeType follows. */
  images?: { bytes: Buffer; mimeType: string; uri?: string }[];
}

/** Rebuild the document keeping only what the scene, the kept animations and the kept skins reach. */
export function rebuild(src: Doc, options: RebuildOptions = {}): Doc {
  const j = src.json;
  const nodes = (j.nodes ?? []) as Json[];
  const sceneIndex = j.scene ?? 0;
  const roots: number[] = (j.scenes?.[sceneIndex]?.nodes ?? []) as number[];
  if (options.keepMeshes) {
    const named = new Set(nodes.filter((n) => n.mesh !== undefined).map((n) => String(n.name)));
    for (const k of options.keepMeshes) if (!named.has(k)) throw new Error(`keepMeshes: no mesh node "${k}" (has: ${[...named].join(', ')})`);
  }
  const keepMesh = (n: Json): boolean => !options.dropMeshes && (options.keepMeshes === undefined || options.keepMeshes.includes(String(n.name)));
  const reach = new Set<number>();
  const walk = (n: number): void => { if (reach.has(n)) return; reach.add(n); for (const c of (nodes[n]!.children ?? []) as number[]) walk(c); };
  roots.forEach(walk);

  const keepAnimations = ((j.animations ?? []) as Json[]).filter((a) => options.clips === undefined || (a.name as string) in options.clips);
  if (options.clips) {
    for (const wanted of Object.keys(options.clips)) {
      if (!keepAnimations.some((a) => a.name === wanted)) throw new Error(`clip "${wanted}" is not in the file (has: ${((j.animations ?? []) as Json[]).map((a) => a.name).join(', ')})`);
    }
  }
  // Joints of kept skins must survive even when the scene does not reach them.
  const skinsUsed = new Set<number>();
  for (const n of reach) { const s = nodes[n]!.skin; if (s !== undefined && keepMesh(nodes[n]!)) skinsUsed.add(s); }
  for (const s of skinsUsed) for (const jn of (j.skins[s].joints as number[])) walk(jn);

  /** Old index -> new index, in first-use order. */
  const map = () => {
    const idx = new Map<number, number>(), order: number[] = [];
    return { order, add(i: number): number { let v = idx.get(i); if (v === undefined) { v = order.length; idx.set(i, v); order.push(i); } return v; } };
  };
  const nodeMap = new Map<number, number>();
  const nodeOrder = [...reach].sort((a, b) => a - b);
  nodeOrder.forEach((n, i) => nodeMap.set(n, i));
  const meshes = map(), skins = map(), accessors = map(), materials = map(), textures = map(), imgs = map(), samplers = map();

  const accessorOf = (i: number): number => accessors.add(i);
  const outNodes: Json[] = nodeOrder.map((n) => {
    const o = { ...nodes[n]! } as Json;
    if (o.children) o.children = (o.children as number[]).filter((c) => nodeMap.has(c)).map((c) => nodeMap.get(c)!);
    if (!o.children?.length) delete o.children;
    if (!keepMesh(nodes[n]!)) { delete o.mesh; delete o.skin; } else {
      if (o.mesh !== undefined) o.mesh = meshes.add(o.mesh);
      if (o.skin !== undefined) o.skin = skins.add(o.skin);
    }
    return o;
  });
  const outMeshes: Json[] = [];
  for (let k = 0; k < meshes.order.length; k++) {
    const m = structuredClone(j.meshes[meshes.order[k]!]) as Json;
    for (const p of m.primitives as Json[]) {
      for (const a of Object.keys(p.attributes)) p.attributes[a] = accessorOf(p.attributes[a]);
      if (p.indices !== undefined) p.indices = accessorOf(p.indices);
      if (p.material !== undefined) p.material = materials.add(p.material);
      for (const t of (p.targets ?? []) as Json[]) for (const a of Object.keys(t)) t[a] = accessorOf(t[a]);
    }
    outMeshes.push(m);
  }
  const outSkins: Json[] = [];
  for (let k = 0; k < skins.order.length; k++) {
    const s = structuredClone(j.skins[skins.order[k]!]) as Json;
    s.joints = (s.joints as number[]).map((x) => nodeMap.get(x)!);
    if (s.skeleton !== undefined) s.skeleton = nodeMap.get(s.skeleton) ?? undefined;
    if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = accessorOf(s.inverseBindMatrices);
    outSkins.push(s);
  }
  const outAnimations: Json[] = [];
  for (const a of keepAnimations) {
    const channels = (a.channels as Json[]).filter((c) => nodeMap.has(c.target.node));
    if (!channels.length) continue;
    const used = new Set(channels.map((c) => c.sampler as number));
    const remap = new Map<number, number>();
    const samplersOut: Json[] = [];
    for (const s of used) { remap.set(s, samplersOut.length); const sm = a.samplers[s] as Json; samplersOut.push({ ...sm, input: accessorOf(sm.input), output: accessorOf(sm.output) }); }
    outAnimations.push({ name: options.clips?.[a.name as string] ?? a.name, samplers: samplersOut, channels: channels.map((c) => ({ sampler: remap.get(c.sampler)!, target: { node: nodeMap.get(c.target.node)!, path: c.target.path } })) });
  }
  const outMaterials: Json[] = [];
  const texRef = (t: Json | undefined): void => { if (t && t.index !== undefined) t.index = textures.add(t.index); };
  for (let k = 0; k < materials.order.length; k++) {
    const m = structuredClone(j.materials[materials.order[k]!]) as Json;
    texRef(m.pbrMetallicRoughness?.baseColorTexture); texRef(m.pbrMetallicRoughness?.metallicRoughnessTexture);
    texRef(m.normalTexture); texRef(m.occlusionTexture); texRef(m.emissiveTexture);
    outMaterials.push(m);
  }
  const outTextures: Json[] = [];
  for (let k = 0; k < textures.order.length; k++) {
    const t = structuredClone(j.textures[textures.order[k]!]) as Json;
    if (t.source !== undefined) t.source = imgs.add(t.source);
    if (t.extensions?.EXT_texture_webp?.source !== undefined) t.extensions.EXT_texture_webp.source = imgs.add(t.extensions.EXT_texture_webp.source);
    if (t.sampler !== undefined) t.sampler = samplers.add(t.sampler);
    outTextures.push(t);
  }
  const outSamplers = samplers.order.map((i) => structuredClone(j.samplers[i]) as Json);
  const parts: Buffer[] = [];
  let length = 0;
  const outViews: Json[] = [];
  const copyView = (vi: number, extra: Json = {}): number => {
    const v = j.bufferViews[vi] as Json;
    const bytes = src.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
    const p = align(Buffer.from(bytes));
    const nv: Json = { buffer: 0, byteOffset: length, byteLength: v.byteLength, ...extra };
    if (v.byteStride) nv.byteStride = v.byteStride;
    if (v.target) nv.target = v.target;
    parts.push(p); length += p.length; outViews.push(nv);
    return outViews.length - 1;
  };
  const outAccessors: Json[] = [];
  const viewCache = new Map<number, number>();
  for (let k = 0; k < accessors.order.length; k++) {
    const a = structuredClone(j.accessors[accessors.order[k]!]) as Json;
    if (a.bufferView !== undefined) {
      if (!viewCache.has(a.bufferView)) viewCache.set(a.bufferView, copyView(a.bufferView));
      a.bufferView = viewCache.get(a.bufferView);
    }
    outAccessors.push(a);
  }
  const outImages: Json[] = [];
  for (let k = 0; k < imgs.order.length; k++) {
    const old = j.images[imgs.order[k]!] as Json;
    const replace = options.images?.[imgs.order[k]!];
    if (replace?.uri) { outImages.push({ uri: replace.uri, mimeType: replace.mimeType, ...(old.name ? { name: old.name } : {}) }); continue; }
    const bytes = replace?.bytes ?? viewBytes(src, old.bufferView);
    const p = align(Buffer.from(bytes));
    outViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    parts.push(p); length += p.length;
    outImages.push({ bufferView: outViews.length - 1, mimeType: replace?.mimeType ?? old.mimeType, ...(old.name ? { name: old.name } : {}) });
  }
  const out: Json = {
    asset: { version: '2.0', generator: 'allworld scripts/assets' },
    scene: 0, scenes: [{ name: j.scenes?.[sceneIndex]?.name, nodes: roots.map((r) => nodeMap.get(r)!) }],
    nodes: outNodes,
  };
  if (!out.scenes[0].name) delete out.scenes[0].name;
  for (const [key, list] of Object.entries({ meshes: outMeshes, skins: outSkins, animations: outAnimations, materials: outMaterials, textures: outTextures, images: outImages, samplers: outSamplers, accessors: outAccessors, bufferViews: outViews })) if (list.length) out[key] = list;
  const used = new Set<string>(((j.extensionsUsed ?? []) as string[]).filter((e) => e !== 'EXT_texture_webp' || options.images));
  if (options.images && outImages.length) {
    used.add('EXT_texture_webp');
    for (const t of outTextures) { const s = t.source as number; if (options.images[imgs.order[s]!]?.mimeType === 'image/webp') t.extensions = { ...t.extensions, EXT_texture_webp: { source: s } }; }
  }
  const surviving = new Set<string>();
  const scan = (v: unknown): void => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'extensions' && x && typeof x === 'object') Object.keys(x).forEach((e) => surviving.add(e)); scan(x); } };
  scan(out);
  const keptExt = [...used].filter((e) => surviving.has(e));
  if (keptExt.length) out.extensionsUsed = keptExt;
  return { json: out, bin: Buffer.concat(parts) };
}

// ---------------------------------------------------------------------------------------------------------------
// Measuring and scaling
// ---------------------------------------------------------------------------------------------------------------

type Mat = number[];
const IDENT: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: Mat, b: Mat): Mat {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!;
  return o;
}
function local(n: Json): Mat {
  if (n.matrix) return n.matrix as Mat;
  const [x, y, z, w] = (n.rotation ?? [0, 0, 0, 1]) as number[];
  const [sx, sy, sz] = (n.scale ?? [1, 1, 1]) as number[];
  const [tx, ty, tz] = (n.translation ?? [0, 0, 0]) as number[];
  return [
    (1 - 2 * (y! * y! + z! * z!)) * sx!, 2 * (x! * y! + z! * w!) * sx!, 2 * (x! * z! - y! * w!) * sx!, 0,
    2 * (x! * y! - z! * w!) * sy!, (1 - 2 * (x! * x! + z! * z!)) * sy!, 2 * (y! * z! + x! * w!) * sy!, 0,
    2 * (x! * z! + y! * w!) * sz!, 2 * (y! * z! - x! * w!) * sz!, (1 - 2 * (x! * x! + y! * y!)) * sz!, 0,
    tx!, ty!, tz!, 1,
  ];
}

/** Visit every mesh instance in the default scene with its world matrix. */
function eachInstance(doc: Doc, visit: (mesh: Json, world: Mat) => void): void {
  const j = doc.json;
  const nodes = (j.nodes ?? []) as Json[];
  const go = (n: number, parent: Mat): void => {
    const node = nodes[n]!;
    const world = mul(parent, local(node));
    if (node.mesh !== undefined) visit(j.meshes[node.mesh] as Json, world);
    for (const c of (node.children ?? []) as number[]) go(c, world);
  };
  for (const r of (j.scenes?.[j.scene ?? 0]?.nodes ?? []) as number[]) go(r, IDENT);
}

export const countTriangles = (doc: Doc): number => trianglesOf(doc.json);

export interface Bounds { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] }
/** World-space bounds of every mesh in the default scene, from the accessors' min/max boxes. Undefined with no meshes. */
export function measure(doc: Doc): Bounds | undefined {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const j = doc.json;
  eachInstance(doc, (mesh, w) => {
    for (const p of mesh.primitives as Json[]) {
      const a = j.accessors[p.attributes.POSITION] as Json;
      if (!a.min || !a.max) continue;
      for (let i = 0; i < 8; i++) {
        const v = [i & 1 ? a.max[0] : a.min[0], i & 2 ? a.max[1] : a.min[1], i & 4 ? a.max[2] : a.min[2]] as number[];
        for (let axis = 0; axis < 3; axis++) {
          const x = w[axis]! * v[0]! + w[4 + axis]! * v[1]! + w[8 + axis]! * v[2]! + w[12 + axis]!;
          if (x < min[axis]!) min[axis] = x;
          if (x > max[axis]!) max[axis] = x;
        }
      }
    }
  });
  if (!Number.isFinite(min[0]!)) return undefined;
  return { min: min as Bounds['min'], max: max as Bounds['max'], size: [max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!] };
}

/** Put the scene under one new root node that scales (and optionally turns a Z-up model upright). Animations are untouched. */
export function wrapRoot(doc: Doc, scale: number, zUp: boolean): Doc {
  if (scale === 1 && !zUp) return doc;
  const j = structuredClone(doc.json) as Json;
  const scene = j.scenes[j.scene ?? 0] as Json;
  const root: Json = { name: 'AllworldRoot', children: scene.nodes, scale: [scale, scale, scale] };
  if (zUp) root.rotation = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  j.nodes.push(root);
  scene.nodes = [j.nodes.length - 1];
  return { json: j, bin: doc.bin };
}

export const animationNames = (doc: Doc): string[] => ((doc.json.animations ?? []) as Json[]).map((a) => String(a.name));
export const meshCount = (doc: Doc): number => (doc.json.meshes ?? []).length;
