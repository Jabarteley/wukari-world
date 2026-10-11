<script setup lang="ts">
// A player's lettered avatar on a colour derived from their id, with an optional presence dot.
// The same markup as the existing `avatar()` helper, so the existing social styles apply.
import '../../../ui/panels/social.css'
import { computed } from 'vue'
import { hueOf, initialOf } from '../../ui/format.ts'
import { faceOfPlayer, faceOfRegular } from '../../ui/faces.ts'
import { dotHint, dotOf } from './socialWords.ts'

const props = defineProps<{
  name: string
  /** What the colour comes from; defaults to the name. */
  seed?: string
  /** A presence word ('online', 'away' …): draws its dot. Absent = no dot. */
  status?: string
  /** A family contact or regular's emoji: their face comes from the description. */
  emoji?: string
  /** The look of the player, when the caller has it (otherwise what the client has seen of them). */
  look?: unknown
}>()
const hue = computed(() => hueOf(props.seed ?? props.name))
const face = computed(() => (props.emoji !== undefined ? faceOfRegular({ id: props.seed ?? props.name, name: props.name, emoji: props.emoji }) : faceOfPlayer(props.seed, props.look)))
</script>

<template>
  <span class="ui-avatar" :class="{ 'has-face': face }" aria-hidden="true" :style="{ '--hue': hue }"><img v-if="face" class="ui-face" :src="face" alt="" loading="lazy" decoding="async"><template v-else>{{ initialOf(name) }}</template><i v-if="status" class="social-dot" :class="`is-${dotOf(status)}`" :title="dotHint(status)" /></span>
</template>
