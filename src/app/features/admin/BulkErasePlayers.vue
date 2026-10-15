<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { recordDone } from './adminUi.ts'

interface Target { id: string; name: string; kind: string; admin: boolean }
interface Character { id: string; name: string; kind: string }
interface Preview { token: string; plan: string; characters: Character[]; scope: 'guest' | 'agent' | 'account'; summary: string }
interface Reply extends Partial<Preview> { code: string; jobId?: string; summary?: string }
type RowStatus = 'notstarted' | 'complete' | 'pending' | 'unknown' | 'failed'
interface Row {
  target: Target
  status: RowStatus
  preview: Preview | null
  operationId: string | null
  jobId: string
  error: string
  confirmedBody: Record<string, unknown> | null
}

const props = defineProps<{ targets: Target[] }>()
const emit = defineEmits<{ close: [changed: boolean] }>()
const api = useAdmin()
// Copy the selection once. The table can change only after this component closes.
const frozen = props.targets.slice(0, 20).map(target => ({ ...target }))
const rows = reactive<Row[]>(frozen.map(target => ({ target, status: 'notstarted', preview: null, operationId: null, jobId: '', error: '', confirmedBody: null })))
const reason = ref(''), typed = ref(''), phase = ref<'reason' | 'preview' | 'confirm' | 'executing' | 'stopped' | 'done'>('reason')
const note = ref(''), busyTarget = ref(''), operationIds = ref<string[]>([])
const executionStarted = ref(false)
const batchKey = `${api.now()}:${frozen.map(target => target.id).sort().join(',')}`
let alive = true, changed = false
onBeforeUnmount(() => { alive = false })

const intent = (id: string): string => `bulk-erase:${batchKey}:${id}`
const idsOf = (preview: Preview): string[] => [...new Set(preview.characters.map(character => character.id))].sort()
const sameIds = (a: string[], b: string[]): boolean => a.length === b.length && a.every((id, index) => id === b[index])
const subset = (a: string[], b: string[]): boolean => a.every(id => b.includes(id))
const intersects = (a: string[], b: string[]): boolean => a.some(id => b.includes(id))
const rowFor = (id: string): Row | undefined => rows.find(row => row.target.id === id)
const operationRows = (id: string): Row[] => rows.filter(row => row.operationId === id)
const statusLabel = (status: RowStatus): string => status === 'notstarted' ? 'not started' : status
const working = computed(() => phase.value === 'preview' || phase.value === 'executing' || Boolean(busyTarget.value))
const completed = computed(() => rows.filter(row => row.status === 'complete').length)
const unsettled = computed(() => rows.some(row => row.status === 'pending' || row.status === 'unknown'))
const mayContinue = computed(() => !working.value && !unsettled.value && rows.some(row => row.status === 'notstarted' || row.status === 'failed'))
const activeRows = computed(() => rows.filter(row => operationIds.value.includes(row.operationId ?? '')))
const expandedCharacters = computed(() => {
  const characters = new Map<string, Character>()
  for (const operationId of operationIds.value) for (const character of rowFor(operationId)?.preview?.characters ?? []) if (!characters.has(character.id)) characters.set(character.id, character)
  return [...characters.values()].sort((a, b) => a.id.localeCompare(b.id))
})
const confirmation = computed(() => `ERASE ${expandedCharacters.value.length} CHARACTERS`)
const accountClosure = computed(() => activeRows.value.some(row => row.preview?.scope === 'account'))
const disclosure = computed(() => activeRows.value.find(row => row.preview)?.preview?.summary ?? '')
const canPreview = computed(() => !working.value && reason.value.trim().length >= 3 && reason.value.trim().length <= 200)
const canExecute = computed(() => phase.value === 'confirm' && typed.value === confirmation.value && operationIds.value.length > 0)

function previewOf(data: Reply): Preview | null {
  if (data.code !== 'confirmation_required' || typeof data.token !== 'string' || typeof data.plan !== 'string' || typeof data.summary !== 'string'
    || !['guest', 'agent', 'account'].includes(String(data.scope)) || !Array.isArray(data.characters)) return null
  const characters: Character[] = []
  for (const value of data.characters) {
    if (!value || typeof value !== 'object') return null
    const character = value as Partial<Character>
    if (typeof character.id !== 'string' || typeof character.name !== 'string' || typeof character.kind !== 'string') return null
    characters.push({ id: character.id, name: character.name, kind: character.kind })
  }
  if (!characters.length) return null
  return { token: data.token, plan: data.plan, characters, scope: data.scope as Preview['scope'], summary: data.summary }
}

function setOperation(id: string, status: RowStatus, error = '', jobId = ''): void {
  for (const row of operationRows(id)) {
    row.status = status
    row.error = error
    row.jobId = jobId
  }
}

