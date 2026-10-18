<script setup lang="ts">
// A call with an AI character, drawn as the regular call screen (calls.css): the dark card with the ringing avatar while it connects, the name with
// the AI mark, the clock once it is through, the words said as bubbles, and the round buttons: hold to talk, type, hang up. When it ends, the same
// summary as any call: how long, Call again, Message, Close. Push-to-talk: hold the button, let go, the character answers. The character's words
// are spoken by THIS phone's own voice for that character (nothing of its voice crosses the network); the words are always shown too.
// Lazy: the host loads this only when a call is started (CallsHost.vue). The logic is in agentCall.ts, the engines in sttBrowser.ts.
import './calls.css'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import AiTag from '../social/AiTag.vue'
import { getSound } from '../../../audio/settings.ts'
import { profileOf } from '../../../audio/voice/seed.ts'
import { Speech, browserSpeech } from '../../../audio/voice/speech.ts'
import { createAgentCall } from './agentCall.ts'
import type { View } from './agentCall.ts'
import { agentCallApi } from './agentCallApi.ts'
import { closeAgentCall, startAgentCall } from './agentCallState.ts'
import { clockText, initialOf, hueOf } from './callFormat.ts'
import { MAX_HOLD_MS, browserEngine, gatewayEngine } from './sttBrowser.ts'
import { readChoice, STT_KEY } from './stt.ts'
import type { SttChoice } from './stt.ts'
import { STT_WORDS } from './agentCallWords.ts'
import CallIcons from './CallIcons.vue'

const props = defineProps<{ agent: string; name: string }>()
const { game, shell } = useApp()
const lite = useAccountLite()
const api = agentCallApi(game.fetchJson, () => lite.token(), () => lite.load(true))
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
const typing = ref(false)
const details = ref(false)
const unsubscribe = call.subscribe((next) => { view.value = next })
let hold: ReturnType<typeof setTimeout> | null = null
const holding = computed(() => view.value.phase === 'listening')
const canTalk = computed(() => view.value.phase === 'ready' || view.value.phase === 'listening')
const live = computed(() => ['starting', 'ready', 'listening', 'thinking'].includes(view.value.phase))
const over = computed(() => !live.value && view.value.phase !== 'idle')
const minutes = computed(() => (view.value.leftSeconds === null ? null : Math.max(0, Math.ceil(view.value.leftSeconds / 60))))
// The clock runs from the moment the character picks up, like any call.
const now = ref(Date.now())
const startedAt = ref<number | null>(null)
const endedAt = ref<number | null>(null)
let tick: ReturnType<typeof setInterval> | null = null
watch(() => view.value.phase, (phase) => {
  if (startedAt.value === null && (phase === 'ready' || phase === 'listening' || phase === 'thinking')) startedAt.value = Date.now()
  if (startedAt.value !== null && endedAt.value === null && (phase === 'ended' || phase === 'over' || phase === 'error')) endedAt.value = Date.now()
})
const clock = computed(() => (startedAt.value === null ? null : clockText((endedAt.value ?? now.value) - startedAt.value)))
const status = computed(() => {
  switch (view.value.phase) {
    case 'starting': return 'Calling…'
    case 'listening': return 'Listening… let go when you are done.'
    case 'thinking': return `${props.name} is thinking…`
    case 'over': return 'The call is over for today.'
    case 'ended': return 'Call ended'
    case 'error': return 'The call could not be made'
    default: return view.value.typeOnly ? 'Type what you want to say.' : 'Hold the button and speak.'
  }
})
const note = computed(() => view.value.stt === 'gateway' || (view.value.stt === null && choice.value === 'gateway') ? STT_WORDS.gateway : STT_WORDS.browser)

