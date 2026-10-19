// The page's copy of shared watching (docs/ALLWORLD-HOUSE.md): match predictions, Allworld House and premieres. Loaded only with the
// Watch app (and the premiere bar of a world). Everything is the server's: buttons ask, the answers replace what is shown.
import { reactive } from 'vue'
import { call } from '../social/useSocial.ts'
import type { BoardView, HouseView, MatchView, MatchesView, PremieresView } from '../../../types/watch.ts'

export const watch = reactive<{ matches: MatchesView | null; board: BoardView | null; house: HouseView | null; premieres: PremieresView | null; busy: boolean; at: Record<string, number> }>({ matches: null, board: null, house: null, premieres: null, busy: false, at: {} })

const FRESH_MS = 30000
const stale = (key: string, force: boolean): boolean => force || Date.now() - (watch.at[key] ?? 0) > FRESH_MS
/** A read that fills one part of the store (at most every half minute unless forced). */
async function read<T extends object>(key: 'matches' | 'board' | 'house' | 'premieres', path: string, force: boolean, ok: (value: T) => boolean): Promise<void> {
  if (!stale(key, force)) return
  const answer = await call<T>(path) as unknown as T & { ok?: boolean }
  if (answer && ok(answer)) { (watch as Record<string, unknown>)[key] = answer; watch.at[key] = Date.now() }
}
export const loadMatches = (city: string, force = false): Promise<void> => read<MatchesView>('matches', `/api/watch/matches?city=${encodeURIComponent(city)}`, force, (v) => Array.isArray(v.matches))
export const loadBoard = (force = false): Promise<void> => read<BoardView>('board', '/api/watch/board', force, (v) => Array.isArray(v.rows))
export const loadHouse = (force = false): Promise<void> => read<HouseView>('house', '/api/watch/house', force, (v) => typeof v.now === 'number')
export const loadPremieres = (force = false): Promise<void> => read<PremieresView>('premieres', '/api/watch/premieres', force, (v) => Array.isArray(v.premieres))

/** One write; returns the server's sentence when it refused (null when done). */
async function write<T extends object>(path: string, body: object, after: () => Promise<void>): Promise<string | null> {
  if (watch.busy) return null
  watch.busy = true
  try {
    const done = await call<T>(path, body)
    if (!done.ok) return done.reason
    await after()
    return null
  } finally { watch.busy = false }
}
export function predict(city: string, fixture: string, winner: 'home' | 'away' | 'draw', score: [number, number] | null): Promise<string | null> {
  return write<{ match: MatchView }>('/api/watch/predict', { fixture, winner, ...(score ? { score } : {}) }, () => loadMatches(city, true))
}
export const voteHousemate = (mate: string): Promise<string | null> => write('/api/watch/house/vote', { mate }, () => loadHouse(true))
export const applyArtist = (form: { name: string; about: string; links: string[]; track: string }): Promise<string | null> => write('/api/watch/artist/apply', form, () => loadPremieres(true))
export const schedulePremiere = (event: string, world: string): Promise<string | null> => write('/api/watch/premiere', { event, ...(world ? { world } : {}) }, () => loadPremieres(true))
export const cancelPremiere = (id: string): Promise<string | null> => write('/api/watch/premiere/cancel', { id }, () => loadPremieres(true))
