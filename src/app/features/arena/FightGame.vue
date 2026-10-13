<script setup lang="ts">
// Fight: a 1v1 brawler played live against a friend (a private room, joined by a link), against the computer, or watched.
// The server judges everything (src/arena/fight.ts, server/growth/arena.ts); this screen sends what the player is pressing, and
// draws the snapshots it gets back on a 2D canvas, smoothed between ticks (src/arena/interp.ts). It is a lazy chunk of the Games app.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import { APPEARANCE } from '../../../game/content/traits.ts'
import { createArenaClient, InputPipe } from '../../../arena/client.ts'
import { BTN, packInput } from '../../../arena/fight.ts'
import type { FightSnap } from '../../../arena/fight.ts'
import { drawFight, newFx, spawnHits } from '../../../arena/fight-draw.ts'
import type { FighterColors } from '../../../arena/fight-draw.ts'
import { Timeline } from '../../../arena/interp.ts'
import type { ArenaLook, ArenaStateFrame } from '../../../types/arena.ts'

const props = defineProps<{ intent: { kind: 'create' | 'practice' | 'join'; room?: string } }>()
const emit = defineEmits<{ close: [] }>()
const { game } = useApp()

const state = shallowRef<ArenaStateFrame | null>(null)
const note = ref('')
const conn = ref<'connecting' | 'open' | 'closed'>('connecting')
const gone = ref(false)
const canvas = ref<HTMLCanvasElement | null>(null)
const box = ref<HTMLElement | null>(null)
const copied = ref(false)

const ownLook = (): ArenaLook | undefined => {
  const look = game.state.value.onboarding?.look as { skin?: string; hairColor?: string; outfitColor?: string; bottomsColor?: string } | undefined
  return look?.skin && look.hairColor && look.outfitColor && look.bottomsColor ? [look.skin, look.hairColor, look.outfitColor, look.bottomsColor] : undefined
}
const hex = (group: 'skin' | 'hairColours' | 'outfitColours', id: string | undefined, fallback: string): string => APPEARANCE[group].find((swatch) => swatch.id === id)?.hex ?? fallback
function colors(seat: number): FighterColors {
  const look = state.value?.seats[seat]?.look
  const base: FighterColors = seat ? { skin: '#a8714b', hair: '#1c1c1c', top: '#2f80ed', bottoms: '#27314f' } : { skin: '#8a5a3c', hair: '#1c1c1c', top: '#e8553d', bottoms: '#3b2a2a' }
  if (!look) return base
  return { skin: hex('skin', look[0], base.skin), hair: hex('hairColours', look[1], base.hair), top: hex('outfitColours', look[2], base.top), bottoms: hex('outfitColours', look[3], base.bottoms) }
}
const dist = (a: string, b: string): number => { const n = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0); const x = n(a), y = n(b); return Math.hypot((x[0] ?? 0) - (y[0] ?? 0), (x[1] ?? 0) - (y[1] ?? 0), (x[2] ?? 0) - (y[2] ?? 0)) }

// ---- the socket -------------------------------------------------------------------------------------
let room = props.intent.room ?? ''
let created = false
const timeline = new Timeline<FightSnap>(50, 2)
let latest: FightSnap | null = null
const pendingHits: { k: number; snap: FightSnap }[] = []
const fx = newFx()
let matchSeen = 0
const client = createArenaClient({
  open() {
    if (room) client.send('arena-join', { room, look: ownLook() })
    else if (!created) { created = true; client.send('arena-create', { game: 'fight', practice: props.intent.kind === 'practice', look: ownLook() }) }
  },
  state(frame) {
    room = frame.room
    if (frame.status === 'closed') { gone.value = true; note.value = 'This game has ended.'; state.value = frame; return }
    if (frame.match !== matchSeen) { matchSeen = frame.match; timeline.clear(); pendingHits.length = 0; latest = null }
    if (frame.snap && !latest) latest = frame.snap as FightSnap
    state.value = frame; note.value = ''
  },
  snap(r, k, s) {
    if (r !== room) return
    const snap = s as FightSnap
    latest = snap
    timeline.push(k, performance.now(), snap)
    if (snap.e.length) pendingHits.push({ k, snap })
  },
  error(code, reason) {
    note.value = reason
    if (code === 'arena_unknown' || code === 'arena_game' || code === 'arena_full') gone.value = !state.value
  },
  connection(status) { conn.value = status },
})

