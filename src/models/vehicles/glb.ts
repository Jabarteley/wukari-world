/**
 * The authored vehicle models, fetched on demand. Reached only through a dynamic import (src/models/integration/scene-models.ts, the city
 * map), so this module, the glTF loader, the meshopt decoder and the file addresses are a lazy chunk fetched with the scene that draws
 * a vehicle, never part of the first download. Until a model arrives, and if it fails to, the procedural vehicle (index.ts) is drawn.
 *
 *   loadGlbVehicle(request)   → Promise<GlbTemplate | null>   (cached; null when the file could not be had)
 *   peekGlbVehicle(request)   → GlbTemplate | null            (what has already arrived)
 *   instantiate(template, …)  → GlbVehicle                    (a clone per use: wheels, riders, lights; see glb-parts.ts)
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLB_FILES } from './glb-files.ts';
import { createGlbLibrary } from './glb-library.ts';
import type { GlbRequest } from './glb-parts.ts';

export { createGlbVehicle as instantiate, instancingParts, paintFor, GLB_KINDS, GLB_VARIANTS } from './glb-parts.ts';
export type { GlbKind, GlbLod, GlbRequest, GlbTemplate, GlbVehicle, Rider } from './glb-parts.ts';

let loader: GLTFLoader | null = null;
const library = createGlbLibrary(async (key) => {
  const url = GLB_FILES[key];
  if (!url) throw new Error(`no vehicle file ${key}`);
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  return gltf.scene;
});

export const loadGlbVehicle = (request: GlbRequest) => library.load(request);
export const peekGlbVehicle = (request: GlbRequest) => library.peek(request);
