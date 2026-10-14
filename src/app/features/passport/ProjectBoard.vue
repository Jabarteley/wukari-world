<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ApiError } from '../../types/client.ts'
import type { ProjectHttpRoutes, ProjectRole, ProjectView } from '../../../types/projects.ts'
import { PROJECTS } from '../../../game/content/projects.ts'
import type { TimedId } from '../../../types/protocol.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import EmptyState from '../../ui/EmptyState.vue'
import GameIcon from '../../ui/GameIcon.vue'
import { originLine } from './passportModel.ts'

type ProjectsResponse = ProjectHttpRoutes['GET /api/projects']['response']
type WriteResponse = Pick<ProjectHttpRoutes['POST /api/projects/contribute']['response'], 'ok' | 'code' | 'reason' | 'duplicate'>
type ProjectOp = 'contribute' | 'quiet' | 'claim'
interface HeldWrite { actor: string; cityId: string; op: ProjectOp; id: string; role?: ProjectRole; actionId: TimedId }

const LEDGER_LIMIT = 600
const HELD_KEY = 'joinallworld-project-write-v1'
const timedId = /^\d{1,16}:[0-9a-f-]{36}$/
const cityId = /^[a-z][a-z0-9-]{0,63}$/
const roles: readonly ProjectRole[] = ['prepare', 'learn', 'welcome']
const { game, shell, goTo, showMapLayer } = useApp()
const projects = ref<ProjectView[]>([])
const selectedId = ref('')
const project = computed(() => projects.value.find(row => row.definition.id === selectedId.value) ?? projects.value[0] ?? null)
let epoch = 0
let generation = 0
const started = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const busy = ref('')

function actor(): string { return game.session.value?.id ?? '' }
function readHeld(): HeldWrite | null {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(HELD_KEY) ?? 'null') as Partial<HeldWrite> | null
    if (!value || value.actor !== actor() || typeof value.cityId !== 'string' || !cityId.test(value.cityId) || !['contribute', 'quiet', 'claim'].includes(String(value.op)) || !PROJECTS.some(row => row.id === value.id) || !timedId.test(String(value.actionId))) return null
    if (value.op !== 'claim' && value.cityId !== PROJECTS.find(row => row.id === value.id)?.city) return null
    if (value.op === 'contribute' && !roles.includes(value.role as ProjectRole)) return null
    return value as HeldWrite
  } catch { return null }
}
const held = ref<HeldWrite | null>(readHeld())
selectedId.value = held.value?.id ?? ''

