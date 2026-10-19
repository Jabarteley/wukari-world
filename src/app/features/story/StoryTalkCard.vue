<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { StoryTalkTurn, StoryTalkView, TalkResult } from '../../../types/story-talk.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import AiTag from '../social/AiTag.vue'
import {
  TALK_QUESTION_MAX,
  beginTalkRequest, completeTalkNotice, completeTalkReply, createTalkModel,
  currentTalkToken, discardTalkRequest, isTalkTokenCurrent, reconcileTalkContext, retryTalkRequest,
  type TalkContext, type TalkModelState, type TalkPostPayload, type TalkRequestToken,
} from './talkModel.ts'

type Reply = Extract<TalkResult, { kind: 'reply' }>
type ConversationTurn = { id: string; question: string; reply: string; phrase?: Reply['phrase'] }

const { game } = useApp()
const opened = ref(false)
const loading = ref(false)
const busy = ref(false)
const view = ref<StoryTalkView | null>(null)
const selectedNpc = ref('')
const question = ref('')
const status = ref('')
const gameNotice = ref('')
const turns = ref<ConversationTurn[]>([])
const placeChanged = ref(false)

const storyEnabled = computed(() => game.view.value.story.enabled === true)
const connected = computed(() => game.connected.value)
const characterKey = computed(() => JSON.stringify([game.session.value?.id ?? null, game.state.value.onboarding.bornAt]))
const placeKey = computed(() => JSON.stringify([characterKey.value, String(game.cityId.value), game.state.value.location, storyEnabled.value, connected.value]))
const activeView = computed(() => view.value?.enabled === true ? view.value : null)
const selected = computed(() => activeView.value?.regulars.find(regular => regular.id === selectedNpc.value) ?? null)
const canTalk = computed(() => Boolean(
  connected.value && activeView.value?.available && selected.value && question.value.trim()
  && !busy.value && !model.value.retry,
))

function context(): TalkContext {
  return {
    character: characterKey.value,
    city: String(game.cityId.value), venue: game.state.value.location, npc: selectedNpc.value,
    enabled: storyEnabled.value, connected: connected.value,
  }
}

const model = ref<TalkModelState>(createTalkModel(context()))
let loadSerial = 0
let requestSerial = 0

function clearConversation(message = ''): void {
  model.value = reconcileTalkContext(model.value, context())
  turns.value = []
  question.value = ''
  gameNotice.value = ''
  placeChanged.value = false
  status.value = message
}

watch(placeKey, (_next, previous) => {
  if (previous === undefined) return
  loadSerial += 1; requestSerial += 1
  loading.value = false; busy.value = false
  view.value = null; selectedNpc.value = ''
  clearConversation(!connected.value ? 'Reconnect to load city conversations.' : storyEnabled.value ? 'Your location changed. Refresh conversations here.' : '')
}, { flush: 'sync' })

watch(selectedNpc, (_next, previous) => {
  if (previous === undefined || previous === selectedNpc.value) return
  clearConversation(selectedNpc.value ? 'Start a new conversation with this regular.' : '')
}, { flush: 'sync' })

function loadError(error: unknown): string {
  const statusCode = errorStatus(error)
  if (statusCode === 401) return 'Your session ended. Reconnect, then refresh conversations.'
  if (statusCode === 403) return 'City conversations are not available for this session. Refresh after reconnecting.'
  if (statusCode === 429) return 'Too many requests right now. Wait a moment, then refresh.'
  return 'City conversations could not be loaded. Refresh to try again.'
}

function turnError(error: unknown): string {
  const statusCode = errorStatus(error)
  if (statusCode === 401) return 'Your session ended. Reconnect, then ask again.'
  if (statusCode === 403) return 'This conversation is not available. Refresh before trying again.'
  if (statusCode === 409) return 'That question can no longer be retried. Refresh this place, then send a new question.'
  if (statusCode === 429) return 'Too many questions right now. Wait a moment, then retry the same question.'
  return 'The reply could not be confirmed. Retry the same question.'
}

function errorStatus(error: unknown): number | undefined {
  return error !== null && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined
}

