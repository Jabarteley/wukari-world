/**
 * OWNER: games (real-time)
 * THE REPLAY PAGE (replay.html, served at /replay, entered through ./replay-page.ts): a finished arena match played again from its log, for a link shared to a chat
 * and for the clip renderer. Its own small entry: nothing of the game's first download is loaded here, and nothing here is in it.
 *
 *   /replay?replay=r-xxxxxxxxxx                 watch: plays from the start in real time, then "Watch again" / "Play Allworld".
 *   /replay?replay=r-xxxxxxxxxx&aspect=9x16     the shape to draw (default: the screen's own, 9x16 on a phone).
 *        &w=1080                                pixel width of the drawing (240..2160; default: the screen's).
 *        &frame=0                               STEPPING: draw that one frame and wait. `window.allworldReplay.draw(f)` draws
 *                                               frame f (60 a second of virtual time); `frames` and `clip` say what there is.
 *                                               scripts/clip.ts uses this to capture a clip frame by frame on any machine.
 * The log comes from GET /api/arena/replay/:id, or from `window.__ALLWORLD_REPLAY_LOG__` set before the page runs (the
 * renderer's offline mode). Public names and the AI mark only (server/routes/arena.ts).
 */
import { arenaGame } from './registry.ts'
import { cartridgeOf } from './cartridges.ts'
import { parseReplay } from './replay.ts'
import type { ReplayLog } from './replay.ts'
import { aspectSize, FRAME_MS } from './replay-frames.ts'
import { replayPlayer } from './replay-player.ts'
import type { ReplayPlayer } from './replay-player.ts'

declare global {
  interface Window {
    __ALLWORLD_REPLAY_LOG__?: unknown
    allworldReplay?: { frames: number; clip: { start: number; count: number }; w: number; h: number; verified: boolean; draw(frame: number): void }
  }
}

const main = document.getElementById('replay') as HTMLElement
const params = new URLSearchParams(location.search)
const say = (text: string): void => { main.replaceChildren(Object.assign(document.createElement('p'), { textContent: text, style: 'padding:24px' })) }

async function loadLog(): Promise<ReplayLog | null> {
  if (window.__ALLWORLD_REPLAY_LOG__) return parseReplay(window.__ALLWORLD_REPLAY_LOG__)
  const id = params.get('replay') ?? ''
  if (!/^r-[a-z0-9]{10}$/.test(id)) return null
  const res = await fetch(`/api/arena/replay/${id}`, { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  return parseReplay(((await res.json()) as { log?: unknown }).log)
}

function sizeOf(): { w: number; h: number } {
  const portrait = innerHeight >= innerWidth
  const aspect = params.get('aspect') ?? (portrait ? '9x16' : '16x9')
  const screenW = Math.round(Math.min(innerWidth, portrait ? innerWidth : innerHeight * 16 / 9) * Math.min(2, devicePixelRatio || 1))
  const wanted = Number(params.get('w')) || screenW
  return aspectSize(aspect, wanted) ?? aspectSize('9x16', wanted) ?? { w: 720, h: 1280 }
}

function stepping(player: ReplayPlayer, ctx: CanvasRenderingContext2D, w: number, h: number, first: number): void {
  window.allworldReplay = { frames: player.frames, clip: player.clip, w, h, verified: player.verified, draw: (frame) => player.draw(ctx, w, h, frame) }
  player.draw(ctx, w, h, first)
  document.body.dataset.ready = '1'
}

function watch(player: ReplayPlayer, ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const bar = document.createElement('p')
  bar.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:12px'
  const again = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Watch again' })
  const play = Object.assign(document.createElement('a'), { href: '/?ref=replay', textContent: 'Play Allworld' })
  for (const el of [again, play]) el.style.cssText = 'padding:12px 20px;border-radius:999px;border:0;font:700 16px system-ui;text-decoration:none;cursor:pointer;' + (el === play ? 'background:#ffd166;color:#14161c' : 'background:#fff;color:#14161c')
  bar.append(again, play)
  const note = Object.assign(document.createElement('p'), { textContent: player.verified ? `${player.caption.players}. ${player.caption.result}.` : `${player.caption.players}. ${player.problem}`, style: 'text-align:center;margin:0 16px;opacity:.85;font-size:14px' })
  main.append(note, bar)
  let t0 = 0, raf = 0
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const loop = (now: number): void => {
    if (!t0) t0 = now
    const frame = reduced ? player.frames - 1 : Math.floor((now - t0) / FRAME_MS)
    player.draw(ctx, w, h, Math.min(frame, player.frames - 1))
    if (frame < player.frames - 1) raf = requestAnimationFrame(loop)
  }
  again.addEventListener('click', () => { cancelAnimationFrame(raf); t0 = 0; raf = requestAnimationFrame(loop) })
  raf = requestAnimationFrame(loop)
}

async function run(): Promise<void> {
  const log = await loadLog().catch(() => null)
  if (!log) { say('That replay is not on any more. Replays are kept for a week.'); return }
  const rules = arenaGame(log.game), cartridge = cartridgeOf(log.game)
  const player = rules && cartridge ? replayPlayer(rules, log, cartridge.rev) : null
  if (!player) { say('This replay is of a game this page cannot show.'); return }
  const { w, h } = sizeOf()
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${player.caption.title}: ${player.caption.players}. ${player.caption.result}.`)
  canvas.style.cssText = 'display:block;margin:0 auto;max-width:100vw;max-height:calc(100vh - 110px);width:auto;height:auto;aspect-ratio:' + `${w}/${h}`
  const ctx = canvas.getContext('2d')
  if (!ctx) { say('This browser cannot draw the replay.'); return }
  main.replaceChildren(canvas)
  document.title = `${player.caption.title}: ${player.caption.players} · Allworld`
  const frame = params.get('frame')
  if (frame !== null) stepping(player, ctx, w, h, Math.max(0, Math.floor(Number(frame)) || 0))
  else watch(player, ctx, w, h)
}

export const start = (): Promise<void> => run()
