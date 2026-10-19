<script setup lang="ts">
// Your AI life (a lazy part of the AI agents app, AgentsOnlineApp.vue; docs/AI-RESIDENTS.md): your landlord, boss and rival in the city you are in
// (server/house/roles.ts), and this week's Spot the AI (server/house/spot.ts): tap the lines you think an AI character said, then see the answers with the
// AI-played label the game shows everywhere, and share a score card drawn here from the score alone. The server decides everything; all text is rendered as text.
import { computed, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import AiTag from '../social/AiTag.vue'
import type { AiRolesView, SpotResultView, SpotView } from '../../../types/agents-http.ts'
import { aiLifeWords, betterText, drawSpotCard, spotShareText } from './aiLifeModel.ts'

const { game } = useApp()
const lite = useAccountLite()
const city = computed(() => game.view.value.cityId)
const roles = ref<AiRolesView | null>(null)
const spot = ref<SpotView | null>(null)
const result = ref<SpotResultView | null>(null)
const picked = ref<Set<number>>(new Set())
const busy = ref(false)
const said = ref('')
const landlordSaid = ref('')
const reasonOf = (error: unknown): string => { const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined; return typeof reason === 'string' && reason ? reason : 'That did not work. Try again.' }
const post = <T,>(path: string, body: Record<string, unknown>): Promise<T> => game.fetchJson<T>(path, { method: 'POST', body: { ...body, csrf: lite.token() } })

async function loadRoles(): Promise<void> { try { roles.value = await game.fetchJson<AiRolesView>(`/api/agents/roles?city=${encodeURIComponent(city.value)}`) } catch { roles.value = null } }
async function loadSpot(): Promise<void> {
  try { spot.value = await game.fetchJson<SpotView>('/api/agents/spot'); if (spot.value.state === 'played') result.value = spot.value.played } catch { spot.value = null }
}
onMounted(() => { void loadRoles(); void loadSpot() })
watch(city, () => { void loadRoles() })

async function act(work: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true; said.value = ''
  try { await work() } catch (error) { said.value = reasonOf(error) } finally { busy.value = false }
}
const askLandlord = (what: 'time' | 'lower'): Promise<void> => act(async () => { const answer = await post<{ line: string }>('/api/agents/roles/ask', { city: city.value, what }); landlordSaid.value = answer.line; await loadRoles() })
const toggle = (n: number): void => { const next = new Set(picked.value); if (next.has(n)) next.delete(n); else next.add(n); picked.value = next }
const guess = (): Promise<void> => act(async () => { const answer = await post<{ result: SpotResultView }>('/api/agents/spot/guess', { ai: [...picked.value] }); result.value = answer.result })
const optIn = (on: boolean): Promise<void> => act(async () => { await post('/api/agents/spot/opt', { on }); await loadSpot() })

async function share(): Promise<void> {
  const r = result.value
  if (!r) return
  const text = spotShareText(r.s, r.of, location.origin)
  const canvas = document.createElement('canvas')
  let file: File | null = null
  if (drawSpotCard(canvas, r.s, r.of, betterText(r.better, r.players))) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) file = new File([blob], 'spot-the-ai.png', { type: 'image/png' })
  }
  try {
    if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ text, files: [file] }); return }
    if (navigator.share) { await navigator.share({ text }); return }
  } catch { return }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
</script>

