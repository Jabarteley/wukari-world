/**
 * OWNER: games (real-time)
 * RACE DRAWING — Canvas 2D, all procedural (no assets): the road as a few wide strokes of one cached path, palms and lagoon
 * scenery drawn only when in view, cars as small vector shapes (danfo, keke, saloons), the HUD, the countdown and the minimap.
 * The caller supplies interpolated cars and a camera; this file keeps no clock of its own except the cheap animation phase.
 */
import { buildTrack, KERB_HALF, pointAt, ROAD_HALF, WALL_HALF, WORLD_H, WORLD_W } from './race-track.ts'
import type { Track, TrackId } from './race-track.ts'

export type CarKind = 'danfo' | 'saloon' | 'keke' | 'coupe'
export interface CarLook { kind: CarKind; body: string; accent: string }
/** One car as drawn this frame: world position, heading (radians), speed, flags (race.ts FLAG), and its name. */
export interface DrawCar { x: number; y: number; a: number; v: number; fl: number; name: string; look: CarLook; /** place 1.. or 0 */ place: number; fin: boolean }
export interface Camera { x: number; y: number; zoom: number }
export interface HudInfo { place: number; of: number; lap: number; laps: number; time: string; speed: number; go: number; count: number; you: boolean }

const KINDS: CarKind[] = ['danfo', 'saloon', 'keke', 'coupe']
const BODIES = ['#f6c500', '#e8553d', '#2fa56b', '#2f80ed']
/** Default look of a seat: a danfo, a saloon, a keke and a coupe, each in its own colour so the field reads at a glance. */
export const defaultLook = (seat: number, accent?: string): CarLook => ({ kind: KINDS[seat % 4] as CarKind, body: BODIES[seat % 4] as string, accent: accent ?? '#ffffff' })

interface Scenery { x: number; y: number; r: number; k: number }
interface Layer { track: Track; path: Path2D; trees: Scenery[]; lamps: [number, number][] }
const layers = new Map<string, Layer>()

function layerOf(id: TrackId): Layer {
  const hit = layers.get(id)
  if (hit) return hit
  const track = buildTrack(id)
  const path = new Path2D()
  for (let i = 0; i <= track.n; i++) { const j = i % track.n; if (i) path.lineTo(track.x[j] as number, track.y[j] as number); else path.moveTo(track.x[j] as number, track.y[j] as number) }
  path.closePath()
  // Scenery from a tiny deterministic generator so both screens show the same trees.
  let seed = id === 'lekki' ? 7 : 19
  const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const trees: Scenery[] = [], lamps: [number, number][] = []
  for (let arc = 0; arc < track.length; arc += 70) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.25) continue
      const p = pointAt(track, arc + rnd() * 40, side * (WALL_HALF + 30 + rnd() * 110))
      trees.push({ x: p.x, y: p.y, r: 0.8 + rnd() * 0.5, k: Math.floor(rnd() * 3) })
    }
    const l = pointAt(track, arc, WALL_HALF + 6), l2 = pointAt(track, arc, -WALL_HALF - 6)
    if (Math.floor(arc / 70) % 2 === 0) { lamps.push([l.x, l.y], [l2.x, l2.y]) }
  }
  // A few palms in the infield too.
  for (let n = 0; n < 40; n++) trees.push({ x: 300 + rnd() * (WORLD_W - 600), y: 300 + rnd() * (WORLD_H - 600), r: 0.8 + rnd() * 0.6, k: 0 })
  const made: Layer = { track, path, trees: trees.filter((t) => {
    // keep a tree only if it is outside the wall band
    let best = Infinity
    for (let i = 0; i < track.n; i += 2) { const d = Math.hypot(t.x - (track.x[i] as number), t.y - (track.y[i] as number)); if (d < best) best = d }
    return best > WALL_HALF + 20
  }), lamps }
  layers.set(id, made)
  return made
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, k: number): void {
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 6 * s, 20 * s, 12 * s, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = k === 1 ? '#2d7a3d' : '#1f8a4c'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * Math.PI * 2 + k
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s - 5 * s, x + Math.cos(a) * 30 * s, y + Math.sin(a) * 30 * s)
    ctx.stroke()
  }
  ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.arc(x, y, 4 * s, 0, 7); ctx.fill()
}