function resetBeforeCommit(): void {
  if (executionStarted.value || changed || working.value) return
  for (const row of rows) {
    api.forget(intent(row.target.id))
    row.status = 'notstarted'; row.preview = null; row.operationId = null; row.error = ''; row.jobId = ''; row.confirmedBody = null
  }
  operationIds.value = []; typed.value = ''; note.value = ''; phase.value = 'reason'
}

function close(): void {
  if (working.value) return
  for (const row of rows) if (row.status === 'notstarted' || row.status === 'failed') api.forget(intent(row.target.id))
  emit('close', changed)
}

function deduplicate(candidates: Row[]): boolean {
  for (let left = 0; left < candidates.length; left += 1) for (let right = left + 1; right < candidates.length; right += 1) {
    const a = idsOf(candidates[left]!.preview!), b = idsOf(candidates[right]!.preview!)
    if (intersects(a, b) && !subset(a, b) && !subset(b, a)) {
      const message = 'This closure partly overlaps another selection. Nothing was erased; review the players separately.'
      candidates[left]!.status = 'failed'; candidates[left]!.error = message
      candidates[right]!.status = 'failed'; candidates[right]!.error = message
      return false
    }
  }
  const ordered = [...candidates].sort((a, b) => idsOf(b.preview!).length - idsOf(a.preview!).length || frozen.findIndex(target => target.id === a.target.id) - frozen.findIndex(target => target.id === b.target.id))
  const representatives: Row[] = []
  for (const row of ordered) {
    const covering = representatives.find(candidate => subset(idsOf(row.preview!), idsOf(candidate.preview!)))
    if (covering) {
      row.operationId = covering.target.id
      api.forget(intent(row.target.id))
    } else {
      row.operationId = row.target.id
      representatives.push(row)
    }
  }
  operationIds.value = representatives.map(row => row.target.id)
  return true
}

async function previewRemaining(): Promise<void> {
  if (!canPreview.value) return
  const candidates = rows.filter(row => row.status === 'notstarted' || row.status === 'failed')
  if (!candidates.length) return
  phase.value = 'preview'; note.value = ''; typed.value = ''; operationIds.value = []
  for (const row of candidates) {
    row.status = 'notstarted'; row.preview = null; row.operationId = null; row.error = ''; row.jobId = ''; row.confirmedBody = null
  }
  let blocked = false
  // Every remaining selection is previewed before any one of them can be executed.
  for (const row of candidates) {
    if (!alive) return
    busyTarget.value = row.target.id
    const reply = await api.post<Reply>(`/api/admin/players/${row.target.id}/erase`, { reason: reason.value.trim() }, intent(row.target.id))
    if (!alive) return
    if (!reply.ok) {
      row.status = 'failed'; row.error = reply.error.reason; blocked = true
      continue
    }
    const preview = previewOf(reply.data)
    if (!preview) {
      row.status = 'failed'; row.error = 'The server did not return a complete erasure preview.'; blocked = true
      api.forget(intent(row.target.id))
      continue
    }
    row.preview = preview
  }
  busyTarget.value = ''
  if (blocked || !deduplicate(candidates)) {
    note.value = 'Nothing in this confirmation set was erased. Resolve every blocked row, then check all remaining players again.'
    phase.value = 'stopped'
    return
  }
  phase.value = 'confirm'
  note.value = `${candidates.length} selected player${candidates.length === 1 ? '' : 's'} expand to ${expandedCharacters.value.length} unique character${expandedCharacters.value.length === 1 ? '' : 's'} in ${operationIds.value.length} erasure operation${operationIds.value.length === 1 ? '' : 's'}.`
}

function stopOperation(id: string, status: RowStatus, message: string): void {
  setOperation(id, status, message)
  note.value = message
  phase.value = 'stopped'
  busyTarget.value = ''
}

