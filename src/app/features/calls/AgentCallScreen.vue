<script setup lang="ts">
// A call with an AI character, on the phone: push-to-talk (hold the button, let go, the character answers), the AI-played mark, the minutes left, and which way your speech is
// turned into words. The character's words are spoken by THIS phone's own voice for that character (nothing of its voice crosses the network); the words are always shown too.
// Lazy: the host loads this only when a call is started (src/app/features/calls/CallsHost.vue). The logic is in agentCall.ts, the engines in sttBrowser.ts.
import './calls.css'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import AiTag from '../social/AiTag.vue'
import { getSound } from '../../../audio/settings.ts'
import { profileOf } from '../../../audio/voice/seed.ts'
import { Speech, browserSpeech } from '../../../audio/voice/speech.ts'
import { createAgentCall } from './agentCall.ts'
import type { View } from './agentCall.ts'
import { agentCallApi } from './agentCallApi.ts'
import { closeAgentCall } from './agentCallState.ts'
import { initialOf, hueOf } from './callFormat.ts'
import { MAX_HOLD_MS, browserEngine, gatewayEngine } from './sttBrowser.ts'
import { readChoice, STT_KEY } from './stt.ts'
import type { SttChoice } from './stt.ts'
import { STT_WORDS } from './agentCallWords.ts'

const props = defineProps<{ agent: string; name: string }>()
const { game } = useApp()
const lite = useAccountLite()
const api = agentCallApi(game.fetchJson, () => lite.token())
const found = browserSpeech()
const speech = found ? new Speech({ api: found.api, utter: found.utter, hidden: () => document.hidden, after: (run, ms) => { const id = setTimeout(run, ms); return () => clearTimeout(id) }, now: () => Date.now() }) : null
const storage = { get: (key: string): string | null => { try { return localStorage.getItem(key) } catch { return null } }, set: (key: string, value: string): void => { try { localStorage.setItem(key, value) } catch { /* it is not kept */ } } }
const call = createAgentCall({
  api,
  engines: [browserEngine(), gatewayEngine({ transcribe: (audio, type) => api.transcribe('', audio, type) })],
  speak: (text, seed) => { if (!speech?.available()) return false; const sound = getSound(); return speech.say(text, profileOf(String(seed)), sound.on ? sound.master * sound.calls : 0) },
  stopSpeaking: () => speech?.cancel(),
  storage,
  active: (on) => window.dispatchEvent(new CustomEvent('jaw:call-active', { detail: on })),
})
const view = ref<View>(call.view())
const choice = ref<SttChoice>(readChoice(storage.get(STT_KEY)))
const typed = ref('')
const unsubscribe = call.subscribe((next) => { view.value = next })
let hold: ReturnType<typeof setTimeout> | null = null
const holding = computed(() => view.value.phase === 'listening')
const canTalk = computed(() => view.value.phase === 'ready' || view.value.phase === 'listening')
const minutes = computed(() => (view.value.leftSeconds === null ? null : Math.max(0, Math.ceil(view.value.leftSeconds / 60))))
const busyText = computed(() => view.value.phase === 'starting' ? 'Calling…' : view.value.phase === 'thinking' ? `${props.name} is thinking…` : view.value.phase === 'listening' ? 'Listening… let go when you are done.' : view.value.phase === 'over' ? 'The call is over for today.' : view.value.phase === 'ended' ? 'Call ended.' : 'Hold the button and speak.')
const note = computed(() => view.value.stt === 'gateway' || (view.value.stt === null && choice.value === 'gateway') ? STT_WORDS.gateway : STT_WORDS.browser)

function down(event: Event): void {
  event.preventDefault()
  if (!canTalk.value || holding.value) return
  void call.press()
  if (hold) clearTimeout(hold)
  hold = setTimeout(up, MAX_HOLD_MS)
}
function up(): void {
  if (hold) { clearTimeout(hold); hold = null }
  void call.release()
}
function key(event: KeyboardEvent, pressed: boolean): void {
  if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return
  if (pressed) down(event); else { event.preventDefault(); up() }
}
function submit(): void { const text = typed.value; typed.value = ''; void call.say(text) }
function choose(event: Event): void { choice.value = readChoice((event.target as HTMLSelectElement).value); call.setChoice(choice.value) }
function hang(): void { void call.hangup().then(() => closeAgentCall()) }
function done(): void { void call.hangup().then(() => closeAgentCall()) }
onMounted(() => { void call.start(props.agent) })
onBeforeUnmount(() => { unsubscribe(); if (hold) clearTimeout(hold); void call.hangup() })
</script>

