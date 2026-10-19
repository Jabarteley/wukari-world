/**
 * OWNER: spaces
 * THE GLB CHECK: is this file a model the 3D space screen may draw (docs/SPACES-3D.md, phase 1)? Read byte by byte, never run.
 * The server checks every upload with it; the upload screen runs the same check first, so a bad file is refused at once and
 * in plain words.
 *
 * A file passes when it is a glTF 2.0 binary (.glb) whose every buffer and picture is inside the file (no outside link and no
 * data: link), whose required extensions are ones three.js draws without an extra decoder, and which stays inside GLB_LIMITS.
 * The answer carries what the screen needs to place it: triangles, pictures and the size of the model in metres.
 */

export const GLB_LIMITS = Object.freeze({
  bytes: 20_000_000,
  jsonBytes: 4_000_000,
  triangles: 200_000,
  textures: 16,
  texturePx: 4096,
  nodes: 2_000,
  meshes: 500,
  materials: 64,
  animations: 32,
  depth: 64,
})
export type GlbLimits = { readonly [K in keyof typeof GLB_LIMITS]: number }

/**
 * A model used as a whole house (docs/HOUSE-FROM-PHOTOS.md): every room, inside and out, so it may be bigger. One per player.
 */
export const HOUSE_GLB_LIMITS: GlbLimits = Object.freeze({ ...GLB_LIMITS, bytes: 50_000_000, jsonBytes: 8_000_000, triangles: 500_000, textures: 32, nodes: 5_000, meshes: 1_500, materials: 128 })

/** Extensions a model may require: three.js draws all of them with what the screen already loads (the meshopt decoder). */
export const GLB_EXTENSIONS: ReadonlySet<string> = new Set([
  'KHR_materials_emissive_strength', 'KHR_materials_clearcoat', 'KHR_materials_transmission', 'KHR_materials_ior',
  'KHR_materials_specular', 'KHR_materials_sheen', 'KHR_materials_volume', 'KHR_materials_iridescence', 'KHR_materials_unlit',
  'KHR_materials_anisotropy', 'KHR_materials_dispersion', 'KHR_texture_transform', 'KHR_mesh_quantization',
  'EXT_meshopt_compression', 'EXT_texture_webp', 'EXT_mesh_gpu_instancing', 'KHR_lights_punctual', 'KHR_materials_variants',
])

export interface GlbInfo {
  triangles: number
  textures: number
  /** The longest side of the largest picture, in pixels (0: no pictures). */
  texturePx: number
  nodes: number
  meshes: number
  materials: number
  animations: number
  skinned: boolean
  /** The model's size along x, y (up) and z, in metres, as drawn (node transforms applied), rounded to centimetres. */
  size: [number, number, number]
  /** The lowest point and the centre of its footprint, so the screen can stand the model on the floor. */
  min: [number, number, number]
  max: [number, number, number]
}
export type GlbCheck = { ok: true; info: GlbInfo } | { ok: false; code: string; reason: string }

const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942
const no = (code: string, reason: string): GlbCheck => ({ ok: false, code, reason })
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const count = (value: unknown): number => list(value).length
const whole = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min

const SPECIFIC: Record<string, string> = {
  KHR_draco_mesh_compression: 'This model uses Draco compression. Export it again without Draco (meshopt or no compression is fine).',
  KHR_texture_basisu: 'This model uses KTX2 (Basis) pictures. Export it again with PNG, JPEG or WebP pictures.',
}

type Mat = number[]
const IDENTITY: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
function multiply(a: Mat, b: Mat): Mat {
  const out = new Array<number>(16)
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
    let sum = 0
    for (let k = 0; k < 4; k++) sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0)
    out[col * 4 + row] = sum
  }
  return out
}
const numbers = (value: unknown, length: number): number[] | null => (Array.isArray(value) && value.length === length && value.every((n) => typeof n === 'number' && Number.isFinite(n)) ? value as number[] : null)
/** A node's local matrix (column-major, as glTF writes it): its `matrix`, or translation × rotation × scale. */
function localMatrix(node: Record<string, unknown>): Mat {
  const matrix = numbers(node['matrix'], 16)
  if (matrix) return matrix
  const [tx, ty, tz] = (numbers(node['translation'], 3) ?? [0, 0, 0]) as [number, number, number]
  const [x, y, z, w] = (numbers(node['rotation'], 4) ?? [0, 0, 0, 1]) as [number, number, number, number]
  const [sx, sy, sz] = (numbers(node['scale'], 3) ?? [1, 1, 1]) as [number, number, number]
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}
const apply = (m: Mat, [x, y, z]: number[]): number[] => [
  (m[0] ?? 0) * (x ?? 0) + (m[4] ?? 0) * (y ?? 0) + (m[8] ?? 0) * (z ?? 0) + (m[12] ?? 0),
  (m[1] ?? 0) * (x ?? 0) + (m[5] ?? 0) * (y ?? 0) + (m[9] ?? 0) * (z ?? 0) + (m[13] ?? 0),
  (m[2] ?? 0) * (x ?? 0) + (m[6] ?? 0) * (y ?? 0) + (m[10] ?? 0) * (z ?? 0) + (m[14] ?? 0),
]
/** A normalized integer accessor's min/max are stored as integers: map them to -1..1 or 0..1 as the GPU does. */
const NORMALIZE: Record<number, number> = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }

