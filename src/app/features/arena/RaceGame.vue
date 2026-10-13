<script setup lang="ts">
// Race: a top-down arcade race for 2-4 cars, played live against friends (a room joined by a link), against the computer, or watched.
// The server judges everything (src/arena/race.ts); this screen sends what the player holds (left/right/gas/brake), draws the
// snapshots on a 2D canvas (src/arena/race-draw.ts), interpolates the other cars (src/arena/interp.ts) and lightly predicts the
// player's own. A viewer without a seat gets the broadcast view: whole-track minimap, a live leaderboard with gaps, and a
// follow-the-leader camera. A lazy chunk of the Games app.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import { APPEARANCE } from '../../../game/content/traits.ts'
import { InputPipe } from '../../../arena/client.ts'
import { useArenaRoom } from '../../../arena/room.ts'
import type { ArenaScreenProps } from '../../../arena/catalog.ts'
import ArenaRoomPanels from './ArenaRoomPanels.vue'
import ArenaStage from './ArenaStage.vue'
import { drive, headingFrom256, INPUT, lapOf, standings } from '../../../arena/race.ts'
import type { Car, CarSnap, RaceSnap } from '../../../arena/race.ts'
import { buildTrack, nearestIndex, TRACK_IDS, WORLD_H, WORLD_W } from '../../../arena/race-track.ts'
import { Confetti, defaultLook, drawRace, Skids } from '../../../arena/race-draw.ts'
import { createRaceSound } from '../../../arena/race-sound.ts'
import type { Camera, DrawCar, HudInfo } from '../../../arena/race-draw.ts'
import type { ArenaLook } from '../../../types/arena.ts'

const props = defineProps<ArenaScreenProps>()
const emit = defineEmits<{ close: [] }>()
const { game } = useApp()
const HZ = 20

const canvas = ref<HTMLCanvasElement | null>(null)
const box = ref<HTMLElement | null>(null)

const ownLook = (): ArenaLook | undefined => {
  const look = game.state.value.onboarding?.look as { skin?: string; hairColor?: string; outfitColor?: string; bottomsColor?: string } | undefined
  return look?.skin && look.hairColor && look.outfitColor && look.bottomsColor ? [look.skin, look.hairColor, look.outfitColor, look.bottomsColor] : undefined
}
const accentOf = (seat: number): string | undefined => {
  const id = room.state.value?.seats[seat]?.look?.[2]
  return APPEARANCE.outfitColours.find((swatch) => swatch.id === id)?.hex
}

// ---- the room ------------------------------------------------------------------------------------------
const sound = createRaceSound()
const skids = new Skids()
const confetti = new Confetti()
let anyFin = false
let fxSeen = { count: 0, hit: false, boost: false, fin: false }
let own: { at: number; car: CarSnap; base: Car | null; p: number } | null = null
const room = useArenaRoom<RaceSnap>({
  game: 'race', intent: props.intent, hz: HZ, look: ownLook, toast: (text, kind) => game.toast(text, kind), close: () => emit('close'),
  onMatch: () => { own = null; disp = null; follow.value = -1; skids.clear(); confetti.clear(); anyFin = false; fxSeen = { count: 0, hit: false, boost: false, fin: false } },
  onSnap: (_k, snap) => {
    const you = room.state.value?.you
    if (you == null) return
    const car = snap.r[you]
    if (car) own = { at: performance.now(), car, base: null, p: snap.p }
  },
})
room.mount()
const state = room.state, note = room.note, conn = room.conn, gone = room.gone, timeline = room.timeline
const seated = room.seated, status = room.status
const spectator = computed(() => state.value != null && state.value.you == null)
const trackId = computed(() => TRACK_IDS[Number(state.value?.options.track ?? 0)] ?? 'lekki')
const laps = computed(() => Number(state.value?.options.laps ?? 3))

