import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../kit.ts';
import { createRuntimeModule, RUNTIME_METRE_SCALE } from './runtime-module.ts';
import type { RuntimeRequest } from './runtime-module.ts';

function fixture() {
  const kit = createKit(), { THREE } = kit, parent = new THREE.Group();
  const request: RuntimeRequest = {
    id: 'fixture', near: { url: 'near.glb', sha256: 'a'.repeat(64) }, far: { url: 'far.glb', sha256: 'b'.repeat(64) },
    tier: 'far', indoors: false, distance: 100, position: [10, 2, 20], yaw: Math.PI / 2,
    budget: { triangles: 11500, drawCalls: 20, shadowPasses: 1 },
    navigation: { entrance: [1, 3, 0.5], anchors: [{ id: 'entry', kind: 'exit', position: [1, 0, 3] }], collision: [{ id: 'wall', min: [0, 0, 0], max: [1, 2, 3] }], walkable: [[0, 0, 2, 3]] },
  };
  const root = () => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7, alphaTest: 0.4 });
    material.normalMap = new THREE.DataTexture(null, 512, 512);
    material.roughnessMap = material.metalnessMap = new THREE.DataTexture(null, 512, 512);
    group.add(new THREE.Mesh(new THREE.BoxGeometry(), material)); return group;
  };
  return { kit, THREE, parent, request, root };
}

test('runtime PBR keeps authored material and shares one transform with every navigation shape', async () => {
  const f = fixture(), root = f.root(), mesh = root.children[0] as InstanceType<typeof f.THREE.Mesh>;
  const material = mesh.material; let adopted = 0;
  f.kit.eachMaterial(() => adopted++);
  const module = createRuntimeModule(f.kit, f.parent, { open: async () => root });
  assert.equal(await module.select(f.request), true);
  const p = module.placement!;
  assert.equal(mesh.material, material); assert.equal(adopted, 1);
  assert.equal(p.drawCalls, 2); assert.equal(p.triangles, 12);
  assert.equal(p.textureBytes, 2 * Math.ceil(512 * 512 * 4 * 4 / 3));
  const expected = new f.THREE.Vector3(1, 0, 3).applyMatrix4(p.root.matrix);
  assert.ok(p.anchors[0]!.position.distanceTo(expected) < 1e-9);
  assert.ok(p.entrance.position.distanceTo(expected) < 1e-9);
  assert.equal(p.entrance.yaw, Math.PI / 2 + 0.5);
  assert.ok(Math.abs(p.collision[0]!.box.max.x - (10 + 3 * RUNTIME_METRE_SCALE)) < 1e-9);
  assert.equal(p.walkable[0]!.length, 4);
  module.dispose(); assert.equal(f.parent.children.length, 0); f.kit.dispose();
});

test('indoors forces near and changing tiers releases materials, textures and shared images exactly once', async () => {
  const f = fixture(); let released = 0, closed = 0; const urls: string[] = [];
  const module = createRuntimeModule(f.kit, f.parent, { open: async url => {
    urls.push(url); const root = f.root(), mesh = root.children[0] as InstanceType<typeof f.THREE.Mesh>;
    const material = mesh.material as InstanceType<typeof f.THREE.MeshStandardMaterial>;
    const shared = { width: 8, height: 8, close: () => closed++ };
    material.map = new f.THREE.Texture(shared as ImageBitmap); material.aoMap = new f.THREE.Texture(shared as ImageBitmap);
    material.addEventListener('dispose', () => released++); return root;
  } });
  await module.select({ ...f.request, indoors: true }); assert.deepEqual(urls, ['near.glb']);
  const next = module.select(f.request); assert.equal(released, 1); assert.equal(closed, 1);
  assert.equal(f.parent.children.length, 0); await next;
  f.kit.dispose(); module.dispose(); assert.equal(released, 2); assert.equal(closed, 2);
});

test('cancelled parsing is serialized, disposed and never attached after a newer selection or scene teardown', async () => {
  const f = fixture(); let finish!: (root: InstanceType<typeof f.THREE.Group>) => void;
  let calls = 0, released = 0; const signals: AbortSignal[] = [];
  const module = createRuntimeModule(f.kit, f.parent, { open: async (_url, _hash, signal) => {
    calls++; signals.push(signal);
    return new Promise(resolve => { finish = resolve; });
  } });
  const first = module.select(f.request); await new Promise(resolve => setImmediate(resolve));
  const second = module.select({ ...f.request, indoors: true });
  assert.equal(signals[0]!.aborted, true); assert.equal(calls, 1);
  const stale = f.root(); (stale.children[0] as InstanceType<typeof f.THREE.Mesh>).geometry.addEventListener('dispose', () => released++);
  finish(stale); assert.equal(await first, false);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 2);
  module.dispose(); finish(f.root()); assert.equal(await second, false);
  assert.equal(released, 1); assert.equal(f.parent.children.length, 0); f.kit.dispose();
});

