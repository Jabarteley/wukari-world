/**
 * Draws the share-loop picture cards on this device (docs/SHARE-LOOPS.md): a story card (the start card, Wrapped, street fame), a
 * passport page and a city front page, all 1080x1920 for phone stories, each with the @handle mark at the foot. Words and sizes come from
 * the pure models (./loopsModel.ts and the *Model.ts files); this file only paints. Fetched with the loops, never in the first download.
 */
import { STORY_H, STORY_W, wrapLines } from './loopsModel.ts'

const FONT = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const SERIF = 'Georgia, "Times New Roman", serif'
type Paint = CanvasRenderingContext2D

export type LoopTheme = 'sunset' | 'night' | 'green' | 'gold'
const THEMES: Readonly<Record<LoopTheme, { top: string; bottom: string; ink: string; soft: string; accent: string; panel: string }>> = {
  sunset: { top: '#2b5f8a', bottom: '#f2a65a', ink: '#ffffff', soft: '#ffffffcc', accent: '#ffd36b', panel: '#10323dcc' },
  night: { top: '#121a3a', bottom: '#4a2a6a', ink: '#ffffff', soft: '#ffffffcc', accent: '#9fd8ff', panel: '#0b1022cc' },
  green: { top: '#183b2a', bottom: '#2f7a52', ink: '#ffffff', soft: '#ffffffcc', accent: '#e8a643', panel: '#0d2419cc' },
  gold: { top: '#5a3b0c', bottom: '#d89b2b', ink: '#ffffff', soft: '#fff3dccc', accent: '#fff1b8', panel: '#3a2506cc' },
}

export interface StoryCardSpec {
  theme: LoopTheme
  kicker: string
  title: string
  name?: string
  /** Big figures in tiles (Wrapped): at most six. */
  tiles?: { value: string; label: string }[]
  rows?: { label: string; value: string }[]
  foot: string
  mark: string
}

