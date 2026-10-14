// Cache first, then the server ("stale-while-revalidate") for the reads that are safe to show stale for a moment: public or
// display-only lists (the online count, the city gist, a directory page, the public record). A screen reads the last answer from
// localStorage at once, asks the server in the background and replaces it when the answer comes. It is never used for the player's
// own money, stock or an action in flight: those come from the life snapshot (client.ts, snapshotPhase) and the server, and anything
// a player can act on is checked on the server again, as before.
//
// One record per key under `allworld.cf.<scope>/<name>`: { v: schema version, at: when it was kept, d: the value }. The scope is a
// player id for anything that differs by viewer (a "you" mark), or '_' for public data. A record is dropped, not trusted, when its
// version differs, it is older than the caller's max age, it is from the future, or it is not JSON. The whole cache is held under
// CACHE_CAP characters: the oldest records go first, and a record bigger than ENTRY_MAX is not kept. Storage that is full, off or
// private-mode changes nothing but speed. clearCache() drops everything (sign-out, another character).
export const CACHE_PREFIX = 'allworld.cf.'
export const CACHE_CAP = 200_000
export const ENTRY_MAX = 40_000

export interface CacheSpec {
  /** What it is, with the city or list in it: "gist.lagos". */
  name: string
  /** The player id when the answer differs by viewer; omitted for public data. */
  scope?: string
  /** Bump when the shape of the kept value changes: older records are then dropped. */
  version: number
  /** Older than this is not shown. */
  maxAgeMs: number
}
export interface Kept<T> { value: T; at: number }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

const keyOf = (spec: Pick<CacheSpec, 'name' | 'scope'>): string => `${CACHE_PREFIX}${spec.scope ?? '_'}/${spec.name}`
function storeOf(): Store | undefined { try { return globalThis.localStorage } catch { return undefined } }
const drop = (store: Store, key: string): void => { try { store.removeItem(key) } catch { /* nothing to drop */ } }

/** The kept value, or null: nothing kept, junk, another version, too old, or `check` refuses its shape. A bad record is removed. */
export function readCache<T>(spec: CacheSpec, check: (value: unknown) => T | null, now: number = Date.now(), store: Store | undefined = storeOf()): Kept<T> | null {
  if (!store) return null
  const key = keyOf(spec)
  try {
    const raw = store.getItem(key)
    if (raw === null) return null
    const kept = JSON.parse(raw) as { v?: unknown; at?: unknown; d?: unknown } | null
    const value = kept && kept.v === spec.version && typeof kept.at === 'number' && kept.at <= now + 60000 && now - kept.at <= spec.maxAgeMs ? check(kept.d) : null
    if (value === null) { drop(store, key); return null }
    return { value, at: kept!.at as number }
  } catch { drop(store, key); return null }
}

interface Row { key: string; size: number; at: number }
function rows(store: Store): Row[] {
  const out: Row[] = []
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (!key?.startsWith(CACHE_PREFIX)) continue
      const raw = store.getItem(key) ?? ''
      let at = 0
      try { const kept = JSON.parse(raw) as { at?: unknown } | null; if (typeof kept?.at === 'number') at = kept.at } catch { /* junk goes first */ }
      out.push({ key, size: key.length + raw.length, at })
    }
  } catch { /* unreadable storage: nothing to count */ }
  return out.sort((a, b) => a.at - b.at)
}

/** Keeps `value`. False when it was not kept (too big, storage off or full even after the oldest went). */
export function writeCache(spec: CacheSpec, value: unknown, now: number = Date.now(), store: Store | undefined = storeOf()): boolean {
  if (!store) return false
  const key = keyOf(spec)
  let text: string
  try { text = JSON.stringify({ v: spec.version, at: now, d: value }) } catch { return false }
  if (text === undefined || text.length + key.length > ENTRY_MAX) { drop(store, key); return false }
  const others = rows(store).filter((row) => row.key !== key)
  let total = others.reduce((sum, row) => sum + row.size, 0) + text.length + key.length
  while (total > CACHE_CAP && others.length) { const old = others.shift()!; drop(store, old.key); total -= old.size }
  for (;;) {
    try { store.setItem(key, text); return true } catch {
      const old = others.shift() // the browser's own quota: let go of the oldest and try again
      if (!old) return false
      drop(store, old.key)
    }
  }
}

/** Forgets everything kept (sign-out, another character, a new life). */
export function clearCache(store: Store | undefined = storeOf()): void {
  if (!store) return
  try {
    const keys: string[] = []
    for (let i = 0; i < store.length; i++) { const key = store.key(i); if (key?.startsWith(CACHE_PREFIX)) keys.push(key) }
    for (const key of keys) drop(store, key)
  } catch { /* nothing to forget */ }
}
