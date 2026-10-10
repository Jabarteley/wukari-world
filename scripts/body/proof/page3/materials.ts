// Materials of the Blender-made character, third build: a skin that glows (wrapped light with a warm scatter band, soft highlights,
// a rim, kept form from the baked occlusion), a face material over one atlas, one hair material, and the cheap crowd materials.
import * as THREE from 'three';

export const SKIN_TONES = ['#e0ac7e', '#c98e62', '#b0764c', '#96603c', '#7a4a2c', '#5e3620', '#3f2416'] as const;
export const linear = (hex: string): THREE.Color => new THREE.Color(hex).convertSRGBToLinear();
const mix = (a: string, b: string, t: number): string => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const v3 = (c: THREE.Color): THREE.Vector3 => new THREE.Vector3(c.r, c.g, c.b);

function skinTints(tone: string) {
  const t = linear(tone);
  const lum = 0.2126 * t.r + 0.7152 * t.g + 0.0722 * t.b;
  const deep = 1 - THREE.MathUtils.smoothstep(lum, 0.02, 0.2);   // 0 for light skin, 1 for the darkest
  // lips: a warm berry that is lighter than dark skin and deeper than light skin, so they read on every tone
  const lip = linear(mix(tone, deep > 0.5 ? '#b4465a' : '#a6303f', 0.62 + 0.1 * deep));
  const warm = linear(mix(tone, '#d9583e', 0.4));
  return { t, deep, lip, warm };
}

const SKIN_COLOR = (debug: boolean): string => `
{
  vec3 col = uTone;
  col = mix(col, uLip, clamp(vColor.r, 0.0, 1.0) * 0.9);
  col *= mix(vec3(1.0), min(uWarm, vec3(1.8)), clamp(vColor.g, 0.0, 1.0) * 0.4);
  col *= 1.0 - 0.3 * clamp(vColor.b, 0.0, 1.0);
  col *= uAlbedo;
  diffuseColor.rgb = col;
  ${debug ? 'diffuseColor.rgb = vec3(vColor.r, vColor.g, vColor.a);' : ''}
}`;

/**
 * Skin from the body's baked colour attribute: R lips, G warm areas, B darker pigment and the eye rings, A ambient occlusion.
 * Light wraps around the form with a warm scatter band, so a face turned from the key is soft and not black.
 */
export function makeSkin(tone: string): THREE.MeshPhysicalMaterial {
  const debug = tone === 'debug';
  const { t, deep, lip, warm } = skinTints(debug ? '#808080' : tone);
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.56 - 0.04 * deep, metalness: 0, vertexColors: true,
    clearcoat: 0.05 + 0.04 * deep, clearcoatRoughness: 0.4, specularIntensity: 0.8 + 0.3 * deep,
    sheen: 0.5 + 0.3 * deep, sheenRoughness: 0.45, sheenColor: new THREE.Color(mix(tone, '#ffd8b8', 0.55)).convertSRGBToLinear(),
  });
  const uniforms = {
    uTone: { value: v3(t) }, uLip: { value: v3(lip) },
    uWarm: { value: new THREE.Vector3(warm.r / Math.max(t.r, 1e-3), warm.g / Math.max(t.g, 1e-3), warm.b / Math.max(t.b, 1e-3)) },
    uAlbedo: { value: 0.8 + 0.55 * deep }, uGlow: { value: 0.1 + 0.15 * deep }, uRim: { value: 0.2 + 0.25 * deep },
    uWrap: { value: 0.55 }, uScatter: { value: new THREE.Vector3(1.0, 0.5, 0.36).multiplyScalar(0.9) },
  };
  m.userData['uniforms'] = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const wrapped = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'vec3 irradiance = dotNL * directLight.color;',
      `vec3 irradiance = dotNL * directLight.color;
	{ float nlWrap = saturate( ( dot( geometryNormal, directLight.direction ) + uWrap ) / ( 1.0 + uWrap ) );
	  reflectedLight.directDiffuse += ( nlWrap - dotNL ) * directLight.color * uScatter * BRDF_Lambert( material.diffuseColor ); }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTone, uLip, uWarm, uScatter;\nuniform float uGlow, uRim, uAlbedo, uWrap;')
      .replace('#include <lights_physical_pars_fragment>', wrapped)
      .replace('#include <color_fragment>', SKIN_COLOR(debug))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, clamp(vColor.r, 0.0, 1.0));')
      .replace('#include <aomap_fragment>', `
#include <aomap_fragment>
{
  float ao = pow(clamp(vColor.a, 0.0, 1.0), 2.0);
  reflectedLight.directDiffuse *= mix(1.0, ao, 0.4);
  reflectedLight.indirectDiffuse *= ao;
  reflectedLight.indirectSpecular *= ao;
}`)
      .replace('#include <emissivemap_fragment>', `
