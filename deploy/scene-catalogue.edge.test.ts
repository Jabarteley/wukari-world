import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

interface LocalWorker { ready: Promise<URL>; dispose(): Promise<void>; dispatchFetch(url: string, init?: RequestInit): Promise<Response> }
interface WorkerTooling { Miniflare: new (options: Record<string, unknown>) => LocalWorker; convertV4MiniflareOptions(options: Record<string, unknown>): Record<string, unknown> }
interface BundleTooling { build(options: { entryPoints: string[]; outfile: string; bundle: boolean; format: string; platform: string; external: string[] }): Promise<unknown> }
const require = createRequire(resolve(process.env['JOINALLWORLD_TOOLS'] || 'deploy/tooling', 'package.json'));
const { Miniflare, convertV4MiniflareOptions } = require('miniflare') as WorkerTooling;
const { build } = require('esbuild') as BundleTooling;

test('Worker asset binding serves all catalogue entries with their own head and the normal security policy', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'allworld-catalogue-edge-'));
  const dist = join(folder, 'dist');
  await mkdir(dist);
  await writeFile(join(dist, 'index.html'), '<!doctype html><head><title>The game</title></head><div id="app"></div>');
  for (const route of ['county', 'cities', 'cities/scenes']) {
    const path = join(dist, route, 'index.html');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, '<!doctype html><head><title>World scene catalogue</title><meta name="robots" content="noindex, nofollow"><meta name="allworld-3d-assets" content="true"></head><div id="catalogue"></div><script type="module" src="/assets/catalogue-test.js"></script>');
  }
  const bundle = join(folder, 'worker.mjs');
  await build({ entryPoints: [new URL('./cloudflare-worker.ts', import.meta.url).pathname], outfile: bundle, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'] });
  const worker = new Miniflare({
    ...convertV4MiniflareOptions({
      name: 'allworld-catalogue-edge', script: await readFile(bundle, 'utf8'), modules: true, compatibilityDate: '2026-10-01',
      durableObjects: { JOINALLWORLD: { className: 'JoinAllworldState', useSQLite: true } }, bindings: { BUILD_ID: 'catalogue-host-test' },
      assets: { directory: dist, binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } },
    }),
    resourcePersistencePath: join(folder, 'storage'), handleStructuredLogs: () => {},
  });
  t.after(async () => { await worker.dispose(); await rm(folder, { recursive: true, force: true }); });
  await worker.ready;
  for (const route of ['/county', '/cities', '/cities/scenes']) {
    for (const suffix of ['', '/', '/index.html']) {
      let url = new URL(route + suffix + '?city=accra', 'https://joinallworld.test');
      let response = await worker.dispatchFetch(url.href);
      for (let n = 0; n < 3 && response.status >= 300 && response.status < 400; n++) {
        const location = response.headers.get('location');
        assert.ok(location, 'asset canonical redirect has a location');
        url = new URL(location, url);
        assert.equal(url.origin, 'https://joinallworld.test');
        assert.equal(url.searchParams.get('city'), 'accra');
        response = await worker.dispatchFetch(url.href);
      }
      assert.equal(response.status, 200, route + suffix);
      const html = await response.text();
      assert.match(html, /<div id="catalogue"><\/div>/);
      assert.match(html, /<title>World scene catalogue<\/title>/);
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.equal(response.headers.get('set-cookie'), null);
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'self' 'wasm-unsafe-eval'/);
      const head = await worker.dispatchFetch(url.href, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), '');
      assert.equal(head.headers.get('cache-control'), 'no-cache');
    }
  }
  const game = await worker.dispatchFetch('https://joinallworld.test/some/game/link');
  assert.equal(game.status, 200);
  assert.match(await game.text(), /<div id="app"><\/div>/);
});
