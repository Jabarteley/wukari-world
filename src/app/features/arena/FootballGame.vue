<script setup lang="ts">
// Football: a top-down arcade match played live with friends (a private room joined by a link), against the computer, or watched.
// The server judges everything (src/arena/football.ts, server/growth/arena.ts); this screen sends a heading and the shoot / tackle
// buttons, and draws the snapshots it gets back on a 2D canvas, smoothed between ticks (src/arena/interp.ts). Your own footballer
// is moved locally at once and pulled back towards the server's. It is a lazy chunk of the Games app.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { APPEARANCE } from '../../../game/content/traits.ts'
import { InputPipe } from '../../../arena/client.ts'
import { useArenaRoom } from '../../../arena/room.ts'
import type { ArenaScreenProps } from '../../../arena/catalog.ts'
import ArenaRoomPanels from './ArenaRoomPanels.vue'
import ArenaStage from './ArenaStage.vue'
import { BTN, CARRY, CHARGE_FULL, CHARGING, EV, H, PHASE, PR, SPEED, W, dirCode, dirVector, heldMask, packInput } from '../../../arena/football.ts'
import { createFootballSound } from '../../../arena/football-sound.ts'
import type { FootballSnap } from '../../../arena/football.ts'
import { KITS, VIEW_H, VIEW_W, drawFootball, makePitch, newFx, screenToWorld, spawnEvents, viewRotation } from '../../../arena/football-draw.ts'
import type { Look, Meta } from '../../../arena/football-draw.ts'
import type { ArenaLook } from '../../../types/arena.ts'

const props = defineProps<ArenaScreenProps>()
const emit = defineEmits<{ close: [] }>()
const { game } = useApp()

const canvas = ref<HTMLCanvasElement | null>(null)
const box = ref<HTMLElement | null>(null)

const ownLook = (): ArenaLook | undefined => {
  const look = game.state.value.onboarding?.look as { skin?: string; hairColor?: string; outfitColor?: string; bottomsColor?: string } | undefined
  return look?.skin && look.hairColor && look.outfitColor && look.bottomsColor ? [look.skin, look.hairColor, look.outfitColor, look.bottomsColor] : undefined
}
const hex = (group: 'skin' | 'hairColours', id: string | undefined, fallback: string): string => APPEARANCE[group].find((swatch) => swatch.id === id)?.hex ?? fallback
const FALLBACK_LOOKS: Look[] = [{ skin: '#8a5a3c', hair: '#1c1c1c' }, { skin: '#a8714b', hair: '#2b1b12' }, { skin: '#6b432b', hair: '#1c1c1c' }, { skin: '#c18a5e', hair: '#111111' }]

const sound = createFootballSound()
const pending: { k: number; snap: FootballSnap }[] = []
const fx = newFx()
const room = useArenaRoom<FootballSnap>({
  game: 'football', intent: props.intent, hz: 20, look: ownLook, toast: (text, kind) => game.toast(text, kind), close: () => emit('close'),
  onMatch: () => { pending.length = 0 },
  onSnap: (k, snap) => { if (snap.e.length) pending.push({ k, snap }) },
})
room.mount()
const state = room.state, note = room.note, conn = room.conn, gone = room.gone, timeline = room.timeline
const seated = room.seated, status = room.status

