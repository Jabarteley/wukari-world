// Turn a pack's fetched models into game-ready GLBs.
//
//   node --experimental-strip-types scripts/assets/prepare.ts --pack kenney-racing-kit [--no-meshopt] [--keep-png] [--dry]
//   node --experimental-strip-types scripts/assets/prepare.ts --file in.glb --out out.glb --kind vehicle [--fit y:1.4] [--z-up]
//
// For each model the want list names (scripts/assets/wants/<pack>.json), in place, recording the new size, triangle count and
// the SHA-256 of the fetched bytes in the pack's manifest.json:
//   1. reads glTF/GLB, keeps one scene and drops everything it does not reach: meshes the list does not keep (`keepMeshes`),
//      animations it does not name (`clips`, renamed to the game's names), unused materials and textures;
//   2. scales to metres (`scale`, or `fit` one bounding axis to N metres) and turns Z-up models upright (glTF is Y-up);
//   3. re-encodes textures as WebP (three's GLTFLoader reads EXT_texture_webp), at most 1024 px; a texture that several models
//      of one game share becomes ONE file they point at, instead of a copy in each;
//   4. unless --no-meshopt, runs gltfpack 1.3 (EXT_meshopt_compression and quantised vertices, the codec the game's loaders
//      already decode: src/scene/models/gltf-source.ts, src/models/vehicles/glb.ts; the same tool scripts/body/build-body.ts
//      uses, fetched by npx on first use), simplifying by `simplify` when the list asks;
//   5. counts the triangles of the FINAL file and REFUSES one over the cap for its kind (CAPS in pack-types.ts). Nothing is
//      written until every model of the pack has passed. The refusal is the point: pick a lighter model or simplify it;
//      never raise the cap.
// Textures need `cwebp` (brew install webp / apt install webp); without it the script stops, unless --keep-png is given.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glbJson, imageSize, measure, parseGltf, rebuild, trianglesOf, viewBytes, wrapRoot, writeGlb } from './glb.ts'
import type { Doc, Json } from './glb.ts'
import { CAPS, MAX_TEXTURE_PX, packPath } from './pack-types.ts'
import type { Game, Manifest, ManifestAsset, ModelKind, WantItem, WantList } from './pack-types.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Sanity ranges in metres for the largest side of the bounds, to catch a model in centimetres or inches. */
const SIZE_RANGE: Record<ModelKind, [number, number]> = { character: [0.3, 2.6], vehicle: [1.5, 8], prop: [0.05, 60] }

export class OverCapError extends Error {
  triangles: number
  cap: number
  constructor(name: string, triangles: number, cap: number, kind: string) {
    super(`${name}: ${triangles} triangles is over the ${cap} cap for a ${kind}. Pick a lighter model or simplify it; do not raise the cap.`)
    this.triangles = triangles
    this.cap = cap
  }
}

export interface Encoded { bytes: Buffer; mimeType: string }
/** Turns image bytes into (smaller) WebP of at most `maxPx`. Injected so tests need no cwebp. */
export type TextureEncoder = (bytes: Buffer, mimeType: string, maxPx: number) => Encoded
/** Compresses a finished .glb (gltfpack). Injected so tests need no network. */
export type Packer = (glb: Buffer, simplify?: WantItem['simplify']) => Buffer

