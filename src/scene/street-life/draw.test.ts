// Street life drawn (./draw.ts), and in the ambient layer: one instanced mesh for the crowd and one for the traffic, inside the scene's
// budget, placed by the plan's pure functions, never on unless asked (no WebGL2 under node), and gone with the scene.
import { loadCityContent as preloadCityContent } from '../../game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import { createStreetLife } from './draw.ts';
import { HARD_CAP, PERSON_TRIANGLES, VEHICLE_TRIANGLES, planCrowd, venueLanes, walkerAt } from './plan.ts';
import type { Road } from './plan.ts';
import { createAmbientLayer, STREET_PERSON } from '../ambient/layer.ts';
import type { Ident, Stage } from '../ambient/plan.ts';
import { createWalkGrid } from '../walk-grid.ts';

const TEN = Date.UTC(2026, 9, 12, 9, 0);
const lanes = venueLanes([-14, -12, 14, 12], true);
const road: Road = { ax: -84, az: 6.875, bx: 84, bz: 6.875, speed: 5.5 };

test('one instanced mesh of quads for the crowd and one for the traffic: two draw calls, two triangles a person, no shadows', () => {
  const kit = createKit(), parent = new THREE.Group();
  const life = createStreetLife(kit, { parent, seed: 'lagos|market', lanes, roads: [road], crowd: 240, vehicles: 8, at: TEN });
  const meshes = life.group.children as THREE.InstancedMesh[];
  assert.equal(meshes.length, 2);
  assert.ok(meshes.every((mesh) => mesh.isInstancedMesh && !mesh.castShadow));
  const [crowd, traffic] = meshes as [THREE.InstancedMesh, THREE.InstancedMesh];
  assert.equal(crowd.count, 240);
  assert.equal(crowd.geometry.index!.count / 3, PERSON_TRIANGLES);
  assert.equal(traffic.count, 8);
  assert.equal(traffic.geometry.index!.count / 3, VEHICLE_TRIANGLES);
  assert.equal(life.drawCalls, 2);
  assert.equal(life.triangles, 240 * PERSON_TRIANGLES + 8 * VEHICLE_TRIANGLES);
  assert.ok(traffic.instanceColor, 'each vehicle its own paint');
  kit.dispose();
});

test('every person stands where the plan puts them at that instant, as tall as planned; step() moves them on', () => {
  const kit = createKit(), parent = new THREE.Group();
  const life = createStreetLife(kit, { parent, seed: 's', lanes, roads: [], crowd: 60, vehicles: 0, at: TEN });
  const crowd = life.group.children[0] as THREE.InstancedMesh, walkers = planCrowd('s', lanes, 60);
  const read = (i: number) => { const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); crowd.getMatrixAt(i, m); m.decompose(p, q, s); return { p, s }; };
  for (const i of [0, 17, 59]) {
    const want = walkerAt(walkers[i]!, lanes[walkers[i]!.lane]!, TEN / 1000), got = read(i);
    assert.ok(Math.abs(got.p.x - want.x) < 1e-3 && Math.abs(got.p.z - want.z) < 1e-3);
    assert.ok(Math.abs(got.s.y - walkers[i]!.height) < 1e-4 && Math.abs(got.s.x - walkers[i]!.height / 2) < 1e-4);
  }
  const before = read(0).p.clone();
  life.step(TEN + 2_000);
  assert.ok(read(0).p.distanceTo(before) > 1, 'two seconds later they have walked on');
  assert.equal(life.group.children.length, 1, 'no road: no traffic mesh');
  life.dispose();
  assert.equal(parent.children.length, 0, 'gone with dispose');
  assert.equal(life.triangles, 0);
  kit.dispose();
});

test('never more than the hard cap, whatever is asked', () => {
  const kit = createKit();
  const life = createStreetLife(kit, { parent: new THREE.Group(), seed: 'cap', lanes, roads: [road], crowd: 10_000, vehicles: 1_000, at: TEN });
  assert.equal(life.people, HARD_CAP.crowd);
  assert.ok(life.vehicles <= HARD_CAP.vehicles);
  kit.dispose();
});

// ---- in the ambient layer ------------------------------------------------------------------------------------------------------