/** The whole scene under the cars: scenery, road, kerbs, lane dashes, start line. `cam` is in world units; the context already has the camera transform. */
export function drawWorld(ctx: CanvasRenderingContext2D, id: TrackId, view: { x0: number; y0: number; x1: number; y1: number }, phase: number): void {
  const layer = layerOf(id), track = layer.track, bridge = track.def.theme === 'bridge'
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.setLineDash([])
  const w = view.x1 - view.x0, h = view.y1 - view.y0
  if (bridge) {
    ctx.fillStyle = '#0b4f7a'; ctx.fillRect(view.x0, view.y0, w, h)
    ctx.strokeStyle = 'rgba(180,225,245,.28)'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    const gx = 110, gy = 90
    for (let gyi = Math.floor(view.y0 / gy); gyi <= Math.ceil(view.y1 / gy); gyi++) {
      for (let gxi = Math.floor(view.x0 / gx); gxi <= Math.ceil(view.x1 / gx); gxi++) {
        const hsh = ((gxi * 73856093) ^ (gyi * 19349663)) >>> 0
        const ox = (hsh % 60) + Math.sin(phase * 0.002 + hsh) * 6, oy = (hsh >> 8) % 50
        ctx.beginPath(); ctx.moveTo(gxi * gx + ox, gyi * gy + oy); ctx.quadraticCurveTo(gxi * gx + ox + 14, gyi * gy + oy - 6, gxi * gx + ox + 28, gyi * gy + oy); ctx.stroke()
      }
    }
    ctx.lineCap = 'butt'
    ctx.strokeStyle = '#3f464e'; ctx.lineWidth = 2 * (WALL_HALF + 12); ctx.stroke(layer.path)
    ctx.strokeStyle = '#8d949b'; ctx.lineWidth = 2 * WALL_HALF; ctx.stroke(layer.path)
  } else {
    ctx.fillStyle = '#6fae55'; ctx.fillRect(view.x0, view.y0, w, h)
    ctx.strokeStyle = '#e5d3a3'; ctx.lineWidth = 2 * (WALL_HALF + 28); ctx.stroke(layer.path)
    ctx.strokeStyle = '#d6bf86'; ctx.lineWidth = 2 * WALL_HALF; ctx.stroke(layer.path)
  }
  ctx.strokeStyle = '#d93a2e'; ctx.lineWidth = 2 * KERB_HALF; ctx.stroke(layer.path)
  ctx.setLineDash([34, 34]); ctx.strokeStyle = '#f6f2ea'; ctx.stroke(layer.path); ctx.setLineDash([])
  ctx.strokeStyle = bridge ? '#32363d' : '#3a3d46'; ctx.lineWidth = 2 * ROAD_HALF; ctx.stroke(layer.path)
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.setLineDash([26, 34]); ctx.stroke(layer.path); ctx.setLineDash([])
  // start / finish: a chequered line across the road at arc 0
  const s = pointAt(track, 0)
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a)
  const cols = 10, cw = (2 * ROAD_HALF) / cols
  for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = (r + c) % 2 ? '#111' : '#fff'; ctx.fillRect(-10 + r * 10, -ROAD_HALF + c * cw, 10, cw) }
  ctx.restore()
  // scenery
  const pad = 60
  if (bridge) {
    ctx.fillStyle = '#ffd96a'
    for (const [lx, ly] of layer.lamps) if (lx > view.x0 - pad && lx < view.x1 + pad && ly > view.y0 - pad && ly < view.y1 + pad) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(lx, ly, 15, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 7); ctx.fill() }
  } else {
    for (const t of layer.trees) if (t.x > view.x0 - pad && t.x < view.x1 + pad && t.y > view.y0 - pad && t.y < view.y1 + pad) palm(ctx, t.x, t.y, t.r, t.k)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** A car facing +x at the origin of the current transform. Danfo 38x20, saloon 32x16, keke 24x16, coupe 30x14. */
export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, car: DrawCar, phase: number, you: boolean): void {
  const { kind, body, accent } = car.look
  const braking = (car.fl & 8) !== 0
  ctx.save(); ctx.translate(x, y); ctx.rotate(a)
  if (car.fl & 1) { ctx.fillStyle = 'rgba(150,120,70,.35)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-20 - i * 7, Math.sin(phase * 0.02 + i * 2) * 6, 5 + i * 2, 0, 7); ctx.fill() } }
  const [L, W] = kind === 'danfo' ? [38, 20] : kind === 'keke' ? [24, 16] : kind === 'coupe' ? [30, 14] : [32, 16]
  ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 4); ctx.fill()
  ctx.fillStyle = '#16181c'
  for (const wx of [-L * 0.3, L * 0.3]) { ctx.fillRect(wx - 4, -W / 2 - 1.5, 8, 3.5); ctx.fillRect(wx - 4, W / 2 - 2, 8, 3.5) }
  ctx.fillStyle = body; roundRect(ctx, -L / 2, -W / 2, L, W, kind === 'keke' ? 7 : 4); ctx.fill()
  if (kind === 'danfo') {
    ctx.fillStyle = '#111'; ctx.fillRect(-L / 2 + 2, -2.2, L - 4, 4.4)
    ctx.fillStyle = '#7fb5d6'; ctx.fillRect(L / 2 - 11, -W / 2 + 2, 7, W - 4)
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-L / 2 + 4, -W / 2 + 2, L - 17, W - 4)
    ctx.fillStyle = accent; ctx.fillRect(-L / 2 + 5, -1.2, 10, 2.4)
  } else if (kind === 'keke') {
    ctx.fillStyle = '#1d2a24'; roundRect(ctx, -L / 2 + 2, -W / 2 + 2, L * 0.6, W - 4, 3); ctx.fill()
    ctx.fillStyle = accent; ctx.fillRect(L / 2 - 8, -2, 5, 4)
    ctx.fillStyle = '#7fb5d6'; ctx.fillRect(L / 2 - 9, -W / 2 + 3, 3, W - 6)
  } else {
    ctx.fillStyle = '#7fb5d6'; roundRect(ctx, -L * 0.1, -W / 2 + 2.5, L * 0.32, W - 5, 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.22)'; roundRect(ctx, -L * 0.4, -W / 2 + 2.5, L * 0.28, W - 5, 2); ctx.fill()
    ctx.fillStyle = accent; ctx.fillRect(-L / 2 + 2, -1.1, L - 4, 2.2)
  }
  ctx.fillStyle = '#fff6b0'; ctx.fillRect(L / 2 - 2, -W / 2 + 1.5, 2.4, 3.2); ctx.fillRect(L / 2 - 2, W / 2 - 4.7, 2.4, 3.2)
  ctx.fillStyle = braking ? '#ff2a2a' : '#8a1c1c'; ctx.fillRect(-L / 2, -W / 2 + 1.5, 2.4, 3.2); ctx.fillRect(-L / 2, W / 2 - 4.7, 2.4, 3.2)
  if (car.fl & 2) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) { const t = (i / 4) * 6.28 + phase * 0.03; ctx.moveTo(Math.cos(t) * 12, Math.sin(t) * 10); ctx.lineTo(Math.cos(t) * 20, Math.sin(t) * 16) } ctx.stroke() }
  ctx.restore()
  if (you) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x - 7, y - 42); ctx.lineTo(x + 7, y - 42); ctx.closePath(); ctx.stroke(); ctx.fill() }
}