// ---- input --------------------------------------------------------------------------------------------
// Joystick (touch / mouse) and keys both give a vector; the heading is its nearest of 24 directions.
let joyX = 0, joyY = 0, keyX = 0, keyY = 0
const keysDown = new Set<string>()
const charging = ref(false)
let chargeStart = 0
const knob = ref({ x: 0, y: 0 })
const chargePct = ref(0)
const cooling = ref(false)
// A heading change is a frame; stay under the host's 600 frames a minute (about 9 a second at most).
const pipe = new InputPipe({ now: () => performance.now(), minGapMs: 110, resendMs: 600, send: (held, pressed) => { room.sendInput(packInput(held & 31, (held & BTN.chg) !== 0, pressed)) } })
let heading = 0
let viewRot = 0
function refresh(): void {
  const sx = keyX || keyY ? keyX : joyX, sy = keyX || keyY ? keyY : joyY
  // The joystick and arrows are SCREEN directions; the pitch may be turned, so turn them back into pitch directions.
  const [vx, vy] = screenToWorld(sx, sy, viewRot)
  heading = dirCode(vx, vy, 0.2)
  pipe.hold(heldMask(heading, charging.value))
}
const playing = (): boolean => state.value?.status === 'playing' && seated.value
function shootDown(): void {
  if (!playing() || charging.value) return
  sound.unlock(); charging.value = true; chargeStart = performance.now(); refresh()
}
function shootUp(): void {
  if (!charging.value) return
  charging.value = false; chargePct.value = 0
  pipe.press(BTN.kick); refresh(); pipe.flush()
}
function tackle(): void { sound.unlock(); if (playing() && !cooling.value) { pipe.press(BTN.tackle); pipe.flush() } }

let joyId = -1, joyBox: DOMRect | null = null
function joyMove(event: PointerEvent): void {
  if (!joyBox) return
  const r = joyBox.width / 2
  let dx = event.clientX - (joyBox.left + r), dy = event.clientY - (joyBox.top + r)
  const len = Math.hypot(dx, dy)
  if (len > r) { dx = dx / len * r; dy = dy / len * r }
  knob.value = { x: dx, y: dy }
  joyX = dx / r; joyY = dy / r
  refresh()
}
function joyStart(event: PointerEvent): void {
  sound.unlock()
  joyId = event.pointerId; joyBox = (event.currentTarget as HTMLElement).getBoundingClientRect()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  joyMove(event)
}
function joyStop(event: PointerEvent): void {
  if (event.pointerId !== joyId) return
  joyId = -1; joyX = 0; joyY = 0; knob.value = { x: 0, y: 0 }; refresh()
}
const AXES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
}
function key(event: KeyboardEvent, on: boolean): void {
  const target = event.target as HTMLElement | null
  if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
  const k = event.key.length === 1 ? event.key.toLowerCase() : event.key
  if (AXES[k]) {
    event.preventDefault()
    if (on) keysDown.add(k); else keysDown.delete(k)
    keyX = 0; keyY = 0
    for (const held of keysDown) { const [x, y] = AXES[held] as [number, number]; keyX += x; keyY += y }
    refresh()
  } else if (k === ' ' || k === 'j' || k === 'z') {
    event.preventDefault()
    if (on && !event.repeat) shootDown(); else if (!on) shootUp()
  } else if ((k === 'k' || k === 'x' || k === 'Shift') && on && !event.repeat) { event.preventDefault(); tackle() }
}
const onDown = (e: KeyboardEvent): void => key(e, true)
const onUp = (e: KeyboardEvent): void => key(e, false)
const onHide = (): void => {
  if (!document.hidden) return
  keysDown.clear(); keyX = keyY = joyX = joyY = 0; charging.value = false; knob.value = { x: 0, y: 0 }; heading = 0
  pipe.reset(); pipe.flush()
}

// ---- drawing ---------------------------------------------------------------------------------------------
let raf = 0, lastFrame = 0, width = 0, height = 0, seenPhase = -1
let pitch: HTMLCanvasElement | null = null
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const PREVIEW: FootballSnap = { p: PHASE.play, c: 0, t: 120, q: 0, g: [0, 0], b: [W / 2, H / 2, 0], f: [[W * 0.3, H / 2, 0, 0], [W * 0.7, H / 2, 12, 0]], k: [H / 2, H / 2], e: [] }
const portrait = ref(true)
let watcher: ResizeObserver | null = null
function size(): void {
  const el = canvas.value, holder = box.value
  if (!el || !holder) return
  // The holder fills the free space (ArenaStage); a tall holder gets the pitch turned upright, a wide one keeps it flat.
  width = Math.max(200, holder.clientWidth)
  height = Math.max(120, holder.clientHeight)
  portrait.value = height >= width
  const ratio = Math.min(window.devicePixelRatio || 1, 1.75)
  el.width = Math.round(width * ratio); el.height = Math.round(height * ratio)
  el.style.width = width + 'px'; el.style.height = height + 'px'
  if (!pitch) pitch = makePitch(Math.round(VIEW_W * 1.15), Math.round(VIEW_H * 1.15), 1.15)
}
const live = computed(() => status.value === 'playing' && seated.value)
watch(live, () => nextTick(size))