async function load(): Promise<void> {
  if (!opened.value || loading.value) return
  if (!storyEnabled.value || !connected.value) { status.value = 'Reconnect to load city conversations.'; return }
  const token = currentTalkToken(model.value), serial = ++loadSerial
  loading.value = true; status.value = ''; gameNotice.value = ''
  try {
    const next = await game.fetchJson<StoryTalkView>('/api/story/talk')
    if (serial !== loadSerial || !isTalkTokenCurrent(model.value, token)) return
    if (next.enabled && (next.city.id !== String(game.cityId.value) || next.venue.id !== game.state.value.location)) {
      status.value = 'Your location changed. Refresh conversations here.'
      view.value = null; selectedNpc.value = ''
      return
    }
    view.value = next
    placeChanged.value = false
    if (!next.enabled) { selectedNpc.value = ''; status.value = next.reason; return }
    if (!next.regulars.some(regular => regular.id === selectedNpc.value)) selectedNpc.value = next.regulars[0]?.id ?? ''
    status.value = next.reason ?? ''
  } catch (error) {
    if (serial === loadSerial && isTalkTokenCurrent(model.value, token)) status.value = loadError(error)
  } finally {
    if (serial === loadSerial) loading.value = false
  }
}

function openCard(): void {
  opened.value = true
  void load()
}

async function refreshCard(): Promise<void> {
  if (loading.value || busy.value) return
  model.value = discardTalkRequest(model.value)
  if (placeChanged.value) {
    status.value = 'Refreshing your current location…'
    const refreshed = await game.refresh()
    if (!refreshed) { status.value = 'Your location could not be refreshed. Reconnect, then try again.'; return }
  }
  await load()
}

function failedTurnText(turn: Extract<StoryTalkTurn, { ok: false }>): string {
  if (turn.code === 'place-changed') return 'Your location changed. Refresh before talking again.'
  if (turn.code === 'bank-unavailable') return 'City conversations are still loading. Retry the same question.'
  return 'Talking is unavailable here. Refresh this card before asking again.'
}

function resultText(result: Exclude<TalkResult, { kind: 'reply' | 'notice' }>): string {
  if (result.kind === 'cancelled') return 'The conversation changed before the reply arrived. Refresh before asking again.'
  if (result.reason === 'capacity') return 'City conversations are busy. Retry the same question in a moment.'
  if (result.reason === 'already-attempted') return 'This question was already attempted, but its reply is unavailable. It will not be sent again.'
  if (result.reason === 'nonce-conflict' || result.reason === 'invalid-client') return 'This question could not be matched safely. Ask again to create a new request, or refresh.'
  return 'This reply was unavailable. Refresh before asking again.'
}

async function sendPayload(payload: TalkPostPayload, token: TalkRequestToken): Promise<void> {
  const serial = ++requestSerial
  busy.value = true; status.value = ''; gameNotice.value = ''
  try {
    const turn = await game.fetchJson<StoryTalkTurn>('/api/story/talk', { method: 'POST', body: payload })
    if (serial !== requestSerial || !isTalkTokenCurrent(model.value, token)) return
    if (!turn.ok) {
      status.value = failedTurnText(turn)
      if (turn.code !== 'bank-unavailable') model.value = discardTalkRequest(model.value)
      if (turn.code === 'place-changed') placeChanged.value = true
      return
    }
    if (turn.city !== String(game.cityId.value) || turn.venue !== game.state.value.location || turn.npc !== payload.npc) {
      status.value = 'Your location changed. Refresh before talking again.'
      model.value = discardTalkRequest(model.value); placeChanged.value = true
      return
    }
    const result = turn.result
    if (result.kind === 'reply') {
      const next = completeTalkReply(model.value, token, result.text)
      if (!next) return
      model.value = next
      turns.value = [...turns.value, { id: payload.clientId, question: payload.question, reply: result.text, ...(result.phrase ? { phrase: result.phrase } : {}) }].slice(-2)
      question.value = ''
      return
    }
    if (result.kind === 'notice') {
      const next = completeTalkNotice(model.value, token)
      if (!next) return
      model.value = next; gameNotice.value = result.text; question.value = ''
      return
    }
    status.value = resultText(result)
    if (result.kind === 'cancelled' || result.reason !== 'capacity') model.value = discardTalkRequest(model.value)
  } catch (error) {
    if (serial === requestSerial && isTalkTokenCurrent(model.value, token)) {
      status.value = turnError(error)
      const statusCode = errorStatus(error)
      if (statusCode === 401 || statusCode === 403 || statusCode === 409) model.value = discardTalkRequest(model.value)
    }
  } finally {
    if (serial === requestSerial) busy.value = false
  }
}