async function execute(): Promise<void> {
  if (!canExecute.value) return
  phase.value = 'executing'; note.value = ''
  for (const id of operationIds.value) {
    const row = rowFor(id)
    if (!row || row.status === 'complete') continue
    if (!alive) return
    busyTarget.value = id
    // Tokens are short-lived. Re-preview with the same request id immediately before confirmation.
    const freshReply = await api.post<Reply>(`/api/admin/players/${id}/erase`, { reason: reason.value.trim() }, intent(id))
    if (!alive) return
    if (!freshReply.ok) {
      stopOperation(id, 'failed', `Stopped before erasing ${row.target.name}: ${freshReply.error.reason}`)
      return
    }
    const fresh = previewOf(freshReply.data), approved = row.preview
    if (!fresh || !approved || fresh.scope !== approved.scope || !sameIds(idsOf(fresh), idsOf(approved))) {
      api.forget(intent(id))
      stopOperation(id, 'failed', `Stopped before erasing ${row.target.name}: the approved closure changed. Check all remaining players again.`)
      return
    }
    if (!alive) return
    const body = { reason: reason.value.trim(), confirm: fresh.token, plan: fresh.plan, typed: `ERASE ${id}` }
    executionStarted.value = true
    row.confirmedBody = body
    const reply = await api.post<Reply>(`/api/admin/players/${id}/erase`, body, intent(id), { preserveIntentOnFailure: true })
    if (!alive) return
    if (!reply.ok) {
      if (reply.error.status === 0 || reply.error.status >= 500) {
        stopOperation(id, 'unknown', `The answer for ${row.target.name} was lost. Do not start another request; retry this exact request.`)
      } else {
        api.forget(intent(id))
        row.confirmedBody = null
        stopOperation(id, 'failed', `Stopped at ${row.target.name}: ${reply.error.reason}`)
      }
      return
    }
    if (reply.data.code === 'player_erased') {
      row.confirmedBody = null
      setOperation(id, 'complete')
      changed = true
      recordDone(reply.data.summary ?? `Erased ${row.target.name}`, true)
      continue
    }
    if (reply.data.code === 'erasure_pending' && typeof reply.data.jobId === 'string') {
      row.confirmedBody = null
      setOperation(id, 'pending', reply.data.summary ?? 'Main access ended; map or media cleanup is pending.', reply.data.jobId)
      changed = true
      recordDone(reply.data.summary ?? `Erasure cleanup pending for ${row.target.name}`, true)
      note.value = 'Execution stopped after the committed operation reported pending cleanup. Retry that job before checking untouched rows.'
      phase.value = 'stopped'; busyTarget.value = ''
      return
    }
    stopOperation(id, 'unknown', `The outcome for ${row.target.name} is unknown: ${reply.data.summary ?? reply.data.code ?? 'unexpected response'}. Retry this exact request.`)
    return
  }
  busyTarget.value = ''
  phase.value = rows.every(row => row.status === 'complete') ? 'done' : 'stopped'
  note.value = phase.value === 'done' ? `Completed ${completed.value} selected player${completed.value === 1 ? '' : 's'}.` : 'Execution stopped. Check every untouched row again before continuing.'
}

async function retryUnknown(row: Row): Promise<void> {
  if (working.value || !row.confirmedBody || row.operationId !== row.target.id) return
  busyTarget.value = row.target.id
  const reply = await api.post<Reply>(`/api/admin/players/${row.target.id}/erase`, row.confirmedBody, intent(row.target.id), { preserveIntentOnFailure: true })
  if (!alive) return
  busyTarget.value = ''
  if (!reply.ok) {
    setOperation(row.target.id, 'unknown', `The original outcome is still unknown: ${reply.error.reason}. Retry the same request; do not create a new one.`)
    phase.value = 'stopped'
    return
  }
  if (reply.data.code === 'player_erased') {
    row.confirmedBody = null
    setOperation(row.target.id, 'complete'); changed = true; recordDone(reply.data.summary ?? `Erased ${row.target.name}`, true)
  } else if (reply.data.code === 'erasure_pending' && typeof reply.data.jobId === 'string') {
    row.confirmedBody = null
    setOperation(row.target.id, 'pending', reply.data.summary ?? 'Cleanup is pending.', reply.data.jobId); changed = true
  } else {
    setOperation(row.target.id, 'unknown', `The original outcome is still unknown: ${reply.data.summary ?? reply.data.code}. Retry the same request; do not create a new one.`)
    phase.value = 'stopped'
    return
  }
  phase.value = rows.every(item => item.status === 'complete') ? 'done' : 'stopped'
  note.value = phase.value === 'done' ? 'Every selected player is complete.' : 'The exact request is settled. Check untouched rows again before continuing.'
}

async function retryPending(row: Row): Promise<void> {
  if (working.value || !row.jobId || row.operationId !== row.target.id) return
  busyTarget.value = row.target.id
  const reply = await api.post<Reply>(`/api/admin/erasure/${row.jobId}/retry`, {}, `bulk-erase-retry:${row.jobId}`)
  if (!alive) return
  busyTarget.value = ''
  if (!reply.ok) {
    setOperation(row.target.id, 'pending', reply.error.reason, row.jobId)
    phase.value = 'stopped'
    return
  }
  if (reply.data.code === 'player_erased') {
    setOperation(row.target.id, 'complete'); recordDone(reply.data.summary ?? `Finished cleanup for ${row.target.name}`, true)
  } else setOperation(row.target.id, 'pending', reply.data.summary ?? 'Cleanup is still pending.', row.jobId)
  phase.value = rows.every(item => item.status === 'complete') ? 'done' : 'stopped'
  note.value = phase.value === 'done' ? 'Every selected player is complete.' : 'Cleanup is settled or still pending. Untouched rows remain stopped.'
}
</script>

