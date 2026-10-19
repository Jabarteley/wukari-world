/**
 * A duet made into one video on this device, for sharing (docs/SHARE-LOOPS.md): the clip answered on the left, the answer on the right,
 * each filling its half, both playing at once, with the two handles at the top and Capture's @handle mark (captureMark.ts) in the corner. The two clips are the
 * feed's own (same site, so the canvas stays readable); they are played muted into a canvas that is recorded with MediaRecorder, in real
 * time, for as long as the longer clip (at most DUET_MAX_MS). In the feed the duet is two linked posts; this file exists only to share it.
 */
import { pickVideoType } from '../capture/captureShareModel.ts'
import type { VideoChoice } from '../capture/captureShareModel.ts'
import { drawMark, layoutFor } from '../capture/captureMark.ts'
import { coverCrop } from './streetVideoModel.ts'
import { plain } from './loopsModel.ts'

export const DUET_MAX_MS = 16_000
const W = 1280, H = 720
const FONT = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** The two halves of the frame and the words over them. Pure, for the test. */
export function duetLayout(width = W, height = H): { left: { x: number; y: number; w: number; h: number }; right: { x: number; y: number; w: number; h: number }; gap: number } {
  const gap = Math.round(width * 0.006), half = Math.floor((width - gap) / 2)
  return { left: { x: 0, y: 0, w: half, h: height }, right: { x: width - half, y: 0, w: half, h: height }, gap }
}
/** "@ada × @tunde", or the names when there are no handles. */
export function duetTitle(first: { name: string; handle?: string | null }, second: { name: string; handle?: string | null }): string {
  const who = (person: { name: string; handle?: string | null }): string => (person.handle ? `@${plain(person.handle, 20)}` : plain(person.name, 20))
  return `${who(first)} × ${who(second)}`
}

async function loaded(url: string): Promise<HTMLVideoElement> {
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true; video.preload = 'auto'; video.setAttribute('playsinline', ''); video.src = url
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('load_failed')), 15_000)
    video.onloadeddata = () => { clearTimeout(timer); resolve() }
    video.onerror = () => { clearTimeout(timer); reject(new Error('load_failed')) }
  })
  return video
}

/** Records the duet as one clip. Rejects when this browser cannot record a canvas or a clip will not load. */
export async function composeDuet(firstUrl: string, secondUrl: string, title: string, mark: string): Promise<{ blob: Blob; choice: VideoChoice }> {
  const choice = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function' ? pickVideoType((type) => MediaRecorder.isTypeSupported(type)) : null
  if (!choice) throw new Error('unsupported')
  const [first, second] = await Promise.all([loaded(firstUrl), loaded(secondUrl)])
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('unsupported')
  const layout = duetLayout(), markAt = layoutFor(ctx, W, H, mark, false)
  const length = Math.min(DUET_MAX_MS, Math.max(first.duration || 0, second.duration || 0) * 1000 || DUET_MAX_MS)
  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: choice.mimeType, videoBitsPerSecond: 3_000_000 })
  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', (event: BlobEvent) => { if (event.data.size) chunks.push(event.data) })
  let frame = 0
  const half = (video: HTMLVideoElement, box: { x: number; y: number; w: number; h: number }): void => {
    if (video.readyState < 2 || !video.videoWidth) return
    const crop = coverCrop(video.videoWidth, video.videoHeight, box.w, box.h)
    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, box.x, box.y, box.w, box.h)
  }
  const paint = (): void => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
    half(first, layout.left); half(second, layout.right)
    const band = ctx.createLinearGradient(0, 0, 0, 90)
    band.addColorStop(0, 'rgba(0,0,0,.6)'); band.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = band; ctx.fillRect(0, 0, W, 90)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `800 30px ${FONT}`; ctx.fillText(`Duet · ${title}`, W / 2, 44)
    drawMark(ctx, markAt, mark)
    frame = requestAnimationFrame(paint)
  }
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: choice.type })), { once: true })
    recorder.addEventListener('error', () => reject(new Error('record_failed')), { once: true })
  })
  try {
    paint()
    recorder.start(500)
    await Promise.all([first.play(), second.play()]).catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, length))
    if (recorder.state === 'recording') recorder.stop()
    const blob = await done
    if (!blob.size) throw new Error('record_failed')
    return { blob, choice }
  } finally {
    cancelAnimationFrame(frame)
    stream.getTracks().forEach((track) => track.stop())
    for (const video of [first, second]) { video.pause(); video.removeAttribute('src'); video.load() }
  }
}
