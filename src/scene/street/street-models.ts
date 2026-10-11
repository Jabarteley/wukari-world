/**
 * OWNER: neighbourhood
 * The street set's files. Reached only through a dynamic import from the neighbourhood scene (and only on a device that may
 * fetch models), so the addresses and the loader are never part of the first download: every .glb here is its own request,
 * served with a content hash and cached for a year.
 */
import homeAtlas from './assets/home-atlas.jpg?url';
import { createGltfSource } from '../models/gltf-source.ts';
import { modelCacheFor } from '../models/scene-models.ts';
import type { ModelCache } from '../models/scene-models.ts';
import type { Kit } from '../kit.ts';
import { atlasOf, isGateLeaf } from './street-kit.ts';

const found = import.meta.glob('./assets/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** File key (bungalow-cream, bungalow-cream-far, detail-dish ...) → address. */
export const URLS: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(Object.entries(found).map(([path, url]) => [path.replace(/^.*\/(.*)\.glb$/, '$1'), url])));

/** The street's one model cache for a kit: each file is read once however many streets or placements use it. */
export const streetModels = (kit: Kit): ModelCache => modelCacheFor(kit, () => createGltfSource(kit, { urls: URLS, atlasOf, images: { home: homeAtlas }, bareAtlas: 'home', omit: isGateLeaf }));
