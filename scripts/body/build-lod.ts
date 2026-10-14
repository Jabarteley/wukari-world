// npm run body:lod
//
// The near crowd's level of detail for the two shipped bodies (src/scene/street-life/near.ts draws up to a dozen people close to the
// camera with the same skinned body the player wears). A body is 9,002 triangles; a crowd of them is not affordable on a phone. This
// writes, for each body, ONE simplified index buffer over the body's own vertices:
//
//   src/scene/body/assets/base-body-<male|female>-lod.bin   little-endian Uint16 triangle indices into the shipped GLB's vertices
//   src/scene/body/crowd-lod.ts                              what was made, from which body file (its manifest sha), and how far off
//
// Because the indices point at the shipped vertices, everything a vertex carries stays exactly as it is: skin weights, UVs (the
// painted face), the clothing regions (COLOR_0) and the wardrobe's region masks. Nothing else is shipped: no second mesh, no texture.
// The simplifier is meshoptimizer's (MIT, installed with @types/three; only this script uses it, never the game), with the UVs and the
// clothing regions weighted so seams and region edges hold, and the open borders locked.
//
// Run it again whenever scripts/body/build-body.ts changes a body: src/scene/body/crowd-lod.test.ts fails while the sha differs.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** The share of the body's triangles the crowd keeps, and the error the simplifier may reach (relative to the body's size). */
export const LOD_RATIO = 0.27, LOD_ERROR = 0.02;

interface View { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; extensions?: { EXT_meshopt_compression?: { byteOffset?: number; byteLength: number; byteStride: number; count: number; mode: 'ATTRIBUTES' | 'TRIANGLES' | 'INDICES'; filter?: 'NONE' | 'OCTAHEDRAL' | 'QUATERNION' | 'EXPONENTIAL' } } }
interface Glb { accessors: { bufferView: number; count: number; componentType: number; type: string }[]; bufferViews: View[]; meshes: { primitives: { attributes: Record<string, number>; indices: number }[] }[] }

function readGlb(bytes: Buffer): { json: Glb; bin: Buffer } {
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('not a binary glTF');
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8')) as Glb;
  const start = 20 + length;
  return { json, bin: bytes.subarray(start + 8, start + 8 + bytes.readUInt32LE(start)) };
}

/** One buffer view, decompressed (every view of the shipped bodies is meshopt-compressed). */
function view(glb: { json: Glb; bin: Buffer }, index: number): { data: Uint8Array; stride: number } {
  const meshopt = glb.json.bufferViews[index]?.extensions?.EXT_meshopt_compression;
  if (!meshopt) throw new Error(`buffer view ${index} is not meshopt-compressed`);
  const data = new Uint8Array(meshopt.count * meshopt.byteStride);
  const offset = meshopt.byteOffset ?? 0;
  MeshoptDecoder.decodeGltfBuffer(data, meshopt.count, meshopt.byteStride, glb.bin.subarray(offset, offset + meshopt.byteLength), meshopt.mode, meshopt.filter);
  return { data, stride: meshopt.byteStride };
}

export interface LodFacts { source: string; vertices: number; triangles: number; bytes: number; sha: string; error: number }

export function simplifyBody(bytes: Buffer): { indices: Uint16Array; facts: Omit<LodFacts, 'bytes' | 'sha'> } {
  const glb = readGlb(bytes), primitive = glb.json.meshes[0]!.primitives[0]!;
  const position = glb.json.accessors[primitive.attributes.POSITION!]!, uv = glb.json.accessors[primitive.attributes.TEXCOORD_0!]!, colour = glb.json.accessors[primitive.attributes.COLOR_0!]!;
  const index = glb.json.accessors[primitive.indices]!;
  // KHR_mesh_quantization: unsigned shorts for positions and UVs, bytes for the region colours. The simplifier only needs them consistent.
  if (position.componentType !== 5123 || uv.componentType !== 5123 || colour.componentType !== 5121 || index.componentType !== 5123) throw new Error('unexpected body layout: run build-body.ts first');
  const p = view(glb, position.bufferView), t = view(glb, uv.bufferView), c = view(glb, colour.bufferView), i = view(glb, index.bufferView);
  const count = position.count, pv = new DataView(p.data.buffer), tv = new DataView(t.data.buffer);
  const positions = new Float32Array(count * 3), attributes = new Float32Array(count * 6);
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) positions[v * 3 + k] = pv.getUint16(v * p.stride + k * 2, true);
    attributes[v * 6] = tv.getUint16(v * t.stride, true) / 65535;
    attributes[v * 6 + 1] = tv.getUint16(v * t.stride + 2, true) / 65535;
    for (let k = 0; k < 4; k++) attributes[v * 6 + 2 + k] = c.data[v * c.stride + k]! / 255;
  }
  const source = new Uint32Array(new Uint16Array(i.data.buffer, 0, index.count));
  const target = Math.floor((source.length * LOD_RATIO) / 3) * 3;
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(source, positions, 3, attributes, 6, [0.5, 0.5, 0.35, 0.35, 0.35, 0.35], null, target, LOD_ERROR, ['LockBorder']);
  return { indices: Uint16Array.from(simplified), facts: { source: '', vertices: count, triangles: simplified.length / 3, error: Math.round(error * 1e5) / 1e5 } };
}

const source = (bytes: Buffer): number => { const glb = readGlb(bytes); return glb.json.accessors[glb.json.meshes[0]!.primitives[0]!.indices]!.count / 3; };

async function main(): Promise<void> {
  await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
  MeshoptSimplifier.useExperimentalFeatures = true;
  const out: Record<string, LodFacts> = {};
  for (const key of ['female', 'male'] as const) {
    const bytes = readFileSync(resolve(repo, `src/scene/body/assets/base-body-${key}.glb`));
    const { indices, facts } = simplifyBody(bytes);
    const file = Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength);
    writeFileSync(resolve(repo, `src/scene/body/assets/base-body-${key}-lod.bin`), file);
    out[key] = { ...facts, source: createHash('sha256').update(bytes).digest('hex').slice(0, 10), bytes: file.length, sha: createHash('sha256').update(file).digest('hex').slice(0, 10) };
    console.log(`${key}: ${facts.triangles} triangles of ${source(bytes)}, error ${facts.error}, ${file.length} B`);
  }
  writeFileSync(resolve(repo, 'src/scene/body/crowd-lod.ts'), `// GENERATED by scripts/body/build-lod.ts (npm run body:lod). Do not edit by hand.
// The near crowd's simplified index buffers (assets/base-body-<key>-lod.bin): over the shipped body's own vertices, made from the body
// file whose sha is \`source\` (BODY_MANIFEST.bodies[key].sha). error: the simplifier's relative error (a share of the body's size).
export const CROWD_LOD = ${JSON.stringify({ ratio: LOD_RATIO, bodies: out }, null, 2)} as const;
`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
