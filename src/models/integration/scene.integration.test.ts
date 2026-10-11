import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { VehicleUserData } from '../vehicles/index.ts';
import { createKit } from '../../scene/kit.ts';
import { createActor } from '../../map3d/actor.ts';
import type { TravelVehicleBuilder } from '../../map3d/actor.ts';
import { buildTravelVehicle, useGlbSource } from './scene-models.ts';
import type { GlbSource } from './scene-models.ts';
import { createGlbVehicle, createTemplate } from '../vehicles/glb-parts.ts';
import type { GlbRequest, GlbTemplate } from '../vehicles/glb-parts.ts';

/** The pose record the adapter keeps on the vehicle for diagnostics. */
interface ScenePose { distance: number; steering: number; riding: boolean }

function disposalCounter(root: THREE.Object3D, excluded: THREE.Object3D | null = null) {
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  root.traverse((object) => {
    for (let at: THREE.Object3D | null = object; excluded && at; at = at.parent) if (at === excluded) return;
    const { geometry, material } = object as Partial<THREE.Mesh>;
    if (geometry) resources.add(geometry);
    if (Array.isArray(material)) material.forEach((item) => resources.add(item));
    else if (material) resources.add(material);
  });
  let disposed = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => { disposed += 1; });
  return { resources, get disposed() { return disposed; } };
}

function worldPosition(object: THREE.Object3D) {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new THREE.Vector3());
}

test('the map actor seats the real avatar on a model anchor and poses one owned vehicle', () => {
  const kit = createKit();
  // The map's builder type is looser (time: string, Group) than the model library's (day | night, Object3D); the host only passes valid values.
  const actor = createActor(kit, { travelVehicle: buildTravelVehicle as unknown as TravelVehicleBuilder });
  actor.setPlayer({ seed: 'integration', look: { body: 'woman', hair: 'braids', outfit: 'casual' } });
  assert.equal(actor.setMode('danfo'), true);

  const danfo = actor.group.getObjectByName('vehicle:danfo');
  const passenger = actor.group.getObjectByName('actor-passenger');
  assert.ok(danfo && passenger);
  const seat = (danfo.userData as VehicleUserData).anchors.seats.at(-1);
  assert.ok(seat);
  assert.equal(passenger.parent, seat, 'the passenger is attached to the vehicle seat anchor');
  actor.group.updateMatrixWorld(true);
  assert.ok(worldPosition(passenger).distanceTo(worldPosition(seat)) < 1e-9, 'passenger origin follows the seat in world space');
  const passengerHeight = new THREE.Box3().setFromObject(passenger).getSize(new THREE.Vector3()).y;
  assert.ok(passengerHeight > 1.2 && passengerHeight < 2.1, `seated avatar fits the vehicle (${passengerHeight.toFixed(2)} units tall)`);

  const dayVehicleResources = disposalCounter(danfo, passenger);
  const passengerGeometries = new Set<THREE.BufferGeometry>();
  passenger.traverse((object: THREE.Object3D) => { const { geometry } = object as Partial<THREE.Mesh>; if (geometry) passengerGeometries.add(geometry); });
  let passengerDisposals = 0;
  for (const geometry of passengerGeometries) geometry.addEventListener('dispose', () => { passengerDisposals += 1; });
  assert.equal(actor.setTime('dusk'), false, 'dusk keeps the day vehicle phase');
  assert.equal(actor.setTime('night'), true);
  assert.equal(dayVehicleResources.disposed, dayVehicleResources.resources.size, 'time changes release the old vehicle resources');
  assert.equal(passengerDisposals, 0, 'vehicle lighting changes do not rebuild or dispose the passenger');
  const nightDanfo = actor.group.getObjectByName('vehicle:danfo');
  assert.ok(nightDanfo);
  const night = nightDanfo.userData as VehicleUserData & { scenePose: ScenePose };
  assert.notEqual(nightDanfo, danfo);
  assert.equal(actor.group.getObjectByName('actor-passenger'), passenger, 'the same passenger is reattached after the phase change');
  assert.equal(passenger.parent, night.anchors.seats.at(-1));
  assert.equal(actor.setTime('night'), false);
  assert.equal(actor.group.getObjectByName('vehicle:danfo'), nightDanfo, 'the same phase does not rebuild');

  actor.place({ phase: 'ride', distance: 2, x: 8, y: 0, z: 5, ry: 0, bridge: null, walking: false, step: 0, vehicle: { x: 8, y: 0, z: 5, ry: 0, bridge: null } });
  const firstWheel = night.parts.wheels[0];
  assert.ok(firstWheel);
  const firstRoll = firstWheel.rotation.x;
  actor.place({ phase: 'ride', distance: 4, x: 9, y: 0, z: 6, ry: 0.18, bridge: null, walking: false, step: 0, vehicle: { x: 9, y: 0, z: 6, ry: 0.18, bridge: null } });
  assert.notEqual(firstWheel.rotation.x, firstRoll, 'route distance spins the wheels');
  assert.ok(Math.abs(night.scenePose.steering) > 0.1, 'route heading changes steer the front wheels');
  assert.notEqual(night.parts.body.position.y, 0, 'the host pose supplies suspension bounce');
  const diagnostic = night.scenePose;
  const repeated = { steering: diagnostic.steering, wheel: firstWheel.rotation.x, bodyY: night.parts.body.position.y };
  actor.place({ phase: 'ride', distance: 4, x: 9, y: 0, z: 6, ry: 0.18, bridge: null, walking: false, step: 0, vehicle: { x: 9, y: 0, z: 6, ry: 0.18, bridge: null } });
  assert.equal(night.scenePose, diagnostic, 'the hot-path diagnostic record is reused');
  assert.deepEqual({ steering: diagnostic.steering, wheel: firstWheel.rotation.x, bodyY: night.parts.body.position.y }, repeated, 'an identical route sample is idempotent, including steering');

  const danfoResources = disposalCounter(nightDanfo, passenger);
  assert.equal(actor.setMode('car'), true);
  assert.equal(danfoResources.disposed, danfoResources.resources.size, 'mode change releases every old vehicle resource');
  const sedan = actor.group.getObjectByName('vehicle:sedan');
  assert.ok(sedan && actor.group.getObjectByName('actor-passenger')?.parent === (sedan.userData as VehicleUserData).anchors.seats.at(-1));
  assert.equal(actor.setMode('car'), false, 'setting the same mode does not rebuild');
  assert.equal(actor.group.getObjectByName('vehicle:sedan'), sedan);

  actor.dot(true);
  actor.place({ phase: 'ride', distance: 5, x: 10, y: 0, z: 7, ry: 0.2, bridge: null, walking: false, step: 0, vehicle: { x: 10, y: 0, z: 7, ry: 0.2, bridge: null } });
  assert.equal(actor.group.getObjectByName('actor-dot')?.visible, true);
  assert.equal(actor.group.getObjectByName('actor-ride')?.visible, false, 'reduced motion remains the route dot');

  const sedanResources = disposalCounter(sedan, actor.group.getObjectByName('actor-passenger') ?? null);
  actor.dispose();
  actor.dispose();
  assert.equal(sedanResources.disposed, sedanResources.resources.size, 'actor disposal is complete and idempotent');
  kit.dispose();
});

