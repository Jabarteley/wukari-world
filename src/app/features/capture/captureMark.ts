/**
 * Draws the corner mark on a capture, on the device. A photo is one canvas pass; a clip is played into a canvas and recorded again
 * (in real time, so a 30 second clip takes about 30 seconds). Nothing is uploaded and no camera or microphone is asked for.
 * Pure sizes and words are in captureShareModel.ts.
 */
import { CLIP_MAX_EDGE, PHOTO_MAX_EDGE, frameFor, markLayout, markText, pickVideoType } from './captureShareModel.ts'
import type { Frame, VideoChoice } from './captureShareModel.ts'

export type MarkFailureCode = 'unsupported' | 'load_failed' | 'record_failed' | 'cancelled' | 'hidden'
export class MarkFailure extends Error {
  readonly code: MarkFailureCode
  constructor(code: MarkFailureCode) { super(code); this.code = code; this.name = 'MarkFailure' }
}

export interface MarkOptions { handle: string | null; story: boolean }
const FONT = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

type Paint = CanvasRenderingContext2D

function pill(ctx: Paint, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** Draws the mark for a frame of the given size. The layout is worked out once with `layoutFor`. */
export function layoutFor(ctx: Paint, width: number, height: number, text: string, story: boolean): ReturnType<typeof markLayout> {
  return markLayout(width, height, (size) => { ctx.font = `700 ${size}px ${FONT}`; return ctx.measureText(text).width }, story)
}
export function drawMark(ctx: Paint, layout: ReturnType<typeof markLayout>, text: string): void {
  const { box, fontSize, radius } = layout
  ctx.save()
  ctx.fillStyle = 'rgba(12,28,20,.62)'
  pill(ctx, box.x, box.y, box.w, box.h, radius); ctx.fill()
  ctx.font = `700 ${fontSize}px ${FONT}`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff'
  ctx.fillText(text, layout.textX, layout.textY)
  ctx.restore()
}

function context(canvas: HTMLCanvasElement): Paint {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new MarkFailure('unsupported')
  return ctx
}

async function bitmapOf(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release(): void }> {
  if (typeof createImageBitmap === 'function') {
    try { const bitmap = await createImageBitmap(blob); return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() } } catch { /* below */ }
  }
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new MarkFailure('load_failed')); image.src = url })
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => {} }
  } finally { URL.revokeObjectURL(url) }
}

/** A photo with the mark, as a JPEG (one canvas pass). */
export async function markPhoto(photo: Blob, options: MarkOptions): Promise<Blob> {
  const picture = await bitmapOf(photo)
  try {
    const frame = frameFor(picture.width, picture.height, options.story, PHOTO_MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = frame.w; canvas.height = frame.h
    const ctx = context(canvas), text = markText(options.handle)
    ctx.drawImage(picture.source, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.w, frame.h)
    drawMark(ctx, layoutFor(ctx, frame.w, frame.h, text, options.story), text)
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!out?.size) throw new MarkFailure('record_failed')
    return out
  } finally { picture.release() }
}

/** Can this browser re-record a clip through a canvas? (Checked before the Share button promises a mark on a video.) */
export function canMarkVideo(): VideoChoice | null {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null
  return pickVideoType((type) => MediaRecorder.isTypeSupported(type))
}

export interface MarkJob { cancelled: boolean }

/**
 * A clip with the mark: it is played (muted, off screen) into a canvas that is recorded again. `expectedMs` is only for the progress figure.
 * `job.cancelled = true` stops it. Rejects with a MarkFailure; the caller then offers the clip unmarked.
 */
