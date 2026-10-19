<script setup lang="ts">
import { computed } from 'vue'
import { glyph, glyphFor } from '../../../ui/phone/icons.ts'
import { tintOf } from '../../../ui/phone/icons-more.ts'
import { PHONE_ART, PHONE_ART_COLUMNS, PHONE_ART_X, PHONE_ART_Y } from '../../../ui/phone/appArtwork.ts'

/** The apps whose picture is a mark of the icon set, not a cell of the atlas. */
const ICON_SET_APPS: readonly string[] = ['showcase', 'market']
const props = defineProps<{ app: string }>()
/** The feed's apps (src/app/features/feed) draw the nearest app's picture until they have their own. */
const FEED_ART: Readonly<Record<string, string>> = { feed: 'community', me: 'contacts', crews: 'people', plans: 'events', work: 'career', promote: 'business', earn: 'statement', 'ai-agents': 'people', 'agent-chat': 'messages', worlds: 'land', 'world-event': 'events', danfo: 'ride', watch: 'events' }
const atlas = new URL('../../../ui/phone/app-icons.webp', import.meta.url).href
// An app that declares an icon-set mark draws it (a rounded square in its colour). Every other app with no atlas picture keeps the settings gears.
const drawn = computed(() => ICON_SET_APPS.includes(props.app) && !PHONE_ART.includes(props.app))
const mark = computed(() => glyph(glyphFor(props.app)))
const tint = computed(() => tintOf({ id: props.app }))
const style = computed(() => {
  const picture = props.app === 'person' ? 'contacts' : props.app === 'passport' ? 'goals' : props.app === 'gist' ? 'community' : FEED_ART[props.app] ?? props.app
  const found = PHONE_ART.indexOf(picture)
  const index = found < 0 ? PHONE_ART.indexOf('settings') : found
  const column = index % PHONE_ART_COLUMNS
  const row = Math.floor(index / PHONE_ART_COLUMNS)
  const x = PHONE_ART_X[column]! + 2
  const y = PHONE_ART_Y[row]! + 2
  const width = PHONE_ART_X[column + 1]! - x - 2
  const height = PHONE_ART_Y[row + 1]! - y - 2
  return {
    backgroundImage: `url("${atlas}")`,
    backgroundSize: `${1355 / width * 100}% ${1161 / height * 100}%`,
    backgroundPosition: `${x / (1355 - width) * 100}% ${y / (1161 - height) * 100}%`,
  }
})
</script>

<template>
  <span v-if="!drawn" class="ph-icon ph-artwork" :style="style" aria-hidden="true" />
  <span v-else class="ph-icon" :style="{ '--tint': tint }" aria-hidden="true" v-html="mark" />
</template>
