import { BufferAttribute, BufferGeometry } from 'three';
import type * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';

const ERROR_FRACTION = 0.01;
const MISSING_VERTEX = 0xffffffff;

interface Partition {
  start: number;
  count: number;
  materialIndex: number;
}

export interface NativeStaticLodMetrics {
  requestedRatio: number;
  sourceTriangles: number;
  targetTriangles: number;
  resultTriangles: number;
  sourceVertices: number;
  resultVertices: number;
  errorLimit: number;
  maxError: number;
  reachedTarget: boolean;
  borderMode: 'locked' | 'uv-weighted';
}

let ready = false;
let pendingReady: Promise<void> | null = null;

/** Load Meshoptimizer before entering a synchronous static-capture loop. */
export function preloadNativeStaticLod(): Promise<void> {
  if (ready) return Promise.resolve();
  if (pendingReady) return pendingReady;

  MeshoptSimplifier.useExperimentalFeatures = true;
  pendingReady = MeshoptSimplifier.ready.then(() => {
    if (!MeshoptSimplifier.supported) throw new Error('Meshoptimizer is unavailable in this runtime');
    MeshoptSimplifier.useExperimentalFeatures = true;
    ready = true;
  }).catch((error: unknown) => {
    pendingReady = null;
    throw error;
  });
  return pendingReady;
}

function activeRange(source: THREE.BufferGeometry, available: number): { start: number; count: number } {
  const start = source.drawRange.start;
  const requestedCount = source.drawRange.count;
  if (!Number.isSafeInteger(start) || start < 0 || start > available) {
    throw new Error(`Native static LOD drawRange.start must be an index offset inside the geometry; received ${start}`);
  }
  if (requestedCount !== Infinity && (!Number.isSafeInteger(requestedCount) || requestedCount < 0)) {
    throw new Error(`Native static LOD drawRange.count must be a non-negative integer or Infinity; received ${requestedCount}`);
  }
  const count = requestedCount === Infinity ? available - start : Math.min(requestedCount, available - start);
  if (start % 3 !== 0 || count % 3 !== 0) {
    throw new Error(`Native static LOD draw range must contain complete triangles; received start ${start}, count ${count}`);
  }
  if (count === 0) throw new Error('Native static LOD cannot simplify an empty draw range');
  return { start, count };
}

function materialPartitions(source: THREE.BufferGeometry, range: { start: number; count: number }, available: number): Partition[] {
  if (source.groups.length === 0) return [{ ...range, materialIndex: 0 }];

  const rangeEnd = range.start + range.count;
  const partitions: Partition[] = [];
  for (const group of source.groups) {
    if (!Number.isSafeInteger(group.start) || !Number.isSafeInteger(group.count)
      || group.start < 0 || group.count < 0 || group.start + group.count > available
      || group.start % 3 !== 0 || group.count % 3 !== 0) {
      throw new Error(`Native static LOD encountered an unsupported material group at ${group.start}:${group.count}`);
    }
    const start = Math.max(range.start, group.start);
    const end = Math.min(rangeEnd, group.start + group.count);
    if (end > start) partitions.push({ start, count: end - start, materialIndex: group.materialIndex ?? 0 });
  }

  const ordered = [...partitions].sort((a, b) => a.start - b.start);
  let cursor = range.start;
  for (const partition of ordered) {
    if (partition.start !== cursor) {
      throw new Error('Native static LOD requires non-overlapping material groups that completely cover the active draw range');
    }
    cursor += partition.count;
  }
  if (cursor !== rangeEnd) {
    throw new Error('Native static LOD requires material groups that completely cover the active draw range');
  }
  return partitions;
}

function sourceIndices(source: THREE.BufferGeometry, vertexCount: number): Uint32Array {
  const available = source.index?.count ?? vertexCount;
  const values = new Uint32Array(available);
  if (source.index) {
    for (let i = 0; i < available; i++) {
      const value = source.index.getX(i);
      if (!Number.isSafeInteger(value) || value < 0 || value >= vertexCount) {
        throw new Error(`Native static LOD index ${i} references invalid vertex ${value}`);
      }
      values[i] = value;
    }
  } else {
    for (let i = 0; i < available; i++) values[i] = i;
  }
  return values;
}