const grid = createWalkGrid({ bounds: [-10, -8, 10, 8], block: [[-2, 0, 2, 1.5]] });
const floor: Stage = { bounds: [-10, -8, 10, 8], entrance: [0, 7.4], open: true, free: (x, z) => grid.free(x, z), path: (ax, az, bx, bz) => grid.path(ax, az, bx, bz), seats: [], points: [[-6, -4], [6, -4], [-6, 4], [6, 4], [0, -5]], fixed: [] };
const ident = (kind: string): Ident => ({ cityId: 'lagos', venueId: kind, kind, tier: 'full', rainingAt: () => false, hourAt: () => 10 });
const browser = globalThis as unknown as Record<string, unknown>;
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function layerFor(kind: string, room = { triangles: 9_000, meshes: 40 }) {
  const kit = createKit(), parent = new THREE.Group();
  let changed = 0;
  const layer = createAmbientLayer({ kit, parent, stage: floor, ident: ident(kind), heightAt: () => 0, avatar: () => ({ x: 0, z: 6 }), room: () => room, clock: () => TEN, changed: () => { changed += 1; } });
  return { kit, layer, changed: () => changed };
}

test('the layer sets aside what a street person really costs', () => assert.equal(STREET_PERSON, PERSON_TRIANGLES));

test('the layer: off under node (no WebGL2), so every existing scene and test is what it was', async () => {
  const { kit, layer } = layerFor('market');
  await settle();
  assert.equal(layer.street(), null);
  layer.dispose(); kit.dispose();
});

test('the layer with ?streetlife=on: an open place gets its street inside the budget, it moves only in the window, and goes with the layer', async () => {
  const had = browser.location;
  browser.location = { search: '?streetlife=on' };
  try {
    const plain = (() => { browser.location = { search: '' }; const made = layerFor('market'); const caps = made.layer.caps(); made.layer.dispose(); made.kit.dispose(); browser.location = { search: '?streetlife=on' }; return caps; })();
    const room = { triangles: 9_000, meshes: 40 };
    const { kit, layer, changed } = layerFor('market', room);
    await settle();
    const street = layer.street()!;
    assert.ok(street && street.people > 0 && street.people === street.asked && !street.dropped, JSON.stringify(street));
    assert.ok(changed() > 0, 'the scene is told to draw again when the street arrives');
    assert.ok(layer.caps().far <= plain.far, 'its room is set aside before the figures are counted');
    const stats = layer.stats();
    assert.ok(stats.triangles <= room.triangles && stats.meshes <= room.meshes, `inside what the scene had left: ${JSON.stringify(stats)}`);
    assert.equal(layer.awake, false, 'it opens no window of its own');
    layer.wake();
    for (let i = 0; i < 30; i++) layer.step(0.5, TEN + i * 500);
    assert.equal(layer.street()!.dropped, false, 'forced on: even slow frames keep it (hand testing)');
    layer.dispose(); kit.dispose();
    const room2 = layerFor('club');
    await settle();
    assert.equal(room2.layer.street(), null, 'a room has no street');
    room2.layer.dispose(); room2.kit.dispose();
  } finally { browser.location = had; }
});

test('the layer on a capable device (WebGL2, enough cores): slow frames drop the street at once and leave the layer\'s own people as they were', async () => {
  const had = browser.WebGL2RenderingContext;
  browser.WebGL2RenderingContext = function WebGL2RenderingContext() {};
  try {
    if (!((globalThis.navigator?.hardwareConcurrency ?? 8) > 4)) return;
    const { kit, layer } = layerFor('market');
    await settle();
    assert.ok((layer.street()?.people ?? 0) > 0, 'on');
    const people = layer.count, before = layer.stats();
    layer.wake();
    for (let i = 0; i < 4; i++) layer.step(1 / 60, TEN);
    assert.equal(layer.street()!.dropped, false, 'fast frames keep it');
    for (let i = 0; i < 20; i++) layer.step(0.1, TEN);
    const street = layer.street()!;
    assert.ok(street.dropped && street.people === 0, 'dropped');
    assert.equal(layer.count, people, 'the figures are untouched (the same instant, the same people)');
    assert.ok(layer.stats().triangles < before.triangles, 'and its triangles are gone');
    layer.dispose(); kit.dispose();
  } finally { if (had === undefined) Reflect.deleteProperty(browser, 'WebGL2RenderingContext'); else browser.WebGL2RenderingContext = had; }
});
