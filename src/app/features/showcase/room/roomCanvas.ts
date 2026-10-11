// The pictures the 3D shop draws into canvases: an item's card (its photo, or a clean tile in the shop's colours with the item's initial, and
// a label with its name and price), and the small helpers they share. A canvas context is handed in, so this is tested without a browser.
// Everything the seller wrote is drawn as text here; nothing builds markup.
import { priceWords } from '../../../../types/showcase-link.ts'
import { initialOf, mixHex, wrapLines } from './roomModel.ts'
import type { RoomColours, RoomItem } from './roomModel.ts'

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
/** Fill `box` with the picture the way `object-fit: cover` does (centred, never stretched). */
export function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.width, h / image.height), sw = w / scale, sh = h / scale
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
}

/** The picture of one item: its photo, or a clean tile in the shop's colours with the item's initial; and the name and price on a label. */
export function drawItemCard(ctx: CanvasRenderingContext2D, width: number, height: number, item: RoomItem, colours: RoomColours, image: (CanvasImageSource & { width: number; height: number }) | null): void {
  const pad = Math.round(width * 0.04), labelH = Math.round(height * 0.34), artH = height - labelH
  ctx.fillStyle = colours.label; ctx.fillRect(0, 0, width, height)
  // art
  ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, width - pad * 2, artH - pad); ctx.clip()
  if (image) drawCover(ctx, image, pad, pad, width - pad * 2, artH - pad)
  else {
    const gradient = ctx.createLinearGradient(0, pad, 0, artH)
    gradient.addColorStop(0, colours.tile); gradient.addColorStop(1, mixHex(colours.tile, colours.sign, 0.45))
    ctx.fillStyle = gradient; ctx.fillRect(pad, pad, width - pad * 2, artH - pad)
    ctx.fillStyle = colours.tileInk; ctx.globalAlpha = 0.92
    ctx.font = `800 ${Math.round(artH * 0.6)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(initialOf(item.name), width / 2, pad + (artH - pad) / 2 + artH * 0.03)
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // label: the name (two lines at most) and the price
  ctx.fillStyle = colours.labelInk; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  const nameSize = Math.round(labelH * 0.27)
  ctx.font = `700 ${nameSize}px ${FONT}`
  const lines = wrapLines(item.name, width - pad * 3, 2, (text) => ctx.measureText(text).width)
  lines.forEach((line, at) => ctx.fillText(line, pad * 1.5, artH + nameSize * (at + 1) + pad * 0.2))
  ctx.font = `800 ${Math.round(labelH * 0.27)}px ${FONT}`; ctx.fillStyle = colours.sign
  ctx.fillText(priceWords(item.priceNaira), pad * 1.5, height - pad * 1.1, width - pad * 3)
}

