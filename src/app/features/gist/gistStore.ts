// The one shared copy of the city gist for the phone app and the Square's line: read from GET /api/world/gist (public, cached by the server for
// 15 seconds), kept per city, and asked for again no sooner than REFRESH_MS. A failed read changes nothing. Cache first (docs/PERFORMANCE.md):
// the last lines of the city are kept on the device and shown at once when this page has none yet; the answer replaces them. Each line
// carries its own "x ago", so an old line says it is old.
import { reactive } from 'vue'
import { readCache, writeCache } from '../../state/cacheFirst.ts'
import type { CacheSpec } from '../../state/cacheFirst.ts'
import { REFRESH_MS } from './gistConfig.ts'
import { gistPath, readGist } from './gistModel.ts'
import type { GistLine } from './gistModel.ts'

export const gist = reactive<{ city: string; lines: GistLine[]; at: number; loading: boolean; failed: boolean }>({ city: '', lines: [], at: 0, loading: false, failed: false })

type KeepStore = Parameters<typeof readCache>[3]
const gistSpec = (city: string): CacheSpec => ({ name: `gist.${city}`, version: 1, maxAgeMs: 12 * 3600000 })
/** Kept lines are read like an answer, so the same checks apply. */
const keptLines = (value: unknown): GistLine[] | null => { const lines = readGist({ items: value }); return lines.length ? lines : null }

export async function loadGist(fetchJson: (path: string) => Promise<unknown>, city: string, now = Date.now(), force = false, store?: KeepStore): Promise<void> {
  if (gist.loading || !city) return
  if (!force && gist.city === city && now - gist.at < REFRESH_MS) return
  if (gist.city !== city) {
    const kept = readCache(gistSpec(city), keptLines, now, store)
    // at stays 0: the lines are shown, and the server is still asked now.
    gist.city = city; gist.lines = kept?.value ?? []; gist.at = 0
  }
  gist.loading = true
  try {
    const lines = readGist(await fetchJson(gistPath(city)))
    gist.city = city; gist.lines = lines; gist.at = now; gist.failed = false
    if (lines.length) writeCache(gistSpec(city), lines, now, store)
  } catch { gist.failed = true } finally { gist.loading = false }
}
