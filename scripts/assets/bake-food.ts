// Bake the selected Kenney Food Kit prop into Allworld's static vertex-colour batch format.
//
//   node --experimental-strip-types scripts/assets/bake-food.ts \
//     --archive /tmp/allworld-kenney-food-kit.zip
//
// The raw GLB and atlas stay outside the repository. This importer is intentionally narrow: it
// rejects any change to the selected asset's one-node/one-primitive/nearest-palette contract
// instead of approximating a more general glTF material at runtime.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, inflateSync } from 'node:zlib';
import { loadGltf, readAccessor } from '../body/gltf-io.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1]! : fallback;
};

const archive = resolve(option('--archive', '/tmp/allworld-kenney-food-kit.zip'));
const output = resolve(option('--out', join(repo, 'src', 'scene', 'assets', 'kenney-food.generated.ts')));
const licenseOutput = resolve(option('--license-out', join(repo, 'src', 'scene', 'assets', 'kenney-food-LICENSE.txt')));
const MODEL_ENTRY = 'Models/GLB format/pot-stew.glb';
const TEXTURE_ENTRY = 'Models/GLB format/Textures/colormap.png';
const LICENSE_ENTRY = 'License.txt';
const MODEL_SHA256 = '311ba282a85bd722b5093f512579a168e3da949617600196b60d782c11afd6b8';
const TEXTURE_SHA256 = '75baf74d9483a0fc56ac21ceba346fbe16fc24a2a1bf0524c53e6bbe802e1153';
const LICENSE_SHA256 = '32a081c2035dd4db47d850c83244da048165f0e53d71c076b76c1afc0590bc7f';

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function fail(message: string): never {
  throw new Error(`Kenney pot-stew bake rejected: ${message}`);
}

function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} is not an object`);
  return value;
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string): void {
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${label} keys: expected ${wanted}, got ${actual}`);
}

function zipEntry(name: string): Buffer {
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  if (entries.filter((entry) => entry === name).length !== 1) fail(`archive must contain exactly one ${name}`);
  return execFileSync('unzip', ['-p', archive, name], { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 });
}

interface IndexedImage { width: number; height: number; pixels: Uint8Array; palette: Uint8Array }

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode only the exact indexed, non-interlaced PNG form used by the Food Kit atlas. */
function decodeIndexedPng(file: Buffer): IndexedImage {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!file.subarray(0, 8).equals(signature)) fail('texture is not a PNG');
  let at = 8, width = 0, height = 0, palette = Buffer.alloc(0), sawHeader = false, sawEnd = false;
  const compressed: Buffer[] = [];
  while (at < file.length) {
    if (at + 12 > file.length) fail('truncated PNG chunk');
    const length = file.readUInt32BE(at), type = file.subarray(at + 4, at + 8).toString('ascii');
    const data = file.subarray(at + 8, at + 8 + length);
    if (data.length !== length || at + 12 + length > file.length) fail(`truncated ${type} chunk`);
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) fail('invalid IHDR');
      sawHeader = true; width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      equal(data[8], 8, 'PNG bit depth'); equal(data[9], 3, 'PNG colour type');
      equal(data[10], 0, 'PNG compression'); equal(data[11], 0, 'PNG filter method'); equal(data[12], 0, 'PNG interlace');
    } else if (type === 'PLTE') {
      if (!length || length % 3 || length > 768) fail('invalid PLTE');
      palette = Buffer.from(data);
    } else if (type === 'IDAT') compressed.push(Buffer.from(data));
    else if (type === 'tRNS') fail('transparent palette entries are unsupported');
    else if (type === 'IEND') { sawEnd = true; break; }
    at += 12 + length;
  }
  if (!sawHeader || !sawEnd || !palette.length || !compressed.length) fail('PNG is missing IHDR, PLTE, IDAT or IEND');
  equal(width, 512, 'atlas width'); equal(height, 512, 'atlas height'); equal(palette.length / 3, 254, 'palette entries');
  const raw = inflateSync(Buffer.concat(compressed)), stride = width;
  equal(raw.length, height * (stride + 1), 'decoded PNG byte length');
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1), filter = raw[row]!;
    if (filter > 4) fail(`unsupported PNG filter ${filter}`);
    for (let x = 0; x < stride; x++) {
      const byte = raw[row + 1 + x]!, left = x ? pixels[y * stride + x - 1]! : 0;
      const up = y ? pixels[(y - 1) * stride + x]! : 0;
      const upperLeft = x && y ? pixels[(y - 1) * stride + x - 1]! : 0;
      pixels[y * stride + x] = filter === 0 ? byte : filter === 1 ? (byte + left) & 255
        : filter === 2 ? (byte + up) & 255 : filter === 3 ? (byte + Math.floor((left + up) / 2)) & 255
          : (byte + paeth(left, up, upperLeft)) & 255;
    }
  }
  for (const index of pixels) if (index * 3 + 2 >= palette.length) fail(`pixel references missing palette index ${index}`);
  return { width, height, pixels, palette };
}

