// The game-art credits the Help sheet shows (docs/ASSET-PIPELINE.md), from asset-credits.generated.ts, which
// scripts/assets/credits.ts writes from the asset packs' manifests. Only AssetCredits.vue imports this, and Help loads that only
// when a player opens the credits: never in the first download. Anything unreadable is left out; links must be https.
import { ASSET_CREDITS } from './asset-credits.generated.ts'

export interface CreditRow { title: string; detail: string; url: string | null; licence: string; licenceUrl: string | null }
export interface Credits { required: CreditRow[]; thanks: CreditRow[] }

const LICENCE: Record<string, string> = { 'CC0-1.0': 'CC0', 'CC-BY-3.0': 'CC BY 3.0', 'CC-BY-4.0': 'CC BY 4.0', 'AGPL-3.0-or-later': 'made for Allworld' }
const text = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)
const https = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\/[\w.-]+(\/[\w./%~+-]*)?$/.test(v) ? v : null)
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : [])

/** The rows to show: CC BY lines first (the licence requires them), then every pack thanked by name. */
export function readCredits(value: unknown): Credits {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const required: CreditRow[] = []
  for (const a of list(root['attributions'])) {
    const line = text(a['attribution'], 400)
    const id = text(a['licenceId'])
    if (!line || !id || !LICENCE[id]) continue
    const files = Array.isArray(a['files']) ? a['files'].length : 0
    required.push({ title: line, detail: `${files} file${files === 1 ? '' : 's'}`, url: https(a['source']), licence: LICENCE[id]!, licenceUrl: https(a['licenceUrl']) })
  }
  const thanks: CreditRow[] = []
  for (const p of list(root['packs'])) {
    const name = text(p['name'])
    const author = text(p['author'])
    const id = text(p['licenceId'])
    if (!name || !author || !id || !LICENCE[id]) continue
    const games = Array.isArray(p['games']) ? p['games'].filter((g): g is string => typeof g === 'string' && /^[a-z]{2,16}$/.test(g)) : []
    thanks.push({ title: `${name} by ${author}`, detail: games.length ? `In ${games.join(', ')}` : '', url: https(p['page']), licence: LICENCE[id]!, licenceUrl: https(p['licenceUrl']) })
  }
  return { required, thanks }
}

export const assetCredits = (): Credits => readCredits(ASSET_CREDITS)
