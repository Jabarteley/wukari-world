<script setup lang="ts">
// ArenaStage: the immersive frame every live game uses. It is teleported to <body> and fills the whole viewport above the phone
// shell (no fake status bar, Games header or Close pill), with a slim top bar: Leave, the game's title and chip, a slot for the
// score or clock, a sound toggle and a Full screen button. Safe-area insets keep it clear of notches and rounded corners.
//
// FULL SCREEN. The button asks for the Fullscreen API and then locks the orientation to landscape; both are feature-detected
// and the button is hidden where there is no Fullscreen API (iPhone Safari). Where the orientation cannot be locked, a hint
// says to rotate the phone. Leaving the screen exits full screen.
//
//   <ArenaStage title="Fight" :chip="chipText" :off="conn !== 'open'" @leave="room.leave">
//     <template #bar>…score or clock…</template>   (optional, shown in the middle of the top bar)
//     …the screen: canvas, controls, <ArenaRoomPanels />…     (a column that scrolls when it is taller than the screen)
//   </ArenaStage>
//
// Inside, a `.arena-fill` element grows to the free height (use it for the canvas holder).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getSound, setSound } from '../../../audio/settings.ts'

defineProps<{ title: string; chip?: string; off?: boolean }>()
const emit = defineEmits<{ leave: [] }>()

const canFull = typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function'
const dialog = ref<HTMLDialogElement | null>(null)
const full = ref(false)
const portrait = ref(false)
const lockFailed = ref(false)
const soundOn = ref(true)
const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

const hint = computed(() => touch && portrait.value && (lockFailed.value || !canFull))
function sync(): void { full.value = !!document.fullscreenElement; portrait.value = window.innerHeight > window.innerWidth }
async function toggleFull(): Promise<void> {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); return }
    await document.documentElement.requestFullscreen()
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined
    if (orientation?.lock) await orientation.lock('landscape').catch(() => { lockFailed.value = true })
    else lockFailed.value = true
  } catch { lockFailed.value = true }
  sync()
}
function toggleSound(): void { soundOn.value = !soundOn.value; setSound({ on: soundOn.value }) }
onMounted(() => {
  soundOn.value = getSound().on
  // The Games app is itself a modal <dialog> in the browser's top layer, which no z-index can rise above, and it makes everything
  // outside it inert. A modal dialog opened later goes on top of it and takes over, so the stage is one.
  try { if (dialog.value && !dialog.value.open) dialog.value.showModal(); dialog.value?.focus() } catch { dialog.value?.setAttribute('open', '') }
  sync()
  window.addEventListener('resize', sync); document.addEventListener('fullscreenchange', sync)
  document.documentElement.classList.add('arena-open')
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', sync); document.removeEventListener('fullscreenchange', sync)
  document.documentElement.classList.remove('arena-open')
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  try { (screen.orientation as ScreenOrientation | undefined)?.unlock?.() } catch { /* not locked */ }
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="as" :aria-label="title" data-testid="arena-stage" tabindex="-1" @cancel.prevent>
      <header class="as-bar">
        <button type="button" class="as-btn" @click="emit('leave')">&lsaquo; Leave</button>
        <b class="as-title">{{ title }}</b>
        <span v-if="chip" class="as-chip" :class="{ off }">{{ chip }}</span>
        <span class="as-mid"><slot name="bar" /></span>
        <button type="button" class="as-ico" :aria-label="soundOn ? 'Mute sound' : 'Turn sound on'" @click="toggleSound">{{ soundOn ? '&#128266;' : '&#128263;' }}</button>
        <button v-if="canFull" type="button" class="as-ico" :aria-label="full ? 'Exit full screen' : 'Full screen'" data-testid="arena-full" @click="toggleFull">{{ full ? '&#10006;' : '&#9974;' }}</button>
      </header>
      <p v-if="hint" class="as-hint">Rotate your phone sideways for a bigger arena.</p>
      <div class="as-body"><slot /></div>
    </dialog>
  </Teleport>
</template>

<style>
html.arena-open, html.arena-open body { overflow: hidden; }
</style>
<style scoped>
.as { position: fixed; inset: 0; z-index: 2147483647; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; border: 0; display: none; flex-direction: column; background: #f6f7f9; color: var(--c-ink, #1a1d24); padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); box-sizing: border-box; user-select: none; -webkit-user-select: none; }
.as[open] { display: flex; }
.as::backdrop { background: transparent; }
.as-bar { flex: none; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 8px; background: #fff; border-bottom: 1px solid #e3e5ea; }
.as-title { font-size: 15px; }
.as-chip { font-size: 11px; padding: 3px 9px; border-radius: 99px; background: #e2f2e9; color: #22543d; font-weight: 650; text-transform: capitalize; white-space: nowrap; }
.as-chip.off { background: #fff0d1; color: #8a4b0a; }
.as-mid { flex: 1; min-width: 0; text-align: center; font-weight: 700; }
.as-btn, .as-ico { border: 0; background: none; font: inherit; font-size: 14px; min-height: 44px; min-width: 44px; padding: 0 6px; cursor: pointer; color: inherit; }
.as-btn { text-decoration: underline; color: var(--c-muted, #5b6270); font-size: 13px; }
.as-ico { font-size: 18px; }
.as-hint { flex: none; margin: 0; padding: 6px 10px; font-size: 12px; text-align: center; background: #fff0d1; color: #8a4b0a; }
.as-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; -webkit-overflow-scrolling: touch; }
.as-body :deep(.arena-fill) { flex: 1 1 auto; min-height: 140px; }
</style>
