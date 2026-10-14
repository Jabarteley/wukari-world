// THE DATA METER: how much this page has downloaded, this session and today, for the Settings line "Data used: 3.2 MB this session · 11 MB today".
//
// The browser's own resource timing says what each request cost on the wire (`transferSize`: headers and body, after compression). A response
// answered from the cache costs nothing and says 0, which is the truth for the player's bill. It cannot see: the WebSocket (live places, chat,
// voice and calls), a request to another site that does not send Timing-Allow-Origin, and anything a service worker or the browser did before
// this page started. The number is an honest floor, not an invoice. It is started when the game is ready (a lazy chunk) and asks for the
// entries already recorded, so the first download is counted too.
//
// Today's total is kept in localStorage as { day, bytes } for the local calendar day and starts again at midnight. Several tabs add to the same
// record: a save reads what is stored and adds only what this tab has counted since its last save.
export const METER_KEY = 'joinallworld-data-v1'
/** How many resource entries the browser may keep before it stops recording (its default is 250); the first load alone can pass that. */
export const BUFFER_SIZE = 1000

export interface Today { day: string; bytes: number }
type Reader = Pick<Storage, 'getItem'> | null | undefined
type Writer = Pick<Storage, 'getItem' | 'setItem'> | null | undefined

/** The local calendar day, as 2026-10-14. */
export function dayKey(at: number): string {
  const date = new Date(at)
  const two = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}
/** What a resource entry cost: its transfer size, or nothing for a cache hit, a missing or a nonsense number. */
export const costOf = (entry: { transferSize?: number }): number => {
  const size = entry.transferSize
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? Math.round(size) : 0
}
/** Today's record from storage; a record of another day, or damaged, counts as nothing. */
export function readToday(storage: Reader, at: number): Today {
  const day = dayKey(at)
  try {
    const saved: unknown = JSON.parse(storage?.getItem(METER_KEY) ?? 'null')
    if (saved && typeof saved === 'object') {
      const { day: savedDay, bytes } = saved as Partial<Today>
      if (savedDay === day && typeof bytes === 'number' && Number.isFinite(bytes) && bytes >= 0) return { day, bytes }
    }
  } catch { /* nothing kept */ }
  return { day, bytes: 0 }
}
/** Add `bytes` to what is stored for today (a new day starts again from 0) and return the new record. Never throws. */
export function addToday(storage: Writer, at: number, bytes: number): Today {
  const next = readToday(storage, at)
  next.bytes += Math.max(0, Math.round(bytes))
  try { storage?.setItem(METER_KEY, JSON.stringify(next)) } catch { /* the number is then for this tab only */ }
  return next
}

/** 640 B, 12 KB, 3.2 MB, 11 MB, 1.2 GB: three digits at most, decimal units as phone data plans count them. */
export function formatBytes(bytes: number): string {
  const n = Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  if (n < 1000) return `${Math.round(n)} B`
  const units = ['KB', 'MB', 'GB'] as const
  let value = n / 1000, unit = 0
  while (value >= 999.5 && unit < units.length - 1) { value /= 1000; unit++ }
  return `${value < 10 ? (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '') : Math.round(value)} ${units[unit]}`
}
/** The Settings line. */
export const usedLine = (session: number, today: number): string => `Data used: ${formatBytes(session)} this session · ${formatBytes(today)} today`

export interface Meter {
  /** Bytes this page has downloaded since it was opened. */
  session(): number
  /** Bytes downloaded today on this device (all tabs, as far as they have saved). */
  today(): number
  /** Be told when a number changed. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void
  /** Write what has been counted and not yet saved. */
  save(): void
  stop(): void
}
export interface MeterEnv {
  observe?: (onEntries: (entries: readonly { transferSize?: number }[]) => void) => (() => void) | void
  storage?: Writer
  now?: () => number
  /** Calls `save` when the page is hidden or going away. */
  onLeave?: (save: () => void) => (() => void) | void
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

/** Count entries as they arrive. A pure core with the browser's parts handed in, so it runs under node --test. */
export function createMeter(env: MeterEnv = {}): Meter {
  const now = env.now ?? Date.now, storage = env.storage
  const setTimer = env.setTimer ?? ((run, ms) => globalThis.setTimeout(run, ms)), clearTimer = env.clearTimer ?? ((handle) => globalThis.clearTimeout(handle as number))
  let session = 0, pending = 0, pendingAt = 0, saved = readToday(storage, now()), timer: unknown = null
  const listeners = new Set<() => void>()
  /** Today's bytes: what is stored for today, and what this tab has counted today and not yet saved. */
  function today(): number {
    const at = now(), day = dayKey(at)
    return (saved.day === day ? saved.bytes : readToday(storage, at).bytes) + (pending && dayKey(pendingAt) === day ? pending : 0)
  }
  function save(): void {
    if (timer !== null) { clearTimer(timer); timer = null }
    if (!pending) return
    saved = addToday(storage, pendingAt, pending); pending = 0
  }
  function add(entries: readonly { transferSize?: number }[]): void {
    let bytes = 0
    for (const entry of entries) bytes += costOf(entry)
    if (!bytes) return
    const at = now()
    // Midnight passed since the last count: what was counted before it is saved to its own day, and the new day starts from 0.
    if (pending && dayKey(pendingAt) !== dayKey(at)) save()
    if (!pending) pendingAt = at
    session += bytes; pending += bytes
    for (const listener of [...listeners]) listener()
    timer ??= setTimer(() => { timer = null; save() }, 5000)
  }
  const unobserve = env.observe?.(add), unleave = env.onLeave?.(save)
  return {
    session: () => session, today,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    save,
    stop() { save(); if (typeof unobserve === 'function') unobserve(); if (typeof unleave === 'function') unleave() },
  }
}

let shared: Meter | null = null
/** The page's meter, started on first use (the Settings row and the game's start both ask). */
export function startMeter(): Meter {
  if (shared) return shared
  const win = globalThis as typeof globalThis & { PerformanceObserver?: typeof PerformanceObserver; performance?: Performance; document?: Document }
  let storage: Storage | null = null
  try { storage = win.localStorage ?? null } catch { storage = null }
  shared = createMeter({
    storage,
    observe(onEntries) {
      const Observer = win.PerformanceObserver
      if (!Observer) return
      try { win.performance?.setResourceTimingBufferSize?.(BUFFER_SIZE) } catch { /* the default size */ }
      const observers: PerformanceObserver[] = []
      // The document itself ('navigation') and everything it fetched ('resource'); both include the entries recorded before this started.
      for (const type of ['navigation', 'resource']) {
        try { const observer = new Observer((list) => onEntries(list.getEntries() as unknown as { transferSize?: number }[])); observer.observe({ type, buffered: true }); observers.push(observer) } catch { /* this browser does not know the type */ }
      }
      return () => { for (const observer of observers) observer.disconnect() }
    },
    onLeave(save) {
      const doc = win.document
      const hide = (): void => { if (doc?.visibilityState === 'hidden') save() }
      doc?.addEventListener('visibilitychange', hide); win.addEventListener?.('pagehide', save)
      return () => { doc?.removeEventListener('visibilitychange', hide); win.removeEventListener?.('pagehide', save) }
    },
  })
  return shared
}