function validateStaticAttributes(source: THREE.BufferGeometry): THREE.BufferAttribute | THREE.InterleavedBufferAttribute {
  if (source.getAttribute('skinIndex') || source.getAttribute('skinWeight')) {
    throw new Error('Native static LOD accepts posed static geometry only; remove skin attributes after baking the pose');
  }
  if (Object.values(source.morphAttributes).some((attributes) => attributes.length > 0)) {
    throw new Error('Native static LOD accepts posed static geometry only; apply and remove morph targets before simplification');
  }

  const position = source.getAttribute('position');
  if (!position || position.itemSize < 3 || position.count === 0) {
    throw new Error('Native static LOD requires a non-empty position attribute with at least three components');
  }
  for (const [name, attribute] of Object.entries(source.attributes)) {
    if (attribute.count !== position.count) {
      throw new Error(`Native static LOD attribute ${name} has ${attribute.count} vertices; expected ${position.count}`);
    }
    for (let vertex = 0; vertex < attribute.count; vertex++) {
      for (let component = 0; component < attribute.itemSize; component++) {
        if (!Number.isFinite(attribute.getComponent(vertex, component))) {
          throw new Error(`Native static LOD attribute ${name} contains a non-finite value at vertex ${vertex}`);
        }
      }
    }
  }
  return position;
}

function floatPositions(position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  const values = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex++) {
    values[vertex * 3] = position.getX(vertex);
    values[vertex * 3 + 1] = position.getY(vertex);
    values[vertex * 3 + 2] = position.getZ(vertex);
  }
  return values;
}

function scaleForPartition(positions: Float32Array, indices: Uint32Array): number {
  const partitionPositions = new Float32Array(indices.length * 3);
  for (let index = 0; index < indices.length; index++) {
    const sourceVertex = indices[index];
    if (sourceVertex === undefined) throw new Error('Native static LOD partition indices became inconsistent');
    const sourceOffset = sourceVertex * 3;
    const x = positions[sourceOffset];
    const y = positions[sourceOffset + 1];
    const z = positions[sourceOffset + 2];
    if (x === undefined || y === undefined || z === undefined) {
      throw new Error('Native static LOD partition positions became inconsistent');
    }
    partitionPositions[index * 3] = x;
    partitionPositions[index * 3 + 1] = y;
    partitionPositions[index * 3 + 2] = z;
  }
  return MeshoptSimplifier.getScale(partitionPositions, 3);
}

function simplificationAttributes(source: THREE.BufferGeometry, vertexCount: number): {
  values: Float32Array;
  stride: number;
  weights: number[];
  protectsUvSeams: boolean;
} {
  const priorities: Array<{ name: string; weight: number }> = [];
  for (const name of Object.keys(source.attributes)) {
    if (name === 'normal') priorities.push({ name, weight: 0.05 });
    else if (name === 'tangent') priorities.push({ name, weight: 0.02 });
    else if (/^uv\d*$/.test(name)) priorities.push({ name, weight: 0.02 });
    else if (/^color\d*$/.test(name)) priorities.push({ name, weight: 0.01 });
  }

  const components: Array<{
    name: string;
    attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    component: number;
    weight: number;
  }> = [];
  for (const { name, weight } of priorities) {
    const attribute = source.getAttribute(name);
    for (let component = 0; component < attribute.itemSize && components.length < 32; component++) {
      components.push({ name, attribute, component, weight });
    }
  }
  const protectsUvSeams = components.some(({ name }) => /^uv\d*$/.test(name));
  if (components.length === 0) {
    return { values: new Float32Array(vertexCount), stride: 1, weights: [], protectsUvSeams: false };
  }

  const values = new Float32Array(vertexCount * components.length);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    for (let component = 0; component < components.length; component++) {
      const selected = components[component];
      if (!selected) throw new Error('Native static LOD attribute selection became inconsistent');
      values[vertex * components.length + component] = selected.attribute.getComponent(vertex, selected.component);
    }
  }
  return { values, stride: components.length, weights: components.map(({ weight }) => weight), protectsUvSeams };
}

function isInterleaved(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): attribute is THREE.InterleavedBufferAttribute {
  return 'isInterleavedBufferAttribute' in attribute && attribute.isInterleavedBufferAttribute === true;
}

function compactAttribute(
  source: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  remap: Uint32Array,
  vertexCount: number,
): THREE.BufferAttribute {
  const SourceArray = source.array.constructor as unknown as { new(length: number): THREE.TypedArray };
  const values = new SourceArray(vertexCount * source.itemSize);
  const interleaved = isInterleaved(source);
  const sourceStride = interleaved ? source.data.stride : source.itemSize;
  const sourceOffset = interleaved ? source.offset : 0;

  for (let oldVertex = 0; oldVertex < remap.length; oldVertex++) {
    const newVertex = remap[oldVertex];
    if (newVertex === undefined || newVertex === MISSING_VERTEX) continue;
    for (let component = 0; component < source.itemSize; component++) {
      const value = source.array[oldVertex * sourceStride + sourceOffset + component];
      if (value === undefined) throw new Error('Native static LOD attribute storage became inconsistent');
      values[newVertex * source.itemSize + component] = value;
    }
  }

  let result: THREE.BufferAttribute;
  if (interleaved) {
    result = new BufferAttribute(values, source.itemSize, source.normalized);
    result.usage = source.data.usage;
  } else {
    const Attribute = source.constructor as unknown as {
      new(array: THREE.TypedArray, itemSize: number, normalized?: boolean): THREE.BufferAttribute;
    };
    result = new Attribute(values, source.itemSize, source.normalized);
    result.usage = source.usage;
    result.gpuType = source.gpuType;
  }
  result.name = source.name;
  return result;
}

