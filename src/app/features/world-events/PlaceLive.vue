<script setup lang="ts">
// What a place shows of the world's live moments (docs/WORLD-EVENTS.md), under the place panel: in the Square the weekly event's bar
// and its surprise drops, the winner's speech as it arrives, and the election board on election night; in any place, its stage.
// A lazy chunk of its own: PlacePanel.vue loads it with defineAsyncComponent.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { eventStep, loadEvent, worldEvent } from './eventStore.ts'
import { chipWords } from './eventWords.ts'
import { chipShows } from '../../../world-events/model.ts'
import ElectionBoard from './ElectionBoard.vue'
import StagePanel from './StagePanel.vue'

const props = defineProps<{ room: string; square: boolean }>()
const { game, shell } = useApp()
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { if (props.square) void loadEvent(true, true); timer = setInterval(() => { clock.value = Date.now(); if (props.square) void loadEvent(false, true) }, 5000) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer) })
const event = computed(() => { void clock.value; const found = worldEvent.view?.event; return props.square && found && chipShows(found, game.serverNow()) && found.phase !== 'announced' ? found : null })
const moment = computed(() => { void clock.value; const found = worldEvent.moment; return props.square && found && Date.now() - found.at < 3 * 60000 ? found : null })
const problem = ref<string | null>(null)
async function grab(): Promise<void> { problem.value = await eventStep('grab'); if (!problem.value) game.toast('You grabbed a surprise. It counts for the bar.', 'good') }
</script>

<template>
  <div class="place-live" data-world-event="place">
    <aside v-if="moment" class="place-moment" role="status" aria-live="polite" data-world-event="moment">
      <b>{{ moment.title }}: {{ moment.name }}<template v-if="moment.ai"> (AI)</template></b>
      <p>“{{ moment.text }}”</p>
    </aside>
    <div v-if="event" class="place-event" data-world-event="square-bar">
      <button type="button" class="place-event-title" @click="shell.open('world-event')"><b>{{ event.title }}</b> · {{ chipWords(event, game.serverNow()) }}</button>
      <div class="place-event-bar" aria-hidden="true"><i :style="{ width: `${event.percent}%` }"></i></div>
      <p class="social-note">{{ event.count }} of {{ event.target }}<template v-if="event.helpers.length"> · AI helpers: {{ event.helpers.map((item) => `${item.name} (AI)`).join(', ') }}</template></p>
      <button v-if="event.drop && event.drop.left" type="button" class="ui-button is-primary" data-world-event="square-grab" :disabled="worldEvent.busy || Boolean(worldEvent.mine?.grabbed.includes(event.drop.id))" @click="grab">{{ worldEvent.mine?.grabbed.includes(event.drop.id) ? 'You grabbed one' : `Grab the drop (${event.drop.left} left)` }}</button>
      <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
    </div>
    <ElectionBoard v-if="square" :city="game.cityId.value" compact />
    <StagePanel :room="room" />
  </div>
</template>

<style scoped>
.place-live { display: grid; gap: 8px; margin-top: 8px; }
.place-moment { padding: 8px 10px; border-radius: 10px; background: linear-gradient(90deg, rgb(123 47 247 / 14%), rgb(247 201 72 / 18%)); }
.place-moment p { margin: 4px 0 0; }
.place-event { display: grid; gap: 4px; }
.place-event-title { text-align: left; background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.place-event-bar { height: 10px; border-radius: 5px; background: var(--c-fill, #eee); overflow: hidden; }
.place-event-bar i { display: block; height: 100%; background: linear-gradient(90deg, #f0a830, #2a9d8f); transition: width 0.4s; }
</style>
