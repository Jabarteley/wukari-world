// The run's card and its clip (docs/DANFO.md), made on this device and handed to Capture, which adds the @handle mark and shares them
// (src/app/features/capture). The clip replays the last seconds of driving in the 2D lanes in the phone-story shape (9:16) and ends on the
// card; nothing is uploaded.
import { recordCanvas } from '../capture/captureModel.ts'
import { drawLanes } from './laneView.ts'
import type { LaneLook } from './laneView.ts'
import { CLIP_FPS } from './runModel.ts'
import type { RoadSnapshot } from './runModel.ts'

export const CLIP_W = 720, CLIP_H = 1280, CARD_MS = 2600
export interface CardInput { title: string; sub: string; brag: string | null; earned: string; rows: readonly [string, string][]; city: string }

type Paint = CanvasRenderingContext2D
/** The run-end card: the line, the money, the brag, the sums. Drawn over whatever is below it in the lower part of the frame. */
export function drawCard(ctx: Paint, width: number, height: number, card: CardInput, alpha = 1): void {
  const pad = width * 0.07, top = height * 0.3, boxH = height * 0.58
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(12, 16, 20, 0.86)'
  roundRect(ctx, pad, top, width - pad * 2, boxH, 28); ctx.fill()
  ctx.fillStyle = '#f4c20d'
  roundRect(ctx, pad, top, width - pad * 2, 14, 7); ctx.fill()
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  let y = top + 44
  const text = (value: string, size: number, color: string, weight = 700): void => {
    ctx.font = `${weight} ${Math.round(size)}px system-ui, sans-serif`; ctx.fillStyle = color
    ctx.fillText(value, width / 2, y, width - pad * 3); y += size * 1.35
  }
  text(card.title, width * 0.065, '#ffffff')
  text(card.sub, width * 0.038, '#c9d2d9', 500)
  y += width * 0.02
  text(card.earned, width * 0.13, '#ffd84a', 800)
  if (card.brag) text(card.brag, width * 0.042, '#7ee2a8')
  y += width * 0.02
  ctx.font = `500 ${Math.round(width * 0.04)}px system-ui, sans-serif`
  for (const [label, value] of card.rows) {
    ctx.textAlign = 'left'; ctx.fillStyle = '#c9d2d9'; ctx.fillText(label, pad * 2, y)
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.fillText(value, width - pad * 2, y)
    y += width * 0.058
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#93a1ac'
  ctx.font = `500 ${Math.round(width * 0.033)}px system-ui, sans-serif`
  ctx.fillText(`Drive a danfo in ${card.city} · game naira`, width / 2, top + boxH - width * 0.08)
  ctx.restore()
}
function roundRect(ctx: Paint, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function canvasOf(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CLIP_W; canvas.height = CLIP_H
  return canvas
}

/** The card alone as a PNG, over the last frame of the road. */
export async function cardPhoto(last: RoadSnapshot | null, look: LaneLook, card: CardInput): Promise<Blob> {
  const canvas = canvasOf(), ctx = canvas.getContext('2d')!
  if (last) drawLanes(ctx, CLIP_W, CLIP_H, last, look)
  else { ctx.fillStyle = '#41464c'; ctx.fillRect(0, 0, CLIP_W, CLIP_H) }
  drawCard(ctx, CLIP_W, CLIP_H, card)
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('empty'))), 'image/png'))
}

/**
 * The clip: the kept frames replayed in real time, then the card. Resolves with the video and its length, or rejects when this browser
 * cannot record a canvas (the card is still shareable as a photo).
 */
export function makeClip(frames: readonly RoadSnapshot[], look: LaneLook, card: CardInput): Promise<{ blob: Blob; ms: number }> {
  if (!frames.length) return Promise.reject(new Error('no frames'))
  const canvas = canvasOf(), ctx = canvas.getContext('2d')!
  // Some browsers only stream a canvas that is in the page: it is kept out of sight while it records.
  canvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none'
  document.body.appendChild(canvas)
  const ms = Math.round((frames.length / CLIP_FPS) * 1000) + CARD_MS
  return new Promise((resolve, reject) => {
    let n = 0, timer: ReturnType<typeof setInterval> | undefined
    const done = (): void => { if (timer !== undefined) clearInterval(timer); canvas.remove() }
    const draw = (): void => {
      const frame = frames[Math.min(n, frames.length - 1)]!
      drawLanes(ctx, CLIP_W, CLIP_H, frame, look)
      ctx.fillStyle = 'rgba(12,16,20,0.72)'; ctx.fillRect(0, 0, CLIP_W, 96)
      ctx.fillStyle = '#ffd84a'; ctx.font = '800 40px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(card.title, 32, 48, CLIP_W - 64)
      const shown = n - frames.length
      if (shown >= 0) drawCard(ctx, CLIP_W, CLIP_H, card, Math.min(1, shown / 6))
      n++
    }
    try {
      draw()
      const recording = recordCanvas(canvas, {
        complete(blob) { done(); resolve({ blob, ms }) },
        fail(code) { done(); reject(new Error(code)) },
        limitReached() { /* the clip is shorter than the cap */ },
      }, ms + 500)
      timer = setInterval(() => { draw(); if (n > frames.length + (CARD_MS / 1000) * CLIP_FPS) { clearInterval(timer); timer = undefined; recording.stop() } }, 1000 / CLIP_FPS)
    } catch (error) { done(); reject(error) }
  })
}
