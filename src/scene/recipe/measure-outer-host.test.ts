import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOuterHostFixture, readOuterCalibration, assertExpectedOuterCalibration } from './measure-outer-host.ts';
import type { FrameReceipt } from './measure-outer-host.ts';

test('outer fixture owns actual ground/sky and disposes once without disturbing other scene objects', () => {
  const scene = new THREE.Scene(), previous = new THREE.Color('#123456'), unrelated = new THREE.Group();
  scene.background = previous; scene.add(unrelated);
  const outer = createOuterHostFixture(scene);
  let geometryDisposed = 0, materialDisposed = 0, textureDisposed = 0;
  outer.ground.mesh.geometry.addEventListener('dispose', () => geometryDisposed++);
  outer.ground.mesh.material.addEventListener('dispose', () => materialDisposed++);
  outer.sky.texture.addEventListener('dispose', () => textureDisposed++);
  assert.equal(outer.ground.mesh.geometry.index!.count / 3, 144);
  assert.equal(outer.ground.mesh.material.transparent, true);
  assert.equal(outer.ground.mesh.material.side, THREE.DoubleSide);
  assert.equal(outer.ground.mesh.material.forceSinglePass, false);
  assert.equal(outer.ground.mesh.castShadow, false);
  assert.equal(scene.background, outer.sky.texture);
  outer.dispose(); outer.dispose();
  assert.deepEqual([geometryDisposed, materialDisposed, textureDisposed], [1, 1, 1]);
  assert.equal(scene.background, previous); assert.deepEqual(scene.children, [unrelated]);
});

// Synthetic counter receipts test validation only, never WebGL or pixel acceptance.
function receipt(): FrameReceipt {
  return { sceneId: 'fixture', mainCalls: 3, shadowCalls: 0, submittedTriangles: 290, rendererMainCalls: 3, rendererMainTriangles: 290,
    draws: [
      { objectId: 'background', geometryId: 'plane', name: '', material: 'BackgroundMaterial', main: true, calls: 1, triangles: 2 },
      { objectId: 'ground', geometryId: 'disc', name: 'ground', material: '', main: true, calls: 1, triangles: 144 },
      { objectId: 'ground', geometryId: 'disc', name: 'ground', material: '', main: true, calls: 1, triangles: 144 },
    ] };
}
test('calibration separates unique geometry from material submissions and rejects incomplete receipts', () => {
  const result = readOuterCalibration(receipt(), 'ground', 144);
  assert.deepEqual(result.total, { triangles: 146, meshes: 2, mainPasses: 3, shadowPasses: 0 });
  assert.equal(result.frame.submittedTriangles, 290); assertExpectedOuterCalibration(result);
  const missing = receipt(); missing.draws.shift();
  assert.throws(() => readOuterCalibration(missing, 'ground', 144), /background/);
  const counters = receipt(); counters.rendererMainCalls = 2;
  assert.throws(() => readOuterCalibration(counters, 'ground', 144), /counters/);
  const unexpected = receipt(); unexpected.draws[0]!.triangles = 4; unexpected.rendererMainTriangles = 292;
  assert.throws(() => assertExpectedOuterCalibration(readOuterCalibration(unexpected, 'ground', 144)), /differs/);
});
