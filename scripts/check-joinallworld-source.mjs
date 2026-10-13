import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPEN_SETTING = 'ALLWORLD_OPEN_DEV';
/** The only files that may name the open-mode setting: the Node host that honours it, its scripts, the Worker's refusal, tests and docs. */
const OPEN_ALLOWED = /^(?:server\/server\.ts|server\/open-dev\/[^/]+|server\/open-dev\.test\.ts|scripts\/dev\.ts|scripts\/open-dev\.ts|deploy\/open-dev-refusal\.ts|deploy\/local\.ts|scripts\/check-joinallworld-source\.mjs|scripts\/guard-joinallworld-package\.test\.mjs|docs\/[^/]+\.md|README\.md|CONTRIBUTING\.md)$/;
/** Production configuration: where a deployment's settings live. The open-mode setting must never appear in any of it. */
const PRODUCTION_CONFIG = /^(?:wrangler\.jsonc?|package\.json|\.env(?:\..*)?|Dockerfile.*|docker-compose.*|\.github\/.+|deploy\/.+\.(?:json|jsonc|toml|ya?ml)|deploy\/tooling\/.+)$/;
// new-source: the release workflow checks the game out into new-source/ inside its own policy checkout; that copy is checked on its own
// (checkSource below, with new-source as the root, so its paths match the allowlists), not as nested files of the policy repository.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.data', '.data-open', 'coverage', 'new-source']);
/** @param {string} root @returns {string[]} */
function walk(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(root, full) : entry.isFile() ? [relative(root, full).split('\\').join('/')] : [];
  });
}
/** Every relative import, static or dynamic, of a TypeScript file. @param {string} text @returns {string[]} */
const importsOf = text => [...text.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => match[1] ?? '');
/**
 * Open dev mode (server/open-dev) must be impossible to enable on the real site, so this checks the source that is about to ship:
 *   1. the setting is named nowhere but the reviewed files (OPEN_ALLOWED), and in no production configuration file at all;
 *   2. the Worker's whole import graph (deploy/cloudflare-worker.ts) reaches neither server/open-dev/ nor the Node host server/server.ts;
 *   3. no file under deploy/ imports open-mode code.
 * @param {string} root @returns {string[]} the problems found (empty when the source is clean)
 */
export function openDevProblems(root) {
  /** @type {string[]} */
  const problems = [];
  const files = walk(root);
  for (const file of files) {
    if (/\.(?:png|jpe?g|webp|ico|woff2?|glb|gz|zip|wasm|bin)$/i.test(file) || statSync(join(root, file)).size > 4 * 1024 * 1024) continue;
    if (!readFileSync(join(root, file), 'utf8').includes(OPEN_SETTING)) continue;
    if (PRODUCTION_CONFIG.test(file)) problems.push(`${file} is a production configuration file and names ${OPEN_SETTING}`);
    else if (!OPEN_ALLOWED.test(file)) problems.push(`${file} names ${OPEN_SETTING}, which only the Node host and its local scripts may`);
  }
  const entry = 'deploy/cloudflare-worker.ts', seen = new Set();
  /** @param {string} path */
  const forbidden = path => /(?:^|\/)server\/open-dev(?:\/|\.)/.test(path) || path === 'server/server.ts' || path === 'scripts/open-dev.ts';
  const queue = existsSync(join(root, entry)) ? [entry] : [];
  for (let file = queue.pop(); file; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    if (forbidden(file)) { problems.push(`the Worker entry reaches ${file}, which is Node-host or open-mode code`); continue; }
    let text = '';
    try { text = readFileSync(join(root, file), 'utf8'); } catch { continue; }
    for (const spec of importsOf(text)) {
      const target = relative(root, resolve(root, dirname(file), spec)).split('\\').join('/');
      queue.push(/\.[a-z]+$/.test(target) ? target : `${target}.ts`);
    }
  }
  for (const file of files.filter(name => name.startsWith('deploy/') && name.endsWith('.ts') && !name.endsWith('.test.ts'))) {
    for (const spec of importsOf(readFileSync(join(root, file), 'utf8'))) {
      const target = relative(root, resolve(root, dirname(file), spec)).split('\\').join('/');
      if (forbidden(target)) problems.push(`${file} imports ${target}`);
    }
  }
  return problems;
}
/** @param {string} root */
export function checkOpenDev(root) {
  const problems = openDevProblems(root);
  if (problems.length) throw Error(`Open dev mode guard: ${problems.join('; ')}`);
}

/** @param {string} source @param {string} sha */
export function checkSource(source, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('Invalid source SHA');
  /** @param {string[]} args */
  const git = args => {
    const result = spawnSync('git', ['-C', source, ...args], { encoding: 'utf8' });
    if (result.status !== 0) throw Error('Source must be an ancestor of public main');
    return result.stdout.trim();
  };
  if (!/^https:\/\/github\.com\/kromate\/joinallworld(?:\.git)?$/.test(git(['remote', 'get-url', 'origin']))) throw Error('Wrong source repository');
  if (git(['rev-parse', 'HEAD']) !== sha) throw Error('Source checkout mismatch');
  git(['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main']);
  checkOpenDev(source);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || !process.argv[3]) throw Error('Missing source and SHA');
  checkSource(process.argv[2], process.argv[3]);
  console.log('PASS reviewed source is on public main');
}
