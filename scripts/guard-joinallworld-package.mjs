import { readdirSync, readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** @param {string | Uint8Array} bytes */
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const RELEASE_IDENTITY_VERSION = 1;
export const RELEASE_MARKER_PREFIX = '// joinallworld-release:v1 ';
const MAX_DECIMAL_ID = 9223372036854775807n;
const MAX_WORKER_BYTES = 3_500_000;
// Trusted source receipt, never read from the candidate package. The native exception is path + byte-identity scoped.
const nativeSelection = /** @type {{files:{url:string,sha256:string,bytes:number}[]}} */ (JSON.parse(readFileSync(new URL('../docs/character-assets/selected-release-assets.json', import.meta.url), 'utf8')));
const reviewedNativeModels = new Map(nativeSelection.files.filter(file => file.url.startsWith('/character-lab/') && file.url.endsWith('.glb')).map(file => [`assets${file.url}`, file]));
/** @param {unknown} value @param {string} name */
function positiveDecimal(value, name) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > MAX_DECIMAL_ID) throw Error(`Invalid ${name}`);
  return value;
}
/** @param {unknown} value */
export function parseReleaseIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid release identity');
  const identity = /** @type {Record<string, unknown>} */ (value);
  const keys = Object.keys(identity).sort();
  if (identity.version !== RELEASE_IDENTITY_VERSION || typeof identity.kind !== 'string' || !['github', 'local'].includes(identity.kind)) throw Error('Invalid release identity');
  if (identity.kind === 'local') {
    if (JSON.stringify(keys) !== JSON.stringify(['kind', 'version'])) throw Error('Invalid release identity');
    return { version: RELEASE_IDENTITY_VERSION, kind: 'local' };
  }
  if (JSON.stringify(keys) !== JSON.stringify(['kind', 'runAttempt', 'runId', 'version'])) throw Error('Invalid release identity');
  return { version: RELEASE_IDENTITY_VERSION, kind: 'github', runId: positiveDecimal(identity.runId, 'GitHub run ID'), runAttempt: positiveDecimal(identity.runAttempt, 'GitHub run attempt') };
}
/** @param {Record<string, string | undefined>} env */
export function releaseIdentityFromEnvironment(env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true') return { version: RELEASE_IDENTITY_VERSION, kind: 'local' };
  return parseReleaseIdentity({ version: RELEASE_IDENTITY_VERSION, kind: 'github', runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT });
}
/** @param {string} sourceSha @param {unknown} identity */
export function releaseMarker(sourceSha, identity) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw Error('Invalid release source');
  const parsed = parseReleaseIdentity(identity);
  const tag = parsed.kind === 'local' ? 'local' : `github:${parsed.runId}:${parsed.runAttempt}`;
  return `${RELEASE_MARKER_PREFIX}source=${sourceSha} identity=${tag}\n`;
}
/** @param {unknown} left @param {unknown} right */
export function sameReleaseIdentity(left, right) { return JSON.stringify(parseReleaseIdentity(left)) === JSON.stringify(parseReleaseIdentity(right)); }
/** @param {string} sourceSha @param {boolean} publish */
export function expectedConfig(sourceSha, publish) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha) || typeof publish !== 'boolean') throw Error('Invalid release identity');
  return {
    name: 'joinallworld-next', main: 'worker.js', compatibility_date: '2026-10-01',
    workers_dev: publish, preview_urls: false,
    no_bundle: true, find_additional_modules: false,
    assets: { directory: './assets', binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: true },
    durable_objects: { bindings: [{ name: 'JOINALLWORLD', class_name: 'JoinAllworldState' }] },
    migrations: [{ tag: 'joinallworld-sqlite-v1', new_sqlite_classes: ['JoinAllworldState'] }],
    vars: { BUILD_ID: `joinallworld-${sourceSha}` }, observability: { enabled: false },
  };
}
/** @param {string} root @param {string} sourceSha @param {boolean} publish */
export function checkPackage(root, sourceSha, publish) {
  root = resolve(root);
  if (realpathSync(root) !== root) throw Error('Package path must be canonical');
  /** @type {{path: string, bytes: number, sha256: string}[]} */
  const files = [];
  /** @param {string} path */
  function walk(path) {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name), stat = lstatSync(full), rel = relative(root, full);
      if (stat.isSymbolicLink() || name.startsWith('.') || /(?:^|\/)(?:node_modules|server|evidence|devices\.json|package\.json)(?:\/|$)/i.test(rel)) throw Error('Forbidden package path');
      if (stat.isDirectory()) { if (rel !== 'assets' && !rel.startsWith('assets/')) throw Error('Unexpected directory'); walk(full); }
      else {
        if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw Error('Invalid package file');
        const cityAsset = /^assets\/assets\/cities\/[a-z][a-z0-9-]*\.([a-f0-9]{64})\.json$/.exec(rel);
        const progressionAsset = /^assets\/assets\/progression\/(?:episodes-\d+|journeys|missions)\.([a-f0-9]{64})\.json$/.exec(rel);
        // The two reduced-detail body files of the near crowd (src/scene/body/files.ts): the only binary that is not a glTF.
        const bodyLod = /^assets\/assets\/base-body-(?:male|female)-lod-[0-9a-f]{7}\.bin$/.test(rel) && stat.size > 0 && stat.size < 1024 * 1024;
        const nativeJson = ['assets/character-lab/models/final-pass-20261015/catalog.json', 'assets/character-lab/models/candidates/motion-iteration2-upper-palm.json'].includes(rel);
        const nativeNotice = ['assets/character-lab/THIRD_PARTY_NOTICES.md', 'assets/character-lab/FINAL-PASS-LICENSE-NOTE.md'].includes(rel);
        if (!nativeJson && !nativeNotice && !['worker.js', 'wrangler.json', 'manifest.json'].includes(rel) && !cityAsset && !progressionAsset && !bodyLod && !/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:html|js|css|svg|png|jpg|jpeg|webp|ico|woff2|txt|glb)$/.test(rel)) throw Error('Unexpected package file');
        const bytes = readFileSync(full);
        if (nativeJson) {
          if (bytes.length > 1024 * 1024) throw Error('Native metadata too large');
          try { JSON.parse(bytes.toString('utf8')); } catch { throw Error('Invalid native metadata'); }
        }
        if (cityAsset && cityAsset[1] !== hash(bytes)) throw Error('City content filename hash mismatch');
        if (progressionAsset && progressionAsset[1] !== hash(bytes)) throw Error('Progression content filename hash mismatch');
        if (rel.endsWith('.glb')) {
          const reviewed = reviewedNativeModels.get(rel);
          if (reviewed && (reviewed.sha256 !== hash(bytes) || reviewed.bytes !== bytes.length)) throw Error('Native model identity mismatch');
          if (!isGlb(bytes, reviewed ? 5 * 1024 * 1024 : undefined)) throw Error('Invalid model file');
        }
        files.push({ path: rel, bytes: stat.size, sha256: hash(bytes) });
      }
    }
  }
  walk(root);
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const identity = parseReleaseIdentity(manifest.identity);
  if (manifest.sourceSha !== sourceSha || manifest.publish !== publish || (publish && identity.kind !== 'github')) throw Error('Manifest identity mismatch');
  const listed = files.filter(file => file.path !== 'manifest.json');
  if (JSON.stringify(manifest.files) !== JSON.stringify(listed)) throw Error('Package manifest mismatch');
  const config = JSON.parse(readFileSync(join(root, 'wrangler.json'), 'utf8'));
  if (JSON.stringify(config) !== JSON.stringify(expectedConfig(sourceSha, publish))) throw Error('Unapproved deployment configuration');
  if (!files.some(file => file.path === 'worker.js') || !files.some(file => file.path === 'assets/index.html')) throw Error('Missing runtime files');
  const worker = readFileSync(join(root, 'worker.js'), 'utf8');
  if (Buffer.byteLength(worker) > MAX_WORKER_BYTES) throw Error('Invalid Worker file');
  const marker = releaseMarker(sourceSha, identity);
  if (!worker.startsWith(marker) || worker.slice(marker.length).startsWith(RELEASE_MARKER_PREFIX)) throw Error('Worker release marker mismatch');
  // The Node host's local developer mode is never part of a release: its module carries this marker, so a Worker bundle that pulled it in is refused.
  if (worker.includes('allworld-open-dev-node-only')) throw Error('Open dev mode code in the release package');
  const contentPaths = new Set(worker.match(/\/assets\/(?:cities\/[a-z][a-z0-9-]*\.[a-f0-9]{64}\.json|words\/dictionary\.[a-f0-9]{64}\.txt|progression\/(?:episodes-\d+|journeys|missions)\.[a-f0-9]{64}\.json)/g) ?? []);
  const cityPaths = [...contentPaths].filter(path => path.startsWith('/assets/cities/'));
  const dictionaryPaths = [...contentPaths].filter(path => path.startsWith('/assets/words/'));
  const progressionPaths = [...contentPaths].filter(path => path.startsWith('/assets/progression/'));
  if (!cityPaths.length || dictionaryPaths.length !== 1 || progressionPaths.length < 3) throw Error('Missing content manifest references');
  for (const path of contentPaths) {
    const file = files.find(file => file.path === `assets${path}`);
    if (!file) throw Error('Missing referenced content asset');
    if (file.sha256 !== path.match(/\.([a-f0-9]{64})\.(?:json|txt)$/)?.[1]) throw Error('Content asset filename hash mismatch');
  }
  for (const file of files.filter(file => /^assets\/assets\/(?:cities\/[a-z][a-z0-9-]*\.[a-f0-9]{64}\.json|words\/dictionary\.[a-f0-9]{64}\.txt|progression\/(?:episodes-\d+|journeys|missions)\.[a-f0-9]{64}\.json)$/.test(file.path))) {
    if (!contentPaths.has(file.path.slice('assets'.length))) throw Error('Unreferenced content asset');
  }
  return hash(JSON.stringify(files));
}
// A binary glTF 2.0 file: "glTF" magic, version 2, a declared length equal to the file size, then a JSON chunk first.
// Anything else under a .glb name (a renamed script, an HTML page, a truncated upload) is refused.
/** @param {Uint8Array} bytes @param {number} [maxBytes] */
export function isGlb(bytes, maxBytes = 2 * 1024 * 1024) {
  if (bytes.length < 20 || bytes.length > maxBytes) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2
    && view.getUint32(8, true) === bytes.length && view.getUint32(16, true) === 0x4e4f534a;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, root, sourceSha, publishing, expectedDigest, wrangler] = process.argv.slice(2);
  if (!root || !sourceSha || !mode || !publishing) throw Error('Missing arguments');
  if (!['check', 'deploy'].includes(mode) || !['true', 'false'].includes(publishing)) throw Error('Invalid arguments');
  const digest = checkPackage(root, sourceSha, publishing === 'true');
  if (expectedDigest && expectedDigest !== digest) throw Error('Package digest changed');
  if (mode === 'check') console.log(digest);
  else {
    if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_REPOSITORY !== 'kromate/joinallworld') throw Error('Deployment context rejected');
    const manifest = JSON.parse(readFileSync(join(realpathSync(root), 'manifest.json'), 'utf8'));
    const currentIdentity = releaseIdentityFromEnvironment(process.env);
    if (currentIdentity.kind !== 'github' || !sameReleaseIdentity(manifest.identity, currentIdentity)) throw Error('Deployment identity rejected');
    if (!expectedDigest || !wrangler || !process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw Error('Missing protected deployment inputs');
    if (checkPackage(root, sourceSha, publishing === 'true') !== expectedDigest) throw Error('Package changed before deploy');
    const result = spawnSync(process.execPath, [realpathSync(wrangler), 'deploy', '--config', join(realpathSync(root), 'wrangler.json'), '--durable-objects-code-update-mode', 'immediate'], {
      cwd: realpathSync(root), stdio: 'inherit', env: {
        PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        WRANGLER_SEND_METRICS: 'false',
      },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
}
