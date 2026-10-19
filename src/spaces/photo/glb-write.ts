/**
 * OWNER: spaces
 * The photo place as a .glb (docs/WORLDS.md, phase 8): one mesh, the photo as its picture, drawn unlit so it keeps the photo's own
 * colours. Named nodes tell the 3D view what it is:
 *   allworld_solid     the root: solid in its own shape (not a box around it)
 *   allworld_collider  that shape: what stands up in a coarser, smoothed copy of the surface; never drawn
 *   allworld_spawn   just onto the nearest ground the photo shows: a world holding it starts its visitors there, looking down -Z
 * The file passes the same check as any upload (src/spaces/glb.ts). Pure: tested in Node.
 */
import type { PhotoMesh } from './mesh.ts'

const pad4 = (n: number): number => (n + 3) & ~3

/** A GLB holding `mesh` with `jpeg` as its picture. */
export function photoGlb(mesh: PhotoMesh, jpeg: Uint8Array, name = 'Photo'): Uint8Array {
  const bytesOf = (a: Float32Array | Uint32Array): Uint8Array => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
  const parts: { bytes: Uint8Array; target?: number }[] = [
    { bytes: bytesOf(mesh.positions), target: 34962 },
    { bytes: bytesOf(mesh.uvs), target: 34962 },
    { bytes: bytesOf(mesh.indices), target: 34963 },
    { bytes: jpeg },
    { bytes: bytesOf(mesh.solid.positions), target: 34962 },
    { bytes: bytesOf(mesh.solid.indices), target: 34963 },
  ]
  let offset = 0
  const bufferViews = parts.map((part) => {
    const view = { buffer: 0, byteOffset: offset, byteLength: part.bytes.byteLength, ...(part.target ? { target: part.target } : {}) }
    offset = pad4(offset + part.bytes.byteLength)
    return view
  })
  const vertices = mesh.positions.length / 3, solidVertices = mesh.solid.positions.length / 3
  const solidMin = [Infinity, Infinity, Infinity], solidMax = [-Infinity, -Infinity, -Infinity]
  for (let k = 0; k < mesh.solid.positions.length; k += 3) for (let i = 0; i < 3; i++) { solidMin[i] = Math.min(solidMin[i]!, mesh.solid.positions[k + i]!); solidMax[i] = Math.max(solidMax[i]!, mesh.solid.positions[k + i]!) }
  const gltf = {
    asset: { version: '2.0', generator: 'Allworld photo place' },
    extensionsUsed: ['KHR_materials_unlit'],
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [
      { name: 'allworld_solid', children: [1, 2, 3] },
      { name: 'photo', mesh: 0 },
      // Feet on the world's own ground, which visitors walk on (the photo's lies just above it).
      { name: 'allworld_spawn', translation: [mesh.start[0], 0, mesh.start[1]] },
      { name: 'allworld_collider', mesh: 1 },
    ],
    meshes: [
      { name: 'photo', primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0, mode: 4 }] },
      { name: 'collider', primitives: [{ attributes: { POSITION: 3 }, indices: 4, material: 1, mode: 4 }] },
    ],
    materials: [
      { name: 'photo', doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 }, extensions: { KHR_materials_unlit: {} } },
      // Never drawn (the 3D view hides allworld_collider); see-through for any other viewer.
      { name: 'collider', alphaMode: 'BLEND', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0], metallicFactor: 0, roughnessFactor: 1 } },
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: 3, mimeType: 'image/jpeg' }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertices, type: 'VEC3', min: [...mesh.min], max: [...mesh.max] },
      { bufferView: 1, componentType: 5126, count: vertices, type: 'VEC2' },
      { bufferView: 2, componentType: 5125, count: mesh.indices.length, type: 'SCALAR' },
      { bufferView: 4, componentType: 5126, count: solidVertices, type: 'VEC3', min: solidMin, max: solidMax },
      { bufferView: 5, componentType: 5125, count: mesh.solid.indices.length, type: 'SCALAR' },
    ],
    bufferViews,
    buffers: [{ byteLength: offset }],
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonLength = pad4(json.byteLength), binLength = offset
  const out = new Uint8Array(12 + 8 + jsonLength + 8 + binLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, out.byteLength, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.set(json, 20)
  out.fill(0x20, 20 + json.byteLength, 20 + jsonLength)
  const bin = 20 + jsonLength
  view.setUint32(bin, binLength, true)
  view.setUint32(bin + 4, 0x004e4942, true)
  parts.forEach((part, i) => out.set(part.bytes, bin + 8 + bufferViews[i]!.byteOffset))
  return out
}
