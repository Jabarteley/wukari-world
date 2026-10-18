<script setup lang="ts">
// The card of a resident or a house agent (a tap on them in a place, or "View" in the AI agents list): who they are and where they stand now, and what a
// person can do with a person: write, call, go to them, keep them as a contact. Read from GET /api/agents/online?id= (server/agents/contact.ts).
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, ref, watch } from 'vue'
import type { OnlineAgent } from '../../../types/agents-http.ts'
import PlayerAvatar from '../social/PlayerAvatar.vue'
import { agentBook, flipContact, whereLine } from './agentContacts.ts'
import { callAgent, fetchAgents, goToAgent, openChat } from './agentMoves.ts'

const props = defineProps<{ id: string }>()
const agent = ref<OnlineAgent | null>(null)
const awake = ref(true)
const state = ref<'loading' | 'ready' | 'gone' | 'error'>('loading')
async function load(id: string): Promise<void> {
  state.value = 'loading'
  try {
    const answer = await fetchAgents({ id })
    if (id !== props.id) return
    agent.value = answer.agent ?? null; awake.value = answer.awake !== false
    state.value = agent.value ? 'ready' : 'gone'
  } catch { if (id === props.id) state.value = 'error' }
}
watch(() => props.id, (id) => { void load(id) }, { immediate: true })
const saved = computed(() => agentBook.contacts.some((c) => c.id === props.id))
const status = computed(() => (!agent.value ? '' : agent.value.venue ? whereLine(agent.value) : awake.value ? `In ${agent.value.cityName}, between places` : `Asleep now · ${agent.value.cityName}`))
</script>

<template>
  <section class="agent-actions" data-agent-actions>
    <p v-if="state === 'loading'" class="social-note">Finding them…</p>
    <p v-else-if="state === 'error'" class="social-note is-warn">This could not be loaded. <button type="button" class="social-btn" @click="load(id)">Retry</button></p>
    <p v-else-if="state === 'gone'" class="social-note">They are not around right now.</p>
    <template v-else-if="agent">
      <div class="social-head people-who"><PlayerAvatar :name="agent.name" :seed="agent.id" :status="agent.venue ? 'online' : undefined" /><h3>{{ agent.name }}<span class="agent-tag">AI</span></h3></div>
      <p class="social-note">{{ status }}</p>
      <div class="agent-actions-row">
        <button type="button" class="ui-button is-primary" data-agent-chat @click="openChat(agent)">Chat</button>
        <button type="button" class="ui-button" data-agent-call :disabled="!awake" :title="awake ? `Call ${agent.name}` : 'Asleep now'" @click="callAgent(agent)">Call</button>
        <button type="button" class="ui-button" data-agent-go :disabled="!agent.venue" :title="agent.venue ? `Go to ${agent.place}` : 'Not standing anywhere just now'" @click="goToAgent(agent)">Go to them</button>
        <button type="button" class="ui-button" data-agent-save @click="flipContact(agent)">{{ saved ? 'In contacts ✓' : 'Add to contacts' }}</button>
      </div>
      <p class="social-note">An AI plays {{ agent.name.split(' ')[0] }}. Calls use your daily minutes for AI characters.</p>
    </template>
  </section>
</template>

<style scoped>
.agent-actions { display: grid; gap: 8px; margin-bottom: 12px; }
.agent-actions-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.agent-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #4338ca; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.5; vertical-align: middle; }
</style>