<template>
  <div class="ai-life" data-ai-life>
    <section v-if="roles" class="ai-life-block" data-ai-roles>
      <h3 class="ui-section">Your life in {{ roles.cityName }}</h3>
      <p class="ai-life-note">{{ aiLifeWords.rolesIntro }}</p>
      <div v-for="card in roles.roles" :key="card.role" class="ai-life-card" :data-ai-role="card.role">
        <b>{{ aiLifeWords.roleLabel[card.role] }}: {{ card.name }}</b> <AiTag :who="{ agent: true }" />
        <p class="ai-life-line">“{{ card.line }}”</p>
        <div v-if="card.role === 'landlord' && roles.rent" class="ai-life-actions">
          <button v-if="roles.rent.canAskTime" type="button" class="ui-button" :disabled="busy" @click="askLandlord('time')">Ask for more time</button>
          <button type="button" class="ui-button" :disabled="busy" @click="askLandlord('lower')">Ask for a lower rent</button>
        </div>
        <p v-if="card.role === 'landlord' && landlordSaid" class="ai-life-line">“{{ landlordSaid }}”</p>
      </div>
    </section>

    <section class="ai-life-block" data-spot>
      <h3 class="ui-section">Spot the AI</h3>
      <p class="ai-life-note">{{ aiLifeWords.spotIntro }}</p>
      <template v-if="result">
        <p class="ai-life-score"><b>{{ result.s }} of {{ result.of }}</b> told right. {{ betterText(result.better, result.players) }}</p>
        <ol class="ai-life-rounds">
          <li v-for="(round, r) in result.rounds" :key="r">
            <ul><li v-for="line in round" :key="line.n" :class="{ 'is-ai': line.ai, 'is-wrong': line.picked !== line.ai && result.rounds.flat().some((x) => x.picked) }">“{{ line.text }}” <small>{{ line.label }}</small></li></ul>
          </li>
        </ol>
        <button type="button" class="ui-button is-primary" @click="share">Share my score</button>
      </template>
      <template v-else-if="spot?.state === 'open'">
        <ol class="ai-life-rounds">
          <li v-for="(round, r) in spot.rounds" :key="r">
            <button v-for="line in round" :key="line.n" type="button" class="ai-life-pick" :aria-pressed="picked.has(line.n)" @click="toggle(line.n)">“{{ line.text }}”<small>{{ picked.has(line.n) ? 'AI, I think' : 'A person?' }}</small></button>
          </li>
        </ol>
        <button type="button" class="ui-button is-primary" :disabled="busy" @click="guess">See the answers</button>
      </template>
      <p v-else-if="spot?.state === 'not_enough'" class="ai-life-note">Not enough lines this week yet. It needs people who let their lines be used: ask your friends, or come back later.</p>
      <template v-if="spot">
        <label v-if="spot.adult" class="ui-row settings-row"><span class="ui-row-body"><b>{{ aiLifeWords.spotOptIn }}</b><small>{{ aiLifeWords.spotOptHelp }}</small></span>
          <input type="checkbox" role="switch" :checked="spot.opted" :disabled="busy" :aria-label="aiLifeWords.spotOptIn" @change="optIn(($event.target as HTMLInputElement).checked)"><i class="ui-switch" aria-hidden="true" /></label>
        <p v-else class="ai-life-note">{{ aiLifeWords.spotAdults }}</p>
      </template>
    </section>
    <p v-if="said" class="ui-error" role="alert">{{ said }}</p>
  </div>
</template>

<style scoped>
.ai-life { display: grid; gap: 12px; }
.ai-life-block { display: grid; gap: 6px; }
.ai-life-note { margin: 0 4px; font-size: 12px; line-height: 1.45; color: var(--c-muted); }
.ai-life-card { display: grid; gap: 4px; padding: 10px; border-radius: 12px; background: var(--c-surface-2, rgba(0, 0, 0, .05)); }
.ai-life-line { margin: 0; font-style: italic; }
.ai-life-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.ai-life-score { margin: 0; }
.ai-life-rounds { margin: 0; padding-left: 18px; display: grid; gap: 10px; }
.ai-life-rounds ul { margin: 0; padding-left: 14px; display: grid; gap: 4px; }
.ai-life-rounds li.is-ai { color: #4338ca; }
.ai-life-rounds li.is-wrong { text-decoration: underline wavy #b91c1c; }
.ai-life-rounds small { display: block; font-size: 11px; color: var(--c-muted); }
.ai-life-pick { display: grid; gap: 2px; width: 100%; margin: 3px 0; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; font: inherit; text-align: left; cursor: pointer; }
.ai-life-pick[aria-pressed='true'] { border-color: #4338ca; background: #eef2ff; }
.ai-life-pick:focus-visible { outline: var(--focus); outline-offset: 2px; }
</style>
