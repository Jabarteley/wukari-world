<script setup lang="ts">
// A chat with a resident or a house agent ('agent-chat', params { id, name, city? }), drawn as a Messages conversation: the same header (back, avatar,
// name and presence, Call, options), the same bubbles with the day labels and times, the same message box (messages/Composer.vue). The lines are kept
// on this phone (agentContacts.ts); each new one goes to POST /api/agents/talk with the last few, and the answer comes back as text. A line on its way
// shows at once as "Sending…", then is kept, or says "Not sent" with a Retry. The game's own words (asleep, help lines, "are you an AI?") are shown as
// quiet centred lines, apart from the agent's.
import '../../../ui/controls.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { formatClock } from '../../../game/clock.ts'
import type { OnlineAgent } from '../../../types/agents-http.ts'
import GameIcon from '../../ui/GameIcon.vue'
import RowMark from '../../ui/RowMark.vue'
import BaseButton from '../../ui/BaseButton.vue'
import Composer from '../messages/Composer.vue'
import { agentBook, chatRows, flipContact, forgetChat, historyOf, noteLine, whereLine } from './agentContacts.ts'
import type { Outgoing } from './agentContacts.ts'
import { callAgent, fetchAgents, goToAgent, talkTo, viewAgent } from './agentMoves.ts'

const props = defineProps<{ params?: unknown }>()
const { game, shell } = useApp()
const who = computed(() => {
  const p = (props.params ?? {}) as { id?: unknown; name?: unknown; city?: unknown }
  return typeof p.id === 'string' && typeof p.name === 'string' ? { id: p.id, name: p.name, city: typeof p.city === 'string' ? p.city : '' } : null
})
const first = computed(() => who.value?.name.split(' ')[0] ?? '')
const chat = computed(() => (who.value ? agentBook.chats[who.value.id] : undefined))
const saved = computed(() => Boolean(who.value && agentBook.contacts.some((c) => c.id === who.value!.id)))
const meId = computed(() => game.session.value?.id ?? 'me')
const live = ref<OnlineAgent | null>(null)
const awake = ref(true)
/** The server has been asked where they are (so "not out now" is a fact, not a screen still loading). */
const looked = ref(false)
const outgoing = ref<Outgoing[]>([])
const sending = computed(() => outgoing.value.some((out) => out.status === 'sending'))
const menu = ref(false)
const thread = ref<HTMLElement | null>(null)
const composer = ref<InstanceType<typeof Composer> | null>(null)
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
let refresh: ReturnType<typeof setInterval> | undefined

async function where(): Promise<void> {
  const agent = who.value
  if (!agent) return
  try { const answer = await fetchAgents({ id: agent.id }); if (who.value?.id === agent.id) { live.value = answer.agent ?? null; awake.value = answer.awake !== false; looked.value = true } } catch { /* the chat works without it */ }
}
onMounted(() => {
  void where()
  clock = setInterval(() => { now.value = Date.now() }, 30000)
  refresh = setInterval(() => { if (document.visibilityState === 'visible') void where() }, 45000)
  void nextTick(() => composer.value?.focus())
})
onBeforeUnmount(() => { clearInterval(clock); clearInterval(refresh) })
watch(() => who.value?.id, () => { live.value = null; looked.value = false; outgoing.value = []; menu.value = false; void where() })

const rows = computed(() => chatRows(chat.value?.lines ?? [], outgoing.value, now.value))
const time = (at: number): string => formatClock(at).split('· ')[1] ?? ''
const toLatest = (): void => { void nextTick(() => { const box = thread.value; if (box) box.scrollTop = box.scrollHeight }) }
watch(() => rows.value.length, toLatest, { immediate: true })
watch(sending, toLatest)

