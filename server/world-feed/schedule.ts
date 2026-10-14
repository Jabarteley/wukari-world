/**
 * OWNER: world
 * WHEN EACH CITY'S WEATHER IS ASKED FOR (docs/WORLD-FEED.md). Pure: the service passes in what it knows.
 *
 * A city with someone in it in the last day is asked for every hour; any other city every three hours. The service's own `Expires`
 * is never undercut. A city that failed waits longer each time. At most `cap` cities are asked for on one beat, the longest overdue
 * first, so 284 cities never go out in one burst: the work spreads over the beats like a queue.
 */
export const BUSY_EVERY_MS = 3600000;
export const QUIET_EVERY_MS = 3 * 3600000;
/** A city counts as busy for this long after someone was last in it. */
export const BUSY_WINDOW_MS = 86400000;
/** The cities asked for on a beat that follows the last one closely (the Node host: every ten seconds). */
export const CAP_FAST = 3;
/** ... and on a beat that follows a long pause (the Worker's alarm with nobody connected: every five minutes). */
export const CAP_SLOW = 12;
/** A gap this long since the last beat counts as a slow beat. */
export const SLOW_GAP_MS = 60000;
/** Two beats closer than this are one: the second does nothing. */
export const MIN_GAP_MS = 8000;

/** What is known of a city's last answer. */
export interface Asked { /** When it was fetched (ms). */ at: number; /** The service's `Expires`, or 0. */ expires: number }

export const everyMs = (busy: boolean): number => (busy ? BUSY_EVERY_MS : QUIET_EVERY_MS);
/** The earliest time the city may be asked again; 0 for one never asked. */
export const dueAt = (last: Asked | undefined, busy: boolean): number => (last ? Math.max(last.expires, last.at + everyMs(busy)) : 0);
/** How long to wait after the `fails`-th failure in a row (1, 2, ...): ten minutes, doubling, at most an hour. */
export const backoffMs = (fails: number): number => Math.min(3600000, 600000 * 2 ** Math.max(0, fails - 1));
export const capFor = (gapMs: number): number => (gapMs >= SLOW_GAP_MS ? CAP_SLOW : CAP_FAST);

export interface DueInput {
  ids: readonly string[]
  last: ReadonlyMap<string, Asked>
  /** When someone was last in each city. */
  seen: ReadonlyMap<string, number>
  /** Earliest next try of a city that failed. */
  retry: ReadonlyMap<string, number>
  now: number
  cap: number
}
/** The cities to ask for now: due, longest overdue first (a busy city before a quiet one that is as overdue), at most `cap`. */
export function dueCities({ ids, last, seen, retry, now, cap }: DueInput): string[] {
  const due: [id: string, at: number, busy: boolean][] = [];
  for (const id of ids) {
    const busy = now - (seen.get(id) ?? -Infinity) < BUSY_WINDOW_MS;
    const at = Math.max(dueAt(last.get(id), busy), retry.get(id) ?? 0);
    if (at <= now) due.push([id, at, busy]);
  }
  due.sort((a, b) => a[1] - b[1] || Number(b[2]) - Number(a[2]) || (a[0] < b[0] ? -1 : 1));
  return due.slice(0, cap).map(([id]) => id);
}
