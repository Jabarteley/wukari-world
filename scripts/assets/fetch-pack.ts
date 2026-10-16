// Get a named pack, keep only the files its want list names, and record every kept file in a manifest.
//
//   node --experimental-strip-types scripts/assets/fetch-pack.ts --pack kenney-racing-kit [--archive /path/to/pack.zip]
//   node --experimental-strip-types scripts/assets/fetch-pack.ts --all
//
// The want list is scripts/assets/wants/<pack>.json (shape in pack-types.ts). Output: public/assets/packs/<pack>/<as> for every
// wanted file, LICENSE.txt (the source's own licence text; not for `own`), and scripts/assets/manifests/<pack>.json with, for each
// file, the source page, licence, author, attribution text (CC BY only) and byte size. Run prepare.ts afterwards to clean, scale and compress the models.
//
// Sources (docs/ASSET-PIPELINE.md says which were tried):
//   kenney     kenney.nl asset page -> the zip link on the page; the page must say CC0.
//   github     a file in a public repository at a pinned commit (KayKit publishes its packs there); the repository's licence
//              file must say CC0 or CC BY.
//   itch       itch.io free "name your own price" packs (Quaternius, KayKit): the requests the web page makes (download_url,
//              then file/<id>) with a cookie and the page's CSRF token. If itch.io changes that flow the script stops and says to
//              download the zip in a browser and pass it with --archive.
//   polypizza  poly.pizza model page -> the static.poly.pizza file link; licence and author are read from the page.
//   own        built here: Blender runs scripts/assets/blender/<script>.py for each item (BLENDER names the binary).
// The licence is checked against the source's own words (page or licence file) and the want list's claim; any mismatch stops
// the fetch. Only CC0 and CC BY are accepted from others. Archives given with --archive are read, never unpacked or run.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LICENCE_IDS, MANIFEST_FORMAT, OWN_SOURCE, packPath } from './pack-types.ts';
import type { LicenceId, Manifest, ManifestAsset, WantItem, WantList } from './pack-types.ts';
import { readZip } from './zip.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export class ManualDownloadError extends Error {}

export interface FetchOptions {
  fetchFn?: typeof fetch;
  /** Directory that holds the pack folders (default public/assets/packs). */
  outRoot?: string;
  /** Directory that holds the manifests (default scripts/assets/manifests). */
  manifestsRoot?: string;
  /** A zip already on disk (manual download); skips the download but not the licence checks. */
  archive?: Buffer;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  /** Builds an own item (default: runBlender). */
  blender?: (script: string, out: string, args?: string[]) => Buffer;
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

async function withRetry<T>(run: () => Promise<T>, sleep: (ms: number) => Promise<void>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await run(); } catch (error) {
      last = error;
      if (error instanceof ManualDownloadError || (error instanceof Error && /^HTTP 4/.test(error.message))) throw error;
      await sleep(20_000);
    }
  }
  throw last;
}

class Session {
  cookies = new Map<string, string>();
  fetchFn: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  constructor(fetchFn: typeof fetch, sleep: (ms: number) => Promise<void>) { this.fetchFn = fetchFn; this.sleep = sleep; }
  async request(url: string, init: RequestInit = {}): Promise<Response> {
    return withRetry(async () => {
      const headers = new Headers(init.headers);
      if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      headers.set('user-agent', 'allworld-asset-fetch (+https://joinallworld.com)');
      const res = await this.fetchFn(url, { ...init, headers, redirect: 'follow' });
      for (const line of res.headers.getSetCookie?.() ?? []) { const [pair] = line.split(';'); const eq = pair!.indexOf('='); if (eq > 0) this.cookies.set(pair!.slice(0, eq), pair!.slice(eq + 1)); }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    }, this.sleep);
  }
  text = async (url: string, init?: RequestInit): Promise<string> => (await this.request(url, init)).text();
  bytes = async (url: string, max = MAX_ARCHIVE_BYTES): Promise<Buffer> => {
    const b = Buffer.from(await (await this.request(url)).arrayBuffer());
    if (b.length > max) throw new Error(`${url} is ${b.length} bytes, over the ${max} limit`);
    return b;
  };
}

