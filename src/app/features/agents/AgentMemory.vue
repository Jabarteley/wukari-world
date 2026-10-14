<script setup lang="ts">
// What AI characters (the game's own house agents) remember about you, and how close you are: on each character's card you see the facts, delete one or all,
// turn remembering off for that character, and, if you are 18 or older and close enough, make it your partner or end that. A switch at the top turns remembering
// off for every character (and deletes what is stored). Shown in Settings and as its own page; lazy (its own chunk). The server decides everything
// (server/house/memory-routes.ts); this only asks and tells. All text is rendered as text. Nobody else, and no AI agent, can read any of this.
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import AiTag from '../social/AiTag.vue'
import ClosenessMeter from '../social/ClosenessMeter.vue'
import { memoryWords } from './memoryModel.ts'
import type { AgentMemoryView } from '../../../types/agents-http.ts'

const props = defineProps<{ params?: unknown; agent?: string }>()
const { game } = useApp()
const lite = useAccountLite()
const view = ref<AgentMemoryView | null>(null)
const failed = ref(false)
const busy = ref(false)
const said = ref('')
const only = computed(() => props.agent ?? ((props.params ?? {}) as { agent?: unknown }).agent)
const cards = computed(() => (view.value?.agents ?? []).filter((card) => typeof only.value !== 'string' || card.id === only.value))
const words = (error: unknown): string => {
  const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined
  return typeof reason === 'string' && reason ? reason : error instanceof Error && error.message ? error.message : 'That did not work. Try again.'
}
async function load(): Promise<void> {
  try { view.value = await game.fetchJson<AgentMemoryView>('/api/agents/memory'); failed.value = false } catch { failed.value = true }
}
const post = (path: string, body: Record<string, unknown>): Promise<unknown> => game.fetchJson(path, { method: 'POST', body: { ...body, csrf: lite.token() } })
async function run(work: () => Promise<unknown>): Promise<void> {
  if (busy.value) return
  busy.value = true; said.value = ''
  try { await work(); await load() } catch (error) { said.value = words(error) } finally { busy.value = false }
}
const forgetFact = (agent: string, fact: string): Promise<void> => run(() => post('/api/agents/memory/forget', { agent, fact }))
const forgetAgent = (agent: string): Promise<void> => run(() => post('/api/agents/memory/forget', { agent }))
const forgetEveryone = (): Promise<void> => run(() => post('/api/agents/memory/forget', {}))
const remember = (agent: string | undefined, on: boolean): Promise<void> => run(() => post('/api/agents/memory/remember', agent ? { agent, on } : { on }))
const partner = (agent: string, on: boolean): Promise<void> => run(() => post('/api/agents/memory/partner', { agent, on }))
const meterMax = (card: { standing: { next: { at: number } | null } }): number => card.standing.next?.at ?? 100
onMounted(() => { void load() })
</script>

<template>
  <div class="agent-memory" data-agent-memory>
    <h3 v-if="typeof only !== 'string'" class="ui-section">What AI characters remember</h3>
    <p v-if="typeof only !== 'string'" class="settings-note">{{ memoryWords.explainer }}</p>
    <p v-if="failed" class="settings-note">This could not be loaded. <button type="button" class="ui-button" @click="load">Try again</button></p>
    <template v-else-if="view">
      <label v-if="typeof only !== 'string'" class="ui-row settings-row" data-memory-global><span class="ui-row-body"><b>Let AI characters remember me</b><small>{{ view.remembering ? memoryWords.globalOn : memoryWords.globalOff }}</small></span>
        <span class="settings-state">{{ view.remembering ? 'On' : 'Off' }}</span><input type="checkbox" role="switch" :checked="view.remembering" :disabled="busy" aria-label="Let AI characters remember me" @change="remember(undefined, ($event.target as HTMLInputElement).checked)"><i class="ui-switch" aria-hidden="true" /></label>
      <p v-if="!cards.length" class="settings-note" data-memory-empty>{{ memoryWords.empty }}</p>
      <section v-for="card in cards" :key="card.id" class="memory-card" :data-agent-card="card.id">
        <h4 class="memory-name">{{ card.name }}<AiTag :who="{ agent: true }" /></h4>
        <p class="settings-note"><b>{{ card.standing.label }}</b><template v-if="card.standing.next"> · next: {{ card.standing.next.label }} at {{ card.standing.next.at }}</template></p>
        <ClosenessMeter :points="card.standing.points" :max="meterMax(card)" :label="`Closeness with ${card.name}`" />
        <template v-if="card.remembering">
          <ul v-if="card.facts.length" class="memory-facts">
            <li v-for="fact in card.facts" :key="fact" data-memory-fact><span>{{ fact }}</span> <button type="button" class="ui-button" :disabled="busy" :aria-label="`Delete: ${fact}`" @click="forgetFact(card.id, fact)">Delete</button></li>
          </ul>
          <p v-else class="settings-note">{{ card.name }} has not kept anything about you yet.</p>
        </template>
        <p v-else class="settings-note" data-memory-off>{{ card.name }} is not remembering you. Nothing is kept.</p>
        <div class="memory-actions">
          <button type="button" class="ui-button" :disabled="busy" data-memory-toggle @click="remember(card.id, !card.remembering)">{{ card.remembering ? 'Stop remembering me' : 'Remember me again' }}</button>
          <button type="button" class="ui-button" :disabled="busy" data-memory-forget @click="forgetAgent(card.id)">Forget me completely</button>
        </div>
        <template v-if="card.partner">
          <p class="settings-note" data-memory-partner>{{ card.name }} is your partner. It is warm and kind; it never flirts and nothing here is romantic or sexual. You can end this any time.</p>
          <button type="button" class="ui-button" :disabled="busy" data-memory-end @click="partner(card.id, false)">End partnership</button>
        </template>
        <template v-else>
          <button v-if="card.canPartner" type="button" class="ui-button" :disabled="busy" data-memory-make @click="partner(card.id, true)">Make {{ card.name }} my partner</button>
          <p v-else class="settings-note" data-memory-why>{{ memoryWords.partnerWhy(view.adult, card.standing.points, view.partnerAt) }}</p>
        </template>
      </section>
      <button v-if="typeof only !== 'string' && cards.length" type="button" class="ui-button" :disabled="busy" data-memory-forget-all @click="forgetEveryone">Delete everything AI characters know about me</button>
    </template>
    <p v-if="said" class="ui-error" role="alert">{{ said }}</p>
  </div>
</template>

<style scoped>
.agent-memory { display: grid; gap: 8px; }
.memory-card { display: grid; gap: 6px; padding: 10px; border-radius: 12px; background: var(--c-surface-2, rgba(0, 0, 0, .05)); }
.memory-name { margin: 0; }
.memory-facts { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
.memory-actions { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
