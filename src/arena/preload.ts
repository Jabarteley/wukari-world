/**
 * OWNER: games (real-time)
 * WARMING A GAME AHEAD OF TIME: the Games hub calls `warmFight()`, `warmRace()` and `warmFootball()` when it opens and again when the browser is idle,
 * so the game screen's 3D pieces (its chunk, three.js and its GLBs) are already fetched and parsed when the player taps Fight, Race or Football.
 * Nothing here is in the first download: the hub is a lazy chunk (the player has pressed Play to get to it) and the import below is
 * dynamic. A Save-Data connection or a 2G / slow-2G one is left alone: there the game screen fetches on demand, drawing 2D first.
 */
export interface Link { saveData?: boolean; effectiveType?: string }

/** Whether the connection allows fetching ahead of need, pure. An unknown connection (no Network Information API) is allowed. */
export const mayWarm = (link: Link | null | undefined): boolean => !link || (!link.saveData && link.effectiveType !== '2g' && link.effectiveType !== 'slow-2g')

let started: Promise<unknown> | null = null
/** Fetch the Fight 3D view and its models once a visit. Resolves quietly; never throws. */
export function warmFight(link: Link | null | undefined = (globalThis.navigator as { connection?: Link } | undefined)?.connection): Promise<unknown> {
  if (!mayWarm(link)) return Promise.resolve()
  started ??= import('./fight-3d.ts').then((m) => m.preloadFight()).catch(() => { started = null })
  return started
}

let startedRace: Promise<unknown> | null = null
/** Fetch the Race 3D view and its models once a visit, the same way (never on Save-Data or 2G; resolves quietly). */
export function warmRace(link: Link | null | undefined = (globalThis.navigator as { connection?: Link } | undefined)?.connection): Promise<unknown> {
  if (!mayWarm(link)) return Promise.resolve()
  startedRace ??= import('./race-3d.ts').then((m) => m.preloadRace()).catch(() => { startedRace = null })
  return startedRace
}

let startedFootball: Promise<unknown> | null = null
/** Fetch the Football 3D view and its models once a visit, on the same terms as warmFight. Resolves quietly; never throws. */
export function warmFootball(link: Link | null | undefined = (globalThis.navigator as { connection?: Link } | undefined)?.connection): Promise<unknown> {
  if (!mayWarm(link)) return Promise.resolve()
  startedFootball ??= import('./football-3d.ts').then((m) => m.preloadFootball()).catch(() => { startedFootball = null })
  return startedFootball
}

type Idle = (run: () => void, options?: { timeout: number }) => unknown
/** Run `job` when the browser is idle (requestIdleCallback), or after a short wait where there is none. */
export function whenIdle(job: () => void, ric: Idle | undefined = (globalThis as { requestIdleCallback?: Idle }).requestIdleCallback?.bind(globalThis), wait: (run: () => void, ms: number) => unknown = setTimeout): void {
  if (ric) ric(job, { timeout: 4000 }); else wait(job, 1500)
}
