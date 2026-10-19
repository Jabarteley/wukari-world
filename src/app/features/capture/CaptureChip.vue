<script setup lang="ts">
import '../../../ui/controls.css'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'
import { useGrowth } from '../growth/useGrowth.ts'
import { captureAccess, captureSession, discardCapture, startSceneRecording, stopSceneRecording } from './captureSession.ts'
import { MOMENT_MS, liveMoment } from './captureShareModel.ts'

const { game } = useApp()
const growth = useGrowth()
const visible = computed(() => captureSession.recording && game.mode.value === 'venue')

// "Clip this moment": while a party or an event is on and Capture is allowed (only at your own home), a one-tap clip of 6 seconds is offered.
const tick = ref(0)
const dismissed = ref('')
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { tick.value++ }, 15_000) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer) })
const moment = computed(() => {
  void tick.value
  if (captureSession.recording || captureSession.busy || captureSession.photoUrl || captureSession.videoUrl || game.mode.value !== 'venue') return null
  const found = liveMoment({ party: social.me?.house?.party ?? null, events: growth.state.hello?.events ?? [], now: game.serverNow() })
  return found && found.key !== dismissed.value && captureAccess().allowed ? found : null
})
const seconds = MOMENT_MS / 1000

function stop(): void { stopSceneRecording() }
async function clip(): Promise<void> {
  if (!(await startSceneRecording({ durationMs: MOMENT_MS, thenShare: true })) && captureSession.error) game.toast(captureSession.error, 'error')
}
function later(): void { if (moment.value) dismissed.value = moment.value.key }
</script>

<template>
  <section v-if="visible" class="capture-chip" aria-label="Scene video recording" data-capture-recording>
    <span class="capture-chip-dot" aria-hidden="true"></span>
    <span class="capture-chip-status" role="status" aria-live="polite">Recording · {{ captureSession.secondsLeft }}s</span>
    <button class="ui-button capture-chip-stop" type="button" aria-label="Stop scene recording" @click="stop">Stop</button>
    <button class="capture-chip-discard" type="button" aria-label="Discard scene recording" @click="discardCapture">Discard</button>
  </section>
  <section v-else-if="moment" class="capture-chip" aria-label="Clip this moment" data-capture-moment>
    <span class="capture-chip-status">{{ moment.label }} is on</span>
    <button class="ui-button capture-chip-stop" type="button" :aria-label="`Clip ${seconds} seconds of this moment and share it`" @click="clip">Clip {{ seconds }} s</button>
    <button class="capture-chip-discard" type="button" aria-label="Not now" @click="later">Not now</button>
  </section>
</template>

<style scoped>
.capture-chip { display: flex; align-items: center; gap: 8px; width: fit-content; max-width: 100%; padding: 7px 9px; border: 1px solid var(--c-line); border-radius: var(--r-sm); background: var(--c-surface); color: var(--c-ink); box-shadow: var(--e-1); }
.capture-chip-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--c-red); box-shadow: 0 0 0 4px var(--c-red-soft); }
.capture-chip-status { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.capture-chip-stop { min-height: 36px; padding: 5px 10px; }
.capture-chip-discard { min-height: 36px; padding: 5px 7px; border: 0; background: none; color: var(--c-red-dark); font: inherit; font-size: 12px; cursor: pointer; }
.capture-chip button:focus-visible { outline: var(--focus); outline-offset: 2px; }
</style>