// ---- input --------------------------------------------------------------------------------------------
let heldBits = 0
const down = ref(0)
const pipe = new InputPipe({ now: () => performance.now(), send: (held) => { room.sendInput(held) } })
// One-thumb play: with auto gas on, the gas is held for you and only the brake lifts it.
const autoGas = ref(typeof localStorage !== 'undefined' && localStorage.getItem('aw-race-autogas') === '1')
const eff = (): number => heldBits | (autoGas.value && !(heldBits & INPUT.brake) ? INPUT.gas : 0)
function hold(bit: number, on: boolean): void { heldBits = on ? heldBits | bit : heldBits & ~bit; down.value = heldBits; pipe.hold(eff()); sound.unlock() }
function toggleAuto(): void { autoGas.value = !autoGas.value; try { localStorage.setItem('aw-race-autogas', autoGas.value ? '1' : '0') } catch { /* private mode */ } pipe.hold(eff()); sound.unlock() }
const KEYS: Record<string, number> = { ArrowLeft: INPUT.left, a: INPUT.left, ArrowRight: INPUT.right, d: INPUT.right, ArrowUp: INPUT.gas, w: INPUT.gas, ArrowDown: INPUT.brake, s: INPUT.brake }
function key(event: KeyboardEvent, on: boolean): void {
  const target = event.target as HTMLElement | null
  if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
  const bit = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
  if (!bit) return
  event.preventDefault()
  hold(bit, on)
}
const onDown = (e: KeyboardEvent): void => key(e, true)
const onUp = (e: KeyboardEvent): void => key(e, false)
const onHide = (): void => { if (document.hidden) { heldBits = 0; down.value = 0; pipe.reset(); pipe.flush() } }
const press = (bit: number, on: boolean) => (event: Event): void => { event.preventDefault(); hold(bit, on) }

