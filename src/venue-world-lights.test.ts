import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import './scene/body/native-test-fixture.ts';
import { loadCityScenes } from './scene/city-scenes.ts';
import { createHostLights, createVenueWorld, HOST_LIGHTING } from './venue-world.ts';

await loadCityScenes('lagos');

for (const maps of [false, true]) {
  test(`host lights dispose owned shadow targets once and preserve unrelated lights (allocated=${maps})`, () => {
    const scene = new THREE.Scene(), unrelated = new THREE.DirectionalLight();
    scene.add(unrelated);
    const lights = createHostLights(THREE, scene);
    lights.apply(null);
    assert.deepEqual([lights.hemi.intensity, lights.sun.intensity], [HOST_LIGHTING.hemi[2], HOST_LIGHTING.sun[1]], 'scenes without a preset retain host defaults');
    const disposed: string[] = [];
    if (maps) {
      lights.sun.shadow.map = new THREE.WebGLRenderTarget(2, 2);
      lights.sun.shadow.mapPass = new THREE.WebGLRenderTarget(2, 2);
      lights.sun.shadow.map.addEventListener('dispose', () => disposed.push('map'));
      lights.sun.shadow.mapPass.addEventListener('dispose', () => disposed.push('mapPass'));
    }
    lights.dispose(); lights.dispose();
    assert.deepEqual(disposed, maps ? ['map', 'mapPass'] : []);
    assert.deepEqual(scene.children, [unrelated], 'all owned lights and the rim target detach');
    assert.equal(lights.rim.target.parent, null);
    unrelated.dispose();
  });
}

test('actual host teardown releases shadow targets before renderer teardown', () => {
  const events: string[] = [];
  let renders = 0;
  let shadow: THREE.LightShadow | undefined;
  const renderer = {
    shadowMap: {}, domElement: { remove() {} },
    setPixelRatio() {}, setClearColor() {}, setSize() {},
    render(scene: THREE.Scene) {
      renders++;
      if (shadow) return;
      const sun = scene.children.find(child => child instanceof THREE.DirectionalLight && child.castShadow) as THREE.DirectionalLight | undefined;
      assert.ok(sun, 'the actual host owns a shadow-casting sun');
      shadow = sun.shadow;
      shadow.map = new THREE.WebGLRenderTarget(2, 2);
      shadow.map.addEventListener('dispose', () => events.push('shadow'));
    },
    dispose() { events.push('renderer'); },
  } as unknown as THREE.WebGLRenderer;
  const container = { appendChild() {}, getBoundingClientRect: () => ({ width: 390, height: 844 }) } as unknown as HTMLElement;
  const world = createVenueWorld(container, { location: 'park', renderer });
  assert.ok(shadow, 'the renderer received the actual scene');
  shadow.map!.addEventListener('dispose', () => world.update());
  const beforeDispose = renders;
  world.dispose(); world.dispose();
  world.update(); world.resize();
  assert.equal(renders, beforeDispose, 'callbacks during and after teardown cannot resurrect GPU resources');
  assert.deepEqual(events, ['shadow', 'renderer'], 'host released the shadow target before renderer teardown');
});


test('large venue shadow coverage preserves sunlight direction and resets after travel', () => {
  const scene = new THREE.Scene(), lights = createHostLights(THREE, scene);
  const bounds = [-77, 0, -70, 77, 75.6, 43.4] as const;
  lights.apply(HOST_LIGHTING, bounds);
  const original = new THREE.Vector3(...HOST_LIGHTING.sun[2]).normalize();
  const direction = lights.sun.position.clone().sub(lights.sun.target.position).normalize();
  assert.ok(direction.distanceTo(original) < 1e-10);
  lights.sun.updateMatrixWorld(); lights.sun.shadow.updateMatrices(lights.sun);
  const camera = lights.sun.shadow.camera;
  for (const x of [bounds[0],bounds[3]]) for (const y of [bounds[1],bounds[4]]) for (const z of [bounds[2],bounds[5]]) {
    const projected = new THREE.Vector3(x,y,z).project(camera);
    assert.ok(Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && Math.abs(projected.z) <= 1, 'whole venue inside shadow frustum');
  }
  lights.apply(HOST_LIGHTING);
  assert.equal(camera.left,-22); assert.equal(camera.far,70);
  assert.deepEqual(lights.sun.target.position.toArray(),[0,0,0]);
  lights.dispose();
});
