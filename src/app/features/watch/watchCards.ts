// Cards of shared watching made on this phone (docs/ALLWORLD-HOUSE.md, docs/SHARE-LOOPS.md): a right prediction ("I called it"), the owambe's
// "who came" photo card, and a premiere clip. Nothing is uploaded: the file goes only where the person sends it (shareloops/loopShare.ts).
// The words are pure (src/watch/predictions.ts, src/festivals/party.ts, src/watch/premiere.ts); this paints and sends them.
import { drawStoryCard, canvasPng, paintMark } from '../shareloops/loopPaint.ts'
import { loopFile, loopLink, loopMark, loopText, profileOf, wrapLines } from '../shareloops/loopsModel.ts'
import type { LoopKind } from '../shareloops/loopsModel.ts'
import { sendLoop, whoAmI } from '../shareloops/loopShare.ts'
import { resultCardWords } from '../../../watch/predictions.ts'
import type { BadgeKind } from '../../../watch/predictions.ts'
import { whoCameWords } from '../../../festivals/party.ts'
import type { PartyCard } from '../../../types/visit.ts'

const FONT = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const CARD_W = 1080, CARD_H = 1350

/** Send a drawn card: the phone's own share sheet first, the Allworld sheet otherwise. Returns false when nothing could be made. */
async function send(loop: LoopKind, canvas: HTMLCanvasElement | null, lines: string[], path: string): Promise<boolean> {
  if (!canvas) return false
  const blob = await canvasPng(canvas)
  if (!blob) return false
  const link = loopLink(location.origin, loop, path)
  await sendLoop({ loop, file: new File([blob], loopFile(loop), { type: 'image/png' }), text: loopText(lines, link), link })
  return true
}

/** "I called it": a right prediction's card, with the season's points. */
export async function shareCalledIt(title: string, result: { home: number; away: number }, kind: BadgeKind, season: string, points: number): Promise<boolean> {
  const me = await whoAmI(), words = resultCardWords(title, result, kind, season, points)
  const canvas = drawStoryCard({ theme: kind === 'exact' ? 'gold' : 'green', kicker: 'MATCH NIGHT ON ALLWORLD', title: words.headline, tiles: [{ value: String(points), label: `points in ${season}` }], foot: words.sub, mark: loopMark(me.handle) })
  return send('called-it', canvas, [`${words.headline} ⚽`, 'Predict the next one with me at the viewing centre.'], profileOf(me.handle, me.id))
}

/**
 * The owambe's "who came" photo card: the room as the scene shows it now (when the scene can be read: the host's own home), the title,
 * the facts and the names. Without a picture the top is the party colour.
 */
export async function shareWhoCame(card: PartyCard, host: string, photo: HTMLCanvasElement | null): Promise<boolean> {
  const me = await whoAmI(), words = whoCameWords(card, host)
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W; canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const top = 640
  ctx.fillStyle = card.colour.hex; ctx.fillRect(0, 0, CARD_W, CARD_H)
  if (photo && photo.width && photo.height) {
    // Cover-crop the room into the top of the card.
    const scale = Math.max(CARD_W / photo.width, top / photo.height), w = CARD_W / scale, h = top / scale
    try { ctx.drawImage(photo, (photo.width - w) / 2, (photo.height - h) / 2, w, h, 0, 0, CARD_W, top) } catch { /* a scene that cannot be read: the colour stays */ }
  }
  const fade = ctx.createLinearGradient(0, top - 120, 0, top + 40)
  fade.addColorStop(0, `${card.colour.hex}00`); fade.addColorStop(1, '#14110cee')
  ctx.fillStyle = fade; ctx.fillRect(0, top - 120, CARD_W, 160)
  ctx.fillStyle = '#14110c'; ctx.fillRect(0, top + 40, CARD_W, CARD_H - top - 40)
  ctx.fillStyle = card.colour.hex; ctx.fillRect(0, top + 40, CARD_W, 14)
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'
  let y = top + 130
  for (const line of wrapLines(words.headline, CARD_W - 120, (text) => { ctx.font = `800 72px ${FONT}`; return ctx.measureText(text).width }, 2)) { ctx.font = `800 72px ${FONT}`; ctx.fillText(line, CARD_W / 2, y); y += 82 }
  ctx.font = `600 34px ${FONT}`; ctx.fillStyle = '#ffffffcc'; ctx.fillText(words.facts, CARD_W / 2, y); y += 70
  ctx.font = `700 36px ${FONT}`; ctx.fillStyle = '#ffffff'
  const names = words.names.length ? words.names : ['Just the family']
  names.forEach((name, i) => { const col = i % 2, row = Math.floor(i / 2); ctx.fillText(name.slice(0, 22), CARD_W / 2 + (col ? 230 : -230), y + row * 48) })
  if (words.more > 0) { ctx.fillStyle = '#ffffffaa'; ctx.fillText(`and ${words.more} more`, CARD_W / 2, y + Math.ceil(names.length / 2) * 48 + 10) }
  paintMark(ctx, loopMark(me.handle), CARD_W, CARD_H)
  return send('owambe', canvas, [`${words.headline} 🎉`, words.facts, 'Who is throwing the next one?'], profileOf(me.handle, me.id))
}
