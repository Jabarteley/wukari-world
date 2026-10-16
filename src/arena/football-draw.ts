/**
 * OWNER: games (real-time)
 * Draws a FOOTBALL frame on a 2D canvas: no images, everything is shapes. The pitch, stands and crowd are painted once into an
 * offscreen canvas (`makePitch`) and copied each frame; each frame adds the players, ball, keepers, effects and scoreboard.
 * It is given the two snapshots around the moment to draw (./interp.ts) and decides nothing about the match.
 *
 * VIEW. World units (./football.ts, pitch 900 x 540) plus a margin: OX for the goals, TOP/BOTTOM for stands. Everything scales
 * from the canvas width, so one drawing serves a 320 px phone and a desktop.
 */
import { EV, GOAL_DEPTH, GOAL_Y1, GOAL_Y2, H, PEN_D, PHASE, PR, SO_OUT, SO_STAGE, W, flightProgress, shotHeight, swungAim } from './football.ts'
import type { FootballSnap, FootballerSnap, ShootSnap } from './football.ts'
import { lerp } from './interp.ts'

/** Players and ball are drawn a little larger than the rules' sizes so they read on a phone. */
const VS = 1.9
export const OX = 44, TOP = 46, BOTTOM = 30
export const VIEW_W = W + OX * 2, VIEW_H = H + TOP + BOTTOM

export interface Kit { shirt: string; trim: string; shorts: string; name: string }
export interface Look { skin: string; hair: string }
export interface Meta {
  /** names to show over players: '' for a computer-played one */ names: string[]
  /** kit per team (0 attacks right) */ kits: [Kit, Kit]
  /** skin and hair per player */ looks: Look[]
  you: number | null
  reduced: boolean
  /** where the own player is drawn (light prediction), world units */ own?: { x: number; y: number } | null
  teamNames: [string, string]
  /** a tall canvas: the pitch is turned so the goals are at the top and bottom */ portrait: boolean
  /** show the whole pitch (lobby, full time) instead of following the play */ overview?: boolean
}
export const KITS: [Kit, Kit] = [
  { shirt: '#0a8f3c', trim: '#ffffff', shorts: '#ffffff', name: 'Green' },
  { shirt: '#f3c20f', trim: '#1b1b1b', shorts: '#1b1b1b', name: 'Yellow' },
]

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; spin: number }
export interface Fx { parts: Particle[]; shake: number; goalAt: number; goalTeam: number; run: number[]; prev: number[]; flash: number; lastPhase: number; cx: number; cy: number }
export const newFx = (): Fx => ({ parts: [], shake: 0, goalAt: -1, goalTeam: -1, run: [], prev: [], flash: 0, lastPhase: -1, cx: NaN, cy: NaN })

/** Spawn the effects of one snapshot's events. Call once per snapshot, when its moment is reached. */
export function spawnEvents(fx: Fx, snap: FootballSnap, reduced: boolean): void {
  for (const [code, x, y, extra] of snap.e as [number, number, number, number][]) {
    if (code === EV.goal) {
      fx.goalAt = performance.now(); fx.goalTeam = extra; fx.flash = 1
      const n = reduced ? 20 : 90, gx = extra === 0 ? W : 0
      const colors = ['#ffffff', '#0a8f3c', '#f3c20f', '#ff5a36', '#38bdf8']
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 7
        fx.parts.push({ x: gx + (extra === 0 ? -30 : 30), y: H / 2 + (Math.random() - 0.5) * 80, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 40 + Math.random() * 40, color: colors[i % colors.length] as string, size: 3 + Math.random() * 4, spin: Math.random() * 6 })
      }
      if (!reduced) fx.shake = 10
    } else if (code === EV.tackle) {
      for (let i = 0; i < (reduced ? 3 : 9); i++) fx.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0, max: 12 + Math.random() * 8, color: '#d9c9a0', size: 3 + Math.random() * 3, spin: 0 })
      if (!reduced) fx.shake = Math.max(fx.shake, 4)
    } else if (code === EV.kick) {
      const n = extra ? 8 : 4
      for (let i = 0; i < (reduced ? 2 : n); i++) fx.parts.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0, max: 8 + Math.random() * 6, color: extra ? '#fff3b0' : '#ffffff', size: 2 + Math.random() * 2, spin: 0 })
    } else if (code === EV.post || code === EV.save) {
      for (let i = 0; i < (reduced ? 2 : 6); i++) fx.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0, max: 10, color: code === EV.post ? '#ffffff' : '#7dd3fc', size: 2.5, spin: 0 })
      if (!reduced && code === EV.post) fx.shake = Math.max(fx.shake, 3)
    }
  }
  if (fx.parts.length > 160) fx.parts.splice(0, fx.parts.length - 160)
}

// ---- the pitch (painted once) --------------------------------------------------------------------------------------

function rng(seed: number): () => number { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }

