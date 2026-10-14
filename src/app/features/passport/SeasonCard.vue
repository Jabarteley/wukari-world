<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RetentionHttpRoutes, RetentionView } from '../../../types/cadence.ts'
import type { SeasonView } from '../../../types/season.ts'
import type { TimedId } from '../../../types/protocol.ts'
import { JOURNEYS } from '../../../game/content/journeys.ts'
import type { ApiError } from '../../types/client.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import GameIcon from '../../ui/GameIcon.vue'

type SeasonResponse = RetentionHttpRoutes['POST /api/retention/season']['response']
type SeasonIntent = { op: 'join' } | { op: 'claim' } | { op: 'reminder'; reminder: string | null }
interface RetentionController { state: { view: RetentionView | null }; load(force?: boolean): Promise<void> }
interface HeldSeason { scope: string; intent: SeasonIntent; actionId: TimedId }

const props = defineProps<{ retention: RetentionController }>()
const emit = defineEmits<{ openStory: []; openProject: [] }>()
const { game } = useApp()
const season = computed(() => props.retention.state.view?.season ?? null)
const pending = ref<SeasonIntent['op'] | null>(null)
const error = ref('')
const retry = ref<SeasonIntent | null>(null)
const selectedReminder = ref<string>('')
let loadedScope = ''
let scopeEpoch = 0
let held: HeldSeason | null = null
const date = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
const scope = () => `${game.session.value?.id ?? 'guest'}:${game.view.value.cityId}:${season.value?.id ?? 'none'}`
const sameIntent = (left: SeasonIntent, right: SeasonIntent): boolean => left.op === right.op && (left.op !== 'reminder' || (right.op === 'reminder' && left.reminder === right.reminder))
const isCurrent = (requestScope: string, requestEpoch: number): boolean => scope() === requestScope && loadedScope === requestScope && scopeEpoch === requestEpoch
const plan = computed(() => season.value?.reminderOptions.find(item => item.id === season.value?.reminder) ?? null)
const memberSources = new Map(JOURNEYS.flatMap(collection => collection.members.map(member => [member.id, member.source.kind] as const)))
const planKind = computed(() => plan.value ? memberSources.get(plan.value.id) ?? null : null)
const joinedProgress = computed(() => season.value ? Number(season.value.played) + Math.min(season.value.keepsakes, season.value.target) : 0)
const reminderChanged = computed(() => Boolean(season.value && selectedReminder.value !== (season.value.reminder ?? '')))
const actionReason = computed(() => game.connected.value ? '' : 'Reconnect to change this season record.')

function reset(nextScope: string): void {
  if (loadedScope === nextScope) return
  loadedScope = nextScope
  scopeEpoch += 1
  pending.value = null
  error.value = ''
  retry.value = null
  held = null
}
function confirmed(intent: SeasonIntent, row: SeasonView | null): boolean {
  if (!row) return false
  if (intent.op === 'join') return row.joined
  if (intent.op === 'claim') return row.earnedAt !== null
  return row.reminder === intent.reminder
}
function problem(reason: unknown, ambiguous: string): string {
  const failure = reason as ApiError
  const known: Readonly<Record<string, string>> = {
    human_required: 'Only your own play can change this season record.',
    season_unavailable: 'This season is not available right now.',
    season_closed: 'This season is no longer open to join.',
    season_not_ready: 'This season step is not ready yet.',
    invalid_setting: 'Choose an unfinished keepsake for your plan.',
    invalid_city: 'Your current city could not be confirmed.',
  }
  return known[failure.code ?? ''] || failure.reason || (failure.status ? 'This change was not saved. Try again.' : ambiguous)
}
function successWords(intent: SeasonIntent): string {
  if (intent.op === 'join') return 'You joined A place at Akoka.'
  if (intent.op === 'claim') return `${season.value?.reward ?? 'Season ribbon'} added to your record.`
  return intent.reminder === null ? 'Your in-app plan was cleared.' : 'Your in-app plan was saved.'
}
async function send(intent: SeasonIntent): Promise<boolean> {
  const requestScope = scope()
  reset(requestScope)
  const requestEpoch = scopeEpoch
  if (!game.connected.value || pending.value !== null || !season.value) return false
  if (confirmed(intent, season.value)) {
    held = null
    retry.value = null
    error.value = ''
    game.toast(successWords(intent), 'good')
    return true
  }
  const request = held?.scope === requestScope && sameIntent(held.intent, intent)
    ? held
    : { scope: requestScope, intent, actionId: game.newId() as TimedId }
  held = request
  pending.value = intent.op
  error.value = ''
  retry.value = null
  let posted = false
  try {
    await game.fetchJson<SeasonResponse>('/api/retention/season', {
      method: 'POST',
      body: { cityId: game.view.value.cityId, actionId: request.actionId, ...intent },
    })
    posted = true
    if (!isCurrent(requestScope, requestEpoch)) return false
    await props.retention.load(true)
    if (!isCurrent(requestScope, requestEpoch)) return false
    if (!confirmed(intent, season.value)) {
      error.value = 'The change may be saved, but it could not be confirmed. Retry to check it.'
      retry.value = intent
      return false
    }
    held = null
    game.toast(successWords(intent), 'good')
    return true
  } catch (reason) {
    if (!isCurrent(requestScope, requestEpoch)) return false
    error.value = posted
      ? 'The change may be saved, but it could not be confirmed. Retry to check it.'
      : problem(reason, 'The answer did not arrive. Retry to confirm this change.')
    retry.value = intent
    return false
  } finally {
    if (isCurrent(requestScope, requestEpoch)) pending.value = null
  }
}
function saveReminder(): void { void send({ op: 'reminder', reminder: selectedReminder.value || null }) }
function when(at: number): string { return date.format(new Date(at)) }
function continuePlan(): void {
  if (planKind.value === 'episode') emit('openStory')
  else if (planKind.value === 'project') emit('openProject')
}