<template>
  <section class="adm-card adm-form adm-danger-zone bulk-erase" aria-label="Erase selected players permanently">
    <h3>Erase selected players permanently</h3>
    <p>This cannot be undone. The selection below is frozen for this batch; cancel and start again to change it.</p>
    <div class="selected-list">
      <div v-for="row in rows" :key="row.target.id" class="selected-row">
        <span><b>{{ row.target.name }}</b> · {{ row.target.kind }} <span v-if="row.target.admin" class="adm-chip red">admin</span><br><code>{{ row.target.id }}</code></span>
        <span class="row-result"><b>{{ busyTarget === row.target.id ? 'working' : statusLabel(row.status) }}</b><small v-if="row.operationId && row.operationId !== row.target.id">covered by {{ rowFor(row.operationId)?.target.name }}</small><small v-if="row.status === 'pending' && row.jobId">job <code>{{ row.jobId }}</code></small><small v-if="row.error">{{ row.error }}</small></span>
        <button v-if="row.status === 'pending' && row.operationId === row.target.id" type="button" class="adm-btn" :disabled="working" @click="retryPending(row)">Retry remaining cleanup</button>
        <button v-if="row.status === 'unknown' && row.operationId === row.target.id" type="button" class="adm-btn danger" :disabled="working" @click="retryUnknown(row)">Retry exact request</button>
      </div>
    </div>

    <label>Reason<input v-model="reason" maxlength="200" autocomplete="off" :disabled="working || executionStarted || changed" @input="resetBeforeCommit"></label>

    <template v-if="phase === 'confirm' || phase === 'executing'">
      <p class="adm-note" role="status">{{ note }}</p>
      <p v-if="accountClosure"><strong>At least one selection removes a whole Allworld account and every character listed below.</strong></p>
      <p v-if="disclosure" class="adm-sub">{{ disclosure }}</p>
      <div>
        <b>{{ expandedCharacters.length }} unique characters in this confirmation</b>
        <ul><li v-for="character in expandedCharacters" :key="character.id">{{ character.name }} · {{ character.kind }} <code>{{ character.id }}</code></li></ul>
      </div>
      <label>Type <code>{{ confirmation }}</code> to confirm<input v-model="typed" autocomplete="off" spellcheck="false" :disabled="working"></label>
    </template>

    <p v-else-if="note" :class="phase === 'done' ? 'adm-ok' : 'adm-error'" role="status">{{ note }}</p>
    <p class="adm-sub">Every selected player is previewed before execution. Operations run one at a time and stop on a changed scope, failure, unknown answer, or pending cleanup. A submitted erasure cannot be cancelled. Keep this page open; this batch view is not restored after a reload.</p>
    <p v-if="unsettled" class="adm-note">Settle the unknown request or pending job before closing so its exact retry details are not lost.</p>
    <div class="adm-row">
      <button v-if="phase === 'reason' || phase === 'preview'" type="button" class="adm-btn danger" :disabled="!canPreview" @click="previewRemaining">{{ phase === 'preview' ? 'Checking every player…' : 'Preview every player' }}</button>
      <button v-else-if="phase === 'confirm' || phase === 'executing'" type="button" class="adm-btn danger" :disabled="!canExecute || working" @click="execute">{{ phase === 'executing' ? 'Erasing one at a time…' : `Permanently erase ${expandedCharacters.length} characters` }}</button>
      <button v-else-if="mayContinue" type="button" class="adm-btn danger" :disabled="!canPreview" @click="previewRemaining">Check untouched players again</button>
      <button type="button" class="adm-btn" :disabled="working || unsettled" @click="close">{{ executionStarted || changed ? 'Close' : 'Cancel' }}</button>
    </div>
    <p v-if="reason.trim().length > 0 && reason.trim().length < 3" class="adm-sub">A reason is needed (at least 3 characters).</p>
  </section>
</template>

<style scoped>
.bulk-erase { margin-top: 10px; }
.selected-list { display: grid; gap: 6px; }
.selected-row { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(120px, .55fr) auto; gap: 10px; align-items: center; border-bottom: 1px solid #ead7d4; padding: 7px 0; font-size: 13px; }
.selected-row:last-child { border-bottom: 0; }
.row-result { display: grid; gap: 2px; overflow-wrap: anywhere; }
.row-result small { color: var(--muted); }
ul { margin: 6px 0 0; padding-left: 22px; }
@media (max-width: 700px) { .selected-row { grid-template-columns: 1fr; } }
</style>