/** Files a glTF/GLB points at by name (external textures and buffers), as written in the file. */
export function externalUris(bytes: Buffer): string[] {
  let json: { images?: { uri?: string }[]; buffers?: { uri?: string }[] };
  if (bytes.readUInt32LE(0) === 0x46546c67) json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  else if (bytes[0] === 0x7b) json = JSON.parse(bytes.toString('utf8'));
  else return [];
  return [...(json.images ?? []), ...(json.buffers ?? [])].map((x) => x.uri).filter((u): u is string => typeof u === 'string' && !u.startsWith('data:'));
}

const unescapeJson = (s: string): string => s.replace(/\\\//g, '/');

/** The zip link on a Kenney asset page; the page must say CC0. */
async function kenneyArchive(s: Session, want: WantList): Promise<Buffer> {
  const page = await s.text(want.page);
  if (want.licenceId !== 'CC0-1.0' || !/Creative Commons CC0/i.test(page)) throw new Error(`${want.page} does not state CC0; refusing`);
  const zip = /https:\/\/kenney\.nl\/media\/[^"'\s]+\.zip/.exec(page)?.[0];
  if (!zip) throw new ManualDownloadError(`No zip link on ${want.page}; download it in a browser and pass --archive <file>`);
  return s.bytes(zip);
}

/** itch.io free download without a browser: csrf token, download_url, upload id, file url. */
async function itchArchive(s: Session, want: WantList): Promise<Buffer> {
  try {
    const page = await s.text(want.page);
    const csrf = /name="csrf_token" value="([^"]+)"/.exec(page)?.[1];
    if (!csrf) throw new Error('no csrf token on the page');
    const form = (token: string): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' }, body: `csrf_token=${encodeURIComponent(token)}` });
    const dl = JSON.parse(await s.text(`${want.page}/download_url`, form(csrf))) as { url?: string };
    if (!dl.url) throw new Error('download_url gave no url (is the pack paid?)');
    const downloadPage = await s.text(dl.url);
    const csrf2 = /csrf_token" value="([^"]+)"/.exec(downloadPage)?.[1] ?? csrf;
    const uploads = [...downloadPage.matchAll(/data-upload_id="(\d+)"[\s\S]*?title="([^"]*)" class="name"/g)].map((m) => ({ id: m[1]!, name: m[2]! }));
    const rx = want.itchUpload ? new RegExp(want.itchUpload) : /./;
    const pick = uploads.find((u) => rx.test(u.name));
    if (!pick) throw new Error(`no upload matching ${rx} (found: ${uploads.map((u) => u.name).join(', ') || 'none'})`);
    const file = JSON.parse(await s.text(`${want.page}/file/${pick.id}?source=game_download`, form(csrf2))) as { url?: string };
    if (!file.url) throw new Error('file request gave no url');
    return await s.bytes(unescapeJson(file.url));
  } catch (error) {
    throw new ManualDownloadError(`itch.io download failed (${error instanceof Error ? error.message : error}). Download the free zip from ${want.page} in a browser and run again with --archive <file.zip>`);
  }
}

function pickEntry(entries: ReturnType<typeof readZip>, from: string): ReturnType<typeof readZip>[number] {
  const exact = entries.find((e) => e.name === from);
  if (exact) return exact;
  const tail = entries.filter((e) => e.name.endsWith(`/${from}`));
  if (tail.length === 1) return tail[0]!;
  throw new Error(`"${from}" ${tail.length ? 'matches several files' : 'is not in the archive'}`);
}

const CC_RE: [RegExp, LicenceId][] = [[/creativecommons\.org\/publicdomain\/zero\/1\.0/, 'CC0-1.0'], [/creativecommons\.org\/licenses\/by\/3\.0/, 'CC-BY-3.0'], [/creativecommons\.org\/licenses\/by\/4\.0/, 'CC-BY-4.0']];

/** Poly Pizza: the page names licence and author; the file is a static GLB link. */
async function polyPizzaItem(s: Session, item: WantItem, want: WantList): Promise<{ bytes: Buffer; url: string; licenceId: LicenceId; author?: string; attribution?: string }> {
  const page = await s.text(item.page!);
  const licence = CC_RE.find(([re]) => re.test(page))?.[1];
  if (!licence) throw new Error(`${item.page}: no recognised CC licence on the page; refusing`);
  const expected = item.licenceId ?? want.licenceId;
  if (licence !== expected) throw new Error(`${item.page}: page says ${licence} but the want list says ${expected}`);
  const link = /https:\/\/static\.poly\.pizza\/[^"'\s]+\.glb/.exec(page)?.[0];
  if (!link) throw new ManualDownloadError(`${item.page}: no GLB link on the page; download it in a browser into the pack folder`);
  const author = /href="\/u\/([^"]+)"/.exec(page)?.[1];
  const title = /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/.exec(page)?.[1] ?? item.as;
  const maker = item.author ?? (author ? decodeURIComponent(author) : undefined);
  const attribution = item.attribution ?? (licence.startsWith('CC-BY') ? `"${title.replace(/ \| Poly Pizza$/, '').replace(/ - Free Model By .*$/i, '')}" by ${maker ?? 'unknown author'}, ${licence.replace('CC-BY-', 'CC BY ')}, via Poly Pizza (${item.page})` : undefined);
  return { bytes: await s.bytes(link, MAX_FILE_BYTES), url: item.page!, licenceId: licence, author: maker, attribution };
}

/** The licence words a licence file must contain for the want list's claim to stand. */
export function licenceTextSays(text: string, id: LicenceId): boolean {
  if (id === 'CC0-1.0') return /Creative Commons Zero|\bCC0\b|publicdomain\/zero/i.test(text);
  if (id === 'CC-BY-3.0') return /creativecommons\.org\/licenses\/by\/3\.0|Attribution 3\.0/i.test(text);
  if (id === 'CC-BY-4.0') return /creativecommons\.org\/licenses\/by\/4\.0|Attribution 4\.0/i.test(text);
  return false;
}

/** The given 1-based line ranges of a licence file, trimmed, with a line saying where the whole file is. */
export function licenceExcerpt(full: Buffer, ranges: [number, number][]): Buffer {
  const lines = full.toString('utf8').replace(/\r\n/g, '\n').split('\n');
  const kept = ranges.flatMap(([a, b]) => { if (!(a >= 1 && b >= a && b <= lines.length)) throw new Error(`licence lines ${a}-${b} are not in the file`); return lines.slice(a - 1, b).map((l) => l.trim()); });
  return Buffer.from(`${kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n\n(The licence lines of the pack's licence file; the whole file is with the pack at its source.)\n`);
}

/** The Blender binary: BLENDER, else `blender` on the PATH, else the usual macOS place. */
export function blenderBinary(env: NodeJS.ProcessEnv = process.env): string {
  if (env.BLENDER) return env.BLENDER;
  const mac = '/Applications/Blender.app/Contents/MacOS/Blender';
  return existsSync(mac) ? mac : 'blender';
}

/** Run scripts/assets/blender/<script>.py headless; it writes one .glb to `out`. */
export function runBlender(script: string, out: string, args: string[] = []): Buffer {
  if (!/^[a-z0-9-]+$/.test(script)) throw new Error(`blender script name ${script} must be lower-case letters, digits and dashes`);
  const file = join(repo, 'scripts', 'assets', 'blender', `${script}.py`);
  if (!existsSync(file)) throw new Error(`${file} does not exist`);
  execFileSync(blenderBinary(), ['--background', '--factory-startup', '--python-exit-code', '1', '--python', file, '--', '--out', out, ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
  return readFileSync(out);
}

export async function fetchPack(want: WantList, options: FetchOptions = {}): Promise<Manifest> {
  if (!Object.hasOwn(LICENCE_IDS, want.licenceId)) throw new Error(`${want.pack}: licence ${want.licenceId} is not allowed`);
  const ours = want.kind === 'own';
  if (ours !== (want.licenceId === 'AGPL-3.0-or-later')) throw new Error(`${want.pack}: only own packs are ours, and own packs are always ours`);
  if (want.licenceId.startsWith('CC-BY') && !want.attribution && want.kind !== 'polypizza') throw new Error(`${want.pack}: CC BY needs an attribution text`);
  const session = new Session(options.fetchFn ?? fetch, options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))));
  const dir = join(options.outRoot ?? join(repo, 'public', 'assets', 'packs'), want.pack);
  const assets: ManifestAsset[] = [];
  const files: { name: string; bytes: Buffer }[] = [];
  const base = (item?: WantItem): Pick<ManifestAsset, 'licence' | 'licenceId' | 'source' | 'author' | 'attribution'> => {
    const licenceId = item?.licenceId ?? want.licenceId;
    const attribution = item?.attribution ?? want.attribution;
    return { licence: LICENCE_IDS[licenceId], licenceId, source: ours ? OWN_SOURCE : want.page, author: item?.author ?? want.author, ...(attribution ? { attribution } : {}) };
  };
  const keepLicence = (full: Buffer, name: string): void => {
    const text = want.licenceLines ? licenceExcerpt(full, want.licenceLines) : full;
    if (!licenceTextSays(text.toString('utf8'), want.licenceId)) throw new Error(`${want.pack}: ${name} does not state ${want.licenceId}; refusing`);
    files.push({ name: 'LICENSE.txt', bytes: text });
    assets.push({ path: packPath(want.pack, 'LICENSE.txt'), ...base(), bytes: text.length, kind: 'licence' });
  };
  const keepModel = (item: WantItem, bytes: Buffer, extra: Partial<ManifestAsset> = {}): void => {
    if (bytes.length > MAX_FILE_BYTES) throw new Error(`${item.as} is ${bytes.length} bytes: too big to keep`);
    files.push({ name: item.as, bytes });
    assets.push({ path: packPath(want.pack, item.as), ...base(item), bytes: bytes.length, triangles: 0, game: item.game, kind: item.kind, sourceSha256: sha(bytes), ...(item.note ? { note: item.note } : {}), ...extra });
  };

  if (want.kind === 'own') {
    const work = mkdtempSync(join(tmpdir(), 'aw-own-'));
    try {
      for (const item of want.want) {
        if (!item.blender) throw new Error(`${want.pack}: ${item.as} needs "blender"`);
        const bytes = (options.blender ?? runBlender)(item.blender.script, join(work, item.as), item.blender.args);
        keepModel(item, bytes, { made: `scripts/assets/blender/${item.blender.script}.py` });
      }
    } finally { rmSync(work, { recursive: true, force: true }); }
  } else if (want.kind === 'polypizza') {
    for (const item of want.want) {
      if (!item.page) throw new Error(`${want.pack}: ${item.as} needs a page`);
      const got = await polyPizzaItem(session, item, want);
      keepModel({ ...item, licenceId: got.licenceId, author: got.author, attribution: got.attribution }, got.bytes);
      assets[assets.length - 1]!.source = got.url;
    }
  } else if (want.kind === 'github') {
    if (!want.repo || !/^[\w.-]+\/[\w.-]+$/.test(want.repo) || !want.ref || !/^[0-9a-f]{40}$/.test(want.ref)) throw new Error(`${want.pack}: github needs repo "owner/name" and a 40-hex commit in ref`);
    const raw = (path: string): string => `https://raw.githubusercontent.com/${want.repo}/${want.ref}/${path.split('/').map(encodeURIComponent).join('/')}`;
    keepLicence(await session.bytes(raw(want.licenceFile ?? 'LICENSE.txt'), MAX_FILE_BYTES), want.licenceFile ?? 'LICENSE.txt');
    for (const item of want.want) {
      if (!item.from) throw new Error(`${want.pack}: ${item.as} needs "from"`);
      const bytes = await session.bytes(raw(item.from), MAX_FILE_BYTES);
      if (externalUris(bytes).length) throw new Error(`${item.from} points at other files; use a .glb that holds everything`);
      keepModel(item, bytes, { from: item.from });
    }
  } else {
    const archive = options.archive ?? (want.kind === 'kenney' ? await kenneyArchive(session, want) : await itchArchive(session, want));
    const entries = readZip(archive);
    const licenceName = want.licenceFile ?? 'License.txt';
    keepLicence(pickEntry(entries, licenceName).read(), `the archive's ${licenceName}`);
    for (const item of want.want) {
      if (!item.from) throw new Error(`${want.pack}: ${item.as} needs "from"`);
      const bytes = pickEntry(entries, item.from).read();
      if (/\.(glb|gltf)$/i.test(item.as)) {
        for (const uri of externalUris(bytes)) {
          const rel = posix.normalize(decodeURIComponent(uri));
          if (rel.startsWith('..') || posix.isAbsolute(rel)) throw new Error(`${item.from}: refuses to read ${uri} outside the pack`);
          if (files.some((f) => f.name === rel)) continue;
          const dep = pickEntry(entries, posix.join(posix.dirname(item.from), rel)).read();
          files.push({ name: rel, bytes: dep });
          assets.push({ path: packPath(want.pack, rel), ...base(item), bytes: dep.length, kind: 'texture', temporary: true });
        }
      }
      keepModel(item, bytes, { from: item.from });
    }
  }
  // A fresh folder: files the list no longer wants do not linger.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of files) { mkdirSync(dirname(join(dir, f.name)), { recursive: true }); writeFileSync(join(dir, f.name), f.bytes); }
  const manifest: Manifest = { format: MANIFEST_FORMAT, pack: want.pack, name: want.name, kind: want.kind, page: want.page, author: want.author, licenceId: want.licenceId, fetched: (options.now ?? (() => new Date()))().toISOString().slice(0, 10), assets };
  const manifests = options.manifestsRoot ?? join(repo, 'scripts', 'assets', 'manifests');
  mkdirSync(manifests, { recursive: true });
  writeFileSync(join(manifests, `${want.pack}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export const loadWant = (pack: string): WantList => JSON.parse(readFileSync(join(repo, 'scripts', 'assets', 'wants', `${pack}.json`), 'utf8')) as WantList;

async function cli(): Promise<void> {
  const args = process.argv.slice(2);
  const opt = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const { readdirSync } = await import('node:fs');
  const packs = args.includes('--all') ? readdirSync(join(repo, 'scripts', 'assets', 'wants')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [opt('--pack') ?? ''];
  const archivePath = opt('--archive');
  if (!packs[0] || (archivePath && packs.length > 1)) { console.error('usage: fetch-pack.ts --pack <name> [--archive file.zip] | --all'); process.exit(1); }
  if (archivePath && !existsSync(archivePath)) { console.error(`${archivePath} does not exist`); process.exit(1); }
  let failed = 0;
  for (const pack of packs) {
    try {
      const m = await fetchPack(loadWant(pack), { archive: archivePath ? readFileSync(archivePath) : undefined });
      console.log(`${pack}: kept ${m.assets.length} files, ${m.assets.reduce((n, a) => n + a.bytes, 0)} bytes`);
    } catch (error) {
      failed++;
      console.error(`${pack}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await cli();
