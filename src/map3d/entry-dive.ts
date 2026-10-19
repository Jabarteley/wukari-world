/**
 * OWNER: world
 * The entry page's backdrop for a street or a visit (docs/ENTRY.md): the atlas behind the card, driven on a timer instead of a gesture,
 * from space to the country to the city, where the dive (./dive-host.ts: the clouds) takes the camera down and settles over the city.
 * The path is ./dive.ts entryDivePlan (pure); this file only carries it out with the atlas's own calls (goLevel, enterCity, lookAt).
 *
 * It never stands between the visitor and Play: it is fetched with the maps after the card has drawn (src/app/features/start/streetEntry.ts),
 * draws in its own box under the card (no pointer events, hidden from assistive technology, the dive's Skip hidden), and anything that goes
 * wrong (no WebGL, a level that does not load) leaves the entry page's own picture where it was. destroy() is synchronous and frees the
 * GL context; the entry page calls it when it goes. The atlas, the dive host and the timers are handed in (loadEntryDive brings the real
 * ones), so the driver is a plain test (./entry-dive.test.ts).
 */
import { ENTRY_FADE_MS, entryDivePlan, handoffSpan } from './dive.ts';
import type { DiveTier, EntryBackdrop, EntryStep } from './dive.ts';
import type { DiveHost, DiveRun } from './dive-host.ts';
import type { WorldMap, WorldMapOptions } from '../world-map.ts';

export interface EntryDiveTarget { city: string; name: string }
/** What of the atlas the backdrop drives. */
export type EntryAtlas = Pick<WorldMap, 'ready' | 'setCity' | 'resize' | 'goLevel' | 'enterCity' | 'lookAt' | 'destroy'>;
export interface EntryDiveOptions {
  /** The backdrop's own box (under the card). */
  box: HTMLElement
  target: EntryDiveTarget
  /** 'fade' or 'dive' (a 'still' backdrop never fetches this file). */
  backdrop: Exclude<EntryBackdrop, 'still'>
  tier?: DiveTier
  createMap: (container: HTMLElement, options: WorldMapOptions) => EntryAtlas
  dives: (root: HTMLElement) => Pick<DiveHost, 'start' | 'destroy'>
  /** The atlas level a city belongs to (its country's, or its continent's). */
  levelOf: (city: string) => number
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}
export interface EntryDive {
  /** Go down to another city (Find my street): the path starts again from space. */
  retarget(target: EntryDiveTarget): void
  destroy(): void
}

export function startEntryDive(options: EntryDiveOptions): EntryDive {
  const { box, backdrop } = options;
  const later = options.setTimer ?? ((run, ms) => setTimeout(run, ms)), cancel = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const plan = entryDivePlan(backdrop, options.tier);
  let target = options.target, timers: unknown[] = [], run: DiveRun | null = null, atlas: EntryAtlas | null = null, gone = false;
  const layer = box.ownerDocument.createElement('div');
  layer.className = 'en-dive';
  layer.style.transition = `opacity ${ENTRY_FADE_MS}ms ease`;
  box.append(layer);
  const dives = options.dives(layer);
  const clear = (): void => { for (const handle of timers) cancel(handle); timers = []; };

  function step({ go }: EntryStep): void {
    if (gone || !atlas) return;
    if (go === 'world') atlas.goLevel(0);
    else if (go === 'country') atlas.goLevel(options.levelOf(target.city));
    else if (go === 'settle') atlas.lookAt(target.city);
    else atlas.enterCity(target.city);
  }
  function play(): void {
    clear(); const going = run; run = null; going?.skip();
    atlas?.setCity(target.city);
    for (const each of plan) timers.push(later(() => { step(each); }, each.at));
  }
  try {
    atlas = options.createMap(layer, {
      reducedMotion: backdrop === 'fade',
      // The atlas's flight is the dive's: the clouds close over it and part over the city. Nothing waits underneath.
      dive: (_city, _own, land, reach) => {
        run = dives.start(target.city, target.name, { onSkip: land });
        return run.flightSeconds ? { seconds: run.flightSeconds, spanKm: handoffSpan(reach, null) } : 0;
      },
      // The flight has landed over the city: the clouds part on the atlas itself (there is no city map behind the entry page).
      onOpenCity: () => { run?.ready(true); },
    });
  } catch { atlas = null; }
  if (!atlas) { layer.remove(); dives.destroy(); return { retarget() {}, destroy() {} }; }
  const shown = atlas;
  shown.setCity(target.city);
  shown.resize();
  // Faded in once the first level is drawn; the path starts then. A level that never loads leaves the picture as it is.
  void shown.ready.then((ok) => { if (!ok || gone) return; shown.resize(); layer.classList.add('is-on'); play(); }, () => undefined);
  return {
    retarget(next) {
      const moved = next.city !== target.city;
      target = next;
      if (moved && !gone && layer.classList.contains('is-on')) play();
    },
    destroy() {
      if (gone) return;
      gone = true; clear(); dives.destroy(); atlas?.destroy(); atlas = null; layer.remove();
    },
  };
}

/** The real atlas, dive host and their styles, fetched with the maps; the world network must be in first (src/app/scene/mapLoaders.ts). */
export async function loadEntryDive(): Promise<(options: Omit<EntryDiveOptions, 'createMap' | 'dives' | 'levelOf'>) => EntryDive> {
  const [{ createWorldMap }, { createDiveHost }, { ATLAS_LEVELS, cityEntry, countryAtlasLevel }] = await Promise.all([import('../world-map.ts'), import('./dive-host.ts'), import('./regions.ts'), import('./dive-host.css')]);
  const levelOf = (city: string): number => { const id = countryAtlasLevel(cityEntry(city)?.country ?? ''); return Math.max(0, ATLAS_LEVELS.findIndex((level) => level.id === id)); };
  return (options) => startEntryDive({ ...options, createMap: createWorldMap, dives: (root) => createDiveHost({ root }), levelOf });
}
