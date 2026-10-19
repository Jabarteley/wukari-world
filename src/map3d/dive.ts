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
 * About 4.6 s when nothing waits, planned to end by END_BY_MS; the host's hard timeout is CAP_MS. Reduced motion: no flight and no
 * clouds, a plain veil that fades in and out (REDUCED_MS each way). Skip ends it at once on the final views; a refusal (the move was not
 * allowed) clears the clouds quickly on the atlas.
 *
 * Also here, as plain functions: the device tier (diveTier: save-data and weak devices get the plain veil, mid-range ones a shorter
 * dive), the first-frames probe (createFrameProbe: slow frames bail out to today's cross-fade), the arrival variant (kind 'arrival': a
 * trip that ends in a new city, no flight), the scale match across the hand-off (spanKm, handoffSpan: the city map starts at the ground
 * width the atlas ended on), the city map's own path (swoopPlan/swoopView: straight down over the towers, then a swoop at the
 * destination) and the haze left over the city as the clouds part (hazeAt). And the entry page's backdrop (entryBackdrop, entryDivePlan):
 * the same dive on a timer instead of a gesture, from space to the country to the city, driven by ./entry-dive.ts.
 */

export const FLIGHT_MS = 1600, COVER_FROM_MS = 1000, REVEAL_MS = 3000, HOLD_MS = 2500, CAP_MS = 6000;
/** A dive that gave up waiting, or was refused, clears its clouds this fast: what is underneath is today's behaviour. */
export const FALLBACK_REVEAL_MS = 400;
/** Reduced motion: the veil fades in and out this fast, with no flight. */
export const REDUCED_MS = 100;
/** The total of an unhindered dive. */
export const DIVE_MS = FLIGHT_MS + REVEAL_MS;
/** A dive plans to be over this long before CAP_MS, so the host's hard timeout at CAP_MS only ever catches a dive that stalled. */
export const END_BY_MS = CAP_MS - 250;
/** An arrival (a trip that ends in a new city) has no atlas flight: the clouds close over the screen this fast. */
export const QUICK_COVER_MS = 500;
/** A mid-range device plays the same dive this much shorter. */
export const LITE = 0.6;

export type DivePhase = 'idle' | 'flight' | 'hold' | 'reveal' | 'done';
/** `slow`: the first frames were slow and the dive bailed out to today's cross-fade. */
export type DiveOutcome = 'arrived' | 'skipped' | 'timeout' | 'refused' | 'slow';
/** full: the whole dive; lite: a shorter one (a mid-range device); cut: no flight, a plain veil (reduced motion, save-data, a weak device). */
export type DiveTier = 'full' | 'lite' | 'cut';
/** atlas: entered from the atlas, after its flight; arrival: a trip ended in a new city, the clouds close over whatever is on screen. */
export type DiveKind = 'atlas' | 'arrival';
export interface DeviceHints { reduced?: boolean; cores?: number; memory?: number; saveData?: boolean }
/**
 * How much of the dive this device gets. Reduced motion and save-data cut it; so do 2 cores or less, or under 2 GB (navigator.deviceMemory
 * rounds, so 1 or 0.5). Up to 4 cores or 2 GB plays the lite dive. A browser that says nothing gets the full dive: the frame probe
 * (createFrameProbe) is what catches a slow device that does not say so.
 */
