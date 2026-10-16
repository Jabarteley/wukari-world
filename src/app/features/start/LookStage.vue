<script setup lang="ts">
// The preview stage of the look editor: the character in 3D (src/scene/avatar-preview.ts, drawn on
// demand only, never in a loop) with explicit loading and retry states for the canonical character.
// variant 'hero' is the creator, 'wide' is Profile and Boutique, 'mini' sits
// beside the later creation steps. The controls sit in a row under the stage, never over the
// character: the Face / Full body switch, `caption` and whatever the `tools` slot holds.
import '../../../ui/panels/look-ui.css'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Look } from '../../../types/life.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { leaveLookPreview, setPreviewFocus, showLookPreview } from './lookPreview.ts'
import type { StageHandle, StageMode } from './lookPreview.ts'
import { lookAlt, lookFocus, lookUi, sceneLook, toggleZoom } from './lookModel.ts'

const props = withDefaults(defineProps<{
  look: Look
  variant?: 'hero' | 'wide' | 'mini'
  /** Whose Sim it is, for the text alternative. */
  name?: string
  caption?: string
}>(), { variant: 'hero', name: 'Your character', caption: '' })

const mini = computed(() => props.variant === 'mini')
const mode = ref<StageMode>('loading')
const host = ref<HTMLElement | null>(null)
const focus = computed(() => lookFocus())
const alt = computed(() => lookAlt(props.look, props.name))
let handle: StageHandle | null = null

function request(): void {
  if (!handle) return
  showLookPreview({ stage: handle, look: sceneLook(props.look), focus: focus.value, label: `${alt.value} Drag, or use the left and right arrow keys, to turn.` })
}
onMounted(() => {
  const element = host.value
  if (!element) return
  handle = { host: element, setMode: (next) => { mode.value = next }, connected: () => element.isConnected }
  request()
})
// A look that changed costs one frame; so does a change of where the preview looks.
watch([() => JSON.stringify(sceneLook(props.look)), focus, alt], request)
onBeforeUnmount(() => { if (handle) leaveLookPreview(handle); handle = null })

function zoom(): void { setPreviewFocus(toggleZoom()) }
</script>

<template>
  <div class="look-view" :class="`is-${variant}`">
    <div class="look-stage" data-look-stage :data-mode="mode" :data-spun="lookUi.spun ? '' : undefined">
      <div ref="host" class="look-stage-view" data-look-canvas />
      <div v-if="mode === 'error'" class="look-preview-error" role="alert">
        <p>The character preview could not load.</p>
        <button type="button" @click="request">Retry preview</button>
      </div>
      <p v-if="!mini" class="look-hint" aria-hidden="true">↔ Drag to spin</p>
    </div>
    <div v-if="!mini" class="look-bar">
      <button type="button" class="look-tool" data-look-zoom :aria-pressed="focus === 'head'" title="Switch between full body and face" @click="zoom">
        <template v-if="focus === 'head'"><GameIcon name="person" inline /> Full body</template>
        <template v-else><GameIcon name="search" inline /> Face</template>
      </button>
      <p class="look-caption">{{ caption }}</p>
      <slot name="tools" />
    </div>
  </div>
</template>

<style scoped>
.look-preview-error{position:absolute;z-index:4;inset:12px;display:grid;place-content:center;justify-items:center;gap:10px;padding:16px;border-radius:12px;background:#121920e0;color:#fff;text-align:center}
.look-preview-error p{margin:0}
.look-preview-error button{min-height:44px;padding:8px 14px;border:1px solid #d6dedf;border-radius:8px;background:#fff;color:#18212a;font:inherit;font-weight:600;cursor:pointer}
</style>
