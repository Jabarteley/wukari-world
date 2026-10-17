<script setup lang="ts">
// One lite-game room (a definition from src/arena/lite/, drawn by src/arena/lite/draw.ts). Opened by LiteGame.vue once a game is chosen,
// or for a shared room link (then `game` is empty and the room names its own game). Lobby, share and result are the shared arena panels.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '../../ui/BaseButton.vue'
import { useApp } from '../../state/app.ts'
import { useArenaRoom, aiName } from '../../../arena/room.ts'
import type { ArenaIntent } from '../../../arena/catalog.ts'
import type { LiteGameV1 } from '../../../arena/lite/schema.ts'
import { drawLite, packInput } from '../../../arena/lite/draw.ts'
import ArenaRoomPanels from './ArenaRoomPanels.vue'
import ArenaStage from './ArenaStage.vue'

const props = defineProps<{ intent: ArenaIntent; game: string }>()
const emit = defineEmits<{ close: [] }>()
const { game: app } = useApp()

const box = ref<HTMLElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null)
const def = ref<LiteGameV1 | null>(null)
const loadNote = ref('')
const room = useArenaRoom<number[]>({
  game: 'lite', intent: props.intent, hz: 15, toast: (text, kind) => app.toast(text, kind), close: () => emit('close'),
  ...(props.game ? { options: { game: props.game } } : {}),
})
room.mount()
const { state, note, conn, gone, seated, status } = room
const gameId = computed(() => String(state.value?.options.game ?? props.game ?? ''))
const playing = computed(() => status.value === 'playing')

