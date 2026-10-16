// The screen's picture: a plain 2D draw of one snapshot. Pure: it only calls the context it is given, so a replay, a clip and a test
// can all use it. The real screen is a Vue component in a lazy chunk (src/app/features/arena/<Id>Game.vue); this is what it calls.
import { REACH } from './rules.ts'
import type { TugSnap } from './rules.ts'

/** The few canvas calls used, so this file needs no DOM types and can be checked with a fake. */
export interface Ctx2D { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void }

export function drawTug(ctx: Ctx2D, snap: TugSnap, w: number, h: number): void {
  const [, rope, wind] = snap
  ctx.fillStyle = '#16213a'; ctx.fillRect(0, 0, w, h)
  const x = w / 2 + (rope / REACH) * (w / 2 - 20)
  ctx.fillStyle = '#d9c9a3'; ctx.fillRect(20, h / 2 - 3, w - 40, 6)
  ctx.fillStyle = '#e0453a'; ctx.fillRect(x - 8, h / 2 - 14, 16, 28)
  ctx.fillStyle = '#7fd1ae'; ctx.fillRect(w / 2 - 1, h / 2 - 24, 2, 48)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(w / 2 + wind * 18 - 3, 12, 6, 6)
}