/** Paint stands, crowd, billboards, grass stripes, lines and goals. `scale` is canvas pixels per view unit. */
export function makePitch(width: number, height: number, scale: number): HTMLCanvasElement {
  const el = document.createElement('canvas')
  el.width = Math.round(width); el.height = Math.round(height)
  const c = el.getContext('2d') as CanvasRenderingContext2D
  c.scale(scale, scale)
  c.fillStyle = '#12301d'; c.fillRect(0, 0, VIEW_W, VIEW_H)
  // stands: top and bottom, rows of supporters in green, white and the odd yellow
  const r = rng(7), palette = ['#0a8f3c', '#ffffff', '#ffffff', '#0a8f3c', '#f3c20f', '#1f6f3a', '#e9efe9', '#c8352b']
  const stand = (y0: number, y1: number): void => {
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#1c3b2a'); g.addColorStop(1, '#2d5a3f')
    c.fillStyle = g; c.fillRect(0, y0, VIEW_W, y1 - y0)
    for (let y = y0 + 6; y < y1 - 4; y += 7) for (let x = 5 + (y & 4); x < VIEW_W; x += 9) {
      c.fillStyle = palette[Math.floor(r() * palette.length)] as string
      c.beginPath(); c.arc(x + r() * 3, y + r() * 2, 2.6, 0, Math.PI * 2); c.fill()
    }
  }
  stand(0, TOP - 14); stand(TOP + H + 12, VIEW_H)
  // advertising boards along both touchlines
  c.font = '800 11px system-ui, sans-serif'; c.textBaseline = 'middle'
  const boards = ['ALLWORLD', 'NAIJA', 'LAGOS', 'ONIKAN', 'ALLWORLD', 'NAIJA', 'LAGOS', 'ONIKAN']
  for (const by of [TOP - 14, TOP + H + 4]) {
    c.fillStyle = '#0b1f14'; c.fillRect(OX, by, W, 10)
    boards.forEach((word, i) => { c.fillStyle = i % 2 ? '#ffffff' : '#41d37a'; c.fillText(word, OX + 10 + i * (W / boards.length), by + 5) })
  }
  // grass: alternating mowing stripes
  const stripe = W / 12
  for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#2f8f46' : '#369c4e'; c.fillRect(OX + i * stripe, TOP, stripe + 0.5, H) }
  c.fillStyle = '#255f35'; c.fillRect(0, TOP, OX, H); c.fillRect(OX + W, TOP, OX, H)
  c.save(); c.translate(OX, TOP)
  c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = 3; c.lineJoin = 'round'
  c.strokeRect(0, 0, W, H)
  c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke()
  c.beginPath(); c.arc(W / 2, H / 2, 62, 0, Math.PI * 2); c.stroke()
  c.fillStyle = '#fff'; c.beginPath(); c.arc(W / 2, H / 2, 4, 0, Math.PI * 2); c.fill()
  for (const side of [0, 1]) {
    const x0 = side ? W : 0, dir = side ? -1 : 1
    c.strokeRect(side ? W - PEN_D - 20 : 0, H / 2 - 135, PEN_D + 20, 270)
    c.strokeRect(side ? W - 48 : 0, GOAL_Y1 - 22, 48, GOAL_Y2 - GOAL_Y1 + 44)
    c.beginPath(); c.arc(x0 + dir * PEN_D, H / 2, 3, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(x0 + dir * (PEN_D + 20), H / 2, 46, side ? Math.PI * 0.62 : -Math.PI * 0.38, side ? Math.PI * 1.38 : Math.PI * 0.38); c.stroke()
    // net behind the line
    const nx = side ? W : -GOAL_DEPTH
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(nx, GOAL_Y1, GOAL_DEPTH, GOAL_Y2 - GOAL_Y1)
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1
    for (let x = 0; x <= GOAL_DEPTH; x += 9) { c.beginPath(); c.moveTo(nx + x, GOAL_Y1); c.lineTo(nx + x, GOAL_Y2); c.stroke() }
    for (let y = GOAL_Y1; y <= GOAL_Y2; y += 9) { c.beginPath(); c.moveTo(nx, y); c.lineTo(nx + GOAL_DEPTH, y); c.stroke() }
    c.strokeStyle = '#ffffff'; c.lineWidth = 4
    c.strokeRect(nx, GOAL_Y1, GOAL_DEPTH, GOAL_Y2 - GOAL_Y1)
    c.fillStyle = '#ffffff'
    for (const py of [GOAL_Y1, GOAL_Y2]) { c.beginPath(); c.arc(x0, py, 5, 0, Math.PI * 2); c.fill() }
    c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = 3
    for (const cy of [0, H]) { c.beginPath(); c.arc(x0, cy, 14, side ? (cy ? Math.PI : Math.PI * 0.5) : (cy ? Math.PI * 1.5 : 0), side ? (cy ? Math.PI * 1.5 : Math.PI) : (cy ? Math.PI * 2 : Math.PI * 0.5)); c.stroke() }
  }
  c.restore()
  return el
}

// ---- players ---------------------------------------------------------------------------------------------------------

const mixFootballer = (a: FootballerSnap | undefined, b: FootballerSnap, t: number): FootballerSnap => (a ? [lerp(a[0], b[0], t), lerp(a[1], b[1], t), b[2], b[3]] : b)
const NUMBERS = ['9', '7']

/** Rotation of the view for a viewer: own side always attacks UP (portrait) or RIGHT (landscape). Spectators look as team 0. */
export const viewRotation = (you: number | null, portrait: boolean): number => {
  const team = you === null ? 0 : you & 1
  return portrait ? (team === 0 ? -Math.PI / 2 : Math.PI / 2) : (team === 0 ? 0 : Math.PI)
}
/** In a shoot-out the view looks from behind the shooter at the goal, whoever you are: the shooter's team attacks up the screen. */
export const penaltyRotation = (shootingTeam: number): number => (shootingTeam === 0 ? -Math.PI / 2 : Math.PI / 2)
/** The turn that maps the player's screen directions to pitch directions now: your view of open play, or a shoot-out's. */
export const stickRotation = (you: number | null, portrait: boolean, snap: FootballSnap | null): number => (snap && snap.p === PHASE.pens && snap.o ? penaltyRotation(snap.o.t) : viewRotation(you, portrait))
/** A heading on the screen (joystick, arrows) as the vector in pitch coordinates. */
export const screenToWorld = (vx: number, vy: number, rot: number): [number, number] => [vx * Math.cos(rot) + vy * Math.sin(rot), -vx * Math.sin(rot) + vy * Math.cos(rot)]

function player(c: CanvasRenderingContext2D, f: FootballerSnap, kit: Kit, look: Look, run: number, mine: boolean, label: string, number: string, rot: number, reduced: boolean, carrier: boolean): void {
  const st = f[3], sliding = (st & 1) !== 0, stunned = (st & 2) !== 0, charge = (st >> 2) & 7
  c.save()
  c.translate(f[0], f[1])
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(1, 3, PR * VS * 0.95, PR * VS * 0.7, 0, 0, Math.PI * 2); c.fill()
  if (mine) {
    c.fillStyle = 'rgba(255,225,77,0.28)'; c.strokeStyle = '#ffe14d'; c.lineWidth = 3
    c.beginPath(); c.arc(0, 0, PR * VS + 3, 0, Math.PI * 2); c.fill(); c.stroke()
  }
  c.scale(VS, VS)
  c.rotate(f[2] * Math.PI / 12)
  if (stunned && !reduced && Math.floor(performance.now() / 90) % 2) c.globalAlpha = 0.55
  const swing = sliding ? 0 : Math.sin(run) * 6
  c.lineCap = 'round'
  if (sliding) {
    c.strokeStyle = kit.shorts; c.lineWidth = 6; c.beginPath(); c.moveTo(-4, -3); c.lineTo(15, -3); c.moveTo(-4, 3); c.lineTo(13, 4); c.stroke()
    c.fillStyle = '#111'; c.beginPath(); c.arc(17, -3, 3.2, 0, Math.PI * 2); c.arc(15, 4, 3.2, 0, Math.PI * 2); c.fill()
  } else {
    c.strokeStyle = kit.shorts; c.lineWidth = 6.5
    c.beginPath(); c.moveTo(0, -4); c.lineTo(swing, -5); c.moveTo(0, 4); c.lineTo(-swing, 5); c.stroke()
    c.fillStyle = '#111'; c.beginPath(); c.arc(swing + 2, -5, 3.2, 0, Math.PI * 2); c.arc(-swing + 2, 5, 3.2, 0, Math.PI * 2); c.fill()
  }
  c.fillStyle = kit.shirt; c.beginPath(); c.ellipse(sliding ? -3 : 0, 0, 7.5, 12.5, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = kit.trim; c.fillRect(-7, -1.6, 14, 3.2)
  c.strokeStyle = look.skin; c.lineWidth = 3.6
  c.beginPath(); c.moveTo(0, -11); c.lineTo(-swing * 0.6 + 2, -13.5); c.moveTo(0, 11); c.lineTo(swing * 0.6 + 2, 13.5); c.stroke()
  c.fillStyle = look.skin; c.beginPath(); c.arc(sliding ? -3 : 1, 0, 6, 0, Math.PI * 2); c.fill()
  c.fillStyle = look.hair; c.beginPath(); c.arc(sliding ? -3 : 1, 0, 6.2, Math.PI * 0.5, Math.PI * 1.5); c.fill()
  // direction notch in front of the body
  c.globalAlpha = 1
  c.fillStyle = '#ffffff'; c.strokeStyle = '#10261a'; c.lineWidth = 1.2
  c.beginPath(); c.moveTo(18, 0); c.lineTo(13, -4.2); c.lineTo(13, 4.2); c.closePath(); c.fill(); c.stroke()
  c.restore()
  // upright text: the shirt number on the chest, a name tag for people
  c.save(); c.translate(f[0], f[1]); c.rotate(-rot)
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.font = '900 11px system-ui, sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(8,20,13,0.85)'; c.strokeText(number, 0, 0); c.fillStyle = '#ffffff'; c.fillText(number, 0, 0)
  if (carrier) {
    // an arrow over whoever has the ball, in his kit colour
    c.fillStyle = kit.shirt; c.strokeStyle = '#ffffff'; c.lineWidth = 3
    c.beginPath(); c.moveTo(0, -PR * VS - 3); c.lineTo(-9, -PR * VS - 18); c.lineTo(9, -PR * VS - 18); c.closePath(); c.stroke(); c.fill()
  }
  if (label) { c.font = '800 11px system-ui, sans-serif'; const ly = -PR * VS - (carrier ? 28 : 11); c.strokeText(label, 0, ly); c.fillStyle = mine ? '#ffe14d' : '#ffffff'; c.fillText(label, 0, ly) }
  if (charge > 0) {
    c.strokeStyle = charge > 5 ? '#ff4d2e' : charge > 2 ? '#ffb020' : '#ffffff'; c.lineWidth = 4
    c.beginPath(); c.arc(0, 0, PR * VS + 8, -Math.PI / 2, -Math.PI / 2 + (charge / 7) * Math.PI * 2); c.stroke()
  }
  c.restore()
}

function keeper(c: CanvasRenderingContext2D, team: number, y: number): void {
  const x = team === 0 ? 24 : W - 24
  c.save(); c.translate(x, y); c.scale(VS, VS)
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(1, 3, 13, 15, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = team === 0 ? '#ff7a1a' : '#7c3aed'; c.beginPath(); c.ellipse(0, 0, 8, 14, 0, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#f2f2f2'; c.lineWidth = 4; c.lineCap = 'round'
  const s = team === 0 ? 1 : -1
  c.beginPath(); c.moveTo(0, -12); c.lineTo(s * 6, -19); c.moveTo(0, 12); c.lineTo(s * 6, 19); c.stroke()
  c.fillStyle = '#6b4a35'; c.beginPath(); c.arc(s * 1, 0, 6, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#1c1c1c'; c.beginPath(); c.arc(0, 0, 6.2, s > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s > 0 ? Math.PI * 1.5 : Math.PI * 0.5); c.fill()
  c.restore()
}

function ball(c: CanvasRenderingContext2D, x: number, y: number, speed: number, vx: number, vy: number): void {
  const R = 10.5
  // halo so the ball is never lost against the grass or a shirt
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5
  c.beginPath(); c.arc(x, y, R * 1.75, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x + 2, y + 3, R, R * 0.75, 0, 0, Math.PI * 2); c.fill()
  if (speed > 12) { c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - vx * 1.4, y - vy * 1.4); c.stroke() }
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#111'; c.lineWidth = 1.6; c.stroke()
  c.fillStyle = '#111'
  const a = (x + y) / 9
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + Math.cos(a + i * 2.1) * 5.6, y + Math.sin(a + i * 2.1) * 5.6, 2.5, 0, Math.PI * 2); c.fill() }
}

const clampTo = (v: number, lo: number, hi: number): number => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)))

