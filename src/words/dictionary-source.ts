import { PACKED } from './data/dictionary.ts'
import type { DictionaryAssetManifest } from './dictionary-asset.ts'

/** Authored-source loader for generator checks and source-only tools. Never select this in the Worker bundle. */
export async function loadPackedDictionary(_manifest: DictionaryAssetManifest): Promise<string> { return PACKED }