test('over-budget, light-bearing and failed modules leave no resident and allow retry', async () => {
  const f = fixture(); let mode = 'budget'; let disposed = 0;
  const module = createRuntimeModule(f.kit, f.parent, { open: async () => {
    if (mode === 'network') throw new Error('offline');
    const root = f.root(); (root.children[0] as InstanceType<typeof f.THREE.Mesh>).geometry.addEventListener('dispose', () => disposed++);
    if (mode === 'light') root.add(new f.THREE.PointLight()); return root;
  } });
  await assert.rejects(module.select({ ...f.request, budget: { triangles: 1, drawCalls: 1, shadowPasses: 1 } }), /budget/);
  mode = 'light'; await assert.rejects(module.select(f.request), /host lighting/);
  mode = 'network'; await assert.rejects(module.select(f.request), /offline/);
  assert.equal(disposed, 2); assert.equal(module.placement, null); assert.equal(f.parent.children.length, 0);
  mode = 'ok'; assert.equal(await module.select(f.request), true); module.dispose(); f.kit.dispose();
});

test('invalid navigation is rejected before network access', async () => {
  const f = fixture(); let calls = 0;
  const module = createRuntimeModule(f.kit, f.parent, { open: async () => { calls++; return f.root(); } });
  await assert.rejects(module.select({ ...f.request, navigation: { ...f.request.navigation, entrance: [NaN, 0, 0] } }), /navigation/);
  await assert.rejects(module.select({ ...f.request, navigation: { ...f.request.navigation, walkable: [[1, 0, -1, 2]] } }), /navigation/);
  assert.equal(calls, 0); module.dispose(); f.kit.dispose();
});

test('network loader rejects altered bytes and external resources before parsing', async () => {
  const f = fixture(), originalFetch = globalThis.fetch;
  const module = createRuntimeModule(f.kit, f.parent);
  try {
    globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]));
    await assert.rejects(module.select(f.request), /hash mismatch/);
    const json = JSON.stringify({ asset: { version: '2.0' }, scenes: [{}], buffers: [{ uri: 'https://unapproved.invalid/model.bin', byteLength: 1 }] });
    const text = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
    const bytes = new Uint8Array(20 + text.length), view = new DataView(bytes.buffer);
    view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.length, true);
    view.setUint32(12, text.length, true); view.setUint32(16, 0x4e4f534a, true); bytes.set(text, 20);
    const hash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
    globalThis.fetch = async () => new Response(bytes);
    await assert.rejects(module.select({ ...f.request, far: { url: 'fixture.glb', sha256: hash } }), /embed every resource/);
    assert.equal(module.placement, null);
  } finally { globalThis.fetch = originalFetch; module.dispose(); f.kit.dispose(); }
});

test('quarter-turn collision contract and explicit shadow-pass allowance fail closed', async () => {
  const f = fixture(), module = createRuntimeModule(f.kit, f.parent, { open: async () => f.root() });
  await assert.rejects(module.select({ ...f.request, yaw: Math.PI / 4 }), /quarter-turn/);
  await assert.rejects(module.select({ ...f.request, budget: { triangles: 11500, drawCalls: 2, shadowPasses: 2 } }), /budget/);
  await module.select({ ...f.request, budget: { triangles: 11500, drawCalls: 3, shadowPasses: 2 } });
  assert.equal(module.placement!.drawCalls, 3); module.dispose(); f.kit.dispose();
});

test('far requests close to the module still use near geometry', async () => {
  const f = fixture(); const urls: string[] = [];
  const module = createRuntimeModule(f.kit, f.parent, { open: async url => { urls.push(url); return f.root(); } });
  await module.select({ ...f.request, distance: 29 });
  assert.equal(module.placement!.tier, 'near'); assert.deepEqual(urls, ['near.glb']);
  module.dispose(); f.kit.dispose();
});

test('repeated geometry groups reserve each double-sided transparent pass', async () => {
  const f = fixture();
  const module = createRuntimeModule(f.kit, f.parent, { open: async () => {
    const root = f.root(), mesh = root.children[0] as InstanceType<typeof f.THREE.Mesh>;
    const material = mesh.material as InstanceType<typeof f.THREE.MeshStandardMaterial>;
    material.transparent = true; material.side = f.THREE.DoubleSide;
    mesh.material = [material]; mesh.geometry.clearGroups();
    for (let n = 0; n < 4; n++) mesh.geometry.addGroup(n * 9, 9, 0);
    return root;
  } });
  await assert.rejects(module.select({ ...f.request, budget: { triangles: 11500, drawCalls: 9, shadowPasses: 1 } }), /budget/);
  await module.select(f.request); assert.equal(module.placement!.drawCalls, 12);
  module.dispose(); f.kit.dispose();
});
