import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../kit.ts';
import { measureNonRecipeHost, measureCompleteNonRecipeHost, hostMeasurementsFromAudit } from './measure-host.ts';
import type { HostAuditCoverage } from './measure-host.ts';
import { createOuterHostFixture } from './measure-outer-host.ts';
import { acceptedOuterCalibration } from './calibrated-host.ts';

test('host measurement excludes whole recipe subtrees and native reservations but retains real host geometry and lights', () => {
  const kit = createKit(), { THREE } = kit, scene = new THREE.Scene();
  const material = new THREE.MeshBasicMaterial(), geometry = new THREE.BoxGeometry();
  const host = new THREE.Mesh(geometry, material); host.castShadow = true;
  const recipe = new THREE.Group(); recipe.add(new THREE.Mesh(geometry, material), new THREE.PointLight());
  const floor = new THREE.Mesh(geometry, material);
  const native = new THREE.Group(); Object.assign(native.userData, { canonicalCharacter: true, characterReservedTriangles: 72000, characterReservedDrawCalls: 12 });
  const hidden = new THREE.Group(); hidden.visible = false; hidden.add(new THREE.PointLight());
  scene.add(host, recipe, floor, native, hidden, new THREE.HemisphereLight(), new THREE.DirectionalLight());
  try {
    assert.deepEqual(measureNonRecipeHost(scene, [recipe, floor]), { triangles: 12, meshes: 1, lights: 2, drawCalls: 2 });
    assert.equal(recipe.parent, scene, 'measurement does not reparent recipe geometry');
    assert.equal(floor.parent, scene, 'measurement does not remove visible support');
  } finally { material.dispose(); geometry.dispose(); kit.dispose(); }
});


test('full host measurement includes real outer geometry once and the calibrated background/material passes', async () => {
  const { calibration } = await acceptedOuterCalibration();
  const kit = createKit(), scene = new kit.THREE.Scene(), outer = createOuterHostFixture(scene);
  const material = new kit.THREE.MeshBasicMaterial(), geometry = new kit.THREE.BoxGeometry();
  const host = new kit.THREE.Mesh(geometry, material); host.castShadow = true;
  const recipe = new kit.THREE.Mesh(geometry, material);
  scene.add(host, recipe, new kit.THREE.HemisphereLight(), new kit.THREE.DirectionalLight());
  try {
    const children = [...scene.children];
    const measured = measureCompleteNonRecipeHost(scene, [recipe], outer, calibration);
    assert.deepEqual(measured, { triangles: 158, meshes: 3, lights: 2, drawCalls: 5 });
    assert.deepEqual(measureCompleteNonRecipeHost(scene, [recipe], outer, calibration), measured, 'repeated measurement does not accumulate outer geometry');
    assert.deepEqual(scene.children, children, 'measurement does not reparent geometry');
    assert.throws(() => measureCompleteNonRecipeHost(scene, [outer.ground.mesh], outer, calibration), /must not contain outer ground/);
    outer.ground.mesh.removeFromParent();
    assert.throws(() => measureCompleteNonRecipeHost(scene, [recipe], outer, calibration), /present exactly once/);
  } finally { outer.dispose(); material.dispose(); geometry.dispose(); kit.dispose(); }
});

test('canonical host input covers exact inventoried cities and venues and refuses incomplete representative proof', () => {
  // Minimal synthetic coverage projection: no external audit JSON or local asset payloads.
  const audit: HostAuditCoverage = {
    failures: [], missingTableVenues: [], sourcePins: [{ path: 'src/scene/look.ts', sha256: '1'.repeat(64) }],
    briefs: [{ city: 'accra', targets: 1 }, { city: 'abuja', targets: 1 }, { city: 'lagos', targets: 0 }],
    inventory: [
      { city: 'accra', venue: 'accra-market-game', signature: 'same-support', representative: true },
      { city: 'abuja', venue: 'abuja-market-game', signature: 'same-support', representative: false },
    ],
    rows: [{ city: 'accra', venue: 'accra-market-game', maximum: { triangles: 580, meshes: 7, lights: 3 } }],
  };
  const cityIds = audit.briefs.map(b => b.city), result = hostMeasurementsFromAudit(audit, cityIds);
  assert.deepEqual(Object.keys(result.cities), ['abuja', 'accra', 'lagos']);
  assert.equal(Object.values(result.cities).reduce((n, venues) => n + Object.keys(venues).length, 0), 2);
  assert.deepEqual(result.cities.lagos, {});
  assert.deepEqual(result.cities.accra?.['accra-market-game'], { triangles: 580, meshes: 7, lights: 3 });
  assert.deepEqual(result.cities.abuja?.['abuja-market-game'], result.cities.accra?.['accra-market-game']);
  assert.throws(() => hostMeasurementsFromAudit(audit, cityIds.slice(1)), /exact city coverage/);
  assert.throws(() => hostMeasurementsFromAudit({ ...audit, rows: [] }, cityIds), /missing measured signature/);
  assert.throws(() => hostMeasurementsFromAudit({ ...audit, missingTableVenues: [{ city: 'accra', venue: 'accra-park', missing: ['chess'] }] }, cityIds), /missing tables/);
  assert.throws(() => hostMeasurementsFromAudit({ ...audit, rows: [{ city: 'accra', venue: 'accra-market-game', maximum: { triangles: 580, meshes: 14, lights: 3 } }] }, cityIds));
});