/** The agent as the chat knows them now: where they stand, else what the chat was opened with. */
const target = computed(() => (who.value ? { id: who.value.id, name: live.value?.name ?? who.value.name, city: live.value?.city ?? who.value.city } : null))
const presence = computed<{ text: string; on: boolean } | null>(() => {
  // A house agent off duty, or a resident the server does not know: written to, they answer when they can.
  if (!live.value) return looked.value ? { text: who.value?.id.startsWith('house.') ? 'Not out now · answers when back' : 'Not out now', on: false } : null
  if (live.value.venue) return { text: `Online now · ${whereLine(live.value)}`, on: true }
  return awake.value ? { text: `Online now · ${live.value.cityName}`, on: true } : { text: `Asleep now · ${live.value.cityName}`, on: false }
})

let pumping = false, ids = 0
function send(body: string): void {
  const text = body.trim().slice(0, 300)
  if (!text || !who.value) return
  outgoing.value = [...outgoing.value, { id: `o${ids += 1}`, text, status: 'sending' }]
  void pump()
}
/** The lines on their way go one at a time, in order, so each answer follows the one before. */
async function pump(): Promise<void> {
  if (pumping) return
  pumping = true
  try {
    for (;;) {
      const agent = target.value, next = outgoing.value.find((out) => out.status === 'sending')
      if (!agent || !next) break
      const result = await talkTo(agent.id, next.text, historyOf(chat.value))
      if (target.value?.id !== agent.id) break
      if (!result.ok) { outgoing.value = outgoing.value.map((out) => (out.id === next.id ? { ...out, status: 'failed', reason: result.reason } : out)); continue }
      const at = Date.now()
      outgoing.value = outgoing.value.filter((out) => out.id !== next.id)
      noteLine(agent, { me: true, text: next.text, at })
      const answer = result.answer
      noteLine({ ...agent, name: answer.name || agent.name }, { me: false, text: answer.text, at: at + 1, ...(answer.help || answer.game || answer.asleep ? { note: true as const } : {}) })
      if (answer.asleep) awake.value = false
    }
  } finally { pumping = false }
}
function retry(id: string): void { outgoing.value = outgoing.value.map((out) => (out.id === id ? { id: out.id, text: out.text, status: 'sending' } : out)); void pump() }
function discard(id: string): void { outgoing.value = outgoing.value.filter((out) => out.id !== id) }

function back(): void { shell.open('ai-agents') }
function closeMenu(): void { menu.value = false }
function clearChat(): void { if (who.value) forgetChat(who.value.id); closeMenu() }
function keys(event: KeyboardEvent): void { if (event.key === 'Escape' && menu.value) { event.preventDefault(); event.stopPropagation(); closeMenu() } }
</script>

