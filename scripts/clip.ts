// Render the clip of a finished arena match as video files: the last ten seconds of its replay, drawn frame by frame by the replay
// page (replay.html, src/arena/replay-page.ts) in a headless browser and assembled by FFmpeg. The page steps virtual time (60 frames a
// second), so the video is exact on a slow machine and the same every run. docs/CARTRIDGES.md, "Clips", has the whole guide.
//
//   node --experimental-strip-types scripts/clip.ts --replay r-xxxxxxxxxx [--origin https://joinallworld.com] [--out clips/]
//   node --experimental-strip-types scripts/clip.ts --log match.json --origin http://127.0.0.1:3001     a log saved from the API
//
// Writes <out>/<name>-1080x1920.mp4 (TikTok, Reels, Shorts) and <out>/<name>-720x1280.mp4, held under 2 MB (WhatsApp status).
// Needs FFmpeg on the PATH and playwright-core (not a dependency of the game: `npm i --no-save playwright-core`, then
// `npx playwright-core install chromium` once). --page /replay.html for `npm run dev`; --fps 30 or 60; --all for the whole match.
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const WHATSAPP_BYTES = 2_000_000
export interface ClipOptions { replay: string | null; log: string | null; origin: string; out: string; page: string; fps: 30 | 60; all: boolean; name: string }

export function parseArgs(argv: readonly string[]): ClipOptions | string {
  const get = (flag: string): string | null => { const at = argv.indexOf(flag); return at >= 0 ? argv[at + 1] ?? null : null }
  const replay = get('--replay'), log = get('--log')
  if (!replay && !log) return 'Give --replay <id> or --log <file>.'
  if (replay && !/^r-[a-z0-9]{10}$/.test(replay)) return `Not a replay id: ${replay}`
  const fps = Number(get('--fps') ?? 30)
  if (fps !== 30 && fps !== 60) return '--fps is 30 or 60.'
  const origin = (get('--origin') ?? (replay ? 'https://joinallworld.com' : 'http://127.0.0.1:3001')).replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+$/.test(origin)) return `Not an origin: ${origin}`
  return { replay, log, origin, out: get('--out') ?? 'clips', page: get('--page') ?? '/replay', fps, all: argv.includes('--all'), name: get('--name') ?? (replay ?? 'clip') }
}

/** The page address that draws frame 0 at 1080 wide, 9:16. */
export const pageUrl = (o: Pick<ClipOptions, 'origin' | 'page' | 'replay'>): string => `${o.origin}${o.page}?${o.replay ? `replay=${o.replay}&` : ''}aspect=9x16&w=1080&frame=0`

/** The virtual frames (60 a second) to capture for a video at `fps`: every one at 60, every other at 30. */
export function captureFrames(window: { start: number; count: number }, fps: 30 | 60): number[] {
  const step = 60 / fps, out: number[] = []
  for (let f = window.start; f < window.start + window.count; f += step) out.push(f)
  return out
}

/** FFmpeg reading PNG frames from stdin into an H.264 MP4 that every phone plays. */
export const bigArgs = (fps: number, out: string): string[] => ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out]

/** The video bitrate (kbit/s) that keeps `seconds` of video under `bytes`, with room for the container. */
export const fitKbps = (seconds: number, bytes: number = WHATSAPP_BYTES): number => Math.max(200, Math.floor(((bytes * 0.9 * 8) / Math.max(1, seconds)) / 1000))

/** FFmpeg making the small 720x1280 copy at a fixed bitrate. */
export const smallArgs = (src: string, out: string, kbps: number): string[] => ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.2)}k`, '-bufsize', `${kbps * 2}k`, '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', '+faststart', out]

/** The little of playwright-core this script uses (it is not a dependency of the game, so its types are not here). */
interface PageLike {
  addInitScript(script: string): Promise<void>
  goto(url: string, options: { waitUntil: 'load' }): Promise<unknown>
  waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>
  evaluate<T>(expression: string): Promise<T>
}
interface BrowserLike { newPage(options: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<PageLike>; close(): Promise<void> }
interface PlaywrightLike { chromium: { launch(options: { headless: boolean }): Promise<BrowserLike> } }

function ffmpeg(args: readonly string[]): { stdin: NodeJS.WritableStream; done: Promise<void> } {
  const child = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] })
  const done = new Promise<void>((ok, fail) => { child.on('error', fail); child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`)))) })
  return { stdin: child.stdin, done }
}

async function main(): Promise<number> {
  const o = parseArgs(process.argv.slice(2))
  if (typeof o === 'string') { console.error(o); return 2 }
  let playwright: PlaywrightLike
  const moduleName = 'playwright-core'
  try { playwright = await import(moduleName) as PlaywrightLike } catch { console.error('playwright-core is not installed: npm i --no-save playwright-core && npx playwright-core install chromium'); return 2 }
  const log = o.log ? JSON.parse(readFileSync(resolve(o.log), 'utf8')) as unknown : null
  mkdirSync(o.out, { recursive: true })
  const browser = await playwright.chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 })
    if (log) await page.addInitScript(`window.__ALLWORLD_REPLAY_LOG__ = ${JSON.stringify((log as { log?: unknown }).log ?? log)}`)
    await page.goto(pageUrl(o), { waitUntil: 'load' })
    await page.waitForSelector('body[data-ready="1"]', { timeout: 30_000 })
    const info = await page.evaluate<{ frames: number; clip: { start: number; count: number }; w: number; h: number; verified: boolean }>('(({ frames, clip, w, h, verified }) => ({ frames, clip, w, h, verified }))(window.allworldReplay)')
    if (!info.verified) console.warn('Note: this replay does not reproduce its match exactly (older rules); the clip shows what the rules give now.')
    const frames = captureFrames(o.all ? { start: 0, count: info.frames } : info.clip, o.fps)
    const big = join(o.out, `${o.name}-1080x1920.mp4`), small = join(o.out, `${o.name}-720x1280.mp4`)
    const enc = ffmpeg(bigArgs(o.fps, big))
    for (const f of frames) {
      const data = await page.evaluate<string>(`(window.allworldReplay.draw(${f}), document.querySelector('canvas').toDataURL('image/png').slice(22))`)
      if (!enc.stdin.write(Buffer.from(data, 'base64'))) await new Promise((ok) => enc.stdin.once('drain', ok))
    }
    enc.stdin.end()
    await enc.done
    const seconds = frames.length / o.fps
    let kbps = fitKbps(seconds)
    for (let attempt = 0; attempt < 4; attempt++) {
      await ffmpeg(smallArgs(big, small, kbps)).done
      if (statSync(small).size <= WHATSAPP_BYTES) break
      kbps = Math.floor(kbps * 0.8)
    }
    console.log(`${big}  ${statSync(big).size} bytes, ${info.w}x${info.h}, ${frames.length} frames at ${o.fps} fps`)
    console.log(`${small}  ${statSync(small).size} bytes (${kbps} kbit/s, under ${WHATSAPP_BYTES})`)
    return statSync(small).size <= WHATSAPP_BYTES ? 0 : 1
  } finally { await browser.close() }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main()
