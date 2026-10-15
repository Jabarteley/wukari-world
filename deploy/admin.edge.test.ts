// The admin section (server/routes/admin.ts) on the Worker host: the same registry, so the same guard. Without a sign-in nobody is an admin:
// a guest, no session and a cross-site page are refused on every admin route, and a refused read stores nothing. (Signing in needs the
// sign-in provider's stand-in, which the Node tests drive: server/admin/admin.test.ts.)
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { HTTP_ROUTE_KEYS } from '../src/types/protocol.ts';
import { claimsFor, makeKey, signToken } from '../server/accounts/test-tokens.ts';
import { TOKEN_KEYS_URL } from '../server/accounts/token.ts';
import { layoutBindings } from '../server/testing/sqliteStorage.ts';

interface StubSocket { addEventListener(type: 'message', listener: (event: { data: string }) => void): void; accept(): void; send(data: string): void; close(): void }
type MiniflareResponse = Response & { webSocket?: StubSocket | null }
interface MiniflareInstance {
  ready: Promise<URL>
  dispose(): Promise<void>
  dispatchFetch(url: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<MiniflareResponse>
}
interface MiniflareTooling { Miniflare: new (options: Record<string, unknown>) => MiniflareInstance; convertV4MiniflareOptions(options: Record<string, unknown>): Record<string, unknown> }
interface BundleOptions { entryPoints: string[]; outfile: string; bundle: boolean; format: string; platform: string; external: string[]; minifyWhitespace: boolean; minifySyntax: boolean }
const require = createRequire(resolve(process.env['JOINALLWORLD_TOOLS'] || 'deploy/tooling', 'package.json'));
const { Miniflare, convertV4MiniflareOptions } = require('miniflare') as MiniflareTooling;
const { build } = require('esbuild') as { build(options: BundleOptions): Promise<unknown> };


test('on the Worker every admin route refuses a guest, a request without a session and a cross-site page', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'joinallworld-admin-'));
  const bundle = join(folder, 'worker.mjs');
  await build({ entryPoints: [new URL('./cloudflare-worker.ts', import.meta.url).pathname], outfile: bundle, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'], minifyWhitespace: true, minifySyntax: true });
  const options = { name: 'joinallworld-admin', script: await readFile(bundle, 'utf8'), modules: true, compatibilityDate: '2026-10-01', durableObjects: { JOINALLWORLD: { className: 'JoinAllworldState', useSQLite: true } }, durableObjectsPersist: join(folder, 'storage'), bindings: { ...layoutBindings(), BUILD_ID: 'local-admin' }, assets: { directory: new URL('../dist', import.meta.url).pathname, binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } } };
  const mf = new Miniflare({ ...convertV4MiniflareOptions(options), resourcePersistencePath: join(folder, 'storage'), handleStructuredLogs: () => {} });
  t.after(async () => { await mf.dispose(); await rm(folder, { recursive: true, force: true }); });
  await mf.ready;
  const origin = 'https://joinallworld.test';
  const made = await mf.dispatchFetch(origin + '/api/session', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Visitor' }) });
  const cookie = (made.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  await made.arrayBuffer();
  const routes = HTTP_ROUTE_KEYS.filter((key) => key.includes(' /api/admin/'));
  assert.ok(routes.length >= 20);
  let n = 0;
  for (const key of routes) {
    const [method, path] = key.split(' ') as [string, string];
    const url = origin + path.replace(':id', '00000000-0000-4000-8000-000000000000');
    for (const [who, headers, expected] of [['a guest', { origin, cookie }, 404], ['no session', { origin }, 404], ['a cross-site page', { origin: 'https://evil.example', cookie }, 403]] as const) {
      if (++n % 4 === 0) await new Promise((done) => setTimeout(done, 5));
      const response = await mf.dispatchFetch(url, { method, headers: { ...headers, ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: JSON.stringify({ clientId: '1:2' }) } : {}) });
      const status = response.status;
      await response.arrayBuffer();
      // A refused attempt is counted per address; past the budget the answer is 429, which is also a refusal.
      assert.ok(status === expected || (status === 429 && expected === 404), `${key} for ${who}: ${status}`);
    }
  }
});

