import { createHash } from 'node:crypto';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glbChunks, writeGlb } from '../assets/glb.ts';
import type { Json } from '../assets/glb.ts';

/** World precision is 1e-6 source units; normalized precision is 1e-6 of the maximum extent. */
export const GEOMETRY_SIGNATURE_PRECISION = 1e-6;

export interface GeometrySignatures {
  version: 1;
  triangles: number;
  precision: typeof GEOMETRY_SIGNATURE_PRECISION;
  worldSha256: string;
  normalizedShapeSha256: string;
}

type Point = readonly [number, number, number];
type Triangle = readonly [Point, Point, Point];
type QuantizedPoint = readonly [number, number, number];

const TEXTURE_EXTENSIONS = new Set(['EXT_texture_webp', 'KHR_texture_transform']);

const fail = (message: string): never => { throw new Error(message); };
const check = (condition: unknown, message: string): void => { if (!condition) fail(message); };
const whole = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

function removeTextureExtensions(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) removeTextureExtensions(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'extensions' && child && typeof child === 'object' && !Array.isArray(child)) {
      for (const extension of TEXTURE_EXTENSIONS) delete (child as Record<string, unknown>)[extension];
      if (Object.keys(child).length === 0) delete (value as Record<string, unknown>)[key];
      else removeTextureExtensions(child);
    } else removeTextureExtensions(child);
  }
}

/**
 * Build a geometry-only GLB for Three's loader. The source is assumed to have
 * already passed scene-factory validateAsset, including its 2 MiB source and
 * 16 MiB decoded-view limits. This function keeps BIN data, accessors, views,
 * nodes and transforms unchanged, and removes every image-loading path.
 */
function geometryDerivative(source: Buffer): Buffer {
  const doc = glbChunks(source);
  const json = structuredClone(doc.json) as Json;
  check(json.asset?.version === '2.0', 'Geometry signature needs a glTF 2.0 asset');
  check(Array.isArray(json.buffers) && json.buffers.length > 0 && json.buffers.every((buffer: Json) => buffer.uri === undefined), 'Geometry signature refuses external buffers');
  check(!json.animations?.length && !json.skins?.length, 'Geometry signature refuses animated or skinned geometry');
  check(Array.isArray(json.nodes) && Array.isArray(json.meshes), 'Geometry signature needs scene nodes and meshes');

  for (const node of json.nodes as Json[]) {
    check(node.skin === undefined && node.weights === undefined, 'Geometry signature refuses node deformation');
  }
  for (const mesh of json.meshes as Json[]) {
    check(mesh.weights === undefined && Array.isArray(mesh.primitives) && mesh.primitives.length > 0, 'Geometry signature refuses malformed or deformed meshes');
    for (const primitive of mesh.primitives as Json[]) {
      check((primitive.mode ?? 4) === 4, 'Geometry signature supports triangle primitives only');
      check(whole(primitive.indices), 'Geometry signature requires indexed triangles');
      check(primitive.targets === undefined, 'Geometry signature refuses morph targets');
      check(primitive.attributes && whole(primitive.attributes.POSITION), 'Geometry signature requires positions');
      check(primitive.attributes.JOINTS_0 === undefined && primitive.attributes.WEIGHTS_0 === undefined, 'Geometry signature refuses vertex deformation');
      delete primitive.material;
    }
  }
  for (const image of json.images ?? []) check(image.uri === undefined, 'Geometry signature refuses external images');

  delete json.images;
  delete json.textures;
  delete json.samplers;
  delete json.materials;
  removeTextureExtensions(json);
  for (const key of ['extensionsUsed', 'extensionsRequired'] as const) {
    if (!Array.isArray(json[key])) continue;
    json[key] = (json[key] as string[]).filter(extension => !TEXTURE_EXTENSIONS.has(extension));
    if ((json[key] as string[]).length === 0) delete json[key];
  }
  return writeGlb({ json, bin: doc.bin });
}

