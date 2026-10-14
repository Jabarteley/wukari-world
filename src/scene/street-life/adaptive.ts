/**
 * OWNER: scenes
 * Street life: counts that follow the measured frame time (zoom phase 3b). Pure.
 *
 * While the street moves (inside its window of frames), every frame gap is fed in. Once ADAPT_FRAMES gaps are in and their mean is
 * over ADAPT_BUDGET_MS (under about 41 frames a second), the people and vehicles drawn shrink to ADAPT_SHRINK of what they were (never
 * under ADAPT_FLOOR of the start), and the next verdict waits for ADAPT_FRAMES fresh gaps. Counts only ever shrink in a scene: a device
 * that was slow once does not get them back until the scene is built again. The frame guard (plan.ts) stays the last resort: a mean
 * over 42 ms or a stall drops street life altogether.
 *
 * `?streetperf=1` shows a small readout of the measured frame time and the counts (readoutText), for timing on a real phone.
 */
export const ADAPT_FRAMES = 60, ADAPT_BUDGET_MS = 24, ADAPT_SHRINK = 0.7, ADAPT_FLOOR = 0.25;
/** Gaps after a wake that carry the work of starting, and gaps too long to be a frame (a stall, a hidden tab): neither is counted. */
export const ADAPT_SKIP = 2, ADAPT_IGNORE_MS = 250;

export interface Caps { crowd: number; vehicles: number }

/** One step down: ADAPT_SHRINK of each count, never under ADAPT_FLOOR of the start (at least one when the start had any), never up. */
export function shrinkCaps(caps: Caps, start: Caps): Caps {
  const one = (now: number, first: number): number => {
    if (!(first > 0)) return 0;
    const floor = Math.max(1, Math.ceil(first * ADAPT_FLOOR));
    return Math.min(now, Math.max(floor, Math.floor(now * ADAPT_SHRINK)));
  };
  return { crowd: one(caps.crowd, start.crowd), vehicles: one(caps.vehicles, start.vehicles) };
}

export interface AdaptiveCaps {
  /** Feed one frame gap (seconds). Returns the new caps when they changed, else null. */
  frame(dtSeconds: number): Caps | null
  /** A new window of frames: skip the first gaps again and forget the old ones (the caps stay). */
  reset(): void
  readonly caps: Caps
  /** The mean of the gaps held (ms), or null before any. */
  readonly average: number | null
  readonly shrinks: number
}

export function createAdaptiveCaps(start: Caps): AdaptiveCaps {
  const first: Caps = { crowd: Math.max(0, Math.floor(start.crowd)), vehicles: Math.max(0, Math.floor(start.vehicles)) };
  let caps: Caps = { ...first }, gaps: number[] = [], sum = 0, skip = ADAPT_SKIP, shrinks = 0;
  return {
    get caps() { return caps; },
    get average() { return gaps.length ? sum / gaps.length : null; },
    get shrinks() { return shrinks; },
    reset() { gaps = []; sum = 0; skip = ADAPT_SKIP; },
    frame(dt) {
      const ms = Number.isFinite(dt) ? dt * 1000 : NaN;
      if (!(ms > 0) || ms > ADAPT_IGNORE_MS) return null;
      if (skip > 0) { skip -= 1; return null; }
      gaps.push(ms); sum += ms;
      if (gaps.length > ADAPT_FRAMES) sum -= gaps.shift()!;
      if (gaps.length < ADAPT_FRAMES || sum / gaps.length <= ADAPT_BUDGET_MS) return null;
      const next = shrinkCaps(caps, first);
      gaps = []; sum = 0;
      if (next.crowd === caps.crowd && next.vehicles === caps.vehicles) return null;
      caps = next; shrinks += 1;
      return caps;
    },
  };
}

/** The timing readout's switch: `?streetperf=1` (or on / true). */
export function perfFlag(search = ''): boolean {
  let value: string | null = null;
  try { value = new URLSearchParams(search).get('streetperf'); } catch { value = null; }
  const v = (value ?? '').trim().toLowerCase();
  return v === '1' || v === 'on' || v === 'true';
}
export const pagePerf = (): boolean => perfFlag((globalThis.location as { search?: string } | undefined)?.search ?? '');

/** The readout's one line. */
export function readoutText(s: { average: number | null; people: number; vehicles: number; shrinks: number; triangles: number }): string {
  const ms = s.average === null ? '…' : s.average.toFixed(1);
  return `street ${ms} ms/frame · ${s.people} people · ${s.vehicles} vehicles · ${s.triangles} tris${s.shrinks ? ` · shrunk ×${s.shrinks}` : ''}`;
}
