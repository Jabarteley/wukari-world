/**
 * Records the childhood-street dive on this device (docs/SHARE-LOOPS.md). The entry page's own backdrop (src/map3d/entry-dive.ts: the
 * atlas from space to the country to the city, and the dive host's clouds) plays in a box on screen; this file copies each frame of the
 * atlas's canvas into a phone-story frame, paints the clouds over it as the dive host moves them, writes the caption at the top and
 * Capture's @handle mark in the corner (captureMark.ts), and records that with MediaRecorder (the same video types as Capture, captureShareModel.ts pickVideoType).
 *
 * The atlas draws with WebGL and does not keep its picture between frames, so its frames are taken from the canvas's own stream
 * (captureStream) through a muted video element rather than read back. Nothing is uploaded; the file exists only on this device.
 */
import { pickVideoType } from '../capture/captureShareModel.ts'
import type { VideoChoice } from '../capture/captureShareModel.ts'
import { drawMark, layoutFor } from '../capture/captureMark.ts'
import { STORY_H, STORY_W, wrapLines } from './loopsModel.ts'
import { cloudMotion, coverCrop } from './streetVideoModel.ts'

const FONT = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
/** The recording is half the story size: a real-time encode on a phone. */
const OUT_W = STORY_W / 2, OUT_H = STORY_H / 2

export type StreetFailure = 'unsupported' | 'no_canvas' | 'record_failed' | 'cancelled'
export class StreetVideoError extends Error {
  readonly code: StreetFailure
  constructor(code: StreetFailure) { super(code); this.code = code; this.name = 'StreetVideoError' }
}

/** Can this browser record a canvas at all? */
export function canRecordStreet(): VideoChoice | null {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null
  return pickVideoType((type) => MediaRecorder.isTypeSupported(type))
}

export interface StreetRecording { done: Promise<{ blob: Blob; choice: VideoChoice }>; cancel(): void }

/**
 * Starts recording what is in `box` for `ms`. The atlas canvas may appear a moment after the box is given (the maps load): it is looked for
 * on every frame, and until it is there the frame is the night sky with the caption.
 */
export function recordStreet(box: HTMLElement, caption: string, mark: string, ms: number): StreetRecording {
  const choice = canRecordStreet()
  if (!choice) return { done: Promise.reject(new StreetVideoError('unsupported')), cancel() {} }
  const out = document.createElement('canvas')
  out.width = OUT_W; out.height = OUT_H
  const ctx = out.getContext('2d')
  if (!ctx) return { done: Promise.reject(new StreetVideoError('unsupported')), cancel() {} }
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '')
  let source: HTMLCanvasElement | null = null, sourceStream: MediaStream | null = null, cloud: HTMLImageElement | null = null, cloudUrl = ''
  let frame = 0, stopped = false
  const stream = out.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: choice.mimeType, videoBitsPerSecond: 2_500_000 })
  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', (event: BlobEvent) => { if (event.data.size) chunks.push(event.data) })
  // Capture's own corner mark, placed as for a phone story (lifted clear of the story apps' buttons).
  const markAt = layoutFor(ctx, OUT_W, OUT_H, mark, true)
  const captionLines = (() => { ctx.font = `800 40px ${FONT}`; return wrapLines(caption, OUT_W - 60, (line) => ctx.measureText(line).width, 2) })()

  function attach(): void {
    const found = box.querySelector<HTMLCanvasElement>('canvas.atlas-canvas') ?? box.querySelector('canvas')
    if (!found || found === source || typeof found.captureStream !== 'function') return
    source = found
    sourceStream?.getTracks().forEach((track) => track.stop())
    try { sourceStream = found.captureStream(30); video.srcObject = sourceStream; void video.play().catch(() => undefined) } catch { sourceStream = null }
  }
  /** The dive host's clouds: their picture (a data address it painted once) and how it shows them now. */
  function clouds(): void {
    const left = box.querySelector<HTMLElement>('.dv-cloud.dv-left'), right = box.querySelector<HTMLElement>('.dv-cloud.dv-right'), veil = box.querySelector<HTMLElement>('.dv-veil')
    if (!left || !right || veil?.hidden) return
    const url = /url\("?([^")]+)"?\)/.exec(left.style.backgroundImage)?.[1] ?? ''
    if (url && url !== cloudUrl) { cloudUrl = url; cloud = new Image(); cloud.src = url }
    const cover = Number(left.style.opacity || '0')
    if (!(cover > 0.01)) return
    ctx!.save()
    ctx!.globalAlpha = Math.min(1, cover)
    // Each half covers the whole frame and drifts sideways as the clouds part (the sign of the drift is in its own transform).
    for (const half of [left, right]) {
      const { shift, scale } = cloudMotion(half.style.transform)
      const w = OUT_W * scale, h = OUT_H * scale, x = (OUT_W - w) / 2 + (shift / 100) * OUT_W, y = (OUT_H - h) / 2
      if (cloud?.complete && cloud.naturalWidth) ctx!.drawImage(cloud, x, y, w, h)
      else { ctx!.fillStyle = '#eef2f5'; ctx!.fillRect(x, y, w, h) }
    }
    ctx!.restore()
  }
  function paint(): void {
    if (stopped) return
    attach()
    ctx!.fillStyle = '#0b1530'; ctx!.fillRect(0, 0, OUT_W, OUT_H)
    if (source && video.readyState >= 2 && video.videoWidth) {
      const crop = coverCrop(video.videoWidth, video.videoHeight, OUT_W, OUT_H)
      ctx!.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, OUT_W, OUT_H)
    }
    clouds()
    // The caption on a soft band at the top.
    const band = ctx!.createLinearGradient(0, 0, 0, 200)
    band.addColorStop(0, 'rgba(0,0,0,.55)'); band.addColorStop(1, 'rgba(0,0,0,0)')
    ctx!.fillStyle = band; ctx!.fillRect(0, 0, OUT_W, 200)
    ctx!.fillStyle = '#ffffff'; ctx!.textAlign = 'center'; ctx!.textBaseline = 'alphabetic'; ctx!.shadowColor = '#000a'; ctx!.shadowBlur = 10
    captionLines.forEach((line, index) => { ctx!.font = `800 40px ${FONT}`; ctx!.fillText(line, OUT_W / 2, 80 + index * 48) })
    ctx!.shadowBlur = 0
    drawMark(ctx!, markAt, mark)
    frame = requestAnimationFrame(paint)
  }
  let cancel: () => void = () => {}
  const done = new Promise<{ blob: Blob; choice: VideoChoice }>((resolve, reject) => {
    const finish = (): void => {
      stopped = true
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      sourceStream?.getTracks().forEach((track) => track.stop())
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
    recorder.addEventListener('stop', () => { finish(); const blob = new Blob(chunks, { type: choice.type }); if (blob.size) resolve({ blob, choice }); else reject(new StreetVideoError('record_failed')) }, { once: true })
    recorder.addEventListener('error', () => { finish(); reject(new StreetVideoError('record_failed')) }, { once: true })
    cancel = () => { if (stopped) return; finish(); chunks.length = 0; try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* stopped */ } reject(new StreetVideoError('cancelled')) }
    const timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, ms)
  })
  done.catch(() => undefined)
  paint()
  recorder.start(500)
  return { done, cancel: () => cancel() }
}
