<script setup lang="ts">
// A person's head and shoulders, drawn by the same figure code as the world (src/scene/portrait.ts, fetched only when this shows
// a look). Until the picture arrives, and wherever it cannot be drawn, the slot is shown (an icon or a letter).
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  /** The look (the appearance ids the game stores); without one the slot stays. */
  look?: unknown
  /** What a look that is missing something is completed from. */
  seed?: string
  /** The HUD's mood word: the face shows it. */
  mood?: string
}>()
const picture = ref<string | null>(null)
watchEffect((onCleanup) => {
  const look = props.look ?? null
  let stale = false
  onCleanup(() => { stale = true })
  if (look === null || typeof document === 'undefined') { picture.value = null; return }
  const seed = props.seed, mood = props.mood
  import('../../scene/portrait.ts').then((module) => module.portraitOf(look, { ...(seed ? { seed } : {}), ...(mood ? { mood } : {}) })).then((url) => { if (!stale) picture.value = url }).catch(() => { if (!stale) picture.value = null })
})
</script>

<template>
  <img v-if="picture" :src="picture" alt="" class="person-portrait" draggable="false" />
  <slot v-else />
</template>

<style scoped>
.person-portrait { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
</style>
