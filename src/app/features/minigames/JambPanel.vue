<script setup lang="ts">
// JAMB season (docs/MINI-GAMES.md): five original practice questions a day, a mock exam (twenty questions, twenty minutes, once) and a results-day card. The
// questions arrive without answers; the server checks every answer and pays the small prizes. A revision game, not an exam and not a promise about one.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import SectionTitle from '../../ui/SectionTitle.vue'
import type { JambAnswerResult, JambView } from '../../../types/minigames.ts'
import { minigamesApi } from './minigamesApi.ts'
import { SUBJECT_WORDS, answersFor, mockClock, mockSeconds } from './seasonsModel.ts'
import { naira } from './haggleModel.ts'
import { track } from '../world/worldModel.ts'

const props = defineProps<{ view: JambView; city: string }>()
const emit = defineEmits<{ changed: [] }>()
const { game, shell } = useApp()
const api = minigamesApi(game.fetchJson)
const busy = ref(false)
const note = ref('')
const now = ref(0)
const current = ref<JambView>(props.view)
const results = reactive<Record<number, JambAnswerResult>>({})
const picked = reactive<Record<number, number>>({})
let tick: ReturnType<typeof setInterval> | undefined, submitted = false
watch(() => props.view, (next) => { current.value = next })

const answered = computed(() => Object.fromEntries((current.value.practice?.answered ?? []).map((item) => [item.id, item])) as Record<number, JambAnswerResult>)
const resultFor = (id: number): JambAnswerResult | undefined => results[id] ?? answered.value[id]
const left = computed(() => mockSeconds(current.value.mock, now.value))

async function call<T extends { jamb: JambView }>(step: string, run: () => Promise<({ ok: true } & T) | { ok: false; reason: string }>): Promise<(T & { ok: true }) | null> {
  if (busy.value) return null
  busy.value = true; note.value = ''
  const answer = await run()
  busy.value = false
  if (!answer.ok) { note.value = answer.reason; emit('changed'); return null }
  current.value = answer.jamb
  track('season_step', { season: 'jamb', action: step })
  return answer as T & { ok: true }
}
async function join(): Promise<void> { if (await call('join', () => api.joinJamb(props.city, game.newId()))) { await today(); emit('changed') } }
async function today(): Promise<void> {
  const answer = await api.today(props.city)
  if (answer.ok) current.value = answer.jamb; else note.value = answer.reason
}
async function choose(id: number, choice: number): Promise<void> {
  if (resultFor(id)) return
  const answer = await call('practice', () => api.answer(props.city, id, choice, game.newId()))
  if (!answer) return
  results[id] = answer.result
  if (answer.result.paid) { note.value = `${naira(answer.result.paid)} for a right answer.`; void game.refresh() }
}
async function startMock(): Promise<void> { submitted = false; Object.keys(picked).forEach((key) => delete picked[Number(key)]); if (await call('mock', () => api.mockStart(props.city, game.newId()))) now.value = game.serverNow() }
async function submitMock(): Promise<void> {
  if (submitted) return
  submitted = true
  const questions = current.value.mock.questions
  const done = await call('mock', () => api.mockSubmit(props.city, answersFor(questions, picked), game.newId()))
  if (done) { void game.refresh(); emit('changed') } else submitted = false
}
async function share(): Promise<void> {
  const card = current.value.card
  if (!card || busy.value) return
  busy.value = true
  try {
    const { jambCardPhoto } = await import('./seasonCards.ts')
    const { adoptCapture } = await import('../capture/captureSession.ts')
    if (!adoptCapture({ photo: await jambCardPhoto(card) })) { note.value = 'Capture is busy. Try again in a moment.'; return }
    track('season_step', { season: 'jamb', action: 'card' })
    shell.open('capture')
  } catch { note.value = 'The card could not be made on this device.' } finally { busy.value = false }
}

onMounted(() => {
  now.value = game.serverNow()
  if (current.value.joined && !current.value.practice) void today()
  tick = setInterval(() => { now.value = game.serverNow(); if (current.value.mock.state === 'running' && left.value <= 0) void submitMock() }, 1000)
})
onBeforeUnmount(() => { if (tick !== undefined) clearInterval(tick) })
</script>