test('without a vehicle builder (the library failed to load) the actor rides the game\'s own batch-drawn vehicle', () => {
  const kit = createKit();
  const actor = createActor(kit);
  actor.setPlayer({ seed: 'default' });
  actor.setMode('danfo');
  assert.ok(actor.group.getObjectByName('legacy-vehicle:danfo'));
  assert.equal(actor.group.getObjectByName('vehicle:danfo'), undefined);
  assert.equal(actor.setTime('night'), true, 'the time is remembered');
  assert.ok(actor.group.getObjectByName('legacy-vehicle:danfo'), 'and changes nothing without a model vehicle');
  actor.dispose();
  kit.dispose();
});

test('a model trip vehicle stays inside the map\'s budget: at most 1,500 triangles and 8 draw calls at street detail', () => {
  for (const kind of ['danfo', 'keke', 'okada', 'cab', 'car']) {
    const vehicle = buildTravelVehicle(kind, { time: 'day' });
    assert.ok(vehicle);
    let triangles = 0, calls = 0;
    vehicle.object3D.traverse((node) => {
      const object = node as THREE.InstancedMesh;
      if (!object.isMesh) return;
      calls += 1;
      triangles += (object.geometry.index ? object.geometry.index.count : object.geometry.attributes.position!.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    });
    assert.ok(triangles <= 1500 && calls <= 8, `${kind}: ${Math.round(triangles)} triangles, ${calls} draw calls`);
    vehicle.dispose();
  }
  assert.equal(buildTravelVehicle('trek'), null, 'a mode without a vehicle has none');
});


test('boat keeps a real vehicle and passenger when the road model library is loaded', () => {
  const kit = createKit();
  const actor = createActor(kit, { travelVehicle: buildTravelVehicle as unknown as TravelVehicleBuilder });
  actor.setPlayer({ seed: 'boat-passenger' });
  actor.setMode('boat');
  const boat = actor.group.getObjectByName('legacy-vehicle:boat');
  assert.ok(boat && boat.children.length > 0);
  assert.ok(actor.group.getObjectByName('actor-passenger'));
  actor.setMode('danfo');
  assert.equal(actor.group.getObjectByName('legacy-vehicle:boat'), undefined);
  assert.ok(actor.group.getObjectByName('vehicle:danfo'));
  actor.setMode('boat');
  assert.ok(actor.group.getObjectByName('legacy-vehicle:boat'));
  actor.dispose();
  kit.dispose();
});

/** A stand-in for the authored models: a box body with the named nodes, handed out when `release()` is called (or at once with `ready`). */
function fakeSource(ready = false) {
  const templates = new Map<string, GlbTemplate>();
  const waiting: Array<() => void> = [];
  const requests: string[] = [];
  const make = (request: GlbRequest): GlbTemplate => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 4.4), new THREE.MeshStandardMaterial()));
    for (const [name, x, y, z] of [['seat_driver', 0.4, 0.6, 0.3], ['seat_1', -0.4, 0.6, 0.3], ['seat_3', -0.4, 0.6, -0.9], ['light_head_l', 0.6, 0.4, 2.2], ['light_tail_l', 0.6, 0.5, -2.2]] as const) { const node = new THREE.Object3D(); node.name = name; node.position.set(x, y, z); scene.add(node); }
    for (const name of request.lod === 'near' ? ['wheel_fl', 'wheel_rl'] : []) { const wheel = new THREE.Object3D(); wheel.name = name; scene.add(wheel); }
    return createTemplate(request, scene);
  };
  const key = (request: GlbRequest): string => `${request.kind}:${request.variant ?? ''}:${request.lod}`;
  const source: GlbSource = {
    peek: (request) => templates.get(key(request)) ?? null,
    load: (request) => { requests.push(key(request)); return new Promise((resolve) => { const done = () => { const template = make(request); templates.set(key(request), template); resolve(template); }; if (ready) done(); else waiting.push(done); }); },
    instantiate: (template, options) => createGlbVehicle(template, options),
    instancing: () => null,
  };
  return { source, requests, release: () => { while (waiting.length) waiting.shift()!(); } };
}
const nextTick = () => new Promise((resolve) => setImmediate(resolve));

