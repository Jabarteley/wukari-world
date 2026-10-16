/**
 * OWNER: games (real-time)
 * THE IN-GAME CLIP: the last ten seconds of a finished match, made on the player's own phone from the replay log. The replay is drawn
 * on a canvas nobody sees (./replay-player.ts) in real time, and the browser's own recorder (MediaRecorder) turns it into a small
 * video, an MP4 where the browser can make one (Chrome on Android, Safari), WebM otherwise. About 1.2 Mbit/s: a ten-second clip is
 * about 1.5 MB, under the 2 MB a WhatsApp status should be on prepaid data. Nothing is uploaded: the file goes to the share sheet.
 * The full-size 1080x1920 version for TikTok is made offline by scripts/clip.ts from the same replay.
 */
import { FRAME_MS } from './replay-frames.ts'
import type { ReplayPlayer } from './replay-player.ts'

/** The formats to try, best first. */
export const CLIP_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] as const
export const CLIP_BITS = 1_200_000
export const CLIP_SIZE = { w: 720, h: 1280 } as const

/** The first format this browser can record, or null when it cannot record a canvas at all. */
export function pickClipType(supported: (type: string) => boolean): string | null {
  for (const type of CLIP_TYPES) { try { if (supported(type)) return type } catch { /* a browser that throws on the question cannot answer it */ } }
  return null
}
/** The file name and extension for a recorded type. */
export const clipFileName = (game: string, type: string): string => `allworld-${game.replace(/[^a-z]/g, '') || 'clip'}.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`

/** Can this browser make a clip? (A canvas stream and a recorder that takes one of CLIP_TYPES.) */
export function canRecordClips(): boolean {
  const Rec = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder
  return typeof Rec?.isTypeSupported === 'function' && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && pickClipType((t) => Rec.isTypeSupported!(t)) !== null
}

/** Record the player's clip window. `progress` is told 0..1 as it goes. Resolves with the file, or null when recording failed. */
export function recordClip(player: ReplayPlayer, game: string, progress: (done: number) => void = () => {}): Promise<File | null> {
  const type = pickClipType((t) => MediaRecorder.isTypeSupported(t))
  if (!type) return Promise.resolve(null)
  const { w, h } = CLIP_SIZE
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  const { start, count } = player.clip
  player.draw(ctx, w, h, start)
  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: CLIP_BITS })
  const parts: Blob[] = []
  recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data) }
  return new Promise((done) => {
    let t0 = 0, stopped = false
    const stop = (): void => { if (stopped) return; stopped = true; try { recorder.stop() } catch { done(null) } }
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop()
      done(parts.length ? new File(parts, clipFileName(game, type), { type: type.split(';')[0] as string }) : null)
    }
    recorder.onerror = () => { stopped = true; done(null) }
    const tick = (now: number): void => {
      if (stopped) return
      if (!t0) t0 = now
      const n = Math.floor((now - t0) / FRAME_MS)
      player.draw(ctx, w, h, start + Math.min(n, count - 1))
      progress(Math.min(1, n / count))
      if (n >= count) stop(); else requestAnimationFrame(tick)
    }
    recorder.start(500)
    requestAnimationFrame(tick)
  })
}
