// Making the media of a post on the device: a photo re-encoded through a canvas (which drops camera and location data, as chat pictures do),
// a snapshot of the 3D scene, a square portrait, and a clip of up to 15 seconds recorded from the scene. Nothing here uploads.
import { FEED } from '../../../feed/model.ts'

const LONG_EDGE = 1280
function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => { try { canvas.toBlob((blob) => resolve(blob), type, quality) } catch { resolve(null) } })
}
/** Fit, draw and encode under the byte cap, lowering the quality until it fits. */
async function encode(source: CanvasImageSource, w: number, h: number, max: number, edge = LONG_EDGE, type = 'image/jpeg'): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.86, 0.78, 0.68, 0.56, 0.45]) {
    const blob = await canvasBlob(canvas, type, quality)
    if (blob && blob.size <= max) return blob
  }
  return edge > 640 ? encode(source, w, h, max, Math.round(edge * 0.7), type) : null
}
/** A photo the player chose. */
export async function encodePhoto(file: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    try { return await encode(bitmap, bitmap.width, bitmap.height, Math.min(180000, FEED.media.photoBytes)) } finally { bitmap.close() }
  } catch { return null }
}
/** The 3D scene's canvas, freshly drawn: the scene's own `captureCanvas()` renders a frame and hands the canvas back (src/venue-world.ts). */
export type SceneCanvas = () => HTMLCanvasElement | null
/** What the scene shows right now, as a photo. Drawn into a 2D canvas at once, before the renderer clears its buffer. */
export async function snapshotScene(scene: SceneCanvas): Promise<Blob | null> {
  const canvas = scene()
  if (!canvas || !canvas.width) return null
  return encode(canvas, canvas.width, canvas.height, Math.min(180000, FEED.media.photoBytes))
}
/** A portrait from the scene, drawn at once (see snapshotScene). */
export async function portraitFromScene(scene: SceneCanvas): Promise<Blob | null> {
  const canvas = scene()
  if (!canvas || !canvas.width) return null
  const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height
  copy.getContext('2d')?.drawImage(canvas, 0, 0)
  return portraitFrom(copy)
}
/** A square portrait from the middle of the scene (the player's character is in the centre in the portrait pose) or from a photo. */
export async function portraitFrom(source: Blob | HTMLCanvasElement): Promise<Blob | null> {
  try {
    const img = source instanceof Blob ? await createImageBitmap(source) : source
    const w = img.width, h = img.height, side = Math.min(w, h)
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d'); if (!ctx) return null
    ctx.drawImage(img, (w - side) / 2, Math.max(0, (h - side) / 2 - side * 0.08), side, side, 0, 0, 512, 512)
    if (img instanceof ImageBitmap) img.close()
    for (const quality of [0.9, 0.8, 0.7, 0.6]) { const blob = await canvasBlob(canvas, 'image/webp', quality); if (blob && blob.type === 'image/webp' && blob.size <= FEED.media.portraitBytes) return blob }
    return encode(canvas, 512, 512, FEED.media.portraitBytes, 512)
  } catch { return null }
}
/** A sticker: the portrait as a 512 × 512 WebP to save and add to WhatsApp. */
export async function stickerFrom(url: string): Promise<Blob | null> {
  try { const res = await fetch(url); return portraitFrom(await res.blob()) } catch { return null }
}
export interface Recording { stop(): void; done: Promise<{ blob: Blob; ms: number; w: number; h: number } | null> }
/** Whether this browser can record the scene. */
export const canRecord = (): boolean => typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
/** Record the scene for up to FEED.media.clipMs, at 24 frames a second, without sound. */
export function recordScene(scene: SceneCanvas): Recording | null {
  const canvas = scene()
  if (!canvas || !canRecord()) return null
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
  if (!type) return null
  const stream = canvas.captureStream(24)
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1_600_000 })
  const chunks: Blob[] = [], started = performance.now()
  let timer = 0
  const done = new Promise<{ blob: Blob; ms: number; w: number; h: number } | null>((resolve) => {
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.onstop = () => {
      clearTimeout(timer); for (const track of stream.getTracks()) track.stop()
      const blob = new Blob(chunks, { type: type.split(';')[0] })
      resolve(blob.size && blob.size <= FEED.media.clipBytes ? { blob, ms: Math.min(FEED.media.clipMs, performance.now() - started), w: canvas.width, h: canvas.height } : null)
    }
  })
  recorder.start(500)
  timer = window.setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, FEED.media.clipMs - 500)
  return { stop: () => { if (recorder.state !== 'inactive') recorder.stop() }, done }
}
