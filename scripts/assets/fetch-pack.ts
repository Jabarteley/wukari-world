// Download a named pack, keep only the files its want list names, and record every kept file in a manifest.
//
//   node --experimental-strip-types scripts/assets/fetch-pack.ts --pack kenney-racing-kit [--archive /path/to/pack.zip]
//   node --experimental-strip-types scripts/assets/fetch-pack.ts --all
//
// The want list is scripts/assets/wants/<pack>.json (shape in pack-types.ts). Output: public/assets/packs/<pack>/<as> for
// every wanted file, LICENSE.txt (the archive's own licence text), and manifest.json with, for each file, the source page,
// licence, attribution text (CC BY only) and byte size. Run prepare.ts afterwards to clean, scale and compress the models.
//
// Sources, and what works without a browser (checked October 2026):
//   kenney     kenney.nl asset page -> direct zip link on the page. Works.
//   itch       itch.io free "name your own price" packs (KayKit, Quaternius): the same three requests the web page makes
//              (download_url, then file/<id>) with a cookie and the page's CSRF token. Works for free packs. If itch.io changes
//              that flow the script stops and says to download the zip in a browser and pass it with --archive.
//   polypizza  poly.pizza model page -> static.poly.pizza file link, licence and author read from the page.
//   Quaternius' own site (quaternius.com) only links to Google Drive folders or itch.io; use the itch.io page.
// The licence is checked at fetch time against the source's own words (page or licence file) and the want list's claim;
// any mismatch stops the fetch. Only CC0-1.0 and CC-BY are accepted.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_LICENCES, PACKS_ROOT, type Licence, type Manifest, type ManifestAsset, type WantItem, type WantList } from './pack-types.ts';
import { readZip } from './zip.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export class ManualDownloadError extends Error {}

export interface FetchOptions {
  fetchFn?: typeof fetch;
  /** Directory that holds the pack folders (default public/assets/packs). */
  outRoot?: string;
  /** A zip already on disk (manual download); skips the download but not the licence checks. */
  archive?: Buffer;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
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
  if (!/Creative Commons CC0/i.test(page)) throw new Error(`${want.page} does not state CC0; refusing`);
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

const CC_RE: [RegExp, Licence][] = [[/creativecommons\.org\/publicdomain\/zero\/1\.0/, 'CC0-1.0'], [/creativecommons\.org\/licenses\/by\/3\.0/, 'CC-BY-3.0'], [/creativecommons\.org\/licenses\/by\/4\.0/, 'CC-BY-4.0']];

/** Poly Pizza: the page names licence and author; the file is a static GLB link. */
async function polyPizzaItem(s: Session, item: WantItem, want: WantList): Promise<{ bytes: Buffer; url: string; licence: Licence; attribution?: string }> {
  const page = await s.text(item.page!);
  const licence = CC_RE.find(([re]) => re.test(page))?.[1];
  if (!licence) throw new Error(`${item.page}: no recognised CC licence on the page; refusing`);
  const expected = item.licence ?? want.licence;
  if (licence !== expected) throw new Error(`${item.page}: page says ${licence} but the want list says ${expected}`);
  const link = /https:\/\/static\.poly\.pizza\/[^"'\s]+\.glb/.exec(page)?.[0];
  if (!link) throw new ManualDownloadError(`${item.page}: no GLB link on the page; download it in a browser into the pack folder`);
  const author = /href="\/u\/([^"]+)"/.exec(page)?.[1];
  const title = /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/.exec(page)?.[1] ?? item.as;
  const attribution = item.attribution ?? (licence.startsWith('CC-BY') ? `"${title.replace(/ \| Poly Pizza$/, '').replace(/ - Free Model By .*$/i, '')}" by ${author ? decodeURIComponent(author) : 'unknown author'}, ${licence.replace('CC-BY-', 'CC BY ')}, via Poly Pizza (${item.page})` : undefined);
  return { bytes: await s.bytes(link, MAX_FILE_BYTES), url: item.page!, licence, attribution };
}

