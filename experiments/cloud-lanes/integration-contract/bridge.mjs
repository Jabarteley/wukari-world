/** Offline coordinator adapter. No game registration, network, shared writes or production admission. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createGltfSource } from '../../../src/scene/models/gltf-source.ts';
import { loadBundle, validatePacket } from '../../../docs/agent-plans/cloud-lanes/source-provenance/validate.ts';
import { createAdapter, modelPointToScene } from '../lagos-geography/adapter.ts';
import { CONFIG, PROPOSED_BOUNDARY, point } from '../lagos-geography/fixture.ts';
import { buildManifest, canonicalJson } from '../lagos-geography/manifest.ts';
import { readSave, encodeSave, CONTROL_GROUPS, CHANNELS } from '../human-design-contract/contract.mjs';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../../..');
export const BASELINE = '81d9f599d87dfb34adf49cd9337a0b05678e5e0d';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
export const canonical = canonicalJson;
const EXPORT = 'experiments/cloud-lanes/asset-export-portability/';
const HUMAN = 'experiments/cloud-lanes/human-design-contract/';
const SOURCE = 'docs/agent-plans/cloud-lanes/source-provenance/';
export const INDEX = json('experiments/cloud-lanes/integration-contract/input-index.json');

export function verifyFile(pin, root = ROOT) {
  assert.equal(typeof pin.path, 'string');
  assert.ok(!isAbsolute(pin.path) && !pin.path.includes('\\') && !pin.path.split('/').some(p => !p || p === '.' || p === '..'), 'Unsafe path');
  assert.ok(Number.isSafeInteger(pin.bytes) && pin.bytes >= 0 && pin.bytes <= 4_194_304, 'File byte limit');
  assert.match(pin.sha256, /^[a-f0-9]{64}$/);
  const path = resolve(root, pin.path), real = realpathSync(path), rel = relative(realpathSync(root), real);
  assert.ok(rel && !rel.startsWith('../') && !isAbsolute(rel), 'Escaping real path');
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Regular file required');
  assert.equal(stat.size, pin.bytes, `Byte count changed: ${pin.path}`);
  const bytes = readFileSync(path);
  assert.equal(sha(bytes), pin.sha256, `Hash changed: ${pin.path}`);
  return bytes;
}

export function verifyInputs(index = INDEX) {
  assert.equal(index.schema, 'allworld-cloud-input-index-v1');
  assert.equal(index.baseline, BASELINE);
  assert.ok(index.files.length <= 256 && new Set(index.files.map(p => p.path)).size === index.files.length);
  let bytes = 0;
  for (const pin of index.files) {
    bytes += pin.bytes;
    assert.ok(bytes <= 16_777_216, 'Aggregate input byte limit');
    assert.equal(pin.sourceCommit, pin.lane === 'baseline-read-only' ? BASELINE : index.lanes[pin.lane]);
    verifyFile(pin);
  }
  return { files: index.files.length, bytes };
}

function readStaticGlb(path) {
  const pin = INDEX.files.find(x => x.path === path);
  assert.ok(pin, 'Only indexed GLBs may be opened');
  const bytes = verifyFile(pin);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.ok(!document.skins?.length && !document.animations?.length, 'Static asset only');
  for (const buffer of document.buffers ?? []) assert.ok(!buffer.uri, 'No external buffers');
  assert.equal(document.images?.length ?? 0, 0, 'This golden bridge is texture-free');
  for (const mesh of document.meshes ?? []) for (const primitive of mesh.primitives) {
    assert.ok(!primitive.targets?.length && !primitive.attributes.JOINTS_0 && !primitive.attributes.WEIGHTS_0, 'No human data on static route');
  }
  for (const extension of document.extensionsRequired ?? []) assert.ok(['EXT_meshopt_compression', 'KHR_mesh_quantization'].includes(extension));
  return bytes;
}

async function openStatic(path) {
  const bytes = readStaticGlb(path);
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

function dispose(root) {
  root.traverse(n => { n.geometry?.dispose(); for (const m of (Array.isArray(n.material) ? n.material : n.material ? [n.material] : [])) m.dispose(); });
}

export async function inspectAssetPair() {
  const packet = json(EXPORT + 'packet.json'), spec = json(EXPORT + 'fixture.json');
  assert.equal(packet.route, 'static'); assert.equal(packet.units, 'meters');
  assert.equal(spec.gltfAxes, 'Y up, +Z forward'); assert.deepEqual(packet.pivot, [0, 0, 0]);
  const receipts = [];
  for (const name of ['beacon-near.glb', 'beacon-far.glb', 'beacon-near-meshopt.glb', 'beacon-far-meshopt.glb']) {
    const path = EXPORT + 'artifacts/' + name, gltf = await openStatic(path);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const anchors = {}, materials = []; let triangles = 0;
    gltf.scene.traverse(n => {
      if (n.isMesh) { triangles += n.geometry.index.count / 3; materials.push({ roughness: n.material.roughness, metalness: n.material.metalness }); }
      if (n.name.startsWith('anchor_')) anchors[n.name] = n.getWorldPosition(new THREE.Vector3()).toArray();
    });
    assert.ok(Math.abs(bounds.max.y - bounds.min.y - 1) <= spec.tolerances.positionMeters);
    assert.equal(triangles, name.includes('far') ? 108 : 332);
    for (const [key, expected] of Object.entries(spec.anchors)) for (let i = 0; i < 3; i++) assert.ok(Math.abs(anchors[key][i] - expected[i]) < spec.tolerances.positionMeters);
    for (const m of materials) {
      assert.ok(Math.abs(m.roughness - spec.pbr.roughnessFactor) <= spec.tolerances.material);
      assert.ok(Math.abs(m.metalness - spec.pbr.metallicFactor) <= spec.tolerances.material);
    }
    const source = createGltfSource({ THREE }, { urls: {}, atlasOf: () => '', open: () => openStatic(path) });
    const staticData = await source.load(name);
    assert.equal(staticData.triangles, triangles);
    assert.ok(staticData.parts.every(p => !('roughness' in p) && !('metalness' in p)), 'Baseline static PBR seam changed; review it');
    receipts.push({ path, sha256: INDEX.files.find(x => x.path === path).sha256, triangles,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, anchors, rawMaterial: materials[0],
      staticAdapter: { triangles: staticData.triangles, pbrPreserved: false, acceptedForPbrRuntime: false } });
    source.dispose(); dispose(gltf.scene);
  }
  return {
    id: 'original-meter-beacon@1.0.0', route: 'static', metresPerModelUnit: 1,
    forward: '+z', groundAnchorModel: { x: 0, y: 0, z: 0 },
    near: EXPORT + packet.lod.near, far: EXPORT + packet.lod.far,
    provenanceClass: 'original-export-lane-fixture', sourceRegistryAdmission: false, receipts,
  };
}

export function planningPlacement(asset, ground, headingDegrees, config = CONFIG) {
  assert.equal(asset.route, 'static', 'Human design cannot use static scenery bridge');
  assert.equal(asset.metresPerModelUnit, 1); assert.equal(asset.forward, '+z');
  const adapter = createAdapter(config), transform = adapter.place(asset, ground, headingDegrees);
  return { transform, groundAnchor: modelPointToScene(asset.groundAnchorModel, transform), routeAuthorized: false };
}

export async function buildPacket() {
  const inputs = verifyInputs(), sourceResult = validatePacket(json(SOURCE + 'fixtures/lawful.packet.json'), loadBundle());
  assert.equal(sourceResult.ok, true); assert.equal(sourceResult.eligibleForProduction, false);
  const geography = buildManifest(), asset = await inspectAssetPair();
  const presetIndex = json(HUMAN + 'fixtures/index.json');
  const presets = presetIndex.presets.map(p => {
    const save = readSave(readFileSync(resolve(ROOT, HUMAN + 'fixtures/' + p.file), 'utf8'));
    return { id: p.id, schemaVersion: save.schemaVersion, canonicalSaveSha256: sha(encodeSave(save)), rendered: false };
  });
  const adapter = createAdapter(CONFIG);
  const packet = {
    schema: 'allworld-cloud-pilot-contract-v1', version: '0.1.0', sourceBaseline: BASELINE,
    componentCommits: INDEX.lanes, inputIndexSha256: sha(readFileSync(resolve(HERE, 'input-index.json'))), verifiedInputs: inputs,
    stage: 'isolated-cross-contract-review', eligibleForProduction: false, routeAuthorized: false,
    schemas: { provenancePacket: 'allworld-source-packet@1', geography: geography.schema,
      exportAsset: 'original-meter-beacon@1.0.0', humanSave: 2, humanAnchors: 1 },
    pilot: { id: 'yaba-game-anchor-200m-planning-v1', status: 'adopted-reversible-planning-assumption',
      beta: true, anchor: CONFIG.anchor, sourceProposalId: geography.proposalId, extentMetres: [200, 200],
      localBoundary: PROPOSED_BOUNDARY, geographicBoundary: geography.boundaryProposal.geojson.geometry,
      sourceClassification: 'approximate-repository-anchor-plus-original-synthetic-AOI', surveyed: false,
      horizontalErrorMetres: null, verticalErrorMetres: null, verticalDatum: 'arbitrary-local-zero-unverified',
      use: 'Original authored prototype layout only; no claim of actual road, parcel, business or building positions' },
    coordinateContract: { ...geography.coordinateContract, localToScene: CONFIG,
      eastScaleRelativeToProjectedStreet: adapter.mapEastScaleRelativeToLocal },
    provenance: { syntheticSourceValidation: sourceResult, realSourceAdmission: false,
      exportFixture: 'Original geometry/source declared by export lane; distinct from source registry original-synthetic fixture ID',
      humanFixtures: 'Original fictional parameter data only; no human mesh or texture rights inferred',
      googleDerivedInputs: false },
    staticAsset: asset,
    placements: [point(0, 0), point(-90, 90), point(90, -90)].map((ground, i) => ({
      id: `original-beacon-demo-${i + 1}`, assetId: asset.id, basis: 'authored-synthetic',
      ...planningPlacement(asset, ground, i * 90),
    })),
    human: { profile: 'human-design-v2-proposal', controlSpace: 'legacy-relative-v1',
      controls: Object.values(CONTROL_GROUPS).flat().length, expressionChannels: CHANNELS.length,
      presets, meshReady: false, runtimeInstalled: false, topologyAuthority: 'existing-character-owner-unresolved',
      newGeometryPolicy: 'Original isolated prototype family; never claim compatibility or replace baseline mesh without evidence' },
    acceptance: { sourceHashes: true, staticDecodeAndMetricPlacement: true, humanSerialization: true,
      inGamePilot: false, realisticHuman: false, surveyedBlock: false, hardwarePerformance: false },
  };
  validatePlanningPacket(packet);
  return packet;
}

export function validatePlanningPacket(packet) {
  assert.equal(packet.schema, 'allworld-cloud-pilot-contract-v1');
  assert.equal(packet.sourceBaseline, BASELINE);
  assert.deepEqual(packet.componentCommits, INDEX.lanes);
  assert.equal(packet.eligibleForProduction, false); assert.equal(packet.routeAuthorized, false);
  assert.equal(packet.pilot.surveyed, false); assert.equal(packet.pilot.status, 'adopted-reversible-planning-assumption');
  assert.equal(packet.pilot.horizontalErrorMetres, null); assert.equal(packet.pilot.verticalErrorMetres, null);
  assert.deepEqual(packet.pilot.localBoundary, PROPOSED_BOUNDARY);
  assert.deepEqual(packet.pilot.anchor, CONFIG.anchor);
  assert.equal(packet.schemas.humanSave, 2); assert.equal(packet.schemas.humanAnchors, 1);
  assert.equal(packet.provenance.realSourceAdmission, false); assert.equal(packet.provenance.googleDerivedInputs, false);
  assert.equal(packet.provenance.syntheticSourceValidation.eligibleForProduction, false);
  assert.equal(packet.staticAsset.sourceRegistryAdmission, false);
  assert.equal(packet.staticAsset.metresPerModelUnit, 1); assert.equal(packet.staticAsset.forward, '+z');
  assert.equal(packet.human.meshReady, false); assert.equal(packet.human.runtimeInstalled, false);
  assert.equal(packet.human.presets.length, 7); assert.equal(packet.human.controls, 38); assert.equal(packet.human.expressionChannels, 16);
  assert.ok(packet.staticAsset.receipts.every(x => !x.staticAdapter.acceptedForPbrRuntime && !x.staticAdapter.pbrPreserved));
  for (const p of packet.placements) {
    assert.equal(p.assetId, packet.staticAsset.id); assert.equal(p.routeAuthorized, false);
    assert.equal(p.transform.routeAuthorized, false); assert.equal(p.transform.frame, 'pilot-scene-units');
    assert.equal(p.transform.near, packet.staticAsset.near); assert.equal(p.transform.far, packet.staticAsset.far);
  }
  for (const key of ['inGamePilot', 'realisticHuman', 'surveyedBlock', 'hardwarePerformance']) assert.equal(packet.acceptance[key], false);
  return true;
}
