/**
 * Players' model files on the Worker host: the R2 bucket `allworld-models` (binding MODELS in wrangler.jsonc), one object per
 * model named `glb/<sha256>`. The Node host keeps files instead (server/spaces/model-files.ts); both answer to ModelStore.
 */
import type { ModelStore } from '../server/types.ts';

/** The part of the R2 binding this store uses (declared here: the Node test projects have no Workers types). */
export interface R2Models {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>
  delete(keys: string | string[]): Promise<void>
}

const HASH = /^[0-9a-f]{64}$/;

export function createR2Models(bucket: R2Models): ModelStore {
  return {
    async put(hash, bytes) { if (!HASH.test(hash)) throw new Error('bad model hash'); await bucket.put(`glb/${hash}`, bytes, { httpMetadata: { contentType: 'model/gltf-binary' } }); },
    async get(hash) { if (!HASH.test(hash)) return null; const found = await bucket.get(`glb/${hash}`); return found ? new Uint8Array(await found.arrayBuffer()) : null; },
    async remove(hashes) { const keys = hashes.filter((hash) => HASH.test(hash)).map((hash) => `glb/${hash}`); for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000)); },
  };
}
