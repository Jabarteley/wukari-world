import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MeshoptDecoder } from 'meshoptimizer';
import { glbChunks, imageSize, writeGlb } from '../assets/glb.ts';
import type { Json } from '../assets/glb.ts';
import { REGIONS, validateAsset, validateHeroRecord } from './assets.ts';
import type { AssetReport, HeroAtlasBinding, HeroRecord } from './assets.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAW_LIMIT = 2 * 1024 * 1024;
const DECODED_LIMIT = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ENCODING_EXTENSIONS = new Set(['EXT_meshopt_compression', 'EXT_texture_webp']);
const RENDER_HELPER = 'scripts/scene-factory/blender/render.py';
const TYPESCRIPT_HELPER = 'scripts/scene-factory/render.ts';

type PreviewKind = 'kit' | 'hero';
type PreviewStage = 'validation' | 'derivation' | 'render' | 'evidence';

export interface PreviewDerivative {
  bytes: Buffer;
  sourceReport: AssetReport;
  sourceSha256: string;
  derivativeSha256: string;
  decodedViewSha256: readonly string[];
  decodedBytes: number;
  atlas?: { sourceSha256: string; pngSha256: string; width: number; height: number };
}

export interface PreviewDerivationInput {
  kind: PreviewKind;
  id: string;
  part?: string;
  source: Buffer;
  binding?: HeroAtlasBinding;
  dwebp?: string;
  scratchDirectory: string;
}

interface FramingReport {
  schema: 'allworld-scene-preview-framing';
  version: 1;
  status: 'incomplete' | 'complete';
  size: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  centre: [number, number, number];
  radius: number;
  fieldOfViewDegrees: 40;
  margin: 1.08;
  pitchDegrees: 25;
  views: Array<{ name: 'front' | 'side'; yawDegrees: 25 | 115; file: 'front.png' | 'side.png' }>;
  clip: { near: number; far: number };
}

interface PreviewManifest {
  schema: 'allworld-scene-preview';
  version: 1;
  status: 'incomplete' | 'complete';
  kind: PreviewKind;
  id: string;
  part?: string;
  size: number;
  source: { file: string; sha256?: string; bytes?: number; validation?: AssetReport };
  provenance?: { registry: 'scripts/scene-factory/heroes.json'; registrySha256: string; recordSha256: string; region: string };
  atlasKit?: { file: string; sha256: string; region: string };
  derivative?: { file: 'decoded.glb'; sha256: string; bytes: number; decodedBytes: number; decodedViewSha256: readonly string[]; atlas?: PreviewDerivative['atlas'] };
  images?: Array<{ file: 'front.png' | 'side.png'; sha256: string; bytes: number; width: number; height: number }>;
  helpers: Array<{ file: string; sha256: string }>;
  framing?: FramingReport;
  failure?: { stage: PreviewStage; code: string };
}

const fail = (message: string): never => { throw new Error(message); };
function check(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const cleanJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

function writeManifest(path: string, manifest: PreviewManifest): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, cleanJson(manifest), { flag: 'wx' });
  try { renameSync(temporary, path); }
  finally { rmSync(temporary, { force: true }); }
}

function removeEncodingExtension(target: Json, name: string): void {
  const extensions = target.extensions as Json | undefined;
  if (!extensions || !(name in extensions)) return;
  delete extensions[name];
  if (Object.keys(extensions).length === 0) delete target.extensions;
}

