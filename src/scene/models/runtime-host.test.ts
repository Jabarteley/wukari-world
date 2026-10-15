import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../kit.ts';
import { createRuntimeHost } from './runtime-host.ts';

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
async function fixture() {
  const kit = createKit(), { THREE } = kit, group = new THREE.Group(), fallback = new THREE.Group();
  group.add(fallback);
  let calls = 0, released = 0, failing = false, alive = true, hero = 0, crowd = 0, readmits = 0;
  let defer: ((root: InstanceType<typeof THREE.Group>) => void) | null = null;
  let deferred = false;
  const root = () => {
    const root = new THREE.Group(), geometry = new THREE.BoxGeometry();
    geometry.addEventListener('dispose', () => released++);
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())); return root;
  };
  let host: NonNullable<Awaited<ReturnType<typeof createRuntimeHost>>>;
  host = (await createRuntimeHost(kit, group, {
    current: () => alive,
    open: async () => {
      calls++; if (failing) throw Error('offline');
      if (deferred) return new Promise(resolve => { defer = resolve; });
      return root();
    },
    cost: exclude => ({ triangles: hero + crowd + (!exclude ? host?.placement?.triangles ?? 0 : 0), drawCalls: !exclude ? host?.placement?.drawCalls ?? 0 : 0 }),
    budget: () => ({ triangles: 30, drawCalls: 20 }),
    readmit: () => { readmits++; crowd = Math.min(crowd, Math.max(0, 30 - hero - 12)); },
    request: {
      id: 'test', near: { url: 'near', sha256: 'a'.repeat(64) }, far: { url: 'far', sha256: 'b'.repeat(64) },
      indoors: false, position: [0, 0, 0], yaw: 0,
      navigation: { entrance: [0, 0, 0], anchors: [], collision: [], walkable: [[-1, -1, 1, 1]] },
    },
    bounds: [-1, -1, 1, 1], fallback: [fallback], heights: [0],
    index: () => Object.assign(() => null, { retainedTriangles: 0, cellEntries: 0, broadTriangles: 0 }), fallbackContact: () => null, contact: () => {}, changed: () => {},
  }))!;
  return { host, group, fallback, readPlacement: () => host.placement, setFail: (v: boolean) => { failing = v; },
    setActors: (h: number, c: number) => { hero = h; crowd = c; },
    defer: () => { deferred = true; }, finish: () => { deferred = false; defer!(root()); },
    state: () => ({ calls, released, crowd, readmits }),
    dispose: () => { alive = false; host.dispose(); kit.dispose(); },
  };
}

test('host rejection retries on ambient guards with cooldown and a finite per-tier limit', async t => {
  t.mock.method(Date, 'now', () => now); let now = 0;
  const f = await fixture(); t.after(f.dispose); f.setFail(true);
  f.host.selectAt(0, 0); await settle();
  for (let i = 0; i < 100; i++) f.host.guard();
  assert.equal(f.state().calls, 1); assert.equal(f.group.userData.runtimeStatus, 'fallback');
  now = 1000; f.host.guard(); await settle(); assert.equal(f.state().calls, 2);
  now = 5000; f.host.guard(); await settle(); assert.equal(f.state().calls, 3);
  now = 1e9; for (let i = 0; i < 100; i++) f.host.guard(); await settle();
  assert.equal(f.state().calls, 3); assert.equal(f.readPlacement(), null);
});

test('transient rejection recovers with refreshed actor budgets and near/far admission', async t => {
  let now = 0; t.mock.method(Date, 'now', () => now);
  const f = await fixture(); t.after(f.dispose); f.setFail(true);
  f.host.selectAt(100, 100); await settle();
  f.setFail(false); f.setActors(15, 15); now = 1000;
  f.host.guard(); await settle();
  assert.equal(f.readPlacement()?.tier, 'far'); assert.equal(f.state().crowd, 3);
  f.setActors(18, 10); f.host.selectAt(0, 0); await settle();
  assert.equal(f.readPlacement()?.tier, 'near'); assert.equal(f.state().crowd, 0);
  assert.equal(f.fallback.visible, false); assert.equal(f.state().released, 1);
});

test('late hero eviction clears selection, waits for capacity and recovers without repeated downloads', async t => {
  let now = 0; t.mock.method(Date, 'now', () => now);
  const f = await fixture(); t.after(f.dispose);
  f.host.selectAt(0, 0); await settle();
  f.setActors(25, 0); f.host.guard(); await settle();
  assert.equal(f.readPlacement(), null); assert.equal(f.fallback.visible, true);
  now = 10000; for (let i = 0; i < 100; i++) f.host.guard(); await settle();
  assert.equal(f.state().calls, 1);
  f.setActors(18, 0); f.host.guard(); await settle();
  assert.equal(f.readPlacement()?.tier, 'near'); assert.equal(f.state().calls, 2);
});

test('stale tier completion and disposal cannot poison the new selection or retain geometry', async t => {
  const f = await fixture(); t.after(f.dispose); f.defer();
  f.host.selectAt(100, 100); await settle();
  f.host.selectAt(0, 0); f.finish(); await settle(); await settle();
  assert.equal(f.readPlacement()?.tier, 'near'); assert.equal(f.state().released, 1);
  assert.equal(f.group.userData.runtimeStatus, 'ready');
  f.defer(); f.host.selectAt(100, 100); await settle();
  f.dispose(); f.finish(); await settle();
  assert.equal(f.readPlacement(), null); assert.equal(f.state().released, 3);
  for (let i = 0; i < 100; i++) f.host.guard(); await settle();
  assert.equal(f.state().calls, 3);
});
