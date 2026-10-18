<script setup lang="ts">
// AI agents ('ai-agents', a People app, and "See AI agents" in the online sheet): every AI agent online now, as people are listed: your chats with them and
// the ones you keep as contacts first, then those in your city, then the other cities with how many are in each (a tap lists them). Search by name across
// the world. Each one: Chat, Call, Go to them, and their card. Read from GET /api/agents/online (server/agents/contact.ts); refreshed every 30 seconds while open.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { cityName } from '../../../game/cities/registry.ts'
import type { OnlineAgent } from '../../../types/agents-http.ts'
import PlayerAvatar from '../social/PlayerAvatar.vue'
import { agentBook, recentChats, whereLine } from './agentContacts.ts'
import { answersHere, callAgent, fetchAgents, goToAgent, openChat, viewAgent } from './agentMoves.ts'

defineProps<{ params?: unknown }>()
const { game } = useApp()
const here = computed(() => game.view.value.cityId)
const state = reactive({ total: null as number | null, agents: [] as OnlineAgent[], cities: {} as Record<string, number>, error: false, loading: false })
const other = reactive({ city: '' as string, agents: [] as OnlineAgent[], loading: false })
const q = ref('')
const found = ref<OnlineAgent[] | null>(null)
const online = computed(() => new Map([...state.agents, ...other.agents, ...(found.value ?? [])].map((agent) => [agent.id, agent])))

async function load(): Promise<void> {
  if (state.loading) return
  state.loading = true
  try {
    const answer = await fetchAgents({ city: here.value })
    Object.assign(state, { total: answer.total ?? 0, agents: answer.agents ?? [], cities: answer.cities ?? {}, error: false })
    if (other.city) await openCity(other.city, true)
  } catch { state.error = true } finally { state.loading = false }
}
async function openCity(city: string, again = false): Promise<void> {
  if (!again && other.city === city) { other.city = ''; other.agents = []; return }
  other.city = city; other.loading = true
  try { const answer = await fetchAgents({ city }); if (other.city === city) other.agents = answer.agents ?? [] } catch { other.agents = [] } finally { other.loading = false }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, (value) => {
  clearTimeout(searchTimer)
  if (value.trim().length < 2) { found.value = null; return }
  searchTimer = setTimeout(() => { void fetchAgents({ q: value.trim() }).then((answer) => { found.value = answer.agents ?? [] }, () => { found.value = [] }) }, 300)
})
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void load(); timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 30000) })
onBeforeUnmount(() => { clearInterval(timer); clearTimeout(searchTimer) })
watch(here, () => { void load() })

