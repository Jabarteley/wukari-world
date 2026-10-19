<script setup lang="ts">
// Election night's board (docs/WORLD-EVENTS.md, docs/POLITICS.md): the viewer's seats, the people's and the agents' (marked AI), the live
// tally while the polls are open and the result after the close; the Friday debates; the winner's speech; the result card ("Ada wins Lagos
// with 61%"). Every number is the stored ballot's (GET /api/world/election-night). `compact`: the Square's short form.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { loadNight, night, nightPost } from './eventStore.ts'
import { whenWords } from './eventWords.ts'
import { shareGist } from '../growth/shareMoment.ts'

const props = defineProps<{ city: string; compact?: boolean }>()
const { game } = useApp()
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void loadNight(props.city, true); timer = setInterval(() => { void loadNight(props.city) }, 20000) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer) })
watch(() => props.city, (city) => { void loadNight(city, true) })
const view = computed(() => (night.city === props.city ? night.view : null))
const me = computed(() => game.view.value.session?.id ?? '')
const seats = computed(() => (view.value?.seats ?? []).filter((seat) => !props.compact || seat.side === 'humans'))
const heading = computed(() => {
  const v = view.value
  if (!v) return ''
  if (v.phase === 'debate') return 'Debate night in the Square'
  if (v.phase === 'live') return 'Results live: the polls close at midnight'
  if (v.phase === 'results') return 'Results'
  return v.phase === 'voting' ? 'Polls are open' : 'This week’s elections'
})
const show = computed(() => Boolean(view.value && seats.value.length && (!props.compact || view.value.phase === 'live' || view.value.phase === 'results' || view.value.phase === 'debate')))
const speech = ref(''), problem = ref<string | null>(null), busy = ref(false)
async function speak(scope: string): Promise<void> {
  busy.value = true
  const done = await nightPost('speech', { city: props.city, scope, text: speech.value })
  busy.value = false
  problem.value = done.ok ? null : done.reason
  if (done.ok) { speech.value = ''; game.toast('Your speech went out to everyone in the Square.', 'good'); void loadNight(props.city, true) }
}
async function card(scope: string): Promise<void> {
  const done = await nightPost('card', { city: props.city, scope })
  if (done.ok && typeof done.n === 'number') shareGist(done.n, () => game.toast('That could not be shared. Try again.', 'error'))
  else game.toast(done.ok ? 'That could not be shared.' : done.reason, 'error')
}
</script>

<template>
  <section v-if="show && view" class="election-board" :class="{ 'is-compact': compact }" data-world-event="board" aria-label="Election results board">
    <h3>{{ heading }}</h3>
    <p v-if="view.debates.length && view.phase !== 'results'" class="social-note">Debates in the Square: <span v-for="(item, at) in view.debates" :key="item.scope">{{ at ? '; ' : '' }}{{ whenWords(item.at) }} {{ item.title }} of {{ item.place }}</span></p>
    <article v-for="seat in seats" :key="seat.scope" class="election-seat" :data-scope="seat.scope">
      <header><b>{{ seat.title }} of {{ seat.place }}</b><span v-if="seat.side === 'agents'" class="election-ai"> · agents’ ballot (AI)</span><span class="social-note"> · {{ seat.total }} {{ seat.total === 1 ? 'vote' : 'votes' }}</span></header>
      <div v-for="row in seat.rows.slice(0, compact ? 3 : 8)" :key="row.id" class="election-row" :class="{ 'is-winner': seat.winner?.id === row.id }">
        <span class="election-name">{{ row.name }}<template v-if="row.ai"> (AI)</template><small v-if="row.party"> · {{ row.party }}</small></span>
        <span class="election-bar" aria-hidden="true"><i :style="{ width: `${row.percent}%` }"></i></span>
        <span class="election-pc">{{ row.percent }}%</span>
      </div>
      <p v-if="seat.winner" class="election-winner"><b>{{ seat.winner.name }}{{ seat.winner.ai ? ' (AI)' : '' }} wins {{ seat.place }} with {{ seat.winner.percent }}%</b> <button type="button" class="social-btn" data-world-event="result-card" @click="card(seat.scope)">Share</button></p>
      <p v-else-if="seat.void" class="social-note">Fewer than {{ seat.quorum }} voted: the election does not count and the seat stays empty.</p>
      <form v-if="!compact && seat.winner?.id === me && !view.speeches.some((item) => item.scope === seat.scope)" class="election-speech" @submit.prevent="speak(seat.scope)">
        <label :for="`speech-${seat.scope}`">Your victory speech to the Square (once)</label>
        <textarea :id="`speech-${seat.scope}`" v-model="speech" maxlength="280" rows="3"></textarea>
        <button type="submit" class="ui-button is-primary" :disabled="busy || speech.trim().length < 3">Give the speech</button>
      </form>
    </article>
    <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
    <div v-for="item in view.speeches.slice(0, compact ? 1 : 5)" :key="item.scope" class="election-speech-line"><b>{{ item.name }}:</b> “{{ item.text }}”</div>
  </section>
</template>

<style scoped>
.election-board { display: grid; gap: 8px; padding: 8px; border: 1px solid var(--c-line, #ddd); border-radius: 10px; }
.election-board h3 { margin: 0; font-size: 15px; }
.election-seat { display: grid; gap: 4px; }
.election-row { display: grid; grid-template-columns: minmax(0, 1.3fr) 1fr 42px; gap: 6px; align-items: center; font-size: 13px; }
.election-row.is-winner .election-name { font-weight: 700; }
.election-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.election-bar { height: 8px; border-radius: 4px; background: var(--c-fill, #eee); overflow: hidden; }
.election-bar i { display: block; height: 100%; background: #2a9d8f; transition: width 0.6s; }
.election-pc { text-align: right; font-variant-numeric: tabular-nums; }
.election-ai { color: var(--c-muted, #666); }
.election-speech { display: grid; gap: 4px; }
.election-speech textarea { font: 400 16px var(--font, sans-serif); padding: 6px; border-radius: 8px; border: 1px solid var(--c-line, #ccc); }
.election-speech-line { font-size: 13px; }
</style>
