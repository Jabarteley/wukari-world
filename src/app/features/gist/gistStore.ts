// The one shared copy of the city gist for the phone app and the Square's line: read from GET /api/world/gist (public, cached by the server for
// 15 seconds), kept per city, and asked for again no sooner than REFRESH_MS. A failed read changes nothing.
import { reactive } from 'vue'
import { REFRESH_MS } from './gistConfig.ts'
import { gistPath, readGist } from './gistModel.ts'
import type { GistLine } from './gistModel.ts'

export const gist = reactive<{ city: string; lines: GistLine[]; at: number; loading: boolean; failed: boolean }>({ city: '', lines: [], at: 0, loading: false, failed: false })

export async function loadGist(fetchJson: (path: string) => Promise<unknown>, city: string, now = Date.now(), force = false): Promise<void> {
  if (gist.loading || !city) return
  if (!force && gist.city === city && now - gist.at < REFRESH_MS) return
  gist.loading = true
  try {
    const lines = readGist(await fetchJson(gistPath(city)))
    gist.city = city; gist.lines = lines; gist.at = now; gist.failed = false
  } catch { gist.failed = true } finally { gist.loading = false }
}