/** Width and height of a PNG, JPEG or WebP picture, read from its header; null when the bytes are not that kind of picture. */
export function pictureSize(bytes: Uint8Array, mime: string): { w: number; h: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (mime === 'image/png') {
    if (bytes.length < 24 || view.getUint32(0) !== 0x89504e47 || view.getUint32(12) !== 0x49484452) return null
    return { w: view.getUint32(16), h: view.getUint32(20) }
  }
  if (mime === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
    let at = 2
    while (at + 9 < bytes.length) {
      if (bytes[at] !== 0xff) return null
      const marker = bytes[at + 1] ?? 0
      if (marker === 0xff) { at++; continue }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { at += 2; continue }
      const length = view.getUint16(at + 2)
      // Start-of-frame markers (C0-CF, except C4 DHT, C8 JPG and CC DAC) carry the size.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: view.getUint16(at + 5), w: view.getUint16(at + 7) }
      if (length < 2) return null
      at += 2 + length
    }
    return null
  }
  if (mime === 'image/webp') {
    if (bytes.length < 30 || view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) return null
    const kind = String.fromCharCode(bytes[12] ?? 0, bytes[13] ?? 0, bytes[14] ?? 0, bytes[15] ?? 0)
    if (kind === 'VP8 ') return { w: view.getUint16(26, true) & 0x3fff, h: view.getUint16(28, true) & 0x3fff }
    if (kind === 'VP8L') { const b = view.getUint32(21, true); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
    if (kind === 'VP8X') return { w: 1 + ((bytes[24] ?? 0) | ((bytes[25] ?? 0) << 8) | ((bytes[26] ?? 0) << 16)), h: 1 + ((bytes[27] ?? 0) | ((bytes[28] ?? 0) << 8) | ((bytes[29] ?? 0) << 16)) }
    return null
  }
  return null
}

/** Check a .glb file. Never throws: anything unreadable is a refusal with a reason a player can act on. */
export function checkGlb(bytes: Uint8Array, limits: GlbLimits = GLB_LIMITS): GlbCheck {
  try { return check(bytes, limits) } catch { return no('unreadable', 'This file could not be read as a 3D model. Export it again as .glb (glTF binary).') }
}

function check(bytes: Uint8Array, L: GlbLimits): GlbCheck {
  if (bytes.byteLength > L.bytes) return no('too_large', `This file is ${(bytes.byteLength / 1e6).toFixed(1)} MB. A model may be at most ${L.bytes / 1e6} MB.`)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== MAGIC) return no('not_glb', 'This is not a .glb file. Export your model as glTF binary (.glb).')
  if (view.getUint32(4, true) !== 2) return no('old_gltf', 'This model is an old glTF version. Export it again as glTF 2.0.')
  if (view.getUint32(8, true) !== bytes.byteLength) return no('cut_off', 'This file is incomplete. Upload it again.')
  const jsonLength = view.getUint32(12, true)
  if (view.getUint32(16, true) !== JSON_CHUNK || jsonLength > L.jsonBytes || 20 + jsonLength > bytes.byteLength) return no('unreadable', 'This file could not be read as a 3D model. Export it again as .glb (glTF binary).')
  const gltf: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + jsonLength)))
  if (!isRecord(gltf)) return no('unreadable', 'This file could not be read as a 3D model. Export it again as .glb (glTF binary).')
  let bin: Uint8Array | null = null
  const binAt = 20 + jsonLength + ((4 - (jsonLength % 4)) % 4)
  if (binAt + 8 <= bytes.byteLength) {
    const binLength = view.getUint32(binAt, true)
    if (view.getUint32(binAt + 4, true) !== BIN_CHUNK || binAt + 8 + binLength > bytes.byteLength) return no('unreadable', 'This file could not be read as a 3D model. Export it again as .glb (glTF binary).')
    bin = bytes.subarray(binAt + 8, binAt + 8 + binLength)
  }

  const asset = gltf['asset']
  if (!isRecord(asset) || typeof asset['version'] !== 'string' || !asset['version'].startsWith('2.')) return no('old_gltf', 'This model is an old glTF version. Export it again as glTF 2.0.')
  for (const name of list(gltf['extensionsRequired'])) {
    if (typeof name !== 'string') return no('unreadable', 'This file could not be read as a 3D model.')
    if (SPECIFIC[name]) return no('extension', SPECIFIC[name])
    if (!GLB_EXTENSIONS.has(name)) return no('extension', `This model needs "${name.slice(0, 60)}", which Allworld cannot draw. Export it again without it.`)
  }

  // Buffers: the file's own binary chunk, and (meshopt) uncompressed fallbacks with no bytes. Nothing outside the file.
  const buffers = list(gltf['buffers'])
  for (const [i, buffer] of buffers.entries()) {
    if (!isRecord(buffer) || !whole(buffer['byteLength'])) return no('unreadable', 'This file could not be read as a 3D model.')
    if (buffer['uri'] !== undefined) return no('outside_file', 'This model links to a file outside itself. Export it as a single .glb with everything embedded.')
    const fallback = isRecord(buffer['extensions']) && isRecord(buffer['extensions']['EXT_meshopt_compression'])
    if (i === 0 && !fallback && (!bin || buffer['byteLength'] > bin.byteLength)) return no('cut_off', 'This file is incomplete. Upload it again.')
    if (i > 0 && !fallback) return no('outside_file', 'This model links to a file outside itself. Export it as a single .glb with everything embedded.')
  }
  const views = list(gltf['bufferViews'])
  const viewBytes = (index: unknown): Uint8Array | null => {
    if (!whole(index) || index >= views.length) return null
    const v = views[index]
    if (!isRecord(v) || v['buffer'] !== 0 || !bin || !whole(v['byteLength'])) return null
    const offset = whole(v['byteOffset']) ? v['byteOffset'] : 0
    return offset + v['byteLength'] <= bin.byteLength ? bin.subarray(offset, offset + v['byteLength']) : null
  }
  for (const [i, v] of views.entries()) {
    if (!isRecord(v) || !whole(v['buffer']) || v['buffer'] >= buffers.length || !whole(v['byteLength'])) return no('unreadable', 'This file could not be read as a 3D model.')
    if (v['buffer'] === 0 && !viewBytes(i)) return no('cut_off', 'This file is incomplete. Upload it again.')
  }

  // Pictures: inside the file, PNG, JPEG or WebP, and no larger than texturePx on a side.
  const images = list(gltf['images'])
  if (images.length > L.textures) return no('too_many_textures', `This model has ${images.length} pictures. A model may have at most ${L.textures}.`)
  let texturePx = 0
  for (const image of images) {
    if (!isRecord(image)) return no('unreadable', 'This file could not be read as a 3D model.')
    if (image['uri'] !== undefined) return no('outside_file', 'A picture in this model is outside the file. Export it as a single .glb with the pictures embedded.')
    const mime = image['mimeType']
    if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') return no('texture_kind', 'Pictures in a model must be PNG, JPEG or WebP.')
    const data = viewBytes(image['bufferView'])
    const size = data ? pictureSize(data, mime) : null
    if (!size || size.w < 1 || size.h < 1) return no('texture_kind', 'A picture in this model could not be read. Export it again with PNG, JPEG or WebP pictures.')
    if (Math.max(size.w, size.h) > L.texturePx) return no('texture_too_large', `A picture in this model is ${size.w}×${size.h}. Pictures may be at most ${L.texturePx} pixels on a side.`)
    texturePx = Math.max(texturePx, size.w, size.h)
  }

  const nodes = list(gltf['nodes']), meshes = list(gltf['meshes']), accessors = list(gltf['accessors'])
  const materials = count(gltf['materials']), animations = count(gltf['animations'])
  if (nodes.length > L.nodes) return no('too_complex', `This model has ${nodes.length} parts. A model may have at most ${L.nodes}.`)
  if (meshes.length > L.meshes) return no('too_complex', `This model has ${meshes.length} meshes. A model may have at most ${L.meshes}.`)
  if (materials > L.materials) return no('too_complex', `This model has ${materials} materials. A model may have at most ${L.materials}.`)
  if (animations > L.animations) return no('too_complex', `This model has ${animations} animations. A model may have at most ${L.animations}.`)
  const accessorCount = (index: unknown): number => {
    if (!whole(index) || index >= accessors.length) throw new Error('accessor')
    const a = accessors[index]
    if (!isRecord(a) || !whole(a['count'])) throw new Error('accessor')
    return a['count']
  }

  /** Triangles and the local box of one mesh (null box: no positions). */
  const meshFacts = (index: number): { triangles: number; box: [number[], number[]] | null } => {
    const mesh = meshes[index]
    if (!isRecord(mesh)) throw new Error('mesh')
    let triangles = 0, lo: number[] | null = null, hi: number[] | null = null
    for (const primitive of list(mesh['primitives'])) {
      if (!isRecord(primitive) || !isRecord(primitive['attributes'])) throw new Error('primitive')
      const position = primitive['attributes']['POSITION']
      const n = primitive['indices'] !== undefined ? accessorCount(primitive['indices']) : whole(position) ? accessorCount(position) : 0
      const mode = primitive['mode'] === undefined ? 4 : primitive['mode']
      if (mode === 4) triangles += Math.floor(n / 3)
      else if (mode === 5 || mode === 6) triangles += Math.max(0, n - 2)
      if (whole(position) && position < accessors.length) {
        const a = accessors[position] as Record<string, unknown>
        const min = numbers(a['min'], 3), max = numbers(a['max'], 3)
        if (min && max) {
          const scale = a['normalized'] === true ? NORMALIZE[a['componentType'] as number] ?? 1 : 1
          const mn = min.map((v) => v / scale), mx = max.map((v) => v / scale)
          lo = lo ? lo.map((v, i) => Math.min(v, mn[i] ?? v)) : mn
          hi = hi ? hi.map((v, i) => Math.max(v, mx[i] ?? v)) : mx
        }
      }
    }
    return { triangles, box: lo && hi ? [lo, hi] : null }
  }

  // Walk the default scene's node tree: a mesh drawn by two nodes is drawn (and counted) twice.
  const scenes = list(gltf['scenes'])
  const sceneIndex = whole(gltf['scene']) ? gltf['scene'] : 0
  const scene = scenes[sceneIndex]
  const roots = isRecord(scene) ? list(scene['nodes']) : nodes.map((_, i) => i)
  let triangles = 0, skinned = false
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  const walk = (index: unknown, parent: Mat, path: Set<number>): void => {
    if (!whole(index) || index >= nodes.length || path.has(index) || path.size >= L.depth) throw new Error('node')
    const node = nodes[index]
    if (!isRecord(node)) throw new Error('node')
    const world = multiply(parent, localMatrix(node))
    if (node['skin'] !== undefined) skinned = true
    if (node['mesh'] !== undefined) {
      if (!whole(node['mesh']) || node['mesh'] >= meshes.length) throw new Error('mesh')
      const facts = meshFacts(node['mesh'])
      const instancing = isRecord(node['extensions']) ? node['extensions']['EXT_mesh_gpu_instancing'] : undefined
      const translation = isRecord(instancing) && isRecord(instancing['attributes']) ? instancing['attributes']['TRANSLATION'] : undefined
      const copies = translation !== undefined ? accessorCount(translation) : 1
      triangles += facts.triangles * copies
      if (triangles > L.triangles * 4) throw new RangeError('triangles')
      if (facts.box) {
        const [a, b] = facts.box
        for (let corner = 0; corner < 8; corner++) {
          const point = apply(world, [corner & 1 ? b[0]! : a[0]!, corner & 2 ? b[1]! : a[1]!, corner & 4 ? b[2]! : a[2]!])
          for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, point[i]!); hi[i] = Math.max(hi[i]!, point[i]!) }
        }
      }
    }
    path.add(index)
    for (const child of list(node['children'])) walk(child, world, path)
    path.delete(index)
  }
  try { for (const root of roots) walk(root, IDENTITY, new Set()) } catch (error) {
    if (error instanceof RangeError) return no('too_many_triangles', `This model has far more than ${L.triangles.toLocaleString('en')} triangles. Simplify it (Blender: Decimate) and export it again.`)
    return no('unreadable', 'The parts of this model could not be read. Export it again as .glb (glTF binary).')
  }
  if (triangles === 0 || !Number.isFinite(lo[0]!)) return no('empty', 'This model has nothing to draw. Check that the export included the meshes.')
  if (triangles > L.triangles) return no('too_many_triangles', `This model has ${triangles.toLocaleString('en')} triangles. A model may have at most ${L.triangles.toLocaleString('en')}: simplify it (Blender: Decimate) and export it again.`)
  const cm = (v: number): number => Math.round(v * 100) / 100
  const size = [0, 1, 2].map((i) => cm(hi[i]! - lo[i]!)) as [number, number, number]
  if (size.some((v) => !Number.isFinite(v)) || Math.max(...size) > 1000) return no('too_big_world', 'This model is more than a kilometre across. Check its scale (1 unit should be 1 metre) and export it again.')
  return { ok: true, info: {
    triangles, textures: images.length, texturePx, nodes: nodes.length, meshes: meshes.length, materials, animations, skinned, size,
    min: lo.map(cm) as [number, number, number], max: hi.map(cm) as [number, number, number],
  } }
}