function sample(image: IndexedImage, u: number, v: number): number {
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u >= 1 || v < 0 || v >= 1) fail(`UV outside [0,1): ${u},${v}`);
  // GLTFLoader uses flipY=false for glTF textures: v=0 samples the first (top) PNG row.
  return image.pixels[Math.floor(v * image.height) * image.width + Math.floor(u * image.width)]!;
}

function linearColour(image: IndexedImage, paletteIndex: number): readonly [number, number, number] {
  const at = paletteIndex * 3;
  const linear = (byte: number): number => {
    const value = byte / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return [linear(image.palette[at]!), linear(image.palette[at + 1]!), linear(image.palette[at + 2]!)];
}

interface BakeQuality { samples: number; maxChannelError: number; rmsChannelError: number; worstTriangle: number }
interface EncodingQuality { vertices: number; payloadBytes: number; maxPositionError: number; maxNormalErrorDegrees: number; maxColourError: number }

function compactGeometry(positions: number[], normals: number[], colours: number[], indices: number[]): { body: string; quality: EncodingQuality } {
  const vertexMap = new Map<string, number>(), weldedPositions: number[] = [], weldedNormals: number[] = [], weldedColours: number[] = [];
  const remap = new Array<number>(positions.length / 3);
  for (let vertex = 0; vertex < remap.length; vertex++) {
    const at = vertex * 3;
    const values = [...positions.slice(at, at + 3), ...normals.slice(at, at + 3), ...colours.slice(at, at + 3)];
    const key = values.join(',');
    let welded = vertexMap.get(key);
    if (welded === undefined) {
      welded = vertexMap.size; vertexMap.set(key, welded);
      weldedPositions.push(...values.slice(0, 3)); weldedNormals.push(...values.slice(3, 6)); weldedColours.push(...values.slice(6, 9));
    }
    remap[vertex] = welded;
  }
  const weldedIndices = indices.map((index) => remap[index]!);
  const paletteMap = new Map<string, number>(), palette: number[] = [], colourIndices: number[] = [];
  for (let at = 0; at < weldedColours.length; at += 3) {
    const values = weldedColours.slice(at, at + 3), key = values.join(',');
    let entry = paletteMap.get(key);
    if (entry === undefined) { entry = paletteMap.size; paletteMap.set(key, entry); palette.push(...values); }
    colourIndices.push(entry);
  }
  if (paletteMap.size > 16) fail(`compact colour palette has ${paletteMap.size} entries, expected at most 16`);

  const vertexCount = weldedPositions.length / 3, indexCount = weldedIndices.length;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let at = 0; at < weldedPositions.length; at++) {
    const axis = at % 3;
    min[axis] = Math.min(min[axis]!, weldedPositions[at]!); max[axis] = Math.max(max[axis]!, weldedPositions[at]!);
  }
  const centre = min.map((value, axis) => (value + max[axis]!) / 2), half = min.map((value, axis) => (max[axis]! - value) / 2);
  if (half.some((value) => !Number.isFinite(value) || value <= 0)) fail('compact position bounds are degenerate');

  const encodedIndices: number[] = [];
  let previous = 0;
  for (const index of weldedIndices) {
    const delta = index - previous; previous = index;
    let zigzag = delta >= 0 ? delta * 2 : -delta * 2 - 1;
    do { encodedIndices.push((zigzag & 127) | (zigzag > 127 ? 128 : 0)); zigzag = Math.floor(zigzag / 128); } while (zigzag);
  }
  const positionBytes = vertexCount * 6, normalBytes = vertexCount * 4, colourBytes = Math.ceil(vertexCount / 2);
  const payload = Buffer.alloc(positionBytes + normalBytes + colourBytes + encodedIndices.length + palette.length * 4);
  const decodedPositions = new Float32Array(weldedPositions.length), decodedNormals = new Float32Array(weldedNormals.length), decodedColours = new Float32Array(weldedColours.length);
  let offset = 0;
  for (let at = 0; at < weldedPositions.length; at++) {
    const axis = at % 3, quantized = Math.round((weldedPositions[at]! - centre[axis]!) / half[axis]! * 32767);
    payload.writeInt16LE(quantized, offset); offset += 2;
    decodedPositions[at] = centre[axis]! + quantized / 32767 * half[axis]!;
  }
  const octEncode = (x: number, y: number, z: number): readonly [number, number] => {
    const length = Math.abs(x) + Math.abs(y) + Math.abs(z);
    x /= length; y /= length; z /= length;
    if (z < 0) { const oldX = x; x = (1 - Math.abs(y)) * (oldX < 0 ? -1 : 1); y = (1 - Math.abs(oldX)) * (y < 0 ? -1 : 1); }
    return [Math.round(x * 32767), Math.round(y * 32767)];
  };
  const octDecode = (x: number, y: number): readonly [number, number, number] => {
    x /= 32767; y /= 32767;
    let z = 1 - Math.abs(x) - Math.abs(y);
    if (z < 0) { const oldX = x; x = (1 - Math.abs(y)) * (oldX < 0 ? -1 : 1); y = (1 - Math.abs(oldX)) * (y < 0 ? -1 : 1); }
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  };
  for (let at = 0; at < weldedNormals.length; at += 3) {
    const encoded = octEncode(weldedNormals[at]!, weldedNormals[at + 1]!, weldedNormals[at + 2]!);
    payload.writeInt16LE(encoded[0], offset); offset += 2; payload.writeInt16LE(encoded[1], offset); offset += 2;
    decodedNormals.set(octDecode(encoded[0], encoded[1]), at);
  }
  for (let vertex = 0; vertex < vertexCount; vertex += 2) payload.writeUInt8(colourIndices[vertex]! | ((colourIndices[vertex + 1] ?? 0) << 4), offset++);
  for (const byte of encodedIndices) payload.writeUInt8(byte, offset++);
  const paletteOffset = offset;
  for (const value of palette) { payload.writeFloatLE(value, offset); offset += 4; }
  equal(offset, payload.length, 'compact payload length');
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const entry = colourIndices[vertex]!;
    for (let channel = 0; channel < 3; channel++) decodedColours[vertex * 3 + channel] = payload.readFloatLE(paletteOffset + entry * 12 + channel * 4);
  }
  let maxPositionError = 0, maxNormalErrorDegrees = 0, maxColourError = 0;
  for (let at = 0; at < weldedPositions.length; at++) maxPositionError = Math.max(maxPositionError, Math.abs(weldedPositions[at]! - decodedPositions[at]!));
  for (let at = 0; at < weldedColours.length; at++) maxColourError = Math.max(maxColourError, Math.abs(weldedColours[at]! - decodedColours[at]!));
  for (let at = 0; at < weldedNormals.length; at += 3) {
    const sourceLength = Math.hypot(weldedNormals[at]!, weldedNormals[at + 1]!, weldedNormals[at + 2]!);
    const decodedLength = Math.hypot(decodedNormals[at]!, decodedNormals[at + 1]!, decodedNormals[at + 2]!);
    const dot = (weldedNormals[at]! * decodedNormals[at]! + weldedNormals[at + 1]! * decodedNormals[at + 1]! + weldedNormals[at + 2]! * decodedNormals[at + 2]!) / (sourceLength * decodedLength);
    maxNormalErrorDegrees = Math.max(maxNormalErrorDegrees, Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI);
  }
  if (maxPositionError > 0.000007 || maxNormalErrorDegrees > 0.003 || maxColourError > 0.00000003) {
    fail(`compact encoding error exceeds limits: position ${maxPositionError}, normal ${maxNormalErrorDegrees} degrees, colour ${maxColourError}`);
  }
  const bounds = (values: number[]): string => values.map((value) => Number(value.toFixed(12))).join(',');
  const body = `// Payload: int16 positions, int16 octahedral normals, two palette nibbles per byte,\n// zigzag-delta varint indices, then a float32 linear-RGB palette.\nfunction decodePotStew(): BatchGeometry {\n  const vertexCount = ${vertexCount}, indexCount = ${indexCount}, normalScale = 32767;\n  const binary = atob('${payload.toString('base64')}');\n  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));\n  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);\n  const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3);\n  const colours = new Float32Array(vertexCount * 3), indices = new Uint16Array(indexCount);\n  const centre = [${bounds(centre)}], half = [${bounds(half)}];\n  let offset = 0;\n  for (let at = 0; at < positions.length; at++, offset += 2) {\n    const axis = at % 3;\n    positions[at] = centre[axis]! + view.getInt16(offset, true) / 32767 * half[axis]!;\n  }\n  for (let vertex = 0; vertex < vertexCount; vertex++) {\n    let x = view.getInt16(offset, true); offset += 2;\n    let y = view.getInt16(offset, true); offset += 2;\n    x /= normalScale; y /= normalScale;\n    let z = 1 - Math.abs(x) - Math.abs(y);\n    if (z < 0) {\n      const oldX = x;\n      x = (1 - Math.abs(y)) * (oldX < 0 ? -1 : 1);\n      y = (1 - Math.abs(oldX)) * (y < 0 ? -1 : 1);\n    }\n    const length = Math.hypot(x, y, z), at = vertex * 3;\n    normals[at] = x / length; normals[at + 1] = y / length; normals[at + 2] = z / length;\n  }\n  const colourIndexOffset = offset;\n  offset += Math.ceil(vertexCount / 2);\n  let byte = 0, packed = 0, shift = 0;\n  for (let at = 0; at < indexCount; at++) {\n    do { byte = view.getUint8(offset++); packed |= (byte & 127) << shift; shift += 7; } while (byte & 128);\n    const delta = (packed >>> 1) ^ -(packed & 1);\n    indices[at] = (at ? indices[at - 1]! : 0) + delta;\n    packed = 0; shift = 0;\n  }\n  const paletteOffset = offset;\n  for (let vertex = 0; vertex < vertexCount; vertex++) {\n    const palette = view.getUint8(colourIndexOffset + (vertex >> 1)) >> (vertex & 1 ? 4 : 0) & 15;\n    for (let channel = 0; channel < 3; channel++) colours[vertex * 3 + channel] = view.getFloat32(paletteOffset + palette * 12 + channel * 4, true);\n  }\n  return Object.freeze({ pos: positions, nor: normals, col: colours, idx: indices });\n}\n`;
  return { body, quality: { vertices: vertexCount, payloadBytes: payload.length, maxPositionError, maxNormalErrorDegrees, maxColourError } };
}

