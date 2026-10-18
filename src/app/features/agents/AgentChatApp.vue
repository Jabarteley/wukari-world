<script setup lang="ts">
// A chat with a resident or a house agent ('agent-chat', params { id, name, city }): the lines kept on this phone (agentContacts.ts), a box to write,
// and Call and Go to them in the header. Each line goes to POST /api/agents/talk with the last few lines, and the answer comes back as text.
// The game's own words (asleep, help lines, "are you an AI?") are shown as notes, apart from the agent's.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { OnlineAgent } from '../../../types/agents-http.ts'
import PlayerAvatar from '../social/PlayerAvatar.vue'
import { agentBook, flipContact, historyOf, noteLine, whereLine } from './agentContacts.ts'
import { callAgent, fetchAgents, goToAgent, talkTo } from './agentMoves.ts'

const props = defineProps<{ params?: unknown }>()
const who = computed(() => {
  const p = (props.params ?? {}) as { id?: unknown; name?: unknown; city?: unknown }
  return typeof p.id === 'string' && typeof p.name === 'string' ? { id: p.id, name: p.name, city: typeof p.city === 'string' ? p.city : '' } : null
})
const chat = computed(() => (who.value ? agentBook.chats[who.value.id] : undefined))
const saved = computed(() => Boolean(who.value && agentBook.contacts.some((c) => c.id === who.value!.id)))
const live = ref<OnlineAgent | null>(null)
const awake = ref(true)
const text = ref('')
const busy = ref(false)
const failed = ref('')
const list = ref<HTMLElement | null>(null)

async function where(): Promise<void> {
  if (!who.value) return
  try { const answer = await fetchAgents({ id: who.value.id }); live.value = answer.agent ?? null; awake.value = answer.awake !== false } catch { live.value = null }
}
onMounted(() => { void where() })
watch(() => who.value?.id, () => { live.value = null; void where() })
const scrollDown = (): void => { void nextTick(() => { const el = list.value; if (el) el.scrollTop = el.scrollHeight }) }
watch(() => chat.value?.lines.length, scrollDown, { immediate: true })

async function send(): Promise<void> {
  const body = text.value.trim(), agent = who.value
  if (!body || busy.value || !agent) return
  const history = historyOf(chat.value)
  busy.value = true; failed.value = ''
  noteLine(agent, { me: true, text: body.slice(0, 300), at: Date.now() })
  text.value = ''
  const result = await talkTo(agent.id, body, history)
  busy.value = false
  if (!result.ok) { failed.value = result.reason; return }
  const answer = result.answer
  noteLine({ ...agent, name: answer.name || agent.name }, { me: false, text: answer.text, at: Date.now(), ...(answer.help || answer.game || answer.asleep ? { note: true as const } : {}) })
  if (answer.asleep) awake.value = false
}
const line = computed(() => (live.value ? (live.value.venue ? whereLine(live.value) : awake.value ? `In ${live.value.cityName}` : `Asleep now · ${live.value.cityName}`) : ''))
</script>

<template>
  <section v-if="who" class="agent-chat" :data-agent-chat="who.id">
    <header class="agent-chat-head">
      <PlayerAvatar :name="who.name" :seed="who.id" :status="live?.venue ? 'online' : undefined" />
      <div class="agent-chat-who"><strong>{{ who.name }}<span class="agent-tag">AI</span></strong><small>{{ line || 'AI character' }}</small></div>
    </header>
    <div class="agent-chat-tools">
      <button type="button" class="social-btn" data-agent-call :disabled="!awake" @click="callAgent(who)">Call</button>
      <button type="button" class="social-btn" data-agent-go :disabled="!live?.venue" @click="live && goToAgent(live)">Go to them</button>
      <button type="button" class="social-btn" data-agent-save @click="flipContact(who)">{{ saved ? 'In contacts ✓' : 'Add to contacts' }}</button>
    </div>
    <div ref="list" class="agent-chat-lines" role="log" aria-live="polite">
      <p v-if="!chat?.lines.length" class="social-note">Say hello to {{ who.name.split(' ')[0] }}. An AI plays them; what you write here stays on this phone.</p>
      <p v-for="(item, n) in chat?.lines ?? []" :key="n" class="agent-line" :class="{ 'is-me': item.me, 'is-note': item.note }">{{ item.text }}</p>
      <p v-if="busy" class="agent-line is-typing">{{ who.name.split(' ')[0] }} is writing…</p>
    </div>
    <p v-if="failed" class="social-note is-warn" role="status">{{ failed }}</p>
    <form class="agent-chat-form" @submit.prevent="send">
      <input v-model="text" class="social-field" name="agent-line" maxlength="300" autocomplete="off" :placeholder="`Write to ${who.name.split(' ')[0]}`" :aria-label="`Write to ${who.name}`">
      <button type="submit" class="social-btn is-primary" :disabled="busy || !text.trim()">Send</button>
    </form>
  </section>
  <p v-else class="ui-error">Nobody selected.</p>
</template>

<style scoped>
.agent-chat { display: grid; gap: 8px; min-height: 0; }
.agent-chat-head { display: flex; align-items: center; gap: 10px; }
.agent-chat-who { display: grid; min-width: 0; }
.agent-chat-who strong { font-size: 16px; }
.agent-chat-who small { color: var(--c-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-chat-tools { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-chat-lines { display: flex; flex-direction: column; gap: 6px; max-height: min(52vh, 460px); min-height: 160px; overflow-y: auto; padding: 8px; border-radius: var(--r-md, 12px); background: var(--c-fill, #f3f4f6); }
.agent-line { margin: 0; max-width: 82%; padding: 8px 12px; border-radius: 16px; background: #fff; color: var(--c-ink); font-size: 14px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; align-self: flex-start; }
.agent-line.is-me { align-self: flex-end; background: var(--c-green-dark, #166534); color: #fff; }
.agent-line.is-note { align-self: center; max-width: 92%; background: transparent; color: var(--c-muted); font-size: 12px; text-align: center; }
.agent-line.is-typing { color: var(--c-muted); font-style: italic; background: transparent; }
.agent-chat-form { display: flex; gap: 8px; }
.agent-chat-form input { flex: 1; min-width: 0; }
.agent-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #4338ca; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.5; vertical-align: middle; }
</style>
