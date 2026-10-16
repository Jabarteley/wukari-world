// Clean up and convert a pack's downloaded models into game-ready GLBs.
//
//   node --experimental-strip-types scripts/assets/prepare.ts --pack kenney-racing-kit [--no-meshopt] [--keep-png] [--dry]
//   node --experimental-strip-types scripts/assets/prepare.ts --file in.glb --out out.glb --kind vehicle --fit y:1.4
//
// What it does to each file the want list names (scripts/assets/wants/<pack>.json), in place, then records the new size,
// triangle count and the SHA-256 of the file it started from in the pack's manifest.json:
//   1. reads glTF/GLB, keeps one scene, drops everything the scene does not reach (extra meshes, unused textures, animations
//      the want list did not name; clips are renamed to the game's names);
//   2. scales to metres (explicit `scale`, or `fit` one bounding axis to N metres) and turns Z-up models upright;
//   3. counts triangles and REFUSES a model over the cap for its kind (CAPS below). The refusal is the point: fix the want
//      list (pick a lighter model) rather than raising the cap;
//   4. re-encodes textures as WebP, 1024 px at most; textures that more than one model of the pack shares become ONE
//      atlas file the models point at, instead of being copied into each;
//   5. unless --no-meshopt, runs gltfpack for EXT_meshopt_compression and quantised vertices, the same tool and codec the
//      skinned body uses (scripts/body/build-body.ts). It needs `npx` and the network on first use.
// Textures need `cwebp` (brew install webp / apt install webp). Without it the script stops, unless --keep-png is given.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countTriangles, measure, parseGltf, rebuild, viewBytes, wrapRoot, writeGlb, type Doc, type Json } from './glb.ts';
import type { Manifest, WantItem, WantList } from './pack-types.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Hard triangle caps per kind of model, counted over everything the scene draws. A refusal, not a warning. */
export const CAPS = { character: 3000, vehicle: 1500, prop: 1500, set: 6000 } as const;
export type Kind = keyof typeof CAPS;
export const MAX_TEXTURE_PX = 1024;
/** Sanity ranges in metres for the largest bounding-box side, to catch a model that is in centimetres or inches. */
const SIZE_RANGE: Record<Kind, [number, number]> = { character: [0.3, 2.6], vehicle: [1.5, 8], prop: [0.02, 40], set: [1, 400] };

export class OverCapError extends Error {
  triangles: number;
  cap: number;
  kind: string;
  constructor(name: string, triangles: number, cap: number, kind: string) {
    super(`${name}: ${triangles} triangles is over the ${cap} cap for a ${kind}. Pick a lighter model or a lighter kind; do not raise the cap.`);
    this.triangles = triangles; this.cap = cap; this.kind = kind;
  }
}

export interface Encoded { bytes: Buffer; mimeType: string }
/** Turns image bytes into (smaller) WebP of at most `maxPx`. Injected so tests need no cwebp. */
export type TextureEncoder = (bytes: Buffer, mimeType: string, maxPx: number) => Encoded;