<template>
  <section class="call-card agent-call" role="dialog" aria-label="Call with an AI character" data-agent-call :data-phase="view.phase">
    <div class="call-avatar" aria-hidden="true"><b :style="{ background: `hsl(${hueOf(name)} 45% 38%)` }">{{ initialOf(name) }}</b></div>
    <h2 class="call-name">{{ name }}<AiTag :who="{ agent: true }" /></h2>
    <p class="call-status" role="status" aria-live="polite" data-agent-call-status>{{ busyText }}</p>
    <p class="call-note" data-agent-call-ai>An AI plays this character. Its voice is made on your phone from text: no audio of it crosses the network.</p>
    <p v-if="minutes !== null && view.phase !== 'over'" class="call-note" data-agent-call-minutes>{{ minutes }} {{ minutes === 1 ? 'minute' : 'minutes' }} of AI calls left today.</p>
    <ul class="agent-call-lines" aria-live="polite">
      <li v-for="(line, n) in view.lines" :key="n" :class="`is-${line.who}`" :data-line="line.who"><b>{{ line.who === 'you' ? 'You' : line.who === 'agent' ? name : 'Allworld' }}</b> {{ line.text }}</li>
    </ul>
    <p v-if="view.partial" class="call-note" data-agent-call-partial>{{ view.partial }}</p>
    <p v-if="view.silent && view.lines.length" class="call-note">This phone has no voice to read it aloud, so the words are shown.</p>
    <p v-if="view.problem" class="call-error" role="alert" data-agent-call-problem>{{ view.problem }}</p>
    <template v-if="view.phase !== 'over' && view.phase !== 'ended' && view.phase !== 'error'">
      <button v-if="!view.typeOnly" type="button" class="call-btn is-primary is-big agent-call-talk" :class="{ 'is-held': holding }" :disabled="!canTalk" data-agent-call-talk
        @pointerdown="down" @pointerup="up" @pointercancel="up" @pointerleave="holding && up()" @keydown="key($event, true)" @keyup="key($event, false)" @contextmenu.prevent>
        {{ holding ? 'Listening…' : 'Hold to talk' }}
      </button>
      <form class="agent-call-type" @submit.prevent="submit">
        <input v-model="typed" type="text" maxlength="300" :placeholder="view.typeOnly ? 'Type what you want to say' : 'Or type here'" :aria-label="`Type to ${name}`" :disabled="!canTalk" data-agent-call-input>
        <button type="submit" class="call-btn" :disabled="!canTalk || !typed.trim()">Send</button>
      </form>
      <label class="agent-call-how">How your voice becomes words
        <select :value="choice" data-agent-call-stt @change="choose">
          <option value="auto">Automatic</option>
          <option value="browser">My browser’s own</option>
          <option value="gateway">Allworld’s service</option>
        </select>
      </label>
      <p class="call-note" data-agent-call-note>{{ note }}</p>
      <p v-if="view.delay !== null" class="call-note">Words came back {{ (view.delay / 1000).toFixed(1) }} s after you let go.</p>
    </template>
    <div class="call-choices">
      <button type="button" class="call-choice" data-agent-call-end @click="view.phase === 'over' || view.phase === 'ended' || view.phase === 'error' ? done() : hang()"><span class="call-round">×</span>{{ view.phase === 'over' || view.phase === 'ended' || view.phase === 'error' ? 'Close' : 'Hang up' }}</button>
    </div>
  </section>
</template>

<style scoped>
.agent-call { display: grid; gap: 8px; max-height: min(78vh, 620px); overflow: auto; }
.agent-call-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 14px; }
.agent-call-lines li.is-you { text-align: right; }
.agent-call-lines li.is-game { padding: 6px 8px; border-radius: 10px; background: rgba(0, 0, 0, .06); }
.agent-call-talk { min-height: 64px; touch-action: none; user-select: none; -webkit-user-select: none; }
.agent-call-talk.is-held { filter: brightness(1.15); }
.agent-call-type { display: flex; gap: 6px; }
.agent-call-type input, .agent-call-how select { color: #111; background: #fff; }
.agent-call-type input { flex: 1; min-width: 0; padding: 8px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, .2); font: inherit; }
.agent-call-how { display: grid; gap: 4px; font-size: 13px; }
</style>
