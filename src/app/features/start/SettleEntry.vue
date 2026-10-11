<script setup lang="ts">
// "SETTLE IN: GET YOUR HOME": the standing way in to the settle-in flow for a guest of the quick start, drawn in the goal
// area of the home screen whether or not a goal is pointing at it. It can be put away for the session and comes back with the
// next visit; a settled life never sees it (it draws nothing, so the HUD gives it no room).
import { computed } from 'vue'
import { useApp } from '../../state/app.ts'
import { SETTLE_ENTRY, settleEntry, startSettling } from './settleModel.ts'

const { game, shell } = useApp()
const shown = computed(() => { const view = game.view.value; return view.connected && view.onboarding.guest && !view.onboarding.required && !settleEntry.dismissed })
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
.settle-entry-away { flex: none; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #ffffffcc; color: var(--c-ink, #1b1f27); font-size: 18px; line-height: 1; cursor: pointer; }
.settle-entry-away:focus-visible { outline: 3px solid #1d6b43; outline-offset: 1px; }
</style>
