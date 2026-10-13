/**
 * OWNER: games (real-time)
 * Draws a FIGHT frame on a 2D canvas: no images, everything is shapes. It is given the two snapshots around the moment to draw
 * (see ./interp.ts), blends them, and paints sky, skyline, ground, two fighters, health bars, the clock, round pips, banners,
 * hit sparks and the screen shake. It decides nothing about the fight.
 */
import { ACT, ARENA_W, BODY_H, MOVES, PHASE, winsNeeded } from './fight.ts'
import type { FightSnap, FighterSnap } from './fight.ts'
import { lerp } from './interp.ts'

export interface FighterColors { skin: string; hair: string; top: string; bottoms: string }
export interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export interface Fx { sparks: Spark[]; shake: number; flash: [number, number]; lastTick: number; /** white KO flash 0..1 and zoom 0..1 */ ko: number }
export interface Meta { names: [string, string]; colors: [FighterColors, FighterColors]; you: number | null; rounds: number; reduced: boolean; /** performance.now() */ time: number; /** the seat that won the match once it is over, 2 for a draw, else -1 */ winner: number; /** the fighter to draw for `you` instead of the blended snapshot (client prediction) */ own?: FighterSnap | null }

export const newFx = (): Fx => ({ sparks: [], shake: 0, flash: [0, 0], lastTick: -1, ko: 0 })

/** Spawn the sparks, shake and flash for this tick's hits (`events` of a snapshot). Call once per snapshot. */
export function spawnHits(fx: Fx, snap: FightSnap, reduced: boolean): void {
  for (const [seat, blocked, strong, x, y] of snap.e as [number, number, number, number, number][]) {
    const n = reduced ? 4 : blocked ? 6 : strong ? 16 : 10
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (blocked ? 2 : 4) + Math.random() * (strong ? 7 : 5)
      fx.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0, max: 8 + Math.random() * 8, color: blocked ? '#9ad0ff' : i % 2 ? '#ffe27a' : '#ff7a3d', size: 2 + Math.random() * 3 })
    }
    if (!reduced) { fx.shake = Math.max(fx.shake, blocked ? 2 : strong ? 9 : 5); fx.flash[seat as 0 | 1] = 4 }
  }
  if (fx.sparks.length > 80) fx.sparks.splice(0, fx.sparks.length - 80)
}

const mix = (a: FighterSnap, b: FighterSnap, t: number): FighterSnap => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), b[2], b[3], b[4], b[5], b[6]]

function skyline(ctx: CanvasRenderingContext2D, w: number, ground: number, cam: number, scale: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, ground)
  g.addColorStop(0, '#1b2559'); g.addColorStop(0.6, '#b4527a'); g.addColorStop(1, '#ffb25c')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, ground)
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(w * 0.78, ground * 0.28, w * 0.05, 0, Math.PI * 2); ctx.fill()
  for (const [layer, color, speed] of [[0, '#4a3a6b', 0.25], [1, '#2a2147', 0.5]] as const) {
    ctx.fillStyle = color
    for (let i = -1; i < 16; i++) {
      const bw = 70 + ((i * 37 + layer * 11) % 5) * 12, bh = 40 + ((i * 53 + layer * 29) % 7) * 14 + layer * 18
      const x = (i * (bw + 8) - cam * speed) * scale
      ctx.fillRect(x, ground - bh * scale * 1.1, bw * scale, bh * scale * 1.1)
      if (layer) { ctx.fillStyle = '#ffd36b'; for (let r = 0; r < 3; r++) ctx.fillRect(x + 8 * scale, ground - bh * scale * 1.1 + (10 + r * 18) * scale, 6 * scale, 8 * scale); ctx.fillStyle = color }
    }
  }
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
}