// ---- drawing -------------------------------------------------------------------------------------------
let raf = 0, lastFrame = 0, width = 0, height = 0, lastBoard = 0
let disp: { x: number; y: number; a: number } | null = null
let cam: Camera | null = null
const follow = ref(-1)
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
function size(): void {
  const el = canvas.value, holder = box.value
  if (!el || !holder) return
  width = Math.max(200, holder.clientWidth); height = Math.max(120, holder.clientHeight)
  const ratio = Math.min(window.devicePixelRatio || 1, 1.75)
  el.width = Math.round(width * ratio); el.height = Math.round(height * ratio)
  el.style.width = width + 'px'; el.style.height = height + 'px'
  el.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
}
let watcher: ResizeObserver | null = null
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const lerpAngle = (a: number, b: number, t: number): number => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t }
const timeText = (ticks: number): string => { const s = Math.max(0, ticks) / HZ; return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0') }

interface Row { seat: number; place: number; name: string; color: string; lap: number; gap: string; fin: boolean; you: boolean }
const board = ref<Row[]>([])
function buildBoard(snap: RaceSnap): Row[] {
  const st = state.value
  const order = standings(snap.r.map((c) => c[4]), snap.r.map((c) => c[5]), snap.r.map((c) => (c[6] & 4) !== 0))
  const leader = snap.r[order[0] ?? 0]
  const L = buildTrack(trackId.value).length
  return order.map((seat, index) => {
    const c = snap.r[seat] as CarSnap
    const gap = c[6] & 4 ? 'left' : c[5] ? timeText(c[5]) : index === 0 || !leader ? (snap.p === 0 ? '' : 'leader') : '+' + (Math.max(0, leader[4] - c[4]) / 150).toFixed(1) + 's'
    return { seat, place: index + 1, name: st?.seats[seat]?.name ?? 'Racer ' + (seat + 1), color: defaultLook(seat).body, lap: Math.min(laps.value, Math.max(1, lapOf(c[4], L) + 1)), gap, fin: c[5] > 0, you: seat === st?.you }
  })
}

function frame(now: number): void {
  raf = requestAnimationFrame(frame)
  pipe.flush()
  const el = canvas.value, st = state.value
  if (!el || !st || document.hidden) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  const dt = lastFrame ? Math.min(100, now - lastFrame) : 16
  lastFrame = now
  const pick = timeline.pick(now)
  const a = pick?.a ?? room.latest, b = pick?.b ?? room.latest
  const track = buildTrack(trackId.value)
  if (!a || !b) {
    // lobby: the whole track as a preview
    ctx.fillStyle = '#10382a'; ctx.fillRect(0, 0, width, height)
    drawRace(ctx, width, height, { trackId: trackId.value, cars: [], cam: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: Math.min(width / (WORLD_W * 0.98), height / (WORLD_H * 0.98)) }, you: null, follow: -1, hud: null, spectator: false, phase: now, reduced, mini: false })
    return
  }
  const t = pick?.t ?? 0
  const you = st.you
  const order = standings(b.r.map((c) => c[4]), b.r.map((c) => c[5]), b.r.map((c) => (c[6] & 4) !== 0))
  const cars: DrawCar[] = b.r.map((cb, i) => {
    const ca = (a.r[i] ?? cb) as CarSnap
    const look = defaultLook(i, accentOf(i))
    return { x: lerp(ca[0], cb[0], t), y: lerp(ca[1], cb[1], t), a: lerpAngle(headingFrom256(ca[2]), headingFrom256(cb[2]), t), v: Math.abs(cb[3] / 4), fl: cb[6], name: st.seats[i]?.name ?? 'Racer', look, place: order.indexOf(i) + 1, fin: cb[5] > 0 }
  })
  // Own car: the newest snapshot, run forward by the age of the packet plus a little for the trip back, then eased into place.
  if (you != null && own && own.p === 1 && cars[you]) {
    if (!own.base) {
      const c = own.car, h = headingFrom256(c[2]), v = c[3] / 4
      own.base = { x: c[0], y: c[1], vx: v * Math.cos(h), vy: v * Math.sin(h), h, cur: c[4], best: c[4], i: nearestIndex(track, c[0], c[1]), dist: 0, fin: c[5], out: false, hit: 0, off: (c[5] === 0) && (c[6] & 1) !== 0, braking: false, boost: (c[6] & 16) !== 0 ? 8 : 0, offT: 0, stuckT: 0, safe: c[4], spawn: 0 }
    }
    const age = (now - own.at) / (1000 / HZ) + 2
    const steps = Math.max(0, Math.min(10, Math.floor(age)))
    const p = { ...own.base }
    const inp = own.car[5] ? 0 : eff()
    for (let n = 0; n < steps; n++) drive(p, inp, track)
    const frac = Math.min(1, age - steps)
    const px = p.x + p.vx * frac, py = p.y + p.vy * frac
    if (!disp || Math.hypot(disp.x - px, disp.y - py) > 90) disp = { x: px, y: py, a: p.h }
    else { const k = 1 - Math.exp(-dt / 70); disp.x = lerp(disp.x, px, k); disp.y = lerp(disp.y, py, k); disp.a = lerpAngle(disp.a, p.h, k) }
    const mine = cars[you] as DrawCar
    mine.x = disp.x; mine.y = disp.y; mine.a = disp.a
  } else disp = null
  // camera
  let target = you ?? 0
  if (you == null) target = follow.value >= 0 && follow.value < cars.length ? follow.value : (order[0] ?? 0)
  const tc = cars[target] as DrawCar
  const wantZoom = (you == null ? 0.68 : 0.82) * (width / 390) * (1 - Math.min(0.24, tc.v / 10 * 0.24))
  const look = tc.v * 15
  const tx = tc.x + Math.cos(tc.a) * look, ty = tc.y + Math.sin(tc.a) * look
  if (!cam) cam = { x: tx, y: ty, zoom: wantZoom }
  else { const k = you == null ? 1 - Math.exp(-dt / 260) : 1 - Math.exp(-dt / 90); cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k); cam.zoom = lerp(cam.zoom, wantZoom, 0.06) }
  const focus = you ?? target
  const fc = b.r[focus] as CarSnap
  const hud: HudInfo = {
    done: fc[5] ? order.indexOf(focus) + 1 : 0, place: order.indexOf(focus) + 1, of: cars.length, lap: Math.min(laps.value, Math.max(1, lapOf(fc[4], track.length) + 1)), laps: laps.value,
    time: timeText(fc[5] || b.t), speed: fc[3] / 4, go: b.p === 1 && b.t < HZ ? 1 : 0, count: b.p === 0 ? b.c : 0, you: you != null,
  }
  cars.forEach((c, i) => skids.add(i, c.x, c.y, c.a, (c.fl & 8) !== 0 && c.v > 3))
  // sounds: the hum follows the car you watch; beeps on the countdown; one-shots on the edges of your own flags
  const mine = you != null ? b.r[you] : undefined
  sound.engine(tc.v / 9, you != null && (eff() & INPUT.gas) !== 0, b.p === 1 && !(fc[5] > 0), you != null ? 1 : 0.5)
  if (b.p === 0 && b.c !== fxSeen.count) { fxSeen.count = b.c; if (b.c > 0) sound.beep(false) }
  if (b.p === 1 && fxSeen.count !== -1) { fxSeen.count = -1; sound.beep(true) }
  if (you == null && !anyFin && b.r.some((c) => c[5] > 0)) { anyFin = true; confetti.burst(width); sound.finish() }
  if (mine) {
    const hit = (mine[6] & 2) !== 0, boost = (mine[6] & 16) !== 0, fin = mine[5] > 0
    if (hit && !fxSeen.hit) sound.bump()
    if (boost && !fxSeen.boost) sound.boost()
    if (fin && !fxSeen.fin) { sound.finish(); confetti.burst(width) }
    fxSeen.hit = hit; fxSeen.boost = boost; fxSeen.fin = fin
  }
  drawRace(ctx, width, height, { trackId: trackId.value, cars, cam, you, follow: target, hud, spectator: you == null, phase: now, reduced, skids, confetti, dtMs: dt })
  if (now - lastBoard > 200) { lastBoard = now; board.value = buildBoard(b) }
}