export function diveTier({ reduced = false, cores, memory, saveData = false }: DeviceHints = {}): DiveTier {
  if (reduced || saveData) return 'cut';
  const known = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if ((known(cores) && cores <= 2) || (known(memory) && memory < 2)) return 'cut';
  if ((known(cores) && cores <= 4) || (known(memory) && memory <= 2)) return 'lite';
  return 'full';
}
export interface DiveTimings {
  /** How long the atlas camera flies (0: it cuts). */
  flightMs: number
  /** When the clouds start to close, and when they are opaque. */
  coverFromMs: number
  coverMs: number
  /** How long the clouds take to part over the destination (the city map comes down meanwhile). */
  revealMs: number
  /** A plain veil, no clouds and no movement (reduced motion and the like). */
  plain: boolean
}
export function diveTimings(tier: DiveTier = 'full', kind: DiveKind = 'atlas'): DiveTimings {
  if (tier === 'cut') return { flightMs: 0, coverFromMs: 0, coverMs: REDUCED_MS, revealMs: REDUCED_MS, plain: true };
  const k = tier === 'lite' ? LITE : 1, round = (ms: number): number => Math.round(ms * k);
  if (kind === 'arrival') return { flightMs: 0, coverFromMs: 0, coverMs: round(QUICK_COVER_MS), revealMs: round(REVEAL_MS), plain: false };
  return { flightMs: round(FLIGHT_MS), coverFromMs: round(COVER_FROM_MS), coverMs: round(FLIGHT_MS), revealMs: round(REVEAL_MS), plain: false };
}

