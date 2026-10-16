<script setup lang="ts">
// The stage of the character creator: the character large, lit, and turnable. It is the one 3D preview
// of the app (src/scene/avatar-preview.ts) drawn on demand only — a frame when the look, the view or
// the size changes, one per pointer or key event while turning, and a short bounded ease after a drag
// or a button — never a loop. Loading and rendering failures have explicit status and retry states;
// the stage always uses the shared canonical character.
//
// Controls: drag (mouse or touch) or ← / → on the focused stage to turn; Turn left, Turn right, Turn
// around; Body / Face / Outfit for how close to look. They are real buttons over the stage, never in
// the way of the character.
import '../../../ui/panels/look-ui.css'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PreviewFocus } from '../../../scene/avatar-preview.ts'
import type { Look } from '../../../types/life.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { FOCUS_CHOICES } from './creatorModel.ts'
import { leaveLookPreview, showLookPreview, turnPreview } from './lookPreview.ts'
import type { StageHandle, StageMode } from './lookPreview.ts'
import { lookAlt, lookUi, markSpun, sceneLook } from './lookModel.ts'

const props = defineProps<{ look: Look; name: string; focus: PreviewFocus; caption?: string }>()
const emit = defineEmits<{ focus: [value: PreviewFocus] }>()

const mode = ref<StageMode>('loading')
const host = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const tools = ref<HTMLElement | null>(null)
const alt = computed(() => lookAlt(props.look, props.name))
let handle: StageHandle | null = null

/** How much of the stage's bottom the buttons take: the character stands above it. */
// Measured on screen (getBoundingClientRect), not with offsetTop: the buttons are zoomed on very large screens, and offsetTop is then
// in the zoomed element's own units, which reserved far too much and left the character small.
function inset(): number {
  if (!stage.value || !tools.value) return 0
  const space = Math.max(0, stage.value.getBoundingClientRect().bottom - tools.value.getBoundingClientRect().top + 4)
  // The "Drag to turn" chip sits just above the buttons: it is anchored to this same number.
  stage.value.style.setProperty('--cr-inset', `${Math.round(space)}px`)
  return space
}
function request(): void {
  if (!handle) return
  showLookPreview({ stage: handle, inset: inset(), look: sceneLook(props.look), focus: props.focus, label: `${alt.value} Drag, or use the left and right arrow keys, to turn.` })
}
onMounted(() => {
  const element = host.value
  if (!element) return
  handle = { host: element, setMode: (next) => { mode.value = next }, connected: () => element.isConnected }
  request()
  window.addEventListener('resize', request)
})
watch([() => JSON.stringify(sceneLook(props.look)), () => props.focus, alt], request)
onBeforeUnmount(() => { window.removeEventListener('resize', request); if (handle) leaveLookPreview(handle); handle = null })

const QUARTER = Math.PI / 4
function turn(radians: number): void { markSpun(); turnPreview(radians) }
</script>

<template>
  <div ref="stage" class="cr-stage" :data-mode="mode" :data-spun="lookUi.spun ? '' : undefined" data-cr-stage>
    <div class="cr-floor" aria-hidden="true" />
    <div ref="host" class="cr-stage-view" data-look-canvas>
    </div>
    <p v-if="mode === 'loading'" class="cr-preview-loading" role="status">Preparing your character…</p>
    <div v-if="mode === 'error'" class="cr-preview-error" role="alert">
      <p>The character preview could not load.</p>
      <button type="button" @click="request">Retry preview</button>
    </div>
    <p v-if="caption" class="cr-caption" data-cr-caption>{{ caption }}</p>
    <div ref="tools" class="cr-stage-tools" :aria-busy="mode === 'loading' ? 'true' : undefined">
      <div class="cr-turn" role="group" aria-label="Turn the character">
        <button type="button" class="cr-round" data-key="turn-left" aria-label="Turn left" title="Turn left" :disabled="mode !== '3d'" @click="turn(-QUARTER)"><GameIcon name="back" :size="22" /></button>
        <button type="button" class="cr-round is-wide" data-key="turn-around" aria-label="Turn around" title="Turn around" :disabled="mode !== '3d'" @click="turn(Math.PI)"><GameIcon name="refresh" :size="20" /><span class="cr-lbl">Turn around</span></button>
        <button type="button" class="cr-round" data-key="turn-right" aria-label="Turn right" title="Turn right" :disabled="mode !== '3d'" @click="turn(QUARTER)"><GameIcon name="chevron" :size="22" /></button>
      </div>
      <div class="cr-zoom" role="group" aria-label="How close to look">
        <button v-for="item in FOCUS_CHOICES" :key="item.id" type="button" :data-focus="item.id" :data-key="`focus:${item.id}`" :aria-pressed="focus === item.id" :disabled="mode !== '3d'" @click="emit('focus', item.id)">{{ item.label }}</button>
      </div>
    </div>
    <p v-if="mode === '3d' && !lookUi.spun" class="cr-hint" aria-hidden="true">Drag to turn</p>
    <p v-else-if="mode === 'loading'" class="cr-hint is-loading" role="status">Getting your character ready…</p>
  </div>
</template>

<style scoped>
.cr-preview-loading{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);padding:10px 16px;border:1px solid #cbdce4;border-radius:999px;background:#fafcfce8;color:#10323d;font-size:14px;font-weight:650;white-space:nowrap}
.cr-preview-error{position:absolute;z-index:4;inset:20px;display:grid;place-content:center;justify-items:center;gap:10px;padding:16px;border:1px solid #cbdce4;border-radius:16px;background:#fafcfcee;color:#10323d;text-align:center}
.cr-preview-error p{margin:0}
.cr-preview-error button{min-height:44px;padding:8px 14px;border:1px solid #176848;border-radius:9px;background:#176848;color:#fff;font:inherit;font-weight:650;cursor:pointer}
</style>
