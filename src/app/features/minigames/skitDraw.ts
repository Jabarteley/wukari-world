// Draws a skit (src/minigames/skit.ts) on a canvas: a backdrop, up to four stylised figures in the game's poses, the title card, the caption bar and the end
// card. The same function paints the live preview and every frame of the recording, so what is previewed is what is recorded. No sound is involved anywhere.
import { BACKDROPS, frameAt, hueOf } from '../../../minigames/skit.ts'
import type { Skit, SkitFrame, SkitPose } from '../../../minigames/skit.ts'
import { H, W, roundRect, wrap } from './cardKit.ts'
import type { Paint } from './cardKit.ts'

const SKIN = ['#f1c9a5', '#d9a679', '#b97c4f', '#8d5524', '#6f4429', '#4a2f1d']
const FLOOR_Y = H * 0.74

interface Pose { armL: [number, number]; armR: [number, number]; legL: number; legR: number; lean: number; bob: number; sit?: boolean; prop?: 'desk' | 'plate' | 'phone' }
const up = Math.PI * 0.82

/** Joint angles of a pose at time `t` seconds. Arm: [shoulder angle from straight down, elbow bend]; positive swings outwards. */
function limbsFor(pose: SkitPose, t: number): Pose {
  const s = (hz: number, amount = 1): number => Math.sin(t * Math.PI * 2 * hz) * amount
  switch (pose) {
    case 'wave': return { armL: [0.15, 0.1], armR: [up, 0.5 + s(2.2, 0.5)], legL: 0.1, legR: -0.1, lean: 0, bob: s(1, 2) }
    case 'dance': return { armL: [up - 0.3 + s(2, 0.45), 0.5], armR: [up - 0.3 - s(2, 0.45), 0.5], legL: 0.25 + s(2, 0.2), legR: -0.25 + s(2, 0.2), lean: s(2, 0.12), bob: Math.abs(s(2, 12)) }
    case 'sit': return { armL: [0.5, 1.1], armR: [-0.5, 1.1], legL: 0.35, legR: -0.35, lean: 0, bob: s(0.6, 1.5), sit: true }
    case 'work': return { armL: [0.9, 1.2 + s(5, 0.15)], armR: [-0.9, 1.2 - s(5, 0.15)], legL: 0.15, legR: -0.15, lean: 0.05, bob: s(0.7, 1), sit: true, prop: 'desk' }
    case 'eat': return { armL: [0.5, 1.0], armR: [-1.9 - s(1.4, 0.35), 2.0], legL: 0.12, legR: -0.12, lean: 0, bob: s(1.4, 1.5), prop: 'plate' }
    case 'phone': return { armL: [0.15, 0.1], armR: [-up + 0.1, 2.2], legL: 0.12, legR: -0.12, lean: -0.05, bob: s(0.8, 1.5), prop: 'phone' }
    case 'relax': return { armL: [2.3, 1.6], armR: [-2.3, 1.6], legL: 0.1, legR: -0.28, lean: -0.1, bob: s(0.5, 1.5) }
    case 'walk': return { armL: [s(2.2, 0.5), 0.2], armR: [-s(2.2, 0.5), 0.2], legL: s(2.2, 0.5), legR: -s(2.2, 0.5), lean: 0.03, bob: Math.abs(s(2.2, 5)) }
    case 'jog': return { armL: [s(3.4, 0.8), 1.0], armR: [-s(3.4, 0.8), 1.0], legL: s(3.4, 0.75), legR: -s(3.4, 0.75), lean: 0.12, bob: Math.abs(s(3.4, 9)) }
    default: return { armL: [0.14, 0.08], armR: [-0.14, 0.08], legL: 0.1, legR: -0.1, lean: 0, bob: s(0.8, 2) }
  }
}

function limb(ctx: Paint, x: number, y: number, upper: number, lower: number, angle: number, bend: number, width: number, colour: string, hand?: string): [number, number] {
  const ex = x + Math.sin(angle) * upper, ey = y + Math.cos(angle) * upper
  const hx = ex + Math.sin(angle + bend * Math.sign(angle || 1)) * lower, hy = ey + Math.cos(angle + bend * Math.sign(angle || 1)) * lower
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke()
  if (hand) { ctx.fillStyle = hand; ctx.beginPath(); ctx.arc(hx, hy, width * 0.62, 0, Math.PI * 2); ctx.fill() }
  return [hx, hy]
}