<template>
  <div v-if="who && target" class="agent-chat panel-fill" :data-agent-chat="who.id" @keydown="keys">
    <header class="messages-head">
      <button class="messages-back" type="button" aria-label="Back to AI agents" @click="back"><GameIcon name="back" :size="22" /></button>
      <span class="agent-avatar" :class="{ 'is-online': presence?.on }"><RowMark :name="target.name" :seed="who.id" /></span>
      <h3>
        <button type="button" class="messages-name" :aria-label="`${target.name}: open their card`" @click="viewAgent(target)">{{ target.name }}</button>
        <small :class="presence ? `messages-presence is-${presence.on ? 'online' : 'offline'}` : undefined">{{ presence?.text ?? 'AI character' }}</small>
      </h3>
      <span class="ai-tag" title="An AI plays this character">AI</span>
      <button type="button" class="ui-button is-small" data-agent-call :disabled="!awake" :title="awake ? `Call ${target.name}` : 'Not out now'" :aria-label="`Call ${target.name}${awake ? '' : '. Not out now'}`" @click="callAgent(target)">Call</button>
      <button type="button" class="messages-kebab" aria-label="Chat options" aria-haspopup="menu" :aria-expanded="menu" @click="menu = !menu">⋯</button>
    </header>
    <template v-if="menu">
      <div class="agent-menu-scrim" @click="closeMenu" />
      <section class="agent-menu" role="menu" aria-label="Chat options">
        <button type="button" role="menuitem" data-agent-go :disabled="!live?.venue" @click="live && goToAgent(live); closeMenu()">Go to them<small v-if="live?.place">{{ live.place }}</small><small v-else-if="live && !live.venue">Not in a place now</small></button>
        <button type="button" role="menuitem" data-agent-view @click="viewAgent(target); closeMenu()">Their card</button>
        <button type="button" role="menuitem" data-agent-save @click="flipContact(target); closeMenu()">{{ saved ? 'Remove from contacts' : 'Add to contacts' }}</button>
        <button v-if="chat?.lines.length" type="button" role="menuitem" class="is-danger" data-agent-clear @click="clearChat">Clear this chat</button>
        <p>An AI plays {{ first }}. This chat stays on this phone; the last few lines go with each message so {{ first }} can follow.</p>
      </section>
    </template>

    <div class="messages-body">
      <div ref="thread" class="messages-thread" aria-live="polite">
        <div v-if="!rows.length" class="bubble is-sys">Say hello to {{ first }}. An AI plays them; what you write here stays on this phone.</div>
        <template v-for="row in rows" :key="row.key">
          <div v-if="row.kind === 'day'" class="messages-day" role="separator"><span>{{ row.label }}</span></div>
          <div v-else-if="row.kind === 'line' && row.line.note" class="bubble is-sys">{{ row.line.text }}</div>
          <div v-else-if="row.kind === 'line'" class="bubble" :class="{ 'is-mine': row.line.me }">
            <span class="bubble-text">{{ row.line.text }}</span>
            <small v-if="row.tail">{{ time(row.line.at) }}<template v-if="row.line.me"> <span class="bubble-tick" aria-hidden="true">✓</span><span class="sr-only"> Sent</span></template></small>
          </div>
          <div v-else class="bubble is-mine" :class="row.out.status === 'failed' ? 'is-failed' : 'is-pending'">
            <span class="bubble-text">{{ row.out.text }}</span>
            <small>{{ row.out.status === 'failed' ? `Not sent · ${row.out.reason}` : 'Sending…' }}</small>
            <span v-if="row.out.status === 'failed'" class="bubble-actions">
              <BaseButton small variant="primary" @click="retry(row.out.id)">Retry</BaseButton>
              <BaseButton small @click="discard(row.out.id)">Delete</BaseButton>
            </span>
          </div>
        </template>
        <div v-if="sending" class="bubble is-typing" role="status" :aria-label="`${first} is writing`"><i /><i /><i /></div>
      </div>
    </div>
    <footer class="messages-foot">
      <Composer ref="composer" :conv="`agent:${who.id}`" :members="[]" :me-id="meId" :admin="false" :max="300" :disabled="false" :reply="null" prefill="" :pictures="false" :target="{ to: who.id }" :new-id="() => game.newId()" @send="send" @attach="menu = true" />
    </footer>
  </div>
  <p v-else class="ui-error">Nobody selected.</p>
</template>

