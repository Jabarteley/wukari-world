// The last first page of a local government's directory (the counts and 25 residents, no search, no filter), kept on the device so the
// page opens full and is then replaced by the server's answer (docs/PERFORMANCE.md, cache first). Residents carry a "you" mark, so the
// record is kept per player and never shown to another one. Display only: "Say hi" opens the person's card, which asks the server.
import { readCache, writeCache } from '../../state/cacheFirst.ts'
import type { CacheSpec } from '../../state/cacheFirst.ts'
import type { WorldLgaResponse, WorldPerson } from '../../../types/world.ts'

export interface LgaFirstPage { info: WorldLgaResponse; items: WorldPerson[]; next: number | null }
type ReadStore = Parameters<typeof readCache>[3]

const spec = (who: string, city: string, lga: string): CacheSpec => ({ name: `lga.${city}.${lga}`, scope: who, version: 1, maxAgeMs: 3 * 86400000 })
const isPage = (value: unknown): LgaFirstPage | null => {
  const page = value as Partial<LgaFirstPage> | null
  return page && typeof page.info === 'object' && page.info !== null && Array.isArray(page.items) && page.items.every((item) => typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.name === 'string') && (page.next === null || typeof page.next === 'number') ? (page as LgaFirstPage) : null
}
export const recallLga = (who: string, city: string, lga: string, now?: number, store?: ReadStore): LgaFirstPage | null => readCache(spec(who, city, lga), isPage, now, store)?.value ?? null
export const keepLga = (who: string, city: string, lga: string, page: LgaFirstPage, now?: number, store?: ReadStore): void => { writeCache(spec(who, city, lga), page, now, store) }