test('an authored model replaces the procedural vehicle when it arrives, in place: the passenger stays on the seat anchor, the frame is asked for, the old parts are hidden', async () => {
  const fake = fakeSource();
  useGlbSource(fake.source);
  try {
    let changes = 0;
    const vehicle = buildTravelVehicle('keke', { time: 'day', onChange: () => { changes += 1; } });
    assert.ok(vehicle);
    assert.equal(vehicle.authored, false, 'the procedural vehicle is drawn at once');
    assert.deepEqual(fake.requests, ['keke::far']);
    const passenger = new THREE.Group();
    vehicle.attachPassenger(passenger);
    const proceduralSeat = vehicle.seatAnchor;
    fake.release(); await nextTick();
    assert.equal(vehicle.authored, true);
    assert.equal(changes, 1, 'the host is told to draw again');
    assert.equal(passenger.parent, vehicle.seatAnchor);
    assert.equal(vehicle.seatAnchor, proceduralSeat, 'the same anchor, moved to the model\'s seat');
    assert.equal(vehicle.seatAnchor.parent, vehicle.object3D);
    assert.ok(vehicle.object3D.getObjectByName('glb-vehicle:keke-far'));
    // The seat the player takes in the model, and the driver figure at the other.
    assert.ok(vehicle.seatAnchor.position.distanceTo(new THREE.Vector3(-0.4, 0.6, 0.3)) < 1e-6 || vehicle.seatAnchor.position.x !== 0);
    assert.ok(vehicle.object3D.getObjectByName('riders'), 'a keke has an open cab: its driver is drawn');
    vehicle.dispose(); vehicle.dispose();
    assert.equal(passenger.parent, null, 'disposal releases the passenger without disposing it');
  } finally { useGlbSource(null); }
});

test('with the model already cached the vehicle is the authored one from the first frame, and its lamps follow dusk and night', async () => {
  const fake = fakeSource(true);
  useGlbSource(fake.source);
  try {
    await fake.source.load({ kind: 'danfo', lod: 'far' });
    const vehicle = buildTravelVehicle('danfo', { time: 'day' })!;
    assert.equal(vehicle.authored, true);
    const lamps = vehicle.object3D.getObjectByName('lights') as THREE.Mesh;
    assert.equal(lamps.visible, false);
    assert.equal(vehicle.setLights(true), true);
    assert.equal(lamps.visible, true);
    assert.equal(vehicle.setLights(true), false);
    assert.equal(vehicle.setLights(false), true);
    assert.equal(lamps.visible, false);
    assert.equal(buildTravelVehicle('danfo', { time: 'night' })!.object3D.getObjectByName('lights')!.visible, true, 'built at night, lit');
  } finally { useGlbSource(null); }
});

