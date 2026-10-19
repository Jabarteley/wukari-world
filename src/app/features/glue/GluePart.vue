<script setup lang="ts">
// The one door into the social glue's screens (docs/SOCIAL-GLUE.md). Every screen that shows a part of it imports THIS file lazily, and this
// file holds the parts statically, so the whole glue is one chunk: each new lazy chunk adds its file name to the dependency table of the
// first download, and the startup budget has little room. With no `part` it is the HUD line of close friends (the `close-now` panel).
import type { CrewView } from '../../../types/feed.ts'
import CloseNowChip from './CloseNowChip.vue'
import CloseFriends from './CloseFriends.vue'
import CloseNowStrip from './CloseNowStrip.vue'
import TalksPanel from './TalksPanel.vue'
import GistBoard from './GistBoard.vue'
import CommunityGlue from './CommunityGlue.vue'
import MarriagePanel from './MarriagePanel.vue'

defineProps<{ part?: 'close' | 'strip' | 'talks' | 'board' | 'community' | 'marriage'; board?: string; crew?: CrewView; params?: unknown }>()
</script>

<template>
  <CloseFriends v-if="part === 'close'" />
  <CloseNowStrip v-else-if="part === 'strip'" />
  <TalksPanel v-else-if="part === 'talks'" />
  <GistBoard v-else-if="part === 'board' && board" :board="board" />
  <CommunityGlue v-else-if="part === 'community' && crew" :crew="crew" />
  <MarriagePanel v-else-if="part === 'marriage'" />
  <CloseNowChip v-else-if="!part" />
</template>