export async function markVideo(clip: Blob, options: MarkOptions, job: MarkJob, expectedMs: number, progress: (secondsLeft: number) => void): Promise<{ blob: Blob; choice: VideoChoice }> {
  const choice = canMarkVideo()
  if (!choice) throw new MarkFailure('unsupported')
  const url = URL.createObjectURL(clip)
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true; video.preload = 'auto'; video.setAttribute('playsinline', ''); video.src = url
  let recorder: MediaRecorder | null = null, stream: MediaStream | null = null
  let frame = 0, callbackId = 0
  const cleanup = (): void => {
    if (frame) cancelAnimationFrame(frame)
    if (callbackId && 'cancelVideoFrameCallback' in video) (video as HTMLVideoElement & { cancelVideoFrameCallback(id: number): void }).cancelVideoFrameCallback(callbackId)
    document.removeEventListener('visibilitychange', onHidden)
    stream?.getTracks().forEach((track) => track.stop())
    video.pause(); video.removeAttribute('src'); video.load()
    URL.revokeObjectURL(url)
  }
  let abort: ((error: MarkFailure) => void) | null = null
  function onHidden(): void { if (document.hidden) abort?.(new MarkFailure('hidden')) }
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new MarkFailure('load_failed')), 10_000)
      video.onloadeddata = () => { clearTimeout(timer); resolve() }
      video.onerror = () => { clearTimeout(timer); reject(new MarkFailure('load_failed')) }
    })
    if (!video.videoWidth || !video.videoHeight) throw new MarkFailure('load_failed')
    const geometry: Frame = frameFor(video.videoWidth, video.videoHeight, options.story, CLIP_MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = geometry.w; canvas.height = geometry.h
    const ctx = context(canvas), text = markText(options.handle)
    const layout = layoutFor(ctx, geometry.w, geometry.h, text, options.story)
    const paint = (): void => { ctx.drawImage(video, geometry.sx, geometry.sy, geometry.sw, geometry.sh, 0, 0, geometry.w, geometry.h); drawMark(ctx, layout, text) }
    paint()
    stream = canvas.captureStream(30)
    recorder = new MediaRecorder(stream, { mimeType: choice.mimeType, videoBitsPerSecond: 3_500_000 })
    const chunks: Blob[] = []
    recorder.addEventListener('dataavailable', (event: BlobEvent) => { if (event.data.size) chunks.push(event.data) })
    const total = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : expectedMs
    const stopped = new Promise<Blob>((resolve, reject) => {
      abort = reject
      recorder?.addEventListener('stop', () => resolve(new Blob(chunks, { type: choice.type })), { once: true })
      recorder?.addEventListener('error', () => reject(new MarkFailure('record_failed')), { once: true })
      video.addEventListener('ended', () => { paint(); setTimeout(() => { if (recorder?.state === 'recording') recorder.stop() }, 80) }, { once: true })
      video.addEventListener('error', () => reject(new MarkFailure('load_failed')), { once: true })
    })
    stopped.catch(() => {})
    document.addEventListener('visibilitychange', onHidden)
    const tick = (): void => {
      if (job.cancelled) { abort?.(new MarkFailure('cancelled')); return }
      paint()
      progress(Math.max(0, Math.ceil((total - video.currentTime * 1000) / 1000)))
      if (video.ended) return
      const withCallback = video as HTMLVideoElement & { requestVideoFrameCallback?(cb: () => void): number }
      if (withCallback.requestVideoFrameCallback) callbackId = withCallback.requestVideoFrameCallback(tick)
      else frame = requestAnimationFrame(tick)
    }
    recorder.start(1000)
    await video.play()
    tick()
    const blob = await stopped
    if (job.cancelled) throw new MarkFailure('cancelled')
    if (!blob.size) throw new MarkFailure('record_failed')
    return { blob, choice }
  } catch (error) {
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop() } catch { /* already stopped */ } }
    throw error instanceof MarkFailure ? error : new MarkFailure('record_failed')
  } finally {
    cleanup()
  }
}

export function markFailureText(code: MarkFailureCode): string {
  switch (code) {
    case 'unsupported': return 'This browser cannot add the corner mark to a video.'
    case 'load_failed': return 'The clip could not be opened to add the mark.'
    case 'record_failed': return 'The marked clip could not be saved.'
    case 'hidden': return 'Keep Allworld open while the clip is prepared. Try again.'
    case 'cancelled': return 'Cancelled.'
  }
}