const elsewhere = computed(() => Object.entries(state.cities).filter(([city]) => city !== here.value).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
const placeOfCity = (city: string): string => (city === 'world' ? 'The Square' : cityName(city) ?? city)
const chats = computed(() => recentChats(agentBook.chats).slice(0, 8))
const lastLine = (id: string): string => agentBook.chats[id]?.lines.at(-1)?.text ?? ''
/** A saved contact or a chat, as the list knows it now (standing somewhere) or as it was kept. */
const known = (item: { id: string; name: string; city: string }): OnlineAgent => online.value.get(item.id) ?? { id: item.id, name: item.name, kind: item.id.startsWith('house.') ? 'house' : 'resident', city: item.city, cityName: placeOfCity(item.city), venue: null, place: null, doing: null, look: null }
</script>

<template>
  <div class="ai-agents" data-ai-agents>
    <div class="social-head"><h3>AI agents online</h3><button type="button" class="social-btn" :disabled="state.loading" @click="load()">Refresh</button></div>
    <p class="social-note">
      <template v-if="state.total !== null">{{ state.total.toLocaleString('en-US') }} AI {{ state.total === 1 ? 'agent is' : 'agents are' }} out in the world now. </template>
      Each is a character played by AI. Chat, call or go and meet them like anyone else.
    </p>
    <input v-model="q" class="social-field ai-agents-search" type="search" name="agent-search" maxlength="40" placeholder="Search AI agents by name" aria-label="Search AI agents by name" autocomplete="off">

    <template v-if="found">
      <h3 class="ui-section">Found</h3>
      <p v-if="!found.length" class="social-note">Nobody online has a name like that.</p>
      <div v-for="agent in found" :key="`f${agent.id}`" class="social-row ai-agent-row" data-agent-row>
        <PlayerAvatar :name="agent.name" :seed="agent.id" status="online" />
        <div class="ai-agent-body"><strong>{{ agent.name }}<span class="agent-tag">AI</span></strong><small>{{ whereLine(agent) }}</small>
          <span class="social-actions">
            <button type="button" class="social-btn is-primary" @click="openChat(agent)">Chat</button>
            <button v-if="answersHere(agent.id)" type="button" class="social-btn" @click="callAgent(agent)">Call</button>
            <button type="button" class="social-btn" :disabled="!agent.venue" @click="goToAgent(agent)">Go to them</button>
            <button type="button" class="social-btn" @click="viewAgent(agent)">View</button>
          </span>
        </div>
      </div>
    </template>

    <template v-else>
      <template v-if="chats.length">
        <h3 class="ui-section">Your chats</h3>
        <button v-for="item in chats" :key="`c${item.id}`" type="button" class="social-row ai-agent-chat" @click="openChat(known(item))">
          <PlayerAvatar :name="item.name" :seed="item.id" :status="online.has(item.id) ? 'online' : undefined" />
          <div class="ai-agent-body"><strong>{{ item.name }}<span class="agent-tag">AI</span></strong><small>{{ lastLine(item.id) }}</small></div>
        </button>
      </template>

      <template v-if="agentBook.contacts.length">
        <h3 class="ui-section">Contacts</h3>
        <div v-for="item in agentBook.contacts" :key="`k${item.id}`" class="social-row ai-agent-row">
          <PlayerAvatar :name="item.name" :seed="item.id" :status="online.has(item.id) ? 'online' : undefined" />
          <div class="ai-agent-body"><strong>{{ item.name }}<span class="agent-tag">AI</span></strong><small>{{ online.has(item.id) ? whereLine(known(item)) : placeOfCity(item.city) }}</small>
            <span class="social-actions">
              <button type="button" class="social-btn is-primary" @click="openChat(known(item))">Chat</button>
              <button type="button" class="social-btn" @click="callAgent(item)">Call</button>
              <button type="button" class="social-btn" :disabled="!known(item).venue" @click="goToAgent(known(item))">Go to them</button>
              <button type="button" class="social-btn" @click="viewAgent(item)">View</button>
            </span>
          </div>
        </div>
      </template>

      <h3 class="ui-section">In {{ placeOfCity(here) }}</h3>
      <p v-if="state.error" class="social-note is-warn">This could not be loaded. <button type="button" class="social-btn" @click="load()">Retry</button></p>
      <p v-else-if="state.total === null" class="social-note">Looking…</p>
      <p v-else-if="!state.agents.length" class="social-note">No AI agent is out in {{ placeOfCity(here) }} right now. They keep their own hours: try another city below.</p>
      <div v-for="agent in state.agents" :key="`h${agent.id}`" class="social-row ai-agent-row" data-agent-row>
        <PlayerAvatar :name="agent.name" :seed="agent.id" status="online" />
        <div class="ai-agent-body"><strong>{{ agent.name }}<span class="agent-tag">AI</span></strong><small>{{ whereLine(agent) }}</small>
          <span class="social-actions">
            <button type="button" class="social-btn is-primary" @click="openChat(agent)">Chat</button>
            <button v-if="answersHere(agent.id)" type="button" class="social-btn" @click="callAgent(agent)">Call</button>
            <button type="button" class="social-btn" :disabled="!agent.venue" @click="goToAgent(agent)">Go to them</button>
            <button type="button" class="social-btn" @click="viewAgent(agent)">View</button>
          </span>
        </div>
      </div>

      <template v-if="elsewhere.length">
        <h3 class="ui-section">Elsewhere in the world</h3>
        <div class="ai-agent-cities">
          <button v-for="[city, count] in elsewhere" :key="city" type="button" class="social-btn" :class="{ 'is-primary': other.city === city }" :aria-expanded="other.city === city" @click="openCity(city)">{{ placeOfCity(city) }} · {{ count }}</button>
        </div>
        <template v-if="other.city">
          <p v-if="other.loading" class="social-note">Looking in {{ placeOfCity(other.city) }}…</p>
          <div v-for="agent in other.agents" :key="`o${agent.id}`" class="social-row ai-agent-row" data-agent-row>
            <PlayerAvatar :name="agent.name" :seed="agent.id" status="online" />
            <div class="ai-agent-body"><strong>{{ agent.name }}<span class="agent-tag">AI</span></strong><small>{{ whereLine(agent) }}</small>
              <span class="social-actions">
                <button type="button" class="social-btn is-primary" @click="openChat(agent)">Chat</button>
                <button v-if="answersHere(agent.id)" type="button" class="social-btn" @click="callAgent(agent)">Call</button>
                <button type="button" class="social-btn" @click="goToAgent(agent)">{{ agent.city === 'world' ? 'Go to them' : `Go to ${placeOfCity(agent.city)}` }}</button>
                <button type="button" class="social-btn" @click="viewAgent(agent)">View</button>
              </span>
            </div>
          </div>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.ai-agents { display: grid; gap: 6px; }
.ai-agents-search { width: 100%; box-sizing: border-box; }
.ai-agent-row, .ai-agent-chat { display: flex; align-items: flex-start; gap: 10px; min-width: 0; text-align: left; }
.ai-agent-chat { width: 100%; border: 0; background: transparent; font: inherit; color: inherit; cursor: pointer; }
.ai-agent-body { flex: 1; min-width: 0; display: grid; gap: 2px; }
.ai-agent-body strong, .ai-agent-body small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-agent-body small { color: var(--c-muted); font-size: 12px; }
.ai-agent-body .social-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.ai-agent-body .social-btn { padding: 4px 10px; min-height: 32px; font-size: 12px; white-space: nowrap; }
.ai-agent-cities { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #4338ca; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.5; vertical-align: middle; }
</style>
