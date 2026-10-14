/**
 * OWNER: world
 * Draws the dive (./dive.ts) over the page: a veil of clouds that thickens while the atlas camera flies down, hides the hand-off to
 * the city map or the city's scene, then parts over it. No WebGL: the clouds are painted once on a small 2D canvas (≤512 px, nothing
 * downloaded) and only moved with CSS transform and opacity. A Skip button, Escape or a tap anywhere on the veil jumps to the end.
 * Reduced motion, save-data and a weak device (dive.ts diveTier): a plain veil fades in and out, no clouds and no flight; a mid-range device
 * gets a shorter dive. The first PROBE_MS of frames are timed, and slow ones bail out at once to today's cross-fade (outcome 'slow'), as
 * Skip does. A hard timeout at CAP_MS ends any dive that is still going, the same way. While the clouds part a thin haze lingers over the
 * city (dive.ts hazeAt), and the map's own labels and buttons stay hidden until the dive is over (the `dv-diving` class on the root).
 *
 * Fetched with the maps (src/app/scene/MapWorld.vue, which also brings ./dive-host.css, so this file stays testable in Node), never in the first download. The frame loop runs only while a dive does (at most
 * CAP_MS) and ends itself; a timer makes sure a dive the browser stopped drawing (a hidden tab) still ends and lets its waiters go.
 */
import { CAP_MS, createDive, createFrameProbe, createFrameWatch, diveTier } from './dive.ts';
import type { DeviceHints, DiveKind, DiveOutcome, DiveTier } from './dive.ts';

export interface DiveHostOptions {
  /** Where the veil goes: the page (it must outlive the map boxes, which are hidden when the city's scene opens). */
  root: HTMLElement
  reduced?: () => boolean
  now?: () => number
  raf?: (run: () => void) => number
  caf?: (handle: number) => void
  /** What the device says of itself (cores, memory, save-data); read from navigator by default. */
  device?: () => DeviceHints
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}
/** What the browser says of the device: navigator.hardwareConcurrency, navigator.deviceMemory and the connection's save-data. */
export function deviceHints(nav: unknown = globalThis.navigator): DeviceHints {
  const n = (nav ?? {}) as { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } };
  return { cores: n.hardwareConcurrency, memory: n.deviceMemory, saveData: n.connection?.saveData === true };
}
export interface DiveStart {
  /** The destination's chunks, fetched from the tap on: the hand-off waits for them (never longer than the hold). */
  prefetch?: Promise<unknown>
  /** Skip (also a bail-out on slow frames, and the hard timeout): the atlas lands at once. */
  onSkip?: () => void
  /** 'arrival': no atlas flight, the clouds close over whatever is on screen (a trip that ends in a new city). */
  kind?: DiveKind
}
export interface DiveRun {
  readonly cityId: string
  readonly tier: DiveTier
  /** Seconds the atlas camera flies for (0 with reduced motion: it cuts). */
  readonly flightSeconds: number
  /** Seconds the clouds will take to part over the destination if they start now (0 for the plain veil): the city map can come down for as long. */
  readonly revealSeconds: number
  /** True while the dive is still going. */
  readonly live: boolean
  /** How it ended, or is ending (null while it is still on its way: the clouds are closing or holding). */
  readonly outcome: DiveOutcome | null
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
  /** What a dive started now would be on this device (reduced motion, save-data, cores, memory). */
  tier(): DiveTier
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
  const device = options.device ?? (() => deviceHints());
  const later = options.setTimer ?? ((run, ms) => setTimeout(run, ms)), cancel = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let veil: HTMLElement | null = null, haze: HTMLElement | null = null, left: HTMLElement | null = null, right: HTMLElement | null = null, words: HTMLElement | null = null, painted: string | null | undefined;
  let current: (DiveRun & { finish(outcome: DiveOutcome): void }) | null = null, frame = 0, guard: unknown = null, destroyed = false;

  function build(): HTMLElement {
    if (veil) return veil;
    veil = doc.createElement('div');
    veil.className = 'dv-veil'; veil.hidden = true;
    haze = doc.createElement('div'); haze.className = 'dv-haze';
    left = doc.createElement('div'); left.className = 'dv-cloud dv-left';
    right = doc.createElement('div'); right.className = 'dv-cloud dv-right';
    const skip = doc.createElement('button');
    skip.type = 'button'; skip.className = 'dv-skip'; skip.textContent = 'Skip';
    words = doc.createElement('div'); words.className = 'ui-sr'; words.setAttribute('role', 'status'); words.setAttribute('aria-live', 'polite');
    veil.append(haze, left, right, skip, words);
    // A tap anywhere on the veil, or the button, skips.
    veil.addEventListener('pointerdown', (event) => { event.preventDefault(); current?.skip(); });
    skip.addEventListener('click', () => current?.skip());
    root.append(veil);
    return veil;
  }
  const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape' && current) { event.preventDefault(); current.skip(); } };
  function stop(): void { if (frame) caf(frame); frame = 0; if (guard) cancel(guard); guard = null; }

