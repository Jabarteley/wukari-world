<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, shallowRef } from 'vue'
import type { StoryHelpKind } from '../../../types/story.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import AiTag from '../social/AiTag.vue'
import { HELP_KINDS, canPlayTable, expiryLabel, sessionPeer, turnLabel } from './coopModel.ts'
import type { HelpSessionView, StoryHelpResult, StoryHelpView } from './coopModel.ts'
import { storyHelpFocus } from './storyUi.ts'

type PendingWrite = { path: string; body: Record<string, unknown>; refreshLife: boolean; success: string }

const { game, shell } = useApp()
const view = ref<StoryHelpView | null>(null)
const loading = ref(false)
const busy = ref(false)
const notice = ref('')
const selectedFriend = ref('')
const selectedKind = ref<StoryHelpKind>('second-answer')
const picked = reactive(new Map<string, number[]>())
const retry = shallowRef<PendingWrite | null>(null)
const challengeVenue = computed(() => game.view.value.travel.destinations.find(row => row.id === view.value?.challenge?.venue)?.label ?? 'the country tale venue')
let focusApplied = false

const sessions = computed(() => {
  const focus = storyHelpFocus.value
  if (!focus || !view.value) return view.value?.sessions ?? []
  return [...view.value.sessions].sort((a, b) => Number(b.id === focus) - Number(a.id === focus))
})

function errorText(error: unknown): string {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined
  if (status === 401) return 'Sign in again to continue helping.'
  if (status === 429) return 'Too many requests. Wait a moment, then retry the same action.'
  return 'The result could not be confirmed. Retry the same action.'
}

async function load(): Promise<void> {
  if (loading.value) return
  loading.value = true
  try {
    const next = await game.fetchJson<StoryHelpView>('/api/story/help')
    view.value = next
    if (!next.friends.some((friend) => friend.id === selectedFriend.value)) selectedFriend.value = next.friends[0]?.id ?? ''
    if (!focusApplied && storyHelpFocus.value && next.sessions.some((session) => session.id === storyHelpFocus.value)) {
      focusApplied = true
      await nextTick()
      document.getElementById(`story-help-${storyHelpFocus.value}`)?.focus()
    }
  } catch (error) {
    notice.value = errorText(error)
  } finally { loading.value = false }
}

async function sendPending(): Promise<void> {
  const pending = retry.value
  if (!pending || busy.value) return
  busy.value = true
  notice.value = ''
  try {
    const result = await game.fetchJson<StoryHelpResult>(pending.path, { method: 'POST', body: pending.body })
    retry.value = null
    if (!result.ok) { notice.value = result.reason ?? 'That help action was refused.'; await load(); return }
    if (pending.refreshLife) await game.refresh()
    notice.value = pending.success
    await load()
  } catch (error) {
    notice.value = errorText(error)
  } finally { busy.value = false }
}

function write(path: string, body: Record<string, unknown>, success: string, refreshLife = true): void {
  if (busy.value || retry.value) return
  retry.value = { path, body: { clientId: game.newId(), ...body }, refreshLife, success }
  void sendPending()
}

function invite(): void {
  const challenge = view.value?.challenge
  if (!challenge?.canCall || !selectedFriend.value) return
  write('/api/story/help', { to: selectedFriend.value, kind: selectedKind.value, episodeId: challenge.episodeId, chapter: 3 }, 'Invitation sent.', false)
}

function join(session: HelpSessionView): void {
  write('/api/story/help/join', { id: session.id }, `Joined ${session.host.name}'s Roots challenge.`)
}

function answer(session: HelpSessionView, answer: string): void {
  write('/api/story/help/answer', { id: session.id, answer }, 'Answer checked.')
}

function toggleCard(session: HelpSessionView, index: number): void {
  if (!canPlayTable(session) || session.table?.cards[index] !== null || busy.value || retry.value) return
  const current = picked.get(session.id) ?? []
  const next = current.includes(index) ? current.filter((value) => value !== index) : current.length < 2 ? [...current, index] : current
  picked.set(session.id, next)
}

function playCards(session: HelpSessionView): void {
  const cards = picked.get(session.id) ?? []
  if (cards.length !== 2 || !canPlayTable(session)) return
  picked.delete(session.id)
  write('/api/story/help/seat', { id: session.id, cards }, 'Cards checked.')
}

function restartTable(session: HelpSessionView): void {
  picked.delete(session.id)
  write('/api/story/help/seat', { id: session.id, restart: true }, 'A new memory round started.')
}

function turnInErrand(session: HelpSessionView): void {
  const rewardId = session.errand?.rewardId
  if (rewardId) write('/api/story/help/errand', { id: session.id, rewardId }, 'Verified errand turned in.')
}

function end(session: HelpSessionView): void {
  write('/api/story/help/end', { id: session.id }, 'Help session ended.')
}

onMounted(load)
</script>