// ---- the frame -------------------------------------------------------------------------------------------------------

/**
 * Draw one frame in canvas PIXELS (`width` x `height`). `a`/`b` are the snapshots around the moment and `t` the way from a to b.
 * The pitch is turned (see `viewRotation`) and a camera follows you and the ball when the whole pitch would be too small.
 */
export function drawFootball(ctx: CanvasRenderingContext2D, width: number, height: number, pitch: HTMLCanvasElement | null, a: FootballSnap | null, b: FootballSnap | null, t: number, meta: Meta, fx: Fx, dt: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#12301d'; ctx.fillRect(0, 0, width, height)
  if (!b) return
  const rot = viewRotation(meta.you, meta.portrait)
  const rotated = meta.portrait
  const sw = rotated ? VIEW_H : VIEW_W, sh = rotated ? VIEW_W : VIEW_H
  const fit = Math.min(width / sw, height / sh)
  // Close in: about 62% of the pitch's short side across the screen, so a footballer is ~50 px on a phone; the camera follows the play.
  const scale = meta.overview ? fit : Math.max(fit, (rotated ? width / sw : height / sh) / 0.62)
  const from = a ?? b

  // positions of everyone for this frame
  const fs: FootballerSnap[] = b.f.map((fb, p) => {
    let f = mixFootballer(from.f[p], fb, t)
    if (meta.you === p && meta.own) f = [meta.own.x, meta.own.y, f[2], f[3]]
    return f
  })
  const bx0 = from.b[0], by0 = from.b[1]
  let bx = lerp(bx0, b.b[0], t), by = lerp(by0, b.b[1], t)
  const vx = (b.b[0] - bx0) / 3, vy = (b.b[1] - by0) / 3
  if (meta.own && meta.you !== null && b.b[2] === meta.you + 1) {
    const fo = b.f[meta.you]
    if (fo) { const ang = fo[2] * Math.PI / 12; bx = meta.own.x + Math.cos(ang) * 27; by = meta.own.y + Math.sin(ang) * 27 }
  }

  // camera: between you and the ball (the ball only, for a spectator), kept inside the view
  const hxs = width / (2 * scale), hys = height / (2 * scale)
  const hvx = rotated ? hys : hxs, hvy = rotated ? hxs : hys
  const me = meta.you !== null ? fs[meta.you] : undefined
  let tx = OX + (me ? me[0] * 0.5 + bx * 0.5 : bx), ty = TOP + (me ? me[1] * 0.5 + by * 0.5 : by)
  if (me) {
    const px = OX + me[0], py = TOP + me[1]
    if (Math.abs(px - tx) > hvx * 0.78) tx = px - Math.sign(px - tx) * hvx * 0.78
    if (Math.abs(py - ty) > hvy * 0.78) ty = py - Math.sign(py - ty) * hvy * 0.78
  }
  tx = clampTo(tx, hvx, VIEW_W - hvx); ty = clampTo(ty, hvy, VIEW_H - hvy)
  if (Number.isNaN(fx.cx)) { fx.cx = tx; fx.cy = ty } else { const k = Math.min(1, 0.16 * dt); fx.cx += (tx - fx.cx) * k; fx.cy += (ty - fx.cy) * k }
  const zoomed = hvx * 2 < VIEW_W - 1 || hvy * 2 < VIEW_H - 1

  ctx.save()
  const shk = fx.shake > 0.3 ? fx.shake * scale : 0
  ctx.translate(width / 2 + (shk ? (Math.random() - 0.5) * shk : 0), height / 2 + (shk ? (Math.random() - 0.5) * shk : 0))
  ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-fx.cx, -fx.cy)
  if (pitch) ctx.drawImage(pitch, 0, 0, VIEW_W, VIEW_H)
  ctx.translate(OX, TOP)

  const list: { y: number; draw: () => void }[] = []
  fs.forEach((f, p) => {
    const prev = fx.prev[p]
    const moved = prev === undefined ? 0 : Math.hypot(f[0] - prev, f[1] - (fx.prev[p + 20] ?? f[1]))
    fx.prev[p] = f[0]; fx.prev[p + 20] = f[1]
    fx.run[p] = (fx.run[p] ?? 0) + Math.min(moved, 12) * 0.34
    const kit = meta.kits[p & 1] as Kit
    const look = meta.looks[p] ?? { skin: '#8a5a3c', hair: '#1c1c1c' }
    list.push({ y: f[1], draw: () => player(ctx, f, kit, look, fx.run[p] as number, meta.you === p, meta.names[p] ?? '', NUMBERS[p >> 1] ?? '8', rot, meta.reduced, b.b[2] === p + 1) })
  })
  keeper(ctx, 0, lerp(from.k[0], b.k[0], t)); keeper(ctx, 1, lerp(from.k[1], b.k[1], t))
  list.sort((p, q) => p.y - q.y)
  for (const item of list) item.draw()
  ball(ctx, bx, by, Math.hypot(vx, vy), vx, vy)
  for (let i = fx.parts.length - 1; i >= 0; i--) {
    const p = fx.parts[i] as Particle
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 + (p.spin ? 0.12 : 0)
    if (p.life >= p.max) { fx.parts.splice(i, 1); continue }
    ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color
    if (p.spin) ctx.fillRect(p.x, p.y, p.size, p.size * 0.6); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.globalAlpha = 1
  fx.shake *= 0.85
  ctx.restore()

  // the ball is off screen: an arrow at the edge points to it
  {
    const dxv = OX + bx - fx.cx, dyv = TOP + by - fx.cy
    const sxp = width / 2 + (dxv * Math.cos(rot) - dyv * Math.sin(rot)) * scale, syp = height / 2 + (dxv * Math.sin(rot) + dyv * Math.cos(rot)) * scale
    const m = 22
    if (sxp < m || sxp > width - m || syp < m || syp > height - m) {
      const ex = Math.max(m, Math.min(width - m, sxp)), ey = Math.max(m, Math.min(height - m, syp))
      const ang = Math.atan2(syp - height / 2, sxp - width / 2)
      ctx.save(); ctx.translate(ex, ey)
      ctx.fillStyle = 'rgba(8,24,15,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill()
      ctx.rotate(ang); ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(14, -7); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  }

  // radar: the whole pitch, shown while the camera is closer than that
  if (zoomed) {
    const long = Math.max(84, Math.min(130, Math.min(width, height) * 0.3)), k = long / W
    const rw = rotated ? H * k : W * k, rh = rotated ? W * k : H * k
    ctx.save()
    ctx.translate(width - rw / 2 - 8, rh / 2 + 8 + 52) // +52: below the stage's floating buttons (ArenaStage.vue)
    ctx.fillStyle = 'rgba(8,24,15,0.62)'; ctx.fillRect(-rw / 2 - 3, -rh / 2 - 3, rw + 6, rh + 6)
    ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2)
    ctx.fillStyle = '#2f8f46'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, W, H)
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-14, GOAL_Y1, 14, GOAL_Y2 - GOAL_Y1); ctx.fillRect(W, GOAL_Y1, 14, GOAL_Y2 - GOAL_Y1)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 5
    ctx.strokeRect(fx.cx - OX - hvx, fx.cy - TOP - hvy, hvx * 2, hvy * 2)
    fs.forEach((f, p) => { ctx.fillStyle = (meta.kits[p & 1] as Kit).shirt; ctx.beginPath(); ctx.arc(f[0], f[1], meta.you === p ? 30 : 22, 0, Math.PI * 2); ctx.fill(); if (meta.you === p) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 9; ctx.stroke() } })
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, 17, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke()
    ctx.restore()
  }

  drawFootballHud(ctx, width, height, b, meta, fx)
}

