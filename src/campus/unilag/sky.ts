/**
 * Campus sky: one gradient dome that follows the camera (so it is never clipped by the far plane), a warm sun glow
 * at dusk, and the distance fog that fades far buildings and the lagoon into the horizon colour.
 * The horizon colour IS the fog colour and goes through the same tone mapping, so land, water and sky meet without a seam.
 */
import type { Mesh, ShaderMaterial } from 'three';
import type { Kit } from '../../scene/kit.ts';

export type SkyTime = 'day' | 'dusk' | 'night';
export interface SkyLook { horizon: string; mid: string; zenith: string; glow: string; glowStrength: number; sun: [number, number, number]; fogNear: number; fogFar: number }

/** Low evening sun sits towards the lagoon side the preview light comes from; by day it is high and the glow is faint. */
export const SKY: Readonly<Record<SkyTime, SkyLook>> = {
  day: { horizon: '#bfd1d3', mid: '#8fb8d2', zenith: '#4f86bf', glow: '#fff4d6', glowStrength: .35, sun: [-.5, .8, .42], fogNear: 220, fogFar: 1300 },
  dusk: { horizon: '#dc9f82', mid: '#a688a0', zenith: '#34497f', glow: '#ffb067', glowStrength: 1.15, sun: [-.78, .09, .62], fogNear: 200, fogFar: 1300 },
  night: { horizon: '#1a2f55', mid: '#10224a', zenith: '#050c22', glow: '#9db8f0', glowStrength: .3, sun: [-.5, .7, .5], fogNear: 140, fogFar: 1250 },
};
export const skyLook = (time: string): SkyLook => SKY[(time in SKY ? time : 'day') as SkyTime];

const vertex = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const fragment = `
uniform vec3 horizon; uniform vec3 mid; uniform vec3 zenith; uniform vec3 glow; uniform float glowStrength; uniform vec3 sunDir;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
  col = mix(col, zenith, smoothstep(0.12, 0.95, h));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  float haze = pow(1.0 - h, 6.0);
  col += glow * glowStrength * (0.55 * pow(s, 5.0) + 0.5 * pow(s, 48.0)) * mix(0.35, 1.0, haze);
  col += glow * (0.9 + glowStrength) * 3.0 * smoothstep(0.9988, 0.9997, s);
  // below the horizon and just above it the sky is the fog colour, so far land and water melt into it without a band
  col = mix(horizon, col, smoothstep(-0.02, 0.06, d.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function buildSky(kit: Kit) {
  const { THREE } = kit;
  const color = (hex: string) => new THREE.Color(hex);
  const look = SKY.day;
  const material: ShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { horizon: { value: color(look.horizon) }, mid: { value: color(look.mid) }, zenith: { value: color(look.zenith) }, glow: { value: color(look.glow) }, glowStrength: { value: look.glowStrength }, sunDir: { value: new THREE.Vector3(...look.sun) } },
  });
  const geometry = new THREE.SphereGeometry(900, 24, 12);
  const mesh: Mesh = new THREE.Mesh(geometry, material); mesh.name = 'Campus sky'; mesh.renderOrder = -1000; mesh.frustumCulled = false;
  mesh.onBeforeRender = (_r, _s, camera) => { mesh.position.copy(camera.position); };
  return {
    mesh,
    setTime(time: string) {
      const l = skyLook(time), u = material.uniforms as Record<string, { value: any }>;
      u.horizon!.value.set(l.horizon); u.mid!.value.set(l.mid); u.zenith!.value.set(l.zenith); u.glow!.value.set(l.glow);
      u.glowStrength!.value = l.glowStrength; u.sunDir!.value.set(...l.sun);
    },
    dispose() { geometry.dispose(); material.dispose(); mesh.removeFromParent(); },
  };
}
