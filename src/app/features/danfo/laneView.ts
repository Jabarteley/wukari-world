// The 2D lane view of a danfo run (docs/DANFO.md): the road seen from above, scrolling as the bus drives up the screen. It is the view for
// weak devices and the frames of the run's clip, and needs nothing but a 2D canvas. Pure drawing: it reads a RoadSnapshot and never
// changes it. The bus's position is its front; a car's is its back (src/danfo/drive.ts).
import type { RoadSnapshot } from './runModel.ts'
import { BUS_LENGTH, CAR_LENGTH } from '../../../danfo/drive.ts'
import type { TrafficKind } from '../../../danfo/drive.ts'

export interface LaneLook {
  /** Traffic keeps left (Kenya, Uganda, Tanzania): the kerb is on the left. */
  keepLeft: boolean
  /** The bus's paint: body and stripe. */
  body: string
  stripe: string
  /** The names of the stops, the people still waiting at each (0 once served or passed), and the next stop to serve. */
  stopNames: readonly string[]
  waiting: readonly number[]
  braking: boolean
}

type Paint = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const ROADSIDE = ['#d9c7a3', '#c3d4a4']
const BUILDINGS = ['#e8d3b0', '#cfe0e6', '#f0c9a8', '#d6d1e8', '#f2e4a6', '#b9d8c2', '#e9b8b0', '#c9c2b4']
const CARS: Readonly<Record<TrafficKind, readonly string[]>> = {
  saloon: ['#2d5b8a', '#b33a3a', '#e6e6e6', '#3a3a3a', '#7a8b99', '#1f6f5c'],
  keke: ['#2e7d32', '#f9a825', '#1565c0'],
  okada: ['#222', '#7b1fa2', '#c62828'],
  danfo: ['#f4c20d'],
  truck: ['#8d6e63', '#546e7a', '#e65100'],
}
const WIDE: Readonly<Record<TrafficKind, number>> = { saloon: 0.55, keke: 0.42, okada: 0.2, danfo: 0.62, truck: 0.7 }
const hash = (n: number): number => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; return (x >>> 0) / 4294967296 }

/** Draws one frame of the road into a `width` × `height` area (canvas pixels). */
export function drawLanes(ctx: Paint, width: number, height: number, snap: RoadSnapshot, look: LaneLook): void {
  const laneW = Math.max(46, Math.min(width * 0.21, 120)), road = laneW * 3, left = (width - road) / 2
  const walk = Math.max(14, laneW * 0.3), busY = height * 0.74, scale = height / 95
  const y = (d: number): number => busY - (d - snap.d) * scale
  const laneX = (lane: number): number => left + laneW * ((look.keepLeft ? lane : 2 - lane) + 0.5)
  const from = snap.d - (height - busY) / scale - 10, to = snap.d + busY / scale + 10

  ctx.fillStyle = ROADSIDE[0]!
  ctx.fillRect(0, 0, width, height)
  // Buildings beside the road: blocks every 14 m, the same block at the same place on every frame.
  for (const side of [0, 1]) {
    for (let n = Math.floor(from / 14); n * 14 < to; n++) {
      const r = hash(n * 2 + side), deep = (left - walk) * (0.45 + r * 0.5), x = side === 0 ? left - walk - deep : left + road + walk
      ctx.fillStyle = BUILDINGS[Math.floor(r * BUILDINGS.length)]!
      ctx.fillRect(x + 3, y(n * 14 + 13), deep - 6, 12 * scale)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(x + 3, y(n * 14 + 13), deep - 6, 2)
    }
  }
  // Pavements and the road.
  ctx.fillStyle = '#b8b2a7'
  ctx.fillRect(left - walk, 0, walk, height); ctx.fillRect(left + road, 0, walk, height)
  ctx.fillStyle = '#41464c'
  ctx.fillRect(left, 0, road, height)
  for (const [a, b] of snap.slow) if (b > from && a < to) {
    ctx.fillStyle = 'rgba(214, 69, 65, 0.16)'
    ctx.fillRect(left, y(b), road, (b - a) * scale)
  }
  // Lane lines, dashed, moving with the road.
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  for (const k of [1, 2]) for (let d = Math.floor(from / 8) * 8; d < to; d += 8) ctx.fillRect(left + laneW * k - 2, y(d + 4), 4, 4 * scale)
  ctx.fillStyle = '#f2f2f2'
  ctx.fillRect(left - 3, 0, 3, height); ctx.fillRect(left + road, 0, 3, height)

  // The stops: a yellow box on the kerb lane, a shelter with the name, people waiting.
  const kerbX = look.keepLeft ? left - walk : left + road
  for (let i = 1; i < snap.stops.length; i++) {
    const at = snap.stops[i]!
    if (at < from - 40 || at > to + 40) continue
    const next = i === snap.next
    ctx.fillStyle = next ? 'rgba(244, 194, 13, 0.42)' : 'rgba(244, 194, 13, 0.18)'
    ctx.fillRect(laneX(0) - laneW / 2, y(at + 8), laneW, 36 * scale)
    ctx.fillStyle = next ? '#f4c20d' : '#8f8a7e'
    ctx.fillRect(kerbX + 2, y(at + 2), walk - 4, 8 * scale)
    const people = look.waiting[i] ?? 0
    for (let p = 0; p < Math.min(8, people); p++) {
      ctx.fillStyle = ['#7b3f00', '#3e2723', '#5d4037', '#8d5524'][p % 4]!
      ctx.beginPath(); ctx.arc(kerbX + walk / 2 + ((p % 2) - 0.5) * walk * 0.4, y(at - 2 - p * 1.6), Math.max(3, walk * 0.16), 0, Math.PI * 2); ctx.fill()
    }
    const name = look.stopNames[i] ?? ''
    if (name) {
      ctx.font = `600 ${Math.round(Math.max(11, laneW * 0.17))}px system-ui, sans-serif`
      ctx.textAlign = look.keepLeft ? 'right' : 'left'
      ctx.textBaseline = 'middle'
      const tx = look.keepLeft ? kerbX - 6 : kerbX + walk + 6, ty = y(at + 4)
      const w = ctx.measureText(name).width
      ctx.fillStyle = 'rgba(16, 20, 24, 0.72)'
      ctx.fillRect(look.keepLeft ? tx - w - 6 : tx - 3, ty - 10, w + 9, 20)
      ctx.fillStyle = next ? '#ffd84a' : '#fff'
      ctx.fillText(name, tx, ty)
    }
  }
  // The barrier at the end of the line.
  if (snap.end < to) for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#d32f2f'; ctx.fillRect(left + (road / 6) * k, y(snap.end) - 8, road / 6, 8) }
  for (const hole of snap.potholes) if (hole.d > from && hole.d < to) {
    ctx.fillStyle = '#25282b'
    ctx.beginPath(); ctx.ellipse(laneX(hole.lane), y(hole.d), laneW * 0.2, scale * 1.3, 0, 0, Math.PI * 2); ctx.fill()
  }
  for (const car of snap.cars) if (car.d > from - 10 && car.d < to) drawCar(ctx, car.kind, laneX(car.lane), y(car.d + CAR_LENGTH[car.kind]), laneW, scale, hash(car.id))
  drawBus(ctx, laneX(snap.lane), busY, laneW, scale, look)
}