export interface DiveFrame {
  phase: DivePhase
  /** 0 to 1: how much the clouds (or, with reduced motion, the veil) hide. */
  cover: number
  /** 1 and up: the clouds' scale, growing as they part (the camera passing through them). */
  scale: number
  /** 0 to 1: how far along its path the atlas camera is. */
  flight: number
  /** 0 to HAZE_MAX: the thin haze left over the city once the clouds have parted (it lifts as the camera comes down). */
  haze: number
  /** True from the moment what is underneath may be swapped (the clouds are opaque and the destination's chunks are in, or the hold ran out). */
  handoff: boolean
  outcome: DiveOutcome | null
}
export interface Dive {
  readonly frame: DiveFrame
  readonly reduced: boolean
  readonly tier: DiveTier
  readonly timings: DiveTimings
  /** Milliseconds the atlas camera flies for (0 with reduced motion). */
  readonly flightMs: number
  /** How long the reveal takes (or would, if it began at `now`): shortened so that the whole dive ends by END_BY_MS. */
  revealMsAt(now: number): number
  start(now: number): void
  /** The destination's chunks are in (or failed: the hand-off goes on, the destination shows its own loading). */
  loaded(now: number): void
  /** What is underneath is ready (true) or the move was refused (false). */
  ready(ok: boolean, now: number): void
  /** Jump to the final views: the clouds go at once and the hand-off happens now. */
  skip(): void
  /** The first frames were slow: end at once like skip, and say so (the callers fall back to today's cross-fade). */
  bail(): void
  /** Move to this time. Returns true while the dive is still going. */
  tick(now: number): boolean
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
export const smooth = (value: number): number => { const x = clamp01(value); return x * x * (3 - 2 * x); };

/** How much the clouds hide at `elapsed` ms into the flight: nothing until COVER_FROM_MS, opaque at the end of the flight. */
export function cloudCover(elapsed: number, reduced = false, timings: DiveTimings = diveTimings(reduced ? 'cut' : 'full')): number {
  if (timings.plain || timings.coverFromMs <= 0) return smooth(elapsed / timings.coverMs);
  return smooth((elapsed - timings.coverFromMs) / (timings.coverMs - timings.coverFromMs));
}
/** How much the clouds still hide at `progress` (0 to 1) of the reveal: they thin fast at first, the last wisps linger. */
export function cloudReveal(progress: number): number {
  const p = clamp01(progress);
  return 1 - Math.sqrt(smooth(p));
}
/** The haze's strength over the city while the clouds part: full to begin with, lifted between 40% and 70% of the reveal (as the swoop starts). */
export const HAZE_MAX = 0.5;
export function hazeAt(progress: number): number { return HAZE_MAX * (1 - smooth((clamp01(progress) - 0.4) / 0.3)); }

export function createDive({ reduced = false, tier: asked, kind = 'atlas' }: { reduced?: boolean; tier?: DiveTier; kind?: DiveKind } = {}): Dive {
  const tier: DiveTier = reduced ? 'cut' : asked ?? 'full', timings = diveTimings(tier, kind), plain = timings.plain;
  const flightMs = timings.flightMs;
  const frame: DiveFrame = { phase: 'idle', cover: 0, scale: 1, flight: 0, haze: 0, handoff: false, outcome: null };
  let began = 0, coveredAt = -1, revealAt = -1, revealMs = timings.revealMs, isLoaded = false, answer: boolean | null = null;
  /** The veil (or the clouds) cover fully this long after the start. */
  const coverMs = timings.coverMs;
  const revealMsAt = (now: number): number => plain ? timings.revealMs : Math.max(FALLBACK_REVEAL_MS, Math.min(timings.revealMs, END_BY_MS - (now - began)));
  function reveal(now: number, outcome: DiveOutcome): void {
    if (frame.phase === 'reveal' || frame.phase === 'done') return;
    frame.phase = 'reveal'; frame.outcome = outcome; revealAt = now;
    // Never past END_BY_MS in all; a fallback or a refusal is quick, and reduced motion is a short fade.
    revealMs = outcome === 'arrived' ? revealMsAt(now) : plain ? timings.revealMs : FALLBACK_REVEAL_MS;
  }
  function end(outcome: DiveOutcome): void {
    Object.assign(frame, { phase: 'done', cover: 0, scale: 1, flight: 1, haze: 0, handoff: true });
    frame.outcome ??= outcome;
  }
  function stop(outcome: DiveOutcome): void {
    if (frame.phase === 'idle' || frame.phase === 'done') return;
    frame.outcome = outcome; end(outcome);
  }
  const api: Dive = {
    frame, reduced: plain, tier, timings, flightMs,
    revealMsAt: (now) => (frame.phase === 'reveal' || frame.phase === 'done' ? revealMs : revealMsAt(now)),
    start(now) {
      Object.assign(frame, { phase: 'flight', cover: 0, scale: 1, flight: 0, haze: 0, handoff: false, outcome: null });
      began = now; coveredAt = -1; revealAt = -1; revealMs = timings.revealMs; isLoaded = false; answer = null;
    },
    loaded(now) { isLoaded = true; api.tick(now); },
    ready(ok, now) {
      if (frame.phase === 'idle' || frame.phase === 'done') return;
      answer = ok;
      // A refusal clears the clouds at once, wherever the dive is: the player stays on the atlas.
      if (!ok) { frame.handoff = true; reveal(now, 'refused'); }
      api.tick(now);
    },
    skip() { stop('skipped'); },
    bail() { stop('slow'); },
    tick(now) {
      if (frame.phase === 'idle' || frame.phase === 'done') return false;
      const elapsed = now - began;
      frame.flight = flightMs ? smooth(elapsed / flightMs) : 1;
      if (frame.phase === 'flight') {
        frame.cover = cloudCover(elapsed, plain, timings);
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
        const p = clamp01((now - revealAt) / revealMs), from = frame.outcome === 'refused' && coveredAt < 0 ? cloudCover(revealAt - began, plain, timings) : 1;
        frame.cover = from * cloudReveal(p);
        frame.scale = plain ? 1 : 1 + 0.9 * smooth(p);
        frame.haze = plain || frame.outcome !== 'arrived' ? 0 : hazeAt(p);
        if (p >= 1) { end(frame.outcome ?? 'arrived'); return false; }
      }
      return true;
    },
  };
  return api;
}

// ---- a trip that ends in a new city ---------------------------------------------------------------------------------------------
export interface ArrivalCheck {
  /** The new city came at the end of a trip between cities (not a first load, a sign-in or another device). */
  fromTrip: boolean
  tier: DiveTier
  /** The page is hidden: nobody would see it. */
  hidden: boolean
  /** The player is in the middle of something: a timed action, or a panel or the phone open over the scene. */
  busy: boolean
  /** What is on screen: the map (a trip is watched there) or the venue. */
  mode: string
}
/** Whether a trip's arrival in a new city plays the aerial dive (clouds, the new city from above, a swoop at the venue) before the venue. */
export function arrivalDive({ fromTrip, tier, hidden, busy, mode }: ArrivalCheck): boolean {
  return fromTrip && tier !== 'cut' && !hidden && !busy && (mode === 'map' || mode === 'venue');
}

// ---- the first frames: a device too slow for the dive --------------------------------------------------------------------------
/** The first PROBE_MS of frames are timed; a mean gap over SLOW_FRAME_MS (under about 24 frames a second), or one gap over STALL_MS, is slow. */
export const PROBE_MS = 400, SLOW_FRAME_MS = 42, STALL_MS = 300;
export type ProbeVerdict = 'wait' | 'ok' | 'slow';
export interface FrameProbe { readonly verdict: ProbeVerdict; frame(now: number): ProbeVerdict }
/** Judge the first frames. The first gap is not held against a stall (it carries the work of starting); every gap counts for the mean. */
export function createFrameProbe(): FrameProbe {
  let first = -1, last = -1, sum = 0, count = 0, verdict: ProbeVerdict = 'wait';
  return {
    get verdict() { return verdict; },
    frame(now) {
      if (verdict !== 'wait') return verdict;
      if (first < 0) { first = last = now; return verdict; }
      const gap = now - last;
      last = now; sum += gap; count += 1;
      if (count > 1 && gap > STALL_MS) verdict = 'slow';
      else if (now - first >= PROBE_MS) verdict = sum / count > SLOW_FRAME_MS ? 'slow' : 'ok';
      return verdict;
    },
  };
}

/**
 * After the probe has passed, the dive goes on being timed: the probe looks at the first 400 ms only, and a phone that starts well but drops
 * to a few frames a second under the load of the flight (measured with software GL, 4x throttle) would play the whole dive at 5 to 15 fps.
 * Over the last WATCH_FRAMES gaps, the WATCH_DROP largest are set aside (the city map mounting under the clouds is one or two long frames, not
 * a slow device); a mean of the rest over SLOW_FRAME_MS is slow, and the dive ends as Skip does. Needs a full window, so a short dive of a
 * few frames is never judged by it.
 */
export const WATCH_FRAMES = 30, WATCH_DROP = 2;
export interface FrameWatch { readonly verdict: 'ok' | 'slow'; frame(now: number): 'ok' | 'slow' }
export function createFrameWatch(): FrameWatch {
  let last = -1, verdict: 'ok' | 'slow' = 'ok';
  const gaps: number[] = [];
  return {
    get verdict() { return verdict; },
    frame(now) {
      if (verdict === 'slow') return verdict;
      if (last >= 0 && now > last) {
        gaps.push(now - last);
        if (gaps.length > WATCH_FRAMES) gaps.shift();
        if (gaps.length === WATCH_FRAMES) {
          const kept = [...gaps].sort((a, b) => a - b).slice(0, WATCH_FRAMES - WATCH_DROP);
          if (kept.reduce((sum, gap) => sum + gap, 0) / kept.length > SLOW_FRAME_MS) verdict = 'slow';
        }
      }
      last = now;
      return verdict;
    },
  };
}

// ---- matching the scale across the hand-off -------------------------------------------------------------------------------------
/** The city map draws a fixed 10 units to the kilometre (./estates.ts). */
export const CITY_KM_PER_UNIT = 0.1;
/** The cameras' vertical fields of view, degrees: the atlas (./geo/atlas.ts) and the city map (./map3d.ts). */
export const ATLAS_FOV = 30, CITY_FOV = 34;
/** Where nothing says how wide the city map can be: hand over at about the width of a metropolitan area. */
export const HANDOFF_KM = 40;
/** The ground a camera `distance` away sees from top to bottom of the screen, in km (straight down; the screen's shape is the same for both maps). */
export const spanKm = (distance: number, fovDeg: number, kmPerUnit: number): number => 2 * distance * Math.tan((fovDeg * Math.PI) / 360) * kmPerUnit;
/** The camera distance that sees `km` of ground from top to bottom: the inverse of spanKm. */
export const distanceForSpan = (km: number, fovDeg: number, kmPerUnit: number): number => km / (2 * Math.tan((fovDeg * Math.PI) / 360) * kmPerUnit);
/**
 * Kilometres per unit of the atlas sheet east to west at a latitude: the ground *width* is what is matched. (Equal Earth keeps areas, not
 * shapes: towards the poles a unit is fewer km across and more km up and down, so the width is the measure a top-down view keeps.)
 */
export function atlasKmPerUnit(lat: number, project: (lon: number, lat: number) => [number, number]): number {
  const at = Math.max(-85, Math.min(85, lat)), dx = project(0.5, at)[0] - project(-0.5, at)[0];
  return (111.195 * Math.cos((at * Math.PI) / 180)) / Math.max(1e-6, dx);
}
export interface SpanRange { nearKm: number; farKm: number }
/**
 * The ground both maps show at the hand-off, in km: the city map's wide end when it is known (the whole city from above), otherwise
 * HANDOFF_KM, kept within what the atlas can show (its closest and its own end of flight).
 */
export function handoffSpan(atlas: SpanRange, city?: SpanRange | null): number {
  const want = city && Number.isFinite(city.farKm) && city.farKm > 0 ? city.farKm : HANDOFF_KM;
  return Math.max(Math.min(atlas.nearKm, atlas.farKm), Math.min(Math.max(atlas.nearKm, atlas.farKm), want));
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

// ---- the city map's part: down from straight above, then a swoop at the destination ---------------------------------------------
/** The descent from straight above takes this share of the city map's part; the swoop at the destination takes the rest. */
export const DESCENT_SHARE = 0.5;
/** The most the swoop turns the map to fly at the destination, radians either way (more reads as a spin). */
export const MAX_TURN = 0.7;
/** The swoop ends this low and this close over the destination's landmark (city map units: 10 to the km). */
export const STREET_PITCH = 0.5, STREET_DISTANCE = 14;
/** Where the camera is over the towers at the end of the descent: this far from the core towards the destination, tilted this much. */
export const AERIAL_LEAD = 0.35, AERIAL_PITCH = 1.3;
/** Straight down, as the map rigs allow it (./camera.ts PITCH_MAX): both maps meet at this tilt. */
export const TOP_PITCH = 1.5;
export interface SwoopPlan { start: DiveView; aerial: DiveView; street: DiveView | null }
/** What the city map is told when the dive hands over to it (./index.ts CityView.enter): how long it comes down for, the ground it starts on (km), and the destination (a venue id) to swoop at, if any. */
export interface CityDive { seconds: number; spanKm?: number; venue?: string | null }
const wrap = (angle: number): number => { let turn = angle % (Math.PI * 2); if (turn > Math.PI) turn -= Math.PI * 2; else if (turn < -Math.PI) turn += Math.PI * 2; return turn; };
/** The turn that has the camera fly from `from` towards `to` (it looks along the way it goes), kept within MAX_TURN; 0 when they are one point. */
export function approachYaw(from: { x: number; z: number }, to: { x: number; z: number }): number {
  const dx = to.x - from.x, dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  // The rig puts the camera at (sin yaw, cos yaw) from what it looks at: behind the way it goes is minus that way.
  return Math.max(-MAX_TURN, Math.min(MAX_TURN, wrap(Math.atan2(-dx, -dz)))) || 0;
}
/**
 * The city map's camera through the dive. It starts straight down over the core at the hand-off's distance (`startDistance`, matched to the
 * atlas), comes down over the towers, and then, with a destination (`landmark`), tilts and flies at it, ending low over it; without one
 * (the player's own city) it comes down to the city's opening view (`core`). Distances never grow along the way.
 */
export function swoopPlan(startDistance: number, core: DiveView, landmark: { x: number; z: number } | null): SwoopPlan {
  const start: DiveView = { x: core.x, z: core.z, yaw: 0, pitch: TOP_PITCH, distance: Math.max(startDistance, core.distance) };
  if (!landmark) return { start, aerial: { ...core, distance: Math.min(core.distance, start.distance) }, street: null };
  const low = Math.min(start.distance, Math.max(STREET_DISTANCE * 2, core.distance * 0.8));
  const aerial: DiveView = { x: core.x + (landmark.x - core.x) * AERIAL_LEAD, z: core.z + (landmark.z - core.z) * AERIAL_LEAD, yaw: 0, pitch: Math.min(start.pitch, AERIAL_PITCH), distance: low };
  const street: DiveView = { x: landmark.x, z: landmark.z, yaw: approachYaw(core, landmark), pitch: STREET_PITCH, distance: Math.min(low, STREET_DISTANCE) };
  return { start, aerial, street };
}
function between(from: DiveView, to: DiveView, t: number): DiveView {
  const k = smooth(t);
  return {
    x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, yaw: from.yaw + wrap(to.yaw - from.yaw) * k, pitch: from.pitch + (to.pitch - from.pitch) * k,
    distance: from.distance * Math.pow(to.distance / from.distance, k),
  };
}
/** Where the city map's camera is at `k` (0 to 1) of its part of the dive. */
export function swoopView(plan: SwoopPlan, k: number): DiveView {
  const t = clamp01(k);
  if (!plan.street) return t >= 1 ? { ...plan.aerial } : between(plan.start, plan.aerial, t);
  if (t >= 1) return { ...plan.street };
  return t <= DESCENT_SHARE ? between(plan.start, plan.aerial, t / DESCENT_SHARE) : between(plan.aerial, plan.street, (t - DESCENT_SHARE) / (1 - DESCENT_SHARE));
}

// ---- the entry page's backdrop: the dive on a timer --------------------------------------------------------------------------------
/** still: the entry page's own picture (save-data, a weak device); fade: the atlas already over the city, faded in (reduced motion); dive: the timed dive. */
export type EntryBackdrop = 'still' | 'fade' | 'dive';
/** The atlas is faded in over the picture this fast, and reduced motion gets nothing longer. */
export const ENTRY_FADE_MS = 300;
/** From space the world turns this long before the camera goes to the country, and stays on the country this long before the dive to the city. */
export const ENTRY_WORLD_MS = 1400, ENTRY_COUNTRY_MS = 2400;
/** Save-data and a weak device (diveTier: cut) keep the picture; reduced motion (on a device that could play it) gets the short fade. */
export function entryBackdrop(hints: DeviceHints = {}): EntryBackdrop {
  if (diveTier({ ...hints, reduced: false }) === 'cut') return 'still';
  return hints.reduced ? 'fade' : 'dive';
}
/** One step of the backdrop: what the atlas is asked to do `at` ms after it is on screen. 'settle' is the city at once, with no flight. */
export interface EntryStep { at: number; go: 'world' | 'country' | 'city' | 'settle' }
/**
 * The backdrop's path: nothing for the still; the city at once for the fade; for the dive, the world, then the country, then the dive to
 * the city (the atlas's own flight and the clouds of ./dive-host.ts), a mid-range device the same path shorter. Pure, so the timings are a test.
 * Nothing in it waits on the page: the steps are only ever started by the backdrop's own timers.
 */
export function entryDivePlan(backdrop: EntryBackdrop, tier: DiveTier = 'full'): readonly EntryStep[] {
  if (backdrop === 'still') return [];
  if (backdrop === 'fade') return [{ at: 0, go: 'settle' }];
  const k = tier === 'lite' ? LITE : 1, world = Math.round(ENTRY_WORLD_MS * k), country = Math.round(ENTRY_COUNTRY_MS * k);
  return [{ at: 0, go: 'world' }, { at: world, go: 'country' }, { at: world + country, go: 'city' }];
}