  function start(cityId: string, name: string, { prefetch, onSkip, kind = 'atlas' }: DiveStart = {}): DiveRun {
    current?.skip();
    const tier = diveTier({ ...device(), reduced: reduced() }), quiet = tier === 'cut', dive = createDive({ tier, kind }), box = build(), probe = createFrameProbe(), watch = createFrameWatch();
    if (!quiet && painted === undefined) painted = paintClouds(doc);
    const image = !quiet && painted ? `url("${painted}")` : '';
    for (const cloud of [left!, right!]) { cloud.style.backgroundImage = image; cloud.style.opacity = '0'; cloud.style.transform = ''; }
    haze!.style.opacity = '0'; haze!.style.backgroundImage = image;
    box.classList.toggle('is-reduced', quiet); box.style.opacity = quiet ? '0' : '1'; box.hidden = false;
    root.classList?.add('dv-diving');
    words!.textContent = `Going down to ${name}`;
    doc.addEventListener('keydown', onKey);

    let release!: () => void, settle!: (outcome: DiveOutcome) => void, handed = false, over = false;
    const covered = new Promise<void>((done) => { release = done; });
    const done = new Promise<DiveOutcome>((resolve) => { settle = resolve; });
    const handOff = (): void => { if (!handed) { handed = true; release(); } };
    function paint(): void {
      const { cover, scale, phase, haze: thin } = dive.frame;
      // Reduced motion: the plain veil fades. Otherwise the veil itself is clear and the two layers of cloud (each opaque, each the whole screen) are the cover.
      if (quiet) { box.style.opacity = String(cover); return; }
      // The clouds part: the two halves drift apart and grow, as if the camera fell through them.
      const apart = phase === 'reveal' ? (scale - 1) * 34 : 0;
      left!.style.opacity = right!.style.opacity = String(cover);
      haze!.style.opacity = String(thin);
      left!.style.transform = `translate3d(${-apart}%,0,0) scale(${scale})`;
      right!.style.transform = `translate3d(${apart}%,0,0) scale(${scale}) scaleX(-1)`;
    }
    const run: DiveRun & { finish(outcome: DiveOutcome): void; bail(outcome: DiveOutcome): void } = {
      cityId, tier,
      flightSeconds: dive.flightMs / 1000,
      get revealSeconds() { return quiet ? 0 : dive.revealMsAt(now()) / 1000; },
      get live() { return !over; },
      get outcome() { return dive.frame.outcome; },
      covered, done,
      ready(ok: boolean) { if (!over) { dive.ready(ok, now()); step(); } },
      skip() {
        if (over) return;
        dive.skip(); onSkip?.(); run.finish('skipped');
      },
      /** Slow frames, or the hard timeout: end as Skip does, saying why. */
      bail(outcome: DiveOutcome) {
        if (over) return;
        dive.bail(); onSkip?.(); run.finish(outcome);
      },
      finish(outcome: DiveOutcome) {
        if (over) return;
        over = true; handOff();
        if (current === run) { current = null; stop(); box.hidden = true; box.style.opacity = '0'; root.classList?.remove('dv-diving'); doc.removeEventListener('keydown', onKey); }
        settle(outcome);
      },
    };
    function step(): void {
      if (frame) caf(frame);
      frame = 0;
      if (over || destroyed) return;
      const at = now();
      // The first frames are timed: a device that cannot draw them smoothly gets today's cross-fade instead (the plain veil has nothing to judge).
      // Then the whole dive is watched: a mean far over the budget for a second (the longest gaps set aside) ends it too.
      if (!quiet) { const first = probe.frame(at); if (first === 'slow' || (first === 'ok' && watch.frame(at) === 'slow')) { run.bail('slow'); return; } }
      const going = dive.tick(at);
      paint();
      if (dive.frame.handoff) handOff();
      if (!going) { run.finish(dive.frame.outcome ?? 'arrived'); return; }
      frame = raf(step);
    }
    current = run;
    dive.start(now());
    if (prefetch) void prefetch.then(() => { if (!over) dive.loaded(now()); }, () => { if (!over) dive.loaded(now()); });
    else dive.loaded(now());
    // The hard timeout: whatever happened (a browser that stopped drawing, a hand-off that never came), the dive is over by CAP_MS and
    // the player is on today's behaviour. Nothing waits on it for ever.
    guard = later(() => { run.bail('timeout'); }, CAP_MS);
    step();
    return run;
  }
  return {
    start,
    tier: () => diveTier({ ...device(), reduced: reduced() }),
    get current() { return current; },
    destroy() { destroyed = true; current?.finish('skipped'); stop(); veil?.remove(); veil = null; doc.removeEventListener('keydown', onKey); },
  };
}