test('the close view swaps to the near model, whose wheels turn with the distance travelled; the far one has none', async () => {
  const fake = fakeSource(true);
  useGlbSource(fake.source);
  try {
    await fake.source.load({ kind: 'danfo', lod: 'far' }); await fake.source.load({ kind: 'danfo', lod: 'near' });
    const vehicle = buildTravelVehicle('danfo', { time: 'day' })!;
    vehicle.pose(3, 0, true);
    assert.ok(vehicle.object3D.getObjectByName('glb-vehicle:danfo-far'));
    assert.equal(vehicle.object3D.getObjectByName('wheel_fl'), undefined);
    assert.equal(vehicle.setLod('near'), true, 'it was cached: drawn at once');
    assert.equal(vehicle.object3D.getObjectByName('glb-vehicle:danfo-far'), undefined, 'the far model is gone');
    const wheel = vehicle.object3D.getObjectByName('wheel_fl')!;
    assert.ok(wheel);
    const before = wheel.quaternion.clone();
    vehicle.pose(3.5, 0, true);
    assert.ok(wheel.quaternion.angleTo(before) > 0.05, 'route distance turns the wheels');
    vehicle.pose(3.5, 0, true);
    assert.ok(wheel.quaternion.angleTo(before) > 0.05);
    assert.equal(vehicle.setLod('near'), false);
    assert.equal(vehicle.object3D.getObjectsByProperty('name', 'glb-vehicle:danfo').length, 1);
    vehicle.setLod('far');
    assert.ok(vehicle.object3D.getObjectByName('glb-vehicle:danfo-far'));
  } finally { useGlbSource(null); }
});

test('a model that cannot be had leaves the procedural vehicle in place and the host is never told to redraw', async () => {
  const source: GlbSource = { peek: () => null, load: () => Promise.resolve(null), instantiate: () => { throw new Error('unreachable'); }, instancing: () => null };
  useGlbSource(source);
  try {
    let changes = 0;
    const vehicle = buildTravelVehicle('okada', { time: 'day', onChange: () => { changes += 1; } })!;
    await nextTick();
    assert.equal(vehicle.authored, false);
    assert.equal(changes, 0);
    assert.ok(vehicle.object3D.getObjectByName('vehicle:okada'), 'still the procedural okada');
    assert.equal(vehicle.setLights(true), false, 'no authored lamps to light');
    vehicle.dispose();
  } finally { useGlbSource(null); }
});

test('a model that arrives after the vehicle is gone is ignored', async () => {
  const fake = fakeSource();
  useGlbSource(fake.source);
  try {
    let changes = 0;
    const vehicle = buildTravelVehicle('cab', { time: 'day', onChange: () => { changes += 1; } })!;
    vehicle.dispose();
    fake.release(); await nextTick();
    assert.equal(changes, 0);
    assert.equal(vehicle.authored, false);
  } finally { useGlbSource(null); }
});

test('the staff bus is drawn with the bus model (the procedural stand-in until it arrives)', async () => {
  const fake = fakeSource();
  useGlbSource(fake.source);
  try {
    const vehicle = buildTravelVehicle('bus', { time: 'day' })!;
    assert.ok(vehicle);
    assert.deepEqual(fake.requests, ['bus::far']);
    vehicle.dispose();
  } finally { useGlbSource(null); }
});

test('an owned car is drawn with its own model and paint, the player at the wheel; an unknown car is the default saloon', () => {
  const fake = fakeSource();
  useGlbSource(fake.source);
  try {
    const drawn = (car: string | null): string => {
      fake.requests.length = 0;
      buildTravelVehicle('car', { time: 'day', car })!.dispose();
      return fake.requests.join(',');
    };
    assert.equal(drawn('chief-suv'), 'suv:black:far');
    assert.equal(drawn('boardroom-330'), 'saloon:red:far');
    assert.equal(drawn('tokunbo-saloon'), 'saloon::far');
    assert.equal(drawn('agama-150'), 'okada::far', 'the motorbike is a bike');
    assert.equal(drawn(null), 'saloon:red:far', 'no car named: the default saloon');
    assert.equal(drawn('toString'), 'saloon:red:far', 'a name that is not a car is not looked up on the table\'s prototype');
    assert.equal(buildTravelVehicle('trek', { car: 'chief-suv' }), null);
  } finally { useGlbSource(null); }
});
