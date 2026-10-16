/**
 * OWNER: games (real-time)
 * Frame arithmetic for replays and clips, pure. A replay plays at a fixed 60 frames a second of VIRTUAL time (16.667 ms a frame),
 * independent of the machine's clock: frame f shows server time f/60 s, which is tick f*hz/60 (fractional). A clip is the last
 * ten seconds of that, including a short hold on the final position. The headless renderer steps `frame` one at a time
 * (src/arena/replay-page.ts, scripts/clip.ts), so the video is the same on a slow machine.
 */
export const FPS = 60
export const FRAME_MS = 1000 / FPS
export const CLIP_SECONDS = 10
/** Seconds the final position is held after the last tick, so a knockout or goal is seen. */
export const HOLD_SECONDS = 1.5

/** Frames of a match of `ticks` ticks at `hz`, including the hold. */
export const frameCount = (ticks: number, hz: number): number => Math.ceil((ticks / hz) * FPS) + Math.round(HOLD_SECONDS * FPS)

/** Which frames make the clip: the last `seconds`, or the whole match when it is shorter. */
export function clipWindow(total: number, seconds = CLIP_SECONDS): { start: number; count: number } {
  const count = Math.min(total, Math.round(seconds * FPS))
  return { start: total - count, count }
}

/** The two snapshots around frame `frame` and how far between them. `snaps[k]` is the state after k ticks (index 0 = the start). */
export function pickAt<S>(snaps: readonly S[], frame: number, hz: number): { a: S; b: S; t: number; tick: number } {
  const tick = Math.max(0, (frame * hz) / FPS)
  const last = snaps.length - 1
  if (last < 0) throw new Error('no snapshots')
  const lo = Math.min(last, Math.floor(tick)), hi = Math.min(last, lo + 1)
  return { a: snaps[lo] as S, b: snaps[hi] as S, t: lo === hi ? 0 : tick - lo, tick }
}

/** "9x16" -> the size to draw at: 1080 wide by default (the clip), or `width` (720 for the small file). Anything else: null. */
export function aspectSize(aspect: string | null, width = 1080): { w: number; h: number } | null {
  const m = /^(\d{1,2})x(\d{1,2})$/.exec(aspect ?? '')
  if (!m) return null
  const [aw, ah] = [Number(m[1]), Number(m[2])]
  if (!aw || !ah) return null
  const w = Math.min(2160, Math.max(240, Math.round(width / 2) * 2))
  return { w, h: Math.round((w * ah) / aw / 2) * 2 }
}