let fetched = ''
async function loadDef(id: string): Promise<void> {
  if (!id || id === fetched) return
  fetched = id; loadNote.value = ''
  try {
    const answer = await (await fetch(`/api/spaces/game?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })).json() as { ok?: boolean; def?: LiteGameV1; reason?: string }
    if (id !== fetched) return
    if (answer.ok && answer.def) def.value = answer.def
    else { fetched = ''; loadNote.value = answer.reason || 'Could not load this game.' }
  } catch { fetched = ''; loadNote.value = 'Could not load this game. Check your connection.' }
}
watch(gameId, (id) => { void loadDef(id) }, { immediate: true })

// ---- input: arrows / WASD and the on-screen pad; sent only when the packed input changes -----------------------------------------
const held = ref({ l: false, r: false, u: false, d: false })
let sent = 4, resend = 0
function current(): number {
  const h = held.value, stick = def.value?.controls === 'stick'
  return packInput((h.r ? 1 : 0) - (h.l ? 1 : 0), stick ? (h.d ? 1 : 0) - (h.u ? 1 : 0) : 0)
}
function push(force = false): void {
  const next = current()
  if (!force && next === sent) return
  sent = next; resend = performance.now()
  room.sendInput(next)
}
function hold(dir: 'l' | 'r' | 'u' | 'd', on: boolean): void { if (held.value[dir] === on) return; held.value = { ...held.value, [dir]: on }; push() }
function release(): void { held.value = { l: false, r: false, u: false, d: false }; push() }
const KEYS: Record<string, 'l' | 'r' | 'u' | 'd'> = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' }
function key(event: KeyboardEvent, on: boolean): void {
  const target = event.target as HTMLElement | null
  if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
  const dir = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
  if (!dir) return
  event.preventDefault(); hold(dir, on)
}
const onDown = (e: KeyboardEvent): void => key(e, true), onUp = (e: KeyboardEvent): void => key(e, false)
const onHide = (): void => { if (document.hidden) release() }
const press = (dir: 'l' | 'r' | 'u' | 'd', on: boolean) => (event: Event): void => { event.preventDefault(); hold(dir, on) }
watch(playing, (on) => { if (!on) { held.value = { l: false, r: false, u: false, d: false }; sent = 4 } })

// ---- drawing -------------------------------------------------------------------------------------------------------------------
let raf = 0, width = 0, height = 0
let watcher: ResizeObserver | null = null
function size(): void {
  const el = canvas.value, holder = box.value
  if (!el || !holder) return
  width = Math.max(200, holder.clientWidth); height = Math.max(120, holder.clientHeight)
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(width * ratio); el.height = Math.round(height * ratio)
  el.style.width = width + 'px'; el.style.height = height + 'px'
  el.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
}
function frame(): void {
  raf = requestAnimationFrame(frame)
  const el = canvas.value, d = def.value, st = state.value
  if (!el || !d || !st || document.hidden) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  // A held key is re-sent now and then, so a dropped frame cannot leave the player drifting or stuck.
  if (sent !== 4 && performance.now() - resend > 500) push(true)
  drawLite(ctx, d, playing.value || status.value === 'over' ? room.latest : null, st.seats.map((s) => aiName(s) ?? s.name), st.you, width, height)
}
const leave = (): void => room.leave()
onMounted(() => {
  size()
  window.addEventListener('resize', size)
  if (typeof ResizeObserver === 'function' && box.value) { watcher = new ResizeObserver(size); watcher.observe(box.value) }
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp)
  document.addEventListener('visibilitychange', onHide)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf); watcher?.disconnect()
  window.removeEventListener('resize', size)
  window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp)
  document.removeEventListener('visibilitychange', onHide)
})
</script>

<template>
  <ArenaStage :title="def?.title ?? 'Made by players'" :play="playing" :chip="conn === 'open' ? (state?.practice ? 'Practice' : playing ? (seated ? 'Live' : 'Watching') : status) : 'Connecting…'" :off="conn !== 'open'" @leave="leave">
    <div class="lr" data-testid="lite">
      <div v-if="gone" class="lr-card"><p>{{ note || 'That game is not on any more.' }}</p><BaseButton variant="primary" @click="leave">Back to games</BaseButton></div>
      <template v-else>
        <div class="lr-play arena-fill">
          <div ref="box" class="lr-stage"><canvas ref="canvas" aria-label="Game field" role="img" /></div>
          <p v-if="loadNote || note" class="lr-note" role="status">{{ loadNote || note }}</p>
          <section v-if="playing && seated && def" class="lr-pad" :class="{ stick: def.controls === 'stick' }" aria-label="Controls" data-testid="lite-pad">
            <template v-if="def.controls === 'stick'">
              <button type="button" class="lr-btn u" aria-label="Up" :class="{ on: held.u }" @pointerdown="press('u', true)($event)" @pointerup="press('u', false)($event)" @pointercancel="press('u', false)($event)" @pointerleave="press('u', false)($event)">&#9650;</button>
              <button type="button" class="lr-btn l" aria-label="Left" :class="{ on: held.l }" @pointerdown="press('l', true)($event)" @pointerup="press('l', false)($event)" @pointercancel="press('l', false)($event)" @pointerleave="press('l', false)($event)">&#9664;</button>
              <button type="button" class="lr-btn r" aria-label="Right" :class="{ on: held.r }" @pointerdown="press('r', true)($event)" @pointerup="press('r', false)($event)" @pointercancel="press('r', false)($event)" @pointerleave="press('r', false)($event)">&#9654;</button>
              <button type="button" class="lr-btn d" aria-label="Down" :class="{ on: held.d }" @pointerdown="press('d', true)($event)" @pointerup="press('d', false)($event)" @pointercancel="press('d', false)($event)" @pointerleave="press('d', false)($event)">&#9660;</button>
            </template>
            <template v-else>
              <button type="button" class="lr-btn wide" aria-label="Left" :class="{ on: held.l }" @pointerdown="press('l', true)($event)" @pointerup="press('l', false)($event)" @pointercancel="press('l', false)($event)" @pointerleave="press('l', false)($event)">&#9664;</button>
              <button type="button" class="lr-btn wide" aria-label="Right" :class="{ on: held.r }" @pointerdown="press('r', true)($event)" @pointerup="press('r', false)($event)" @pointercancel="press('r', false)($event)" @pointerleave="press('r', false)($event)">&#9654;</button>
            </template>
          </section>
        </div>
        <ArenaRoomPanels v-if="!playing || !seated" :room="room" />
      </template>
    </div>
  </ArenaStage>
</template>

<style scoped>
.lr { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; user-select: none; -webkit-user-select: none; }
.lr-play { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.lr-stage { position: relative; flex: 1 1 auto; min-height: 180px; background: #10382a; border-radius: 12px; overflow: hidden; }
.lr-stage canvas { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
.lr-card { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.lr-card p { margin: 0; font-size: 14px; }
.lr-note { margin: 0; color: #a33; font-size: 13px; }
.lr-pad { flex: none; display: flex; gap: 12px; justify-content: center; padding: 4px 0 8px; touch-action: none; }
.lr-pad.stick { display: grid; grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(2, 56px); gap: 6px; justify-content: center; }
.lr-btn { min-width: 56px; min-height: 52px; border: 2px solid #2b2233; border-radius: 16px; background: #fff; color: #2b2233; font: 800 22px system-ui; touch-action: none; -webkit-tap-highlight-color: transparent; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
.lr-btn.on, .lr-btn:active { background: #ffd34d; transform: translateY(2px); box-shadow: none; }
.lr-btn.wide { flex: 1 1 0; max-width: 150px; min-height: 76px; }
.lr-btn.u { grid-column: 2; grid-row: 1; } .lr-btn.l { grid-column: 1; grid-row: 2; } .lr-btn.d { grid-column: 2; grid-row: 2; } .lr-btn.r { grid-column: 3; grid-row: 2; }
</style>
