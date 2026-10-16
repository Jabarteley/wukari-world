/**
 * OWNER: games (real-time)
 * A replay ready to draw: the log run through the game's rules (./replay.ts), the game's spectator view (./replay-view.ts) and the
 * caption bands (./replay-caption.ts), behind one call, `draw(ctx, w, h, frame)`. Frames are 60 a second of VIRTUAL time
 * (./replay-frames.ts), so frame f looks the same on any machine and in any order: drawing an earlier frame than the last one
 * rewinds the view and replays the effects (sparks, skid marks) from a little before it. Used by the replay page, the in-game
 * clip maker and the offline renderer. Lazy: nothing in the first download imports it.
 */
import { replayMatch } from './replay.ts'
import type { ReplayLog } from './replay.ts'
import type { RealtimeRules } from './rules.ts'
import { clipWindow, frameCount, FPS } from './replay-frames.ts'
import { viewFor } from './replay-view.ts'
import { replayCaption } from './replay-caption.ts'
import type { ReplayCaption } from './replay-caption.ts'

/** Frames drawn (and thrown away) before a frame drawn out of order, so carried effects are right. */
const PREROLL = 90

export interface ReplayPlayer {
  caption: ReplayCaption
  /** Frames in all, including the hold on the final position. */
  frames: number
  /** The frames of the 10-second clip (the finish). */
  clip: { start: number; count: number }
  /** The rules reproduced the recorded match (same revision, same last snapshot). */
  verified: boolean
  problem: string
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number): void
}

export function replayPlayer(rules: RealtimeRules<any, any, any>, log: ReplayLog, rev: number, opts: { bands?: boolean } = {}): ReplayPlayer | null {
  const view = viewFor(log)
  if (!view) return null
  const run = replayMatch(rules, log, rev)
  const snaps = [run.start, ...run.snaps]
  const frames = frameCount(log.ticks, log.hz)
  const endFrame = Math.ceil((log.ticks / log.hz) * FPS)
  const caption = replayCaption(log)
  let last = -1
  const bands = opts.bands !== false
  return {
    caption, frames, clip: clipWindow(frames), verified: run.verified, problem: run.problem,
    draw(ctx, w, h, frame) {
      const f = Math.max(0, Math.min(frames - 1, Math.floor(frame)))
      if (f <= last || f > last + PREROLL) {
        // Out of order (or a long jump): rewind and let the effects build up again, unseen.
        view.reset()
        for (let p = Math.max(0, f - PREROLL); p < f; p++) view.draw(ctx, w, h, snaps, p)
      }
      view.draw(ctx, w, h, snaps, f)
      last = f
      if (bands) drawBands(ctx, w, h, caption, f >= endFrame ? Math.min(1, (f - endFrame) / 20) : 0)
    },
  }
}

/** The caption bands: the game and players at the top, the way in at the bottom, the result over the final position (`end` 0..1 fades it in). */
export function drawBands(ctx: CanvasRenderingContext2D, w: number, h: number, caption: ReplayCaption, end: number): void {
  const u = Math.min(w, h) / 100
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(10,12,18,.62)'
  ctx.fillRect(0, 0, w, u * 13)
  ctx.fillRect(0, h - u * 9, w, u * 9)
  ctx.fillStyle = '#ffd166'; ctx.font = `800 ${Math.round(u * 4.2)}px system-ui, sans-serif`
  ctx.fillText(caption.title.toUpperCase(), w / 2, u * 4.2)
  ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.round(u * 4.4)}px system-ui, sans-serif`
  ctx.fillText(fit(ctx, caption.players, w * 0.94), w / 2, u * 9.2)
  ctx.font = `650 ${Math.round(u * 3.6)}px system-ui, sans-serif`
  ctx.fillText(caption.footer, w / 2, h - u * 4.5)
  if (end > 0) {
    ctx.globalAlpha = end
    ctx.fillStyle = 'rgba(10,12,18,.72)'
    ctx.fillRect(0, h * 0.7, w, u * 16)
    ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(u * 6)}px system-ui, sans-serif`
    ctx.fillText(fit(ctx, caption.result, w * 0.92), w / 2, h * 0.7 + u * 8)
  }
  ctx.restore()
}

/** The text, cut with an ellipsis to fit `max` pixels in the current font. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(cut + '…').width > max) cut = cut.slice(0, -1)
  return cut + '…'
}
