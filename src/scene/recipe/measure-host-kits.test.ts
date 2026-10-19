import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { REGION_IDS, KIT_PROP_IDS } from './contract.ts';
import type { MeasuredAsset } from './contract.ts';
import { parseHostKitManifest, readHostKitFile, compareHostKitReport } from './measure-host-kits.ts';

const manifest = () => ({ schema: 'allworld-scene-host-kits', version: 1, kits: REGION_IDS.map(id => ({ id, asset: `scripts/scene-factory/inputs/kits/${id}.glb`, report: `scripts/scene-factory/inputs/kits/${id}.json` })) });
test('host kit manifest requires exactly fourteen unique regions and reproducible paths', () => {
  assert.equal(parseHostKitManifest(manifest()).length, 14);
  const missing = manifest(); missing.kits.pop(); assert.throws(() => parseHostKitManifest(missing), /fourteen/);
  const duplicate = manifest(); duplicate.kits[1] = duplicate.kits[0]!; assert.throws(() => parseHostKitManifest(duplicate), /duplicate/);
  assert.throws(() => parseHostKitManifest({ ...manifest(), heroes: [] }), /unexpected/);
  for (const path of ['/tmp/a.glb', '../a.glb', 'assets/../a.glb', 'docs/agent-work/prep/a.glb', 'tmp/a.glb', 'assets//a.glb']) {
    const bad = manifest(); bad.kits[0]!.asset = path; assert.throws(() => parseHostKitManifest(bad));
  }
  const shared = manifest(); shared.kits[1]!.asset = shared.kits[0]!.asset; assert.throws(() => parseHostKitManifest(shared), /distinct/);
});
test('host kit reader pins bounded regular bytes and rejects symlinks including parent directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'host-kit-reader-'));
  try {
    await mkdir(join(root, 'assets')); await writeFile(join(root, 'assets/kit.glb'), 'bounded bytes');
    const file = await readHostKitFile(root, 'assets/kit.glb', 32);
    assert.equal(file.sha256, createHash('sha256').update('bounded bytes').digest('hex'));
    await assert.rejects(readHostKitFile(root, 'assets/kit.glb', 3), /unbounded/);
    await symlink(join(root, 'assets/kit.glb'), join(root, 'linked.glb'));
    await assert.rejects(readHostKitFile(root, 'linked.glb', 32), /non-regular/);
    await symlink(join(root, 'assets'), join(root, 'alias'));
    await assert.rejects(readHostKitFile(root, 'alias/kit.glb', 32), /symlink/);
    await writeFile(join(root, 'assets/kit.glb'), 'changed bytes');
    assert.notEqual((await readHostKitFile(root, 'assets/kit.glb', 32)).sha256, file.sha256);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('host kit report must exactly match the independently validated asset measurement', () => {
  // Measurement comparison only; this synthetic object is never passed off as decoded GLB proof.
  const actual: MeasuredAsset = { version: 1, kind: 'kit', id: REGION_IDS[0], sha256: '1'.repeat(64), rawBytes: 100, brotliBytes: 80, triangles: KIT_PROP_IDS.length,
    parts: KIT_PROP_IDS.map(node => ({ node, triangles: 1, bounds: { min: [0, 0, 0], max: [1, 1, 1] } })), atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: '2'.repeat(64) } };
  compareHostKitReport({ ...actual, inputs: { offline: true } }, actual, REGION_IDS[0]);
  for (const changed of [{ ...actual, sha256: '3'.repeat(64) }, { ...actual, rawBytes: 101 }, { ...actual, brotliBytes: 81 }, { ...actual, atlas: { ...actual.atlas!, sha256: '4'.repeat(64) } }]) {
    assert.throws(() => compareHostKitReport(changed, actual, REGION_IDS[0]), /differs/);
  }
  const changed = structuredClone(actual); changed.parts[0]!.bounds.max[0] = 2;
  assert.throws(() => compareHostKitReport(changed, actual, REGION_IDS[0]), /differs/);
  assert.throws(() => compareHostKitReport(actual, actual, REGION_IDS[1]), /identity/);
});
