import assert from 'node:assert/strict';
import test from 'node:test';
import { MeshoptEncoder } from 'meshoptimizer';
import { glbChunks, writeGlb } from '../assets/glb.ts';
import type { Json } from '../assets/glb.ts';
import { GEOMETRY_SIGNATURE_PRECISION, signatureOfValidatedGeometry } from './geometry.ts';

type Point = readonly [number, number, number];
type Face = readonly [Point, Point, Point];

const SHAPE: readonly Face[] = [
  [[0, 0, 0], [2, 0, 0], [0, 2, 0]],
  [[0, 0, 1], [1, 0, 1], [0, 1, 1]],
];

interface FixtureOptions {
  faces?: readonly Face[];
  name?: string;
  metadata?: string;
  reverseWinding?: boolean;
  rotateIndices?: boolean;
  reversePrimitives?: boolean;
  outerTransform?: Json;
  innerTransform?: Json;
  embeddedTexture?: boolean;
}

const pad = (bytes: Buffer): Buffer => bytes.length % 4 === 0 ? bytes : Buffer.concat([bytes, Buffer.alloc(4 - bytes.length % 4)]);

function fixture(options: FixtureOptions = {}): Buffer {
  const faces = [...(options.faces ?? SHAPE)];
  if (options.reversePrimitives) faces.reverse();
  const chunks: Buffer[] = [];
  const bufferViews: Json[] = [];
  const accessors: Json[] = [];
  const primitives: Json[] = [];
  let offset = 0;
  const append = (bytes: Buffer, view: Json): number => {
    const index = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...view });
    const chunk = pad(bytes); chunks.push(chunk); offset += chunk.length;
    return index;
  };
  for (const face of faces) {
    const positionBytes = Buffer.alloc(9 * 4);
    face.flat().forEach((value, index) => positionBytes.writeFloatLE(value, index * 4));
    const indices = options.reverseWinding ? [2, 1, 0] : options.rotateIndices ? [1, 2, 0] : [0, 1, 2];
    const indexBytes = Buffer.alloc(3 * 2);
    indices.forEach((value, index) => indexBytes.writeUInt16LE(value, index * 2));
    const positionView = append(positionBytes, { byteStride: 12 });
    const indexView = append(indexBytes, {});
    const positionAccessor = accessors.push({ bufferView: positionView, componentType: 5126, count: 3, type: 'VEC3' }) - 1;
    const indexAccessor = accessors.push({ bufferView: indexView, componentType: 5123, count: 3, type: 'SCALAR' }) - 1;
    primitives.push({ attributes: { POSITION: positionAccessor }, indices: indexAccessor, material: 0 });
  }
  if (options.embeddedTexture) append(Buffer.from('not-an-image'), {});
  const meshNode = { name: options.name ?? 'mesh-name', mesh: 0, ...(options.innerTransform ?? {}) };
  const nodes: Json[] = options.outerTransform ? [{ name: 'outer-name', children: [1], ...options.outerTransform }, meshNode] : [meshNode];
  const json: Json = {
    asset: { version: '2.0', generator: options.metadata ?? 'fixture-a' },
    scene: 0,
    scenes: [{ name: options.metadata ?? 'scene-a', nodes: [0] }],
    nodes,
    meshes: [{ name: options.metadata ?? 'mesh-a', primitives }],
    materials: [{ name: options.metadata ?? 'material-a', pbrMetallicRoughness: { baseColorFactor: options.metadata === 'fixture-b' ? [0, 1, 0, 1] : [1, 0, 0, 1], ...(options.embeddedTexture ? { baseColorTexture: { index: 0, extensions: { KHR_texture_transform: { offset: [0.25, 0.25] } } } } : {}) } }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  if (options.embeddedTexture) {
    json.images = [{ bufferView: bufferViews.length - 1, mimeType: 'image/webp' }];
    json.textures = [{ extensions: { EXT_texture_webp: { source: 0 } } }];
    json.extensionsUsed = ['EXT_texture_webp', 'KHR_texture_transform'];
  }
  return writeGlb({ json, bin: Buffer.concat(chunks) });
}

function withJson(source: Buffer, mutate: (json: Json) => void): Buffer {
  const doc = glbChunks(source);
  const json = structuredClone(doc.json) as Json;
  mutate(json);
  return writeGlb({ json, bin: doc.bin });
}

async function meshoptFixture(): Promise<Buffer> {
  await MeshoptEncoder.ready;
  const positions = new Float32Array(SHAPE[0]!.flat());
  const indices = new Uint16Array([0, 1, 2]);
  const encoded = [
    Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(positions.buffer), 3, 12, 'ATTRIBUTES')),
    Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(indices.buffer), 3, 2, 'TRIANGLES')),
  ];
  let offset = 0;
  const chunks = encoded.map(bytes => { const chunk = pad(bytes); const start = offset; offset += chunk.length; return { bytes, chunk, start }; });
  const json: Json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, byteStride: 12, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: chunks[0]!.start, byteLength: chunks[0]!.bytes.length, byteStride: 12, count: 3, mode: 'ATTRIBUTES' } } },
      { buffer: 0, byteOffset: 0, byteLength: indices.byteLength, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: chunks[1]!.start, byteLength: chunks[1]!.bytes.length, byteStride: 2, count: 3, mode: 'TRIANGLES' } } },
    ],
    buffers: [{ byteLength: offset }], extensionsUsed: ['EXT_meshopt_compression'], extensionsRequired: ['EXT_meshopt_compression'],
  };
  return writeGlb({ json, bin: Buffer.concat(chunks.map(chunk => chunk.chunk)) });
}

