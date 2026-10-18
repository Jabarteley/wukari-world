/**
 * OWNER: spaces
 * Players' model files on the Node host: one file per model, named by the SHA-256 of its bytes, in a folder of its own beside the
 * data file (DATA_DIR/space-models). The Worker keeps them in R2 instead (deploy/r2-models.ts); both answer to ModelStore.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelStore } from '../types.ts';

export const MODEL_HASH = /^[0-9a-f]{64}$/;

export function createFileModels(dir: string): ModelStore {
  const path = (hash: string): string => { if (!MODEL_HASH.test(hash)) throw new Error('bad model hash'); return join(dir, `${hash}.glb`); };
  return {
    async put(hash, bytes) {
      await mkdir(dir, { recursive: true });
      const temp = `${path(hash)}.${process.pid}.tmp`;
      await writeFile(temp, bytes, { mode: 0o600 }); await rename(temp, path(hash));
    },
    async get(hash) {
      if (!MODEL_HASH.test(hash)) return null;
      try { return new Uint8Array(await readFile(path(hash))); } catch { return null; }
    },
    async remove(hashes) { for (const hash of hashes) if (MODEL_HASH.test(hash)) await rm(path(hash), { force: true }); },
  };
}