function keep(write: HeldWrite | null): void {
  held.value = write
  try {
    if (write) globalThis.sessionStorage?.setItem(HELD_KEY, JSON.stringify(write))
    else globalThis.sessionStorage?.removeItem(HELD_KEY)
  } catch { /* retry safety lasts for this mounted view when tab storage is unavailable */ }
}
function intent(op: ProjectOp, role?: ProjectRole): string { return `${op}:${role ?? ''}` }
function isHeld(op: ProjectOp, role?: ProjectRole): boolean { return held.value?.id === project.value?.definition.id && held.value?.op === op && held.value.role === role }
function reconcileHeld(row: ProjectView): void {
  const saved = held.value
  if (!saved || saved.id !== row.definition.id) return
  if (saved.op === 'contribute' && row.roles.some(role => role.id === saved.role && role.yours)) keep(null)
  else if (saved.op === 'quiet' && row.status === 'completed') keep(null)
  else if (saved.op === 'claim' && row.memento) keep(null)
}
function failureText(value: unknown): { text: string; ambiguous: boolean } {
  const failure = value as ApiError
  const words: Readonly<Record<string, string>> = {
    missing_proof: 'Complete the activity described for this role first.',
    wrong_place: 'Finish your current activity and go to this project’s meeting place.',
    missing_prerequisite: project.value?.definition.prerequisite?.refusal ?? 'Complete the earlier project first.',
    project_full: 'This project has reached its contribution limit.',
    already_contributed: 'This role is already recorded for your account.',
    missing_contributions: 'Complete all three roles, including one human-played contribution, before using resident support.',
    human_required: 'Only a human player can choose to finish with the residents.',
    not_complete: 'This project is still being prepared.',
    no_contribution: 'Contribute to this project before claiming its keepsake.',
    invalid_project: 'That shared project is unavailable.',
  }
  const code = failure.code ?? ''
  const text = words[code] || failure.reason || failure.message || 'The project could not be updated.'
  return { text, ambiguous: code !== 'stale_identity_response' && (!failure.status || failure.status >= 500) }
}
async function load(): Promise<void> {
  started.value = true
  if (!game.connected.value) { error.value = 'Reconnect to load shared projects.'; return }
  const requestEpoch = epoch, requestGeneration = ++generation
  loading.value = true; error.value = ''
  try {
    const cities = [...new Set([game.view.value.cityId, ...PROJECTS.map(row => row.city)])]
    const answers = await Promise.all(cities.map(city => game.fetchJson<ProjectsResponse>(`/api/projects?city=${encodeURIComponent(city)}`)))
    if (requestEpoch !== epoch || requestGeneration !== generation) return
    projects.value = answers.flatMap(answer => answer.projects)
    if (!selectedId.value) selectedId.value = projects.value.find(row => row.definition.city === game.view.value.cityId)?.definition.id ?? projects.value[0]?.definition.id ?? ''
    for (const row of projects.value) reconcileHeld(row)
  } catch (caught) { if (requestEpoch === epoch && requestGeneration === generation) error.value = failureText(caught).text }
  finally { if (requestEpoch === epoch && requestGeneration === generation) loading.value = false }
}
function writeReason(op: ProjectOp, role?: ProjectRole): string {
  if (!game.connected.value) return 'Reconnect to update the project.'
  if (busy.value) return 'Another project update is being saved.'
  if (held.value && !isHeld(op, role)) return 'Retry the unconfirmed project update first.'
  return ''
}
function commandCity(op: ProjectOp): string { return op === 'claim' ? game.view.value.cityId : project.value!.definition.city }
async function send(op: ProjectOp, role?: ProjectRole): Promise<void> {
  const row = project.value
  if (!row || writeReason(op, role)) return
  const saved = isHeld(op, role) ? held.value : null
  const request: HeldWrite = saved ?? { actor: actor(), cityId: commandCity(op), op, id: row.definition.id, ...(role ? { role } : {}), actionId: game.newId() as TimedId }
  const requestEpoch = epoch
  keep(request); busy.value = intent(op, role); notice.value = ''; error.value = ''
  try {
    const answer = await game.fetchJson<WriteResponse>(`/api/projects/${op}`, { method: 'POST', body: { cityId: request.cityId, actionId: request.actionId, id: request.id, ...(request.role ? { role: request.role } : {}) } })
    if (requestEpoch !== epoch) return
    keep(null)
    if (!answer.ok) { error.value = failureText(Object.assign(Error(answer.reason || answer.code), { code: answer.code, reason: answer.reason, status: 409 })).text; await load(); return }
    await game.refresh()
    if (requestEpoch !== epoch) return
    await load()
    if (requestEpoch !== epoch) return
    notice.value = op === 'claim' ? `Your ${row.definition.memento} is saved.` : op === 'quiet' ? 'The project is complete with help from the residents.' : 'Your contribution is recorded.'
    game.toast(notice.value, 'good')
  } catch (caught) {
    if (requestEpoch !== epoch) return
    const failure = failureText(caught)
    if (!failure.ambiguous) keep(null)
    error.value = failure.ambiguous ? `We could not confirm whether this update was saved. Retry safely with the same request. ${failure.text}` : failure.text
  } finally { if (requestEpoch === epoch) busy.value = '' }
}