/** One fighter in local units (feet at 0,0; up is negative; facing +x). */
function person(ctx: CanvasRenderingContext2D, f: FighterSnap, c: FighterColors, walk: number, flash: boolean): void {
  const a = f[3], at = f[4], blocking = (f[6] & 1) !== 0, air = (f[6] & 2) !== 0
  const skin = flash ? '#ffffff' : c.skin, top = flash ? '#ffffff' : c.top, bottoms = flash ? '#ffffff' : c.bottoms
  let lean = 0, extendArm = 0, extendLeg = 0
  if (a === ACT.punch) { const m = MOVES[1]; extendArm = at < m.start ? at / m.start : at < m.start + m.active ? 1 : Math.max(0, 1 - (at - m.start - m.active) / (m.total - m.start - m.active)); lean = 0.1 * extendArm }
  if (a === ACT.kick) { const m = MOVES[2]; extendLeg = at < m.start ? at / m.start : at < m.start + m.active ? 1 : Math.max(0, 1 - (at - m.start - m.active) / (m.total - m.start - m.active)); lean = -0.08 * extendLeg }
  if (a === ACT.hurt) lean = -0.28
  if (a === ACT.ko) { const p = Math.min(1, at / 6); ctx.rotate(-p * 1.45); ctx.translate(0, p * 8) }
  ctx.rotate(lean)
  // legs
  const swing = air ? 0.6 : Math.sin(walk) * 11
  const kickLen = 34 + 50 * extendLeg
  limb(ctx, -5, -46, -5 - swing * (air ? -0.5 : 1), air ? -14 : 0, 11, bottoms)
  if (extendLeg > 0) limb(ctx, 5, -46, 5 + kickLen, -46 + 18 * (1 - extendLeg) + 2, 11, bottoms)
  else limb(ctx, 5, -46, 5 + swing * (air ? 0.4 : 1), air ? -22 : 0, 11, bottoms)
  ctx.fillStyle = '#20232c'
  // torso
  ctx.fillStyle = top; ctx.beginPath(); ctx.roundRect(-14, -92, 28, 48, 8); ctx.fill()
  // back arm
  limb(ctx, -6, -84, blocking ? 12 : -2, blocking ? -86 : -62, 9, skin)
  // head
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(4, -102, 13, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = flash ? '#fff' : c.hair; ctx.beginPath(); ctx.arc(2, -105, 13, Math.PI * 0.95, Math.PI * 2.05); ctx.fill()
  ctx.fillStyle = '#20232c'; ctx.beginPath(); ctx.arc(10, -103, 1.8, 0, Math.PI * 2); ctx.fill()
  if (a === ACT.hurt || a === ACT.ko) { ctx.strokeStyle = '#20232c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, -108); ctx.lineTo(13, -105); ctx.stroke() }
  // front arm
  if (extendArm > 0) limb(ctx, 8, -84, 8 + 14 + 50 * extendArm, -84 - 4 * (1 - extendArm), 10, skin)
  else if (blocking) { limb(ctx, 8, -84, 20, -96, 10, skin); limb(ctx, 20, -96, 22, -112, 10, skin) }
  else limb(ctx, 8, -84, 22, -72, 10, skin)
  if (extendArm > 0.6) { ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(8 + 14 + 50 * extendArm, -84, 6, 0, Math.PI * 2); ctx.fill() }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hp: number, right: boolean): void {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill()
  const fill = Math.max(0, hp / 100) * (w - 4)
  ctx.fillStyle = hp > 50 ? '#52d273' : hp > 25 ? '#ffc247' : '#ff5247'
  ctx.beginPath(); ctx.roundRect(right ? x + w - 2 - fill : x + 2, y + 2, fill, h - 4, (h - 4) / 2); ctx.fill()
}

function banner(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, size: number, color = '#fff'): void {
  ctx.font = `900 ${size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = size / 8; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(text, w / 2, h * 0.38)
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h * 0.38)
}

/** Paint one frame. `a`→`b` are the snapshots around the moment, `t` how far between them. */
export function drawFight(ctx: CanvasRenderingContext2D, w: number, h: number, a: FightSnap, b: FightSnap, t: number, meta: Meta, fx: Fx, dtFrames: number): void {
  let f0 = mix(a.f[0], b.f[0], t), f1 = mix(a.f[1], b.f[1], t)
  if (meta.own && meta.you === 0) f0 = meta.own
  else if (meta.own && meta.you === 1) f1 = meta.own
  // The knock-out: a white flash and a push-in on whoever went down.
  if (b.p === PHASE.ko && b.c <= 1 && !meta.reduced && fx.ko === 0) fx.ko = 1
  const loser = b.f[0][5] <= 0 ? f0[0] : b.f[1][5] <= 0 ? f1[0] : null
  const zoom = b.p === PHASE.ko && loser !== null && !meta.reduced ? Math.max(0, 1 - b.c / 30) : 0
  const gap = Math.abs(f1[0] - f0[0])
  const viewW = Math.max(420, Math.min(ARENA_W, gap + 300)) * (1 - 0.22 * zoom)
  const mid = loser !== null && zoom > 0 ? lerp((f0[0] + f1[0]) / 2, loser, zoom) : (f0[0] + f1[0]) / 2
  const camX = Math.max(0, Math.min(ARENA_W - viewW, mid - viewW / 2))
  const scale = w / viewW, ground = h * 0.84
  const hudH = 54
  ctx.save()
  if (fx.shake > 0.3) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake)
  skyline(ctx, w, ground, camX, scale)
  ctx.fillStyle = '#2b2233'; ctx.fillRect(-20, ground, w + 40, h - ground + 20)
  ctx.fillStyle = '#4b3b52'; ctx.fillRect(-20, ground, w + 40, 4)
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  for (let x = -((camX * scale) % 60); x < w; x += 60) ctx.fillRect(x, ground + (h - ground) * 0.5, 30, 3)
  const sx = (x: number): number => (x - camX) * scale
  const order = f0[3] === ACT.ko ? [1, 0] : [0, 1]
  for (const seat of order) {
    const f = seat ? f1 : f0
    const bob = f[3] === ACT.none && f[1] === 0 && (f[6] & 1) === 0 ? Math.sin(meta.time / 240 + seat * 2) * 1.6 * scale : 0
    const px = sx(f[0]), py = ground - f[1] * scale + bob
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px, ground + 4, 20 * scale * (1 - Math.min(0.5, f[1] / 260)), 5 * scale, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(px, py); ctx.scale((f[2] ? 1 : -1) * scale * 1.0, scale)
    person(ctx, f, meta.colors[seat as 0 | 1], f[0] * 0.14, fx.flash[seat as 0 | 1] > 0 && f[3] === ACT.hurt)
    ctx.restore()
    if (meta.you === seat && b.p !== PHASE.over) { ctx.fillStyle = '#ffe27a'; const ty = py - (BODY_H + 24) * scale; ctx.beginPath(); ctx.moveTo(px - 6, ty - 8); ctx.lineTo(px + 6, ty - 8); ctx.lineTo(px, ty); ctx.fill() }
  }
  for (const s of fx.sparks) {
    ctx.globalAlpha = Math.max(0, 1 - s.life / s.max); ctx.fillStyle = s.color
    ctx.fillRect(sx(s.x + s.vx * s.life * 0.6) - s.size / 2, ground - (s.y + s.vy * s.life * 0.6 - s.life * s.life * 0.12) * scale, s.size, s.size)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  if (fx.ko > 0.01) { ctx.fillStyle = `rgba(255,255,255,${(fx.ko * 0.75).toFixed(3)})`; ctx.fillRect(0, 0, w, h) }
  // advance effects once per drawn frame (in 60 fps frames)
  for (const s of fx.sparks) s.life += dtFrames * 0.75
  fx.sparks = fx.sparks.filter((s) => s.life < s.max)
  fx.ko *= Math.pow(0.9, dtFrames); if (b.p !== PHASE.ko) fx.ko = 0
  fx.shake *= Math.pow(0.82, dtFrames)
  fx.flash[0] = Math.max(0, fx.flash[0] - dtFrames); fx.flash[1] = Math.max(0, fx.flash[1] - dtFrames)

  // HUD
  const pad = 10, half = w / 2 - 34, bh = 14
  bar(ctx, pad, 22, half - pad, bh, b.f[0][5], false)
  bar(ctx, w - half, 22, half - pad, bh, b.f[1][5], true)
  ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'; ctx.fillText(meta.names[0], pad + 2, 16)
  ctx.textAlign = 'right'; ctx.fillText(meta.names[1], w - pad - 2, 16)
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(w / 2, 28, 22, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = b.t <= 10 ? '#ff7a6a' : '#fff'; ctx.font = '800 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.t), w / 2, 29)
  const need = winsNeeded({ rounds: meta.rounds, seconds: 0 })
  for (let i = 0; i < need; i++) {
    for (const side of [0, 1] as const) {
      ctx.fillStyle = b.w[side] > i ? '#ffd34d' : 'rgba(255,255,255,.3)'
      const x = side ? w - pad - 8 - i * 14 : pad + 8 + i * 14
      ctx.beginPath(); ctx.arc(x, 46, 4.5, 0, Math.PI * 2); ctx.fill()
    }
  }
  void hudH
  const s = Math.max(28, Math.min(52, w / 8))
  if (b.p === PHASE.intro) {
    if (b.c < 30) banner(ctx, w, h, `ROUND ${b.r}`, s)
    else banner(ctx, w, h, 'FIGHT!', s * 1.2, '#ffd34d')
  } else if (b.p === PHASE.ko || b.p === PHASE.over) {
    const dead = b.f[0][5] <= 0 || b.f[1][5] <= 0
    banner(ctx, w, h, b.q === 2 ? 'DRAW' : dead ? 'K.O.!' : 'TIME!', s * 1.3, dead ? '#ff6a4d' : '#ffd34d')
    if (b.p === PHASE.over && meta.winner >= 0) {
      const line = meta.winner === 2 ? 'Nobody wins' : `${meta.names[meta.winner as 0 | 1]} wins!`
      ctx.font = `800 ${Math.round(s * 0.62)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(line, w / 2, h * 0.38 + s * 1.1)
      ctx.fillStyle = '#fff'; ctx.fillText(line, w / 2, h * 0.38 + s * 1.1)
    }
  }
}
