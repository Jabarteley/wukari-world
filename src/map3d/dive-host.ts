/**
 * OWNER: world
 * Draws the dive (./dive.ts) over the page: a veil of clouds that thickens while the atlas camera flies down, hides the hand-off to
 * the city map or the city's scene, then parts over it. No WebGL: the clouds are painted once on a small 2D canvas (≤512 px, nothing
 * downloaded) and only moved with CSS transform and opacity. A Skip button, Escape or a tap anywhere on the veil jumps to the end.
 * Reduced motion: a plain veil fades in and out, no clouds and no flight.
 *
 * Fetched with the maps (src/app/scene/MapWorld.vue, which also brings ./dive-host.css, so this file stays testable in Node), never in the first download. The frame loop runs only while a dive does (at most
 * CAP_MS) and ends itself; a timer makes sure a dive the browser stopped drawing (a hidden tab) still ends and lets its waiters go.
 */
import { CAP_MS, REVEAL_MS, createDive } from './dive.ts';
import type { DiveOutcome } from './dive.ts';

export interface DiveHostOptions {
  /** Where the veil goes: the page (it must outlive the map boxes, which are hidden when the city's scene opens). */
  root: HTMLElement
  reduced?: () => boolean
  now?: () => number
  raf?: (run: () => void) => number
  caf?: (handle: number) => void
}
export interface DiveStart {
  /** The destination's chunks, fetched from the tap on: the hand-off waits for them (never longer than the hold). */
  prefetch?: Promise<unknown>
  /** Skip: the atlas lands at once. */
  onSkip?: () => void
}
export interface DiveRun {
  readonly cityId: string
  /** Seconds the atlas camera flies for (0 with reduced motion: it cuts). */
  readonly flightSeconds: number
  /** Seconds the clouds take to part over the destination: the city map can descend for as long. */
  readonly revealSeconds: number
  /** Resolves when what is underneath may be swapped: the clouds are opaque and the chunks are in, or the hold ran out, or the dive was skipped or ended. Never rejects. */
  readonly covered: Promise<void>
  /** Resolves when the veil is gone, with how the dive ended. */
  readonly done: Promise<DiveOutcome>
  /** What is underneath is ready (true) or the move was refused (false). */
  ready(ok: boolean): void
  skip(): void
}
export interface DiveHost {
  start(cityId: string, name: string, options?: DiveStart): DiveRun
  readonly current: DiveRun | null
  destroy(): void
}

const SIZE = 512;
/** Paint the clouds once: soft white puffs over a pale sky, opaque everywhere so that, at full cover, nothing shows through. */
function paintClouds(doc: Document): string | null {
  const canvas = doc.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const g = canvas.getContext?.('2d');
  if (!g || typeof canvas.toDataURL !== 'function') return null;
  const sky = g.createLinearGradient(0, 0, 0, SIZE);
  sky.addColorStop(0, '#dfe8ef'); sky.addColorStop(1, '#f4f6f8');
  g.fillStyle = sky; g.fillRect(0, 0, SIZE, SIZE);
  let seed = 7;
  const rand = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const x = rand() * SIZE, y = rand() * SIZE, r = 40 + rand() * 110, shade = 228 + Math.floor(rand() * 27);
    const puff = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    puff.addColorStop(0, `rgba(${shade},${shade},${Math.min(255, shade + 4)},0.9)`); puff.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = puff; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  try { return canvas.toDataURL('image/png'); } catch { return null; }
}

