import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPacket, canonical, INDEX, planningPlacement, sha, validatePlanningPacket, verifyFile, verifyInputs } from './bridge.mjs';
import { createAdapter } from '../lagos-geography/adapter.ts';
import { CONFIG, point } from '../lagos-geography/fixture.ts';
import { createSave, encodeSave, readSave, withControl, expressionChannels } from '../human-design-contract/contract.mjs';

const packet = await buildPacket();
test('all four immutable commit snapshots and baseline dependencies retain exact bytes', () => {
  assert.equal(verifyInputs().files, 155);
  assert.equal(INDEX.files.filter(p => p.lane !== 'baseline-read-only').length, 117);
});
test('packet is deterministic across real GLB decodes without changing source files', async () => {
  assert.equal(canonical(await buildPacket()), canonical(packet));
});
test('a one-byte input tamper and an escaping path fail before adoption', () => {
  const root = mkdtempSync(join(tmpdir(), 'aw-contract-tamper-'));
  try {
    writeFileSync(join(root, 'input'), 'x');
    const pin = { path: 'input', bytes: 1, sha256: sha('x') };
    verifyFile(pin, root);
    writeFileSync(join(root, 'input'), 'y');
    assert.throws(() => verifyFile(pin, root), /Hash changed/);
    assert.throws(() => verifyFile({ ...pin, path: '../input' }, root), /Unsafe path/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('Yaba adoption keeps approximate anchor, synthetic AOI and unknown surveyed errors', () => {
  assert.deepEqual(packet.pilot.anchor, { frame: 'lonlat-degrees', lon: 3.382, lat: 6.5075 });
  assert.equal(packet.pilot.localBoundary.length, 5);
  assert.equal(packet.pilot.surveyed, false);
  assert.equal(packet.pilot.horizontalErrorMetres, null);
  assert.equal(packet.provenance.realSourceAdmission, false);
});
test('canonical and Meshopt static exports keep measured height and matching near/far anchors', () => {
  assert.equal(packet.staticAsset.receipts.length, 4);
  for (const r of packet.staticAsset.receipts) {
    assert.ok(Math.abs(r.bounds.max[1] - r.bounds.min[1] - 1) < 0.00003);
    assert.ok(Math.abs(r.anchors.anchor_top[1] - 1) < 0.00003);
    assert.equal(r.staticAdapter.pbrPreserved, false);
    assert.ok(Math.abs(r.rawMaterial.roughness - 0.36) <= 0.000001);
  }
});
test('geography consumes actual exporter paths, metres, pivot and headings including rotated scene', () => {
  const config = { ...CONFIG, scene: { unitsPerMetre: 1.4, yawRadians: Math.PI / 2, translation: { x: 7, y: 3, z: -4 } } };
  const ground = point(10, 20, 0.3), placed = planningPlacement(packet.staticAsset, ground, 90, config);
  assert.deepEqual(placed.groundAnchor, createAdapter(config).localToScene(ground));
  assert.equal(placed.transform.scale, 1.4);
  assert.equal(placed.transform.near, packet.staticAsset.near);
});
test('local metric geometry is not silently equated with projected street metres', () => {
  const a = createAdapter(CONFIG);
  const origin = a.cityToStreet(a.geographicToCity(a.localToGeographic(point(0, 0))));
  const east = a.cityToStreet(a.geographicToCity(a.localToGeographic(point(200, 0))));
  assert.ok(Math.abs(east.x - origin.x - 198.81865094152147) < 1e-7);
  assert.notEqual(east.x - origin.x, 200);
});
test('human v2 identity edits retain expressions and legacy wardrobe through serialization', () => {
  let save = createSave({ body: 'woman', hair: 'braids', outfit: 'kaftan' });
  save.design.expression = { preset: 'soft-smile', intensity: 0.7 };
  const before = expressionChannels(save.design.expression);
  save = withControl(save, 'nose', 'alarWidth', 0.6);
  save = withControl(save, 'earLeft', 'protrusion', -0.4);
  const restored = readSave(encodeSave(save));
  assert.deepEqual(expressionChannels(restored.design.expression), before);
  assert.deepEqual(restored.legacyLook, { body: 'woman', hair: 'braids', outfit: 'kaftan' });
  assert.equal(restored.design.morphology.earRight.protrusion, 0);
  assert.equal(packet.human.meshReady, false);
});
test('human schema packet cannot enter static GLB placement route', () => {
  assert.throws(() => planningPlacement({ route: 'human-design' }, point(0, 0), 0), /Human design/);
});
test('synthetic rights cannot be promoted to real-source or export registry admission', () => {
  for (const mutate of [p => { p.provenance.realSourceAdmission = true; }, p => { p.staticAsset.sourceRegistryAdmission = true; }, p => { p.provenance.googleDerivedInputs = true; }]) {
    const value = structuredClone(packet); mutate(value); assert.throws(() => validatePlanningPacket(value));
  }
});
test('stale schema/source identity and false runtime/route/quality claims fail', () => {
  for (const mutate of [p => { p.schemas.humanSave = 1; }, p => { p.componentCommits['lagos-geography'] = '0'.repeat(40); }, p => { p.routeAuthorized = true; }, p => { p.human.meshReady = true; }, p => { p.acceptance.inGamePilot = true; }, p => { p.pilot.surveyed = true; }]) {
    const value = structuredClone(packet); mutate(value); assert.throws(() => validatePlanningPacket(value));
  }
});
test('unsupported PBR promotion and unresolved placement IDs fail', () => {
  let value = structuredClone(packet); value.staticAsset.receipts[0].staticAdapter.acceptedForPbrRuntime = true;
  assert.throws(() => validatePlanningPacket(value));
  value = structuredClone(packet); value.placements[0].transform.near = 'synthetic:missing';
  assert.throws(() => validatePlanningPacket(value));
});
