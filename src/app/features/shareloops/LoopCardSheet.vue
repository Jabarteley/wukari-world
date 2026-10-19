<script setup lang="ts">
// One made card or clip, over the screen (docs/SHARE-LOOPS.md): the picture first, then Share (the phone's own share sheet, given the
// finished file so it opens at once), Save and Close. The file is made on this device by `make` when the sheet opens; nothing is sent
// until the person shares it. Used by every share loop: the start card, Wrapped, the passport page, the front page, street fame, the
// childhood-street video and the duet.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GameIcon from '../../ui/GameIcon.vue'
import { sendLoop } from './loopShare.ts'
import type { LoopShare } from './loopShare.ts'

const props = defineProps<{ title: string; alt: string; make: () => Promise<LoopShare | null>; note?: string }>()
const emit = defineEmits<{ close: [] }>()
const state = ref<'working' | 'ready' | 'failed'>('working')
const url = ref('')
const video = ref(false)
const said = ref('')
const fileName = ref('allworld.png')
let made: LoopShare | null = null

onMounted(async () => {
  try {
    made = await props.make()
    if (!made) { state.value = 'failed'; return }
    url.value = URL.createObjectURL(made.file)
    fileName.value = made.file.name
    video.value = made.file.type.startsWith('video/')
    state.value = 'ready'
  } catch { state.value = 'failed' }
})
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value); made = null })

async function share(): Promise<void> {
  if (!made) return
  const outcome = await sendLoop(made)
  said.value = outcome === 'again' ? 'Ready. Tap Share to send it.' : ''
  if (outcome === 'sheet') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="lp-back" role="dialog" aria-modal="true" :aria-label="title" data-loop-sheet @keydown.esc="emit('close')">
      <div class="lp-sheet">
        <header class="lp-head"><b>{{ title }}</b><button type="button" class="lp-x" aria-label="Close" data-loop="close" @click="emit('close')"><GameIcon name="close" :size="18" /></button></header>
        <p v-if="state === 'working'" class="lp-note" role="status">Making it on your phone…</p>
        <p v-else-if="state === 'failed'" class="lp-note is-warn" role="alert">It could not be made on this device. Try again in a moment.</p>
        <template v-else>
          <video v-if="video" class="lp-media" :src="url" controls playsinline :aria-label="alt" />
          <img v-else class="lp-media" :src="url" :alt="alt" width="270" height="480">
          <div class="lp-acts">
            <button type="button" class="lp-btn is-primary" data-loop="share" @click="share"><GameIcon name="share" inline /> Share…</button>
            <a class="lp-btn" :href="url" :download="fileName" data-loop="save">Save</a>
          </div>
          <p class="lp-note">{{ note || 'Made on your phone. Nothing is sent until you share it.' }}</p>
          <p v-if="said" class="lp-note" role="status">{{ said }}</p>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lp-back { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 12px; background: #0009; }
.lp-sheet { width: min(100%, 360px); max-height: 100%; overflow: auto; padding: 12px; border-radius: 18px; background: var(--c-surface, #fff); color: var(--c-ink, #111); box-shadow: 0 10px 40px #0006; }
.lp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lp-head b { flex: 1; }
.lp-x { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: none; color: inherit; cursor: pointer; }
.lp-media { display: block; width: min(100%, 270px); height: auto; max-height: 60vh; margin: 0 auto 10px; border-radius: 14px; box-shadow: 0 6px 20px #10323d33; object-fit: contain; background: #000; }
.lp-acts { display: flex; justify-content: center; gap: 8px; }
.lp-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 18px; border: 1px solid var(--c-line, #e5e1d6); border-radius: 999px; background: none; color: inherit; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
.lp-btn.is-primary { border-color: transparent; background: var(--c-green-dark, #1d6b43); color: #fff; }
.lp-note { margin: 8px 0 0; color: var(--c-muted, #6b7280); font-size: 13px; text-align: center; }
.lp-note.is-warn { color: #b23a2e; }
</style>
