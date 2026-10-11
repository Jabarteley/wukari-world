// The pictures the 3D shop draws into canvases: a product panel (the item's own photo, or a neat tile in the shop's colours with its
// name), the small price label on a shelf edge, and the service menu board of an office. A canvas context is handed in, so all of it is
// tested without a browser. Everything the seller wrote is drawn as text here; nothing builds markup.
import { priceWords } from '../../../../types/showcase-link.ts'
import { MENU_ROWS, menuPageOf, menuPages, mixHex, wrapLines } from './roomModel.ts'
import type { RoomColours, RoomItem } from './roomModel.ts'

type Picture = CanvasImageSource & { width: number; height: number }
export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
/** Fill the box with the picture the way `object-fit: cover` does (centred, never stretched). */
export function drawCover(ctx: CanvasRenderingContext2D, image: Picture, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.width, h / image.height), sw = w / scale, sh = h / scale
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
}

/** A product panel: the item's own photo filling the frame, or a boxed tile in the shop's colours with the item's name. */
export function drawPanel(ctx: CanvasRenderingContext2D, width: number, height: number, item: RoomItem, colours: RoomColours, image: Picture | null): void {
  const pad = Math.round(width * 0.05)
  ctx.fillStyle = colours.label; ctx.fillRect(0, 0, width, height)
  if (image) { drawCover(ctx, image, pad, pad, width - pad * 2, height - pad * 2); return }
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, colours.tile); gradient.addColorStop(1, mixHex(colours.tile, colours.sign, 0.5))
  ctx.fillStyle = gradient; ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2)
  ctx.strokeStyle = colours.tileInk; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(2, width * 0.012); ctx.strokeRect(pad * 2, pad * 2, width - pad * 4, height - pad * 4); ctx.globalAlpha = 1
  ctx.fillStyle = colours.tileInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  let size = Math.round(height * 0.15), lines: string[] = []
  for (; size >= 14; size -= 2) { ctx.font = `800 ${size}px ${FONT}`; lines = wrapLines(item.name, width - pad * 6, 4, (text) => ctx.measureText(text).width); if (lines.length * size * 1.18 <= height - pad * 6 && !lines.some((line) => line.endsWith('…'))) break }
  const total = lines.length * size * 1.18
  lines.forEach((line, at) => ctx.fillText(line, width / 2, height / 2 - total / 2 + size * 1.18 * (at + 0.5)))
}

/** The small label on a shelf edge or an easel: the price large, the name small. */
export function drawShelfLabel(ctx: CanvasRenderingContext2D, width: number, height: number, item: RoomItem, colours: RoomColours): void {
  ctx.fillStyle = colours.label; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, Math.round(width * 0.03), height)
  const pad = Math.round(height * 0.16)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = colours.sign; ctx.font = `800 ${Math.round(height * 0.5)}px ${FONT}`
  ctx.fillText(priceWords(item.priceNaira), pad * 1.6, height * 0.56, width - pad * 3)
  ctx.fillStyle = colours.labelInk; ctx.font = `600 ${Math.round(height * 0.27)}px ${FONT}`
  const [line] = wrapLines(item.name, width - pad * 3, 1, (text) => ctx.measureText(text).width)
  if (line) ctx.fillText(line, pad * 1.6, height * 0.9, width - pad * 3)
}

/** The service menu board: the shop's name, one line for each service (name, the seller's note, price) and the page arrows. */
export function drawMenuBoard(ctx: CanvasRenderingContext2D, width: number, height: number, shop: { name: string }, items: readonly RoomItem[], page: number, colours: RoomColours): void {
  ctx.fillStyle = mixHex(colours.sign, '#101418', 0.55); ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = colours.accent; ctx.lineWidth = 6; roundedRect(ctx, 14, 14, width - 28, height - 28, 18); ctx.stroke()
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.font = `800 ${Math.round(height * 0.085)}px ${FONT}`; ctx.fillText('Service menu', width * 0.05, height * MENU_ROWS.header * 0.5 + 8)
  ctx.textAlign = 'right'; ctx.globalAlpha = 0.8; ctx.font = `600 ${Math.round(height * 0.042)}px ${FONT}`
  ctx.fillText(shop.name, width * 0.95, height * MENU_ROWS.header * 0.5 + 8, width * 0.5); ctx.globalAlpha = 1
  const pages = menuPages(items.length)
  if (!items.length) {
    ctx.textAlign = 'center'; ctx.font = `800 ${Math.round(height * 0.09)}px ${FONT}`; ctx.fillText('Opening soon', width / 2, height * 0.42)
    ctx.font = `600 ${Math.round(height * 0.05)}px ${FONT}`; ctx.globalAlpha = 0.85; ctx.fillText('The services will be listed here.', width / 2, height * 0.55); ctx.globalAlpha = 1
    return
  }
  for (const { item, row } of menuPageOf(items, page)) {
    const top = height * (MENU_ROWS.first + row * MENU_ROWS.pitch), h = height * MENU_ROWS.line
    ctx.fillStyle = row % 2 ? '#ffffff22' : '#ffffff14'; roundedRect(ctx, width * 0.03, top, width * 0.94, h, 10); ctx.fill()
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.round(h * 0.42)}px ${FONT}`
    const [name] = wrapLines(item.name, width * 0.58, 1, (text) => ctx.measureText(text).width)
    ctx.fillText(name ?? '', width * 0.055, top + h * (item.note ? 0.34 : 0.5))
    if (item.note) { ctx.globalAlpha = 0.8; ctx.font = `500 ${Math.round(h * 0.3)}px ${FONT}`; const [note] = wrapLines(item.note, width * 0.58, 1, (text) => ctx.measureText(text).width); ctx.fillText(note ?? '', width * 0.055, top + h * 0.74); ctx.globalAlpha = 1 }
    ctx.textAlign = 'right'; ctx.fillStyle = colours.accent; ctx.font = `800 ${Math.round(h * 0.46)}px ${FONT}`
    ctx.fillText(priceWords(item.priceNaira), width * 0.945, top + h * 0.5, width * 0.3)
  }
  if (pages > 1) {
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(height * 0.05)}px ${FONT}`
    ctx.globalAlpha = page > 0 ? 1 : 0.3; ctx.fillText('←  Earlier', width * 0.25, height * 0.945)
    ctx.globalAlpha = page < pages - 1 ? 1 : 0.3; ctx.fillText('More services  →', width * 0.75, height * 0.945)
    ctx.globalAlpha = 0.85; ctx.font = `600 ${Math.round(height * 0.038)}px ${FONT}`; ctx.fillText(`Page ${page + 1} of ${pages}`, width * 0.5, height * 0.945); ctx.globalAlpha = 1
  }
}
