/**
 * OWNER: world
 * The dive: the map-to-street zoom played when the player enters a city from the atlas. Pure: no Three.js, no DOM, no timers (the caller
 * passes the time), so every rule here is a plain unit test (./dive.test.ts). The host that draws it is ./dive-host.ts.
 *
 *   0 ─────────── FLIGHT_MS ── the atlas camera flies down to the city (descentView); the clouds thicken from COVER_FROM_MS
 *                 FLIGHT_MS ── the clouds are opaque: hand over underneath (the city map, or the city's scene) once its chunks are in
 *                   … hold ── at most HOLD_MS waiting for the destination; past that, the clouds clear at once on whatever is there
 *   reveal ──────────────────── the clouds part over the destination (REVEAL_MS, shortened so the whole dive stays within CAP_MS)
 *
 * About 4.6 s when nothing waits. Reduced motion: no flight and no clouds, a plain veil that fades in and out (REDUCED_MS each way).
 * Skip ends it at once on the final views; a refusal (the move was not allowed) clears the clouds quickly on the atlas.
 */

export const FLIGHT_MS = 1600, COVER_FROM_MS = 1000, REVEAL_MS = 3000, HOLD_MS = 2500, CAP_MS = 6000;
/** A dive that gave up waiting, or was refused, clears its clouds this fast: what is underneath is today's behaviour. */
export const FALLBACK_REVEAL_MS = 400;
/** Reduced motion: the veil fades in and out this fast, with no flight. */
export const REDUCED_MS = 100;
/** The total of an unhindered dive. */
export const DIVE_MS = FLIGHT_MS + REVEAL_MS;