/** Pixel size of a PNG, JPEG or WebP, read from its header. */
export function imageSize(b: Buffer): [number, number] {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tag = b.toString('ascii', 12, 16);
    if (tag === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (tag === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (tag === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]!;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error('unreadable image size');
}

/** The real encoder: cwebp. Small flat-colour atlases go lossless (palette edges stay crisp), bigger pictures lossy q85. */
export const cwebpEncoder: TextureEncoder = (bytes, mimeType, maxPx) => {
  if (mimeType === 'image/webp') { const [w, h] = imageSize(bytes); if (Math.max(w, h) <= maxPx) return { bytes, mimeType }; }
  const dir = mkdtempSync(join(tmpdir(), 'aw-tex-'));
  try {
    const input = join(dir, mimeType === 'image/jpeg' ? 'in.jpg' : mimeType === 'image/webp' ? 'in.webp' : 'in.png');
    const output = join(dir, 'out.webp');
    writeFileSync(input, bytes);
    const [w, h] = imageSize(bytes);
    const args = ['-quiet', ...(w * h <= 512 * 512 ? ['-lossless', '-z', '9'] : ['-q', '85', '-m', '6'])];
    if (Math.max(w, h) > maxPx) args.push('-resize', ...(w >= h ? [String(maxPx), '0'] : ['0', String(maxPx)]));
    execFileSync('cwebp', [...args, input, '-o', output], { stdio: 'ignore' });
    const out = readFileSync(output);
    // Never make a texture bigger (a tiny palette PNG can already be smaller than its WebP).
    return out.length < bytes.length || Math.max(w, h) > maxPx ? { bytes: out, mimeType: 'image/webp' } : { bytes, mimeType };
  } finally { rmSync(dir, { recursive: true, force: true }); }
};

export interface PreparedModel { glb: Buffer; triangles: number; size?: [number, number, number]; scale: number; atlasUses: string[] }

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
const mimeOf = (j: Json, i: number): string => String((j.images[i] as Json).mimeType ?? 'image/png');

/**
 * Prepare one model. `atlas` maps the SHA-256 of a source image to a shared file name (already written by the caller): a
 * model that uses such an image points at the file instead of carrying a copy.
 */
export function prepareModel(name: string, file: Buffer, item: Pick<WantItem, 'kind' | 'scale' | 'fit' | 'zUp' | 'clips' | 'dropMeshes'>, encode: TextureEncoder | undefined, atlas: Record<string, string> = {}, dir = '.'): PreparedModel {
  if (item.kind === 'raw') throw new Error(`${name}: raw files are not models`);
  const src = parseGltf(file, dir);
  const j = src.json;
  const encoded: { bytes: Buffer; mimeType: string; uri?: string }[] = [];
  const atlasUses: string[] = [];
  ((j.images ?? []) as Json[]).forEach((img, i) => {
    const bytes = Buffer.from(viewBytes(src, img.bufferView));
    const hash = sha(bytes);
    if (atlas[hash]) { encoded[i] = { bytes: Buffer.alloc(0), mimeType: 'image/webp', uri: atlas[hash] }; atlasUses.push(hash); return; }
    encoded[i] = encode ? { ...encode(bytes, mimeOf(j, i), MAX_TEXTURE_PX) } : { bytes, mimeType: mimeOf(j, i) };
    const [w, h] = imageSize(encoded[i]!.bytes);
    if (Math.max(w, h) > MAX_TEXTURE_PX) throw new Error(`${name}: texture ${w}x${h} is over ${MAX_TEXTURE_PX}px and no encoder shrank it`);
  });
  let doc: Doc = rebuild(src, { clips: item.clips, dropMeshes: item.dropMeshes, images: encoded });
  const triangles = item.dropMeshes ? 0 : countTriangles(doc);
  const cap = CAPS[item.kind];
  if (triangles > cap) throw new OverCapError(name, triangles, cap, item.kind);

  const bounds = measure(doc);
  let scale = item.scale ?? 1;
  if (item.fit) {
    if (!bounds) throw new Error(`${name}: fit needs a mesh`);
    const side = bounds.size[{ x: 0, y: 1, z: 2 }[item.fit.axis]]!;
    if (!(side > 0)) throw new Error(`${name}: cannot fit an empty axis`);
    scale = item.fit.metres / side;
  }
  if (bounds && !item.zUp && item.kind === 'character' && bounds.size[1] < 0.5 * bounds.size[2]) {
    throw new Error(`${name}: a character lying along Z looks Z-up; set zUp in the want list`);
  }
  doc = wrapRoot(doc, scale, item.zUp === true);
  let size: [number, number, number] | undefined;
  const after = bounds && measure(doc);
  if (after) {
    size = after.size.map((x) => Math.round(x * 1000) / 1000) as [number, number, number];
    const [lo, hi] = SIZE_RANGE[item.kind];
    const longest = Math.max(...size);
    if (longest < lo || longest > hi) throw new Error(`${name}: ${longest.toFixed(2)} m is outside ${lo}-${hi} m for a ${item.kind}; set scale or fit in the want list`);
  }
  return { glb: writeGlb(doc), triangles, size, scale, atlasUses };
}

/** Optional gltfpack pass (meshopt compression, quantised vertices). Keeps node names and the scene structure. */
export function meshoptPass(glb: Buffer, cwd: string): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'aw-pack-'));
  try {
    writeFileSync(join(dir, 'in.glb'), glb);
    execFileSync('npx', ['-y', 'gltfpack@1.3.0', '-i', join(dir, 'in.glb'), '-o', join(dir, 'out.glb'), '-cc', '-kn', '-km', '-tr'], { stdio: 'ignore', cwd });
    return readFileSync(join(dir, 'out.glb'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

export interface PrepareReport { as: string; game: string; kind: string; triangles: number; bytesBefore: number; bytesAfter: number; size?: [number, number, number] }

/**
 * Prepare every model the want list names inside `packDir` (files already fetched by fetch-pack.ts), writing the result
 * over the fetched file, adding any shared atlas, and updating manifest.json. Refuses (throws) on the first over-cap model
 * BEFORE writing anything, so a bad list never leaves a half-prepared pack.
 */
export function preparePack(packDir: string, want: WantList, options: { encode?: TextureEncoder; meshopt?: boolean; dry?: boolean } = {}): PrepareReport[] {
  const manifestPath = join(packDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  // A file already prepared is left alone (preparing twice would scale it twice).
  const items = want.want.filter((w) => w.kind !== 'raw' && !manifest.assets.find((a) => a.path === `assets/packs/${want.pack}/${w.as}`)?.prepared);
  const inputs = items.map((w) => ({ w, bytes: readFileSync(join(packDir, w.as)) }));
  // Pass 1: which source images are used by more than one model of the pack?
  const uses = new Map<string, number>();
  const sources = new Map<string, Buffer>();
  for (const { w, bytes } of inputs) {
    const d = parseGltf(bytes, packDir);
    const mine = new Set<string>();
    for (const img of (d.json.images ?? []) as Json[]) { const b = Buffer.from(viewBytes(d, img.bufferView)); const h = sha(b); mine.add(h); sources.set(h, b); }
    void w;
    for (const h of mine) uses.set(h, (uses.get(h) ?? 0) + 1);
  }
  const atlas: Record<string, string> = {};
  const atlasFiles: { name: string; bytes: Buffer }[] = [];
  const shared = [...uses].filter(([, n]) => n > 1).map(([h]) => h);
  // Reorder so a shared atlas has a stable name: atlas-<first 8 of source sha>.webp
  for (const h of shared) {
    const enc = options.encode ? options.encode(sources.get(h)!, 'image/png', MAX_TEXTURE_PX) : { bytes: sources.get(h)!, mimeType: 'image/png' };
    const name = `atlas-${h.slice(0, 8)}.${enc.mimeType === 'image/webp' ? 'webp' : 'png'}`;
    atlas[h] = name; atlasFiles.push({ name, bytes: enc.bytes });
  }
  const results = inputs.map(({ w, bytes }) => {
    const out = prepareModel(w.as, bytes, w, options.encode, atlas, packDir);
    return { w, bytes, out };
  });
  const report: PrepareReport[] = [];
  const first = manifest.assets[0];
  for (const { w, bytes, out } of results) {
    let glb = out.glb;
    if (options.meshopt) glb = meshoptPass(glb, repo);
    const path = `assets/packs/${want.pack}/${w.as}`;
    const entry = manifest.assets.find((a) => a.path === path);
    if (!entry) throw new Error(`${w.as} is not in ${manifestPath}; run fetch-pack first`);
    if (!options.dry) writeFileSync(join(packDir, w.as), glb);
    Object.assign(entry, { bytes: glb.length, game: w.game, kind: w.kind, triangles: out.triangles, prepared: true, sourceSha256: entry.prepared ? entry.sourceSha256 : sha(bytes), sourcePath: entry.sourcePath ?? w.from });
    report.push({ as: w.as, game: w.game, kind: w.kind, triangles: out.triangles, bytesBefore: bytes.length, bytesAfter: glb.length, size: out.size });
  }
  for (const f of atlasFiles) {
    const path = `assets/packs/${want.pack}/${f.name}`;
    if (!options.dry) writeFileSync(join(packDir, f.name), f.bytes);
    const users = results.filter((r) => r.out.atlasUses.length).map((r) => r.w.game);
    const entry = { path, source: want.source, url: first?.url ?? want.page, licence: want.licence, ...(want.attribution ? { attribution: want.attribution } : {}), bytes: f.bytes.length, game: users[0], kind: 'texture', prepared: true };
    const at = manifest.assets.findIndex((a) => a.path === path);
    if (at >= 0) manifest.assets[at] = entry as never; else manifest.assets.push(entry as never);
  }
  if (!options.dry && report.length) {
    // The textures and buffers the models pointed at are inside the GLBs now (or in the shared atlas).
    for (const a of manifest.assets.filter((x) => x.temporary)) rmSync(join(packDir, a.path.slice(`assets/packs/${want.pack}/`.length)), { force: true });
    manifest.assets = manifest.assets.filter((x) => !x.temporary);
    for (const sub of readdirSync(packDir, { withFileTypes: true })) if (sub.isDirectory() && !readdirSync(join(packDir, sub.name)).length) rmdirSync(join(packDir, sub.name));
  }
  if (!options.dry) writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return report;
}

function cli(): void {
  const args = process.argv.slice(2);
  const opt = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const encode = args.includes('--keep-png') ? undefined : cwebpEncoder;
  if (encode) { try { execFileSync('cwebp', ['-version'], { stdio: 'ignore' }); } catch { console.error('cwebp is not installed (brew install webp). Use --keep-png to skip texture conversion.'); process.exit(2); } }
  try {
    if (opt('--file')) {
      const kind = (opt('--kind') ?? 'prop') as Kind;
      const fit = opt('--fit')?.split(':');
      const out = prepareModel(opt('--file')!, readFileSync(opt('--file')!), { kind, scale: opt('--scale') ? Number(opt('--scale')) : undefined, fit: fit ? { axis: fit[0] as 'x', metres: Number(fit[1]) } : undefined, zUp: args.includes('--z-up') }, encode, {}, dirname(resolve(opt('--file')!)));
      writeFileSync(opt('--out')!, !args.includes('--no-meshopt') ? meshoptPass(out.glb, repo) : out.glb);
      console.log(`${opt('--out')}: ${out.triangles} triangles, ${out.glb.length} bytes, size ${out.size?.join(' x ')} m`);
      return;
    }
    const pack = opt('--pack');
    if (!pack) throw new Error('give --pack <name> or --file <glb>');
    const want = JSON.parse(readFileSync(join(repo, 'scripts', 'assets', 'wants', `${pack}.json`), 'utf8')) as WantList;
    const dir = join(repo, 'public', 'assets', 'packs', pack);
    if (!existsSync(dir)) throw new Error(`${dir} does not exist; run fetch-pack.ts first`);
    for (const r of preparePack(dir, want, { encode, meshopt: !args.includes('--no-meshopt'), dry: args.includes('--dry') })) {
      console.log(`${r.game.padEnd(8)} ${r.kind.padEnd(9)} ${r.as.padEnd(32)} ${String(r.triangles).padStart(5)} tris  ${String(r.bytesBefore).padStart(8)} -> ${String(r.bytesAfter).padStart(8)} B  ${r.size ? r.size.join(' x ') + ' m' : ''}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error instanceof OverCapError ? 3 : 1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) cli();