export function createDiveHost(options: DiveHostOptions): DiveHost {
  const { root } = options, doc = root.ownerDocument;
  const now = options.now ?? (() => globalThis.performance.now());
  const raf = options.raf ?? ((run) => globalThis.requestAnimationFrame(run)), caf = options.caf ?? ((handle) => globalThis.cancelAnimationFrame(handle));
  const reduced = (): boolean => options.reduced?.() ?? Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let veil: HTMLElement | null = null, left: HTMLElement | null = null, right: HTMLElement | null = null, words: HTMLElement | null = null, painted: string | null | undefined;
  let current: (DiveRun & { finish(outcome: DiveOutcome): void }) | null = null, frame = 0, guard: ReturnType<typeof setTimeout> | null = null, destroyed = false;

  function build(): HTMLElement {
    if (veil) return veil;
    veil = doc.createElement('div');
    veil.className = 'dv-veil'; veil.hidden = true;
    left = doc.createElement('div'); left.className = 'dv-cloud dv-left';
    right = doc.createElement('div'); right.className = 'dv-cloud dv-right';
    const skip = doc.createElement('button');
    skip.type = 'button'; skip.className = 'dv-skip'; skip.textContent = 'Skip';
    words = doc.createElement('div'); words.className = 'ui-sr'; words.setAttribute('role', 'status'); words.setAttribute('aria-live', 'polite');
    veil.append(left, right, skip, words);
    // A tap anywhere on the veil, or the button, skips.
    veil.addEventListener('pointerdown', (event) => { event.preventDefault(); current?.skip(); });
    skip.addEventListener('click', () => current?.skip());
    root.append(veil);
    return veil;
  }
  const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape' && current) { event.preventDefault(); current.skip(); } };
  function stop(): void { if (frame) caf(frame); frame = 0; if (guard) clearTimeout(guard); guard = null; }

  function start(cityId: string, name: string, { prefetch, onSkip }: DiveStart = {}): DiveRun {
    current?.skip();
    const quiet = reduced(), dive = createDive({ reduced: quiet }), box = build();
    if (!quiet && painted === undefined) painted = paintClouds(doc);
    const image = !quiet && painted ? `url("${painted}")` : '';
    for (const cloud of [left!, right!]) { cloud.style.backgroundImage = image; cloud.style.opacity = '0'; cloud.style.transform = ''; }
    box.classList.toggle('is-reduced', quiet); box.style.opacity = quiet ? '0' : '1'; box.hidden = false;
    words!.textContent = `Going down to ${name}`;
    doc.addEventListener('keydown', onKey);

    let release!: () => void, settle!: (outcome: DiveOutcome) => void, handed = false, over = false;
    const covered = new Promise<void>((done) => { release = done; });
    const done = new Promise<DiveOutcome>((resolve) => { settle = resolve; });
    const handOff = (): void => { if (!handed) { handed = true; release(); } };
    function paint(): void {
      const { cover, scale, phase } = dive.frame;
      // Reduced motion: the plain veil fades. Otherwise the veil itself is clear and the two layers of cloud (each opaque, each the whole screen) are the cover.
      if (quiet) { box.style.opacity = String(cover); return; }
      // The clouds part: the two halves drift apart and grow, as if the camera fell through them.
      const apart = phase === 'reveal' ? (scale - 1) * 34 : 0;
      left!.style.opacity = right!.style.opacity = String(cover);
      left!.style.transform = `translate3d(${-apart}%,0,0) scale(${scale})`;
      right!.style.transform = `translate3d(${apart}%,0,0) scale(${scale}) scaleX(-1)`;
    }
    const run = {
      cityId,
      flightSeconds: dive.flightMs / 1000,
      revealSeconds: quiet ? 0 : REVEAL_MS / 1000,
      covered, done,
      ready(ok: boolean) { if (!over) { dive.ready(ok, now()); step(); } },
      skip() {
        if (over) return;
        dive.skip(); onSkip?.(); run.finish('skipped');
      },
      finish(outcome: DiveOutcome) {
        if (over) return;
        over = true; handOff();
        if (current === run) { current = null; stop(); box.hidden = true; box.style.opacity = '0'; doc.removeEventListener('keydown', onKey); }
        settle(outcome);
      },
    };
    function step(): void {
      if (frame) caf(frame);
      frame = 0;
      if (over || destroyed) return;
      const going = dive.tick(now());
      paint();
      if (dive.frame.handoff) handOff();
      if (!going) { run.finish(dive.frame.outcome ?? 'arrived'); return; }
      frame = raf(step);
    }
    current = run;
    dive.start(now());
    if (prefetch) void prefetch.then(() => { if (!over) dive.loaded(now()); }, () => { if (!over) dive.loaded(now()); });
    else dive.loaded(now());
    // A browser that stops drawing (a hidden tab) still ends the dive, so nothing waits on it for ever.
    guard = setTimeout(() => { if (!over) { dive.skip(); run.finish('timeout'); } }, CAP_MS + 1000);
    step();
    return run;
  }
  return {
    start,
    get current() { return current; },
    destroy() { destroyed = true; current?.finish('skipped'); stop(); veil?.remove(); veil = null; doc.removeEventListener('keydown', onKey); },
  };
}