function ask(text = question.value): void {
  if (!activeView.value?.available || !selected.value || busy.value || model.value.retry) return
  try {
    const started = beginTalkRequest(model.value, selected.value.id, game.newId(), text)
    model.value = started.state
    void sendPayload(started.payload, started.token)
  } catch { status.value = `Enter a question of up to ${TALK_QUESTION_MAX} characters.` }
}

function retry(): void {
  if (busy.value || !connected.value) return
  try {
    const pending = retryTalkRequest(model.value)
    void sendPayload(pending.payload, pending.token)
  } catch { status.value = 'There is no question waiting to retry.' }
}
</script>

<template>
  <section v-if="storyEnabled" class="talk-card" aria-labelledby="story-talk-title">
    <header class="talk-head">
      <div><small>At this venue</small><h4 id="story-talk-title">City conversations</h4></div>
      <BaseButton v-if="!opened" small :disabled="!connected" :reason="connected ? null : 'Reconnect to load city conversations.'" @click="openCard">See who is here</BaseButton>
      <BaseButton v-else small :disabled="loading || busy" @click="refreshCard">Refresh</BaseButton>
    </header>

    <template v-if="opened">
      <p v-if="loading && !view" role="status">Loading city conversations…</p>
      <template v-else-if="activeView">
        <div class="talk-place">
          <strong>{{ activeView.venue.name }}</strong>
          <span>{{ activeView.venue.status }}</span>
        </div>

        <div v-if="activeView.regulars.length" class="talk-regulars" role="group" aria-label="People available to talk">
          <button v-for="regular in activeView.regulars" :key="regular.id" type="button" :aria-pressed="selectedNpc === regular.id" :disabled="busy" @click="selectedNpc = regular.id">
            <span><b>{{ regular.name }}</b><AiTag :who="{ agent: true }" /></span>
            <small>{{ regular.role }}</small>
          </button>
        </div>
        <p v-else class="talk-muted">No city regular is available at this venue.</p>

        <template v-if="selected">
          <div v-if="turns.length" class="talk-thread" aria-label="Conversation">
            <article v-for="turn in turns" :key="turn.id">
              <p class="is-player"><b>You</b><span>{{ turn.question }}</span></p>
              <p class="is-npc"><b>{{ selected.name }} <AiTag :who="{ agent: true }" /></b><span>{{ turn.reply }}</span></p>
              <p v-if="turn.phrase" class="talk-phrase"><b>Beta phrase · {{ turn.phrase.lang }}</b><span :lang="turn.phrase.lang">{{ turn.phrase.text }}</span><small>{{ turn.phrase.gloss }}</small></p>
            </article>
          </div>

          <div class="talk-quick" role="group" aria-label="Quick questions">
            <BaseButton small :disabled="busy || Boolean(model.retry) || !activeView.available" @click="ask('Hello')">Hello</BaseButton>
            <BaseButton small :disabled="busy || Boolean(model.retry) || !activeView.available" @click="ask('What are the opening hours?')">Opening hours</BaseButton>
            <BaseButton small :disabled="busy || Boolean(model.retry) || !activeView.available" @click="ask('Can you give me directions?')">Directions</BaseButton>
          </div>

          <form class="talk-form" @submit.prevent="ask()">
            <label for="story-talk-question">Ask {{ selected.name }}</label>
            <textarea id="story-talk-question" v-model="question" rows="2" :maxlength="TALK_QUESTION_MAX" :disabled="busy || Boolean(model.retry) || !activeView.available" placeholder="Ask about this venue or city" />
            <div><small>{{ question.length }} / {{ TALK_QUESTION_MAX }}</small><BaseButton type="submit" variant="primary" small :disabled="!canTalk">{{ busy ? 'Waiting…' : 'Ask' }}</BaseButton></div>
          </form>
        </template>

        <p v-if="!activeView.available && activeView.reason" class="talk-muted">{{ activeView.reason }}</p>
      </template>
      <p v-else-if="view && !view.enabled" class="talk-muted">{{ view.reason }}</p>

      <p v-if="gameNotice" class="talk-game-notice"><b>Game notice</b><span>{{ gameNotice }}</span></p>
      <p class="talk-status" role="status" aria-live="polite">{{ status }}</p>
      <div v-if="model.retry" class="talk-retry">
        <BaseButton :disabled="busy || !connected" @click="retry">Retry the same question</BaseButton>
        <span>Your question will be retried without sending it twice.</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.talk-card { display: grid; gap: 11px; min-width: 0; padding: 14px; border-radius: var(--r-md); background: #fff; box-shadow: var(--e-1),var(--ring); }
.talk-card h4,.talk-card p { margin: 0; }.talk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }.talk-head > div { min-width: 0; }.talk-head small { display: block; color: var(--c-muted); font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }.talk-head h4 { margin-top: 2px; font-size: 15px; overflow-wrap: anywhere; }
.talk-place { display: grid; gap: 2px; min-width: 0; padding: 9px 10px; border-radius: 10px; background: var(--c-green-soft); }.talk-place strong,.talk-place span { overflow-wrap: anywhere; }.talk-place strong { color: var(--c-green-dark); font-size: 13px; }.talk-place span { color: var(--c-muted); font-size: 11px; line-height: 1.35; }
.talk-regulars { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; }.talk-regulars button { min-width: 0; min-height: var(--tap,44px); padding: 9px; border: 1px solid var(--c-line); border-radius: 11px; background: var(--c-fill); color: var(--c-ink); text-align: left; cursor: pointer; }.talk-regulars button[aria-pressed="true"] { border-color: var(--c-green-dark); background: var(--c-green-soft); }.talk-regulars button:focus-visible,.talk-form textarea:focus-visible { outline: var(--focus); outline-offset: 2px; }.talk-regulars span,.talk-regulars b,.talk-regulars small { min-width: 0; overflow-wrap: anywhere; }.talk-regulars b,.talk-regulars small { display: block; }.talk-regulars b { font-size: 12px; }.talk-regulars small { margin-top: 3px; color: var(--c-muted); font-size: 10px; line-height: 1.3; }
.talk-thread { display: grid; gap: 8px; min-width: 0; }.talk-thread article { display: grid; gap: 5px; min-width: 0; }.talk-thread p { display: grid; gap: 2px; min-width: 0; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; word-break: break-word; }.talk-thread p b { font-size: 10px; }.talk-thread .is-player { margin-left: 20px; background: #eef3ff; }.talk-thread .is-npc { margin-right: 20px; background: var(--c-fill); }.talk-thread .talk-phrase { margin-right: 20px; border: 1px solid var(--c-line); background: #fff8df; }.talk-phrase b { color: var(--c-amber-dark); }.talk-phrase small { color: var(--c-muted); }
.talk-quick { display: flex; flex-wrap: wrap; gap: 6px; }.talk-form { display: grid; gap: 6px; min-width: 0; }.talk-form label { font-size: 11px; font-weight: 700; }.talk-form textarea { box-sizing: border-box; width: 100%; min-width: 0; max-width: 100%; resize: vertical; padding: 9px 10px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; color: var(--c-ink); font: 13px/1.4 var(--font); }.talk-form > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.talk-form small { color: var(--c-muted); font-size: 10px; }
.talk-muted,.talk-status { color: var(--c-muted); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }.talk-status { min-height: 1.4em; color: var(--c-green-dark); }.talk-game-notice { display: grid; gap: 2px; padding: 9px 10px; border-radius: 10px; background: var(--c-amber-soft); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }.talk-game-notice b { color: var(--c-amber-dark); font-size: 10px; text-transform: uppercase; }.talk-retry { display: grid; gap: 5px; }.talk-retry span { color: var(--c-muted); font-size: 10px; line-height: 1.35; overflow-wrap: anywhere; }
@container passport (max-width: 320px) { .talk-head { align-items: stretch; flex-direction: column; }.talk-head :deep(.base-button) { width: 100%; }.talk-regulars { grid-template-columns: 1fr; }.talk-thread .is-player,.talk-thread .is-npc,.talk-thread .talk-phrase { margin-inline: 0; }.talk-quick { display: grid; grid-template-columns: 1fr; }.talk-quick :deep(.base-button) { width: 100%; } }
</style>
