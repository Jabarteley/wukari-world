import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkGrid } from '../movement.ts';
import { rowX } from '../../game/neighbourhood-space.ts';
import { BOUNDS, BUS_STOP, Z, planStreet, rectOf, sceneryMix, tierLook } from './street-plan.ts';
import type { PlanHouse } from './street-plan.ts';
import { atlasOf, fileKey, wallLook } from './street-kit.ts';

const house = (plot: number, tier: PlanHouse['tier'], extra: Partial<PlanHouse> = {}): PlanHouse =>
  ({ x: rowX(plot), plot, tier, wall: 2, roof: 0, door: 0, fence: 1, yard: 0, land: [], own: false, ...extra });
const mix = sceneryMix([{ kind: 'worship', variant: 'church' }, { kind: 'worship', variant: 'mosque' }, { kind: 'hospital' }], true);

test('houses are drawn by tier, with their door on the front plane and a gate on the same x', () => {
  const plan = planStreet({ houses: [house(0, 'starter'), house(1, 'bq'), house(2, 'bungalow'), house(3, 'duplex'), house(4, 'villa')], seed: 's', mix });
  const houses = plan.pieces.filter((p) => p.role === 'house');
  assert.deepEqual(houses.map((p) => p.asset), ['bungalow', 'bungalow', 'bungalow', 'house2', 'house2']);
  assert.ok(houses[0]!.scale < houses[2]!.scale && houses[3]!.scale < houses[4]!.scale);
  for (const item of houses) {
    const rect = rectOf(item.asset, item.x, item.z, 0, item.scale);
    assert.ok(Math.abs(rect[3] - Z.front) < 1e-6, 'front plane at the door line');
    assert.ok(rect[2] - rect[0] <= 12 - 0.8, 'fits the plot');
  }
  const gates = plan.pieces.filter((p) => p.role === 'gate');
  assert.deepEqual(gates.map((p) => p.x), houses.map((p) => p.x));
  assert.equal(plan.pieces.filter((p) => p.role === 'gatehouse').length, 2, 'duplex and villa have a gatehouse');
  const own = (tier: PlanHouse['tier']) => planStreet({ houses: [house(5, tier)], seed: 's', mix }).pieces.filter((p) => p.role === 'detail').length;
  assert.ok(own('starter') < own('bq') + 1 && own('bq') < own('bungalow') && own('bungalow') < own('villa'), 'richer tiers get more detail');
  assert.equal(tierLook('villa').asset, 'house2');
});

test('the number on a house is its plot number, from one', () => {
  const plan = planStreet({ houses: [house(6, 'bq')], seed: 's', mix });
  assert.deepEqual(plan.pieces.find((p) => p.role === 'number')?.labels, { sign_number: '7' });
});

test('the walking grid reaches every gate, the door of every house, the bus stop and the far pavement', () => {
  const houses = [house(2, 'starter', { own: true }), house(3, 'duplex'), house(7, 'villa', { land: [8] })];
  const plan = planStreet({ houses, seed: 'k', mix });
  const grid = createWalkGrid({ bounds: BOUNDS, cell: 0.3, radius: 0.32, entrance: [rowX(2), -3.25, 0], block: plan.blocks });
  const from = { x: rowX(2), z: -3.25 };
  assert.ok(grid.free(from.x, from.z), 'the entrance is free');
  for (const h of houses) {
    for (const [x, z] of [[h.x, Z.fence + 0.5], [h.x, Z.front + 0.7], [h.x, 1], [h.x, 6.8]] as const) assert.ok(grid.path(from.x, from.z, x, z), `reach ${h.plot} at ${x},${z}`);
  }
  assert.ok(grid.path(from.x, from.z, BUS_STOP.x, 0), 'the way out');
  assert.ok(grid.path(from.x, from.z, 66, 13), 'the far pavement');
  assert.ok(!grid.free(rowX(3) - 5, -10), 'a house is solid');
  assert.ok(plan.solids.length > 5 && plan.lights.length <= 5, 'camera solids, and no more point lights than before');
});

test('the same street plans the same, and a vacant plot is given scenery from the city', () => {
  const a = planStreet({ houses: [house(0, 'bq')], seed: 'same', mix }), b = planStreet({ houses: [house(0, 'bq')], seed: 'same', mix });
  assert.deepEqual(a, b);
  const other = planStreet({ houses: [house(0, 'bq')], seed: 'other', mix });
  assert.notDeepEqual(a.scenery, other.scenery);
  const kinds = new Set(a.scenery.map((s) => s.asset));
  assert.ok([...kinds].some((k) => ['church', 'mosque', 'clinic', 'flats', 'unfinished'].includes(k)));
  assert.deepEqual(sceneryMix([], false).buildings, ['shoprow', 'unfinished']);
});