function minimap(ctx: CanvasRenderingContext2D, id: TrackId, cars: readonly DrawCar[], x: number, y: number, w: number, you: number | null, follow: number, labels: boolean): void {
  const layer = layerOf(id)
  const h = w * (WORLD_H / WORLD_W)
  ctx.save(); ctx.translate(x, y)
  ctx.fillStyle = 'rgba(8,12,24,.62)'; roundRect(ctx, -6, -6, w + 12, h + 12, 10); ctx.fill()
  ctx.scale(w / WORLD_W, w / WORLD_W)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  ctx.strokeStyle = '#d6d9e0'; ctx.lineWidth = 2 * ROAD_HALF + 70; ctx.stroke(layer.path)
  ctx.strokeStyle = '#2a2d36'; ctx.lineWidth = 2 * ROAD_HALF + 10; ctx.stroke(layer.path)
  const s = pointAt(layer.track, 0)
  ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 20, s.y - 130, 40, 260)
  const k = w / WORLD_W
  const order = cars.map((_, i) => i).sort((a, b) => (a === you || a === follow ? 1 : 0) - (b === you || b === follow ? 1 : 0))
  for (const i of order) {
    const c = cars[i] as DrawCar, r = (labels ? 11 : 8) / k * (i === follow || i === you ? 1.25 : 1)
    ctx.fillStyle = c.look.body; ctx.strokeStyle = i === you || i === follow ? '#fff' : '#101218'; ctx.lineWidth = 3 / k
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill(); ctx.stroke()
    if (labels && c.place) { ctx.fillStyle = '#101218'; ctx.font = `800 ${Math.round(r * 1.25)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.place), c.x, c.y + 1 / k) }
  }
  ctx.restore()
}

const ordinal = (n: number): string => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th')

export interface DrawRaceOpts {
  trackId: TrackId
  cars: readonly DrawCar[]
  cam: Camera
  you: number | null
  follow: number
  hud: HudInfo | null
  spectator: boolean
  phase: number
  reduced?: boolean
  /** false: no minimap (the lobby preview). */
  mini?: boolean
}

/** Draw one frame at CSS size w x h (the context is already scaled for the pixel ratio). */
export function drawRace(ctx: CanvasRenderingContext2D, w: number, h: number, o: DrawRaceOpts): void {
  const zoom = o.cam.zoom
  ctx.save()
  ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom); ctx.translate(-o.cam.x, -o.cam.y)
  const view = { x0: o.cam.x - w / 2 / zoom, y0: o.cam.y - h / 2 / zoom, x1: o.cam.x + w / 2 / zoom, y1: o.cam.y + h / 2 / zoom }
  drawWorld(ctx, o.trackId, view, o.reduced ? 0 : o.phase)
  // far cars first so the one being followed is on top
  const order = o.cars.map((_, i) => i).sort((a, b) => (a === o.follow ? 1 : 0) - (b === o.follow ? 1 : 0))
  for (const i of order) { const c = o.cars[i] as DrawCar; drawCar(ctx, c.x, c.y, c.a, c, o.phase, i === o.you) }
  ctx.restore()
  // names of the others, in screen space
  ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  o.cars.forEach((c, i) => {
    if (i === o.you) return
    const sx = w / 2 + (c.x - o.cam.x) * zoom, sy = h / 2 + (c.y - o.cam.y) * zoom
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return
    const label = (c.place ? c.place + '. ' : '') + c.name
    const tw = ctx.measureText(label).width + 10
    ctx.fillStyle = 'rgba(8,12,24,.6)'; roundRect(ctx, sx - tw / 2, sy - 36, tw, 16, 8); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.fillText(label, sx, sy - 24)
  })
  const mw = o.spectator ? Math.min(150, w * 0.4) : Math.min(104, w * 0.28)
  if (o.mini !== false) minimap(ctx, o.trackId, o.cars, w - mw - 10, 10, mw, o.you, o.follow, o.spectator)
  const hud = o.hud
  if (hud) {
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(8,12,24,.62)'; roundRect(ctx, 8, 8, 112, 64, 10); ctx.fill()
    ctx.fillStyle = '#fff'
    if (hud.you) { ctx.font = '800 26px system-ui'; ctx.fillText(ordinal(hud.place), 16, 36); ctx.font = '600 11px system-ui'; ctx.fillStyle = '#c9d2ea'; ctx.fillText('of ' + hud.of, 70, 36) }
    else { ctx.font = '800 17px system-ui'; ctx.fillText('LIVE', 16, 31) }
    ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.fillText('Lap ' + hud.lap + '/' + hud.laps, 16, 52)
    ctx.font = '600 12px ui-monospace, monospace'; ctx.fillStyle = '#c9d2ea'; ctx.fillText(hud.time, 16, 66)
  }
  if (hud && hud.count > 0) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '900 96px system-ui'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,12,24,.85)'; ctx.fillStyle = hud.count === 1 ? '#ffd34d' : '#fff'
    ctx.strokeText(String(hud.count), w / 2, h / 2); ctx.fillText(String(hud.count), w / 2, h / 2)
    ctx.textBaseline = 'alphabetic'
  } else if (hud && hud.go > 0) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '900 72px system-ui'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,12,24,.85)'; ctx.fillStyle = '#5be37d'
    ctx.strokeText('GO!', w / 2, h / 2); ctx.fillText('GO!', w / 2, h / 2)
    ctx.textBaseline = 'alphabetic'
  }
}
