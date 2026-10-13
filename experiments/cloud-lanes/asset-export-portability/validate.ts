import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import validator from 'gltf-validator';
import { createGltfSource } from '../../../src/scene/models/gltf-source.ts';
import type { Kit } from '../../../src/scene/kit.ts';

export const lane = fileURLToPath(new URL('.', import.meta.url));
export const spec = JSON.parse(readFileSync(join(lane, 'fixture.json'), 'utf8'));
export const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const round = (v: number) => +v.toFixed(6);
export const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const vec = (v: THREE.Vector3) => v.toArray().map(round);
export function near(actual: number[], expected: number[], tolerance: number, label: string) {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((v, i) => assert.ok(Number.isFinite(v) && Math.abs(v - expected[i]) <= tolerance, `${label}[${i}]: ${v} vs ${expected[i]}`));
}

// This is deliberately a static route guard. The production adapter itself does not reject skins.
export function staticContract(json: any) {
  assert.equal(json.asset.version, '2.0');
  assert.ok(!json.skins?.length && !json.animations?.length, 'static route refuses skin/animation');
  for (const node of json.nodes ?? []) assert.equal(node.skin, undefined, 'static route refuses skin nodes');
  for (const mesh of json.meshes ?? []) for (const p of mesh.primitives) {
    assert.ok(!p.targets?.length && p.attributes.JOINTS_0 === undefined && p.attributes.WEIGHTS_0 === undefined, 'static route refuses morphs/joints/weights');
    assert.ok(p.attributes.COLOR_0 !== undefined, 'linear COLOR_0 required');
    assert.equal(p.mode ?? 4, 4, 'triangles only');
  }
  const allowed = new Set(['KHR_mesh_quantization', 'EXT_meshopt_compression']);
  for (const extension of json.extensionsRequired ?? []) assert.ok(allowed.has(extension), `unsupported required extension ${extension}`);
  assert.ok(!JSON.stringify(json).includes('KHR_draco_mesh_compression'), 'no Draco');
  for (const buffer of json.buffers ?? []) assert.equal(buffer.uri, undefined, 'self-contained buffers');
  assert.equal(json.images?.length ?? 0, 0, 'fixture has no images; texture portability is separate');
}

export function readGlb(bytes: Buffer) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB length');
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'JSON first');
  const length = bytes.readUInt32LE(12);
  assert.ok(length > 0 && length % 4 === 0 && 20 + length <= bytes.length, 'JSON bounds');
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  staticContract(json);
  return json;
}

export async function open(bytes: Buffer) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

