<script setup lang="ts">
// The HUD chip of the weekly world event (docs/WORLD-EVENTS.md): from a day before the warm-up to a few hours after the end. A lazy chunk;
// it reads the public GET /api/world/event at most every minute (every ten seconds while the event runs) and opens the World event app.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { loadEvent, worldEvent } from './eventStore.ts'
import { chipShows } from '../../../world-events/model.ts'
import { chipWords } from './eventWords.ts'

const { game, shell } = useApp()
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void loadEvent(true); timer = setInterval(() => { clock.value = Date.now(); void loadEvent() }, 15000) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer) })
const event = computed(() => { void clock.value; const found = worldEvent.view?.event; return found && chipShows(found, game.serverNow()) ? found : null })
const words = computed(() => (event.value ? chipWords(event.value, game.serverNow()) : ''))
</script>

<template>
  <button v-if="event" type="button" class="world-event-chip" :class="`is-${event.phase}`" :aria-label="`World event: ${event.title}. ${words}`" data-world-event="chip" @click="shell.open('world-event')">
    <b>{{ words }}</b>
    <span v-if="event.phase === 'live' || event.phase === 'done'" class="world-event-chip-bar" aria-hidden="true"><i :style="{ width: `${event.percent}%` }"></i></span>
  </button>
</template>

<style scoped>
.world-event-chip { display: grid; gap: 3px; min-height: 36px; max-width: 220px; padding: 5px 10px; border: 1px solid var(--c-line, #ccc); border-radius: 999px; background: var(--c-panel, #fff); color: var(--c-ink, #111); font: 600 12px var(--font, sans-serif); text-align: left; cursor: pointer; }
.world-event-chip.is-live, .world-event-chip.is-warmup { border-color: #f0a830; box-shadow: 0 0 0 2px rgb(240 168 48 / 30%); }
.world-event-chip b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.world-event-chip-bar { display: block; height: 4px; border-radius: 2px; background: var(--c-fill, #eee); overflow: hidden; }
.world-event-chip-bar i { display: block; height: 100%; background: #2a9d8f; }
</style>
