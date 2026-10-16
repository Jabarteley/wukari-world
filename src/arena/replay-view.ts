/**
 * OWNER: games (real-time)
 * What a replay draws, per game: a thin adapter over each game's own drawing module (fight-draw, race-draw, football-draw) that
 * turns the recorded snapshots and seats into the arguments those modules take. It is the spectator view: nobody's own seat is
 * predicted, the camera follows the leader or the play. State that carries over between frames (sparks, skid marks, confetti) lives
 * in the view, so the page draws a few frames before the one it wants (replay-page.ts) and every frame is the same on any machine.
 * Lazy: reached only from the replay page.
 */
import { APPEARANCE } from '../game/content/traits.ts'
import { FPS, FRAME_MS, pickAt } from './replay-frames.ts'
import type { ReplayLog } from './replay.ts'
import { PHASE as FIGHT_PHASE } from './fight.ts'
import type { FightSnap } from './fight.ts'
import { drawFight, newFx as newFightFx, spawnHits } from './fight-draw.ts'
import type { FighterColors } from './fight-draw.ts'
import { standings, headingFrom256, lapOf, hudPlace } from './race.ts'
import type { CarSnap, RaceSnap } from './race.ts'
import { buildTrack, TRACK_IDS } from './race-track.ts'
import { Confetti, defaultLook, drawRace, Skids } from './race-draw.ts'
import type { Camera, DrawCar, HudInfo } from './race-draw.ts'
import { KITS, drawFootball, makePitch, newFx as newBallFx, spawnEvents, VIEW_H, VIEW_W } from './football-draw.ts'
import type { Look, Meta } from './football-draw.ts'
import type { FootballSnap } from './football.ts'