const atMeeting = computed(() => {
  const row = project.value
  return Boolean(row && game.state.value.estate.city === row.definition.city && game.state.value.location === row.definition.venue && game.state.value.spot === row.definition.spot)
})
function meetingReason(): string {
  if (!game.connected.value) return 'Reconnect to contribute.'
  if (game.state.value.activeAction) return 'Finish your current activity first.'
  if (!atMeeting.value) return `Meet at ${project.value?.definition.placeLabel ?? 'the project location'} to contribute.`
  return ''
}
function roleReason(role: ProjectView['roles'][number]): string {
  if (role.yours) return 'This role is already recorded for you or an account-owned character.'
  if (project.value && project.value.ledger.length >= LEDGER_LIMIT) return 'This project has reached its contribution limit.'
  return writeReason('contribute', role.id) || project.value?.lockedReason || meetingReason() || (!role.ready ? 'Complete this role’s criterion first.' : '')
}
function roleIcon(role: ProjectRole): string {
  return role === 'prepare' ? 'compass' : role === 'learn' ? 'book' : 'handshake'
}
function quietReason(): string { return writeReason('quiet') || meetingReason() }
function route(next: ProjectView['definition']['roles'][number]['next']): void {
  const city = project.value?.definition.city
  if (!city) return
  if (game.view.value.cityId !== city) { showMapLayer('world', { city }); return }
  if (next.open && game.state.value.location === next.venue) { shell.open(next.open); return }
  shell.close(); void goTo(next.venue, next.spot)
}
function goMeeting(): void {
  const row = project.value
  if (!row) return
  route({ venue: row.definition.venue, spot: row.definition.spot })
}
const date = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
watch(() => game.session.value?.id, () => {
  epoch += 1; generation += 1; projects.value = []; selectedId.value = ''; busy.value = ''; loading.value = false; notice.value = ''; error.value = ''; held.value = readHeld(); selectedId.value = held.value?.id ?? ''; void load()
})
watch(() => game.view.value.cityId, () => { void load() })
watch(() => game.connected.value, connected => { if (connected) void load() })
onMounted(() => { void load() })
</script>