// ---- actions -------------------------------------------------------------------------------------------------
const leave = (): void => room.leave()
function watchSeat(seat: number): void { if (spectator.value) follow.value = follow.value === seat ? -1 : seat }

const playing = computed(() => status.value === 'playing')
const podium = computed(() => {
  const st = state.value
  if (!st || st.status !== 'over' || !st.result) return null
  const snap = (room.latest ?? st.snap) as RaceSnap | null
  if (!snap) return null
  // Only cars that crossed the line are ranked; the rest are listed as DNF (or "left") and never get a place.
  const order = standings(snap.r.map((c) => c[4]), snap.r.map((c) => c[5]), snap.r.map((c) => (c[6] & 4) !== 0))
  const row = (seat: number, place: number) => {
    const c = snap.r[seat] as CarSnap
    return { seat, place, name: st.seats[seat]?.name ?? 'Racer', time: c[5] ? timeText(c[5]) : (c[6] & 4) ? 'left' : 'DNF', color: defaultLook(seat).body, you: seat === st.you }
  }
  const fin = order.filter((seat) => (snap.r[seat] as CarSnap)[5] > 0)
  const top = [fin[1], fin[0], fin[2]].map((seat, i) => (seat == null ? null : row(seat, i === 1 ? 1 : i === 0 ? 2 : 3))).filter((x) => x != null)
  return { top, rest: fin.slice(3).map((seat, i) => row(seat, i + 4)), dnf: order.filter((seat) => !(snap.r[seat] as CarSnap)[5]).map((seat) => row(seat, 0)) }
})

onMounted(() => {
  size()
  window.addEventListener('resize', size)
  if (typeof ResizeObserver === 'function' && box.value) { watcher = new ResizeObserver(size); watcher.observe(box.value) }
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp)
  document.addEventListener('visibilitychange', onHide)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf); sound.close()
  window.removeEventListener('resize', size); watcher?.disconnect()
  window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp)
  document.removeEventListener('visibilitychange', onHide)
})
</script>