// ---- input --------------------------------------------------------------------------------------------
let heldBits = 0
const pipe = new InputPipe({ now: () => performance.now(), send: (held, pressed) => { if (room) client.send('arena-input', { room, i: packInput(held, pressed) }) } })
const seated = computed(() => state.value?.you != null)
const down = ref(0)
function hold(bit: number, on: boolean): void { heldBits = on ? heldBits | bit : heldBits & ~bit; down.value = heldBits; pipe.hold(heldBits & (BTN.left | BTN.right | BTN.block)) }
function tap(bit: number): void { if (seated.value && state.value?.status === 'playing') pipe.press(bit) }
const KEYS: Record<string, { hold?: number; tap?: number }> = {
  ArrowLeft: { hold: BTN.left }, a: { hold: BTN.left }, ArrowRight: { hold: BTN.right }, d: { hold: BTN.right },
  ArrowUp: { tap: BTN.jump }, w: { tap: BTN.jump }, ' ': { tap: BTN.jump },
  j: { tap: BTN.punch }, z: { tap: BTN.punch }, k: { tap: BTN.kick }, x: { tap: BTN.kick },
  ArrowDown: { hold: BTN.block }, s: { hold: BTN.block }, l: { hold: BTN.block }, Shift: { hold: BTN.block },
}
function key(event: KeyboardEvent, on: boolean): void {
  const target = event.target as HTMLElement | null
  if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
  const map = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
  if (!map) return
  event.preventDefault()
  if (map.hold) hold(map.hold, on)
  if (map.tap && on && !event.repeat) tap(map.tap)
}
const onDown = (e: KeyboardEvent): void => key(e, true)
const onUp = (e: KeyboardEvent): void => key(e, false)
const onHide = (): void => { if (document.hidden) { heldBits = 0; down.value = 0; pipe.reset(); pipe.flush() } }

// ---- drawing ---------------------------------------------------------------------------------------------
let raf = 0, lastFrame = 0, width = 0, height = 0
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
function size(): void {
  const el = canvas.value, holder = box.value
  if (!el || !holder) return
  width = Math.max(240, Math.min(560, holder.clientWidth)); height = Math.round(Math.min(340, width * 0.68))
  const ratio = Math.min(window.devicePixelRatio || 1, 1.75)
  el.width = Math.round(width * ratio); el.height = Math.round(height * ratio)
  el.style.width = width + 'px'; el.style.height = height + 'px'
  el.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
}
function frame(now: number): void {
  raf = requestAnimationFrame(frame)
  pipe.flush()
  const el = canvas.value, st = state.value
  if (!el || !st || document.hidden) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  const dt = lastFrame ? Math.min(4, (now - lastFrame) / 16.7) : 1
  lastFrame = now
  const pick = timeline.pick(now)
  const a = pick?.a ?? latest, b = pick?.b ?? latest
  if (!a || !b) { ctx.fillStyle = '#1b2559'; ctx.fillRect(0, 0, width, height); return }
  while (pendingHits.length && pick && (pendingHits[0] as { k: number }).k <= pick.tick) spawnHits(fx, (pendingHits.shift() as { snap: FightSnap }).snap, reduced)
  const c0 = colors(0); let c1 = colors(1)
  if (dist(c0.top, c1.top) < 70) c1 = { ...c1, top: '#2f80ed' }
  drawFight(ctx, width, height, a, b, pick?.t ?? 0, {
    names: [st.seats[0]?.name ?? 'Fighter', st.seats[1]?.name ?? '...'], colors: [c0, c1], you: st.you, rounds: Number(st.options.rounds ?? 3), reduced,
  }, fx, dt)
}

