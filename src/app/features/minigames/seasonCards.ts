// The two season cards (docs/MINI-GAMES.md), drawn on the device in the phone-story shape (9:16): the NYSC passing-out card and the JAMB results-day card.
// Each is built from the server's row, so a card says only what the game recorded. They go to Capture, which adds the @handle mark and shares them.
import type { JambCard, NyscCard } from '../../../types/minigames.ts'
import { H, W, canvasOf, png, roundRect, wrap } from './cardKit.ts'
import type { Paint } from './cardKit.ts'

function frame(ctx: Paint, top: string, bottom: string, accent: string, kicker: string): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, top); sky.addColorStop(1, bottom)
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 9; i++) ctx.fillRect(0, 90 + i * 140, W, 60)
  ctx.fillStyle = 'rgba(8,12,10,0.74)'; roundRect(ctx, 48, 150, W - 96, H - 300, 40); ctx.fill()
  ctx.fillStyle = accent; roundRect(ctx, 48, 150, W - 96, 16, 8); ctx.fill()
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillStyle = accent; ctx.font = '800 40px system-ui, sans-serif'; ctx.fillText(kicker, W / 2, 210, W - 140)
}
function lines(ctx: Paint, rows: readonly (readonly [string, string])[], y: number): number {
  ctx.textAlign = 'left'
  for (const [label, value] of rows) {
    ctx.font = '500 28px system-ui, sans-serif'; ctx.fillStyle = '#9fb0a6'; ctx.fillText(label, 96, y)
    ctx.font = '700 32px system-ui, sans-serif'; ctx.fillStyle = '#ffffff'
    const wrapped = wrap(ctx, value, W - 192, 3)
    wrapped.forEach((row, at) => ctx.fillText(row, 96, y + 34 + at * 38, W - 192))
    y += 34 + wrapped.length * 38 + 16
  }
  ctx.textAlign = 'center'
  return y
}

/** The passing-out card: the camp, the platoon, the honour and the posting. */
export function drawNysc(ctx: Paint, card: NyscCard): void {
  frame(ctx, '#0e3d1f', '#1b5e20', '#7ee2a8', 'NYSC camp · Passing out')
  ctx.fillStyle = '#ffffff'; ctx.font = '800 64px system-ui, sans-serif'; ctx.fillText(card.name || 'Corps member', W / 2, 290, W - 140)
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 56px system-ui, sans-serif'; ctx.fillText(card.honour, W / 2, 380, W - 140)
  lines(ctx, [['Camp', `${card.camp}, ${card.state}`], ['Platoon', `Platoon ${card.platoon}`], ['Batch', card.batch], ['Posted to', card.posting], ['Passed out', card.passedOutDay]], 470)
  ctx.fillStyle = '#7f918a'; ctx.font = '500 26px system-ui, sans-serif'; ctx.fillText('A game of camp life · Allworld', W / 2, 1070, W - 140)
}

/** The results-day card: the mock score, the best subject and the revision record. */
export function drawJamb(ctx: Paint, card: JambCard): void {
  frame(ctx, '#10265a', '#3b1d6b', '#ffd84a', `JAMB season ${card.year} · Results day`)
  ctx.fillStyle = '#ffffff'; ctx.font = '800 56px system-ui, sans-serif'; ctx.fillText(card.name || 'Candidate', W / 2, 290, W - 140)
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 150px system-ui, sans-serif'; ctx.fillText(String(card.score), W / 2, 380)
  ctx.fillStyle = '#c9d2f0'; ctx.font = '600 34px system-ui, sans-serif'; ctx.fillText(`mock score out of 400 · ${card.band}`, W / 2, 550, W - 140)
  const subject = { english: 'English', maths: 'Maths', general: 'General knowledge' }[card.best]
  lines(ctx, [['Mock exam', `${card.correct} of ${card.total} right`], ['Best subject', subject], ['Practice', `${card.practiceCorrect} of ${card.practiceAnswered} right on ${card.practiceDays} days`], ['Streak', `${card.streak} ${card.streak === 1 ? 'day' : 'days'}`]], 630)
  ctx.fillStyle = '#8c93b8'; ctx.font = '500 26px system-ui, sans-serif'; ctx.fillText('A revision game with original questions · Allworld', W / 2, 1070, W - 140)
}

export async function nyscCardPhoto(card: NyscCard): Promise<Blob> { const canvas = canvasOf(); drawNysc(canvas.getContext('2d')!, card); return png(canvas) }
export async function jambCardPhoto(card: JambCard): Promise<Blob> { const canvas = canvasOf(); drawJamb(canvas.getContext('2d')!, card); return png(canvas) }