<template>
  <section class="coop-card" aria-labelledby="coop-title">
    <header><div><small>Roots challenge</small><h4 id="coop-title">Help a friend</h4></div><strong v-if="view">{{ view.remainingCalls }} call{{ view.remainingCalls === 1 ? '' : 's' }} left today</strong></header>
    <p class="coop-intro">Invite one friend for a short challenge, or finish the longer solo path.</p>
    <p v-if="loading && !view" role="status">Loading your help sessions…</p>
    <template v-else-if="view?.enabled">
      <section v-if="view.challenge" class="coop-call" aria-labelledby="coop-call-title">
        <h5 id="coop-call-title">Start from {{ challengeVenue }}</h5>
        <template v-if="view.friends.length">
          <label>Friend
            <select v-model="selectedFriend" :disabled="busy || Boolean(retry)">
              <option v-for="friend in view.friends" :key="friend.id" :value="friend.id">{{ friend.name }}{{ friend.agent ? ' · AI-played' : '' }}</option>
            </select>
          </label>
          <label>Challenge
            <select v-model="selectedKind" :disabled="busy || Boolean(retry)">
              <option v-for="kind in HELP_KINDS" :key="kind.id" :value="kind.id">{{ kind.label }}</option>
            </select>
          </label>
          <p class="coop-kind-note">{{ HELP_KINDS.find((kind) => kind.id === selectedKind)?.description }}</p>
          <BaseButton variant="primary" block :disabled="busy || Boolean(retry) || !view.challenge.canCall" :reason="view.challenge.canCall ? null : view.challenge.reason" @click="invite">Call this friend</BaseButton>
        </template>
        <p v-else class="coop-solo">No friends are available yet. You can finish Roots solo with six local missions, then two more local missions.</p>
        <p v-if="!view.challenge.canCall && view.challenge.reason" class="coop-why">{{ view.challenge.reason }}</p>
      </section>

      <section v-if="sessions.length" class="coop-sessions" aria-label="Help sessions">
        <article v-for="session in sessions" :id="`story-help-${session.id}`" :key="session.id" tabindex="-1" :class="{ 'is-focused': session.id === storyHelpFocus }" :aria-labelledby="`help-${session.id}`">
          <div class="coop-session-head">
            <div><small>{{ session.cityName }} · {{ session.label }}</small><h5 :id="`help-${session.id}`">{{ sessionPeer(session).name }} <AiTag :who="sessionPeer(session)" /></h5></div>
            <span>{{ session.status }} · {{ expiryLabel(session.expiresAt, game.serverNow()) }}</span>
          </div>
          <p v-if="session.status === 'offered' && session.role === 'helper'">{{ session.host.name }} invited you to help with a Roots challenge at {{ session.venue }}.</p>
          <BaseButton v-if="session.status === 'offered' && session.role === 'helper'" variant="primary" block :disabled="busy || Boolean(retry)" @click="join(session)">Join {{ session.host.name }}</BaseButton>
          <p v-else-if="session.status === 'offered'">Waiting for {{ session.helper.name }} to join.</p>

          <section v-if="session.status === 'active' && session.question" class="coop-question" :aria-labelledby="`question-${session.id}`">
            <h6 :id="`question-${session.id}`">{{ session.question.prompt }}</h6>
            <div class="coop-options" role="group" :aria-label="session.question.prompt">
              <button v-for="option in session.question.options" :key="option.id" type="button" :disabled="busy || Boolean(retry) || session.question.answered" @click="answer(session, option.id)">{{ option.label }}</button>
            </div>
            <p v-if="session.question.answered">Your answer is saved. Waiting for the other answer.</p>
          </section>

          <section v-if="session.status === 'active' && session.table" class="coop-table" :aria-labelledby="`table-${session.id}`">
            <h6 :id="`table-${session.id}`">Two-seat memory</h6>
            <p>Team {{ session.table.team }} · House {{ session.table.house }} · You played {{ session.table.played[session.role] }} turn{{ session.table.played[session.role] === 1 ? '' : 's' }}</p>
            <p role="status">{{ turnLabel(session) }}</p>
            <div class="coop-cards" role="group" aria-label="Eight memory cards">
              <button v-for="(card, index) in session.table.cards" :key="index" type="button" :aria-pressed="(picked.get(session.id) ?? []).includes(index)" :disabled="!canPlayTable(session) || card !== null || busy || Boolean(retry)" :aria-label="card === null ? `Card ${index + 1}` : `Card ${index + 1}, ${card}`" @click="toggleCard(session, index)">{{ card === null ? '?' : card }}</button>
            </div>
            <BaseButton v-if="session.table.result === 'playing'" block :disabled="(picked.get(session.id) ?? []).length !== 2 || busy || Boolean(retry)" @click="playCards(session)">Play selected pair</BaseButton>
            <BaseButton v-else block :disabled="busy || Boolean(retry)" @click="restartTable(session)">Restart together</BaseButton>
          </section>

          <section v-if="session.status === 'active' && session.errand" class="coop-errand" :aria-labelledby="`errand-${session.id}`">
            <h6 :id="`errand-${session.id}`">Shared errand</h6><p>{{ session.errand.mission }}</p>
            <div><BaseButton @click="shell.open('missions')">Open Missions</BaseButton><BaseButton v-if="session.errand.rewardId" :disabled="busy || Boolean(retry)" @click="turnInErrand(session)">Turn in verified mission</BaseButton></div>
            <p v-if="!session.errand.rewardId">Finish the mission, then refresh this card. The server will offer its saved reward when it qualifies.</p>
          </section>

          <p v-if="session.status === 'completed'" class="coop-done">Roots challenge complete. Both players keep the result.</p>
          <BaseButton v-if="session.status === 'offered' || session.status === 'active'" small :disabled="busy || Boolean(retry)" @click="end(session)">End this session</BaseButton>
        </article>
      </section>
      <p v-else>No current invitations or help sessions.</p>
    </template>
    <p v-else-if="view && !view.enabled">Friend help is unavailable right now.</p>
    <p class="coop-notice" role="status" aria-live="polite">{{ notice }}</p>
    <div class="coop-actions"><BaseButton v-if="retry" :disabled="busy" @click="sendPending">Retry the same action</BaseButton><BaseButton :disabled="loading || busy" @click="load">Refresh co-op</BaseButton></div>
  </section>