export type DivePhase = 'idle' | 'flight' | 'hold' | 'reveal' | 'done';
export type DiveOutcome = 'arrived' | 'skipped' | 'timeout' | 'refused';
export interface DiveFrame {
  phase: DivePhase
  /** 0 to 1: how much the clouds (or, with reduced motion, the veil) hide. */
  cover: number
  /** 1 and up: the clouds' scale, growing as they part (the camera passing through them). */
  scale: number
  /** 0 to 1: how far along its path the atlas camera is. */
  flight: number
  /** True from the moment what is underneath may be swapped (the clouds are opaque and the destination's chunks are in, or the hold ran out). */
  handoff: boolean
  outcome: DiveOutcome | null
}
export interface Dive {
  readonly frame: DiveFrame
  readonly reduced: boolean
  /** Milliseconds the atlas camera flies for (0 with reduced motion). */
  readonly flightMs: number
  start(now: number): void
  /** The destination's chunks are in (or failed: the hand-off goes on, the destination shows its own loading). */
  loaded(now: number): void
  /** What is underneath is ready (true) or the move was refused (false). */
  ready(ok: boolean, now: number): void
  /** Jump to the final views: the clouds go at once and the hand-off happens now. */
  skip(): void
  /** Move to this time. Returns true while the dive is still going. */
  tick(now: number): boolean
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
export const smooth = (value: number): number => { const x = clamp01(value); return x * x * (3 - 2 * x); };

/** How much the clouds hide at `elapsed` ms into the flight: nothing until COVER_FROM_MS, opaque at the end of the flight. */
export function cloudCover(elapsed: number, reduced = false): number {
  if (reduced) return smooth(elapsed / REDUCED_MS);
  return smooth((elapsed - COVER_FROM_MS) / (FLIGHT_MS - COVER_FROM_MS));
}
/** How much the clouds still hide at `progress` (0 to 1) of the reveal: they thin fast at first, the last wisps linger. */
export function cloudReveal(progress: number): number {
  const p = clamp01(progress);
  return 1 - Math.sqrt(smooth(p));
}

export function createDive({ reduced = false }: { reduced?: boolean } = {}): Dive {
  const flightMs = reduced ? 0 : FLIGHT_MS;
  const frame: DiveFrame = { phase: 'idle', cover: 0, scale: 1, flight: 0, handoff: false, outcome: null };
  let began = 0, coveredAt = -1, revealAt = -1, revealMs = REVEAL_MS, isLoaded = false, answer: boolean | null = null;
  /** The veil fades in for REDUCED_MS before it counts as covering. */
  const coverMs = reduced ? REDUCED_MS : FLIGHT_MS;
  function reveal(now: number, outcome: DiveOutcome): void {
    if (frame.phase === 'reveal' || frame.phase === 'done') return;
    frame.phase = 'reveal'; frame.outcome = outcome; revealAt = now;
    // Never past CAP_MS in all; a fallback or a refusal is quick, and reduced motion is a short fade.
    revealMs = reduced ? REDUCED_MS : outcome === 'arrived' ? Math.max(FALLBACK_REVEAL_MS, Math.min(REVEAL_MS, CAP_MS - (now - began))) : FALLBACK_REVEAL_MS;
  }
  function end(outcome: DiveOutcome): void {
    Object.assign(frame, { phase: 'done', cover: 0, scale: 1, flight: 1, handoff: true });
    frame.outcome ??= outcome;
  }
  const api: Dive = {
    frame, reduced, flightMs,
    start(now) {
      Object.assign(frame, { phase: 'flight', cover: 0, scale: 1, flight: 0, handoff: false, outcome: null });
      began = now; coveredAt = -1; revealAt = -1; isLoaded = false; answer = null;
    },
    loaded(now) { isLoaded = true; api.tick(now); },
    ready(ok, now) {
      if (frame.phase === 'idle' || frame.phase === 'done') return;
      answer = ok;
      // A refusal clears the clouds at once, wherever the dive is: the player stays on the atlas.
      if (!ok) { frame.handoff = true; reveal(now, 'refused'); }
      api.tick(now);
    },
    skip() {
      if (frame.phase === 'idle' || frame.phase === 'done') return;
      frame.outcome = 'skipped'; end('skipped');
    },
    tick(now) {
      if (frame.phase === 'idle' || frame.phase === 'done') return false;
      const elapsed = now - began;
      frame.flight = flightMs ? smooth(elapsed / flightMs) : 1;
      if (frame.phase === 'flight') {
        frame.cover = cloudCover(elapsed, reduced);
        if (elapsed >= coverMs) { frame.phase = 'hold'; frame.cover = 1; coveredAt = began + coverMs; }
      }
      if (frame.phase === 'hold') {
        frame.cover = 1;
        const waited = now - coveredAt;
        if (isLoaded) frame.handoff = true;
        if (frame.handoff && answer === true) reveal(now, 'arrived');
        else if (waited >= HOLD_MS) { frame.handoff = true; reveal(now, 'timeout'); }
      }
      if (frame.phase === 'reveal') {
        const p = clamp01((now - revealAt) / revealMs), from = frame.outcome === 'refused' && coveredAt < 0 ? cloudCover(revealAt - began, reduced) : 1;
        frame.cover = from * cloudReveal(p);
        frame.scale = reduced ? 1 : 1 + 0.9 * smooth(p);
        if (p >= 1) { end(frame.outcome ?? 'arrived'); return false; }
      }
      return true;
    },
  };
  return api;
}

// ---- the camera path ------------------------------------------------------------------------------------------------------------
export interface DiveView { x: number; z: number; yaw: number; pitch: number; distance: number }
/** The most the camera pulls up on the way, as a share of the higher end of its path. */
export const MAX_LIFT = 1.6;
/**
 * Where the atlas camera is at `k` (0 to 1) of its dive from `from` to `to`. A van Wijk-like zoom-and-pan, simplified: the camera travels
 * over the ground first and drops after (so the city comes to the middle before it grows), pulls up a little when the ground it has to
 * cross is wide for its height, and tilts to the destination's pitch as it drops. Distances are interpolated in log space.
 * Properties (./dive.test.ts): it starts at `from` and ends exactly at `to`; the ground still to cover never grows; it is never closer than
 * `to.distance`; it never rises above MAX_LIFT times the higher end.
 */
export function descentView(from: DiveView, to: DiveView, k: number): DiveView {
  const t = clamp01(k);
  if (t >= 1) return { ...to };
  const travel = smooth(t / 0.7), drop = smooth((t - 0.15) / 0.85);
  const across = Math.hypot(to.x - from.x, to.z - from.z), high = Math.max(from.distance, to.distance);
  // Pull up only when the ground to cross is wider than the view is high, and at most MAX_LIFT.
  const lift = Math.min(Math.log(MAX_LIFT), Math.max(0, Math.log(across / high)) * 0.5);
  const arc = Math.sin(Math.PI * clamp01(t / 0.7));
  const logD = Math.log(from.distance) + (Math.log(to.distance) - Math.log(from.distance)) * drop + lift * arc * (1 - drop);
  let turn = (to.yaw - from.yaw) % (Math.PI * 2);
  if (turn > Math.PI) turn -= Math.PI * 2; else if (turn < -Math.PI) turn += Math.PI * 2;
  return {
    x: from.x + (to.x - from.x) * travel,
    z: from.z + (to.z - from.z) * travel,
    yaw: from.yaw + turn * drop,
    pitch: from.pitch + (to.pitch - from.pitch) * drop,
    distance: Math.max(Math.min(from.distance, to.distance), Math.exp(logD)),
  };
}
