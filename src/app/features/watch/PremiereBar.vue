<script setup lang="ts">
// A premiere in this world (docs/ALLWORLD-HOUSE.md "Artist premieres"), shown inside the 3D world (spaces/WorldScreen.vue) while one is on
// or about to start: the artist (hosting) puts the track on the world's shared screen with one tap; anyone records six seconds of the
// moment with the mark and the caption (the share-loop recorder, shareloops/streetRecorder.ts) and shares the clip. Nothing is uploaded.
import { computed, onMounted, ref } from 'vue'
import { loadPremieres, watch } from './watchStore.ts'
import { clipWords } from '../../../watch/premiere.ts'
import { loopFile, loopLink, loopMark, loopText, profileOf } from '../shareloops/loopsModel.ts'
import { sendLoop, whoAmI } from '../shareloops/loopShare.ts'
import type { LoopShare } from '../shareloops/loopShare.ts'
import { recordStreet } from '../shareloops/streetRecorder.ts'

const props = defineProps<{ world: string; hosting: boolean; stage: HTMLElement | null; playing: string | null }>()
const emit = defineEmits<{ play: [track: string] }>()
onMounted(() => { void loadPremieres(true) })
const premiere = computed(() => (watch.premieres?.premieres ?? []).find((item) => item.world === props.world && item.phase !== 'over' && (item.phase === 'live' || item.me?.artist)) ?? null)
const recording = ref(false), note = ref(''), ready = ref<LoopShare | null>(null)
async function clip(): Promise<void> {
  const item = premiere.value
  if (!item || !props.stage || recording.value) return
  recording.value = true; note.value = 'Recording six seconds…'
  try {
    const me = await whoAmI(), caption = clipWords(item.artist, item.title, Boolean(item.me?.front))
    const { blob, choice } = await recordStreet(props.stage, caption, loopMark(me.handle), 6000).done
    const link = loopLink(location.origin, 'premiere', profileOf(me.handle, me.id))
    note.value = ''
    const made: LoopShare = { loop: 'premiere', file: new File([blob], loopFile('premiere', choice.type), { type: choice.type }), text: loopText([caption], link), link }
    // A six-second recording outlives the tap: the phone's sheet may want a fresh one ("Share clip now").
    ready.value = (await sendLoop(made)) === 'again' ? made : null
  } catch { note.value = 'This browser cannot record a clip here.' } finally { recording.value = false }
}
</script>

<template>
  <div v-if="premiere" class="ws-premiere" data-watch="premiere-bar" role="group" :aria-label="`Premiere: ${premiere.title}`">
    <span class="ws-pill">🎶 {{ premiere.artist }} · “{{ premiere.title }}”</span>
    <button v-if="hosting && premiere.track && premiere.me?.artist && playing !== premiere.track" type="button" class="ws-pill is-on" data-watch="premiere-play" @click="emit('play', premiere.track!)">Play the premiere</button>
    <button v-if="premiere.phase === 'live'" type="button" class="ws-pill" data-watch="premiere-clip" :disabled="recording" @click="clip">{{ recording ? 'Recording…' : 'Clip 6 s' }}</button>
    <button v-if="ready" type="button" class="ws-pill is-on" data-watch="premiere-share" @click="sendLoop(ready!); ready = null">Share clip now</button>
    <span v-if="note" class="ws-pill" role="status">{{ note }}</span>
  </div>
</template>

<style scoped>
.ws-premiere { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
