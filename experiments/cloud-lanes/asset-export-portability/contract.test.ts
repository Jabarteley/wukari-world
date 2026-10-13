import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { createGltfSource } from '../../../src/scene/models/gltf-source.ts';
import type { Kit } from '../../../src/scene/kit.ts';
import { lane, spec, readGlb, assertReceipt, validateAll, open, near } from './validate.ts';

const bytes = readFileSync(join(lane, 'artifacts/beacon-near.glb'));
const golden = JSON.parse(readFileSync(join(lane, 'golden-import.json'), 'utf8'));
test('both authored LODs and EXT Meshopt derivatives match frozen import receipts', async () => {
  assert.deepEqual(await validateAll(), golden);
  assert.ok(golden['beacon-far.glb'].bytes < golden['beacon-near.glb'].bytes);
  assert.ok(golden['beacon-far.glb'].imported.triangles < golden['beacon-near.glb'].imported.triangles);
});

function changedDoc(change: (doc: any) => void) {
  const doc = readGlb(bytes); change(doc);
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const bin = bytes.subarray(20 + bytes.readUInt32LE(12));
  const result = Buffer.concat([bytes.subarray(0, 20), padded, bin]);
  result.writeUInt32LE(result.length, 8); result.writeUInt32LE(padded.length, 12);
  return result;
}
for (const [label, change] of [
  ['skins', (d: any) => { d.skins = [{ joints: [0] }]; }],
  ['animations', (d: any) => { d.animations = [{}]; }],
  ['skin nodes', (d: any) => { d.nodes[0].skin = 0; }],
  ['weights', (d: any) => { d.meshes[0].primitives[0].attributes.WEIGHTS_0 = 0; }],
  ['morphs', (d: any) => { d.meshes[0].primitives[0].targets = [{}]; }],
  ['missing COLOR_0', (d: any) => { delete d.meshes[0].primitives[0].attributes.COLOR_0; }],
  ['Draco', (d: any) => { d.extensionsRequired = ['KHR_draco_mesh_compression']; }],
  ['external buffers', (d: any) => { d.buffers[0].uri = 'unexpected.bin'; }],
] as const) test(`static route rejects ${label}`, () => assert.throws(() => readGlb(changedDoc(change))));

for (const [label, change] of [
  ['centimeters mistaken for meters', (r: any) => { r.bounds.max[1] *= 100; }],
  ['pivot moved', (r: any) => { r.rootPosition[0] = 1; }],
  ['anchor moved', (r: any) => { r.anchors.anchor_top[1] = 0.9; }],
  ['sRGB written as linear', (r: any) => { r.palette = spec.srgbPalette; }],
  ['PBR factor lost', (r: any) => { r.pbr.roughnessFactor = 0.92; }],
  ['LOD budget drift', (r: any) => { r.triangles++; }],
  ['winding inverted', (r: any) => { r.signedVolume *= -1; }],
] as const) test(`contract rejects ${label}`, () => {
  const r = structuredClone(golden['beacon-near.glb'].imported); change(r);
  assert.throws(() => assertReceipt(r, 'near'));
});

test('the current static adapter bakes nonidentity parent transforms and transforms anchors', async () => {
  const scene = (await open(bytes)).scene;
  scene.position.set(2, 3, -4); scene.scale.setScalar(2); scene.rotation.y = Math.PI / 2;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const source = createGltfSource({ THREE } as Kit, { urls: {}, atlasOf: () => '', open: async () => ({ scene }) });
  const data = await source.load('transformed');
  const baked = new THREE.Box3();
  for (const part of data.parts) for (let i = 0; i < part.position.length; i += 3) baked.expandByPoint(new THREE.Vector3().fromArray(part.position, i));
  near(baked.min.toArray(), box.min.toArray(), 1e-6, 'transformed min');
  near(baked.max.toArray(), box.max.toArray(), 1e-6, 'transformed max');
  near(data.anchors.anchor_top, [2, 5, -4], 1e-6, 'transformed top anchor');
  source.dispose?.();
});

test('truncated GLB is rejected before import', () => assert.throws(() => readGlb(bytes.subarray(0, bytes.length - 4))));
