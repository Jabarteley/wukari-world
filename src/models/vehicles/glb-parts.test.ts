// The authored vehicle models, made ready to use: file naming, wheels that turn with distance, lights that follow the time of day, riders at the seats.
// Runs on a stand-in scene with the same named nodes the shipped files have (the loader and the real files are covered in glb-assets.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLB_KINDS, GLB_VARIANTS, GLB_WHEEL_RADIUS, createGlbVehicle, createTemplate, glbKey, instancingParts, paintFor } from './glb-parts.ts';
import type { GlbKind, GlbRequest } from './glb-parts.ts';

/** A box-bodied vehicle with the named nodes of a shipped model: four wheels, two seats, two head and two tail lights. */
function stand(kind: GlbKind = 'danfo', { wheels = true }: { wheels?: boolean } = {}): THREE.Group {
  const scene = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 4.6), new THREE.MeshStandardMaterial());
  body.position.y = 1;
  scene.add(body);
  const node = (name: string, x: number, y: number, z: number): THREE.Object3D => { const empty = new THREE.Object3D(); empty.name = name; empty.position.set(x, y, z); scene.add(empty); return empty; };
  if (wheels) for (const [name, x, z] of [['wheel_fl', 1, 1.4], ['wheel_fr', -1, 1.4], ['wheel_rl', 1, -1.4], ['wheel_rr', -1, -1.4]] as const) {
    const wheel = node(name, x, GLB_WHEEL_RADIUS[kind], z);
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial()));
  }
  node('seat_driver', 0.6, 1.2, 1.4); node('seat_1', 0.6, 1.1, 0.4);
  node('light_head_l', 0.8, 0.75, 2.3); node('light_head_r', -0.8, 0.75, 2.3);
  node('light_tail_l', 0.8, 0.8, -2.3); node('light_tail_r', -0.8, 0.8, -2.3);
  return scene;
}
const request: GlbRequest = { kind: 'danfo', lod: 'near' };
const make = (night = false) => createGlbVehicle(createTemplate(request, stand()), { night });

test('every kind has file names for its variants, near and far, and an unknown paint takes the first one', () => {
  assert.equal(glbKey({ kind: 'danfo', lod: 'near' }), 'danfo');
  assert.equal(glbKey({ kind: 'danfo', lod: 'far' }), 'danfo-far');
  assert.equal(glbKey({ kind: 'danfo', variant: 'blue-white', lod: 'far' }), 'danfo-blue-white-far');
  assert.equal(glbKey({ kind: 'saloon', variant: 'red', lod: 'near' }), 'saloon-red');
  assert.equal(glbKey({ kind: 'saloon', variant: 'purple', lod: 'near' }), 'saloon', 'no such paint: the plain file');
  assert.equal(glbKey({ kind: 'van', lod: 'near' }), 'van-white', 'a kind with no plain file starts at its first paint');
  for (const kind of GLB_KINDS) assert.ok(GLB_VARIANTS[kind].length > 0 && GLB_WHEEL_RADIUS[kind] > 0.25, kind);
});

test('a colour picks the nearest paint', () => {
  assert.equal(paintFor('saloon', '#b23a2e'), 'red');
  assert.equal(paintFor('saloon', '#2b5fa8'), 'blue');
  assert.equal(paintFor('saloon', '#1f8a86'), 'green');
  assert.equal(paintFor('saloon', '#101010'), 'black');
  assert.equal(paintFor('saloon', '#ffffff'), '', 'white is the plain saloon');
  assert.equal(paintFor('suv', '#f4f4f4'), 'white');
  assert.equal(paintFor('keke', '#b23a2e'), '', 'a kind with one paint has one');
});

test('a scene with no mesh is refused, so a broken file falls back to the procedural vehicle', () => {
  assert.throws(() => createTemplate(request, new THREE.Group()), /no mesh/);
});

test('the wheels turn about the vehicle\'s x axis by the distance travelled over the radius, and replaying a distance changes nothing', () => {
  const vehicle = make();
  assert.equal(vehicle.wheels.length, 4);
  assert.equal(vehicle.spin(0), false, 'at rest nothing turns');
  const turn = 3;
  assert.equal(vehicle.spin(turn), true);
  const expected = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), turn / GLB_WHEEL_RADIUS.danfo);
  for (const wheel of vehicle.wheels) assert.ok(wheel.quaternion.angleTo(expected) < 1e-6, `${wheel.name} is turned`);
  assert.equal(vehicle.spin(turn), false, 'the same distance is the same pose');
  vehicle.spin(turn + 1);
  assert.ok(vehicle.wheels[0]!.quaternion.angleTo(expected) > 0.1, 'more distance, more turn');
  // A wheel that starts turned (a mirrored or pre-rotated node) keeps its own orientation underneath.
  const scene = stand();
  scene.getObjectByName('wheel_fr')!.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const turned = createGlbVehicle(createTemplate(request, scene));
  turned.spin(1);
  const right = turned.object3D.getObjectByName('wheel_fr')!;
  const base = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  assert.ok(right.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1 / GLB_WHEEL_RADIUS.danfo).multiply(base)) < 1e-6);
  assert.equal(vehicle.spin(Number.NaN), true, 'a bad distance is a rest pose, not a crash');
  assert.ok(vehicle.wheels[0]!.quaternion.angleTo(new THREE.Quaternion()) < 1e-6);
});

