// The aerial city drawn (./aerial.ts): four meshes inside the caps, the instances are the plan, the fade, the clouds, the shader patches and dispose.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { InstancedMesh, Material, Mesh, BufferGeometry } from 'three';
import { createAerial, cloudPixels, readTier } from './aerial.ts';
import { AERIAL_CAPS, AERIAL_DRAW_CALLS, BOX_TRIANGLES, VERTICAL, seedOf } from './aerial-plan.ts';
import { loadCityPack as loadPack } from './regions.ts';
/** A city's pack (it is there for every city these tests name). */
const loadCityPack = async (id: string) => (await loadPack(id))!;

const meshes = (group: THREE.Group) => group.children as (Mesh | InstancedMesh)[];
const byName = (group: THREE.Group, name: string) => group.getObjectByName(name) as InstancedMesh | Mesh;
const drawn = (group: THREE.Group) => meshes(group).filter((mesh) => mesh.visible);
const triangles = (mesh: Mesh | InstancedMesh) => ((mesh.geometry.index?.count ?? mesh.geometry.attributes.position!.count) / 3) * ((mesh as InstancedMesh).isInstancedMesh ? (mesh as InstancedMesh).count : 1);

test('no aerial city on a device that gets no dive, or under reduced motion', async () => {
  const pack = await loadCityPack('lagos');
  assert.equal(createAerial(THREE, pack, { tier: 'cut' }), null);
  assert.equal(createAerial(THREE, pack, { reduced: true, tier: 'full' }), null);
  assert.equal(readTier(false, { hardwareConcurrency: 2 }), 'cut');
  assert.equal(readTier(false, { hardwareConcurrency: 4 }), 'lite');
  assert.equal(readTier(false, { hardwareConcurrency: 8, deviceMemory: 8 }), 'full');
  assert.equal(readTier(false, { connection: { saveData: true } }), 'cut');
  assert.equal(readTier(true, {}), 'cut');
});

test('four meshes, the instances are the plan, and the counts add up', async () => {
  const pack = await loadCityPack('seoul');
  const aerial = createAerial(THREE, pack, { tier: 'full', cityTriangles: 50_000, ground: () => 0.25 })!;
  assert.deepEqual(meshes(aerial.group).map((mesh) => mesh.name), ['aerial-massing', 'aerial-parks', 'aerial-roads', 'aerial-clouds']);
  const massing = byName(aerial.group, 'aerial-massing') as InstancedMesh, plan = aerial.plan;
  assert.equal(massing.count, plan.masses.length);
  assert.equal(massing.geometry.index!.count / 3, BOX_TRIANGLES);
  const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), turn = new THREE.Quaternion(), scale = new THREE.Vector3();
  massing.getMatrixAt(0, matrix); matrix.decompose(at, turn, scale);
  const first = plan.masses[0]!;
  assert.ok(Math.abs(at.x - first.x) < 1e-4 && Math.abs(at.z - first.z) < 1e-4 && Math.abs(at.y - 0.25) < 1e-6, 'stands on the ground it was given');
  assert.ok(Math.abs(scale.y - first.h) < 1e-4 && Math.abs(scale.x - first.w) < 1e-4);
  assert.ok(plan.masses.some((mass) => mass.h > (100 / 100) * VERTICAL), 'a skyline, not a carpet');
  assert.equal((byName(aerial.group, 'aerial-parks') as InstancedMesh).count, plan.parks.length);
  assert.equal(aerial.triangles, plan.triangles.massing + plan.triangles.parks + plan.triangles.ribbons);
  assert.equal(drawn(aerial.group).reduce((sum, mesh) => sum + triangles(mesh), 0), aerial.triangles);
  assert.equal(aerial.calls, drawn(aerial.group).length); assert.ok(aerial.calls <= AERIAL_DRAW_CALLS);
  // The clouds for a descent from 700 to 80 high, then the counts include them.
  const clouds = aerial.setClouds({ x: plan.centre.x, z: plan.centre.z }, { x: plan.centre.x + 30, z: plan.centre.z }, 700, 80);
  assert.equal(clouds, AERIAL_CAPS.full.clouds);
  assert.equal(aerial.calls, AERIAL_DRAW_CALLS); assert.equal(aerial.triangles, plan.triangles.massing + plan.triangles.parks + plan.triangles.ribbons + clouds * 2);
  assert.equal(drawn(aerial.group).reduce((sum, mesh) => sum + triangles(mesh), 0), aerial.triangles);
  // The fade: whole on the way down, dissolved in when it came late, gone at the end; the clouds go first.
  aerial.update(0.1, true, 1);
  assert.equal(drawn(aerial.group).length, 4);
  aerial.update(0.1, true, 0);
  assert.equal(drawn(aerial.group).length, 0, 'not there yet: dissolves in from nothing');
  aerial.update(0.6, true, 1);
  assert.deepEqual(drawn(aerial.group).map((mesh) => mesh.name), ['aerial-massing', 'aerial-parks', 'aerial-roads'], 'over the towers, the clouds have parted');
  aerial.update(1, true, 1);
  assert.equal(drawn(aerial.group).length, 0, 'gone by the end');
  // Everything it made is freed.
  const freed = new Set<unknown>();
  aerial.group.traverse((object) => { const mesh = object as Mesh; if (!mesh.isMesh) return; for (const thing of [mesh.geometry, mesh.material as Material]) (thing as BufferGeometry | Material).addEventListener('dispose', () => freed.add(thing)); });
  const scene = new THREE.Scene(); scene.add(aerial.group);
  aerial.dispose();
  assert.equal(aerial.group.parent, null);
  assert.equal(freed.size, 8, 'four geometries and four materials');
});