function finitePoint(position: Vector3, matrix: Matrix4): Point {
  position.applyMatrix4(matrix);
  const point: Point = [position.x, position.y, position.z];
  check(point.every(Number.isFinite), 'Geometry signature refuses non-finite world positions');
  return point;
}

async function worldTriangles(source: Buffer): Promise<Triangle[]> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const derivative = geometryDerivative(source);
  const data = Uint8Array.from(derivative).buffer;
  const gltf = await loader.parseAsync(data, '');
  gltf.scene.updateMatrixWorld(true);
  const triangles: Triangle[] = [];

  gltf.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    check(!geometry.morphAttributes.position?.length, 'Geometry signature refuses decoded morph targets');
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex();
    if (positions === undefined || positions.itemSize !== 3) fail('Geometry signature requires decoded VEC3 positions');
    if (indices === null || indices.count % 3 !== 0) fail('Geometry signature requires decoded indexed triangles');
    check(object.matrixWorld.elements.every(Number.isFinite), 'Geometry signature refuses non-finite world transforms');
    for (let offset = 0; offset < indices.count; offset += 3) {
      const corners: Point[] = [];
      for (let corner = 0; corner < 3; corner++) {
        const index = indices.getX(offset + corner);
        check(whole(index) && index < positions.count, 'Geometry signature found an out-of-range index');
        corners.push(finitePoint(new Vector3().fromBufferAttribute(positions, index), object.matrixWorld));
      }
      triangles.push([corners[0]!, corners[1]!, corners[2]!]);
    }
  });
  check(triangles.length > 0, 'Geometry signature found no indexed triangles');
  return triangles;
}

function comparePoint(a: QuantizedPoint, b: QuantizedPoint): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function quantize(value: number): number {
  check(Number.isFinite(value), 'Geometry signature refuses non-finite coordinates');
  const result = Math.round(value / GEOMETRY_SIGNATURE_PRECISION);
  check(Number.isSafeInteger(result), 'Geometry signature coordinate exceeds canonical range');
  return Object.is(result, -0) ? 0 : result;
}

function canonicalHash(triangles: readonly Triangle[], transform: (point: Point) => Point): string {
  const rows = triangles.map(triangle => triangle
    .map(transform)
    .map(point => [quantize(point[0]), quantize(point[1]), quantize(point[2])] as const)
    .sort(comparePoint)
    .map(point => point.join(','))
    .join('|'))
    .sort();
  return createHash('sha256').update(`${rows.join('\n')}\n`).digest('hex');
}

function normalization(triangles: readonly Triangle[]): (point: Point) => Point {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const triangle of triangles) for (const point of triangle) {
    min.x = Math.min(min.x, point[0]); min.y = Math.min(min.y, point[1]); min.z = Math.min(min.z, point[2]);
    max.x = Math.max(max.x, point[0]); max.y = Math.max(max.y, point[1]); max.z = Math.max(max.z, point[2]);
  }
  check([...min.toArray(), ...max.toArray()].every(Number.isFinite), 'Geometry signature found invalid aggregate bounds');
  const centre = min.clone().add(max).multiplyScalar(0.5);
  const extent = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  check(Number.isFinite(extent) && extent > 0, 'Geometry signature cannot normalize collapsed geometry');
  return point => [(point[0] - centre.x) / extent, (point[1] - centre.y) / extent, (point[2] - centre.z) / extent];
}

/**
 * Compare validated static assets by actual decoded indexed triangle positions.
 * Equal hashes prove equality only under the documented canonicalization; they
 * do not prove that two assets are visually unique or perceptually equivalent.
 */
export async function signatureOfValidatedGeometry(source: Buffer): Promise<GeometrySignatures> {
  const triangles = await worldTriangles(source);
  return {
    version: 1,
    triangles: triangles.length,
    precision: GEOMETRY_SIGNATURE_PRECISION,
    worldSha256: canonicalHash(triangles, point => point),
    normalizedShapeSha256: canonicalHash(triangles, normalization(triangles)),
  };
}
