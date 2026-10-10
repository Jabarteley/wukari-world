// Materials of the Blender-made character: skin that keeps its form on every tone, eyes, brows, lashes, teeth.
import * as THREE from 'three';

export const SKIN_TONES = ['#e0ac7e', '#c98e62', '#b0764c', '#96603c', '#7a4a2c', '#5e3620', '#3f2416'] as const;
export const linear = (hex: string): THREE.Color => new THREE.Color(hex).convertSRGBToLinear();
const mix = (a: string, b: string, t: number): string => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/**
 * Skin from the body's baked colour attribute: R lips, G warm areas, B darker pigment, A ambient occlusion. The tone is a
 * flat colour; the form comes from the occlusion, a physically based highlight, a warm light bleed and a rim, so the
 * darkest tones read as a shape and not as a silhouette.
 */
export function makeSkin(tone: string): THREE.MeshPhysicalMaterial {
  const debug = tone === 'debug';
  const t = linear(debug ? '#808080' : tone);
  const lum = 0.2126 * t.r + 0.7152 * t.g + 0.0722 * t.b;
  const deep = 1 - THREE.MathUtils.smoothstep(lum, 0.02, 0.2);   // 0 for light skin, 1 for the darkest
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.56 - 0.06 * deep, metalness: 0, vertexColors: true,
    clearcoat: 0.05 + 0.12 * deep, clearcoatRoughness: 0.45, specularIntensity: 0.75 + 0.35 * deep,
    sheen: 0.4 + 0.4 * deep, sheenRoughness: 0.5, sheenColor: new THREE.Color(mix(tone, '#ffd2b0', 0.55)).convertSRGBToLinear(),
  });
  const lip = linear(mix(tone, '#7a1f2c', 0.55 - 0.1 * deep));
  const warm = linear(mix(tone, '#c9503a', 0.45));
  const uniforms = {
    uTone: { value: new THREE.Vector3(t.r, t.g, t.b) },
    uLip: { value: new THREE.Vector3(lip.r, lip.g, lip.b) },
    uWarm: { value: new THREE.Vector3(warm.r / Math.max(t.r, 1e-3), warm.g / Math.max(t.g, 1e-3), warm.b / Math.max(t.b, 1e-3)) },
    uAlbedo: { value: 0.66 + 0.34 * deep }, uGlow: { value: 0.055 + 0.07 * deep }, uRim: { value: 0.26 + 0.34 * deep },
  };
  m.userData['uniforms'] = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTone, uLip, uWarm;\nuniform float uGlow, uRim, uAlbedo;')
      .replace('#include <color_fragment>', `
{
  vec3 col = uTone;
  col = mix(col, uLip, clamp(vColor.r, 0.0, 1.0) * 0.85);
  col *= mix(vec3(1.0), min(uWarm, vec3(2.6)), clamp(vColor.g, 0.0, 1.0) * 0.6);
  col *= 1.0 - 0.26 * clamp(vColor.b, 0.0, 1.0);
  col *= uAlbedo;
  diffuseColor.rgb = col;
  ${debug ? 'diffuseColor.rgb = vec3(vColor.r, vColor.g, vColor.a);' : ''}
}`)
      .replace('#include <aomap_fragment>', `
#include <aomap_fragment>
{
  float ao = pow(clamp(vColor.a, 0.0, 1.0), 2.4);
  reflectedLight.directDiffuse *= mix(1.0, ao, 0.5);
  reflectedLight.indirectDiffuse *= ao;
  reflectedLight.indirectSpecular *= ao;
}`)
      .replace('#include <emissivemap_fragment>', `
#include <emissivemap_fragment>
{
  float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.2);
  totalEmissiveRadiance += diffuseColor.rgb * (uGlow + rim * uRim) * mix(1.0, pow(clamp(vColor.a, 0.0, 1.0), 2.4), 0.6);
}`);
  };
  m.customProgramCacheKey = () => 'skin2';
  return m;
}

export function makeEye(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ map, roughness: 0.38, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.12, specularIntensity: 0.6, color: 0xffffff });
}

export function makeBrow(map: THREE.Texture, hair: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(mix(hair, '#000000', 0.2)), map, alphaTest: 0.4, roughness: 0.8, side: THREE.DoubleSide, depthWrite: true });
}

export function makeTeeth(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.4 }); }
export function makeTongue(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: 0x9c3f48, roughness: 0.5 }); }
export function makeCavity(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: 0x2b0d10, roughness: 0.9, side: THREE.DoubleSide }); }

export function makeFabric(color: string, map: THREE.Texture | null, sheen = true): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({ color: map ? 0xffffff : c, map, roughness: 0.82, metalness: 0, sheen: sheen ? 1 : 0, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide });
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
  m.customProgramCacheKey = () => (fade ? 'hair2-fade' : 'hair2');
  return m;
}