test('palettes and file names', () => {
  assert.equal(fileKey('bungalow', 'mint'), 'bungalow-mint'); assert.equal(fileKey('kiosk', 'cream', 'far'), 'kiosk-teal-far'); assert.equal(fileKey('detail-dish', 'sky', 'far'), 'detail-dish'); assert.equal(fileKey('palm', 'sky'), 'palm-far');
  assert.equal(atlasOf('bungalow-cream'), 'older-cream'); assert.equal(atlasOf('flats-sky-far'), 'older-sky-far'); assert.equal(atlasOf('kiosk-red'), 'street-mint'); assert.equal(atlasOf('palm-far'), 'palm-far');
  assert.equal(wallLook(3).palette, 'mint'); assert.equal(wallLook(0).tint, undefined); assert.ok(wallLook(5).tint);
});

// ---- the files a plan asks for exist, and a full street stays inside the budget ----
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createKit } from '../kit.ts';
import { createGltfSource } from '../models/gltf-source.ts';
import { createModelCache, createModelLayer } from '../models/scene-models.ts';
import { hasFar, isGateLeaf } from './street-kit.ts';

const FILES = new URL('./assets/', import.meta.url);
/** The file read as a glTF scene without its picture (node has no image decoder): geometry, nodes and transforms are the real ones. */
async function open(key: string): Promise<{ scene: THREE.Group }> {
  const bytes = readFileSync(new URL(`${key}.glb`, FILES)), length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString()) as { images?: unknown; textures?: unknown; samplers?: unknown; extensionsUsed?: string[]; materials?: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }[] };
  delete json.images; delete json.textures; delete json.samplers;
  for (const material of json.materials ?? []) delete material.pbrMetallicRoughness?.baseColorTexture;
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name) => name !== 'KHR_texture_transform');
  const text = Buffer.from(JSON.stringify(json)); const padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(20); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + padded.length + bytes.length - 20 - length, 8); head.writeUInt32LE(padded.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const glb = Buffer.concat([head, padded, bytes.subarray(20 + length)]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const picture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  return new Promise((resolve, reject) => loader.parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '', (gltf) => {
    // Pieces that have a picture of their own get a stand-in picture, so atlases and draw calls count as they do in the game.
    if (!key.startsWith('detail-')) gltf.scene.traverse((object) => { const mesh = object as THREE.Mesh; if (mesh.isMesh) (mesh.material as THREE.MeshStandardMaterial).map = picture; });
    resolve({ scene: gltf.scene });
  }, reject));
}

const placementsOf = (plan: { pieces: unknown[] }): number => plan.pieces.length;

test('every file a street can ask for is shipped, and a full street built from the real files stays inside the model budget', async () => {
  const tiers: PlanHouse['tier'][] = ['villa', 'starter', 'duplex', 'bq', 'bungalow', 'duplex', 'starter', 'duplex', 'villa', 'bq', 'bungalow', 'starter', 'bq', 'starter'];
  const kit = createKit();
  const cache = createModelCache(createGltfSource(kit, { urls: {}, atlasOf, open, omit: isGateLeaf }));
  const budget = process.env.G2_NO_BUDGET ? { triangles: 1e9, drawCalls: 1e9 } : { triangles: 11500, drawCalls: 20 };
  try {
    for (const seed of ['a', 'b', 'c']) {
      const houses = tiers.map((tier, plot) => house(plot, tier, { wall: (plot + seed.charCodeAt(0)) % 8, yard: (plot * 3) % 8, own: plot === 5 }));
      const full = sceneryMix([{ kind: 'worship', variant: 'church' }, { kind: 'worship', variant: 'mosque' }, { kind: 'hospital' }, { kind: 'market' }, { kind: 'campus' }, { kind: 'office' }, { kind: 'transport' }], true);
      const plan = planStreet({ houses: houses.filter((_, i) => seed === 'a' || i % 3 !== 0), seed, mix: full });
      const layer = createModelLayer(kit, cache, { budget, nearRadius: 30, focus: { x: rowX(5), z: 8 } });
      for (const item of plan.pieces) {
        assert.ok(existsSync(new URL(`${fileKey(item.asset, item.palette)}.glb`, FILES)), `${fileKey(item.asset, item.palette)} is shipped`);
        if (hasFar(item.asset)) assert.ok(existsSync(new URL(`${fileKey(item.asset, item.palette, 'far')}.glb`, FILES)), `${fileKey(item.asset, item.palette, 'far')} is shipped`);
        layer.add({ near: fileKey(item.asset, item.palette), far: hasFar(item.asset) ? fileKey(item.asset, item.palette, 'far') : undefined, x: item.x, y: item.y ?? 0, z: item.z, ry: item.ry, scale: item.scale, tint: item.tint, mode: item.mode ?? 'merge', labels: item.labels, priority: item.priority, ...(item.detail ? { detail: true } : {}) });
      }
      layer.build();
      await layer.load(() => undefined);
      const stats = layer.stats();
      assert.ok(stats.triangles <= budget.triangles && stats.drawCalls <= budget.drawCalls, `street ${seed}: ${stats.triangles} triangles, ${stats.drawCalls} draw calls`);
      assert.ok(stats.dropped <= placementsOf(plan) * 0.2, `street ${seed} drops only a few details: ${JSON.stringify(stats)}`);
      assert.equal(stats.standIns, 0, 'every file loaded');
      console.log(`street ${seed}: ${JSON.stringify(stats)}`);
      layer.dispose();
    }
  } finally { kit.dispose(); }
});