watch([() => game.session.value?.id, () => game.view.value.cityId, () => season.value?.id], () => reset(scope()), { immediate: true })
watch(() => season.value?.reminder ?? '', value => { selectedReminder.value = value }, { immediate: true })
</script>

<template>
  <section v-if="season" class="season-card" :class="`is-${season.status}`" aria-labelledby="season-title">
    <aside v-if="plan" class="season-plan" aria-label="Your season plan">
      <div><GameIcon name="goal" :size="19" /><span><b>Your plan: {{ plan.title }}</b><small>This reminder appears only inside Allworld.</small></span></div>
      <BaseButton v-if="planKind" small @click="continuePlan">Continue</BaseButton>
    </aside>

    <header>
      <span aria-hidden="true"><GameIcon name="calendar" :size="22" /></span>
      <div><small>{{ season.status === 'ended' ? 'Archived first season' : 'First season' }}</small><h3 id="season-title">{{ season.title }}</h3><p>{{ when(season.startsAt) }}–{{ when(season.endsAt) }} · Lagos time (UTC+1)</p></div>
      <strong>{{ season.status === 'upcoming' ? 'Upcoming' : season.status === 'ended' ? 'Ended' : 'Open' }}</strong>
    </header>

    <template v-if="!season.joined">
      <p class="season-lead">A 28-day Akoka chapter with one meaningful day and any 2 of 4 permanent keepsakes. Earlier keepsakes count, and all Akoka season stories stay available when you join late.</p>
      <BaseButton v-if="season.status === 'open'" variant="primary" :disabled="Boolean(actionReason) || pending !== null" :reason="actionReason" @click="send({ op: 'join' })">{{ pending === 'join' ? 'Joining…' : 'Join this season' }}</BaseButton>
      <p v-else-if="season.status === 'upcoming'" class="season-note">Joining opens on the published start date.</p>
      <p v-else class="season-note">This season has ended. New players cannot join its archived run.</p>
    </template>

    <template v-else>
      <div class="season-progress" role="group" aria-label="Season progress">
        <div :class="{ done: season.played }"><GameIcon :name="season.played ? 'good' : 'calendar'" :size="17" /><span><b>Meaningful day</b><small>{{ season.played ? 'Recorded after joining' : 'Take a trip or start an activity yourself after joining' }}</small></span></div>
        <div :class="{ done: season.keepsakes >= season.target }"><GameIcon :name="season.keepsakes >= season.target ? 'good' : 'star'" :size="17" /><span><b>{{ Math.min(season.keepsakes, season.target) }} of {{ season.target }} keepsakes</b><small>Any 2 of the 4 permanent Akoka keepsakes count, including earlier ones</small></span></div>
      </div>
      <div class="season-meter" role="meter" aria-label="Season ribbon progress" aria-valuemin="0" aria-valuemax="3" :aria-valuenow="joinedProgress"><i :style="{ width: `${joinedProgress / 3 * 100}%` }" /></div>

      <p v-if="season.earnedAt !== null" class="season-earned"><GameIcon inline name="good" /> <b>{{ season.reward }}</b> earned {{ when(season.earnedAt) }}. It is permanent recognition with no cash, stars, or multiplier.</p>
      <BaseButton v-else-if="season.canClaim" variant="primary" :disabled="Boolean(actionReason) || pending !== null" :reason="actionReason" @click="send({ op: 'claim' })">{{ pending === 'claim' ? 'Adding ribbon…' : `Add ${season.reward} to my record` }}</BaseButton>
      <p v-else-if="season.status === 'ended'" class="season-note">The season has ended. This archived card keeps the progress and choices you recorded.</p>

      <div v-if="season.reminderOptions.length" class="season-reminder">
        <label for="season-reminder">Choose an unfinished keepsake to remember</label>
        <select id="season-reminder" v-model="selectedReminder" :disabled="pending !== null">
          <option value="">No plan right now</option>
          <option v-for="option in season.reminderOptions" :key="option.id" :value="option.id">{{ option.title }}</option>
        </select>
        <p>This is an in-app note only. It does not send email, push notifications, or messages.</p>
        <BaseButton small :disabled="Boolean(actionReason) || pending !== null || !reminderChanged" :reason="actionReason" @click="saveReminder">{{ pending === 'reminder' ? 'Saving…' : season.reminder ? 'Update my plan' : 'Save my plan' }}</BaseButton>
      </div>
    </template>

    <div v-if="error" class="season-error" role="alert"><p>{{ error }}</p><BaseButton v-if="retry" small :disabled="Boolean(actionReason) || pending !== null" :reason="actionReason" @click="send(retry)">Retry this change</BaseButton></div>
  </section>
