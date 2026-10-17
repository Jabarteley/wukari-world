<script setup lang="ts">
// The controller panel of a game: which button does what (the standard mapping, src/arena/input/pad.ts), changing a button by
// pressing the one you want, the stick's dead zone, rumble on or off, and back to the defaults. Opened from a game screen's
// Controller button, or by Start on the pad. Settings stay on this device. Lazy with the game screens.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '../../ui/BaseButton.vue'
import { bindingOf, buttonName, firstButtonDown, remap, resetBinding } from '../../../arena/input/pad.ts'
import type { PadControls, PadLike } from '../../../arena/input/pad.ts'
import { connectedPad, loadPadSettings, padSupported, savePadSettings } from '../../../arena/input/poller.ts'

const props = defineProps<{ controls: PadControls }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const settings = ref(loadPadSettings())
const binding = computed(() => bindingOf(props.controls, settings.value.bind[props.controls.game]))
const pad = ref(connectedPad())
const waiting = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
onMounted(() => root.value?.querySelector<HTMLButtonElement>('.pp-head button')?.focus())
let raf = 0

function save(next: typeof settings.value): void { settings.value = next; savePadSettings(next); emit('changed') }
function listen(action: string): void {
  waiting.value = action
  void nextTick(() => root.value?.querySelector<HTMLButtonElement>('[data-remap-cancel]')?.focus())
  cancelAnimationFrame(raf)
  // Wait until every button is up, then take the first one pressed.
  let armed = false
  const look = (): void => {
    if (waiting.value !== action) return
    const pads = [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p) as unknown as PadLike[]
    pad.value = pads[0] ? connectedPad() : null
    const down = pads.map(firstButtonDown).find((n) => n >= 0) ?? -1
    if (!armed) { armed = down < 0 }
    else if (down >= 0) { save(remap(settings.value, props.controls, action, down)); waiting.value = null; return }
    raf = requestAnimationFrame(look)
  }
  raf = requestAnimationFrame(look)
}
function stopListening(): void {
  waiting.value = null
  cancelAnimationFrame(raf)
  void nextTick(() => root.value?.querySelector<HTMLButtonElement>('.pp-head button')?.focus())
}
function escape(): void { if (waiting.value) stopListening(); else emit('close') }
defineExpose({ escape })
onBeforeUnmount(() => cancelAnimationFrame(raf))
const names = (buttons: readonly number[]): string => (buttons.length ? buttons.map(buttonName).join(' or ') : 'Not set')
const zonePct = computed(() => Math.round(settings.value.zone * 100))
</script>

<template>
  <section ref="root" class="pp" aria-label="Controller" data-testid="arena-pad-panel" @keydown.escape.stop.prevent="escape">
    <header class="pp-head"><h3>Controller</h3><BaseButton @click="emit('close')">Done</BaseButton></header>
    <p v-if="!padSupported()" class="pp-note">This browser cannot use game controllers. Touch and the keyboard still work.</p>
    <p v-else class="pp-note" role="status">{{ pad ? `${pad} is connected.` : 'Connect a controller (Bluetooth or cable) and press any button.' }} A controller plays exactly like the touch buttons: nobody gets an edge.</p>
    <ul class="pp-list">
      <li v-if="controls.stick"><span>Move</span><span class="pp-keys">Left stick or d-pad</span></li>
      <li v-for="a in controls.actions" :key="a.id">
        <span>{{ a.label }}</span>
        <span class="pp-keys">{{ waiting === a.id ? 'Press a button…' : names(binding[a.id] ?? []) }}</span>
        <BaseButton v-if="waiting !== a.id" :disabled="!padSupported()" :aria-label="`Change the button for ${a.label}`" @click="listen(a.id)">Change</BaseButton>
        <BaseButton v-else data-remap-cancel @click="stopListening">Cancel</BaseButton>
      </li>
      <li><span>Menu</span><span class="pp-keys">Start</span></li>
    </ul>
    <label class="pp-row">Stick dead zone: {{ zonePct }}%
      <input type="range" min="5" max="60" step="1" :value="zonePct" @change="save({ ...settings, zone: Number(($event.target as HTMLInputElement).value) / 100 })">
    </label>
    <label class="pp-row"><span>Rumble on hits and goals</span><input type="checkbox" :checked="settings.rumble" @change="save({ ...settings, rumble: ($event.target as HTMLInputElement).checked })"></label>
    <BaseButton block @click="save(resetBinding(settings, controls.game))">Back to the standard buttons</BaseButton>
    <p class="pp-note">A match against people cannot be paused: the server keeps time for everyone.</p>
  </section>
</template>

<style scoped>
.pp { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.pp-head { display: flex; justify-content: space-between; align-items: center; }
.pp h3 { margin: 0; font-size: 20px; }
.pp-note { margin: 0; font-size: 13px; color: var(--c-muted); line-height: 1.4; }
.pp-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.pp-list li { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; font-size: 14px; min-height: 40px; }
.pp-keys { font-weight: 700; }
.pp-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; }
</style>