<template>
  <ArenaStage title="Race" :chip="conn === 'open' ? (state?.practice ? 'Practice' : playing ? (seated ? 'Live' : 'Watching') : status) : 'Connecting…'" :off="conn !== 'open'" @leave="leave">
  <div class="rg" data-testid="race">
    <div v-if="gone" class="rg-card"><p>{{ note || 'That game is not on any more.' }}</p><BaseButton variant="primary" @click="leave">Back to games</BaseButton></div>
    <template v-else>
      <div class="rg-play arena-fill">
      <div ref="box" class="rg-stage"><canvas ref="canvas" aria-label="Race track" role="img" /></div>
      <p v-if="note" class="rg-note" role="status">{{ note }}</p>
      <section v-if="status === 'playing' && seated" class="rg-pad" aria-label="Controls" data-testid="race-pad">
        <div class="rg-steer">
          <button type="button" class="rg-btn mv" aria-label="Steer left" :class="{ on: down & INPUT.left }" @pointerdown="press(INPUT.left, true)($event)" @pointerup="press(INPUT.left, false)($event)" @pointercancel="press(INPUT.left, false)($event)" @pointerleave="press(INPUT.left, false)($event)">&#9664;</button>
          <button type="button" class="rg-btn mv" aria-label="Steer right" :class="{ on: down & INPUT.right }" @pointerdown="press(INPUT.right, true)($event)" @pointerup="press(INPUT.right, false)($event)" @pointercancel="press(INPUT.right, false)($event)" @pointerleave="press(INPUT.right, false)($event)">&#9654;</button>
        </div>
        <div class="rg-pedals">
          <button type="button" class="rg-btn brake" aria-label="Brake" :class="{ on: down & INPUT.brake }" @pointerdown="press(INPUT.brake, true)($event)" @pointerup="press(INPUT.brake, false)($event)" @pointercancel="press(INPUT.brake, false)($event)" @pointerleave="press(INPUT.brake, false)($event)">Brake</button>
          <button type="button" class="rg-btn gas" aria-label="Gas" :class="{ on: down & INPUT.gas }" @pointerdown="press(INPUT.gas, true)($event)" @pointerup="press(INPUT.gas, false)($event)" @pointercancel="press(INPUT.gas, false)($event)" @pointerleave="press(INPUT.gas, false)($event)">Gas</button>
          <button type="button" class="rg-auto" :class="{ on: autoGas }" :aria-pressed="autoGas" aria-label="Auto gas" @click="toggleAuto">Auto gas {{ autoGas ? 'on' : 'off' }}</button>
        </div>
        <p class="rg-small keys">Keys: arrows or WASD</p>
      </section>
      </div>

      <ul v-if="state && status === 'lobby'" class="rg-grid" data-testid="race-grid" aria-label="Starting grid">
        <li v-for="(s, i) in state.seats" :key="i"><i :style="{ background: defaultLook(i).body }" />{{ s.name }}<small v-if="i === state.you"> (you)</small></li>
        <li v-for="n in Math.max(0, state.max - state.seats.length)" :key="'e' + n" class="empty"><i />open seat</li>
      </ul>

      <section v-if="podium" class="rg-podium" data-testid="race-podium" aria-label="Podium">
        <div class="rg-steps">
          <div v-for="p in podium.top" :key="p!.seat" class="rg-step" :class="'p' + p!.place">
            <span class="rg-dot" :style="{ background: p!.color }" />
            <b>{{ p!.name }}<small v-if="p!.you"> (you)</small></b>
            <em>{{ p!.time }}</em>
            <span class="rg-block">{{ p!.place }}</span>
          </div>
        </div>
        <ol v-if="podium.rest.length" class="rg-rest" start="4"><li v-for="p in podium.rest" :key="p!.seat">{{ p!.name }} <em>{{ p!.time }}</em></li></ol>
        <ul v-if="podium.dnf.length" class="rg-dnf" data-testid="race-dnf"><li v-for="p in podium.dnf" :key="p!.seat">{{ p!.name }}<small v-if="p!.you"> (you)</small> <em>{{ p!.time }}</em></li></ul>
      </section>

      <ol v-if="board.length && spectator && playing" class="rg-board" :class="{ spec: spectator }" data-testid="race-board" aria-label="Leaderboard">
        <li v-for="row in board" :key="row.seat" :class="{ you: row.you, followed: spectator && follow === row.seat }" @click="watchSeat(row.seat)">
          <span class="rg-pos">{{ row.place }}</span><i :style="{ background: row.color }" /><span class="rg-name">{{ row.name }}</span><span class="rg-lap">Lap {{ row.lap }}/{{ laps }}</span><span class="rg-gap">{{ row.gap }}</span>
        </li>
      </ol>
      <p v-if="spectator && playing" class="rg-small">Following {{ follow >= 0 ? (state?.seats[follow]?.name ?? 'a racer') : 'the leader' }}. Tap a name to follow that car.</p>

      <ArenaRoomPanels v-if="status !== 'playing' || !seated" :room="room" />

    </template>
  </div>
  </ArenaStage>
</template>

