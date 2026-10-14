// The Hall of Records shows its last first page at once and replaces it when the server answers (docs/PERFORMANCE.md, cache first).
// The record is public. What is kept is checked again by checkRecords like any answer; the server is asked every time.
import { readCache, writeCache } from '../../state/cacheFirst.ts'
import type { CacheSpec } from '../../state/cacheFirst.ts'
import type { RecordKind, RecordsResponse } from '../../../types/records.ts'

const spec = (filter: RecordKind | 'all'): CacheSpec => ({ name: `records.${filter}`, version: 1, maxAgeMs: 7 * 86400000 })
const isPage = (value: unknown): RecordsResponse | null => {
  const page = value as Partial<RecordsResponse> | null
  return page && Array.isArray(page.entries) && typeof page.head === 'string' && typeof page.count === 'number' && (page.before === null || typeof page.before === 'number') ? (page as RecordsResponse) : null
}
/** The kept first page of this filter, or null. */
export const recallRecords = (filter: RecordKind | 'all', now?: number, store?: Parameters<typeof readCache>[3]): RecordsResponse | null => readCache(spec(filter), isPage, now, store)?.value ?? null
/** Keeps the first page just read. */
export const keepRecords = (filter: RecordKind | 'all', page: RecordsResponse, now?: number, store?: Parameters<typeof writeCache>[3]): void => { writeCache(spec(filter), page, now, store) }
