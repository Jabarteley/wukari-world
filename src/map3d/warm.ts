/**
 * Work the map would otherwise do inside its first, single task, done ahead in short slices.
 * Every function here only fills a cache that the build reads (estate layouts are cached per pack),
 * so the map that results is the same one, built from the same numbers; it just appears after
 * a few short tasks instead of one long one.
 */
import { estateLayout, gridSteps } from './estates.ts';
import type { CityPack } from './types.ts';

/** Give the browser a turn: a frame can draw and input can be handled before the next slice. */
export const turn = (): Promise<void> => new Promise((resolve) => {
  // A message arrives as the next task without the 4 ms floor that nested timers get, and the browser still draws a frame that is due before it.
  if (typeof globalThis.MessageChannel !== 'function') { globalThis.setTimeout(resolve, 0); return; }
  const channel = new globalThis.MessageChannel();
  channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
  channel.port2.postMessage(null);
});

/**
 * Lay out every local government's estates (the build needs the first estate of each, and the map the rest), one local
 * government per slice. `alive` is asked before each slice so a map that was closed meanwhile stops the work.
 */
export async function warmEstates(pack: CityPack, alive: () => boolean = () => true, now: () => number = () => globalThis.performance.now(), pause: () => Promise<void> = turn): Promise<void> {
  let sliceStart = now();
  // The buildable-land grid first (every layout reads it), a few local governments' worth at a time.
  const grid = gridSteps(pack);
  for (;;) {
    if (!alive()) { grid.return(undefined as never); return; }
    if (grid.next().done) break;
    if (now() - sliceStart > 4) { await pause(); sliceStart = now(); }
  }
  for (const lga of pack.lgas || []) {
    if (!alive()) return;
    try { estateLayout(pack, lga.id); } catch { /* the build reports a land that cannot hold its estates, as before */ }
    // Several small local governments share a slice; a long one ends it.
    if (now() - sliceStart > 4) { await pause(); sliceStart = now(); }
  }
}