export interface HudLabel { x: number; y: number; p: number; carrier: boolean; you: boolean; scale: number }
export interface HudExtras {
  /** the 3D view's players on screen (names, number, the carrier's arrow, the charge ring) */ labels?: HudLabel[]
  /** the top of the free space, px: bars and rows start under it */ hudTop?: number
  /** where your shot would go, px (shoot-out, when you are the shooter), and whether it is inside the posts */ aim?: { x: number; y: number; inside: boolean } | null
  /** the dive you have named (-1 left, 1 right, 0 stay) when you are the keeper in a shoot-out; null otherwise */ dive?: number | null
  /** the 3D view is showing the goal again */ replay?: boolean
}

const shoutBox = (ctx: CanvasRenderingContext2D, width: number, height: number, text: string, sub: string, color: string, pulse: number, at = 0.47): void => {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, height * (at - 0.09), width, height * 0.24)
  const size = Math.max(22, Math.min(width * 0.2, height * 0.2) * pulse)
  ctx.font = `900 ${size}px system-ui, sans-serif`; ctx.lineWidth = Math.max(3, size / 9); ctx.strokeStyle = '#0b1f14'; ctx.strokeText(text, width / 2, height * at)
  ctx.fillStyle = color; ctx.fillText(text, width / 2, height * at)
  ctx.font = `800 ${Math.max(12, Math.min(width * 0.05, 22))}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText(sub, width / 2, height * (at + 0.09))
  ctx.restore()
}
const caption = (ctx: CanvasRenderingContext2D, width: number, text: string, y: number): void => {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = '800 15px system-ui, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,20,13,0.9)'; ctx.strokeText(text, width / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(text, width / 2, y)
  ctx.restore()
}
const OUT_WORDS: Record<number, [string, string, string]> = {
  [SO_OUT.goal]: ['GOAL!', 'It is in', '#7dff9b'], [SO_OUT.saved]: ['SAVED!', 'What a stop', '#7dd3fc'], [SO_OUT.wide]: ['WIDE!', 'Just off target', '#ffb4a8'],
  [SO_OUT.over]: ['OVER!', 'Too hard', '#ffb4a8'], [SO_OUT.post]: ['POST!', 'So close', '#ffe14d'],
}

/**
 * The scoreboard row of a shoot-out: for each team its kit colour, its kicks so far (a dot each: green for a goal, red for a miss,
 * a ring for one to come; five to begin with, more in sudden death) and its score.
 */
export function drawShootRow(ctx: CanvasRenderingContext2D, width: number, top: number, o: ShootSnap, meta: { teamNames: [string, string]; kits: [Kit, Kit] }): void {
  const dots = Math.max(5, o.m[0].length + (o.m[0].length < 10 ? 1 : 0), o.m[1].length + (o.m[1].length < 10 ? 1 : 0)), gap = 17
  const rowW = 78 + dots * gap + 30, w = Math.min(width - 16, rowW), x0 = (width - w) / 2
  ctx.save()
  ctx.fillStyle = 'rgba(8,24,15,0.7)'; ctx.beginPath(); ctx.roundRect(x0, top, w, 52, 12); ctx.fill()
  ;[0, 1].forEach((team) => {
    const y = top + 14 + team * 24, marks = o.m[team] as number[]
    ctx.fillStyle = (meta.kits[team] as Kit).shirt; ctx.beginPath(); ctx.roundRect(x0 + 8, y - 8, 6, 16, 3); ctx.fill()
    ctx.font = (o.t === team && o.s !== SO_STAGE.result ? '900' : '700') + ' 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'; ctx.fillText((meta.teamNames[team as 0 | 1]).slice(0, 8), x0 + 20, y)
    for (let i = 0; i < dots; i++) {
      const cx = x0 + 78 + i * gap + 6, m = marks[i]
      ctx.beginPath(); ctx.arc(cx, y, 5.5, 0, Math.PI * 2)
      if (m === 1) { ctx.fillStyle = '#41d37a'; ctx.fill() }
      else if (m === 2) { ctx.fillStyle = '#ef6a5b'; ctx.fill() }
      else { ctx.strokeStyle = o.t === team && i === marks.length && o.w < 0 ? '#ffe14d' : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.stroke() }
    }
    ctx.textAlign = 'right'; ctx.font = '900 15px system-ui, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(String(o.g[team]), x0 + w - 8, y)
  })
  ctx.restore()
}

/**
 * Everything the 2D canvas draws over the match, whichever view drew the pitch: the banners (GOAL, the kick-off count, full time),
 * the shoot-out's row, its instructions and its results, and (with the 3D view) the names, the carrier's arrow and the charge ring.
 */
export function drawFootballHud(ctx: CanvasRenderingContext2D, width: number, height: number, b: FootballSnap, meta: Meta, fx: Fx, extra: HudExtras = {}): void {
  const you = meta.you, top = extra.hudTop ?? 52
  if (extra.labels) {
    for (const l of extra.labels) {
      const f = b.f[l.p]
      if (!f) continue
      const name = meta.names[l.p] ?? '', charge = (f[3] >> 2) & 7, k = Math.max(0.7, Math.min(1.25, l.scale / 90))
      ctx.save(); ctx.translate(l.x, l.y); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,20,13,0.85)'
      if (l.carrier) {
        ctx.fillStyle = (meta.kits[l.p & 1] as Kit).shirt; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-8 * k, -17 * k); ctx.lineTo(8 * k, -17 * k); ctx.closePath(); ctx.stroke(); ctx.fill()
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,20,13,0.85)'
      }
      const tag = name || (l.you ? 'YOU' : '')
      if (tag) {
        // A pill in the team's colour, so a side is told apart by its tags as well as by its shirts and rings.
        const kit = meta.kits[l.p & 1] as Kit, size = Math.round(11 * k + 1), ly = -(l.carrier ? 27 : 12) * k
        ctx.font = `800 ${size}px system-ui, sans-serif`
        const pw = ctx.measureText(tag).width + 14, ph = size + 6
        ctx.fillStyle = kit.shirt; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.roundRect(-pw / 2, ly - ph / 2, pw, ph, ph / 2); ctx.fill()
        ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = l.you ? '#ffe14d' : 'rgba(8,20,13,0.7)'; ctx.stroke()
        ctx.fillStyle = kit.trim; ctx.fillText(tag, 0, ly + 0.5)
      }
      if (charge > 0) {
        ctx.strokeStyle = charge > 5 ? '#ff4d2e' : charge > 2 ? '#ffb020' : '#ffffff'; ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(0, l.scale * 0.5 + 6, 14 * k, -Math.PI / 2, -Math.PI / 2 + (charge / 7) * Math.PI * 2); ctx.stroke()
      }
      ctx.restore()
    }
  }
  const o = b.o
  if (b.p === PHASE.goal && extra.replay) {
    ctx.save(); ctx.font = '900 14px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(8,24,15,0.72)'; ctx.beginPath(); ctx.roundRect(14, top + 12, 96, 30, 15); ctx.fill()
    ctx.fillStyle = Math.floor(performance.now() / 500) % 2 ? '#ff5a4a' : '#ffb4a8'; ctx.beginPath(); ctx.arc(32, top + 27, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.fillText('REPLAY', 46, top + 28)
    ctx.restore()
  } else if (b.p === PHASE.goal) {
    const team = b.s?.[0] ?? 0, who = b.s ? (b.s[1] ?? -1) : -1
    const scorer = who >= 0 ? (meta.names[who] ?? '') : ''
    shoutBox(ctx, width, height, 'GOAL!', `${scorer ? scorer + ' scores!' : (meta.teamNames[team] ?? '') + ' score!'}  ${b.g[0]}-${b.g[1]}`, (meta.kits[team] ?? meta.kits[0]).shirt === '#f3c20f' ? '#ffe14d' : '#7dff9b', meta.reduced ? 1 : 1 + Math.sin(performance.now() / 110) * 0.06, extra.labels ? (width > height ? 0.36 : 0.2) : 0.47)
    if (fx.flash > 0.02 && !meta.reduced) { ctx.fillStyle = `rgba(255,255,255,${fx.flash * 0.35})`; ctx.fillRect(0, 0, width, height); fx.flash *= 0.88 }
  } else if (b.p === PHASE.kickoff && b.c > 0) {
    shoutBox(ctx, width, height, String(b.c), you !== null ? 'Get ready. Kick-off!' : 'Kick-off', '#ffffff', 1, 0.8)
  } else if (o && (b.p === PHASE.pens || b.p === PHASE.over)) {
    drawShootRow(ctx, width, top + 4, o, meta)
    const mine = you !== null && (you & 1) === o.t, shooterYou = you !== null && you === o.p[0], keeperYou = you !== null && you === o.p[1]
    const first = o.m[0].length + o.m[1].length === 0
    if (b.p === PHASE.over) {
      const w = o.w
      shoutBox(ctx, width, height, w === 2 ? 'DRAW' : 'FULL TIME', w >= 0 && w < 2 ? `${meta.teamNames[w]} win on penalties ${Math.max(...o.g)}-${Math.min(...o.g)}` : `${meta.teamNames[0]} ${b.g[0]} - ${b.g[1]} ${meta.teamNames[1]}`, '#ffe14d', 0.8, 0.45)
    } else if (o.s === SO_STAGE.set) {
      if (first) shoutBox(ctx, width, height, 'PENALTIES', `${meta.teamNames[o.t]} shoot first`, '#ffffff', 0.7, 0.3)
      else caption(ctx, width, `${meta.teamNames[o.t]} to shoot`, top + 74)
    } else if (o.s === SO_STAGE.aim) {
      caption(ctx, width, shooterYou ? 'Aim, hold to charge, let go' : keeperYou ? 'Pick a side to dive' : mine ? 'Your side shoots' : 'Waiting for the kick', top + 74)
      if (shooterYou && extra.aim) {
        ctx.save(); ctx.lineWidth = 3.5; ctx.strokeStyle = extra.aim.inside ? '#ffffff' : '#ff6b5e'; ctx.fillStyle = extra.aim.inside ? 'rgba(255,255,255,0.18)' : 'rgba(255,107,94,0.2)'
        ctx.beginPath(); ctx.arc(extra.aim.x, extra.aim.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(extra.aim.x - 22, extra.aim.y); ctx.lineTo(extra.aim.x - 8, extra.aim.y); ctx.moveTo(extra.aim.x + 8, extra.aim.y); ctx.lineTo(extra.aim.x + 22, extra.aim.y); ctx.stroke()
        ctx.restore()
      }
    } else if (o.s === SO_STAGE.result) {
      const w = OUT_WORDS[o.r]
      if (w) shoutBox(ctx, width, height, w[0], w[1], w[2], meta.reduced ? 1 : 1 + Math.sin(performance.now() / 120) * 0.05, 0.3)
    }
    if (keeperYou && (o.s === SO_STAGE.aim || o.s === SO_STAGE.fly) && extra.dive !== null && extra.dive !== undefined) {
      const d = extra.dive
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 34px system-ui, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,20,13,0.9)'
      for (const side of [-1, 0, 1]) {
        const x = width / 2 + side * Math.min(110, width * 0.28), glyph = side < 0 ? '\u25C0' : side > 0 ? '\u25B6' : '\u25A0'
        ctx.globalAlpha = d === side ? 1 : 0.28; ctx.strokeText(glyph, x, top + 108); ctx.fillStyle = d === side ? '#ffe14d' : '#ffffff'; ctx.fillText(glyph, x, top + 108)
      }
      ctx.restore()
    }
  } else if (b.p === PHASE.over) {
    shoutBox(ctx, width, height, b.g[0] === b.g[1] ? 'DRAW' : 'FULL TIME', `${meta.teamNames[0]} ${b.g[0]} - ${b.g[1]} ${meta.teamNames[1]}`, '#ffe14d', 0.8)
  }
}

/**
 * The 2D view of a shoot-out (used when there is no 3D view): the goal seen face on from behind the shooter, with the keeper in it,
 * the ball flying at it, and the shooter's back at the bottom. Right of the screen is right of the shooter, as in the 3D view.
 */
/** Draw in CSS px: the caller has set the canvas transform for its pixel ratio. */
export function drawShootout2D(ctx: CanvasRenderingContext2D, width: number, height: number, a: FootballSnap, b: FootballSnap, t: number, meta: Meta, extra: { top: number; bottom: number }): { aim: (lateral: number) => { x: number; y: number }; goalHalf: number } | null {
  const o = b.o
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#0d1530'); sky.addColorStop(0.42, '#2a3d5e'); sky.addColorStop(0.43, '#2f8f46'); sky.addColorStop(1, '#1f6a34')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height)
  if (!o) return null
  const team = o.t, sg = team === 0 ? 1 : -1
  const free = Math.max(120, height - extra.top - extra.bottom), cy = extra.top + free * 0.42
  const gw = Math.min(width * 0.78, free * 1.3), gh = gw * 0.34, gx = width / 2, half = gw / 2, per = half / 70 // px per lateral unit
  const gy = cy - gh / 2
  // goal: posts, bar, net
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(gx - half, gy, gw, gh)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1
  for (let i = 0; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(gx - half + (gw / 14) * i, gy); ctx.lineTo(gx - half + (gw / 14) * i, gy + gh); ctx.stroke() }
  for (let i = 0; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(gx - half, gy + (gh / 5) * i); ctx.lineTo(gx + half, gy + (gh / 5) * i); ctx.stroke() }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(gx - half, gy + gh); ctx.lineTo(gx - half, gy); ctx.lineTo(gx + half, gy); ctx.lineTo(gx + half, gy + gh); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, gy + gh, width, 3)
  const lateral = (units: number): number => gx + units * per
  // keeper
  const kt = (1 - team) as 0 | 1, ky = (a.k[kt] + (b.k[kt] - a.k[kt]) * t - H / 2) * sg
  const kx = lateral(ky), kh = gh * 0.74, dive = o.s >= SO_STAGE.fly ? o.k[2] : 0
  ctx.save(); ctx.translate(kx, gy + gh); ctx.rotate(dive * Math.min(1, Math.abs(ky) / 40) * 1.1)
  ctx.fillStyle = '#a77fe3'; ctx.fillRect(-kh * 0.17, -kh * 0.62, kh * 0.34, kh * 0.45)
  ctx.strokeStyle = '#a77fe3'; ctx.lineWidth = kh * 0.1; ctx.beginPath(); ctx.moveTo(-kh * 0.2, -kh * 0.5); ctx.lineTo(-kh * 0.42, -kh * 0.82); ctx.moveTo(kh * 0.2, -kh * 0.5); ctx.lineTo(kh * 0.42, -kh * 0.82); ctx.moveTo(-kh * 0.08, -kh * 0.17); ctx.lineTo(-kh * 0.1, 0); ctx.moveTo(kh * 0.08, -kh * 0.17); ctx.lineTo(kh * 0.1, 0); ctx.stroke()
  ctx.fillStyle = '#f0c9a0'; ctx.beginPath(); ctx.arc(0, -kh * 0.72, kh * 0.12, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // the ball: on the spot until struck, then towards the goal
  const spotY = Math.min(height - extra.bottom - 40, cy + free * 0.42)
  const p = o.s === SO_STAGE.fly ? flightProgress(o.k[3], o.k[4], o.k[5]) : o.s === SO_STAGE.result ? 1 : 0
  const lat = o.s >= SO_STAGE.fly ? swungAim(o.k[0], o.k[1]) : 0
  const bxp = gx + (lateral(lat) - gx) * p, up = shotHeight(p, o.k[1]) * (gh / 2.0)
  const byp = spotY + (gy + gh - spotY) * p - up, br = (16 - 9 * p)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bxp, spotY + (gy + gh - spotY) * p + 2, br, br * 0.35, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bxp, byp, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // the shooter's back
  const kit = meta.kits[team] as Kit
  const sx = gx - 52, sy = spotY + 6
  ctx.fillStyle = kit.shorts; ctx.fillRect(sx - 12, sy + 8, 24, 20); ctx.fillStyle = kit.shirt; ctx.fillRect(sx - 15, sy - 26, 30, 36)
  ctx.fillStyle = (meta.looks[o.p[0]] ?? { skin: '#8a5a3c' }).skin; ctx.beginPath(); ctx.arc(sx, sy - 36, 11, 0, Math.PI * 2); ctx.fill()
  return { aim: (l: number) => ({ x: lateral(l), y: gy + gh * 0.5 }), goalHalf: half }
}