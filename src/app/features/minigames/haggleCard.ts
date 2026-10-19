// The best haggle as a card and as a short replay clip (docs/MINI-GAMES.md), drawn on the device in the phone-story shape (9:16). The replay shows
// the talk line by line, then holds the card with what was saved. Both go to Capture, which adds the @handle mark and shares them.
import type { HaggleBest, HaggleLine } from '../../../types/minigames.ts'
import { H, W, canvasOf, png, recordDrawing, roundRect, wrap } from './cardKit.ts'
import type { Paint } from './cardKit.ts'
import { GRADE_WORDS, HOLD_MS, naira, replayMs, savedLine, shownAt } from './haggleModel.ts'

const CLOTH = ['#e8590c', '#f59f00', '#2f9e44', '#1971c2', '#9c36b5']

/** The market backdrop: bright cloth stripes behind the talk, dimmed so the words read. */
function backdrop(ctx: Paint): void {
  ctx.fillStyle = '#1b1410'; ctx.fillRect(0, 0, W, H)
  CLOTH.forEach((colour, i) => { ctx.fillStyle = colour; ctx.globalAlpha = 0.22; ctx.fillRect(0, 80 + i * 56, W, 36) })
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(10,8,6,0.55)'; ctx.fillRect(0, 0, W, H)
}

const BUBBLE_TOP = 340, BUBBLE_ROOM = 520, FONT = '600 30px system-ui, sans-serif'

/** The latest lines of the talk that fit above the result panel, oldest first. */
export function fit(ctx: Paint, lines: readonly HaggleLine[]): HaggleLine[] {
  ctx.font = FONT
  const out: HaggleLine[] = []
  let used = 0
  for (const line of [...lines].reverse()) {
    const height = wrap(ctx, line.text, 440, 4).length * 38 + 32 + 14
    if (used + height > BUBBLE_ROOM) break
    out.unshift(line); used += height
  }
  return out
}

function bubbles(ctx: Paint, lines: readonly HaggleLine[]): void {
  ctx.font = FONT; ctx.textBaseline = 'top'
  let y = BUBBLE_TOP
  for (const line of lines) {
    const mine = line.who === 'you', rows = wrap(ctx, line.text, 440, 4), height = rows.length * 38 + 32
    const x = mine ? W - 56 - 480 : 56
    ctx.fillStyle = mine ? '#2f9e44' : '#f1e6d3'; roundRect(ctx, x, y, 480, height, 28); ctx.fill()
    ctx.fillStyle = mine ? '#ffffff' : '#241a12'; ctx.textAlign = 'left'
    rows.forEach((row, at) => ctx.fillText(row, x + 20, y + 16 + at * 38))
    y += height + 14
  }
}

/** The result panel: what was saved, how sharp it was, where. */
function result(ctx: Paint, best: HaggleBest, alpha: number): void {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(12,16,20,0.9)'; roundRect(ctx, 48, 880, W - 96, 300, 32); ctx.fill()
  ctx.fillStyle = '#f59f00'; roundRect(ctx, 48, 880, W - 96, 12, 6); ctx.fill()
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 76px system-ui, sans-serif'; ctx.fillText(best.saved > 0 ? `Saved ${naira(best.saved)}` : 'List price', W / 2, 930, W - 160)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 36px system-ui, sans-serif'; ctx.fillText(`${naira(best.list)} → ${naira(best.price)}`, W / 2, 1030, W - 160)
  ctx.fillStyle = '#7ee2a8'; ctx.font = '700 32px system-ui, sans-serif'; ctx.fillText(GRADE_WORDS[best.grade], W / 2, 1086, W - 160)
  ctx.fillStyle = '#93a1ac'; ctx.font = '500 28px system-ui, sans-serif'; ctx.fillText('Game naira · Allworld market haggle', W / 2, 1136, W - 160)
  ctx.restore()
}

function frame(ctx: Paint, best: HaggleBest, lines: readonly HaggleLine[], resultAlpha: number): void {
  backdrop(ctx)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 54px system-ui, sans-serif'; ctx.fillText('Best haggle', W / 2, 150, W - 80)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 36px system-ui, sans-serif'; ctx.fillText(`${best.trader} · ${best.stall}`, W / 2, 224, W - 80)
  ctx.fillStyle = '#c9d2d9'; ctx.font = '500 30px system-ui, sans-serif'; ctx.fillText(`${savedLine(best)}. The trader is AI-played.`, W / 2, 280, W - 80)
  bubbles(ctx, lines)
  if (resultAlpha > 0) result(ctx, best, resultAlpha)
}

/** The card alone, as a PNG: the whole talk and the result. */
export async function haggleCardPhoto(best: HaggleBest): Promise<Blob> {
  const canvas = canvasOf(), ctx = canvas.getContext('2d')!
  frame(ctx, best, fit(ctx, best.lines), 1)
  return png(canvas)
}

/** The replay: the talk line by line, then the result. Rejects when this browser cannot record a canvas. */
export function haggleClip(best: HaggleBest): Promise<{ blob: Blob; ms: number }> {
  const lines = fit(canvasOf().getContext('2d')!, best.lines), total = replayMs(lines)
  return recordDrawing((ctx, ms) => frame(ctx, best, lines.slice(0, shownAt(lines, ms)), Math.min(1, Math.max(0, (ms - (total - HOLD_MS)) / 500))), total)
}