export async function fetchPack(want: WantList, options: FetchOptions = {}): Promise<Manifest> {
  if (!(ALLOWED_LICENCES as readonly string[]).includes(want.licence)) throw new Error(`${want.pack}: licence ${want.licence} is not allowed`);
  if (want.licence.startsWith('CC-BY') && !want.attribution && want.kind !== 'polypizza') throw new Error(`${want.pack}: CC BY needs an attribution text`);
  const session = new Session(options.fetchFn ?? fetch, options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))));
  const dir = join(options.outRoot ?? join(repo, 'public', PACKS_ROOT), want.pack);
  const assets: ManifestAsset[] = [];
  const files: { name: string; bytes: Buffer }[] = [];
  const base = (path: string): string => `${PACKS_ROOT}/${want.pack}/${path}`;

  if (want.kind === 'polypizza') {
    for (const item of want.want) {
      if (!item.page) throw new Error(`${want.pack}: ${item.as} needs a page`);
      const got = await polyPizzaItem(session, item, want);
      files.push({ name: item.as, bytes: got.bytes });
      assets.push({ path: base(item.as), source: want.source, url: got.url, licence: got.licence, ...(got.attribution ? { attribution: got.attribution } : {}), bytes: got.bytes.length, game: item.game, kind: item.kind, sourceSha256: sha(got.bytes), licenceUrl: want.licenceUrl });
    }
  } else {
    const archive = options.archive ?? (want.kind === 'kenney' ? await kenneyArchive(session, want) : await itchArchive(session, want));
    const entries = readZip(archive);
    const licenceName = want.licenceFile ?? 'License.txt';
    const licenceText = pickEntry(entries, licenceName).read();
    const licenceWords = licenceText.toString('utf8');
    const ok = want.licence === 'CC0-1.0' ? /Creative Commons Zero|CC0|publicdomain\/zero/i.test(licenceWords) : /creativecommons\.org\/licenses\/by/i.test(licenceWords);
    if (!ok) throw new Error(`${want.pack}: the archive's ${licenceName} does not state ${want.licence}; refusing`);
    files.push({ name: 'LICENSE.txt', bytes: licenceText });
    assets.push({ path: base('LICENSE.txt'), source: want.source, url: want.page, licence: want.licence, ...(want.attribution ? { attribution: want.attribution } : {}), bytes: licenceText.length, kind: 'raw', licenceUrl: want.licenceUrl });
    for (const item of want.want) {
      if (!item.from) throw new Error(`${want.pack}: ${item.as} needs "from"`);
      const entry = pickEntry(entries, item.from);
      const bytes = entry.read();
      if (bytes.length > MAX_FILE_BYTES) throw new Error(`${item.from} is ${bytes.length} bytes: too big to keep`);
      files.push({ name: item.as, bytes });
      if (/\.(glb|gltf)$/i.test(item.as)) {
        for (const uri of externalUris(bytes)) {
          const rel = posix.normalize(decodeURIComponent(uri));
          if (rel.startsWith('..') || posix.isAbsolute(rel)) throw new Error(`${item.from}: refuses to read ${uri} outside the pack`);
          if (files.some((f) => f.name === rel)) continue;
          const dep = pickEntry(entries, posix.join(posix.dirname(item.from), rel)).read();
          files.push({ name: rel, bytes: dep });
          assets.push({ path: base(rel), source: want.source, url: want.page, licence: item.licence ?? want.licence, ...((item.attribution ?? want.attribution) ? { attribution: item.attribution ?? want.attribution } : {}), bytes: dep.length, kind: 'raw', temporary: true, licenceUrl: want.licenceUrl });
        }
      }
      assets.push({ path: base(item.as), source: want.source, url: want.page, licence: item.licence ?? want.licence, ...((item.attribution ?? want.attribution) ? { attribution: item.attribution ?? want.attribution } : {}), bytes: bytes.length, game: item.game, kind: item.kind, sourcePath: item.from, sourceSha256: sha(bytes), licenceUrl: want.licenceUrl });
    }
  }
  mkdirSync(dir, { recursive: true });
  for (const f of files) { mkdirSync(dirname(join(dir, f.name)), { recursive: true }); writeFileSync(join(dir, f.name), f.bytes); }
  const manifest: Manifest = { pack: want.pack, page: want.page, fetched: (options.now ?? (() => new Date()))().toISOString().slice(0, 10), assets };
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export const loadWant = (pack: string): WantList => JSON.parse(readFileSync(join(repo, 'scripts', 'assets', 'wants', `${pack}.json`), 'utf8')) as WantList;

async function cli(): Promise<void> {
  const args = process.argv.slice(2);
  const opt = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const { readdirSync } = await import('node:fs');
  const packs = args.includes('--all') ? readdirSync(join(repo, 'scripts', 'assets', 'wants')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [opt('--pack') ?? ''];
  if (!packs[0]) { console.error('usage: fetch-pack.ts --pack <name> [--archive file.zip] | --all'); process.exit(1); }
  let failed = 0;
  for (const pack of packs) {
    try {
      const archivePath = opt('--archive');
      const m = await fetchPack(loadWant(pack), { archive: archivePath && existsSync(archivePath) ? readFileSync(archivePath) : undefined });
      console.log(`${pack}: kept ${m.assets.length} files, ${m.assets.reduce((n, a) => n + a.bytes, 0)} bytes`);
    } catch (error) {
      failed++;
      console.error(`${pack}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await cli();
