/**
 * OWNER: spaces (lite games)
 * The lite renderer: pure 2D-canvas drawing of a lite game (./schema.ts) from a snapshot (./rules.ts). No Vue, no DOM, no I/O, so the
 * live screen and a replay view draw the same way. `unpackLite` reads the snapshot; `packInput` is the engine's input encoding.
 */
import type { LiteGameV1 } from './schema.ts'

export interface LitePlayer { x: number; y: number; lives: number; score: number }
export interface LiteThing { k: number; x: number; y: number }
export interface LiteView { tick: number; seconds: number; players: LitePlayer[]; things: LiteThing[] }

/** Read a snapshot: [tick, secondsLeft, ...players (2 numbers each), ...things (1 number each)]. `seats` is how many players there are. */
export function unpackLite(snapshot: readonly number[], seats: number): LiteView {
  const players: LitePlayer[] = [], things: LiteThing[] = []
  for (let i = 0; i < seats; i++) {
    const a = snapshot[2 + i * 2] ?? 0, b = snapshot[3 + i * 2] ?? 0
    players.push({ x: Math.floor(a / 256), y: a % 256, lives: Math.floor(b / 1000), score: b % 1000 })
  }
  for (let i = 2 + seats * 2; i < snapshot.length; i++) {
    const n = snapshot[i] ?? 0
    things.push({ k: Math.floor(n / 65536), x: Math.floor(n / 256) % 256, y: n % 256 })
  }
  return { tick: snapshot[0] ?? 0, seconds: snapshot[1] ?? 0, players, things }
}

/** dx and dy each -1, 0 or 1, packed as the engine reads them: (dx+1)*3 + (dy+1); 4 is still. */
export const packInput = (dx: number, dy: number): number => (Math.max(-1, Math.min(1, Math.round(dx))) + 1) * 3 + (Math.max(-1, Math.min(1, Math.round(dy))) + 1)

/** Colours for the seats, so players tell apart (yours has a white ring). */
export const LITE_SEAT_COLOURS = ['#f2c14e', '#4aa3ff', '#ff6b6b', '#5be37d', '#c58bff', '#ff9f43', '#2fd6d0', '#f78fb3'] as const

type Ctx = CanvasRenderingContext2D

function shape(ctx: Ctx, kind: 'circle' | 'square', x: number, y: number, size: number): void {
  ctx.beginPath()
  if (kind === 'circle') ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  else ctx.rect(x, y, size, size)
}

function heart(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy + r)
  ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45)
  ctx.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r)
  ctx.fill()
}

/** Draw one frame, the arena fitted and centred in width x height. */
export function drawLite(ctx: Ctx, def: LiteGameV1, snapshot: readonly number[] | null, seatNames: readonly string[], mySeat: number | null, width: number, height: number): void {
  const pal = def.palette
  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, width, height)
  const top = 22, pad = 6
  const scale = Math.max(0.1, Math.min((width - pad * 2) / def.arena.w, (height - top - pad) / def.arena.h))
  const ox = Math.round((width - def.arena.w * scale) / 2), oy = Math.round(top + (height - top - pad - def.arena.h * scale) / 2)
  ctx.fillStyle = pal.ground
  ctx.fillRect(ox, oy, def.arena.w * scale, def.arena.h * scale)
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2
  ctx.strokeRect(ox, oy, def.arena.w * scale, def.arena.h * scale)
  if (!snapshot) return
  const view = unpackLite(snapshot, seatNames.length)
  ctx.save()
  ctx.beginPath(); ctx.rect(ox, oy, def.arena.w * scale, def.arena.h * scale); ctx.clip()
  const colourOf = { hazard: pal.hazard, pickup: pal.pickup, goal: pal.goal, wall: pal.wall } as const
  for (const thing of view.things) {
    const entity = def.entities[thing.k]
    if (!entity) continue
    const s = entity.size * scale, x = ox + thing.x * scale, y = oy + thing.y * scale
    ctx.fillStyle = colourOf[entity.kind]
    shape(ctx, entity.shape, x, y, s)
    ctx.fill()
    if (entity.kind === 'hazard' || entity.kind === 'goal') { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke() }
    const initial = (entity.label ?? entity.id).trim().charAt(0).toUpperCase()
    if (initial && s >= 14) {
      ctx.fillStyle = entity.kind === 'goal' || entity.kind === 'pickup' ? 'rgba(0,0,0,.65)' : 'rgba(255,255,255,.85)'
      ctx.font = `700 ${Math.round(s * 0.55)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(initial, x + s / 2, y + s / 2 + 1)
    }
  }
  const ps = def.player.size * scale
  view.players.forEach((p, i) => {
    if (p.lives <= 0) return
    const x = ox + p.x * scale, y = oy + p.y * scale, colour = i === mySeat ? pal.player : (LITE_SEAT_COLOURS[i % LITE_SEAT_COLOURS.length] as string)
    ctx.fillStyle = colour
    shape(ctx, 'circle', x, y, ps)
    ctx.fill()
    ctx.strokeStyle = i === mySeat ? '#ffffff' : 'rgba(0,0,0,.45)'; ctx.lineWidth = i === mySeat ? 2.5 : 1.5; ctx.stroke()
    const name = (seatNames[i] ?? '').slice(0, 12)
    if (name) {
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      const ty = Math.max(oy + 11, y - 3)
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(name, x + ps / 2, ty)
      ctx.fillStyle = '#ffffff'; ctx.fillText(name, x + ps / 2, ty)
    }
  })
  ctx.restore()
  // Just under the field (the screen's own bar sits over the top of the canvas): seconds left at the right, your hearts and score at the left.
  const below = oy + def.arena.h * scale + 14
  const hud = below + 8 <= height ? below : Math.max(top / 2, oy - 14)
  ctx.textBaseline = 'middle'; ctx.font = '700 14px system-ui, sans-serif'
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'
  ctx.fillText(`${view.seconds}s`, width - pad, hud)
  const me = mySeat != null ? view.players[mySeat] : undefined
  const who = me ?? view.players.slice().sort((a, b) => b.score - a.score)[0]
  if (who) {
    ctx.fillStyle = '#ff5a6e'
    for (let h = 0; h < Math.min(9, who.lives); h++) heart(ctx, pad + 7 + h * 15, hud, 5)
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'
    ctx.fillText(String(who.score), pad + 7 + Math.min(9, who.lives) * 15 + 6, hud)
  }
}
