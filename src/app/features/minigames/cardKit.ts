// Cards and clips made on the device for the mini-games (docs/MINI-GAMES.md): a few drawing helpers, a PNG, and a recorder that plays a drawing
// function over time into a video. Nothing is uploaded and nothing records sound: the canvas stream is video only (capture/captureModel.ts removes
// any audio track), so no microphone is ever asked for. The finished file goes to Capture, which adds the @handle mark and opens the share sheet.
import { recordCanvas } from '../capture/captureModel.ts'

export const W = 720, H = 1280, FPS = 20
export type Paint = CanvasRenderingContext2D

export function roundRect(ctx: Paint, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** Breaks `text` into lines no wider than `width` at the font in force. At most `max` lines; the last ends with an ellipsis when the text runs on. */
export function wrap(ctx: Paint, text: string, width: number, max = 6): string[] {
  const words = text.split(/\s+/).filter(Boolean), lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) line = next
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  if (lines.length > max) { lines.length = max; lines[max - 1] = `${lines[max - 1]!.replace(/\s+\S*$/, '')}…` }
  return lines
}

export function canvasOf(width = W, height = H): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  return canvas
}
export const png = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('empty'))), 'image/png'))

/**
 * Plays `draw(ms)` into a canvas at FPS frames a second for `totalMs` and records it. Resolves with the video and its length; rejects when this browser
 * cannot record a canvas (a card is still shareable as a photo). `onProgress` is told the elapsed time on each frame; `cancelled` stops it early.
 */
export function recordDrawing(draw: (ctx: Paint, ms: number) => void, totalMs: number, options: { onProgress?: (ms: number) => void; cancelled?: () => boolean } = {}): Promise<{ blob: Blob; ms: number }> {
  const canvas = canvasOf(), ctx = canvas.getContext('2d')!
  // Some browsers only stream a canvas that is in the page: it is kept out of sight while it records.
  canvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none'
  document.body.appendChild(canvas)
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setInterval> | undefined, started = 0
    const done = (): void => { if (timer !== undefined) clearInterval(timer); timer = undefined; canvas.remove() }
    try {
      draw(ctx, 0)
      const recording = recordCanvas(canvas, {
        complete(blob) { done(); resolve({ blob, ms: totalMs }) },
        fail(code) { done(); reject(new Error(code)) },
        limitReached() { /* the drawing is shorter than the cap */ },
      }, totalMs + 500)
      started = Date.now()
      timer = setInterval(() => {
        const ms = Date.now() - started
        if (options.cancelled?.()) { done(); recording.cancel(); reject(new Error('cancelled')); return }
        draw(ctx, Math.min(ms, totalMs)); options.onProgress?.(Math.min(ms, totalMs))
        if (ms >= totalMs) { clearInterval(timer); timer = undefined; recording.stop() }
      }, 1000 / FPS)
    } catch (error) { done(); reject(error) }
  })
}