test('a lite device draws less; the same city draws the same aerial city every time', async () => {
  const pack = await loadCityPack('toronto');
  const full = createAerial(THREE, pack, { tier: 'full', cityTriangles: 40_000 })!, lite = createAerial(THREE, pack, { tier: 'lite', cityTriangles: 40_000 })!, again = createAerial(THREE, pack, { tier: 'full', cityTriangles: 40_000 })!;
  assert.ok(lite.triangles < full.triangles * 0.7, `${lite.triangles} < ${full.triangles}`);
  assert.ok(lite.setClouds({ x: 0, z: 0 }, { x: 0, z: 0 }, 600, 100) <= AERIAL_CAPS.lite.clouds);
  const a = byName(full.group, 'aerial-massing') as InstancedMesh, b = byName(again.group, 'aerial-massing') as InstancedMesh;
  assert.deepEqual([...a.instanceMatrix.array.slice(0, 400)], [...b.instanceMatrix.array.slice(0, 400)]);
  for (const aerial of [full, lite, again]) aerial.dispose();
});

test('the cloud puff is painted from the seed, clear at its edges; the shader patches find their places in three\'s shaders', () => {
  const pixels = cloudPixels(seedOf('lagos'));
  assert.equal(pixels.length, 64 * 64 * 4);
  assert.deepEqual(cloudPixels(seedOf('lagos')), pixels);
  for (let i = 0; i < 64; i++) { assert.equal(pixels[i * 4 + 3], 0, 'top edge clear'); assert.equal(pixels[(i * 64) * 4 + 3], 0, 'left edge clear'); }
  assert.ok(pixels[(32 * 64 + 32) * 4 + 3]! > 200, 'thick in the middle');
  // Each patch replaces an include that three's own shaders have, so it is never silently skipped.
  const standard = THREE.ShaderLib.standard, basic = THREE.ShaderLib.basic;
  for (const token of ['#include <common>', '#include <project_vertex>']) { assert.ok(standard.vertexShader.includes(token), token); assert.ok(basic.vertexShader.includes(token), token); }
  for (const token of ['#include <common>', '#include <clipping_planes_fragment>', '#include <color_fragment>']) assert.ok(standard.fragmentShader.includes(token), token);
  assert.ok(basic.fragmentShader.includes('#include <map_fragment>'));
  assert.ok(THREE.ShaderChunk.beginnormal_vertex.includes('objectNormal'), 'the floors read the object normal');
  // And the patched shaders carry the dissolve and the floors.
  const aerial = createAerial(THREE, { id: 'patch', land: [{ id: 'l', kind: 'mainland', points: [[-30, -30], [30, -30], [30, 30], [-30, 30]] }], roads: [], sites: { a: { x: 0, z: 0 }, b: { x: 10, z: 0 }, c: { x: 0, z: 10 } } }, { tier: 'full' })!;
  const material = (byName(aerial.group, 'aerial-massing') as InstancedMesh).material as THREE.MeshStandardMaterial;
  const shader = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: standard.vertexShader, fragmentShader: standard.fragmentShader };
  material.onBeforeCompile(shader as never, null as never);
  assert.match(shader.fragmentShader, /discard/); assert.match(shader.fragmentShader, /vAerialY/); assert.match(shader.vertexShader, /instanceMatrix/);
  assert.ok('uAerialFade' in shader.uniforms);
  aerial.dispose();
});
