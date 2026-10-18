import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { CSM } from 'three/examples/jsm/csm/CSM.js';

/**
 * Sky, sun and shadows. A physical sky (Preetham) placed for Lagos (6.45°N) at a local solar hour; the same sky, prefiltered, lights
 * every material (scene.environment) so glass and water reflect it; cascaded shadow maps from the sun cover from the camera to
 * `maxFar`. Haze: exponential fog in the horizon colour (Lagos is humid; distant blocks fade to it).
 */
export interface Daylight { csm: CSM; sky: Sky; setHour(hour: number): void; setupMaterial(material: THREE.Material): void; update(): void; sun: THREE.Vector3; night: number }

const LAT = THREE.MathUtils.degToRad(6.45), DECLINATION = THREE.MathUtils.degToRad(-9.6); // mid-October

/** The sun's direction (towards the sun) at a local solar hour: x east, y up, z south. */
export function sunDirection(hour: number): THREE.Vector3 {
  const h = THREE.MathUtils.degToRad((hour - 12) * 15);
  const alt = Math.asin(Math.sin(LAT) * Math.sin(DECLINATION) + Math.cos(LAT) * Math.cos(DECLINATION) * Math.cos(h));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(LAT) - Math.tan(DECLINATION) * Math.cos(LAT)); // from south, west positive
  // From south (z+), positive towards west (x-).
  return new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt)).normalize();
}

export function createDaylight(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, cascades = true): Daylight {
  const sky = new Sky(); sky.scale.setScalar(45000);
  const u = sky.material.uniforms;
  u.turbidity!.value = 6.5; u.rayleigh!.value = 1.6; u.mieCoefficient!.value = 0.006; u.mieDirectionalG!.value = 0.85;
  scene.add(sky);
  // A single shadowed sun that follows the camera's target, when cascades are off (?csm=0).
  const single = new THREE.DirectionalLight('#fff2de', 3.4);
  single.castShadow = true; single.shadow.mapSize.set(4096, 4096); single.shadow.bias = -0.0002; single.shadow.normalBias = 0.5;
  Object.assign(single.shadow.camera, { left: -350, right: 350, top: 350, bottom: -350, near: 1, far: 4000 });
  if (!cascades) { scene.add(single); scene.add(single.target); }
  const csm = new CSM({ camera, parent: scene, cascades: 4, maxFar: 2500, mode: 'practical', shadowMapSize: 4096, lightIntensity: 3.2, lightNear: 1, lightFar: 6000, lightMargin: 600, shadowBias: -0.00012 });
  csm.fade = true;
  for (const light of csm.lights) { light.shadow.normalBias = 0.6; light.color.set('#fff2de'); }
  const hemi = new THREE.HemisphereLight('#cfe2f3', '#8a7a62', 0.35); scene.add(hemi);
  const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky);
  let env: THREE.WebGLRenderTarget | null = null;
  const sun = new THREE.Vector3();
  const daylight: Daylight = {
    csm, sky, sun, night: 0,
    setHour(hour) {
      sun.copy(sunDirection(hour));
      u.sunPosition!.value.copy(sun);
      for (const [k, v] of Object.entries(u)) (envSky.material.uniforms as Record<string, { value: unknown }>)[k]!.value = (v as { value: unknown }).value;
      env?.dispose(); env = pmrem.fromScene(envScene, 0.02); scene.environment = env.texture;
      const height = Math.max(sun.y, 0);
      csm.lightDirection.copy(sun).negate();
      const warm = THREE.MathUtils.smoothstep(height, 0.02, 0.35);
      for (const light of [...csm.lights, single]) { light.intensity = 3.4 * THREE.MathUtils.smoothstep(height, 0.0, 0.12); light.color.setRGB(1, 0.72 + 0.23 * warm, 0.5 + 0.38 * warm); }
      if (!cascades) for (const light of csm.lights) light.intensity = 0;
      daylight.night = 1 - THREE.MathUtils.smoothstep(sun.y, -0.08, 0.06);
      hemi.intensity = 0.04 + 0.08 * THREE.MathUtils.smoothstep(height, 0, 0.3);
      // Daylight: the sun several times brighter than the sky (clear tropical afternoon), so lit and shaded faces read apart.
      scene.environmentIntensity = 0.06 + 0.32 * THREE.MathUtils.smoothstep(sun.y, -0.05, 0.25);
      // Humid coastal haze: pale blue-grey by day.
      const haze = new THREE.Color().setHSL(0.58, 0.16, 0.1 + 0.62 * THREE.MathUtils.smoothstep(sun.y, -0.1, 0.4));
      if (warm < 0.7) haze.lerp(new THREE.Color('#e7b48a'), (1 - warm) * 0.35 * THREE.MathUtils.smoothstep(sun.y, -0.05, 0.05));
      scene.fog = new THREE.FogExp2(haze, 0.0003);
    },
    setupMaterial(material) {
      if (!cascades) return;
      const own = material.onBeforeCompile.bind(material);
      csm.setupMaterial(material);
      const csmHook = material.onBeforeCompile.bind(material);
      material.onBeforeCompile = (shader, r) => { own(shader, r); csmHook(shader, r); };
    },
    update() { if (cascades) csm.update(); else { const t = (camera as THREE.PerspectiveCamera & { userData: { target?: THREE.Vector3 } }).userData.target ?? new THREE.Vector3(); single.target.position.copy(t); single.position.copy(t).addScaledVector(sun, 2000); } },
  };
  return daylight;
}