/**
 * Simplify a posed static body or garment without touching the animated source.
 * Call preloadNativeStaticLod() before entering the synchronous capture path.
 */
export function simplifyNativeStaticGeometry(source: THREE.BufferGeometry, ratio: number): THREE.BufferGeometry {
  if (!ready) throw new Error('Native static LOD is not ready; await preloadNativeStaticLod() before synchronous capture');
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) {
    throw new Error(`Native static LOD ratio must be finite and inside (0, 1]; received ${ratio}`);
  }
  MeshoptSimplifier.useExperimentalFeatures = true;

  const position = validateStaticAttributes(source);
  const indices = sourceIndices(source, position.count);
  const range = activeRange(source, indices.length);
  const partitions = materialPartitions(source, range, indices.length);
  const positions = floatPositions(position);
  const attributes = simplificationAttributes(source, position.count);
  const simplifiedPartitions: Array<{
    indices: Uint32Array;
    materialIndex: number;
    error: number;
    errorLimit: number;
    target: number;
  }> = [];

  for (const partition of partitions) {
    const partitionIndices = indices.slice(partition.start, partition.start + partition.count);
    const target = Math.max(3, Math.floor(partition.count * ratio / 3) * 3);
    const errorLimit = scaleForPartition(positions, partitionIndices) * ERROR_FRACTION;
    const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
      partitionIndices,
      positions,
      3,
      attributes.values,
      attributes.stride,
      attributes.weights,
      null,
      target,
      errorLimit,
      attributes.protectsUvSeams
        ? ['Sparse', 'ErrorAbsolute']
        : ['LockBorder', 'Sparse', 'ErrorAbsolute'],
    );
    simplifiedPartitions.push({
      indices: new Uint32Array(simplified),
      materialIndex: partition.materialIndex,
      error,
      errorLimit,
      target,
    });
  }

  const totalIndices = simplifiedPartitions.reduce((sum, partition) => sum + partition.indices.length, 0);
  const combined = new Uint32Array(totalIndices);
  let indexOffset = 0;
  for (const partition of simplifiedPartitions) {
    combined.set(partition.indices, indexOffset);
    indexOffset += partition.indices.length;
  }
  const [remap, resultVertexCount] = MeshoptSimplifier.compactMesh(combined);

  const result = new BufferGeometry();
  result.name = source.name;
  result.userData = { ...source.userData };
  for (const [name, attribute] of Object.entries(source.attributes)) {
    result.setAttribute(name, compactAttribute(attribute, remap, resultVertexCount));
  }
  result.setIndex(new BufferAttribute(
    resultVertexCount <= 0xffff ? new Uint16Array(combined) : combined,
    1,
  ));
  result.setDrawRange(0, combined.length);
  if (source.groups.length > 0) {
    let start = 0;
    for (const partition of simplifiedPartitions) {
      result.addGroup(start, partition.indices.length, partition.materialIndex);
      start += partition.indices.length;
    }
  }
  result.morphAttributes = {};
  result.morphTargetsRelative = false;
  result.computeBoundingBox();
  result.computeBoundingSphere();

  const targetIndices = simplifiedPartitions.reduce((sum, partition) => sum + partition.target, 0);
  const metrics: NativeStaticLodMetrics = {
    requestedRatio: ratio,
    sourceTriangles: range.count / 3,
    targetTriangles: targetIndices / 3,
    resultTriangles: combined.length / 3,
    sourceVertices: position.count,
    resultVertices: resultVertexCount,
    errorLimit: Math.max(...simplifiedPartitions.map((partition) => partition.errorLimit)),
    maxError: Math.max(...simplifiedPartitions.map((partition) => partition.error)),
    reachedTarget: combined.length <= targetIndices,
    borderMode: attributes.protectsUvSeams ? 'uv-weighted' : 'locked',
  };
  result.userData.nativeStaticLod = metrics;
  return result;
}