function buildSource(model: Buffer, texture: Buffer): { source: string; quality: BakeQuality; encoding: EncodingQuality; triangleCount: number; sourceVertexCount: number } {
  const work = mkdtempSync(join(tmpdir(), 'allworld-food-'));
  try {
    const modelPath = join(work, 'pot-stew.glb');
    writeFileSync(modelPath, model);
    const doc = loadGltf(modelPath), json = doc.json;
    equal(json.asset.version, '2.0', 'glTF version'); equal(json.asset.generator, 'UnityGLTF', 'glTF generator');
    equal(json.scene, 0, 'default scene'); equal(json.scenes?.length, 1, 'scene count');
    const scene = json.scenes?.[0]; if (!scene) fail('scene 0 is missing');
    equal(scene.name, 'pot-stew', 'scene name'); equal(scene.nodes.length, 1, 'scene root count'); equal(scene.nodes[0], 0, 'scene root');
    equal(json.nodes.length, 1, 'node count');
    const node = json.nodes[0]!; exactKeys(record(node, 'node'), ['mesh', 'name'], 'node'); equal(node.name, 'pot-stew', 'node name'); equal(node.mesh, 0, 'node mesh');
    equal(json.meshes?.length, 1, 'mesh count'); const mesh = json.meshes?.[0]; if (!mesh) fail('mesh 0 is missing');
    equal(mesh.name, 'pot-stew', 'mesh name'); equal(mesh.primitives.length, 1, 'primitive count');
    const primitive = mesh.primitives[0]!; exactKeys(record(primitive, 'primitive'), ['attributes', 'indices', 'material'], 'primitive');
    exactKeys(record(primitive.attributes, 'attributes'), ['NORMAL', 'POSITION', 'TANGENT', 'TEXCOORD_0'], 'attributes');
    equal(primitive.material, 0, 'material index'); if (primitive.indices === undefined) fail('indexed primitive required');

    equal(json.materials?.length, 1, 'material count'); const material = record(json.materials?.[0], 'material');
    exactKeys(material, ['doubleSided', 'name', 'pbrMetallicRoughness'], 'material');
    equal(material.name, 'colormap', 'material name'); equal(material.doubleSided, true, 'doubleSided');
    const pbr = record(material.pbrMetallicRoughness, 'pbrMetallicRoughness');
    exactKeys(pbr, ['baseColorTexture', 'metallicFactor'], 'pbrMetallicRoughness'); equal(pbr.metallicFactor, 0, 'metallicFactor');
    const baseColour = record(pbr.baseColorTexture, 'baseColorTexture'); exactKeys(baseColour, ['extensions', 'index'], 'baseColorTexture'); equal(baseColour.index, 0, 'texture index');
    const extensions = record(baseColour.extensions, 'texture extensions'); exactKeys(extensions, ['KHR_texture_transform'], 'texture extensions');
    const transform = record(extensions.KHR_texture_transform, 'KHR_texture_transform'); exactKeys(transform, ['texCoord'], 'KHR_texture_transform'); equal(transform.texCoord, 0, 'texture texCoord');
    equal(json.textures?.length, 1, 'texture count'); const textureDef = record(json.textures?.[0], 'texture');
    exactKeys(textureDef, ['name', 'sampler', 'source'], 'texture'); equal(textureDef.name, 'colormap', 'texture name'); equal(textureDef.sampler, 0, 'texture sampler'); equal(textureDef.source, 0, 'texture source');
    equal(json.images?.length, 1, 'image count'); const image = record(json.images?.[0], 'image'); exactKeys(image, ['name', 'uri'], 'image'); equal(image.name, 'colormap', 'image name'); equal(image.uri, 'Textures/colormap.png', 'image URI');
    equal(json.samplers?.length, 1, 'sampler count'); const sampler = record(json.samplers?.[0], 'sampler'); exactKeys(sampler, ['magFilter', 'minFilter'], 'sampler'); equal(sampler.magFilter, 9728, 'nearest magnification'); equal(sampler.minFilter, 9984, 'nearest mip filtering');
    if (json.animations?.length || json.skins?.length) fail('animations and skins are unsupported');

    const positionAccessor = json.accessors[primitive.attributes.POSITION!]!;
    const normalAccessor = json.accessors[primitive.attributes.NORMAL!]!;
    const uvAccessor = json.accessors[primitive.attributes.TEXCOORD_0!]!;
    const indexAccessor = json.accessors[primitive.indices]!;
    equal(positionAccessor.componentType, 5126, 'POSITION component type'); equal(positionAccessor.type, 'VEC3', 'POSITION type'); equal(positionAccessor.count, 532, 'vertex count');
    equal(normalAccessor.componentType, 5126, 'NORMAL component type'); equal(normalAccessor.type, 'VEC3', 'NORMAL type'); equal(normalAccessor.count, positionAccessor.count, 'NORMAL count');
    equal(uvAccessor.componentType, 5126, 'TEXCOORD_0 component type'); equal(uvAccessor.type, 'VEC2', 'TEXCOORD_0 type'); equal(uvAccessor.count, positionAccessor.count, 'TEXCOORD_0 count');
    equal(indexAccessor.componentType, 5123, 'index component type'); equal(indexAccessor.type, 'SCALAR', 'index type'); equal(indexAccessor.count, 1110, 'index count');

    const positions = readAccessor(doc, primitive.attributes.POSITION!);
    const normals = readAccessor(doc, primitive.attributes.NORMAL!);
    const uvs = readAccessor(doc, primitive.attributes.TEXCOORD_0!);
    const indices = readAccessor(doc, primitive.indices);
    const atlas = decodeIndexedPng(texture);
    const colours = new Array<number>(positionAccessor.count * 3);
    for (let vertex = 0; vertex < positionAccessor.count; vertex++) {
      const sampled = linearColour(atlas, sample(atlas, uvs[vertex * 2]!, uvs[vertex * 2 + 1]!));
      colours[vertex * 3] = sampled[0]; colours[vertex * 3 + 1] = sampled[1]; colours[vertex * 3 + 2] = sampled[2];
    }
    const GRID = 10;
    let errorSquared = 0, sampleChannels = 0, maxChannelError = 0, worstTriangle = -1;
    for (let at = 0; at < indices.length; at += 3) {
      const a = indices[at]!, b = indices[at + 1]!, c = indices[at + 2]!;
      if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c) || Math.max(a, b, c) >= positionAccessor.count) fail(`invalid triangle index at ${at / 3}`);
      for (let ai = 0; ai <= GRID; ai++) for (let bi = 0; bi <= GRID - ai; bi++) {
        const wa = ai / GRID, wb = bi / GRID, wc = 1 - wa - wb;
        const u = uvs[a * 2]! * wa + uvs[b * 2]! * wb + uvs[c * 2]! * wc;
        const v = uvs[a * 2 + 1]! * wa + uvs[b * 2 + 1]! * wb + uvs[c * 2 + 1]! * wc;
        const sourceColour = linearColour(atlas, sample(atlas, u, v));
        for (let channel = 0; channel < 3; channel++) {
          const baked = colours[a * 3 + channel]! * wa + colours[b * 3 + channel]! * wb + colours[c * 3 + channel]! * wc;
          const error = Math.abs(sourceColour[channel]! - baked);
          errorSquared += error * error; sampleChannels++;
          if (error > maxChannelError) { maxChannelError = error; worstTriangle = at / 3; }
        }
      }
    }
    const quality = { samples: sampleChannels / 3, maxChannelError, rmsChannelError: Math.sqrt(errorSquared / sampleChannels), worstTriangle };
    if (quality.maxChannelError > 0.06) fail(`vertex-colour approximation max channel error ${quality.maxChannelError.toFixed(6)} exceeds 0.06 at triangle ${quality.worstTriangle}`);
    const triangleCount = indices.length / 3;
    equal(triangleCount, 370, 'baked triangle count');
    const compact = compactGeometry(Array.from(positions), Array.from(normals), colours, Array.from(indices));
    const source = `// Generated by scripts/assets/bake-food.ts. Do not edit by hand.\n// Source: Kenney Food Kit 2.0 / pot-stew.glb (CC0 1.0)\n// GLB SHA-256: ${MODEL_SHA256}\n// Atlas SHA-256: ${TEXTURE_SHA256}\n// Atlas colours are sampled per vertex in linear RGB; this is a measured gradient approximation.\n// 10-step barycentric grid: max channel error ${quality.maxChannelError.toFixed(6)}, RMS ${quality.rmsChannelError.toFixed(6)} (${quality.samples} samples).\n// Exact tuple weld: ${positionAccessor.count} to ${compact.quality.vertices} vertices. Decode max errors: position ${compact.quality.maxPositionError.toExponential(3)}, normal ${compact.quality.maxNormalErrorDegrees.toExponential(3)} degrees, colour ${compact.quality.maxColourError.toExponential(3)}.\nimport type { BatchGeometry } from '../types.ts';\n\n${compact.body}\nexport const KENNEY_POT_STEW: BatchGeometry = decodePotStew();\n`;
    return { source, quality, encoding: compact.quality, triangleCount, sourceVertexCount: positionAccessor.count };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const model = zipEntry(MODEL_ENTRY), texture = zipEntry(TEXTURE_ENTRY), license = zipEntry(LICENSE_ENTRY);
