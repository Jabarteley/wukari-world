/**
 * OWNER: characters
 * The Meshoptimizer part of simplifying a posed background person (./native-static-lod.ts): typed arrays in, typed arrays out,
 * nothing from three.js, so the main thread and ./native-static-lod.worker.ts run the very same code.
 */
import { MeshoptSimplifier } from 'meshoptimizer';

const ERROR_FRACTION = 0.01;

/** What the simplifier (WebAssembly) is given for one geometry: typed arrays only, so a worker can run it on a copy. */
export interface NativeStaticLodJob {
  positions: Float32Array;
  attributes: { values: Float32Array; stride: number; weights: number[]; protectsUvSeams: boolean };
  partitions: Array<{ indices: Uint32Array; target: number }>;
}
/** What it gives back: per partition the kept indices, then the compacted index list and its vertex remap. */
export interface NativeStaticLodJobResult {
  partitions: Array<{ indices: Uint32Array; error: number; errorLimit: number }>;
  combined: Uint32Array;
  remap: Uint32Array;
  vertexCount: number;
}

/** The Meshoptimizer part of a simplification. Pure: the same job gives the same result wherever it runs. Meshoptimizer must be ready. */
export function runNativeStaticLodJob(job: NativeStaticLodJob): NativeStaticLodJobResult {
  MeshoptSimplifier.useExperimentalFeatures = true;
  const partitions = job.partitions.map(({ indices: partitionIndices, target }) => {
    const errorLimit = scaleForPartition(job.positions, partitionIndices) * ERROR_FRACTION;
    const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
      partitionIndices,
      job.positions,
      3,
      job.attributes.values,
      job.attributes.stride,
      job.attributes.weights,
      null,
      target,
      errorLimit,
      job.attributes.protectsUvSeams
        ? ['Sparse', 'ErrorAbsolute']
        : ['LockBorder', 'Sparse', 'ErrorAbsolute'],
    );
    return { indices: new Uint32Array(simplified), error, errorLimit };
  });
  const totalIndices = partitions.reduce((sum, partition) => sum + partition.indices.length, 0);
  const combined = new Uint32Array(totalIndices);
  let indexOffset = 0;
  for (const partition of partitions) {
    combined.set(partition.indices, indexOffset);
    indexOffset += partition.indices.length;
  }
  const [remap, vertexCount] = MeshoptSimplifier.compactMesh(combined);
  return { partitions, combined, remap, vertexCount };
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

