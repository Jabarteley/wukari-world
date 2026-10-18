import * as THREE from 'three';
import { createFacadeMaterial } from './facade-material.ts';
import type { PbrSet } from './textures.ts';

/**
 * The materials real buildings and streets share between the realworld page and the game's street (src/street/renderer.ts).
 * Textures load in the background from `base` (the game: /assets/textures, 1K; the page: /realworld/textures, 2K); until they arrive
 * the materials draw with their colours alone.
 */
export interface RealMaterials {
  facade: THREE.MeshStandardMaterial; zinc: THREE.MeshStandardMaterial; flatRoof: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial; ground: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial;
  setNight(night: number): void;
}

function lazySet(renderer: THREE.WebGLRenderer, base: string, id: string, metres: number, maps: ('ao' | 'metalness')[] = []): PbrSet {
  const loader = new THREE.TextureLoader(), anisotropy = renderer.capabilities.getMaxAnisotropy();
  const load = (name: string, colour: boolean) => {
    const texture = loader.load(`${base}/${id}/${name}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1 / metres, 1 / metres); texture.anisotropy = anisotropy;
    texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return texture;
  };
  const set: PbrSet = { map: load('color', true), normalMap: load('normal', false), roughnessMap: load('roughness', false) };
  if (maps.includes('ao')) set.aoMap = load('ao', false);
  if (maps.includes('metalness')) set.metalnessMap = load('metalness', false);
  return set;
}

/** Zinc roofs: the vertex (sampled roof) colour with the corrugated sheet's relief and roughness, streaked with rust. */
export function zincMaterial(metal: Pick<PbrSet, 'normalMap' | 'roughnessMap'>): THREE.MeshStandardMaterial {
  const zinc = new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: metal.normalMap, roughnessMap: metal.roughnessMap, metalness: 0.35, roughness: 1, normalScale: new THREE.Vector2(1.3, 1.3) });
  zinc.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRoofUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoofUv = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vRoofUv;
float rhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rhash(i), rhash(i + vec2(1, 0)), f.x), mix(rhash(i + vec2(0, 1)), rhash(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float sheet = floor(vRoofUv.x / 0.9); float rust = rnoise(vec2(sheet * 3.1, vRoofUv.y * 0.35)) * rnoise(vRoofUv * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.17, 0.09), smoothstep(0.25, 0.7, rust) * 0.7);
  diffuseColor.rgb *= 0.88 + 0.24 * rhash(vec2(sheet, 7.0)); }`);
  };
  zinc.customProgramCacheKey = () => 'realworld-zinc-1';
  return zinc;
}

export function createRealMaterials(renderer: THREE.WebGLRenderer, base = '/assets/textures'): RealMaterials {
  const plaster = lazySet(renderer, base, 'PaintedPlaster017', 2.4), metal = lazySet(renderer, base, 'CorrugatedSteel007A', 1.2), concrete = lazySet(renderer, base, 'Concrete034', 3);
  const asphalt = lazySet(renderer, base, 'Asphalt031', 6), ground = lazySet(renderer, base, 'Ground037', 5), paving = lazySet(renderer, base, 'PavingStones070', 1.6);
  const facade = createFacadeMaterial(plaster);
  return {
    facade: facade.material,
    zinc: zincMaterial(metal),
    flatRoof: new THREE.MeshStandardMaterial({ vertexColors: true, map: concrete.map, normalMap: concrete.normalMap, roughnessMap: concrete.roughnessMap }),
    asphalt: new THREE.MeshStandardMaterial({ color: '#6d6c6a', roughness: 1, map: asphalt.map, normalMap: asphalt.normalMap, roughnessMap: asphalt.roughnessMap, polygonOffset: true, polygonOffsetFactor: -2 }),
    ground: new THREE.MeshStandardMaterial({ color: '#9a8c74', roughness: 1, map: ground.map, normalMap: ground.normalMap, roughnessMap: ground.roughnessMap }),
    paving: new THREE.MeshStandardMaterial({ color: '#d8d2c6', map: paving.map, normalMap: paving.normalMap, roughnessMap: paving.roughnessMap }),
    setNight(night) { facade.uniforms.night.value = night; },
  };
}
