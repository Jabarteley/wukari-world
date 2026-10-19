<script setup lang="ts">
import { computed, ref } from 'vue'
import { STORY_STREET_COVERAGE } from '../../../story/streetWalkCoverage.generated.ts'
import { storyStreetWalkView } from '../../../story/streetWalk.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import { social } from '../social/useSocial.ts'
import { cityWalk } from '../neighbourhood/cityWalkState.ts'
import { leaveCityVenue, neighbourhood } from '../neighbourhood/neighbourhoodStore.ts'

const { game, scene, shell } = useApp()
const leaving = ref(false)
const view = computed(() => storyStreetWalkView({
  enabled: game.view.value.story.enabled,
  story: game.view.value.story,
  currentCityId: String(game.cityId.value),
  currentVenueId: game.state.value.location,
  connected: game.connected.value,
  activeAction: Boolean(game.state.value.activeAction),
  visiting: Boolean(social.me?.visiting),
  pending: leaving.value || Boolean(neighbourhood.pending),
  journey: cityWalk.value,
  coverage: STORY_STREET_COVERAGE,
}))

function startWalk(): void {
  if (view.value?.kind !== 'start' || view.value.reason) return
  shell.close()
  if (!scene.venue.value?.walkStreetGate()) game.toast('Walk towards the city gate at the end of your street.', 'info')
}

async function returnToStreet(): Promise<void> {
  if (view.value?.kind !== 'return' || view.value.reason || leaving.value) return
  leaving.value = true
  try { await leaveCityVenue() } finally { leaving.value = false }
}
</script>

<template>
  <section v-if="view" class="story-street" aria-labelledby="story-street-title">
    <div>
      <small>Chapter 3 city walk</small>
      <h4 id="story-street-title">Explore on foot</h4>
      <p v-if="view.kind === 'mapped-venue'">{{ view.venueLabel }} is on this city's walking map. Enter it from the street to keep walking from the same doorway.</p>
      <p v-else-if="view.kind === 'return'">You walked into {{ view.venueLabel }}. Leave by the same entrance to continue from where you stopped.</p>
      <p v-else>{{ view.venueCount }} Chapter 3 place{{ view.venueCount === 1 ? '' : 's' }} can be reached from this city's walking map.</p>
    </div>
    <BaseButton v-if="view.kind === 'start'" small variant="primary" :reason="view.reason" @click="startWalk">{{ view.actionLabel }}</BaseButton>
    <BaseButton v-else-if="view.kind === 'walking'" small @click="shell.close()">{{ view.actionLabel }}</BaseButton>
    <BaseButton v-else-if="view.kind === 'return'" small variant="primary" :reason="view.reason" @click="returnToStreet">{{ view.actionLabel }}</BaseButton>
  </section>
</template>

<style scoped>
.story-street { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; align-items: center; min-width: 0; padding: 13px; border-radius: var(--r-md); background: var(--c-green-soft); box-shadow: var(--e-1),var(--ring); }
.story-street h4,.story-street p { margin: 0; }.story-street small { display: block; margin-bottom: 2px; color: var(--c-green-dark); font-size: 10px; text-transform: uppercase; }.story-street h4 { font-size: 15px; }.story-street p { margin-top: 3px; color: var(--c-muted); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
@container passport (max-width: 300px) { .story-street { grid-template-columns: 1fr; }.story-street :deep(.base-button) { justify-self: start; } }
</style>
