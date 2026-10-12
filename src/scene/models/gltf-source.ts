/**
 * OWNER: scenes
 * Reads model files (.glb with meshopt compression) into the plain arrays scene-models.ts draws from. Reached only through a
 * dynamic import, so GLTFLoader and the decoder are never part of the first download (they share a chunk with the skinned body).
 *
 * What it does to each file: bakes every node's transform into the vertices, bakes the texture transform the packer wrote
 * (gltfpack stores UVs quantised, with a scale and offset on the texture) into the UVs, and keeps one decoded atlas per atlas
 * key: every file of one palette carries the same picture, so the first one read is the texture and the others are freed.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { ModelData, ModelPart, ModelSource } from './scene-models.ts';

export interface GltfSourceOptions {
  /** File key → address of the .glb. */
  urls: Readonly<Record<string, string>>;
  /** Which atlas a file's textured parts sample (the same key for every file that carries the same picture). */
  atlasOf(key: string): string;
  /** Atlases that are separate image files (parts whose material has no picture of its own): key → address. */
  images?: Readonly<Record<string, string>>;
  /** Atlas key for parts whose material has no picture (they sample a separate image from `images`). */
  bareAtlas?: string;
  /** Leave out the triangles whose texture centre (in atlas UV) this says yes to: an open gate is the closed one without its leaf. */
  omit?(key: string, u: number, v: number): boolean;
  /** Reads a file into a glTF scene instead of fetching its address (tests read from disk). */
  open?(key: string): Promise<{ scene: THREE.Group }>;
}

export function createGltfSource(kit: Kit, options: GltfSourceOptions): ModelSource {
  const { THREE } = kit;
  const textures = new Map<string, THREE.Texture>();
  let loader: Promise<{ loadAsync(url: string): Promise<{ scene: THREE.Group }> }> | null = null;
  const imageLoads = new Map<string, Promise<void>>();
  let disposed = false;

  function readLoader() {
    loader ||= Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]).then(([gltf, meshopt]) => {
      const made = new gltf.GLTFLoader();
      made.setMeshoptDecoder(meshopt.MeshoptDecoder);
      return made;
    });
    return loader;
  }
  function loadImage(atlas: string): Promise<void> {
    let pending = imageLoads.get(atlas);
    if (!pending) {
      const url = options.images?.[atlas];
      pending = url ? new THREE.TextureLoader().loadAsync(url).then((texture) => {
        if (disposed) { texture.dispose(); return; }
        texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
        textures.set(atlas, texture);
      }) : Promise.reject(new Error(`No image for atlas ${atlas}`));
      imageLoads.set(atlas, pending);
    }
    return pending;
  }
  function keepTexture(atlas: string, map: THREE.Texture): void {
    if (textures.has(atlas)) { map.dispose(); return; }
    const texture = map.clone();
    texture.offset.set(0, 0); texture.repeat.set(1, 1); texture.rotation = 0; texture.center.set(0, 0);
    texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; texture.matrixAutoUpdate = true;
    texture.needsUpdate = true;
    textures.set(atlas, texture);
    map.dispose();
  }

  return {
    texture: (atlas) => textures.get(atlas) ?? null,
    dispose() { disposed = true; for (const texture of textures.values()) texture.dispose(); textures.clear(); },
    async load(key) {
      const url = options.urls[key];
      if (!url && !options.open) throw new Error(`Unknown model ${key}`);
      const gltf = options.open ? await options.open(key) : await (await readLoader()).loadAsync(url!);
      if (disposed) throw new Error('Source disposed');
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const parts: ModelPart[] = [], anchors: ModelData['anchors'] = {};
      const normalMatrix = new THREE.Matrix3(), v = new THREE.Vector3();
      let triangles = 0;
      const meshes: THREE.Mesh[] = [];
      root.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
        else if (object !== root && object.children.length === 0 && object.name) { v.setFromMatrixPosition(object.matrixWorld); anchors[object.name] = [v.x, v.y, v.z]; }
      });
      for (const mesh of meshes) {
        const geometry = mesh.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal, uvs = geometry.attributes.uv, colours = geometry.attributes.color;
        if (!position || !geometry.index) continue;
        const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        const map = material.map ?? null;
        const atlas = map ? options.atlasOf(key) : (options.bareAtlas ?? '');
        if (map) keepTexture(atlas, map); else if (atlas) await loadImage(atlas);
        mesh.updateMatrixWorld(true);
        normalMatrix.getNormalMatrix(mesh.matrixWorld);
        const count = position.count;
        const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
          if (normal) { v.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z; } else nor[i * 3 + 1] = 1;
        }
        let uv: Float32Array | null = null;
        if (uvs) {
          uv = new Float32Array(count * 2);
          const transform = map ? (map.updateMatrix(), map.matrix.elements) : null;
          for (let i = 0; i < count; i++) {
            const u = uvs.getX(i), w = uvs.getY(i);
            uv[i * 2] = transform ? transform[0]! * u + transform[3]! * w + transform[6]! : u;
            uv[i * 2 + 1] = transform ? transform[1]! * u + transform[4]! * w + transform[7]! : w;
          }
        }
        let color: Float32Array | null = null;
        if (colours) { color = new Float32Array(count * 3); for (let i = 0; i < count; i++) { color[i * 3] = colours.getX(i); color[i * 3 + 1] = colours.getY(i); color[i * 3 + 2] = colours.getZ(i); } }
        let index = Uint32Array.from(geometry.index.array as ArrayLike<number>);
        const omit = options.omit;
        if (omit && uv) {
          const kept: number[] = [];
          for (let t = 0; t < index.length; t += 3) {
            const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
            if (!omit(key, (uv[a * 2]! + uv[b * 2]! + uv[c * 2]!) / 3, (uv[a * 2 + 1]! + uv[b * 2 + 1]! + uv[c * 2 + 1]!) / 3)) kept.push(a, b, c);
          }
          index = Uint32Array.from(kept);
        }
        const node = mesh.parent && mesh.parent !== root ? mesh.parent.name : mesh.name;
        parts.push({ name: node, writable: /^sign/.test(node), atlas, position: pos, normal: nor, uv, color, index });
        triangles += index.length / 3;
        geometry.dispose();
      }
      if (!parts.length) throw new Error(`Model ${key} has no mesh`);
      return { key, parts, anchors, triangles };
    },
  };
}
