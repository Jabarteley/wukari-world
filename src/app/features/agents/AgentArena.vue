<script setup lang="ts">
// "Cups and challenges" inside Settings, AI agents (lazy: its own chunk, loaded only from AgentAccess.vue for a person with agent characters).
// The person enters one of their agents in this week's cups, makes a challenge link and shares its card, and sees badges and prizes.
// The server decides everything (docs/AGENT-ARENA.md); this only asks and tells.
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import type { AgentArenaView, ArenaRefusal } from '../../../types/agent-arena.ts'

const { game } = useApp()
const lite = useAccountLite()
const view = ref<AgentArenaView | null>(null)
const agent = ref('')
const pick = ref('')
const busy = ref(false)
const said = ref('')
const card = ref('')
const copied = ref(false)

const naira = (n: number): string => `₦${n.toLocaleString('en-NG')}`
const reasonOf = (error: unknown): string => { const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined; return typeof reason === 'string' && reason ? reason : 'That did not work. Try again.' }
const status = (s: string): string => ({ open: 'Waiting for another agent', playing: 'Being played', done: 'Decided', expired: 'Ran out' } as Record<string, string>)[s] ?? s
const cups = computed(() => view.value?.cups ?? [])
async function load(): Promise<void> {
  try {
    const got = await game.fetchJson<AgentArenaView>('/api/agents/arena')
    view.value = got
    if (!agent.value || !got.agents.some((a) => a.id === agent.value)) agent.value = got.agents[0]?.id ?? ''
    if (!pick.value) pick.value = got.kinds[0] ? `${got.kinds[0].kind}:${got.kinds[0].key}` : ''
  } catch { said.value = 'Cups and challenges could not be loaded.' }
}
async function send<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  if (busy.value) return null
  busy.value = true; said.value = ''
  try {
    const out = await game.fetchJson<T | ArenaRefusal>(path, { method: 'POST', body: { ...body, agent: agent.value, csrf: lite.token() } })
    if ((out as ArenaRefusal).ok === false) { said.value = (out as ArenaRefusal).reason; return null }
    return out as T
  } catch (error) { said.value = reasonOf(error); return null } finally { busy.value = false }
}
async function enter(cup: string, leave: boolean): Promise<void> { if (await send('/api/agents/arena/enter', { cup, leave })) await load() }
async function challenge(): Promise<void> {
  const [kind, key] = pick.value.split(':')
  const out = await send<{ card: string }>('/api/agents/arena/challenge', { kind, key })
  if (out) { card.value = out.card; copied.value = false; await load() }
}
async function share(): Promise<void> {
  const text = 'Is your AI agent better than mine? Take my challenge on Allworld.'
  try { if (navigator.share) { await navigator.share({ text, url: card.value }); return } } catch { /* the person closed the sheet */ }
  try { await navigator.clipboard.writeText(`${text} ${card.value}`); copied.value = true } catch { said.value = 'Copy did not work here: select the link and copy it yourself.' }
}
onMounted(() => { void load() })
</script>

<template>
  <section class="agent-arena" data-agent-arena>
    <h4 class="ui-section">Cups and challenges</h4>
    <p class="settings-note">Your agents can play weekly cups and challenges against other people's agents. Prizes are game money; nothing is ever staked.</p>
    <template v-if="view && view.agents.length">
      <label v-if="view.agents.length > 1" class="ui-row"><span class="ui-row-body"><b>Agent</b><select v-model="agent" class="ui-input" aria-label="Agent"><option v-for="a in view.agents" :key="a.id" :value="a.id">{{ a.name }}</option></select></span></label>
      <div class="ui-rows">
        <div v-for="cup in cups" :key="cup.id" class="ui-row" :data-arena-cup="cup.key">
          <span class="ui-row-body"><b>{{ cup.label }}</b><small>{{ cup.entries }} in · {{ cup.open ? 'open' : cup.status === 'running' ? 'playing' : cup.status === 'settled' ? 'decided' : 'closed' }}</small></span>
          <a v-if="cup.entries" class="ui-button" :href="`/agents/cup/${cup.id}`" target="_blank" rel="noopener">See</a>
          <button v-if="cup.open && !cup.mine.includes(agent)" type="button" class="ui-button" :disabled="busy" @click="enter(cup.key, false)">Enter</button>
          <button v-else-if="cup.open" type="button" class="ui-button" :disabled="busy" @click="enter(cup.key, true)">Leave</button>
        </div>
      </div>
      <label class="ui-row"><span class="ui-row-body"><b>Challenge</b><select v-model="pick" class="ui-input" aria-label="Challenge"><option v-for="k in view.kinds" :key="`${k.kind}:${k.key}`" :value="`${k.kind}:${k.key}`">{{ k.kind === 'life' ? `${k.label} (7 days)` : k.label }}</option></select></span></label>
      <button type="button" class="ui-button is-primary" :disabled="busy" data-arena-challenge @click="challenge">Make a challenge</button>
      <p class="settings-note">{{ view.limits.challengesPerDay }} a day. Another person's agent takes it with its key; the result is a card with both names.</p>
      <p v-if="card" class="settings-note" data-arena-card><a :href="card" target="_blank" rel="noopener">{{ card }}</a> <button type="button" class="ui-button" @click="share">{{ copied ? 'Copied' : 'Share' }}</button></p>
      <div v-if="view.challenges.length" class="ui-rows">
        <div v-for="c in view.challenges" :key="c.code" class="ui-row">
          <span class="ui-row-body"><b>{{ c.label }}: {{ c.from.name }} (AI){{ c.to ? ` v ${c.to.name} (AI)` : '' }}</b><small>{{ c.result?.text ?? status(c.status) }}</small></span>
          <a class="ui-button" :href="c.card" target="_blank" rel="noopener">Card</a>
        </div>
      </div>
      <div v-if="view.badges.length" class="ui-rows">
        <div v-for="b in view.badges" :key="`${b.card}:${b.agent}`" class="ui-row"><span class="ui-row-body"><b>{{ b.rank === 1 ? 'Winner' : b.rank === 2 ? 'Second' : 'Third' }}: {{ b.label }}</b><small>{{ b.agent }} (AI), week {{ b.week }}</small></span><a class="ui-button" :href="b.card" target="_blank" rel="noopener">Card</a></div>
      </div>
      <p v-for="p in view.prizes" :key="p.label + p.agent" class="settings-note">{{ p.agent }} (AI): {{ naira(p.amount) }} in game money, {{ p.label }}{{ p.paid ? '' : ' (on its way)' }}</p>
    </template>
    <p v-else-if="view" class="settings-note">Give an agent a character of its own above to enter cups and challenges.</p>
    <p v-if="said" class="ui-error" role="alert">{{ said }}</p>
  </section>
</template>

<style scoped>
.agent-arena { display: grid; gap: 8px; }
</style>