function bounds(positions: ArrayLike<number>) {
  const box = new THREE.Box3();
  for (let i = 0; i < positions.length; i += 3) box.expandByPoint(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
  return { min: vec(box.min), max: vec(box.max) };
}

export function assertReceipt(receipt: any, tier: string) {
  assert.equal(receipt.meshes, 1, 'one mesh');
  assert.equal(receipt.triangles, spec.lod[tier].triangles, 'LOD triangle count');
  assert.ok(receipt.triangles <= spec.limits.triangles);
  for (const key of ['min', 'max']) near(receipt.bounds[key], spec.bounds[key], spec.tolerances.positionMeters, `meters ${key}`);
  near(receipt.rootPosition, [0, 0, 0], 1e-7, 'ground-center pivot');
  for (const [name, expected] of Object.entries(spec.anchors)) near(receipt.anchors[name], expected as number[], spec.tolerances.positionMeters, name);
  assert.equal(receipt.palette.length, spec.srgbPalette.length, 'all original swatches');
  for (const color of receipt.palette) assert.ok(spec.srgbPalette.some((srgb: number[]) => srgb.map(linear).every((v, i) => Math.abs(v - color[i]) <= spec.tolerances.linearColor)), `linear palette ${color}`);
  near(receipt.pbr.baseColorFactor, spec.pbr.baseColorFactor, spec.tolerances.material, 'PBR base factor');
  near([receipt.pbr.metallicFactor, receipt.pbr.roughnessFactor], [spec.pbr.metallicFactor, spec.pbr.roughnessFactor], spec.tolerances.material, 'PBR factors');
  assert.equal(receipt.pbr.alphaMode, 'OPAQUE');
  assert.equal(receipt.pbr.doubleSided, false);
  assert.ok(receipt.normalMaxLengthError < 0.015, 'valid normals after quantization');
  assert.ok(receipt.minTriangleArea > 1e-9, 'no collapsed triangles');
  assert.ok(receipt.signedVolume > 0, 'outward winding');
}

export async function inspect(path: string, tier: string) {
  const bytes = readFileSync(path), json = readGlb(bytes);
  assert.ok(bytes.length <= spec.limits.rawGlbBytes, 'bounded file');
  const gltf = await open(bytes);
  gltf.scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  gltf.scene.traverse(object => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
  const mesh = meshes[0], material = mesh.material as THREE.MeshStandardMaterial;
  const geometry = mesh.geometry, position = geometry.getAttribute('position'), colors = geometry.getAttribute('color'), normals = geometry.getAttribute('normal');
  const points: THREE.Vector3[] = [], palette = new Map<string, number[]>();
  let normalMaxLengthError = 0;
  for (let i = 0; i < position.count; i++) {
    points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    const color = [colors.getX(i), colors.getY(i), colors.getZ(i)].map(round);
    palette.set(color.join(','), color);
    if (colors.itemSize === 4) assert.equal(colors.getW(i), 1, 'opaque color alpha');
    normalMaxLengthError = Math.max(normalMaxLengthError, Math.abs(new THREE.Vector3().fromBufferAttribute(normals, i).length() - 1));
  }
  let minTriangleArea = Infinity, signedVolume = 0;
  const index = geometry.index!;
  for (let i = 0; i < index.count; i += 3) {
    const a = points[index.getX(i)], b = points[index.getX(i + 1)], c = points[index.getX(i + 2)];
    minTriangleArea = Math.min(minTriangleArea, new THREE.Triangle(a, b, c).getArea());
    signedVolume += a.dot(b.clone().cross(c)) / 6;
  }
  const anchors = Object.fromEntries(Object.keys(spec.anchors).map(name => [name, vec(gltf.scene.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()))]));
  const imported = {
    meshes: meshes.length, vertices: position.count, triangles: index.count / 3,
    bounds: bounds(points.flatMap(p => p.toArray())),
    rootPosition: vec(gltf.scene.getObjectByName(spec.id)!.getWorldPosition(new THREE.Vector3())),
    anchors, palette: [...palette.values()].sort((a, b) => a[0] - b[0]),
    pbr: {baseColorFactor: [...material.color.toArray().map(round), material.opacity], metallicFactor: round(material.metalness), roughnessFactor: round(material.roughness), alphaMode: material.transparent ? 'BLEND' : 'OPAQUE', doubleSided: material.side === THREE.DoubleSide},
    normalMaxLengthError: round(normalMaxLengthError), minTriangleArea: round(minTriangleArea), signedVolume: round(signedVolume),
  };
  assertReceipt(imported, tier);
  geometry.dispose(); material.dispose();
  const source = createGltfSource({ THREE } as Kit, { urls: {}, atlasOf: () => '', open: () => open(bytes) });
  const data = await source.load(tier);
  const staticBounds = bounds(data.parts.flatMap(p => [...p.position]));
  assert.equal(data.triangles, imported.triangles);
  for (const key of ['min', 'max'] as const) near(staticBounds[key], imported.bounds[key], 1e-6, 'static baked bounds');
  for (const name of Object.keys(spec.anchors)) near(data.anchors[name], imported.anchors[name], 1e-6, 'static anchors');
  const part = data.parts[0];
  for (let i = 0; i < part.color!.length; i += 3) assert.ok(imported.palette.some(color => color.every((c, k) => Math.abs(c - part.color![i + k]) < 1e-6)), 'static colors retained');
  assert.ok(!('material' in part) && !('roughness' in part) && !('metalness' in part), 'current adapter has no PBR factors');
  source.dispose?.();
  return { sha256: sha(bytes), bytes: bytes.length, brotliBytes: brotliCompressSync(bytes).length, requiredExtensions: json.extensionsRequired ?? [], imported, staticImport: { triangles: data.triangles, bounds: staticBounds, anchors: Object.fromEntries(Object.entries(data.anchors).map(([name, v]) => [name, v.map(round)])), pbrPreserved: false, reason: 'ModelPart omits material factors; scene-models.ts chooses roughness=0.92, metalness=0' } };
}

export async function validateAll(artifactDir = join(lane, 'artifacts')) {
  const result: Record<string, any> = {};
  for (const tier of ['near', 'far']) for (const packed of [false, true]) {
    const name = `beacon-${tier}${packed ? '-meshopt' : ''}.glb`;
    const path = join(artifactDir, name);
    const receipt = await inspect(path, tier);
    const report = await validator.validateBytes(new Uint8Array(readFileSync(path)), { uri: name, maxIssues: 100, externalResourceFunction: () => Promise.reject(new Error('external resource refused')) });
    // Khronos does not decode Meshopt; raw GLBs receive full validation, packed GLBs
    // receive structural validation plus real Three/Meshopt decoding and the same invariants.
    assert.equal(report.issues.numErrors, 0, `${name}: ${JSON.stringify(report.issues)}`);
    assert.equal(report.issues.numWarnings, 0, name);
    assert.equal(report.issues.truncated, false, name);
    const doc = readGlb(readFileSync(path));
    for (const issue of report.issues.messages) {
      const nodeIndex = /^\/nodes\/(\d+)$/.exec(issue.pointer)?.[1];
      const namedAnchor = issue.code === 'NODE_EMPTY' && nodeIndex !== undefined && Object.hasOwn(spec.anchors, doc.nodes[+nodeIndex].name);
      const meshoptNotDecoded = packed && issue.code === 'UNSUPPORTED_EXTENSION' && issue.message.includes('EXT_meshopt_compression');
      const meshoptBuffer = packed && issue.code === 'UNUSED_OBJECT' && issue.pointer === '/buffers/0' && doc.bufferViews.every((v: any) => v.buffer !== 0 && v.extensions?.EXT_meshopt_compression?.buffer === 0);
      assert.ok(issue.severity === 2 && (namedAnchor || meshoptNotDecoded || meshoptBuffer), `${name}: unexpected issue ${JSON.stringify(issue)}`);
    }
    result[name] = { ...receipt, validator: { version: report.validatorVersion, issues: report.issues, scope: packed ? 'structural only; Meshopt decoded separately by Three' : 'full uncompressed validation' } };
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ? resolve(process.argv[2]) : join(lane, 'artifacts');
  const receipts = await validateAll(dir);
  if (process.argv.includes('--write-golden')) {
    writeFileSync(join(lane, 'golden-import.json'), JSON.stringify(receipts, null, 2) + '\n');
  } else {
    assert.deepEqual(receipts, JSON.parse(readFileSync(join(lane, 'golden-import.json'), 'utf8')), 'golden import receipt must match; never silently update it');
  }
  mkdirSync(join(lane, 'receipts'), { recursive: true });
  writeFileSync(join(lane, 'receipts', 'validation.json'), JSON.stringify(receipts, null, 2) + '\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(receipts).map(([name, r]) => [name, { bytes: r.bytes, triangles: r.imported.triangles, errors: r.validator.issues.numErrors, warnings: r.validator.issues.numWarnings, pbrPreservedByStaticAdapter: false }])), null, 2));
}
