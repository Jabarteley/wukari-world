import * as THREE from 'three';

/** A CC0 PBR set fetched by scripts/realworld/fetch-textures.ts, tiling every `metres` (the geometry's uv is in metres). */
export interface PbrSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; aoMap?: THREE.Texture; metalnessMap?: THREE.Texture }

const loader = new THREE.TextureLoader();
export async function loadSet(renderer: THREE.WebGLRenderer, id: string, metres: number, maps: ('ao' | 'metalness')[] = []): Promise<PbrSet> {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const load = async (name: string, colour: boolean) => {
    const texture = await loader.loadAsync(`/realworld/textures/${id}/${name}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / metres, 1 / metres);
    texture.anisotropy = anisotropy;
    texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return texture;
  };
  const [map, normalMap, roughnessMap, ...rest] = await Promise.all([load('color', true), load('normal', false), load('roughness', false), ...maps.map((m) => load(m, false))]);
  const set: PbrSet = { map: map!, normalMap: normalMap!, roughnessMap: roughnessMap! };
  maps.forEach((m, i) => { if (m === 'ao') set.aoMap = rest[i]; else set.metalnessMap = rest[i]; });
  return set;
}