test('on the Worker root preview and typed confirmation permanently erase one account and replay safely', { timeout: 120_000 }, async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'joinallworld-admin-erase-'));
  const bundle = join(folder, 'worker.mjs');
  await build({ entryPoints: [new URL('./cloudflare-worker.ts', import.meta.url).pathname], outfile: bundle, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'], minifyWhitespace: true, minifySyntax: true });
  const key = await makeKey('admin-erasure-edge-key');
  const project = 'admin-erasure-edge-project';
  const founderEmail = 'founder.edge@example.com';
  const bindings = {
    ...layoutBindings(), BUILD_ID: 'local-admin-erasure', ACCOUNTS_FIREBASE_PROJECT_ID: project,
    ACCOUNTS_FIREBASE_API_KEY: 'edge-web-api-key-0000000000000000000000',
    ACCOUNTS_GOOGLE_CLIENT_ID: '1234567890-edgeclient.apps.googleusercontent.com',
    FOUNDER_EMAIL_SHA256: createHash('sha256').update(founderEmail).digest('hex'),
  };
  const options = {
    name: 'joinallworld-admin-erasure', script: await readFile(bundle, 'utf8'), modules: true, compatibilityDate: '2026-10-01',
    durableObjects: { JOINALLWORLD: { className: 'JoinAllworldState', useSQLite: true } }, durableObjectsPersist: join(folder, 'storage'), bindings,
    outboundService: async (request: Request) => new Response(
      request.url.split('?')[0] === TOKEN_KEYS_URL ? JSON.stringify({ keys: [key.jwk] }) : '{}',
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } },
    ),
    assets: { directory: new URL('../dist', import.meta.url).pathname, binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } },
  };
  const mf = new Miniflare({ ...convertV4MiniflareOptions(options), resourcePersistencePath: join(folder, 'storage'), handleStructuredLogs: () => {} });
  t.after(async () => { await mf.dispose(); await rm(folder, { recursive: true, force: true }); });
  await mf.ready;
  const origin = 'https://joinallworld.test';
  const request = (path: string, body?: object | null, cookie?: string | null) => mf.dispatchFetch(origin + path, {
    method: body ? 'POST' : 'GET',
    headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let minted = 0;
  const token = (subject: string, email: string) => signToken(key, claimsFor(project, Date.now(), { subject, email, n: ++minted }));
  async function account(name: string, subject: string, email: string) {
    const made = await request('/api/session', { name });
    assert.equal(made.status, 200);
    const guestCookie = (made.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const madeBody = await made.json() as { session: { id: string } };
    assert.equal((await request('/api/life?city=lagos', null, guestCookie)).status, 200);
    const state = await (await request('/api/account', null, guestCookie)).json() as { csrf: string };
    const signed = await request('/api/account/sign-in', { csrf: state.csrf, idToken: await token(subject, email) }, guestCookie);
    assert.equal(signed.status, 200, await signed.text());
    return { id: madeBody.session.id, cookie: (signed.headers.get('set-cookie') ?? '').split(';')[0] ?? '' };
  }
  const founder = await account('Founder', 'UidFounder', founderEmail);
  const target = await account('Disposable', 'UidDisposable', 'disposable.edge@example.com');
  const path = `/api/admin/players/${target.id}/erase`;
  const clientId = `${Date.now()}:${randomUUID()}`, reason = 'Remove disposable Worker account';
  const previewResponse = await request(path, { clientId, reason }, founder.cookie);
  const preview = await previewResponse.json() as { code: string; token: string; plan: string; characters: { id: string }[] };
  assert.equal(previewResponse.status, 200, JSON.stringify(preview));
  assert.equal(preview.code, 'confirmation_required');
  assert.deepEqual(preview.characters.map(character => character.id), [target.id]);
  const intent = { clientId, reason, confirm: preview.token, plan: preview.plan, typed: `ERASE ${target.id}` };
  const erasedResponse = await request(path, intent, founder.cookie);
  const erased = await erasedResponse.json() as { code: string; jobId: string; count: number };
  assert.equal(erasedResponse.status, 200);
  assert.equal(erased.code, 'player_erased');
  assert.equal((await request(`/api/admin/players/${target.id}`, null, founder.cookie)).status, 404, 'the erased profile is gone');
  assert.equal((await request('/api/session', null, target.cookie)).status, 401, 'the erased session no longer authenticates');
  assert.equal((await request('/api/admin/me', null, founder.cookie)).status, 200, 'the unrelated founder remains');
  const replayResponse = await request(path, intent, founder.cookie);
  const replay = await replayResponse.json() as { code: string; jobId: string; count: number };
  assert.equal(replayResponse.status, 200);
  assert.deepEqual([replay.code, replay.jobId, replay.count], [erased.code, erased.jobId, erased.count], 'the exact operation replays its completed receipt');
});
