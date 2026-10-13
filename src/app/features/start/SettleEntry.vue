<script setup lang="ts">
// "SETTLE IN: GET YOUR HOME": the standing way in to the settle-in flow for a guest of the quick start, drawn in the goal
// area of the home screen whether or not a goal is pointing at it. It can be put away for the session and comes back with the
// next visit; a settled life never sees it (it draws nothing, so the HUD gives it no room).
import { computed, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { settleWanted, tour } from '../tour/tourState.ts'
import { SETTLE_ENTRY, settleEntry, startSettling } from './settleModel.ts'

const { game, shell } = useApp()
// Second in line: after the walkthrough, before the coach's goal line (which waits while this is up and not put away).
// The coach line (CoachTip.vue) reads the same flag from tourState.ts, so the two never import each other's modules.
watch(() => settleEntry.dismissed, (away) => { tour.settleAway = away }, { immediate: true })
const shown = computed(() => !(tour.active || tour.pending) && settleWanted(game.view.value, settleEntry.dismissed))
</script>

<template>
  <div v-if="shown" class="settle-entry" data-settle-entry>
    <button type="button" class="life-job" :aria-label="`${SETTLE_ENTRY.title}. ${SETTLE_ENTRY.hint}`" @click="startSettling(shell)">
      <span aria-hidden="true">🏠</span>
      <div><strong>{{ SETTLE_ENTRY.title }}</strong></div>
    </button>
    <button type="button" class="settle-entry-away" aria-label="Hide this until next visit" @click="settleEntry.dismissed = true">×</button>
  </div>
</template>

<style scoped>
.settle-entry { position: relative; display: flex; align-items: center; gap: 4px; max-width: 100%; }
.settle-entry { width: fit-content; }
.settle-entry .life-job strong { max-width: none; white-space: nowrap; }
.settle-entry .life-job { border-color: #ecc95b !important; background: #fff8df; }
/* The circle stays small; the hit area is 44 px. */
.settle-entry-away { position: relative; isolation: isolate; flex: none; width: var(--tap, 44px); height: var(--tap, 44px); margin: 0 -6px; border: 0; background: none; color: var(--c-ink, #1b1f27); font-size: 18px; line-height: 1; cursor: pointer; }
.settle-entry-away::before { content: ''; position: absolute; inset: 6px; z-index: -1; border-radius: 50%; background: #ffffffcc; }
.settle-entry-away:focus-visible { outline: 3px solid #1d6b43; outline-offset: 1px; }
</style>

<style>
/* One prompt at a time: while the offer is up, the goal chip beside it (a second ask) waits. */
.life-goal:has([data-settle-entry]) .goal-chip { display: none; }
</style>