<template>
  <section class="project-board" aria-labelledby="shared-project-title">
    <header class="project-heading">
      <span aria-hidden="true"><GameIcon name="handshake" :size="22" /></span>
      <div><small>{{ project?.definition.placeLabel ?? 'Around the world' }}</small><h3 id="shared-project-title">Make something together</h3></div>
    </header>

    <EmptyState v-if="!game.connected.value && !project" compact icon="cloud-off" title="Reconnect to see the shared project" text="Reconnect to see contributions and take part."><BaseButton small :disabled="true" reason="Reconnect to load the shared project.">Retry</BaseButton></EmptyState>
    <div v-else-if="(loading || !started) && !project" class="project-status" role="status">Loading the shared project…</div>
    <EmptyState v-else-if="error && !project" compact icon="handshake" title="The shared project could not load" :text="error"><BaseButton small :disabled="!game.connected.value" :reason="game.connected.value ? '' : 'Reconnect to retry.'" @click="load">Try again</BaseButton></EmptyState>
    <EmptyState v-else-if="!project" compact icon="handshake" title="No shared project is open" text="Authored shared projects will appear here as places open their journeys."><BaseButton small :disabled="loading || !game.connected.value" @click="load">Check again</BaseButton></EmptyState>

    <template v-else>
      <label v-if="projects.length > 1" class="project-picker">Choose a project<select v-model="selectedId" :disabled="Boolean(busy || held)"><option v-for="row in projects" :key="row.definition.id" :value="row.definition.id">{{ row.definition.title }} · {{ row.definition.placeLabel }}</option></select></label>
      <section class="project-summary" :class="{ 'is-complete': project.status === 'completed' }">
        <div><span>{{ project.status === 'completed' ? 'Complete' : 'Preparing' }}</span><strong>{{ project.definition.title }}</strong></div>
        <p>{{ project.status === 'completed' ? project.definition.outcome : project.definition.description }}</p>
        <p v-if="project.completedAt" class="project-fine">Completed {{ date.format(new Date(project.completedAt)) }} · {{ project.completion === 'quiet' ? 'finished with help from the residents' : 'finished through community contributions' }}.</p>
      </section>

      <aside v-if="project.status === 'completed' && atMeeting" class="project-installation" :data-project-installation="project.definition.id" :aria-label="project.definition.title">
        <span aria-hidden="true"><GameIcon name="missions" :size="24" /></span><div><b>{{ project.definition.title }}</b><p>{{ project.definition.outcome }}</p><small>Completed at {{ project.definition.placeLabel }}.</small></div>
      </aside>

      <div class="project-counts">
        <div><small>People helping</small><strong>{{ project.distinctHumanAccounts }}</strong></div>
        <div><small>Contributions</small><strong>{{ project.ledger.length }}</strong></div>
      </div>

      <details class="project-details">
        <summary>How contributions count</summary>
        <div>
          <p><b>People helping</b> counts distinct signed-in people. Guests can contribute, but they do not increase this number. Characters and agents owned by the same account count as one person.</p>
          <p>Each account owner can fill each role once. The project keeps up to {{ LEDGER_LIMIT }} contributions.</p>
          <ul>
            <li v-for="role in project.roles" :key="role.id"><b>{{ project.definition.roles.find(item => item.id === role.id)?.label }}</b>: {{ role.total }} total · {{ role.human }} human · {{ role.delegated }} delegated · {{ role.agents }} agent character</li>
          </ul>
        </div>
      </details>

      <p v-if="project.lockedReason" class="project-retry">{{ project.lockedReason }}</p>

      <ul class="project-roles" aria-label="Project roles">
        <li v-for="role in project.roles" :key="role.id" :class="{ 'is-yours': role.yours }">
          <span class="project-step" aria-hidden="true"><GameIcon :name="role.yours ? 'good' : roleIcon(role.id)" :size="16" /></span>
          <div class="project-role-copy">
            <b>{{ project.definition.roles.find(item => item.id === role.id)?.label }}</b>
            <p>{{ project.definition.roles.find(item => item.id === role.id)?.criterion }}</p>
            <small v-if="role.yours" class="project-yours">Recorded for you or the same account owner.</small>
          </div>
          <div class="project-role-actions">
            <BaseButton small @click="route(project.definition.roles.find(item => item.id === role.id)!.next)">Show route</BaseButton>
            <BaseButton v-if="!role.yours" small variant="primary" :disabled="Boolean(roleReason(role))" :reason="roleReason(role)" @click="send('contribute', role.id)">{{ busy === intent('contribute', role.id) ? 'Saving…' : isHeld('contribute', role.id) ? 'Retry safely' : project.status === 'completed' ? 'Contribute late' : 'Contribute' }}</BaseButton>
          </div>
        </li>
      </ul>

      <p v-if="error" class="project-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="project-notice" role="status">{{ notice }}</p>
      <p v-if="held" class="project-retry">One update has an unconfirmed answer. Retry safely; the game will check the same update instead of making another.</p>

      <section v-if="project.quietReady" class="project-quiet">
        <b>Finish with help from the residents</b>
        <p>The game’s written resident characters can help finish this project. They are not live players, and only a human player can choose this.</p>
        <BaseButton small :disabled="Boolean(quietReason())" :reason="quietReason()" @click="send('quiet')">{{ busy === intent('quiet') ? 'Saving…' : isHeld('quiet') ? 'Retry safely' : 'Finish with the residents' }}</BaseButton>
      </section>

      <section v-if="project.memento" class="project-memento">
        <span aria-hidden="true"><GameIcon name="star" :size="24" /></span><div><b>{{ project.memento.title }}</b><p>Permanent cosmetic earned {{ date.format(new Date(project.memento.earnedAt)) }}. {{ originLine(project.memento.origins) }}.</p><small>Free recognition only; no cash or stars.</small></div>
      </section>
      <section v-else-if="project.canClaim" class="project-memento">
        <span aria-hidden="true"><GameIcon name="star" :size="24" /></span><div><b>{{ project.definition.memento }} is ready</b><p>Your contribution qualifies for this free permanent cosmetic.</p><BaseButton small variant="primary" :disabled="Boolean(writeReason('claim'))" :reason="writeReason('claim')" @click="send('claim')">{{ busy === intent('claim') ? 'Saving…' : isHeld('claim') ? 'Retry safely' : 'Claim keepsake' }}</BaseButton></div>
      </section>
      <p v-else-if="project.status === 'completed'" class="project-fine">Late contributions remain open. Complete and record one role to earn the permanent {{ project.definition.memento }}.</p>

      <div v-if="!atMeeting" class="project-go"><p>Meet and contribute at {{ project.definition.placeLabel }}.</p><BaseButton small @click="goMeeting">{{ game.view.value.cityId === project.definition.city ? `Go to ${project.definition.placeLabel}` : 'Find this city on the world map' }}</BaseButton></div>
      <p v-if="loading" class="project-fine" role="status">Refreshing contributions…</p>
    </template>
  </section>
</template>