</template>

<style scoped>
.coop-card { display: grid; gap: 10px; min-width: 0; padding: 14px; border-radius: var(--r-md); background: #fff; box-shadow: var(--e-1),var(--ring); }
.coop-card header,.coop-session-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px 12px; min-width: 0; }.coop-card header div,.coop-session-head div { min-width: 0; }.coop-card h4,.coop-card h5,.coop-card h6,.coop-card p { margin: 0; overflow-wrap: anywhere; }.coop-card h4 { font-size: 15px; }.coop-card h5 { margin-top: 2px; font-size: 14px; }.coop-card h6 { font-size: 13px; }.coop-card header small,.coop-session-head small { color: var(--c-muted); font-size: 10px; }.coop-card header strong,.coop-session-head > span { flex: none; color: var(--c-green-dark); font-size: 10px; text-align: right; text-transform: capitalize; }
.coop-intro,.coop-card article > p,.coop-question p,.coop-table p,.coop-errand p { color: var(--c-ink-2); font-size: 12px; line-height: 1.45; }
.coop-call,.coop-question,.coop-table,.coop-errand { display: grid; gap: 8px; min-width: 0; padding: 11px; border-radius: 12px; background: var(--c-fill); }.coop-call { grid-template-columns: repeat(2,minmax(0,1fr)); }.coop-call h5,.coop-kind-note,.coop-call :deep(.base-button),.coop-solo,.coop-why { grid-column: 1/-1; }.coop-call label { display: grid; gap: 4px; min-width: 0; color: var(--c-muted); font-size: 11px; font-weight: 650; }.coop-call select { width: 100%; min-width: 0; min-height: var(--tap,44px); padding: 7px 9px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; color: var(--c-ink); font: 600 12px var(--font); }.coop-kind-note,.coop-solo,.coop-why { font-size: 11px; line-height: 1.4; }.coop-why { color: var(--c-red-dark); }
.coop-sessions { display: grid; gap: 9px; }.coop-sessions article { display: grid; gap: 9px; min-width: 0; padding: 11px; border: 1px solid var(--c-line); border-radius: 12px; }.coop-sessions article.is-focused,.coop-sessions article:focus-visible { border-color: var(--c-green-dark); box-shadow: 0 0 0 2px var(--c-green-soft); outline: 0; }
.coop-options { display: grid; gap: 6px; }.coop-options button { min-height: var(--tap,44px); padding: 8px 10px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; color: var(--c-ink); font: 600 12px/1.35 var(--font); text-align: left; cursor: pointer; }.coop-options button:disabled { cursor: default; opacity: .65; }
.coop-cards { display: grid; grid-template-columns: repeat(4,minmax(44px,1fr)); gap: 6px; }.coop-cards button { min-width: 44px; min-height: 48px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; color: var(--c-ink); font: 750 15px var(--font); cursor: pointer; }.coop-cards button[aria-pressed="true"] { border-color: var(--c-green-dark); background: var(--c-green-soft); }.coop-cards button:disabled { cursor: default; opacity: .7; }
.coop-errand > div,.coop-actions { display: flex; flex-wrap: wrap; gap: 7px; }.coop-done { padding: 8px 10px; border-radius: 10px; background: var(--c-green-soft); color: var(--c-green-dark)!important; font-weight: 650; }.coop-notice { min-height: 1.4em; color: var(--c-green-dark); font-size: 12px; line-height: 1.4; }.coop-actions { justify-content: flex-end; }
@container passport (max-width: 300px) { .coop-call { grid-template-columns: 1fr; }.coop-call h5,.coop-kind-note,.coop-call :deep(.base-button),.coop-solo,.coop-why { grid-column: 1; }.coop-card header,.coop-session-head { display: grid; }.coop-card header strong,.coop-session-head > span { text-align: left; }.coop-cards { grid-template-columns: repeat(4,minmax(44px,1fr)); overflow-x: auto; } }
</style>
