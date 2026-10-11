import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LIGHTING, LIGHT_STEP, lagosMinute, lightingAt, sunHeight, skyWeights } from './lighting.ts';
import { createHostLights, HOST_LIGHTING, lightQuality } from './rig.ts';
import { createPools } from './pools.ts';
import { adjustLighting, CLEAR_LOOK, lookAt, rainingAt } from '../game/conditions/look.ts';
import { weatherAt } from '../game/systems/health.ts';
import { loadCityContent } from '../game/cities/registry.ts';

await loadCityContent('lagos');

const at = (hour: number, minute = 0) => hour * 60 + minute;

test('the sky weights sum to one and follow the sun through the day', () => {
  for (let m = 0; m < 1440; m += 17) { const w = skyWeights(m); assert.ok(Math.abs(w[0] + w[1] + w[2] - 1) < 1e-9); assert.ok(w.every((v) => v >= 0)); }
  assert.deepEqual(skyWeights(at(13)), [0, 0, 1], 'noon is all day');
  assert.deepEqual(skyWeights(at(2)), [1, 0, 0], 'the small hours are all night');
  assert.ok(skyWeights(at(18, 30))[1] > 0.9, 'half past six in the evening is dusk');
  assert.ok(sunHeight(at(13)) > 0.95 && sunHeight(at(3)) < 0);
});

test('lightingAt: equals the presets at their centre, eases between them, and the sun crosses the sky', () => {
  assert.deepEqual(lightingAt('outdoor', at(13)).hemi, LIGHTING.outdoor.day.hemi);
  assert.deepEqual(lightingAt('outdoor', at(2)).hemi, LIGHTING.outdoor.night.hemi);
  const ease = [at(17), at(17, 40), at(18, 20), at(19), at(19, 40)].map((m) => lightingAt('outdoor', m).sun[1]);
  assert.ok(ease.every((v, i) => i === 0 || v !== ease[i - 1]), 'the light changes minute by minute through the evening, it does not switch');
  assert.ok(lightingAt('outdoor', at(9)).sun[2][0] < lightingAt('outdoor', at(16)).sun[2][0], 'the sun moves across the sky');
  assert.ok(lightingAt('outdoor', at(9)).sun[2][1] < lightingAt('outdoor', at(13)).sun[2][1], 'and is lower in the morning than at noon');
  assert.ok(lightingAt('outdoor', at(13)).night! < 0.05 && lightingAt('outdoor', at(23)).night! > 0.95);
  assert.deepEqual(lightingAt('outdoor', at(23)).sun[2], LIGHTING.outdoor.night.sun[2], 'by night the moon stands where the preset puts it');
  for (const mood of ['outdoor', 'indoor', 'club']) for (let m = 0; m < 1440; m += 60) {
    const light = lightingAt(mood, m);
    assert.ok(light.hemi[2] >= 0.9, `${mood} ${m}: people stay lit`);
    assert.ok(/^#[0-9a-f]{6}$/.test(light.fog![0]) && light.fog![1] < light.fog![2]);
  }
});

test('rain brings the fog in, greys the light and marks the surfaces wet; dry leaves the preset alone', () => {
  const dry = lightingAt('outdoor', at(13));
  assert.equal(adjustLighting(dry, CLEAR_LOOK), dry);
  const wet = adjustLighting(dry, { ...CLEAR_LOOK, wet: true });
  assert.equal(wet.wet, true);
  assert.ok(wet.fog![2] < dry.fog![2] && wet.fog![1] < dry.fog![1]);
  assert.ok(wet.sun[1] < dry.sun[1]);
});

test('host lights: the sun follows the look-at point, the shadow box is tight and snapped, the fog follows the camera', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(43, 1.6, 0.1, 360);
  const lights = createHostLights(THREE, scene, { shadowMap: 2048 });
  assert.equal(scene.fog, lights.fog);
  lights.apply({ ...lightingAt('outdoor', at(9)) });
  camera.position.set(16, 21, 27);
  lights.aim(camera, 3.1, 0.7, -2.3);
  const far = lights.sun.shadow.camera.right;
  assert.ok(far > 15 && far < 30, 'a box about as wide as the view');
  assert.ok(lights.sun.position.distanceTo(lights.sun.target.position) > 60);
  const toward = lights.sun.position.clone().sub(lights.sun.target.position).normalize(), heading = new THREE.Vector3(...lightingAt('outdoor', at(9)).sun[2]).normalize();
  assert.ok(toward.distanceTo(heading) < 1e-6, 'the light comes from the preset direction');
  camera.position.set(8, 10, 13);
  lights.aim(camera, 3.1, 0.7, -2.3);
  assert.ok(lights.sun.shadow.camera.right < far, 'closer in, the box shrinks and the shadow gets sharper');
  const distance = camera.position.distanceTo(lights.sun.target.position.clone().set(3.1, 0.7, -2.3));
  assert.ok(lights.fog.near > distance * 0.8 && lights.fog.near < distance * 1.3 && lights.fog.far > lights.fog.near * 2, 'the fog starts about where the subject is and follows the camera in');
  lights.dispose();
  assert.equal(scene.fog, null);
  assert.deepEqual(scene.children, []);
});