</template>

<style scoped>
.season-card { container: season / inline-size; display: grid; justify-items: start; gap: 11px; padding: 13px; border-radius: var(--r-md); background: var(--c-surface-solid); box-shadow: var(--e-1), var(--ring); }
.season-card > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: start; width: 100%; }
.season-card > header > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: var(--c-blue-soft); color: var(--c-blue); }
header small,header h3,header p { display: block; margin: 0; }
header small { color: var(--c-muted); font-size: 10px; }
header h3 { margin-top: 2px; font-size: 16px; }
header p { margin-top: 3px; color: var(--c-muted); font-size: 10px; line-height: 1.4; }
header > strong { padding: 4px 8px; border-radius: var(--r-pill); background: var(--c-fill); color: var(--c-ink-2); font-size: 10px; }
.season-plan { display: flex; align-items: center; justify-content: space-between; gap: 9px; width: 100%; padding: 10px; box-sizing: border-box; border-radius: var(--r-sm); background: var(--c-blue-soft); }
.season-plan > div { display: flex; min-width: 0; gap: 8px; align-items: center; }.season-plan b,.season-plan small { display: block; }.season-plan b { font-size: 12px; }.season-plan small { margin-top: 2px; color: var(--c-ink-2); font-size: 10px; }
.season-lead,.season-note,.season-earned,.season-reminder p,.season-error p { margin: 0; color: var(--c-ink-2); font-size: 12px; line-height: 1.5; }
.season-progress { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; width: 100%; }
.season-progress > div { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; padding: 9px; border-radius: var(--r-sm); background: var(--c-fill); color: var(--c-muted); }.season-progress > div.done { background: var(--c-green-soft); color: var(--c-green-dark); }.season-progress b,.season-progress small { display: block; }.season-progress b { color: var(--c-ink); font-size: 11px; }.season-progress small { margin-top: 2px; font-size: 10px; line-height: 1.4; }
.season-meter { width: 100%; height: 7px; overflow: hidden; border-radius: var(--r-pill); background: var(--c-fill); }.season-meter i { display: block; height: 100%; border-radius: inherit; background: var(--c-green); }
.season-earned { padding: 9px 10px; border-radius: var(--r-sm); background: var(--c-green-soft); color: var(--c-green-dark); }
.season-reminder { display: grid; justify-items: start; gap: 7px; width: 100%; padding-top: 10px; border-top: 1px solid var(--c-line); }.season-reminder label { font-size: 12px; font-weight: 700; }.season-reminder select { width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: var(--r-sm); background: var(--c-surface-solid); color: var(--c-ink); font: 500 13px/1.3 var(--font); }.season-reminder select:focus-visible { outline: var(--focus); outline-offset: 2px; }
.season-error { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 10px; box-sizing: border-box; border-radius: var(--r-sm); background: var(--c-red-soft); color: var(--c-red-dark); }.season-error p { color: inherit; }
@container season (max-width: 300px) { .season-card > header { grid-template-columns: auto minmax(0, 1fr); }.season-card > header > strong { grid-column: 2; justify-self: start; }.season-plan { align-items: flex-start; flex-direction: column; }.season-progress { grid-template-columns: 1fr; } }
</style>
