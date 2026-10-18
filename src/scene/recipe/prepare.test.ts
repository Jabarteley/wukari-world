import './node-test-fixture.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { brotliCompressSync } from 'node:zlib';
import { createKit } from '../kit.ts';
import { RecipeAssetStore } from './prepare.ts';
import { preparedCacheFor } from './cache.ts';
import { parseRecipePack, sha256 } from './pack.ts';
import { fixtureAssets, fixturePack, fixtureFetch } from './runtime.test-support.ts';
import { imageHeaderBitmap } from './image-header-fixture.ts';

function changeJson(input: Uint8Array, change: (doc: Record<string, unknown>) => void): Uint8Array<ArrayBuffer> {
  const old = Buffer.from(input), length = old.readUInt32LE(12), json = JSON.parse(old.subarray(20, 20 + length).toString());
  change(json); const text = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(padded);
  const bin = old.subarray(20 + length), result = Buffer.alloc(20 + padded.length + bin.length);
  old.copy(result, 0, 0, 20); result.writeUInt32LE(result.length, 8); result.writeUInt32LE(padded.length, 12); padded.copy(result, 20); bin.copy(result, 20 + padded.length);
  return new Uint8Array(result);
}

test('pack validates exact original bytes, target IDs and content-addressed asset identity', async () => {
  const pack = await fixturePack(); assert.equal((await parseRecipePack(pack, 'accra')).text, pack.text);
  await assert.rejects(parseRecipePack({ ...pack, text: pack.text + ' ' }, 'accra'), /byte\/hash/);
  const wrong = structuredClone(pack); wrong.metadata.assets.kit.url = '/assets/scene-kits/gulf-guinea.glb';
  await assert.rejects(parseRecipePack(wrong, 'accra'), /asset URL/);
  const duplicate = structuredClone(pack); duplicate.metadata.targetVenueIds.push(duplicate.metadata.targetVenueIds[0]!);
  await assert.rejects(parseRecipePack(duplicate, 'accra'), /target IDs/);
  const missing = structuredClone(pack); missing.metadata.hostScenery = Object.fromEntries(Object.entries(missing.metadata.hostScenery).slice(1));
  await assert.rejects(parseRecipePack(missing, 'accra'), /hostScenery.*missing field/);
  const extra = structuredClone(pack); extra.metadata.hostScenery = { ...extra.metadata.hostScenery, default: { triangles: 434, meshes: 5, lights: 3 } };
  await assert.rejects(parseRecipePack(extra, 'accra'), /hostScenery.*unknown field/);
});

test('actual final Meshopt assets are prepared once; per-Kit clones retain canonical pixels', async () => {
  const fetch = await fixtureFetch(), store = new RecipeAssetStore(), pack = await fixturePack();
  const a = createKit(), b = createKit();
  try {
    const [first, same] = await Promise.all([store.prepareCity(pack.metadata), store.prepareCity(pack.metadata)]);
    assert.equal(first.kit, same.kit); assert.equal(first.hero, same.hero); assert.equal(fetch.reads.size, 2); assert.ok([...fetch.reads.values()].every(n => n === 1));
    assert.equal(first.kit.models.size, 20); assert.equal(first.hero?.models.size, 1);
    const ac = preparedCacheFor(a, first), bc = preparedCacheFor(b, first), atlas = first.kit.atlas!;
    assert.equal(store.retainedImageBytes, 4 * 1024 * 1024); assert.equal(atlas.users, 2);
    assert.notEqual(ac.source.texture(atlas.key), bc.source.texture(atlas.key));
    assert.equal(ac.source.texture(atlas.key)?.source, bc.source.texture(atlas.key)?.source);
    a.dispose(); assert.equal(atlas.users, 1); assert.equal(bc.source.texture(atlas.key)?.source.data, atlas.image);
    b.dispose(); assert.equal(atlas.users, 0);
  } finally { a.dispose(); b.dispose(); await store.dispose(); fetch.restore(); }
});

test('image failure never produces ready data and a failed asset can retry', async () => {
  const fetch = await fixtureFetch(), store = new RecipeAssetStore(), { kit } = await fixtureAssets();
  const original = globalThis.createImageBitmap;
  try {
    Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: async () => { throw new Error('intentional decode failure'); } });
    await assert.rejects(store.prepare(kit, 'gulf-guinea'), /atlas decode failed/);
    assert.equal(store.retainedImageBytes, 0);
    Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: imageHeaderBitmap });
    const ready = await store.prepare(kit, 'gulf-guinea'); assert.equal(ready.models.size, 20);
    assert.equal(fetch.reads.get(kit.url), 2);
  } finally { Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: original }); await store.dispose(); fetch.restore(); }
});

test('concurrent final files with the same atlas close duplicate images and preserve the canonical image', async () => {
  const { kit, files } = await fixtureAssets(), bytes = await readFile(files.get(kit.url)!);
  const changed = changeJson(bytes, doc => { doc.extras = { diagnostic: 'same-atlas-independent-final-file' }; });
  const second = structuredClone(kit); second.measurement.sha256 = await sha256(changed); second.measurement.rawBytes = changed.length; second.measurement.brotliBytes = brotliCompressSync(changed).length;
  second.url = `/assets/scene-factory/kits/gulf-guinea-${second.measurement.sha256}.glb`;
  const originalFetch = globalThis.fetch, originalBitmap = globalThis.createImageBitmap;
  const images: { width: number; height: number; closes: number; close(): void }[] = [];
  globalThis.fetch = async (input, init) => String(input) === kit.url ? new Response(bytes) : String(input) === second.url ? new Response(changed) : originalFetch(input, init);
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: async (blob: Blob) => {
    const { width, height } = await imageHeaderBitmap(blob); const image = { width, height, closes: 0, close() { this.closes++; } }; images.push(image); return image;
  } });
  const store = new RecipeAssetStore();
  try {
    const [one, two] = await Promise.all([store.prepare(kit, 'gulf-guinea'), store.prepare(second, 'gulf-guinea')]);
    assert.equal(one.atlas, two.atlas); assert.equal(images.length, 2); assert.deepEqual(images.map(i => i.closes), [0, 1]);
    await store.dispose(); assert.deepEqual(images.map(i => i.closes), [1, 1]);
  } finally { await store.dispose(); globalThis.fetch = originalFetch; Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: originalBitmap }); }
});

test('post-image geometry validation failure closes its owned image and leaves no retained atlas', async () => {
  const fetch = await fixtureFetch(), store = new RecipeAssetStore(), { kit } = await fixtureAssets();
  const original = globalThis.createImageBitmap; let closes = 0;
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: async (blob: Blob) => ({ ...await imageHeaderBitmap(blob), close() { closes++; } }) });
  try {
    const invalid = structuredClone(kit); invalid.measurement.parts[0]!.bounds.max[1] += 0.1;
    await assert.rejects(store.prepare(invalid, 'gulf-guinea'), /bounds differ/);
    assert.equal(closes, 1); assert.equal(store.retainedImageBytes, 0);
    await store.prepare(kit, 'gulf-guinea'); assert.equal(closes, 1);
    await store.dispose(); assert.equal(closes, 2);
  } finally { await store.dispose(); fetch.restore(); Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: original }); }
});
