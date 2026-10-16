// Tiny glTF files and manifests built in memory for the asset pipeline's tests (no downloads, no tools).
import { writeGlb } from './glb.ts'
import type { Json } from './glb.ts'
import { LICENCE_IDS, MANIFEST_FORMAT, OWN_SOURCE, packPath } from './pack-types.ts'
import type { Game, LicenceId, Manifest, ManifestAsset, ModelKind } from './pack-types.ts'

/** The first 24 bytes of a PNG: enough for imageSize. */
export function fakePng(width: number, height: number): Buffer {
  const b = Buffer.alloc(33)
  b.writeUInt32BE(0x89504e47, 0)
  b.writeUInt32BE(0x0d0a1a0a, 4)
  b.writeUInt32BE(13, 8)
  b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(width, 16)
  b.writeUInt32BE(height, 20)
  return b
}

export interface TinyOptions {
  /** Triangles per mesh instance. */
  triangles?: number
  /** Mesh node names; each gets its own instance of the one mesh. */
  meshNodes?: string[]
  /** Clip names (each animates the first node's rotation). */
  clips?: string[]
  /** An embedded image of this size. */
  image?: [number, number]
  /** Extra extensionsUsed (to test refusals). */
  extensions?: string[]
  /** Units per side of the triangle (bounds). */
  size?: number
}

/** A .glb with one triangle-soup mesh drawn by each named node under a root, optional clips and an image. */
export function tinyGlb(o: TinyOptions = {}): Buffer {
  const tris = o.triangles ?? 1
  const s = o.size ?? 1
  const positions = Buffer.alloc(36)
  ;[0, 0, 0, s, 0, 0, 0, s, 0].forEach((v, i) => positions.writeFloatLE(v, i * 4))
  const indices = Buffer.alloc(tris * 3 * 2)
  for (let i = 0; i < tris * 3; i++) indices.writeUInt16LE(i % 3, i * 2)
  const times = Buffer.alloc(8)
  times.writeFloatLE(0, 0)
  times.writeFloatLE(1, 4)
  const rotations = Buffer.alloc(32)
  ;[0, 0, 0, 1, 0, 0.7071, 0, 0.7071].forEach((v, i) => rotations.writeFloatLE(v, i * 4))
  const image = o.image ? fakePng(o.image[0], o.image[1]) : Buffer.alloc(0)
  const pad = (b: Buffer): Buffer => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b)
  const parts = [positions, pad(indices), times, rotations, pad(image)]
  const offsets: number[] = []
  let at = 0
  for (const p of parts) { offsets.push(at); at += p.length }
  const names = o.meshNodes ?? ['body']
  const json: Json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'root', children: names.map((_, i) => i + 1) }, ...names.map((name) => ({ name, mesh: 0 }))],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, ...(o.image ? { material: 0 } : {}) }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [s, s, 0] },
      { bufferView: 1, componentType: 5123, count: tris * 3, type: 'SCALAR' },
      { bufferView: 2, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 3, componentType: 5126, count: 2, type: 'VEC4' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: positions.length },
      { buffer: 0, byteOffset: offsets[1], byteLength: indices.length },
      { buffer: 0, byteOffset: offsets[2], byteLength: times.length },
      { buffer: 0, byteOffset: offsets[3], byteLength: rotations.length },
      ...(o.image ? [{ buffer: 0, byteOffset: offsets[4], byteLength: image.length }] : []),
    ],
    buffers: [{ byteLength: at }],
  }
  if (o.clips?.length) json.animations = o.clips.map((name) => ({ name, samplers: [{ input: 2, output: 3 }], channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }] }))
  if (o.image) {
    json.images = [{ bufferView: 4, mimeType: 'image/png' }]
    json.textures = [{ source: 0 }]
    json.materials = [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }]
  }
  if (o.extensions) json.extensionsUsed = o.extensions
  return writeGlb({ json, bin: Buffer.concat(parts) })
}

export interface AssetSpec { name: string; bytes: Buffer; kind: ManifestAsset['kind']; game?: Game; triangles?: number; prepared?: boolean; licenceId?: LicenceId; attribution?: string; temporary?: boolean }

/** A manifest for `pack` listing the given files (bytes measured), and the file map budget.ts reads. */
export function packOf(pack: string, specs: AssetSpec[], licenceId: LicenceId = 'CC0-1.0'): { pack: string; manifest: Manifest; files: Map<string, Buffer> } {
  const ours = licenceId === 'AGPL-3.0-or-later'
  const assets: ManifestAsset[] = specs.map((s) => {
    const id = s.licenceId ?? licenceId
    return {
      path: packPath(pack, s.name),
      licence: LICENCE_IDS[id],
      source: ours ? OWN_SOURCE : `https://example.org/${pack}`,
      author: ours ? 'Allworld' : 'Maker',
      ...(s.attribution ? { attribution: s.attribution } : {}),
      bytes: s.bytes.length,
      ...(s.triangles !== undefined ? { triangles: s.triangles } : {}),
      ...(s.game ? { game: s.game } : {}),
      kind: s.kind,
      licenceId: id,
      ...(ours ? { made: 'scripts/assets/blender/x.py' } : {}),
      ...(s.prepared === false ? {} : (s.kind as string) in { character: 1, vehicle: 1, prop: 1, texture: 1 } ? { prepared: true } : {}),
      ...(s.temporary ? { temporary: true } : {}),
    }
  })
  const manifest: Manifest = { format: MANIFEST_FORMAT, pack, name: `Pack ${pack}`, kind: ours ? 'own' : 'kenney', page: ours ? 'https://example.org/scripts' : `https://example.org/${pack}`, author: ours ? 'Allworld' : 'Maker', licenceId, fetched: '2026-10-16', assets }
  return { pack, manifest, files: new Map(specs.map((s) => [s.name, s.bytes])) }
}

/** A model spec whose triangle count is what the file draws. */
export const model = (name: string, game: Game, kind: ModelKind, triangles: number, extra: Partial<AssetSpec> = {}): AssetSpec => ({ name, bytes: tinyGlb({ triangles }), kind, game, triangles, ...extra })

/** A zip with stored (uncompressed) entries, enough for readZip. */
export function storedZip(entries: Record<string, Buffer | string>): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = []
  let offset = 0
  for (const [name, value] of Object.entries(entries)) {
    const data = typeof value === 'string' ? Buffer.from(value) : value
    const n = Buffer.from(name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(n.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(n.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, n, data)
    centrals.push(central, n)
    offset += 30 + n.length + data.length
  }
  const dir = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(entries).length, 8)
  end.writeUInt16LE(Object.keys(entries).length, 10)
  end.writeUInt32LE(dir.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, dir, end])
}