function canvasOf(): { canvas: HTMLCanvasElement; ctx: Paint } | null {
  const canvas = document.createElement('canvas')
  canvas.width = STORY_W; canvas.height = STORY_H
  const ctx = canvas.getContext('2d')
  return ctx ? { canvas, ctx } : null
}
function round(ctx: Paint, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
const measureAt = (ctx: Paint, font: string) => (line: string): number => { ctx.font = font; return ctx.measureText(line).width }

/** The mark pill at the foot of every card. */
export function paintMark(ctx: Paint, mark: string, width = STORY_W, height = STORY_H): void {
  ctx.save()
  ctx.font = `700 38px ${FONT}`
  const w = Math.min(width - 80, ctx.measureText(mark).width + 56), h = 72, x = (width - w) / 2, y = height - h - 56
  ctx.fillStyle = 'rgba(12,28,20,.66)'; round(ctx, x, y, w, h, h / 2); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(mark, width / 2, y + h / 2 + 1)
  ctx.restore()
}

/** A story card: kicker, title, name, tiles and rows, foot, mark. */
export function drawStoryCard(spec: StoryCardSpec): HTMLCanvasElement | null {
  const made = canvasOf()
  if (!made) return null
  const { canvas, ctx } = made, theme = THEMES[spec.theme], W = STORY_W, H = STORY_H
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, theme.top); sky.addColorStop(1, theme.bottom)
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  // A few soft circles: the same every time.
  for (const [x, y, r] of [[0.85, 0.12, 0.28], [0.1, 0.55, 0.22], [0.75, 0.82, 0.3]] as const) {
    const glow = ctx.createRadialGradient(x * W, y * H, 4, x * W, y * H, r * W)
    glow.addColorStop(0, '#ffffff22'); glow.addColorStop(1, '#ffffff00')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  let y = 190
  ctx.fillStyle = theme.accent; ctx.font = `800 40px ${FONT}`
  ctx.fillText(spec.kicker, W / 2, y)
  y += 110
  const titleFont = `800 92px ${FONT}`
  ctx.fillStyle = theme.ink; ctx.shadowColor = '#00000055'; ctx.shadowBlur = 18
  for (const line of wrapLines(spec.title, W - 140, measureAt(ctx, titleFont), 3)) { ctx.font = titleFont; ctx.fillText(line, W / 2, y); y += 104 }
  ctx.shadowBlur = 0
  if (spec.name) { ctx.font = `600 48px ${FONT}`; ctx.fillStyle = theme.soft; ctx.fillText(spec.name, W / 2, y + 10); y += 90 }
  y += 30
  const tiles = (spec.tiles ?? []).slice(0, 6)
  if (tiles.length) {
    const cols = 2, gap = 28, tw = (W - 120 - gap) / cols, th = 230
    tiles.forEach((tile, index) => {
      const col = index % cols, row = Math.floor(index / cols), x = 60 + col * (tw + gap), top = y + row * (th + gap)
      ctx.fillStyle = theme.panel; round(ctx, x, top, tw, th, 36); ctx.fill()
      ctx.fillStyle = theme.accent; ctx.font = `800 76px ${FONT}`
      const value = wrapLines(tile.value, tw - 40, measureAt(ctx, `800 76px ${FONT}`), 1)[0] ?? ''
      ctx.font = `800 76px ${FONT}`; ctx.fillText(value, x + tw / 2, top + 118)
      ctx.fillStyle = theme.soft; ctx.font = `600 34px ${FONT}`
      const label = wrapLines(tile.label, tw - 40, measureAt(ctx, `600 34px ${FONT}`), 2)
      label.forEach((line, at) => { ctx.font = `600 34px ${FONT}`; ctx.fillText(line, x + tw / 2, top + 172 + at * 38) })
    })
    y += Math.ceil(tiles.length / cols) * (th + gap) + 10
  }
  const rows = (spec.rows ?? []).slice(0, 7)
  if (rows.length) {
    const rh = 118, panelH = rows.length * rh + 40
    ctx.fillStyle = theme.panel; round(ctx, 60, y, W - 120, panelH, 40); ctx.fill()
    rows.forEach((row, index) => {
      const top = y + 40 + index * rh
      ctx.textAlign = 'left'; ctx.fillStyle = theme.soft; ctx.font = `600 32px ${FONT}`
      ctx.fillText(row.label.toUpperCase(), 110, top + 34)
      ctx.fillStyle = theme.ink; ctx.font = `700 46px ${FONT}`
      ctx.fillText(wrapLines(row.value, W - 220, measureAt(ctx, `700 46px ${FONT}`), 1)[0] ?? '', 110, top + 88)
    })
    ctx.textAlign = 'center'
    y += panelH + 40
  }
  ctx.fillStyle = theme.ink; ctx.font = `700 46px ${FONT}`
  const footY = Math.max(y + 60, H - 240)
  ctx.fillText(spec.foot, W / 2, Math.min(footY, H - 200))
  paintMark(ctx, spec.mark)
  return canvas
}

export interface PassportPageSpec {
  continent: string
  holder: string
  page: string
  stamps: { city: string; country: string; date: string; tone: number }[]
  /** "3 of 41 cities" */
  progress: string
  mark: string
}
const INKS = ['#b23a2e', '#2b5fa8', '#256b45', '#6a3fa0', '#a8602b', '#1f6f78']

/** A passport page: cream paper, a heading, and round ink stamps (city, country, date), slightly turned. */
export function drawPassportPage(spec: PassportPageSpec): HTMLCanvasElement | null {
  const made = canvasOf()
  if (!made) return null
  const { canvas, ctx } = made, W = STORY_W, H = STORY_H
  ctx.fillStyle = '#1c2f4f'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#f4ecd8'; round(ctx, 50, 60, W - 100, H - 230, 30); ctx.fill()
  ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 3
  for (let y = 360; y < H - 230; y += 64) { ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(W - 90, y); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1 }
  ctx.textAlign = 'center'; ctx.fillStyle = '#1c2f4f'
  ctx.font = `800 40px ${FONT}`; ctx.fillText('ALLWORLD PASSPORT', W / 2, 150)
  ctx.font = `700 76px ${SERIF}`; ctx.fillText(spec.continent, W / 2, 240)
  ctx.font = `600 36px ${FONT}`; ctx.fillStyle = '#5b5040'; ctx.fillText(`${spec.holder} · ${spec.page}`, W / 2, 300)
  const stamps = spec.stamps.slice(0, 12), cols = 3, cell = (W - 180) / cols, r = 130
  stamps.forEach((stamp, index) => {
    const col = index % cols, row = Math.floor(index / cols), cx = 90 + cell * col + cell / 2, cy = 520 + row * 330
    const ink = INKS[stamp.tone % INKS.length]!, turn = ((stamp.tone % 7) - 3) * 0.06
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(turn); ctx.globalAlpha = 0.86
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 18, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = ink; ctx.textAlign = 'center'
    const cityFont = `800 40px ${FONT}`
    const lines = wrapLines(stamp.city.toUpperCase(), r * 1.5, measureAt(ctx, cityFont), 2)
    lines.forEach((line, at) => { ctx.font = cityFont; ctx.fillText(line, 0, -8 + at * 44 - (lines.length - 1) * 22) })
    ctx.font = `600 26px ${FONT}`; ctx.fillText(wrapLines(stamp.country, r * 1.5, measureAt(ctx, `600 26px ${FONT}`), 1)[0] ?? '', 0, -r + 64)
    ctx.font = `700 28px ${FONT}`; ctx.fillText(stamp.date, 0, r - 44)
    ctx.restore()
  })
  if (!stamps.length) { ctx.fillStyle = '#8a7d63'; ctx.font = `600 44px ${FONT}`; ctx.fillText('No stamps on this page yet', W / 2, 760) }
  ctx.fillStyle = '#5b5040'; ctx.font = `700 40px ${FONT}`; ctx.fillText(spec.progress, W / 2, H - 230 - 60)
  paintMark(ctx, spec.mark)
  return canvas
}

export interface FrontPageSpec {
  paper: string
  date: string
  headline: string
  stories: { head: string; body: string }[]
  /** "Written by AI from the public gist" or "From the public gist". */
  credit: string
  mark: string
}

/** A newspaper front page: masthead, date line, the main headline and up to four stories in two columns. */
export function drawFrontPage(spec: FrontPageSpec): HTMLCanvasElement | null {
  const made = canvasOf()
  if (!made) return null
  const { canvas, ctx } = made, W = STORY_W, H = STORY_H
  ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1b1b1b'; ctx.textAlign = 'center'
  ctx.font = `800 88px ${SERIF}`
  ctx.fillText(wrapLines(spec.paper, W - 100, measureAt(ctx, `800 88px ${SERIF}`), 1)[0] ?? '', W / 2, 160)
  ctx.fillRect(60, 196, W - 120, 6); ctx.fillRect(60, 262, W - 120, 2)
  ctx.font = `600 32px ${FONT}`; ctx.fillText(spec.date, W / 2, 242)
  let y = 380
  const head = `800 78px ${SERIF}`
  for (const line of wrapLines(spec.headline, W - 140, measureAt(ctx, head), 4)) { ctx.font = head; ctx.fillText(line, W / 2, y); y += 90 }
  y += 30; ctx.fillRect(60, y, W - 120, 2); y += 70
  const stories = spec.stories.slice(0, 4), colW = (W - 160) / 2
  stories.forEach((story, index) => {
    const col = index % 2, x = 60 + col * (colW + 40), top = y + Math.floor(index / 2) * 470
    ctx.textAlign = 'left'
    let line = top
    for (const text of wrapLines(story.head, colW, measureAt(ctx, `800 44px ${SERIF}`), 3)) { ctx.font = `800 44px ${SERIF}`; ctx.fillText(text, x, line); line += 52 }
    line += 10
    ctx.fillStyle = '#333333'
    for (const text of wrapLines(story.body, colW, measureAt(ctx, `400 32px ${SERIF}`), 7)) { ctx.font = `400 32px ${SERIF}`; ctx.fillText(text, x, line); line += 42 }
    ctx.fillStyle = '#1b1b1b'
  })
  ctx.textAlign = 'center'; ctx.fillStyle = '#6b6b6b'; ctx.font = `600 30px ${FONT}`
  ctx.fillText(spec.credit, W / 2, H - 170)
  paintMark(ctx, spec.mark)
  return canvas
}

export const canvasPng = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => { try { canvas.toBlob((blob) => resolve(blob), 'image/png') } catch { resolve(null) } })