/** One figure, feet at (x, FLOOR_Y), `h` tall. */
function figure(ctx: Paint, x: number, h: number, pose: SkitPose, t: number, id: string, name: string): void {
  const hue = hueOf(id), skin = SKIN[hueOf(`${id}|skin`) % SKIN.length]!, shirt = `hsl(${hue} 65% 52%)`, trousers = `hsl(${(hue + 200) % 360} 30% 28%)`
  const p = limbsFor(pose, t), u = h / 10, drop = p.sit ? u * 2.4 : 0
  const footY = FLOOR_Y, hipY = footY - u * 4.4 + drop - p.bob * 0.4, shoulderY = hipY - u * 3, headY = shoulderY - u * 1.55
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, footY + 4, u * 2.2, u * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  if (p.sit) { ctx.fillStyle = '#6b4a2b'; roundRect(ctx, x - u * 2, hipY + u * 0.5, u * 4, u * 0.7, 6); ctx.fill(); ctx.fillRect(x - u * 1.7, hipY + u * 1.1, u * 0.4, footY - hipY - u); ctx.fillRect(x + u * 1.3, hipY + u * 1.1, u * 0.4, footY - hipY - u) }
  ctx.translate(x, hipY); ctx.rotate(p.lean); ctx.translate(-x, -hipY)
  // legs, then body, then arms and head
  limb(ctx, x - u * 0.7, hipY, u * 2.2, u * 2.2, p.legL, p.sit ? -0.1 : 0.18, u * 1.05, trousers, skin)
  limb(ctx, x + u * 0.7, hipY, u * 2.2, u * 2.2, p.legR, p.sit ? 0.1 : -0.18, u * 1.05, trousers, skin)
  ctx.fillStyle = shirt; roundRect(ctx, x - u * 1.3, shoulderY, u * 2.6, hipY - shoulderY + u * 0.4, u * 0.7); ctx.fill()
  if (p.prop === 'desk') { ctx.fillStyle = '#7a5230'; ctx.fillRect(x - u * 2.8, hipY - u * 0.4, u * 5.6, u * 0.55); ctx.fillStyle = '#2b2f36'; roundRect(ctx, x - u * 1.2, hipY - u * 1.5, u * 2.4, u * 1.15, 6); ctx.fill() }
  limb(ctx, x - u * 1.3, shoulderY + u * 0.5, u * 1.6, u * 1.5, p.armL[0], p.armL[1], u * 0.85, shirt, skin)
  const hand = limb(ctx, x + u * 1.3, shoulderY + u * 0.5, u * 1.6, u * 1.5, p.armR[0], p.armR[1], u * 0.85, shirt, skin)
  if (p.prop === 'phone') { ctx.fillStyle = '#111'; roundRect(ctx, hand[0] - u * 0.25, hand[1] - u * 0.8, u * 0.5, u * 0.9, 4); ctx.fill() }
  if (p.prop === 'plate') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - u * 2.5, shoulderY + u * 2.7, u * 0.9, u * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(x - u * 2.5, shoulderY + u * 2.5, u * 0.35, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, headY, u * 1.15, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `hsl(${hue} 30% 16%)`; ctx.beginPath(); ctx.arc(x, headY - u * 0.25, u * 1.18, Math.PI, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x - u * 0.4, headY, u * 0.1, 0, Math.PI * 2); ctx.arc(x + u * 0.4, headY, u * 0.1, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = u * 0.1; ctx.beginPath(); ctx.arc(x, headY + u * 0.25, u * 0.35, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()
  ctx.restore()
  ctx.font = `700 ${Math.max(20, Math.round(u * 1.1))}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; const tag = name.slice(0, 14), width = ctx.measureText(tag).width + 24
  roundRect(ctx, x - width / 2, footY + 16, width, Math.max(34, u * 1.6), 14); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.fillText(tag, x, footY + 22)
}

function backdrop(ctx: Paint, id: string, t: number): void {
  const spec = BACKDROPS.find((entry) => entry.id === id) ?? BACKDROPS[1]!
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y); sky.addColorStop(0, spec.sky[0]); sky.addColorStop(1, spec.sky[1])
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, FLOOR_Y)
  if (id === 'street' || id === 'market') for (let i = 0; i < 6; i++) { const w = 90 + (i * 37) % 60, hgt = 200 + (i * 71) % 220; ctx.fillStyle = id === 'street' ? `hsl(${210 + i * 8} 20% ${36 + (i % 3) * 6}%)` : `hsl(${20 + i * 14} 45% ${40 + (i % 3) * 6}%)`; ctx.fillRect(i * 125 - 10, FLOOR_Y - hgt, w, hgt) }
  if (id === 'market') for (let i = 0; i < 9; i++) { ctx.fillStyle = ['#e8590c', '#f59f00', '#2f9e44', '#1971c2'][i % 4]!; ctx.fillRect(i * 82, 340, 82, 52) }
  if (id === 'home') { ctx.fillStyle = '#fff6e6'; roundRect(ctx, 80, 300, 200, 240, 8); ctx.fill(); ctx.fillStyle = '#9ad1f0'; ctx.fillRect(100, 320, 160, 200); ctx.fillStyle = '#c0392b'; ctx.fillRect(470, FLOOR_Y - 190, 190, 190) }
  if (id === 'rooftop') { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(520, 420, 70, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 7; i++) { ctx.fillStyle = '#1b1830'; ctx.fillRect(i * 110, FLOOR_Y - 150 - (i * 53) % 130, 80, 400) } }
  if (id === 'stage') for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,255,255,${0.07 + 0.04 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.moveTo(90 + i * 180, 0); ctx.lineTo(i * 180, FLOOR_Y); ctx.lineTo(180 + i * 180, FLOOR_Y); ctx.closePath(); ctx.fill() }
  if (id === 'beach') { ctx.fillStyle = '#2d9cdb'; ctx.fillRect(0, FLOOR_Y - 150, W, 100); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(120, 250, 56, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = spec.floor; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, FLOOR_Y, W, 8)
}

function captionBar(ctx: Paint, text: string): void {
  if (!text) return
  ctx.font = '700 40px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  const rows = wrap(ctx, text, W - 160, 3), height = rows.length * 52 + 36, y = 1040
  ctx.fillStyle = 'rgba(8,10,14,0.78)'; roundRect(ctx, 48, y, W - 96, height, 24); ctx.fill()
  ctx.fillStyle = '#ffffff'; rows.forEach((row, at) => ctx.fillText(row, W / 2, y + 18 + at * 52, W - 140))
}

function card(ctx: Paint, skit: Skit, kind: 'title' | 'end', alpha: number): void {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(10,12,18,0.88)'; ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 38px system-ui, sans-serif'; ctx.fillText(kind === 'title' ? 'A skit' : 'The end', W / 2, 430)
  ctx.fillStyle = '#ffffff'; ctx.font = '800 66px system-ui, sans-serif'
  wrap(ctx, skit.title || 'Untitled skit', W - 120, 3).forEach((row, at) => ctx.fillText(row, W / 2, 500 + at * 80, W - 100))
  ctx.fillStyle = '#c9d2d9'; ctx.font = '600 34px system-ui, sans-serif'
  ctx.fillText(`with ${skit.actors.map((actor) => actor.name).join(', ')}`.slice(0, 60), W / 2, 780, W - 100)
  ctx.fillStyle = '#93a1ac'; ctx.font = '500 28px system-ui, sans-serif'; ctx.fillText('Made in Allworld · captions only, no sound', W / 2, 850, W - 100)
  ctx.restore()
}

/** One frame of the skit `ms` after it starts. */
export function drawSkit(ctx: Paint, skit: Skit, ms: number): SkitFrame {
  const frame = frameAt(skit, ms), t = ms / 1000
  backdrop(ctx, skit.backdrop, t)
  const n = skit.actors.length, slot = W / n, height = Math.min(430, slot * 1.9)
  skit.actors.forEach((actor, at) => figure(ctx, slot * (at + 0.5), height, frame.poses[at] ?? 'stand', t + at * 0.37, actor.id, actor.name))
  captionBar(ctx, frame.caption)
  if (frame.phase === 'title') card(ctx, skit, 'title', frame.progress > 0.8 ? (1 - frame.progress) / 0.2 : 1)
  if (frame.phase === 'end') card(ctx, skit, 'end', Math.min(1, frame.progress * 4))
  return frame
}