<style scoped>
.project-board { display: grid; gap: 12px; min-width: 0; padding: 14px; border-radius: var(--r-md); background: var(--c-surface-solid); box-shadow: var(--e-1), var(--ring); color: var(--c-ink); }
.project-picker { display: grid; gap: 6px; color: var(--c-muted); font-size: 12px; }
.project-picker select { width: 100%; min-width: 0; min-height: 44px; padding: 9px; border: 1px solid var(--c-line); border-radius: var(--r-sm); font: inherit; font-size: 13px; color: var(--c-ink); background: var(--c-surface-solid); }
.project-picker select:focus-visible { outline: 2px solid var(--c-blue); outline-offset: 2px; }
.project-heading { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; }
.project-heading > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: var(--c-green-soft); color: var(--c-green-dark); }
.project-heading small,.project-heading h3 { display: block; margin: 0; }.project-heading small { color: var(--c-muted); font-size: 12px; }.project-heading h3 { margin-top: 2px; font-size: 17px; line-height: 1.3; }
.project-status { padding: 18px 8px; color: var(--c-muted); text-align: center; font-size: 13px; }
.project-summary { padding: 12px; border-radius: var(--r-sm); background: var(--c-green-soft); }.project-summary.is-complete { background: var(--c-amber-soft); }
.project-summary div { display: flex; align-items: center; justify-content: space-between; gap: 9px; }.project-summary span { border-radius: var(--r-pill); padding: 4px 8px; background: var(--c-surface-solid); color: var(--c-green-dark); font-size: 11px; font-weight: 750; }.project-summary strong { font-size: 14px; text-align: right; }
.project-summary p,.project-installation p,.project-role-copy p,.project-quiet p,.project-memento p,.project-go p { margin: 7px 0 0; color: var(--c-ink-2); font-size: 13px; line-height: 1.5; }
.project-installation,.project-memento { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; padding: 12px; border-radius: var(--r-sm); background: var(--c-amber-soft); box-shadow: var(--ring); }.project-installation > span,.project-memento > span { display: grid; place-items: center; width: 32px; height: 32px; color: var(--c-amber-dark); }.project-installation small,.project-memento small { color: var(--c-muted); font-size: 11px; }
.project-counts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.project-counts div { padding: 11px; border-radius: var(--r-sm); background: var(--c-fill); }.project-counts small,.project-counts strong { display: block; }.project-counts small { color: var(--c-muted); font-size: 12px; line-height: 1.35; }.project-counts strong { margin-top: 3px; font-size: 20px; font-variant-numeric: tabular-nums; }
.project-details { border-bottom: 1px solid var(--c-line); }.project-details > summary { display: flex; align-items: center; min-height: var(--tap); padding: 0 2px; color: var(--c-green-dark); font-size: 12px; font-weight: 700; cursor: pointer; }.project-details > div { margin-bottom: 10px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--c-fill); }.project-details p { margin: 0 0 7px; color: var(--c-ink-2); font-size: 12px; line-height: 1.5; }.project-details ul { display: grid; gap: 5px; margin: 0; padding-left: 18px; color: var(--c-muted); font-size: 11px; line-height: 1.45; }
.project-fine { margin: 0; color: var(--c-muted); font-size: 11px; line-height: 1.45; }
.project-roles { list-style: none; display: grid; gap: 8px; margin: 0; padding: 0; }.project-roles li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; padding: 11px; border-radius: var(--r-sm); background: var(--c-fill); }.project-roles li.is-yours { background: var(--c-green-soft); }
.project-step { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--c-surface-solid); color: var(--c-green-dark); }.project-role-copy b { font-size: 14px; }.project-role-copy p { margin-top: 3px; }.project-role-copy small { display: block; margin-top: 4px; color: var(--c-muted); font-size: 11px; line-height: 1.4; }.project-role-copy .project-yours { color: var(--c-green-dark); font-weight: 700; }
.project-role-actions { grid-column: 2; display: flex; flex-wrap: wrap; gap: 7px; }
.project-error,.project-notice,.project-retry { margin: 0; padding: 9px 10px; border-radius: var(--r-sm); font-size: 12px; line-height: 1.4; }.project-error { background: var(--c-red-soft); color: var(--c-red-dark); }.project-notice { background: var(--c-green-soft); color: var(--c-green-dark); }.project-retry { background: var(--c-amber-soft); color: var(--c-ink-2); }
.project-quiet { padding: 12px; border-radius: var(--r-sm); background: var(--c-blue-soft); }.project-quiet p { margin-bottom: 9px; }
.project-go { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--c-line); }.project-go p { margin: 0; }
@media (max-width: 380px) { .project-role-actions,.project-go { align-items: stretch; flex-direction: column; }.project-role-actions :deep(.base-button),.project-go :deep(.base-button) { width: 100%; }.project-summary div { align-items: flex-start; flex-direction: column; }.project-summary strong { text-align: left; } }
</style>
