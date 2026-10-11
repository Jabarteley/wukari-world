/**
 * OWNER: scenes
 * The shared light rig of the walkable scenes: one sun whose shadow is fitted to what the camera sees, a hemisphere fill, a back
 * light and gentle fog tinted to the sky. The host gives it a Lighting (src/scene/lighting.ts: lightingAt(mood, minute)) and, on
 * a frame that is drawn anyway, the point the camera looks at; the rig never asks for a frame.
 *
 * QUALITY. 'low' is the device the body gate refuses (two cores or fewer, 2 GB or less, Data Saver or 2G: bodyAllowed()): no
 * shadow map at all, so a surface does no shadow work, and the scenes keep their lamps as glow and sprites instead of real lights.
 * 'high' is everyone else. The tier is chosen from the device, never from a frame-rate measurement.
 */
import type * as THREE from 'three';
import type { Colour, ThreeModule, Vec3 } from './types.ts';
import { bodyAllowed } from './body/gate.ts';

export type Quality = 'high' | 'low';
/** What the lights are told: hemi [sky, ground, intensity]; sun [colour, intensity, direction]; rim [colour, intensity]; fog [colour, start, end]. */
export interface LightPreset {
  hemi: readonly [Colour, Colour, number]
  sun: readonly [Colour, number, Vec3]
  rim?: readonly [Colour, number]
  /** Brightness of the existing shared emissive surfaces; default 1. */
  glow?: number
  /** 0 (day) to 1 (night): how much the scene's own lamps and lit windows should show. */
  night?: number
  /** The fog's colour and where it starts and ends, as multiples of the camera's distance from what it looks at. */
  fog?: readonly [Colour, number, number]
  /** It is raining: surfaces take a wet sheen. */
  wet?: boolean
}

export const lightQuality = (device?: Parameters<typeof bodyAllowed>[0]): Quality => (bodyAllowed(device) ? 'high' : 'low');

/** The host's default lighting. The ground colour is the warm bounce that keeps faces readable; never near-black. */
export const HOST_LIGHTING = Object.freeze<Required<Pick<LightPreset, 'hemi' | 'sun' | 'rim' | 'glow'>>>({ hemi: ['#bdd4e7', '#8a8474', 1.6], sun: ['#c7dbec', 1.4, [-12, 25, 8]], rim: ['#cfe2ff', 0.7], glow: 1 });

const SUN_REACH = 70;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The host's lights. apply(preset) sets them from a scene's lighting(), or back to the defaults; aim(camera, x, y, z) puts the rim
 * light behind the point the camera looks at, moves the sun's shadow box over it (a tight box, so it stays sharp, snapped to the
 * shadow map's texels so it does not crawl) and sets the fog by how far the camera is. Called on a frame that is being drawn anyway.
 */
export function createHostLights(THREE: ThreeModule, scene: THREE.Scene, { shadowMap = 2048, quality = 'high' }: { shadowMap?: number; quality?: Quality } = {}) {
  const shadows = quality === 'high';
  const hemi = new THREE.HemisphereLight(HOST_LIGHTING.hemi[0], HOST_LIGHTING.hemi[1], HOST_LIGHTING.hemi[2]);
  const sun = new THREE.DirectionalLight(HOST_LIGHTING.sun[0], HOST_LIGHTING.sun[1]);
  sun.position.set(...HOST_LIGHTING.sun[2]);
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(shadowMap, shadowMap);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: SUN_REACH * 2 });
    sun.shadow.normalBias = 0.04;
    sun.shadow.bias = -0.0003;
  }
  const rim = new THREE.DirectionalLight(HOST_LIGHTING.rim[0], HOST_LIGHTING.rim[1]);
  rim.castShadow = false;
  rim.position.set(-14, 12, -18);
  const fog = new THREE.Fog('#bdd4e7', 60, 400);
  const ownFog = !scene.fog;
  if (ownFog) scene.fog = fog;
  scene.add(hemi, sun, sun.target, rim, rim.target);
  const heading = new THREE.Vector3(...HOST_LIGHTING.sun[2]).normalize();
  const reach = { near: 1.15, far: 3.4 };
  const right = new THREE.Vector3(), lift = new THREE.Vector3(), at = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let disposed = false;
  return {
    hemi, sun, rim, fog, quality,
    apply(preset?: Partial<LightPreset> | null) {
      const use = preset?.hemi && preset.sun && Array.isArray(preset.hemi) && Array.isArray(preset.sun) ? preset as LightPreset : HOST_LIGHTING;
      hemi.color.set(use.hemi[0]); hemi.groundColor.set(use.hemi[1]); hemi.intensity = use.hemi[2];
      sun.color.set(use.sun[0]); sun.intensity = use.sun[1]; heading.set(...use.sun[2]).normalize();
      const back = Array.isArray(use.rim) ? use.rim as readonly [Colour, number] : HOST_LIGHTING.rim;
      rim.color.set(back[0]); rim.intensity = back[1];
      const mist = preset?.fog;
      if (mist) { fog.color.set(mist[0]); reach.near = mist[1]; reach.far = mist[2]; }
    },
    aim(camera: THREE.Camera, x = 0, y = 0.7, z = 0) {
      // Behind the subject and a little to the camera's right, above head height.
      const dx = x - camera.position.x, dz = z - camera.position.z, flat = Math.hypot(dx, dz) || 1;
      const ux = dx / flat, uz = dz / flat;
      rim.position.set(x + ux * 16 - uz * 7, y + 11, z + uz * 16 + ux * 7);
      rim.target.position.set(x, y, z);
      rim.target.updateMatrixWorld?.();
      const distance = Math.max(4, camera.position.distanceTo(at.set(x, y, z)));
      fog.near = distance * reach.near; fog.far = distance * reach.far;
      // The sun looks at the same point; its box is as wide as the view, no wider, and its position is snapped to a texel across the light.
      if (shadows) {
        const half = clamp(distance * 0.72, 9, 30), texel = (half * 2) / shadowMap;
        right.crossVectors(up, heading).normalize(); lift.crossVectors(heading, right);
        const a = Math.round(at.dot(right) / texel) * texel - at.dot(right), b = Math.round(at.dot(lift) / texel) * texel - at.dot(lift);
        at.addScaledVector(right, a).addScaledVector(lift, b);
        Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
        sun.shadow.camera.updateProjectionMatrix();
      }
      sun.target.position.copy(at);
      sun.position.copy(at).addScaledVector(heading, SUN_REACH);
      sun.target.updateMatrixWorld?.();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // Renderer teardown does not own light shadow targets. Release them while its
      // render-target dispose listeners can still free the GPU allocations.
      sun.dispose(); rim.dispose();
      scene.remove(hemi, sun, sun.target, rim, rim.target);
      if (ownFog && scene.fog === fog) scene.fog = null;
    },
  };
}
