<script setup lang="ts">
// A round avatar with the first letter of a name, on a colour derived from `seed` (a player id) so
// one person keeps one colour. The slot is for a presence dot.
import { computed } from 'vue'
import { hueOf, initialOf } from '../../ui/format.ts'
import { faceOfPlayer } from '../../ui/faces.ts'

const props = defineProps<{ name: string; seed?: string }>()
const hue = computed(() => hueOf(props.seed ?? props.name))
const face = computed(() => faceOfPlayer(props.seed))
</script>

<template>
  <span class="ui-avatar" :class="{ 'has-face': face }" aria-hidden="true" :style="{ '--hue': hue }"><img v-if="face" class="ui-face" :src="face" alt="" loading="lazy" decoding="async"><template v-else>{{ initialOf(name) }}</template><slot /></span>
</template>
