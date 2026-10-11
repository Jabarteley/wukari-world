// Loading each vehicle file once, caching it, and never failing the caller.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RETRY_AFTER_MS, createGlbLibrary } from './glb-library.ts';
import type { GlbRequest } from './glb-parts.ts';

const request: GlbRequest = { kind: 'keke', lod: 'far' };
const scene = (): THREE.Object3D => { const group = new THREE.Group(); group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())); return group; };

test('concurrent loads of one file share one fetch, and the result is cached and peekable', async () => {
  let fetches = 0;
  const library = createGlbLibrary(async (key) => { fetches += 1; assert.equal(key, 'keke-far'); return scene(); });
  assert.equal(library.peek(request), null, 'nothing before a load');
  const [a, b] = await Promise.all([library.load(request), library.load(request)]);
  assert.ok(a && a === b);
  assert.equal(fetches, 1);
  assert.equal(await library.load(request), a, 'later calls hit the cache');
  assert.equal(library.peek(request), a);
  assert.equal(fetches, 1);
  assert.equal(a.key, 'keke-far');
  assert.ok(a.triangles > 0);
});

test('a fetch that fails, or a file that is not a model, gives null (the caller keeps its procedural vehicle) and is not retried at once', async () => {
  let clock = 1000, fetches = 0, mode: 'fail' | 'empty' | 'ok' = 'fail';
  const library = createGlbLibrary(async () => { fetches += 1; if (mode === 'fail') throw new Error('offline'); return mode === 'empty' ? new THREE.Group() : scene(); }, () => clock);
  assert.equal(await library.load(request), null);
  assert.equal(library.failed(request), true);
  assert.equal(library.peek(request), null);
  mode = 'ok';
  assert.equal(await library.load(request), null, 'inside the pause no new request is made');
  assert.equal(fetches, 1);
  clock += RETRY_AFTER_MS + 1;
  assert.equal(library.failed(request), false);
  assert.ok(await library.load(request), 'after the pause it is asked for again and arrives');
  assert.equal(fetches, 2);
  mode = 'empty'; library.clear(); clock += 1;
  assert.equal(await library.load(request), null, 'a scene with no mesh is a failure too');
});

test('load never rejects, even when the parser throws synchronously', async () => {
  const library = createGlbLibrary(() => { throw new Error('no loader'); });
  assert.equal(await library.load(request), null);
});