test('a model with no wheel nodes (the far models have them baked in) spins nothing and does not fail', () => {
  const far = createGlbVehicle(createTemplate({ kind: 'danfo', lod: 'far' }, stand('danfo', { wheels: false })));
  assert.equal(far.wheels.length, 0);
  assert.doesNotThrow(() => far.spin(5));
});

test('the lamps are one mesh, hidden by day and lit at dusk and night, only when the state changes', () => {
  const vehicle = make();
  assert.ok(vehicle.lights);
  assert.equal(vehicle.lights.visible, false, 'dark lamps by day');
  assert.equal(vehicle.night, false);
  assert.equal(vehicle.setNight(true), true);
  assert.equal(vehicle.lights.visible, true);
  assert.equal(vehicle.setNight(true), false, 'already lit');
  assert.equal(vehicle.setNight(false), true);
  assert.equal(vehicle.lights.visible, false);
  // One lamp per light empty, in the vehicle's own frame: the headlights at the front, the tail lights at the back.
  const box = new THREE.Box3().setFromBufferAttribute(vehicle.lights.geometry.getAttribute('position') as THREE.BufferAttribute);
  assert.ok(box.max.z > 2.2 && box.min.z < -2.2 && box.max.x > 0.7 && box.min.x < -0.7, `lamps span the ends: ${box.min.toArray()} to ${box.max.toArray()}`);
  assert.equal(createGlbVehicle(createTemplate(request, stand()), { night: true }).lights!.visible, true, 'built at night, lit at once');
  assert.equal(createGlbVehicle(createTemplate(request, (() => { const s = new THREE.Group(); s.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())); return s; })())).lights, null, 'no light empties, no lamps');
});

test('riders sit at the named seats in one mesh, and a repeat call replaces them', () => {
  const vehicle = make();
  const before = vehicle.drawCalls;
  vehicle.seat([{ seat: 'seat_driver', shirt: '#2b5fa8', skin: '#845236' }, { seat: 'seat_1', shirt: '#c9423a', skin: '#6b4128' }, { seat: 'seat_9', shirt: '#fff', skin: '#fff' }]);
  assert.equal(vehicle.drawCalls, before + 1, 'any number of riders is one draw call');
  const riders = vehicle.object3D.getObjectByName('riders') as THREE.Mesh;
  const box = new THREE.Box3().setFromBufferAttribute(riders.geometry.getAttribute('position') as THREE.BufferAttribute);
  const driver = vehicle.seatPosition('seat_driver')!;
  assert.ok(box.max.x > driver.x && box.min.y < driver.y + 0.2 && box.max.y > driver.y + 0.8, 'the driver is seated at the seat, head above it');
  assert.equal(vehicle.seatPosition('seat_9'), null, 'a seat the model does not have is skipped');
  assert.ok(vehicle.triangles > createTemplate(request, stand()).triangles, 'riders count in the triangles');
  vehicle.seat([{ seat: 'seat_1', shirt: '#fff', skin: '#fff' }]);
  assert.equal(vehicle.object3D.getObjectsByProperty('name', 'riders').length, 1);
  vehicle.seat([]);
  assert.equal(vehicle.object3D.getObjectByName('riders'), undefined);
});

test('a clone shares the template\'s geometry and materials, and disposing it frees only its own', () => {
  const template = createTemplate(request, stand());
  const a = createGlbVehicle(template), b = createGlbVehicle(template);
  const sharedGeometry = (a.object3D.getObjectByProperty('isMesh', true) as THREE.Mesh).geometry;
  assert.equal(sharedGeometry, (b.object3D.getObjectByProperty('isMesh', true) as THREE.Mesh).geometry);
  let freed = 0;
  sharedGeometry.addEventListener('dispose', () => { freed += 1; });
  const lamps = a.lights!;
  let lampsFreed = 0;
  lamps.geometry.addEventListener('dispose', () => { lampsFreed += 1; });
  a.seat([{ seat: 'seat_1', shirt: '#fff', skin: '#fff' }]);
  a.dispose(); a.dispose();
  assert.equal(freed, 0, 'the template\'s geometry lives on for the next clone');
  assert.equal(lampsFreed, 1, 'its own lamps are freed, once');
  assert.equal(a.object3D.parent, null);
  assert.ok(b.object3D.children.length > 0, 'the other clone is untouched');
});

test('instancing parts: one mesh, float attributes, the node transform baked in', () => {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  mesh.position.set(0, 2, 0); mesh.scale.setScalar(2);
  scene.add(mesh);
  const parts = instancingParts(createTemplate({ kind: 'danfo', lod: 'far' }, scene))!;
  assert.ok(parts);
  assert.notEqual(parts.geometry, geometry, 'the template\'s own geometry is left alone');
  parts.geometry.computeBoundingBox();
  assert.deepEqual(parts.geometry.boundingBox!.min.toArray(), [-1, 1, -1]);
  assert.deepEqual(parts.geometry.boundingBox!.max.toArray(), [1, 3, 1]);
  assert.equal(parts.geometry.getAttribute('position').array.constructor, Float32Array);
  assert.equal(instancingParts(createTemplate(request, stand())), null, 'a model of several meshes is not one instanced mesh');
});
