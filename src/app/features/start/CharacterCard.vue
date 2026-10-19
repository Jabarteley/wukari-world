<script setup lang="ts">
// The character card shown on the Ready step after "Share my character": the picture first, then a Share
// button (the phone's share sheet, given the finished picture so it opens at once) and a download for
// browsers without one. Drawn on this device from the stage; nothing is sent until the person shares it.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import GameIcon from '../../ui/GameIcon.vue'
import { CARD_FILE, canShareFile, canvasToPng, drawCharacterCard, shareCharacterCard } from './characterCard.ts'
import { snapshotLookPreview } from './lookPreview.ts'

const props = defineProps<{ name: string }>()
const emit = defineEmits<{ close: [] }>()
const state = ref<'working' | 'ready' | 'failed'>('working')
const url = ref('')
const note = ref('')
let blob: Blob | null = null
const canShare = computed(() => state.value === 'ready' && blob !== null && canShareFile(blob))

onMounted(async () => {
  try {
    const figure = snapshotLookPreview()
    const card = figure ? drawCharacterCard(figure, props.name) : null
    blob = card ? await canvasToPng(card) : null
    if (blob) { url.value = URL.createObjectURL(blob); state.value = 'ready' } else state.value = 'failed'
  } catch { state.value = 'failed' }
})
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value); blob = null })

async function share(): Promise<void> {
  if (!blob) return
  const result = await shareCharacterCard(blob, props.name)
  note.value = result === 'failed' ? 'This browser could not open its share sheet. Save the picture and share it from your photos.' : ''
}
</script>

<template>
  <div class="cr-card" data-cr-card>
    <p v-if="state === 'working'" class="cr-note" role="status">Drawing your card…</p>
    <p v-else-if="state === 'failed'" class="cr-note is-warn" role="alert">The card could not be drawn. Wait for the character to finish loading and try again.</p>
    <template v-else>
      <img class="cr-card-img" :src="url" alt="Your character on a city street, with joinallworld.com" width="270" height="338">
      <div class="cr-card-acts">
        <button v-if="canShare" type="button" class="cr-btn is-primary" data-key="card-share" @click="share"><GameIcon name="share" inline /> Share…</button>
        <a class="cr-btn" :href="url" :download="CARD_FILE" data-key="card-save">Save picture</a>
        <button type="button" class="cr-link" data-key="card-close" @click="emit('close')">Close</button>
      </div>
      <p class="cr-note">You choose who sees this. The picture is made on your phone and nothing is sent from here.</p>
      <p v-if="note" class="cr-note is-warn" role="status">{{ note }}</p>
    </template>
  </div>
</template>

<style scoped>
.cr-card{margin-top:12px}
.cr-card-img{display:block;width:min(100%,270px);height:auto;margin:0 auto 10px;border-radius:16px;box-shadow:0 6px 20px #10323d33}
.cr-card-acts{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}
.cr-card-acts a.cr-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
</style>