function decodeWebp(bytes: Buffer, dwebp: string, scratchDirectory: string): Buffer {
  const webp = join(scratchDirectory, 'atlas.webp');
  const png = join(scratchDirectory, 'atlas.png');
  writeFileSync(webp, bytes, { flag: 'wx' });
  execFileSync(dwebp, [webp, '-o', png], {
    stdio: ['ignore', 'ignore', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  const result = readFileSync(png);
  check(result.length <= DECODED_LIMIT, 'Decoded atlas exceeds preview memory cap');
  return result;
}

/** Keep the selected part's ancestor transforms and complete descendant hierarchy. */
export function selectKitPreviewPart(json: Json, part: string): void {
  const nodes = json.nodes as Json[];
  const target = nodes.findIndex(node => node.name === part);
  check(target >= 0, 'Preview part node is missing');
  const parents = new Map<number, number>();
  nodes.forEach((node, parent) => {
    for (const child of node.children ?? []) parents.set(child, parent);
  });
  const chain = new Set<number>();
  let current: number | undefined = target;
  while (current !== undefined) {
    check(!chain.has(current), 'Preview part ancestry contains a cycle');
    chain.add(current);
    current = parents.get(current);
  }
  const scene = json.scenes[json.scene ?? 0] as Json;
  const roots = (scene.nodes as number[]).filter(node => chain.has(node));
  check(roots.length === 1, 'Preview part must have one scene root');
  for (const ancestor of chain) {
    if (ancestor === target) continue;
    nodes[ancestor]!.children = (nodes[ancestor]!.children as number[]).filter(child => chain.has(child));
  }
  scene.nodes = roots;
}

/** Validate a shipped prepared asset, then derive an uncompressed Blender-only copy without changing the source bytes. */
export async function deriveValidatedPreview(input: PreviewDerivationInput): Promise<PreviewDerivative> {
  check(input.kind === 'kit' || input.kind === 'hero', 'Preview kind must be kit or hero');
  check(ID.test(input.id), 'Invalid preview id');
  check(input.source.length <= RAW_LIMIT, 'Preview source exceeds raw byte cap');
  check(existsSync(input.scratchDirectory) && lstatSync(input.scratchDirectory).isDirectory(), 'Preview scratch directory is missing');
  const sourceSha256 = sha256(input.source);
  const sourceReport = await validateAsset(input.source, input.kind, input.id, undefined, input.binding);
  check(sourceReport.sha256 === sourceSha256 && sha256(input.source) === sourceSha256, 'Source changed during validation');
  if (input.part !== undefined) check(input.kind === 'kit' && sourceReport.parts.some(part => part.node === input.part), 'Preview part must name a validated kit prop');

  await MeshoptDecoder.ready;
  const source = glbChunks(input.source);
  const json = structuredClone(source.json) as Json;
  const views = (json.bufferViews ?? []) as Json[];
  let decodedBytes = 0;
  const decoded = views.map((view, index) => {
    const encoding = view.extensions?.EXT_meshopt_compression as Json | undefined;
    let bytes: Buffer;
    if (encoding) {
      const result = new Uint8Array(view.byteLength);
      const start = encoding.byteOffset ?? 0;
      MeshoptDecoder.decodeGltfBuffer(
        result, encoding.count, encoding.byteStride,
        source.bin.subarray(start, start + encoding.byteLength), encoding.mode, encoding.filter ?? 'NONE',
      );
      bytes = Buffer.from(result);
    } else {
      const start = view.byteOffset ?? 0;
      bytes = Buffer.from(source.bin.subarray(start, start + view.byteLength));
    }
    decodedBytes += bytes.length;
    check(decodedBytes <= DECODED_LIMIT, `Decoded preview exceeds memory cap at view ${index}`);
    return bytes;
  });
  const decodedViewSha256 = decoded.map(sha256);

  let atlas: PreviewDerivative['atlas'];
  if (sourceReport.atlas) {
    const images = (json.images ?? []) as Json[];
    check(images.length === 1 && Number.isSafeInteger(images[0]!.bufferView), 'Validated atlas view is missing');
    const image = images[0]!;
    const imageView = image.bufferView as number;
    const sourceAtlas = decoded[imageView] ?? fail('Validated atlas bytes are missing');
    const png = decodeWebp(sourceAtlas, input.dwebp ?? 'dwebp', input.scratchDirectory);
    const [width, height] = imageSize(png);
    check(width === sourceReport.atlas.width && height === sourceReport.atlas.height, 'Decoded atlas dimensions changed');
    decodedBytes += png.length - sourceAtlas.length;
    check(decodedBytes <= DECODED_LIMIT, 'Decoded preview exceeds memory cap after atlas conversion');
    decoded[imageView] = png;
    image.mimeType = 'image/png';
    for (const texture of (json.textures ?? []) as Json[]) {
      const webp = texture.extensions?.EXT_texture_webp as Json | undefined;
      if (webp) texture.source = webp.source;
      removeEncodingExtension(texture, 'EXT_texture_webp');
    }
    atlas = { sourceSha256: sourceReport.atlas.sha256, pngSha256: sha256(png), width, height };
  }

  let offset = 0;
  const chunks: Buffer[] = [];
  views.forEach((view, index) => {
    const bytes = decoded[index]!;
    view.buffer = 0;
    view.byteOffset = offset;
    view.byteLength = bytes.length;
    removeEncodingExtension(view, 'EXT_meshopt_compression');
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    chunks.push(padded);
    offset += padded.length;
  });
  for (const key of ['extensionsUsed', 'extensionsRequired'] as const) {
    if (!Array.isArray(json[key])) continue;
    json[key] = (json[key] as string[]).filter(name => !ENCODING_EXTENSIONS.has(name));
    if ((json[key] as string[]).length === 0) delete json[key];
  }
  if (input.part !== undefined) selectKitPreviewPart(json, input.part);
  const bytes = writeGlb({ json, bin: Buffer.concat(chunks) });
  check(sha256(input.source) === sourceSha256, 'Source changed during preview derivation');
  return { bytes, sourceReport, sourceSha256, derivativeSha256: sha256(bytes), decodedViewSha256, decodedBytes, atlas };
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  check(at + 1 < args.length && !args[at + 1]!.startsWith('--'), `${name} needs a value`);
  return args[at + 1];
}

function parseCli(args: string[]): { kind: PreviewKind; id: string; part?: string; file: string; out: string; atlasKit?: string; blender: string; dwebp: string; size: number } {
  const known = new Set(['--kind', '--id', '--part', '--file', '--out', '--atlas-kit', '--blender', '--dwebp', '--size']);
  for (let i = 0; i < args.length; i += 2) check(known.has(args[i]!) && i + 1 < args.length, `Unknown or incomplete option ${args[i] ?? ''}`);
  const kind = option(args, '--kind');
  check(kind === 'kit' || kind === 'hero', '--kind must be kit or hero');
  const id = option(args, '--id') ?? fail('--id required');
  check(ID.test(id), 'Invalid preview id');
  const part = option(args, '--part');
  if (part !== undefined) check(kind === 'kit' && ID.test(part), '--part is only valid for a named kit prop');
  const size = Number(option(args, '--size') ?? '512');
  check(Number.isSafeInteger(size) && size >= 128 && size <= 1024, '--size must be an integer from 128 to 1024');
  return {
    kind, id, ...(part === undefined ? {} : { part }), file: resolve(option(args, '--file') ?? fail('--file required')),
    out: resolve(option(args, '--out') ?? fail('--out required')),
    atlasKit: option(args, '--atlas-kit') ? resolve(option(args, '--atlas-kit')!) : undefined,
    blender: option(args, '--blender') ?? 'blender', dwebp: option(args, '--dwebp') ?? 'dwebp', size,
  };
}

function regularFile(path: string, label: string): Buffer {
  check(existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), `${label} must be a regular file`);
  return readFileSync(path);
}

function canonicalHero(id: string): HeroRecord {
  const rows = JSON.parse(readFileSync(join(REPO_ROOT, 'scripts/scene-factory/heroes.json'), 'utf8')) as unknown;
  check(Array.isArray(rows), 'Canonical hero registry must be an array');
  const match = rows.filter((row: unknown) => row !== null && typeof row === 'object' && 'city' in row && row.city === id);
  check(match.length === 1, 'Expected exactly one canonical hero record');
  const record = match[0] ?? fail('Canonical hero record is missing');
  validateHeroRecord(record);
  return record;
}

function failureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown-failure';
  if (/valid|binding|atlas|source|region|record|raw byte/i.test(error.message)) return 'source-refused';
  if (/dwebp|decode|meshopt|memory cap|view/i.test(error.message)) return 'derivative-refused';
  if (/blender|render|png|framing/i.test(error.message)) return 'render-refused';
  return 'preview-failed';
}

async function cli(args = process.argv.slice(2)): Promise<void> {
  const options = parseCli(args);
  check(!existsSync(options.out), '--out must be a fresh directory');
  check(options.file !== options.out && !options.file.startsWith(`${options.out}/`), 'Input and output must be distinct');
  mkdirSync(options.out, { recursive: false });
  const manifestPath = join(options.out, 'manifest.json');
  const helpers = [TYPESCRIPT_HELPER, RENDER_HELPER].map(file => ({ file, sha256: sha256(readFileSync(join(REPO_ROOT, file))) }));
  const manifest: PreviewManifest = {
    schema: 'allworld-scene-preview', version: 1, status: 'incomplete', kind: options.kind, id: options.id,
    ...(options.part === undefined ? {} : { part: options.part }),
    size: options.size, source: { file: basename(options.file) }, helpers,
  };
  writeManifest(manifestPath, manifest);
  const scratch = join(options.out, '.decode');
  mkdirSync(scratch);
  let stage: PreviewStage = 'validation';
  try {
    const source = regularFile(options.file, 'Source asset');
    manifest.source.sha256 = sha256(source); manifest.source.bytes = source.length;
    let binding: HeroAtlasBinding | undefined;
    if (options.kind === 'kit') {
      check((REGIONS as readonly string[]).includes(options.id), 'Kit id must be a known region');
      check(options.atlasKit === undefined, 'Kit preview does not take --atlas-kit');
    } else {
      const hero = canonicalHero(options.id);
      const surface = hero.surface ?? fail('Canonical preview hero needs a regional surface');
      check(surface.kind === 'regional-atlas', 'Canonical preview hero needs a regional surface');
      const region = surface.region;
      const registryBytes = readFileSync(join(REPO_ROOT, 'scripts/scene-factory/heroes.json'));
      manifest.provenance = {
        registry: 'scripts/scene-factory/heroes.json', registrySha256: sha256(registryBytes),
        recordSha256: sha256(Buffer.from(JSON.stringify(hero))), region,
      };
      const atlasKit = options.atlasKit ?? fail('Regional hero preview requires --atlas-kit');
      const atlasBytes = regularFile(atlasKit, 'Atlas kit');
      const atlasReport = await validateAsset(atlasBytes, 'kit', region);
      const atlas = atlasReport.atlas ?? fail('Validated atlas identity is missing');
      check(HASH.test(atlas.sha256), 'Validated atlas identity is invalid');
      binding = { region, sha256: atlas.sha256 };
      manifest.atlasKit = { file: basename(atlasKit), sha256: atlasReport.sha256, region };
    }
    stage = 'derivation';
    const derived = await deriveValidatedPreview({
      kind: options.kind, id: options.id, part: options.part, source, binding, dwebp: options.dwebp, scratchDirectory: scratch,
    });
    manifest.source.validation = derived.sourceReport;
    const derivativePath = join(options.out, 'decoded.glb');
    writeFileSync(derivativePath, derived.bytes, { flag: 'wx' });
    manifest.derivative = {
      file: 'decoded.glb', sha256: derived.derivativeSha256, bytes: derived.bytes.length,
      decodedBytes: derived.decodedBytes, decodedViewSha256: derived.decodedViewSha256, atlas: derived.atlas,
    };
    writeManifest(manifestPath, manifest);

    stage = 'render';
    execFileSync(options.blender, [
      '--background', '--factory-startup', '--threads', '2', '--python-exit-code', '1',
      '--python', join(REPO_ROOT, RENDER_HELPER), '--', '--glb', derivativePath, '--out', options.out, '--size', String(options.size),
    ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 180_000, maxBuffer: 2 * 1024 * 1024 });

    stage = 'evidence';
    const framing = JSON.parse(readFileSync(join(options.out, 'framing.json'), 'utf8')) as FramingReport;
    check(framing.schema === 'allworld-scene-preview-framing' && framing.version === 1 && framing.status === 'complete' && framing.size === options.size, 'Render framing report is incomplete');
    manifest.images = (['front', 'side'] as const).map(name => {
      const file = `${name}.png` as const;
      const bytes = regularFile(join(options.out, file), `${name} image`);
      const [width, height] = imageSize(bytes);
      check(width === options.size && height === options.size, `${name} image dimensions changed`);
      return { file, sha256: sha256(bytes), bytes: bytes.length, width, height };
    });
    check(readFileSync(options.file).equals(source) && sha256(source) === manifest.source.sha256, 'Source changed while rendering preview');
    for (const helper of helpers) check(sha256(readFileSync(join(REPO_ROOT, helper.file))) === helper.sha256, 'Preview helper changed while rendering');
    manifest.framing = framing;
    manifest.status = 'complete';
    writeManifest(manifestPath, manifest);
    process.stdout.write(`${cleanJson({ status: manifest.status, manifest: 'manifest.json' })}`);
  } catch (error) {
    manifest.status = 'incomplete';
    manifest.failure = { stage, code: failureCode(error) };
    writeManifest(manifestPath, manifest);
    throw error;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  cli().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