#include <emissivemap_fragment>
{
  float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.2);
  totalEmissiveRadiance += diffuseColor.rgb * (uGlow + rim * uRim) * mix(1.0, pow(clamp(vColor.a, 0.0, 1.0), 2.0), 0.5);
}`);
  };
  m.customProgramCacheKey = () => 'skin3';
  return m;
}

/** The whole face detail (eyes, brows, lashes, teeth, tongue, mouth cavity) in one material over the atlas. */
export function makeFace(map: THREE.Texture, browColor: string): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ map, vertexColors: true, alphaTest: 0.45, roughness: 0.5, metalness: 0, clearcoat: 0.0, specularIntensity: 0.6, side: THREE.DoubleSide });
  const brow = linear(mix(browColor, '#000000', 0.35));
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uBrow'] = { value: v3(brow) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBrow;')
      .replace('#include <color_fragment>', 'diffuseColor.rgb *= vColor.rgb; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uBrow, vColor.a);')
      // the eye (left half of the atlas) is wet and glossy; everything else is matte
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMapUv.x < 0.5 ? 0.08 : (vColor.a > 0.5 ? 0.75 : 0.45);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (vMapUv.x < 0.5) totalEmissiveRadiance += diffuseColor.rgb * 0.06;');
  };
  m.customProgramCacheKey = () => 'face3';
  return m;
}

export function makeTeeth(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.4 }); }

export function makeFabric(color: string, map: THREE.Texture | null, sheen = true): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({ color: map ? 0xffffff : c, map, roughness: 0.8, metalness: 0, sheen: sheen ? 1 : 0, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide });
}
export function makeShoe(color: string): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.02 }); }

export interface SwayUniforms { uSway: { value: THREE.Vector3 }; uTime: { value: number } }
/** One hair material for the cap, the braids and the afro: vertex alpha fades the hairline (hashed), the tips sway with the head. */
export function makeHair(color: string, map: THREE.Texture | null, sway: SwayUniforms, normal: THREE.Texture | null = null): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#9a8070'), 0.3), map: map ?? null, normalMap: normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.55, metalness: 0.05, vertexColors: true, side: THREE.DoubleSide, alphaHash: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uSway'] = sway.uSway; shader.uniforms['uTime'] = sway.uTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uSway;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  float swayW = smoothstep(1.62, 1.2, position.y);
  float ph = position.x * 47.0 + position.z * 31.0;
  transformed += (uSway + vec3(sin(uTime * 1.7 + ph) * 0.0022, 0.0, sin(uTime * 1.3 + ph * 1.3) * 0.0016)) * swayW;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.5); totalEmissiveRadiance += diffuseColor.rgb * (0.05 + rim * 0.08); }`);
  };
  m.customProgramCacheKey = () => 'hair3';
  return m;
}

// ---- crowd: lit by one cheap Lambert pass, painted from the same masks
export function makeCrowdSkin(tone: string): THREE.MeshLambertMaterial {
  const { t, lip, warm } = skinTints(tone);
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uTone'] = { value: v3(t) }; shader.uniforms['uLip'] = { value: v3(lip) };
    shader.uniforms['uWarm'] = { value: new THREE.Vector3(warm.r / Math.max(t.r, 1e-3), warm.g / Math.max(t.g, 1e-3), warm.b / Math.max(t.b, 1e-3)) };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTone, uLip, uWarm;')
      .replace('#include <color_fragment>', 'diffuseColor.rgb = mix(uTone, uLip, vColor.r * 0.8) * mix(vec3(1.0), min(uWarm, vec3(2.4)), vColor.g * 0.5) * (1.0 - 0.25 * vColor.b) * (0.8 + 0.2 * pow(vColor.a, 2.0)) * 1.5;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.3;');
  };
  m.customProgramCacheKey = () => 'crowdskin3';
  return m;
}
export function makeCrowdCloth(hair: string, garment: string, shoes: string): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms['uHair'] = { value: v3(linear(hair)) }; shader.uniforms['uGarment'] = { value: v3(linear(garment)) }; shader.uniforms['uShoes'] = { value: v3(linear(shoes)) };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHair, uGarment, uShoes;')
      .replace('#include <color_fragment>', 'diffuseColor.rgb = (uHair * vColor.r + uGarment * vColor.g + uShoes * vColor.b) * 1.35;');
  };
  m.customProgramCacheKey = () => 'crowdcloth3';
  return m;
}
export function makeDecal(map: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
}

export function makeGold(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: 0xd9a93c, roughness: 0.28, metalness: 0.85 }); }