<style scoped>
/* The same rules as a Messages conversation (messages/MessagesApp.vue), so the two read as one app. */
.agent-chat { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; }
.messages-head { flex: none; display: flex; align-items: center; gap: 10px; padding: 8px 12px 8px 6px; background: #fff; border-bottom: 1px solid var(--c-line); }
.messages-head h3 { flex: 1; min-width: 0; margin: 0 !important; font-size: 15px !important; color: var(--c-ink); white-space: nowrap; }
.messages-head h3 small { display: block; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-weight: 500; color: var(--c-muted); }
.messages-head :deep(.ui-button) { min-height: var(--tap); }
.messages-back { flex: none; display: grid; place-items: center; width: var(--tap); height: var(--tap); border: 0; border-radius: 50%; background: none; color: var(--c-ink); cursor: pointer; }
.messages-name { position: relative; display: block; max-width: 100%; padding: 0; border: 0; background: none; font: inherit; color: inherit; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.messages-name::after { content: ''; position: absolute; inset: -10px -8px -22px; }
.messages-presence { font-weight: 700; color: var(--c-muted); }
.messages-presence::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; background: currentColor; vertical-align: 1px; }
.messages-presence.is-online { color: var(--c-green-dark); }
.messages-kebab { flex: none; min-width: var(--tap); min-height: var(--tap); border: 0; border-radius: 50%; background: none; font-size: 20px; cursor: pointer; }
.agent-avatar { position: relative; display: inline-grid; }
.agent-avatar.is-online::after { content: ''; position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border: 2px solid #fff; border-radius: 50%; background: var(--c-green-dark); }
.ai-tag { flex: none; padding: 1px 6px; border-radius: 999px; background: #4338ca; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.5; letter-spacing: .02em; }
.messages-body { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.messages-thread { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 120px; overflow-y: auto; padding: 12px; overscroll-behavior: contain; }
.messages-day { align-self: center; margin: 6px 0 2px; }
.messages-day span { padding: 3px 12px; border-radius: 12px; background: var(--c-fill-2); color: var(--c-muted); font-size: 11px; font-weight: 600; }
.bubble { align-self: flex-start; max-width: 80%; box-sizing: border-box; padding: 8px 12px 6px; border-radius: 18px 18px 18px 5px; background: #fff; box-shadow: var(--ring); font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; }
.bubble small { display: block; margin-top: 2px; font-size: 10px; color: var(--c-muted); text-align: right; }
.bubble.is-mine { align-self: flex-end; border-radius: 18px 18px 5px 18px; background: var(--app-tint, var(--c-green-dark)); color: #fff; box-shadow: none; }
.bubble.is-mine small { color: #ffffffcc; }
.bubble-tick { margin-left: 3px; font-weight: 700; }
.bubble.is-pending { opacity: .6; }
.bubble.is-failed { background: var(--c-red-soft); color: var(--c-ink); box-shadow: inset 0 0 0 1.5px #e3a995; }
.bubble.is-failed small { color: var(--c-red-dark); font-weight: 700; font-size: 11px; }
.bubble.is-sys { align-self: center; max-width: 92%; padding: 2px; background: none; box-shadow: none; color: var(--c-muted); font-size: 11px; text-align: center; white-space: normal; }
.bubble-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; margin-top: 6px; }
.bubble.is-typing { display: flex; gap: 4px; align-items: center; min-height: 34px; padding: 10px 14px; }
.bubble.is-typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--c-muted); animation: agent-dot 1.2s ease-in-out infinite; }
.bubble.is-typing i:nth-child(2) { animation-delay: .2s; }
.bubble.is-typing i:nth-child(3) { animation-delay: .4s; }
@keyframes agent-dot { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .bubble.is-typing i { animation: none; opacity: .6; } }
@media (max-width: 540px) { .bubble { max-width: 86%; } }
.messages-foot { flex: none; padding: 8px 10px calc(14px + env(safe-area-inset-bottom, 0px)); background: #fff; border-top: 1px solid var(--c-line); }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
/* The options menu, as in Messages (messages/ChatMenu.vue): over the thread, closed by a choice, a tap outside or Escape. */
.agent-menu-scrim { position: absolute; inset: 62px 0 0; z-index: 4; }
.agent-menu { position: absolute; z-index: 5; top: 62px; right: 8px; display: grid; width: min(300px, calc(100% - 16px)); padding: 6px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; box-shadow: var(--e-2, var(--e-1)); }
.agent-menu button { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; padding: 0 12px; border: 0; border-radius: 10px; background: none; font: 600 14px var(--font); text-align: left; color: inherit; cursor: pointer; touch-action: manipulation; }
.agent-menu button:hover { background: var(--c-fill-2); }
.agent-menu button:focus-visible { outline: var(--focus); outline-offset: -2px; }
.agent-menu button:disabled { opacity: .5; cursor: not-allowed; }
.agent-menu button.is-danger { color: var(--c-red-dark); }
.agent-menu small { font-size: 12px; font-weight: 600; color: var(--c-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-menu p { margin: 2px 12px 8px; font-size: 12px; line-height: 1.4; color: var(--c-muted); }
@media (max-height: 560px) { .messages-head { padding-top: 2px; padding-bottom: 2px; } .messages-thread { min-height: 48px; } }
</style>