<template>
  <div class="jb" data-season="jamb">
    <template v-if="!current.joined">
      <p class="social-note">A two-week revision season. Answer five original questions a day, sit a mock exam when you are ready, and get your results card on day {{ current.resultsDay + 1 }}. Prizes are small and in game naira. Season {{ current.year }}.</p>
      <button type="button" class="ui-button is-primary" :disabled="busy || !current.on" data-jamb="join" @click="join">Join the season</button>
      <p v-if="!current.on" class="ui-note">The season is not open right now.</p>
    </template>
    <template v-else>
      <p class="jb-line">Day {{ current.day + 1 }} · streak {{ current.streak }} · {{ naira(current.earned) }} earned</p>
      <p v-if="note" class="ui-note" role="status" data-jamb="note">{{ note }}</p>

      <SectionTitle>Today's practice</SectionTitle>
      <p v-if="!current.practice" class="jb-wait">Fetching today's questions…</p>
      <ol v-else class="jb-qs">
        <li v-for="(q, at) in current.practice.questions" :key="q.id" class="jb-q" :data-q="q.id">
          <p class="jb-text"><b>{{ at + 1 }}.</b> <small>{{ SUBJECT_WORDS[q.subject] }}</small><br>{{ q.text }}</p>
          <div class="jb-opts">
            <button v-for="(text, i) in q.options" :key="i" type="button" class="ui-button jb-opt" :class="{ 'is-right': resultFor(q.id) && resultFor(q.id)!.answer === i, 'is-wrong': resultFor(q.id) && resultFor(q.id)!.choice === i && !resultFor(q.id)!.correct }"
              :disabled="busy || Boolean(resultFor(q.id))" :data-opt="i" @click="choose(q.id, i)">{{ text }}</button>
          </div>
          <p v-if="resultFor(q.id)" class="jb-why">{{ resultFor(q.id)!.correct ? 'Right. ' : 'Not this time. ' }}{{ resultFor(q.id)!.why }}</p>
        </li>
      </ol>

      <SectionTitle>Mock exam</SectionTitle>
      <template v-if="current.mock.state === 'locked'"><p class="jb-wait">{{ current.mock.need }}</p></template>
      <template v-else-if="current.mock.state === 'ready'">
        <p class="jb-wait">Twenty questions in {{ current.mock.minutes }} minutes, once. Your score is out of 400.</p>
        <button type="button" class="ui-button is-primary" :disabled="busy" data-jamb="mock" @click="startMock">Start the mock</button>
      </template>
      <template v-else-if="current.mock.state === 'running'">
        <p class="jb-clock" role="timer" data-jamb="clock">{{ mockClock(left) }} left</p>
        <ol class="jb-qs">
          <li v-for="(q, at) in current.mock.questions" :key="q.id" class="jb-q">
            <p class="jb-text"><b>{{ at + 1 }}.</b> <small>{{ SUBJECT_WORDS[q.subject] }}</small><br>{{ q.text }}</p>
            <div class="jb-opts">
              <button v-for="(text, i) in q.options" :key="i" type="button" class="ui-button jb-opt" :class="{ 'is-picked': picked[q.id] === i }" :aria-pressed="picked[q.id] === i" @click="picked[q.id] = i">{{ text }}</button>
            </div>
          </li>
        </ol>
        <button type="button" class="ui-button is-primary" :disabled="busy" data-jamb="submit" @click="submitMock">Hand in the paper</button>
      </template>
      <template v-else-if="current.mock.result">
        <p class="jb-score" data-jamb="score">{{ current.mock.result.score }} <small>out of 400 · {{ current.mock.result.correct }} of {{ current.mock.result.total }} right</small></p>
      </template>

      <template v-if="current.card">
        <SectionTitle>Results day</SectionTitle>
        <div class="jb-card" data-jamb="card">
          <strong>{{ current.card.score }} · {{ current.card.band }}</strong>
          <p>Best subject: {{ SUBJECT_WORDS[current.card.best] }}. Practice: {{ current.card.practiceCorrect }} of {{ current.card.practiceAnswered }} right on {{ current.card.practiceDays }} days.</p>
          <div class="jb-row">
            <button type="button" class="ui-button is-primary" :disabled="busy" @click="share">Share your results card</button>
            <button v-if="city === 'lagos'" type="button" class="ui-button" data-jamb="campus" @click="shell.open('campus')">See the UNILAG campus</button>
          </div>
        </div>
      </template>
      <p v-else-if="current.mock.state === 'done'" class="jb-wait">Your results card arrives on day {{ current.resultsDay + 1 }} of the season.</p>
      <p class="jb-fine">A revision game with original questions, not past papers, and not an exam. Game naira only: {{ naira(50) }} a right practice answer (at most {{ naira(current.caps.practiceDay) }} a day) and up to {{ naira(current.caps.mock) }} for the mock.</p>
    </template>
  </div>
</template>

<style scoped>
.jb { display: flex; flex-direction: column; gap: 10px; }
.jb-line { margin: 0; font-size: 14px; }
.jb-wait { margin: 0; font-size: 13px; opacity: .75; }
.jb-qs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.jb-q { display: flex; flex-direction: column; gap: 6px; }
.jb-text { margin: 0; font-size: 14px; }
.jb-text small { opacity: .65; }
.jb-opts { display: flex; flex-direction: column; gap: 6px; }
.jb-opt { text-align: left; white-space: normal; }
.jb-opt.is-right { outline: 2px solid #2f9e44; }
.jb-opt.is-wrong { outline: 2px solid #c92a2a; }
.jb-opt.is-picked { outline: 2px solid #1971c2; }
.jb-why { margin: 0; font-size: 12px; opacity: .85; }
.jb-clock { margin: 0; font-weight: 800; font-size: 20px; }
.jb-score { margin: 0; font-size: 40px; font-weight: 800; }
.jb-score small { font-size: 13px; font-weight: 500; opacity: .75; }
.jb-card { border-radius: 14px; padding: 12px; background: rgba(255, 216, 74, .16); border: 1px solid rgba(255, 216, 74, .6); display: flex; flex-direction: column; gap: 6px; }
.jb-card p { margin: 0; font-size: 13px; }
.jb-row { display: flex; gap: 8px; flex-wrap: wrap; }
.jb-fine { font-size: 12px; opacity: .7; margin: 0; }
</style>