<style scoped>
.rg { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; user-select: none; -webkit-user-select: none; }
.rg-play { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.rg-stage { position: relative; flex: 1 1 auto; min-height: 150px; background: #10382a; border-radius: 12px; overflow: hidden; }
.rg-stage canvas { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
@media (orientation: portrait) { .rg-stage { max-height: min(112vw, 58vh); } }
.rg-card { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.rg-card p { margin: 0; font-size: 14px; }
.rg-note { margin: 0; color: #a33; font-size: 13px; }
.rg-small { margin: 0; font-size: 12px; color: var(--c-muted); }
.rg-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.rg-grid li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #f3efe8; border-radius: 10px; font-size: 14px; font-weight: 600; }
.rg-grid li.empty { opacity: .5; font-weight: 400; }
.rg-grid i { width: 14px; height: 14px; border-radius: 4px; background: #bbb; flex: none; }
.rg-board { list-style: none; margin: 0; padding: 6px; display: grid; gap: 3px; background: #14181f; border-radius: 12px; color: #fff; }
.rg-board li { display: grid; grid-template-columns: 22px 12px 1fr auto auto; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; font-size: 13px; }
.rg-board.spec li { cursor: pointer; min-height: 30px; }
.rg-board li.you { background: rgba(255, 211, 77, .2); }
.rg-board li.followed { outline: 2px solid #5be37d; }
.rg-board i { width: 12px; height: 12px; border-radius: 4px; }
.rg-pos { font-weight: 800; text-align: center; }
.rg-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.rg-lap { color: #aab4cf; font-size: 12px; }
.rg-gap { min-width: 52px; text-align: right; font: 600 12px ui-monospace, monospace; color: #ffd34d; }
.rg-podium { padding: 14px 10px 8px; background: linear-gradient(#17304a, #10382a); border-radius: 14px; color: #fff; }
.rg-steps { display: grid; grid-template-columns: repeat(3, 1fr); align-items: end; gap: 6px; }
.rg-step { display: grid; justify-items: center; gap: 2px; text-align: center; font-size: 13px; }
.rg-step b { overflow-wrap: anywhere; } .rg-step em { font: 600 12px ui-monospace, monospace; color: #ffd34d; font-style: normal; }
.rg-dot { width: 28px; height: 28px; border-radius: 8px; border: 2px solid #fff; }
.rg-block { width: 100%; display: grid; place-items: center; font-size: 26px; font-weight: 900; background: #3b4a63; border-radius: 8px 8px 0 0; }
.rg-step.p1 .rg-block { height: 88px; background: #d4a72c; } .rg-step.p2 .rg-block { height: 62px; background: #9aa4b2; } .rg-step.p3 .rg-block { height: 44px; background: #b0703a; }
.rg-dnf { list-style: none; margin: 8px 0 0; padding: 0; font-size: 13px; color: #c9d2ea; } .rg-dnf em { font: 600 12px ui-monospace, monospace; color: #ff9d8a; font-style: normal; margin-left: 6px; }
.rg-rest { margin: 8px 0 0; padding-left: 26px; font-size: 13px; } .rg-rest em { font: 600 12px ui-monospace, monospace; color: #ffd34d; font-style: normal; margin-left: 6px; }
.rg-pad { position: relative; flex: none; height: 190px; touch-action: none; }
.rg-steer { position: absolute; left: 2px; bottom: 6px; display: flex; gap: 10px; }
.rg-pedals { position: absolute; right: 2px; bottom: 6px; width: 210px; height: 178px; }
.rg-btn { border: 2px solid #2b2233; background: #fff; font: 800 18px system-ui; color: #2b2233; touch-action: none; -webkit-tap-highlight-color: transparent; cursor: pointer; user-select: none; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
.rg-btn.on, .rg-btn:active { background: #ffd34d; transform: translateY(2px); box-shadow: none; }
.rg-btn.mv { width: 74px; height: 96px; border-radius: 24px; font-size: 28px; }
.rg-btn.gas { position: absolute; right: 0; bottom: 0; width: 118px; height: 118px; border-radius: 50%; background: #cdeed4; font-size: 22px; }
.rg-btn.brake { position: absolute; right: 122px; bottom: 6px; width: 70px; height: 70px; border-radius: 50%; background: #ffd2c9; font-size: 15px; }
.rg-auto { position: absolute; right: 0; top: 0; border: 2px solid #2b2233; border-radius: 99px; background: #fff; font: 700 12px system-ui; padding: 6px 10px; min-height: 36px; touch-action: manipulation; cursor: pointer; }
.rg-auto.on { background: #5be37d; }
.keys { display: none; position: absolute; bottom: -2px; left: 0; right: 0; text-align: center; }
@media (hover: hover) { .keys { display: block; } .rg-pad { height: 212px; } }
@media (orientation: landscape) {
  .rg-pad { position: absolute; left: 0; right: 0; bottom: 0; height: 168px; pointer-events: none; }
  .rg-pad .rg-btn, .rg-pad .rg-auto { pointer-events: auto; } .rg-pad .rg-btn { opacity: .7; } .keys { display: none; }
}
@media (orientation: landscape) and (max-height: 500px) { .rg-pad { height: 140px; } .rg-btn.mv { width: 70px; height: 76px; } .rg-btn.gas { width: 96px; height: 96px; } .rg-btn.brake { right: 102px; width: 64px; height: 64px; } .rg-pedals { width: 180px; height: 140px; } }
</style>
