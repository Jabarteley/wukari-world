<script setup lang="ts">
// What the social glue adds to a community's page (docs/SOCIAL-GLUE.md): its gist board (a community, not a crew of friends) and its
// group trips, shown when opened.
import { ref } from 'vue'
import type { CrewView } from '../../../types/feed.ts'
import GistBoard from './GistBoard.vue'
import TripsPanel from './TripsPanel.vue'

defineProps<{ crew: CrewView }>()
const open = ref<'board' | 'trips' | null>(null)
const toggle = (what: 'board' | 'trips'): void => { open.value = open.value === what ? null : what }
</script>

<template>
  <div class="feed-row" data-glue="community" style="margin-top:8px">
    <button v-if="crew.kind !== 'crew'" type="button" class="social-btn" :aria-expanded="open === 'board'" @click="toggle('board')">Gist board</button>
    <button type="button" class="social-btn" :aria-expanded="open === 'trips'" @click="toggle('trips')">Group trips</button>
  </div>
  <GistBoard v-if="open === 'board'" :board="`crew:${crew.id}`" />
  <TripsPanel v-if="open === 'trips'" :crew="crew" />
</template>
