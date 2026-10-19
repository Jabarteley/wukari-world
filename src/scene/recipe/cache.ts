import type { Kit } from '../kit.ts';
import type { ModelCache, ModelData } from '../models/scene-models.ts';
import type { PreparedCityAssets, PreparedAtlas } from './prepare.ts';
import { requireRecipe } from './pack.ts';

const caches = new WeakMap<Kit, { cache: ModelCache; add(prepared: PreparedCityAssets): void }>();
export function preparedCacheFor(kit: Kit, prepared: PreparedCityAssets): ModelCache {
  let owner = caches.get(kit);
  if (!owner) {
    const models = new Map<string, ModelData>(), textures = new Map<string, { atlas: PreparedAtlas; texture: import('three').Texture }>();
    let disposed = false;
    const source = {
      async load(key: string) { const model = models.get(key); requireRecipe(!disposed && model, 'prepared model unavailable'); return model; },
      texture: (key: string) => textures.get(key)?.texture ?? null,
    };
    const cache: ModelCache = { source, reads: 0, peek: key => disposed ? null : models.get(key) ?? null,
      request: key => Promise.resolve(disposed ? null : models.get(key) ?? null), failed: key => disposed || !models.has(key) };
    owner = { cache, add(input) {
      requireRecipe(!disposed, 'prepared Kit cache disposed');
      for (const asset of [input.kit, ...(input.hero ? [input.hero] : [])]) {
        for (const model of asset.models.values()) {
          const existing = models.get(model.key);
          requireRecipe(!existing || existing === model, 'prepared model cache identity collision'); models.set(model.key, model);
        }
        if (asset.atlas && !textures.has(asset.atlas.key)) {
          const texture = asset.atlas.texture.clone(); texture.needsUpdate = true;
          asset.atlas.users++; textures.set(asset.atlas.key, { atlas: asset.atlas, texture });
        }
      }
    } };
    caches.set(kit, owner);
    kit.onDispose(() => {
      if (disposed) return; disposed = true;
      for (const { atlas, texture } of textures.values()) { texture.dispose(); atlas.users--; }
      models.clear(); textures.clear(); caches.delete(kit);
    });
  }
  owner.add(prepared); return owner.cache;
}