// ---- actions -------------------------------------------------------------------------------------------------
const link = computed(() => (state.value ? `${location.origin}/?table=${state.value.room}` : ''))
async function share(): Promise<void> {
  const { shareAddress } = await import('../paths/share.ts')
  await shareAddress(`/?table=${state.value?.room ?? ''}`, 'Come and fight me on Allworld:', (text, kind) => game.toast(text, kind))
}
async function copy(): Promise<void> {
  const { loadShareModule } = await import('../growth/boundary.ts')
  copied.value = await (await loadShareModule()).copyText(link.value)
  setTimeout(() => { copied.value = false }, 2000)
}
const start = (bots: number): void => { client.send('arena-start', { room, bots }) }
const again = (): void => { client.send('arena-again', { room }) }
const setRounds = (event: Event): void => { client.send('arena-options', { room, options: { rounds: Number((event.target as HTMLSelectElement).value) } }) }
function leave(): void { if (room) client.send('arena-leave', { room }); client.close(); emit('close') }

const status = computed(() => state.value?.status ?? 'lobby')
const opponent = computed(() => state.value?.seats.find((_, index) => index !== state.value?.you)?.name ?? '')
const iAsked = computed(() => state.value?.you != null && state.value.again[state.value.you] === true)
const headline = computed(() => {
  const r = state.value?.result
  if (!r) return ''
  if (r.draw) return 'Draw'
  return r.winners.includes(state.value?.you ?? -1) ? 'You win!' : state.value?.you == null ? 'Fight over' : 'You lose'
})
watch(() => state.value?.hz, (hz) => { if (hz && hz !== 20) console.warn('fight expects 20 Hz') })

onMounted(() => {
  size()
  window.addEventListener('resize', size)
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp)
  document.addEventListener('visibilitychange', onHide)
  client.connect()
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', size)
  window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp)
  document.removeEventListener('visibilitychange', onHide)
  client.close()
})
</script>

<template>
  <div class="fg" data-testid="fight">
    <header class="fg-top">
      <button type="button" class="fg-back" @click="leave">‹ Leave</button>
      <b>Fight</b>
      <span class="fg-chip" :class="{ off: conn !== 'open' }">{{ conn === 'open' ? (state?.practice ? 'Practice' : status === 'playing' ? (seated ? 'Live' : 'Watching') : status) : 'Connecting…' }}</span>
    </header>
    <div v-if="gone" class="fg-card"><p>{{ note || 'That game is not on any more.' }}</p><BaseButton variant="primary" @click="leave">Back to games</BaseButton></div>
    <template v-else>
      <div ref="box" class="fg-stage"><canvas ref="canvas" aria-label="Fight arena" role="img" /></div>
      <p v-if="note" class="fg-note" role="status">{{ note }}</p>

      <section v-if="status === 'lobby' && state" class="fg-card" data-testid="fight-lobby">
        <h3>Waiting for your friend</h3>
        <p>Send them this link. When they open it they come straight into this fight.</p>
        <input class="fg-link" readonly :value="link" aria-label="Invite link" @focus="($event.target as HTMLInputElement).select()">
        <div class="fg-row">
          <BaseButton variant="primary" @click="share">Share link</BaseButton>
          <BaseButton @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</BaseButton>
        </div>
        <label v-if="state.host" class="fg-opt">Rounds
          <select :value="state.options.rounds" @change="setRounds"><option v-for="(v, i) in state.optionList.find((o) => o.name === 'rounds')?.values ?? []" :key="String(v)" :value="v">{{ state.optionList.find((o) => o.name === 'rounds')?.names[i] }}</option></select>
        </label>
        <BaseButton block @click="start(1)">Play the computer instead</BaseButton>
        <p class="fg-small">Anyone who opens the link after two people are in will watch.</p>
      </section>

      <section v-else-if="status === 'over' && state" class="fg-card" data-testid="fight-over">
        <h3>{{ headline }}</h3>
        <p>{{ state.result?.text }}</p>
        <div v-if="seated" class="fg-row">
          <BaseButton variant="primary" :disabled="iAsked" @click="again">{{ iAsked ? (state.practice ? 'Starting…' : 'Waiting for ' + (opponent || 'your friend') + '…') : 'Rematch' }}</BaseButton>
          <BaseButton @click="leave">Leave</BaseButton>
        </div>
        <div v-else class="fg-row"><BaseButton @click="leave">Leave</BaseButton></div>
        <BaseButton v-if="!state.practice" block @click="share">Invite someone else</BaseButton>
      </section>

      <section v-else-if="seated" class="fg-pad" aria-label="Controls" data-testid="fight-pad">
        <div class="fg-left">
          <button type="button" class="fg-btn" aria-label="Move left" :class="{ on: down & BTN.left }" @pointerdown.prevent="hold(BTN.left, true)" @pointerup.prevent="hold(BTN.left, false)" @pointercancel="hold(BTN.left, false)" @pointerleave="hold(BTN.left, false)">◀</button>
          <button type="button" class="fg-btn" aria-label="Move right" :class="{ on: down & BTN.right }" @pointerdown.prevent="hold(BTN.right, true)" @pointerup.prevent="hold(BTN.right, false)" @pointercancel="hold(BTN.right, false)" @pointerleave="hold(BTN.right, false)">▶</button>
          <button type="button" class="fg-btn up" aria-label="Jump" @pointerdown.prevent="tap(BTN.jump)">▲</button>
        </div>
        <div class="fg-right">
          <button type="button" class="fg-btn big punch" aria-label="Punch" @pointerdown.prevent="tap(BTN.punch)">Punch</button>
          <button type="button" class="fg-btn big kick" aria-label="Kick" @pointerdown.prevent="tap(BTN.kick)">Kick</button>
          <button type="button" class="fg-btn block" aria-label="Block" :class="{ on: down & BTN.block }" @pointerdown.prevent="hold(BTN.block, true)" @pointerup.prevent="hold(BTN.block, false)" @pointercancel="hold(BTN.block, false)" @pointerleave="hold(BTN.block, false)">Block</button>
        </div>
        <p class="fg-small keys">Keys: A D move · W jump · J punch · K kick · S block</p>
      </section>
      <section v-else class="fg-card"><p>You are watching {{ state?.seats.map((s) => s.name).join(' vs ') }}.</p><p class="fg-small">{{ state?.watchers }} watching</p></section>
    </template>
  </div>