// Own player, predicted: the same speeds as the rules, pulled back to the server's position so it can never drift.
let lastBoard = ''
const sb = ref({ a: 'Home', b: 'Away', ga: 0, gb: 0, clock: '' })
const own = { x: 0, y: 0, ready: false }
function predict(dtMs: number, latest: FootballSnap, you: number): { x: number; y: number } | null {
  const f = latest.f[you]
  if (!f) return null
  const live = latest.p === PHASE.play && state.value?.status === 'playing'
  const blocked = (f[3] & 3) !== 0
  if (!own.ready || !live || blocked) { own.x = f[0]; own.y = f[1]; own.ready = true; return own }
  const [dx, dy] = dirVector(heading)
  const speed = SPEED * (latest.b[2] === you + 1 ? CARRY : 1) * (charging.value ? CHARGING : 1) * (dtMs / 50)
  own.x = Math.min(W - PR, Math.max(PR, own.x + dx * speed)); own.y = Math.min(H - PR, Math.max(PR, own.y + dy * speed))
  const ex = f[0] - own.x, ey = f[1] - own.y, off = Math.hypot(ex, ey)
  if (off > 90) { own.x = f[0]; own.y = f[1] } else { const pull = heading ? 0.06 : 0.25; own.x += ex * pull; own.y += ey * pull }
  return own
}

function metaFor(): Meta {
  const st = state.value
  const seats = st?.seats ?? []
  const count = Math.max(2, seats.length, Number(st?.options.side ?? 1) * 2)
  const looks: Look[] = []
  const names: string[] = []
  for (let p = 0; p < Math.max(count, 4); p++) {
    const seat = seats[p]
    const l = seat?.look
    looks.push(l ? { skin: hex('skin', l[0], FALLBACK_LOOKS[p % 4]!.skin), hair: hex('hairColours', l[1], FALLBACK_LOOKS[p % 4]!.hair) } : FALLBACK_LOOKS[p % 4]!)
    names.push(seat && !seat.bot ? seat.name.slice(0, 9) : '')
  }
  const team = (t: number): string => { const n = seats.filter((s, i) => i % 2 === t && !s.bot).map((s) => s.name.slice(0, 9)); return n.length ? (n.length > 1 ? n[0] + ' +' + (n.length - 1) : n[0]) as string : (t ? 'Computer' : 'Home') }
  return { names, kits: KITS, looks, you: st?.you ?? null, reduced, teamNames: [team(0), team(1)], portrait: portrait.value }
}