equal(model.length, 29560, 'source GLB bytes'); equal(texture.length, 10715, 'source atlas bytes'); equal(license.length, 711, 'license bytes');
equal(sha256(model), MODEL_SHA256, 'source GLB SHA-256'); equal(sha256(texture), TEXTURE_SHA256, 'source atlas SHA-256'); equal(sha256(license), LICENSE_SHA256, 'license SHA-256');
const built = buildSource(model, texture);
writeFileSync(output, built.source);
writeFileSync(licenseOutput, license);
process.stdout.write(`${output}\n  source: ${model.length} B, ${built.sourceVertexCount} vertices, ${built.triangleCount} triangles\n  encoding: ${built.encoding.vertices} welded vertices, ${built.encoding.payloadBytes} B payload, max position ${built.encoding.maxPositionError.toExponential(3)}, normal ${built.encoding.maxNormalErrorDegrees.toExponential(3)} degrees, colour ${built.encoding.maxColourError.toExponential(3)}\n  approximation: ${built.quality.samples} samples, max channel ${built.quality.maxChannelError.toFixed(6)} at triangle ${built.quality.worstTriangle}, RMS ${built.quality.rmsChannelError.toFixed(6)}\n  baked: ${Buffer.byteLength(built.source)} B, gzip ${gzipSync(built.source, { level: 9 }).length} B\n  sha256: ${sha256(built.source)}\n  texture sha256: ${TEXTURE_SHA256}\n  license: ${licenseOutput}\n`);