</template>

<style scoped>
.fg { display: grid; gap: 12px; user-select: none; -webkit-user-select: none; }
.fg-top { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
.fg-back { border: 0; background: none; font: inherit; font-size: 13px; text-decoration: underline; color: var(--c-muted); min-height: 44px; cursor: pointer; }
.fg-chip { font-size: 12px; padding: 4px 10px; border-radius: 99px; background: #e2f2e9; color: #22543d; font-weight: 650; text-transform: capitalize; }
.fg-chip.off { background: #fff0d1; color: #8a4b0a; }
.fg-stage { width: 100%; display: flex; justify-content: center; background: #1b2559; border-radius: 14px; overflow: hidden; }
.fg-stage canvas { display: block; touch-action: none; }
.fg-card { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.fg-card h3 { margin: 0; font-size: 20px; }
.fg-card p { margin: 0; font-size: 14px; line-height: 1.45; }
.fg-link { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cfc7b8; border-radius: 8px; font: 13px ui-monospace, monospace; background: #fff; }
.fg-row { display: flex; gap: 8px; } .fg-row > * { flex: 1; }
.fg-opt { display: flex; justify-content: space-between; align-items: center; font-size: 14px; } .fg-opt select { padding: 8px; }
.fg-small { font-size: 12px; color: var(--c-muted); } .fg-note { margin: 0; color: #a33; font-size: 13px; }
.fg-pad { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; flex-wrap: wrap; touch-action: none; }
.fg-left, .fg-right { display: flex; gap: 8px; align-items: flex-end; }
.fg-left { flex-wrap: wrap; width: 170px; }
.fg-btn { min-width: 72px; height: 72px; border-radius: 16px; border: 2px solid #2b2233; background: #fff; font: 800 18px system-ui; color: #2b2233; touch-action: none; -webkit-tap-highlight-color: transparent; cursor: pointer; }
.fg-btn.on, .fg-btn:active { background: #ffd34d; }
.fg-btn.up { min-width: 152px; height: 56px; }
.fg-btn.big { min-width: 84px; height: 84px; border-radius: 50%; font-size: 16px; }
.fg-btn.punch { background: #ffd2c9; } .fg-btn.kick { background: #cfe3ff; } .fg-btn.block { height: 60px; background: #d8f0dc; }
.keys { width: 100%; text-align: center; }
@media (hover: none) { .keys { display: none; } }
</style>