test('the low tier has no shadow map at all', () => {
  const scene = new THREE.Scene(), lights = createHostLights(THREE, scene, { shadowMap: 2048, quality: 'low' });
  assert.equal(lights.sun.castShadow, false);
  lights.aim(new THREE.PerspectiveCamera(), 0, 0, 0);
  assert.equal(lights.sun.shadow.camera.right, new THREE.DirectionalLight().shadow.camera.right, 'the shadow box is never fitted');
  assert.equal(lightQuality({ hardwareConcurrency: 2 }), 'low');
  assert.equal(lightQuality({ deviceMemory: 2 }), 'low');
  assert.equal(lightQuality({ connection: { saveData: true } }), 'low');
  assert.equal(lightQuality({ hardwareConcurrency: 8, deviceMemory: 8 }), 'high');
  assert.ok(HOST_LIGHTING.hemi[2] > 0);
  lights.dispose();
});

test('lamp pools: one mesh for all lamps, shown at dusk and by night, gone by day, and nothing without lamps', () => {
  assert.equal(createPools(THREE, []), null);
  const lamp = { position: new THREE.Vector3(2, 3, -1), color: new THREE.Color('#ffd9a0'), distance: 12 };
  const pools = createPools(THREE, [lamp, { ...lamp, position: new THREE.Vector3(-4, 3, 2) }])!;
  assert.equal(pools.mesh.geometry.getIndex()!.count, 12, 'two quads');
  pools.set(lightingAt('outdoor', at(13)));
  assert.equal(pools.mesh.visible, false, 'no pools by day');
  pools.set(lightingAt('outdoor', at(23)));
  assert.equal(pools.mesh.visible, true);
  const night = (pools.mesh.material as THREE.MeshBasicMaterial).opacity;
  pools.set(lightingAt('outdoor', at(23)), 0.4);
  assert.ok((pools.mesh.material as THREE.MeshBasicMaterial).opacity < night, 'a room takes a gentler pool');
  pools.dispose();
});

test('the light moves in steps: the minutes inside one step share a minute of light', () => {
  const ms = (hour: number, minute: number) => Date.UTC(2026, 0, 5, hour, minute);
  assert.equal(lagosMinute(ms(19, 0)), lagosMinute(ms(19, LIGHT_STEP - 1)));
  assert.notEqual(lagosMinute(ms(19, 0)), lagosMinute(ms(19, LIGHT_STEP)));
  assert.equal(lagosMinute(ms(19, 0)), 20 * 60, 'Lagos is an hour ahead of UTC');
});

test('the rain look follows the city weather block by block, not the month', () => {
  const block = 20 * 60000, start = Date.UTC(2026, 6, 1);
  let wet = -1, dry = -1;
  for (let t = start; t < start + 400 * block && (wet < 0 || dry < 0); t += block) { if (weatherAt(t, 'lagos').raining) wet = t; else dry = t; }
  assert.ok(wet >= 0 && dry >= 0);
  assert.equal(rainingAt('lagos', wet), true);
  assert.equal(rainingAt('lagos', dry), false);
  assert.equal(lookAt('lagos', null, null, wet).wet, true);
  assert.equal(lookAt('lagos', null, null, dry).wet, false);
  assert.equal(rainingAt('nowhere', wet), false, 'a city the weather does not know is dry');
});