export interface ReplayView {
  /** Forget everything carried between frames. */
  reset(): void
  /** Draw frame `frame` of `snaps` (snaps[0] is the start) on a context whose pixels are w x h. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, snaps: readonly unknown[], frame: number): void
}

const hex = (group: 'skin' | 'hairColours' | 'outfitColours', id: string | undefined, fallback: string): string => APPEARANCE[group].find((swatch) => swatch.id === id)?.hex ?? fallback
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const lerpAngle = (a: number, b: number, t: number): number => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t }

function fightView(log: ReplayLog): ReplayView {
  let fx = newFightFx(), fed = 0
  const colors = (seat: number): FighterColors => {
    const look = log.seats[seat]?.look
    const base: FighterColors = seat ? { skin: '#a8714b', hair: '#1c1c1c', top: '#2f80ed', bottoms: '#27314f' } : { skin: '#8a5a3c', hair: '#1c1c1c', top: '#e8553d', bottoms: '#3b2a2a' }
    return look ? { skin: hex('skin', look[0], base.skin), hair: hex('hairColours', look[1], base.hair), top: hex('outfitColours', look[2], base.top), bottoms: hex('outfitColours', look[3], base.bottoms) } : base
  }
  return {
    reset: () => { fx = newFightFx(); fed = 0 },
    draw(ctx, w, h, snaps, frame) {
      const s = snaps as readonly FightSnap[], pick = pickAt(s, frame, log.hz)
      const upto = Math.floor(pick.tick)
      while (fed < upto && fed < s.length - 1) { fed += 1; const hit = s[fed] as FightSnap; if (hit.e.length) spawnHits(fx, hit, false) }
      const end = pick.b.p === FIGHT_PHASE.over && pick.tick >= s.length - 1
      const winner = end ? (log.result.draw ? 2 : (log.result.winners[0] ?? -1)) : -1
      let c1 = colors(1); const c0 = colors(0)
      if (c0.top === c1.top) c1 = { ...c1, top: '#2f80ed' }
      drawFight(ctx, w, h, pick.a, pick.b, pick.t, { names: [log.seats[0]?.name ?? '', log.seats[1]?.name ?? ''], colors: [c0, c1], you: null, rounds: Number(log.options.rounds ?? 3), reduced: false, time: frame * FRAME_MS, winner, own: null, hudTop: h > w ? Math.round(h * 0.06) : 0, ...(h > w ? { ground: Math.round(h * 0.6) } : {}) }, fx, 1)
    },
  }
}

function footballView(log: ReplayLog): ReplayView {
  let fx = newBallFx(), fed = 0
  let pitch: HTMLCanvasElement | null = null
  const looks: Look[] = []
  const names: string[] = []
  const FALLBACK: Look[] = [{ skin: '#8a5a3c', hair: '#1c1c1c' }, { skin: '#a8714b', hair: '#2b1b12' }, { skin: '#6b432b', hair: '#1c1c1c' }, { skin: '#c18a5e', hair: '#111111' }]
  const count = Math.max(2, log.seats.length, Number(log.options.side ?? 1) * 2)
  for (let p = 0; p < Math.max(count, 4); p++) {
    const seat = log.seats[p], l = seat?.look, fb = FALLBACK[p % 4] as Look
    looks.push(l ? { skin: hex('skin', l[0], fb.skin), hair: hex('hairColours', l[1], fb.hair) } : fb)
    names.push(seat && !seat.bot ? seat.name.slice(0, 9) : '')
  }
  const team = (t: number): string => { const n = log.seats.filter((s, i) => i % 2 === t && !s.bot).map((s) => s.name.slice(0, 9)); return n.length ? (n.length > 1 ? `${n[0]} +${n.length - 1}` : n[0] as string) : (t ? 'Computer' : 'Home') }
  return {
    reset: () => { fx = newBallFx(); fed = 0 },
    draw(ctx, w, h, snaps, frame) {
      const s = snaps as readonly FootballSnap[], pick = pickAt(s, frame, log.hz)
      const upto = Math.floor(pick.tick)
      while (fed < upto && fed < s.length - 1) { fed += 1; const ev = s[fed] as FootballSnap; if (ev.e.length) spawnEvents(fx, ev, false) }
      pitch ??= makePitch(Math.round(VIEW_W * 1.15), Math.round(VIEW_H * 1.15), 1.15)
      const meta: Meta = { names, kits: KITS, looks, you: null, reduced: false, teamNames: [team(0), team(1)], portrait: h >= w }
      drawFootball(ctx, w, h, pitch, pick.a, pick.b, pick.t, meta, fx, 1)
      // The score, which the live screen shows in its page bar.
      const b = pick.b
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.font = `700 ${Math.round(w * 0.05)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6
      ctx.fillText(`${meta.teamNames[0]}  ${b.g[0]} - ${b.g[1]}  ${meta.teamNames[1]}`, w / 2, Math.round(h * 0.09) + w * 0.06)
      ctx.shadowBlur = 0
    },
  }
}

function raceView(log: ReplayLog): ReplayView {
  const trackId = TRACK_IDS[Number(log.options.track ?? 0)] ?? 'lekki'
  const laps = Number(log.options.laps ?? 3)
  const track = buildTrack(trackId)
  let skids = new Skids(), confetti = new Confetti(), cam: Camera | null = null, burst = false
  const timeText = (ticks: number): string => { const sec = Math.max(0, ticks) / log.hz; return Math.floor(sec / 60) + ':' + (sec % 60).toFixed(1).padStart(4, '0') }
  return {
    reset: () => { skids = new Skids(); confetti = new Confetti(); cam = null; burst = false },
    draw(ctx, w, h, snaps, frame) {
      const pick = pickAt(snaps as readonly RaceSnap[], frame, log.hz), a = pick.a, b = pick.b, t = pick.t
      const order = standings(b.r.map((c) => c[4]), b.r.map((c) => c[5]), b.r.map((c) => (c[6] & 4) !== 0))
      const cars: DrawCar[] = b.r.map((cb, i) => {
        const ca = (a.r[i] ?? cb) as CarSnap
        return { x: lerp(ca[0], cb[0], t), y: lerp(ca[1], cb[1], t), a: lerpAngle(headingFrom256(ca[2]), headingFrom256(cb[2]), t), v: Math.abs(cb[3] / 4), fl: cb[6], name: log.seats[i]?.name ?? 'Racer', look: defaultLook(i, hex('outfitColours', log.seats[i]?.look?.[2], '#ffffff')), place: order.indexOf(i) + 1, fin: cb[5] > 0 }
      })
      const target = order[0] ?? 0, tc = cars[target] as DrawCar
      const wantZoom = 0.68 * (w / 390) * (1 - Math.min(0.24, tc.v / 10 * 0.24))
      const tx = tc.x + Math.cos(tc.a) * tc.v * 15, ty = tc.y + Math.sin(tc.a) * tc.v * 15
      if (!cam) cam = { x: tx, y: ty, zoom: wantZoom }
      else { cam.x = lerp(cam.x, tx, 0.1); cam.y = lerp(cam.y, ty, 0.1); cam.zoom = lerp(cam.zoom, wantZoom, 0.06) }
      const fc = b.r[target] as CarSnap
      const place = hudPlace(b, target)
      const hud: HudInfo = { dnf: place.kind === 'dnf' ? 'DNF' : place.kind === 'left' ? 'Left' : '', done: fc[5] ? 1 : 0, place: 1, of: cars.length, lap: Math.min(laps, Math.max(1, lapOf(fc[4], track.length) + 1)), laps, time: timeText(fc[5] || b.t), speed: fc[3] / 4, go: b.p === 1 && b.t < log.hz ? 1 : 0, count: b.p === 0 ? b.c : 0, you: false }
      cars.forEach((c, i) => skids.add(i, c.x, c.y, c.a, (c.fl & 8) !== 0 && c.v > 3))
      if (!burst && b.r.some((c) => c[5] > 0)) { burst = true; confetti.burst(w) }
      drawRace(ctx, w, h, { trackId, cars, cam, you: null, follow: target, hud, spectator: true, phase: frame * FRAME_MS, reduced: false, skids, confetti, dtMs: FRAME_MS })
    },
  }
}

/** The view for a replay's game, or null for a game with no replay view yet (a new cartridge adds one here). */
export function viewFor(log: ReplayLog): ReplayView | null {
  if (log.game === 'fight') return fightView(log)
  if (log.game === 'football') return footballView(log)
  if (log.game === 'race') return raceView(log)
  return null
}
export { FPS }
