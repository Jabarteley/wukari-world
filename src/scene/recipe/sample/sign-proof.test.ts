import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { proveSign } from './sign-proof.ts';
import type { ObservedFrame } from '../measure-outer-host.ts';
import type { SceneRecipeV1 } from '../contract.ts';

const signs: SceneRecipeV1['signs'] = [{ text: 'Declared sign', position: [0, 0, 0], width: 2, height: 2, ry: 0 }];
function fixture() {
  const scene = new THREE.Scene(), venue = new THREE.Group(); scene.add(venue);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const material = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(g, material); mesh.name = 'recipe:signs'; venue.add(mesh);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(0, 0, 5);
  const aim = (inside: boolean) => { camera.lookAt(inside ? new THREE.Vector3() : new THREE.Vector3(100, 0, 5)); camera.updateMatrixWorld(true); scene.updateMatrixWorld(true); };
  aim(true);
  const frame = (main: boolean | null, triangles = 2): ObservedFrame => ({ scene, camera, objects: new Map(), receipt: { sceneId: scene.uuid,
    draws: main === null ? [] : [{ objectId: mesh.uuid, geometryId: g.uuid, name: mesh.name, material: '', main, calls: 1, triangles }],
    mainCalls: Number(main === true), shadowCalls: Number(main === false), submittedTriangles: main === null ? 0 : triangles,
    rendererMainCalls: Number(main === true), rendererMainTriangles: main === true ? triangles : 0 } });
  return { scene, venue, mesh, g, material, camera, aim, frame, dispose() { g.dispose(); material.dispose(); } };
}

test('sign outside-view is pending until full main draw; shadow-only never certifies coverage', () => {
  const f = fixture();
  try {
    f.aim(false);
    const outside = proveSign(f.frame(false), f.mesh, f.venue, signs);
    assert.equal(outside.inFrustum, false); assert.equal(outside.coverage, 'pending-main-view'); assert.equal(outside.witness, null);
    f.aim(true);
    assert.throws(() => proveSign(f.frame(false), f.mesh, f.venue, signs), /Eligible sign/);
    const visible = proveSign(f.frame(true), f.mesh, f.venue, signs);
    assert.equal(visible.coverage, 'main-witnessed'); assert.equal(visible.currentSubmission, 'complete-main');
    f.aim(false);
    const later = proveSign(f.frame(null), f.mesh, f.venue, signs, visible.witness);
    assert.equal(later.currentSubmission, 'outside-view-unobserved'); assert.equal(later.coverage, 'main-witnessed');
    assert.deepEqual(later.witness, visible.witness);
    assert.equal(proveSign(f.frame(null), f.mesh, f.venue, [{ ...signs[0]!, text: 'Changed declaration' }], visible.witness).coverage, 'pending-main-view');
    f.mesh.geometry = f.g.clone();
    assert.equal(proveSign(f.frame(null), f.mesh, f.venue, signs, visible.witness).coverage, 'pending-main-view');
    f.mesh.geometry.dispose(); f.mesh.geometry = f.g;
  } finally { f.dispose(); }
});

test('sign partial submission and altered declared geometry fail even outside view', () => {
  const f = fixture();
  try {
    assert.throws(() => proveSign(f.frame(true, 1), f.mesh, f.venue, signs), /complete geometry/);
    f.aim(false); f.g.setDrawRange(0, 3);
    assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /Partial sign/); f.g.setDrawRange(0, Infinity);
    for (const [name, pattern] of [['position', /position\/normal/], ['normal', /position\/normal/], ['uv', /UV/]] as const) {
      const a = f.g.getAttribute(name), old = a.getX(0); a.setX(0, old + 0.25);
      assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), pattern); a.setX(0, old);
    }
    f.g.index!.setX(0, 1); assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /index differs/); f.g.index!.setX(0, 0);
    f.mesh.scale.setScalar(1.4); f.scene.updateMatrixWorld(true);
    assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /second transform/);
  } finally { f.dispose(); }
});

test('hidden sign, disabled camera layer and forged culling sphere cannot bypass main coverage', () => {
  const f = fixture();
  try {
    f.mesh.visible = false; assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /hidden/); f.mesh.visible = true;
    f.material.visible = false; assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /disabled/); f.material.visible = true;
    f.mesh.layers.set(1); assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /disabled/); f.mesh.layers.set(0);
    Object.defineProperty(f.mesh, 'boundingSphere', { configurable: true, value: new THREE.Sphere() });
    assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /culling changed/); Reflect.deleteProperty(f.mesh, 'boundingSphere');
    f.g.boundingSphere = new THREE.Sphere(new THREE.Vector3(1000, 0, 0), 0.1);
    assert.throws(() => proveSign(f.frame(null), f.mesh, f.venue, signs), /culling sphere/);
  } finally { f.dispose(); }
});