function frame(now: number): void {
  raf = requestAnimationFrame(frame)
  pipe.flush()
  const el = canvas.value, st = state.value
  if (!el || document.hidden) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  const dtMs = lastFrame ? Math.min(100, now - lastFrame) : 16.7
  const dt = dtMs / 16.7
  lastFrame = now
  if (charging.value) chargePct.value = Math.min(1, (now - chargeStart) / (CHARGE_FULL * 50))
  const pick = st ? timeline.pick(now) : null
  const live = pick?.a ?? room.latest
  const a = live ?? PREVIEW, b = pick?.b ?? live ?? PREVIEW
  while (pending.length && pick && (pending[0] as { k: number }).k <= pick.tick) {
    const ev = (pending.shift() as { snap: FootballSnap }).snap
    spawnEvents(fx, ev, reduced)
    for (const e of ev.e) { if (e[0] === EV.kick) sound.kick(e[3] === 1); else if (e[0] === EV.tackle) sound.tackle(); else if (e[0] === EV.post) sound.post(); else if (e[0] === EV.save) sound.save(); else if (e[0] === EV.goal) sound.goal() }
  }
  if (b.p !== seenPhase) {
    if ((b.p === PHASE.play && seenPhase === PHASE.kickoff) || b.p === PHASE.kickoff) sound.whistle()
    if (b.p === PHASE.over) sound.whistle(true)
    seenPhase = b.p
  }
  const you = st?.you ?? null
  const latest = room.latest
  const meta = metaFor()
  viewRot = viewRotation(you, meta.portrait)
  const board = `${meta.teamNames[0]}|${meta.teamNames[1]}|${b.g[0]}|${b.g[1]}|${b.t}|${b.q}`
  if (board !== lastBoard) { lastBoard = board; sb.value = { a: meta.teamNames[0], b: meta.teamNames[1], ga: b.g[0], gb: b.g[1], clock: b.q ? 'GOLDEN GOAL' : `${Math.floor(b.t / 60)}:${String(b.t % 60).padStart(2, '0')}` } }
  if (you !== null && latest && st?.status === 'playing') {
    meta.own = predict(dtMs, latest, you)
    cooling.value = ((latest.f[you]?.[3] ?? 0) & 32) !== 0
  } else { own.ready = false; meta.own = null; cooling.value = false }
  drawFootball(ctx, el.width, el.height, pitch, st ? a : PREVIEW, st ? b : PREVIEW, pick?.t ?? 0, meta, fx, dt)
}

function leave(): void { room.leave() }
const chip = computed(() => (conn.value !== 'open' ? 'Connecting…' : state.value?.practice ? 'Practice' : status.value === 'playing' ? (seated.value ? 'Live' : 'Watching') : status.value))

onMounted(() => {
  size()
  window.addEventListener('resize', size)
  if (typeof ResizeObserver === 'function' && box.value) { watcher = new ResizeObserver(size); watcher.observe(box.value) }
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp)
  document.addEventListener('visibilitychange', onHide)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  watcher?.disconnect()
  window.removeEventListener('resize', size)
  window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp)
  document.removeEventListener('visibilitychange', onHide)
  sound.close()
})
</script>

<template>
  <ArenaStage title="Football" :chip="conn === 'open' ? (state?.practice ? 'Practice' : status === 'playing' ? (seated ? 'Live' : 'Watching') : status) : 'Connecting…'" :off="conn !== 'open'" @leave="leave">
    <template #bar>
      <span class="fb-sbar" data-testid="football-score"><b class="a">{{ sb.a }}</b><strong>{{ sb.ga }} - {{ sb.gb }}</strong><b class="b">{{ sb.b }}</b><small>{{ sb.clock }}</small></span>
    </template>
    <div class="fb" data-testid="football">
      <div v-if="gone" class="fb-card"><p>{{ note || 'That game is not on any more.' }}</p><button type="button" class="fb-go" @click="leave">Back to games</button></div>
      <template v-else>
        <div class="fb-play" :class="{ idle: !live }">
          <div ref="box" class="fb-stage arena-fill"><canvas ref="canvas" aria-label="Football pitch" role="img" /></div>
          <section v-if="live" class="fb-pad" aria-label="Controls" data-testid="football-pad">
            <div class="fb-joy" aria-label="Move" data-testid="football-joy" @pointerdown.prevent="joyStart" @pointermove.prevent="joyId >= 0 && joyMove($event)" @pointerup.prevent="joyStop" @pointercancel="joyStop">
              <div class="fb-knob" :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }" />
            </div>
            <div class="fb-acts">
              <button type="button" class="fb-btn tackle" :class="{ cool: cooling }" aria-label="Slide tackle" data-testid="football-tackle" @pointerdown.prevent="tackle">Tackle</button>
              <button type="button" class="fb-btn shoot" :class="{ on: charging }" aria-label="Pass or shoot" data-testid="football-shoot" :style="{ '--p': chargePct }" @pointerdown.prevent="shootDown" @pointerup.prevent="shootUp" @pointercancel="shootUp" @pointerleave="shootUp">
                <span>{{ charging ? 'Release' : 'Pass / Shoot' }}</span>
              </button>
            </div>
          </section>
        </div>
        <p v-if="note" class="fb-note" role="status">{{ note }}</p>
        <p v-if="live" class="fb-small keys">Keys: arrows or WASD move · Space tap pass, hold to shoot · K slide tackle</p>
        <ArenaRoomPanels v-if="!live" :room="room" />
      </template>
    </div>
  </ArenaStage>