/** The real encoder: cwebp. Small flat-colour atlases go lossless (palette edges stay crisp), bigger pictures lossy q85. */
export const cwebpEncoder: TextureEncoder = (bytes, mimeType, maxPx) => {
  const [w, h] = imageSize(bytes)
  if (mimeType === 'image/webp' && Math.max(w, h) <= maxPx) return { bytes, mimeType }
  const dir = mkdtempSync(join(tmpdir(), 'aw-tex-'))
  try {
    const input = join(dir, mimeType === 'image/jpeg' ? 'in.jpg' : mimeType === 'image/webp' ? 'in.webp' : 'in.png')
    const output = join(dir, 'out.webp')
    writeFileSync(input, bytes)
    const args = ['-quiet', ...(w * h <= 512 * 512 ? ['-lossless', '-z', '9'] : ['-q', '85', '-m', '6'])]
    if (Math.max(w, h) > maxPx) args.push('-resize', ...(w >= h ? [String(maxPx), '0'] : ['0', String(maxPx)]))
    execFileSync('cwebp', [...args, input, '-o', output], { stdio: 'ignore' })
    const out = readFileSync(output)
    // Never make a texture bigger (a tiny palette PNG can already be smaller than its WebP).
    return out.length < bytes.length || Math.max(w, h) > maxPx ? { bytes: out, mimeType: 'image/webp' } : { bytes, mimeType }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

/** gltfpack 1.3 through npx, as scripts/body/build-body.ts runs it. -kn/-km keep node and material names (wheels, clips' targets). */
export const gltfpack: Packer = (glb, simplify) => {
  const dir = mkdtempSync(join(tmpdir(), 'aw-pack-'))
  try {
    writeFileSync(join(dir, 'in.glb'), glb)
    const extra = simplify ? ['-si', String(simplify.ratio), ...(simplify.error !== undefined ? ['-se', String(simplify.error)] : [])] : []
    execFileSync('npx', ['-y', 'gltfpack@1.3.0', '-i', join(dir, 'in.glb'), '-o', join(dir, 'out.glb'), '-cc', '-kn', '-km', '-tr', ...extra], { stdio: 'ignore', cwd: repo })
    return readFileSync(join(dir, 'out.glb'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

export interface PreparedModel { glb: Buffer; triangles: number; size?: [number, number, number]; scale: number; atlasUses: string[] }

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex')
const mimeOf = (j: Json, i: number): string => String((j.images[i] as Json).mimeType ?? 'image/png')
type ModelItem = Pick<WantItem, 'kind' | 'scale' | 'fit' | 'zUp' | 'clips' | 'keepMeshes' | 'simplify'>

/**
 * Prepare one model, then compress it with `pack` (none: leave it uncompressed) and check the final triangle count against the
 * cap. `atlas` maps the SHA-256 of a source image to a shared file name (written by the caller): a model that uses such an image
 * points at the file instead of carrying a copy.
 */
export function prepareModel(name: string, file: Buffer, item: ModelItem, encode: TextureEncoder | undefined, pack: Packer | undefined, atlas: Record<string, string> = {}, dir = '.'): PreparedModel {
  const src = parseGltf(file, dir)
  const j = src.json
  const encoded: { bytes: Buffer; mimeType: string; uri?: string }[] = []
  const atlasUses: string[] = []
  ;((j.images ?? []) as Json[]).forEach((img, i) => {
    const bytes = Buffer.from(viewBytes(src, img.bufferView))
    const hash = sha(bytes)
    if (atlas[hash]) { encoded[i] = { bytes: Buffer.alloc(0), mimeType: 'image/webp', uri: atlas[hash] }; atlasUses.push(hash); return }
    encoded[i] = encode ? encode(bytes, mimeOf(j, i), MAX_TEXTURE_PX) : { bytes, mimeType: mimeOf(j, i) }
    const [w, h] = imageSize(encoded[i]!.bytes)
    if (Math.max(w, h) > MAX_TEXTURE_PX) throw new Error(`${name}: texture ${w}x${h} is over ${MAX_TEXTURE_PX} px and no encoder shrank it`)
  })
  let doc: Doc = rebuild(src, { clips: item.clips, keepMeshes: item.keepMeshes, images: encoded })
  const cap = CAPS[item.kind]
  if (!item.simplify || !pack) {
    const before = trianglesOf(doc.json)
    if (before > cap) throw new OverCapError(name, before, cap, item.kind)
  }
  const bounds = measure(doc)
  let scale = item.scale ?? 1
  if (item.fit) {
    if (!bounds) throw new Error(`${name}: fit needs a mesh`)
    const side = bounds.size[{ x: 0, y: 1, z: 2 }[item.fit.axis]]!
    if (!(side > 0)) throw new Error(`${name}: cannot fit an empty axis`)
    scale = item.fit.metres / side
  }
  if (bounds && !item.zUp && item.kind === 'character' && bounds.size[1] < 0.5 * bounds.size[2]) {
    throw new Error(`${name}: a character lying along Z looks Z-up; set zUp in the want list`)
  }
  doc = wrapRoot(doc, scale, item.zUp === true)
  let size: [number, number, number] | undefined
  const after = bounds && measure(doc)
  if (after) {
    size = after.size.map((x) => Math.round(x * 1000) / 1000) as [number, number, number]
    const [lo, hi] = SIZE_RANGE[item.kind]
    const longest = Math.max(...size)
    if (longest < lo || longest > hi) throw new Error(`${name}: ${longest.toFixed(2)} m is outside ${lo}-${hi} m for a ${item.kind}; set scale or fit in the want list`)
  }
  const glb = pack ? pack(writeGlb(doc), item.simplify) : writeGlb(doc)
  const triangles = trianglesOf(glbJson(glb))
  if (triangles > cap) throw new OverCapError(name, triangles, cap, item.kind)
  return { glb, triangles, size, scale, atlasUses }
}

export interface PrepareReport { as: string; game: Game; kind: string; triangles: number; bytesBefore: number; bytesAfter: number; size?: [number, number, number] }

/**
 * Prepare every model the want list names inside `packDir` (files already fetched by fetch-pack.ts), writing the result over the
 * fetched file, adding any shared atlas, and updating manifest.json. Throws on the first refusal BEFORE writing anything, so a bad
 * list never leaves a half-prepared pack. A model already prepared is left alone (preparing twice would scale it twice).
 */
export function preparePack(packDir: string, want: WantList, options: { encode?: TextureEncoder; pack?: Packer; dry?: boolean } = {}): PrepareReport[] {
  const manifestPath = join(packDir, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  const entryOf = (file: string): ManifestAsset | undefined => manifest.assets.find((a) => a.path === packPath(want.pack, file))
  const items = want.want.filter((w) => !entryOf(w.as)?.prepared)
  const inputs = items.map((w) => ({ w, bytes: readFileSync(join(packDir, w.as)) }))
  // Pass 1: which source images do several models of the same game use? (An atlas counts against one game's budget.)
  const uses = new Map<string, Set<string>>()
  const sources = new Map<string, Buffer>()
  for (const { w, bytes } of inputs) {
    const d = parseGltf(bytes, packDir)
    for (const img of (d.json.images ?? []) as Json[]) {
      const b = Buffer.from(viewBytes(d, img.bufferView))
      const key = `${w.game}:${sha(b)}`
      sources.set(key, b)
      uses.set(key, (uses.get(key) ?? new Set()).add(w.as))
    }
  }
  const atlases: { game: Game; hash: string; name: string; bytes: Buffer; user: string }[] = []
  for (const [key, users] of uses) {
    if (users.size < 2) continue
    const [game, hash] = key.split(':') as [Game, string]
    const source = sources.get(key)!
    const enc = options.encode ? options.encode(source, 'image/png', MAX_TEXTURE_PX) : { bytes: source, mimeType: 'image/png' }
    atlases.push({ game, hash, name: `atlas-${game}-${hash.slice(0, 8)}.${enc.mimeType === 'image/webp' ? 'webp' : 'png'}`, bytes: enc.bytes, user: [...users].sort()[0]! })
  }
  const results = inputs.map(({ w, bytes }) => {
    const atlas = Object.fromEntries(atlases.filter((a) => a.game === w.game).map((a) => [a.hash, a.name]))
    return { w, bytes, out: prepareModel(w.as, bytes, w, options.encode, options.pack, atlas, packDir) }
  })
  const report: PrepareReport[] = []
  for (const { w, bytes, out } of results) {
    const entry = entryOf(w.as)
    if (!entry) throw new Error(`${w.as} is not in ${manifestPath}; run fetch-pack first`)
    if (!options.dry) writeFileSync(join(packDir, w.as), out.glb)
    Object.assign(entry, { bytes: out.glb.length, game: w.game, kind: w.kind, triangles: out.triangles, prepared: true, sourceSha256: entry.sourceSha256 ?? sha(bytes) })
    report.push({ as: w.as, game: w.game, kind: w.kind, triangles: out.triangles, bytesBefore: bytes.length, bytesAfter: out.glb.length, size: out.size })
  }
  for (const a of atlases) {
    if (!options.dry) writeFileSync(join(packDir, a.name), a.bytes)
    // The atlas comes from the same place, under the same licence, as the first model that uses it.
    const from = entryOf(a.user)!
    const entry: ManifestAsset = {
      path: packPath(want.pack, a.name), licence: from.licence, source: from.source, ...(from.author ? { author: from.author } : {}), ...(from.attribution ? { attribution: from.attribution } : {}),
      bytes: a.bytes.length, game: a.game, kind: 'texture', licenceId: from.licenceId, ...(from.made ? { made: from.made } : {}), prepared: true, note: `Shared by ${[...uses.get(`${a.game}:${a.hash}`)!].sort().join(', ')}.`,
    }
    const at = manifest.assets.findIndex((x) => x.path === entry.path)
    if (at >= 0) manifest.assets[at] = entry
    else manifest.assets.push(entry)
  }
  if (!options.dry && report.length) {
    // The textures and buffers the models pointed at are inside the GLBs now (or in a shared atlas).
    for (const a of manifest.assets.filter((x) => x.temporary)) rmSync(join(packDir, a.path.slice(packPath(want.pack, '').length)), { force: true })
    manifest.assets = manifest.assets.filter((x) => !x.temporary)
    for (const sub of readdirSync(packDir, { withFileTypes: true })) if (sub.isDirectory() && !readdirSync(join(packDir, sub.name)).length) rmdirSync(join(packDir, sub.name))
  }
  if (!options.dry) writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return report
}

function cli(): void {
  const args = process.argv.slice(2)
  const opt = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
  const encode = args.includes('--keep-png') ? undefined : cwebpEncoder
  const pack = args.includes('--no-meshopt') ? undefined : gltfpack
  if (encode) { try { execFileSync('cwebp', ['-version'], { stdio: 'ignore' }) } catch { console.error('cwebp is not installed (brew install webp). Use --keep-png to skip texture conversion.'); process.exit(2) } }
  try {
    const file = opt('--file')
    if (file) {
      const fit = opt('--fit')?.split(':')
      const item: ModelItem = { kind: (opt('--kind') ?? 'prop') as ModelKind, scale: opt('--scale') ? Number(opt('--scale')) : undefined, fit: fit ? { axis: fit[0] as 'x' | 'y' | 'z', metres: Number(fit[1]) } : undefined, zUp: args.includes('--z-up') }
      const out = prepareModel(file, readFileSync(file), item, encode, pack, {}, dirname(resolve(file)))
      writeFileSync(opt('--out') ?? file, out.glb)
      console.log(`${opt('--out') ?? file}: ${out.triangles} triangles, ${out.glb.length} bytes, size ${out.size?.join(' x ')} m`)
      return
    }
    const name = opt('--pack')
    if (!name) throw new Error('give --pack <name> or --file <glb>')
    const want = JSON.parse(readFileSync(join(repo, 'scripts', 'assets', 'wants', `${name}.json`), 'utf8')) as WantList
    const dir = join(repo, 'public', 'assets', 'packs', name)
    if (!existsSync(dir)) throw new Error(`${dir} does not exist; run fetch-pack.ts first`)
    for (const r of preparePack(dir, want, { encode, pack, dry: args.includes('--dry') })) {
      console.log(`${r.game.padEnd(8)} ${r.kind.padEnd(9)} ${r.as.padEnd(28)} ${String(r.triangles).padStart(5)} tris  ${String(r.bytesBefore).padStart(8)} -> ${String(r.bytesAfter).padStart(7)} B  ${r.size ? `${r.size.join(' x ')} m` : ''}`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(error instanceof OverCapError ? 3 : 1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) cli()