function drawCar(ctx: Paint, kind: TrafficKind, cx: number, front: number, laneW: number, scale: number, r: number): void {
  const w = laneW * WIDE[kind], h = CAR_LENGTH[kind] * scale, x = cx - w / 2, colours = CARS[kind]
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x + 3, front + 3, w, h)
  ctx.fillStyle = colours[Math.floor(r * colours.length)]!
  ctx.fillRect(x, front, w, h)
  if (kind === 'okada') { ctx.fillStyle = '#e0b07a'; ctx.beginPath(); ctx.arc(cx, front + h * 0.45, w * 0.7, 0, Math.PI * 2); ctx.fill(); return }
  if (kind === 'danfo') { ctx.fillStyle = '#111'; ctx.fillRect(x, front + h * 0.35, w, h * 0.07); ctx.fillRect(x, front + h * 0.62, w, h * 0.07) }
  ctx.fillStyle = 'rgba(160, 200, 220, 0.85)'
  ctx.fillRect(x + w * 0.12, front + h * 0.1, w * 0.76, h * (kind === 'truck' ? 0.1 : 0.18))
  if (kind !== 'truck') ctx.fillRect(x + w * 0.15, front + h * 0.72, w * 0.7, h * 0.12)
}

function drawBus(ctx: Paint, cx: number, front: number, laneW: number, scale: number, look: LaneLook): void {
  const w = laneW * 0.64, h = BUS_LENGTH * scale, x = cx - w / 2
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x + 4, front + 4, w, h)
  ctx.fillStyle = look.body
  ctx.fillRect(x, front, w, h)
  ctx.fillStyle = look.stripe
  ctx.fillRect(x, front + h * 0.33, w, h * 0.07); ctx.fillRect(x, front + h * 0.6, w, h * 0.07)
  ctx.fillStyle = 'rgba(150, 195, 215, 0.95)'
  ctx.fillRect(x + w * 0.1, front + h * 0.06, w * 0.8, h * 0.16)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(x + w * 0.12, front + h * 0.25, w * 0.76, h * 0.62)
  ctx.fillStyle = look.braking ? '#ff3b30' : '#7a1d18'
  ctx.fillRect(x + 2, front + h - 4, w * 0.2, 4); ctx.fillRect(x + w * 0.8 - 2, front + h - 4, w * 0.2, 4)
}
