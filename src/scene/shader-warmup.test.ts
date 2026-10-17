import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShaderWarmup } from './shader-warmup.ts';

/** A renderer stand-in: compile() gives each material a program that reports linked after `linkChecks` polls. */
function fakeRenderer({ parallel = true, linkChecks = 2 } = {}) {
  const props = new WeakMap<object, { currentProgram?: { isReady(): boolean } }>();
  let compiles = 0;
  const renderer = {
    extensions: { has: (name: string) => parallel && name === 'KHR_parallel_shader_compile' },
    properties: { get: (material: object) => { if (!props.has(material)) props.set(material, {}); return props.get(material)!; } },
    compile(root: THREE.Object3D) {
      compiles++;
      const materials = new Set<THREE.Material>();
      root.traverse((object) => { const mesh = object as THREE.Mesh; if (!mesh.isMesh) return; const material = mesh.material as THREE.Material; materials.add(material); const entry = renderer.properties.get(material); if (!entry.currentProgram) { let polls = 0; entry.currentProgram = { isReady: () => ++polls > linkChecks }; } });
      return materials;
    },
  };
  return { renderer, compiles: () => compiles };
}

test('a draw with unlinked programs waits for them and is redrawn once; later frames do not look again', async () => {
  const { renderer, compiles } = fakeRenderer();
  const warmup = createShaderWarmup(renderer), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  let redraws = 0;
  assert.equal(warmup.hold(scene, scene, camera, () => { redraws++; }), true);
  assert.equal(warmup.hold(scene, scene, camera, () => { redraws++; }), true, 'still linking');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(redraws, 1);
  assert.equal(warmup.hold(scene, scene, camera, () => {}), false);
  assert.equal(compiles(), 1);
});

test('a new material after mark() is compiled; one whose program is already linked does not hold the frame', async () => {
  const { renderer } = fakeRenderer({ linkChecks: 0 });
  const warmup = createShaderWarmup(renderer), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  assert.equal(warmup.hold(scene, scene, camera, () => {}), false, 'linked at once');
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  warmup.mark();
  assert.equal(warmup.hold(scene, scene, camera, () => {}), false);
});

test('without KHR_parallel_shader_compile, or with a renderer that cannot compile, nothing is held', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  assert.equal(createShaderWarmup(fakeRenderer({ parallel: false }).renderer).hold(scene, scene, camera, () => {}), false);
  assert.equal(createShaderWarmup({}).hold(scene, scene, camera, () => {}), false);
  assert.equal(createShaderWarmup(null).hold(scene, scene, camera, () => {}), false);
});
