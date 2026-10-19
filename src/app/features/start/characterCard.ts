// The "Share my character" card: the figure from the look stage on a city backdrop, as a PNG, with a small
// joinallworld.com mark. It is drawn on the device from a canvas copy of the stage (lookPreview.ts snapshot)
// and goes nowhere until the person taps Share: then the phone's own share sheet gets the picture, and a
// browser without one is given a download. Fetched with a dynamic import when the card is asked for.
import { cleanSourceWord } from '../../../game/attribution.ts'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
export const CARD_FILE = 'my-allworld-character.png'
const SITE = 'joinallworld.com'

/** The address a shared card points at, carrying the ad-source words of a character card (same words as src/game/share-model.ts sourceWords, source "character"). */
export const characterLink = (campaign = 'creator'): string =>
  `https://${SITE}/?utm_source=character&utm_medium=card&utm_campaign=${cleanSourceWord(campaign, 'creator')}`

/** The words that go with the picture; the link is the last line, as on every other share. */
export const characterShareText = (name: string): string => {
  const who = name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 40)
  return `${who ? `Meet ${who}, my character` : 'My character'} on Allworld, a whole world to live in.\n${characterLink()}`
}

/** A fixed skyline (no randomness: the same card every time): [x, width, height] of each tower as a share of the card. */
const FAR: readonly (readonly [number, number, number])[] = [[0.0, 0.1, 0.30], [0.09, 0.08, 0.38], [0.18, 0.1, 0.26], [0.3, 0.07, 0.42], [0.39, 0.1, 0.32], [0.52, 0.08, 0.46], [0.62, 0.1, 0.3], [0.74, 0.08, 0.4], [0.84, 0.09, 0.28], [0.92, 0.08, 0.36]]
const NEAR: readonly (readonly [number, number, number])[] = [[-0.02, 0.14, 0.2], [0.12, 0.1, 0.27], [0.22, 0.12, 0.17], [0.7, 0.12, 0.24], [0.81, 0.1, 0.18], [0.9, 0.14, 0.28]]

/** Draw the card: sky, two layers of city, a street, the figure and the marks. */
export function drawCharacterCard(figure: CanvasImageSource & { width: number; height: number }, name: string): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const W = CARD_WIDTH, H = CARD_HEIGHT, ground = H * 0.84
  const sky = ctx.createLinearGradient(0, 0, 0, ground)
  sky.addColorStop(0, '#2b5f8a'); sky.addColorStop(0.55, '#8fc3d9'); sky.addColorStop(1, '#f7dcae')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  const sun = ctx.createRadialGradient(W * 0.78, ground * 0.62, 10, W * 0.78, ground * 0.62, W * 0.3)
  sun.addColorStop(0, '#fff6d8cc'); sun.addColorStop(1, '#fff6d800')
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H)
  const towers = (list: typeof FAR, fill: string, window: string): void => {
    for (const [x, w, h] of list) {
      const left = x * W, width = w * W, height = h * H
      ctx.fillStyle = fill; ctx.fillRect(left, ground - height, width, height)
      ctx.fillStyle = window
      for (let wy = ground - height + 28; wy < ground - 30; wy += 46) for (let wx = left + 16; wx < left + width - 20; wx += 34) ctx.fillRect(wx, wy, 14, 20)
    }
  }
  towers(FAR, '#6d93ad', '#a9c8d822')
  towers(NEAR, '#3d6179', '#f7dcae55')
  ctx.fillStyle = '#4c5a62'; ctx.fillRect(0, ground, W, H - ground)
  ctx.fillStyle = '#ffffff55'
  for (let x = 30; x < W; x += 150) ctx.fillRect(x, ground + (H - ground) * 0.45, 80, 8)

  // The figure fills most of the height, centred; a stage wider than the card is cropped at the sides, a narrower one is centred.
  const scale = (H * 0.8) / figure.height
  const fw = figure.width * scale, fh = figure.height * scale
  ctx.drawImage(figure, (W - fw) / 2, ground - fh * 0.9 - 6 + 24, fw, fh)

  const who = name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 28)
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#00000066'; ctx.shadowBlur = 14
  ctx.font = '700 64px system-ui, -apple-system, "Segoe UI", sans-serif'
  if (who) ctx.fillText(who, W / 2, 112)
  ctx.font = '600 34px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('My Allworld character', W / 2, who ? 164 : 112)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#10323dcc'; ctx.fillRect(0, H - 96, W, 96)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 38px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(`Allworld  ·  ${SITE}`, W / 2, H - 36)
  return canvas
}

export const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => { try { canvas.toBlob((blob) => resolve(blob), 'image/png') } catch { resolve(null) } })

/** Whether this browser's share sheet takes a picture. */
export function canShareFile(blob: Blob): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  try { return typeof navigator.canShare !== 'function' || navigator.canShare({ files: [new File([blob], CARD_FILE, { type: 'image/png' })] }) } catch { return false }
}

/** Hand the picture to the phone's share sheet. 'cancelled' is the person closing it; 'failed' leaves the download to them. */
export async function shareCharacterCard(blob: Blob, name: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [new File([blob], CARD_FILE, { type: 'image/png' })], title: 'My Allworld character', text: characterShareText(name) })
    return 'shared'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}