</template>

<style scoped>
.fb { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; user-select: none; -webkit-user-select: none; }
.fb-sbar { display: flex; align-items: baseline; gap: 8px; font-size: 13px; color: #1a1d24; white-space: nowrap; }
.fb-sbar b { max-width: 84px; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
.fb-sbar b.a { border-bottom: 3px solid #0a8f3c; } .fb-sbar b.b { border-bottom: 3px solid #f3c20f; }
.fb-sbar strong { font-size: 18px; color: #0a6b2d; font-variant-numeric: tabular-nums; }
.fb-sbar small { font-size: 12px; opacity: 0.9; font-variant-numeric: tabular-nums; }
.fb-play { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.fb-play.idle { flex: none; }
.fb-stage { position: relative; flex: 1 1 auto; min-height: 150px; background: #12301d; border-radius: 12px; overflow: hidden; }
.fb-play.idle .fb-stage { flex: none; height: min(78vw, 42vh); }
.fb-stage canvas { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
.fb-card { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.fb-go { min-height: 44px; border-radius: 10px; border: 0; background: #0a8f3c; color: #fff; font: 700 15px system-ui; }
.fb-note { margin: 0; color: #fca5a5; font-size: 13px; }
.fb-small { font-size: 12px; color: var(--c-muted); margin: 0; }
.fb-pad { position: relative; flex: none; display: flex; justify-content: space-between; align-items: center; gap: 10px; touch-action: none; padding: 4px 8px 8px; }
.fb-joy { width: 128px; height: 128px; border-radius: 50%; background: rgba(15, 81, 50, 0.14); border: 3px solid #0f5132; display: grid; place-items: center; touch-action: none; }
.fb-knob { width: 54px; height: 54px; border-radius: 50%; background: #0a8f3c; box-shadow: 0 3px 0 #06592a; pointer-events: none; }
.fb-acts { display: flex; gap: 12px; align-items: center; }
.fb-btn { border-radius: 50%; border: 3px solid #1b1b1b; font: 800 13px system-ui; color: #1b1b1b; touch-action: none; -webkit-tap-highlight-color: transparent; cursor: pointer; }
.fb-btn.tackle { width: 72px; height: 72px; background: #ffd2c9; }
.fb-btn.tackle.cool { opacity: 0.45; }
.fb-btn.shoot { width: 100px; height: 100px; background: conic-gradient(#ff4d2e calc(var(--p, 0) * 360deg), #fff3b0 0); display: grid; place-items: center; position: relative; }
.fb-btn.shoot span { position: absolute; inset: 9px; border-radius: 50%; background: #ffe14d; display: grid; place-items: center; line-height: 1.1; padding: 4px; text-align: center; }
.fb-btn.shoot.on span { background: #ffb020; }
.keys { text-align: center; display: none; }
@media (hover: hover) { .keys { display: block; } }
/* Landscape: the pitch takes the whole screen and the thumbs sit on top of its lower corners. */
@media (orientation: landscape) {
  .fb-pad { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 8px 6px; pointer-events: none; }
  .fb-pad .fb-joy, .fb-pad .fb-btn { pointer-events: auto; opacity: 0.7; }
  .fb-joy { width: 108px; height: 108px; } .fb-knob { width: 46px; height: 46px; }
  .fb-btn.shoot { width: 86px; height: 86px; } .fb-btn.tackle { width: 62px; height: 62px; }
  .keys { display: none; }
  .fb-play.idle .fb-stage { height: min(40vh, 60vw); }
}
</style>
