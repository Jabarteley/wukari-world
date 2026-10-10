// Materials for the proof characters: skin that keeps the painted shading but fades the painted face features (the added
// face geometry replaces them), a cheap warm rim for skin, fabric with sheen, and hair with a sway term.
import * as THREE from 'three';

export const SKIN_TONES = ['#e0ac7e', '#c98e62', '#b0764c', '#96603c', '#7a4a2c', '#5e3620', '#3f2416'] as const;
export const SKIN_REF: Record<'female' | 'male', [number, number, number]> = { female: [0.4009, 0.1848, 0.0851], male: [0.3865, 0.1759, 0.082] };
export const SKIN_LUM: Record<'female' | 'male', number> = { female: 0.2235, male: 0.2139 };
export const CLOTH_LUM: Record<'female' | 'male', number> = { female: 0.0412, male: 0.0379 };
/** Atlas pixels of the painted features the skin material fades out (both bodies share the layout within a few pixels). */
const FACE_MASKS: Record<'female' | 'male', { eyes: [number, number, number, number][]; lips: [number, number, number, number]; brows: [number, number, number, number][] }> = {
  female: { eyes: [[139, 183, 44, 30], [244, 183, 44, 30]], lips: [190, 268, 44, 20], brows: [[140, 156, 48, 14], [243, 156, 48, 14]] },
  male: { eyes: [[141, 182, 44, 30], [241, 182, 44, 30]], lips: [190, 272, 44, 18], brows: [[141, 158, 48, 14], [241, 158, 48, 14]] },
};

export const linear = (hex: string): THREE.Color => new THREE.Color(hex).convertSRGBToLinear();

export interface SkinOptions { key: 'female' | 'male'; tone: string; hair: string; map: THREE.Texture; roughness?: number }

export function makeSkin({ key, tone, hair, map, roughness = 0.58 }: SkinOptions): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map, roughness, metalness: 0, vertexColors: false });
  const ref = SKIN_REF[key];
  const t = linear(tone), h = linear(hair);
  const masks = FACE_MASKS[key];
  const lum = 0.2126 * t.r + 0.7152 * t.g + 0.0722 * t.b;
  const boost = 1 + 0.55 * THREE.MathUtils.smoothstep(0.1 - lum, 0, 0.085);
  const uniforms = {
    uSkin: { value: new THREE.Vector3((t.r / ref[0]) * boost, (t.g / ref[1]) * boost, (t.b / ref[2]) * boost) },
    uHair: { value: new THREE.Vector3(h.r, h.g, h.b) },
    uSkinLum: { value: SKIN_LUM[key] }, uClothLum: { value: CLOTH_LUM[key] },
    uMask: { value: [...masks.eyes, masks.lips, ...masks.brows].map((v) => new THREE.Vector4(v[0] / 1024, v[1] / 1024, v[2] / 1024, v[3] / 1024)) },
    uWarm: { value: new THREE.Vector3(1.0, 0.42, 0.28) },
  };
  m.userData['uniforms'] = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 color;\nvarying vec4 vRegion;').replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRegion = color;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vRegion;
uniform vec3 uSkin, uHair, uWarm;
uniform float uSkinLum, uClothLum;
uniform vec4 uMask[5];
float ell(vec2 uv, vec4 m) { return 1.0 - smoothstep(0.55, 1.0, length((uv - m.xy) / m.zw)); }`)
      .replace('#include <map_fragment>', `
#include <map_fragment>
{
  vec3 texel = diffuseColor.rgb;
  vec2 uv = vMapUv;
  float face = vRegion.r;
  float eyes = max(ell(uv, uMask[0]), ell(uv, uMask[1]));
  float lips = ell(uv, uMask[2]);
  float brows = max(ell(uv, uMask[3]), ell(uv, uMask[4]));
  vec3 cheek = texture2D(map, vec2(uv.x, 0.232)).rgb;
  vec3 chin = texture2D(map, vec2(uv.x, 0.312)).rgb;
  vec3 forehead = texture2D(map, vec2(uv.x, 0.12)).rgb;
  texel = mix(texel, cheek, eyes * face);
  texel = mix(texel, chin, lips * face);
  texel = mix(texel, forehead, brows * face);
  float hi = max(max(texel.r, texel.g), texel.b), lo = min(min(texel.r, texel.g), texel.b);
  float skinness = hi > 0.01 ? smoothstep(0.07, 0.16, (hi - lo) / hi) : 0.0;
  vec3 skin = mix(texel, texel * uSkin, skinness);
  // underwear texels (never skin) that remain visible read as a dark cloth: keep them as they are
  float hairR = vRegion.a;
  float shoes = 0.0;
  float lum = dot(texel, vec3(0.2126, 0.7152, 0.0722));
  vec3 hairC = uHair * clamp(lum / uSkinLum, 0.7, 1.25);
  vec3 shoeC = vec3(0.05, 0.04, 0.035) * clamp(lum / uSkinLum, 0.6, 1.4);
  float sl = dot(skin, vec3(0.2126, 0.7152, 0.0722));
  skin = mix(vec3(sl), skin, 0.74);
  diffuseColor.rgb = skin * (1.0 - hairR - shoes) + hairC * hairR + shoeC * shoes;
}`)
      .replace('#include <emissivemap_fragment>', `
#include <emissivemap_fragment>
{
  float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.5);
  totalEmissiveRadiance += uWarm * diffuseColor.rgb * rim * 0.10 * (1.0 - vRegion.a);
}`);
  };
  m.customProgramCacheKey = () => 'proof-skin-1';
  return m;
}

export function makeFabric(color: string, map: THREE.Texture | null, sheen = true): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial({ color: map ? 0xffffff : c, map: map ?? null, roughness: 0.82, metalness: 0, sheen: sheen ? 1 : 0, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide });
  return m;
}

export interface SwayUniforms { uSway: { value: THREE.Vector3 }; uTime: { value: number } }
export function makeHair(color: string, map: THREE.Texture | null, sway: SwayUniforms, fade = false, normal: THREE.Texture | null = null): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#9a8070'), 0.22), map: map ?? null, normalMap: normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.62, metalness: 0.05, vertexColors: true, side: THREE.DoubleSide, alphaHash: fade });
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uSway'] = sway.uSway; shader.uniforms['uTime'] = sway.uTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uSway;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  float swayW = ${fade ? '0.0' : 'color.a'};
  float ph = position.x * 47.0 + position.z * 31.0;
  transformed += (uSway * 1.0 + vec3(sin(uTime * 1.7 + ph) * 0.0022, 0.0, sin(uTime * 1.3 + ph * 1.3) * 0.0016)) * swayW;`);
  };
  m.customProgramCacheKey = () => (fade ? 'proof-hair-fade-1' : 'proof-hair-1');
  return m;
}
