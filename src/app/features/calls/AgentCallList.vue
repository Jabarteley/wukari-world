<script setup lang="ts">
// Settings -> AI characters: call one of the AI characters standing in a place now, see the minutes left today, and choose how your voice becomes words. Lazy with AgentMemory.vue.
// The choice is kept on this phone only ('auto' follows the server's default, which is the winner of the measurements in docs/CALLS.md).
import { onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import AiTag from '../social/AiTag.vue'
import { startAgentCall } from './agentCallState.ts'
import { STT_WORDS } from './agentCallWords.ts'
import { STT_KEY, readChoice } from './stt.ts'
import type { SttChoice } from './stt.ts'

interface Config { enabled: boolean; stt: { default: 'browser' | 'gateway'; gateway: boolean }; minutes: { player: number; left: number; total: number }; cast: { id: string; name: string; role: string; city: string }[] }
const { game, shell } = useApp()
const config = ref<Config | null>(null)
const failed = ref(false)
const read = (): SttChoice => { try { return readChoice(localStorage.getItem(STT_KEY)) } catch { return 'auto' } }
const choice = ref<SttChoice>(read())
function choose(event: Event): void { choice.value = readChoice((event.target as HTMLSelectElement).value); try { localStorage.setItem(STT_KEY, choice.value) } catch { /* it is not kept */ } }
function call(who: { id: string; name: string }): void { startAgentCall(who.id, who.name); shell.close() }
onMounted(async () => { try { config.value = await game.fetchJson<Config>('/api/agents/call/config') } catch { failed.value = true } })
</script>

<template>
  <div class="agent-call-list" data-agent-call-list>
    <h3 class="ui-section">Call an AI character</h3>
    <p v-if="failed" class="settings-note">This could not be loaded.</p>
    <template v-else-if="config">
      <p v-if="!config.enabled" class="settings-note">Calls with AI characters are off for now. You can still write to them.</p>
      <template v-else>
        <p class="settings-note">Hold a button to talk, let go to hear the answer. An AI plays every one of them, and its voice is made on your phone. {{ config.minutes.left }} of {{ config.minutes.player }} minutes left today.</p>
        <ul v-if="config.cast.length" class="agent-call-cast">
          <li v-for="who in config.cast" :key="who.id" data-agent-call-cast><span>{{ who.name }}<AiTag :who="{ agent: true }" /></span> <button type="button" class="ui-button" :disabled="config.minutes.left <= 0" :aria-label="`Call ${who.name}`" @click="call(who)">Call</button></li>
        </ul>
        <p v-else class="settings-note">Nobody is standing in a place right now. They are there in the day.</p>
        <label class="ui-row settings-row"><span class="ui-row-body"><b>How your voice becomes words</b><small>{{ choice === 'gateway' ? STT_WORDS.gateway : choice === 'browser' ? STT_WORDS.browser : 'Automatic uses the way that did best in our tests and the other one where the first is missing.' }}</small></span>
          <select :value="choice" aria-label="How your voice becomes words" data-agent-call-default @change="choose"><option value="auto">Automatic</option><option value="browser">My browser’s own</option><option v-if="config.stt.gateway" value="gateway">Allworld’s service</option></select></label>
      </template>
    </template>
  </div>
</template>

<style scoped>
.agent-call-list { display: grid; gap: 8px; }
.agent-call-cast { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.agent-call-cast li { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
</style>
