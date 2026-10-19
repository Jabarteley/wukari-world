// OWNER: release — what the release pipeline (kromate/allworld, joinallworld-release.yml) needs from this tree.
// The pipeline names paths and file kinds the TypeScript conversion would otherwise have removed; these tests keep them true.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { isPackageAssetPath } from '../scripts/guard-joinallworld-package.mjs';

const root = new URL('../', import.meta.url);
const SKIP = new Set(['node_modules', '.git', 'dist', 'dist-maps', '.data', 'evidence']);
function files(dir: URL, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    return entry.isDirectory() ? files(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`];
  });
}

test('JavaScript is limited to the service worker, release shims and exact reviewed tooling', () => {
  const javascript = files(root).filter((file) => /\.(?:js|mjs|cjs)$/.test(file)).sort();
  assert.deepEqual(javascript, ['deploy/cloudflare-worker.js', 'deploy/cloudflare.test.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/native-height-probe.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/native-probe.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/native-scenes-probe.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/native-street-probe.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/native-world-motion-probe.mjs',
    'docs/agent-work/native-character-release-evidence-20261016/neighbourhood-player-ownership-probe.mjs',
    // The script sandbox of a 3D space (docs/SPACES-3D.md phase 4): a static page's own script, served with its own policy.
    'public/sandbox/space.js',
    // The house skill's scripts (docs/HOUSE-FROM-PHOTOS.md): served as text for a player's own AI to run on their computer; check_model.mjs is generated from src/spaces/glb.ts.
    'public/skills/allworld-house/scripts/check_model.mjs', 'public/skills/allworld-house/scripts/upload.mjs',
    'public/sw.js',
    'scripts/check-joinallworld-source.mjs', 'scripts/check-workflows.mjs',
    // Reviewed generated-travel gate: proves the committed land-components table matches the catalogue.
    'scripts/city/check-land-components.mjs',
    'scripts/guard-joinallworld-package.mjs', 'scripts/guard-joinallworld-package.test.mjs',
    // Bounded, typechecked browser QA with isolated synthetic fixtures and native input.
    'scripts/living-world-browser-qa.mjs',
    'scripts/native-character-assets.mjs', 'scripts/native-character-policy.mjs',
    // This reviewed test-only native-allocation witness avoids TS-loader RSS at a 64MiB limit.
    'scripts/package-joinallworld.mjs',
    'src/scene/character-lab/runtime/action-support.js', 'src/scene/character-lab/runtime/characters.js',
    'src/scene/character-lab/runtime/foot-planting.js', 'src/scene/character-lab/runtime/foreground-characters.mjs',
    'src/scene/character-lab/runtime/gait-cloth.js', 'src/scene/character-lab/runtime/knee-alignment.js',
    'src/scene/character-lab/runtime/look-recipe-adapter.mjs', 'src/scene/character-lab/runtime/rig-motion-world.js',
    'src/scene/character-lab/runtime/rig-motion.js', 'src/scene/character-lab/runtime/seated-contact.js',
    'src/scene/character-lab/runtime/seated-drape.js', 'src/scene/character-lab/runtime/selected-profile.mjs',
    'world/tooling/index_resource_witness.mjs']);
});

test('the two release shims only point at the TypeScript they stand for', () => {
  const worker = readFileSync(new URL('deploy/cloudflare-worker.js', root), 'utf8').split('\n').filter((line) => !line.startsWith('//') && line.trim());
  assert.deepEqual(worker, ["export * from './cloudflare-worker.ts';", "export { default } from './cloudflare-worker.ts';"]);
  const test = readFileSync(new URL('deploy/cloudflare.test.mjs', root), 'utf8').split('\n').filter((line) => !line.startsWith('//') && line.trim());
  assert.deepEqual(test, ["import './cloudflare.test.ts';"]);
  assert.ok(statSync(new URL('deploy/cloudflare-worker.ts', root)).isFile() && statSync(new URL('deploy/cloudflare.test.ts', root)).isFile());
});

test('every file in public/ is an asset the release package admits (no dot-file, no map, no manifest, no xml)', () => {
  for (const file of files(new URL('public/', root))) {
    assert.ok(!file.split('/').some((part) => part.startsWith('.')), `${file} starts with a dot`);
    assert.ok(isPackageAssetPath(`assets/${file}`, statSync(new URL(`public/${file}`, root)).size), `${file} is not an asset path the package admits`);
  }
});

test('the Worker config is the one the release package fixes, and the Worker exports its Durable Object', () => {
  const config = readFileSync(new URL('wrangler.jsonc', root), 'utf8');
  assert.match(config, /"name": "joinallworld-next"/);
  assert.match(config, /"binding": "JOINALLWORLD"|"name": "JOINALLWORLD", "class_name": "JoinAllworldState"/);
  assert.match(readFileSync(new URL('deploy/cloudflare-worker.ts', root), 'utf8'), /export class JoinAllworldState extends DurableObject/);
});

test('the default build config emits no source map (maps are opt-in, SOURCEMAPS=1, into dist-maps/)', () => {
  const config = readFileSync(new URL('vite.config.ts', root), 'utf8');
  assert.match(config, /sourcemap: wantMaps \? 'hidden' : false/);
  assert.match(config, /process\.env\.SOURCEMAPS === '1'/);
  assert.match(readFileSync(new URL('.gitignore', root), 'utf8'), /^dist-maps\/$/m);
});
