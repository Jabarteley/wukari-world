<script setup lang="ts">
// "An assistant asks to play for you": the card that answers a web assistant's sign-in (ChatGPT, Claude: docs/AGENTS.md). Lazy: its own chunk,
// shown at the top of Settings only while this tab holds a request (oauthEntry.ts). The server decides everything: whether the request is valid,
// who may connect an assistant, what it may do. This only shows the question and sends the answer; the person is then sent back to the assistant.
import { onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import { openLogin, openSignup } from '../account/accountOpen.ts'
import { OAUTH_REQUEST_KEY } from './oauthKey.ts'
import type { OAuthPreview } from '../../../types/agents-http.ts'

const emit = defineEmits<{ done: [] }>()
const { game, shell } = useApp()
const lite = useAccountLite()
const request = ref('')
const preview = ref<OAuthPreview | null>(null)
const problem = ref('')
const busy = ref(false)
const mode = ref<'own' | 'agent'>('own')
const character = ref('')
const characterName = ref('')

const words = (error: unknown): string => {
  const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined
  return typeof reason === 'string' && reason ? reason : error instanceof Error && error.message ? error.message : 'That did not work. Try again.'
}
async function load(): Promise<void> {
  problem.value = ''
  try { preview.value = await game.fetchJson<OAuthPreview>(`/api/agents/oauth/authorize?request=${encodeURIComponent(request.value)}`) } catch (error) { preview.value = null; problem.value = words(error) }
}
function forget(): void {
  try { sessionStorage.removeItem(OAUTH_REQUEST_KEY) } catch { /* nothing kept */ }
  emit('done')
}
async function answer(approve: boolean): Promise<void> {
  if (busy.value) return
  busy.value = true; problem.value = ''
  try {
    const sent = await game.fetchJson<{ redirect: string }>('/api/agents/oauth/authorize', { method: 'POST', body: { request: request.value, approve, mode: mode.value, ...(mode.value === 'agent' && character.value ? { character: character.value } : {}), ...(mode.value === 'agent' && !character.value ? { characterName: characterName.value } : {}), csrf: lite.token() } })
    forget()
    location.assign(sent.redirect)
  } catch (error) { problem.value = words(error); busy.value = false }
}
onMounted(() => {
  try { request.value = sessionStorage.getItem(OAUTH_REQUEST_KEY) ?? '' } catch { request.value = '' }
  if (!request.value) { emit('done'); return }
  void lite.load()
  void load()
})
// Signing up or in (the sheet the buttons below open) changes who the server sees: ask again once it has.
watch(() => lite.state.account?.email ?? '', () => { if (request.value) void load() })
</script>

<template>
  <section class="oauth-card" data-oauth-approval aria-live="polite">
    <template v-if="preview">
      <h3 class="ui-section">{{ preview.app }} asks to play for you</h3>
      <ul class="oauth-list">
        <li>It would play Allworld through your account, by the same rules and limits as you: walk, work, earn, talk, trade and play games.</li>
        <li>Everyone can see an AI plays: its character is always shown as AI-played.</li>
        <li>It can never ask people for money, personal details or to meet outside the game. The game refuses it.</li>
        <li>It cannot reach your password, your e-mail or your settings, or make keys.</li>
        <li>You can end it at any time: Settings, AI agents, Revoke.</li>
      </ul>
      <p class="settings-note" data-oauth-goes-to>{{ preview.local ? `If you agree you go back to an app on this computer (${preview.goesTo}).` : `If you answer you go back to ${preview.goesTo}.` }} {{ preview.app }} is the name the assistant gave itself.</p>
      <p v-if="preview.switchedOff" class="ui-error" role="alert">AI agent access is switched off for now.</p>
      <template v-else-if="!preview.signedIn">
        <p class="settings-note" data-oauth-guest>Sign up for a free account, or log in, to let an assistant play. Guests cannot. Your answer waits here.</p>
        <button type="button" class="ui-button is-primary" data-oauth-signup @click="openSignup(shell, 'settings', game.view.value.connected)">Sign up free</button>
        <button type="button" class="ui-button" data-oauth-login @click="openLogin(shell, 'settings')">Log in</button>
      </template>
      <template v-else>
        <fieldset class="oauth-mode">
          <legend>It plays</legend>
          <label><input v-model="mode" type="radio" value="own" :disabled="!preview.hasCharacter"> my character</label>
          <label><input v-model="mode" type="radio" value="agent"> a character of its own</label>
        </fieldset>
        <template v-if="mode === 'agent'">
          <label v-if="preview.characters.length" class="ui-row"><span class="ui-row-body"><b>Which one</b>
            <select v-model="character" class="ui-input" data-oauth-character><option value="">A new agent character</option><option v-for="item in preview.characters" :key="item.id" :value="item.id">{{ item.name }}</option></select></span></label>
          <label v-if="!character" class="ui-row"><span class="ui-row-body"><b>Name the new character</b><input v-model="characterName" class="ui-input" maxlength="24" minlength="3" placeholder="3 to 24 characters" data-oauth-name></span></label>
        </template>
        <button type="button" class="ui-button is-primary" :disabled="busy" data-oauth-approve @click="answer(true)">Allow</button>
        <button type="button" class="ui-button" :disabled="busy" data-oauth-refuse @click="answer(false)">Refuse</button>
      </template>
    </template>
    <p v-if="problem" class="ui-error" role="alert" data-oauth-problem>{{ problem }}</p>
    <button v-if="problem && !preview" type="button" class="ui-button" @click="forget">Close</button>
  </section>
</template>

<style scoped>
.oauth-card { display: grid; gap: 8px; padding: 12px; border-radius: 12px; background: var(--c-surface-2, rgba(0, 0, 0, .05)); }
.oauth-list { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
.oauth-mode { border: 0; padding: 0; display: grid; gap: 4px; }
.oauth-mode legend { font-weight: 700; margin-bottom: 4px; }
</style>
