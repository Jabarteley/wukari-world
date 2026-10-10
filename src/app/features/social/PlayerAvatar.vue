<script setup lang="ts">
// A player's avatar on a colour derived from their id, with an optional presence dot. Given a look (or `figure`, for a regular
// whose look the game makes from their id) it shows that person's head and shoulders, drawn by the same figure code as the world
// (src/scene/portrait.ts, fetched only when a portrait is wanted); until it arrives, and wherever it cannot be drawn, the letter stays.
// The same markup as the existing `avatar()` helper, so the existing social styles apply.
import '../../../ui/panels/social.css'
import { computed, ref, watchEffect } from 'vue'
import { hueOf, initialOf } from '../../ui/format.ts'
import { dotHint, dotOf } from './socialWords.ts'

const props = defineProps<{
  name: string
  /** What the colour comes from; defaults to the name. */
  seed?: string
  /** A presence word ('online', 'away' …): draws its dot. Absent = no dot. */
  status?: string
  /** The person's look (the appearance ids the game stores). */
  look?: unknown
  /** Draw the figure the game makes from `seed` (a regular, whose look is their id's). */
  figure?: boolean
  /** The HUD's mood word, shown on the face. */
  mood?: string
}>()
const hue = computed(() => hueOf(props.seed ?? props.name))
const picture = ref<string | null>(null)
watchEffect((onCleanup) => {
  const look = props.look ?? null, wanted = look !== null || props.figure === true
  let stale = false
  onCleanup(() => { stale = true })
  if (!wanted || typeof document === 'undefined') { picture.value = null; return }
  const seed = props.seed ?? props.name, mood = props.mood
  import('../../../scene/portrait.ts').then((module) => module.portraitOf(look, { seed, ...(mood ? { mood } : {}) })).then((url) => { if (!stale) picture.value = url }).catch(() => { if (!stale) picture.value = null })
})
</script>

<template>
  <span class="ui-avatar" :class="{ 'is-portrait': picture }" aria-hidden="true" :style="{ '--hue': hue }"><img v-if="picture" :src="picture" alt="" class="ui-avatar-portrait" draggable="false" /><template v-else>{{ initialOf(name) }}</template><i v-if="status" class="social-dot" :class="`is-${dotOf(status)}`" :title="dotHint(status)" /></span>
</template>

<style scoped>
.ui-avatar.is-portrait { overflow: visible; }
.ui-avatar-portrait { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
</style>