// iPhones only let a page speak after a tap has started speech once: the first press says a silent dot, so the answer that arrives later can be spoken.
let unlocked = false
function unlock(): void {
  if (unlocked || !found) return
  unlocked = true
  try { const dot = found.utter('.'); dot.volume = 0; found.api.speak(dot) } catch { /* the words are shown anyway */ }
}
function down(event: Event): void {
  event.preventDefault()
  unlock()
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
function submit(): void { unlock(); const text = typed.value; typed.value = ''; void call.say(text) }
function choose(event: Event): void { choice.value = readChoice((event.target as HTMLSelectElement).value); call.setChoice(choice.value) }
function hang(): void { void call.hangup() }
function done(): void { void call.hangup().then(() => closeAgentCall()) }
/** Call again: a new screen for the same character (the host keys each call). */
function again(): void { closeAgentCall(); startAgentCall(props.agent, props.name) }
function message(): void { closeAgentCall(); shell.open('agent-chat', { id: props.agent, name: props.name }) }
onMounted(() => { void call.start(props.agent); tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { unsubscribe(); if (hold) clearTimeout(hold); if (tick) clearInterval(tick); void call.hangup() })
</script>

<template>
  <section class="call-card agent-call" :class="{ 'is-over': over }" role="dialog" aria-label="Call with an AI character" data-agent-call :data-phase="view.phase">
    <div class="call-avatar" aria-hidden="true">
      <template v-if="view.phase === 'starting'"><span class="call-ring" /><span class="call-ring" /><span class="call-ring" /></template>
      <b :style="{ background: `hsl(${hueOf(name)} 45% 38%)` }">{{ initialOf(name) }}</b>
    </div>
    <h2 class="call-name">{{ name }}<AiTag :who="{ agent: true }" /></h2>
    <p class="call-status" role="status" aria-live="polite" data-agent-call-status>
      <template v-if="over && clock">{{ status }} · {{ clock }}</template>
      <template v-else-if="view.phase === 'ready' && clock"><span class="call-quality"><span class="call-dot" aria-hidden="true" /> {{ clock }}</span></template>
      <template v-else>{{ status }}</template>
    </p>
    <p v-if="minutes !== null && live" class="call-where" data-agent-call-minutes>{{ minutes }} {{ minutes === 1 ? 'minute' : 'minutes' }} of AI calls left today</p>
    <p v-if="!view.lines.length && live" class="call-note" data-agent-call-ai>An AI plays this character. Its voice is made on your phone from text; nothing of it crosses the network.</p>

    <ul v-if="view.lines.length" class="agent-call-lines" aria-live="polite">
      <li v-for="(line, n) in view.lines" :key="n" :class="`is-${line.who}`" :data-line="line.who"><span class="call-sr">{{ line.who === 'you' ? 'You' : line.who === 'agent' ? name : 'Allworld' }}: </span>{{ line.text }}</li>
      <li v-if="view.partial" class="is-you is-partial" data-agent-call-partial>{{ view.partial }}</li>
    </ul>
    <p v-if="view.silent && view.lines.length" class="call-hint">This phone has no voice to read it aloud, so the words are shown.</p>
    <p v-if="view.problem && view.phase !== 'ended'" class="call-error" role="alert" data-agent-call-problem>{{ view.problem }}</p>

    <template v-if="live">
      <form v-if="typing || view.typeOnly" class="agent-call-type" @submit.prevent="submit">
        <input v-model="typed" type="text" maxlength="300" :placeholder="`Type to ${name}`" :aria-label="`Type to ${name}`" :disabled="!canTalk" data-agent-call-input>
        <button type="submit" class="call-icon is-send" aria-label="Send" :disabled="!canTalk || !typed.trim()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20v-6l9-2-9-2V4l19 8z" /></svg></button>
      </form>
      <div class="call-choices agent-call-choices">
        <button v-if="!view.typeOnly" type="button" class="call-choice" :aria-pressed="typing" data-agent-call-keyboard @click="typing = !typing"><span class="call-round is-soft"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" /></svg></span>{{ typing ? 'Hide keyboard' : 'Type' }}</button>
        <button v-if="!view.typeOnly" type="button" class="call-choice agent-call-talk" :class="{ 'is-held': holding }" :disabled="!canTalk" data-agent-call-talk
          @pointerdown="down" @pointerup="up" @pointercancel="up" @pointerleave="holding && up()" @keydown="key($event, true)" @keyup="key($event, false)" @contextmenu.prevent>
          <span class="call-round is-talk"><CallIcons name="mic" /></span>{{ holding ? 'Listening…' : view.phase === 'thinking' ? 'Wait…' : 'Hold to talk' }}
        </button>
        <button type="button" class="call-choice" data-agent-call-end @click="hang"><span class="call-round"><CallIcons name="hangup" /></span>Hang up</button>
      </div>
      <button type="button" class="call-link agent-call-details" :aria-expanded="details" @click="details = !details">{{ details ? 'Hide details' : 'Details' }}</button>
      <div v-if="details" class="call-panel agent-call-panel">
        <label class="call-field">How your voice becomes words
          <select :value="choice" data-agent-call-stt @change="choose">
            <option value="auto">Automatic</option>
            <option value="browser">My browser’s own</option>
            <option value="gateway">Allworld’s service</option>
          </select>
        </label>
        <p class="call-details" data-agent-call-note>{{ note }}</p>
        <p v-if="view.delay !== null" class="call-details">Words came back {{ (view.delay / 1000).toFixed(1) }} s after you let go.</p>
        <p class="call-details">An AI plays {{ name }}. Calls use your daily minutes for AI characters.</p>
      </div>
    </template>
    <div v-else-if="over" class="call-ended-actions">
      <button v-if="view.phase !== 'over'" type="button" class="call-btn is-primary" data-agent-call-again @click="again">{{ view.phase === 'error' ? 'Try again' : 'Call again' }}</button>
      <button type="button" class="call-btn" data-agent-call-message @click="message">Message</button>
      <button type="button" class="call-btn" data-agent-call-end @click="done">Close</button>
    </div>
  </section>
</template>

<style scoped>
.agent-call { gap: 10px; max-height: min(82vh, 640px); overflow: auto; overscroll-behavior: contain; }
.agent-call.is-over { gap: 12px; }
.agent-call-lines { list-style: none; width: 100%; max-height: 200px; margin: 0; padding: 0 2px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; font-size: 14px; text-align: left; }
.agent-call-lines li { max-width: 86%; padding: 7px 11px; border-radius: 16px 16px 16px 4px; background: #ffffff1f; align-self: flex-start; line-height: 1.35; overflow-wrap: anywhere; }
.agent-call-lines li.is-you { align-self: flex-end; border-radius: 16px 16px 4px 16px; background: #1fae63; }
.agent-call-lines li.is-you.is-partial { opacity: .6; font-style: italic; }
.agent-call-lines li.is-game { align-self: center; max-width: 94%; padding: 4px 8px; border-radius: 10px; background: none; color: #cfe3d9; font-size: 12px; text-align: center; }
.agent-call-choices { gap: 28px; align-items: start; }
.call-round.is-soft { background: #ffffff26; }
.call-round.is-soft svg { width: 26px; height: 26px; fill: #fff; }
.call-round.is-talk { width: 76px; height: 76px; background: #1fae63; }
.call-round.is-talk svg { width: 34px; height: 34px; }
.agent-call-talk { touch-action: none; user-select: none; -webkit-user-select: none; }
.agent-call-talk.is-held .call-round { background: #e0a526; transform: scale(1.08); box-shadow: 0 0 0 8px #e0a52640; }
.agent-call-talk:disabled { opacity: .55; cursor: wait; }
.call-choice[aria-pressed='true'] .call-round { background: #ffffff40; }
.agent-call-type { display: flex; gap: 8px; width: 100%; }
.agent-call-type input { flex: 1; min-width: 0; min-height: 44px; padding: 8px 16px; border-radius: 22px; border: 0; background: #ffffff1f; color: #fff; font: 400 16px var(--font); }
.agent-call-type input::placeholder { color: #cfe3d9; }
.agent-call-type input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.call-icon.is-send { background: #1fae63; }
.call-icon.is-send:disabled { opacity: .45; cursor: not-allowed; }
.agent-call-details { justify-self: center; }
.agent-call-panel { width: 100%; box-sizing: border-box; text-align: left; }
.agent-call-panel .call-details { max-width: none; }
@media (max-width: 400px) { .agent-call-choices { gap: 18px; } }
</style>