test('canonical signatures ignore names, metadata, materials, texture bindings, primitive order, index order and winding', async () => {
  const first = await signatureOfValidatedGeometry(fixture());
  const reordered = await signatureOfValidatedGeometry(fixture({
    name: 'renamed', metadata: 'fixture-b', reversePrimitives: true, rotateIndices: true, embeddedTexture: true,
  }));
  const reversedWinding = await signatureOfValidatedGeometry(fixture({ reverseWinding: true }));
  assert.equal(first.triangles, 2);
  assert.equal(first.precision, GEOMETRY_SIGNATURE_PRECISION);
  assert.deepEqual(reordered, first);
  assert.deepEqual(reversedWinding, first);
});

test('world transforms are decoded and positive uniform global scale plus translation preserves normalized shape', async () => {
  const base = await signatureOfValidatedGeometry(fixture());
  const nested = await signatureOfValidatedGeometry(fixture({
    outerTransform: { translation: [3, 4, 5] },
    innerTransform: { rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] },
  }));
  assert.notEqual(nested.worldSha256, base.worldSha256);
  assert.notEqual(nested.normalizedShapeSha256, base.normalizedShapeSha256);

  const globallyMoved = await signatureOfValidatedGeometry(fixture({
    outerTransform: { translation: [11, -7, 23], scale: [4, 4, 4] },
  }));
  assert.notEqual(globallyMoved.worldSha256, base.worldSha256);
  assert.equal(globallyMoved.normalizedShapeSha256, base.normalizedShapeSha256);
});

test('structural vertex changes and triangle multiplicity change both signatures', async () => {
  const base = await signatureOfValidatedGeometry(fixture());
  const changedFaces: Face[] = [[SHAPE[0]![0], SHAPE[0]![1], [0, 3, 0]], SHAPE[1]!];
  const changed = await signatureOfValidatedGeometry(fixture({ faces: changedFaces }));
  const duplicated = await signatureOfValidatedGeometry(fixture({ faces: [...SHAPE, SHAPE[0]!] }));
  assert.notEqual(changed.worldSha256, base.worldSha256);
  assert.notEqual(changed.normalizedShapeSha256, base.normalizedShapeSha256);
  assert.equal(duplicated.triangles, 3);
  assert.notEqual(duplicated.worldSha256, base.worldSha256);
  assert.notEqual(duplicated.normalizedShapeSha256, base.normalizedShapeSha256);
});

test('the production Meshopt decoder yields the same triangle signature as an uncompressed fixture', async () => {
  const decoded = await signatureOfValidatedGeometry(await meshoptFixture());
  const plain = await signatureOfValidatedGeometry(fixture({ faces: [SHAPE[0]!] }));
  assert.deepEqual(decoded, plain);
});

test('unsupported, malformed, deformed and absent geometry is refused', async () => {
  const source = fixture({ faces: [SHAPE[0]!] });
  await assert.rejects(signatureOfValidatedGeometry(withJson(source, json => { delete json.meshes[0].primitives[0].indices; })), /requires indexed triangles/);
  await assert.rejects(signatureOfValidatedGeometry(withJson(source, json => { json.meshes[0].primitives[0].mode = 1; })), /triangle primitives only/);
  await assert.rejects(signatureOfValidatedGeometry(withJson(source, json => { json.meshes[0].primitives[0].targets = [{ POSITION: 0 }]; })), /morph targets/);
  await assert.rejects(signatureOfValidatedGeometry(withJson(source, json => { json.nodes[0].weights = [1]; })), /node deformation/);
  await assert.rejects(signatureOfValidatedGeometry(withJson(source, json => { json.nodes = [{ name: 'empty' }]; json.meshes = []; })), /no indexed triangles/);
});

test('non-finite decoded geometry is refused', async () => {
  const doc = glbChunks(fixture({ faces: [SHAPE[0]!] }));
  const bin = Buffer.from(doc.bin);
  bin.writeFloatLE(Number.NaN, doc.json.bufferViews[0].byteOffset ?? 0);
  await assert.rejects(signatureOfValidatedGeometry(writeGlb({ json: doc.json, bin })), /non-finite world positions/);
});
