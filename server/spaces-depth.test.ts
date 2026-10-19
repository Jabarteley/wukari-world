// OWNER: spaces — the depth model's files for worlds from a photo (server/spaces/depth.ts, docs/WORLDS.md phase 8): served only while
// the setting and the worlds it needs are on, only by their fixed names, only when the stored bytes are the size pinned for them, with a
// type a browser runs (JavaScript, WebAssembly) and kept a week.
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from './test-fixture.ts';
import { createStore } from './store.ts';
import { DEPTH_FILES } from './spaces/depth.ts';

const OPERATOR = 'operator-token-for-tests-0123456789';

async function setup(t: TestContext, photo: boolean) {
  const dir = await mkdtemp(join(tmpdir(), 'spaces-depth-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = await createStore(dir, { log: () => {} });
  const at = (value: boolean) => ({ value, at: 1, by: 'test' });
  await store.transact((db) => { (db as Record<string, unknown>)['adminSettings'] = { values: { spacesModels: at(true), spaces3d: at(true), spacesWorlds: at(true), spacesPhotoWorlds: at(photo) } }; });
  const f = await fixture(t, { store, dataDir: dir, moderatorToken: OPERATOR } as never);
  const d = await f.device('Ada');
  await f.request('/api/life?city=lagos', undefined, d.cookie);
  const get = (path: string, cookie = d.cookie) => fetch(f.base + path, { headers: { Origin: f.base, ...(cookie ? { Cookie: cookie } : {}) } });
  const put = async (name: keyof typeof DEPTH_FILES, bytes = DEPTH_FILES[name].bytes) => {
    await mkdir(join(dir, 'space-models'), { recursive: true });
    await writeFile(join(dir, 'space-models', `${DEPTH_FILES[name].hash}.glb`), new Uint8Array(bytes));
  };
  const send = (name: string, bytes: Uint8Array, token = OPERATOR) => fetch(`${f.base}/api/mod/spaces/depth/${name}`, { method: 'POST', headers: { Origin: f.base, 'Content-Type': 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: bytes as Uint8Array<ArrayBuffer> });
  return { get, put, send, cookie: d.cookie };
}

test('depth files: off unless worlds from a photo are switched on, and the worlds list says so', async (t) => {
  const { get, put } = await setup(t, false);
  await put('ort.mjs');
  assert.equal((await get('/api/spaces/depth/ort.mjs')).status, 404);
  const list = await (await get('/api/spaces/worlds?list=mine')).json() as { photo?: boolean };
  assert.equal(list.photo, undefined);
});

test('depth files: the three fixed files, with their types, kept a week; nothing else; a session is needed', async (t) => {
  const { get, put } = await setup(t, true);
  const list = await (await get('/api/spaces/worlds?list=mine')).json() as { photo?: boolean };
  assert.equal(list.photo, true);
  // Not stored yet.
  assert.equal((await get('/api/spaces/depth/ort.wasm')).status, 404);
  await put('ort.mjs'); await put('ort.wasm');
  const js = await get('/api/spaces/depth/ort.mjs');
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type') ?? '', /^text\/javascript/);
  assert.match(js.headers.get('cache-control') ?? '', /immutable/);
  assert.equal((await js.arrayBuffer()).byteLength, DEPTH_FILES['ort.mjs'].bytes);
  const wasm = await get('/api/spaces/depth/ort.wasm');
  assert.equal(wasm.headers.get('content-type'), 'application/wasm');
  await wasm.arrayBuffer();
  // Bytes of another size under the pinned name are not served.
  await put('depth.onnx', 10);
  assert.equal((await get('/api/spaces/depth/depth.onnx')).status, 404);
  // Only the fixed names.
  for (const name of ['other.js', '..%2Fdata.json', DEPTH_FILES['ort.mjs'].hash]) assert.equal((await get(`/api/spaces/depth/${name}`)).status, 404, name);
  assert.notEqual((await get('/api/spaces/depth/ort.mjs', '')).status, 200);
});

test('depth files: the operator stores one only when it is exactly the pinned file', async (t) => {
  const { send, get } = await setup(t, true);
  const fake = new Uint8Array(DEPTH_FILES['ort.mjs'].bytes);
  assert.equal((await send('ort.mjs', fake, '')).status, 401);
  assert.equal((await send('other.js', fake)).status, 404);
  const wrong = await send('ort.mjs', fake);
  assert.equal(wrong.status, 400);
  assert.equal(((await wrong.json()) as { code?: string; error?: string }).error ?? 'wrong_file', 'wrong_file');
  // Larger than the pinned file: refused before it is read.
  assert.equal((await send('ort.mjs', new Uint8Array(DEPTH_FILES['ort.mjs'].bytes + 1))).status, 413);
  assert.equal((await get('/api/spaces/depth/ort.mjs')).status, 404);
});
